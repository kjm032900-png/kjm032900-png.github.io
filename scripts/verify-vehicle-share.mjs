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
for (const id of ['returnToModel', 'copyColorLink', 'shareColorLink', 'shareFeedback']) {
  assert.ok(guideHtml.includes('id="' + id + '"'), 'Missing colour navigation control: ' + id);
}
assert.ok(guideJs.includes('syncGuideUrl()') && guideJs.includes('navigator.share') &&
  guideJs.includes('navigator.clipboard') && guideJs.includes("addEventListener('click', copyGuideLink)"),
  'Colour guide sharing or selected-model return handling is incomplete');
assert.ok(homeHtml.includes("get('openModel')") && homeHtml.includes('openModel(requestedModel)'),
  'Homepage must reopen the previous model details dialog');
// All prior model/year/trim entries and prices must survive for old share URLs.
const original = JSON.parse(execFileSync('git', ['show', baseline + ':content.json'], { encoding:'utf8', maxBuffer:3000000 }));
for (const old of original.models) {
 const same = data.models.find(now => key(now) === key(old));
 assert.ok(same, 'Original vehicle removed: ' + key(old));
 assert.equal(same.price, old.price, 'Historical customer share price was changed: ' + key(old));
}
console.log('PASS: ' + ids.vehicles.length + ' trim IDs, ' +
  Object.keys(catalogs.catalogs).length + ' catalogue groups; historic content and catalogue colour data preserved.');
