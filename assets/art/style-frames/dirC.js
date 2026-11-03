/*
 * Direction C: Pixel Dither. A 480x270 low-res canvas scaled 2x with nearest
 * neighbour (16 px tiles, 12x24 player), ordered-dither backgrounds and glow,
 * hand-placed pixel patterns, dithered afterimages. Matches the game's existing
 * `pixelArt` config; in Phaser it is a 480x270 camera at zoom 2 or a 2x
 * integer-scaled game canvas. No shaders needed.
 */
(function () {
  'use strict';
  const L = window.L, css = L.css;
  const C = (window.DirC = { key: 'pixel', title: 'C  Pixel Dither' });
  const TL = 16, OYL = -2, PXL = 100, FYL = 12 * 16 + OYL;
  const CAP = 0.013;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[(x & 3) + ((y & 3) << 2)] / 16;
  let g;

  const field = (tn) => {
    const tint = L.tintAt(tn);
    return L.mix(L.BG, L.withLum(tint, CAP), 0.95 * L.sat(tint));
  };
  const rect = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };

  function background(S) {
    const tint = L.tintAt(S.tn), dark = L.withLum(tint, CAP), base = field(S.tn);
    const img = g.createImageData(480, 270), d = img.data;
    const k = S.tn > 0 ? 1 : 0.6;
    for (let y = 0; y < 270; y++) {
      const t = Math.min(1, Math.max(0, 1 - Math.abs(y - 175) / 120)) * k;
      for (let x = 0; x < 480; x++) {
        const c = bay(x, y) < t ? dark : base, i = (y * 480 + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const rnd = L.rng(5);
    g.fillStyle = css(L.mix(base, L.WHITE, 0.14));
    for (let i = 0; i < 46; i++) g.fillRect(Math.floor(rnd() * 480), Math.floor(rnd() * 130), 1, 1);
    // two parallax ridges, dithered top edge
    const layers = [[0.5, 168, 26, 0.013, 0.9], [0.85, 190, 18, 0.021, 1.7]];
    for (const [m, y0, amp, f, ph] of layers) {
      const col = css(L.mix(L.mix(base, [0, 0, 0], 0.7), L.mix(base, [0, 0, 0], 0.25), 1 - m));
      for (let x = 0; x < 480; x++) {
        const h = Math.round(y0 - amp * Math.abs(Math.sin(x * f * 2 + ph)) - amp * 0.5 * Math.abs(Math.sin(x * f * 5.3)));
        rect(x, h, 1, 200 - h, col);
        if (x % 2 === 0) rect(x, h - 1, 1, 1, col);
      }
    }
  }

  /** Whether pixel (i,j) of an w x h pattern cell is inked. */
  function on(id, i, j, w) {
    if (id === 'stripes') return j % 5 < 2;
    if (id === 'dots') return (i + 1) % 5 < 2 && (j + 1) % 5 < 2;
    if (id === 'chevrons') return (((j - Math.round(Math.abs(i - (w - 1) / 2))) % 4) + 4) % 4 === 0;
    if (id === 'crosshatch') return (i + j) % 5 === 0 || (((i - j) % 5) + 5) % 5 === 0;
    return false;
  }
  C.patternOn = on;
  C.field = field;

  function pix(id, x, y, w, h, col) {
    g.fillStyle = col;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (on(id, i, j, w)) g.fillRect(x + i, y + j, 1, 1);
  }

  function safeTile(c, r, x, y, nb) {
    const f = L.SAFE.fill;
    rect(x, y, TL, TL, css(f));
    if (r > 12) {
      g.fillStyle = css(L.mix(f, L.BG, 0.55));
      for (let j = 0; j < TL; j++) for (let i = 0; i < TL; i++) if (bay(x + i, y + j) < 0.14 * (r - 12)) g.fillRect(x + i, y + j, 1, 1);
    }
    g.fillStyle = css(L.mix(f, L.BG, 0.4));
    for (const [i, j] of [[2, 2], [TL - 3, 2], [2, TL - 3], [TL - 3, TL - 3]]) g.fillRect(x + i, y + j, 1, 1);
    if (!nb.u) rect(x, y + 1, TL, 1, css(L.mix(f, L.WHITE, 0.45)));
    g.fillStyle = css(L.SAFE.outline);
    if (!nb.u) g.fillRect(x, y, TL, 1);
    if (!nb.l) g.fillRect(x, y, 1, TL);
    if (!nb.r) g.fillRect(x + TL - 1, y, 1, TL);
    if (!nb.d) g.fillRect(x, y + TL - 1, TL, 1);
  }

  function solidTile(ch, x, y, nb, band) {
    const gr = L.G[band];
    rect(x, y, TL, TL, css(gr.solid.fill));
    rect(x, y + TL - 2, TL, 2, css(L.mix(gr.solid.fill, L.BG, 0.35)));
    pix(gr.pattern, x + 2, y + 4, 12, 10, css(L.mix(gr.solid.fill, gr.solid.ink, 0.8)));
    rect(x, y + 1, TL, 2, css(L.mix(gr.solid.fill, L.WHITE, 0.65))); // lit flat top edge
    rect(x, y + 3, TL, 1, css(L.mix(gr.solid.fill, L.BG, 0.25)));
    g.fillStyle = css(gr.solid.outline);
    if (!nb.u) g.fillRect(x, y, TL, 1);
    if (!nb.l) g.fillRect(x, y, 1, TL);
    if (!nb.r) g.fillRect(x + TL - 1, y, 1, TL);
    g.fillRect(x, y + TL - 1, TL, 1);
    if (nb.l) rect(x, y + 4, 1, TL - 5, css(L.mix(gr.solid.fill, L.BG, 0.45)));
  }

  function ghostTile(ch, c, x, y, band) {
    const gr = L.G[band];
    g.fillStyle = css(L.mix(L.BG, gr.solid.fill, 0.2));
    for (let j = 0; j < TL; j += 1) for (let i = 0; i < TL; i += 1) if (((i + j) & 3) === 0 && bay(i, j) < 0.5) g.fillRect(x + i, y + j, 1, 1);
    pix(gr.pattern, x + 2, y + 3, 12, 10, css(gr.ghost.ink));
    g.fillStyle = css(gr.ghost.outline);
    for (let i = 0; i < TL; i++) {
      const on = i % 5 < 3 || i < 3 || i > TL - 4; // 3 on, 2 off; corners always on
      if (on) {
        g.fillRect(x + i, y, 1, 1);
        g.fillRect(x + i, y + TL - 1, 1, 1);
        g.fillRect(x, y + i, 1, 1);
        g.fillRect(x + TL - 1, y + i, 1, 1);
      }
    }
    if ((ch === 'R' && c === 12) || (ch === 'Y' && c === 23) || (ch === 'B' && c === 27)) {
      L.fg('ghost-' + ch, (x + 1) * 2, y * 2, (x + 1) * 2, (y - 3) * 2);
    }
  }

  function exitDoor(x, y, t) {
    const cx = x + 8, cy = y + 9;
    const glow = L.mix(L.BG, L.WHITE, 0.5);
    g.fillStyle = css(glow);
    for (let j = -8; j <= 8; j++) {
      for (let i = -12; i <= 12; i++) {
        const dd = Math.hypot(i * 0.8, j) / (12 + 1.5 * t);
        if (dd < 1 && bay(cx + i, cy + j) < (1 - dd) * 1.15 && cy + j >= 214) g.fillRect(cx + i, cy + j, 1, 1);
      }
    }
    rect(x + 2, y + 1, 12, 15, '#FFFFFF');
    rect(x + 3, y, 10, 1, '#FFFFFF');
    rect(x + 4, y + 3, 8, 13, '#04050A');
    g.fillStyle = '#FFFFFF';
    for (const [i, j] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) g.fillRect(cx + i, cy + j + 1, 1, 1);
    L.fg('exit-frame', (x + 2) * 2, (y + 8) * 2, (x - 1) * 2, (y + 8) * 2);
  }

  function player(S) {
    const gr = L.G[S.band], tn = S.tn;
    const bc = document.createElement('canvas');
    bc.width = 16;
    bc.height = 24;
    const b = bc.getContext('2d');
    b.fillStyle = css(L.BG); // keyline
    b.fillRect(1, 0, 14, 24);
    b.fillStyle = css(gr.solid.outline);
    b.fillRect(2, 0, 12, 24);
    b.fillStyle = css(gr.solid.fill);
    b.fillRect(3, 1, 10, 22);
    const sv = g;
    g = b;
    pix(gr.pattern, 3, 8, 10, 15, css(L.mix(gr.solid.fill, gr.solid.ink, 0.85)));
    g = sv;
    b.fillStyle = S.band === 0 ? css(L.BG) : '#FFFFFF'; // visor
    b.fillRect(7, 3, 6, 3);
    b.fillStyle = S.band === 0 ? '#FFFFFF' : css(L.BG);
    b.fillRect(11, 4, 2, 1);
    const lean = [Math.round(2 * tn), Math.round(1 * tn), 0];
    for (let s = 0; s < 3; s++) g.drawImage(bc, 0, s * 8, 16, 8, PXL - 8 + lean[s], FYL - 24 + s * 8, 16, 8);
  }

  function afterimages(S) {
    if (S.tn <= 0) return;
    [0.5, 0.25, 0.125].forEach((thr, i) => {
      const k = i + 1, x = PXL - 6 - 10 * k, y = FYL - 24;
      g.fillStyle = css(L.tintAt(S.tn - 0.14 * k));
      for (let j = 0; j < 24; j++) for (let ii = 0; ii < 12; ii++) if (bay(x + ii, y + j) < thr) g.fillRect(x + ii, y + j, 1, 1);
    });
    const rnd = L.rng(3), col = css(L.mix(L.tintAt(S.tn), L.WHITE, 0.45));
    const n = Math.round(4 + 10 * S.tn);
    for (let i = 0; i < n; i++) { // dithered speed lines
      const y = FYL - 3 - Math.floor(rnd() * 56), len = 16 + Math.floor(rnd() * 70 * S.tn), x1 = PXL - 24 - Math.floor(rnd() * 30);
      g.fillStyle = col;
      for (let x = x1 - len; x < x1; x++) if (bay(x, y) < 0.25 + 0.9 * ((x - (x1 - len)) / len)) g.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 12; i++) { // dust
      const d = rnd(), x = PXL - 9 - Math.floor(d * (10 + 50 * S.tn)), y = FYL - 1 - Math.floor(rnd() * (2 + 8 * d));
      g.fillStyle = col;
      g.fillRect(x, y, rnd() < 0.3 ? 2 : 1, rnd() < 0.3 ? 2 : 1);
    }
  }

  const MINI = { 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.', 4: '#.#/#.#/###/..#/..#' };
  function mini(ch, x, y, col) {
    g.fillStyle = col;
    const rows = MINI[ch].split('/');
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (rows[j][i] === '#') g.fillRect(x + i, y + j, 1, 1);
  }

  function panel(x, y, w, h, tint) {
    rect(x, y, w, h, css(L.mix(L.UI.border, tint, 0.35)));
    rect(x + 1, y + 1, w - 2, h - 2, css(L.PANEL));
  }

  function hud(S) {
    const gr = L.G[S.band], tint = L.tintAt(S.tn);
    panel(5, 5, 110, 32, tint);
    L.bitmapText(g, 'GEAR ' + S.gear, 10, 7, css(L.UI.text), 1);
    L.bitmapText(g, S.label, 5 + 110 - 5 - L.bitmapW(S.label, 1), 7, css(gr.solid.outline), 1);
    for (let i = 0; i < 5; i++) {
      const cg = L.G[i], x = 11 + i * 20, y = 17;
      if (i === S.band) {
        rect(x, y, 18, 10, css(cg.solid.fill));
        pix(cg.pattern, x + 3, y + 2, 12, 8, css(L.mix(cg.solid.fill, cg.solid.ink, 0.85)));
        rect(x, y, 18, 1, css(L.mix(cg.solid.fill, L.WHITE, 0.6)));
      } else {
        g.fillStyle = css(cg.ghost.outline);
        for (let k = 0; k < 18; k++) if (k % 4 < 2) { g.fillRect(x + k, y, 1, 1); g.fillRect(x + k, y + 9, 1, 1); }
        for (let k = 0; k < 10; k++) if (k % 4 < 2) { g.fillRect(x, y + k, 1, 1); g.fillRect(x + 17, y + k, 1, 1); }
        pix(cg.pattern, x + 3, y + 2, 12, 6, css(cg.ghost.ink));
      }
      if (i > 0) mini(String(i), x + 7, 28, css(i === S.gear ? L.UI.text : L.UI.muted));
      if (i === S.gear) { // bracket
        g.fillStyle = '#FFFFFF';
        const bx = x - 2, by = y - 2, bw = 22, bh = 14;
        for (const [ax, ay, dx, dy] of [[bx, by, 1, 1], [bx + bw - 1, by, -1, 1], [bx, by + bh - 1, 1, -1], [bx + bw - 1, by + bh - 1, -1, -1]]) {
          for (let k = 0; k < 4; k++) { g.fillRect(ax + dx * k, ay, 1, 1); g.fillRect(ax, ay + dy * k, 1, 1); }
        }
      }
    }
    const nx = 11 + 9 + Math.round((S.speed / 3) * 20);
    rect(nx - 1, 34, 3, 1, css(L.UI.text));
    rect(nx, 35, 1, 1, css(L.UI.text));
    panel(419, 5, 56, 13, tint);
    L.bitmapText(g, S.time, 423, 8, css(L.UI.text), 1);
  }

  C.render = (out, S) => {
    const lo = document.createElement('canvas');
    lo.width = 480;
    lo.height = 270;
    g = lo.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    background(S);
    const solids = [];
    L.forTiles((ch, c, r, x0, y0) => {
      const x = c * TL, y = r * TL + OYL;
      if (ch === '#' || ch === 'E') return;
      if (L.isSolid(ch, S.band)) solids.push([ch, c, r, x, y]);
      else ghostTile(ch, c, x, y, L.bandOfChar(ch));
    });
    L.forTiles((ch, c, r) => { if (ch === '#') safeTile(c, r, c * TL, r * TL + OYL, L.nb(c, r, '#')); });
    for (const [ch, c, r, x, y] of solids) solidTile(ch, x, y, L.nb(c, r, ch), L.bandOfChar(ch));
    L.forTiles((ch, c, r) => { if (ch === 'E') exitDoor(c * TL, r * TL + OYL, 1); });
    afterimages(S);
    player(S);
    hud(S);
    out.imageSmoothingEnabled = false;
    out.drawImage(lo, 0, 0, 960, 540);
  };
})();
