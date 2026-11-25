import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const base='http://127.0.0.1:8777/';
const isProtected=(await import('node:fs')).readFileSync('approach/index.html','utf8').includes('location.replace("https://kjm-approach-auth.kjm032900.workers.dev/book/")');
if(isProtected){
  const {existsSync,readFileSync}=await import('node:fs');
  const home=readFileSync('index.html','utf8'), legacy=readFileSync('approach/index.html','utf8');
  const auth='https://kjm-approach-auth.kjm032900.workers.dev/';
  assert.ok(!existsSync('approach/assets'),'Public approach images must be absent');
  assert.ok(!legacy.includes('window.APPROACH_DATA='),'Old public entry must not embed vehicle content');
  assert.ok(legacy.includes('location.replace("'+auth+'book/")'),'Legacy URL redirects to protected viewer');
  assert.ok(home.includes('href="'+auth+'" aria-label="관리자 모드 및 어프로치북 접근 인증">관리자 모드 🔒</a>'));
  const server=spawn('python3',['-m','http.server','8777','--bind','127.0.0.1'],{stdio:'ignore'});
  let browser;
  try{
    for(let i=0;i<60;i++){try{if((await fetch(base+'index.html')).ok)break;}catch(_){}await new Promise(resolve=>setTimeout(resolve,250))}
    browser=await chromium.launch({headless:true});
    for(const width of [1440,390,360]){
      const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
      const page=await context.newPage();
      await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('.hero .btns a[href="'+auth+'"]').count(),1,'Protected admin entry '+width);
      assert.equal(await page.locator('.hero .btns a[href="approach/"]').count(),0,'Old public entry must disappear '+width);
      const a=page.locator('.hero .btns a[href="'+auth+'"]');
      assert.match(await a.innerText(),/관리자 모드/);
      const old=await context.request.get(base+'approach/',{maxRedirects:0});
      assert.equal(old.status(),200,'Legacy URL redirect document available');
      assert.ok((await old.text()).includes(auth+'book/'));
      const asset=await context.request.get(base+'approach/assets/img-001.webp');
      assert.equal(asset.status(),404,'Public approach image must be removed');
      await context.close();
    }
    console.log('PASS protected approach E2E: public homepage admin button, old URL redirect, public image 404, desktop/mobile');
  }finally{if(browser)await browser.close();server.kill();}
  process.exit(0);
}

