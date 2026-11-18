#!/usr/bin/env node
// Validate official catalogue photo atlases, their source-page/option-code keys and image bytes.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Script, createContext } from 'node:vm';
import { strict as assert } from 'node:assert';

const root = new URL('../', import.meta.url);
const catalogue = JSON.parse(readFileSync(new URL('../catalog-colors.json', import.meta.url), 'utf8')).catalogGroups;
const folder = new URL('../catalog-photo-atlases/', import.meta.url);
assert.ok(existsSync(folder), 'Atlas folder is missing');
const filenames = readdirSync(folder).filter((file) => file.endsWith('.js'));
assert.ok(filenames.length >= 30, 'Unexpected number of source photo group assets');

const context = { window: {} };
createContext(context);
let groups = 0, matched = 0, unmatched = 0;
function check(key, sourceText) {
  new Script(sourceText, {filename:key+'.js', timeout:3000}).runInContext(context, {timeout:3000});
  const atlas = context.window.CATALOG_IMAGE_ATLASES?.[key];
  const group = catalogue[key];
  assert.ok(group && atlas && group.sourceEdition, 'Unknown atlas or missing source edition: '+key);
  const allowed = {
    exterior:new Set(group.exterior.map((item) => item.sourcePage+'|'+item.code)),
    seats:new Set(group.seats.map((item) => item.sourcePage+'|'+item.code)),
    interiorTrims:new Set(group.interiorTrims.map((item) => item.sourcePage+'|'+item.code))
  };
  for (const [category, sheet] of Object.entries(atlas)) {
    assert.ok(allowed[category], 'Unrecognized tab: '+key+' '+category);
    const items = sheet.keys || sheet.codes;
    assert.ok(Array.isArray(items) && items.length > 0, 'Empty photo sheet: '+key+' '+category);
    assert.ok(sheet.cols >= 1 && sheet.rows >= 1 && sheet.cols*sheet.rows>=items.length,'Invalid image grid: '+key+' '+category);
    assert.equal(new Set(items).size, items.length, 'Duplicate image keys: '+key+' '+category);
    assert.ok(typeof sheet.url==='string' && sheet.url.startsWith('data:image/webp;base64,'), 'Incorrect image mime type');
    const bytes = Buffer.from(sheet.url.split(',')[1], 'base64');
    assert.ok(bytes.length >= 300 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP', 'Corrupt WebP image: '+key);
    for (const ref of items) {
      if (allowed[category].has(ref) || (key==='e-class' && [...allowed[category]].some((t) => t.endsWith('|'+ref)))) matched++;
      else unmatched++;
    }
  }
  groups++;
}
for (const filename of filenames) {
  const key=filename.slice(0,-3);
  check(key,readFileSync(join(folder.pathname,filename),'utf8'));
}
check('e-class', readFileSync(new URL('../eclass-sprites.js',import.meta.url),'utf8'));
assert.ok(matched >= 450, 'Unexpectedly low photograph coverage');
assert.ok(unmatched <= 20, 'Too many atlas photo labels differ from catalog data: '+unmatched);
console.log('PASS:',groups,'catalogue photo groups,',matched,'matched page/code images,',unmatched,'unused source-photo slots');
