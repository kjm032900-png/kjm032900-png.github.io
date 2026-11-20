import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8765/';
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { stdio: 'ignore' });
let browser;

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  for (let attempt = 0; attempt < 75; attempt++) {
    try { if ((await fetch(base + 'content.json')).ok) return; }
    catch (error) { /* Wait for local server startup. */ }
    await pause(200);
  }
  throw Error('Local test server did not start');
}
async function checkWidth(page, expected) {
  const size = await page.evaluate(() => ({ width: window.innerWidth, document: document.documentElement.scrollWidth }));
  assert.equal(size.width, expected);
  assert.ok(size.document <= expected + 1, 'Horizontal overflow: ' + JSON.stringify(size));
}

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#modelGrid .model').first().waitFor({ timeout: 25000 });

  const data = await (await fetch(base + 'content.json')).json();
  const registry = await (await fetch(base + 'catalog-links.json')).json();
  const vehicleIds = await (await fetch(base + 'vehicle-ids.json')).json();
  assert.equal(data.models.length, 100);
  const visibleModels = data.models.filter(row => !row.hiddenFromCatalog);
  const families = [...new Set(visibleModels.map(row => row.family))];
  assert.equal(visibleModels.length, 90);
  assert.equal(vehicleIds.vehicles.length, 91);
  assert.equal(families.length, 44);
  // Separate Mercedes-Benz Korea launch prices: the 2026-11-17 consolidated PDF does not list electric GLC.
  const glcElectric = visibleModels.filter(row => row.family === 'GLC Electric');
  assert.equal(glcElectric.length, 2, 'Only the two announced electric GLC grades should be public');
  assert.deepEqual(glcElectric.map(row => row.price).sort((a,b)=>a-b), [90000000, 94800000]);
  assert.deepEqual(glcElectric.map(row => row.trim), [
    'GLC 300 4MATIC AMG Line Electric','GLC 300 4MATIC AMG Line+ Electric'
  ]);
  assert.ok(glcElectric.every(row => /별도 발표/.test(row.source)));
  assert.equal(data.models.find(row => row.family === 'GLC Electric' && row.trim === 'The all-new electric GLC')?.hiddenFromCatalog, true);
  const unknownPublicPrices = visibleModels.filter(row => row.price === null);
  assert.deepEqual(unknownPublicPrices.map(row => row.trim), ['EQS 400 Facelift'],
    'Only the genuinely unannounced EQS 400 facelift may lack a public price');
  assert.deepEqual(data.card_prices.glc_electric, {family:'GLC Electric',year:'27MY',trim:'GLC 300 4MATIC AMG Line Electric',starting:true});
  assert.equal(await page.locator('[data-card-price="glc_electric"]').innerText(), '9,000만원부터');
  assert.equal(await page.locator('[data-model-family="GLC Electric"] .starting').innerText(), '공식가 90,000,000원부터');
  const galleryBg = await page.locator('#models').evaluate(el => getComputedStyle(el).backgroundColor);
  assert.equal(galleryBg, 'rgb(233, 237, 240)', 'Gallery uses a gentle silver instead of pure white');
  const buttonFontSize = await page.locator('[data-family="GLC Electric"]').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert.ok(buttonFontSize >= 14, 'Vehicle gallery buttons should remain legible at desktop scale');
  assert.equal(await page.locator('#modelGrid .model').count(), 44);
  await page.locator('[data-family="GLC Electric"]').click();
  assert.equal(await page.locator('#dialogTable tbody tr').count(), 2);
  assert.match(await page.locator('#dialogTable').innerText(), /90,000,000원/);
  assert.match(await page.locator('#dialogTable').innerText(), /94,800,000원/);
  await page.locator('#closeDialog').click();
  assert.equal(await page.locator('#modelGrid .gallery-group-heading').count(), 7);
  assert.equal(await page.locator('#modelGrid .model[data-model-family="GLS"] .starting').innerText(), '공식가 152,000,000원부터');
  assert.match(await page.locator('#new').innerText(), /신형 GLE Coupé/);
  assert.match(await page.locator('#new').innerText(), /신형 GLS/);

  // Verify imagery is model-correct and visibly high resolution.
  const imageOverrides = ['AMG CLA','AMG S-Class','AMG GLB','AMG GLC','AMG GLC Coupé',
    'AMG GLE Coupé','AMG GLS','Maybach SL','EQS'];
  const modelCards = await page.locator('#modelGrid .model[data-model-family]').count();
  assert.equal(modelCards, 44, 'One marked card for each published model family');
  const sourcePairs = await page.locator('#modelGrid .model[data-model-family]').evaluateAll(cards =>
    cards.map(c => ({ family: c.dataset.modelFamily, src: c.querySelector('.model-photo img')?.src }))
  );
  assert.equal(new Set(sourcePairs.map(p => p.src)).size, 44, 'No two model families use the same actual image URL');
  for (const family of imageOverrides) {
    const url = sourcePairs.find(p => p.family === family)?.src;
    assert.ok(url?.startsWith('https://'), family + ' must have a dedicated model-accurate photo URL');
  }
  const imageResults = await page.evaluate(async urls => {
    return Promise.all(urls.map(async url => {
      const image = new Image();
      image.decoding = 'async';
      const result = new Promise(resolve => {
        image.onload = () => resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve({ url, width: 0, height: 0 });
      });
      image.src = url;
      return Promise.race([result, new Promise(resolve => setTimeout(
        () => resolve({url, width:0, height:0}), 16000))]);
    }));
  }, imageOverrides.map(f => sourcePairs.find(p => p.family === f).src));
  const failures = imageResults.map((result, i) => (
    result.width >= 600 && result.height >= 300 ? null :
      { model: imageOverrides[i], ...result }
  )).filter(Boolean);
  console.log('Image audit:', JSON.stringify(imageResults.map((item, i) => ({model:imageOverrides[i],width:item.width,height:item.height}))));
  assert.deepEqual(failures, [], 'New model photos must all load and be at least 600x300 pixels');
  console.log('PASS: 44 distinct image URLs and available external images.');
  for (const family of ['GLE','GLE Coupé','GLS','AMG CLE']) {
    const src = sourcePairs.find(p => p.family === family)?.src;
    assert.ok(src?.includes('/images/official-gallery/'), 'Expected local official cutout: ' + family);
    const image = page.locator('[data-model-family="' + family + '"] .model-photo img');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img => img.decode());
    const size = await image.evaluate(img => ({complete:img.complete,width:img.naturalWidth,height:img.naturalHeight}));
    assert.ok(size.complete && size.width>=900 && size.height>=450, 'Missing/highly compressed local image ' + family + ': ' + JSON.stringify(size));
  }

  assert.equal(await page.locator('#promos .promo').count(), data.promotions.length);
  assert.equal(await page.locator('#shareToolbar').count(), 0, 'No multi-car share toolbar');

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async url => { window.__copiedCatalogueUrl = url; } }
    });
  });

  // A model card opens one common catalogue/colour section and a plain trim price table.
  await page.locator('[data-family="E-Class"]').click();
  await page.locator('#dialogCatalogues a.share-catalogue-open').first().waitFor();
  assert.equal(await page.locator('#dialogCatalogues a.share-catalogue-open').count(), 1);
  assert.equal(await page.locator('#dialogCatalogues button[data-copy-catalogue]').count(), 1);
  assert.equal(await page.locator('#dialogColorsLink').count(), 1);
  assert.equal(await page.locator('#dialogColorsLink').getAttribute('href'), 'colors.html?model=E-Class');
  assert.equal(await page.locator('#dialogTable tbody tr').count(), 8);
  assert.match(await page.locator('#dialogTable').innerText(), /77,500,000원/);
  assert.match(await page.locator('#dialogTable').innerText(), /129,500,000원/);
  await page.locator('#closeDialog').click();
  await page.locator('[data-family="GLS"]').click();
  assert.equal(await page.locator('#dialogTable tbody tr').count(), 4);
  assert.match(await page.locator('#dialogTable').innerText(), /152,000,000원/);
  assert.ok(!(await page.locator('#dialogTable').innerText()).includes('26MY'));
  await page.locator('#closeDialog').click();
  await page.locator('[data-family="E-Class"]').click();

  const pdfUrl = await page.locator('#dialogCatalogues a.share-catalogue-open').first().getAttribute('href');
  assert.match(pdfUrl, /^https:\/\/www\.mercedes-benz\.co\.kr\/.+\.pdf$/);
  await page.locator('#dialogCatalogues button[data-copy-catalogue]').click();
  await page.waitForFunction(() => Boolean(window.__copiedCatalogueUrl));
  assert.equal(await page.evaluate(() => window.__copiedCatalogueUrl), pdfUrl);
  assert.match(await page.locator('#catalogCopyFeedback').innerText(), /복사되었습니다/);
  await page.locator('#closeDialog').click();

  // Every published family: distinct PDF per actual URL, with no repeated
  // colour links, individual share actions, checkboxes or collection controls.
  let displayedDocs = 0;
  let redundantButtonsRemoved = 0;
  for (const family of families) {
    const rows = visibleModels.filter(row => row.family === family);
    const expectedUrls = [...new Set(rows.map(row => {
      const key = registry.trimCatalogOverrides[row.trim] || registry.familyToCatalog[row.family];
      const url = registry.catalogs[key]?.url;
      return url && new URL(url).pathname.toLowerCase().endsWith('.pdf')
        ? url : registry.catalogueIndexUrl;
    }))].sort();
    displayedDocs += expectedUrls.length;
    redundantButtonsRemoved += (rows.length - expectedUrls.length) * 2;

    await page.locator('[data-family="' + family + '"]').click();
    await page.locator('#dialogCatalogues a.share-catalogue-open').first().waitFor();
    const actualUrls = await page.locator('#dialogCatalogues a.share-catalogue-open')
      .evaluateAll(anchors => anchors.map(a => a.href).sort());
    assert.deepEqual(actualUrls, expectedUrls, 'Unique catalogue URLs for ' + family);
    assert.equal(await page.locator('#dialogCatalogues button[data-copy-catalogue]').count(), expectedUrls.length, family + ' copy buttons');
    assert.equal(await page.locator('#dialogColorsLink').count(), 1, family + ' single colour link');
    assert.equal(await page.locator('#dialogColorsLink').getAttribute('href'), 'colors.html?model=' + encodeURIComponent(family));
    assert.equal(await page.locator('#dialogTable tbody tr').count(), rows.length, family + ' price rows');
    assert.equal(await page.locator('#dialogTable .model-color-link').count(), 0, family + ' duplicate colour links');
    assert.equal(await page.locator('#dialogTable input[data-share-id]').count(), 0, family + ' no checkbox');
    assert.equal(await page.locator('#dialogTable button[data-share-single]').count(), 0, family + ' no per-trim sharing');
    assert.equal(await page.locator('#dialogTable .share-action-row').count(), 0, family + ' no share rows');
    assert.equal(await page.locator('#shareDialogControls').count(), 0, family + ' no collection controls');
    await page.locator('#closeDialog').click();
  }
  assert.equal(displayedDocs, 46);
  assert.equal(redundantButtonsRemoved, 88);
  for (const family of ['AMG CLE', 'AMG GT']) {
    await page.locator('[data-family="' + family + '"]').click();
    assert.equal(await page.locator('#dialogCatalogues a.share-catalogue-open').count(), 2);
    assert.equal(await page.locator('#dialogCatalogues .share-catalogue-applies').count(), 2);
    await page.locator('#closeDialog').click();
  }
  for (const family of ['AMG S-Class', 'AMG GLS', 'AMG G 63']) {
    await page.locator('[data-family="' + family + '"]').click();
    assert.equal(await page.locator('#dialogCatalogues a.share-catalogue-open').count(), 1);
    assert.match(await page.locator('#dialogCatalogues').innerText(), /공식 카탈로그 목록 보기/);
    await page.locator('#closeDialog').click();
  }


  // Restore previous scroll and modal, verify distinct PDF/colour copy actions.
  const colorNav = await desktop.newPage();
  colorNav.on('pageerror', error => errors.push('Colour navigation: ' + error.message));
  await colorNav.goto(base + 'index.html', {waitUntil:'domcontentloaded'});
  await colorNav.locator('[data-family="S-Class"]').waitFor({timeout:25000});
  await colorNav.locator('[data-family="S-Class"]').scrollIntoViewIfNeeded();
  const previousScrollY = await colorNav.evaluate(() => window.scrollY);
  await colorNav.locator('[data-family="S-Class"]').click();
  await colorNav.locator('#dialogColorsLink').click();
  await colorNav.waitForURL(/colors\.html\?model=S-Class/);
  await colorNav.locator('#guideTitle').filter({hasText:'S-Class'}).waitFor();
  assert.equal(await colorNav.locator('#returnToModel').innerText(), '← 이전 화면으로 돌아가기');
  assert.equal(await colorNav.locator('header #returnToModel').count(), 0);
  assert.ok((await colorNav.locator('#returnToModel').boundingBox()).height >= 40);
  const officialPdf = await colorNav.locator('#catalogSource').getAttribute('href');
  assert.match(officialPdf, /^https:\/\/www\.mercedes-benz\.co\.kr\/.+\.pdf$/);
  assert.match(await colorNav.locator('#catalogSource').innerText(), /PDF 열기·다운로드/);
  assert.match(await colorNav.locator('#pdfActionHint').innerText(), /바로 다운로드/);
  assert.equal(await colorNav.locator('#copyCatalogLink').isVisible(), true);
  await colorNav.evaluate(() => {
    Object.defineProperty(navigator,'clipboard',{
      configurable:true,value:{writeText:async url=>{window.__copiedColourOrPdfUrl=url;}}
    });
  });
  await colorNav.locator('#copyCatalogLink').click();
  await colorNav.waitForFunction(() => Boolean(window.__copiedColourOrPdfUrl));
  assert.equal(await colorNav.evaluate(() => window.__copiedColourOrPdfUrl), officialPdf);
  assert.match(await colorNav.locator('#shareFeedback').innerText(), /PDF 링크를 복사/);
  await colorNav.locator('#tab-seats').click();
  await colorNav.locator('#copyColorLink').click();
  assert.match(await colorNav.evaluate(() => window.__copiedColourOrPdfUrl), /colors\.html\?model=S-Class/);
  assert.match(await colorNav.evaluate(() => window.__copiedColourOrPdfUrl), /tab=seats/);
  await colorNav.locator('#returnToModel').click();
  await colorNav.waitForURL(/index\.html/);
  await colorNav.locator('#modelDialog[open]').waitFor({timeout:25000});
  assert.equal(await colorNav.locator('#dialogTitle').innerText(), 'S-Class');
  await colorNav.waitForFunction(y=>Math.abs(window.scrollY-y)<=12,previousScrollY,{timeout:7000});
  await colorNav.close();

  const directColour = await desktop.newPage();
  await directColour.goto(base + 'colors.html?model=AMG%20G%2063', {waitUntil:'domcontentloaded'});
  await directColour.locator('#family').waitFor();
  await directColour.waitForFunction(() => document.querySelector('#family')?.value === 'AMG G 63');
  assert.equal(await directColour.locator('#copyCatalogLink').isVisible(), false);
  assert.match(await directColour.locator('#catalogSource').innerText(), /공식 카탈로그 목록/);
  assert.match(await directColour.locator('#pdfActionHint').innerText(), /직접 연결된 공식 PDF가 없어/);
  await directColour.close();

  // Old customer share links must still work, despite removal of homepage
  // selection and multi-send buttons. No customer PII is introduced in URLs.
  const ids = [
    ['E-Class', 'E 200 EXCLUSIVE'],
    ['GLE', 'GLE 450 4MATIC AMG Line']
  ].map(([family, trim]) => {
    const match = vehicleIds.vehicles.find(v => v.family === family && v.trim === trim);
    assert.ok(match, family + ' ' + trim + ' ID remains available');
    return match.id;
  });
  const oldShareUrl = base + 'share.html?ids=' + ids.join(',');
  const sharePage = await desktop.newPage();
  await sharePage.goto(oldShareUrl, { waitUntil: 'domcontentloaded' });
  await sharePage.locator('.share-card').nth(1).waitFor({ timeout: 25000 });
  assert.equal(await sharePage.locator('.share-card').count(), 2);
  assert.match(await sharePage.locator('#shareResults').innerText(), /77,500,000원/);
  assert.match(await sharePage.locator('#shareResults').innerText(), /139,000,000원/);
  await checkWidth(sharePage, 1440);
  await page.goto(base + 'share.html?ids=not-a-real-vehicle-id', { waitUntil: 'domcontentloaded' });
  await page.locator('#shareCount').filter({ hasText: '선택된 차량 0대' }).waitFor({ timeout: 25000 });
  assert.equal(await page.locator('.share-card').count(), 0);

  for (const width of [390, 360]) {
    const mobile = await browser.newContext({
      viewport: { width, height: 844 }, isMobile: true, deviceScaleFactor: 3, hasTouch: true
    });
    const home = await mobile.newPage();
    await home.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
    await home.locator('[data-family="E-Class"]').waitFor({ timeout: 25000 });
    await checkWidth(home, width);
    await home.locator('[data-family="E-Class"]').click();
    await home.locator('#dialogCatalogues a.share-catalogue-open').first().waitFor();
    assert.equal(await home.locator('#dialogCatalogues a.share-catalogue-open').count(), 1);
    assert.equal(await home.locator('#dialogColorsLink').count(), 1);
    assert.equal(await home.locator('#dialogTable tbody tr').count(), 8);
    assert.equal(await home.locator('input[data-share-id]').count(), 0);
    await checkWidth(home, width);
    await home.locator('#dialogColorsLink').click();
    await home.locator('#returnToModel').waitFor({timeout:25000});
    await checkWidth(home, width);
    await home.locator('#returnToModel').click();
    await home.locator('#modelDialog[open]').waitFor({timeout:25000});
    assert.equal(await home.locator('#dialogTitle').innerText(), 'E-Class');
    await home.locator('#closeDialog').click();

    const legacy = await mobile.newPage();
    await legacy.goto(oldShareUrl, { waitUntil: 'domcontentloaded' });
    await legacy.locator('.share-card').nth(1).waitFor({ timeout: 25000 });
    assert.equal(await legacy.locator('.share-card').count(), 2);
    await checkWidth(legacy, width);
    await mobile.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 44 categorized model cards, 90 currently listed trims, historical share ID safety, 27MY price checks and all catalogue/colour/desktop/mobile tests.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
