# Redshift: Palette and Accessibility

_Owner: art-director. Source of truth for values: `src/data/palette.json`. Checked by `src/fx/accessibility.test.ts`, `src/fx/patterns.test.ts`, `src/fx/background.test.ts` and `src/fx/pixel/*.test.ts` (run by `npm test`). If a number here disagrees with the tests, the tests win._

Rule: **color is never the only signal.** Every band has a pattern, every tile you can stand on differs from one you will fall through in fill, outline and brightness (not just hue), and every pair of band colors stays separable under the three dichromacies.

## 1. Palette

Background: `#0B0D14` (near-black). Contrast ratios are WCAG 2.x against that background.

| Band | Speed | Pattern | Solid fill | Solid outline | Ghost outline | Fill contrast | Ghost outline contrast |
|---|---|---|---|---|---|---|---|
| white (standing) | 0 | plain (no marks) | `#F2F4FF` | `#F7F8FF` | `#C4C6D0` | 17.71 | 11.40 |
| blue (gear 1) | 3 | stripes | `#4C8DFF` | `#94BBFF` | `#4F86E8` | 6.06 | 5.46 |
| green (gear 2) | 6 | dots | `#5CF29B` | `#A4F8C6` | `#40D88C` | 13.52 | 10.55 |
| yellow (gear 3) | 9 | chevrons | `#FFD60A` | `#FFE66C` | `#CEAE0C` | 13.75 | 8.95 |
| red (gear 4) | 12 | checker | `#F5283C` | `#F98A94` | `#E11E3A` | 4.85 | 4.11 |

Safe tile (`#`, always solid, drawn grey, no pattern): fill `#5F6987` (3.57:1; was `#7E88A6`, darkened 2026-11-03 so a white exit frame reaches 5.44:1 against it), outline `#D5DBEE` (14.05:1). It is the only plain tile, so "plain grey" always means "safe to stop here".

UI colors: text `#E8ECF8`, muted text `#A3AECB`, panel `#0F1220` (was `#141826`; red band color as HUD text is 4.66 on it, 4.42 on the old one), panel border `#5A6590`, focus ring `#FFFFFF`. Drag-downshift flash: `#FFFFFF` at 0.35 alpha for 120 ms.

### Colors changed on 2026-11-03 (direction C pick)
- **Safe fill** `#7E88A6` to `#5F6987`. **Ghost outlines** blue `#3F73D0` to `#4F86E8`, green `#4CC480` to `#40D88C`, red `#D02536` to `#E11E3A` (ink follows). The old red ghost was 2.58:1 against the standing background under protanopia (reds go dark) and the old blue 2.94:1 under deuteranopia on a tinted background. The new set keeps every pair of ghost outlines at least 27.8 delta-E apart under every vision (it was found by search: a lighter red collapsed into green under deuteranopia). Residual: protanopia, red ghost against the tinted backgrounds is 2.46:1, below 3 but above the old 2.30 (a floor of 2.4 is tested); the checker pattern, the dashes and the corners carry it.
- **Red pattern** crosshatch to checker (design-lead: a lattice reads as grating or a hazard).
- **HUD panel** `#141826` to `#0F1220`. **Decor luminance cap** 0.0055 to 0.013 (section 7).
- All of the above are in `src/data/palette.json` and covered by `src/fx` tests.

### Colors changed from the first draft
- Green: `#2EE66B` to `#5CF29B`, red: `#FF3B4E` to `#F5283C`. The first pair were nearly the same lightness, so deuteranopia pushed green and red to a delta-E of 16 (not separable). Making green lighter and red darker and more saturated lifts that to 34 while keeping red at 4.85:1.
- Ghost outlines are the band color mixed 20% toward the background (30% pushed red and blue under 3:1). Red's is only 14% toward it (`#C62334` to `#D02536`) because the tinted background (section 7) lifts the red ghost fill and `#C62334` fell to 2.9:1 against it.

## 2. Contrast results

All pass; thresholds are WCAG 1.4.11 (3:1 for gameplay and UI components) and 1.4.3 (4.5:1 for text).

