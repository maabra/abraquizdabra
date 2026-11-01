import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync,execFile} from 'node:child_process';
import {openAuditBrowser} from './browser-runtime.mjs';
import {checkTypeScriptCases} from './typescript-runtime.mjs';

const catalog=JSON.parse(fs.readFileSync('data/catalog.json'));
const questions=catalog.flatMap(t=>JSON.parse(fs.readFileSync(`data/${t.id}.json`)));
const hash=code=>crypto.createHash('sha256').update(code).digest('hex');
const oracle=spawnSync('python',['scripts/audit_oracle.py'],{input:JSON.stringify(questions),encoding:'utf8',maxBuffer:20*1024*1024,timeout:60000});
if(oracle.status!==0)throw Error(oracle.stderr);
const answers=JSON.parse(oracle.stdout),failed=answers.filter(a=>a.status!=='passed');
if(failed.length)throw Error(JSON.stringify(failed.slice(0,15)));
const byId=new Map(answers.map(a=>[a.id,a]));
const cases=new Map();
for(const q of questions.filter(q=>q.type!=='theory')){
  const a=byId.get(q.id),code=q.solution||q.code;
  for(const [text,expected] of [[code,a.independentResult],...(q.compareCode?[[q.compareCode,a.comparisonResult]]:[])]){
    const key=hash(text);
    if(cases.has(key)&&cases.get(key).expected!==expected)throw Error('Inconsistent oracle results for identical code');
    cases.set(key,{id:key,topic:q.topic,band:['Easy','Medium','Hard','Very hard'].indexOf(q.level),code:text,expected});
  }
}
const results=[],python=[],shell=[],browserCases=[],csharp=[],vb=[],php=[],typescript=[];
const cached=process.argv.includes('--retry-incomplete')&&fs.existsSync('data/native-execution.json')?new Map(JSON.parse(fs.readFileSync('data/native-execution.json')).results.map(r=>[r.id,r])):new Map();
for(const c of cases.values()){
  if(cached.get(c.id)?.status==='passed'&&cached.get(c.id).expected===c.expected){results.push(cached.get(c.id));continue;}
  if(['javascript','node'].includes(c.topic)){
    const output=[];vm.runInNewContext(c.code,{console:{log:x=>output.push(x)}},{timeout:300});
    results.push({...c,code:undefined,status:output.length===1&&output[0]===c.expected?'passed':'failed',method:'Unmodified stored JavaScript executed in Node.js',actual:output[0]});
  }else if(c.topic==='typescript')typescript.push(c);
  else if(['python','numpy','opencv','fastapi','sqlalchemy','sql','mysql'].includes(c.topic))python.push({...c,runtime:['sql','mysql'].includes(c.topic)?'sql':'python'});
  else if(['git','openssl'].includes(c.topic))shell.push(c);
  else if(['react','vue','html','css'].includes(c.topic))browserCases.push(c);
  else if(['csharp','dotnet'].includes(c.topic))csharp.push(c);
  else if(c.topic==='inventor')vb.push(c);
  else if(c.topic==='php')php.push(c);
  else results.push({...c,code:undefined,status:'not-executed',method:'Independent numerical/contract calculation and reviewed snippet',reason:'Required native language, vendor host, service, or hardware is unavailable'});
}
const pythonRun=spawnSync('python',['scripts/check-python.py'],{input:JSON.stringify(python),encoding:'utf8',maxBuffer:10*1024*1024,timeout:120000});
if(pythonRun.status!==0)throw Error(pythonRun.stderr);
for(const r of JSON.parse(pythonRun.stdout)){const c=cases.get(r.id);results.push({...c,code:undefined,...r,method:c.topic==='mysql'?'Stored SQL executed with SQLite; MySQL server not executed':'Unmodified stored code executed with Python/SQLite'});}
console.log(`Native audit: JavaScript and Python/SQL checked; processing ${shell.length} CLI snippets.`);
results.push(...checkTypeScriptCases(typescript));
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/bash';
const phpBinary=process.env.QUIZ_PHP||(fs.existsSync('.qa/php-runtime/php.exe')?path.resolve('.qa/php-runtime/php.exe'):'php');
for(const c of php){
  const run=spawnSync(phpBinary,['-n','-r',c.code.replace(/^<\?php\s*/, '')],{encoding:'utf8',windowsHide:true,timeout:10000});
  const output=run.stdout?.trim()||'';
  const actual=/^-?\d+(?:\.\d+)?$/.test(output)?Number(output):null;
  results.push({...c,code:undefined,status:run.error?.code==='ENOENT'?'unavailable':run.status===0&&actual===c.expected?'passed':'failed',actual,method:'Unmodified stored PHP body parsed and executed by PHP CLI',detail:run.status===0?undefined:run.stderr||String(run.error)});
}
const scratch=path.resolve('.qa','native-cli-'+Date.now());
async function runShell(c){
  if(!fs.existsSync(bash))return {...c,code:undefined,status:'unavailable',reason:'POSIX shell unavailable'};
  const cwd=path.join(scratch,c.id);fs.mkdirSync(cwd,{recursive:true});
  const env={...process.env,GIT_AUTHOR_NAME:'Question Audit',GIT_AUTHOR_EMAIL:'audit@example.invalid',GIT_COMMITTER_NAME:'Question Audit',GIT_COMMITTER_EMAIL:'audit@example.invalid',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'commit.gpgsign',GIT_CONFIG_VALUE_0:'false'};
  const run=await new Promise(resolve=>execFile(bash,['--noprofile','--norc','-c','set -e\nset -o pipefail\n'+c.code],{cwd,env,windowsHide:true,timeout:30000},(error,stdout,stderr)=>resolve({error,stdout,stderr})));
  const actual=Number(run.stdout.trim().split(/\r?\n/).at(-1));
  return {...c,code:undefined,status:!run.error&&actual===c.expected?'passed':run.error?.code===127?'unavailable':'failed',method:'Unmodified stored CLI snippet in isolated scratch directory',actual,detail:run.error?run.stderr:undefined};
}
for(let i=0;i<shell.length;i+=4)results.push(...await Promise.all(shell.slice(i,i+4).map(runShell)));

