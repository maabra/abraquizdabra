import test from 'node:test';
import assert from 'node:assert/strict';
import {codeTypoHint,gradeAnswer} from '../lib.js';

test('code typo hints cover substitutions, missing/extra letters and transpositions',()=>{
  const q={type:'complete',language:'python',answer:'print(total)'};
  for(const word of ['prinz','prit','priint','pirnt']){
    assert.deepEqual(codeTypoHint(q,`${word}(total)`),{from:word,to:'print'});
    assert.equal(gradeAnswer(q,`${word}(total)`),false,'Suggestions must never accept invalid code');
  }
  assert.equal(codeTypoHint(q,'print ( total )'),null);
  assert.equal(gradeAnswer(q,'print ( total )'),true);
});

test('typo hints leave numeric answers, literals, operators and short identifiers exact',()=>{
  for(const [expected,answer] of [['print(12)','print(13)'],['print("hello")','print("hellp")'],['total + value','total - value'],['a + b','a + c'],['print(total)','prinz(value)']]){
    assert.equal(codeTypoHint({type:'complete',language:'python',answer:expected},answer),null);
  }
  assert.equal(codeTypoHint({type:'output',answer:'100'},'101'),null);
  assert.equal(codeTypoHint({type:'theory',answer:'print'},'prinz'),null);
});

test('creation hints are advisory for otherwise matching reference code only',()=>{
  const q={type:'create',language:'python',solution:'n = 3\nprint(n * 3 + 2)'};
  assert.deepEqual(codeTypoHint(q,'n = 3\nprinz(n * 3 + 2)'),{from:'prinz',to:'print'});
  assert.equal(codeTypoHint(q,'print(11)'),null,'Equivalent programs need no spelling correction');
  assert.equal(codeTypoHint(q,'x'.repeat(10001)),null);
  assert.equal(codeTypoHint(q,null),null);
});
