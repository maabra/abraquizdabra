import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {numericMatch,canonicalMatch,cleanStore,cleanSession,cleanResult,emptyStore,mergeProgress,matchesTopic,summarize,gradeAnswer} from '../lib.js';

const result=(id,answer='11',time='2026-01-01T00:00:00Z')=>({id,answer,time,status:'correct',selfAssessed:false});
test('numeric grading cannot round distinct large integers or underflow nonzero values to zero',()=>{
  assert(!numericMatch('9007199254740993','9007199254740992'));
  assert(!numericMatch('1e-400','0'));
  assert(!numericMatch('0.100000000000000000001','0.1'));
  assert(numericMatch('-0.000e999','0'));
  assert(numericMatch('12.500e-1','1.25'));
  assert(!numericMatch('1e999999999999999999','1'));
});
test('canonical comparison preserves identifier and compound-operator boundaries',()=>{
  assert(!canonicalMatch('a b','ab'));
  assert(!canonicalMatch('a + +b','a++b'));
  assert(!canonicalMatch('| |','||'));
  assert(canonicalMatch('a + b','a+b'));
  assert(canonicalMatch('select SUM(value)','SELECT sum(value)','sql'));
  assert(!canonicalMatch('"Name"','"name"','sql'));
});
test('invalid progress versions and malformed roots are rejected without partial imports',()=>{
  for(const value of [null,[],{}, {version:99,answers:{},saved:[]},{version:1,answers:[],saved:[]}])assert.throws(()=>cleanStore(value));
});
test('schema cleaning rejects malformed records, deduplicates bookmarks and derives metadata from ids',()=>{
  const raw=emptyStore();raw.answers['python-0-output-0']={...result('python-0-output-0'),topic:'wrong',level:'wrong'};
  raw.answers['python-0-output-1']=null;raw.answers['python-9-output-0']=result('x');raw.answers['unknown-0-output-0']=result('x');
  raw.saved=['python-0-output-0','python-0-output-0',null,'<img>','unknown-0-output-0'];
  const {state,ignored}=cleanStore(raw,['python']);
  assert.deepEqual(Object.keys(state.answers),['python-0-output-0']);
  assert.equal(state.answers['python-0-output-0'].topic,'python');assert.equal(state.answers['python-0-output-0'].level,'Easy');
  assert.deepEqual(state.saved,['python-0-output-0']);assert(ignored>=3);
  assert.equal(cleanResult({...result('x'),answer:null},'python-0-output-0'),null);
});
test('creation results stay self-assessed even when imported metadata claims automatic grading',()=>{
  const record=cleanResult(result('python-0-create-0','print(11)'),'python-0-create-0');assert(record.selfAssessed);
  assert.equal(summarize([record]).graded,0);
});
test('skipped creation records remain skipped rather than appearing as self-reviewed',()=>{
  const record=cleanResult({answer:null,status:'skipped',selfAssessed:true},'python-0-create-0');
  assert.equal(record.selfAssessed,false);assert.equal(record.status,'skipped');
  assert.deepEqual(summarize([record]),{graded:0,correct:0,selfReviewed:0,skipped:1});
});
test('malformed indexes, duplicate queue items and missing result prefixes are recovered safely',()=>{
  const raw={topic:'python',ids:['python-0-output-0','python-0-output-0','bad','python-0-output-1'],index:'NaN',results:'bad',draft:'11'};
  const fixed=cleanSession(raw,new Set(['python']));assert.equal(fixed.index,0);assert.equal(fixed.ids.length,2);
  raw.index=200;raw.results=[];assert.equal(cleanSession(raw).index,0);
  raw.results=[result('python-0-output-0')];assert.equal(cleanSession(raw).index,1);
  assert.equal(cleanSession({...raw,ids:[]}),null);
});
test('merging retains newer local results and the unfinished session',()=>{
  const local=emptyStore(),incoming=emptyStore();
  local.answers['python-0-output-0']=result('python-0-output-0','11','2026-02-01T00:00:00Z');
  incoming.answers['python-0-output-0']=result('python-0-output-0','99','2026-01-01T00:00:00Z');
  local.session={topic:'python'};incoming.session={topic:'javascript'};local.saved=['python-0-output-0'];incoming.saved=['python-0-output-0','python-0-output-1'];
  const merged=mergeProgress(local,incoming);
  assert.equal(merged.answers['python-0-output-0'].answer,'11');assert.equal(merged.session.topic,'python');assert.equal(merged.saved.length,2);
  assert.equal(local.saved.length,1);
});
test('search accepts common aliases and ignores outer whitespace',()=>{
  assert(matchesTopic({id:'csharp',name:'C#',category:'Languages'},' C SHARP '));
  assert(matchesTopic({id:'node',name:'Node.js',category:'Tools'},'nodejs'));
  assert(matchesTopic({id:'cpp',name:'C++',category:'Languages'},'c plus plus'));
  assert(!matchesTopic({id:'java',name:'Java',category:'Languages'},'python'));
});
test('every auto-graded reference answer remains accepted after grading changes',()=>{
  const catalog=JSON.parse(fs.readFileSync('data/catalog.json'));
  for(const topic of catalog)for(const question of JSON.parse(fs.readFileSync(`data/${topic.id}.json`)))if(question.type!=='create')assert(gradeAnswer(question,question.answer),question.id);
});
test('prototype keys and unrelated session records do not enter progress',()=>{
  const raw=JSON.parse('{"version":1,"answers":{"__proto__":{"polluted":true}},"saved":[]}');
  assert.equal(Object.keys(cleanStore(raw).state.answers).length,0);
  assert.equal({}.polluted,undefined);
  const saved={topic:'python',ids:['python-0-output-0'],index:1,results:[result('java-0-output-0')]};
  assert.equal(cleanSession(saved).index,0);
});
