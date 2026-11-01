import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {checkTypeScriptCases} from '../scripts/typescript-runtime.mjs';
import {matchesTopic} from '../lib.js';

test('TypeScript compiler rejects type errors even in executable JavaScript',()=>{
  assert.throws(()=>checkTypeScriptCases([{id:'invalid',code:'const n: number = "3"; console.log(n);',expected:3}]),/not assignable to type 'number'/);
});

test('stored TypeScript solutions compile strictly and produce independently checked answers',()=>{
  const bank=JSON.parse(fs.readFileSync('data/typescript.json'));
  assert.equal(bank.length,200);
  const cases=new Map();
  for(const q of bank.filter(q=>q.type!=='theory')){
    const code=q.solution||q.code;
    cases.set(code,{id:q.id,code,expected:q.expectedValue});
    if(q.compareCode)cases.set(q.compareCode,{id:q.id+'-B',code:q.compareCode,expected:q.expectedValue+Number(q.answer)});
  }
  assert.equal(cases.size,44,'Includes the extra B input at each difficulty');
  const results=checkTypeScriptCases([...cases.values()]);
  assert(results.every(r=>r.status==='passed'),JSON.stringify(results.filter(r=>r.status!=='passed')));
  const wrong=structuredClone(bank.find(q=>q.type==='output'));
  wrong.expectedValue++;wrong.answer=String(wrong.expectedValue);
  const run=spawnSync('python',['scripts/audit_oracle.py'],{input:JSON.stringify([...bank,wrong]),encoding:'utf8'});
  assert.equal(run.status,0);
  const checked=JSON.parse(run.stdout);
  assert(checked.slice(0,-1).every(q=>q.status==='passed'));
  assert.equal(checked.at(-1).status,'failed','Independent calculation must reject matching but wrong generator values');
});

test('TypeScript search supports its common abbreviation',()=>{
  const topic={id:'typescript',name:'TypeScript',category:'Languages'};
  assert(matchesTopic(topic,'ts'));
  assert(matchesTopic(topic,'type script'));
});
