# Levels

Owner: level-designer. Format: `docs/tech/level-format.md`. Every level ships with `<id>.solution.txt`; `tests/levels/solvability.test.ts` replays each one through the real sim. World 0 is for test rooms and is not in level select.

| Id | Title | World | Teaches | Target first-time solve | Status |
|---|---|---|---|---|---|
| w0-02 | Grey Box | 0 (test) | combine (M1 test room): hold to move, runway to red, air drag, letting go to drop through | 60–90 s | M1 playtest room (M1-20, M1-21), version 2 |
| w1-01 | First Steps | 1 | NEW: hold a direction to walk; blue floors hold you only while you walk | 15–30 s | version 2 (PT-6: P2 4 tiles, same room as w1-02); awaiting design-lead check |
| w1-02 | Shift | 1 | NEW: Shift changes your cruise gear, and with it your color | 30–60 s | version 2 (PT-6: P2 4 tiles); awaiting design-lead check |
| w1-03 | Runway | 1 | NEW: running speed takes distance to build | 30–60 s | approved (2026-11-05) |
| w1-04 | Brake | 1 | NEW: slowing down takes distance too | 45–90 s | version 2 (PT-6: pad 8 tiles); approved subject to v2's numbers, which are met |
| w1-05 | Red Wall | 1 | NEW: a colored wall stops only its own color | 60–120 s | approved (2026-11-05); fair line recorded (PT-6) |
| w2-01 | Commit | 2 | NEW: in the air nothing you press changes your speed; you land in the color you took off in | 30–60 s | built (M2-21), awaiting design-lead approval; `shiftUp` and `jump` hint headers |
| w2-02 | Coast | 2 | NEW: air drag: every 6 tiles of flight costs one color | 45–90 s | built (M2-21), awaiting design-lead approval |
| w2-03 | Step Down | 2 | NEW: walking off a ledge is a shorter flight than jumping | 30–60 s | built (M2-22), awaiting design-lead approval |
| w3-01 | Two Lanes | 3 | NEW: a twin obeys the same keys on its own floor; both must reach home | 30–60 s | built (Batch 5), version 1, awaiting design-lead approval; first Tandem level and the T-20 test level; `move` and `shiftUp` hint headers |

`w0-01` is the format example in `docs/tech/level-format.md`; it is not a file here.

How the checks below were made: candidate input logs replayed through the real sim (`createSim`/`step` from `src/core`), not hand-tuned. "Fairness" moves each key input earlier and later, one step at a time, until the run stops winning (capped at the number shown); the pillar needs at least 3 each way (`tests/levels/robustness.test.ts` now also checks ±3 on every transition). "Fastest known" is the lowest winning step count seen in the sweeps (level plan v3.2; the leaderboard floor is 85% of it).

**Fairness floor** (level plan v3.3, PT-6): every level has at least one winning line whose timed inputs each have a window of at least 30 steps in world 1 (18 from world 2 on), or are position choices at walking pace with at least 1 tile of valid spots. Each level's section names that line under **Fair line**. Windows move one input with the others fixed; press positions are the player's x at the end of the press step.

**World 1 roofs** (GDD §6, level plan v3.2): world-1 colored bridges sit under safe roofs with exactly 2 tiles of headroom, end faces flush with the bridge's first and last columns (w1-05: over its safe tile, flush against the wall), and every spawn and stop pad has at least 5 clear tiles above it. The one exception is w1-04's blue bridge, which has no roof on purpose (see w1-04).

## w0-02 Grey Box

The M1 playtest room (54 × 17, a short scroll). It is not a shipped level. It uses each M1 mechanic once, in order, with safe ground (`#`) between sections so the player can stop and think:

1. **Hold to move (cols 0–12).** Start pad, then an 8-tile blue bridge under a low ceiling. Gear 1 walking is blue, so holding Right crosses it. If you let go over the first 4 tiles you turn white and fall to your death. The low ceiling stops you jumping over the bridge. The start pad (cols 0–2) is open to the top of the room (version 2, M1-21): a standing jump there reaches the full 3.0-tile apex with no ceiling contact. The ceiling starts at col 3, over the bridge only.
2. **Runway and decoy (cols 7–17).** At the end of the bridge you drop into the runway room and land at the very edge of a 5-tile red bridge. The red bridge also has a low ceiling. Running from where you land is the decoy: there is under 1 tile of runway, and red needs 3.2. Walk back to the left wall, shift up to gear 4 and sprint the 5-tile room to cross red.
3. **Air drag (cols 18–36).** An 8-tile safe pad (P3), a 7-tile gap, then a 4-tile yellow pad. A sprint jump drops to yellow after 6 tiles and lands on the yellow pad. A yellow takeoff drops to green and falls through it. P3 is long enough to stop on and still build red again before the gap.
4. **Letting go on purpose (cols 37–53).** Stop on a 5-tile safe pad (P4) and shift down to gear 1. Walk onto the 9-tile blue floor, which dead-ends on a safe nub. The exit is in a pocket under the far end of the floor. Let go over the pocket: grace runs out, you fall through, and you walk into the exit. Under the first 6 tiles of the floor is a death pit. A low ceiling stops anyone jumping across it.

