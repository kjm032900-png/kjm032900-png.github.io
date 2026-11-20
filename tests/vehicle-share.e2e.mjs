import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8765/';
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { stdio: 'ignore' });
let browser;
function pause(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitForServer() {
  for (let i = 0; i < 75; i++) {
    try { const r = await fetch(base + 'content.json'); if (r.ok) return; }
    catch (error) { /* server still starting */ }
    await pause(200);
  }
  throw new Error('Local test server did not start');
}
async function checkWidth(page, expected) {
  const size = await page.evaluate(() => ({ view: window.innerWidth, doc: document.documentElement.scrollWidth }));
  assert.equal(size.view, expected);
  assert.ok(size.doc <= expected + 1, 'Horizontal overflow: ' + JSON.stringify(size));
}
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#modelGrid .model').first().waitFor({ timeout: 25000 });
  assert.equal(await page.locator('#modelGrid .model').count(), 44);
  const publishedData = await (await fetch(base + 'content.json')).json();
  assert.equal(await page.locator('#promos .promo').count(), publishedData.promotions.length);
  assert.equal(await page.locator('[data-share-family]').count(), 0, 'No sales-only buttons on public model cards');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__copiedShareUrl = text; } }
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  await page.locator('[data-family="E-Class"]').click();
  await page.locator('#dialogTable .share-action-row').first().waitFor();
  const pdfUrl = await page.locator('#dialogTable a.share-catalogue-open').first().getAttribute('href');
  assert.match(pdfUrl, /^https:\/\/www\.mercedes-benz\.co\.kr\/.+\.pdf$/);
  assert.match(await page.locator('#dialogTable').innerText(), /공식 카탈로그 보기·다운로드/);

  await page.locator('#dialogTable button[data-copy-catalogue]').first().click();
  await page.waitForFunction(() => window.__copiedShareUrl && window.__copiedShareUrl.endsWith('.pdf'));
  assert.equal(await page.evaluate(() => window.__copiedShareUrl), pdfUrl);

  await page.locator('#dialogTable button[data-share-single]').first().click();
  await page.waitForFunction(() => window.__copiedShareUrl && window.__copiedShareUrl.includes('share.html?ids='));
  let oneUrl = new URL(await page.evaluate(() => window.__copiedShareUrl));
  assert.equal(oneUrl.searchParams.get('ids').split(',').length, 1);
  assert.deepEqual(Array.from(oneUrl.searchParams.keys()), ['ids']);

  await page.locator('#dialogTable tr.share-data-row').filter({ hasText: 'E 200 EXCLUSIVE' }).locator('input[data-share-id]').check();
  assert.match(await page.locator('#shareDialogCount').innerText(), /1대/);
  await page.locator('#closeDialog').click();
  await page.locator('[data-family="GLE"]').click();
  await page.locator('#dialogTable tr.share-data-row').filter({ hasText: 'GLE 450 4MATIC AMG Line' }).locator('input[data-share-id]').check();
  assert.match(await page.locator('#shareDialogCount').innerText(), /2대/);
  await page.locator('[data-share-selected-copy]').click();
  await page.waitForFunction(() => window.__copiedShareUrl && new URL(window.__copiedShareUrl).searchParams.get('ids')?.includes(','));
  const modalUrl = new URL(await page.evaluate(() => window.__copiedShareUrl));
  assert.equal(modalUrl.searchParams.get('ids').split(',').length, 2);
  await page.locator('#closeDialog').click();

  await page.locator('#shareToolbar').waitFor({ state: 'visible' });
  assert.match(await page.locator('#shareToolbarCount').innerText(), /2대/);
  await page.locator('#shareCopy').click();
  await page.waitForFunction(() => Boolean(window.__copiedShareUrl));
  const copiedUrl = new URL(await page.evaluate(() => window.__copiedShareUrl));
  assert.equal(copiedUrl.pathname, '/share.html');
  assert.deepEqual(Array.from(copiedUrl.searchParams.keys()), ['ids']);
  assert.equal(copiedUrl.searchParams.get('ids').split(',').length, 2);
  const newPage = desktop.waitForEvent('page');
  await page.locator('#sharePreview').click();
  const sharePage = await newPage;
  await sharePage.locator('.share-card').nth(1).waitFor({ timeout: 25000 });
  assert.equal(await sharePage.locator('.share-card').count(), 2);
  assert.match(await sharePage.locator('#shareResults').innerText(), /77,500,000원/);
  assert.match(await sharePage.locator('#shareResults').innerText(), /139,000,000원/);
  assert.equal(await sharePage.locator('.share-card .share-card-actions a').count(), 4);
  assert.equal(await sharePage.locator('.share-card .share-card-actions button[data-catalogue-copy]').count(), 2);
  await sharePage.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable:true, value: {writeText:async text => {window.__copiedCatalogue = text;}}}); });
  await sharePage.locator('button[data-catalogue-copy]').first().click();
  await sharePage.waitForFunction(() => Boolean(window.__copiedCatalogue));
  assert.match(await sharePage.evaluate(() => window.__copiedCatalogue), /\.pdf$/);
  assert.match(await sharePage.locator('.share-card').first().locator('a').first().getAttribute('href'), /\.pdf(?:\?|$)/);
  const shareUrl = sharePage.url();
  assert.ok(shareUrl.includes('ids='));
  assert.ok(!shareUrl.includes('name=') && !shareUrl.includes('phone='));
  await checkWidth(sharePage, 1440);
  await page.goto(base + 'share.html?ids=not-a-real-vehicle-id', { waitUntil: 'domcontentloaded' });
  await page.locator('#shareCount').filter({ hasText: '선택된 차량 0대' }).waitFor({ timeout: 25000 });
  assert.equal(await page.locator('.share-card').count(), 0);
  await page.goto(base + 'share.html', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.share-card').count(), 0);

  for (const width of [390, 360]) {
    const mobile = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      deviceScaleFactor: 3,
      hasTouch: true
    });
    const customer = await mobile.newPage();
    await customer.goto(shareUrl, { waitUntil: 'domcontentloaded' });
    await customer.locator('.share-card').nth(1).waitFor({ timeout: 25000 });
    assert.equal(await customer.locator('.share-card').count(), 2);
    await checkWidth(customer, width);
    const home = await mobile.newPage();
    await home.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
    await home.locator('[data-family="E-Class"]').waitFor({ timeout: 25000 });
    await checkWidth(home, width);
    await home.locator('[data-family="E-Class"]').click();
    await home.locator('#dialogTable .share-row-actions').first().waitFor();
    await home.locator('#dialogTable input[data-share-id]').first().check();
    assert.match(await home.locator('#shareDialogCount').innerText(), /1대/);
    await home.locator('#closeDialog').click();
    await home.locator('#shareToolbar').waitFor({ state: 'visible' });
    assert.match(await home.locator('#shareToolbarCount').innerText(), /1대/);
    await checkWidth(home, width);
    await mobile.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: desktop 1440px / Galaxy-sized 390px and 360px; existing content, multi-trim selection, customer detail, PDF and missing-ID states.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
