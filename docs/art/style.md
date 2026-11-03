# Redshift: Visual Direction

_Owner: art-director. One page for later work (shaders, particles, player sprite, itch.io art). Values live in `src/data/palette.json`; accessibility rules in `docs/art/accessibility.md`._

## Look

Glowing neon geometry on a near-black background (`#0B0D14`). Everything is flat shapes, crisp edges and light: no textures, no gradients inside tiles. A tile is a bright slab with a lighter rim and a dark pattern; the world around it is quiet so the colors read instantly. Think vector arcade cabinet, not pixel art (the game config uses `pixelArt`, so keep geometry on whole pixels at 32 px tiles).

## The spectrum tint (pace is color)

The whole world's tint slides along the spectrum with the player's **actual** speed. It is a continuous cue; gameplay still uses the discrete bands.

- Stops (`palette.tint.stops`): standing 0 white, 0.25 blue, 0.5 green, 0.75 yellow, 1.0 red, in normalized speed (`|vx| / gearSpeeds[4]`). They are the band fill colors, interpolated in sRGB by `spectrumTint` (`src/fx/color.ts`); `tintForSpeed(speed, topSpeed)` does the lookup.
- The **background** takes it through `backgroundForSpeed(speed, topSpeed)`: a dark hue shift at a fixed luminance cap (0.0055), exactly `#0B0D14` when standing. Do not mix the raw tint colour into the background: white at speed 0 turns it grey (that was a bug, see `docs/art/accessibility.md` section 7). The raw tint (`tintForSpeed`, weight `palette.tint.strength` 0.03) is for the glow and trail only, never over tiles (tile colors must stay true to the palette).
- Smooth the speed before lookup (ease over about 100 ms) so the tint never flickers around a band edge.
- It is the "redshift": slow is cool and pale, sprint is red.
- The band edges are 1.5, 4.5, 7.5 and 10.5 tiles/s; the tint passes through the same colors at the gear speeds 3, 6, 9, 12, so a cruising player sits exactly on a band color.

## Glow

- Glow is additive and soft: outer halo of the band color at low alpha around solid tiles' outline and the player. Ghost tiles get **no glow** (that is part of what makes them read as empty).
- Cheapest first: a duplicated stroke at 2 to 3 widths with falling alpha. Use a post-process bloom only when the "reduced effects" setting is off.
- Keep glow subtle enough that it does not lift the background above about 10% luminance behind text.

## Drag-downshift flash

Requested by design-lead: air drag drops the player one band instantly mid-flight, which is a visible kink, so we sell it as an event.

- Trigger: the sim's `bandChange` event while airborne and the new band is lower (the render side decides; effects never feed back into the sim).
- Effect: a full-screen flash in `palette.flash.color` at `palette.flash.alpha` (0.35) fading over `palette.flash.durationMs` (120 ms), plus the player body and HUD badge switching band color and pattern on the same frame, plus a small ring burst from the player.
- Pairs with the "clunk" SFX (audio-designer). The flash must start on the same frame the sim reports the band change.
- **Reduced motion:** replace the flash with a single-frame color change of the player and the HUD badge (no full-screen flash, no burst). Never flash more than 3 times per second.

## Player

Box (0.75 x 1.5 tiles, 24 x 48 px) filled with the current band color and **the band's pattern** drawn as two stacked tile-pattern cells, drawn by `drawGearBody` (`src/fx/tileRender.ts`). Color comes from actual speed, never the selected gear. The HUD gear meter shows the selected gear and the current band side by side using `drawGearGlyph`; the pattern keeps them apart for color-blind players.

## Tiles

- Solid slab: fill, light outline 2.5 px, dark pattern. Ghost: faint fill, dashed dim outline, tinted pattern.
- Safe tile: flat grey with a light outline and no pattern; the only plain tile.
- Exit: bright white pulse (not a band color), because it is never gated.
- Future (world 3+): mud, ice, boost, conveyor, camera gates need their own silhouettes and patterns that do not reuse the five band patterns.

## Effects budget and settings

- Target 60 fps on a mid-range laptop browser. Effects are render-only and degrade gracefully.
- **Reduced effects** setting turns off post-processing (bloom, tint shader) and keeps the cheap stroke-based glow.
- **Reduced motion** setting disables screen shake and full-screen flashes (see above), and calms the trail.
- Text always sits on `ui.panel` or the plain background, never directly on glowing geometry.

## itch.io art (later)

Cover and screenshots: the same near-black field, a sprinting red player leaving a trail that shifts back through yellow and green to blue, tiles with visible patterns. Always include one ghost tile next to a solid one so the core rule reads from the thumbnail. Check each image in grayscale and under deuteranopia before shipping.
