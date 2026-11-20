import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server=spawn('python3',['-m','http.server','18766','--bind','127.0.0.1'],{stdio:'ignore'});
const base='http://127.0.0.1:18766/';
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(base+'colors.html')).ok)break}catch{}await sleep(100)}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [name,width,height] of [['desktop',1440,900],['galaxy',390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:name==='galaxy',hasTouch:name==='galaxy'});
   const page=await context.newPage(); const errs=[];
   page.on('pageerror',e=>errs.push(e.message));
   await page.goto(base+'colors.html?model=E-Class&trim=E%20200%20EXCLUSIVE&my=27MY',{waitUntil:'domcontentloaded'});
   await page.locator('#family option').last().waitFor({timeout:25000});
   await page.waitForTimeout(1500);
   const metrics=await page.evaluate(()=>{
     const select=document.querySelector('#family'),grid=document.querySelector('#colorGrid');
     const firstCard=grid?.firstElementChild;
     const r=el=>{if(!el)return null;const a=el.getBoundingClientRect();return {x:Math.round(a.x),y:Math.round(a.y),w:Math.round(a.width),h:Math.round(a.height)}};
     return {title:document.title,selected:select.value,options:select.options.length,header:r(document.querySelector('.topbar')),
       intro:r(document.querySelector('.intro')),selector:r(document.querySelector('.selector')),
       source:r(document.querySelector('#catalogSource')),guide:r(document.querySelector('.guide')),
       firstCard:r(firstCard),totalCards:grid?.children.length,activeTab:document.querySelector('.tabs [aria-selected="true"]')?.textContent,
       mismatch:document.querySelector('#modelDetails')?.textContent,status:document.querySelector('#status')?.textContent,
       scrollWidth:document.documentElement.scrollWidth,view:innerWidth,
       currentPdf:document.querySelector('#catalogSource')?.href};
   });
   console.log('COLOR_AUDIT|'+name+'|'+JSON.stringify({metrics,errs}));
   const screenshot=await page.screenshot({type:'jpeg',quality:48,fullPage:false,animations:'disabled',scale:'css'});
   console.log('COLOR_SHOT|'+name+'|'+screenshot.toString('base64'));
   await page.locator('#tab-seats').click();
   console.log('COLOR_TAB|'+name+'|'+JSON.stringify({tab:await page.locator('[aria-selected=true]').first().innerText(),count:await page.locator('#colorGrid').locator(':scope > *').count()}));
   await context.close();
 }
}finally{if(browser)await browser.close();server.kill()}
