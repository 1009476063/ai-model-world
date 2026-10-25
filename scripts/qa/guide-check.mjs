import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4199';
const browser = await chromium.launch();
const out = { console: [], failedRequests: [], pages: [] };

async function check(name, path, expect) {
  const ctx = await browser.newContext({
    viewport: name.includes('m390') ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    deviceScaleFactor: name.includes('m390') ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && out.console.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e) => out.console.push(`${name}: PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => {
    const t = r.failure()?.errorText || '';
    if (t !== 'net::ERR_ABORTED') out.failedRequests.push(`${name}: ${r.url()} ${t}`);
  });
  const res = await page.goto(base + path, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      title: document.title,
      // `python3 -m http.server` answers 200 with a directory listing when the
      // artifact has no index.html, so status alone proves nothing about the
      // build. Catch that here instead of trusting the code.
      directoryListing: /Directory listing/i.test(document.title) || document.body?.children?.length === 0,
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) || null,
      images: imgs.length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      upstreamImgs: imgs.filter((i) => /yupi\.icu|codefather/.test(i.currentSrc || i.src)).length,
      r2Imgs: imgs.filter((i) => /r2\.dev/.test(i.currentSrc || i.src)).length,
      sidebarLinks: document.querySelectorAll('.sidebar-links a').length,
    // sibling-article navigation specifically: a sidebar that fell back to
    // "auto" still has links (the page's own headings), so count the ones that
    // point at another article
    siblingLinks: new Set(
      [...document.querySelectorAll('.sidebar-links a')]
        .map((a) => (a.getAttribute('href') || '').split('#')[0])
        .filter((h) => h.startsWith('/models/')),
    ).size,
      overflowX: overflow,
      bodyPx: getComputedStyle(document.body).fontSize,
    };
  });
  const o = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  out.pages.push({ name, path, status: res?.status(), ...info, overflow: o });
  if (expect?.shot) await page.screenshot({ path: expect.shot, fullPage: false });
  await ctx.close();
}

await check('home', '/', { shot: '/tmp/g-home.png' });
await check('collection', '/models/', { shot: '/tmp/g-collection.png' });
await check('article', '/models/claude-fable-5/', { shot: '/tmp/g-article.png' });
await check('article-m390', '/models/claude-fable-5/', { shot: '/tmp/g-article-m.png' });
await check('mimo', '/models/xiaomi-mimo/');

await browser.close();
/*
 * Articles must offer a way to reach the other articles. The default theme
 * silently renders the current page's headings when the sidebar config fails to
 * match, which still "passes" every other assertion, so sibling count is checked
 * here rather than left to the eye.
 */
const MIN_SIBLINGS = 15;
const bad = out.pages.filter((p) => {
  if (p.status !== 200) return true;
  if (p.directoryListing) return true;
  if (p.broken > 0 || p.upstreamImgs > 0) return true;
  if (p.h1 === null || p.overflowX) return true;
  if (p.name.startsWith('article') && p.siblingLinks < MIN_SIBLINGS) return true;
  return false;
});
console.log(JSON.stringify({ pages: out.pages, console: out.console.slice(0, 8), failedRequests: out.failedRequests.slice(0, 8), bad }, null, 2));
process.exit(bad.length || out.console.length || out.failedRequests.length ? 1 : 0);