| Check | Result | Required |
|---|---|---|
| Solid fills, solid outlines, ghost outlines, safe tile vs background | min 3.57 (safe fill); lowest ghost outline 4.11 (red); every other value is higher (table above) | 3:1 |
| Pattern marks vs the tile under them (solid, ink at 0.75 alpha) | white 8.48, blue 4.27, green 7.34, yellow 7.44, red 3.82 | 3:1 |
| Pattern marks vs the tile under them (ghost, ink at 1.0 alpha) | white 8.56, blue 4.76, green 8.35, yellow 7.09, red 3.78 | 3:1 |
| Focus ring, panel border vs background | 19.41, 3.42 | 3:1 |
| Text `#E8ECF8` vs background / panel | 16.44 / 15.77 | 4.5:1 |
| Muted text `#A3AECB` vs background / panel | 8.76 / 8.40 | 4.5:1 |
| Band colors used as HUD text vs panel (fill) | min 4.66 (red); on the bare tinted background use the light outline tint instead (red 7.3+) | 4.5:1 |

## 3. Color-vision deficiency results

Simulation: **Machado, Oliveira and Fernandes (2009), severity 1.0** (complete dichromacy), applied to linear RGB (`MACHADO_2009` in `src/fx/color.ts`). Distance: **CIE76 delta-E** in CIELAB (D65).

**Minimum distance: 25.** CIE76's just-noticeable difference is about 2.3. Two colors that merely differ by a JND are only separable side by side; a player has to identify a single tile's band while moving, so we require roughly ten JNDs. 25 is also comfortably above the 10 to 20 range usually quoted as "clearly different" for categorical colors, and the palette clears it with margin. This is a screening number, not a guarantee; the patterns are the real backstop.

Closest pair among the five solid band colors:

| Vision | Closest pair | delta-E | Result |
|---|---|---|---|
| normal | white-blue | 69.6 | pass |
| protanopia | white-green | 44.8 | pass |
| deuteranopia | green-red | 33.8 (the hardest pair) | pass |
| tritanopia | white-yellow | 29.6 | pass |

Closest pair among the five ghost outline colors (dimmer, so slightly closer):

| Vision | Closest pair | delta-E | Result |
|---|---|---|---|
| normal | white-blue | 56.2 | pass |
| protanopia | white-green | 39.5 | pass |
| deuteranopia | white-green | 27.8 | pass |
| tritanopia | blue-green | 29.8 | pass |

The grey safe tile against each solid band color: minimum 30.8 (blue under tritanopia), all others 42 or more. Tested for normal vision and all three types.

## 4. Patterns (the backstop)

One pattern per band, drawn in the same place on tiles, the player body and the HUD gear meter. Geometry is `patternGeometry()` in `src/fx/patterns.ts` and is coarser below 24 px (3 stripes, 2x2 dots, 2 chevron rows) so it stays legible in the HUD.

| Band | Pattern | Description | Ink coverage at 32 px / 16 px |
|---|---|---|---|
| white | plain | no marks; the player at rest | 0% |
| blue | stripes | horizontal bars (4 at tile size) | 38% / 19% |
| green | dots | dot grid (3x3 at tile size) | 20% / 19% |
| yellow | chevrons | upward "^" rows (3 at tile size) | 17% / 16% |
| red | checker | 2x2 (16 px) or 4x4 (32 px) checkerboard of square cells, ink on half of them | 50% / 50% |

Tests rasterize each pattern and require ink coverage between 10% and 55% (readable, not blank or solid) and every pair of patterns (plain included) to differ on at least 15% of pixels, at both 32 px and 16 px. The rasteriser draws lines with butt caps, as Phaser does (it used round caps before, which flattered thin strokes). Measured minimum: 16.6% at 32 px and 15.6% at 16 px (plain vs chevrons, the sparsest marked pattern; chevron strokes are 1.25x thicker below 24 px for that reason). These vector patterns are the fallback for the 960 x 540 renderer; direction C uses the pixel patterns in section 8. The minimum stroke is 1.5 px (`pattern.minStrokePx`), so lines do not vanish at HUD size.

## 5. Solid vs ghost

