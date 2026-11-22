import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('approach/index.html','utf8');
const begin=html.indexOf('window.APPROACH_DATA='),end=html.indexOf(';</script>',begin);
assert.ok(begin>0&&end>begin);
const data=JSON.parse(html.slice(begin+'window.APPROACH_DATA='.length,end));
assert.equal(data.info.sourcePages,67);
assert.equal(data.pages.length,66);
assert.equal(data.families.length,38);
assert.deepEqual(data.pages.map(p=>p.page).sort((a,b)=>a-b),Array.from({length:66},(_,i)=>i+2));
assert.equal(new Set(data.pages.map(p=>p.id)).size,66);
const images=[...new Set([...html.matchAll(/assets\/img-\d{3}\.webp/g)].map(m=>m[0]))];
assert.equal(images.length,128);
assert.equal(readdirSync('approach/assets').filter(f=>f.endsWith('.webp')).length,128);
for(const name of images){assert.ok(existsSync('approach/'+name));const buf=readFileSync('approach/'+name);assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WEBP');}
for(const p of data.pages){for(const kind of ['hero','preview']){assert.match(p[kind],/^assets\/img-\d{3}\.webp$/);assert.ok(existsSync('approach/'+p[kind]));}assert.ok(p.review?.specification&&p.review?.options);}
const glc=data.pages.find(p=>p.page===31),kr1=data.pages.find(p=>p.page===32);
assert.match(glc.specNotice,/9,790만원/);
assert.match(glc.specNotice,/9,690만원/);
assert.match(glc.specNotice,/4\.5°/);
assert.match(kr1.specNotice,/초기 물량/);
assert.equal(kr1.variants.length,1);
assert.equal((glc.priceReview||[]).length,0);
assert.ok(html.includes("['source','어프로치북']"),'Source tab is called 어프로치북');
assert.ok(html.includes('function familyBookMarkup')&&html.includes('id="bookJump"'),
  'Model reader must include both modes and direct trim jump');
assert.ok(html.includes('id="backButton"')&&html.includes('function backToPrevious'),
  'Header back control and fallback navigation must exist');
assert.equal((data.families.flatMap(f=>f.pages)).length,66,'Every original PDF page must belong to a model reader');
const home=readFileSync('index.html','utf8');
assert.equal((home.match(/<a class="btn" href="approach\/"/g)||[]).length,1);
assert.ok(home.includes('href="approach/"'));
for(const part of [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)])if(part[1].trim())new vm.Script(part[1]);
console.log('PASS: 66 source pages, 38 family entries, 128 verified images, KR1 distinction and homepage-only button');
