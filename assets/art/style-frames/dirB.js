/*
 * Direction B: Flat Poster. Flat colour fields, thick ink outlines with a thin
 * light sticker rim, hard offset shadows, halftone dots, flat speed bars and
 * stepped afterimages. No glow, no post-processing: Graphics only.
 */
(function () {
  'use strict';
  const L = window.L, T = L.T, css = L.css;
  const B = (window.DirB = { key: 'poster', title: 'B  Flat Poster' });
  const INK = L.hex('#07080D');
  const HEAVY = '900 13px "Arial Black", Impact, "Segoe UI Black", sans-serif';

  const shape = (tn, k) => {
    const tint = L.tintAt(tn);
    return L.withLum(L.sat(tint) > 0.2 ? tint : [150, 160, 200], k);
  };
  const baseField = (tn) => {
    const tint = L.tintAt(tn);
    return L.mix(L.BG, L.withLum(tint, 0.013), 0.95 * L.sat(tint));
  };
  B.field = baseField;

  function background(ctx, S) {
    const base = baseField(S.tn);
    ctx.fillStyle = css(base);
    ctx.fillRect(0, 0, L.W, L.H);
    // sun disc
    ctx.fillStyle = css(shape(S.tn, 0.03));
    ctx.beginPath();
    ctx.arc(735, 150, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(shape(S.tn, 0.021));
    ctx.beginPath();
    ctx.arc(735, 150, 78, 0, Math.PI * 2);
    ctx.fill();
    // slanted speed bands, more and wider as pace rises
    const n = 2 + Math.round(3 * S.tn);
    for (let i = 0; i < n; i++) {
      const y0 = 190 + i * 62 - (n - 2) * 20, h = 26 + 14 * ((i * 7) % 3), w = 300 + 90 * S.tn + ((i * 53) % 120);
      const x0 = 40 + ((i * 197) % 520) + 70 * S.tn;
      ctx.fillStyle = css(shape(S.tn, i % 2 ? 0.019 : 0.024));
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + w, y0);
      ctx.lineTo(x0 + w - 90, y0 + h);
      ctx.lineTo(x0 - 90, y0 + h);
      ctx.fill();
    }
    // halftone fade on the trailing side
    ctx.fillStyle = css(shape(S.tn, 0.03));
    for (let y = 120; y < 372; y += 12) {
      for (let x = 6 + ((y / 12) % 2) * 6; x < 360; x += 12) {
        const r = 4.2 * (1 - x / 360) * (S.tn > 0 ? 0.6 + S.tn * 0.5 : 0.5);
        if (r < 0.8) continue;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function parallelogram(ctx, x, y, w, h, slant) {
    ctx.beginPath();
    ctx.moveTo(x + slant, y);
    ctx.lineTo(x + w + slant, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function rim(ctx, x, y, nb, colour, out, inw, ink) {
    ctx.fillStyle = css(colour);
    if (!nb.u) ctx.fillRect(x - (nb.l ? 0 : out), y - out, T + (nb.l ? 0 : out) + (nb.r ? 0 : out), out);
    if (!nb.d) ctx.fillRect(x - (nb.l ? 0 : out), y + T, T + (nb.l ? 0 : out) + (nb.r ? 0 : out), out);
    if (!nb.l) ctx.fillRect(x - out, y, out, T);
    if (!nb.r) ctx.fillRect(x + T, y, out, T);
    ctx.fillStyle = css(ink);
    if (!nb.u) ctx.fillRect(x, y, T, inw);
    if (!nb.d) ctx.fillRect(x, y + T - inw, T, inw);
    if (!nb.l) ctx.fillRect(x, y, inw, T);
    if (!nb.r) ctx.fillRect(x + T - inw, y, inw, T);
  }

  function safeTile(ctx, c, r, x, y, nb) {
    const f = L.SAFE.fill;
    ctx.fillStyle = css(f);
    ctx.fillRect(x, y, T, T);
    if (r >= 14) { // halftone shading toward the bottom of big masses
      ctx.fillStyle = css(L.mix(f, L.BG, 0.45));
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + 4 + i * 8 + (j % 2) * 4, y + 4 + j * 8, 1.4 + (r - 14) * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!nb.u) {
      ctx.fillStyle = css(L.mix(f, L.WHITE, 0.4));
      ctx.fillRect(x, y, T, 7);
    }
    rim(ctx, x, y, nb, L.SAFE.outline, 2, 3, INK);
  }

  function solidTile(ctx, ch, x, y, nb, band) {
    const g = L.G[band];
    ctx.fillStyle = css(g.solid.fill);
    ctx.fillRect(x, y, T, T);
    L.drawPattern(ctx, g.pattern, x + 5, y + 9, 22, css(g.solid.ink), 0.9, 1.2);
    ctx.fillStyle = css(L.mix(g.solid.fill, L.WHITE, 0.55)); // flat lit lip: reads as a ledge
    ctx.fillRect(x, y, T, 6);
    ctx.fillStyle = css(INK);
    ctx.fillRect(x, y + 6, T, 2);
    rim(ctx, x, y, nb, g.solid.outline, 2, 3, INK);
    if (nb.l) { ctx.fillStyle = css(INK); ctx.fillRect(x, y, 2, T); }
  }

  function ghostTile(ctx, ch, c, x, y, band) {
    const g = L.G[band], col = css(band === 4 ? g.ghost.outline : g.solid.fill);
    L.drawPattern(ctx, g.pattern, x + 5, y + 5, 22, col, 0.8, 1.1);
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(x + 2.5, y + 2.5, T - 5, T - 5);
    ctx.restore();
    if ((ch === 'R' && c === 12) || (ch === 'Y' && c === 23) || (ch === 'B' && c === 27)) {
      L.fg('ghost-' + ch, x + 6, y + 2, x + 6, y - 5);
    }
  }

  function exitDoor(ctx, x, y, t) {
    const cx = x + 16, cy = y + 20, k = 1 + 0.08 * Math.sin(t);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 12; i++) { // sunburst rays, kept inside the pocket
      const a = (i / 12) * Math.PI * 2 + 0.13;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - 0.1) * 14, cy + Math.sin(a - 0.1) * 14);
      ctx.lineTo(cx + Math.cos(a) * 46 * k, cy + Math.sin(a) * 46 * k);
      ctx.lineTo(cx + Math.cos(a + 0.1) * 14, cy + Math.sin(a + 0.1) * 14);
      ctx.fill();
    }
    ctx.fillStyle = '#07080D';
    ctx.beginPath();
    ctx.roundRect(x + 3, y - 1, 26, 34, [13, 13, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 2, 20, 30, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#07080D';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 6, 12, 12, [6, 6, 0, 0]);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 24, 2.2, 0, Math.PI * 2);
    ctx.fill();
    L.fg('exit-frame', x + 8, y + 24, x + 1, y + 26);
  }

  function player(ctx, S) {
    const g = L.G[S.band], tn = S.tn;
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(L.PX + 4, L.FY + 1, 20 + 12 * tn, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(L.PX, L.FY);
    ctx.transform(1 + 0.08 * tn, 0, -0.1 * tn, 1 - 0.04 * tn, 0, 0);
    ctx.fillStyle = css(g.solid.outline);
    ctx.fillRect(-15, -51, 30, 53);
    ctx.fillStyle = css(INK);
    ctx.fillRect(-13, -49, 26, 49);
    ctx.fillStyle = css(g.solid.fill);
    ctx.fillRect(-10, -46, 20, 46);
    L.drawPattern(ctx, g.pattern, -12, -48, 24, css(g.solid.ink), 0.9, 1.2);
    L.drawPattern(ctx, g.pattern, -12, -24, 24, css(g.solid.ink), 0.9, 1.2);
    // clip pattern overflow back to the ink frame
    ctx.fillStyle = css(INK);
    ctx.fillRect(-13, -49, 3, 49);
    ctx.fillRect(10, -49, 3, 49);
    ctx.fillStyle = '#FFFFFF'; // eye, looking ahead
    ctx.fillRect(-2, -42, 11, 9);
    ctx.fillStyle = css(INK);
    ctx.fillRect(-2, -42, 11, 1);
    ctx.fillRect(-2, -34, 11, 1);
    ctx.fillRect(4, -41, 5, 7);
    ctx.restore();
  }

  function motion(ctx, S) {
    if (S.tn <= 0) return;
    const col = L.mix(L.tintAt(S.tn), L.WHITE, 0.15);
    const bars = [[-62, 170, 5], [-76, 130, 6], [-90, 200, 4], [-104, 90, 5], [-118, 150, 4]];
    ctx.fillStyle = css(col);
    bars.forEach(([dy, len, h], i) => {
      const l = len * (0.35 + 0.65 * S.tn);
      parallelogram(ctx, L.PX + 10 - (i % 3) * 26 - l, L.FY + dy, l, h, 8);
    });
    for (let k = 3; k >= 1; k--) { // stepped afterimages, one band colour per step back
      const s = 1 - 0.09 * k;
      ctx.fillStyle = css(INK);
      ctx.fillRect(L.PX - 15 - 40 * k, L.FY - 50 * s, 30 * s, 52 * s);
      ctx.fillStyle = css(L.tintAt(S.tn - 0.14 * k));
      ctx.fillRect(L.PX - 12 - 40 * k, L.FY - 47 * s, 24 * s, 46 * s);
    }
    for (let k = 0; k < 3; k++) { // dust puffs
      const r = 8 - k * 2;
      ctx.fillStyle = css(L.mix(L.tintAt(S.tn), L.WHITE, 0.7));
      ctx.strokeStyle = css(INK);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(L.PX - 150 - k * 22, L.FY - r - 1 - k * 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function hardPanel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x + 4, y + 4, w, h);
    ctx.fillStyle = css(L.UI.text);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = css(L.PANEL);
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  }

  function hud(ctx, S) {
    const x0 = 10, y0 = 10, g = L.G[S.band];
    hardPanel(ctx, x0, y0, 216, 60);
    ctx.font = HEAVY;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = css(L.UI.text);
    ctx.fillText('GEAR ' + S.gear, x0 + 12, y0 + 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = css(g.solid.outline);
    ctx.fillText(S.label, x0 + 204, y0 + 22);
    for (let i = 0; i < 5; i++) {
      const cg = L.G[i], x = x0 + 12 + i * 40, y = y0 + 28;
      ctx.fillStyle = css(INK);
      ctx.fillRect(x - 2, y - 2, 36, 20);
      if (i === S.band) {
        ctx.fillStyle = css(cg.solid.fill);
        ctx.fillRect(x, y, 32, 16);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, 32, 16);
        ctx.clip();
        L.drawPattern(ctx, cg.pattern, x + 8, y - 4, 24, css(cg.solid.ink), 0.9, 1);
        ctx.restore();
        ctx.fillStyle = css(L.mix(cg.solid.fill, L.WHITE, 0.55));
        ctx.fillRect(x, y, 32, 3);
      } else {
        ctx.strokeStyle = css(i === 4 ? cg.ghost.outline : cg.solid.fill, 0.85);
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x + 1, y + 1, 30, 14);
        ctx.setLineDash([]);
        L.drawPattern(ctx, cg.pattern, x + 8, y - 4, 24, css(cg.solid.fill), 0.5, 0.9);
      }
      ctx.font = '900 9px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = css(i === S.gear ? L.UI.text : L.UI.muted);
      if (i > 0) ctx.fillText(String(i), x + 16, y + 28);
      if (i === S.gear) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 4.5, y - 4.5, 41, 25);
      }
    }
    const nx = x0 + 12 + 16 + (S.speed / 3) * 40;
    ctx.fillStyle = css(L.UI.text);
    ctx.beginPath();
    ctx.moveTo(nx, y0 + 49);
    ctx.lineTo(nx - 5, y0 + 56);
    ctx.lineTo(nx + 5, y0 + 56);
    ctx.fill();
    hardPanel(ctx, 836, 10, 114, 30);
    ctx.font = '900 15px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = css(L.UI.text);
    ctx.fillText(S.time, 848, 31);
  }

  B.render = (ctx, S) => {
    background(ctx, S);
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; // hard shadows, offset down-right
    L.forTiles((ch, c, r, x, y) => {
      if (ch === 'E') return;
      if (ch === '#' || L.isSolid(ch, S.band)) ctx.fillRect(x + 6, y + 6, T, T);
    });
    L.forTiles((ch, c, r, x, y) => {
      if (ch === '#' || ch === 'E') return;
      if (!L.isSolid(ch, S.band)) ghostTile(ctx, ch, c, x, y, L.bandOfChar(ch));
    });
    L.forTiles((ch, c, r, x, y) => { if (ch === '#') safeTile(ctx, c, r, x, y, L.nb(c, r, '#')); });
    L.forTiles((ch, c, r, x, y) => {
      if (ch !== '#' && ch !== 'E' && L.isSolid(ch, S.band)) solidTile(ctx, ch, x, y, L.nb(c, r, ch), L.bandOfChar(ch));
    });
    L.forTiles((ch, c, r, x, y) => { if (ch === 'E') exitDoor(ctx, x, y, 1.0); });
    motion(ctx, S);
    player(ctx, S);
    hud(ctx, S);
  };
})();
