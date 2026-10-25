import { chromium } from 'playwright';
// The reported symptom: universe chronicle freezes on mobile, legacy timeline is fine.
// Compare both under 20x CPU throttle at a phone viewport + dpr3 (close to a real mid phone).
const base = process.argv[2];
const b = await chromium.launch();
for (const [label, path] of [['UNIVERSE', '/universe/chronicle/'], ['LEGACY', '/chronicle/']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  const t0 = Date.now();
  let note = '';
  try {
    await pg.goto(base + path, { waitUntil: 'load', timeout: 120000 });
  } catch (e) { note = 'NAV-TIMEOUT/ERR ' + String(e).slice(0, 60); }
  const loadMs = Date.now() - t0;
  // can the main thread still do work? scroll and read back paint
  let inter = 'n/a';
  try {
    inter = await pg.evaluate(async () => {
      const t = performance.now();
      window.scrollTo(0, 6000);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return Math.round(performance.now() - t);
    });
  } catch (e) { inter = 'BLOCKED ' + String(e).slice(0, 50); }
  console.log(label, JSON.stringify({ loadMs, scrollResponseMs: inter, note }));
  if (label === 'UNIVERSE') await pg.screenshot({ path: '/tmp/chronicle-mobile.png' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await ctx.close();
}
await b.close();
