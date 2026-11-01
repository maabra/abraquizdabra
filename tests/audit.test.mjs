import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

test('independent oracle detects a wrong output, wrong comparison, and malformed completion',()=>{
  const bank=JSON.parse(fs.readFileSync('data/python.json'));
  const output=structuredClone(bank.find(q=>q.type==='output'));
  output.answer=String(Number(output.answer)+1);
  output.expectedValue=Number(output.answer); // Both generator fields agree but are wrong.
  const logic=structuredClone(bank.find(q=>q.type==='logic'));
  logic.answer=String(Number(logic.answer)+1);
  const completion=structuredClone(bank.find(q=>q.type==='complete'));
  completion.answer='999';
  const run=spawnSync('python',['scripts/audit_oracle.py'],{input:JSON.stringify([output,logic,completion]),encoding:'utf8'});
  assert.equal(run.status,0);assert(JSON.parse(run.stdout).every(r=>r.status==='failed'));
});
test('reviewed glossary retains logical OR and scoped definitions',()=>{
  const review=JSON.parse(fs.readFileSync('audit/reviewed-concepts.json')).glossary;
  assert.match(review.javascript.find(c=>c.term==='nullish coalescing').explanation,/\|\|/);
  assert.match(review.cpp.find(c=>c.term==='vector').explanation,/vector<bool>/);
  assert.match(review.openssl.find(c=>c.term==='digest').explanation,/SHAKE/);
});