A **solid** tile is one you can stand on right now (band matches). A **ghost** tile is a colored tile you would fall through. They differ in fill, outline style, outline width and brightness, not just hue:

| | Solid | Ghost |
|---|---|---|
| Fill | band color, 100% opaque | band color at 12% alpha (near-black wash) |
| Outline | continuous, 2.5 px, light tint of the band color | dashed (5 px on, 4 px off), 1.5 px, band color dimmed 20% toward the background |
| Pattern marks | dark ink (`#0B0D14`, 75% alpha) on the bright fill | band color (outline tint), 100% alpha, on the near-black fill |
| Feel | a bright slab | an empty frame |

Tests assert: ghost fill alpha is under a quarter of solid fill alpha; solid vs ghost fill contrast is at least 3:1 for every band (measured min 4.47, red); ghost outline is dashed and thinner; ghost outline luminance is lower than solid outline luminance for every band.

The mapping of when a colored tile is drawn solid or ghost (band matches or not, plus grace) belongs to the renderer; `src/fx/tileRender.ts` only draws the two treatments (`drawGearTile(g, band, 'solid' | 'ghost', x, y, size)`).

## 6. Player body (0.75 x 1.5 tiles)

`drawGearBody(g, band, x, y, width, height, { facing, halo })` in `src/fx/tileRender.ts`; geometry in `src/fx/bodyGeometry.ts` (pure, unit-tested). The body is the solid treatment of the current band: fill, 2.5 px outline, then the band's pattern as **square tile-pattern cells stacked down the box**. At 24 x 48 px that is two full 24 px tile patterns (4 stripes, 3x3 dots, 3 chevron rows, crosshatch each), so the body reads like the tiles it can stand on. A dark facing notch (about 5 px) sits near the top on the leading side; a soft halo (6 px stroke, 18% alpha) is the cheap glow.

Tests rasterise every body pattern at 24 x 48 and require ink coverage between 10% and 55% and every pair of patterns (plain included) to differ on at least 15% of pixels, plus geometry checks (shapes stay inside the box; cell count and centring for non-square boxes; notch inside the outline).

## 7. Tinted background (the world colour at every speed)

The background is not constant: it takes a hue from the player's speed (`backgroundForSpeed(speed, topSpeed)` in `src/fx/palette.ts`). **Standing it is `#0B0D14` to within one 8-bit step.** Each band pulls it toward a dark version of the band hue, at a fixed relative luminance of 0.013 (palette `tint.maxBackgroundLuminance`, raised from 0.0055 on 2026-11-03: at 0.0055 yellow was only 9.5 delta-E from standing and read as near-neutral grey; now 17.7), in proportion to how saturated the tint is (`tint.backgroundStrength` 0.85); white has almost no saturation, so it adds nothing.

| Speed (tiles/s) | Tint | Background | Luminance |
|---|---|---|---|
| 0 | white | `#0C0E15` | 0.0044 |
| 3 | blue | `#0B172C` | 0.0086 |
| 6 | green | `#091913` | 0.0079 |
| 9 | yellow | `#201A04` | 0.0108 |
| 12 | red | `#33070C` | 0.0087 |

Bug this replaced: the scene mixed the background 16% toward the raw tint colour, and the tint at speed 0 is white `#F2F4FF`, so the standing background rendered as medium grey (about `#2E3036` in screenshots, luminance 0.03, 8 times brighter than the palette). Against that grey the old red ghost outline `#C62334` is about 2.3:1. `tint.strength` (the raw-colour mix, kept for the glow and trail) is now 0.03; at that strength even the old formula passes every check below (tested on both paths).

`src/fx/background.test.ts` samples 101 speeds from 0 to top speed for both the helper and the old formula and takes the worst case. Worst case is at yellow (speed 9), the lightest tint; red-ghost checks are the tightest.

