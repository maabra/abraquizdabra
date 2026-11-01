import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const report=JSON.parse(fs.readFileSync('data/question-audit.json'));
const catalog=JSON.parse(fs.readFileSync('data/catalog.json'));
let count=0;
for(const topic of catalog)for(const q of JSON.parse(fs.readFileSync(`data/${topic.id}.json`))){
  const {review,...content}=q;
  const hash=crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
  assert.equal(report.questions[q.id]?.status,'passed',q.id+' has no passed review');
  assert.equal(review?.contentHash,hash,q.id+' changed after review');
  assert.equal(report.questions[q.id].contentHash,hash,q.id+' ledger is stale');
  count++;
}
assert.equal(count,6600);assert.equal(Object.keys(report.questions).length,count);
assert.equal(report.summary.failed,0);
console.log(`PASS: ${count} per-question audit records match the current question content.`);
