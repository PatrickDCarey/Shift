/*
 * Entry points called by gen.mjs through Playwright: renderFrame, paceSheet,
 * cvdSheet, mechanics. Pixel measurements are taken from the final canvas.
 */
(function () {
  'use strict';
  const L = window.L;
  const dirs = { neon: window.DirA, poster: window.DirB, pixel: window.DirC };
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d', { willReadFrequently: true });

  function reset(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.filter = 'none';
    c.globalCompositeOperation = 'source-over';
    c.setLineDash([]);
    c.shadowBlur = 0;
    c.shadowColor = 'rgba(0,0,0,0)';
    c.letterSpacing = '0px';
    c.textAlign = 'left';
    c.clearRect(0, 0, 960, 540);
  }
  const px = (x, y) => {
    const d = ctx.getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  function patch(x, y, w, h) {
    const d = ctx.getImageData(x, y, w, h).data;
    const n = w * h;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    return [r / n, g / n, b / n];
  }

  function frame(dk, key) {
    reset(ctx);
    L.probes.length = 0;
    dirs[dk].render(ctx, L.scene(key));
  }

  window.renderFrame = (dk, key) => {
    frame(dk, key);
    const probes = L.probes.map((p) => {
      const fg = px(p.x, p.y), bg = px(p.bx, p.by);
      const out = { name: p.name, fg: L.toHex(fg), bg: L.toHex(bg), ratio: +L.contrast(fg, bg).toFixed(2) };
      if (p.name === 'exit-frame') out.vsSafeFill = +L.contrast(fg, L.SAFE.fill).toFixed(2);
      out.cvd = {};
      for (const t of L.CVD) out.cvd[t] = +L.contrast(L.cvd(fg, t), L.cvd(bg, t)).toFixed(2);
      return out;
    });
    const a = patch(870, 120, 40, 40), b = patch(20, 150, 40, 40);
    const tint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    return { probes, tint, url: cv.toDataURL('image/png') };
  };

  window.paceSheet = (dk) => {
    const sheet = document.createElement('canvas');
    sheet.width = 1440;
    sheet.height = 540;
    const sc = sheet.getContext('2d');
    sc.fillStyle = '#000';
    sc.fillRect(0, 0, 1440, 540);
    sc.imageSmoothingQuality = 'high';
    ['white', 'blue', 'green', 'yellow', 'red'].forEach((k, i) => {
      frame(dk, k);
      sc.drawImage(cv, (i % 3) * 480, Math.floor(i / 3) * 270, 480, 270);
    });
    // sixth cell: legend of the pace to tint mapping
    sc.fillStyle = '#0B0D14';
    sc.fillRect(960, 270, 480, 270);
    ['white', 'blue', 'green', 'yellow', 'red'].forEach((k, i) => {
      sc.fillStyle = L.css(L.tintAt(i / 4));
      sc.fillRect(990 + i * 82, 300, 74, 14);
    });
    L.bitmapText(sc, dk === 'neon' ? 'A NEON VECTOR' : dk === 'poster' ? 'B POSTER' : 'C PIXEL', 990, 340, '#E8ECF8', 3);
    L.bitmapText(sc, 'STAND 3 6 9 12 TILES/S', 990, 376, '#A3AECB', 2);
    return sheet.toDataURL('image/png');
  };

  window.cvdSheet = (dk, key) => {
    frame(dk, key);
    const sheet = document.createElement('canvas');
    sheet.width = 960;
    sheet.height = 540;
    const sc = sheet.getContext('2d', { willReadFrequently: true });
    const types = ['normal'].concat(L.CVD);
    types.forEach((t, i) => {
      const x = (i % 2) * 480, y = Math.floor(i / 2) * 270;
      sc.imageSmoothingQuality = 'high';
      sc.drawImage(cv, x, y, 480, 270);
      if (t !== 'normal') {
        const img = sc.getImageData(x, y, 480, 270);
        const d = img.data;
        for (let p = 0; p < d.length; p += 4) {
          const o = L.cvd([d[p], d[p + 1], d[p + 2]], t);
          d[p] = o[0]; d[p + 1] = o[1]; d[p + 2] = o[2];
        }
        sc.putImageData(img, x, y);
      }
      L.bitmapText(sc, t.toUpperCase(), x + 12, y + 246, '#FFFFFF', 2);
    });
    return sheet.toDataURL('image/png');
  };

  window.mechanics = (dk) => {
    reset(ctx);
    window.Mech.render(ctx, dk);
    return cv.toDataURL('image/png');
  };

  /** Ink coverage and pairwise difference of the pixel patterns (direction C). */
  window.pixelPatternStats = () => {
    const ids = ['plain', 'stripes', 'dots', 'chevrons', 'crosshatch'];
    const out = {};
    for (const [label, w, h] of [['tile 12x10', 12, 10], ['body cell 10x15', 10, 15], ['hud 12x8', 12, 8]]) {
      const grids = ids.map((id) => {
        const a = [];
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a.push(window.DirC.patternOn(id, i, j, w) ? 1 : 0);
        return a;
      });
      const cov = {};
      ids.forEach((id, k) => (cov[id] = +((100 * grids[k].reduce((s, v) => s + v, 0)) / (w * h)).toFixed(1)));
      let minDiff = 100, pair = '';
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        let d = 0;
        for (let k = 0; k < w * h; k++) if (grids[a][k] !== grids[b][k]) d++;
        const pct = (100 * d) / (w * h);
        if (pct < minDiff) { minDiff = pct; pair = ids[a] + '/' + ids[b]; }
      }
      out[label] = { coverage: cov, minPairDiff: +minDiff.toFixed(1), pair };
    }
    return out;
  };

  window.fieldOf = (dk, tn) => dirs[dk].field(tn);
  window.ready = true;
})();
