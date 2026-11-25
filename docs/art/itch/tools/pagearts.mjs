// node pagearts.mjs  -> docs/art/itch/{cover-630x500-a,b,c,banner-960x240,background-tile}.png
// Composed only from assets/art/pixel/*, src/data/palette.json and the game's font. No dev server, no AI imagery.
// Everything is drawn at integer scales with smoothing off. Needs the repo's Playwright (Chromium).
import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const R = 'C:/dev/itch gam/', OUT = R + 'docs/art/itch/';
const b64 = (p) => fs.readFileSync(R + p).toString('base64');
const rd = (p) => fs.readFileSync(R + p, 'utf8');
const A = {
  font: b64('assets/art/pixel/pixel-font.png'), xml: rd('assets/art/pixel/pixel-font.xml'),
  sheets: Object.fromEntries(['tiles', 'player', 'scenery', 'kinetics', 'fx'].map((n) => [n, { png: b64(`assets/art/pixel/pixel-${n}.png`), json: rd(`assets/art/pixel/pixel-${n}.json`) }])),
  palette: rd('src/data/palette.json'),
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(async (A) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const W = (window.W = {}); W.pal = JSON.parse(A.palette); W.font = await load(A.font);
  W.fr = {};
  for (const [n, s] of Object.entries(A.sheets)) { const img = await load(s.png); for (const [k, v] of Object.entries(JSON.parse(s.json).frames)) W.fr[k] = { img, ...v.frame }; }
  W.chars = {};
  for (const m of A.xml.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"[^>]*xadvance="(\d+)"/g)) W.chars[+m[1]] = { x: +m[2], y: +m[3], w: +m[4], h: +m[5], a: +m[6] };
  W.G = ['white', 'blue', 'green', 'yellow', 'red']; W.col = W.G.map((n) => W.pal.gears[n].solid.fill);
  const tc = {}; const tint = (col) => tc[col] || (tc[col] = (() => { const o = document.createElement('canvas'); o.width = W.font.width; o.height = W.font.height; const q = o.getContext('2d'); q.drawImage(W.font, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, o.width, o.height); return o; })());
  W.tw = (t, k) => [...t].reduce((a, ch) => a + (W.chars[ch.codePointAt(0)] ? W.chars[ch.codePointAt(0)].a : 6) * k, 0) - k;
  W.text = (x, t, col, px, py, k) => { const s = tint(col); let cx = px; for (const ch of t) { const g = W.chars[ch.codePointAt(0)]; if (!g) continue; if (g.w) x.drawImage(s, g.x, g.y, g.w, g.h, cx, py, g.w * k, g.h * k); cx += g.a * k; } };
  // sprite at integer scale k; optional alpha; optional flip; optional tint colour (silhouette)
  W.spr = (x, n, dx, dy, k, o = {}) => { const f = W.fr[n]; if (!f) throw new Error('no frame ' + n); x.save(); x.globalAlpha = o.a ?? 1; x.imageSmoothingEnabled = false;
    if (o.flip) { x.translate(dx + f.w * k, dy); x.scale(-1, 1); x.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w * k, f.h * k); } else x.drawImage(f.img, f.x, f.y, f.w, f.h, dx, dy, f.w * k, f.h * k); x.restore(); };
  W.tint = (x, n, dx, dy, k, col, a = 1) => { const f = W.fr[n], o = document.createElement('canvas'); o.width = f.w; o.height = f.h; const q = o.getContext('2d'); q.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, f.w, f.h); x.save(); x.globalAlpha = a; x.drawImage(o, 0, 0, f.w, f.h, dx, dy, f.w * k, f.h * k); x.restore(); };
  W.title = (x, w, y, k, shadowCol) => { const T = 'REDSHIFT', tx = Math.round((w - W.tw(T, k)) / 2); const sd = Math.max(1, Math.round(k * 0.75)); W.text(x, T, shadowCol, tx + sd, y + sd, k); W.text(x, T, '#F2F4FF', tx, y, k); return tx; };
  W.sky = (x, w, h, ridge) => { x.fillStyle = W.pal.background; x.fillRect(0, 0, w, h);
    for (let ox = 0; ox < w; ox += 960) W.tint(x, 'bg/stars', ox, 0, 2, '#B8C4F0');
    if (ridge) { for (let ox = 0; ox < w; ox += 960) { W.tint(x, 'bg/ridge_far', ox, h - 88 * 2 - ridge, 2, '#0E1430'); W.tint(x, 'bg/ridge_near', ox, h - 56 * 2 - ridge, 2, '#0B1024'); } } };
  // a tile for a gear index (0 white .. 4 red); solid or ghost
  W.tile = (g, ghost) => g === 0 ? 'tile/safe/m0/d0' : 'tile/' + W.G[g] + '/' + (ghost ? 'ghost' : 'solid/m4');
  W.slab = (x, g, ghost, n, dx, dy, k) => { const s = ghost ? 'ghost' : 'solid', c = g === 0 ? 'safe' : W.G[g]; for (let i = 0; i < n; i++) W.spr(x, `slab/${c}/${s}/${n === 1 ? 'S' : i === 0 ? 'L' : i === n - 1 ? 'R' : 'M'}`, dx + i * 16 * k, dy, k); };
  W.track = (x, dx, dy, n, k) => { for (let i = 0; i < n; i++) W.spr(x, 'track/h', dx + i * 16 * k, dy, k, { a: 0.9 }); };
  W.dark = (x, dx, dy, w, h, a) => { x.fillStyle = `rgba(7,10,24,${a})`; x.fillRect(dx, dy, w, h); };
}, A);

