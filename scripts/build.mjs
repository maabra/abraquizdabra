import fs from 'node:fs';
import {topics,levels,types} from './topics.mjs';
import {makeExercise} from './exercises.mjs';

fs.mkdirSync('data',{recursive:true});
const numericOptions=(value,seed)=>{
  const choices=[value];
  for(const delta of [1,-1,2,-2,3,5]) {
    if(choices.length===4) break;
    if(!choices.includes(value+delta)) choices.push(value+delta);
  }
  const shift=seed%4;
  return choices.slice(shift).concat(choices.slice(0,shift)).map(String);
};
let total=0;
for(const topic of topics) {
  const questions=[];
  for(let l=0;l<4;l++) for(let seed=0;seed<10;seed++) {
    const ex=makeExercise(topic.id,l,seed);
    const next=makeExercise(topic.id,l,seed+1);
    for(const type of types) {
      const q={id:`${topic.id}-${l}-${type}-${seed}`,topic:topic.id,level:levels[l],type,source:topic.source,family:`${topic.id}-${l}`,variant:seed+1,verification:'Reference provided; independent review pending'};
      if(type==='theory') {
        const concepts=Array.from({length:l+1},(_,j)=>topic.concepts[(seed+j)%10]);
        const wrong=Array.from({length:3},(_,offset)=>concepts.map((c,j)=>topic.concepts[(seed+j+offset+1)%10].term).join(' → '));
        q.prompt=l===0?'Which term fits this definition?':'Match the definitions to their terms, in the same order.';
        q.definitions=concepts.map(c=>c.definition);
        q.answer=concepts.map(c=>c.term).join(' → ');
        const choices=[q.answer,...wrong],shift=(seed+l)%4;
        q.options=choices.slice(shift).concat(choices.slice(0,shift));
        q.explanation=concepts.map(c=>`${c.term}: ${c.why}`).join('\n\n');
        q.wrongReasons=Object.fromEntries(wrong.map(option=>[option,'This sequence assigns at least one definition to a different concept. '+concepts.map(c=>`${c.definition} describes ${c.term}.`).join(' ')]));
        q.focus=concepts.map(c=>c.term).join(', ');
      } else {
        Object.assign(q,{code:ex.code,language:ex.language,assumption:ex.assumption||'Report the final numeric output only; ignore trailing newline and formatting.',focus:ex.focus,explanation:ex.explain,expectedValue:ex.result,runtime:ex.executable||null,dependency:ex.dependency||null});
        if(type==='output') {q.prompt='What numeric value does this snippet produce?';q.answer=String(ex.result);}
        if(type==='complete') {
          q.prompt=`Complete the ${ex.focus} exercise: replace ___ to obtain ${ex.result}. Goal: ${ex.task} One canonical answer is provided; equivalent solutions can be self-reviewed.`;
          // Use the final occurrence to avoid masking an earlier explanatory
          // comment or the input declaration instead of the working expression.
          const hole=ex.code.lastIndexOf(ex.token);
          q.code=ex.code.slice(0,hole)+'___'+ex.code.slice(hole+ex.token.length);q.answer=ex.token;q.solution=ex.code;
          if(!ex.assumption)q.assumption='Fill only the code blank. The completed snippet must produce the stated numeric result.';
        }
        if(type==='create') {
          q.prompt=ex.task;q.solution=ex.code;q.answer=null;delete q.code;
          q.assumption='Submit a code solution, or a model plan when the task explicitly permits pseudocode. Compare it with the model after submission.'+(ex.assumption?' Reference conditions: '+ex.assumption:' The solution should produce the numeric result requested by the task.');
          if(topic.id==='wireshark')q.contextCode=ex.code.split('# Display filter:')[0].trim();
          q.rubric=[`Use ${topic.name}${ex.language==='pseudocode'?' related pseudocode or a model construction plan':''} and the stated input.`,`Implement the specified operations and boundaries.`,`Obtain the expected numeric result ${ex.result}.`,`Explain the intermediate steps and assumptions.`];
          q.verification='Model solution supplied; self-review required';
        }
        if(type==='logic') {
          q.prompt='Compare A and B. What is the numeric change in the result (B minus A)? Both complete snippets are provided below.';
          if(!ex.assumption)q.assumption='Calculate the final requested value of each snippet, then answer with B minus A.';
          q.compareCode=next.code;q.answer=String(next.result-ex.result);q.options=numericOptions(next.result-ex.result,seed+l);
          q.explanation=`A produces ${ex.result}. ${ex.explain}\n\nB produces ${next.result}. ${next.explain}\n\nB − A = ${next.result} − ${ex.result} = ${next.result-ex.result}.`;
          q.wrongReasons=Object.fromEntries(q.options.filter(v=>v!==q.answer).map(v=>[v,`The requested quantity is B minus A, not an individual result or reversed subtraction. ${next.result} − ${ex.result} = ${q.answer}.`]));
        }
      }
      questions.push(q);
    }
  }
  fs.writeFileSync(`data/${topic.id}.json`,JSON.stringify(questions));
  total+=questions.length;
}
fs.writeFileSync('data/catalog.json',JSON.stringify(topics.map(({concepts,...topic})=>({...topic,count:200,levels:Object.fromEntries(levels.map(l=>[l,50]))})),null,2));
console.log(`Built ${total} questions: ${topics.length} topics × 4 bands × 50. Generated parameter variants are explicitly identified.`);
