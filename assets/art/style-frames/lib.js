/*
 * Style-frame generator, shared library: colour maths, pattern geometry (ported
 * from src/fx/patterns.ts), the shared scene, a 5x7 bitmap font. Browser JS,
 * loaded by render.html. Owner: art-director. Render-only mock-ups; nothing here
 * is used by the game.
 */
(function () {
  'use strict';
  const PAL = window.PAL;
  const L = (window.L = {});

  L.W = 960;
  L.H = 540;
  L.T = 32;
  L.COLS = 30;
  L.ROWS = 17;
  L.OY = -4; // camera offset: 17 rows * 32 = 544, the view is 540
  L.BANDS = ['white', 'blue', 'green', 'yellow', 'red'];
  L.BAND_SPEED = [0, 3, 6, 9, 12];
  L.TOP = 12;
  L.PX = 200; // player centre x
  L.FY = 12 * 32 + L.OY; // feet y (top of row 12)

  /* A condensed, faithful slice of levels/w0-02.txt: start floor, red bridge, safe
     pillar, yellow pad, and the blue bridge over the exit pocket under a low ceiling. */
  L.GRID = [
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '.....................#########',
    '.....................#########',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '##########RRRRR######.YYY#BBB#',
    '##########.....######....#...#',
    '##########.....######....#...#',
    '##########.....######....#.E.#',
    '##########.....######....#####',
  ];

  // ---- colour -------------------------------------------------------------
  L.hex = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  L.clamp = clamp;
  L.toHex = (c) =>
    '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  L.mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  L.css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const unlin = (v) => {
    v = clamp(v, 0, 1);
    return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  };
  L.lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  L.contrast = (a, b) => {
    const x = L.lum(a);
    const y = L.lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  L.withLum = (c, target) => {
    const l = L.lum(c);
    if (l <= 0) return c;
    const k = target / l;
    return c.map((v) => unlin(lin(v) * k));
  };
  L.sat = (c) => {
    const hi = Math.max(c[0], c[1], c[2]);
    return hi === 0 ? 0 : (hi - Math.min(c[0], c[1], c[2])) / hi;
  };
  const labF = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389) / 27 / 116 + 16 / 116);
  L.lab = (c) => {
    const r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
    const fx = labF(x / 0.95047), fy = labF(y), fz = labF(z / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  L.dE = (a, b) => {
    const p = L.lab(a), q = L.lab(b);
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  };
  const MACHADO = {
    protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
  };
  L.cvd = (c, type) => {
    const m = MACHADO[type];
    const v = [lin(c[0]), lin(c[1]), lin(c[2])];
    return m.map((row) => unlin(row[0] * v[0] + row[1] * v[1] + row[2] * v[2]));
  };
  L.CVD = ['protanopia', 'deuteranopia', 'tritanopia'];

  // ---- palette ------------------------------------------------------------
  L.BG = L.hex(PAL.background);
  L.G = L.BANDS.map((n) => {
    const g = PAL.gears[n];
    return {
      name: n,
      label: g.label,
      pattern: g.pattern,
      solid: { fill: L.hex(g.solid.fill), outline: L.hex(g.solid.outline), ink: L.hex(g.solid.ink) },
      ghost: { fill: L.hex(g.ghost.fill), outline: L.hex(g.ghost.outline), ink: L.hex(g.ghost.ink) },
    };
  });
  /* Proposed (not yet in palette.json): a lighter red ghost outline. #D02536 falls to 2.58:1
     against the background under protanopia (reds go dark) and 2.95:1 on the yellow-tinted
     background; #FF5A6A gives 4.77 and 3.87 while staying dimmer than the solid outline. */
  L.G[1].ghost.outline = L.hex('#5A93F5'); // blue: #3F73D0 is 2.94:1 under deuteranopia on tinted backgrounds
  L.G[1].ghost.ink = L.hex('#5A93F5');
  L.G[4].ghost.outline = L.hex('#FF5A6A');
  L.G[4].ghost.ink = L.hex('#FF5A6A');
  L.UI = {
    text: L.hex(PAL.ui.text),
    muted: L.hex(PAL.ui.textMuted),
    panel: L.hex(PAL.ui.panel),
    border: L.hex(PAL.ui.panelBorder),
  };
  /* Proposed (not yet in palette.json): safe fill darkened so a white exit frame
     reaches 4.5:1 against it, and a darker HUD panel so red HUD text stays >= 4.5:1. */
  L.SAFE = { fill: L.hex('#5F6987'), outline: L.hex('#D5DBEE') };
  L.PANEL = L.hex('#0F1220');
  L.WHITE = [255, 255, 255];

  const STOPS = PAL.tint.stops.map((s) => ({ t: s.t, c: L.hex(PAL.gears[s.gear].solid.fill) }));
  L.tintAt = (t) => {
    t = clamp(t, 0, 1);
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i].t) {
        const lo = STOPS[i - 1], hi = STOPS[i];
        return L.mix(lo.c, hi.c, (t - lo.t) / (hi.t - lo.t));
      }
    }
    return STOPS[STOPS.length - 1].c;
  };

  // ---- scene --------------------------------------------------------------
  L.VARIANTS = {
    white: { key: 'white', band: 0, gear: 2, speed: 0, label: 'STAND', time: '0:07.42' },
    blue: { key: 'blue', band: 1, gear: 1, speed: 3, label: 'WALK', time: '0:07.42' },
    green: { key: 'green', band: 2, gear: 2, speed: 6, label: 'JOG', time: '0:07.42' },
    yellow: { key: 'yellow', band: 3, gear: 3, speed: 9, label: 'RUN', time: '0:07.42' },
    red: { key: 'red', band: 4, gear: 4, speed: 12, label: 'SPRINT', time: '0:07.42' },
  };
  L.scene = (key) => {
    const v = L.VARIANTS[key];
    return Object.assign({}, v, { tn: v.speed / L.TOP, moving: v.speed > 0, scroll: 0 });
  };
  const SOLID_CH = { B: 1, G: 2, Y: 3, R: 4 };
  L.bandOfChar = (ch) => SOLID_CH[ch];
  L.isSolid = (ch, band) => ch === '#' || (SOLID_CH[ch] !== undefined && SOLID_CH[ch] === band);
  L.tileAt = (c, r) => (r < 0 || r >= L.ROWS || c < 0 || c >= L.COLS ? '.' : L.GRID[r][c]);
  L.nb = (c, r, ch) => ({
    u: L.tileAt(c, r - 1) === ch,
    d: L.tileAt(c, r + 1) === ch,
    l: L.tileAt(c - 1, r) === ch,
    r: L.tileAt(c + 1, r) === ch,
  });
  L.forTiles = (cb) => {
    for (let r = 0; r < L.ROWS; r++) {
      for (let c = 0; c < L.COLS; c++) {
        const ch = L.GRID[r][c];
        if (ch !== '.') cb(ch, c, r, c * L.T, r * L.T + L.OY);
      }
    }
  };
  L.rng = (seed) => {
    let s = seed >>> 0;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  };

  // ---- probes (pixel measurements taken from the final output) -------------
  L.probes = [];
  L.fg = (name, x, y, bx, by) => L.probes.push({ name, x, y, bx, by });

  // ---- pattern geometry (port of src/fx/patterns.ts) -----------------------
  const line = (x1, y1, x2, y2) => ({ kind: 'line', x1, y1, x2, y2 });
  function clip(l, size) {
    const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
    const p = [-dx, dx, -dy, dy];
    const q = [l.x1, size - l.x1, l.y1, size - l.y1];
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return null;
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
      }
    }
    return t0 > t1 ? null : line(l.x1 + t0 * dx, l.y1 + t0 * dy, l.x1 + t1 * dx, l.y1 + t1 * dy);
  }
  L.patternGeometry = (id, size, minStroke) => {
    const shapes = [];
    let sw = minStroke;
    if (id === 'stripes') {
      const n = size >= 24 ? 4 : 3;
      sw = Math.max(minStroke, size / 10);
      for (let i = 0; i < n; i++) shapes.push(line(size * 0.12, (size * (i + 0.5)) / n, size * 0.88, (size * (i + 0.5)) / n));
    } else if (id === 'dots') {
      const n = size >= 24 ? 3 : 2;
      const r = Math.max(minStroke * 0.8, size * (n === 3 ? 0.085 : 0.12));
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) shapes.push({ kind: 'dot', cx: (size * (b + 0.5)) / n, cy: (size * (a + 0.5)) / n, r });
    } else if (id === 'chevrons') {
      const rows = size >= 24 ? 3 : 2;
      sw = Math.max(minStroke, size / 14);
      for (let i = 0; i < rows; i++) {
        const yc = (size * (i + 0.5)) / rows, h = size * 0.11;
        shapes.push(line(size * 0.18, yc + h, size * 0.5, yc - h));
        shapes.push(line(size * 0.5, yc - h, size * 0.82, yc + h));
      }
    } else if (id === 'crosshatch') {
      const step = size >= 24 ? size / 3 : size / 2.5;
      sw = Math.max(minStroke * 0.75, size / 20);
      for (let k = -size; k <= size * 2; k += step) {
        for (const s of [clip(line(k, 0, k + size, size), size), clip(line(k, size, k + size, 0), size)]) {
          if (s && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= size * 0.12) shapes.push(s);
        }
      }
    }
    return { shapes, strokeWidth: sw };
  };

  /** Vector pattern into a size x size square at (x,y). */
  L.drawPattern = (ctx, id, x, y, size, ink, alpha, swScale) => {
    const g = L.patternGeometry(id, size, PAL.pattern.minStrokePx);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = g.strokeWidth * (swScale || 1);
    ctx.lineCap = 'butt';
    for (const s of g.shapes) {
      if (s.kind === 'line') {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  // ---- 5x7 bitmap font (own drawing, CC0) ----------------------------------
  const F = {
    A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.',
    C: '.####/#..../#..../#..../#..../#..../.####', D: '####./#...#/#...#/#...#/#...#/#...#/####.',
    E: '#####/#..../#..../####./#..../#..../#####', G: '.####/#..../#..../#..##/#...#/#...#/.###.',
    H: '#...#/#...#/#...#/#####/#...#/#...#/#...#', I: '#####/..#../..#../..#../..#../..#../#####',
    J: '..###/...#./...#./...#./...#./#..#./.##..', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    L: '#..../#..../#..../#..../#..../#..../#####', M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    P: '####./#...#/#...#/####./#..../#..../#....', R: '####./#...#/#...#/####./#.#../#..#./#...#',
    S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
    U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#', Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
    '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', '1': '..#../.##../..#../..#../..#../..#../.###.',
    '2': '.###./#...#/....#/...#./..#../.#.../#####', '3': '####./....#/....#/.###./....#/....#/####.',
    '4': '...#./..##./.#.#./#..#./#####/...#./...#.', '5': '#####/#..../####./....#/....#/#...#/.###.',
    '6': '.###./#..../#..../####./#...#/#...#/.###.', '7': '#####/....#/...#./..#../.#.../.#.../.#...',
    '8': '.###./#...#/#...#/.###./#...#/#...#/.###.', '9': '.###./#...#/#...#/.####/....#/....#/.###.',
    ':': '...../..#../..#../...../..#../..#../.....', '.': '...../...../...../...../...../..#../..#..',
    '-': '...../...../...../.###./...../...../.....', ' ': '...../...../...../...../...../...../.....',
    '>': '#..../.#.../..#../...#./..#../.#.../#....', '/': '....#/....#/...#./..#../.#.../#..../#....',
    '+': '...../..#../..#../#####/..#../..#../.....', '!': '..#../..#../..#../..#../..#../...../..#..',
    '%': '##..#/##..#/...#./..#../.#.../#..##/#..##', Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..', F: '#####/#..../#..../####./#..../#..../#....',
    Z: '#####/....#/...#./..#../.#.../#..../#####', '?': '.###./#...#/....#/...#./..#../...../..#..',
  };
  L.bitmapW = (s, scale) => (s.length * 6 - 1) * scale;
  L.bitmapText = (ctx, s, x, y, color, scale) => {
    ctx.fillStyle = color;
    let cx = x;
    for (const chRaw of s.toUpperCase()) {
      const rows = (F[chRaw] || F['?']).split('/');
      for (let j = 0; j < 7; j++) {
        for (let i = 0; i < 5; i++) {
          if (rows[j][i] === '#') ctx.fillRect(cx + i * scale, y + j * scale, scale, scale);
        }
      }
      cx += 6 * scale;
    }
  };

  /** HUD cell geometry shared by every direction: cells x/y/w/h relative to panel (220x64). */
  L.hudNeedleX = (speed) => clamp(speed / L.TOP, 0, 1);
})();
