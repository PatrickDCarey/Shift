# Feature: level select and the unlock rule

_Owner: design-lead. Milestone: **M2** (M2-34). GDD: §7, §10, §12.7. Builders: ui-engineer (M2-10 progress model, M2-11 screen). Navigation conventions: `menu-navigation.md`. Save data: `progress-save.md`. Level list: `level-loading.md`._

## Rule

Level select shows every shipped level (world ≥ 1) in a grid with one row per world. Each level is **locked**, **open** or **cleared**, and cleared levels show their best time. Enter on an open or cleared level starts it.

### Unlock rule (Must, owner decision 2026-11-04)

A level in world ≥ 1 is **playable** if any of these holds:

1. It is the **first level of its world**, meaning the lowest id among that world's loaded levels.
2. The **level before it in the same world** is completed.
3. It is **itself completed**.

Every other level is **locked**.

- Completing a level unlocks the next level in its world.
- Worlds never lock. On a fresh save, w1-01, w2-01 and w3-01 are open, and so is w4-01 if world 4 ships.
- The playable set is **derived on every read** from the loaded level list and `progress.completedLevels`. It is never stored.

Why:
- A jam voter plays about 10 minutes and must be able to reach Tandem (w3-01) without clearing nine levels first (owner, GDD §12.7).
- Inside a world, levels still unlock in teaching order (pillar 4: teach, test, twist, combine).
- Rule 3 keeps cleared levels open if the level list ever changes.

### Model (pure, unit-tested; ui-engineer may rename)

- `levelOrder(levels)`: the world ≥ 1 levels in loader order (world, then id).
- `isPlayable(id, order, completed)`: the three rules above.
- `playTarget(order, completed)`: the first playable level in order that is not completed, or `null`. Used by title PLAY (`title-screen.md`).
- `nextLevel(id, order)`: the level after `id` in order, crossing into the next world, or `null`. Used by results NEXT (`results.md`).
- `formatTime(steps, stepHz)`: `M:SS.ss` with hundredths truncated (GDD §11). Minutes are not padded. From 360,000 steps (100 min) upward it shows `99:59.99` (display cap only; the stored steps stay exact).

## Layout (480×270)

- **Header** (y 8): `LEVELS` at 2× on the left; `CLEARED n/m` at 1× on the right, where m = the number of world ≥ 1 levels loaded.
- **Grid**: one row per world that has at least one loaded level, in world order. Rows are 40 px apart and the first starts at y 40.
  - **World label column** (80 px wide): the world number at 2×, and the name at 1× below it. Names are UI copy: 1 GEARS, 2 FLIGHT, 3 TANDEM, 4 GATES. (World 3 is TANDEM for good: owner decision 2026-11-16.)
  - **Cells**: 64 × 32 px with a 6 px gap, up to 5 per row. The top line is the label `w-n` at 2× (for example `1-3`, from the id). The bottom line is the status at 1×.
- **Detail line** (y 216 to 250): the focused level's label and `title` (level header) at 2×, truncated at 24 characters. Below it, at 1×:
  - `BEST 0:12.91` if cleared;
  - `NOT CLEARED` if open;
  - `LOCKED - CLEAR 1-2 FIRST` if locked (naming the previous level in that world).
- **States are told apart by shape** (greyscale-safe), never by color alone:

| State | Cell | Bottom line |
|---|---|---|
| locked | ghost treatment (dithered, dim), label in `ui.textMuted` | lock icon |
| open | 1 px outline, bright label | hollow dot icon |
| cleared | solid backing, bright label | tick icon + best time `0:12.91` |
| focused (any state) | 2 px frame + caret (`menu-navigation.md`) | — |

## Navigation

