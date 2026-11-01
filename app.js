import {latestPracticeResults, studyPool, studyRecommendations, shuffle, summarize, emptyStore, cleanStore, cleanSession, mergeProgress, gradeAnswer, answerLimit, matchesTopic, newSessionId, sessionKey, rememberSession, validateQuestionBank, verifyQuestionBank, QUESTION_ID, escapeHtml as esc} from './lib.js';

const $=s=>document.querySelector(s);
const main=$('#main');
const dialog=$('#setup-dialog');
const categories=['All topics','Languages','Frameworks & tools','Data & engineering','Design & hardware'];
const levels=['Easy','Medium','Hard','Very hard'];
const formats={theory:'Theory',logic:'Logic',output:'Predict output',complete:'Complete code',create:'Write code'};
let catalog=[],auditSummary=null,cache=new Map(),view='home',filter='All topics',query='',sort='default',savedQuery='',savedPage=0,savedQuestions=[],setup=null,session=null,selection=null,submitted=false,revealed=false;
let storageAvailable=true,storageWarning='',toastTimer,renderToken=0,startRequest=0,pendingLaunch=null,importBusy=false,importRequest=0; 
let lastSavedRaw=null,writeConflict=false,conflictRaw=null,memoryBackup=null,pendingImport=null,libraryPool='all',savedFilter='all',sessionFilter='all',activeHistory=null;
let reviewQuestions=[],reviewQuery='',reviewStatus='all',reviewTopic='all',reviewFormat='all',reviewPage=0;
let store=readStore();