// Compile C# question bodies together against the installed SDK. No NuGet
// dependencies or internet access are needed for these console-only snippets.
const csdir=path.resolve('.qa','csharp-audit-'+Date.now());fs.mkdirSync(csdir,{recursive:true});
fs.writeFileSync(path.join(csdir,'NuGet.Config'),'<configuration><packageSources><clear /></packageSources></configuration>');
fs.writeFileSync(path.join(csdir,'Audit.csproj'),'<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net6.0</TargetFramework><EnableNETAnalyzers>false</EnableNETAnalyzers></PropertyGroup></Project>');
const functions=csharp.map((c,i)=>`static void Case${i}(){\n${c.code.replace('using System;','')}\n}`).join('\n');
const calls=csharp.map((c,i)=>`{var capture=new System.IO.StringWriter();Console.SetOut(capture);Case${i}();values["${c.id}"]=double.Parse(capture.ToString().Trim(),System.Globalization.CultureInfo.InvariantCulture);}`).join('\n');
fs.writeFileSync(path.join(csdir,'Program.cs'),`using System;\nclass Program {${functions}\nstatic void Main(){var output=Console.Out;var values=new System.Collections.Generic.Dictionary<string,double>();${calls}\nConsole.SetOut(output);Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(values));}}`);
const env={...process.env,DOTNET_CLI_HOME:path.resolve('.qa/dotnet-home'),DOTNET_SKIP_FIRST_TIME_EXPERIENCE:'1',DOTNET_CLI_TELEMETRY_OPTOUT:'1',DOTNET_NOLOGO:'1',NUGET_PACKAGES:path.resolve('.qa/nuget')};
const build=spawnSync('dotnet',['build',path.join(csdir,'Audit.csproj'),'--configfile',path.join(csdir,'NuGet.Config'),'-v:q','-nologo'],{env,encoding:'utf8',timeout:60000,windowsHide:true});
if(build.status===0){
  const run=spawnSync('dotnet',[path.join(csdir,'bin/Debug/net6.0/Audit.dll')],{env,encoding:'utf8',timeout:30000,windowsHide:true});
  if(run.status!==0)throw Error(run.stderr);
  const values=JSON.parse(run.stdout.trim());
  for(const c of csharp)results.push({...c,code:undefined,status:values[c.id]===c.expected?'passed':'failed',actual:values[c.id],method:'C# question body compiled and executed by .NET 6 SDK'});
}else for(const c of csharp)results.push({...c,code:undefined,status:'unavailable',method:'Native C# compilation attempted',reason:(build.stderr||build.stdout||String(build.error)).slice(-500)});
for(const c of vb)results.push({...c,code:undefined,status:'not-executed',method:'VB.NET/iLogic arithmetic reviewed and independently recalculated',reason:'Inventor iLogic host unavailable; message-box rule not run in Inventor'});

