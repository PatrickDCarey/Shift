# Feature: onboarding hint glyphs

_Owner: design-lead. Milestone: **M2** (M2-01). GDD: §3, pillar 2. Builders: tech-lead (M2-03: hint headers in `level-format.md` and `LevelMeta`, done), gameplay-engineer [level] (M2-04: parse them, done), **gameplay-engineer [scene] (B6-31, Batch 6 wave 2: layout and drawing, both in `src/entities/`; the M2-36 ui renderer was never built and is folded into B6-31)**, level-designer (placement, done for w1-01, w1-02, w2-01, w3-01). Revised 2026-11-16 for the pixel build: nothing drew `level.meta.hints` in the 2026-11-16 playtest build, and the cap labels below now match what the 5×7 font has._

## Rule

Some levels show small **key-cap icons fixed in the level** that say "press this here" without words. They are placed by the level file's hint headers (a glyph id plus an anchor tile), drawn in world space above the tiles and behind the player. They are never solid and are invisible to the sim.

## Glyph set (ids for M2-03)

| Id | Shows | Placed in |
|---|---|---|
| `move` | top row `[←][→]`, bottom row `[A][D]` | **w1-01** above the spawn (Must); **w3-01** above the runner's spawn (Should) |
| `shiftUp` | top row ▲ `[R⇧]`, bottom row `[E][X]` | **w1-02** above the first safe pad (Must); **w2-01** above the start pad (Should); **w3-01** above the runner lane's shift pad (Should) |
| `shiftDown` | top row ▼ `[L⇧]`, bottom row `[Q][Z]` | **w1-02** above the second safe pad (Must) |
| `jump` | top row `[SPACE]`, bottom row `[W][↑]` | **w2-01** above the start pad, before the gap (Must) |

Why the set grew beyond "arrow in w1-01, Shift/E/X in w1-02":
- **`shiftDown`:** w1-02 asks you to shift **back down** on its second pad, and nothing else on screen says which keys do that. The HUD key-cap hints are only Should.
- **`jump`:** w2-01 is the first level that needs a jump, and jump has no hint anywhere else.
- **w2-01 and w3-01 hints:** the owner's unlock rule opens the first level of every world from the start, so a voter can begin at w2-01 or w3-01 without having seen w1-01 or w1-02. The first level of each world must be playable cold.

## Drawing (480×270, 16 px tiles, pixel build)

