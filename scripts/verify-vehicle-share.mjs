import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const data = read('content.json');
const ids = read('vehicle-ids.json');
const catalogs = read('catalog-links.json');
const key = row => JSON.stringify([row.family,row.year,row.trim]);
const legacy = data.legacyModels || [];
const all = [...data.models,...legacy];
const families = [...new Set(data.models.map(row=>row.family))];
assert.equal(ids.version,1);
assert.equal(catalogs.version,1);
assert.equal(data.source_date,'2026-11-17');
assert.equal(data.models.length,89);
assert.equal(legacy.length,9);
assert.equal(ids.vehicles.length,98);
assert.equal(families.length,44);
assert.equal(new Set(all.map(key)).size,all.length);
assert.deepEqual(new Set(ids.vehicles.map(key)),new Set(all.map(key)));
assert.equal(new Set(ids.vehicles.map(x=>x.id)).size,98);
assert.ok(ids.vehicles.every(x=>/^[a-z0-9-]+$/.test(x.id)));
for (const row of ids.vehicles){
 const k=catalogs.trimCatalogOverrides[row.trim] || catalogs.familyToCatalog[row.family];
 assert.ok(catalogs.catalogs[k], 'Missing catalogue for '+row.id);
}
for (const cat of Object.values(catalogs.catalogs)){
 if(cat.url!==null){const url=new URL(cat.url);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'www.mercedes-benz.co.kr');}
}
const fresh = [
 ['GLE','GLE 450 4MATIC AMG Line',136700000],
 ['GLE Coupé','GLE 450 4MATIC Coupé',140800000],
 ['GLS','GLS 450 4MATIC',155100000],
 ['GLS','GLS 450 4MATIC 6-seater',152000000],
 ['GLS','GLS 450 4MATIC AMG Line',161200000],
 ['GLS','GLS 450 4MATIC AMG Line 6-seater',158100000],
 ['GLB Electric','GLB 250+ electric',69900000]
];
for(const [family,trim,price] of fresh) {
 const row=data.models.find(m=>m.family===family&&m.year==='27MY'&&m.trim===trim);
 assert.ok(row, 'Missing official MY27 row: '+family+' '+trim);
 assert.equal(row.price,price,'Official Nov 17 PDF price mismatch for '+trim);
 assert.match(row.source,/2026\.11\.17/);
}
assert.equal(data.models.filter(m=>['GLE','GLE Coupé','GLS'].includes(m.family)&&m.year==='26MY').length,0);
assert.equal(legacy.filter(m=>['GLE','GLE Coupé','GLS'].includes(m.family)&&m.year==='26MY').length,8);
assert.equal(legacy.filter(m=>m.family==='GLB Electric').length,1);
for (const entry of Object.values(data.card_prices)) {
 assert.ok(data.models.some(m=>m.family===entry.family&&m.year===entry.year&&m.trim===entry.trim),'Broken arrivals price reference: '+JSON.stringify(entry));
}
// Prevent unrelated changes to the approved customer colour guide and catalogues.
const baseline='82163202dd1552efb4085536c9b0812c3ebf1e08';
for (const path of ['catalog-colors.json','colors.html','colors.js']) {
 assert.equal(readFileSync(path,'utf8'),execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:4000000}),
   'Unexpected catalogue-colour data change: '+path);
}
console.log('PASS: official 2026-11-17 prices, 44 families, 89 public trims, 9 historical links, 98 stable IDs, original colours unchanged.');
