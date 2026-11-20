import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const data = read('content.json');
const ids = read('vehicle-ids.json');
const catalogs = read('catalog-links.json');
const key = (row) => JSON.stringify([row.family, row.year, row.trim]);

assert.equal(ids.version, 1);
assert.equal(catalogs.version, 1);
assert.ok(data.models.length >= ids.vehicles.length, 'Published history must include all legacy vehicle IDs');
assert.equal(new Set(ids.vehicles.map((x) => x.id)).size, ids.vehicles.length);
assert.equal(new Set(ids.vehicles.map(key)).size, ids.vehicles.length);
assert.ok(ids.vehicles.every((row) => /^[a-z0-9-]+$/.test(row.id)));
assert.ok(ids.vehicles.every(item => data.models.some(model => key(item) === key(model))), 'Historic share IDs must still resolve');
assert.ok(data.models.filter(row => !row.hiddenFromCatalog).length >= 80);
for (const row of ids.vehicles) {
  const catalogKey = catalogs.trimCatalogOverrides[row.trim] || catalogs.familyToCatalog[row.family];
  assert.ok(catalogs.catalogs[catalogKey], 'Missing catalog mapping for ' + row.id);
}
for (const catalog of Object.values(catalogs.catalogs)) {
  if (catalog.url !== null) {
    const url = new URL(catalog.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'www.mercedes-benz.co.kr');
  }
}
// Preserve the approved colour dataset and legacy share IDs while allowing deliberate UI updates.
const baseline = '82163202dd1552efb4085536c9b0812c3ebf1e08';
assert.equal(readFileSync('catalog-colors.json', 'utf8'),
  execFileSync('git', ['show', baseline + ':catalog-colors.json'], {encoding:'utf8', maxBuffer:2000000}),
  'Catalogue colour source data changed unexpectedly');
const guideHtml = readFileSync('colors.html', 'utf8');
const guideJs = readFileSync('colors.js', 'utf8');
const homeHtml = readFileSync('index.html', 'utf8');
const shortsScript = readFileSync('delivery-shorts.js','utf8');
const shortsCss = readFileSync('delivery-shorts.css','utf8');
const shortsIds = [...shortsScript.matchAll(/\\{id:'([A-Za-z0-9_-]{11})'/g)].map(m=>m[1]);
assert.equal(shortsIds.length,15,'Delivery gallery must include 15 verified YouTube Shorts');
assert.equal(new Set(shortsIds).size,15,'Delivery gallery cannot have duplicate video IDs');
assert.ok(shortsIds.includes('Zt-IzDLAivU'),'Existing published delivery Short must be preserved');
for(const id of ['shortsGrid','shortsCount','shortsMore','shortsDialog','shortsFrame','shortsClose','shortsExternal']){
  assert.ok(homeHtml.includes('id="'+id+'"'),'Missing delivery gallery element: '+id);
}
assert.ok(homeHtml.includes('delivery-shorts.js') && homeHtml.includes('delivery-shorts.css'));
assert.ok(shortsCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),
  'Mobile Shorts gallery should have two columns');
assert.ok(shortsScript.includes('www.youtube-nocookie.com/embed/') &&
  shortsScript.includes("dialog.addEventListener('close'"), 'Only open player after user click and stop on close');

for (const id of ['returnToModel', 'catalogSource', 'copyCatalogLink', 'copyColorLink', 'shareColorLink', 'pdfActionHint', 'shareFeedback']) {
  assert.ok(guideHtml.includes('id="' + id + '"'), 'Missing colour navigation control: ' + id);
}
assert.ok(guideJs.includes('syncGuideUrl()') && guideJs.includes('navigator.share') &&
  guideJs.includes('history.back()') && guideJs.includes('copyCatalogLink()') &&
  guideJs.includes('navigator.clipboard') && guideJs.includes("addEventListener('click', copyGuideLink)"),
  'Colour guide sharing or selected-model return handling is incomplete');
assert.ok(homeHtml.includes("get('openModel')") && homeHtml.includes('button?.click()') &&
  homeHtml.includes('mb-color-origin-v1') && homeHtml.includes('mb-color-return-request-v1'),
  'Homepage must reopen the previous model details dialog');
assert.ok(homeHtml.includes('window.__ensureVehicleCatalog') &&
  homeHtml.includes('window.__resetVehicleCatalog') &&
  homeHtml.includes('id="catalogRetryButton"') &&
  homeHtml.includes('CONTENT_CACHE_KEY') &&
  !homeHtml.includes("['promos','modelGrid','filters','benefitsGrid','count','dialogTable'].forEach"),
  'Catalog recovery must not wipe all vehicle cards on a temporary network failure');
// Guard announced but separately sourced electric GLC prices from being lost again.
const glc = data.models.filter(row => row.family === 'GLC Electric' && !row.hiddenFromCatalog);
assert.equal(glc.length, 2);
assert.deepEqual(glc.map(row => row.price).sort((a,b)=>a-b), [90000000, 94800000]);
assert.equal(data.card_prices.glc_electric?.trim, 'GLC 300 4MATIC AMG Line Electric');
assert.equal(data.card_prices.glc_electric?.starting, true);
assert.ok(data.models.some(row => row.family === 'GLC Electric' && row.trim === 'The all-new electric GLC' && row.hiddenFromCatalog),
  'Legacy share ID target must remain present but hidden');
assert.deepEqual(data.models.filter(row => !row.hiddenFromCatalog && row.price === null), [],
  'Do not advertise vehicles with unconfirmed retail prices as priced catalogue cars');
const unpublishedEqs = data.models.find(row => row.family === 'EQS' && row.trim === 'EQS 400 Facelift');
assert.ok(unpublishedEqs && unpublishedEqs.price === null && unpublishedEqs.hiddenFromCatalog,
  'Keep legacy EQS 400 ID for old customer links but do not show its unpriced card');
// All prior model/year/trim entries and prices must survive for old share URLs.
const original = JSON.parse(execFileSync('git', ['show', baseline + ':content.json'], { encoding:'utf8', maxBuffer:3000000 }));
for (const old of original.models) {
 const same = data.models.find(now => key(now) === key(old));
 assert.ok(same, 'Original vehicle removed: ' + key(old));
 assert.equal(same.price, old.price, 'Historical customer share price was changed: ' + key(old));
}
console.log('PASS: ' + ids.vehicles.length + ' trim IDs, ' +
  Object.keys(catalogs.catalogs).length + ' catalogue groups; historic content and catalogue colour data preserved.');
