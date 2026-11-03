/*
 * Direction A: Neon Vector. Near-black field, glowing slabs with a lit flat top
 * edge, hollow dashed ghosts with no glow, comet trail that shifts back through
 * the earlier band colours, additive bloom. Canvas 2D mock of what a Phaser
 * Graphics + glow/bloom postFX build would produce.
 */
(function () {
  'use strict';
  const L = window.L, T = L.T;
  const A = (window.DirA = { key: 'neon', title: 'A  Neon Vector' });
  const css = L.css;
  const CAP = 0.013; // max relative luminance of any background decor
  const MONO = '700 12px Consolas, "Cascadia Mono", "Courier New", monospace';

  const field = (tn) => {
    const tint = L.tintAt(tn);
    return L.mix(L.BG, L.withLum(tint, CAP), 0.95 * L.sat(tint));
  };
  A.field = field;

  function background(ctx, S) {
    const tint = L.tintAt(S.tn), dark = L.withLum(tint, CAP), base = field(S.tn);
    ctx.fillStyle = css(base);
    ctx.fillRect(0, 0, L.W, L.H);
    const aura = ctx.createRadialGradient(L.PX + 160, 330, 10, L.PX + 160, 330, 520);
    aura.addColorStop(0, css(L.mix(base, dark, S.tn > 0 ? 1 : 0.5), 0.9));
    aura.addColorStop(1, css(base, 0));
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, L.W, L.H);
    // far ridge (wireframe skyline)
    ctx.fillStyle = css(L.mix(base, dark, 0.45));
    ctx.beginPath();
    ctx.moveTo(0, 400);
    for (let x = 0; x <= L.W; x += 24) {
      const y = 318 - 34 * Math.abs(Math.sin(x * 0.011 + 1)) - 22 * Math.abs(Math.sin(x * 0.027));
      ctx.lineTo(x, Math.round(y));
    }
    ctx.lineTo(L.W, 400);
    ctx.fill();
    ctx.strokeStyle = css(dark, 1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= L.W; x += 24) {
      const y = 318 - 34 * Math.abs(Math.sin(x * 0.011 + 1)) - 22 * Math.abs(Math.sin(x * 0.027));
      if (x === 0) ctx.moveTo(x, Math.round(y) + 0.5);
      else ctx.lineTo(x, Math.round(y) + 0.5);
    }
    ctx.stroke();
    // grid
    ctx.strokeStyle = css(L.mix(base, dark, 0.85));
    ctx.beginPath();
    for (let x = 17 - (S.scroll % 64); x < L.W; x += 64) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, L.H);
    }
    for (let y = 21; y < L.H; y += 64) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(L.W, y + 0.5);
    }
    ctx.stroke();
  }

  function streaks(ctx, S) {
    if (S.tn <= 0) return;
    const rnd = L.rng(7);
    const col = L.mix(L.tintAt(S.tn), L.WHITE, 0.35);
    const n = Math.round(5 + 11 * S.tn);
    for (let i = 0; i < n; i++) {
      const y = Math.round(L.FY - 6 - rnd() * 118);
      const len = 40 + rnd() * 240 * S.tn;
      const x1 = L.PX - 34 - rnd() * 90;
      const g = ctx.createLinearGradient(x1 - len, 0, x1, 0);
      g.addColorStop(0, css(col, 0));
      g.addColorStop(1, css(col, 0.4 + 0.3 * rnd()));
      ctx.fillStyle = g;
      ctx.fillRect(x1 - len, y, len, 1);
    }
  }

  function safeTile(ctx, c, r, x, y, nb) {
    const f = L.SAFE.fill;
    ctx.fillStyle = css(f);
    ctx.fillRect(x, y, T, T);
    if (r > 12) {
      ctx.fillStyle = css(L.BG, 0.17 * (r - 12));
      ctx.fillRect(x, y, T, T);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    if (nb.l) ctx.fillRect(x, y, 1, T);
    if (nb.u) ctx.fillRect(x, y, T, 1);
    ctx.fillStyle = css(L.mix(f, L.WHITE, 0.4));
    if (!nb.u) ctx.fillRect(x, y, T, 4);
    ctx.fillStyle = css(L.SAFE.outline);
    if (!nb.u) ctx.fillRect(x, y, T, 2);
    if (!nb.l) ctx.fillRect(x, y, 2, T);
    if (!nb.r) ctx.fillRect(x + T - 2, y, 2, T);
    if (!nb.d) ctx.fillRect(x, y + T - 2, T, 2);
  }

  function solidTile(ctx, ch, x, y, nb, band) {
    const g = L.G[band];
    ctx.fillStyle = css(g.solid.fill);
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = css(L.mix(g.solid.fill, L.BG, 0.3)); // shaded underside
    ctx.fillRect(x, y + T - 3, T, 3);
    L.drawPattern(ctx, g.pattern, x + 3, y + 5, 26, css(g.solid.ink), 0.75, 1);
    ctx.fillStyle = css(L.mix(g.solid.fill, L.WHITE, 0.62)); // lit flat top edge (the ledge cue)
    ctx.fillRect(x, y, T, 4);
    ctx.fillStyle = css(g.solid.outline);
    if (!nb.u) ctx.fillRect(x, y, T, 2);
    if (!nb.l) ctx.fillRect(x, y, 2, T);
    if (!nb.r) ctx.fillRect(x + T - 2, y, 2, T);
    ctx.fillRect(x, y + T - 2, T, 2);
    ctx.fillStyle = css(L.BG, 0.55); // seam
    if (nb.l) ctx.fillRect(x, y + 4, 1, T - 6);
  }

  function ghostTile(ctx, ch, c, x, y, band) {
    const g = L.G[band];
    ctx.fillStyle = css(g.ghost.fill, 0.12);
    ctx.fillRect(x, y, T, T);
    L.drawPattern(ctx, g.pattern, x + 3, y + 3, 26, css(g.ghost.ink), 0.9, 0.85);
    ctx.save();
    ctx.strokeStyle = css(g.ghost.outline);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 2, y + 2, T - 4, T - 4);
    ctx.setLineDash([]);
    for (const [ax, ay, dx, dy] of [[x + 2, y + 2, 1, 1], [x + T - 2, y + 2, -1, 1], [x + 2, y + T - 2, 1, -1], [x + T - 2, y + T - 2, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(ax + dx * 6, ay);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax, ay + dy * 6);
      ctx.stroke();
    }
    ctx.restore();
    if ((ch === 'R' && c === 12) || (ch === 'Y' && c === 23) || (ch === 'B' && c === 27)) {
      L.fg('ghost-' + ch, x + 12, y + 1, x + 12, y - 5); // pixel inside a dash on the top edge
    }
  }

  function exitDoor(ctx, x, y, t) {
    const cx = x + 16, pulse = 0.5 + 0.5 * Math.sin(t);
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 16 + 6 * pulse;
    ctx.fillStyle = '#FFFFFF';
    arch(ctx, x + 5, y, 22, 32, 11);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#04050A';
    arch(ctx, x + 8, y + 3, 16, 29, 8);
    ctx.fill();
    const core = ctx.createRadialGradient(cx, y + 20, 1, cx, y + 20, 13);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.55, `rgba(255,255,255,${0.35 + 0.25 * pulse})`);
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(x + 8, y + 3, 16, 29);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, y + 20, 5 + 3 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    L.fg('exit-frame', x + 6, y + 22, x - 3, y + 22);
  }
  function arch(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + w / 2, y + r, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  function beacon(ctx, x, y) {
    const g = ctx.createLinearGradient(0, y + 32, 0, y - 150);
    g.addColorStop(0, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 32);
    ctx.lineTo(x - 6, y - 150);
    ctx.lineTo(x + 38, y - 150);
    ctx.lineTo(x + 28, y + 32);
    ctx.fill();
  }

  function trail(ctx, S) {
    if (S.tn <= 0) return;
    const len = 30 + 230 * Math.pow(S.tn, 1.2);
    const xb = L.PX - 13, y0 = L.FY;
    const g = ctx.createLinearGradient(xb - len, 0, xb, 0);
    g.addColorStop(0, css(L.tintAt(S.tn - 0.5), 0));
    g.addColorStop(0.35, css(L.tintAt(S.tn - 0.38), 0.35));
    g.addColorStop(0.7, css(L.tintAt(S.tn - 0.14), 0.55));
    g.addColorStop(1, css(L.tintAt(S.tn), 0.55));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(xb, y0 - 46);
    ctx.lineTo(xb - len, y0 - 27);
    ctx.lineTo(xb - len, y0 - 21);
    ctx.lineTo(xb, y0 - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    for (let k = 1; k <= 3; k++) { // afterimages in earlier band colours
      const s = Math.pow(0.94, k);
      ctx.strokeStyle = css(L.tintAt(S.tn - 0.16 * k), 0.55 / k);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(L.PX - 12 * s - 30 * k, y0 - 48 * s, 24 * s, 48 * s);
    }
  }

  function player(ctx, S) {
    const g = L.G[S.band], tn = S.tn;
    ctx.save();
    ctx.translate(L.PX, L.FY);
    ctx.transform(1 + 0.08 * tn, 0, -0.09 * tn, 1 - 0.04 * tn, 0, 0);
    ctx.shadowColor = css(g.solid.fill, 0.95);
    ctx.shadowBlur = 26;
    ctx.fillStyle = css(g.solid.fill);
    ctx.fillRect(-12, -48, 24, 48);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = css(L.BG); // keyline separates body from a same-coloured floor
    ctx.lineWidth = 2;
    ctx.strokeRect(-13, -49, 26, 50);
    ctx.fillStyle = css(g.solid.fill);
    ctx.fillRect(-12, -48, 24, 48);
    L.drawPattern(ctx, g.pattern, -12, -48, 24, css(g.solid.ink), 0.8, 1);
    L.drawPattern(ctx, g.pattern, -12, -24, 24, css(g.solid.ink), 0.8, 1);
    ctx.fillStyle = css(g.solid.outline);
    ctx.fillRect(-12, -48, 24, 2);
    ctx.fillRect(-12, -48, 2, 48);
    ctx.fillRect(10, -48, 2, 48);
    ctx.fillRect(-12, -2, 24, 2);
    ctx.shadowColor = css(g.solid.fill, 1);
    ctx.shadowBlur = 10;
    ctx.fillStyle = S.band === 0 ? css(L.BG) : '#FFFFFF'; // visor on the leading side
    ctx.fillRect(-2, -42, 12, 5);
    ctx.restore();
    const refl = ctx.createRadialGradient(L.PX, L.FY, 1, L.PX, L.FY, 46);
    refl.addColorStop(0, css(g.solid.fill, 0.45));
    refl.addColorStop(1, css(g.solid.fill, 0));
    ctx.save();
    ctx.translate(0, L.FY);
    ctx.scale(1, 0.12);
    ctx.translate(0, -L.FY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = refl;
    ctx.fillRect(L.PX - 50, L.FY - 50, 100, 100);
    ctx.restore();
  }

  function particles(ctx, S) {
    if (S.tn <= 0) return;
    const rnd = L.rng(21), col = L.mix(L.tintAt(S.tn), L.WHITE, 0.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.round(6 + 18 * S.tn);
    for (let i = 0; i < n; i++) {
      const d = rnd();
      const x = L.PX - 16 - d * (40 + 170 * S.tn), y = L.FY - 2 - rnd() * (4 + 26 * d);
      const s = rnd() < 0.3 ? 3 : 2;
      ctx.fillStyle = css(col, 0.9 * (1 - d));
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
    ctx.restore();
  }

  function hud(ctx, S) {
    const x0 = 10, y0 = 10, tint = L.tintAt(S.tn), g = L.G[S.band];
    ctx.save();
    ctx.shadowColor = css(tint, 0.45);
    ctx.shadowBlur = 14;
    ctx.fillStyle = css(L.PANEL, 0.96);
    ctx.beginPath();
    ctx.roundRect(x0, y0, 220, 64, 6);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = css(L.mix(L.UI.border, tint, 0.4));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x0 + 0.75, y0 + 0.75, 218.5, 62.5, 6);
    ctx.stroke();
    ctx.font = MONO;
    ctx.letterSpacing = '1px';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = css(L.UI.text);
    ctx.textAlign = 'left';
    ctx.fillText('GEAR ' + S.gear, x0 + 10, y0 + 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = css(g.solid.outline);
    ctx.fillText(S.label, x0 + 210, y0 + 16);
    ctx.textAlign = 'left';
    for (let i = 0; i < 5; i++) {
      const cg = L.G[i], x = x0 + 10 + i * 41, y = y0 + 22, lit = i === S.band;
      ctx.save();
      if (lit) {
        ctx.shadowColor = css(cg.solid.fill, 0.9);
        ctx.shadowBlur = 10;
        ctx.fillStyle = css(cg.solid.fill);
        ctx.fillRect(x, y, 36, 20);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, 36, 20);
        ctx.clip();
        L.drawPattern(ctx, cg.pattern, x + 8, y - 1, 20, css(cg.solid.ink), 0.8, 1);
        ctx.fillStyle = css(cg.solid.outline);
        ctx.fillRect(x, y, 36, 2);
        ctx.restore();
      } else {
        ctx.restore();
        ctx.fillStyle = css(cg.ghost.fill, 0.1);
        ctx.fillRect(x, y, 36, 20);
        L.drawPattern(ctx, cg.pattern, x + 8, y - 1, 20, css(cg.ghost.ink), 0.55, 0.8);
        ctx.strokeStyle = css(cg.ghost.outline, 0.85);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, 35, 19);
      }
      ctx.font = '700 10px Consolas, monospace';
      ctx.letterSpacing = '0px';
      ctx.textAlign = 'center';
      ctx.fillStyle = css(i === S.gear ? L.UI.text : L.UI.muted);
      if (i > 0) ctx.fillText(String(i), x + 18, y + 31);
      if (i === S.gear) bracket(ctx, x - 3, y - 3, 42, 26);
    }
    const nx = x0 + 10 + 18 + (S.speed / 3) * 41;
    ctx.fillStyle = css(L.UI.text);
    ctx.beginPath();
    ctx.moveTo(nx, y0 + 55);
    ctx.lineTo(nx - 4, y0 + 61);
    ctx.lineTo(nx + 4, y0 + 61);
    ctx.fill();
    ctx.textAlign = 'left';
    // timer
    ctx.fillStyle = css(L.PANEL, 0.96);
    ctx.beginPath();
    ctx.roundRect(838, 10, 112, 30, 6);
    ctx.fill();
    ctx.strokeStyle = css(L.UI.border);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(838.75, 10.75, 110.5, 28.5, 6);
    ctx.stroke();
    ctx.font = '700 16px Consolas, "Cascadia Mono", monospace';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = css(L.UI.text);
    ctx.fillText(S.time, 850, 31);
  }
  function bracket(ctx, x, y, w, h) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    const a = 8;
    ctx.beginPath();
    ctx.moveTo(x, y + a); ctx.lineTo(x, y); ctx.lineTo(x + a, y);
    ctx.moveTo(x + w - a, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + a);
    ctx.moveTo(x + w, y + h - a); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - a, y + h);
    ctx.moveTo(x + a, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - a);
    ctx.stroke();
  }

  A.render = (ctx, S) => {
    background(ctx, S);
    streaks(ctx, S);
    const solids = [];
    L.forTiles((ch, c, r, x, y) => {
      if (ch === '#' || ch === 'E') return;
      const band = L.bandOfChar(ch);
      if (L.isSolid(ch, S.band)) solids.push([ch, c, r, x, y]);
      else ghostTile(ctx, ch, c, x, y, band);
    });
    // glow underlays for solid colour tiles and the safe blocks
    ctx.save();
    for (const [ch, , , x, y] of solids) {
      ctx.shadowColor = css(L.G[L.bandOfChar(ch)].solid.fill, 0.85);
      ctx.shadowBlur = 22;
      ctx.fillStyle = css(L.G[L.bandOfChar(ch)].solid.fill);
      ctx.fillRect(x, y, T, T);
    }
    ctx.shadowColor = 'rgba(190,200,235,0.35)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = css(L.SAFE.fill);
    L.forTiles((ch, c, r, x, y) => { if (ch === '#' && !L.nb(c, r, '#').u) ctx.fillRect(x, y, T, T); });
    ctx.restore();
    L.forTiles((ch, c, r, x, y) => { if (ch === '#') safeTile(ctx, c, r, x, y, L.nb(c, r, '#')); });
    for (const [ch, c, r, x, y] of solids) solidTile(ctx, ch, x, y, L.nb(c, r, ch), L.bandOfChar(ch));
    trail(ctx, S);
    player(ctx, S);
    particles(ctx, S);
    // bloom, vignette, then HUD (text stays crisp)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(12px)';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
    const v = ctx.createRadialGradient(480, 280, 330, 480, 280, 640);
    v.addColorStop(0, css(L.BG, 0));
    v.addColorStop(1, css(L.BG, 0.4));
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, L.W, L.H);
    L.forTiles((ch, c, r, x, y) => { if (ch === 'E') { beacon(ctx, x, y); exitDoor(ctx, x, y, 1.1); } });
    hud(ctx, S);
  };
  A.exposed = { arch, bracket };
})();
