# ADR: rendering at 480 x 270 for art direction C (Pixel Dither)

_Owner: tech-lead. Status: **Accepted**, 2026-11-03. Migration not started (tasks PX-1 to PX-11 below)._

## Context

The studio owner picked direction C, Pixel Dither (`docs/art/style-frames/README.md`, `pixel-*.png`). The art is 480 x 270 logical pixels shown at 2x in the 960 x 540 itch.io iframe. It uses Bayer dither, 1 px outlines, 16 px tiles, a 12 x 24 player sprite and a 5 x 7 bitmap font.

Today the game config is 960 x 540 with `Scale.FIT`, `pixelArt: true` and `roundPixels: true` (`src/main.ts`). `tuning.tileSize` is 32 px. The HUD, gear meter and Sticky Keys tip are laid out in 960 x 540 pixels with system `monospace` text.

The sim is unaffected whichever option we pick. It works in tiles with float positions, and pixels exist only in the renderer (`src/core/types.ts`). Nothing here may change `src/core`.

## Options

**(a) Game config 480 x 270, scaled by an integer zoom.**
- Phaser renders into a 480 x 270 canvas. The browser upscales it with `image-rendering: pixelated`, which Phaser sets because `pixelArt: true` and which `index.html` also sets.
- `Scale.FIT` would allow fractional scales, so we use `Scale.NONE` with `zoom: Phaser.Scale.MAX_ZOOM` and `autoCenter: CENTER_BOTH`. That gives the largest whole multiple that fits, with a letterbox around it.

**(b) Keep a 960 x 540 config and draw the art at 2x.** Two ways:
- **(b1) Camera zoom 2.** The world camera has `zoom = 2`. The HUD needs a second, unzoomed camera (zoom scales `scrollFactor 0` objects around the camera centre too), and each object must be put on one camera's ignore list.
- **(b2) Integer-scaled render texture.** Draw the world into a 480 x 270 `RenderTexture` every frame, then draw that texture at 2x. Phaser 3.60+ removed camera render-to-texture, so we would have to `rt.draw()` every world object every frame. That adds a pass, breaks batching, and complicates depth and debug drawing.

## Comparison

