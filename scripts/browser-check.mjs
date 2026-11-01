// Dependency-free UI verification against a local Chromium browser via CDP.
// This script starts and stops only the server and browser processes it owns.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';

const root=path.resolve(process.env.QUIZ_SITE_DIR||'.'),qa=path.resolve('.qa');fs.mkdirSync(qa,{recursive:true});
const executable=process.env.QUIZ_BROWSER||[
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium','/usr/bin/google-chrome'
].find(file=>fs.existsSync(file));
if(!executable)throw Error('No local Chrome/Edge. Set QUIZ_BROWSER to an installed browser executable.');
const contentTypes={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const requests=[];
const server=http.createServer((req,res)=>{
  requests.push(req.url);
  try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/abraquizdabra/')){res.writeHead(404);res.end('Missing repository prefix');return;}
    const relative=decodeURIComponent(url.pathname.slice('/abraquizdabra/'.length))||'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':contentTypes[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/abraquizdabra/`;
const browser=spawn(executable,['--headless=new','--disable-gpu','--disable-extensions','--no-sandbox','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${path.join(qa,'browser-profile-'+Date.now())}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,stderr='';browser.stderr.on('data',chunk=>stderr+=chunk.toString());
try{
  for(let i=0;i<100&&!/DevTools listening on (ws:\/\/\S+)/.test(stderr);i++)await delay(100);
  const websocket=stderr.match(/DevTools listening on (ws:\/\/\S+)/)?.[1];
  if(!websocket)throw Error('Browser did not expose a DevTools connection: '+stderr.slice(-1000));
  const endpoint=new URL(websocket),base=`http://${endpoint.host}`;
  const page=await (await fetch(base+'/json/new?about:blank',{method:'PUT'})).json();
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let serial=0;const pending=new Map(),errors=[],failedURLs=new Set(),interceptBodies=new Map();
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(Error(data.error.message)):p.resolve(data.result);}}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails);else if(data.method==='Fetch.requestPaused'){const request=data.params;const fail=[...failedURLs].some(part=>request.request.url.includes(part));const override=[...interceptBodies].find(([part])=>request.request.url.includes(part));send(override?'Fetch.fulfillRequest':fail?'Fetch.failRequest':'Fetch.continueRequest',override?{requestId:request.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:override[1]}:fail?{requestId:request.requestId,errorReason:'Failed'}:{requestId:request.requestId}).catch(error=>errors.push({message:error.message}));}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(70);}throw Error('Timed out: '+expression);};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const input=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const select=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const shot=async name=>{const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(qa,name),Buffer.from(image.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:address});
  await wait(`document.querySelectorAll('.topic-card').length===9`);
  await evaluate('localStorage.clear()');
  await evaluate('Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1500))]).then(()=>true)');
  console.log('Browser loaded repository subpath; checking desktop and quiz flows.');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Desktop overflow');
  await shot('desktop.png');
  await click('[data-action="maximize-window"]');assert.equal(await evaluate(`document.querySelector('#app-window').classList.contains('maximized')`),true);
  await send('Page.reload');await wait(`document.querySelectorAll('.topic-card').length===9`);
  assert.equal(await evaluate(`document.querySelector('#app-window').classList.contains('maximized')`),true);
  await click('[data-action="maximize-window"]');
  assert.equal(await evaluate(`!!document.querySelector('.xp-taskbar')`),false);
  await click('[data-action="start-menu"]');assert.equal(await evaluate(`document.querySelector('#start-menu').hidden`),false);
  await click('#start-menu [data-action="desktop-library"]');await wait(`location.hash==='#library'`);assert.equal(await evaluate(`document.querySelector('#start-menu').hidden`),true);
  await evaluate(`location.hash='library'`);await wait(`document.querySelectorAll('.topic-card').length===33`);
  await input('#topic-search',' c sharp ');assert.equal(await evaluate(`document.querySelectorAll('.topic-card').length`),1);
  await input('#topic-search','DynamoDB');assert.equal(await evaluate(`document.querySelectorAll('.topic-card').length`),1);
  await input('#topic-search','not-a-real-topic');assert.equal(await evaluate(`!!document.querySelector('.topic-grid .empty')`),true);
  await input('#topic-search','');
  await click('[data-action="filter"][data-category="Languages"]');assert.equal(await evaluate(`document.querySelectorAll('.topic-card').length`),11);
  await click('[data-action="setup"][data-topic="python"]');await wait('document.querySelector("dialog").open');
  await shot('setup.png');
  await evaluate('document.querySelector("#setup-shuffle").checked=false');
  await click('[data-action="begin"]');await wait('!!document.querySelector(".question-card")');
  const bank=JSON.parse(fs.readFileSync('data/python.json'));
  const q0=bank.find(q=>q.id==='python-0-theory-0');
  await click(`[data-action="option"][data-index="${q0.options.indexOf(q0.answer)}"]`);await click('[data-action="check"]');
  assert.equal(await evaluate(`document.querySelector('#feedback h2').textContent`),'Correct');
  await click('[data-action="next"]');
  await click('[data-action="option"][data-index="0"]');await click('[data-action="check"]');await click('[data-action="next"]');
  await click('[data-action="bookmark"]');
  await input('#answer','11');
  await send('Page.reload');await wait(`document.querySelector('#answer')?.value==='11'`);
  await click('[data-action="check"]');assert.equal(await evaluate(`document.querySelector('#feedback h2').textContent`),'Correct');
  await click('.question-card .copy-code');await wait(`document.querySelector('#toast').textContent==='Code copied.' || document.querySelector('#toast').textContent.startsWith('Code selected.')`);
  await shot('question.png');
  await click('[data-action="next"]');await input('#answer','3');await click('[data-action="check"]');
  assert.equal(await evaluate(`document.querySelector('#feedback h2').textContent`),'Correct');
  await click('[data-action="next"]');
  await input('#answer','x'.repeat(10000));
  await evaluate(`(()=>{const input=document.querySelector('#answer');input.focus();input.setSelectionRange(input.value.length,input.value.length);})()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`document.querySelector('#answer').value.length`),10000);
  await input('#answer','n = 3\nprint(n * 3 + 2)');await click('[data-action="check"]');
  await wait('!!document.querySelector("[data-action=self-good]")');
  await send('Page.reload');await wait(`!!document.querySelector('[data-action="self-good"]')`);
  assert.equal(await evaluate(`document.querySelector('#answer').disabled`),true);
  await click('[data-action="self-good"]');
  await click('[data-action="next"]');
  // The remaining five records in the 10-question session can be skipped.
  for(let i=0;i<5;i++){await click('[data-action="skip"]');await delay(30);}
  await wait(`location.hash==='#results' && !!document.querySelector('.score-circle')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session`),null);
  assert.equal(await evaluate(`document.querySelectorAll('.result-item').length`),10);
  assert.match(await evaluate(`document.querySelector('.result-panel').innerText`),/1 self-reviewed/);
  const completedSession=await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).lastSession`);
  await click('[data-action="review-result"]');await wait('document.querySelector("dialog").open');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session`),null);
  assert.equal(await evaluate(`document.querySelectorAll('.result-item').length`),10);
  await click('[data-action="close-dialog"]');
  await send('Page.reload');await wait(`location.hash==='#results' && document.querySelectorAll('.result-item').length===10`);
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).lastSession.ids`),completedSession.ids);
  // Browser back to the completed quiz must redirect safely to results.
  await evaluate(`location.hash='quiz'`);await wait(`location.hash==='#results'`);
  await evaluate(`location.hash='bookmarks'`);await wait(`document.querySelectorAll('.saved-item').length===1`);
  await click('[data-action="practice-saved"]');await wait(`!!document.querySelector('#answer')`);
  await input('#answer','<img src=x onerror="window.bad=true">');await click('[data-action="exit"]');
  await wait(`location.hash==='#library'`);await click('[data-action="resume"]');await wait(`!!document.querySelector('#answer')`);
  assert.equal(await evaluate('window.bad||false'),false);
  assert.match(await evaluate(`document.querySelector('#answer').value`),/<img/);
  await evaluate(`location.hash='progress'`);await wait(`!!document.querySelector('.progress-table')`);
  assert.equal(await evaluate(`document.querySelectorAll('.study-card').length`),3);
  await click('.study-card [data-action="setup"]');await wait(`document.querySelector('dialog').open`);
  assert.equal(await evaluate(`document.querySelector('[data-action="level"][data-level="All levels"]').getAttribute('aria-pressed')`),'true');
  assert.equal(await evaluate(`['review','unanswered'].includes(document.querySelector('#setup-pool').value)`),true);
  assert.equal(await evaluate(`document.querySelector('[data-action="begin"]').disabled`),false);
  await click('[data-action="close-dialog"]');
  await click('[data-action="reset"]');await click('[data-action="close-dialog"]');
  assert.equal(await evaluate(`Object.keys(JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers).length`),5);
  await evaluate(`location.hash='review'`);await wait(`!!document.querySelector('#review-status')`);
  assert.equal(await evaluate(`document.querySelectorAll('#review-list .saved-item').length>0`),true);
  await evaluate(`document.querySelector('#review-status').value='skipped';document.querySelector('#review-status').dispatchEvent(new Event('change',{bubbles:true}))`);
  assert.equal(await evaluate(`document.querySelectorAll('#review-list .saved-item').length>0`),true);
  await click('#review-list [data-action="inspect-question"]');await wait(`document.querySelector('dialog').open`);
  assert.match(await evaluate(`document.querySelector('dialog .review-answer').textContent`),/skipped/);
  await click('[data-action="close-dialog"]');
  await input('#review-search','no-such-review-question');
  assert.equal(await evaluate(`document.querySelectorAll('#review-list .saved-item').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('[data-action="practice-review"]').length`),0);
  await click('[data-action="clear-review"]');
  await evaluate(`document.querySelector('#review-topic').value='python';document.querySelector('#review-format').value='output';document.querySelector('#review-format').dispatchEvent(new Event('change',{bubbles:true}))`);
  assert.equal(await evaluate(`document.querySelectorAll('#review-list .saved-item').length>0`),true);
  const beforeReviewPractice=await evaluate(`localStorage.getItem('abraquizdabra.v1')`);
  await click('[data-action="practice-review"]');await wait(`document.querySelector('dialog').open`);
  assert.match(await evaluate(`document.querySelector('#setup-title').textContent`),/Unfinished/);
  await click('[data-action="replace-session"]');await wait(`!!document.querySelector('.question-card')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session.ids.every(id=>/^python-[0-3]-output-/.test(id))`),true);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session.ids.length<=10`),true);
  await evaluate(`localStorage.setItem('abraquizdabra.v1',${JSON.stringify(beforeReviewPractice)});location.hash='progress'`);
  await send('Page.reload');await wait(`!!document.querySelector('.progress-table')`);
  await evaluate(`location.hash='progress'`);await wait(`!!document.querySelector('.progress-table')`);
  // Backups can be imported safely, and automatic grades are recalculated.
  const fixtures=path.join(qa,'import-fixtures');fs.mkdirSync(fixtures,{recursive:true});
  const imported={version:1,answers:{'javascript-0-output-0':{answer:'999',status:'correct',selfAssessed:false,time:'2026-01-01T00:00:00Z'},'python-0-output-0':{answer:'999',status:'incorrect',time:'2000-01-01T00:00:00Z'}},saved:['javascript-0-output-0','javascript-0-output-0'],session:null};
  const importFile=path.join(fixtures,'valid.json');fs.writeFileSync(importFile,JSON.stringify(imported));
  const attach=async file=>{const doc=await send('DOM.getDocument');const field=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#import-progress'});await send('DOM.setFileInputFiles',{nodeId:field.nodeId,files:[file]});};
  await attach(importFile);
  await wait(`!!document.querySelector('[data-action="apply-import"]')`);
  assert.equal(await evaluate(`!!JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers['javascript-0-output-0']`),false);
  await click('[data-action="apply-import"][data-mode="merge"]');
  await wait(`!!JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers['javascript-0-output-0']`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers['javascript-0-output-0'].status`),'incorrect');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers['python-0-output-0'].answer`),'11');
  const beforeInvalid=await evaluate(`localStorage.getItem('abraquizdabra.v1')`);
  const badFile=path.join(fixtures,'invalid.json');fs.writeFileSync(badFile,'not JSON');await attach(badFile);
  await wait(`document.querySelector('#toast').textContent.includes('not valid JSON')`);
  assert.equal(await evaluate(`localStorage.getItem('abraquizdabra.v1')`),beforeInvalid);
  const exportDir=path.join(qa,'downloads-'+Date.now());fs.mkdirSync(exportDir,{recursive:true});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:exportDir});
  await click('[data-action="export"]');
  const exportFile=path.join(exportDir,'abraquizdabra-progress.json');
  for(let i=0;i<100&&!fs.existsSync(exportFile);i++)await delay(50);
  assert.equal(JSON.parse(fs.readFileSync(exportFile,'utf8')).version,1);

  // A new quiz cannot overwrite unfinished work without the explicit choice.
  await evaluate(`location.hash='library'`);await wait(`!!document.querySelector('[data-action="setup"][data-topic="java"]')`);
  const unfinished=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`);
  await click('[data-action="setup"][data-topic="java"]');await select('#setup-pool','mistakes');
  assert.equal(await evaluate(`document.querySelector('[data-action="begin"]').disabled`),true);
  await select('#setup-pool','all');await select('#setup-format','output');
  assert.equal(await evaluate(`document.querySelector('#setup-count option[value="20"]').disabled`),true);
  await click('[data-action="level"][data-level="All levels"]');
  assert.match(await evaluate(`document.querySelector('#setup-available').textContent`),/40 questions/);
  await click('[data-action="begin"]');await wait(`!!document.querySelector('[data-action="replace-session"]')`);
  assert.equal(await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`),unfinished);
  await click('[data-action="close-dialog"]');
  await click('[data-action="setup"][data-topic="java"]');
  await evaluate(`document.querySelector('[data-action="begin"]').click();document.querySelector('[data-action="close-dialog"]').click();`);
  await delay(300);
  assert.equal(await evaluate('document.querySelector("dialog").open'),false);
  assert.equal(await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`),unfinished);

  // A failed question-bank fetch retains the active session and can be retried.
  await evaluate(`location.hash='quiz'`);await wait(`!!document.querySelector('#answer')`);
  const savedBeforeOffline=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`);
  failedURLs.add('data/python.json');
  await send('Fetch.enable',{patterns:[{urlPattern:'*data/python.json*',requestStage:'Request'}]});
  await send('Page.reload');await wait(`document.querySelector('main').textContent.includes('Unable to load this section')`);
  assert.equal(await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`),savedBeforeOffline);
  failedURLs.clear();await send('Fetch.disable');await click('[data-action="reload"]');await wait(`!!document.querySelector('#answer')`);

  // Quota failures preserve the current draft in memory and support a retry.
  await evaluate(`window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');}`);
  await input('#answer','123');await wait(`!!document.querySelector('#storage-status')`);
  assert.equal(await evaluate(`document.querySelector('#answer').value`),'123');
  await evaluate(`Storage.prototype.setItem=window.qaSetItem`);await click('[data-action="retry-save"]');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session.draft`),'123');

  // Corrupt indexes and roots recover without JavaScript exceptions.
  const backup=await evaluate(`localStorage.getItem('abraquizdabra.v1')`);
  const damaged=JSON.parse(backup);damaged.session.index='NaN';damaged.session.results='invalid';damaged.saved.push(null,'<img>');
  await evaluate(`localStorage.setItem('abraquizdabra.v1',${JSON.stringify(JSON.stringify(damaged))})`);
  await send('Page.reload');await wait(`!!document.querySelector('#answer')`);
  assert.equal(await evaluate(`document.querySelector('#answer').value`),'123');
  await evaluate(`localStorage.setItem('abraquizdabra.v1','{broken');location.hash='home'`);
  await send('Page.reload');await wait(`document.querySelectorAll('.topic-card').length===9`);
  assert.match(await evaluate('document.querySelector("main").innerText'),/Saved data could not be read/);
  await evaluate(`localStorage.setItem('abraquizdabra.v1',${JSON.stringify(backup)});location.hash='bookmarks'`);
  await send('Page.reload');await wait(`!!document.querySelector('.saved-item')`);

  // Saved questions stay usable on the final pagination page after removal.
  await evaluate(`(()=>{const data=JSON.parse(localStorage.getItem('abraquizdabra.v1'));data.saved=${JSON.stringify(bank.slice(0,21).map(q=>q.id))};localStorage.setItem('abraquizdabra.v1',JSON.stringify(data));})()`);
  await send('Page.reload');await wait(`document.querySelectorAll('.saved-item').length===20`);
  await click('[data-action="saved-page"][data-page="1"]');assert.equal(await evaluate(`document.querySelectorAll('.saved-item').length`),1);
  await click('[data-action="unsave"]');await wait(`document.querySelectorAll('.saved-item').length===20`);
  await input('#saved-search','no-such-question');assert.equal(await evaluate(`document.querySelectorAll('.saved-item').length`),0);
  await click('[data-action="clear-saved-search"]');assert.equal(await evaluate(`document.querySelectorAll('.saved-item').length`),20);

  // Verification metadata is optional: its failed request cannot break quizzes.
  failedURLs.add('data/audit-summary.json');
  await send('Fetch.enable',{patterns:[{urlPattern:'*data/audit-summary.json*',requestStage:'Request'}]});
  await evaluate(`location.hash='home'`);await send('Page.reload');await wait(`document.querySelectorAll('.topic-card').length===9`);
  failedURLs.clear();await send('Fetch.disable');await send('Page.reload');await wait(`document.querySelectorAll('.topic-card').length===9`);
  // Park an unfinished quiz, complete another, and resume the original draft.
  const originalSession=await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session`);
  await evaluate(`location.hash='bookmarks'`);await wait(`!!document.querySelector('[data-action="practice-saved"][data-id="python-0-output-0"]')`);
  await click('[data-action="practice-saved"][data-id="python-0-output-0"]');await wait(`!!document.querySelector('[data-action="replace-session"]')`);await click('[data-action="replace-session"]');
  await wait(`!!document.querySelector('#answer')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).parked.some(item=>item.id===${JSON.stringify(originalSession.id)})`),true);
  await input('#answer','11');await click('[data-action="check"]');await click('[data-action="next"]');await wait(`location.hash==='#results'`);
  const finishedId=await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).lastSession.id`);
  await evaluate(`location.hash='sessions'`);await wait(`!!document.querySelector('[data-action="resume-parked"]')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).history.length>=2`),true);
  await click(`[data-action="view-history"][data-id="${finishedId}"]`);await wait(`document.querySelectorAll('.result-item').length===1`);
  await evaluate(`location.hash='sessions'`);await wait(`!!document.querySelector('[data-action="resume-parked"]')`);
  await click(`[data-action="resume-parked"][data-id="${originalSession.id}"]`);await wait(`!!document.querySelector('#answer')`);
  assert.equal(await evaluate(`document.querySelector('#answer').value`),'123');

  // Navigating backwards must not erase an unsubmitted later answer.
  await evaluate(`location.hash='library'`);await wait(`!!document.querySelector('[data-action="setup"][data-topic="python"]')`);
  await click('[data-action="setup"][data-topic="python"]');await evaluate(`document.querySelector('#setup-shuffle').checked=false`);await click('[data-action="begin"]');await wait(`!!document.querySelector('[data-action="replace-session"]')`);await click('[data-action="replace-session"]');
  await wait(`document.querySelectorAll('.option').length===4`);
  await click(`[data-action="option"][data-index="${q0.options.indexOf(q0.answer)}"]`);await click('[data-action="check"]');await click('[data-action="next"]');
  const logic=bank.find(q=>q.id==='python-0-logic-0');await click(`[data-action="option"][data-index="${logic.options.indexOf(logic.answer)}"]`);await click('[data-action="check"]');await click('[data-action="next"]');
  await input('#answer','456');await click('[data-action="previous-question"]');await click('[data-action="next"]');
  assert.equal(await evaluate(`document.querySelector('#answer').value`),'456');
  await select('#question-jump','0');await select('#question-jump','2');
  assert.equal(await evaluate(`document.querySelector('#answer').value`),'456');
  assert.equal(await evaluate(`document.querySelector('#question-jump option[value="4"]').disabled`),true);

  // Notes are plain text, survive reloads, and participate in saved search.
  const note='<img src=x onerror="window.noteInjected=true"> Notes on loops';
  await click('[data-action="question-note"]');await input('#question-note-text',note);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).notes['python-0-output-0']`),note);
  await click('[data-action="close-dialog"]');await send('Page.reload');await wait(`!!document.querySelector('[data-action="question-note"]')`);
  await click('[data-action="question-note"]');assert.equal(await evaluate(`document.querySelector('#question-note-text').value`),note);await click('[data-action="close-dialog"]');
  await evaluate(`location.hash='bookmarks'`);await wait(`!!document.querySelector('#saved-filter')`);await select('#saved-filter','notes');await input('#saved-search','Notes on loops');
  assert.equal(await evaluate(`document.querySelectorAll('.saved-item').length`),1);assert.equal(await evaluate('window.noteInjected||false'),false);
  await click('[data-action="inspect-question"]');assert.equal(await evaluate(`document.querySelector('.answer-disclosure').open`),false);await click('[data-action="close-dialog"]');
  await click('[data-action="export-saved"]');const bookmarksFile=path.join(exportDir,'abraquizdabra-bookmarks.json');
  for(let i=0;i<100&&!fs.existsSync(bookmarksFile);i++)await delay(50);
  const savedExport=JSON.parse(fs.readFileSync(bookmarksFile));assert.equal(savedExport.saved.length,1);assert.equal(savedExport.notes['python-0-output-0'],note);
  await click('[data-action="clear-saved-set"]');await click('[data-action="confirm-clear-saved"]');await wait(`!!document.querySelector('[data-action="clear-saved-search"]')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).notes['python-0-output-0']`),note);await click('[data-action="clear-saved-search"]');

  // Topic favorites and filter URLs survive refresh; topic details disclose scope.
  await evaluate(`location.hash='library'`);await wait(`!!document.querySelector('[data-action="favorite-topic"][data-topic="python"]')`);
  await click('[data-action="favorite-topic"][data-topic="python"]');await select('#library-pool','favorites');assert.equal(await evaluate(`document.querySelectorAll('.topic-card').length`),1);
  await send('Page.reload');await wait(`document.querySelectorAll('.topic-card').length===1`);assert.equal(await evaluate(`document.querySelector('#library-pool').value`),'favorites');
  await click('[data-action="topic-details"][data-topic="python"]');await wait('document.querySelector("dialog").open');assert.equal(await evaluate(`document.querySelectorAll('.concept-list dt').length`),10);await click('[data-action="close-dialog"]');
  await select('#library-pool','all');await evaluate(`location.hash='library?q=python&sort=name'`);await wait(`document.querySelector('#topic-search').value==='python'`);
  assert.equal(await evaluate(`document.querySelectorAll('.topic-card').length`),1);
  await evaluate(`location.hash='quiz'`);await wait(`!!document.querySelector('#answer')`);
  await click('[data-action="start-menu"]');await click('#start-menu [data-action="large-text"]');await click('#start-menu [data-action="toggle-wrap"]');await click('[data-action="start-menu"]');
  await send('Page.reload');await wait(`!!document.querySelector('#answer')`);
  assert.equal(await evaluate(`document.body.classList.contains('large-text')&&document.body.classList.contains('wrap-code')`),true);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.code-block pre')).whiteSpace`),'pre-wrap');

  // Real same-origin peer-document writes are detected and cannot silently win.
  const remote=JSON.parse(await evaluate(`localStorage.getItem('abraquizdabra.v1')`));
  remote.answers['java-0-output-0']={answer:'11',status:'correct',time:new Date().toISOString()};remote.saved.push('java-0-output-0');
  remote.session.draft='777';remote.session.drafts['python-0-output-0']={answer:'777',selection:null,revealed:false};remote.notes['python-0-output-0']='remote note';
  await evaluate(`(async()=>{const frame=document.createElement('iframe');frame.id='storage-peer';frame.hidden=true;frame.srcdoc='<script>addEventListener("message",event=>localStorage.setItem("abraquizdabra.v1",JSON.stringify(event.data)))<\/script>';const loaded=new Promise(resolve=>frame.onload=resolve);document.body.append(frame);await loaded;frame.contentWindow.postMessage(${JSON.stringify(remote)},'*');})()`);
  await wait(`!!document.querySelector('#write-conflict')`);await input('#answer','888');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session.draft`),'777');
  await click('[data-action="review-conflict"]');
  const newerRemote=structuredClone(remote);newerRemote.answers['cpp-0-output-0']={answer:'11',status:'correct',time:new Date().toISOString()};
  await evaluate(`document.querySelector('#storage-peer').contentWindow.postMessage(${JSON.stringify(newerRemote)},'*')`);
  await wait(`!!JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers['cpp-0-output-0']`);
  await click('[data-action="resolve-conflict"][data-mode="merge"]');assert.equal(await evaluate(`!!document.querySelector('#write-conflict')`),true);
  await click('[data-action="resolve-conflict"][data-mode="merge"]');await wait(`!!document.querySelector('#answer') && !document.querySelector('#write-conflict')`);
  assert.equal(await evaluate(`document.querySelector('#answer').value`),'888');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).parked.some(item=>item.draft==='777')`),true);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).notes['python-0-output-0']`),note);
  await evaluate(`document.querySelector('#storage-peer').remove();location.hash='progress'`);await wait(`!!document.querySelector('[data-action="recovery"]')`);
  const beforeRecovery=await evaluate(`localStorage.getItem('abraquizdabra.v1')`);await click('[data-action="recovery"]');await wait(`!!document.querySelector('[data-action="apply-import"]')`);assert.equal(await evaluate(`document.querySelector('[data-mode="replace"]').disabled`),true);await evaluate(`document.querySelector('#import-replace-confirm').click()`);assert.equal(await evaluate(`document.querySelector('[data-mode="replace"]').disabled`),false);await click('[data-action="close-dialog"]');assert.equal(await evaluate(`localStorage.getItem('abraquizdabra.v1')`),beforeRecovery);
  // Resetting while a file is still being read must not resurrect old answers.
  await evaluate(`location.hash='progress'`);await wait(`!!document.querySelector('[data-action="reset"]')`);
  await evaluate(`window.qaFileText=File.prototype.text;File.prototype.text=function(){const file=this;return new Promise(resolve=>setTimeout(resolve,300)).then(()=>window.qaFileText.call(file));};`);
  const bookmarksBeforeReset=await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).saved.length`);
  await attach(importFile);await click('[data-action="reset"]');await click('[data-action="confirm-reset"]');await delay(600);
  assert.equal(await evaluate(`Object.keys(JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers).length`),0);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).session`),null);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).saved.length`),bookmarksBeforeReset);
  await evaluate(`File.prototype.text=window.qaFileText`);
  await click('[data-action="recovery"]');await wait(`!!document.querySelector('[data-action="apply-import"]')`);await click('[data-action="apply-import"][data-mode="merge"]');await wait(`Object.keys(JSON.parse(localStorage.getItem('abraquizdabra.v1')).answers).length>0`);
  // A syntactically valid but edited bank is rejected by its review fingerprint.
  const editedJava=JSON.parse(fs.readFileSync('data/java.json'));editedJava[0].prompt+=' Modified question';
  interceptBodies.set('data/java.json',Buffer.from(JSON.stringify(editedJava)).toString('base64'));
  await send('Fetch.enable',{patterns:[{urlPattern:'*data/java.json*',requestStage:'Request'}]});
  await evaluate(`location.hash='library?q=java'`);await send('Page.reload');await wait(`!!document.querySelector('[data-action="setup"][data-topic="java"]')`);
  const preservedSession=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`);
  await click('[data-action="setup"][data-topic="java"]');await click('[data-action="begin"]');await wait(`document.querySelector('#toast').textContent.includes('fingerprint')`);
  assert.equal(await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('abraquizdabra.v1')).session)`),preservedSession);
  interceptBodies.clear();await send('Fetch.disable');await click('[data-action="begin"]');await wait(`!!document.querySelector('[data-action="replace-session"]')`);await click('[data-action="close-dialog"]');
  // Deleting a history row also removes a matching latest-results pointer.
  await evaluate(`location.hash='sessions'`);await wait(`!!document.querySelector('[data-action="delete-session"][data-kind="history"]')`);
  const historyId=await evaluate(`document.querySelector('[data-action="delete-session"][data-kind="history"]').dataset.id`);
  await click('[data-action="delete-session"][data-kind="history"]');await click('[data-action="confirm-delete-session"]');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).history.some(item=>item.id===${JSON.stringify(historyId)})`),false);
  await send('Page.reload');await wait(`!!document.querySelector('#session-filter')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('abraquizdabra.v1')).history.some(item=>item.id===${JSON.stringify(historyId)})`),false);
  await evaluate(`location.hash='about'`);await wait(`!!document.querySelector('.article')`);
  assert.match(await evaluate('document.querySelector("main").innerText'),/132 topic\/band/);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`localStorage.clear();location.hash='home'`);
  await send('Page.reload');await wait(`document.querySelectorAll('.topic-card').length===9`);
  await delay(300); // Let the desktop-to-mobile sidebar transition finish.
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Mobile overflow');
  await shot('mobile.png');
  await click('[data-action="menu"]');assert.equal(await evaluate(`document.querySelector('.workspace').inert`),true);
  await click('[data-action="close-sidebar"]');assert.equal(await evaluate(`document.querySelector('.workspace').inert`),false);
  await click('[data-action="menu"]');assert.equal(await evaluate(`document.querySelector('.sidebar').classList.contains('open')`),true);
  await click('[data-nav="library"]');await wait(`location.hash==='#library'`);assert.equal(await evaluate(`document.querySelector('.sidebar').classList.contains('open')`),false);
  await click('[data-action="setup"][data-topic="python"]');await wait('document.querySelector("dialog").open');
  assert.equal(await evaluate(`document.querySelector('dialog').getBoundingClientRect().width<=innerWidth`),true);
  await shot('mobile-setup.png');await click('[data-action="close-dialog"]');
  await evaluate(`location.hash='review'`);await wait(`!!document.querySelector('#review-status')`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),true);
  await shot('mobile-review.png');

  assert.equal(errors.length,0,JSON.stringify(errors));
  const mobileMetrics=await evaluate('({innerWidth,visualWidth:visualViewport.width,scrollWidth:document.documentElement.scrollWidth,mainWidth:document.querySelector("main").getBoundingClientRect().width})');
  const report={status:'passed',checks:['answer review filters, retained skips, empty search, explanation and practice guard','personalized study recommendations and preselected practice setup','XP window maximize and restore','XP application menu navigation','repository-subpath asset loading','33-topic library and search','category filters','quiz setup','theory grading','logic interaction','output numeric grading','completion grading','creation self-review','bookmark persistence','reload with draft resume','session results and skips','completed-session back navigation','saved-question practice','HTML-safe answer rendering','save and exit resume','progress statistics','reset cancel','verification disclosure','desktop and mobile overflow','mobile navigation','search aliases and whitespace','creation reveal survives reload','result review preserves the session','completed results survive reload','progress import and automatic regrading','invalid import leaves existing progress intact','progress export download','practice-set availability and empty pools','unfinished-session replacement guard','canceling pending quiz setup','failed bank fetch preserves saved session','storage quota failure and retry','corrupt save and malformed index recovery','saved-question search and final-page removal','optional audit request failure','mobile backdrop and focus isolation','window preference survives reload','copy code and clipboard fallback','editor indentation respects character limits','reset cancels in-flight import','import preview before applying changes','parked sessions retain unfinished drafts','completed session history and review','previous-question and outline navigation preserve drafts','question notes persist as escaped plain text','saved-question status and note search','saved-set export and bulk removal preserve notes','topic favorites persist across reload','topic details disclose ten core concepts','shareable library filter URLs','large text and code wrapping persist','peer-tab conflict detection prevents overwrite','conflict merge preserves divergent drafts','recovery preview is non-destructive','reset recovery restores progress','changed question fingerprint refuses a quiz','history deletion survives reload','replacement requires explicit opt-in','conflict preview refreshes when peer changes again'],screenshots:['desktop.png','question.png','mobile.png','setup.png','mobile-setup.png','mobile-review.png'],mobileMetrics,runtimeExceptions:errors.length,assetRequests:requests.length};
  fs.writeFileSync(path.join(qa,'browser-report.json'),JSON.stringify(report,null,2));
  console.log(`PASS: ${report.checks.length} browser checks, no runtime exceptions. Screenshots in .qa/.`);
}finally{
  fs.writeFileSync(path.join(qa,'browser-stderr.log'),stderr);
  if(socket?.readyState===WebSocket.OPEN){socket.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(250);socket.close();}
  browser.kill();server.closeAllConnections();server.close();
}
