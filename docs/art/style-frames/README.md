# Redshift: style frames (pick a visual direction)

_Owner: art-director. 2026-11-03. Nothing in the game or `palette.json` has changed; these are mock-ups for a decision._

Three directions, same moment each: the w0-02 room (a condensed 30 x 17 tile slice of `levels/w0-02.txt`: start floor, red bridge, safe pillar, yellow pad, blue bridge over the exit pocket, low ceiling), the player running at yellow, the red bridge ahead and the blue bridge as ghosts, the exit visible in its pocket, the HUD gear meter at 10,10 (220 x 64).

For comparison, today's greybox: `00-current-greybox.png` (a screenshot of `?level=w0-02`).

| | A. Neon Vector | B. Flat Poster | C. Pixel Dither |
|---|---|---|---|
| Main frame (yellow, mid-run) | `neon-main-yellow.png` | `poster-main-yellow.png` | `pixel-main-yellow.png` |
| Second pace (red sprint) | `neon-pace-red.png` | `poster-pace-red.png` | `pixel-pace-red.png` |
| Standing (white) | `neon-pace-white.png` | `poster-pace-white.png` | `pixel-pace-white.png` |
| All five paces on one sheet | `neon-pace-sheet.png` | `poster-pace-sheet.png` | `pixel-pace-sheet.png` |
| Same frame under protan / deutan / tritan sim | `neon-cvd.png` | `poster-cvd.png` | `pixel-cvd.png` |

Also: `mechanics-strip.png` (mud, ice, boost pad, speed camera gate sketched in direction A) and `measurements.json` (every number quoted below, straight from the rendered pixels). Regenerate everything with `node assets/art/style-frames/gen.mjs` (headless Chromium through Playwright; the generator is plain Canvas 2D in `assets/art/style-frames/`).

All frames are 960 x 540.

## What all three share (fixes for the playtest and design-lead's four readability asks)

- **Colored tiles read as ledges, not hazards.** Every colored and safe tile has a flat, lit top edge (A: 4 px light band plus 2 px outline; B: 6 px light lip plus a 2 px ink line; C: two light pixel rows plus a shade row). The pattern starts below that lip, so the top of the red bridge is a clean bright line, not a mesh. Red keeps its crosshatch (see "Open risk" at the end).
- **Exit.** A white door glyph (arch, dark doorway, inner mark) with a keyline, a slow pulse and a light source (A: beacon beam; B: sunburst; C: dithered halo). It uses pure `#FFFFFF`, which no band or safe tile uses.
- **Ghost outlines are brighter and at least 2 px.** See the proposed palette deltas below.
- **Yellow tint is clearly not white.** The background hue is now strong enough to read (numbers below).
- **Player separates from a same-colored floor** with a 1 to 2 px background-colored keyline around the body, plus a facing visor.
- Each band keeps its own pattern in tiles, ghost tiles, the player body and the HUD cell, so color is never the only signal. A and B use the geometry from `src/fx/patterns.ts` (ported 1:1); C has hand-placed pixel versions of the same five ids.
- Solid vs ghost is never only hue: solid = opaque fill + lit lip + dark pattern + glow/shadow; ghost = hollow dashed outline, no fill, no glow/shadow, pattern drawn as thin colored lines.

### Proposed palette deltas (not applied; all three frames use them)

| Change | Why | Measured |
|---|---|---|
| `safeTile.fill` `#7E88A6` to `#5F6987` | A white exit frame cannot reach 4.5:1 against `#7E88A6` (pure white tops out at about 3.5). At `#5F6987` it is 5.44; the safe tile itself is still 3.57:1 against the background and keeps its `#D5DBEE` outline (14.05) | exit vs safe 5.44 |
| `gears.red.ghost.outline` and `.ink` `#D02536` to `#FF5A6A` | `#D02536` is 2.58:1 against the standing background under protanopia, and 2.10:1 under protanopia on a yellow-tinted background (reds go dark). `#FF5A6A` gives 4.77 and 3.87 and is still dimmer than the solid outline `#F98A94` | min ghost-red 5.14 (A), 5.59 (B), 6.52 (C) |
| `gears.blue.ghost.outline` and `.ink` `#3F73D0` to `#5A93F5` | `#3F73D0` measured 2.94:1 under deuteranopia on the yellow-tinted frame (before this change) | min ghost-blue 4.49 (A), 5.30 (B), 6.53 (C) |
| `ui.panel` `#141826` to `#0F1220` (HUD panel) | red band color as HUD text is 4.42:1 on `#141826` (under the 4.5 text rule); 4.66 on `#0F1220`. Frames use the lighter band *outline* tint for the HUD label, which is 8.06 or better | text 15.77, muted 8.40, band labels 8.06 to 17.58 |
| Background decor luminance cap raised from 0.0055 to 0.013 (A, C) or 0.03 for big poster shapes (B) | The 0.0055 cap is why yellow read as near-neutral: yellow vs standing background was delta-E 9.5. Hue is now carried by wide shapes and gradients, while the flat field right behind tiles stays under 0.013 | see "Yellow vs white" below |

