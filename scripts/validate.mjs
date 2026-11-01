import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {spawnSync,execFile} from 'node:child_process';
import {topics,levels,types} from './topics.mjs';
import {makeExercise} from './exercises.mjs';

const ids=new Set(), signatures=new Set();
const cases=[],results=[],shellCases=[];
let total=0;
for(const topic of topics) {
  assert.equal(topic.concepts.length,10,topic.id);
  const qs=JSON.parse(fs.readFileSync(`data/${topic.id}.json`));
  assert.equal(qs.length,200);
  for(const level of levels) {
    assert.equal(qs.filter(q=>q.level===level).length,50);
    for(const type of types) assert.equal(qs.filter(q=>q.level===level&&q.type===type).length,10);
  }
  for(const q of qs) {
    assert(!ids.has(q.id));ids.add(q.id);
    assert(q.explanation?.length>20,q.id);
    assert(q.prompt&&q.focus&&q.source,q.id);
    const signature=JSON.stringify([q.topic,q.type,q.prompt,q.definitions,q.code,q.compareCode]);
    assert(!signatures.has(signature),`Exact duplicate: ${q.id}`);signatures.add(signature);
    if(q.options) {
      assert.equal(q.options.length,4);
      assert.equal(new Set(q.options).size,4,q.id);
      assert.equal(q.options.filter(x=>x===q.answer).length,1,q.id);
      assert(q.options.filter(x=>x!==q.answer).every(x=>q.wrongReasons[x]));
    }
    if(q.type==='complete') assert(q.code.includes('___')&&q.solution.includes(q.answer),q.id);
    if(q.type==='create') assert(q.solution&&q.rubric.length===4);
  }
  for(let l=0;l<4;l++)for(let seed=0;seed<=10;seed++) {
    const ex=makeExercise(topic.id,l,seed);
    if(!ex.executable) continue;
    const testcase={id:`${topic.id}-${l}-${seed}`,topic:topic.id,code:ex.code,expected:ex.result,runtime:ex.executable};
    if(ex.executable==='javascript') {
      const output=[];
      vm.runInNewContext(ex.code,{console:{log:v=>output.push(v)}},{timeout:200});
      assert.deepEqual(output,[ex.result],testcase.id);
      results.push({id:testcase.id,status:'passed',detail:'Executed with Node.js vm, isolated context and timeout.'});
    } else if(ex.executable.startsWith('shell-'))shellCases.push(testcase);
    else cases.push(testcase);
  }
  total+=qs.length;
}
const python=spawnSync('python',['scripts/check-python.py'],{input:JSON.stringify(cases),encoding:'utf8',maxBuffer:10*1024*1024,timeout:120000});
if(python.status!==0) throw Error(python.stderr||python.error||'Python verification failed');
results.push(...JSON.parse(python.stdout));
const shell=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/bash';
const scratch=path.resolve('.qa','references-'+Date.now());
async function runShellCase(c){
  if(!fs.existsSync(shell))return {id:c.id,status:'unavailable',detail:'No compatible local POSIX shell'};
  const directory=path.join(scratch,c.id);
  fs.mkdirSync(directory,{recursive:true});
  const env={...process.env,GIT_AUTHOR_NAME:'Quiz validation',GIT_AUTHOR_EMAIL:'quiz@example.invalid',GIT_COMMITTER_NAME:'Quiz validation',GIT_COMMITTER_EMAIL:'quiz@example.invalid',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'commit.gpgsign',GIT_CONFIG_VALUE_0:'false'};
  const run=await new Promise(resolve=>execFile(shell,['--noprofile','--norc','-c','set -e\nset -o pipefail\n'+c.code],{cwd:directory,env,encoding:'utf8',timeout:30000,windowsHide:true},(error,stdout,stderr)=>resolve({status:error?(typeof error.code==='number'?error.code:127):0,error,stdout,stderr})));
  const value=Number(run.stdout?.trim().split(/\r?\n/).at(-1));
  const unavailable=run.status===127;
  const passed=run.status===0&&value===c.expected;
  return {id:c.id,status:passed?'passed':unavailable?'unavailable':'failed',detail:passed?'Executed in an isolated scratch directory with POSIX shell.':`${run.stderr||run.error||''} Expected ${c.expected}, got ${value}`};
}
for(let start=0;start<shellCases.length;start+=4)results.push(...await Promise.all(shellCases.slice(start,start+4).map(runShellCase)));
const failures=results.filter(x=>x.status==='failed');
for(const failure of failures) console.error(failure);
const report={generatedAt:new Date().toISOString(),questions:total,topics:topics.length,structuralChecks:'passed',executedCases:results.filter(x=>x.status==='passed').length,unavailableCases:results.filter(x=>x.status==='unavailable').length,failedCases:failures.length,notes:['Parameterized practice bank: 132 topic/band families with ten input variants and five question formats.','Difficulty labels indicate progression within a family, not independently calibrated expert difficulty.','Runtime checks cover supported local interpreters only, including the extra input used in B comparisons.','Theory and vendor GUI/model exercises have reference links but are not independently certified.','Code creation requires self-review; this website never executes submitted code.'],results};
fs.writeFileSync('data/verification.json',JSON.stringify(report,null,2));
assert.equal(failures.length,0,'Runtime verification failed');
console.log(`PASS: ${total} unique question records; 50 per band/topic; 4 distinct MCQ choices with one answer; explanations and solutions present.`);
console.log(`Runtime cases: ${report.executedCases} passed, ${report.unavailableCases} unavailable, ${report.failedCases} failed. See data/verification.json.`);
