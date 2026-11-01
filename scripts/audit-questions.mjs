import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const read=file=>JSON.parse(fs.readFileSync(file));
const catalog=read('data/catalog.json'),review=read('audit/reviewed-concepts.json'),snippetReview=read('audit/reviewed-snippets.json');
const notes=read('audit/review-notes.json');
const approvedContent=read('audit/reviewed-content.json').questions;
const banks=catalog.map(t=>({topic:t.id,bank:read(`data/${t.id}.json`)}));
const questions=banks.flatMap(b=>b.bank);
const oracle=spawnSync('python',['scripts/audit_oracle.py'],{input:JSON.stringify(questions),encoding:'utf8',maxBuffer:20*1024*1024,timeout:60000});
if(oracle.status!==0)throw Error(oracle.stderr||String(oracle.error));
const numerical=new Map(JSON.parse(oracle.stdout).map(q=>[q.id,q]));
const native=fs.existsSync('data/native-execution.json')?read('data/native-execution.json'):null;
const executions=new Map((native?.results||[]).map(r=>[r.id,r]));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const ledger={},failures=[];
for(const q of questions){
  const entry={id:q.id,status:'passed',checks:[],sources:[],scope:notes.scope};
  try{
    const {review:priorReview,verification:priorLabel,...reviewedContent}=q;
    assert.equal(hash(JSON.stringify(reviewedContent)),approvedContent[q.id],'Question wording, code, answer or explanation changed since substantive review');
    if(q.type==='theory'){
      const approved=review.glossary[q.topic];assert.equal(approved.length,10);
      const concepts=q.definitions.map(definition=>{const matches=approved.filter(c=>c.definition===definition);assert.equal(matches.length,1,'Definition missing from reviewed glossary');return matches[0];});
      const expected=concepts.map(c=>c.term).join(' → ');
      assert.equal(q.answer,expected,'Theory answer disagrees with reviewed meaning');
      assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);
      const valid=q.options.filter(option=>option.split(' → ').every((term,i)=>term===concepts[i]?.term)&&option.split(' → ').length===concepts.length);
      assert.deepEqual(valid,[q.answer],'Exactly one semantically matched choice is required');
      assert.equal(q.explanation,concepts.map(c=>c.explanation).join('\n\n'),'Explanation changed since semantic review');
      for(const option of q.options.filter(v=>v!==q.answer))assert(q.wrongReasons[option]&&concepts.some((c,i)=>option.split(' → ')[i]!==c.term));
      entry.checks=['Definition meaning and scope reviewed','Full ordered answer independently reconstructed from the reviewed glossary','Every distractor rejected against its corresponding definition','Explanation matches reviewed content'];
      entry.rationales=concepts.map(c=>c.reviewRationale);entry.sources=[...new Set(concepts.map(c=>c.source))];
      entry.execution={status:'not-applicable',method:'Semantic/source review'};
      q.verification='Definition, answer, distractors, and explanation reviewed';
    }else{
      const calc=numerical.get(q.id);assert.equal(calc?.status,'passed',calc?.detail||'No independent calculation');
      const texts=[q.solution||q.code,...(q.compareCode?[q.compareCode]:[])];
      for(const text of texts)assert(snippetReview.snippets[hash(text)],'Snippet changed since syntax/assumption review');
      entry.checks=['Stored input independently identified','Reference result independently recalculated without generator imports','Stored expectedValue and answer checked against independent result','Snippet syntax, boundaries, assumptions and explanation reviewed'];
      if(q.type==='logic')entry.checks.push('Both complete snippets recalculated; B minus A checked');
      if(q.type==='complete')entry.checks.push('Filling the single blank exactly reconstructs the reviewed model');
      if(q.type==='create')entry.checks.push('Prompt requirements, model solution and rubric reviewed; user submissions remain self-assessed');
      entry.calculation=calc;entry.sources=[q.source];
      const evidence=texts.map(text=>executions.get(hash(text)));
      const failed=evidence.find(e=>e?.status==='failed');assert(!failed,'Native execution failed: '+JSON.stringify(failed));
      entry.execution={status:evidence.every(e=>e?.status==='passed')?'passed':'not-executed',evidence:evidence.filter(Boolean).map(({id,topic,band,expected,actual,status,method,reason})=>({hash:id,status,method,expected,actual,reason})),reason:evidence.every(e=>e?.status==='passed')?undefined:'Native execution is not available for all snippets in this record; the independent calculation and reviewed-code checks passed.'};
      q.verification='Independent calculation and snippet review passed';
    }
    // This binds the audit to all content fields. A later regeneration without
    // another audit is detected by the review-integrity test.
    const {review:oldReview,...content}=q;
    entry.contentHash=hash(JSON.stringify(content));
    q.review={status:'passed',method:q.type==='theory'?'semantic-review':'independent-calculation',execution:entry.execution.status,contentHash:entry.contentHash};
  }catch(error){entry.status='failed';entry.detail=error.message;failures.push(entry);}
  ledger[q.id]=entry;
}
const summary={generatedAt:new Date().toISOString(),total:questions.length,passed:questions.length-failures.length,failed:failures.length,theoryReviewed:questions.filter(q=>q.type==='theory'&&ledger[q.id].status==='passed').length,independentlyCalculated:questions.filter(q=>q.type!=='theory'&&ledger[q.id].status==='passed').length,nativeExecutionCovered:questions.filter(q=>ledger[q.id].execution?.status==='passed').length,nativeExecutionNotCovered:questions.filter(q=>q.type!=='theory'&&ledger[q.id].execution?.status!=='passed').length,scope:notes.scope,limits:notes.nativeExecutionLimits,corrections:notes.corrections};
fs.writeFileSync('data/audit-summary.json',JSON.stringify(summary,null,2));
fs.writeFileSync('data/question-audit.json',JSON.stringify({summary,questions:ledger},null,2));
if(failures.length){console.error(failures.slice(0,10));process.exitCode=1;}
else{for(const {topic,bank} of banks)fs.writeFileSync(`data/${topic}.json`,JSON.stringify(bank));console.log(`Audit passed for all ${summary.total} stored questions: ${summary.theoryReviewed} theory records, ${summary.independentlyCalculated} independent calculations; ${summary.nativeExecutionCovered} records also covered by native execution.`);}
