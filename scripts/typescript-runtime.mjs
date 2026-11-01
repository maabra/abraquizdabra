// Check stored snippets with the compiler before executing emitted code.
// Transpilation alone would silently accept invalid TypeScript programs.
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

export function checkTypeScriptCases(cases) {
  if(!cases.length)return [];
  const require=createRequire(new URL('../audit/runtime/package.json',import.meta.url));
  const ts=require('typescript');
  const options={strict:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
    moduleDetection:ts.ModuleDetectionKind.Force,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts'],noEmitOnError:true};
  const normalize=file=>path.resolve(file).replaceAll('\\','/');
  const inputs=new Map(cases.map((c,i)=>[normalize(`.qa/typescript-inputs/case-${i}.ts`),c.code]));
  const emitted=new Map(),host=ts.createCompilerHost(options),read=host.readFile.bind(host);
  host.readFile=file=>inputs.get(normalize(file))??read(file);
  host.writeFile=(file,text)=>emitted.set(normalize(file),text);
  const program=ts.createProgram([...inputs.keys()],options,host);
  const diagnostics=ts.getPreEmitDiagnostics(program);
  if(diagnostics.length){
    const detail=ts.formatDiagnostics(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'});
    throw Error('TypeScript strict type-check failed:\n'+detail);
  }
  if(program.emit().emitSkipped)throw Error('TypeScript compiler did not emit reference code');
  return cases.map((c,i)=>{
    const code=emitted.get(normalize(`.qa/typescript-inputs/case-${i}.js`));
    if(!code)throw Error(`Missing compiled TypeScript reference: ${c.id}`);
    const output=[];
    vm.runInNewContext(code,{exports:{},console:{log:value=>output.push(value)}},{timeout:300});
    return {...c,code:undefined,status:output.length===1&&typeof output[0]==='number'&&output[0]===c.expected?'passed':'failed',
      actual:output[0],method:`TypeScript ${ts.version} strict type-check; ES2022 JavaScript emitted by compiler and executed in Node.js`};
  });
}
