import { chromium } from 'playwright';

const base = process.argv[2] || 'https://ai-guide-418.pages.dev';
const outDir = process.argv[3] || '/tmp/guide-live';
const { mkdirSync } = await import('node:fs');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const shots = [
  ['01-collection', '/models/', 1440],
  ['02-article-fable5', '/models/claude-fable-5/', 1440],
  ['03-mobile-article', '/models/claude-fable-5/', 390],
  ['04-mobile-collection', '/models/', 390],
];

for (const [name, path, width] of shots) {
  const page = await browser.newPage({
    viewport: { width, height: width === 390 ? 844 : 1000 },
    deviceScaleFactor: width === 390 ? 2 : 1,
  });
  await page.goto(base + path, { waitUntil: 'load', timeout: 90000 });
  // let images and the lazy-load plugin settle before capturing
  await page.evaluate(async () => {
    for (let y = 0; y < 3200; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
  const n = await page.evaluate(() => document.querySelectorAll('img').length);
  console.log(`${name} ${path} imgs=${n}`);
  await page.close();
}
await browser.close();
