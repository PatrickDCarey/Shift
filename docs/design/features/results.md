# Feature: results

_Owner: design-lead. Milestone: **M2** (M2-34). GDD: §4.12, §11. Builders: gameplay-engineer [scene] (M2-06: the complete event, recording the result), ui-engineer (M2-12: the results panel). Navigation: `menu-navigation.md`. Save: `progress-save.md`. NEXT order: `level-select.md` (Model). The leaderboard panel is M3-14 (Should)._

## Rule

When a run is won, the game records the result once. After a short beat, a results panel shows:
- the level;
- this run's time;
- your best time;
- whether this run is a first clear or a new best.

It has three items: **NEXT** (focused), **RETRY** and **LEVELS**. This replaces the M1 banner ("Level complete 0:12.91 press R").

## Flow

1. **The win step** (first step the exit is touched; with a twin, the step both bodies are home). The sim stops (`status` won). The scene calls `store.recordLevelComplete(levelId, wonAtStep)` **exactly once**, before the panel appears. Exceptions: world 0 and replay mode record nothing (see Edge cases).
2. **The beat:** 0.6 s (a UI constant) with the level frozen and the player in its win pose. Every key is ignored during the beat. Keys held at the end of it still follow the fresh-press rule.
3. **The panel.** Centred, at most 200 × 140 px, on a `ui.panel` backing, over the dithered level (same overlay as pause):
   - the level label and title at 1× (`1-3 RUNWAY`);
   - `CLEAR` at 2×;
   - `TIME 0:12.91` at 2×: this run, `formatTime(wonAtStep, stepHz)`;
   - `BEST 0:11.40` at 1×: the best after this run;
   - a marker at 1×: `FIRST CLEAR` on the first completion; `NEW BEST` with a star icon when this run beat an earlier best; nothing when it was slower or equal;
   - the items at 2×, NEXT first and focused, so **Enter (or Space) = next level is the primary action**;
   - a key line at 1× under the items, in this order: `ENTER: NEXT LEVEL` in `ui.text`, then `R: RETRY` and `ESC: LEVELS` muted (ruled 2026-11-16 from the pixel-build playtest, where "press R" was the headline and "Enter: next level" was tiny). On the last level the line starts with `R: RETRY`.
- **Sticky Keys card:** hidden on the win step itself (before the beat), not shown on the panel, and not shown again for that level visit (`sticky-keys-tip.md`).

## Items

- **NEXT:** starts `nextLevel(levelId)`, crossing worlds (w1-05 → w2-01). It is always playable, by unlock rule 2 or rule 1.
- **RETRY:** reloads this level fresh, with a new run and a new recording. **R** does the same.
- **LEVELS:** opens level select focused on this level. **Esc** does the same.
- **Last level:** if `nextLevel` is `null`, NEXT is not shown and focus starts on LEVELS.

## Edge cases

- **Exit and death on the same step:** that is a win (GDD §4.12), so this flow runs.
- **Tandem:** the time is `wonAtStep`, the step both bodies are home. The screen is otherwise the same.
- **Equal to the best:** no marker. `BEST` shows the same time.
- **Record rejected** (`recorded: false`, for example a run over the 10,000,000-step sanity cap of about 46 h): the panel shows the time and a muted line `NOT SAVED`.
- **Storage blocked:** the same panel. Best and markers are for this session (memory).
- **Holding keys through the win:** nothing is chosen until each key is released and pressed again (`menu-navigation.md`).
- **World 0 (test rooms):** the panel shows, nothing is recorded, and NEXT is not shown (world 0 is not in the level order).
- **Replay mode** (`?replay=1`): nothing is written to the save and no panel appears. The QA hook's `done` still turns true on `won`. Replays are not the player's runs.
- **Leaderboard (M3, Should):** submitting starts after the panel is shown and never blocks it or delays its items (CLAUDE.md, offline first). M3-14 may shift the panel left to make room.

## Tuning

None. Time comes from `wonAtStep / stepHz` (GDD §11). Steps stay the stored and compared value.

## Acceptance

1. Fresh save, win w1-01 in N steps: the save has w1-01 completed with `bestSteps` N. The panel shows `TIME` and `BEST` both equal to `formatTime(N)`, plus `FIRST CLEAR`, with focus on NEXT.
2. Win w1-01 again in more steps: the best is unchanged and no marker shows.
3. Win again in fewer steps: the best is updated and `NEW BEST` shows.
4. Win again in exactly the best: no marker.
5. `recordLevelComplete` is called exactly once per win (spy), before the panel appears, and the panel appears 0.6 s after the win step.
6. NEXT from w1-05 starts w2-01. On the last loaded level, NEXT is absent and focus is on LEVELS.
7. RETRY and R both restart this level with the step at 0 and a recording of length 0 at the start.
8. LEVELS and Esc both open level select focused on this level, and that cell shows the best time.
9. Space held from the takeoff through the win: the panel appears and nothing is chosen until Space is released and pressed again.
10. A replay-mode win leaves storage untouched and shows no panel.
11. A world 0 win leaves storage untouched, and NEXT is absent.
12. Time format on the panel: 775 steps → `0:12.91`, 3600 → `1:00.00`.
13. The key line reads `ENTER: NEXT LEVEL` first (primary colour) and `R: RETRY` after it (muted); Enter on the fresh panel starts the next level.
14. Windows, fresh save, win w1-01 while the Sticky Keys card is still up: the card is gone on the win step and absent from the panel; `stickyKeysTipShown` stays true.

## Priority

- **Must:** record once, time, best, NEXT / RETRY / LEVELS, the fresh-press rule, no save from replays or world 0.
- **Should:** the `FIRST CLEAR` / `NEW BEST` markers, the 0.6 s beat.
- **Could:** medal times (GDD Could). The leaderboard panel is M3-14 (Should).