console.log(`Native audit: checking ${browserCases.length} React, Vue, HTML and CSS snippets in browser.`);
let browser;
try{
  const require=createRequire(path.resolve('audit/runtime/package.json'));
  const babel=require('@babel/standalone'),sfc=require('@vue/compiler-sfc');
  browser=await openAuditBrowser();
  for(const c of browserCases){
    try{
      let compiled;
      if(c.topic==='react')compiled=babel.transform(c.code,{presets:['react'],plugins:['transform-modules-commonjs']}).code;
      if(c.topic==='vue'){
        const parsed=sfc.parse(c.code);if(parsed.errors.length)throw Error(String(parsed.errors));
        const script=sfc.compileScript(parsed.descriptor,{id:c.id,inlineTemplate:true});
        compiled=babel.transform(script.content,{plugins:['transform-modules-commonjs']}).code;
      }
      const actual=await browser.evaluate(`window.runNativeCase(${JSON.stringify({...c,compiled})})`);
      results.push({...c,code:undefined,status:actual===c.expected?'passed':'failed',actual,method:c.topic==='html'?'Browser DOM parsing with HTML list/table numbering rules':c.topic==='css'?'Browser computed layout measurement':c.topic==='react'?'Official React 18 runtime; compiled stored JSX; native event and batched update':'Official Vue 3 runtime and SFC compiler; mounted stored component and native event'});
    }catch(error){results.push({...c,code:undefined,status:'failed',detail:error.message,method:'Browser rendering'});}
  }
}catch(error){for(const c of browserCases.filter(c=>!results.some(r=>r.id===c.id)))results.push({...c,code:undefined,status:'unavailable',reason:error.message});}
finally{await browser?.close();}
const report={generatedAt:new Date().toISOString(),basis:'Stored question code, independent numerical oracle; no generator imports',uniqueSnippets:cases.size,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,notExecuted:results.filter(r=>r.status==='not-executed').length,unavailable:results.filter(r=>r.status==='unavailable').length,results};
fs.writeFileSync('data/native-execution.json',JSON.stringify(report,null,2));
fs.writeFileSync('.qa/oracle-results.json',JSON.stringify(answers));
console.log(`Native audit: ${report.passed} passed, ${report.failed} failed, ${report.notExecuted} not executed, ${report.unavailable} unavailable.`);
if(report.failed){console.error(results.filter(r=>r.status==='failed').slice(0,15));process.exitCode=1;}
// CI must not go green when an installed dependency or browser silently stops
// working. Other languages and proprietary hosts remain explicitly optional.
if(process.env.QUIZ_REQUIRE_RUNTIMES==='1'){
  const required=new Set(['javascript','typescript','node','python','numpy','opencv','fastapi','sqlalchemy','sql','mysql','git','openssl','react','vue','html','css']);
  const missing=results.filter(r=>required.has(r.topic)&&r.status!=='passed');
  if(missing.length){console.error('Required runtime checks did not pass:',missing);process.exitCode=1;}
}
