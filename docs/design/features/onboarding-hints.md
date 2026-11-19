# Feature: onboarding hint glyphs

_Owner: design-lead. Milestone: **M2** (M2-01). GDD: §3, pillar 2. Builders: tech-lead (M2-03: hint headers in `level-format.md` and `LevelMeta`, done), gameplay-engineer [level] (M2-04: parse them, done), **gameplay-engineer [scene] (B6-31, Batch 6 wave 2: layout and drawing, both in `src/entities/`; the M2-36 ui renderer was never built and is folded into B6-31)**, level-designer (placement, done for w1-01, w1-02, w2-01, w3-01). Revised 2026-11-16 for the pixel build: nothing drew `level.meta.hints` in the 2026-11-16 playtest build, and the cap labels below now match what the 5×7 font has. **Revised 2026-11-19** (batch 6 cold playtest, `decisions.md` 2026-11-19): three more placements, all with the existing four ids (no new glyph, no contract or parser change): `shiftUp` at the back wall of w1-03, a stacked `shiftUp` over `jump` on w2-04's green floor, and `jump` at w3-03's takeoff. Hints now reach past w2-01 where a level's idea cannot be guessed from the screen._

## Rule

Some levels show small **key-cap icons fixed in the level** that say "press this here" without words. They are placed by the level file's hint headers (a glyph id plus an anchor tile), drawn in world space above the tiles and behind the player. They are never solid and are invisible to the sim.

## Glyph set (ids for M2-03)

| Id | Shows | Placed in |
|---|---|---|
| `move` | top row `[←][→]`, bottom row `[A][D]` | **w1-01** above the spawn (Must); **w3-01** above the runner's spawn (Should) |
| `shiftUp` | top row ▲ `[R⇧]`, bottom row `[E][X]` | **w1-02** above the first safe pad (Must); **w2-01** above the start pad (Should); **w3-01** above the runner lane's shift pad (Should); **w1-03** over the back wall, `shiftUp 2 6` (Must, 2026-11-19); **w2-04** over the green floor, `shiftUp 8 4`, stacked above its `jump` (Must, 2026-11-19) |
| `shiftDown` | top row ▼ `[L⇧]`, bottom row `[Q][Z]` | **w1-02** above the second safe pad (Must) |
| `jump` | top row `[SPACE]`, bottom row `[W][↑]` | **w2-01** above the start pad, before the gap (Must); **w2-04** `jump 8 6`, directly under its `shiftUp` (Must, 2026-11-19); **w3-03** over the middle of the takeoff window, `jump 12 3`, runner lane (Must, 2026-11-19) |

### The 2026-11-19 placements, and why

- **w1-03 Runway, `shiftUp 2 6`** (box cols 1–3, rows 5–6, over the back wall; floor row 9). The playtester stood at the spawn with 2.5 tiles of runway and no clue that the room behind it was the run-up; it took about 5 tries. The glyph marks *where* to shift, which in this room is the lesson (start from the back), and it sits away from the spawn, so the cheap first fall from the spawn still happens. It follows w1-02's grammar: a glyph over the place you press.
- **w2-04 Two Colors, `shiftUp 8 4` above `jump 8 6`** (one column, boxes cols 7–9, rows 3–4 and 5–6; floor row 9; ledge from col 13). The level is the only one whose lesson is color grace, and grace is taught nowhere else, so its idea could not be guessed from the screen (playtest: about 6 failed jumps, then the README). The two glyphs are **stacked at one x on purpose**: they read top to bottom as "shift up, then jump, here". Side by side they would read as two places, and a jump 2 tiles after the shift is about 18 steps late. Pressed as a deliberate two-key sequence (about 100–250 ms apart, 6–15 steps), the jump lands inside the window (steps 4–16 after the press). The glyph column sits over the recorded shift (x 8.11) and jump (x 9.41).
- **w3-03 Gear Split, `jump 12 3`** (box x 11.4–13.6 tiles, y 2.5–4 tiles, over the middle of the 18-step takeoff window x 11.10–14.50; block at cols 16–17, rows 1–3; runner floor row 6). The playtester did not see the hanging block as the tool and tried shift-downs in the air. A jump glyph at the takeoff, 3 tiles before the block and at its height, says "jump here"; the block then does the rest in front of the player, and the runner's HUD strip drops to gear 1. Runner lane only (placement rule).
- **Not hinted:** w3-04 and w3-05 open with the same block section, which w3-03 now teaches; hints stop after the teach level, as they do after w2-01. Pre-approved fallback: if the next cold playtest (after a hinted w3-03) fails w3-04's opening more than 3 times, add the same `jump 12 3` to w3-04 and w3-05 (same block and Coast columns). w2-03 gets no hint (`decisions.md` 2026-11-19).

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
- Hints are a pure overlay: a level must replay identically with and without its hint headers. **Adding or moving a hint header does not bump `version`** and needs no re-recording or `LEVELS` change, because the run is identical (2026-11-19).
- **Stacked pair (2026-11-19):** two glyphs may share a column when they mean "press these in this order, here" (w2-04 only today): the upper one is pressed first, and the boxes are at least 8 px apart vertically.
- Every box stays out of the HUD area at every camera position (level plan v3.5).

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
10. Level review (qa, 2026-11-19 placements, from the parsed level): w1-03 has exactly `shiftUp 2 6`; w2-04 has exactly `shiftUp 8 4` and `jump 8 6`; w3-03 has exactly `jump 12 3`. Each anchor is empty, each box covers only empty cells, and each anchor is at least 3 rows above the floor under it. `npx vitest run tests/levels` passes (replay identical with and without hints, HUD area at the starting camera), and the level's `version` is unchanged.
11. Browser (qa): on a fresh load of w1-03, w2-04 and w3-03 the new glyphs are visible on the first frame. In w2-04 the `shiftUp` box is directly above the `jump` box in one column. In w3-03 the `jump` box is in the runner's lane, left of the hanging block: its right edge is at world px 218 (x 13.625 tiles), left of the block's face at col 16 (x 16 tiles, world px 256). Scrolling to the far right of w2-04 and w3-03, no glyph passes under the HUD panel.
12. Playtest (playtester, cold, no README): w1-03 solved within 3 falls; w2-04's shift-then-jump lands within 5 failed jumps; in w3-03 the player jumps near the glyph and can say the block took the runner's gear. A miss is a finding for design-lead, not a pass/fail for engineering.

## Priority

- **Must:** the four glyph ids; `move` in w1-01; `shiftUp` and `shiftDown` in w1-02; `jump` in w2-01; placement rules; generated caps; the 2026-11-19 placements (`shiftUp` in w1-03; `shiftUp` over `jump` in w2-04; `jump` in w3-03).
- **Should:** `shiftUp` in w2-01; `move` and `shiftUp` in w3-01.
- **Could:** dimming after use, the 1 px bob.
