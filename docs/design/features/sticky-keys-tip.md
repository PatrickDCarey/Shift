# Feature: Sticky Keys tip overlay

_Owner: design-lead. Milestone: **M2** (M2-01). GDD: §3 (Must, CLAUDE.md hard rule). Builders: ui-engineer (logic `src/ui/stickyKeysTip.ts` and view `StickyKeysTipView.ts`, both built in M1-40; rebuilt at 480×270 in PX-9), gameplay-engineer [scene] (M2-39: mount it)._

## Rule

On Windows, the first time a level ever starts, a small panel tells the player two things:
- tapping Shift five times opens the Windows Sticky Keys popup;
- Q/E and Z/X shift gears too.

The tip is shown once ever (saved when it is displayed). It never pauses the game, never blocks or swallows a key, and goes away on its own.

## Content and layout (480×270)

- A panel of at most 240 × 44 px, `ui.panel` fill with a 1 px `ui.panelBorder` edge, holding three lines at 1×:
  1. `SHIFT x5 OPENS WINDOWS STICKY KEYS.` (35 characters).
  2. `SHIFT GEARS WITH` followed by key caps `[Q][E]`, then `OR`, then `[Z][X]`. Caps are 11 × 11 px, the same caps as `onboarding-hints.md`, with a 1 px outline in `ui.focus`.
  3. Right-aligned and muted: `ENTER: HIDE`.
- **Placement**, decided once when the tip shows: horizontally centred, 8 px above the bottom edge. If that rectangle would overlap the player's sprite on screen at that moment, the panel goes at the top instead, at y = 42, just under the HUD strip (which ends near y 37). It never covers the HUD gear meter. Provide this as a pure, tested helper (`tipPlacement(playerRect, view)`).
- Fades out in 250 ms; with reduced motion it disappears instantly.

## When it shows

- **All of these** must be true: the platform is Windows (`isWindows`: user agent and platform strings, mobile Windows excluded); `settings.stickyKeysTipShown` is false; this is the first level start of the page session.
- A **level start** means a level loaded from the title, level select, NEXT, RETRY or a deep link. R restarts and respawns do not count.
- The flag is saved **when the tip is displayed**, not when it is dismissed. Closing the tab while the tip is up still counts as shown.

## Edge cases

- **Hiding:** Enter, pressing Q, E, Z or X, 12 s untouched, pausing, or leaving the level. The alternate gear keys hide it **and still shift the gear** (the key is not swallowed): the player has just learned the lesson.
- **Shift keys do not hide it.** A player still tapping Shift is the one who needs it.
- **The game runs underneath:** the sim keeps stepping and every game key reaches the game while the tip is up.
- **Storage blocked:** the flag lives in memory, so the tip shows on the first level start of each session.
- **Not on macOS, Linux, ChromeOS or mobile.** If detection fails, the game simply doesn't show it. The controls screen lists Q/E and Z/X for everyone.
- **Replay mode** (`?replay=1`): never shown, and the flag is not set.
- **First level started is not w1-01** (a voter jumping to w3-01): the tip shows there. It is tied to the first level start, not to a level.
- **Overlap with onboarding hints:** hints are drawn in world space and the tip in screen space. Placement avoids the player, not the hints. The 12 s lifetime keeps any overlap short.
- **Shown again on request:** the controls screen's `SHOW STICKY KEYS TIP` item (Windows only) shows the same panel there without changing the flag (`controls-screen.md`).

## Tuning

None. `STICKY_TIP_AUTO_HIDE_MS` (12 s) and the panel sizes are UI constants in `src/ui/`. They are not gameplay numbers.

## Acceptance

1. Windows user agent, fresh save, first level start: the tip is visible, and `settings.stickyKeysTipShown` is true on that frame.
2. Reload and start a level: no tip.
3. macOS and Linux user agents: never shown, and the flag stays false.
4. While the tip is visible, holding Right moves the player, Right Shift raises the gear and Space jumps.
5. Pressing Q while the tip is visible: the tip hides and the gear drops by one (when above gear 1).
6. Enter hides the tip. Left alone, it hides 12 s after showing.
7. Pressing Left or Right Shift does not hide it.
8. Storage blocked: the tip shows on the first level start of the session and not on the second.
9. Replay mode: never shown, and the flag is unchanged.
10. `tipPlacement`: a player at the bottom of the view gets the top position (y 42). A player in the upper half gets the bottom position. Neither position overlaps the HUD rectangle (unit).
11. Pausing while the tip is visible: after resume the tip is gone.
12. At 480×270 with the bitmap font, all three lines fit inside the panel and the panel lies within 8 px margins. A greyscale screenshot shows the key caps readable.

## Priority

- **Must:** everything above except the fade.
- **Should:** the 250 ms fade.
- **Could:** none.
