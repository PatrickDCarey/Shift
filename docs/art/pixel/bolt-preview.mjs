// node preview.mjs -> docs/art/pixel/bolts-after.png (+ -grey) : every bolt kind, tail frames in four directions, at 6x
// over the world-tint backgrounds and the tiles a bolt can cross. Also prints the contrast table used in docs/art/kinetics.md.
import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const R = 'C:/dev/itch gam/', OUT = R + 'docs/art/pixel/';
const pal = JSON.parse(fs.readFileSync(R + 'src/data/palette.json', 'utf8'));
const kin = JSON.parse(fs.readFileSync(R + 'assets/art/pixel/pixel-kinetics.json', 'utf8')).frames;
const til = JSON.parse(fs.readFileSync(R + 'assets/art/pixel/pixel-tiles.json', 'utf8')).frames;
const b64 = (p) => fs.readFileSync(R + p).toString('base64');
const grey = process.argv.includes('--grey');
const name = grey ? 'bolts-after-grey.png' : 'bolts-after.png';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.setContent('<canvas id=c width=1200 height=800></canvas>');
const png = await page.evaluate(async ([kb, tb, kin, til, pal, grey]) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const [K, T] = await Promise.all([load(kb), load(tb)]);
  const c = document.getElementById('c'), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const S = 6, kinds = ['grey', 'white', 'blue', 'green', 'yellow', 'red'];
  const bgs = [['standing', '#070A18'], ['blue', '#07101F'], ['green', '#071811'], ['yellow', '#141304'], ['red', '#18070C']];
  const tiles = [['safe', 'tile/safe/m0/d0'], ['blue', 'tile/blue/solid/m4'], ['green', 'tile/green/solid/m4'], ['yellow', 'tile/yellow/solid/m4'], ['red', 'tile/red/solid/m4']];
  x.fillStyle = '#070A18'; x.fillRect(0, 0, 1200, 800);
  const spr = (img, f, dx, dy) => x.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, f.w * S, f.h * S);
  // rows: kind; columns: 5 backgrounds with the bolt flying right, then 5 tiles
  kinds.forEach((k, r) => {
    const y = 20 + r * 110, f = kin['bolt/' + k + '/r'].frame;
    bgs.forEach(([, col], i) => { x.fillStyle = col; x.fillRect(20 + i * 110, y, 100, 100); spr(K, f, 20 + i * 110 + 8, y + 20); });
    tiles.forEach(([, tn], i) => { const bx = 600 + i * 110; x.fillStyle = '#070A18'; x.fillRect(bx, y, 100, 100); const t = til[tn].frame; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) x.drawImage(T, t.x, t.y, t.w, t.h, bx + b * 48 + 2, y + a * 48 + 2, 48, 48); spr(K, f, bx + 8, y + 20); });
  });
  // directions strip (grey and red) at the bottom
  ['grey', 'white', 'red'].forEach((k, r) => ['l', 'r', 'u', 'd'].forEach((d, i) => spr(K, kin['bolt/' + k + '/' + d].frame, 20 + (r * 4 + i) * 95, 690)));
  if (grey) { const d = x.getImageData(0, 0, 1200, 800); for (let i = 0; i < d.data.length; i += 4) { const l = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2]; d.data[i] = d.data[i + 1] = d.data[i + 2] = l; } x.putImageData(d, 0, 0); }
  return c.toDataURL('image/png').split(',')[1];
}, [b64('assets/art/pixel/pixel-kinetics.png'), b64('assets/art/pixel/pixel-tiles.png'), kin, til, pal, grey]);
fs.writeFileSync(OUT + name, Buffer.from(png, 'base64'));
await browser.close();
console.log(name);