- **← →**: previous or next cell in the row. The focus stops at the ends of the row.
- **↑ ↓**: the same column in the previous or next world row. If that row is shorter, focus goes to its last cell.
- **Enter / Space** on an open or cleared cell: start that level.
- **Enter / Space** on a locked cell: nothing starts. The detail line already says why. The lock icon nudges 1 px (no nudge with reduced motion).
- **Esc / Backspace**: back to the title, with focus on LEVELS.
- **Initial focus:**
  - from the title, the level `playTarget` returns, or w1-01 if it returns `null`;
  - from pause or results (LEVELS), the level just played.

## Edge cases

- **Fresh save:** only the first level of each world is open. Everything else is locked.
- **Out-of-order completion** (deep link `?level=`, QA, an old save): completed = {w1-03} gives w1-03 cleared and w1-04 open, while w1-02 stays locked until w1-01 is cleared. Show exactly what the rule computes.
- **Unknown ids in the save** (a removed or renamed level): ignored for display, but kept in the save (`progress-save.md`).
- **Gaps in numbering** (w1-01, w1-03): "the level before" is the previous *loaded* level in that world. The label comes from the id (`1-3`).
- **A level inserted mid-world later:** every cleared level stays open (rule 3). The new level is locked until its predecessor is cleared.
- **World 4 (Should):** its row appears only if its levels are loaded, and its first level is open on a fresh save like the others.
- **World 0** (test rooms): never listed and never counted in `m`.
- **No world ≥ 1 levels loaded** (dev only): the grid area shows `NO LEVELS`, and Esc still goes back.
- **More than 5 levels in a world:** design caps worlds at 5 (`level-plan.md`). A qa check asserts that the shipped set fits.
- **Tandem levels:** shown like any other level. Their time is the step on which both bodies are home.
- **Storage blocked:** everything works from in-memory progress for the session. The notice lives on the title (`title-screen.md`).

## Tuning

None. `formatTime` reads `stepHz` from `tuning.json`. Layout numbers are UI constants.

## Acceptance

Unit (pure model, with the shipped level list unless stated):
1. Fresh save: the playable set is exactly {w1-01, w2-01, w3-01}, plus w4-01 only if world 4 is loaded.
2. completed = [w1-01]: w1-02 becomes playable and nothing else changes.
3. completed = w1-01..w1-05: those five are cleared, w2-01 is open and w2-02 is locked.
4. completed = [w1-03] only: w1-03 is playable (cleared), w1-04 is playable, w1-02 is locked.
5. Loaded levels w1-01 and w1-03 only, completed = [w1-01]: w1-03 is playable.
6. completed contains `w9-99`: no error, the id is ignored by the model, and it survives the next save write.
7. World 0 levels never appear in `levelOrder`, and a world row exists only for worlds that have loaded levels.
8. `formatTime`: 775 → `0:12.91`, 3600 → `1:00.00`, 59 → `0:00.98`, 359,999 → `99:59.98`, 360,000 → `99:59.99`.
9. `playTarget`: fresh save gives w1-01. completed = [w1-01, w2-01] gives w1-02. All completed gives `null`.
10. `nextLevel`: w1-05 → w2-01, w2-04 → w3-01, the last loaded level → `null`.
11. The save JSON never contains an unlock field: after any sequence of wins it holds only `completedLevels` and `bestSteps` under `progress`.

Screen (e2e or scene test):
12. Enter on a locked cell leaves the scene on level select. Enter on an open cell starts that level. Esc returns to the title with focus on LEVELS.
13. Down from column 5 of world 1 lands on w2-04, the last cell of the 4-level world 2.
14. Coming back from results through LEVELS, focus is on the level just played and its cell shows the new best time.
15. Greyscale screenshot: locked, open, cleared and focused cells are distinguishable by shape.
16. With the shipped levels, every row fits inside 480×270 with 8 px margins (no cell is clipped).

## Priority

- **Must:** the grid, the three states by shape, the unlock rule (all three clauses), best times, keyboard navigation, initial focus.
- **Should:** the `CLEARED n/m` header, the locked nudge, the "clear 1-2 first" detail line.
- **Could:** a per-world tint (with pattern), a twin icon on the world 3 label, medal times (GDD Could).