| Element vs tinted background | Worst case | Required |
|---|---|---|
| Safe fill / outline | 3.17 / 12.49 | 3:1 |
| Solid fills: white, blue, green, yellow, red | 15.75, 5.39, 12.03, 12.23, 4.32 | 3:1 |
| Solid outlines (min over bands) | 7.47 | 3:1 |
| Ghost outlines: white, blue, green, yellow, red | 10.14, 4.86, 9.39, 7.96, 3.66 | 3:1 |
| Ghost pattern marks on the ghost fill (fill follows the background): red, blue (others 5.9 and up) | 3.29, 4.19 | 3:1 |
| Solid fill vs ghost fill (min) | 3.89 | 3:1 |
| Focus ring, panel border | 17.27, 3.04 | 3:1 |
| UI text, muted text | 14.62, 7.79 | 4.5:1 |
| Band outline tints as text on the bare background (min) | 7.47 | 4.5:1 |

The band **fill** colours are no longer promised as text on the bare background (red fill is 4.32 there); on it use the outline tint. On the HUD panel the fills are at least 4.66 (tested). Rule for any future tint change: the flat background's relative luminance must stay under 0.013 at every speed; the safe fill (3.17) and the red ghost outline and marks have the least slack.

## 8. Direction C: pixel patterns, tiles, sprites (2026-11-03)

Studio owner picked direction C (Pixel Dither): 480 x 270 view, 16 px tiles, 12 x 24 bodies. Its patterns are integer-grid masks, `pixelPatternOn` and `pixelPatternMask` in `src/fx/patterns.ts`, drawn on the cells in `PIXEL_CELLS`: the tile body (12 x 10), the player torso (10 x 11) and the HUD cell (12 x 8).

| Band | Pixel pattern | Period / size |
|---|---|---|
| white | plain | none |
| blue | stripes | 2 px bars, every 5 rows |
| green | dots | 2 x 2 dots, every 4 columns and 3 rows |
| yellow | chevrons | 2 px "^" lines, every 5 rows, centred on the cell |
| red | checker | 4 x 4 px squares, two colours |

The old weakest pair was 16.7% (dots vs plain). The patterns now differ in structure (bars, a dot matrix, diagonals, big blocks), every mark is at least 2 px wide (so it survives 2x integer scaling and an iframe shrunk below 1x), and the checks hold at every phase the cell can be drawn at (the body torso and a tile start on different rows):

| Check (`src/fx/patterns.test.ts`) | Result | Rule |
|---|---|---|
| Ink coverage, any phase: tile / body / HUD cell | 30 to 53% / 25 to 53% / 25 to 50% | 20 to 55% |
| Any two marked patterns differ on, any relative phase: tile / body / HUD | 40.0 / 43.6 / 37.5% | 30% |
| Plain vs any marked pattern: tile / body / HUD | 30.0 / 25.5 / 25.0% | 20% |
| Horizontal run length of every mark | at least 2 px | 2 px |
| Pairs after 2x2 averaging (a half-scale view) | at least 15% mean difference | 15% |

**Read back from the baked pixels (`src/fx/pixel/tiles.test.ts`).** Each solid tile is rendered, then the ink mask is recovered the way a viewer would see it, under greyscale and under protanopia, deuteranopia and tritanopia (pixels clearly different from the fill), and the nearest of the five patterns must be the band's: it is, for every band and every vision. Ink against fill is at least 3:1 under all four (protanopia red was 2.89 with a softened ink and is 3.17 with the palette ink at full strength; that is why pixel ink is the full `ink` colour). Ghost tiles of any two bands differ on at least 15% of the pattern cell, and ghost marks are the hollow rim of the solid marks.

**Solid vs ghost in pixels.** A solid tile is 100% opaque with a lit two-row top edge brighter than its fill, a shade row, a pattern and a light outline on exposed edges. A ghost is under 45% opaque, has no lit edge, only the rim of its marks, and a 1 px outline dashed 3 on 2 off with solid corners. Tests assert both.

**Contrast against the pixel background layers** (flat field, pace hue, ridges, at 49 speeds; stars are single pixels and counted for outlines only): solid fills and the safe fill are at least 3:1; every outline, every ghost dash pixel in the baked tile and the safe outline are at least 3:1; the exit frame (pure white, used by nothing else) is at least 4.5:1 against all of them, against its doorway, and against the safe fill (5.44).

