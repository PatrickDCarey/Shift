# Feature: onboarding hint glyphs

_Owner: design-lead. Milestone: **M2** (M2-01). GDD: §3, pillar 2. Builders: tech-lead (M2-03: hint headers in `level-format.md` and `LevelMeta`), gameplay-engineer [level] (M2-04: parse them), ui-engineer (M2-36: glyph renderer), gameplay-engineer [scene] (draw them at level start), level-designer (placement)._

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

## Drawing (480×270, 16 px tiles)

- **Caps:** 11 × 11 px for one character, with a 1 px `ui.focus` outline and the label in the 5×7 font. Wide caps (`R⇧`, `L⇧`, `SPACE`) are 6 × characters + 5 px wide. The ▲ and ▼ arrows are 5 × 3 px shapes, left of the cap row.
- **Size:** each glyph is at most **48 × 24 px** (3 × 1.5 tiles): two rows of 11 px caps with a 2 px gap between rows and between caps. The widest row is `[SPACE]` at 35 px.
- **Anchor:** the glyph's box is centred horizontally on the anchor cell's centre, and its bottom edge sits on the anchor cell's bottom edge.
- **Layering:** above tiles and the background, below the player and effects.
- **Contrast:** at least 3:1 against the background at every band tint (white through red).
- **Animation:** none required. An optional 1 px bob is Could, and is off with reduced motion.
- **Generated caps:** each glyph's caps come from `DEFAULT_BINDINGS` for its action through `keyLabel`, so a glyph can never show a key that doesn't work.

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

1. Unit (M2-36): the glyph lookup returns a definition for `move`, `shiftUp`, `shiftDown` and `jump`, and `null` for an unknown id.
2. Unit: each glyph's codes equal the codes bound to its action. `move` is ArrowLeft, ArrowRight, KeyA, KeyD; `shiftUp` is ShiftRight, KeyE, KeyX; `shiftDown` is ShiftLeft, KeyQ, KeyZ; `jump` is Space, KeyW, ArrowUp.
3. Unit: each glyph's laid-out box is at most 48 × 24 px, on integer pixels.
4. Parser (M2-04): a level with hints for all four ids loads. An unknown id, an anchor outside the grid and a non-empty anchor cell are each rejected with file, row and column.
5. Level test: w1-01, w1-02 and w2-01 replay their solutions to the same `wonAtStep` with their hint headers removed.
6. Level review (qa, from the parsed level): w1-01 has `move`; w1-02 has `shiftUp` over its first pad and `shiftDown` over its second; w2-01 has `jump`. Every anchor is empty and at least 3 rows above the floor under it. No level has more than 3 hints.
7. Screenshot on w1-02 at the white and red background tints: caps readable, and in greyscale too.
8. Should check: w3-01 has `move` and `shiftUp` in the runner lane only, and w2-01 has `shiftUp`.

## Priority

- **Must:** the four glyph ids; `move` in w1-01; `shiftUp` and `shiftDown` in w1-02; `jump` in w2-01; placement rules; generated caps.
- **Should:** `shiftUp` in w2-01; `move` and `shiftUp` in w3-01.
- **Could:** dimming after use, the 1 px bob.
