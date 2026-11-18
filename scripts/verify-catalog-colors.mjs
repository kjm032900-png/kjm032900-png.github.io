#!/usr/bin/env node
// Run: node scripts/verify-catalog-colors.mjs
import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const vehicles = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
const colors = JSON.parse(readFileSync(new URL('../catalog-colors.json', import.meta.url), 'utf8'));
const families = [...new Set(vehicles.models.map((row) => row.family))];
assert.equal(colors.schemaVersion, 1);
assert.equal(families.length, Object.keys(colors.familyToCatalog).length, 'Unexpected family mapping count');

for (const family of families) {
  const key = colors.familyToCatalog[family];
  assert.equal(typeof key, 'string', 'Missing catalogue key for ' + family);
  assert.ok(colors.catalogGroups[key], 'Missing catalogue group for ' + family);
}
for (const [key, group] of Object.entries(colors.catalogGroups)) {
  assert.ok(group.title && group.sourceUrl, 'Missing title/source: ' + key);
  assert.ok(['pending', 'verified', 'unavailable'].includes(group.reviewStatus), 'Invalid reviewStatus: ' + key);
  assert.ok(['exterior', 'seats', 'interiorTrims'].every((k) => Array.isArray(group[k])), 'Invalid tab data: ' + key);
  const items = [...group.exterior, ...group.seats, ...group.interiorTrims];
  if (group.reviewStatus !== 'verified') {
    assert.equal(items.length, 0, 'Unverified items must not publish: ' + key);
    continue;
  }
  assert.ok(group.sourceEdition, 'Catalogue edition required: ' + key);
  assert.ok(group.sourceDocumentUrl && /^https:\/\/(www\.mercedes-benz\.co\.kr|dam\.oneweb\.mercedes-benz\.com)\//.test(group.sourceDocumentUrl), 'Official source document required: ' + key);
  assert.ok(items.length > 0, 'Verified group must have items: ' + key);
  for (const item of items) {
    assert.ok(typeof item.name === 'string' && item.name.trim(), 'Missing catalogue-exact name: ' + key);
    assert.ok(item.sourcePage, 'Source page required: ' + key + ' ' + item.name);
    assert.ok(!item.image || item.assetApproved === true, 'Do not publish unapproved image: ' + key + ' ' + item.name);
    if (item.image) {
      assert.ok(item.image.startsWith('images/catalog-colors/') && !item.image.includes('..'), 'Unsafe image path: ' + key);
      assert.ok(existsSync(new URL('../' + item.image, import.meta.url)), 'Missing image file: ' + item.image);
    }
  }
}
console.log('PASS:', families.length, 'model families,', Object.keys(colors.catalogGroups).length, 'catalogue groups');
