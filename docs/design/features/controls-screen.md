# Feature: controls screen

_Owner: design-lead. Milestone: **M2** (M2-01). GDD: §3. Builder: ui-engineer (M2-13). Navigation: `menu-navigation.md`. Bindings: `src/ui/bindings.ts` (`DEFAULT_BINDINGS`, `keyLabel`)._

## Rule

A reference screen that lists every action and **every** key bound to it. It is **generated from the binding table**, so it can never drift from what the game actually reads. It can be reached from the title and from pause, and needs no Shift to use. There is no remapping; a remap screen is Could.

## Layout (480×270)

- **Heading:** `CONTROLS` at 2×, top left (8, 8).
- **Binding rows** at 1×, starting at y 36, 20 px apart:
  - an action label in a 96 px column at x 16;
  - then one key cap per bound code, from `keyLabel(code)`, starting at x 120 with a 6 px gap.
  - Caps are 11 px tall; their width is 6 × characters + 5. All bindings are active at once, so every cap is listed. No row says "or".

| Row | Action | Caps (shipped bindings) |
|---|---|---|
| 1 | `MOVE (HOLD)` | ← → A D |
| 2 | `SHIFT UP` | R Shift, E, X |
| 3 | `SHIFT DOWN` | L Shift, Q, Z |
| 4 | `JUMP` | Space, W, ↑ |
| 5 | `RESTART` | R |
| 6 | `PAUSE` | Esc, P |

- **Menu row** (1×, muted, under the table): `MENUS: ARROWS/WASD MOVE  ENTER/SPACE CHOOSE  ESC BACK` (53 characters).
- **Band legend** (Should): the five HUD band glyphs (patterns) in a row, labelled `STOP 1 2 3 4` underneath, plus one muted line, `YOUR SPEED IS YOUR COLOR`. It is a reference for players who come looking; the levels still teach the rule without text.
- **Focusable items**, at the bottom at 2×:
  - `SHOW STICKY KEYS TIP` (Windows only, `isWindows`);
  - `BACK` (focused when the screen opens).

## Edge cases

- **Generated rows:** the action order is fixed (the table above), but the caps come from the current `Bindings` value. If the Could remap screen ever ships, this screen shows the remapped keys with no change here.
- **Glyphs:** the labels need `←`, `→` and `↑` in the bitmap font (`keyLabel` returns them). A missing glyph is a bug, never a box or blank (art-director PX-3).
- **Opened from pause:** the run stays frozen. Esc, Backspace or BACK return to the pause menu with focus on CONTROLS.
- **Opened from the title:** returns to the title with focus on CONTROLS.
- **`SHOW STICKY KEYS TIP`:** shows the tip panel (`sticky-keys-tip.md`) over this screen, using the same hiding rules. It does **not** change `settings.stickyKeysTipShown`. On other platforms the item is absent, and BACK is the only item.
- **Shift, Q, E, Z and X** on this screen do nothing to the menu. They do hide a visible tip panel, as in play.
- **Long labels:** the widest row, `SHIFT DOWN` (L Shift, Q, Z), is about 85 px of caps and fits easily. Any row that would pass x 472 wraps to a second line (dev guard; never with shipped bindings).

## Tuning

None.

## Acceptance

1. Unit: the screen model built from `DEFAULT_BINDINGS` lists every bound code exactly once, under its action.
2. Unit: with a doctored `Bindings` that has an extra jump key, the model shows that key in the JUMP row. The rows are not hand-written.
3. Title → CONTROLS → Esc, using only arrows, Enter and Esc: the title returns with focus on CONTROLS (e2e, M2-28).
4. Pause → CONTROLS → Esc: the pause menu returns, and `state.step` did not change.
5. Windows user agent: `SHOW STICKY KEYS TIP` shows the tip, and `settings.stickyKeysTipShown` is unchanged by it. Non-Windows user agent: the item is absent.
6. Every cap label renders in the bitmap font with no missing glyph, including ←, → and ↑ (visual check at 2×).
7. Every element lies on integer positions within 8 px margins at 480×270.

## Priority

- **Must:** generated rows for all six actions, the menu row, reachable from the title, BACK, the Windows tip item (board M2-13).
- **Should:** reachable from pause, the band legend.
- **Could:** remapping (separate screen, GDD §3).
