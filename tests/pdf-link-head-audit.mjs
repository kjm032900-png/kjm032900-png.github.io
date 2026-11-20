import { readFileSync } from 'node:fs';
const d=JSON.parse(readFileSync('catalog-links.json','utf8'));
const docs=Object.entries(d.catalogs).filter(([k,v])=>typeof v.url==='string'&&v.url.includes('.pdf'));
const result=[];
const TIMEOUT=9000;
async function probe(key,catalog){
  try{
    const c=new AbortController();
    const timer=setTimeout(()=>c.abort(),TIMEOUT);
    try{
      const r=await fetch(catalog.url,{method:'HEAD',signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (site catalogue link verification)'}});
      return {key,status:r.status,ok:r.ok,contentType:r.headers.get('content-type')||null,method:'HEAD'};
    }finally{clearTimeout(timer)}
  }catch(e){return {key,status:null,ok:false,error:(e.message||String(e)).slice(0,120)}}
}
let index=0;
async function worker(){
 while(index<docs.length){
   const [key,doc]=docs[index++];
   result.push(await probe(key,doc));
 }
}
await Promise.all(Array.from({length:4},()=>worker()));
const grouped={};
for(const item of result){const k=String(item.status||'network_error');(grouped[k] ||= []).push(item.key)}
console.log('CATALOGUE_HEALTH|' + JSON.stringify({checked:docs.length,results:result,grouped}));
