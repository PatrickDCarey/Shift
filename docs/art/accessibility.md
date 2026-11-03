# Redshift: Palette and Accessibility

_Owner: art-director. Source of truth for values: `src/data/palette.json`. Checked by `src/fx/accessibility.test.ts` and `src/fx/patterns.test.ts` (run by `npm test`). If a number here disagrees with the tests, the tests win._

Rule: **color is never the only signal.** Every band has a pattern, every tile you can stand on differs from one you will fall through in fill, outline and brightness (not just hue), and every pair of band colors stays separable under the three dichromacies.

## 1. Palette

Background: `#0B0D14` (near-black). Contrast ratios are WCAG 2.x against that background.

| Band | Speed | Pattern | Solid fill | Solid outline | Ghost outline | Fill contrast | Ghost outline contrast |
|---|---|---|---|---|---|---|---|
| white (standing) | 0 | plain (no marks) | `#F2F4FF` | `#F7F8FF` | `#C4C6D0` | 17.71 | 11.40 |
| blue (gear 1) | 3 | stripes | `#4C8DFF` | `#94BBFF` | `#3F73D0` | 6.06 | 4.23 |
| green (gear 2) | 6 | dots | `#5CF29B` | `#A4F8C6` | `#4CC480` | 13.52 | 8.79 |
| yellow (gear 3) | 9 | chevrons | `#FFD60A` | `#FFE66C` | `#CEAE0C` | 13.75 | 8.95 |
| red (gear 4) | 12 | crosshatch | `#F5283C` | `#F98A94` | `#D02536` | 4.85 | 3.70 |

Safe tile (`#`, always solid, drawn grey, no pattern): fill `#7E88A6` (5.51:1), outline `#D5DBEE` (14.05:1). It is the only plain tile, so "plain grey" always means "safe to stop here".

UI colors: text `#E8ECF8`, muted text `#A3AECB`, panel `#141826`, panel border `#5A6590`, focus ring `#FFFFFF`. Drag-downshift flash: `#FFFFFF` at 0.35 alpha for 120 ms.

### Colors changed from the first draft
- Green: `#2EE66B` to `#5CF29B`, red: `#FF3B4E` to `#F5283C`. The first pair were nearly the same lightness, so deuteranopia pushed green and red to a delta-E of 16 (not separable). Making green lighter and red darker and more saturated lifts that to 34 while keeping red at 4.85:1.
- Ghost outlines are the band color mixed 20% toward the background (30% pushed red and blue under 3:1). Red's is only 14% toward it (`#C62334` to `#D02536`) because the tinted background (section 7) lifts the red ghost fill and `#C62334` fell to 2.9:1 against it.

## 2. Contrast results

All pass; thresholds are WCAG 1.4.11 (3:1 for gameplay and UI components) and 1.4.3 (4.5:1 for text).

| Check | Result | Required |
|---|---|---|
| Solid fills, solid outlines, ghost outlines, safe tile vs background | min 3.70 (red ghost outline); every other value is higher (table above) | 3:1 |
| Pattern marks vs the tile under them (solid, ink at 0.75 alpha) | white 8.48, blue 4.27, green 7.34, yellow 7.44, red 3.82 | 3:1 |
| Pattern marks vs the tile under them (ghost, ink at 1.0 alpha) | white 8.56, blue 3.69, green 6.96, yellow 7.09, red 3.40 | 3:1 |
| Focus ring, panel border vs background | 19.41, 3.42 | 3:1 |
| Text `#E8ECF8` vs background / panel | 16.44 / 14.97 | 4.5:1 |
| Muted text `#A3AECB` vs background / panel | 8.76 / 7.97 | 4.5:1 |
| Band colors used as HUD text vs background | min 4.85 (red) | 4.5:1 |

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
| normal | white-blue | 58.3 | pass |
| protanopia | white-green | 37.2 | pass |
| deuteranopia | green-red | 27.7 | pass |
| tritanopia | blue-green | 28.9 | pass |

The grey safe tile against each solid band color: minimum 26 (blue under tritanopia), all others 40 or more. Tested for normal vision and all three types.

