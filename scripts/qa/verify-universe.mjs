import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = (process.env.UNIVERSE_BASE_URL ?? 'http://127.0.0.1:4180').replace(/\/$/, '');
const OUT = '/tmp/universe-verify';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = { console: [], requestFailures: [], checks: [], routes: [], screenshots: [] };

async function newPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', msg => {
    if (msg.type() === 'error') report.console.push(`${width}: ${msg.text()}`);
  });
  page.on('pageerror', err => report.console.push(`${width}: PAGEERROR ${err.message}`));
  page.on('requestfailed', req => {
    const error = req.failure()?.errorText ?? '';
    if (error !== 'net::ERR_ABORTED') {
      report.requestFailures.push(`${width}: ${req.url()} ${error}`);
    }
  });
  return page;
}
function check(name, value, detail = '') {
  report.checks.push({ name, ok: !!value, detail });
  if (!value) console.log(`FAIL ${name} ${detail}`);
}
async function ready(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}
async function overflow(page) {
  return page.evaluate(() => ({ doc: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
}

for (const width of [1440, 390]) {
  const height = width === 1440 ? 1000 : 844;
  const page = await newPage(width, height);
  const routes = ['/', '/universe/', '/universe/leaderboard/', '/universe/models/', '/universe/compare/', '/universe/chronicle/', '/universe/credits/', '/universe/vendor/openai/', '/universe/model/anthropic-claude-fable-5-1/'];
  for (const route of routes) {
    const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await ready(page);
    const title = await page.title();
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    const o = await overflow(page);
    report.routes.push({ width, route, status: response?.status(), title, h1, overflow: o });
    check(`${width} ${route} status`, response?.status() === 200, String(response?.status()));
    check(`${width} ${route} has h1`, !!h1, String(h1));
    check(`${width} ${route} no horizontal overflow`, o.doc <= o.client + 1, JSON.stringify(o));
  }

  await page.goto(BASE + '/universe/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.screenshot({ path: `${OUT}/home-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/home-${width}.png`);
  check(`${width} home champions 8`, await page.locator('.universe-champion-card').count() === 8, String(await page.locator('.universe-champion-card').count()));
  check(`${width} home kinds 6`, await page.locator('.universe-kind-card').count() === 6, String(await page.locator('.universe-kind-card').count()));
  check(`${width} home map systems`, await page.locator('.universe-system').count() > 5, String(await page.locator('.universe-system').count()));
  check(`${width} multimodal filter`, await page.locator('.universe-map-filters select[aria-label="按能力筛选天体"] option[value="multimodal"]').count() === 1);

  const mapSearch = page.locator('#universe-search');
  await mapSearch.fill('Claude');
  await page.waitForTimeout(200);
  check(`${width} map search results`, await page.locator('.universe-search-result').count() > 0, String(await page.locator('.universe-search-result').count()));
  await page.locator('.universe-search-result').first().click();
  check(`${width} map selection opens`, await page.locator('.universe-selection').count() === 1);
  const selectionHref = await page.locator('.universe-selection-link').getAttribute('href');
  check(
    `${width} map selection detail href`,
    selectionHref != null && new URL(selectionHref, BASE).pathname.includes('/universe/model/'),
    String(selectionHref),
  );
  await page.locator('.universe-selection-link').evaluate((element) => element.click());
  await page.waitForURL((url) => url.pathname.includes('/universe/model/'));
  await ready(page);
  check(`${width} selection detail route`, page.url().includes('/universe/model/'), page.url());
  check(`${width} detail persona`, await page.locator('.universe-model-persona').count() === 1);
  check(`${width} detail ability band`, await page.locator('.universe-ability-band').count() === 1);
  await page.screenshot({ path: `${OUT}/model-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/model-${width}.png`);

  await page.goto(BASE + '/universe/leaderboard/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  check(`${width} leaderboard tracks`, await page.locator('.universe-explorer button[aria-pressed]').count() > 5);
  if (width === 1440) {
    await page.locator('.universe-explorer button[aria-pressed]:visible').nth(1).click();
  } else {
    await page.locator('.universe-explorer select[aria-label="选择赛道"]').selectOption({ index: 1 });
  }
  await page.waitForTimeout(100);
  check(`${width} leaderboard URL track`, page.url().includes('track='), page.url());
  await page.screenshot({ path: `${OUT}/leaderboard-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/leaderboard-${width}.png`);

  await page.goto(BASE + '/universe/models/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  check(`${width} all table rows`, await page.locator('.universe-all-models-table tbody tr').count() > 20, String(await page.locator('.universe-all-models-table tbody tr').count()));
  const firstRowName = page.locator('.universe-all-models-table tbody tr').first().locator('.universe-table-name');
  check(`${width} all table first model visible`, await firstRowName.isVisible());
  const firstRowNameBox = await firstRowName.boundingBox();
  check(
    `${width} all table first model inside viewport`,
    !!firstRowNameBox && firstRowNameBox.x >= 0 && firstRowNameBox.x + Math.min(firstRowNameBox.width, 80) <= width,
    JSON.stringify(firstRowNameBox),
  );
  await page.locator('.universe-all-models-table thead button').filter({ hasText: '综合智力' }).click();
  await page.waitForTimeout(100);
  check(`${width} all table sort URL`, page.url().includes('sort='), page.url());
  await page.screenshot({ path: `${OUT}/models-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/models-${width}.png`);

  await page.goto(BASE + '/universe/compare/?m=abacusai-dracarys-llama-3-1-70b-instruct,anthropic-claude-fable-5-1', { waitUntil: 'domcontentloaded' });
  await ready(page);
  check(`${width} compare cards`, await page.locator('.universe-compare-card').count() === 2, String(await page.locator('.universe-compare-card').count()));
  check(`${width} compare loaded data`, await page.locator('.universe-compare').getByText('正在载入模型数据').count() === 0);
  check(`${width} compare celestial bodies`, await page.locator('.universe-compare-card .universe-orb').count() === 2, String(await page.locator('.universe-compare-card .universe-orb').count()));
  await page.screenshot({ path: `${OUT}/compare-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/compare-${width}.png`);

  await page.goto(BASE + '/universe/vendor/openai/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.waitForTimeout(1200);
  check(`${width} vendor scene`, await page.locator('.universe-scene').count() === 1);
  check(`${width} vendor catalog`, await page.locator('.universe-vendor-catalog').count() === 1);
  await page.screenshot({ path: `${OUT}/vendor-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/vendor-${width}.png`);

  await page.goto(BASE + '/universe/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  const search = page.locator('.universe-global-search input');
  await search.fill('智谱 多模态');
  await page.waitForTimeout(350);
  check(`${width} global search result`, await page.locator('.universe-search-popover a').count() > 0, String(await page.locator('.universe-search-popover a').count()));
  await page.screenshot({ path: `${OUT}/search-${width}.png`, fullPage: false });
  report.screenshots.push(`${OUT}/search-${width}.png`);
  await page.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const failed = report.checks.filter(c => !c.ok);
console.log(JSON.stringify({ checks: report.checks.length, failed, console: report.console, requestFailures: report.requestFailures, routes: report.routes }, null, 2));
process.exit(failed.length || report.console.length || report.requestFailures.length ? 1 : 0);