Mechanics covered: gears up and down, acceleration over distance, color-gated floors, color grace, air drag, safe tiles, walls, death and respawn.

**Version 2 (M1-21, 2026-11-04):** rows 4–5 over cols 0–2 opened. Spawn jump: apex 3.0 tiles on flight step 24, lands on step 48, no ceiling event; the same from anywhere on the pad up to x = 2.6 (where the box starts to pass under the bridge ceiling). The pit, the blue bridge (cols 3–10), the divider at col 7, the runway-room floor (row 12) and everything to the right are unchanged, so the e2e pit walk still works.

**Fastest known:** 775 steps (the solution; world 0 is not in level select and has no leaderboard).

**Solution:** 775 steps (12.9 s), unchanged by version 2 (the route never jumps on the start pad). Fairness (earlier/later, capped at 12): turn 12/12, shift-up cluster 6/7, jump 8/9, release on P4 10/9, shift-down cluster 12/12, let-go 12/12, final walk 12/12.

**Cheese checks** (brute-force sweeps through the real sim, rerun on version 2):
- The bridge still can't be jumped: over 3,864 runs (every gear, every takeoff point on the start pad, coyote and double jumps), the feet never rise more than 0.5 tiles while the box is over the bridge columns. No run crosses the bridge without standing on it (3,444 runs).
- Jumping over the red bridge without being red is blocked by the ceilings (0 of 1,440 non-red landings past it; the only 3 flagged runs are a red crossing and two deaths, identical on version 1).
- A yellow takeoff, or downshifting on P3 before the jump, never lands safely past the gap (0 of 3,200).
- Arriving at the blue floor at green, yellow or red never reaches the exit pocket (0 of 34,440), with any timing of jumps, coyote jumps, double presses or extra shifts. With a 5-tile death strip a red hop could reach it, so the strip is 6 tiles.
- Running from where you land in the runway room never crosses red (0 of 61).
- Known expert line, not counted as cheese: shift up on the blue bridge where it overhangs the room, fall through at green, and buffer gear 4 in the air (397 of 6,960 sweep runs). This crosses red without walking back, but only if you land at least 1.9 tiles before the red bridge, so it still builds red over room runway.

## w1-01 First Steps

**Teaches:** hold a direction to walk; walking is blue, and a blue floor holds you only while you walk. Solvable without reading anything.

One screen (24 × 13): spawn pad P1 (3 tiles, open sky) → blue bridge 1 (5 tiles) → safe pad P2 (4 tiles, cols 8–11, open sky) → blue bridge 2 (6 tiles, cols 12–17) → exit pad (`E` at col 21). Both bridges sit over death pits, under a tunnel roof with 2 tiles of headroom; the pads are open to the sky.

**Version 2 (PT-6, 2026-11-13):** one safe column inserted into P2 (3 → 4 tiles), so the room stays identical to w1-02 v2. Bridge 2, its roof and the exit pad moved one column right; the grid is 24 wide. The lesson does not depend on P2's width.

