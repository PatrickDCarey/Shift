// node overlays.mjs -> release/trailer/overlays/*.png (+ end-card.mp4): only the game's own pixel font, palette and sprites.
import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const R = 'C:/dev/itch gam/', OUT = R + 'release/trailer/overlays/';
fs.mkdirSync(OUT, { recursive: true });
const b64 = (p) => fs.readFileSync(R + p).toString('base64');
const assets = {
  font: b64('assets/art/pixel/pixel-font.png'), xml: fs.readFileSync(R + 'assets/art/pixel/pixel-font.xml', 'utf8'),
  tiles: b64('assets/art/pixel/pixel-tiles.png'), tilesJ: fs.readFileSync(R + 'assets/art/pixel/pixel-tiles.json', 'utf8'),
  player: b64('assets/art/pixel/pixel-player.png'), playerJ: fs.readFileSync(R + 'assets/art/pixel/pixel-player.json', 'utf8'),
  scen: b64('assets/art/pixel/pixel-scenery.png'), scenJ: fs.readFileSync(R + 'assets/art/pixel/pixel-scenery.json', 'utf8'),
  palette: fs.readFileSync(R + 'src/data/palette.json', 'utf8'),
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.setContent('<canvas id=c width=1920 height=1080></canvas>');
await page.evaluate(async (A) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const W = (window.W = {});
  W.pal = JSON.parse(A.palette);
  [W.font, W.tiles, W.player, W.scen] = await Promise.all([load(A.font), load(A.tiles), load(A.player), load(A.scen)]);
  W.tilesJ = JSON.parse(A.tilesJ).frames; W.playerJ = JSON.parse(A.playerJ).frames; W.scenJ = JSON.parse(A.scenJ).frames;
  W.chars = {};
  for (const m of A.xml.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"[^>]*xadvance="(\d+)"/g)) W.chars[+m[1]] = { x: +m[2], y: +m[3], w: +m[4], h: +m[5], a: +m[6] };
  const tint = (col) => { const o = document.createElement('canvas'); o.width = W.font.width; o.height = W.font.height; const q = o.getContext('2d'); q.drawImage(W.font, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, o.width, o.height); return o; };
  const cache = {};
  W.textW = (t, k) => [...t].reduce((a, ch) => a + (W.chars[ch.codePointAt(0)] ? W.chars[ch.codePointAt(0)].a : 6) * k, 0) - k;
  W.text = (x, t, col, px, py, k) => {
    const src = cache[col] || (cache[col] = tint(col)); let cx = px;
    for (const ch of t) { const g = W.chars[ch.codePointAt(0)]; if (!g) continue; if (g.w) x.drawImage(src, g.x, g.y, g.w, g.h, cx, py, g.w * k, g.h * k); cx += g.a * k; }
  };
  W.tintSprite = (x, sheet, J, name, dx, dy, k, col) => { const f = J[name].frame, o = document.createElement('canvas'); o.width = f.w; o.height = f.h; const q = o.getContext('2d'); q.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, f.w, f.h); x.drawImage(o, 0, 0, f.w, f.h, dx, dy, f.w * k, f.h * k); };
  W.sprite = (x, sheet, J, name, dx, dy, k) => { const f = J[name].frame; x.drawImage(sheet, f.x, f.y, f.w, f.h, dx, dy, f.w * k, f.h * k); };
  const g = W.pal.gears; W.gearCol = ['white', 'blue', 'green', 'yellow', 'red'].map((n) => g[n].solid.fill);
}, assets);

const shot = async (name, fn, args = {}) => {
  const url = await page.evaluate(([fn, args]) => {
    const c = document.getElementById('c'); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 1920, 1080);
    (0, eval)(fn)(x, args); return c.toDataURL('image/png').split(',')[1];
  }, [fn, args]);
  fs.writeFileSync(OUT + name, Buffer.from(url, 'base64'));
};

// Key cap (6 canvas px per font px). Lower centre, clear of the HUD (top-left) and the runner.
const keycap = `(x, a) => {
  const k = 6, label = '\\u21E7 SHIFT', tw = W.textW(label, k), pad = 4 * k, bw = tw + 2 * pad, bh = 7 * k + 2 * pad, lip = 2 * k;
  const bx = Math.round((1920 - bw) / 2), by = 800 + (a.down ? lip : 0);
  const body = (ox, oy, w, h, fill, line) => {
    x.fillStyle = line; x.fillRect(ox + k, oy, w - 2 * k, h); x.fillRect(ox, oy + k, w, h - 2 * k);
    x.fillStyle = fill; x.fillRect(ox + k, oy + k, w - 2 * k, h - 2 * k);
  };
  if (!a.down) { x.fillStyle = W.pal.ui.panelBorder; x.fillRect(bx + k, by + bh - k, bw - 2 * k, lip + k); x.fillRect(bx, by + bh - 2 * k, bw, 2 * k); }
  body(bx, by, bw, bh, a.down ? W.pal.gears.white.solid.fill : W.pal.ui.panel, a.down ? '#FFFFFF' : '#D5DBEE');
  W.text(x, label, a.down ? W.pal.gears.white.solid.ink : W.pal.ui.text, bx + pad, by + pad, k);
}`;
await shot('key-shift-up.png', keycap, { down: false });
await shot('key-shift-pressed.png', keycap, { down: true });

