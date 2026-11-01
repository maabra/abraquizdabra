import fs from 'node:fs';
// Rebuild from an allowlist so obsolete files never reach GitHub Pages.
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','app.js','lib.js','xp.css','favicon.svg','.nojekyll'])fs.copyFileSync(file,`dist/${file}`);
fs.cpSync('data','dist/data',{recursive:true});
console.log('Static site packaged in dist/. No server or secrets are included.');