- **Teach → test:** bridge 1 is the cheap place to learn that letting go drops you (you respawn a few tiles away). P2 shows the other half: let go on a white pad and nothing happens, so white is where you stop and think. Bridge 2 (6 tiles, the plan's bridge) is the test.
- **Fails if you let go on a bridge** (acceptance, rerun on v2): letting go after every possible number of steps, the run dies exactly when the box is wholly on a bridge (x 3.37–7.57 on bridge 1, 12.38–17.58 on bridge 2) and survives everywhere else.
- **Removing the new piece breaks it:** the only lines through stand on both blue bridges while walking (0 of 21,226 winning sweep runs skip a bridge on v1). Paint the bridges white and the level has no lesson (letting go stops nothing from working); remove them and there is no way across.
- **Cheese check:** 42,832 runs on v1 (all four gears, every takeoff point, coyote and double jumps, random input logs): 0 wins that skip a bridge. The tunnel roofs stop every jump (the bonked flight is too short for any gear). The spawn pad is 3 tiles so it can't build red (3.23 tiles): with a 5-tile spawn pad a red coyote jump under the roof did skip a 4-tile bridge 1, which is why bridge 1 is 5 tiles and P1 is 3. **v2 recheck of the wider P2** (the new risk is building speed on it): stop on P2, back up 0–70 steps, pick gear 1–4, run 1–61 steps, then no jump, a jump or a double jump: 26,352 runs, 8,276 wins, 0 that skip bridge 2.
- **Fair line:** hold right. No timed input; letting go to rest on P2 works after 123–217 steps of walking (95 steps, 4.75 tiles of spots).
- **Safe spots:** P1 (spawn) and P2.
- **Hint:** `hint: move 1 6`, above the spawn. Its 3 × 2 box (cols 0–2, rows 5–6) is empty sky, 3 rows above the floor row 9. Render-only.

**Fastest known:** 384 steps (hold right from the first step; v1 was 364).

**Solution:** 434 steps. Stand 20 steps, walk 170 steps to P2 (middle of the let-go spots), let go there for 30 steps (safe), walk on to the exit. Fairness (earlier/later, capped at 30): start 19/29, let-go on P2 30/30.

## w1-02 Shift

**Teaches:** Shift changes your cruise gear, and with it your color. Solvable without reading anything.

The same room as w1-01 on purpose, with bridge 1 painted green: the player recognises the room and spots the one difference. Spawn pad P1 (3 tiles) → green bridge (5 tiles) → safe pad P2 (4 tiles, cols 8–11) → blue bridge (6 tiles, cols 12–17) → exit pad (`E` at col 21); death pits and 2-tile tunnel roofs as in w1-01. 24 × 13.

**Version 2 (PT-6, 2026-11-13):** one safe column inserted into P2 (3 → 4 tiles). On v1 the last 0.39 tiles of the 3-tile pad failed (blue comes 0.78 tiles after the press), so the pad read as smaller than it was. Shift-down window **43 → 53 steps** (target ≥ 50), let-go window **37 → 47** (target ≥ 45). Shift-up unchanged.

- **How fast (P1):** press up once. Gear 2 is green 0.6 tiles from standing, or 0.57 tiles after the press if already walking; the last press that still works is at x ≈ 2.87, about 28 steps of walking from the spawn. Two presses make you yellow and you fall through green. No presses: you are blue and walk into the green hole, the cheap first failure right by the spawn.
- **Where (P2):** shift down while holding right, so you are blue 0.78 tiles later. Press too early (still on the green bridge) and you turn blue on green and fall; too late and you reach the blue bridge still green. The window is **53 steps** (walking 54–106 steps after the shift-up, press at x 6.51–11.71, walk held throughout). Letting go to stop on P2, then shifting down and walking on, also works (let-go window **47 steps**, 54–100).
- **Fair line:** shift up while standing on P1 (no time limit), walk, shift down on P2 while walking (53 steps), or let go on P2 (47 steps) and shift down standing (no time limit).
- **Removing the new piece breaks it:** with no shift presses, 0 of 3,208 lines win on v1 (walks, jumps, double jumps, walking back first). Two presses up and walking on (yellow onto green) also never wins; only a later press back down to gear 2 before the bridge saves it.
- **Cheese check:** 39,632 runs on v1 (all gears, every takeoff point, mid-run shifts both ways, random logs): 359 wins, 0 that skip a bridge. Jumping over either bridge at any gear is stopped by the tunnel roofs. **v2 recheck of the wider P2:** stop on P2, back up 0–70 steps, gear 1–4, run 1–61 steps, no jump / jump / double jump: 26,352 runs, 9,113 wins, 0 that skip bridge 2.
- **Safe spots:** P1 (spawn) and P2.
- **Hints:** `hint: shiftUp 1 6` (over P1) and `hint: shiftDown 9 6`, whose box (cols 8–10, rows 5–6) now sits over the first three P2 tiles, where pressing works. Both boxes are empty sky, 3 rows above the floor row 9. Render-only.

**Fastest known:** 273 steps (`1R+ 105R 1R- 7R 1RJ`: shift down at the last moment on P2, then a jump keeps green speed a little longer; it still lands blue on the bridge). Without a jump: 278. v1 was 268.

**Solution:** 326 steps. Stand 20 steps, shift up once, walk right 80 steps, shift down on P2 while walking (x = 9.0, blue at 9.8), walk to the exit. Fairness (earlier/later, capped at 30): shift-up 19/26, shift-down 26/26.

## w1-03 Runway

**Teaches:** running speed takes distance to build. Solvable without reading anything.

One screen (23 × 13): a walled safe room (cols 1–10, open sky) → red bridge (cols 11–16) over a death pit under a 2-tile safe roof → exit pad. The spawn (col 8, x = 8.5) is 2 tiles from the bridge, with 8 tiles of room behind it (cols 1–8).

- **The decision (where to start running):** red needs 3.23 tiles from standing; the spawn has 2.5. Shift up to gear 4 at the spawn and run, and you reach the bridge yellow and fall: a cheap first death next to the spawn. Walk back to the wall (turning at walking pace is instant), shift up, and come in from the far end: red at x = 4.6, 6.4 tiles before the bridge. Any standing start at x ≤ 8.3 works, so the room is generous; the lesson is "back up", not a precise spot.
- **Removing the new piece breaks it:** with a wall right behind the spawn (no room to back up), 0 of 24,840 sweep runs win (every gear, every shift timing, jumps, coyote jumps, random logs). In the real level, every line that never steps back from the spawn loses: 0 of 5,680 (all gears, shifting while running, jumps).
- **Cheese check:** 42,864 runs, 1,643 wins, 0 that skip the bridge. **The roof is needed:** with it removed, 518 of 22,864 runs jump the bridge from near the spawn in green or yellow (e.g. `1+ 1. 32R 1R+ 1RJ`).
- **Fair line:** walk back in gear 1, shift up standing, hold right. Only a position choice at walking pace: any standing start at x ≤ 8.3 wins (6.8 tiles of spots).
- **Safe spots:** the whole room (spawn included) and the exit pad.

**Fastest known:** 77 steps (`4L 1R+ 1R 1R+ 1R 1R+ 300R`: back up 0.2 tiles, shift while starting the run).

**Solution:** 283 steps. Stand 20, walk back to the wall (150L), shift up three times, sprint across. Fairness (earlier/later, capped at 30): walk-back 20/30, turn + shifts 30/30, run start ≥ 3/30.

## w1-04 Brake

**Teaches:** slowing down takes distance too. Solvable without reading anything.

37 × 13, a short scroll: safe runway (cols 0–6; 5.9 tiles from the spawn) → red bridge (cols 7–12) under a 2-tile safe roof → 8-tile safe pad (cols 13–20, open sky) → 12-tile blue bridge (cols 21–32, no roof) → exit pad (cols 33–36, `E` at col 35). Death pits under both bridges. The exit is 7 tiles off screen at spawn (PT-2's edge arrow covers it).

**Version 2 (PT-6, 2026-11-13):** two safe columns inserted into the pad (6 → 8 tiles). The early edge of the window is set by the red bridge's grace, so only the pad's length could move the late edge. Running window **27 → 37 steps** (target ≥ 35), let-go window **24 → 34** (target ≥ 32); 8 tiles was enough, no 9-tile fallback needed. The v1 file comment (x 11.3–16.5) and this README (11.1–16.3) disagreed by one step; both now use the x at the end of the press step.

- **The decision (where to start slowing):** you must sprint across the red bridge and be blue by the blue bridge, and blue comes 3.24 tiles after you shift down (or let go) from sprint. Slow down too early and you turn yellow on the red bridge and fall; too late and you are still green on the blue bridge and fall. Window for the three shift-down presses while running: first press at x 11.1–18.3, **37 steps** (sprinting 63–99 steps after the shift-ups; it opens 1.9 tiles before the pad because red-floor grace holds you for 6 steps after you turn yellow). Letting go on the pad, stopping, shifting down to gear 1 and walking on also works (let-go window **34 steps**, 63–96).
- **Fair line:** the running brake (37 steps) or the let-go (34 steps); the shift-ups are made standing (no time limit).
- **Why the blue bridge has no roof (deviation from the world-1 roof pattern, flagged for design-lead):** a roof face at the far end of the pad would let a sprint jump hit it, wall-stop in the air, and drop to gear 1 instantly, skipping the brake. Measured on a 6-tile roofed blue bridge: 156 of 486 "sprint, jump, never shift down or let go" lines win. With the open 12-tile bridge: 0 of 486. It is 12 tiles so no takeoff from the pad clears it (any non-blue landing on it falls through); a 6-tile open bridge is jumped in 88 of 7,820 sweep runs.
- **Removing the new piece breaks it:** paint the red bridge safe and walking in gear 1 wins with no braking at all (step 644); in the real level it never does. And the brake needs the pad: with no pad (blue bridge right after red), 0 of 564 brake lines win; with 1–2 tiles, only a few frame-exact lines do (2 and 11 of 564).
- **Cheese check:** 41,004 runs on v1, 97 wins, 0 that skip a bridge. A second sweep tracked speed: in 25,728 runs (60 wins), every win drops from red to green on the ground (a real brake), never in the air. Known alternate, not cheese: brake (let go) on the pad until blue, then jump: in the air the gear follows the color, so you land on the blue bridge in gear 1 without pressing shift down. It still needs the braking distance. **v2 recheck:** "sprint, jump (once or twice), never brake" at every step: 0 of 597 win. Gear 4, 0–3 shift-down presses at every point, then a jump or double jump at every second step: 18,928 runs, 490 wins, 0 that skip the blue bridge.
- **Safe spots:** the runway (spawn) and the 8-tile pad.

**Fastest known:** 366 steps (`1R+ 1R 1R+ 1R 1R+ 94R 1R- 5R 1R- 11R 1R- 8R 1RJ`: brake late, then a jump just before the bridge keeps the braking speed in the air; it lands on the blue bridge in gear 1 and walks the rest). Without a jump: 388. The v1 figure (378) came from sweeps without the jump; a jump probably beat it on v1 too.

**Solution:** 469 steps. Stand 20, shift up to gear 4, sprint 81 steps (middle of the window), shift down three times while still holding right (first press at x = 14.5, blue at 17.7), walk the blue bridge. Fairness (earlier/later, capped at 30): shift-up cluster 18/18, shift-down cluster 18/18.

## w1-05 Red Wall

**Teaches:** a colored wall stops only its own color (and it keeps your gear). Solvable without reading anything.

One screen (23 × 13): safe runway (cols 0–8, open sky) → red wall column (col 9, from the safe floor to the top of the level) → 1 safe tile (col 10) → red bridge (cols 11–16) over a death pit → exit pad. A 2-tile safe roof runs over cols 10–16, flush against the wall, so the wall runs from the floor up past the roof line (level plan v3.2) and nothing can be jumped.

- **The tension: not red at the wall, red 2 tiles later.** Arrive red and the wall stops you dead, gear kept; keep holding and you restart at blue, pass the wall and ramp, but red needs 3.23 tiles from the wall face and only 2.75 remain, so you reach the bridge yellow and fall. Intended: cruise yellow (gear 3; the wall lets yellow through) and press up once with the player at x 8.12–10.82 (0.88 tiles before the wall face to 0.18 before the bridge; red 0.66 tiles later): **19 steps**, matching the plan's 2.75 tiles ≈ 18. Also works, same idea: cruise green and press twice (29 steps), or stand in gear 4 0.7–3.6 tiles before the wall face and run (red comes just past the wall).
- **Removing the new piece breaks it:** with the wall removed, sprinting from the spawn wins (step 132) and 299 of 453 "hold right, reach gear 4 at some point" lines win; with the wall, the plain sprint never wins and only 107 of those 453 do, all of them lines whose last press lands in the window (not red at the wall, red before the bridge).
- **Cheese check:** 39,016 runs, 121 wins, 0 that skip the bridge. Arriving red and jumping into the wall wall-stops you in the air (gear 1) and drops you on the safe floor in front of it. **The roof is needed:** without it, 115 of 7,820 runs jump the bridge in yellow after passing the wall.
- **Fair line (PT-6, geometry unchanged, no version bump):** the yellow-press window (19 steps) cannot widen without breaking the lesson: the wall-face-to-bridge distance is 2 tiles, a wall-stopped red player has 2.75 tiles to re-ramp (under red's 3.23), and 3 tiles would give 3.75, so the wall could be ignored. Two lines need no tight timing, measured on the shipped v1:
  - **(a) Standing start:** walk in gear 1, let go, shift up to gear 4 standing, hold right (`20. aR 10. 1+ 1. 1+ 1. 1+ 1. 300R`). Wins for a = 78–136 steps of walking: a **59-step let-go window** (target ≥ 30), stopping at x 5.40–8.30, 0.7–3.6 tiles before the wall face (2.9 tiles of spots). The pause length does not matter (10 or 30 steps, same window).
  - **(b) Backing up from a wall stop** (sprint from the spawn in gear 4, wall-stopped at x = 8.63 on step 77): staying in gear 4, hold left for **21–34 steps** (0.35–0.57 s), then let go and hold right; it wins with any pause from 0 to 30 steps (you stop at x 8.30–5.58). The calmer way is w1-03's skill: shift down to gear 1, walk left for **34–92 steps** (59 steps, the same spots as (a)), stop, shift up to gear 4, hold right.
- **Safe spots:** the runway (spawn). The 1 safe tile behind the wall is not a stop spot (it is under the roof, and stopping there leaves 0.75 tiles to the bridge).

**Fastest known:** 114 steps (`1R+ 1R 1R+ 52R 1R+ 400R`: shift to gear 3 while starting, third press in the window).

**Solution:** 139 steps. Stand 20, shift up to gear 3, run 64 steps, press up once inside the wall (x = 9.62), sprint across. Fairness (earlier/later, capped at 30): gear-3 presses 9/9, run start ≥ 3/9, third press 9/9.

## w2-01 Commit

**Teaches:** in the air nothing you press changes your speed, so you land in the color you took off in. First level of world 2, open from the start, so it must work cold: the `shiftUp` and `jump` glyphs name the keys.

One screen (24 × 13): left wall, safe pad P1 (cols 1–3, open to the top of the level) → green runway (cols 4–10, 7 tiles) over a pit → 4-tile gap (cols 11–14) → green landing pad (cols 15–16) → safe exit pad (cols 17–23, exit 2 tiles tall at col 20 so it reads as a door).

- **The decision (where to jump):** shift up once on P1 (green 0.6 tiles from standing) and jump near the end of the runway. A green jump flies 4.8 tiles and lands green. Window: takeoff at x 9.81–11.81, **21 steps** (0.35 s, the playtest asked for at least 0.3 s in an opening level). Jump earlier and you land in the gap, or back on the runway if very early; nothing helps once you are up: 0 of 783 early jumps win with any air input (left, right, either shift, jump again).
- **Teach → test:** the cheap failures are by the spawn: walking on in gear 1 (blue) or with two presses (yellow) drops you through the runway's first tile. Then the jump, one decision.
- **Removing the new piece breaks it:** fill the gap with green and holding right in gear 2 wins at step 189 with no jump. In the real level no line without a jump wins (0 of 80, every gear and shift timing).
- **No drag rescue before w2-02 (level plan constraint):** a yellow flight is 6.0–7.3 tiles and drags to green, so it must never reach green ground. Two choices make that true. P1 is 3 tiles, so a gear-3/4 player turns yellow on P1 and meets the runway as a hole (coyote only). On a 2-tile pad they turned yellow on the runway itself, grace held them, and a yellow jump landed green. The runway is 7 tiles, so every yellow takeoff from P1 falls in the gap. Sweeps: gear picked on P1, any jump step, walk back first, a second jump (20,160 lines): 384 wins, 0 with a non-green takeoff. Gear 3/4 pressed at any moment while walking (5,520 lines): 0. With a 5-tile runway the same sweeps let 12–188 yellow lines win.
- **Known expert line, not cheese (flagged for design-lead):** green on the runway, shift up and jump within 0.2 s of turning yellow (grace then coyote, the w2-04 Two Colors trick). The yellow takeoff drags back to green 6 tiles out and lands on the pad or the exit pad. It needs a shift press on the runway itself, which every other line punishes. 40,000 random input logs: 708 wins, 73 of them cross this way. One gap cannot separate green and yellow landing spots, so it stays; the fastest known line uses it.
- **Landing:** the green pad is 2 tiles, then safe ground. Holding right always works. Letting go the moment you land kills the earliest 8 of the 21 jump steps (blue on green before you reach safe ground); later landings roll onto the exit pad.
- **Checks:** intended flight 4.8 tiles (≤ 6). No roof (world 2: jumping is the lesson); P1 has 8 clear rows above it. Exit on the first screen.
- **Fair line:** shift up standing on P1 (no time limit), jump in the 21-step window (≥ 18).
- **Safe spots:** P1 (spawn) and the exit pad.
- **Hints:** `hint: shiftUp 2 3` and `hint: jump 2 6`, stacked over P1 (boxes cols 1–3, rows 2–3 and 5–6, empty sky; the floor under col 2 is row 9). Render-only; `tests/levels/hints.test.ts` passes.

**Fastest known:** 157 steps (`1R+ 42R 1R+ 4R 1R+ 10R 1RJ`, the expert yellow line). Green-only best: 187 (`1R+ 87R 1RJ`).

**Solution:** 209 steps. Stand 20, shift up once, walk right, jump at x = 10.91 (middle of the window), land at 15.61, walk into the exit. Fairness (earlier/later, capped at 30): shift-up 19/10, jump 10/10.

## w2-02 Coast

**Teaches:** air drag: every 6 tiles of flight costs one color.

One screen (30 × 13): left wall, safe runway (cols 1–7, 6.5 tiles from the spawn, open sky) → red runway (cols 8–12) over a pit → 7-tile gap (cols 13–19) → yellow landing pad (cols 20–23), **2 tiles lower** → safe exit pad (cols 24–29, exit 2 tiles tall at col 27).

- **The tension (trust the air):** the pad is yellow and you must be red to stand on the red runway. Try to arrive yellow and you fall: gear 3 meets the red runway as a hole, and shifting down on the runway drops you after grace. The only way across is to take off red and let the flight turn you yellow. The solution's jump drags to yellow at x = 18.10 and lands yellow at 21.85.
- **Telegraphed run-up:** the spawn is against the back wall, facing the whole run. Gear 4 from the spawn is red at x = 4.73, 3.3 tiles before the red runway. The cheap failure (walking on too slow) is next to the spawn.
- **Jump window:** takeoff at x 10.10–14.50, **23 steps**. **Deviation from the plan's "flat" gap (flagged for design-lead):** the pad is 2 tiles lower to widen the window (level plan: lower landing pads, not shorter gaps). A flat draft measured 18 steps. The gap is still 7 tiles; the flight is about 9.6 tiles instead of 8.7. The drag drop comes on flight step 30 and the landing on step 55 (≥ 3 steps apart); a second drop would need 12 tiles.
- **Acceptance: a red takeoff lands yellow on the pad, a yellow takeoff falls.** Every win takes off red, and every red crossing is longer than 6 tiles, so every win drags. Shift down on the runway and jump in the grace: 650 lines, 346 yellow takeoffs, 0 wins (they drag to green and fall through the pad). Gear 3 jumping at any step: 0 of 119.
- **Removing the new piece breaks it:** paint the pad red (what a red takeoff would need with no drag): 3 of 139 jump timings still win, the latest ones, which land straight on the exit pad. With drag turned off in a scratch tuning (`airDragTilesPerGear` 1000, tests only), red jumps land red and fall through the yellow pad; only 9 of the 23 window steps still win, because undragged they fly over the pad onto the exit pad.
- **Cheese check:** 166,400 lines (gear 1–4, shift-ups at any point, a shift-down on the runway at various points, a jump at every step, holding or letting go after): 722 wins, 0 without a red takeoff. 40,000 random input logs: 23 wins, all red takeoffs with a drag drop.
- **Landing:** the yellow pad is 4 tiles, then safe ground. Holding right always works. Letting go the moment you land: 11 of the 23 jump steps survive. A 3-tile pad let 8 jump timings skip the yellow pad; a 5-tile pad left only 6 of 23 surviving a release.
- **Checks:** no roof (world 2). The spawn runway is open sky. No hint glyph (none in the plan; jump and shift were shown in w2-01).
- **Fair line:** shift up standing (no time limit), jump in the 23-step window (≥ 18).
- **Safe spots:** the safe runway (spawn) and the exit pad.

**Fastest known:** 153 steps (`1R+ 1R 1R+ 1R 1R+ 73R 1RJ`: shift while starting the run, jump late).

**Solution:** 182 steps. Stand 20, shift up to gear 4, sprint (red at x = 4.73), jump at x = 12.30 (middle of the window), drag to yellow at 18.10, land at 21.85, run into the exit. Fairness (earlier/later, capped at 30): shift-ups 19/11, jump 11/11.

## w2-03 Step Down

**Teaches:** walking off a ledge is a shorter flight than jumping. After w2-01 and w2-02 ("jump off the end of the runway"), the natural move here kills you.

One screen (30 × 13): left wall, safe ledge (cols 1–10, spawn against the wall at x = 1.5, open sky) → a drop of **exactly 4 tiles** → 14-tile red floor (cols 11–24) over a pit → safe exit pad (cols 25–29, exit 2 tiles tall at col 27, on the first screen).

- **The decision (jump or step):** sprint in gear 4 (red at x = 4.73, 6.3 tiles before the edge) and walk off: 29 airborne steps, landing 5.8 tiles out (x = 17.10), one step before the 6-tile drag point, so you land red on the red floor and run on. Jump at the edge and you fly about 10.65 tiles, drag to yellow 6 tiles out and fall through the red floor. A coyote jump just after the edge (it resets the drag counter) drags to yellow, then to green, and falls too.
- **Teach → test:** the cheap failures sit next to a safe ledge: walking off below red (blue, green or yellow) lands on red in the wrong color, and the jump is the second. Both respawn 9 tiles from the edge with the whole picture on screen.
- **Removing the new piece breaks it:** make the floor flat (no ledge, red floor level with the runway) and holding right in gear 4 wins with no walk-off, so there is no lesson. With a **5-tile** drop, 0 of 1,120 lines win (gear 1–4, a walk-off or a jump at every step): the walk-off lands yellow, as the plan says. With the 4-tile drop, a jump at any of the 70 steps from the start of the run through coyote time loses (0 of 70): a jump that leaves the ledge drags to yellow, and an earlier hop lands on the ledge in its takeoff gear (gear follows color in the air, w2-01), so you walk off too slow unless you shift up again.
- **Cheese check:** 3,872 structured lines (gear 1–4, a jump or double jump at every step, letting go, shifting or holding left in the air, late shift-ups): 677 wins, 0 whose flight onto the lower floor started with a jump; every win lands red. 20,000 random input logs: 111 wins, 0 jump-offs. The red floor is 14 tiles so the longest coyote jump (it reaches x ≈ 24.6 below floor level) never reaches the exit pad. Jumping again from the red floor after a walk-off can reach the exit pad (jump at x 20.5–21.3); that is after the lesson and slower (173+ steps).
- **Landing:** holding right always works. Letting go on the red floor drops you (red grace, then a hole), as in world 1.
- **Checks:** no roof (world 2); the ledge has 5 clear rows above it. Drop exactly 4 tiles (level plan, GDD §5.4). No hint glyph (none in the plan).
- **Fair line:** shift up to gear 4 standing (no time limit) and hold right. No timed input: the third shift-up may also come any time in the first 73 steps of walking.
- **Safe spots:** the ledge (spawn) and the exit pad.

**Fastest known:** 142 steps (`1R+ 1R 1R+ 1R 1R+ 137R`: shift while starting the run).

**Solution:** 167 steps. Stand 20, shift up to gear 4, hold right: red at x = 4.73, walk off the edge, land red at 17.10, run into the exit. Fairness: no timed input (±3 passes on every transition).

## w3-01 Two Lanes

**Teaches:** a twin obeys the same keys on its own floor, and the level is won only when both bodies are home. First level of world 3 and open from the start, so it must work cold: the blue/green floors and one shift are all it asks, and the `move` and `shiftUp` glyphs name the keys. It is also the Tandem test level for T-20 and the Nov 17 gate.

One screen (28 × 15), two identical lanes stacked: runner on top (floor row 6), twin below (floor row 13). Each lane: safe pad P1 (cols 0–2, spawn at col 1) → blue bridge (cols 3–7) → safe pad P2 (cols 8–12) → green bridge (cols 13–18) → safe ground to a 2-tile exit. The runner's exit is at col 22, the twin's at col 25.

- **Divider:** the runner's floor (row 6) plus one safe row under each runner pad (row 7), so lanes + divider = 15 rows and each lane is ≤ 7 rows. The runner's bridges sit in the divider and are open below: a runner that falls through drops through the twin's lane and out of the grid. Since the lanes are identical, a runner never falls alone; the twin falls through its own bridge on the same step and the run dies when the twin leaves the grid (shorter drop).
- **The idea, shown not asked:** hold right in gear 1 and both walk blue over the blue bridges; shift up once on P2 and both turn green 0.52 tiles later. The runner reaches its exit 3 tiles earlier (step 307 in the recording) and parks; the twin walks on alone and parks 30 steps later (`won`). The level does not end when your own body is home.
- **Cheap failures, both by a safe pad:** no shift (blue walks into the green hole, dies at step 284 of a plain hold-right), or shifting on P1 (green onto blue). Letting go on either bridge drops both bodies.
- **Splits:** none. Both bodies share x, gear and color on every step until one of them is home (checked in the sweep below). The only difference is the exits, and getting home is final by design.
- **Removing the new piece breaks it:** without the twin this is w1-02 again. The twin is the lesson: the level is won only on the twin's home step.
- **Cheese check:** 198,900 sweep runs through the real sim (0–3 standing presses, a 1–3 up or 1 down press cluster at any of 56 points, no / single / double jump at any of 110 points): 10,348 wins. The Tandem idea cannot be skipped: every win ends on the twin's home step, and runner and twin share x, gear and color on every step of every run until one body is home (the 180 runs where they differ are runs where the runner jumps over its own 2-tile exit door, the twin parks first and the runner has to walk back: a free "home" lesson, not a bug). **Known expert lines, not cheese (flagged for design-lead):** there is no roof (the lanes are open, as in world 2), so world-2 skills can skip a bridge: 168 wins jump the green bridge at yellow or red from P2, and a gear-3 coyote jump off the start of the blue bridge drags to green and lands on P2 (the fastest line). Each needs two or more presses and a timed jump; nothing a cold player does by holding right. If design-lead wants the bridges forced, 2-tile roofs over both bridges in both lanes fit the 15-row budget (version 2).
- **Fair line:** hold right, press up once anywhere from x = 6.43 to 12.93 (after 98–228 steps of walking: a **131-step window**; before P2, the blue bridge's grace carries you onto the pad). Or let go on P2 (walking 123–227 steps, a **105-step window**), shift up standing, hold right. No tight timing.
- **Safe spots:** P1 (spawn) and P2, in both lanes at once; the safe ground before the exits.
- **Hints (runner lane only, level plan v3.1):** `hint: move 1 3` over P1 and `hint: shiftUp 10 3` over P2. Boxes cols 0–2 and 9–11, rows 2–3, empty sky; the floor under both is row 6. Render-only; `tests/levels/hints.test.ts` passes.
- **Spread:** 0 tiles until a body is home; at most 3 in the intended line, at most 5 if the runner jumps over its exit (rule: ≤ 26).

**Fastest known:** 195 steps (`1+ 1. 1+ 1. 27R 1RJ 122R 1R+ 1R 1R+ 400R`: start in gear 3, coyote jump off the blue bridge, drag to green, land on P2, two presses on the green bridge). Hold-right best (one press): 285 (`98R 1R+ 186R`).

**Solution:** 337 steps. Stand 20, walk 162 steps, shift up on P2 (x = 9.63, green at 10.15), walk on; runner home at step 307, twin home and won at 337. Fairness: ±3 passes on every transition; the press window is 131 steps.
