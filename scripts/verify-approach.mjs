import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('approach/index.html','utf8');
const privateEndpoint='https://kjm-approach-auth.kjm032900.workers.dev';
if(html.includes('location.replace("'+privateEndpoint+'/book/")')){
  const home=readFileSync('index.html','utf8');
  assert.ok(html.includes('content="noindex, nofollow, noarchive"'),'Legacy entry must discourage indexing');
  assert.ok(!html.includes('window.APPROACH_DATA='),'Public entry must not embed protected vehicle data');
  assert.ok(!existsSync('approach/assets'),'All formerly public approach assets must be removed');
  assert.ok(!home.includes('href="approach/"'),'No homepage link may expose public approach entry');
  assert.equal(home.split('href="'+privateEndpoint+'/admin"').length-1,0,'Admin should use the authenticated homepage');
  assert.equal(home.split('href="'+privateEndpoint+'/"').length-1,1,
    'Exactly one protected admin entry link is expected');
  assert.ok(home.includes('관리자 모드 🔒'),'Protected link must be visibly labelled');
  console.log('PASS: Protected approach cutover: redirect only, no public vehicle data or assets, homepage admin link');
  process.exit(0);
}

const begin=html.indexOf('window.APPROACH_DATA='),end=html.indexOf(';</script>',begin);
assert.ok(begin>0&&end>begin);
const data=JSON.parse(html.slice(begin+'window.APPROACH_DATA='.length,end));
assert.equal(data.info.sourcePages,67);
assert.equal(data.pages.length,66);
assert.equal(data.families.length,38);
assert.deepEqual(data.pages.map(p=>p.page).sort((a,b)=>a-b),Array.from({length:66},(_,i)=>i+2));
assert.equal(new Set(data.pages.map(p=>p.id)).size,66);
const images=[...new Set([...html.matchAll(/assets\/img-\d{3}\.webp/g)].map(m=>m[0]))];
assert.equal(images.length,127); // 127 existing source images plus one directly rendered GLC EV WebP
assert.equal(data.pages.filter(p=>p.preview==='assets/glc-ev-p33-original-extracted.webp').length,1);
assert.equal(readdirSync('approach/assets').filter(f=>f.endsWith('.webp')).length,129);
for(const name of images){assert.ok(existsSync('approach/'+name));const buf=readFileSync('approach/'+name);assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WEBP');}
for(const p of data.pages){for(const kind of ['hero','preview']){assert.match(p[kind],p.page===33&&kind==='preview'?/^assets\/glc-ev-p33-original-extracted\.webp$/:/^assets\/img-\d{3}\.webp$/);assert.ok(existsSync('approach/'+p[kind]));}assert.ok(p.review?.specification&&p.review?.options);}
const glcEv=data.pages.find(p=>p.page===33);
assert.equal(glcEv.family,'GLC Electric');
assert.deepEqual(glcEv.variants.map(v=>v.price),['9,000만원','9,480만원']);
assert.match(glcEv.options.find(s=>s.name==='드라이빙 옵션').rows.flat().join(' '),/AIRMATIC/);
assert.match(glcEv.options.find(s=>s.name==='외장 옵션').rows.flat().join(' '),/AMG 10 스포크/);
const p33Image=readFileSync('approach/assets/glc-ev-p33-original-extracted.webp');
assert.equal(p33Image.toString('ascii',0,4),'RIFF');
assert.equal(p33Image.toString('ascii',8,12),'WEBP');
assert.equal(p33Image.length,164474,'Exact directly rendered page asset has correct byte count');

const glc=data.pages.find(p=>p.page===31),kr1=data.pages.find(p=>p.page===32);
assert.match(glc.specNotice,/9,790만원/);
assert.match(glc.specNotice,/9,690만원/);
assert.match(glc.specNotice,/4\.5°/);
assert.match(kr1.specNotice,/초기 물량/);
assert.equal(kr1.variants.length,1);
assert.equal((glc.priceReview||[]).length,0);
assert.ok(!html.includes('const TABS='),'All three redundant detailed tabs are removed');
assert.ok(!html.includes('class="tabs" role="tablist"'),'No spec/options/source tabs in the detailed view');
assert.ok(html.includes('id="detailPanel">${originalMarkup(p)}'),'Original brochure opens directly for all 66 pages');
assert.ok(html.includes('id="sourcePanel"'),'Source anchor exists');
assert.ok(html.includes('data-scroll-source'),'Sidebar brochure link scrolls directly to original');
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
