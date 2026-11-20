import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const R = 'C:/dev/itch gam/';
const b64 = (p) => fs.readFileSync(p).toString('base64');
const frame = b64(process.argv[2]);
const font = b64(R + 'assets/art/pixel/pixel-font.png');
const xml = fs.readFileSync(R + 'assets/art/pixel/pixel-font.xml', 'utf8');
const out = process.argv[3];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 700, height: 600 } });
await page.setContent('<canvas id=c width=630 height=500></canvas>');
const png = await page.evaluate(async ({ frame, font, xml }) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const [fi, gi] = await Promise.all([load(frame), load(font)]);
  const c = document.getElementById('c'), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  // sky colour sampled from the frame just above the hanging block
  const t = document.createElement('canvas'); t.width = 960; t.height = 540; const tx = t.getContext('2d'); tx.drawImage(fi, 0, 0);
  const d = tx.getImageData(300, 66, 1, 1).data; // inside field near block top? use a field pixel
  const sky = tx.getImageData(240, 64, 1, 1).data;
  x.fillStyle = `rgb(${sky[0]},${sky[1]},${sky[2]})`; x.fillRect(0, 0, 630, 500);
  x.drawImage(fi, 236, 62, 630, 416, 0, 84, 630, 416);
  // title from the bitmap font, k = 8 px per font pixel
  const chars = {}; for (const m of xml.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"[^>]*xadvance="(\d+)"/g)) chars[+m[1]] = { x: +m[2], y: +m[3], w: +m[4], h: +m[5], a: +m[6] };
  const text = 'REDSHIFT', k = 8, w = text.length * 6 * k - k, x0 = Math.round((630 - w) / 2), y0 = 14;
  const tint = (col) => { const o = document.createElement('canvas'); o.width = 97; o.height = 73; const q = o.getContext('2d'); q.drawImage(gi, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, 97, 73); return o; };
  const red = tint('#F5283C'), wh = tint('#F2F4FF');
  for (const [src, dx, dy] of [[red, k, k], [wh, 0, 0]]) {
    let cx = x0; for (const ch of text) { const g = chars[ch.charCodeAt(0)]; x.drawImage(src, g.x, g.y, g.w, g.h, cx + dx, y0 + dy, g.w * k, g.h * k); cx += g.a * k; }
  }
  return c.toDataURL('image/png').split(',')[1];
}, { frame, font, xml });
fs.writeFileSync(out, Buffer.from(png, 'base64'));
await browser.close();
