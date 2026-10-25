import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4199';
const path = process.argv[3] || '/models/claude-fable-5/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(base + path, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(2000);
const result = await page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > w + 1 || r.width > w + 1) {
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        width: Math.round(r.width),
        right: Math.round(r.right),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  // walk the ancestor chain of the widest offender so we can see which box
  // actually establishes the overflow
  const worst = [...document.querySelectorAll('*')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .sort((a, b) => b.r.right - a.r.right)[0];
  const chain = [];
  let node = worst?.el;
  while (node && node !== document.documentElement.parentNode) {
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    chain.push({
      tag: node.tagName.toLowerCase(),
      cls: (node.className || '').toString().slice(0, 46),
      width: Math.round(r.width),
      scrollW: node.scrollWidth,
      overflowX: cs.overflowX,
      maxWidth: cs.maxWidth,
      minWd: cs.minWidth,
      pad: cs.paddingLeft + '/' + cs.paddingRight,
    });
    node = node.parentElement;
  }
  return { viewport: w, docScroll: document.documentElement.scrollWidth, bad: bad.slice(0, 6), chain };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
