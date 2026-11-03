/*
 * Sketch strip: how mud, ice, a boost pad and a speed-camera gate could look in
 * the Neon Vector direction. Each has a unique silhouette AND mark, uses hues
 * outside the red-to-white spectrum, and is shown again in greyscale.
 */
(function () {
  'use strict';
  const L = window.L, css = L.css;
  const MONO = '700 13px Consolas, "Cascadia Mono", "Courier New", monospace';
  const SM = '700 11px Consolas, "Cascadia Mono", monospace';

  function glowFill(ctx, col, blur) {
    ctx.shadowColor = col;
    ctx.shadowBlur = blur;
  }

  // Each tile is drawn in a 32 x 32 local space, origin top-left.
  function mud(ctx) {
    const f = '#9A7B4F', lip = '#E3C998', ink = '#4A3720';
    const wave = (x) => 5 + 2.2 * Math.sin(x * 0.55);
    ctx.save();
    glowFill(ctx, 'rgba(154,123,79,0.6)', 12);
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.moveTo(0, 32);
    for (let x = 0; x <= 32; x += 1) ctx.lineTo(x, wave(x));
    ctx.lineTo(32, 32);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.8;
    for (const [cx, cy, rx, ry] of [[9, 19, 5.5, 3.4], [22, 14, 4.5, 2.8], [21, 25, 3.5, 2.2]]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = lip;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= 32; x += 1) (x === 0 ? ctx.moveTo(x, wave(x) + 1) : ctx.lineTo(x, wave(x) + 1));
    ctx.stroke();
    ctx.fillStyle = f; // drips under the tile
    for (const dx of [6, 16, 26]) {
      ctx.beginPath();
      ctx.moveTo(dx - 2.5, 32);
      ctx.lineTo(dx + 2.5, 32);
      ctx.lineTo(dx, 32 + 6 + (dx % 3) * 2);
      ctx.fill();
    }
    ctx.fillStyle = lip;
    ctx.fillRect(0, 30, 32, 2);
  }

  function ice(ctx) {
    const f = '#9FE6FF', ol = '#E8FBFF';
    const c = 6;
    ctx.save();
    glowFill(ctx, 'rgba(159,230,255,0.7)', 14);
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.moveTo(c, 0); ctx.lineTo(32 - c, 0); ctx.lineTo(32, c); ctx.lineTo(32, 32 - c);
    ctx.lineTo(32 - c, 32); ctx.lineTo(c, 32); ctx.lineTo(0, 32 - c); ctx.lineTo(0, c);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(c, 0, 32 - 2 * c, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; // glints
    for (const x of [7, 17]) {
      ctx.beginPath();
      ctx.moveTo(x + 4, 8); ctx.lineTo(x + 8, 8); ctx.lineTo(x + 3, 26); ctx.lineTo(x - 1, 26);
      ctx.fill();
    }
    ctx.strokeStyle = ol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c, 1); ctx.lineTo(32 - c, 1); ctx.lineTo(31, c); ctx.lineTo(31, 32 - c); ctx.lineTo(32 - c, 31);
    ctx.lineTo(c, 31); ctx.lineTo(1, 32 - c); ctx.lineTo(1, c); ctx.closePath();
    ctx.stroke();
  }

  function boost(ctx) { // a raised plate, only 14 units tall: different silhouette from every tile
    const f = '#FF4FD8', lip = '#FFC2F2';
    ctx.save();
    glowFill(ctx, 'rgba(255,79,216,0.8)', 14);
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.moveTo(0, 32); ctx.lineTo(0, 20); ctx.lineTo(3, 18); ctx.lineTo(29, 18); ctx.lineTo(32, 20); ctx.lineTo(32, 32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = lip;
    ctx.fillRect(3, 18, 26, 2);
    ctx.fillStyle = '#FFFFFF';
    for (const x of [4, 13, 22]) { // right-pointing solid arrows
      ctx.beginPath();
      ctx.moveTo(x, 22); ctx.lineTo(x + 8, 25.5); ctx.lineTo(x, 29);
      ctx.fill();
    }
  }

  function gate(ctx, band) {
    const g = L.G[band], frame = '#C9D1E6';
    ctx.save();
    glowFill(ctx, 'rgba(201,209,230,0.45)', 10);
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, 8, 96); // posts
    ctx.fillRect(88, 0, 8, 96);
    ctx.fillRect(0, 0, 96, 9); // lintel
    ctx.restore();
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(33, 9, 30, 20); // camera housing
    ctx.strokeStyle = frame;
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 10, 28, 18);
    ctx.save();
    glowFill(ctx, css(g.solid.fill, 0.95), 10);
    ctx.strokeStyle = css(g.solid.fill);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(48, 19, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(48, 19, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(g.solid.fill, 0.85);
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(48, 30);
    ctx.lineTo(48, 96);
    ctx.stroke();
    ctx.restore();
    // sign above the lintel: the pace it wants, colour AND pattern
    ctx.fillStyle = css(g.solid.fill);
    ctx.fillRect(36, -24, 24, 22);
    L.drawPattern(ctx, g.pattern, 37, -24, 22, css(g.solid.ink), 0.8, 1);
    ctx.strokeStyle = css(g.solid.outline);
    ctx.lineWidth = 2;
    ctx.strokeRect(37, -23, 22, 20);
    ctx.fillStyle = frame;
    ctx.fillRect(46, -3, 4, 3);
  }

  function player(ctx, x, floorY) {
    ctx.save();
    glowFill(ctx, 'rgba(242,244,255,0.8)', 16);
    ctx.fillStyle = '#F2F4FF';
    ctx.fillRect(x, floorY - 48, 24, 48);
    ctx.restore();
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(x + 10, floorY - 42, 12, 5);
  }

  function slab(ctx, x, y, w, h) {
    ctx.fillStyle = css(L.SAFE.fill);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = css(L.mix(L.SAFE.fill, L.WHITE, 0.4));
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = css(L.SAFE.outline);
    ctx.fillRect(x, y, w, 2);
  }

  function panel(ctx, x, y, title, desc, signal, drawScene) {
    ctx.fillStyle = css(L.PANEL, 0.96);
    ctx.fillRect(x, y, 456, 236);
    ctx.strokeStyle = css(L.UI.border);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, 454.5, 234.5);
    ctx.font = MONO;
    ctx.letterSpacing = '1px';
    ctx.textAlign = 'left';
    ctx.fillStyle = css(L.UI.text);
    ctx.fillText(title, x + 14, y + 24);
    ctx.font = SM;
    ctx.letterSpacing = '0px';
    ctx.fillStyle = css(L.UI.muted);
    ctx.fillText(desc, x + 14, y + 42);
    ctx.fillText(signal, x + 14, y + 226);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 50, 452, 160);
    ctx.clip();
    drawScene(x, y + (title === 'SPEED CAMERA GATE' ? 196 : 148));
    ctx.restore();
  }

  function scene(ctx, x, fy, kind, grey) {
    ctx.save();
    if (grey) ctx.filter = 'grayscale(1)';
    slab(ctx, x + 8, fy, 440, kind === 'gate' ? 34 : 48);
    player(ctx, x + 44, fy);
    const k = 1.5;
    const at = (cx, cy, fn, n, ...a) => {
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.translate(cx + i * 32 * k, cy);
        ctx.scale(k, k);
        fn(ctx, ...a);
        ctx.restore();
      }
    };
    if (kind === 'mud') {
      ctx.fillStyle = css(L.BG); ctx.fillRect(x + 140, fy, 192, 40);
      at(x + 140, fy, mud, 4);
    } else if (kind === 'ice') {
      ctx.fillStyle = css(L.BG); ctx.fillRect(x + 140, fy, 192, 40);
      at(x + 140, fy, ice, 4);
    } else if (kind === 'boost') {
      at(x + 140, fy - 48, boost, 3);
    } else {
      ctx.save();
      ctx.translate(x + 180, fy - 110);
      ctx.scale(1.15, 1.15);
      gate(ctx, 3);
      ctx.restore();
    }
    ctx.restore();
  }

  window.Mech = {
    render(ctx) {
      ctx.fillStyle = css(L.BG);
      ctx.fillRect(0, 0, 960, 540);
      ctx.font = '700 15px Consolas, "Cascadia Mono", monospace';
      ctx.letterSpacing = '1px';
      ctx.fillStyle = css(L.UI.text);
      ctx.fillText('NEW TILE SKETCHES (NEON VECTOR)', 16, 24);
      ctx.font = SM;
      ctx.letterSpacing = '0px';
      ctx.fillStyle = css(L.UI.muted);
      ctx.fillText('magenta, brown and ice sit outside the white-to-red spectrum, so none reads as a gear colour. Greyscale at right.', 16, 44);
      const defs = [
        ['mud', 'MUD', 'sticky ground. brown, wavy lip', 'SIGNAL: wavy top edge + blob rings + drips below'],
        ['ice', 'ICE', 'slick ground. pale cyan, cut corners', 'SIGNAL: chamfered corners + diagonal glints + white lip'],
        ['boost', 'BOOST PAD', 'launch plate. magenta, low profile', 'SIGNAL: half-height plate + solid forward arrows'],
        ['gate', 'SPEED CAMERA GATE', 'wants one pace. sign shows colour + pattern', 'SIGNAL: lintel, lens ring, dashed beam, pattern sign'],
      ];
      defs.forEach(([kind, t, d, s], i) => {
        const x = 16 + (i % 2) * 472, y = 56 + Math.floor(i / 2) * 244;
        panel(ctx, x, y, t, d, s, (px, fy) => {
          scene(ctx, px, fy, kind, false);
        });
        // greyscale proof: the same special tiles at half scale in the panel corner
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 360, y + 52, 92, 100);
        ctx.clip();
        ctx.fillStyle = css(L.BG);
        ctx.fillRect(x + 360, y + 52, 92, 100);
        ctx.filter = 'grayscale(1)';
        ctx.translate(x + (kind === 'gate' ? 378 : 372), y + (kind === 'gate' ? 92 : 84));
        ctx.scale(kind === 'gate' ? 0.72 : 1.6, kind === 'gate' ? 0.72 : 1.6);
        if (kind === 'mud') mud(ctx);
        else if (kind === 'ice') ice(ctx);
        else if (kind === 'boost') { ctx.translate(0, -8); boost(ctx); }
        else gate(ctx, 3);
        ctx.restore();
        ctx.font = SM;
        ctx.fillStyle = css(L.UI.muted);
        ctx.fillText('GREY', x + 408, y + 166);
      });
    },
  };
})();
