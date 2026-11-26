# Kinetics sprites (expansion: slabs, tracks, emitters, bolts)

Task B11-08. Code: `src/fx/pixel/movers.ts`, `bolts.ts`, `kinetics.ts` (all exported from `src/fx/pixel`). Atlas: `assets/art/pixel/pixel-kinetics.png` + `.json`, texture key `PIXEL_KEYS.kinetics` (`pixel-kinetics`). Existing sheets and frames are unchanged. Previews: `docs/art/pixel/kinetics.png` (colour), `docs/art/pixel/kinetics-grey.png` (Rec. 709 luma). Everything is on the 480x270 grid, 16 px per tile. "White mask" frames are pure #FFFFFF: tint at runtime.

## Frame API (use `kineticFrameNames()`)

| Frame | Size (px) | Origin | Notes |
|---|---|---|---|
| `slab/<safe\|blue\|green\|yellow\|red>/<solid\|ghost>/<L\|M\|R\|S>` | 16x16 | (0,0) | One per tile of width: `slabSegments(w)` gives `['L','M',...,'R']` (`['S']` for w=1). Place at the tile's top-left; the lip is on the top edge (its only solid face). `solid` when the slab holds the player's band, `ghost` when it will not (the sink look). Slab is 1 tile tall. |
| `slab/chevron/<l\|r\|u\|d>` | 8x8 white mask | (0.5,0.5) | Direction of motion, from the delta; draw on the side faces. |
| `track/<h\|v\|ne\|nw\|se\|sw\|stop/l\|stop/r\|stop/u\|stop/d>` | 16x16 white mask | (0,0) | Dotted path: `h`/`v` straight, `ne` etc. join two sides (L-shaped loops), `stop/<side>` an end bar on that side. Always drawn, every effects mode. |
| `emitter/<l\|r\|u\|d>/<grey\|white\|blue\|green\|yellow\|red>/<idle\|tell>` | 16x16 | (0,0) | Muzzle on the `dir` face. `grey` = no `band=`, `white` = `band=W`. `tell` = the 18-step pre-shot glow; a static fill change, so it is also the reduced-motion frame (never flash). |
| `bolt/<grey|white|blue|green|yellow|red>` | 10x10 | (0.5,0.5) | The 8x8 core fills the shot box (0.5 tile) edge to edge, plus a 1 px dark (`palette.background`) outline: 10x10 drawn, never smaller than the hit box. Symmetric, no tail. Kept for code that has no direction. |
| `bolt/<kind>/<l|r|u|d>` | 14x10 (l, r), 10x14 (u, d) | pivot on the 10x10 bolt centre (in the JSON) | The same bolt plus a tail behind the flight direction (`dir` = the emitter's `dir`): 2 px wide, 3 px long, last pixel dimmer, 1 px dark outline. The tail is part of the frame, so it is drawn under reduced effects and reduced motion and never flickers. The core stays upright. **Scene must use this frame** (see below). |
| `bolt/shimmer/<0-3>` | 16x16 white mask | (0.5,0.5) | Pass-through: draw over a body, at the bolt's position, tinted the bolt colour, while a shot that cannot hit that body overlaps it. Cycle 0-3; reduced motion: frame 1 only. |
| `bolt/sink/<l\|r\|u\|d>` | 16x16 white mask | (0,0) | Catcher at the last cell of a lane; `dir` is the bolt's flight direction. |

Helpers: `SLAB_KINDS`, `SLAB_SEGMENTS`, `BOLT_KINDS`, `DIRS`, `TRACK_CELLS`, `SLAB_SIZE`, `BOLT_SIZE`, `EMITTER_SIZE`, `SHIMMER_FRAMES`, `bakeSlabSegment`, `bakeEmitter`, `bakeBolt`, and so on. Slab kind for a mover: `safe`, or the band name; white slabs (Could) are not baked. Tint suggestions: chevrons `ui.text`, track `ui.textMuted`, shimmer and sink the bolt's `solid.outline`.

## Greyscale check (`kinetics-grey.png`)

Each line says what separates the sprite with no colour. `src/fx/pixel/kinetics.test.ts` enforces pairwise greyscale differences (slabs >= 20 px, bolts >= 6 px, emitter glyphs >= 8 px).

- Safe slab: plain body with four rivets, no pattern. Blue slab: two thick horizontal stripes. Green: dense dot grid. Yellow: zigzag chevron band. Red: dark checkerboard (also the darkest slab in luma). All share the lip: a bright 3 px bar over a narrower body, with a flat dark rail below (no teeth: nothing harmless may look like a spike), which a static tile lacks.
- Ghost slabs: no fill and a dashed 1 px top line instead of the lit lip, hollow pattern, three short flat sink dashes underneath; far fewer lit pixels than solid (tested < 60%).
- Emitters: octagon body with a muzzle on the facing side; glyph: X (grey), hollow square (white), stripes (blue), dots (green), V chevron (yellow), checker (red). Tell frame: body fill brightens, the glyph flips to dark ink, the bore turns pure white (tested).
- Bolts (2026-11-26, world-5 playtest triage): three families that stay apart in greyscale. **Banded** = solid diamond (tips on all four box edges) with the band pattern in ink (blue two bars, green dot grid, yellow V, red checker), band colour fill. **White** = a pale solid block (corners clipped one pixel), plain, the brightest bolt (L 0.91). **Grey** = a spiked ball in mid grey `ui.textMuted` (L 0.42; a 6x6 body with eight spikes reaching all four edges and corners, heavy so it cannot read as a sparkle), the only spiked bolt, so "hits everyone" reads as the hazard. White vs grey differ by shape and by value (contrast between their fills 2.0:1, grey is about half as bright). No twinkle on any bolt; only the coloured bolts' pass-through shimmer remains, and only where a bolt overlaps a body.
- Colour-only risks: none; yellow and white diamonds are close in luma, but one is hollow and one is patterned. Colour-blind simulation of the band fills is unchanged from `accessibility.md` (same palette entries).
- Chevrons, track, shimmer and sink are single-colour masks; they differ by shape only.

Note: bolt patterns are small. Do not scale below 1x; for itch shots draw bolts at 2x with nearest-neighbour.

## Checkpoint post (long levels)

Code: `src/fx/pixel/posts.ts` (exported from `src/fx/pixel`), frames in the same `pixel-kinetics` atlas, previews bottom right of `docs/art/pixel/kinetics.png` and `kinetics-grey.png`. Existing frames are unchanged.

| Frame | Size (px) | Origin | Notes |
|---|---|---|---|
| `checkpoint/idle` | 16x24 | (0.5,1) | Unlit, neutral grey: 2 px pole, 8x8 square lamp (2 px outline in `safeTile.outline`, dim `safeTile.fill` inside), 1 px dark rim (background colour) round pole and lamp. Same in every effects mode. |
| `checkpoint/lit` | 16x24 | (0.5,1) | Lit: 2 px pole, ball on top, filled pennant flag pointing right. Reduced-motion lit frame. |
| `checkpoint/rise/<0-2>` | 16x24 | (0.5,1) | Lit transition, about 60 ms a frame: the pennant climbs 12, 8, 4 px below its final spot, then `lit`. Reduced motion: skip, show `lit`. |

Place at x = (col + 0.5) * 16, y = the floor's top edge; the post is 1.5 tiles tall and 1 wide, over the post's own cell and the one above it. Helpers: `postFrameNames()` (also `kineticFrameNames().post`), `POST_W`, `POST_H`, `POST_ORIGIN`, `POST_RISE_FRAMES`, `bakePost`, `bakePostRise`. Colours come from `palette.json` (`safeTile`, `ui.text`, `ui.textMuted`); no new entries.

Greyscale: idle is a boxy lamp (bright outline, dim fill, dark rim) on a 2 px pole; lit is a flag silhouette (pennant, ball) on a 2 px pole. Different shapes, no hue involved; both are drawn in the safe-tile greys. `kinetics.test.ts` enforces >= 30 differing greyscale pixels, a different silhouette, the outline > fill > rim luma order and the 2 px pole. Contrast: idle pole and lamp outline use the safe-tile edge colour (same as the tiles) with a dark rim; lit parts use `ui.text`/safe edge on the near-black background (well over 3:1).

## Sweep (advancing front, Should)

Code: `src/fx/pixel/sweep.ts` (exported from `src/fx/pixel`; names via `sweepFrameNames()` or `kineticFrameNames().sweep`). All frames are pure white masks in `pixel-kinetics`: no band colour or band pattern, so it never reads as a gear. Previews at the bottom of `kinetics.png` and `kinetics-grey.png`.

| Frame | Size (px) | Origin | Notes |
|---|---|---|---|
| `sweep/edge/<0-2>` | 16x16 | (0,0) | Hard front: 2 px bar at x 14-15, ragged saw-tooth on its left (0-3 px). Tile **vertically** every 16 px (17 tiles cover 270 px) in a column at x = frontPx - 16; the saw period is 8, so it is seamless. 3 frames, about 8 fps (teeth crawl). Reduced motion: frame 0. Tint `ui.text`. |
| `sweep/fill/<0-3>` | 16x16 | (0,0) | Swept area: thin 45-degree hatch, one pixel in four (25%), so geometry beneath stays readable. Tile both ways from the view's left edge to frontPx - 16, under bodies. 4 frames scroll one pixel each (about 6 fps). Reduced motion: frame 0. Tint `ui.textMuted` at low alpha. |
| `sweep/marker` | 12x16 | (0,0.5) | Left-pointing arrowhead for the left screen edge while the front is off screen. The gap bar (up to 15 tiles) is a plain rectangle the scene draws beside it. |

Greyscale: shape only. A saw-tooth edge with a solid bar, and a diagonal hatch that no gear pattern uses (blue horizontal stripes, green dots, yellow zigzag, red checker): "something sharp is advancing". Colour is never needed. The hatch is never denser than 25% and sits behind the front, so tiles just ahead of the edge are not covered. `kinetics.test.ts` checks tile sizes, vertical seamlessness, animation, hatch density and the marker.


## Bolt visibility pass (2026-11-26)

Previews (6x): before sheets are `kinetics-bolts-before.png` and `kinetics-bolts-before-grey.png`; after: `bolts-after.png` and `bolts-after-grey.png` (every kind over every world-tint background and the tiles a bolt crosses, plus the four directions). Regenerate with `node docs/art/pixel/bolt-preview.mjs [--grey]` after `npm run art:build`.

Contrast (WCAG ratio; enforced in `src/fx/pixel/kinetics.test.ts`). World-tint backgrounds are `backgroundForSpeed` at standing, blue, green, yellow, red pace:

| Bolt core fill | #hex | vs standing #080B18 | blue #09152E | green #071715 | yellow #201A05 | red #32060D |
|---|---|---|---|---|---|---|
| grey | #A3AECB | 8.8 | 8.1 | 8.3 | 7.8 | 8.1 |
| white | #F2F4FF | 17.9 | 16.5 | 16.7 | 15.8 | 16.4 |
| blue | #4C8DFF | 6.1 | 5.6 | 5.7 | 5.4 | 5.6 |
| green | #5CF29B | 13.7 | 12.6 | 12.8 | 12.1 | 12.6 |
| yellow | #FFD60A | 13.9 | 12.8 | 13.0 | 12.3 | 12.8 |
| red | #F5283C | 4.9 | 4.5 | 4.6 | 4.3 | 4.5 |

Over tiles: a fill cannot reach 3:1 against every gear tile (a green bolt on a green tile), so the 1 px dark outline carries it: outline (#070A18) against safe tile 3.6, blue 6.2, green 13.7, yellow 14.0, red 4.9 (all >= 3), and every core against its own outline >= 4.9 (grey 8.9, white 18.0, blue 6.2, green 13.7, yellow 14.0, red 4.9). Greyscale: white (L 0.91), grey (0.42) and the banded cores differ in silhouette (block, spiked ball, diamond) as well as in value; the pairwise test asks >= 10 differing pixels.

Harmless things checked against "looks like spikes": the slab underside (clamp teeth, ghost sink chevrons) was spike-like and is now a flat rail and flat dashes; the lane-end catcher `bolt/sink/*` was a row of small down-pointing chevrons along the floor under the w5-02 rain, which read as a row of teeth: it is now a flat stop bar (2 px wide, 10 long) with a pip in front. Stills in the real game (w5-01, w5-02, w5-03, w5-05 room 1 and the lift room) show the grey ball, the white block and the banded diamonds told apart at 1x. Tiles have no spiked undersides.

**Scene change needed** (`src/entities/KineticsView.ts` `drawShots`, about line 182): build the frame name from the shot's emitter direction, ``bolt/${s.kind}/${this.level.emitters![s.emitter]!.dir}``, for both the creation (`this.image(0, 0, frame, ...)`) and `img.setFrame(frame)`. The pivot comes from the atlas JSON on `setFrame`, so `setPosition(Math.round(s.x), Math.round(s.y))` stays as it is. `ShotPlan` has `emitter`, so no plan change is required (adding `dir` to `ShotPlan` is the tidier option). Optional: `planShimmers` should skip `kind === 'white'` (brief point 4: no shimmer on white or grey bolts).