## 4. Patterns (the backstop)

One pattern per band, drawn in the same place on tiles, the player body and the HUD gear meter. Geometry is `patternGeometry()` in `src/fx/patterns.ts` and is coarser below 24 px (3 stripes, 2x2 dots, 2 chevron rows) so it stays legible in the HUD.

| Band | Pattern | Description | Ink coverage at 32 px / 16 px |
|---|---|---|---|
| white | plain | no marks; the player at rest | 0% |
| blue | stripes | horizontal bars (4 at tile size) | 42% / 22% |
| green | dots | dot grid (3x3 at tile size) | 20% / 19% |
| yellow | chevrons | upward "^" rows (3 at tile size) | 18% / 16% |
| red | crosshatch | diagonal lattice | 39% / 38% |

Tests rasterize each pattern and require ink coverage between 10% and 55% (readable, not blank or solid) and every pair of patterns (plain included) to differ on at least 15% of pixels, at both 32 px and 16 px. Measured minimum: 18% at 32 px and 16% at 16 px (plain vs chevrons, the sparsest marked pattern). The minimum stroke is 1.5 px (`pattern.minStrokePx`), so lines do not vanish at HUD size.

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

The background is not constant: it takes a hue from the player's speed (`backgroundForSpeed(speed, topSpeed)` in `src/fx/palette.ts`). **Standing it is exactly `#0B0D14`.** Each band pulls it toward a dark version of the band hue, at a fixed relative luminance of 0.0055 (palette `tint.maxBackgroundLuminance`), in proportion to how saturated the tint is (`tint.backgroundStrength` 0.85); white has almost no saturation, so it adds nothing.

| Speed (tiles/s) | Tint | Background | Luminance |
|---|---|---|---|
| 0 | white | `#0B0D14` | 0.0041 |
| 3 | blue | `#070F1F` | 0.0048 |
| 6 | green | `#07110E` | 0.0047 |
| 9 | yellow | `#141004` | 0.0052 |
| 12 | red | `#210509` | 0.0046 |

Bug this replaced: the scene mixed the background 16% toward the raw tint colour, and the tint at speed 0 is white `#F2F4FF`, so the standing background rendered as medium grey (about `#2E3036` in screenshots, luminance 0.03, 8 times brighter than the palette). Against that grey the old red ghost outline `#C62334` is about 2.3:1. `tint.strength` (the raw-colour mix, kept for the glow and trail) is now 0.03; at that strength even the old formula passes every check below (tested on both paths).

`src/fx/background.test.ts` samples 101 speeds from 0 to top speed for both the helper and the old formula and takes the worst case. Worst case is at yellow (speed 9), the lightest tint; red-ghost checks are the tightest.

| Element vs tinted background | Worst case | Required |
|---|---|---|
| Safe fill / outline | 5.40 / 13.77 | 3:1 |
| Solid fills: white, blue, green, yellow, red | 17.36, 5.95, 13.26, 13.48, 4.76 | 3:1 |
| Solid outlines (min over bands: red) | 8.24 | 3:1 |
| Ghost outlines: white, blue, green, yellow, red | 11.18, 4.14, 8.62, 8.77, 3.62 | 3:1 |
| Ghost pattern marks on the ghost fill (fill follows the background): blue, red | 3.61, 3.25 (others 6.8 and up) | 3:1 |
| Solid fill vs ghost fill (min: red) | 4.27 | 3:1 |
| Focus ring, panel border | 19.03, 3.35 | 3:1 |
| UI text, muted text | 16.11, 8.58 | 4.5:1 |
| Band colours as HUD text (min: red) | 4.76 | 4.5:1 |

Rule for any future tint change: the background's relative luminance must stay under 0.0055 at every speed; the red ghost outline and red ghost marks have the least slack.

## 8. Not yet covered

- The drag-downshift flash colours are defined here but the flash is not yet drawn by `src/fx` (the scene has its own).
- Reduced-motion and reduced-effects: flash and screen shake must respect both (see `docs/art/style.md`).
- Text drawn directly over geometry (as opposed to the tinted background): keep text on `ui.panel`.
