import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('deployment packaging removes stale assets and excludes development files',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-package-'));
  try{
    const assets=['index.html','app.js','lib.js','xp.css','favicon.svg','.nojekyll'];
    for(const file of assets)fs.writeFileSync(path.join(root,file),file);
    fs.mkdirSync(path.join(root,'data'));
    fs.writeFileSync(path.join(root,'data','catalog.json'),'[]');
    fs.mkdirSync(path.join(root,'dist','data'),{recursive:true});
    fs.writeFileSync(path.join(root,'dist','data','removed-topic.json'),'stale');
    fs.writeFileSync(path.join(root,'dist','old-app.js'),'stale');
    fs.writeFileSync(path.join(root,'.env'),'development-only');
    const script=fileURLToPath(new URL('../scripts/package.mjs',import.meta.url));
    for(let i=0;i<2;i++){
      const run=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});
      assert.equal(run.status,0,run.stderr);
      assert.deepEqual(fs.readdirSync(path.join(root,'dist')).sort(),[...assets,'data'].sort());
      assert.deepEqual(fs.readdirSync(path.join(root,'dist','data')),['catalog.json']);
      for(const file of assets)assert.equal(fs.readFileSync(path.join(root,'dist',file),'utf8'),file);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
