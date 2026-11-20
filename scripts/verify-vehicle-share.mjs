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
assert.equal(ids.vehicles.length, data.models.length);
assert.equal(new Set(ids.vehicles.map((x) => x.id)).size, ids.vehicles.length);
assert.equal(new Set(ids.vehicles.map(key)).size, ids.vehicles.length);
assert.ok(ids.vehicles.every((row) => /^[a-z0-9-]+$/.test(row.id)));
assert.deepEqual(new Set(ids.vehicles.map(key)), new Set(data.models.map(key)));
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
// Prior approved catalogue-colour UI change (PR #8) is now the preservation baseline.
const baseline = '82163202dd1552efb4085536c9b0812c3ebf1e08';
for (const path of ['content.json', 'catalog-colors.json', 'colors.html', 'colors.js']) {
  assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8', maxBuffer: 2000000 }),
    'Existing data changed unexpectedly: ' + path);
}
console.log('PASS: ' + ids.vehicles.length + ' trim IDs, ' +
  Object.keys(catalogs.catalogs).length + ' catalogue groups; original content/colors unchanged.');