// Caption plates (4 canvas px per font px), one line, dark translucent plate with a 1 grid px border.
const caption = `(x, a) => {
  const k = 8, tw = W.textW(a.t, k), pad = 3 * k, bw = tw + 2 * pad, bh = 7 * k + 2 * pad, bx = Math.round((1920 - bw) / 2), by = 1080 - 72 - bh;
  x.fillStyle = 'rgba(7,10,24,0.82)'; x.fillRect(bx, by, bw, bh);
  x.fillStyle = W.pal.ui.panelBorder; x.fillRect(bx, by, bw, k); x.fillRect(bx, by + bh - k, bw, k); x.fillRect(bx, by, k, bh); x.fillRect(bx + bw - k, by, k, bh);
  W.text(x, a.t, W.pal.ui.text, bx + pad, by + pad, k);
}`;
const caps = { 'caption-your-speed-is-your-colour': 'YOUR SPEED IS YOUR COLOUR', 'caption-only-your-colour-is-solid': 'ONLY YOUR COLOUR IS SOLID', 'caption-platforms-move': 'PLATFORMS MOVE', 'caption-bolts-hit-their-own-colour': 'BOLTS HIT THEIR OWN COLOUR', 'caption-checkpoints': 'CHECKPOINTS' };
for (const [f, t] of Object.entries(caps)) await shot(f + '.png', caption, { t });

// End card on the 480x270 grid drawn at 4x. step null = still (every gear solid, red shadow); 0..4 = animation (that gear lit, the rest ghost).
const endcard = `(x, a) => {
  const K = 4, gears = ['white', 'blue', 'green', 'yellow', 'red'];
  x.fillStyle = W.pal.background; x.fillRect(0, 0, 1920, 1080);
  W.tintSprite(x, W.scen, W.scenJ, 'bg/stars', 0, 0, K, '#B8C4F0'); W.tintSprite(x, W.scen, W.scenJ, 'bg/ridge_far', 0, 182 * K, K, '#0E1430'); W.tintSprite(x, W.scen, W.scenJ, 'bg/ridge_near', 0, 214 * K, K, '#0B1024');
  const lit = a.step === null ? 4 : a.step;
  const T = 'REDSHIFT', tk = 24, tw = W.textW(T, tk), tx = Math.round((1920 - tw) / 2), ty = 96;
  W.text(x, T, W.gearCol[lit], tx + 12, ty + 12, tk); W.text(x, T, '#F2F4FF', tx, ty, tk);
  const gx0 = 88, gap = 16;
  gears.forEach((g, i) => {
    const on = a.step === null || i === lit, x0 = (gx0 + i * (48 + gap)) * K, yT = 124 * K;
    const tile = g === 'white' ? 'tile/safe/m0/d0' : 'tile/' + g + '/' + (on ? 'solid/m4' : 'ghost');
    for (let t = 0; t < 3; t++) W.sprite(x, W.tiles, W.tilesJ, tile, x0 + t * 16 * K, yT, K);
    W.sprite(x, W.player, W.playerJ, 'player/runner/' + g + '/idle_0', x0 + 14 * K, yT - 28 * K, K);
  });
  const line = (t, col, k, y) => W.text(x, t, col, Math.round((1920 - W.textW(t, k)) / 2), y, k);
  line('Your speed is your colour.', W.pal.ui.text, 8, 640); line('Only your colour is solid.', W.pal.ui.text, 8, 720);
  line('GitHub Game Off 2026', W.pal.ui.textMuted, 4, 850);
  line('Play free on itch.io', '#FFD60A', 8, 920);
}`;
await shot('end-card.png', endcard, { step: null });
fs.rmSync(OUT + 'frames', { recursive: true, force: true }); fs.mkdirSync(OUT + 'frames');
for (let f = 0; f < 180; f++) await shot('frames/' + String(f).padStart(4, '0') + '.png', endcard, { step: Math.min(4, Math.floor(f / 30)) });
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', OUT + 'frames/%04d.png', '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '60', OUT + 'end-card.mp4']);
fs.rmSync(OUT + 'frames', { recursive: true, force: true });
console.log(fs.readdirSync(OUT).join(' '));
