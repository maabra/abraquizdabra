import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalMatch,validateQuestionBank,verifyQuestionBank,emptyStore,cleanStore,cleanSession,rememberSession,sessionKey,mergeProgress} from '../lib.js';

const session=(id='session-0001',completed=false)=>({id,topic:'python',ids:['python-0-output-0'],index:completed?1:0,results:completed?[{id:'python-0-output-0',answer:'11',status:'correct',time:'2026-01-01T00:00:00Z'}]:[],draft:'11',drafts:{'python-0-output-0':{answer:'11',selection:null,revealed:false}},startedAt:'2026-01-01T00:00:00Z',completedAt:completed?'2026-01-01T00:01:00Z':null});
test('shell flags and CSS dimensions cannot be split into invalid tokens',()=>{
  assert(!canonicalMatch('- hex','-hex','shell'));
  assert(!canonicalMatch('git rev-list -- count HEAD','git rev-list --count HEAD','shell'));
  assert(canonicalMatch('git   rev-list --count HEAD','git rev-list --count HEAD','shell'));
  assert(!canonicalMatch('width: 30 px','width: 30px','css'));
  assert(canonicalMatch('width : 30px','width:30px','css'));
});
test('all stored banks pass complete runtime shape validation',()=>{
  for(const topic of JSON.parse(fs.readFileSync('data/catalog.json')))assert.equal(validateQuestionBank(JSON.parse(fs.readFileSync(`data/${topic.id}.json`)),topic.id).length,200);
});
test('partial banks, duplicate identities, invalid options and unsafe source protocols are rejected',()=>{
  const original=JSON.parse(fs.readFileSync('data/python.json'));
  assert.throws(()=>validateQuestionBank(original.slice(0,199),'python'));
  let modified=structuredClone(original);modified[1].id=modified[0].id;assert.throws(()=>validateQuestionBank(modified,'python'));
  modified=structuredClone(original);modified[0].options[1]=modified[0].options[0];assert.throws(()=>validateQuestionBank(modified,'python'));
  modified=structuredClone(original);modified[0].source='javascript:alert(1)';assert.throws(()=>validateQuestionBank(modified,'python'));
});
test('content fingerprints verify actual stored records and reject modified wording',async()=>{
  const bank=JSON.parse(fs.readFileSync('data/python.json'));
  await verifyQuestionBank(bank);assert.equal(bank[0].contentIntegrity,'verified');
  bank[0].prompt+=' Changed';await assert.rejects(()=>verifyQuestionBank(bank),/fingerprint/);
});
test('unavailable Web Crypto is reported explicitly without pretending to verify a fingerprint',async()=>{
  const bank=JSON.parse(fs.readFileSync('data/python.json'));await verifyQuestionBank(bank,null);assert.equal(bank[0].contentIntegrity,'unavailable');
});
test('session history is deduplicated, bounded and migrates legacy latest results',()=>{
  const list=[];let saved=list;for(let i=0;i<25;i++)saved=rememberSession(saved,session('session-'+i.toString().padStart(4,'0'),true),20);
  assert.equal(saved.length,20);assert.equal(saved[0].id,'session-0024');
  assert.equal(rememberSession(saved,saved[0],20).length,20);
  const raw=emptyStore();raw.lastSession=session('session-legacy',true);
  assert.equal(cleanStore(raw,['python']).state.history.length,1);
});
test('notes and per-question drafts are bounded and invalid identities are discarded',()=>{
  const raw=emptyStore();raw.notes={'python-0-output-0':'a'.repeat(1500),'bad':'unsafe'};raw.session=session();
  raw.session.drafts.bad={answer:'no'};
  const state=cleanStore(raw,['python']).state;
  assert.equal(state.notes['python-0-output-0'].length,1000);assert.equal(state.notes.bad,undefined);
  assert.equal(state.session.drafts.bad,undefined);assert.equal(state.session.drafts['python-0-output-0'].answer,'11');
  assert.equal(sessionKey(cleanSession(state.session)),state.session.id);
});
test('merging keeps both distinct unfinished sessions, existing notes and completed history',()=>{
  const local=emptyStore(),remote=emptyStore();local.session=session('session-local');remote.session=session('session-remote');
  local.notes['python-0-output-0']='local note';remote.notes['python-0-output-0']='remote note';remote.notes['python-0-output-1']='new note';remote.history=[session('session-done',true)];
  const merged=mergeProgress(local,remote);
  assert.equal(merged.session.id,'session-local');assert.equal(merged.parked[0].id,'session-remote');
  assert.equal(merged.notes['python-0-output-0'],'local note');assert.equal(merged.notes['python-0-output-1'],'new note');assert.equal(merged.history.length,1);
});
