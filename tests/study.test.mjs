import test from 'node:test';
import assert from 'node:assert/strict';
import {studyPool,studyRecommendations} from '../lib.js';
const now=Date.parse('2026-10-31T12:00:00Z');
test('review schedule handles errors, skipped work, dates and self review',()=>{
  const answers={wrong:{status:'incorrect'},skip:{status:'skipped'},old:{status:'correct',time:'2026-10-24T12:00:00Z',selfAssessed:true},recent:{status:'correct',time:'2026-10-30T12:00:00Z'},unknown:{status:'correct',time:null},future:{status:'correct',time:'2026-11-01T12:00:00Z'}};
  for(const id of ['wrong','skip','old'])assert.equal(studyPool(id,answers,now),'review');
  for(const id of ['recent','unknown','future'])assert.equal(studyPool(id,answers,now),null);
  assert.equal(studyPool('new',answers,now),'unanswered');
});
test('recommendations prioritize review, then studied topics, without mutating progress',()=>{
  const answers={a:{id:'a',topic:'python',status:'correct',time:'2026-10-30T12:00:00Z'},b:{id:'b',topic:'sql',status:'incorrect'}};
  const snapshot=JSON.stringify(answers);
  const result=studyRecommendations(['java','python','sql','css'].map(id=>({id})),answers,now);
  assert.deepEqual(result.map(r=>r.topic),['sql','python','java']);
  assert.equal(result[0].review,1);assert.equal(result[1].unanswered,199);
  assert.equal(JSON.stringify(answers),snapshot);
});
