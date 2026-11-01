import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('interface copy contains no removed promotional slogans',()=>{
  const text=['app.js','index.html','README.md'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
  for(const phrase of ['a little logic','a lot of magic','aha!','brain energy','curiosity looks good','make knowledge click','your next breakthrough','you showed up','understanding unlocked','learning beats guessing'])assert(!text.toLowerCase().includes(phrase),phrase);
});
test('XP interface uses local assets and links the active stylesheet',()=>{
  const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('xp.css','utf8');
  assert(html.includes('href="./xp.css"'));assert(!css.includes('@import'));
  for(const selector of ['xp-titlebar','xp-menubar','xp-start-menu'])assert(html.includes(selector));
});