function readStore(){
  let raw;
  try{raw=localStorage.getItem('abraquizdabra.v1');lastSavedRaw=raw;localStorage.setItem('abraquizdabra.probe','1');localStorage.removeItem('abraquizdabra.probe');}
  catch{storageAvailable=false;return emptyStore();}
  if(raw){try{const cleaned=cleanStore(JSON.parse(raw));if(cleaned.ignored)storageWarning='Invalid saved entries were ignored.';return cleaned.state;}catch{storageWarning='Saved data could not be read. New progress will be saved when you use the quiz.';}}
  return emptyStore();
}
function markConflict(raw){
  writeConflict=true;
  if(!document.querySelector('#write-conflict'))main.insertAdjacentHTML('afterbegin',storageNotice());
}
function makeBackup(reason){
  memoryBackup={createdAt:new Date().toISOString(),reason,state:structuredClone(store),persisted:false};
  try{localStorage.setItem('abraquizdabra.backup.v1',JSON.stringify({...memoryBackup,persisted:true}));memoryBackup.persisted=true;}catch{}
}
function save(force=false){
  if(!storageAvailable)return false;
  const text=JSON.stringify(store);
  try{
    const latest=localStorage.getItem('abraquizdabra.v1');
    if(!force&&(writeConflict||latest!==lastSavedRaw&&latest!==text)){markConflict(latest);return false;}
    localStorage.setItem('abraquizdabra.v1',text);lastSavedRaw=text;return true;
  }catch(error){
    if(error.name==='QuotaExceededError')try{
      const old=localStorage.getItem('abraquizdabra.backup.v1');if(old&&!memoryBackup)memoryBackup={...JSON.parse(old),persisted:false};
      localStorage.removeItem('abraquizdabra.backup.v1');if(memoryBackup)memoryBackup.persisted=false;
      localStorage.setItem('abraquizdabra.v1',text);lastSavedRaw=text;return true;
    }catch{}
    storageAvailable=false;if(!document.querySelector('#storage-status'))main.insertAdjacentHTML('afterbegin',storageNotice());toast('Progress could not be saved. Export a copy before leaving this page.');return false;
  }
}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
async function fetchJSON(url){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('File could not be loaded ('+response.status+').');return await response.json();}
  catch(error){throw Error(error.name==='AbortError'?'The request timed out. Try again.':error.message);}
  finally{clearTimeout(timeout);}
}
async function questions(topic){
  if(cache.has(topic)){const data=await cache.get(topic);reconcileGrades(data);return data;}
  if(!topicBy(topic))throw Error('Unknown topic.');
  const loading=fetchJSON(`./data/${encodeURIComponent(topic)}.json`).then(async data=>{
    validateQuestionBank(data,topic);
    await verifyQuestionBank(data);
    cache.set(topic,data);reconcileGrades(data);return data;
  }).catch(error=>{cache.delete(topic);throw error;});
  cache.set(topic,loading);return loading;
}
function reconcileGrades(bank){
  let changed=false;
  for(const q of bank){const record=store.answers[q.id];if(record&&!record.selfAssessed){const status=gradeAnswer(q,record.answer)?'correct':'incorrect';if(record.status!==status){record.status=status;changed=true;}}}
  if(changed)save();
}
function topicBy(id){return catalog.find(t=>t.id===id);}
const iconColors={python:['#edf2f8','#6289a5'],javascript:['#fbf4d7','#ad983b'],java:['#f7eae6','#b87560'],c:['#e9eef8','#758bb5'],cpp:['#e8f0f8','#668ab8'],csharp:['#f1e8f7','#9d6eae'],php:['#edf0fa','#818cbd'],react:['#e7f3f7','#6d9faf'],vue:['#e9f4ee','#6d9d83'],node:['#edf3e6','#7d9d63'],html:['#faede5','#bd8868'],css:['#e9edf9','#7f91c1'],git:['#f9ebe6','#bf8874']};
function topicIcon(t){const [bg,color]=iconColors[t.id]||['#f0eafa','#9478b2'];return `<span class="topic-icon" style="--icon-bg:${bg};--icon-color:${color}">${esc(t.icon)}</span>`;}
function storageNotice(){
  if(writeConflict)return '<div class="not-storage" id="write-conflict">Saved progress changed in another tab. This tab is keeping its work in memory until you choose how to combine it. <button class="text-btn" data-action="review-conflict">Review changes</button> <button class="text-btn" data-action="export">Export this tab</button></div>';
  return !storageAvailable?'<div class="not-storage" id="storage-status">Progress is kept only for this visit because browser storage is unavailable. <button class="text-btn" data-action="export">Export progress</button> <button class="text-btn" data-action="retry-save">Retry saving</button></div>':storageWarning?`<div class="not-storage">${esc(storageWarning)}</div>`:'';
}
function loadError(error){main.innerHTML=storageNotice()+`<div class="empty"><h1>Unable to load this section</h1><p>${esc(error.message)}</p><p>Your saved session has been retained.</p><button class="secondary" data-action="reload">Try again</button> <a href="#library" class="text-btn">Topic library</a></div>`;}
function showSidebar(open){
  $('#sidebar').classList.toggle('open',open);$('.mobile-menu').setAttribute('aria-expanded',String(open));
  const mobile=matchMedia('(max-width:760px)').matches;
  $('#sidebar').inert=mobile&&!open;$('.workspace').inert=mobile&&open;
}
function restoreWindowPreference(){const maximized=store.preferences?.maximized===true;$('#app-window').classList.toggle('maximized',maximized);document.body.classList.toggle('large-text',store.preferences?.largeText===true);document.body.classList.toggle('wrap-code',store.preferences?.wrapCode===true);document.querySelectorAll('[data-action="large-text"]').forEach(button=>button.setAttribute('aria-pressed',String(store.preferences?.largeText===true)));document.querySelectorAll('[data-action="toggle-wrap"]').forEach(button=>button.setAttribute('aria-pressed',String(store.preferences?.wrapCode===true)));document.querySelectorAll('[data-action="maximize-window"]').forEach(button=>{button.setAttribute('aria-pressed',String(maximized));button.title=maximized?'Restore window size':'Maximize window';});}
function setPage(name){$('#page-name').textContent=name;document.title=`${name} · AbraQuizDabra`;document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===view));}
function navigate(target){if(location.hash==='#'+target)route();else location.hash=target;}
async function route(){
  const token=++renderToken;toggleStartMenu(false);
  if(dialog.open){startRequest++;pendingLaunch=null;pendingImport=null;dialog.close();}
  const hash=location.hash.slice(1).split('?')[0]||'home';
  view=['home','library','progress','review','bookmarks','sessions','about','quiz','results'].includes(hash)?hash:'home';
  showSidebar(false);
  if(view==='library'){const params=new URLSearchParams(location.hash.split('?')[1]||'');if(params.size){query=(params.get('q')||'').slice(0,200);filter=categories.includes(params.get('category'))?params.get('category'):'All topics';sort=['default','name','unanswered'].includes(params.get('sort'))?params.get('sort'):'default';libraryPool=['all','favorites','mistakes','unanswered'].includes(params.get('pool'))?params.get('pool'):'all';}}
  try{
    if(view==='quiz'){
      if(store.session&&(!session||session.index>=session.queue.length)){const restored=await hydrateSession(store.session);if(token!==renderToken)return;session=restored;}
      if(token!==renderToken)return;
      if(!session){navigate('library');return;}
      if(session.index>=session.queue.length){navigate('results');return;}
      renderQuestion();
    }else if(view==='results'){
      if(activeHistory||store.lastSession){const restored=await hydrateSession(activeHistory||store.lastSession);if(token!==renderToken)return;session=restored;}
      if(!session||session.index<session.queue.length){navigate('progress');return;}
      renderResults();
    }else if(view==='home'||view==='library')renderLibrary();
    else if(view==='progress')await renderProgress();
    else if(view==='review')await renderReview(token);
    else if(view==='sessions')renderSessions();
    else if(view==='about')renderAbout();
    else await renderBookmarks(token);
    if(token===renderToken&&view!=='quiz')main.focus({preventScroll:true});
  }catch(error){if(token===renderToken)loadError(error);}
}
function hero(){return `<section class="hero" aria-label="Programming practice"><div><div class="eyebrow">WELCOME TO ABRAQUIZDABRA</div><h2>Programming practice</h2><p>Select a topic and difficulty level. Answer theory questions, trace code, and compare your solutions with explained answers.</p><button class="primary" data-action="start-python">Start Python quiz <span>→</span></button></div><div class="code-art" aria-hidden="true"><div class="mini-editor"><div class="editor-dots"><span>example.py - Python</span></div><pre><span class="dim">1</span>  values = [<span class="mint">2, 4, 6</span>]
<span class="dim">2</span>  result = sum(values)
<span class="dim">3</span>  <span class="violet">print</span>(result)

12</pre></div></div></section>`;}
function card(t){
  const done=Object.keys(store.answers).filter(id=>id.startsWith(t.id+'-')).length;
  return `<article class="topic-card"><a href="#quiz" class="card-link" data-action="setup" data-topic="${t.id}" aria-label="Practice ${esc(t.name)}: 200 questions"></a><div class="card-heading">${topicIcon(t)}<button class="favorite-topic" data-action="favorite-topic" data-topic="${t.id}" aria-pressed="${(store.preferences.favorites||[]).includes(t.id)}" aria-label="${(store.preferences.favorites||[]).includes(t.id)?'Remove':'Add'} ${esc(t.name)} ${'favorite'}">${(store.preferences.favorites||[]).includes(t.id)?'★':'☆'}</button><span class="topic-count">200 questions</span></div><h3>${esc(t.name)}</h3><p class="topic-desc">${esc(t.category)}</p><div class="level-dots"><b></b><span>Easy</span><b></b><span>Medium</span><b></b><span>Hard</span><b></b><span>Very hard</span></div><div class="card-bottom">${done?`<span>${done} / 200 explored</span><span class="progress-mini"><i style="width:${done/2}%"></i></span>`:'<span>50 questions per level</span><strong>Start quiz →</strong>'}<button class="topic-details" data-action="topic-details" data-topic="${t.id}">Details</button></div></article>`;
}
function libraryCards(){
  const matching=catalog.filter(t=>(filter==='All topics'||t.category===filter)&&matchesTopic(t,query)&&(libraryPool==='all'||libraryPool==='favorites'&&(store.preferences.favorites||[]).includes(t.id)||libraryPool==='mistakes'&&Object.values(store.answers).some(r=>r.topic===t.id&&r.status==='incorrect')||libraryPool==='unanswered'&&Object.values(store.answers).filter(r=>r.topic===t.id).length<200));
  if(sort==='name')matching.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==='unanswered')matching.sort((a,b)=>Object.values(store.answers).filter(r=>r.topic===a.id).length-Object.values(store.answers).filter(r=>r.topic===b.id).length||a.name.localeCompare(b.name));
  const shown=view==='home'&&!query.trim()&&filter==='All topics'&&libraryPool==='all'?matching.slice(0,9):matching;
  $('#topic-grid').innerHTML=shown.length?shown.map(card).join(''):'<div class="empty"><div class="empty-icon">⌕</div><h2>No topics found</h2><p>Try another search or select All topics.</p><button class="secondary" data-action="clear-filters">Clear search and filters</button></div>';
  $('#library-count').textContent=query.trim()||filter!=='All topics'||libraryPool!=='all'?`${matching.length} topic${matching.length===1?'':'s'} to explore`:'Select a topic to begin.';
  if($('#all-topics-link'))$('#all-topics-link').hidden=!(view==='home'&&!query.trim()&&filter==='All topics'&&libraryPool==='all');
  if(view==='library'){
    const params=new URLSearchParams();if(query.trim())params.set('q',query.trim());if(filter!=='All topics')params.set('category',filter);if(sort!=='default')params.set('sort',sort);if(libraryPool!=='all')params.set('pool',libraryPool);
    history.replaceState(null,'',location.pathname+location.search+'#library'+(params.size?'?'+params.toString():''));
  }
}
function renderLibrary(){
  setPage(view==='home'?'Overview':'Topic library');
  const title=view==='home'?`<div class="greeting"><div><h1>AbraQuizDabra</h1><p>Programming quizzes and code exercises.</p></div><span class="date-label">33 topics available</span></div>`:`<div class="page-heading"><div class="eyebrow">QUESTION BANK</div><h1 style="margin-top:12px">Topic library</h1><p>33 languages, frameworks, tools, and engineering subjects. Select a topic and difficulty level to start a quiz.</p></div>`;
  main.innerHTML=storageNotice()+title+(store.session?`<div class="continue-banner"><div><strong>Saved quiz session</strong><small>Continue from your last question.</small></div><button class="secondary" data-action="resume">Continue session ↗</button></div>`:'')+(view==='home'?hero()+`<div class="stats"><div class="stat"><span class="stat-icon">▤</span><div><strong>6,600</strong><small>Practice questions</small></div></div><div class="stat"><span class="stat-icon">⌘</span><div><strong>33</strong><small>Topics</small></div></div><div class="stat"><span class="stat-icon">▥</span><div><strong>4</strong><small>Difficulty levels</small></div></div></div>`:'')+`<section aria-labelledby="topics-title"><div class="section-top"><div><h2 id="topics-title">${view==='home'?'Available topics':'The topic library'}</h2><p id="library-count" role="status">Select a topic to begin.</p></div><label class="search"><span aria-hidden="true">⌕</span><input id="topic-search" type="search" placeholder="Search a topic…" aria-label="Search topics" value="${esc(query)}"></label></div><div class="library-tools"><label class="topic-sort">Show <select id="library-pool"><option value="all">All topics</option><option value="favorites">Favorite topics</option><option value="mistakes">Topics needing practice</option><option value="unanswered">Topics with unanswered questions</option></select></label><label class="topic-sort">Sort topics <select id="topic-sort"><option value="default">Original order</option><option value="name">Name</option><option value="unanswered">Least answered first</option></select></label></div><div class="filters" role="group" aria-label="Topic categories">${categories.map(c=>`<button class="filter ${filter===c?'active':''}" data-action="filter" data-category="${esc(c)}" aria-pressed="${filter===c}">${esc(c==='Frameworks & tools'?'Frameworks & tools':c==='Data & engineering'?'Data & analysis':c==='Design & hardware'?'Design & hardware':c)} <small>${c==='All topics'?33:catalog.filter(t=>t.category===c).length}</small></button>`).join('')}</div><div class="topic-grid" id="topic-grid"></div><div class="bottom-note"><p>Five question formats, each with an explanation.<br>Includes parameterized variants. <a href="#about">See how the bank is built and checked.</a></p>${view==='home'?'<a class="text-btn" id="all-topics-link" href="#library">View all 33 topics <span>→</span></a>':''}</div></section>`;
  $('#topic-sort').value=sort;$('#library-pool').value=libraryPool;libraryCards();
}
function openSetup(id,pool='all'){
  const topic=topicBy(id);if(!topic)return;
  startRequest++;if(dialog.open)dialog.close();pendingLaunch=null;
  setup={topic:id,level:'Easy'};
  dialog.innerHTML=`<div class="dialog-heading">${topicIcon(topic)}<div><h2 id="setup-title">${esc(topic.name)}</h2><p>200 questions · 4 levels · 5 formats</p></div><button class="close" data-action="close-dialog" aria-label="Close quiz setup">×</button></div><p class="setup-intro">Select a level, question format, practice set, and session length.</p><span class="form-label">DIFFICULTY</span><div class="segmented" role="group" aria-label="Difficulty">${[...levels,'All levels'].map(l=>`<button data-action="level" data-level="${l}" class="${l===setup.level?'selected':''}" aria-pressed="${l===setup.level}">${l}</button>`).join('')}</div><div class="setup-row"><label><span class="form-label">QUESTION FORMAT</span><select id="setup-format"><option value="all">All question formats</option>${Object.entries(formats).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label><label><span class="form-label">SESSION LENGTH</span><select id="setup-count"><option value="10">10 questions</option><option value="20">20 questions</option><option value="50">50 questions</option><option value="all">All matching questions</option></select></label></div><label><span class="form-label">PRACTICE SET</span><select id="setup-pool"><option value="all">All questions</option><option value="unanswered">Not yet answered</option><option value="mistakes">Needs practice</option><option value="review">Scheduled review</option><option value="saved">Saved questions</option></select></label><label class="shuffle-label"><input id="setup-shuffle" type="checkbox" checked> Shuffle the questions</label><div class="setup-note">Each level contains ten questions of every format. Related variants share a family. Code creation uses a model answer and self-review; submitted code is never executed.</div><div class="dialog-actions"><span id="setup-available" role="status"></span><button class="primary" data-action="begin">Start quiz</button></div>`;
  $('#setup-pool').value=pool;
  if(pool==='review'||pool==='unanswered'){setup.level='All levels';dialog.querySelectorAll('[data-action="level"]').forEach(button=>{const selected=button.dataset.level===setup.level;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});}
  updateSetup();dialog.showModal();
}
function eligible(id,pool){return pool==='review'&&studyPool(id,latestPracticeResults(store))==='review'||pool==='all'||pool==='unanswered'&&!store.answers[id]||pool==='mistakes'&&store.answers[id]?.status==='incorrect'||pool==='saved'&&store.saved.includes(id);}
function updateSetup(){
  if(!setup||!$('#setup-format'))return;
  const type=$('#setup-format').value,pool=$('#setup-pool').value;
  const ids=levels.flatMap((l,band)=>setup.level!==l&&setup.level!=='All levels'?[]:Object.keys(formats).flatMap(t=>type!=='all'&&type!==t?[]:Array.from({length:10},(_,i)=>`${setup.topic}-${band}-${t}-${i}`))).filter(id=>eligible(id,pool));
  const count=$('#setup-count');for(const option of count.options){option.disabled=option.value!=='all'&&Number(option.value)>ids.length;}
  count.querySelector('[value="all"]').textContent=ids.length?`All ${ids.length} matching questions`:'No matching questions';
  if(count.selectedOptions[0]?.disabled)count.value='all';
  $('#setup-available').textContent=ids.length?`${ids.length} questions available`:'No matches. Change the level, format or practice set.';
  dialog.querySelector('[data-action="begin"]').disabled=!ids.length;
}
async function begin(){
  if(!setup||!$('#setup-format'))return;
  const button=dialog.querySelector('[data-action="begin"]');if(button.disabled)return;
  const request=++startRequest,selected={topic:setup.topic,level:setup.level,type:$('#setup-format').value,count:$('#setup-count').value,pool:$('#setup-pool').value,shuffle:$('#setup-shuffle').checked};
  button.disabled=true;button.textContent='Loading…';
  try{
    const data=await questions(selected.topic);
    if(request!==startRequest||!dialog.open)return;
    let queue=data.filter(q=>(selected.level==='All levels'||q.level===selected.level)&&(selected.type==='all'||q.type===selected.type)&&eligible(q.id,selected.pool));
    if(selected.shuffle)queue=shuffle(queue);
    queue=queue.slice(0,selected.count==='all'?queue.length:Math.min(Number(selected.count),queue.length));
    if(!queue.length){button.textContent='Start quiz';updateSetup();toast('No questions match this practice set.');return;}
    launchSession({topic:selected.topic,queue,index:0,results:[],draft:'',selection:null,revealed:false});
  }catch(error){if(request===startRequest&&dialog.open){button.disabled=false;button.textContent='Try again';toast(error.message);}}
}
function serializeSession(value){if(!value.id)value.id=newSessionId();if(!value.startedAt)value.startedAt=new Date().toISOString();return {id:value.id,startedAt:value.startedAt,drafts:value.drafts||{},topic:value.topic,ids:value.queue.map(q=>q.id),index:value.index,results:value.results,draft:value.draft||'',selection:value.selection??null,revealed:value.revealed===true,completedAt:value.completedAt||null};}
function captureDraft(){if(!session||session.index>=session.queue.length)return;session.drafts=session.drafts||{};const q=session.queue[session.index];session.drafts[q.id]={answer:session.draft||'',selection:session.selection??null,revealed:session.revealed===true};}
function persistSession(){captureDraft();store.session=session?serializeSession(session):null;save();}
async function hydrateSession(value){
  const saved=cleanSession(value,new Set(catalog.map(t=>t.id)));if(!saved)throw Error('The saved session is invalid. You can reset it from My progress or start a new quiz.');
  const data=await questions(saved.topic),map=new Map(data.map(q=>[q.id,q]));
  if(saved.ids.some(id=>!map.has(id)))throw Error('A question in this session is no longer available. Export your progress before starting a new quiz.');
  const results=saved.results.map(r=>r.selfAssessed||r.status==='skipped'?r:{...r,status:gradeAnswer(map.get(r.id),r.answer)?'correct':'incorrect'});
  const current=map.get(saved.ids[saved.index]);
  return {...saved,results,queue:saved.ids.map(id=>map.get(id)),selection:current?.options?.includes(saved.selection)?saved.selection:null,revealed:current?.type==='create'&&saved.revealed};
}
async function resumeSession(){
  const request=++startRequest,token=renderToken,saved=store.session;if(!saved){toast('No unfinished session is saved.');return;}
  const restored=await hydrateSession(saved);if(saved!==store.session||request!==startRequest||token!==renderToken)return;
  session=restored;activeHistory=null;pendingLaunch=null;if(dialog.open)dialog.close();navigate('quiz');
}
function launchSession(nextSession,replace=false){
  if(store.session&&!replace){
    pendingLaunch=nextSession;
    dialog.innerHTML='<div class="dialog-heading"><h2 id="setup-title">Unfinished quiz session</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p class="setup-intro">Starting the selected quiz will move the current unfinished session to Saved sessions. Up to eight unfinished sessions are retained; submitted answers and bookmarks remain available.</p><div class="dialog-actions"><button class="secondary" data-action="resume">Continue saved session</button><button class="primary" data-action="replace-session">Start selected quiz</button></div>';
    if(!dialog.open)dialog.showModal();return;
  }
  if(store.session){makeBackup('Before switching quiz sessions');store.parked=rememberSession(store.parked,store.session,8);}
  session=nextSession;activeHistory=null;pendingLaunch=null;persistSession();if(dialog.open)dialog.close();navigate('quiz');
}
function codeBlock(code,language,label='Code'){
  return `<div class="code-block"><div class="code-title"><span>${esc(label)}</span><span>${esc(language||'text')} <button class="copy-code" data-action="copy-code" aria-label="Copy ${esc(label)}">Copy</button></span></div><pre tabindex="0"><code>${highlight(code)}</code></pre></div>`;
}
function highlight(code){
  // Tokenize before escaping so user-visible markup can never become HTML.
  const re=/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b(?:const|let|var|def|return|for|in|if|else|while|import|from|class|public|static|void|int|using|new|SELECT|FROM|WHERE|AS|WITH|RECURSIVE|SUM|COUNT|JOIN|ON|UNION|ALL|print|True|False|None|function|export|default|Dim|As|Integer|Next|For|To|Then)\b)/g;
  let output='',last=0;
  for(const match of code.matchAll(re)){
    output+=esc(code.slice(last,match.index));
    const token=match[0],kind=token.startsWith('//')||token.startsWith('#')||token.startsWith('/*')?'comment':token.startsWith('"')||token.startsWith("'")?'string':/^\d/.test(token)?'number':'keyword';
    output+=`<span class="syntax-${kind}">${esc(token)}</span>`;last=match.index+token.length;
  }
  return output+esc(code.slice(last));
}
function checkedStatus(q){
  if(q.review?.status==='passed'){
    if(q.type==='theory')return 'Definition, answer and distractors reviewed';
    if(q.type==='create')return 'Model solution audited · user solution self-assessed';
    return q.review.execution==='passed'?'Independent calculation and runtime check passed':'Independent calculation and code review passed · native execution unavailable';
  }
  return 'No current per-question audit';
}
function auditDetails(q){
  if(!q.review)return '';
  return `<details class="audit-details"><summary>Question verification details</summary><p>Record: <code>${esc(q.id)}</code><br>Review: ${q.review.method==='semantic-review'?'Definition meanings, answer order, explanations and all distractors checked against the reviewed glossary.':'Answer recalculated by a separate Python oracle reading the stored question, without importing the generator.'}<br>Review fingerprint: ${q.contentIntegrity==='verified'?'Matches the stored review record.':'Browser verification unavailable in this context.'}<br>Native execution: ${q.review.execution==='passed'?'Stored reference snippets were executed or rendered successfully.':q.review.execution==='not-applicable'?'Not applicable to a theory question.':'Not performed in the required native environment; calculation and source/code review are recorded separately.'}</p><p>This is AI-assisted review, not independent human certification. It does not grade arbitrary user-written code.</p><a href="./data/question-audit.json" target="_blank" rel="noopener">Full per-question audit report</a></details>`;
}
function renderQuestion(){
  setPage('Practice');
  const currentDraft=session.drafts?.[session.queue[session.index]?.id];if(currentDraft&&!session.results.some(r=>r.id===session.queue[session.index]?.id)){session.draft=currentDraft.answer;session.selection=currentDraft.selection;session.revealed=currentDraft.revealed;}
  const q=session.queue[session.index],topic=topicBy(q.topic),previous=session.results.find(r=>r.id===q.id);
  submitted=!!previous;revealed=!!previous||session.revealed===true;selection=previous?.answer??session.selection??null;
  main.innerHTML=storageNotice()+`<div class="quiz-shell"><div class="quiz-top"><button data-action="exit">← Save & exit</button><span>${esc(topic.name)} <span style="opacity:.5">/</span> ${esc(q.level)}</span><label class="question-jump">Question <select id="question-jump" aria-label="Navigate reviewed questions">${session.queue.map((item,i)=>`<option value="${i}" ${i===session.index?'selected':''} ${!canVisitQuestion(i)?'disabled':''}>${i+1} / ${session.queue.length}${session.results.some(r=>r.id===item.id)?' · reviewed':''}</option>`).join('')}</select></label></div><div class="progress-track" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${session.queue.length}" aria-valuenow="${session.index}"><i style="width:${100*session.index/session.queue.length}%"></i></div><article class="question-card"><div class="question-meta"><span class="badge ${q.level.toLowerCase().replace(' ','-')}">${esc(q.level)}</span><span class="badge">${formats[q.type]}</span><button class="save-question" data-action="bookmark" aria-pressed="${store.saved.includes(q.id)}">${store.saved.includes(q.id)?'◆ Saved':'◇ Save question'}</button></div><h1 id="question-title" tabindex="-1">${esc(q.prompt)}</h1>${q.definitions?`<ol class="definition-list">${q.definitions.map(d=>`<li>${esc(d)}</li>`).join('')}</ol>`:''}${q.assumption?`<p class="assumption">${esc(q.assumption)}</p>`:''}${q.contextCode?codeBlock(q.contextCode,q.language,'Task data'):''}${q.code?codeBlock(q.code,q.language,q.compareCode?'Snippet A':'Code'):''}${q.compareCode?codeBlock(q.compareCode,q.language,'Snippet B'):''}${q.options?`<div class="options" role="group" aria-label="Answer choices">${q.options.map((option,i)=>`<button class="option ${selection===option?'selected':''}" data-action="option" data-index="${i}" aria-pressed="${selection===option}"><span class="letter">${'ABCD'[i]}</span><span>${esc(option)}</span></button>`).join('')}</div>`:`<label class="answer-label" for="answer">${q.type==='create'?'Your solution':q.type==='complete'?'Code for the blank':'Your numeric answer'}</label>${q.type==='output'?`<input class="answer-input" id="answer" maxlength="128" inputmode="decimal" autocomplete="off" placeholder="Type the numeric result" value="${esc(previous?.answer??session.draft??'')}">`:`<textarea class="answer-input" id="answer" maxlength="${answerLimit(q.type)}" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="${q.type==='create'?'Write your code or model plan here…':'Type the missing expression…'}">${esc(previous?.answer??session.draft??'')}</textarea>`}<p class="editor-hint">${q.type==='output'?'Enter the numeric value only. Use a dot for decimals, without units or thousands separators.':'Code is plain text and is never executed. Use Tab to indent; Ctrl/⌘ + Enter to check or reveal.'}</p>`}<div class="question-utilities"><button class="text-btn" data-action="previous-question" ${session.index===0?'disabled':''}>← Previous question</button><button class="text-btn" data-action="question-note" data-id="${q.id}">Question note${store.notes[q.id]?' · saved':''}</button><button class="text-btn" data-action="toggle-wrap" aria-pressed="${store.preferences.wrapCode===true}">Wrap code</button></div><div id="feedback" aria-live="polite"></div>${auditDetails(q)}<div class="question-footer"><div class="verification">${esc(checkedStatus(q))}<br><a href="${esc(q.source)}" target="_blank" rel="noopener noreferrer">Topic documentation ↗</a> · Family ${levels.indexOf(q.level)+1}, variant ${q.variant}/10</div><div class="quiz-actions" id="quiz-actions"></div></div></article><p class="session-bottom">Review the explanation after submitting an answer.<br>Related formats share a practice family; ${q.type==='create'?'code creation is self-assessed.':'difficulty describes progression within that family.'}</p></div>`;
  if(previous)showFeedback(previous);else if(revealed&&q.type==='create'){showModel(session.draft);renderActions();}else renderActions();
  $('#question-title').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'auto'});
}
function renderActions(){
  const q=session.queue[session.index];
  $('#quiz-actions').innerHTML=submitted?`<button class="primary" data-action="next">${session.index===session.queue.length-1?'See my results':'Next question'} <span>→</span></button>`:revealed?'<button class="text-btn" data-action="skip">Skip this question</button>':`<button class="text-btn" data-action="skip">Skip</button><button class="primary" data-action="check" ${!hasAnswer()?'disabled':''}>${q.type==='create'?'Reveal & compare':'Check answer'} <span>→</span></button>`;
}
function hasAnswer(){const q=session.queue[session.index];return q.options?q.options.includes(selection):!!$('#answer')?.value.trim();}
function currentAnswer(){const q=session.queue[session.index];return q.options?selection:($('#answer')?.value||'').slice(0,answerLimit(q.type));}
function record(result){
  const q=session.queue[session.index];
  if(!q||view!=='quiz'||session.results.some(r=>r.id===q.id))return;
  const full={id:q.id,topic:q.topic,type:q.type,level:q.level,time:new Date().toISOString(),...result};
  session.results.push(full);
  if(full.status!=='skipped')store.answers[q.id]=full;
  persistSession();submitted=true;showFeedback(full);
}
function check(){
  if(submitted||revealed||!hasAnswer())return;
  const q=session.queue[session.index],answer=currentAnswer();
  if(q.type==='create'){revealed=true;showModel(answer);renderActions();return;}
  const correct=gradeAnswer(q,answer);
  record({answer,status:correct?'correct':'incorrect',selfAssessed:false});
}
function disableInputs(){document.querySelectorAll('.option,#answer').forEach(el=>el.disabled=true);}
function showFeedback(result){
  const q=session.queue[session.index],correct=result.status==='correct',self=result.selfAssessed,skipped=result.status==='skipped';
  disableInputs();
  if(q.options)document.querySelectorAll('.option').forEach((el,i)=>{el.classList.toggle('correct',q.options[i]===q.answer);el.classList.toggle('wrong',q.options[i]===result.answer&&!correct);});
  const heading=skipped?'Skipped':self?(correct?'Self-reviewed · understood':'Self-reviewed · keep practicing'):correct?'Correct':q.type==='complete'?'Compare with the canonical solution':'Incorrect';
  $('#feedback').innerHTML=`<section class="feedback ${correct?'':skipped||self?'neutral':'incorrect'}"><h2>${heading}</h2>${!self&&q.answer!==null?`<p>The ${q.type==='complete'?'canonical completion':'correct answer'} is:</p><code class="answer-value">${esc(q.answer)}</code>`:''}${q.wrongReasons?.[result.answer]?`<p>${esc(q.wrongReasons[result.answer])}</p>`:''}<p>${esc(q.explanation)}</p>${q.type==='complete'||q.type==='create'?codeBlock(q.solution,q.language,'Model solution'):''}${q.type==='complete'&&!correct&&!skipped?`<p>Other completions can also be valid. The text matcher checks the canonical answer only. Compare semantics with the model before self-assessing an alternative.</p><button class="secondary" data-action="equivalent">My alternative is equivalent · self-assess</button>`:''}</section>`;
  renderActions();
}
function showModel(answer){
  const q=session.queue[session.index];disableInputs();
  $('#feedback').innerHTML=`<section class="feedback neutral"><h2>Compare your solution with the model</h2><p>${esc(q.explanation)}</p>${codeBlock(q.solution,q.language,'One model solution')}<ul style="font-size:11px;line-height:1.9;color:var(--muted)">${q.rubric.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p>Your code has not been executed or automatically graded.</p><div class="self-review"><button class="primary" data-action="self-good">I understand it ✓</button><button class="secondary" data-action="self-retry">I need more practice</button></div></section>`;
  session.draft=answer;session.revealed=true;persistSession();
}
function next(){
  if(!submitted)return;
  captureDraft();session.index++;session.draft='';session.selection=null;session.revealed=false;
  if(session.index>=session.queue.length){session.completedAt=new Date().toISOString();store.lastSession=serializeSession(session);store.history=rememberSession(store.history,store.lastSession,20);store.session=null;activeHistory=null;save();navigate('results');}
  else {const draft=session.drafts?.[session.queue[session.index].id];session.draft=draft?.answer||'';session.selection=draft?.selection??null;session.revealed=draft?.revealed===true;persistSession();renderQuestion();}
}
function renderResults(){
  setPage('Session results');
  const summary=summarize(session.results);
  const total=summary.graded,correct=summary.correct,percent=total?Math.round(correct/total*100):0;
  main.innerHTML=`<div class="quiz-shell"><section class="result-panel"><div class="eyebrow" style="justify-content:center">QUIZ SUMMARY</div><div class="result-spark">✳</div><h1>Session results</h1><p>${session.results.length} questions explored in ${esc(topicBy(session.topic).name)}.</p><div class="score-circle"><strong>${total?percent+'%':'—'}</strong><small>auto-graded accuracy</small></div><p>${correct} of ${total} auto-graded answers correct · ${summary.selfReviewed} self-reviewed · ${summary.skipped} skipped<br>Code creation and equivalent alternatives are tracked separately.</p><div class="results-buttons"><a class="secondary" href="#sessions">Session history</a><button class="primary" data-action="retry" ${session.results.some(r=>r.status==='incorrect'||r.status==='skipped')?'':'disabled'}>Retry incorrect and skipped questions</button><a class="secondary" href="#library">Select another topic</a></div><div class="result-list">${session.results.map((r,i)=>`<div class="result-item"><span style="color:${r.status==='correct'?'var(--green)':r.status==='skipped'?'var(--muted)':'var(--red)'}">${r.status==='correct'?'✓':r.status==='skipped'?'−':'↻'}</span><div>Question ${i+1} · ${formats[r.type]}<div class="result-type">${r.selfAssessed?'Self-reviewed':r.status==='skipped'?'Skipped':r.status==='correct'?'Correct':'Needs practice'}</div></div><button data-action="review-result" data-id="${r.id}">Review →</button></div>`).join('')}</div></section></div>`;
  window.scrollTo({top:0,behavior:'auto'});
}
async function renderProgress(){
  setPage('My progress');
  const token=renderToken;
  const checks=await Promise.allSettled([...new Set(Object.values(store.answers).map(r=>r.topic))].map(questions));
  if(token!==renderToken||view!=='progress')return;
  const gradingNotice=checks.some(r=>r.status==='rejected')?'<div class="not-storage">Some question banks could not be loaded to refresh grades. Existing progress is retained. <button class="text-btn" data-action="reload">Retry</button></div>':'';
  const answers=Object.values(store.answers),summary=summarize(answers);
  const pct=summary.graded?Math.round(summary.correct/summary.graded*100):null;
  const studied=catalog.filter(t=>answers.some(a=>a.topic===t.id));
  main.innerHTML=storageNotice()+gradingNotice+`<div class="page-heading"><div class="eyebrow">PROGRESS REPORT</div><h1 style="margin-top:12px">My progress</h1><p>Your latest result for each question is saved in this browser. Self-reviewed work is kept separate from auto-graded accuracy. Export a copy before switching devices.</p></div><div class="stats"><div class="stat"><span class="stat-icon">✓</span><div><strong>${answers.length}</strong><small>Unique questions answered</small></div></div><div class="stat"><span class="stat-icon">◎</span><div><strong>${pct===null?'—':pct+'%'}</strong><small>Auto-graded accuracy</small></div></div><div class="stat"><span class="stat-icon">✧</span><div><strong>${summary.selfReviewed}</strong><small>Self-reviewed solutions</small></div></div></div>${studied.length?`<table class="progress-table"><thead><tr><th>TOPIC</th><th>EXPLORED</th><th>AUTO-GRADED</th><th>SELF-REVIEWED</th><th>NEXT STEP</th></tr></thead><tbody>${studied.map(t=>{const items=answers.filter(a=>a.topic===t.id),s=summarize(items);return `<tr><td>${esc(t.name)}</td><td>${items.length} / 200</td><td>${s.correct} / ${s.graded}</td><td>${s.selfReviewed}</td><td><button class="text-btn" data-action="setup" data-topic="${t.id}">Start quiz →</button></td></tr>`;}).join('')}</tbody></table>`:`<div class="empty"><div class="empty-icon">✧</div><h2>No progress recorded</h2><p>Answer your first question and your progress will appear here.</p><a class="primary" href="#library">Find a topic ↗</a></div>`}<p><a class="secondary" href="#review">Review past answers and mistakes</a></p>${renderStudyPlan()}${progressBreakdown(answers)}<div class="progress-tools"><a class="text-btn" href="#sessions">Saved sessions and history</a><button class="text-btn" data-action="recovery">Recovery backup</button>${store.lastSession?'<a class="text-btn" href="#results">Last session results</a>':''}<button class="text-btn" data-action="import">Import progress ↑</button><button class="text-btn" data-action="export">Export progress ↓</button><button class="text-btn" data-action="reset">Reset progress</button></div>`;
}
async function renderReview(token){
  setPage('Answer review');
  main.innerHTML=storageNotice()+'<div class="loading">Loading your previous questions?</div>';
  const results=latestPracticeResults(store),topics=[...new Set(Object.values(results).map(r=>r.topic))];
  const banks=await Promise.all(topics.map(questions));
  if(token!==renderToken||view!=='review')return;
  const refreshed=latestPracticeResults(store);
  reviewQuestions=banks.flat().filter(q=>refreshed[q.id]).sort((a,b)=>(Date.parse(refreshed[b.id].time)||0)-(Date.parse(refreshed[a.id].time)||0));
  main.innerHTML=storageNotice()+`<div class="page-heading"><div class="eyebrow">LEARN FROM YOUR ATTEMPTS</div><h1>Answer review</h1><p>Find previous questions, compare your answer with the explanation, and practice a focused set. This page shows the latest retained attempt per question, including skips from saved sessions. Deleting older sessions can remove their skipped attempts; answered questions remain in progress.</p></div><label class="search saved-search"><span aria-hidden="true">?</span><input id="review-search" type="search" aria-label="Search previous questions and notes" placeholder="Search questions, concepts, or notes?" value="${esc(reviewQuery)}"></label><div class="review-filters"><label>Status <select id="review-status"><option value="all">All attempts</option><option value="incorrect">Needs practice</option><option value="skipped">Skipped</option><option value="due">Scheduled review</option><option value="correct">Correct</option><option value="self">Self-reviewed</option></select></label><label>Topic <select id="review-topic"><option value="all">All practiced topics</option>${catalog.filter(t=>topics.includes(t.id)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label><label>Format <select id="review-format"><option value="all">All formats</option>${Object.entries(formats).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><button class="text-btn" data-action="clear-review">Clear filters</button></div><p id="review-count" role="status" tabindex="-1"></p><div id="review-practice" class="review-practice"></div><div id="review-list" class="saved-list"></div><div id="review-pages"></div>`;
  $('#review-status').value=reviewStatus;$('#review-topic').value=reviewTopic;$('#review-format').value=reviewFormat;renderReviewCards();
}
function matchingReview(){
  const results=latestPracticeResults(store),needle=reviewQuery.trim().toLowerCase();
  return reviewQuestions.filter(q=>{const r=results[q.id];return r&&(reviewTopic==='all'||q.topic===reviewTopic)&&(reviewFormat==='all'||q.type===reviewFormat)&&(reviewStatus==='all'||reviewStatus==='self'&&r.selfAssessed||reviewStatus==='due'&&studyPool(q.id,results)==='review'||r.status===reviewStatus)&&`${topicBy(q.topic).name} ${q.level} ${formats[q.type]} ${q.focus} ${q.prompt} ${(q.definitions||[]).join(' ')} ${store.notes[q.id]||''}`.toLowerCase().includes(needle);});
}
function renderReviewCards(){
  const matching=matchingReview(),results=latestPracticeResults(store),pages=Math.ceil(matching.length/20);
  reviewPage=Math.max(0,Math.min(reviewPage,pages-1));
  $('#review-count').textContent=`${matching.length} matching questions${pages?` ? Page ${reviewPage+1} of ${pages}`:''}`;
  const topics=[...new Set(matching.map(q=>q.topic))];
  $('#review-practice').innerHTML=topics.map(id=>`<button class="secondary" data-action="practice-review" data-topic="${esc(id)}">Practice ${esc(topicBy(id).name)} (${Math.min(10,matching.filter(q=>q.topic===id).length)})</button>`).join('');
  $('#review-list').innerHTML=matching.slice(reviewPage*20,(reviewPage+1)*20).map(q=>{const r=results[q.id];return `<article class="saved-item"><div><small>${esc(topicBy(q.topic).name)} ? ${esc(q.level)} ? ${formats[q.type]} ? ${r.selfAssessed?'Self-reviewed ? ':''}${esc(r.status)}</small><h2>${esc(q.focus)}</h2><p>${esc(q.prompt)}</p><p class="review-answer">Your answer: <code>${esc((r.answer||'No answer submitted').slice(0,180))}${(r.answer||'').length>180?'?':''}</code></p>${store.notes[q.id]?`<p class="note-preview">${esc(store.notes[q.id])}</p>`:''}</div><button class="secondary" data-action="inspect-question" data-id="${esc(q.id)}">Explain &amp; notes</button><button class="secondary" data-action="practice-saved" data-id="${esc(q.id)}">Retry</button></article>`;}).join('')||'<div class="empty"><h2>No matching attempts</h2><p>Try changing the filters, or answer questions from the topic library.</p><a class="secondary" href="#library">Find a topic</a></div>';
  $('#review-pages').innerHTML=pages>1?`<div class="review-pagination"><button class="secondary" data-action="review-page" data-page="${reviewPage-1}" ${reviewPage===0?'disabled':''}>Previous page</button><button class="secondary" data-action="review-page" data-page="${reviewPage+1}" ${reviewPage===pages-1?'disabled':''}>Next page</button></div>`:'';
}
async function practiceReview(topic){
  const queue=shuffle(matchingReview().filter(q=>q.topic===topic)).slice(0,10);
  if(!queue.length){toast('No matching questions.');return;}
  launchSession({topic,queue,index:0,results:[],draft:'',selection:null,revealed:false});
}
function renderStudyPlan(){
  const recommendations=studyRecommendations(catalog,latestPracticeResults(store));
  return `<section class="study-plan" aria-labelledby="study-plan-title"><h2 id="study-plan-title">Your next practice steps</h2><p>Review incorrect and skipped questions, plus correct answers last practiced at least seven days ago. Self-reviewed answers follow the same schedule; this is a practice reminder, not a mastery score.</p><div class="study-grid">${recommendations.map(item=>{const topic=topicBy(item.topic),review=item.review>0,pool=review?'review':'unanswered';return `<article class="study-card"><span class="form-label">${review?'REVISIT':'EXPLORE'}</span><h3>${esc(topic.name)}</h3><p>${review?`${item.review} questions ready for review`:`${item.unanswered} unanswered questions`}</p>${review||item.unanswered?`<button class="secondary" data-action="setup" data-topic="${esc(item.topic)}" data-pool="${pool}">${review?'Plan a review':'Practice new questions'}</button>`:'<p>All questions explored. Choose this topic in the library to practice again.</p>'}</article>`;}).join('')}</div><p class="editor-hint">Each suggestion opens quiz setup so you can choose a format and session length. Recommendations refresh as you answer.</p></section>`;
}
async function renderBookmarks(token){
  setPage('Saved questions');main.innerHTML='<div class="loading">Opening your saved questions…</div>';
  const saved=store.saved.filter(id=>topicBy(id.split('-')[0]));
  try{
    const banks=await Promise.all([...new Set(saved.map(id=>id.split('-')[0]))].map(questions));if(token!==renderToken||view!=='bookmarks')return;
    const map=new Map(banks.flat().map(q=>[q.id,q]));savedQuestions=[...saved].reverse().map(id=>map.get(id)).filter(Boolean);
    main.innerHTML=storageNotice()+`<div class="page-heading"><div class="eyebrow">BOOKMARKS</div><h1 style="margin-top:12px">Saved questions</h1><p>${savedQuestions.length} saved question${savedQuestions.length===1?'':'s'}, newest first. Search by topic, level, format, or question text.</p></div>${savedQuestions.length?`<label class="search saved-search"><span aria-hidden="true">⌕</span><input type="search" id="saved-search" value="${esc(savedQuery)}" placeholder="Search saved questions…" aria-label="Search saved questions"></label><label class="saved-status">Status <select id="saved-filter"><option value="all">All saved questions</option><option value="unanswered">Not answered</option><option value="mistakes">Needs practice</option><option value="correct">Answered correctly</option><option value="notes">With notes</option></select></label><div class="saved-bulk"><button class="text-btn" data-action="export-saved">Export matching bookmarks</button><button class="text-btn" data-action="clear-saved-set">Remove matching bookmarks</button></div><p id="saved-count" class="saved-count" role="status" tabindex="-1"></p><div class="saved-list" id="saved-list"></div><div id="saved-pages"></div>`:'<div class="empty"><div class="empty-icon">◇</div><h2>No saved questions</h2><p>Use “Save question” during practice to keep a question here.</p><a class="primary" href="#library">View topics</a></div>'}`;
    if(savedQuestions.length){$('#saved-filter').value=savedFilter;renderSavedCards();}
  }catch(error){if(token===renderToken&&view==='bookmarks')loadError(error);}
}
function matchingSaved(){const query=savedQuery.trim().toLowerCase();return savedQuestions.filter(q=>`${topicBy(q.topic).name} ${q.level} ${formats[q.type]} ${q.focus} ${q.prompt} ${store.notes[q.id]||''}`.toLowerCase().includes(query)&&(savedFilter==='all'||savedFilter==='unanswered'&&!store.answers[q.id]||savedFilter==='mistakes'&&store.answers[q.id]?.status==='incorrect'||savedFilter==='correct'&&store.answers[q.id]?.status==='correct'||savedFilter==='notes'&&!!store.notes[q.id]));}
function renderSavedCards(){
  const matching=matchingSaved();
  const pages=Math.max(1,Math.ceil(matching.length/20));savedPage=Math.max(0,Math.min(savedPage,pages-1));
  $('#saved-count').textContent=`${matching.length} matching question${matching.length===1?'':'s'}`;
  $('#saved-list').innerHTML=matching.length?matching.slice(savedPage*20,(savedPage+1)*20).map(q=>`<article class="saved-item"><div><small>${esc(topicBy(q.topic).name)} · ${esc(q.level)} · ${formats[q.type]}</small><h2>${esc(q.focus)}</h2><p>${esc(q.prompt.slice(0,140))}${q.prompt.length>140?'…':''}</p></div><button class="secondary" data-action="inspect-question" data-id="${q.id}">Review</button><button class="secondary" data-action="practice-saved" data-id="${q.id}">Practice</button><button class="text-btn" data-action="unsave" data-id="${q.id}">Remove</button></article>`).join(''):'<div class="empty"><h2>No saved questions match</h2><button class="secondary" data-action="clear-saved-search">Clear search and status filter</button></div>';
  $('#saved-pages').innerHTML=pages>1?`<div class="pagination"><button class="secondary" data-action="saved-page" data-page="${savedPage-1}" ${savedPage===0?'disabled':''}>Previous</button><span>Page ${savedPage+1} of ${pages}</span><button class="secondary" data-action="saved-page" data-page="${savedPage+1}" ${savedPage===pages-1?'disabled':''}>Next</button></div>`:'';
}
function progressBreakdown(answers){
  if(!answers.length)return '';
  return `<details class="progress-breakdown"><summary>Results by difficulty and format</summary><div class="table-scroll"><table class="progress-table"><thead><tr><th>GROUP</th><th>ANSWERED</th><th>AUTO-GRADED CORRECT</th><th>SELF-REVIEWED</th></tr></thead><tbody>${[...levels,...Object.values(formats)].map(label=>{const rows=answers.filter(r=>r.level===label||formats[r.type]===label),summary=summarize(rows);return `<tr><td>${esc(label)}</td><td>${rows.length}</td><td>${summary.graded?summary.correct+' / '+summary.graded:'—'}</td><td>${summary.selfReviewed}</td></tr>`;}).join('')}</tbody></table></div></details>`;
}
function renderAbout(){
  setPage('Instructions and verification');
  main.innerHTML=`<div class="article"><div class="page-heading"><div class="eyebrow">HELP</div><h1 style="margin-top:12px">Instructions and verification</h1><p>AbraQuizDabra is a static, browser-local quiz website. No account is required.</p></div><section><h2>Question formats</h2><ul><li><strong>Theory:</strong> choose one of four answers. Higher bands combine definitions.</li><li><strong>Logic:</strong> compare complete snippets and select the numeric difference B minus A.</li><li><strong>Predict output:</strong> enter the requested numeric result.</li><li><strong>Complete code:</strong> fill a marked blank. The canonical matcher compares lexical tokens, preserving quoted text and operator boundaries. Equivalent alternatives require explicit self-assessment.</li><li><strong>Write code:</strong> enter a solution, reveal the model and checklist, then self-assess. Submitted code is never executed.</li></ul></section><section><h2>Question bank</h2><p>33 topics contain 200 records each: 50 Easy, 50 Medium, 50 Hard, and 50 Very hard. Each band contains ten of every format. The bank uses <strong>132 topic/band practice families</strong> with parameterized variants. Related formats repeat concepts; these are not 6,600 distinct concepts. Difficulty bands have not been calibrated against learners.</p><p>CAD, CFD, and Simulink exercises use explicitly labeled educational pseudocode and simplified assumptions. They do not validate a native vendor model or a real simulation result.</p></section><section><h2>Per-question review</h2><p>${auditSummary?`The current audit covers <strong>${auditSummary.passed} of ${auditSummary.total} records</strong>: ${auditSummary.theoryReviewed} theory records were checked against a reviewed glossary, and ${auditSummary.independentlyCalculated} numerical/reference records were recalculated using a separate Python oracle. There are ${auditSummary.failed} failed audit records.`:'The audit summary could not be loaded.'}</p><p>The independent checker reads the stored questions, not their generator. It verifies answer order and all distractors for theory, both snippets and their difference for logic, exact reconstruction of completion solutions, and model requirements for creation tasks. Reviewed snapshots and content hashes detect changes after review.</p><p>${auditSummary?`${auditSummary.nativeExecutionCovered} question records also have successful execution or rendering evidence for their reference code. ${auditSummary.nativeExecutionNotCovered} non-theory records were checked by calculation and source/code review without full native execution.`:''} Unavailable languages, hardware, cloud services, containers, and proprietary vendor hosts are not marked as runtime passes. A SQLite check does not substitute for a MySQL server test.</p><p>This is AI-assisted source and reasoning review, <strong>not certification by an independent human reviewer</strong>. User-written solutions remain self-assessed.</p><p><a href="./data/audit-summary.json" target="_blank" rel="noopener">Audit summary</a> · <a href="./data/question-audit.json" target="_blank" rel="noopener">Every question's audit record</a> · <a href="./data/native-execution.json" target="_blank" rel="noopener">Native execution evidence</a></p></section><section><h2>Progress and privacy</h2><p>Answers, saved questions, and the active session use this browser's localStorage. Clearing it removes progress. Export or import a JSON progress record from My progress. Imports show a preview and can merge or explicitly replace progress. Saved sessions retain drafts, notes stay with questions, and a recovery snapshot is available after destructive changes. Conflicting browser tabs require a choice before writes continue. Self-assessed answers do not affect automatic accuracy.</p><p>The interface uses local fonts and assets. No account, analytics, or remote code execution service is used.</p></section><section><h2>Documentation</h2><div class="source-grid">${catalog.map(t=>`<a href="${esc(t.source)}" target="_blank" rel="noopener noreferrer">${esc(t.name)} ↗</a>`).join('')}</div></section></div>`;
}
async function practiceId(id){
  const topic=QUESTION_ID.exec(id)?.[1];if(!topic)return;
  const q=(await questions(topic)).find(q=>q.id===id);if(!q)return;
  launchSession({topic,queue:[q],index:0,results:[],draft:'',selection:null,revealed:false});
}
function reviewResult(id){
  const q=session?.queue.find(q=>q.id===id),result=session?.results.find(r=>r.id===id);if(!q||!result)return;
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="setup-title">Review · ${esc(topicBy(q.topic).name)}</h2><button class="close" data-action="close-dialog" aria-label="Close review">×</button></div><h3>${esc(q.prompt)}</h3>${q.definitions?`<ol class="definition-list">${q.definitions.map(d=>`<li>${esc(d)}</li>`).join('')}</ol>`:''}<p class="review-answer">Your answer: <code>${esc(result.answer??'Skipped')}</code></p>${q.answer!==null?`<p class="review-answer">Correct answer: <code>${esc(q.answer)}</code></p>`:''}<p class="review-explanation">${esc(q.explanation)}</p>${q.solution||q.code?codeBlock(q.solution||q.code,q.language,'Reference code'):''}${q.compareCode?codeBlock(q.compareCode,q.language,'Snippet B'):''}`;
  dialog.showModal();
}
async function importProgress(file){
  if(!file||importBusy)return;
  if(file.size>25*1024*1024){$('#import-progress').value='';toast('The progress file is larger than the 25 MiB limit.');return;}
  importBusy=true;const request=++importRequest,page=renderToken;document.querySelectorAll('[data-action="import"]').forEach(button=>button.disabled=true);
  try{
    const raw=JSON.parse(await file.text()),cleaned=cleanStore(raw,catalog.map(t=>t.id)),incoming=cleaned.state;
    const topics=[...new Set([...Object.values(incoming.answers).map(r=>r.topic),...incoming.saved.map(id=>QUESTION_ID.exec(id)[1]),incoming.session?.topic,incoming.lastSession?.topic,...incoming.parked.map(item=>item.topic),...incoming.history.map(item=>item.topic),...Object.keys(incoming.notes).map(id=>QUESTION_ID.exec(id)[1])].filter(Boolean))];
    const banks=await Promise.all(topics.map(questions)),byId=new Map(banks.flat().map(q=>[q.id,q]));
    for(const [id,result] of Object.entries(incoming.answers)){
      const q=byId.get(id);if(!q){delete incoming.answers[id];continue;}
      if(!result.selfAssessed)result.status=gradeAnswer(q,result.answer)?'correct':'incorrect';
    }
    for(const item of [incoming.session,incoming.lastSession,...incoming.parked,...incoming.history].filter(Boolean))for(const record of item.results){const q=byId.get(record.id);if(q&&!record.selfAssessed&&record.status!=='skipped')record.status=gradeAnswer(q,record.answer)?'correct':'incorrect';}
    incoming.saved=incoming.saved.filter(id=>byId.has(id));
    if(request!==importRequest||page!==renderToken)return;
    pendingImport={incoming,ignored:cleaned.ignored,name:file.name,kind:'import'};showImportPreview();
  }catch(error){toast(error instanceof SyntaxError?'This file is not valid JSON. Existing progress was not changed.':error.message);}
  finally{importBusy=false;$('#import-progress').value='';document.querySelectorAll('[data-action="import"]').forEach(button=>button.disabled=false);}
}
async function copyCode(button){
  const block=button.closest('.code-block'),code=block?.querySelector('code');if(!code)return;
  try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(code.textContent);toast('Code copied.');}
  catch{const range=document.createRange();range.selectNodeContents(code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);block.querySelector('pre').focus();toast('Code selected. Press Ctrl/Command + C to copy.');}
}
function toggleStartMenu(force){
  const menu=document.querySelector('#start-menu');
  const open=force??menu.hidden;menu.hidden=!open;
  if(open){const rect=document.querySelector('.xp-menubar').getBoundingClientRect();menu.style.left=Math.max(2,Math.min(rect.left+3,innerWidth-295))+'px';menu.style.top=(rect.bottom+1)+'px';}
  document.querySelectorAll('[data-action="start-menu"]').forEach(b=>b.setAttribute('aria-expanded',String(open)));
}
document.addEventListener('click',event=>{if(!event.target.closest('#start-menu,[data-action="start-menu"]'))toggleStartMenu(false);});
async function action(event){
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const name=el.dataset.action;
  if(el.tagName==='A')event.preventDefault();
  if(name==='maximize-window'){store.preferences.maximized=!$('#app-window').classList.contains('maximized');restoreWindowPreference();save();}
  else if(name==='start-menu'){toggleStartMenu();}
  else if(name==='restore-window'||name.startsWith('desktop-')){toggleStartMenu(false);navigate(name.startsWith('desktop-')?name.slice(8):'home');}
  else if(name==='setup')openSetup(el.dataset.topic,el.dataset.pool||'all');
  else if(name==='start-python')openSetup('python');
  else if(name==='surprise')openSetup(catalog[Math.floor(Math.random()*catalog.length)].id);
  else if(name==='close-dialog'){startRequest++;pendingLaunch=null;pendingImport=null;dialog.close();}
  else if(name==='begin')await begin();
  else if(name==='replace-session'&&pendingLaunch)launchSession(pendingLaunch,true);
  else if(name==='copy-code')await copyCode(el);
  else if(name==='topic-details')await showTopicDetails(el.dataset.topic);
  else if(name==='favorite-topic'){const id=el.dataset.topic;const list=store.preferences.favorites||[];store.preferences.favorites=list.includes(id)?list.filter(v=>v!==id):[...list,id];save();libraryCards();}
  else if(name==='question-note'||name==='inspect-question')await inspectQuestion(el.dataset.id);
  else if(name==='bookmark-id'){toggleBookmark(el.dataset.id);el.textContent=store.saved.includes(el.dataset.id)?'Remove bookmark':'Save question';if(view==='bookmarks')await renderBookmarks(renderToken);if(view==='quiz'&&$('.save-question')){$('.save-question').textContent=store.saved.includes(el.dataset.id)?'? Saved':'? Save question';$('.save-question').setAttribute('aria-pressed',String(store.saved.includes(el.dataset.id)));}}
  else if(name==='previous-question')goToQuestion(session.index-1);
  else if(name==='toggle-wrap'){store.preferences.wrapCode=!store.preferences.wrapCode;restoreWindowPreference();save();el.setAttribute('aria-pressed',String(store.preferences.wrapCode));}
  else if(name==='large-text'){store.preferences.largeText=!store.preferences.largeText;restoreWindowPreference();save();}
  else if(name==='resume-parked')await resumeParked(el.dataset.id);
  else if(name==='view-history'){activeHistory=store.history.find(item=>item.id===el.dataset.id)||null;navigate('results');}
  else if(name==='delete-session')confirmDeleteSession(el.dataset.id,el.dataset.kind);
  else if(name==='confirm-delete-session'){makeBackup('Before deleting a saved session');store[el.dataset.kind]=store[el.dataset.kind].filter(item=>item.id!==el.dataset.id);if(el.dataset.kind==='history'&&store.lastSession?.id===el.dataset.id)store.lastSession=store.history[0]||null;if(activeHistory?.id===el.dataset.id)activeHistory=null;if(session?.id===el.dataset.id&&session.index>=session.queue.length)session=null;save();dialog.close();renderSessions();}
  else if(name==='apply-import')applyImport(el.dataset.mode);
  else if(name==='recovery')showRecovery();
  else if(name==='review-conflict')showConflict();
  else if(name==='resolve-conflict')resolveConflict(el.dataset.mode);
  else if(name==='export-saved'){const ids=matchingSaved().map(q=>q.id),partial=emptyStore();partial.saved=ids;partial.notes=Object.fromEntries(ids.filter(id=>store.notes[id]).map(id=>[id,store.notes[id]]));downloadJSON(partial,'abraquizdabra-bookmarks.json');}
  else if(name==='clear-saved-set')confirmClearSaved();
  else if(name==='confirm-clear-saved'){const ids=new Set(matchingSaved().map(q=>q.id));makeBackup('Before removing saved questions');store.saved=store.saved.filter(id=>!ids.has(id));save();dialog.close();await renderBookmarks(renderToken);}
  else if(name==='saved-page'){savedPage=Number(el.dataset.page);renderSavedCards();$('#saved-count').focus();}
  else if(name==='clear-saved-search'){savedQuery='';savedPage=0;savedFilter='all';$('#saved-search').value='';$('#saved-filter').value='all';renderSavedCards();$('#saved-search').focus();}
  else if(name==='import')$('#import-progress').click();
  else if(name==='retry-save'){storageAvailable=true;if(save()){storageWarning='';toast('Progress saved.');document.querySelector('#storage-status')?.remove();}}
  else if(name==='clear-filters'){query='';filter='All topics';sort='default';libraryPool='all';renderLibrary();$('#topic-search').focus();}
  else if(name==='level'){
    setup.level=el.dataset.level;dialog.querySelectorAll('[data-action="level"]').forEach(b=>{b.classList.toggle('selected',b===el);b.setAttribute('aria-pressed',String(b===el));});updateSetup();
  }else if(name==='filter'){
    filter=el.dataset.category;document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});libraryCards();
  }else if(name==='menu'){
    showSidebar(!$('#sidebar').classList.contains('open'));
  }else if(name==='close-sidebar'){showSidebar(false);$('.mobile-menu').focus();}
  else if(name==='progress')navigate('progress');
  else if(name==='option'&&!submitted&&!revealed){
    const q=session.queue[session.index];selection=q.options[Number(el.dataset.index)];session.selection=selection;persistSession();
    document.querySelectorAll('.option').forEach(b=>{b.classList.toggle('selected',b===el);b.setAttribute('aria-pressed',String(b===el));});renderActions();
  }else if(name==='check')check();
  else if(name==='self-good'||name==='self-retry')record({answer:session.draft,status:name==='self-good'?'correct':'incorrect',selfAssessed:true});
  else if(name==='equivalent'){
    const r=session.results.find(r=>r.id===session.queue[session.index].id);r.status='correct';r.selfAssessed=true;store.answers[r.id]=r;persistSession();showFeedback(r);
  }else if(name==='skip'){record({answer:currentAnswer(),status:'skipped',selfAssessed:false});next();}
  else if(name==='next')next();
  else if(name==='exit'){persistSession();navigate('library');}
  else if(name==='resume')await resumeSession();
  else if(name==='bookmark'){
    const id=session.queue[session.index].id;
    if(store.saved.includes(id))store.saved=store.saved.filter(x=>x!==id);else store.saved.push(id);
    save();el.textContent=store.saved.includes(id)?'◆ Saved':'◇ Save question';el.setAttribute('aria-pressed',String(store.saved.includes(id)));toast(store.saved.includes(id)?'Question saved.':'Question removed from saved questions.');
  }else if(name==='unsave'){store.saved=store.saved.filter(x=>x!==el.dataset.id);save();await renderBookmarks(renderToken);}
  else if(name==='review-page'){reviewPage=Number(el.dataset.page);renderReviewCards();$('#review-count').focus();}
  else if(name==='practice-review')await practiceReview(el.dataset.topic);
  else if(name==='clear-review'){reviewQuery='';reviewStatus='all';reviewTopic='all';reviewFormat='all';reviewPage=0;await renderReview(renderToken);}
  else if(name==='practice-saved')await practiceId(el.dataset.id);
  else if(name==='review-result')reviewResult(el.dataset.id);
  else if(name==='retry'){
    const ids=session.results.filter(r=>r.status!=='correct').map(r=>r.id),queue=session.queue.filter(q=>ids.includes(q.id));
    if(queue.length)launchSession({topic:session.topic,queue,index:0,results:[],draft:'',selection:null,revealed:false});
  }else if(name==='export'){downloadJSON(store,'abraquizdabra-progress.json');toast('Progress exported.');
  }else if(name==='reset'){
    dialog.innerHTML='<div class="dialog-heading"><h2 id="setup-title">Start fresh?</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p style="font-size:12px;line-height:1.8;color:var(--muted)">This removes answers and all saved quiz sessions and results. Saved questions and notes stay in your collection. A recovery backup is created first. Export your progress first if you want a copy.</p><div class="dialog-actions"><button class="secondary" data-action="close-dialog">Keep my progress</button><button class="primary" data-action="confirm-reset">Reset progress</button></div>';dialog.showModal();
  }else if(name==='confirm-reset'){importRequest++;makeBackup('Before resetting progress');store.answers={};store.session=null;store.lastSession=null;store.parked=[];store.history=[];session=null;activeHistory=null;storageAvailable=true;const persisted=save();dialog.close();renderProgress();toast(persisted?'Progress reset. Saved questions retained.':'Progress reset for this visit. Browser storage remains unavailable.');}
  else if(name==='reload')route();
  else if(name==='retry-app')location.reload();
}

function downloadJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function toggleBookmark(id){if(!QUESTION_ID.test(id))return;store.saved=store.saved.includes(id)?store.saved.filter(v=>v!==id):[...store.saved,id];save();}
function canVisitQuestion(index){return !!session&&index>=0&&index<session.queue.length&&session.queue.slice(0,index).every(q=>session.results.some(r=>r.id===q.id));}
function goToQuestion(index){
  if(!session||!Number.isInteger(index)||index<0||index>=session.queue.length)return;
  if(!canVisitQuestion(index))return;
  captureDraft();session.index=index;const draft=session.drafts?.[session.queue[index].id];session.draft=draft?.answer||'';session.selection=draft?.selection??null;session.revealed=draft?.revealed===true;persistSession();renderQuestion();
}
function sessionRow(item,completed){const summary=summarize(item.results);return `<article class="session-row"><div><h2>${esc(topicBy(item.topic)?.name||item.topic)}</h2><p>${completed?item.results.length+' questions completed':item.results.length+' / '+item.ids.length+' questions reviewed'} · ${summary.graded?Math.round(summary.correct/summary.graded*100)+'% automatic accuracy':'No automatic grades'}</p><small>${esc(item.completedAt||item.startedAt?new Date(item.completedAt||item.startedAt).toLocaleString():'Date not recorded')}</small></div><div class="session-buttons"><button class="secondary" data-action="${completed?'view-history':'resume-parked'}" data-id="${item.id}">${completed?'View results':'Resume'}</button><button class="text-btn" data-action="delete-session" data-kind="${completed?'history':'parked'}" data-id="${item.id}">Delete</button></div></article>`;}
function renderSessions(){
  setPage('Saved sessions');
  main.innerHTML=storageNotice()+`<div class="page-heading"><div class="eyebrow">QUIZ SESSIONS</div><h1>Saved sessions and history</h1><p>Keep up to eight additional unfinished sessions and the twenty most recent completed quizzes. Resuming a session parks the currently active quiz.</p></div>${store.session?`<section class="active-session"><h2>Current unfinished session</h2><p>${esc(topicBy(store.session.topic)?.name||store.session.topic)} · ${store.session.results.length} / ${store.session.ids.length} questions reviewed</p><button class="primary" data-action="resume">Continue current quiz</button></section>`:''}<label class="session-filter">Show <select id="session-filter"><option value="all">All sessions</option><option value="unfinished">Unfinished sessions</option><option value="completed">Completed sessions</option></select></label>${sessionFilter!=='completed'?`<section><h2 class="subheading">Other unfinished sessions (${store.parked.length})</h2><div class="session-list">${store.parked.length?store.parked.map(item=>sessionRow(item,false)).join(''):'<p class="empty-inline">No parked sessions.</p>'}</div></section>`:''}${sessionFilter!=='unfinished'?`<section><h2 class="subheading">Completed quizzes (${store.history.length})</h2><div class="session-list">${store.history.length?store.history.map(item=>sessionRow(item,true)).join(''):'<p class="empty-inline">No completed quizzes.</p>'}</div></section>`:''}`;
  $('#session-filter').value=sessionFilter;
}
async function resumeParked(id){
  const request=++startRequest,token=renderToken,parked=store.parked.find(item=>item.id===id);if(!parked)return;
  const restored=await hydrateSession(parked);if(!store.parked.some(item=>item.id===id)||request!==startRequest||token!==renderToken)return;
  makeBackup('Before resuming a saved session');store.parked=store.parked.filter(item=>item.id!==id);if(store.session)store.parked=rememberSession(store.parked,store.session,8);
  session=restored;activeHistory=null;persistSession();navigate('quiz');
}
function confirmDeleteSession(id,kind){
  if(!['parked','history'].includes(kind)||!store[kind].some(item=>item.id===id))return;
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="setup-title">Delete saved session?</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p class="setup-intro">This removes this session entry. Submitted answers, notes and bookmarks remain. Skipped attempts kept only in this session will leave Answer review and scheduled review.</p><div class="dialog-actions"><button class="secondary" data-action="close-dialog">Keep session</button><button class="primary" data-action="confirm-delete-session" data-kind="${kind}" data-id="${id}">Delete session</button></div>`;dialog.showModal();
}
async function inspectQuestion(id){
  if(!QUESTION_ID.test(id))return;const request=++startRequest,token=renderToken,q=(await questions(QUESTION_ID.exec(id)[1])).find(q=>q.id===id);if(!q||token!==renderToken||request!==startRequest)return;
  const result=latestPracticeResults(store)[id];
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="setup-title">${esc(topicBy(q.topic).name)} · ${formats[q.type]}</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><h3>${esc(q.prompt)}</h3>${q.assumption?`<p class="assumption">${esc(q.assumption)}</p>`:''}${q.definitions?`<ol class="definition-list">${q.definitions.map(text=>`<li>${esc(text)}</li>`).join('')}</ol>`:''}${q.contextCode?codeBlock(q.contextCode,q.language,'Task data'):''}<label class="answer-label" for="question-note-text">Your note (up to 1,000 characters; saved as you type)</label><textarea id="question-note-text" class="answer-input note-input" data-id="${q.id}" maxlength="1000">${esc(store.notes[id]||'')}</textarea><p id="note-status" role="status">${store.notes[id]?'Note saved.':''}</p><button class="secondary" data-action="bookmark-id" data-id="${q.id}">${store.saved.includes(id)?'Remove bookmark':'Save question'}</button>${result?`<p class="review-answer">Latest attempt (${esc(result.selfAssessed?'self-reviewed':result.status)}): <code>${esc(result.answer??'No answer')}</code></p>`:''}<details class="answer-disclosure"><summary>Show explained answer and reference code</summary>${q.answer!==null?`<code class="answer-value">${esc(q.answer)}</code>`:''}<p class="review-explanation">${esc(q.explanation)}</p>${q.solution||q.code?codeBlock(q.solution||q.code,q.language,'Reference code'):''}${q.compareCode?codeBlock(q.compareCode,q.language,'Snippet B'):''}</details><p class="editor-hint">Reading this explanation does not record an answer or change your score.</p>`;
  dialog.showModal();
}
async function showTopicDetails(id){
  const topic=topicBy(id);if(!topic)return;const request=++startRequest,token=renderToken,bank=await questions(id);if(token!==renderToken||request!==startRequest)return;
  const concepts=bank.filter(q=>q.level==='Easy'&&q.type==='theory'),results=Object.values(store.answers).filter(r=>r.topic===id),summary=summarize(results);
  dialog.innerHTML=`<div class="dialog-heading">${topicIcon(topic)}<h2 id="setup-title">${esc(topic.name)} · Topic details</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p class="setup-intro">${esc(topic.category)} · 200 records · four difficulty bands · five formats. These are parameterized practice families, not 200 separate concepts.</p><p class="setup-intro">${results.length} answered · ${summary.correct} / ${summary.graded} automatically graded correctly · ${summary.selfReviewed} self-reviewed</p><h3>Core theory concepts</h3><dl class="concept-list">${concepts.map(q=>`<dt>${esc(q.answer)}</dt><dd>${esc(q.definitions[0])}</dd>`).join('')}</dl><div class="dialog-actions"><a href="${esc(topic.source)}" target="_blank" rel="noopener">Documentation</a><button class="primary" data-action="setup" data-topic="${id}">Practice topic</button></div>`;dialog.showModal();
}
function confirmClearSaved(){const count=matchingSaved().length;if(!count){toast('No matching bookmarks.');return;}dialog.innerHTML=`<div class="dialog-heading"><h2 id="setup-title">Remove ${count} bookmarks?</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p class="setup-intro">This removes all bookmarks matching the current search and status filter, across every page. Notes and answers remain. A recovery backup is created first.</p><div class="dialog-actions"><button class="secondary" data-action="close-dialog">Keep bookmarks</button><button class="primary" data-action="confirm-clear-saved">Remove matching bookmarks</button></div>`;dialog.showModal();}
function showImportPreview(){
  if(!pendingImport)return;const {incoming,ignored,name,kind}=pendingImport;
  const updates=Object.entries(incoming.answers).filter(([id,value])=>!store.answers[id]||(Date.parse(value.time)||0)>(Date.parse(store.answers[id].time)||0)).length;
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="setup-title">${kind==='recovery'?'Restore recovery backup':'Import preview'}</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p class="setup-intro">${esc(name)}</p><ul class="import-summary"><li>${Object.keys(incoming.answers).length} valid answer records; ${updates} are new or newer than local answers.</li><li>${incoming.saved.length} bookmarks and ${Object.keys(incoming.notes).length} question notes.</li><li>${incoming.parked.length+(incoming.session?1:0)} unfinished sessions and ${incoming.history.length} completed sessions.</li><li>${ignored} invalid or duplicate entries ignored.</li></ul><p class="setup-intro">Merging keeps newer local answers, existing local notes and the current quiz. Other unfinished sessions are parked. A recovery backup is created before applying changes.</p><label class="replace-confirm"><input type="checkbox" id="import-replace-confirm"> Enable replacing all current progress with this copy</label><div class="dialog-actions"><button class="secondary" data-action="close-dialog">Cancel</button><button class="secondary" data-action="apply-import" data-mode="replace" disabled>Replace current progress</button><button class="primary" data-action="apply-import" data-mode="merge">Merge progress</button></div>`;
  if(!dialog.open)dialog.showModal();
}
function applyImport(mode){
  if(!pendingImport||mode==='replace'&&!$('#import-replace-confirm')?.checked)return;const value=pendingImport;pendingImport=null;makeBackup(value.kind==='recovery'?'Before recovery restore':'Before progress import');
  store=mode==='replace'?value.incoming:mergeProgress(store,value.incoming);session=null;activeHistory=null;const persisted=save();dialog.close();restoreWindowPreference();route();toast(persisted?'Progress applied.':'Progress applied in this tab; resolve storage changes or export before leaving.');
}
function showRecovery(){
  try{const raw=memoryBackup||JSON.parse(localStorage.getItem('abraquizdabra.backup.v1')||'null');if(!raw){toast('No recovery backup exists yet. Backups are made before imports, resets and session replacements.');return;}const cleaned=cleanStore(raw.state,catalog.map(t=>t.id));pendingImport={incoming:cleaned.state,ignored:cleaned.ignored,name:`${raw.reason||'Recovery backup'} · ${new Date(raw.createdAt).toLocaleString()}${raw.persisted===false?' · this tab only':''}`,kind:'recovery'};showImportPreview();}catch{toast('The recovery backup is unreadable. Your current progress was not changed.');}
}
function showConflict(){
  try{conflictRaw=localStorage.getItem('abraquizdabra.v1');}catch{toast('Saved progress cannot be read. Export this tab before leaving.');return;}
  let remote;try{remote=conflictRaw?cleanStore(JSON.parse(conflictRaw),catalog.map(t=>t.id)).state:emptyStore();}catch{}
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="setup-title">Saved progress changed</h2><button class="close" data-action="close-dialog" aria-label="Close">×</button></div><p class="setup-intro">This tab has ${Object.keys(store.answers).length} answers and ${store.saved.length} bookmarks. ${remote?'The stored copy has '+Object.keys(remote.answers).length+' answers and '+remote.saved.length+' bookmarks.':'The stored copy is unreadable or uses an unsupported format.'}</p><p class="setup-intro">Merge keeps newer answers and both unfinished sessions. Use stored copy replaces this tab's progress. Keep this tab overwrites the stored copy. A recovery backup is created first.</p><div class="conflict-actions">${remote?'<button class="primary" data-action="resolve-conflict" data-mode="merge">Merge both copies</button><button class="secondary" data-action="resolve-conflict" data-mode="remote">Use stored copy</button>':''}<button class="secondary" data-action="resolve-conflict" data-mode="local">Keep this tab</button><button class="text-btn" data-action="close-dialog">Decide later</button></div>`;if(!dialog.open)dialog.showModal();
}
function resolveConflict(mode){
  let latest;try{latest=localStorage.getItem('abraquizdabra.v1');}catch{return;}
  if(latest!==conflictRaw){showConflict();toast('The stored copy changed again. Review the updated counts.');return;}
  let remote;try{remote=latest?cleanStore(JSON.parse(latest),catalog.map(t=>t.id)).state:emptyStore();}catch{if(mode!=='local')return;}
  makeBackup('Before resolving a storage conflict');
  if(mode==='remote')store=remote;
  if(mode==='merge'){
    if(store.session&&remote.session&&sessionKey(store.session)===sessionKey(remote.session)&&JSON.stringify(store.session)!==JSON.stringify(remote.session))remote.session={...remote.session,id:newSessionId()};
    store=mergeProgress(store,remote);
  }
  writeConflict=false;conflictRaw=null;lastSavedRaw=latest;storageAvailable=true;save(true);session=null;activeHistory=null;dialog.close();restoreWindowPreference();route();
}
window.addEventListener('storage',event=>{if(event.key==='abraquizdabra.v1'||event.key===null){let raw;try{raw=localStorage.getItem('abraquizdabra.v1');}catch{raw=event.key===null?null:event.newValue;}if(raw!==lastSavedRaw&&raw!==JSON.stringify(store))markConflict(raw);}});

