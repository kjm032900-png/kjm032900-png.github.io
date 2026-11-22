import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import vm from 'node:vm';

const root='approach/';
const html=readFileSync(root+'index.html','utf8');
const script=html.match(/window\.APPROACH_DATA=([^;]+);<\/script>/);
assert.ok(script,'Approach source JSON not found');
const data=JSON.parse(script[1]);
assert.equal(data.pages.length,66);
assert.equal(data.families.length,38);
assert.equal(new Set(data.pages.map(x=>x.id)).size,66);
assert.deepEqual(data.pages.map(x=>x.page).sort((a,b)=>a-b),Array.from({length:66},(_,i)=>i+2));
const bundles=readdirSync(root+'bundles').filter(n=>/^g\d\d\.js$/.test(n)).sort();
assert.equal(bundles.length,18);
const imageNames=new Set;
for(const name of bundles){
  const src=readFileSync(root+'bundles/'+name,'utf8');
  new vm.Script(src);
  for(const x of src.matchAll(/"(img-\d{3}\.webp)":"data:image\/webp;base64,/g))imageNames.add(x[1]);
}
assert.equal(imageNames.size,128);
const referencedImages=[...html.matchAll(/assets\/(img-\d{3}\.webp)/g)].map(x=>x[1]);
assert.ok(referencedImages.length>=125);
assert.ok(referencedImages.every(x=>imageNames.has(x)));
const glc=data.pages.find(x=>x.page===31),kr1=data.pages.find(x=>x.page===32);
assert.match(glc.specNotice,/9,790만원/);assert.match(glc.specNotice,/9,690만원/);
assert.match(glc.specNotice,/4\.5°/);
assert.equal(kr1.variants[0].price,'9,690만원');
assert.ok(!glc.priceReview.some(x=>x.trim.includes('AMG Line')),'GLC variant must not be falsely labelled pricing error');
const home=readFileSync('index.html','utf8');
assert.equal((home.match(/전 차종 어프로치북/g)||[]).length,1);
assert.ok(home.includes('href="approach/"'));
assert.equal((home.match(/전 차종 컬러 가이드/g)||[]).length,1);
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for(const m of inline)if(m[1].trim())new vm.Script(m[1]);

const server=spawn('python3',['-m','http.server','8769','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:8769/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function serverReady(){for(let i=0;i<70;i++){try{if((await fetch(base+'approach/')).ok)return}catch(_){ }await sleep(150)}throw Error('server not ready')}
let browser;
try{
 await serverReady();
 browser=await chromium.launch({headless:true});
 for(const width of [1440,390,360]){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'approach/',{waitUntil:'domcontentloaded'});
   await page.locator('.family-card').first().waitFor();
   assert.equal(await page.locator('.family-card').count(),38);
   const widthCheck=await page.evaluate(()=>({inner:innerWidth,full:document.documentElement.scrollWidth}));
   assert.ok(widthCheck.full<=width+1,'mobile horizontal overflow: '+JSON.stringify(widthCheck));
   const firstImage=page.locator('.family-card img').first();
   await firstImage.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.family-card img')?.naturalWidth>50,{timeout:15000});
   await page.locator('a[href="#family=GLC%20Coup%C3%A9"]').first().click();
   await page.locator('a[href="#page=p31"]').first().click();
   await page.locator('.color-action').first().waitFor();
   assert.equal(await page.locator('.color-action').count(),2);
   assert.match(await page.locator('.trim-list').innerText(),/9,790만원/);
   assert.match(await page.locator('.price-alert').innerText(),/9,690만원/);
   const urls=await page.locator('.color-action').evaluateAll(els=>els.map(x=>x.href));
   assert.ok(urls[0].includes('colors.html?'));
   assert.ok(urls[0].includes('tab=exterior'));
   assert.ok(urls[1].includes('tab=seats'));
   await page.locator('.summary-hero img').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.summary-hero img')?.naturalWidth>50,{timeout:15000});
   await page.getByRole('tab', {name:'원본 페이지'}).click();
   await page.locator('.source-image').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.source-image')?.naturalWidth>100,{timeout:15000});
   assert.deepEqual(errors,[],width+'px Javascript runtime errors');
   if(width===390){
     for(let i=2;i<=67;i++){
       await page.evaluate(n=>location.hash='#page=p'+n,i);
       await page.waitForFunction(n=>document.querySelector('.summary-banner .eyebrow')?.textContent.includes('원본 '+n+'쪽'),i,{timeout:7000});
       assert.equal(await page.locator('.color-action').count(),2,'colour actions on page '+i);
     }
   }
   console.log('PASS viewport',width,'cars, colour links, pictures, navigation');
   await context.close();
 }
 console.log('PASS 66 source pages, 38 model groups, 128 images, 132 colour links, GLC KR1, homepage button');
}finally{if(browser)await browser.close();server.kill()}