const server=spawn('python3',['-m','http.server','8777','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try {
  for(let i=0;i<60;i++){try{if((await fetch(base+'approach/index.html')).ok)break;}catch(_){}await sleep(250)}
  browser=await chromium.launch({headless:true});
  const checks=[];
  for(const width of [1440,390,360]){
    const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844}});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
    const approach=page.locator('.hero .btns a[href="approach/"]');
    assert.equal(await approach.count(),1);
    await approach.click();
    await page.waitForURL(/\/approach\//,{timeout:15000});
    await page.locator('.family-card').first().waitFor({timeout:15000});
    assert.equal(await page.locator('.family-card').count(),38);
    await page.locator('#modelSearch').fill('GLC');
    assert.ok(await page.locator('.family-card').count()>0);
    await page.locator('#modelSearch').fill('');
    // Latest GLC EV page 33 original and integrated reader remain synchronized.
    await page.goto(base+'approach/#page=p33',{waitUntil:'domcontentloaded'});
    await page.locator('.source-image').waitFor();
    await page.locator('.source-image').scrollIntoViewIfNeeded();
    assert.match(await page.locator('.source-image').getAttribute('src'),/glc-ev-p33-original-extracted\.webp/);
    await page.waitForFunction(()=>document.querySelector('.source-image')?.complete&&document.querySelector('.source-image')?.naturalWidth>0,{timeout:15000});
    assert.equal(await page.locator('.tabs').count(),0,'No duplicate source/spec/options tabs');
    await page.goto(base+'approach/#book=GLC%20Electric&mode=scroll',{waitUntil:'domcontentloaded'});
    await page.locator('.book-scroll-all .book-sheet').first().waitFor();
    assert.equal(await page.locator('img[src="assets/glc-ev-p33-original-extracted.webp"]').count(),1);
    await page.goto(base+'approach/',{waitUntil:'domcontentloaded'});
    await page.locator('.family-card').first().waitFor({timeout:15000});
    await page.locator('a[href="#family=GLC%20Coup%C3%A9"]').first().click();
    await page.locator('a[href="#page=p31"]').click();
    await page.locator('.color-action').first().waitFor();
    assert.match(await page.locator('.price-alert').innerText(),/9,790만원/);
    assert.match(await page.locator('.price-alert').innerText(),/9,690만원/);
    assert.match(await page.locator('.price-alert').innerText(),/4.5°/);
    for(const tab of ['exterior','seats']){
      const link=await page.locator('[data-color-tab="'+tab+'"]').getAttribute('href');
      const url=new URL(link);
      assert.equal(url.origin,'https://kjm032900-png.github.io');
      assert.equal(url.searchParams.get('tab'),tab);
      assert.equal(url.searchParams.get('model'),'GLC Coupé');
    }
    assert.equal(await page.locator('.tabs').count(),0);
    assert.equal(await page.locator('#detailPanel .source-image').count(),1);
    await page.locator('.source-image').waitFor();
    await page.locator('.source-image').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.source-image')?.complete&&document.querySelector('.source-image')?.naturalWidth>0,{timeout:15000});
    const dims=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth}));
    assert.ok(dims.body<=dims.width+1,'Horizontal overflow '+JSON.stringify(dims));
    await page.locator('a[href="#family=GLC%20Coup%C3%A9"]').first().click();
    await page.locator('.family-page-grid').waitFor({state:'visible',timeout:15000});
    assert.equal(await page.locator('.family-book-action').count(),1);
    await page.locator('.family-book-action').click();
    await page.locator('.book-sheet').first().waitFor({timeout:15000});
    assert.equal(await page.locator('.book-sheet').count(),1);
    assert.match(await page.locator('.detail-heading').innerText(),/GLC Coupé 통합 어프로치북/);
    await page.locator('.reader-pager a[href*="item="]').last().click();
    assert.match(page.url(),/item=p32/);
    await page.locator('#bookJump').selectOption('p31');
    assert.match(page.url(),/item=p31/);
    await page.locator('.book-reader-actions a[href*="mode=scroll"]').click();
    await page.locator('.book-scroll-all .book-sheet').first().waitFor({timeout:15000});
    assert.equal(await page.locator('.book-scroll-all .book-sheet').count(),2);
    assert.equal(await page.locator('.book-scroll-all img[loading="lazy"]').count(),2);
    await page.locator('.book-sheet-heading a[href="#page=p31"]').click();
    assert.equal(await page.locator('.tabs').count(),0);
    assert.match(await page.locator('#detailPanel h2').innerText(),/GLC Coupé 어프로치북/);
    assert.equal(await page.locator('.info-sidebar [data-scroll-source]').first().innerText(),'GLC Coupé 어프로치북');
    await page.locator('#backButton').click();
    assert.match(page.url(),/book=GLC/);
    await page.locator('#backButton').click();
    assert.match(page.url(),/family=GLC/);
    await page.locator('#backButton').click();
    await page.locator('.family-card').first().waitFor();

    assert.deepEqual(errors,[]);
    checks.push(width);
    await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'approach/',{waitUntil:'domcontentloaded'});
  await page.locator('.family-card').first().waitFor();
  for(let i=2;i<=67;i++){
    await page.evaluate(n=>{
      const item=window.APPROACH_DATA.pages.find(row=>row.page===n);
      if(!item)throw Error('Missing source page '+n);
      location.hash='#page='+encodeURIComponent(item.id);
    },i);
    try {
      await page.waitForFunction(n=>document.querySelector('.summary-banner .eyebrow')?.textContent.includes('원본 '+n+'쪽'),i,{timeout:10000});
    } catch (e) {
      const details=await page.evaluate(()=>({hash:location.hash,screen:document.querySelector('#app')?.textContent.slice(0,160),headline:document.querySelector('.summary-banner .eyebrow')?.textContent}));
      throw Error('Approach page '+i+' failed to render: '+JSON.stringify(details)+'; '+e.message);
    }
    await page.locator('.color-action').first().waitFor({timeout:10000});
    assert.equal(await page.locator('.color-action').count(),2,'Color actions '+i);
    assert.ok(await page.locator('.summary-hero img').getAttribute('src'),'Hero photo '+i);
    assert.equal(await page.locator('.tabs').count(),0,'No duplicate tabs '+i);
    assert.equal(await page.locator('.source-image').count(),1,'Direct brochure '+i);
  }
  await page.goto(base+'approach/#family=E-Class',{waitUntil:'domcontentloaded'});
  await page.locator('.family-book-action').click();
  await page.waitForFunction(()=>document.querySelector('.detail-heading')?.textContent.includes('E-Class 통합 어프로치북'),{timeout:15000});
  assert.match(await page.locator('.detail-heading').innerText(),/E-Class 통합 어프로치북/);
  await page.locator('.book-reader-actions a[href*="mode=scroll"]').click();
  await page.locator('.book-scroll-all .book-sheet').first().waitFor({timeout:15000});
  assert.equal(await page.locator('.book-scroll-all .book-sheet').count(),7,'E-Class must have 7 original pages');
  for(const f of await page.evaluate(()=>window.APPROACH_DATA.families)){
    await page.goto(base+'approach/#family='+encodeURIComponent(f.name),{waitUntil:'domcontentloaded'});
    await page.locator('.family-book-action').waitFor({timeout:10000});
    await page.locator('.family-book-action').click();
    await page.locator('.book-reader-actions option').first().waitFor({state:'attached',timeout:15000});
    const count=await page.locator('.book-reader-actions option').count();
    assert.equal(count,f.pages.length,'Integrated book page count '+f.name);
    await page.locator('.book-reader-actions a[href*="mode=scroll"]').click();
    await page.locator('.book-scroll-all .book-sheet').first().waitFor({timeout:15000});
    assert.equal(await page.locator('.book-scroll-all .book-sheet').count(),f.pages.length,'Continuous reader '+f.name);
    assert.equal(await page.locator('.reader-bottom [data-back]').count(),1);
  }
  assert.deepEqual(errors,[]);
  await ctx.close();
  console.log('PASS approach E2E: homepage navigation, viewports '+checks.join('/')+', 66/66 pages, 132 color actions and GLC KR1 distinctions');
} finally {if(browser)await browser.close();server.kill();}