- **Cap:** a filled rectangle in `ui.panel`, a 1 px outline in `ui.focus`, and the label in the bitmap font `redshift-5x7` (advance 6, cap height 7) tinted `ui.text`, 2 px from the cap's left edge and 2 px from its top. Cap width = 6 × label characters + 5 px (one character: 11 px), height 11 px. The panel fill keeps the caps at ≥ 3:1 over every band tint and over any decor behind them.
- **Cap labels** (the font has every one of these; never draw `keyLabel`'s long Shift names, `L Shift` would be 47 px):

  | Code | Label |
  |---|---|
  | `KeyA` … `KeyZ` | the letter (`keyLabel`) |
  | `ArrowLeft`, `ArrowRight`, `ArrowUp` | `←`, `→`, `↑` (`keyLabel`, font icons) |
  | `ShiftLeft`, `ShiftRight` | `L⇧`, `R⇧` |
  | `Space` | `SPACE` (upper case) |

- **Rows per glyph** (top row, then bottom row; caps left to right, 2 px apart):
  - `move`: `[←][→]` / `[A][D]` (24 px / 24 px)
  - `shiftUp`: `▲` `[R⇧]` / `[E][X]` (the `▲` is the font's triangle, 5 px wide, 2 px left of the cap, vertically centred on it: 24 px / 24 px)
  - `shiftDown`: `▼` `[L⇧]` / `[Q][Z]` (24 / 24)
  - `jump`: `[SPACE]` / `[W][↑]` (35 / 24)
- **Generated caps:** every cap's code is taken from `DEFAULT_BINDINGS` (exported from `src/ui`) for the glyph's action (`move` = left + right), and the split into rows is the table above: top row = arrow and Shift codes, plus Space for jump; bottom row = the letter codes, then any arrow left over (`↑` for jump). A unit test asserts each glyph's codes equal its action's bindings (acceptance 2), so a glyph can never show a key that doesn't work.
- **Size:** two rows of 11 px caps with a 2 px gap: **24 px tall**, at most **48 px wide** (widest today: 35).
- **Position (world pixels, integers):** box width w = the wider row; `left = col × 16 + 8 − floor(w / 2)`, `bottom = (row + 1) × 16`, `top = bottom − 24`. Each row is centred in the box with `floor`. With the camera's integer scroll this keeps every cap on whole pixels at every zoom.
- **Layering:** above tiles and the background scenery, below both player bodies, effects, the HUD and the Sticky Keys card.
- **Animation:** none (the optional 1 px bob stays Could, off with reduced motion).
- **When it shows and when it goes:** drawn from the first frame of every visit to the level, in play and in replay. It **never disappears during the visit**: death, respawn and restart (R) leave it unchanged. It goes only when the level is left (results, level select, title). Pause and results are separate scenes drawn over the game, so they cover it without hiding it. (Could, unchanged: dim to 50 % after the hinted action is first used in the visit.)
- **Code shape (for B6-31):** a pure layout function in `src/entities/` from (glyph id, anchor, bindings) to a list of cap rectangles, labels and the triangle with integer positions, unit-tested; the scene only draws that list. No new art frames are needed.

## Placement rules (level-designer)

- The anchor cell is empty (`.`). The glyph's whole 3 × 2-tile box covers only empty cells, so it never hides a tile's pattern.
- The anchor row is **at least 3 rows above the floor row under it**. The glyph's bottom edge is then 2 tiles above the floor, clear of the player's 1.5-tile head.
- At most **3 hints per level**.
- In Tandem levels, hints go in the **runner's lane only**.
- Hints are a pure overlay: a level must replay identically with and without its hint headers.

## Edge cases

- **Static:** shown in every run and on every visit to that level, from the first frame. Restart and death don't change them. Dimming to 50% after the hinted action has been used once in the current visit is Could.
- **Camera:** glyphs scroll with the level like tiles. Off-screen glyphs are not repositioned.
- **Sticky Keys tip and pause overlay:** both draw above glyphs (screen space).
- **Replay mode:** glyphs show as in play.
- **World 0:** hints allowed (dev rooms).
- **Bad header** (unknown id, anchor outside the grid, or a non-empty anchor cell): a parse error naming file, row and column (M2-03 / M2-04). It never fails silently.
- **Remapped keys (Could remap):** glyphs show the current bindings, because they are generated.

## Tuning

None. The glyphs are UI and level data, not gameplay numbers.

## Acceptance

1. Unit (B6-31, was M2-36): the glyph lookup returns a definition for `move`, `shiftUp`, `shiftDown` and `jump`, and `null` for an unknown id.
2. Unit: each glyph's codes equal the codes bound to its action. `move` is ArrowLeft, ArrowRight, KeyA, KeyD; `shiftUp` is ShiftRight, KeyE, KeyX; `shiftDown` is ShiftLeft, KeyQ, KeyZ; `jump` is Space, KeyW, ArrowUp.
3. Unit: each glyph's laid-out box is at most 48 × 24 px, on integer pixels; labels are exactly those in "Cap labels" (`L⇧`, `R⇧`, `SPACE`, never `L Shift`); for w1-01's `move 1 3` the box is left 12, top 40, 24 × 24 (world px).
4. Parser (M2-04): a level with hints for all four ids loads. An unknown id, an anchor outside the grid and a non-empty anchor cell are each rejected with file, row and column.
5. Level test: w1-01, w1-02 and w2-01 replay their solutions to the same `wonAtStep` with their hint headers removed.
6. Level review (qa, from the parsed level): w1-01 has `move`; w1-02 has `shiftUp` over its first pad and `shiftDown` over its second; w2-01 has `jump`. Every anchor is empty and at least 3 rows above the floor under it. No level has more than 3 hints.
7. Screenshot on w1-02 at the white and red background tints: caps readable, and in greyscale too.
8. Should check: w3-01 has `move` and `shiftUp` in the runner lane only, and w2-01 has `shiftUp`.
9. Browser (qa, B6-42/B6-44): on a fresh load of w1-01, w1-02, w2-01 and w3-01 every hint in the level file is visible on the first frame, still there after a death and after R, and drawn behind the player.

## Priority

- **Must:** the four glyph ids; `move` in w1-01; `shiftUp` and `shiftDown` in w1-02; `jump` in w2-01; placement rules; generated caps.
- **Should:** `shiftUp` in w2-01; `move` and `shiftUp` in w3-01.
- **Could:** dimming after use, the 1 px bob.
