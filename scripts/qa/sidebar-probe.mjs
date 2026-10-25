import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4210';
const page_ = process.argv[3] || '/models/claude-fable-5/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + page_, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(1200);
const links = await page.evaluate(() =>
  [...document.querySelectorAll('.sidebar-links a')].map((a) => ({ text: a.textContent.trim().slice(0, 34), href: a.getAttribute('href') })),
);
const groups = await page.evaluate(() =>
  [...document.querySelectorAll('.sidebar-group')].map((g) => ({
    title: g.querySelector('.sidebar-group-header')?.textContent.trim().slice(0, 20) || null,
    children: g.querySelectorAll('a').length,
  })),
);
console.log(JSON.stringify({ page: page_, groups, links }, null, 2));
await browser.close();
