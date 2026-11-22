import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const base='http://127.0.0.1:8777/';
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
    await page.locator('[data-tab="options"]').click();
    assert.ok(await page.locator('.review-strip').isVisible());
    await page.locator('.tabs [data-tab="source"]').click();
    await page.locator('.source-image').waitFor();
    await page.waitForFunction(()=>document.querySelector('.source-image')?.complete&&document.querySelector('.source-image')?.naturalWidth>0,{timeout:15000});
    const dims=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth}));
    assert.ok(dims.body<=dims.width+1,'Horizontal overflow '+JSON.stringify(dims));
    await page.locator('a[href="#family=GLC%20Coup%C3%A9"]').first().click();
    await page.locator('.family-page-grid').waitFor({state:'visible',timeout:15000});
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
    await page.locator('[data-tab="options"]').click();
    assert.ok(await page.locator('.review-strip').isVisible(),'Source review '+i);
  }
  assert.deepEqual(errors,[]);
  await ctx.close();
  console.log('PASS approach E2E: homepage navigation, viewports '+checks.join('/')+', 66/66 pages, 132 color actions and GLC KR1 distinctions');
} finally {if(browser)await browser.close();server.kill();}
