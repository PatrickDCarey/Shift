# Feature: title screen

_Owner: design-lead. Milestone: **M2** (M2-34). GDD: §10. Builder: ui-engineer (M2-11). Navigation conventions: `menu-navigation.md`. PLAY target: `level-select.md` (Model)._

## Rule

The first screen the player sees shows the name **REDSHIFT** and three items: **PLAY** (focused at start), **LEVELS** and **CONTROLS**.
- **PLAY** starts the next level in order: the first playable level that is not completed (`playTarget`).
- **LEVELS** opens level select.
- **CONTROLS** opens the controls screen.

## Layout (480×270)

- **Name:** `REDSHIFT` centred, at 4× scale, top edge near y 40. The art-director may replace it with a logo of the same footprint (at most 240 × 40 px).
- **Band strip** (Should): the five HUD band glyphs (white to red, with patterns) in a row under the name. It hints at the colour rule before play starts.
- **Items:** centred, at 2×, 20 px apart, starting near y 140.
- **Under PLAY** (Should): one muted 1× line naming the PLAY target, for example `1-3 RUNWAY`. The line is hidden when `playTarget` is `null`.
- **Footer:**
  - bottom left, 1× muted: `GAME OFF 2026`;
  - bottom centre, 1× muted, only when `store.isPersistent()` is false: `PROGRESS IS NOT SAVED IN THIS WINDOW`.

## Edge cases

- **Fresh save:** PLAY starts w1-01.
- **A voter who skipped ahead** (cleared w1-01 and w2-01 only): PLAY starts w1-02, the first unfinished playable level in order. Level select lets them pick anything else that is open.
- **Everything cleared** (`playTarget` is `null`): PLAY opens level select. The label stays PLAY.
- **No world ≥ 1 levels** (dev only): PLAY and LEVELS both open level select, which says `NO LEVELS`.
- **Level data failed to load:** the title is never shown; the error screen in `level-loading.md` replaces it.
- **Canvas not focused at boot** (itch iframe): the existing "click to focus" prompt shows over the title.
- **First key press:** this is the browser's first user gesture, so audio may unlock here (audio-designer). The title needs no music in M2.
- **Esc / Backspace on the title:** does nothing. A browser game has nothing to quit to.
- **Sticky Keys tip:** not shown on the title. It belongs to the first level start (`sticky-keys-tip.md`).
- **Coming back:** Esc from level select returns here with focus on LEVELS. Esc from controls returns with focus on CONTROLS. Pause and results go to level select, not here.
- **Deep link `?level=<id>`:** skips the title (`level-loading.md`).

## Tuning

None.

## Acceptance

1. Boot with an empty save: the title shows REDSHIFT, then PLAY, LEVELS and CONTROLS, with focus on PLAY.
2. Empty save, Enter on PLAY: w1-01 starts.
3. Save with w1-01 and w1-02 completed: PLAY starts w1-03.
4. Save with w1-01..w1-05 completed: PLAY starts w2-01.
5. Save with w1-01 and w2-01 completed: PLAY starts w1-02.
6. Save with every shipped level completed: PLAY opens level select.
7. LEVELS opens level select, and Esc there returns to the title with focus on LEVELS.
8. CONTROLS opens the controls screen, and Esc there returns to the title with focus on CONTROLS.
9. With storage blocked (`localStorage` throws): the not-saved line shows and every item still works. The line is absent when storage works.
10. Starting from boot, an e2e test reaches and plays a level using only arrows/WASD, Enter/Space and Esc (M2-28).
11. Esc on the title leaves the screen and focus unchanged.

## Priority

- **Must:** the name, three items, the PLAY rule, the not-saved line, keyboard only.
- **Should:** the band strip, the PLAY target line.
- **Could:** a logo, an idle runner that cycles white to red on a loop, a credits item (the jam only needs `CREDITS.md`).
