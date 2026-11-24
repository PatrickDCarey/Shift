# Kinetics sprites (expansion: slabs, tracks, emitters, bolts)

Task B11-08. Code: `src/fx/pixel/movers.ts`, `bolts.ts`, `kinetics.ts` (all exported from `src/fx/pixel`). Atlas: `assets/art/pixel/pixel-kinetics.png` + `.json`, texture key `PIXEL_KEYS.kinetics` (`pixel-kinetics`). Existing sheets and frames are unchanged. Previews: `docs/art/pixel/kinetics.png` (colour), `docs/art/pixel/kinetics-grey.png` (Rec. 709 luma). Everything is on the 480x270 grid, 16 px per tile. "White mask" frames are pure #FFFFFF: tint at runtime.

## Frame API (use `kineticFrameNames()`)

| Frame | Size (px) | Origin | Notes |
|---|---|---|---|
| `slab/<safe\|blue\|green\|yellow\|red>/<solid\|ghost>/<L\|M\|R\|S>` | 16x16 | (0,0) | One per tile of width: `slabSegments(w)` gives `['L','M',...,'R']` (`['S']` for w=1). Place at the tile's top-left; the lip is on the top edge (its only solid face). `solid` when the slab holds the player's band, `ghost` when it will not (the sink look). Slab is 1 tile tall. |
| `slab/chevron/<l\|r\|u\|d>` | 8x8 white mask | (0.5,0.5) | Direction of motion, from the delta; draw on the side faces. |
| `track/<h\|v\|ne\|nw\|se\|sw\|stop/l\|stop/r\|stop/u\|stop/d>` | 16x16 white mask | (0,0) | Dotted path: `h`/`v` straight, `ne` etc. join two sides (L-shaped loops), `stop/<side>` an end bar on that side. Always drawn, every effects mode. |
| `emitter/<l\|r\|u\|d>/<grey\|white\|blue\|green\|yellow\|red>/<idle\|tell>` | 16x16 | (0,0) | Muzzle on the `dir` face. `grey` = no `band=`, `white` = `band=W`. `tell` = the 18-step pre-shot glow; a static fill change, so it is also the reduced-motion frame (never flash). |
| `bolt/<grey\|white\|blue\|green\|yellow\|red>` | 8x8 | (0.5,0.5) | Same size as the shot box (0.5 tile). Symmetric, so no facing. |
| `bolt/shimmer/<0-3>` | 16x16 white mask | (0.5,0.5) | Pass-through: draw over a body, at the bolt's position, tinted the bolt colour, while a shot that cannot hit that body overlaps it. Cycle 0-3; reduced motion: frame 1 only. |
| `bolt/sink/<l\|r\|u\|d>` | 16x16 white mask | (0,0) | Catcher at the last cell of a lane; `dir` is the bolt's flight direction. |

Helpers: `SLAB_KINDS`, `SLAB_SEGMENTS`, `BOLT_KINDS`, `DIRS`, `TRACK_CELLS`, `SLAB_SIZE`, `BOLT_SIZE`, `EMITTER_SIZE`, `SHIMMER_FRAMES`, `bakeSlabSegment`, `bakeEmitter`, `bakeBolt`, and so on. Slab kind for a mover: `safe`, or the band name; white slabs (Could) are not baked. Tint suggestions: chevrons `ui.text`, track `ui.textMuted`, shimmer and sink the bolt's `solid.outline`.

## Greyscale check (`kinetics-grey.png`)

Each line says what separates the sprite with no colour. `src/fx/pixel/kinetics.test.ts` enforces pairwise greyscale differences (slabs >= 20 px, bolts >= 6 px, emitter glyphs >= 8 px).

- Safe slab: plain body with four rivets, no pattern. Blue slab: two thick horizontal stripes. Green: dense dot grid. Yellow: zigzag chevron band. Red: dark checkerboard (also the darkest slab in luma). All share the lip: a bright 3 px bar over a narrower body, with clamp teeth below, which a static tile lacks.
- Ghost slabs: no fill and a dashed 1 px top line instead of the lit lip, hollow pattern, three down-pointing sink ticks underneath; far fewer lit pixels than solid (tested < 60%).
- Emitters: octagon body with a muzzle on the facing side; glyph: X (grey), hollow square (white), stripes (blue), dots (green), V chevron (yellow), checker (red). Tell frame: body fill brightens, the glyph flips to dark ink, the bore turns pure white (tested).
- Bolts: grey is a solid four-point star filling the 8 px box edge to edge; all other bolts are diamonds with a rim that never reaches the corners. White diamond is hollow; blue has two bars, green three dots, yellow a V, red a checker inside.
- Colour-only risks: none; yellow and white diamonds are close in luma, but one is hollow and one is patterned. Colour-blind simulation of the band fills is unchanged from `accessibility.md` (same palette entries).
- Chevrons, track, shimmer and sink are single-colour masks; they differ by shape only.

Note: at 8 px the bolt patterns are small. Do not scale below 1x; for itch shots draw bolts at 2x with nearest-neighbour.

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