## Direction A: Neon Vector (the GDD default)

**Look.** Near-black field, a faint grid and skyline that take the pace hue. Solid tiles are bright slabs with a lit top edge and a halo; ghosts are empty dashed frames with no halo. The player is a glowing block with a white visor and a soft light pool on the floor. Whole-frame bloom and a vignette (HUD drawn after both so text stays crisp).

**Speed and SHIFT.** Pace hue floods the background (blue, green, olive-amber, deep red; delta-E from standing is 14 / 13 / 22 / 29). Behind the player a tapered comet trail whose colors step back through the bands you passed through (at red: red, orange, yellow, green), three outline afterimages in earlier band colors, additive speed streaks, sparks. The body leans and stretches (up to 8% wider, 4% shorter, 5 degree skew at sprint). Drag-downshift flash and ring burst reuse the existing spec in `style.md`.

**Patterns.** Same `patterns.ts` geometry at 26 px on tiles, 24 px cells on the body, 20 px in the HUD. Dark ink on bright solid fill; thin band-colored lines on ghost.

**Numbers (measured from pixels, after bloom and vignette).**

| Check | Result | Rule |
|---|---|---|
| Ghost outline vs adjacent background, min over the five pace frames | red 5.14, yellow 7.91, blue 4.49 | 3:1 |
| The same under protan / deutan / tritan (min) | red 4.06, yellow 7.42, blue 4.20 | 3:1 |
| Exit frame vs adjacent background / vs safe tile fill | 8.74 / 5.44 | 4.5:1 |
| Worst case vs the brightest background decor (luminance 0.0135): ghost outlines / solid fills / safe fill | 5.45 to 7.63 / 4.13 (red) to 11.71 / 3.04 | 3:1 |
| HUD text vs panel | 15.77 (band labels 8.06 or better) | 4.5:1 |

**Rendering cost in Phaser 3.90.** Everything is cheap except the glow. The tile and player art is plain `Graphics` fills and strokes (same as today's `tileRender.ts`), but bake the level layer once into a `RenderTexture` (or two cached Graphics, solid and ghost, toggled by band) instead of redrawing hundreds of strokes per frame. For glow use one camera-level `postFX.addBloom()` (WebGL only; Phaser's FX run at the 960 x 540 game resolution, not the screen size, so cost does not grow with the itch.io window). Do not put `preFX`/`postFX` glow on each tile or on many objects: every FX object forces its own render-target pass. Per-object halo should be a baked soft sprite or a stacked-stroke underlay. Trail and sparks: a ring buffer of 3 afterimage rects and one `ParticleEmitter` (about 30 live particles). **Reduced effects** turns off bloom and vignette and keeps stroke halos; **reduced motion** removes flash, shake and trail afterimages (the comet stays, drawn static). I did not measure fps (these are Canvas 2D mock-ups); a one-day spike on a mid-range laptop before the build is committed would settle it.

**Estimated build: 4 to 5 days** (tile + player + exit + HUD restyle + trail/particles + background layers + bloom and settings fallbacks), plus about half a day for the scene engineer to wire it and half a day for the ui-engineer to restyle the HUD.

## Direction B: Flat Poster

**Look.** No glow, no post-processing. Flat colour fields, thick ink outlines with a thin light sticker rim, hard offset shadows, halftone dots, a big sun disc and slanted bands behind. Heavy rounded type in the HUD. It looks like a screen-print.

**Speed and SHIFT.** The whole poster re-inks to the pace hue (delta-E from standing 17 / 17 / 24 / 32, the strongest tint of the three). More and wider slanted bands and denser halftone at speed; flat angled speed bars above the head; stepped afterimages (three flat silhouettes, each in an earlier band color); flat dust puffs. Squash and stretch as in A. The downshift event is a hard-edged flat color wipe instead of a soft flash.

**Patterns.** `patterns.ts` geometry at 22 px (the coarse variant), dark ink at 0.9 alpha with strokes 1.2x thicker than the base; ghosts are drawn as outline lines in the full band color.

