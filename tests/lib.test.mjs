import test from 'node:test';
import assert from 'node:assert/strict';
import {shuffle,numericMatch,canonicalMatch,summarize,escapeHtml} from '../lib.js';
test('numeric grading accepts formatting without accepting blank or executable expressions',()=>{
  for(const answer of [' 12 ','12.0','+12','1.2e1'])assert(numericMatch(answer,'12'));
  for(const answer of ['', ' ', '0xC','6+6','12px','Infinity','NaN','12,0'])assert(!numericMatch(answer,'12'));
  assert(numericMatch('0','0'));assert(numericMatch('-0.5','-0.5'));
});
test('canonical grading tolerates layout but preserves quoted string content',()=>{
  assert(canonicalMatch('a +\n b','a+b'));
  assert(!canonicalMatch('"ADD score :inc"','"ADDscore:inc"'));
  assert(!canonicalMatch('b + a','a + b')); // Alternatives require explicit self-review.
});
test('accuracy excludes skipped and self-assessed work',()=>{
  assert.deepEqual(summarize([{status:'correct'},{status:'incorrect'},{status:'skipped'},{status:'correct',selfAssessed:true},{status:'incorrect',selfAssessed:true}]),{graded:2,correct:1,selfReviewed:2,skipped:1});
  assert.equal(summarize([]).graded,0);
});
test('shuffle preserves all records without mutating the question bank',()=>{
  const input=[1,2,3,4],out=shuffle(input,()=>0);
  assert.deepEqual(input,[1,2,3,4]);assert.deepEqual([...out].sort(),input);assert.notDeepEqual(out,input);
});
test('code markup and saved answers are escaped before HTML rendering',()=>{
  assert.equal(escapeHtml('<img src=x onerror="evil()">&\''),'&lt;img src=x onerror=&quot;evil()&quot;&gt;&amp;&#39;');
});
