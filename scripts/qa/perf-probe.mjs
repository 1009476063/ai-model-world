import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://127.0.0.1:4183').replace(/\/$/, '');
const path = process.argv[3] || '/universe/chronicle/';
const mob = process.argv[4] === 'mob';

const b = await chromium.launch();
const ctx = await b.newContext(
  mob
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 1000 } },
);
const pg = await ctx.newPage();
const cdp = await ctx.newCDPSession(pg);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

const t0 = Date.now();
let status = null;
try {
  const r = await pg.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  status = r && r.status();
} catch (e) {
  console.log('NAV-ERR', String(e).slice(0, 90));
}
const dclMs = Date.now() - t0;
let loadMs = null;
try {
  await pg.waitForLoadState('load', { timeout: 60000 });
  loadMs = Date.now() - t0;
} catch (e) {
  console.log('LOAD-ERR', String(e).slice(0, 90));
}

const info = await pg.evaluate(() => {
  let blur = 0, sat = 0, total = 0, backdrop = 0;
  for (const el of document.querySelectorAll('*')) {
    total++;
    const f = getComputedStyle(el).filter;
    if (f && f !== 'none') {
      if (f.includes('blur')) blur++;
      if (f.includes('saturate')) sat++;
    }
    const bf = getComputedStyle(el).backdropFilter;
    if (bf && bf !== 'none') backdrop++;
  }
  return {
    total, blur, sat, backdrop,
    orbs: document.querySelectorAll('.universe-orb').length,
    chronItems: document.querySelectorAll('.universe-chronicle-item').length,
    months: document.querySelectorAll('.universe-chronicle-month').length,
    docH: document.body.scrollHeight,
  };
});

await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(JSON.stringify({ mob, status, dclMs, loadMs, info }));
await b.close();
