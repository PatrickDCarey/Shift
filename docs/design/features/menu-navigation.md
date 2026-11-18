# Feature: menu navigation (shared by every menu screen)

_Owner: design-lead. Milestone: **M2** (M2-34). GDD: §3, §10, §11. Builder: ui-engineer (`src/ui/`, menu scenes). Applies to `title-screen.md`, `level-select.md`, `pause.md`, `results.md`, `controls-screen.md`. Written for the 480×270 pixel build (`docs/tech/adr-pixel-rendering.md`)._

## Rule

Every menu is a list or grid with **exactly one focused item**, driven by the keyboard only, and the same keys mean the same thing on every screen. A key that is already held when a screen opens does nothing on that screen until it has been released.

## Keys

| Purpose | Keys |
|---|---|
| Move focus | ↑ ↓ ← → and W A S D |
| Choose the focused item | Enter, Space |
| Back (each screen says where to) | Esc, Backspace |
| Retry (pause and results only) | R |
| Close pause (pause only) | Esc, P |

- **Shift keys, Q, E, Z and X do nothing in menus.** No menu ever needs Shift.
- **One press, one move.** Holding a direction does not auto-repeat.
- **No wrap.** Up on the top item, or Left on the first cell, leaves the focus where it is.
- **Several keys on the same frame:** Back wins over Choose, and Choose wins over Move. Two moves on the same frame cancel each other on the axis they share.
- **Mouse:** a click only focuses the canvas (itch iframe). Mouse menus are **Could**.

## Layout conventions (480×270)

- All text uses the 5×7 bitmap font (advance 6 px, line height 8 px). Headings and menu items are drawn at `setScale(2)` (advance 12, line 16). Menu items are UPPERCASE.
- Everything sits on integer pixel positions, at least **8 px** inside every edge.
- **Focus is shown by shape:** a `>` caret 6 px left of the item, plus a 1 px frame around it, drawn in `palette.ui.focus`. Color is never the only signal.
- An unavailable item is drawn in `palette.ui.textMuted` and carries an icon that says why (for example a lock in level select).
- No list has more than 6 items.
- Screen changes either cut instantly or fade in at most 200 ms. With reduced motion they always cut. Input is ignored during a fade.
- Colors come only from `palette.json` (`ui.*`), and icons from `src/fx`/font glyphs (art-director).

## Edge cases

- **Held key at open (fresh-press rule):** Space held for a jump when the run is won, R held through a restart, and Esc held from closing pause are all ignored until released. This is what stops the results screen from choosing NEXT by itself.
- **Same frame as an overlay opens or closes (2026-11-17):** a key pressed on the frame Pause or Results opens or closes belongs to the overlay and is dropped, not queued for the game (`pause.md`).
- **Canvas loses focus:** the existing "click to focus" prompt shows and the menu keeps its focus position. No key events arrive until the canvas has focus again.
- **Screen opens while a fade is running:** the new screen waits for the fade to end. Inputs are dropped, not queued.
- **Five Shift taps in a menu:** the OS may still open Sticky Keys (we can't stop it). The menu itself never reacts to Shift.
- **Reduced motion** (`settings.reducedMotion`): no fades, no nudges, no bobbing carets.

## Tuning

None. Sizes and timings are UI constants in `src/ui/`. Menus read no `tuning.json` key, except `stepHz` for time display (`results.md`).

## Acceptance

1. Starting from boot, every menu screen can be reached and every item chosen using only the keys in the table above: no Shift, no mouse (e2e, M2-28).
2. Space held through the winning step: when the results screen appears it chooses nothing; releasing Space and pressing it again chooses the focused item.
3. Up on the top item and Down on the last item leave the focus where it is, on every list screen.
4. In each screen, Esc does the back action that screen's spec lists.
5. Pressing Left Shift, Right Shift, Q, E, Z or X on any menu screen changes neither the focus nor the screen.
6. Greyscale screenshot of each screen: the focused item can be identified (caret and frame).
7. Unit test on the layout helpers: every text and item position is an integer and lies at least 8 px inside 480×270.
8. Enter and Esc pressed on the same frame perform Back.

## Priority

- **Must:** the key table, the fresh-press rule, focus by shape, no Shift needed, 480×270 integer layout.
- **Should:** fades (≤ 200 ms), menu move/choose/back SFX hooks for audio-designer.
- **Could:** mouse menus, auto-repeat.
