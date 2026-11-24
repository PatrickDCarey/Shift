// Expansion shots: node exp.mjs <level> <kineticStep> <out.png> [speed]
import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
const [level, n, out, speed = '1'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.addInitScript(() => { const real = window.requestAnimationFrame.bind(window); window.__frozen = false; window.requestAnimationFrame = (cb) => real((t) => { if (!window.__frozen) cb(t); else real(() => window.requestAnimationFrame(cb)); }); });
await page.goto(`http://localhost:5185/?level=${level}&replay=1&speed=${speed}`);
await page.waitForFunction((n) => window.__redshift && (window.__redshift.kineticStep >= n) && (window.__frozen = true), +n, { polling: 'raf', timeout: 90000 });
await page.screenshot({ path: out });
console.log(level, await page.evaluate(() => window.__redshift.kineticStep), errs);
await browser.close();