**Numbers.**

| Check | Result | Rule |
|---|---|---|
| Ghost outline vs adjacent background, min | red 5.59, yellow 12.47, blue 5.30 | 3:1 |
| Same under CVD (min) | red 4.24, yellow 11.43, blue 4.85 | 3:1 |
| Exit vs adjacent background / vs safe fill | 6.29 / 5.44 | 4.5:1 |
| Worst case vs the sun disc (luminance 0.031): ghost outlines / solid fills / safe fill | 4.05 to 9.18 / 3.24 (red) to 9.18 / 2.38 | 3:1 |

The safe fill at 2.38 against the sun disc is only a fill-versus-decor figure; safe tiles are also bounded by a 2 px light rim (14:1) and a 3 px ink line. Rule if B is chosen: decor behind gameplay is capped at luminance 0.02 (the sun disc and wide bands sit in open sky only, or are masked behind tiles).

**Rendering cost.** The cheapest of the three. All `Graphics` and baked textures (halftone and sun disc pre-rendered once; hard shadows are a second pass of the same rects). No shaders, no render targets, so no WebGL-only features and "reduced effects" has nothing to turn off beyond the bands and particles. Same advice as A on baking the static level layer. Risk: lots of overlapping opaque shapes is fill-rate cheap at 960 x 540 but the screen can feel busy; the poster bands need to be toned down near the player in dense levels.

**Estimated build: 3 to 4 days** (it reuses the existing tile code the most; the extra work is the sticker rims, halftone and shadow passes, type and the HUD).

## Direction C: Pixel Dither

**Look.** Rendered at 480 x 270 and scaled 2x with nearest neighbour (16 px tiles, 12 x 24 player): matches the existing `pixelArt: true` config. Ordered (Bayer) dithering for the horizon glow, the fades and the ghost fill; two dark silhouette ridges for depth; 1 px outlines; a 5 x 7 pixel font.

**Speed and SHIFT.** Horizon dither takes the pace hue (delta-E 15 / 14 / 20 / 29). Dithered afterimages in earlier band colors (50%, 25%, 12% density), 1 px speed lines that fade out by dither, dust pixels, a 2 to 3 px lean of the top of the sprite. Downshift flash is a two-frame dither wipe.

**Patterns.** Own pixel versions: stripes (2 px bars), dots (2 x 2), chevrons (diagonal "^" rows), crosshatch (diagonal lattice), 1 px at lo-res = 2 px on screen. Measured on the 12 x 10 tile cell: ink coverage stripes 40%, dots 16.7%, chevrons 25%, crosshatch 35%; the closest pair (plain vs dots) differs on 16.7% of pixels, just above the repo's 15% rule, so dots has the least margin and would be the one to thicken.

**Numbers.**

| Check | Result | Rule |
|---|---|---|
| Ghost outline vs adjacent background, min | red 6.52, yellow 9.20, blue 6.53 | 3:1 |
| Same under CVD (min) | red 4.90, yellow 8.58, blue 6.09 | 3:1 |
| Exit vs adjacent background / vs safe fill | 16.96 / 5.44 | 4.5:1 |
| Worst case vs brightest decor (0.0135) | same as A | 3:1 |

The ghost outlines are the best of the three because the background behind tiles is flat and dark (no bloom to lift it).

