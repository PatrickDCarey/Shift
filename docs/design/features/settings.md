# Feature: settings screen (smallest honest version)

_Owner: design-lead. Written 2026-11-19 (`decisions.md` 2026-11-19; board M3-15). Builder: ui-engineer (`src/ui/**`, menu scenes, `src/save/**`). Navigation: `menu-navigation.md`. What the settings do: `pixel-effects.md` (reduced effects, reduced motion), `adaptive-audio.md` (mute). **Priority: Should. Needs producer sign-off:** GDD §10's Must list has no settings screen (CLAUDE.md "Scope")._

## Why

Today reduced motion follows only the OS setting, `settings.reducedEffects` is saved but nothing can turn it on, and there is no mute. Once the game's sound effects are wired (Must, `adaptive-audio.md`), players will want to turn sound off without muting the browser tab. The itch page claims only what exists (`itch-page.md` §7), so nothing is promised until this ships.

## Rule

A **SETTINGS** screen with three on/off rows and BACK. Each change applies on the next rendered frame and is saved at once.

| Row | Setting | Off / On means |
|---|---|---|
| `SOUND` | `settings.muted` (shown inverted: ON = not muted) | OFF silences music and SFX, before and after the first gesture |
| `REDUCED MOTION` | `settings.reducedMotion` | `pixel-effects.md` "Reduced motion" column |
| `REDUCED EFFECTS` | `settings.reducedEffects` | `pixel-effects.md` "Reduced effects" column |
| `BACK` | | returns to where the screen was opened from |

- **Reached from the title** as a fourth item, after CONTROLS (Must part of this Should). **From pause** as an item before LEVELS is Should; the pause panel may grow to 140 px tall to fit five items.
- **Toggling:** Enter, Space, Left or Right on a row flips it. Up and Down move focus. Esc or Backspace = BACK. Shift, Q, E, Z and X do nothing (`menu-navigation.md`).
- **Reduced motion's shown value** is the saved value if there is one, otherwise the OS `prefers-reduced-motion`. Flipping it saves a value, which from then on wins over the OS (`pixel-effects.md` check 6).
- **Volumes are not on this screen** (sliders are Could). Music and SFX stay at their defaults (0.6 and 0.8).
- No reset-progress item (Could, `progress-save.md`).

## Layout (480×270)

- Heading `SETTINGS` at 2×, top left (8, 8), like `CONTROLS`.
- Rows at 2×, 20 px apart from y 60: the label left-aligned at x 40, the value at x 320 as a 9 × 9 box glyph (filled = ON, hollow = OFF) followed by the word `ON` or `OFF`. The value reads by shape and word, never by colour.
- Focus by caret and frame (`menu-navigation.md`). Opens with `SOUND` focused.

## Edge cases

- **Opened from pause:** the run stays frozen; BACK returns to pause with focus on SETTINGS. Nothing restarts. **When a change made there takes effect (ruled 2026-11-20, deviation W7):**
  - **SOUND** applies at once (built).
  - **REDUCED MOTION and REDUCED EFFECTS:** the shipped floor is the **next level load**, because the scene reads them in `create()`. This is accepted.
  - **Should ([scene]):** re-read both flags when the run resumes from pause and on R, so they apply from the first unpaused frame.
  - Not wanted: re-reading them under the frozen pause frame.
  - Why the floor is acceptable: the flash cap (3 per second), no screen shake and the OS preference apply from the first frame in every mode, so no player goes below them while the change waits.
- **Storage blocked:** toggles work for the session and the title's not-saved line already says so.
- **Sound OFF before the first gesture:** no sound ever starts; turning it ON later starts music at the current band on the next gesture (`adaptive-audio.md` "Before the first gesture").
- **Restart prompt and the "why you fell" cue:** unaffected by either effects setting (they are gameplay information, `restart-prompt.md`, `clarity-fixes.md` PT-3).

## Tuning

None.

## Acceptance

1. Title → SETTINGS → SOUND to OFF → BACK → PLAY: no music and no SFX in the level (QA by ear). Reload: SOUND still shows OFF and the level is still silent.
2. REDUCED MOTION ON: on w2-02 the red takeoff's drop shows no screen wipe and no ring (`pixel-effects.md` check 3). With the OS set to reduce motion and no saved value, the row shows ON on first open.
3. REDUCED EFFECTS ON: no stars, afterimages or speed lines at red (`pixel-effects.md` check 4); the drag-drop cue is unchanged.
4. Esc on SETTINGS returns to the title with focus on SETTINGS. From pause (if built): returns to pause with focus on SETTINGS and `state.step` unchanged. Turn REDUCED MOTION on from pause in w2-02, then go to LEVELS and reopen w2-02: the red takeoff's drop shows no wipe and no ring (the shipped floor). Should (W7, once [scene] builds it): the same without leaving the level, from the first frame after RESUME and after R.
5. Pressing Left Shift, Right Shift, Q, E, Z or X on the screen changes no row and no focus.
6. Unit: the settings model flips each value on Enter, Space, Left and Right, and writes the save once per change; reduced motion with no saved value reads the OS flag.
7. Greyscale screenshot: every row's value can be read (box shape plus word).
8. e2e: the screen is reachable from boot and every row can be flipped using only arrows/WASD, Enter/Space and Esc.

## Priority

- **Should (needs producer sign-off):** the screen from the title with the three toggles and BACK.
- **Should:** reachable from pause (built). Effects settings changed from pause apply on resume and on R ([scene], W7, 2026-11-20); until then, from the next level load.
- **Could (2026-11-20, was Should):** menu move/select sounds. `src/audio` has no menu call, and menus show focus by shape.
- **Could:** music and SFX volume sliders, reset progress, a free key-remap screen (GDD §3).
- **If not signed off:** nothing ships; the itch page keeps claiming only the OS-driven reduced motion, and the unreachable `reducedEffects` flag stays unclaimed.
