# Playtest: pixel build (commit 2eb0527), 2026-11-16

Fresh-eyes. Played w1-01 (`/`), w1-02, w1-04, w2-01, w2-02, w2-03 from the frozen build on port 5191 (server stopped). Same method as last time: Playwright, 960x540, D3D11 (60 fps), key presses triggered from `window.__redshift.state`. I am a script, so timings are probes, not human reaction. No audio judged. No solution files or `?replay=1` used. Screenshots: `docs/playtests/2026-11-16-pixel-build/`.

## 1. Seen on screen for the first time
- Win banner: `03-w1-01-win-banner.png`. Large text, "press R" still the headline, "Enter: next level" tiny. The Sticky Keys card is still on screen after the win.
- Pause: `10-pause-screen.png`. Works (Esc/P). Two lines have no spacing and touch. Death debris is frozen at the bottom.
- Exit door and glow: `exit-door-crop-3x.png`. White doorway with a "+", dithered grey halo. Static, no pulse.
- Sticky Keys tip: `01-root-w1-01-sticky-tip.png`. Does not block input; Enter dismisses it (`05`).
- Death and respawn: `08`, `09`. Fall, whole screen turns maroon, runner turns pale pink. Respawn is quick. Still no cause shown.

## 2. Versus last playtest
- Exit easy to find? Yes in w1-01, w1-02, w2-xx (door is bright against dark). In w1-04 it is off screen until the camera scrolls near the end.
- Fair first level? Yes. w1-01 is 1 attempt, about 7 s. The tip card covers the bottom of the level, which is minor.
- w1-02 window: now comfortable. The middle platform is 4 tiles. Q works from about x=6 to x=11 (about 5 tiles); x=11.8 is too late.
- w1-04 window: comfortable. Q works over about 4 tiles of the middle platform. Q on the red bridge kills you.
- Why you fell: still unclear. The player vanishes down the screen with no marker.

## 3. Pixel art
- Gears are easy to tell apart: stripes (blue), grid (green), chevrons (yellow), checker (red) (`11-gears-1-to-4-runner-crops.png`). Background tint helps.
- HUD is readable at 960x540. The drag arrow under slot 4 in `13` is still unlabelled. In w1-04 the tall pillar slides under the HUD panel (`12`).
- Nothing blurry or flickering that I saw.

## 4. World 2
- **w2-01 Commit:** I never found a jump key from the screen. I got E+Right, fell in the gap, then jumped (Space) as the green bridge ends. Takeoff window is about 1 tile: x 10.3 to 10.8 works, x 9.7 falls. 3 to 4 attempts for a voter, difficulty 3. Teaches "jump as you leave a bridge", but no on-screen jump hint.
- **w2-02 Coast:** E x3, run, jump at the red bridge end. Takeoff x 11.5 to 12.7 worked. About 2 to 3 attempts. Difficulty 2.5. The yellow bridge below is not needed by my routes, so "coast" did not read.
- **w2-03 Step Down:** E x3, run, drop onto the bridge. 2 attempts, difficulty 1.5. It is w1-03 with a drop, and I learned nothing new.
- The doors are stacked twin doors in world 2; I did not see a reason.

## Cheese
None found.

## 5. Scores
Overall 3.5. Gameplay 3.5. Graphics 4. Innovation 4. Theme 4. Audio n/a.

## Top fixes
1. Show a jump hint (key cap) in w2-01.
2. Add a "why you fell" cue.
3. Make "Enter: next level" the primary win action, and hide the Sticky Keys card after win.
4. Make w2-03 teach something, and make w2-02's yellow bridge matter.
5. Fix pause text spacing and the HUD overlap in w1-04.
