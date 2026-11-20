import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:18765/';
const server = spawn('python3', ['-m', 'http.server', '18765', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function ready() {
  for(let i=0;i<75;i++) {
    try { if((await fetch(base+'content.json')).ok) return; } catch {}
    await sleep(200);
  }
  throw Error('server not ready');
}
const data = JSON.parse(readFileSync('content.json','utf8'));
const catalogs = JSON.parse(readFileSync('catalog-links.json','utf8'));
const ids = JSON.parse(readFileSync('vehicle-ids.json','utf8'));
const profiles=[{name:'desktop',width:1440,height:900,mobile:false},{name:'galaxy390',width:390,height:844,mobile:true},{name:'galaxy360',width:360,height:780,mobile:true}];
const check={};
let browser;
function emit(kind,name,obj){console.log('AUDIT_'+kind+'|'+name+'|'+JSON.stringify(obj))}
async function picture(page,name) {
  const buffer = await page.screenshot({type:'jpeg',quality:49,fullPage:false,animations:'disabled',scale:'css'});
  console.log('AUDIT_SHOT|'+name+'|'+buffer.toString('base64'));
}
function rect(el){if(!el)return null;const r=el.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}}
try {
 await ready();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 emit('CHECK','inventory',{
   trims: data.models.length,models:new Set(data.models.map(x=>x.family)).size,
   catGroups:Object.keys(catalogs.catalogs).length, missingPdf:data.models.filter(x=>!catalogs.catalogs[catalogs.trimCatalogOverrides[x.trim]||catalogs.familyToCatalog[x.family]]?.url).map(x=>x.family+' '+x.trim),
   missingLocalImages:[...new Set(Object.values(data.images).filter(Boolean))].filter(im=>!existsSync('images/'+im+'.webp')),
   copyContainsOldLabel:readFileSync('index.html','utf8').includes('상담용 차량 선택')
 });
 for(const p of profiles) {
   const ctx=await browser.newContext({
     viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:p.mobile,
     deviceScaleFactor:p.mobile?3:1, permissions:['clipboard-read','clipboard-write']
   });
   const page=await ctx.newPage();
   const faults=[];
   page.on('pageerror',e=>faults.push('JS:'+e.message));
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#modelGrid .model').last().waitFor({timeout:20000});
   await page.evaluate(()=>document.fonts.ready);
   const layout=await page.evaluate(()=>{
     const r=sel=>{const el=document.querySelector(sel); if(!el)return null;const b=el.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y+scrollY),w:Math.round(b.width),h:Math.round(b.height)}}; 
     return {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,homeHeight:document.body.scrollHeight,
       header:r('header'),hero:r('.hero'),offers:r('#offers'),new:r('#new'),g63:r('.g63-section'),
       models:r('#models'),modelTitle:r('#models h2'),firstModel:r('#modelGrid .model'),
       firstButtons:[...document.querySelectorAll('.hero .btn')].map(x=>x.innerText),
       nav:[...document.querySelectorAll('nav a')].map(x=>x.innerText),
       fixedContact:r('.mobile-contact')};
   });
   emit('LAYOUT',p.name,layout);
   if(p.name==='desktop') await picture(page,p.name+'-home');
   if(p.name==='galaxy390') await picture(page,p.name+'-home');

   await page.locator('a[href="#models"]').first().click();
   emit('SCROLL',p.name,{y:await page.evaluate(()=>scrollY),viewport:p.height});
   await page.locator('#search').fill('E 200');
   const ecount=await page.locator('#modelGrid .model').count();
   emit('SEARCH',p.name,{term:'E 200',modelCards:ecount,cards:await page.locator('#modelGrid .model h3').allTextContents()});
   await page.locator('#search').fill('');
   await page.locator('[data-family="E-Class"]').click();
   await page.locator('#dialogTable a.share-catalogue-open').first().waitFor();
   const pop=await page.evaluate(()=>{
     const dlg=document.querySelector('#modelDialog'),photo=dlg?.querySelector('img'),
           pdf=dlg?.querySelector('a.share-catalogue-open'),table=dlg?.querySelector('table'),head=dlg?.querySelector('.dialog-head');
     const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};
     const d=r(dlg),a=r(pdf);
     return {dialog:d,head:r(head),photo:r(photo),pdf:a,table:r(table),
       dialogScrollHeight:dlg.scrollHeight,dialogClientHeight:dlg.clientHeight,
       pdfInitiallyInVisibleModal:!!(a&&d&&a.y<d.y+d.h&&a.y+a.h>d.y),
       pdfInitiallyInViewport:!!(a&&a.y>=0&&a.y+a.h<=innerHeight),
       pdfLabel:pdf.textContent,modalFooter:[...document.querySelectorAll('#modelDialog .dialog-actions a')].map(e=>e.textContent)};
   });
   emit('MODAL',p.name,pop);
   if(p.name==='desktop'||p.name==='galaxy390')await picture(page,p.name+'-modal');
   await page.locator('#dialogTable button[data-copy-catalogue]').first().click();
   const clip1=await page.evaluate(async()=>navigator.clipboard.readText());
   emit('COPY',p.name,{isOfficialPdf:clip1.startsWith('https://www.mercedes-benz.co.kr/')&&clip1.toLowerCase().includes('.pdf'),toast:await page.locator('#shareActionFeedback').innerText()});
   await page.locator('#dialogTable input[data-share-id]').first().check();
   await page.locator('#closeDialog').click();
   await page.locator('[data-family="GLE"]').click();
   await page.locator('#dialogTable input[data-share-id]').first().check();
   await page.locator('#closeDialog').click();
   const tray=await page.evaluate(()=>{
      const a=document.querySelector('#shareToolbar'),b=document.querySelector('.mobile-contact');
      const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
      return {visible:a&&!a.hidden,box:rect(a),contact:rect(b),viewport:{w:innerWidth,h:innerHeight},
        trayOverlapsContact:!!(a&&b&&a.getBoundingClientRect().bottom>b.getBoundingClientRect().top),
        trayWidthOverflow:!!(a&&a.getBoundingClientRect().right>innerWidth)};
   });
   emit('TRAY',p.name,tray);
   if(p.name==='galaxy390')await picture(page,p.name+'-tray');
   await page.locator('#shareCopy').click();
   const shareUrl=await page.evaluate(()=>navigator.clipboard.readText());
   emit('MULTISHARE',p.name,{link:shareUrl.replace(/^https?:\/\/[^/]+/,'SITE'),containsOnlyIds:[...new URL(shareUrl).searchParams.keys()].every(k=>k==='ids'),count:new URL(shareUrl).searchParams.get('ids').split(',').length});
   const customer=await ctx.newPage();
   await customer.goto(shareUrl.replace('https://kjm032900-png.github.io/',base),{waitUntil:'domcontentloaded'});
   await customer.locator('.share-card').last().waitFor();
   const customerLayout=await customer.evaluate(()=>({
      cards:document.querySelectorAll('.share-card').length,
      buttonTexts:[...document.querySelectorAll('.share-card button,.share-card a')].map(el=>el.textContent),
      ogTitle:!!document.querySelector('meta[property="og:title"]'),
      ogImage:!!document.querySelector('meta[property="og:image"]'),
      pageWidth:document.documentElement.scrollWidth,
      viewWidth:innerWidth
   }));
   emit('CUSTOMER',p.name,customerLayout);
   if(p.name==='galaxy390')await picture(customer,p.name+'-customer');
   emit('ERRORS',p.name,faults);
   await ctx.close();
 }
 // Public production page verified separately from checkout contents:
 const livePage=await browser.newPage();
 try {
   const live=await livePage.goto('https://kjm032900-png.github.io/',{waitUntil:'domcontentloaded',timeout:12000});
   await livePage.locator('#modelGrid .model').first().waitFor({timeout:8000});
   emit('LIVE','production',{status:live.status(),title:await livePage.title(),models:await livePage.locator('#modelGrid .model').count(),newCardLabel:await livePage.locator('#modelGrid .model button[data-family]').first().innerText()});
 }catch(e){emit('LIVE','production',{error:e.message.slice(0,250)})}
 await livePage.close();
} finally {if(browser)await browser.close();server.kill();}