| | (a) 480 x 270 + integer zoom | (b1) 960 x 540 + camera zoom 2 | (b2) render texture |
|---|---|---|---|
| **Integer scaling, itch iframe (960 x 540)** | Exactly 2x (spike: canvas 480 x 270, CSS 960 x 540, zoom 2) | Exactly 2x | Exactly 2x |
| **Integer scaling, fullscreen** | Any whole multiple: 1366 x 768 gives 2x (960 x 540, letterboxed); 1920 x 1080 gives 4x; 2560 x 1440 gives 5x (2400 x 1350); 4K gives 8x. All measured in the spike except 4K. | Either FIT, which is fractional (2.84x art pixels at 1366 x 768, 5.33x at 1440p), or integer zoom of the 960 canvas, which allows only even art scales (2, 4, 6). That gives 4x at 1440p instead of 5x. | Same as (b1) |
| **Bayer dither** | Every art pixel is k x k screen pixels, so checkerboards stay clean | With FIT, 1 px checkerboards become uneven 2- and 3-px columns (moiré and beat patterns). This is the worst case for this art style. | Same as (b1) |
| **Half-pixel "mixels"** | Impossible: there is no finer grid than one art pixel | Possible. `roundPixels` rounds to screen pixels, so a sprite can sit half an art pixel off the tile grid unless we snap in world space ourselves. | Impossible inside the texture |
| **HUD and text** | Everything is in 480 x 270 pixels. Text must use the bitmap font (system fonts antialias, then get blown up; see the spike screenshot). | The HUD could keep crisp high-resolution text, but that clashes with the pixel style. Needs a second camera and per-object ignore lists. | High-resolution HUD possible |
| **Performance** (spike, w0-02, holding Right, headless Chromium software GL) | ~54 fps on one page; ~17 fps per page with 4 pages at once | ~20 fps on one page; ~6 fps per page with 4 pages (today's numbers) | Worse than (b1): an extra full-screen pass |
| **Changes** | `main.ts`, `tileSize`, and every pixel constant in the HUD and effects (direction C needs a HUD rebuild and a bitmap font anyway). e2e canvas-attribute assertions change. | World pixel constants halve anyway (16 px art tiles), plus a second camera; the e2e suite is unchanged | Largest |

## Decision

We choose **(a): game config 480 x 270, `Scale.NONE` + `zoom: MAX_ZOOM`, re-zoomed on resize.**

1. **Integer scaling.** It is the only option that keeps an exact whole multiple at every fullscreen size the iframe can take. The multiples are as fine-grained as possible (2, 3, 4, 5 ...). Dither is the most scale-sensitive art there is, and a fractional scale would ruin it.
2. **One grid.** With a single pixel grid, mixels are impossible by construction rather than by discipline.
3. **Cost.** The GPU fills 4x fewer pixels. In software GL the game ran about 2.7x faster, which also helps the e2e suite on loaded machines (BUG-3).
4. **Price.** All text moves to the bitmap font, and windows between 1x and 2x get a letterboxed 1x picture instead of a fractional fit. Direction C requires the first anyway. The second only happens below the 960 x 540 embed size, which itch never gives us.

### Integer zoom details (verified in the spike)
- Config: `width: 480, height: 270, scale: { mode: Phaser.Scale.NONE, zoom: Phaser.Scale.MAX_ZOOM, autoCenter: Phaser.Scale.CENTER_BOTH }`. Keep `pixelArt: true`, which implies `antialias: false` and `roundPixels: true` and sets crisp CSS on the canvas. Keep `image-rendering: pixelated` in `index.html`, and make the letterbox colour the page background (`#000`).
- **Phaser does not re-zoom on its own in `NONE` mode.** After a resize from 960 x 540 to 1920 x 1080 the zoom stayed at 2. `main.ts` must call `game.scale.getParentBounds(); game.scale.setMaxZoom();` on `window` `resize`. itch's fullscreen button resizes the iframe, so this covers fullscreen. Verified: 960 to 1920 gives zoom 4, and back gives zoom 2.
- If the window is smaller than 480 x 270, the zoom stays at 1 and the canvas overflows (clipped, no scroll; `body` is `overflow: hidden`). We accept this; it never happens on itch.
- The pointer is unaffected. The scale manager maps pointer coordinates, and clicks only focus the frame.

### Sub-pixel positions without jitter, determinism untouched
- **Snap only in the renderer, after interpolation, and never write back.** `renderPosition` blends `prev` and `cur` (floats in tiles). The scene converts to pixels with `x * tileSize` and rounds. The sim, the replays and the solvability tests do not change.
- **World objects sit on integer pixels.** Tiles are at `col * 16`. The player's top-left is `Math.round(feet - size/2)`, as `PlayerView` already does. The camera scroll is `Math.round(...)` (`axisScroll`, already). With `roundPixels` that makes every draw land on an art pixel.
- **No jitter between the player and the camera.** Both must be derived from the same interpolated feet position, with integer offsets between them. Because `Math.round(a - k) === Math.round(a) - k` for integer `k`, the player's screen position is then constant while the camera follows. This needs:
  - an even player width and height (12 x 24, so offsets of 6 and 12);
  - an even view size (480 x 270, so 240 and 135);
  - a focus offset of `heightPx / 2`.

  Today's code already has this shape. The scene lane pins it with a unit test: for any `x`, the player's screen x is the same while the camera is unclamped.
- **Snap bodies first, then derive the camera from the snapped integers.** Compute `P = round(feet px)` for each body. The camera scroll is integer arithmetic on those `P`s. Screen positions are then exact integers, and the camera can never round differently from a body. This is the general form of the rule above. It also covers Tandem's two bodies (next section), where the camera follows a mid-point and no single rounding offset exists.
- **Scroll cadence judder is inherent to the style.** At 60 fps the speeds are 0.8 / 1.6 / 2.4 / 3.2 art px per frame (gears 1 to 4), so the world moves in whole-pixel steps of uneven count (for example 2, 3, 2, 3 at gear 3). At 2x one art pixel is 2 screen pixels, at 4x it is 4. This is how pixel platformers look, and we accept it.
  - If a playtest flags it, the deferred option is to render 2 px larger (482 x 272) and CSS-translate the canvas by the fractional scroll times the zoom. That gives smooth screen-resolution scrolling over a crisp grid (tech-lead plus scene lane, about 4 h). We will not build it unless asked.
- **Animation frames come from sim state, not wall-clock time.**
  - Standing, jumping (`vy < 0`) and falling are read from state.
  - The run frame is `floor(x * framesPerTile) mod 4`.

  A replay therefore looks identical frame for frame, and no `Date` or timer is needed in rendering logic.

### Tile size and sprites
- **Tile size: 16 art px.** That is 32 screen px at 2x, the same on-screen size as today. The view stays 30 x 16.875 tiles, so **no level changes**.
- The player is 0.75 x 1.5 tiles = 12 x 24 px, matching the art.
- `tuning.tileSize` is render-only and stays where it is. design-lead changes 32 to 16 in the cutover batch. Moving it to art data is not worth a contract change now.
- **Sprites are a Phaser JSON-hash atlas** (`assets/art/player.png` + `player.json`, loaded with `load.atlas`). Rules for the sheet:
  - no trimming and no rotation;
  - 1 px transparent gap between frames;
  - even frame widths, so `origin (0.5, 1)` lands on a pixel boundary.
- **Colors stay in `palette.json` (hard rule).** The atlas is drawn in a few *key colors*, such as body fill, shade, keyline and visor, each mapped to a palette role in `palette.json`.
- **Patterns stay in `palette.json` too**, as small repeating 1-bit cells.
- At boot, `src/fx` builds the textures from palette and patterns:
  - one player texture per band (5 bands x 7 frames);
  - a 16 x 16 tileset (per band: solid top with lip, solid inner, ghost; plus safe top, safe inner, exit).
- **No final color is baked into a PNG.** A palette change needs no re-export.
- `LevelView` moves from per-frame `Graphics` to **Tilemap layers** built on the generated tileset (static layer, plus a colored layer whose tile indices are swapped when the hold mode changes). Redrawing pixel patterns rect by rect would cost tens of thousands of rect commands on every band change.

### Tandem (owner's pick, 2026-11-03; spec pending in `docs/design/features/tandem.md`)

A second player body runs on the same input, with its own speed, gear and color, in a stacked lane (`docs/design/core-twists.md` §1). The contract and `SimState` change is a separate tech-lead task once design-lead's request arrives; nothing here depends on its final shape. The rendering pipeline must allow for it from the start:

- **Player views are per body.** `PlayerView` is an instance per body with no module-level state. The atlas carries a second silhouette for the twin (`twin-stand`, `twin-run-0`..`3`, `twin-jump`, `twin-fall`: hollow outline, same band pattern, same 12 x 24 box and cell size). `buildPixelTextures` builds both sets per band (2 x 5 x 7 frames, still tiny).
- **The camera frames both bodies.** It takes a list of snapped body positions (one or two) and returns an integer scroll.
  - Horizontally, it centres the integer midpoint `floor((P1 + P2) / 2)`.
  - Vertically, it keeps the bounding box of both bodies in view.
  - When the two cannot both fit, the spec has to say which body wins (proposal: the body that is not home). The pure helper lives in `src/entities/camera.ts` with unit tests, as today.
- **Vertical budget at 480 x 270.** The view is 270 px = 16.875 tiles. Two lanes of up to 8 tiles plus the divider take nearly all of it, and the HUD sits on top. So the HUD for two bodies must be **compact**: two gear strips of about 110 x 14 px each, not two 110 x 32 meters, or else placed over the lane divider. **Design-lead and level-designer should cap the two lanes plus divider at 15 tiles** so the HUD never covers play.
- **Events carry a body id.** `FeedbackFx` (drag flash, ring) and later audio use it to place effects on the right body.
- **Order.** The pixel cutover (batch 2) lands first, and the Tandem scene work (about 1.5 days, after the contract change) builds on it. That way the player view, camera and HUD are only reworked once. PX-7 and PX-9 are written so a second body or strip is a second instance, not a rewrite.

### HUD and text
- **Everything is laid out in 480 x 270 px, on integer positions,** from `scene.scale.width/height` as today.
- **Font: a 5 x 7 bitmap font** (BMFont XML + PNG, `load.bitmapFont`) with white glyphs tinted from `palette.ui`. Cap height 7 means 14 screen px at 2x, which matches today's 12 to 16 px HUD text. The advance is 6 px, so a line holds about 80 characters. Large text, such as the win banner, uses `setScale(2)`.
- The character set must cover printable ASCII plus every non-ASCII glyph used in HUD strings today: `—` (`winText`) and `⇧` (gear meter hints; its ▲/▼ are drawn as shapes or must be added).
- **Constants halve:**
  - gear meter area: 220 x 64 at (10, 10) becomes 110 x 32 at (5, 5), matching the style frame;
  - `MARGIN` 10 becomes 5;
  - `MESSAGE_WRAP` 920 becomes 460;
  - `FeedbackFx` ring radius 42 becomes 21, line width 3 becomes 1 or 2;
  - the Sticky Keys tip panel halves too.
- **Menus.** The M2 menus (title, level select) should be built at 480 x 270 from the start.

### e2e (qa-tester)
- **Canvas size.** Expect canvas attributes 480 x 270 and a CSS box of 960 x 540 in the embed (`embed.spec.ts` first test, `smoke.spec.ts`, and the iframe test's `width` attribute).
- **Smaller-viewport test.** It becomes: at 640 x 360, the canvas is 480 x 270 CSS, centred, still 16:9.
- **New tests:**
  - CSS width is a whole multiple of 480 at 960 x 540, 1366 x 768 (960), 1920 x 1080 (1920) and 2560 x 1440 (2400);
  - a live resize from 960 x 540 to 1920 x 1080 gives a 1920 px canvas.
- Canvas clicks are unchanged, because they hit the centre of the CSS box. `window.__redshift` is unchanged.

### Performance
- **Spike** (scratch copy only; `main.ts` changed to 480 x 270 + MAX_ZOOM and `tileSize` 16; HUD not converted). Setup: w0-02, holding Right, 5 s of rAF counting, headless Chromium with software GL, same machine, back to back.

  | Pages at once | 960 x 540 (fps per page) | 480 x 270 (fps per page) |
  |---|---|---|
  | 1 | 20.3, 19.7 | 54.4, 54.1 |
  | 4 | 5.8 to 6.0 | 16.7 to 17.5 |

- Real GPUs have fill rate to spare, but low-end laptops, software fallback and CI all benefit.
- Assets are small: the atlas and font are expected to be well under 50 KB. Static layers are baked once (tileset, Tilemap).
- **Side finding (fixed in PX-4).** Phaser clamps each frame's delta to one 60 Hz step for the first 120 frames after boot or resume (`fps.panicMax`, default 120) and while the window is unfocused. Below 60 fps the game therefore runs in slow motion for the first seconds: about 6 s at 20 fps, where the spike saw 20 sim steps/s at 20 fps.
  - This is render-side only, not determinism. Our accumulator already caps catch-up at `MAX_STEPS_PER_FRAME` (5), and Phaser's `minFps` clamp handles tab-resume spikes.
  - PX-4 sets `fps: { panicMax: 0 }`.

## Migration plan

Owners follow the `CLAUDE.md` roster. Hours are rough agent hours.

**Batch 1: art inputs (art-director). Nothing in the game changes yet.**

| ID | Owner | Task | h |
|---|---|---|---|
| PX-1 | art-director | Pixel data in `palette.json`: 1-bit pattern cells per pattern id, lip and shade rows, dither densities, key-color-to-role map. Texture builders in `src/fx` with unit tests. Proposed API, to be confirmed in requests.md: `buildPixelTextures(scene)` creates the 16 x 16 tileset (`tileFrame(kind, band, mode, top)` returns the frame index) and one player texture per band (`playerTextureKey(band)`, same frame names as the atlas). | 8 |
| PX-2 | art-director | `assets/art/player.png` + `player.json`. Frames: `stand`, `run-0`..`run-3`, `jump`, `fall`, the same seven as `twin-*` (Tandem silhouette), plus `exit`. Format as in "Tile size and sprites". | 6 |
| PX-3 | art-director | 5 x 7 bitmap font (BMFont XML + PNG), character set as in "HUD and text". If third-party: CC0 only, and send a CREDITS.md line to tech-lead. | 2 |

**Batch 2: cutover. All tasks run in parallel (no shared files) and land as one commit, because the game and the e2e suite are inconsistent in between.**

| ID | Owner | Task | h |
|---|---|---|---|
| PX-4 | tech-lead | `src/main.ts`: 480 x 270, `Scale.NONE` + `MAX_ZOOM` + centre, re-zoom on resize, `fps.panicMax: 0`. `BootScene`: preload atlas and font, call `buildPixelTextures` (BootScene has no owner in the roster; tech-lead takes it). `index.html` letterbox colour. `architecture.md`. | 3 |
| PX-5 | design-lead | `tuning.json` `tileSize` 32 to 16. No level or feel change. Note the 480 x 270 base in the GDD if it states a resolution. | 0.25 |
| PX-6 | scene | `LevelView` on Tilemap layers over the generated tileset (top/inner variant from the neighbour above; swap colored indices on mode change); exit as a sprite. | 4 |
| PX-7 | scene | `PlayerView` becomes a sprite, one instance per body (band texture; frame from a pure, tested `playerFrame(player, params)`). Camera helper takes a list of snapped body positions, with the snapping invariant and unit tests. `FeedbackFx` sizes. `GameScene` wiring. | 5 |
| PX-8 | scene | `GameHud` on BitmapText at 480 x 270: title, banner at 2x, debug overlay, focus prompt, messages, halved constants. | 2 |
| PX-9 | ui-engineer | `GearMeterView` at 110 x 32 with the bitmap font, plus a compact strip variant (about 110 x 14) for Tandem's two bodies; `StickyKeysTipView` rebuilt for 480 x 270; tests. Build M2 menus at 480 x 270. | 7 |
| PX-10 | qa-tester | e2e changes as in "e2e" above; update the `EMBED_VIEWPORT` comment; a 2x screenshot check. | 3 |

**Batch 3: gate.**

| ID | Owner | Task | h |
|---|---|---|---|
| PX-11 | tech-lead, playtester | Review of the cutover. Fresh play in the 960 x 540 iframe and in fullscreen at 1366 x 768 and 1920 x 1080 (check judder, text legibility, dither). | 3 |

**Total about 43 h.** About 16 h is art-director work in batch 1. Batch 2 is about 24 h spread over five owners, so roughly one day if run in parallel. Tandem's own scene, sim and level work is estimated in `core-twists.md` §1 and is not included here.

Schedule constraints:
- **Batch 2 should land before ui-engineer builds the M2 title and level-select screens** (M2, Nov 15). Otherwise those screens get built twice.
- **Batch 2 should also land before the Tandem scene work starts** (sim lane builds Tandem Nov 9 to 13).
- This is only the pipeline. The rest of direction C (dither horizon, afterimages, speed lines, HUD restyle) is the art-director's 6 to 8 day estimate, scheduled by the producer.
