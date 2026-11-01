import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Local-only native browser harness. Never used by the deployed application.
export async function openAuditBrowser(){
  const root=process.cwd(),qa=path.resolve('.qa');fs.mkdirSync(qa,{recursive:true});
  const binary=process.env.QUIZ_BROWSER||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
  if(!binary)throw Error('No local browser for native rendering checks');
  const server=http.createServer((req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const file=path.resolve(root,'.'+pathname);
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const data=fs.readFileSync(file);
      res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json'})[path.extname(file)]||'text/plain'});res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const processHandle=spawn(binary,['--headless=new','--disable-gpu','--disable-extensions','--no-sandbox','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${path.join(qa,'native-browser-'+Date.now())}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let stderr='',socket;processHandle.stderr.on('data',chunk=>stderr+=chunk);
  const close=async()=>{if(socket?.readyState===WebSocket.OPEN){socket.send(JSON.stringify({id:999999,method:'Browser.close'}));await delay(150);socket.close();}processHandle.kill();server.closeAllConnections();server.close();};
  try{
    for(let i=0;i<100&&!/DevTools listening on (ws:\/\/\S+)/.test(stderr);i++)await delay(100);
    const endpoint=stderr.match(/DevTools listening on (ws:\/\/\S+)/)?.[1];if(!endpoint)throw Error('Browser failed to start');
    const tab=await (await fetch(`http://${new URL(endpoint).host}/json/new?about:blank`,{method:'PUT'})).json();
    socket=new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let serial=0;const pending=new Map();
    socket.addEventListener('message',event=>{const message=JSON.parse(event.data);const item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(message.error.message)):item.resolve(message.result);}});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timeout: '+method));},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
    await send('Runtime.enable');await send('Page.enable');
    await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/audit/native-harness.html`});
    for(let i=0;i<100;i++){if(await evaluate('!!window.runNativeCase'))return {evaluate,close};await delay(100);}
    throw Error('Native browser dependencies failed to load');
  }catch(error){await close();throw error;}
}
