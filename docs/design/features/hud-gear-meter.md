# Feature: HUD gear meter

_Owner: design-lead. Milestone: **M1** (pulled forward from M2-08 by M1-29, 2026-11-03). GDD: §11, §4.2, §4.9. Builder: ui-engineer (component, `src/ui/`); mounted by gameplay-engineer [scene]._

## Rule

An always-visible strip of five cells, **white · 1 blue · 2 green · 3 yellow · 4 red**, shows three things at once: the **lit cell is your color** (the colored tiles you can stand on right now), a **bracket marks the selected gear** (where holding an arrow will take you), and a **speed needle** slides between them as you ramp or brake. A first-time player reads "I am gear 1 of 4, red is gear 4, I am getting there" without text.

## Layout (fixed for M1; numbers are UI, not tuning)

- Top-left of the 960×540 view, on a `palette.ui.panel` backing, at most 220 × 64 px. Never covers the play area's first row of tiles more than the level title already does.
- Five square cells in a row, each ≥ 24 px, drawn with `drawGearGlyph(g, band, x, y, size)` (color **and** pattern). Cell 0 is the white/safe glyph with no digit; cells 1–4 carry the digit 1–4 beneath them.
- **Lit cell** (= `band`): full brightness and fill. Other cells: dim (ghost treatment), pattern still visible.
- **Selected-gear bracket** (= `gear`): a bold frame around cell `gear` (and its digit drawn bright). Shape-based, so it reads in greyscale.
- **Speed needle**: a small tick under the row. Position is linear in speed: `needle = clamp(|vx| / 3, 0, 4)` cell widths from the center of cell 0. Because gear speeds are 0/3/6/9/12 and band edges are 1.5/4.5/7.5/10.5, each cruise speed sits at a cell center and each band edge on a cell boundary. Compute the divisor from tuning (`gearSpeeds[1]`), do not hard-code 3.
- **Drag meter** (air only): a thin bar under the needle row that fills `min(airDistance / airDragTilesPerGear, 1)`.
- **Pending shift** (air only): a hollow/dashed bracket on cell `clamp(gear + shiftBufferNet, minGear, 4)` while `shiftBufferSteps > 0` and `shiftBufferNet ≠ 0`.
- **Key hints (Should):** small key-cap glyphs left and right of the strip: `Q` / `⇧` (down) on the left, `E` / `⇧` (up) on the right. Static.

## Inputs

A plain object read every rendered frame from the latest sim state; the HUD keeps no state of its own except the flash timer:
`{ gear, band, speed: |vx|, grounded, airDistance, shiftBufferNet, shiftBufferSteps }` plus tuning `gearSpeeds`, `minGear`, `airDragTilesPerGear`, `airDragMinBand`. Provide a pure `hudModel(input, tuning)` returning `{ litBand, selectedGear, needle, dragFill | null, pendingGear | null }`; drawing only reads that.

## Edge cases

- **Spawn / standing:** lit = white, bracket on the selected gear, needle at cell 0. Shifting while standing moves only the bracket.
- **Ramping, braking, skidding:** needle moves with `|vx|` (a skid goes down to white's side then back up). Lit cell changes on exactly the step `band` changes; no smoothing or tweening of the lit cell or bracket. The needle may ease visually by at most 1 frame; never ahead of the sim.
- **Let go:** bracket stays where it was (gear is remembered at rest; this is how players learn it).
- **Pushing a wall:** speed 0, lit white, bracket unchanged.
- **Air, gear follows color down:** the sim lowers `gear` in flight; the bracket moves with it on that step. Do not show the pre-flight gear.
- **Drag drop:** needle snaps down one cell on the drop step and the newly lit cell pulses once (brightness, not just hue). Reduced motion: no pulse, snap only.
- **Drag meter visibility:** shown only while airborne **and** `band > airDragMinBand`. Hidden at blue and white even though `airDistance` keeps growing (GDD §4.9). After a drop it restarts from the carried-over remainder (`airDistance` already holds it). Hidden on the landing step.
- **Shift buffer:** pending bracket appears on the press, moves with further presses (net), disappears when the 6-step window expires or on landing (then the solid bracket shows the applied gear). Clamp at 1 and 4: a press that can't change the gear shows no pending bracket. This is the in-air shift hint the playtest asked for.
- **Death freeze:** show the frozen state; on respawn everything shows the reset state (white, bracket 1).
- **Grace:** not shown (the lit cell is the current band only).
- **Speed above 12** (none in M1; boost pads later): needle clamps at cell 4.
- **Pause / win:** meter stays visible, frozen.

## Tuning

Reads only: `gearSpeeds`, `minGear`, `airDragTilesPerGear`, `airDragMinBand`. No new keys. Layout sizes are UI constants in `src/ui/`.

## Acceptance

Unit (pure `hudModel`), using sim states from the M1 specs:
1. Initial state: `litBand 0`, `selectedGear 1`, `needle 0`, `dragFill null`, `pendingGear null`.
2. Standing, three up-presses: `selectedGear 4`, `litBand 0`, `needle 0`.
3. Gear 4, hold Right from rest: `litBand` equals `state.band` every step (2 on step 10, 3 on step 23, 4 on step 32); `needle` is non-decreasing and `= 4` from step 36.
4. Let go at full sprint: `needle` reaches 0, `selectedGear` stays 4.
5. Gear-4 flat jump: `dragFill` non-null from the takeoff step and rising; on the drop step (flight step 30) it wraps to the carried remainder (< 0.2) and `litBand` becomes 3; it keeps rising while yellow; `dragFill null` on the landing step.
6. Gear-1 (blue) flight of any length and a standing (white) jump: `dragFill` always null.
7. Gear-1 walking jump (48-step flight), up-press on flight step 10: `pendingGear` 2 on the press step, null exactly when `shiftBufferSteps` reaches 0 (at most 6 steps later); landing gear unchanged. Up-press 3 steps before landing: `pendingGear` set until landing, then `selectedGear` shows the applied gear.
8. Up-press while airborne at gear 4: `pendingGear null`.
9. After death or R: same model as check 1.
10. `needle` divisor comes from `gearSpeeds[1]` (test with a doctored tuning).

Visual / manual (qa-tester):
11. Greyscale screenshot: each cell is identifiable by pattern; lit vs dim and the bracket are visible without color.
12. Lit-cell glyphs and the bracket have ≥ 3:1 contrast against `palette.ui.panel`.
13. In w0-02, a fresh player can say the target gear for red before reaching the red bridge (next playtest question).

## Priority

- **Must (M1):** five cells with patterns, lit band, selected-gear bracket, speed needle, reset on death.
- **Should (M1 if it fits by Nov 7, else M2):** drag meter, pending-shift bracket, drop pulse, key-cap hints.
- **Could:** runway hint (distance still needed to reach the bracket's color). Not now: it would solve the puzzle for the player (pillar 1).
