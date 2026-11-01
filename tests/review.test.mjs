import test from 'node:test';
import assert from 'node:assert/strict';
import {latestPracticeResults,studyRecommendations,emptyStore} from '../lib.js';
test('latest attempts include retained skips while preserving answered statistics',()=>{
  const state=emptyStore();
  const id='python-0-output-0';
  state.answers[id]={id,topic:'python',status:'correct',answer:'1',time:'2026-10-20T00:00:00Z'};
  state.history=[{results:[{id,topic:'python',status:'skipped',answer:'',time:'2026-10-21T00:00:00Z'}]}];
  const snapshot=JSON.stringify(state);
  assert.equal(latestPracticeResults(state)[id].status,'skipped');
  assert.equal(state.answers[id].status,'correct');
  assert.equal(studyRecommendations([{id:'python'}],latestPracticeResults(state))[0].review,1);
  state.answers[id]={...state.answers[id],time:'2026-10-22T00:00:00Z'};
  assert.equal(latestPracticeResults(state)[id].status,'correct');
  state.answers[id].time='2026-10-20T00:00:00Z';
  assert.equal(JSON.stringify(state),snapshot);
});
test('active and parked attempts are included, duplicates collapse, and current grades win ties',()=>{
  const state=emptyStore(),id='sql-0-output-0',r={id,topic:'sql',status:'incorrect',time:'2026-10-20T00:00:00Z'};
  state.parked=[{results:[r]}];state.session={results:[r]};state.lastSession={results:[r]};
  state.answers[id]={...r,status:'correct'};
  assert.deepEqual(Object.keys(latestPracticeResults(state)),[id]);
  assert.equal(latestPracticeResults(state)[id].status,'correct');
  delete state.answers[id];state.parked=[];state.lastSession=null;
  assert.equal(latestPracticeResults(state)[id].status,'incorrect');
  state.session=null;assert.deepEqual(latestPracticeResults(state),{});
});
test('fully explored topics without due questions do not hide actionable recommendations',()=>{
  const now=Date.parse('2026-10-31T00:00:00Z'),answers={};
  for(let i=0;i<200;i++)answers[i]={id:String(i),topic:'python',status:'correct',time:'2026-10-31T00:00:00Z'};
  assert.deepEqual(studyRecommendations([{id:'python'},{id:'sql'}],answers,now).map(r=>r.topic),['sql']);
});