document.addEventListener('click',event=>{action(event).catch(error=>toast(error.message||'Something could not be loaded. Please try again.'));});
document.addEventListener('input',event=>{
  if(event.target.id==='question-note-text'){const id=event.target.dataset.id,note=event.target.value.slice(0,1000);if(note.trim())store.notes[id]=note;else delete store.notes[id];document.querySelectorAll('[data-action="question-note"]').forEach(button=>{if(button.dataset.id===id)button.textContent=note.trim()?'Question note ? saved':'Question note';});if(view==='bookmarks'&&$('#saved-list'))renderSavedCards();if(view==='review'&&$('#review-list'))renderReviewCards();const persisted=save();$('#note-status').textContent=persisted?'Note saved.':'Note kept in this tab; export to retain it.';}
  if(event.target.id==='review-search'){reviewQuery=event.target.value;reviewPage=0;renderReviewCards();}
  if(event.target.id==='saved-search'){savedQuery=event.target.value;savedPage=0;renderSavedCards();}
  if(event.target.id==='topic-search'){query=event.target.value;libraryCards();}
  if(event.target.id==='answer'&&!submitted&&!revealed){session.draft=event.target.value.slice(0,answerLimit(session.queue[session.index].type));persistSession();renderActions();}
});
document.addEventListener('change',event=>{
  if(['setup-format','setup-pool','setup-count'].includes(event.target.id))updateSetup();
  if(event.target.id==='import-replace-confirm'){dialog.querySelector('[data-action="apply-import"][data-mode="replace"]').disabled=!event.target.checked;}
  if(event.target.id==='library-pool'){libraryPool=event.target.value;libraryCards();}
  if(event.target.id==='saved-filter'){savedFilter=event.target.value;savedPage=0;renderSavedCards();}
  if(['review-status','review-topic','review-format'].includes(event.target.id)){reviewStatus=$('#review-status').value;reviewTopic=$('#review-topic').value;reviewFormat=$('#review-format').value;reviewPage=0;renderReviewCards();}
  if(event.target.id==='session-filter'){sessionFilter=event.target.value;renderSessions();}
  if(event.target.id==='question-jump')goToQuestion(Number(event.target.value));
  if(event.target.id==='topic-sort'){sort=event.target.value;libraryCards();}
  if(event.target.id==='import-progress')importProgress(event.target.files[0]);
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){const wasOpen=!$('#start-menu').hidden;toggleStartMenu(false);if(wasOpen)document.querySelector('[data-action="start-menu"]').focus();}
  if(event.key==='Escape'&&$('#sidebar').classList.contains('open')){showSidebar(false);}
  if(event.isComposing||event.repeat||view!=='quiz'||dialog.open||!$('#start-menu').hidden||!session)return;
  const input=/INPUT|TEXTAREA|SELECT/.test(event.target.tagName);
  if(event.key==='Tab'&&event.target.tagName==='TEXTAREA'&&!event.shiftKey){
    event.preventDefault();const field=event.target,start=field.selectionStart,end=field.selectionEnd;if(field.maxLength>=0&&field.value.length-(end-start)+4>field.maxLength){toast('The editor character limit has been reached.');return;}field.setRangeText('    ',start,end,'end');field.dispatchEvent(new Event('input',{bubbles:true}));
  }else if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();submitted?next():check();}
  else if(!input&&!submitted&&!revealed&&/^[1-4]$/.test(event.key))document.querySelectorAll('.option')[Number(event.key)-1]?.click();
  else if(event.key==='Enter'&&event.target.id==='answer'&&event.target.tagName==='INPUT'){event.preventDefault();submitted?next():check();}
});
dialog.addEventListener('cancel',()=>{startRequest++;pendingLaunch=null;pendingImport=null;});
matchMedia('(max-width:760px)').addEventListener('change',()=>showSidebar(false));
showSidebar(false);
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){startRequest++;pendingLaunch=null;pendingImport=null;dialog.close();}}});
window.addEventListener('hashchange',()=>route().catch(error=>toast(error.message)));

try{
  fetchJSON('./data/audit-summary.json').then(summary=>{if(summary&&Number.isInteger(summary.total)&&Number.isInteger(summary.passed)){auditSummary=summary;if(view==='about')renderAbout();}}).catch(()=>{});
  catalog=await fetchJSON('./data/catalog.json');
  if(!Array.isArray(catalog)||!catalog.length||catalog.some(t=>!t||typeof t.id!=='string'||typeof t.name!=='string'))throw Error('The topic catalog is invalid.');
  store=cleanStore(store,catalog.map(t=>t.id)).state;restoreWindowPreference();
  await route();
}catch(error){main.innerHTML=`<div class="empty"><h1>Unable to load the quiz</h1><p>${esc(error.message)}</p><p>Reload the page when the connection is available. Saved progress has not been removed.</p><button class="secondary" data-action="retry-app">Try again</button></div>`;}
