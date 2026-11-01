export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
// A simple review schedule based on the latest result, not a mastery estimate.
export function studyPool(id,answers,now=Date.now()){
  const result=answers[id];
  if(!result)return 'unanswered';
  if(result.status==='incorrect'||result.status==='skipped')return 'review';
  const time=Date.parse(result.time);
  return result.status==='correct'&&Number.isFinite(time)&&now-time>=7*86400000?'review':null;
}
export function latestPracticeResults(store){
  const latest={};
  const sessions=[...(store.history||[]),...(store.parked||[]),store.lastSession,store.session].filter(Boolean);
  for(const result of [...sessions.flatMap(s=>s.results||[]),...Object.values(store.answers||{})]){
    const previous=latest[result.id];
    if(!previous||(Date.parse(result.time)||0)>=(Date.parse(previous.time)||0))latest[result.id]=result;
  }
  return latest;
}
export function studyRecommendations(catalog,answers,now=Date.now()){
  return catalog.map(topic=>{
    const rows=Object.values(answers).filter(r=>r.topic===topic.id);
    const review=rows.filter(r=>studyPool(r.id,answers,now)==='review').length;
    return {topic:topic.id,review,unanswered:Math.max(0,200-rows.filter(r=>r.status!=='skipped').length),studied:rows.length};
  }).filter(item=>item.review||item.unanswered).sort((a,b)=>b.review-a.review||b.studied-a.studied).slice(0,3);
}
export function shuffle(items,random=Math.random){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function exactDecimal(input){
  const text=String(input??'').trim();if(text.length>512)return null;
  const match=/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(text);
  if(!match)return null;
  const fraction=match[3]??match[4]??'';
  let exponent=Number(match[5]||0)-fraction.length;
  if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>10000)return null;
  let digits=((match[2]||'')+fraction).replace(/^0+/,'');
  if(!digits)return '0';
  const trimmed=digits.replace(/0+$/,'');exponent+=digits.length-trimmed.length;digits=trimmed;
  return (match[1]==='-'?'-':'')+digits+'e'+exponent;
}
export function numericMatch(input,expected){const a=exactDecimal(input),b=exactDecimal(expected);return a!==null&&b!==null&&a===b;}
// Compare lexical tokens: whitespace may separate two identifiers or operators,
// and removing it would turn `a + +b` into the different expression `a++b`.
function codeTokens(value,language){
  if(language==='shell')return String(value).match(/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s"'])+/g)||[];
  if(language==='css')return (String(value).match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\d+(?:\.\d+)?(?:[a-zA-Z%]+)?|--[\w-]+|[a-zA-Z_][\w-]*|[^\s]/g)||[]);
  return (String(value).match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|(?:===|!==|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\?\?|\*\*|\/\/|<<|>>|:=|\+=|-=|\*=|\/=|->|::)|[\p{L}_$][\p{L}\p{N}_$]*|\d+(?:\.\d+)?|[^\s]/gu)||[]).map(token=>language==='sql'&&!/^["'`]/.test(token)?token.toLowerCase():token);
}
export function canonicalMatch(input,expected,language=''){return JSON.stringify(codeTokens(input,language))===JSON.stringify(codeTokens(expected,language));}
// Suggestions never affect grading. Require an otherwise matching token stream
// and one small identifier edit; numbers, strings and operators stay exact.
export function codeTypoHint(q,answer){
  if(!['complete','create'].includes(q.type)||typeof answer!=='string'||answer.length>10000)return null;
  const expected=q.type==='complete'?q.answer:q.solution;
  if(typeof expected!=='string'||expected.length>10000)return null;
  const actual=codeTokens(answer,q.language),model=codeTokens(expected,q.language);
  if(actual.length!==model.length)return null;
  const differences=actual.map((token,i)=>token===model[i]?null:i).filter(i=>i!==null);
  if(differences.length!==1)return null;
  const index=differences[0],from=actual[index],to=model[index];
  const identifier=/^[\p{L}_$][\p{L}\p{N}_$]*$/u;
  if(!identifier.test(from)||!identifier.test(to)||Math.min(from.length,to.length)<4||Math.max(from.length,to.length)>64)return null;
  let close=false;
  if(from.length===to.length){
    const changed=[...from].map((c,i)=>c===to[i]?null:i).filter(i=>i!==null);
    close=changed.length===1||(changed.length===2&&changed[1]===changed[0]+1&&from[changed[0]]===to[changed[1]]&&from[changed[1]]===to[changed[0]]);
  }else if(Math.abs(from.length-to.length)===1){
    const shorter=from.length<to.length?from:to,longer=from.length<to.length?to:from;
    let i=0;while(i<shorter.length&&shorter[i]===longer[i])i++;
    close=shorter.slice(i)===longer.slice(i+1);
  }
  return close?{from,to}:null;
}
export function gradeAnswer(q,answer){return q.type==='output'?numericMatch(answer,q.answer):q.type==='complete'?canonicalMatch(answer,q.answer,q.language):q.options?.includes(answer)&&answer===q.answer;}
export function summarize(results){const valid=results.filter(r=>r&&['correct','incorrect','skipped'].includes(r.status));const graded=valid.filter(r=>!r.selfAssessed&&r.status!=='skipped');return {graded:graded.length,correct:graded.filter(r=>r.status==='correct').length,selfReviewed:valid.filter(r=>r.selfAssessed&&r.status!=='skipped').length,skipped:valid.filter(r=>r.status==='skipped').length};}

export const QUESTION_ID=/^([a-z][a-z0-9]*)-([0-3])-(theory|logic|output|complete|create)-([0-9])$/;
const BANDS=['Easy','Medium','Hard','Very hard'];
export const answerLimit=type=>type==='create'?10000:type==='complete'?2000:type==='theory'?512:128;
export function emptyStore(){return {version:1,answers:{},saved:[],session:null,lastSession:null,parked:[],history:[],notes:{},preferences:{}};}
export function newSessionId(){return globalThis.crypto?.randomUUID?.()||'session-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
export function sessionKey(value){
  if(typeof value?.id==='string'&&/^[a-zA-Z0-9_-]{6,100}$/.test(value.id))return value.id;
  let hash=2166136261;for(const char of `${value?.topic}|${value?.ids?.join(',')}|${value?.completedAt||value?.startedAt||''}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return 'legacy-'+(hash>>>0).toString(36);
}
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function cleanResult(raw,id){
  const parts=QUESTION_ID.exec(id||'');
  if(!parts||!object(raw)||!['correct','incorrect','skipped'].includes(raw.status))return null;
  const type=parts[3];
  if(raw.answer!==null&&typeof raw.answer!=='string'&&typeof raw.answer!=='number')return null;
  const answer=raw.answer===null?null:String(raw.answer).slice(0,answerLimit(type));
  if(raw.status!=='skipped'&&(answer===null||!answer.trim()))return null;
  const date=typeof raw.time==='string'&&Number.isFinite(Date.parse(raw.time))?new Date(raw.time).toISOString():null;
  return {id,topic:parts[1],type,level:BANDS[Number(parts[2])],time:date,answer,status:raw.status,selfAssessed:raw.status!=='skipped'&&(type==='create'||(type==='complete'&&raw.selfAssessed===true))};
}
export function cleanSession(raw,topics=null){
  if(!object(raw)||typeof raw.topic!=='string'||(topics&&!topics.has(raw.topic))||!Array.isArray(raw.ids))return null;
  const ids=[...new Set(raw.ids.filter(id=>typeof id==='string'&&QUESTION_ID.exec(id)?.[1]===raw.topic))].slice(0,200);
  if(!ids.length)return null;
  const results=new Map();
  for(const result of Array.isArray(raw.results)?raw.results:[]){const clean=cleanResult(result,result?.id);if(clean&&ids.includes(clean.id))results.set(clean.id,clean);}
  let index=Number.isInteger(raw.index)?Math.max(0,Math.min(raw.index,ids.length)):0;
  // A torn or edited save cannot skip ungraded questions in the prefix.
  for(let i=0;i<index;i++)if(!results.has(ids[i])){index=i;break;}
  const draft=typeof raw.draft==='string'?raw.draft.slice(0,answerLimit(QUESTION_ID.exec(ids[Math.min(index,ids.length-1)])[3])):'';
  const drafts={};
  if(object(raw.drafts))for(const [id,value] of Object.entries(raw.drafts))if(ids.includes(id)&&object(value))drafts[id]={answer:typeof value.answer==='string'?value.answer.slice(0,answerLimit(QUESTION_ID.exec(id)[3])):'',selection:typeof value.selection==='string'?value.selection.slice(0,512):null,revealed:value.revealed===true};
  return {id:sessionKey(raw),topic:raw.topic,ids,index,results:ids.filter(id=>results.has(id)).map(id=>results.get(id)),draft,selection:typeof raw.selection==='string'?raw.selection.slice(0,512):null,revealed:raw.revealed===true,drafts,startedAt:typeof raw.startedAt==='string'&&Number.isFinite(Date.parse(raw.startedAt))?new Date(raw.startedAt).toISOString():null,completedAt:typeof raw.completedAt==='string'&&Number.isFinite(Date.parse(raw.completedAt))?new Date(raw.completedAt).toISOString():null};
}
export function rememberSession(list,value,limit){return [value,...list.filter(item=>sessionKey(item)!==sessionKey(value))].slice(0,limit);}
export function cleanStore(raw,topicIds=null){
  const state=emptyStore(),topics=topicIds?new Set(topicIds):null;
  if(!object(raw)||raw.version!==1||!object(raw.answers)||!Array.isArray(raw.saved))throw Error('This is not a supported AbraQuizDabra progress file.');
  let ignored=0;
  for(const [id,value] of Object.entries(raw.answers)){
    const result=cleanResult(value,id);
    if(result&&(!topics||topics.has(result.topic))&&result.status!=='skipped')state.answers[id]=result;else ignored++;
  }
  state.saved=[...new Set(raw.saved.filter(id=>typeof id==='string'&&QUESTION_ID.test(id)&&(!topics||topics.has(QUESTION_ID.exec(id)[1]))))];
  ignored+=raw.saved.length-state.saved.length;
  state.session=cleanSession(raw.session,topics);state.lastSession=cleanSession(raw.lastSession,topics);
  if(raw.session&&!state.session)ignored++;
  if(raw.lastSession&&!state.lastSession)ignored++;
  if(state.lastSession&&state.lastSession.index!==state.lastSession.ids.length)state.lastSession=null;
  for(const [field,limit,completed] of [['parked',8,false],['history',20,true]])for(const value of (Array.isArray(raw[field])?raw[field]:[]).slice(0,100)){
    const item=cleanSession(value,topics);
    if(item&&(completed?item.index===item.ids.length:item.index<item.ids.length)&&!state[field].some(s=>s.id===item.id)&&item.id!==state.session?.id)state[field].push(item);else ignored++;
    if(state[field].length===limit)break;
  }
  if(state.lastSession&&!state.history.some(item=>item.id===state.lastSession.id))state.history=rememberSession(state.history,state.lastSession,20);
  if(object(raw.notes))for(const [id,note] of Object.entries(raw.notes))if(QUESTION_ID.test(id)&&(!topics||topics.has(QUESTION_ID.exec(id)[1]))&&typeof note==='string'&&note.trim())state.notes[id]=note.slice(0,1000);else ignored++;
  if(object(raw.preferences))state.preferences={maximized:raw.preferences.maximized===true,largeText:raw.preferences.largeText===true,wrapCode:raw.preferences.wrapCode===true,favorites:[...new Set((Array.isArray(raw.preferences.favorites)?raw.preferences.favorites:[]).filter(id=>typeof id==='string'&&(!topics||topics.has(id))))].slice(0,100)};
  return {state,ignored};
}
export function mergeProgress(current,incoming){
  const result=structuredClone(current);
  for(const [id,answer] of Object.entries(incoming.answers))if(!result.answers[id]||(Date.parse(answer.time)||0)>(Date.parse(result.answers[id].time)||0))result.answers[id]=answer;
  result.saved=[...new Set([...result.saved,...incoming.saved])];
  result.session=result.session||incoming.session;
  result.notes={...incoming.notes,...result.notes};
  result.parked=[...result.parked,...incoming.parked,...(current.session&&incoming.session&&sessionKey(current.session)!==sessionKey(incoming.session)?[incoming.session]:[])].filter((value,index,items)=>value&&sessionKey(value)!==sessionKey(result.session)&&items.findIndex(item=>sessionKey(item)===sessionKey(value))===index).slice(0,8);
  result.history=[...result.history,...incoming.history].filter((value,index,items)=>items.findIndex(item=>sessionKey(item)===sessionKey(value))===index).sort((a,b)=>(Date.parse(b.completedAt)||0)-(Date.parse(a.completedAt)||0)).slice(0,20);
  if(!result.lastSession||(Date.parse(incoming.lastSession?.completedAt)||0)>(Date.parse(result.lastSession.completedAt)||0))result.lastSession=incoming.lastSession||result.lastSession;
  return result;
}
const aliases={javascript:'js ecmascript',typescript:'ts type script',python:'py',csharp:'csharp c sharp cs',cpp:'cpp c plus plus',dotnet:'dotnet dot net aspnet',node:'node nodejs node js',compose:'docker compose yaml',rest:'rest http api',inventor:'autodesk inventor ilogic',cfd:'autodesk cfd fluid dynamics',mysql:'my sql',numpy:'numpy arrays',opencv:'opencv cv2 computer vision'};
export function matchesTopic(topic,query){const needle=query.trim().toLowerCase();return !needle||`${topic.name} ${topic.category} ${aliases[topic.id]||''}`.toLowerCase().includes(needle);}

export function validateQuestionBank(data,topic){
  if(!Array.isArray(data)||data.length!==200)throw Error('The topic must contain 200 question records.');
  const ids=new Set(),counts=new Map();
  for(const q of data){
    const parts=QUESTION_ID.exec(q?.id||'');
    if(!parts||parts[1]!==topic||q.topic!==topic||q.type!==parts[3]||q.level!==BANDS[Number(parts[2])]||ids.has(q.id))throw Error('Question identities or difficulty labels are inconsistent.');
    ids.add(q.id);const key=parts[2]+'-'+parts[3];counts.set(key,(counts.get(key)||0)+1);
    if(q.review?.status!=='passed'||!/^[a-f0-9]{64}$/.test(q.review.contentHash||''))throw Error('A question is missing its recorded content review.');
    if(typeof q.prompt!=='string'||!q.prompt.trim()||typeof q.explanation!=='string'||!q.explanation.trim())throw Error('A question is missing its prompt or explanation.');
    let source;try{source=new URL(q.source);}catch{throw Error('Invalid documentation URL.');}
    if(!['http:','https:'].includes(source.protocol))throw Error('Invalid documentation protocol.');
    if(q.type==='theory'||q.type==='logic'){
      if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(v=>typeof v!=='string')||new Set(q.options).size!==4||!q.options.includes(q.answer))throw Error('Multiple-choice answers are invalid.');
      if(q.options.filter(v=>v!==q.answer).some(v=>typeof q.wrongReasons?.[v]!=='string'))throw Error('Incorrect choices need explanations.');
    }
    if(q.type==='theory'&&(!Array.isArray(q.definitions)||!q.definitions.length||q.definitions.some(v=>typeof v!=='string')))throw Error('Theory definitions are missing.');
    if(q.type!=='theory'&&(typeof q.expectedValue!=='number'||!Number.isFinite(q.expectedValue)))throw Error('Invalid expected value.');
    if(['output','logic'].includes(q.type)&&(!numericMatch(q.answer,q.answer)||typeof q.code!=='string'))throw Error('The numeric question is incomplete.');
    if(q.type==='logic'&&typeof q.compareCode!=='string')throw Error('The comparison snippet is missing.');
    if(['complete','create'].includes(q.type)&&typeof q.solution!=='string')throw Error('The model solution is missing.');
    if(q.type==='complete'&&(typeof q.answer!=='string'||typeof q.code!=='string'||q.code.split('___').length!==2||q.code.replace('___',()=>q.answer)!==q.solution))throw Error('The completion cannot reconstruct its model.');
    if(q.type==='create'&&(q.answer!==null||!Array.isArray(q.rubric)||!q.rubric.length||q.rubric.some(item=>typeof item!=='string'||!item.trim())))throw Error('The creation checklist is missing or invalid.');
  }
  if(counts.size!==20||[...counts.values()].some(count=>count!==10))throw Error('Question formats must contain ten records per difficulty band.');
  return data;
}
export async function verifyQuestionBank(data,provider=globalThis.crypto){
  if(!provider?.subtle){for(const q of data)Object.defineProperty(q,'contentIntegrity',{value:'unavailable',configurable:true});return data;}
  const encoder=new TextEncoder();
  await Promise.all(data.map(async q=>{
    if(q.review?.status!=='passed'||!/^[a-f0-9]{64}$/.test(q.review.contentHash||''))throw Error('A question is missing its recorded content review.');
    const {review,...content}=q;
    const actual=[...new Uint8Array(await provider.subtle.digest('SHA-256',encoder.encode(JSON.stringify(content))))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    if(actual!==review.contentHash)throw Error('Question content does not match its review fingerprint. Refresh the site or contact the site owner.');
    Object.defineProperty(q,'contentIntegrity',{value:'verified',configurable:true});
  }));
  return data;
}