**Rendering cost.** Lowest runtime cost, highest content cost. Options: run the game at 480 x 270 (needs the game config and camera changed, which is tech-lead's area) or keep 960 x 540 and draw everything on a 2x grid (cheaper to adopt but loses the clean "no half pixels" guarantee). Dithers are pre-baked into small textures (no shader), the font is a bitmap font asset, and the player needs real sprite frames (stand, run x4, jump, fall) with the pattern overlaid per band. The world has no soft light, so "glow" is dither. Weak points: the player body is only 12 x 24 px so a band pattern on it is 10 x 15 (readable, but the smallest of the three), and the 1 px dashed ghost outlines are thin if the itch.io iframe scales below 1x.

**Estimated build: 6 to 8 days** (480 x 270 pipeline, sprite frames x bands, pattern textures, bitmap font, dither textures, HUD rebuild).

## Yellow vs white (design-lead's ask 4) and the tint, all directions

Delta-E (CIE76) of the sky background at each pace against standing, sampled from the rendered frames:

| | blue | green | yellow | red |
|---|---|---|---|---|
| today (`backgroundForSpeed`) | 7.5 | 6.2 | **9.5** | 13.3 |
| A | 14.0 | 13.4 | **22.3** | 29.0 |
| B | 17.0 | 17.5 | **23.9** | 31.6 |
| C | 14.9 | 14.3 | **20.1** | 28.6 |

Yellow is now over twice as far from standing as before in every direction.

## Color vision

`*-cvd.png` shows the main frame under Machado 2009 protanopia, deuteranopia and tritanopia (severity 1.0). In all three the red bridge ghost, the yellow tiles and the blue ghost are told apart by pattern and by solid versus dashed even where hue collapses (for example, under protanopia and deuteranopia the red ghost turns a muddy olive-brown, close to the yellow-tinted background; the dashed frame and crosshatch still show). The two outline changes in the table above are what keep red and blue ghosts at 4:1 or better under each simulation. The five solid band colors are unchanged from `docs/art/accessibility.md` (min delta-E 25, hardest pair green/red at 33.8 under deuteranopia).

## Mechanics sketch (`mechanics-strip.png`, direction A)

Mud, ice, boost pad and speed camera gate, each with its own silhouette and its own mark, in hues outside the white-to-red spectrum so none reads as a gear color, and each shown again in greyscale.

- **Mud**: brown, wavy lip, blob rings, drips hanging below the tile. Delta-E to the nearest band color: 47 normal, 10 under protanopia (to red), so shape and rings do the work there.
- **Ice**: pale cyan, chamfered corners, two diagonal glints, white lip. Nearest band color is white: 24 normal, 12 under protanopia; the cut corners and glints separate it.
- **Boost pad**: hot magenta `#FF4FD8`, only half a tile tall, solid right-pointing arrows (the yellow gear's up-chevrons are strokes, not filled triangles). I moved it off violet because violet was 1.4 delta-E from blue under deuteranopia; magenta is 11.3 or more from every band color in every simulation.
- **Speed camera gate**: two posts and a lintel with a camera housing, lens ring and dashed beam in the required pace color, plus a sign above the lintel showing that pace's color and pattern (shown at yellow with chevrons). If design-lead wants a gate that accepts "this band or faster", the sign could show an arrow beside the pattern.

These are sketches of intent, not specs: effects (how slow is mud, what does the camera do) are design-lead's call. None of the four reuses a band pattern.

## Recommendation: A, Neon Vector, with two borrowings from B

Choose **A** because it is the best fit for the theme and the rules with the least new risk:

1. **It is the only direction where light is the language.** Solid = lit and glowing, ghost = unlit and empty; pace = the color of the light, the trail literally shifts back through the colors you passed. That is "redshift" in one image and it makes the solid/ghost difference larger than outline and fill alone (a halo is a third cue).
2. **It builds on what exists.** Tiles are already `Graphics` strokes and fills in `src/fx/tileRender.ts`; the new work is layering, not replacing. B is cheaper still and C is more expensive and touches the game config.
3. **Graceful degradation is natural.** Bloom is one camera effect; turn it off and the stroke halos remain. A reduced-effects player still gets a complete, readable game (the bloom is soft light only; I have not rendered a no-bloom variant of the frames).
4. Its ghost contrast is the thinnest of the three (blue ghost 4.49 worst case, because bloom lifts the background near bright tiles), so keep the bloom threshold and strength conservative and keep ghosts out of any glow radius. That is a tuning constraint, not a blocker.

Take from B: the **thick ink keyline around the player** (already in A as a 2 px background-colored line; B's bolder 3 px line plus light sticker rim reads better on a same-colored floor) and B's **flat color wipe** as the reduced-motion downshift event. If the performance spike shows bloom is too heavy on a mid-range laptop, B is the fallback with no rework of the palette: only the glow underlay and post pass go.

C is the charm pick if the studio wants a retro identity and has the days to spare; I would not take it at this schedule (6 to 8 days against a Nov 22 content freeze) and its patterns are the least forgiving for color-blind players.

## Open risk (all directions)

Red keeps its crosshatch. With the lit lip it reads as a ledge in every frame, but a ghost red bridge (an empty frame full of diagonal lines) can still look like a grate. If the next playtest repeats that, swap red's pattern for a pattern that is not a lattice (for example a double forward chevron or diamond row), which needs a coordinated change to `patterns.ts` and its tests. I have not changed it.

## Not shown in these frames

The existing HUD's Q / shift key hints and the in-air drag meter and pending-shift bracket (they are unchanged from `docs/design/features/hud-gear-meter.md` and would get the same restyle); per-level title; pause, death and win screens; the drag-downshift flash and ring burst (specified in `docs/art/style.md`, not drawn in a still).
