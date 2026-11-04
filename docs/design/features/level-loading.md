# Feature: level loading behaviour

_Owner: design-lead. Milestone: **M2** (M2-34). Builders: gameplay-engineer [level] (`loadLevels`, done; hint headers M2-04), tech-lead (BootScene and the error screen, with PX-4; hint header format M2-03), gameplay-engineer [scene] (level start, deep link). Format: `docs/tech/level-format.md`. Data loading: `docs/tech/architecture.md` §7._

## Rule

At boot the game parses every bundled `levels/*.txt` exactly once with `loadLevels`. The result, in level order (world, then id), is the **only** list that the title PLAY target, level select, results NEXT and the unlock rule read.

A level that fails to load is a **build error**, not a player state. The solvability test fails CI. If one ever ships anyway, the game shows a plain error screen instead of a broken menu.

## Behaviour

- **When:** once per page load, synchronously, from the bundled raw-text map. No fetch and no loading bar. Tuning is checked in the same boot pass (`tuningErrors()`).
- **World 0** (test rooms such as `w0-02`) is loaded and playable by deep link, but it is:
  - never in the level order;
  - never a PLAY or NEXT target;
  - never saved.
- **Starting a level** creates a fresh sim from the level and the shipped tuning, at step 0. The recording starts at load. The scene shows:
  - the level label and title (the existing HUD title);
  - the level's onboarding hints (`onboarding-hints.md`);
  - the Sticky Keys tip if it is due (`sticky-keys-tip.md`).
- **R / restart** keeps the level loaded, and the recording keeps appending (death and restart runs included, architecture §5). **RETRY** from results and **NEXT** load a level fresh, with a new recording.
- **Deep link `?level=<id>`** (existing dev and QA convenience) starts that level directly. It bypasses the title and the locks, which is harmless for players.
  - A world ≥ 1 win there saves like any other win.
  - An unknown id opens the title. In dev it also shows a 1× line `UNKNOWN LEVEL <id>`.
- **Hint headers (M2-03):** an unknown glyph id, an anchor outside the grid, or an anchor on a non-empty cell is a parse error naming file, row and column. That follows the format's existing rule for all level errors.

## Edge cases

- **`loadLevels` returns `ok: false`** (it is all-or-nothing): instead of the title, show an error screen at 1×: `LEVEL DATA ERROR`, then the first 5 messages (file, row, column), each truncated to the 480 px line. There is no menu, and Esc does nothing. There is no uncaught exception and no blank canvas. The screen is the same in dev and production.
- **Tuning invalid:** the same screen with the `tuningErrors()` messages, under `TUNING DATA ERROR`.
- **Zero world ≥ 1 levels** (early dev): the title works, and level select shows `NO LEVELS`.
- **Gaps in level numbers:** allowed. Order is by id, and labels come from the id.
- **CRLF files:** identical to LF (format §1, already tested).
- **Solutions are not loaded for play.** Replay mode (`?replay=1`) is the only exception, as today.

## Tuning

None. The tuning file is loaded and validated here, but no key is added.

## Acceptance

1. With the shipped levels, the level order is w1-01..w1-05, w2-01..w2-04, then w3-… (once built), and contains no world 0 level.
2. A malformed level in the map: `loadLevels` returns `ok: false` with file, row and column. The scene shows the error screen with no uncaught exception (unit on the loader; dev smoke test on the screen).
3. The solvability test fails for a malformed level (existing `tests/levels`).
4. Fresh save, `?level=w1-03`: w1-03 starts directly, and winning it saves w1-03 as cleared.
5. `?level=w0-02`: the test room plays, and winning writes nothing to storage.
6. `?level=nope`: the title opens.
7. Over the sequence title → level select → level → results → NEXT → pause → LEVELS, `loadLevels` runs exactly once (spy).
8. RETRY gives a recording that starts empty. R inside a run keeps the earlier frames.

## Priority

- **Must:** load once, one level order for every menu, world 0 excluded, the error screen, deep link behaviour.
- **Should:** the `UNKNOWN LEVEL` dev line.
- **Could:** none.