const scenes = {
  // A "trail": one red runner, white > blue > green > yellow > red trail, each on its own patterned block; slab and bolt above.
  a(x, w, h) {
    W.sky(x, w, h, 0); const K = 7, T = 16 * K, gy = h - T;
    W.title(x, w, 24, 11, '#F5283C');
    W.track(x, 8, 134, 14, 3); W.slab(x, 2, false, 4, 250, 120, 3); W.spr(x, 'bolt/yellow', 26, 116, 6);
    for (let c = 0; c * T < w; c++) W.spr(x, W.tile(Math.min(4, c), false), c * T, gy, K);
    for (let i = 0; i < 5; i++) W.spr(x, `player/runner/${W.G[i]}/sprint_${[1, 3, 5, 2, 4][i]}`, 14 + T * i, gy - 28 * K + 14, K, { a: 1 });
  },
  // B "arc": a jump across a moving green slab, five colours along the arc (pace sets colour), exit door beyond, red bolt overhead.
  b(x, w, h) {
    W.sky(x, w, h, 0); const K = 5, T = 80, gy = 420;
    W.title(x, w, 24, 11, '#F5283C');
    for (let c = 0; c < 2; c++) W.spr(x, W.tile(0), c * T, gy, K);
    for (let c = 5; c < 8; c++) W.spr(x, W.tile(4), c * T, gy, K);
    W.track(x, 160, gy + 24, 3, 5); W.slab(x, 2, false, 3, 160, gy, 5);
    W.dark(x, 0, gy + T, w, 100, 0.0);
    W.spr(x, 'tile/exit/door_2', 520, gy - T, K);
    W.spr(x, 'emitter/r/red/idle', 550, 128, 5); W.spr(x, 'bolt/red', 470, 148, 5); W.spr(x, 'bolt/red', 400, 148, 5, { a: 0.4 });
    const pos = [[6, gy - 126, 'idle_0'], [108, gy - 215, 'jump_0'], [212, gy - 262, 'jump_1'], [316, gy - 215, 'fall_0'], [420, gy - 126, 'sprint_2']];
    pos.forEach(([px, py, f], i) => W.spr(x, `player/runner/${W.G[i]}/${f}`, px, py, 5, { a: 1 }));
  },
  // C "chase": the sweep's saw-toothed front behind a yellow runner; solid yellow underfoot, hollow red and blue ahead, lit checkpoint post.
  c(x, w, h) {
    W.sky(x, w, h, 0); const K = 5, T = 80, gy = 400;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) W.spr(x, 'sweep/fill/' + ((r + c) % 4), c * T, 132 + r * T, K);
    W.dark(x, 0, 132, 240, h, 0.5);
    for (let r = 0; r < 5; r++) W.spr(x, 'sweep/edge/' + (r % 3), 2 * T, 132 + r * T, K);
    W.title(x, w, 24, 11, '#F5283C');
    const row = [[3, false], [3, false], [3, false], [2, false], [3, false], [4, true], [1, true], [4, true]];
    for (let c = 3; c < 8; c++) { const [g, gh] = [[0, 0], [0, 0], [0, 0], [2, false], [3, false], [4, true], [1, true], [4, true]][c]; W.spr(x, W.tile(g, gh), c * T, gy, K); W.spr(x, W.tile(g, gh), c * T, gy + T, K, { a: 0.5 }); }
    W.spr(x, 'checkpoint/lit', 3 * T + 4, gy - 24 * 5, K);
    W.spr(x, 'player/runner/yellow/sprint_3', 4 * T + 22, gy - 28 * K + 14, K);
    for (let s = 0; s < 3; s++) W.spr(x, `fx/speed/${[12, 20, 32][s]}_a`, 3 * T - 40 - s * 10, gy - 50 - s * 40, K, { a: 0.4 });
  },
  banner(x, w, h) {
    W.sky(x, w, h, 0); const K = 4, T = 64;
    const k = 9, tw = W.tw('REDSHIFT', k), tx = 44; W.text(x, 'REDSHIFT', '#F5283C', tx + 7, 58, k); W.text(x, 'REDSHIFT', '#F2F4FF', tx, 51, k);
    W.text(x, 'Your speed is your colour.', W.pal.ui.text, tx, 141, 3); W.text(x, 'Only your colour is solid.', W.pal.ui.text, tx, 171, 3);
    const x0 = 560;
    for (let i = 0; i < 5; i++) { const bx = x0 + i * 80; W.spr(x, W.tile(i), bx, 176, K); W.spr(x, `player/runner/${W.G[i]}/idle_0`, bx - 8, 176 - 28 * K + 4, K); }
  },
  bg(x, w, h) { // seamless: every star is a whole 2x2 square well inside the tile, so repeating shows no seam
    x.fillStyle = W.pal.background; x.fillRect(0, 0, w, h);
    let s = 20261125; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const cols = ['#1A2142', '#1A2142', '#222B52', '#222B52', '#2C3763', '#38456E'];
    for (let i = 0; i < 46; i++) { const px = 4 + Math.floor(rnd() * (w - 10)), py = 4 + Math.floor(rnd() * (h - 10)), c = cols[Math.floor(rnd() * cols.length)], z = rnd() < 0.8 ? 2 : 4; x.fillStyle = c; x.fillRect(px - (px % 2), py - (py % 2), z === 4 ? 2 : 2, z === 4 ? 4 : 2); }
  },
};
const shot = async (file, w, h, fnName) => {
  const src = scenes[fnName].toString().replace(/^(\w+)\(/, 'function(');
  const url = await page.evaluate(([w, h, src]) => {
    const c = document.getElementById('c'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, w, h);
    (0, eval)('(' + src + ')')(x, w, h); return c.toDataURL('image/png').split(',')[1];
  }, [w, h, src]);
  fs.writeFileSync(OUT + file, Buffer.from(url, 'base64'));
};
const want = (process.argv[2] || 'a,b,c,banner,bg').split(',');
for (const k of want) {
  if (k === 'banner') await shot('banner-960x240.png', 960, 240, k);
  else if (k === 'bg') await shot('background-tile.png', 256, 256, k);
  else await shot(`cover-630x500-${k}.png`, 630, 500, k);
}
await browser.close();
