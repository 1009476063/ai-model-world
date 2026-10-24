import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = (process.env.UNIVERSE_BASE_URL ?? 'http://127.0.0.1:4180').replace(/\/$/, '');
const OUT = process.env.UNIVERSE_REPORT_DIR ?? '/tmp/universe-verify';
// Never let a previous run's report be mistaken for this one's result.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
console.log(`target=${BASE} report=${OUT}`);
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
/** Poll a condition until it holds or the budget runs out. Remote hosts stream
 * assets slowly, so fixed sleeps make functional assertions flaky. */
async function expect(name, predicate, { timeout = 30000, interval = 200 } = {}) {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    try {
      last = await predicate();
      if (last) return check(name, true, String(last === true ? '' : last));
    } catch (error) {
      last = String(error?.message ?? error);
    }
    if (Date.now() >= deadline) return check(name, false, String(last === true ? '' : last ?? 'timeout'));
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
async function ready(page) {
  // networkidle can never settle behind a slow CDN; treat it as best effort.
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
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
  await expect(`${width} home champions 8`, async () => (await page.locator('.universe-champion-card').count()) === 8);
  await expect(`${width} home kinds 6`, async () => (await page.locator('.universe-kind-card').count()) === 6);
  await expect(`${width} home map systems`, async () => {
    const n = await page.locator('.universe-system').count();
    return n > 5 ? n : false;
  });
  await expect(`${width} multimodal filter`, async () =>
    (await page.locator('.universe-map-filters select[aria-label="按能力筛选天体"] option[value="multimodal"]').count()) === 1);

  const mapSearch = page.locator('#universe-search');
  await mapSearch.fill('Claude');
  await expect(`${width} map search results`, async () => {
    const n = await page.locator('.universe-search-result').count();
    return n > 0 ? n : false;
  });
  await page.locator('.universe-search-result').first().click();
  await expect(`${width} map selection opens`, async () =>
    (await page.locator('.universe-selection').count()) === 1);
  const selectionHref = await page.locator('.universe-selection-link').getAttribute('href');
  check(
    `${width} map selection detail href`,
    selectionHref != null && new URL(selectionHref, BASE).pathname.includes('/universe/model/'),
    String(selectionHref),
  );
  await page.locator('.universe-selection-link').evaluate((element) => element.click());
  await page.waitForURL((url) => url.pathname.includes('/universe/model/'), { timeout: 30000 });
  await ready(page);
  check(`${width} selection detail route`, page.url().includes('/universe/model/'), page.url());
  await expect(`${width} detail persona`, async () =>
    (await page.locator('.universe-model-persona').count()) === 1);
  await expect(`${width} detail ability band`, async () =>
    (await page.locator('.universe-ability-band').count()) === 1);
  await page.screenshot({ path: `${OUT}/model-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/model-${width}.png`);

  await page.goto(BASE + '/universe/leaderboard/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(`${width} leaderboard tracks`, async () => {
    const n = width === 1440
      ? await page.locator('.universe-explorer button[aria-pressed]').count()
      : await page.locator('.universe-explorer select[aria-label="选择赛道"] option').count();
    return n > 5 ? n : false;
  });
  if (width === 1440) {
    await page.locator('.universe-explorer button[aria-pressed]:visible').nth(1).click();
  } else {
    await page.locator('.universe-explorer select[aria-label="选择赛道"]').selectOption({ index: 1 });
  }
  await expect(`${width} leaderboard URL track`, async () =>
    page.url().includes('track=') ? page.url() : false);
  await page.screenshot({ path: `${OUT}/leaderboard-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/leaderboard-${width}.png`);

  await page.goto(BASE + '/universe/models/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(`${width} all table rows`, async () => {
    const n = await page.locator('.universe-all-models-table tbody tr').count();
    return n > 20 ? n : false;
  });
  const firstRowName = page.locator('.universe-all-models-table tbody tr').first().locator('.universe-table-name');
  check(`${width} all table first model visible`, await firstRowName.isVisible());
  const firstRowNameBox = await firstRowName.boundingBox();
  check(
    `${width} all table first model inside viewport`,
    !!firstRowNameBox && firstRowNameBox.x >= 0 && firstRowNameBox.x + Math.min(firstRowNameBox.width, 80) <= width,
    JSON.stringify(firstRowNameBox),
  );
  await page.locator('.universe-all-models-table thead button').filter({ hasText: '综合智力' }).click();
  await expect(`${width} all table sort URL`, async () =>
    page.url().includes('sort=') ? page.url() : false);
  await page.screenshot({ path: `${OUT}/models-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/models-${width}.png`);

  await page.goto(BASE + '/universe/compare/?m=abacusai-dracarys-llama-3-1-70b-instruct,anthropic-claude-fable-5-1', { waitUntil: 'domcontentloaded' });
  await ready(page);
  // compare-data.json is fetched on the client, so allow it time to arrive.
  await expect(`${width} compare cards`, async () =>
    (await page.locator('.universe-compare-card').count()) === 2);
  await expect(`${width} compare loaded data`, async () =>
    (await page.locator('.universe-compare').getByText('正在载入模型数据').count()) === 0);
  await expect(`${width} compare celestial bodies`, async () =>
    (await page.locator('.universe-compare-card .universe-orb').count()) === 2);
  await page.screenshot({ path: `${OUT}/compare-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/compare-${width}.png`);

  await page.goto(BASE + '/universe/vendor/openai/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(`${width} vendor scene`, async () =>
    (await page.locator('.universe-scene').count()) === 1, { timeout: 40000 });
  await expect(`${width} vendor catalog`, async () =>
    (await page.locator('.universe-vendor-catalog').count()) === 1);
  await page.screenshot({ path: `${OUT}/vendor-${width}.png`, fullPage: true });
  report.screenshots.push(`${OUT}/vendor-${width}.png`);

  await page.goto(BASE + '/universe/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  const search = page.locator('.universe-global-search input');
  await search.fill('智谱 多模态');
  // The nav search fetches /search-index.json lazily, so on a remote host the
  // first keystroke can legitimately arrive before the index resolves.
  await expect(`${width} global search result`, async () => {
    const n = await page.locator('.universe-search-popover a').count();
    return n > 0 ? n : false;
  }, { timeout: 45000 });
  await page.screenshot({ path: `${OUT}/search-${width}.png`, fullPage: false });
  report.screenshots.push(`${OUT}/search-${width}.png`);
  await page.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const failed = report.checks.filter(c => !c.ok);
console.log(JSON.stringify({ checks: report.checks.length, failed, console: report.console, requestFailures: report.requestFailures, routes: report.routes }, null, 2));
process.exit(failed.length || report.console.length || report.requestFailures.length ? 1 : 0);