**Sprites (`src/fx/pixel/player.test.ts`).** Every frame of both bodies (runner and twin), death included, has at least 8 pattern pixels on the body in every marked band; the white band has none by design. A band change changes only pattern cells; everything else in the frame is the same role grid with different colours. The runner and twin silhouettes differ on at least 10 pixels in every frame (the twin has an antenna, chamfered shoulders, a wide stance and two square eyes; the runner has a flat head and one wide visor), so the two bodies are told apart without colour. Both are drawn with a 1 px near-black keyline so a body on a same-coloured floor still separates.

## 9. Not yet covered

- The drag-downshift flash colours are defined here but the flash is not yet drawn by `src/fx` (the scene has its own).
- Reduced-motion and reduced-effects: flash and screen shake must respect both (see `docs/art/style.md`).
- Text drawn directly over geometry (as opposed to the tinted background): keep text on `ui.panel`.

## 10. Tandem: runner and twin (2026-11-04, T-05)

Two bodies share one input and sit in stacked lanes, so the player must tell them apart at 12 x 24 px at a glance, and never by colour alone. Image: `docs/art/pixel/tandem-vision.png` (runner and twin, every band, three poses each, plus the two edge arrows, under normal vision, greyscale, protanopia, deuteranopia and tritanopia, Machado 2009 at severity 1.0). Tests: `src/fx/pixel/tandem.test.ts`.

**What tells them apart (colour-free).** The runner has a flat, wide head with one wide visor; the twin has a one-pixel antenna on a narrow head, chamfered shoulders, two square eyes and a wide stance. The difference is in the outline and silhouette, not in hue or brightness.

| Check | Result | Rule |
|---|---|---|
| Pixels that differ between the *visible* runner and twin silhouettes (a pixel is visible when it is at least 3:1 against the field after the simulation), minimum over 5 bands and every pose including parked | normal 40, greyscale 40, protanopia 40, deuteranopia 40, tritanopia 40 (standing pose: 48 in all five) | at least 10 |
| Top row of the head in greyscale at 1x | twin at most 2 px wide, runner at least 6 px wide, in every band | shape, not hue |
| Band pattern on the torso, minimum pattern pixels in any normal-mode frame of either body (parked: 32) | at least 8 in every marked band | at least 8 |
| Pattern ink against body fill (blue / green / yellow / red) | normal and greyscale 6.06 / 13.52 / 13.75 / 4.85; protanopia 6.77 / 14.58 / 12.77 / 3.23; deuteranopia 5.61 / 12.78 / 14.38 / 5.93; tritanopia 6.72 / 13.35 / 12.71 / 4.89 | at least 3:1 |

The weakest cell is red under protanopia (3.23:1): the checker stays readable there, as it did for tiles (section 8). Standing (white) has no pattern by design; its dark visor and the antenna still separate the two bodies.

**Home (parked).** The parked pose is a different shape from every moving pose (a crouch 4 rows shorter, legs together, closed eyes) plus a 5 x 4 house mark in `ui.text` (16.36:1 against the field). It differs from the standing pose on at least 15 pixels for each body and keeps the band pattern (at least 32 pattern pixels). A parked body does not depend on dimming; the HUD strip dims as well, but the strip also shows the house glyph.

**HUD glyphs and the edge arrow.** The silhouette glyphs are 7 x 12 masks that differ on 31 of 84 cells (antenna and eye holes against a wide visor gap), so a strip says which body it belongs to without colour. The edge arrow adds a 1 px `ui.text` outline and a panel fill around the same silhouette; the band-coloured silhouette is at least 3:1 against the panel in every vision (normal 4.66, greyscale 4.66, protanopia 3.09, deuteranopia 5.40, tritanopia 4.69; the minimum is red). The two arrows differ on the silhouette pixels inside in every band.

**Lane divider.** The divider is the ordinary safe tile (grey fill 3:1 or better against the field, section 8), at least one tile thick, so both lanes stand on the same plain ground; in `docs/art/pixel/tandem-scene.png` it is the one grey slab between the lanes, with a lit top lip and outlines on both faces.

**Not covered.** The strips' own layout (band cells, bracket, needle) belongs to ui-engineer (T-06); it must reuse the glyphs above and keep the pattern in the lit cell (section 8).
