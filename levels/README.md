# Levels

Owner: level-designer. Format: `docs/tech/level-format.md`. Every level ships with `<id>.solution.txt`; `tests/levels/solvability.test.ts` replays each one through the real sim. World 0 is for test rooms and is not in level select.

| Id | Title | World | Teaches | Target first-time solve | Status |
|---|---|---|---|---|---|
| w0-02 | Grey Box | 0 (test) | combine (M1 test room): hold to move, runway to red, air drag, letting go to drop through | 60–90 s | M1 playtest room (M1-20, M1-21), version 2 |
| w1-01 | First Steps | 1 | NEW: hold a direction to walk; blue floors hold you only while you walk | 15–30 s | approved, version 2 (PT-6: P2 4 tiles, same room as w1-02; level plan v3.2) |
| w1-02 | Shift | 1 | NEW: Shift changes your cruise gear, and with it your color | 30–60 s | approved, version 2 (PT-6: P2 4 tiles; level plan v3.2) |
| w1-03 | Runway | 1 | NEW: running speed takes distance to build | 30–60 s | approved (2026-11-05); `shiftUp` hint header over the back wall (design-lead 2026-11-19) |
| w1-04 | Brake | 1 | NEW: slowing down takes distance too | 45–90 s | version 2 (PT-6: pad 8 tiles); approved subject to v2's numbers, which are met; roofless blue bridge accepted (level plan v3.3) |
| w1-05 | Red Wall | 1 | NEW: a colored wall stops only its own color | 60–120 s | approved (2026-11-05); fair line recorded (PT-6) |
| w2-01 | Commit | 2 | NEW: in the air nothing you press changes your speed; you land in the color you took off in | 30–60 s | approved (level plan v3.4, 2026-11-13); grace-and-coyote yellow line accepted as an expert line; `shiftUp` and `jump` hint headers |
| w2-02 | Coast | 2 | NEW: air drag: every 6 tiles of flight costs one color | 45–90 s | approved (level plan v3.4, 2026-11-13); landing pad 2 tiles lower adopted |
| w2-03 | Step Down | 2 | NEW: walking off a ledge is a shorter flight than jumping | 30–60 s | approved, version 2 (B6-06: 3-tile pit at the foot of the ledge; design-lead 2026-11-17, re-stated 2026-11-19); no hint |
| w2-04 | Two Colors | 2 | combine: runway + commit + color grace (turn yellow on green, jump before the floor lets you go) | 60–120 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); `shiftUp` stacked over `jump` hint headers (2026-11-19) |
| w2-05 | Long Haul | 2 | test (long): worlds 1–2 in one run, reading ahead (Coast, Step Down, Red Wall, Brake) | 2–3 min | **new, version 1, for design-lead review** (level plan v4.0); no hints; clean run 16.6 s, under the long-level 40–80 s (see section) |
| w3-01 | Two Lanes | 3 | NEW: a twin obeys the same keys on its own floor; both must reach home | 30–60 s | approved, version 1, no roofs (design-lead, 2026-11-16); first Tandem level and the T-20 test level; `move` and `shiftUp` hint headers |
| w3-02 | Out of Step | 3 | NEW: a wall in one lane holds that body while the other walks on, so you choose how far out of step they are | 60–120 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); safe kerb instead of the spec's blue wall (see section); runner-lane hint header `jump 5 3` only (batch 10, design-lead 2026-11-23 evening and the w3-02 placement ruling; header only, no version bump) |
| w3-03 | Gear Split | 3 | NEW: a stop in mid-air drops only that body's gear | 60–120 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); flat landing pad (18-step window); runner-lane hint headers `shiftUp 2 3` (2026-11-20, B8-01) and `jump 12 3` (2026-11-19) |
| w3-04 | Clamp | 3 | NEW: pressing up past gear 4 brings split gears back together | 90–150 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); runner-lane hint headers `shiftUp 2 3`, `jump 12 3` (2026-11-20, B8-01: the batch 7 fallback fired) |
| w3-05 | Redshift | 3 | combine: air-stop split + clamp down + pin + shared drag jump + park + brake | 3–5 min | **version 2, APPROVED** (design-lead 2026-11-23, tech-lead review 2026-11-23 `docs/tech/reviews/2026-11-batch9-review.md`; batch 8 playtest: a 1-tile step at x 36 at the back of the run-up in both lanes); v1 approved 2026-11-17; safe kerbs instead of blue walls; runner-lane hint headers `jump 12 3`, `shiftUp 36 3`, `jump 40 3` (re-measured for v2; the kerb `jump` moved from col 41 to col 40 in batch 10, design-lead 2026-11-23 evening, header only, no version bump; see section) |

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
- **Hint (design-lead 2026-11-19):** `hint: shiftUp 2 6`, over the back wall: it says where to shift, which here is the lesson (start from the back), and sits away from the spawn, so the cheap first fall still happens. Its 3 × 2 box (cols 1–3, rows 5–6) is empty sky, 3 rows above the floor row 9. Render-only: no version bump, same recording.

**Fastest known:** 77 steps (`4L 1R+ 1R 1R+ 1R 1R+ 300R`: back up 0.2 tiles, shift while starting the run).

**Solution:** 283 steps. Stand 20, walk back to the wall (150L), shift up three times, sprint across. Fairness (earlier/later, capped at 30): walk-back 20/30, turn + shifts 30/30, run start ≥ 3/30.

## w1-04 Brake

**Teaches:** slowing down takes distance too. Solvable without reading anything.

37 × 13, a short scroll: safe runway (cols 0–6; 5.9 tiles from the spawn) → red bridge (cols 7–12) under a 2-tile safe roof → 8-tile safe pad (cols 13–20, open sky) → 12-tile blue bridge (cols 21–32, no roof) → exit pad (cols 33–36, `E` at col 35). Death pits under both bridges. The exit is 7 tiles off screen at spawn (PT-2's edge arrow covers it).

**Version 2 (PT-6, 2026-11-13):** two safe columns inserted into the pad (6 → 8 tiles). The early edge of the window is set by the red bridge's grace, so only the pad's length could move the late edge. Running window **27 → 37 steps** (target ≥ 35), let-go window **24 → 34** (target ≥ 32); 8 tiles was enough, no 9-tile fallback needed. The v1 file comment (x 11.3–16.5) and this README (11.1–16.3) disagreed by one step; both now use the x at the end of the press step.

- **The decision (where to start slowing):** you must sprint across the red bridge and be blue by the blue bridge, and blue comes 3.24 tiles after you shift down (or let go) from sprint. Slow down too early and you turn yellow on the red bridge and fall; too late and you are still green on the blue bridge and fall. Window for the three shift-down presses while running: first press at x 11.1–18.3, **37 steps** (sprinting 63–99 steps after the shift-ups; it opens 1.9 tiles before the pad because red-floor grace holds you for 6 steps after you turn yellow). Letting go on the pad, stopping, shifting down to gear 1 and walking on also works (let-go window **34 steps**, 63–96).
- **Fair line:** the running brake (37 steps) or the let-go (34 steps); the shift-ups are made standing (no time limit).
- **Why the blue bridge has no roof (deviation from the world-1 roof pattern, accepted in level plan v3.3):** a roof face at the far end of the pad would let a sprint jump hit it, wall-stop in the air, and drop to gear 1 instantly, skipping the brake. Measured on a 6-tile roofed blue bridge: 156 of 486 "sprint, jump, never shift down or let go" lines win. With the open 12-tile bridge: 0 of 486. It is 12 tiles so no takeoff from the pad clears it (any non-blue landing on it falls through); a 6-tile open bridge is jumped in 88 of 7,820 sweep runs.
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
- **Known expert line, not cheese (accepted in level plan v3.4):** green on the runway, shift up and jump within 0.2 s of turning yellow (grace then coyote, the w2-04 Two Colors trick). The yellow takeoff drags back to green 6 tiles out and lands on the pad or the exit pad. It needs a shift press on the runway itself, which every other line punishes. 40,000 random input logs: 708 wins, 73 of them cross this way. One gap cannot separate green and yellow landing spots, so it stays; the fastest known line uses it.
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
- **Jump window:** takeoff at x 10.10–14.50, **23 steps**. **Deviation from the plan's "flat" gap (adopted in level plan v3.4):** the pad is 2 tiles lower to widen the window (level plan: lower landing pads, not shorter gaps). A flat draft measured 18 steps. The gap is still 7 tiles; the flight is about 9.6 tiles instead of 8.7. The drag drop comes on flight step 30 and the landing on step 55 (≥ 3 steps apart); a second drop would need 12 tiles.
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

One screen (30 × 13): left wall, safe ledge (cols 1–10, spawn against the wall at x = 1.5, open sky) → a **3-tile pit at the foot of the ledge** (cols 11–13) → 11-tile red floor (cols 14–24) **exactly 4 tiles below the ledge**, over a pit → safe exit pad (cols 25–29, exit 2 tiles tall at col 27, on the first screen).

**Version 2 (design-lead B6-06, 2026-11-16):** the first 3 red columns (11–13) are now open pit, nothing else moved. In v1 the playtester held right and never felt the pull to jump; a visible gap below the edge now invites the world-2 jump that the level punishes.

- **The decision (jump or step):** sprint in gear 4 (red at x = 4.73, 6.3 tiles before the edge) and walk off: 29 airborne steps, landing 5.8 tiles out (x = 17.10, step 119 of the recording, 3 tiles past the pit), one step before the 6-tile drag point, so you land red on the red floor and run on. Jump at the edge and you fly about 10.65 tiles, drag to yellow 6 tiles out and fall through the red floor. A coyote jump just after the edge (it resets the drag counter) drags to yellow, then to green, and falls too.
- **Teach → test:** the cheap failures sit next to a safe ledge: walking off below red (blue, green or yellow) drops into the pit or lands on red in the wrong color, and the jump is the second. Both respawn 9 tiles from the edge with the whole picture on screen.
- **Removing the new piece breaks it** (rerun on v2): make the floor flat and holding right in gear 4 wins with no walk-off, so there is no lesson. With a **5-tile** drop, 0 of 1,120 lines win (gear 1–4, a walk-off or a jump at every step): the walk-off lands yellow. With the 4-tile drop, a jump at any of the 71 steps from the start of the run through coyote time loses (a jump that leaves the ledge drags to yellow, and an earlier hop lands on the ledge in its takeoff gear, so you walk off too slow).
- **Cheese check (v2):** 5,280 structured lines (0–3 standing shift-ups, a jump or none at each of 110 steps, then hold, let go, turn back, a second jump or a shift down): 463 wins, 0 whose flight onto the lower floor started with a jump; every win lands red. 20,000 random input logs: 146 wins, 0 jump-offs. No jump off the ledge (coyote jumps included) reaches the exit pad at col 25. Jumping again from the red floor after a walk-off can reach the exit pad; that is after the lesson and slower.
- **Landing:** holding right always works. Letting go on the red floor drops you (red grace, then a hole), as in world 1.
- **Checks:** no roof (world 2); the ledge has 5 clear rows above it. Drop exactly 4 tiles (level plan, GDD §5.4). No hint glyph (none in the plan).
- **Fair line:** shift up to gear 4 standing (no time limit) and hold right. No timed input: the third shift-up may also come any time in the first 73 steps of walking.
- **Safe spots:** the ledge (spawn) and the exit pad.

**Fastest known:** 142 steps (`1R+ 1R 1R+ 1R 1R+ 137R`: shift while starting the run), unchanged by v2.

**Solution:** 167 steps (v2, re-recorded: same inputs). Stand 20, shift up to gear 4, hold right: red at x = 4.73, walk off the edge, clear the pit, land red at 17.10, run into the exit. Fairness: no timed input (±3 passes on every transition).

## w2-04 Two Colors

**Teaches:** combine: runway + commit + color grace. You can only stand on the green floor while green and only land on the yellow ledge while yellow, so you turn yellow on the green floor and jump in the moment before it lets you go.

One screen (32 × 13): left wall, safe pad P1 (cols 1–3, spawn at col 1, open sky) → 11-tile green floor (cols 4–14) over a pit → yellow ledge (cols 13–21, row 7: its top is 2 tiles above the green floor, and it overhangs the floor's last 2 columns) → safe exit block (from col 22 at ledge level, exit 2 tiles tall at col 28, on the first screen).

- **The decision (shift, then jump):** cruise green (gear 2, green 0.6 tiles from standing, still on P1), shift up once on the floor: yellow 4 steps (0.46 tiles) after the press. The green floor holds a yellow player for the 6-step grace, then 6 steps of coyote. Jump in that time and you take off yellow, fly about 5.5 tiles up onto the ledge (under the 6-tile drag point) and land yellow. Jump window: the 4th to 16th step after the press, **13 steps**. Shift spots (with the jump 10 steps after the press): x 5.8–9.8, **41 steps** at green pace (4 tiles).
- **Teach → test, cheap failures next to P1:** a green jump passes straight through the ledge (commit: nothing changes in the air) and lands back on the green floor or in the pit; shifting and waiting drops you through the floor; walking on in gear 1 or 3 drops you at the floor's first tile.
- **Under the ledge (alternate, same idea):** shift up under the overhang (cols 13–14) and you turn yellow inside the ledge, so yellow is a ghost to you (no-embed, GDD §4.7); a jump in the same 13 steps rises through it and lands on top. Not cheese: it is the same turn-yellow-then-jump.
- **Removing the idea breaks it:** paint the ledge green and a plain gear-2 jump with no shift wins (27 of 140 jump steps); in the real level the same 140 jumps win 0. With color grace and coyote both set to 0 (scratch tuning, tests only), the shift-then-jump sweep drops from 846 to 126 wins of 2,886, and those 126 are frame-exact jumps on the step you turn yellow (about one step per shift spot).
- **Cheese check:** 80,936 structured runs (walk back 0 or 20 steps, 0–3 standing presses, a 1-up / 2-up / 1-down press cluster at 22 points, no / single / double jump at 75 points): 432 wins, **every one a yellow takeoff from the green floor**, 0 from P1 (a gear-3 player is yellow at the end of P1, but the ledge starts 9 tiles out). A green jump onto the safe block is impossible: a draft with the floor ending 2 tiles before the block let a gear-2 jump land on it, so the floor ends at col 14 and the block starts at col 22. 20,000 random input logs: 0 wins (dies first; uninformative).
- **Checks:** intended flight 5.55 tiles (≤ 6, lands yellow). Climb 2 tiles. No yellow tile over a yellow floor (no-embed rule). No roof (world 2).
- **Hints (design-lead 2026-11-19):** `hint: shiftUp 8 4` stacked over `hint: jump 8 6`, one column over the green floor, read top to bottom as "shift up, then jump, here" (the recording shifts at x 8.11 and jumps at 9.41). Boxes cols 7–9, rows 3–4 and 5–6, empty sky, 8 px apart; the floor under them is row 9. Grace is taught nowhere else, so this combine level is hinted (playtest: about 6 failed jumps). Render-only: no version bump, same recording.
- **Fair line:** shift up to gear 2 standing (no time limit), shift up again anywhere in 41 steps / 4 tiles of the floor, jump in the 13-step window. **Below the fairness floor (flagged for design-lead):** the jump window is grace + coyote (6 + 6 steps, plus the step you turn yellow), set by tuning, not geometry; the plan row names 12 steps. No layout widens it without letting the player jump from safe ground, which removes grace from the lesson. The ±3 robustness test passes (the recording jumps 6 steps after turning yellow, in the middle of the window).
- **Safe spots:** P1 (spawn, right before the floor) and the exit block.

**Fastest known:** 192 steps (`1R+ 37R 1R+ 15R 1RJ 400R`: shift to gear 2 while starting the run, shift up early on the floor, jump at the last step of the window).

**Solution:** 225 steps. Stand 20, shift up once standing, walk 70 steps (onto the floor green), shift up at x = 8.11, yellow at 8.57, jump at 9.41 (6 steps after turning yellow), land yellow on the ledge at 14.96, run into the exit. Fairness (earlier/later): jump 6/6, shift press 23/17 with the jump delay kept.

## w2-05 Long Haul

**Teaches:** nothing new (TEST, long; level plan v4.0 "w2-05" and "Long levels"): worlds 1–2 in one run. Read ahead and set your gear for the next room while you run the current one. It uses only existing pieces (safe tiles, colored floors and walls), with no new engineering, no checkpoints and no hints.

106 × 15, scrolls. Rows 0–1 are the rows the HUD covers when the 15-row level is centred, so they hold no colored tile or exit. Four rooms, each a level the player has already solved, with new numbers, and each entered over safe ground:

1. **Coast (cols 0–23, hardest, first).** Left wall, safe run-up (cols 1–7, spawn against the wall, open sky) → red runway (cols 8–12) → 7-tile gap (cols 13–19) → yellow pad (cols 20–23) **3 tiles lower** (w2-02's is 2 lower). Take off red, drag to yellow 6 tiles out, land yellow. The extra tile of drop lifts the jump window from w2-02's 23 steps to **25** (takeoff x 9.70–14.50), which meets the plan's ≥ 24.
2. **Step Down (cols 24–49).** Safe ledge (cols 24–35, 12 tiles: stop and think) → 3-tile pit (cols 36–38) → 11-tile red floor (cols 39–49) exactly 4 tiles below (w2-03's geometry). The Coast lands you in gear 3 (yellow): press up once on the ledge and walk off red (you land red at x 42.17). Walk off yellow and you fall through the red floor; jump off and you drag to yellow and fall.
3. **Red Wall (cols 50–71).** Safe approach (cols 50–63, 14 tiles: stop and think) → a **2-tile red door** (col 64, rows 10–11) set in a safe mass that runs to the top of the level (so no red tile sits in the HUD rows) → 1 safe tile → red bridge (cols 66–71) under a 2-tile safe roof flush with its last column (w1-05's room). New numbers: you arrive red from the red floor, so the flow line brakes to **green** on the approach (two presses down) and presses up **twice** at the door (green to red takes 1.83 tiles). That gives a 30-step window where w1-05's yellow single press has 19. Arrive red and the door stops you; from its face red needs 3.23 tiles and only 2.75 remain.
4. **Brake (cols 72–105, the easy last third).** 8-tile safe pad (cols 72–79, open sky) → **18-tile** blue bridge (cols 80–97, no roof, as in w1-04: no takeoff clears it) → safe exit pad (cols 98–105, exit 2 tiles tall at col 102). Shift down three times while running, or let go on the pad, stop, shift down and walk on.

**How the rooms are ordered.** Hardest first. The Coast has the narrowest window (25 steps) and is the only room you cannot slow down for, so it sits next to the spawn, where a death costs about 2 s. Each later room is easier than the one before, and each starts on safe ground long enough to stop on (12, 14 and 8 tiles), so a player can stop and think between any two rooms. Step Down has no tight timing (a 52-step press window, or press while standing). The Red Wall has two 30-step windows, or a standing start with no timing. The last third is world 1's Brake with 37- and 34-step windows and an 18-tile walk home. The order also chains the gears: the Coast lands you yellow (one press up for the walk-off), the walk-off lands you red (brake for the door), and the door leaves you red (brake for the blue bridge). Reading ahead means choosing the next room's gear while you run the current one.

- **Fair line (the recording):** every timed input has a window of at least 25 steps (level plan: ≥ 24; world-2 floor 18). Each window moves one input (or one press pair or triple) with the others fixed; x is the player's x at the end of the press step.
  - jump: takeoff x 9.70–14.50, **25 steps** (12 earlier / 12 later);
  - press up for the walk-off: **52 steps** (25/26), or press while standing on the ledge (no time limit);
  - approach press-down pair: **30 steps** (13/16), first press at x 51.36 in the recording;
  - door press-up pair: **30 steps** (13/16), first press at x 63.14 (red at 64.94, past the door);
  - brake triple: **37 steps** (17/19), first press at x 73.51 (blue at 76.55);
  - the shift-ups at the spawn are made standing, before moving (no time limit).
- **No-timing alternatives** (for a player who stops): at the Red Wall, let go on the approach, stop, shift down to gear 1, walk right for 110–168 steps (**59 steps** at walking pace, about 3 tiles of spots), stop, shift up to gear 4 and run (w1-05's fair line (a)). At the Brake, let go on the pad (**34-step** let-go window, 36–69 steps after the door presses), shift down standing and walk on.
- **No forced wait:** none; every stop is optional.
- **COMBINE rule (no win skips the Coast or the walk-off),** sweeps through the real sim:
  - Coast: 7,290 lines (0–4 standing shift-ups, an optional shift-down on the runway at 6 points, a jump at every step from 30 to 110, an optional second jump): 684 reach the ledge alive, **all** of them across the gap on a red takeoff that drags.
  - Step Down: 8,064 lines from the Coast landing (0–2 presses up at 4 points, a jump at every step through coyote time, an optional second jump, hold or let go): 878 reach the approach alive, **0** whose drop onto the red floor started with a jump.
  - Jump injection: the recording with one or two extra jumps at every step (4,000 lines): 2,661 wins, every one a red Coast takeoff and a walk-off.
- **Red Wall check:** 86,688 lines from the red floor (0–3 presses down and 0–3 up at every third step, an optional jump around the presses): 1,454 reach the brake pad alive, **0** of them after a stop at the door.
- **Brake check:** never braking, with one or two jumps at any of 160 steps (960 lines): 0 wins. Braking only to green or yellow, with or without a jump (714 lines): 0 wins.
- **Pockets:** none (`src/entities/sealedPockets.test.ts` passes with w2-05 present).
- **Safe spots:** the spawn run-up, the ledge, the approach, the brake pad and the exit pad.
- **Hints:** none (level plan: "No hints"; every key was shown in worlds 1–2).
- **Length (open for design-lead):** 106 tiles; the clean run is **996 steps (16.6 s)**, under the long-level rule's 40–80 s. With these four rooms the run is mostly sprinting at 9–12 tiles/s, and 40 s over 100–150 tiles needs an average of 2.5–3.75 tiles/s, which means walking most of the level. Options: accept it as a short long level; add a world-1 walking lap to the last third (for example w1-02's green and blue bridges, about +10 s and +40 tiles); or widen it with walk-only blue bridges (more time, no more decisions). First clears should still take 2–3 min with deaths.

**Fastest known:** 845 steps (`1R+ 1R 1R+ 1R 1R+ 75R 1RJ 59R 1R+ 148R 1R- 56R 1R+ 70R 1R- 2R 1R- 1R 1R- 20R 1RJ` then hold right: shift while starting the run, press down once to yellow and make w1-05's single press at the door, then a jump onto the blue bridge after braking).

**Solution:** 996 steps (16.6 s). Stand 20, shift up to gear 4, sprint, jump at x = 12.10, land yellow at 22.10; press up at x = 25.10, walk off red, land red at 42.17; press down twice at x = 51.36 (green at 53.08); press up twice at x = 63.14 (red at 64.94); press down three times at x = 73.51 (blue at 76.55); walk the blue bridge into the exit. `tests/levels` passes, including ±3 on every transition.

## w3-01 Two Lanes

**Teaches:** a twin obeys the same keys on its own floor, and the level is won only when both bodies are home. First level of world 3 and open from the start, so it must work cold: the blue/green floors and one shift are all it asks, and the `move` and `shiftUp` glyphs name the keys. It is also the Tandem test level for T-20 and the Nov 17 gate.

One screen (28 × 15), two identical lanes stacked: runner on top (floor row 6), twin below (floor row 13). Each lane: safe pad P1 (cols 0–2, spawn at col 1) → blue bridge (cols 3–7) → safe pad P2 (cols 8–12) → green bridge (cols 13–18) → safe ground to a 2-tile exit. The runner's exit is at col 22, the twin's at col 25.

- **Divider:** the runner's floor (row 6) plus one safe row under each runner pad (row 7), so lanes + divider = 15 rows and each lane is ≤ 7 rows. The runner's bridges sit in the divider and are open below: a runner that falls through drops through the twin's lane and out of the grid. Since the lanes are identical, a runner never falls alone; the twin falls through its own bridge on the same step and the run dies when the twin leaves the grid (shorter drop).
- **The idea, shown not asked:** hold right in gear 1 and both walk blue over the blue bridges; shift up once on P2 and both turn green 0.52 tiles later. The runner reaches its exit 3 tiles earlier (step 307 in the recording) and parks; the twin walks on alone and parks 30 steps later (`won`). The level does not end when your own body is home.
- **Cheap failures, both by a safe pad:** no shift (blue walks into the green hole, dies at step 284 of a plain hold-right), or shifting on P1 (green onto blue). Letting go on either bridge drops both bodies.
- **Splits:** none. Both bodies share x, gear and color on every step until one of them is home (checked in the sweep below). The only difference is the exits, and getting home is final by design.
- **Removing the new piece breaks it:** without the twin this is w1-02 again. The twin is the lesson: the level is won only on the twin's home step.
- **Cheese check:** 198,900 sweep runs through the real sim (0–3 standing presses, a 1–3 up or 1 down press cluster at any of 56 points, no / single / double jump at any of 110 points): 10,348 wins. The Tandem idea cannot be skipped: every win ends on the twin's home step, and runner and twin share x, gear and color on every step of every run until one body is home (the 180 runs where they differ are runs where the runner jumps over its own 2-tile exit door, the twin parks first and the runner has to walk back: a free "home" lesson, not a bug). **Known expert lines, not cheese (accepted by design-lead 2026-11-16, no roofs):** there is no roof (the lanes are open, as in world 2), so world-2 skills can skip a bridge: 168 wins jump the green bridge at yellow or red from P2, and a gear-3 coyote jump off the start of the blue bridge drags to green and lands on P2 (the fastest line). Each needs two or more presses and a timed jump; nothing a cold player does by holding right.
- **Fair line:** hold right, press up once anywhere from x = 6.43 to 12.93 (after 98–228 steps of walking: a **131-step window**; before P2, the blue bridge's grace carries you onto the pad). Or let go on P2 (walking 123–227 steps, a **105-step window**), shift up standing, hold right. No tight timing.
- **Safe spots:** P1 (spawn) and P2, in both lanes at once; the safe ground before the exits.
- **Hints (runner lane only, level plan v3.1):** `hint: move 1 3` over P1 and `hint: shiftUp 10 3` over P2. Boxes cols 0–2 and 9–11, rows 2–3, empty sky; the floor under both is row 6. Render-only; `tests/levels/hints.test.ts` passes.
- **Spread:** 0 tiles until a body is home; at most 3 in the intended line, at most 5 if the runner jumps over its exit (rule: ≤ 26).

**Fastest known:** 195 steps (`1+ 1. 1+ 1. 27R 1RJ 122R 1R+ 1R 1R+ 400R`: start in gear 3, coyote jump off the blue bridge, drag to green, land on P2, two presses on the green bridge). Hold-right best (one press): 285 (`98R 1R+ 186R`).

**Solution:** 337 steps. Stand 20, walk 162 steps, shift up on P2 (x = 9.63, green at 10.15), walk on; runner home at step 307, twin home and won at 337. Fairness: ±3 passes on every transition; the press window is 131 steps.

## w3-02 Out of Step

**Teaches:** a wall in one lane holds that body still while the other walks on, so you choose how far out of step they are.

34 × 15, a short scroll. Runner lane on top (floor row 6); a safe divider (rows 7–10) with a closed pocket under the runner's green bridge; twin lane below (floor row 13) under a safe roof (row 10, 2 tiles of headroom). Spawns col 1 (rows 5 and 12).
- Runner: safe floor cols 0–9 with a **1-tile safe kerb at col 8** → green bridge cols 10–25 → safe ground, exit col 29.
- Twin: safe pad cols 0–2 → blue bridge cols 3–13 → **safe pad Q cols 14–21 (8 tiles)** → green bridge cols 22–27 → safe ground, exit col 31.
- Every x where the twin can stand on Q (13.6–22.4) is over the runner's green bridge (cols 10–25), so with the bodies in step any shift that saves one drops the other.

**Deviation from `levels-w3.md` (please rule):** the spec's full-height **blue** wall does not pin a walking body in the sim. The wall stop leaves the body white (`vx` 0, band 0); on the next step it moves before its band is recomputed, so it steps into the wall as white, turns blue inside it, and the no-embed rule lets it walk through (measured: the runner passes a blue wall column at walking pace one step after the stop, x 7.63 → 7.65 → 9.2 by step 175). No colored wall can hold a walking body for more than one step. The nearest build that keeps the idea is a **safe kerb** (1 tile tall): it holds the runner for as long as you hold right, and you clear it with a **green jump** after backing up. Other changes that follow: the twin lane has a 2-tile roof (so the shared jump cannot hop the twin's bridges), Q is 8 tiles (the twin must stay on it while you back up about 4 tiles), and the divider is thick with a pocket under the runner's green bridge (a runner that drops through it is caught there; restart with R). Without the pocket a falling runner landed on the twin's floor and could finish in the twin's lane.

- **The idea:** hold right in gear 1. The kerb stops the runner (x = 7.625, step 143 of the recording) while the twin walks on across its blue bridge. Let go with the twin on Q, walk back about 4 tiles (the twin stays on Q), shift up once, hold right and jump the kerb green: the runner lands green on its green bridge, the twin walks green over its own.
- **Fair line (all position choices at walking pace plus one jump):** walk 323–417 steps before letting go (**95 steps**, the twin stopping anywhere on 4.7 tiles of Q), walk back 51–122 steps (**72**), shift up standing (no time limit), jump 10–39 steps after starting the run (**30**, ≥ 18).
- **Park line (allowed, it still uses the pin):** with the twin on Q and the runner held, shift up and keep holding right: the runner stays held at the kerb, the twin turns green, crosses and parks. Then walk the runner back, run, jump: jump window 34–72 steps (39) with a 70-step back-up.
- **Cheap failures, all by safe ground:** shift up at the spawn (the twin turns green on its blue bridge and falls); hold too long (the twin walks off Q onto its green bridge in blue); back up too far (the twin leaves Q); let go while the twin is on its blue bridge (it drops); jump the kerb in blue or from the kerb face (an air wall stop, or a blue landing on the green bridge).
- **Split:** **final** in position (about 7–15 tiles apart from the pin on); both cruise gear 2 to their exits; the twin parks first.
- **Removal test:** with the kerb removed, 0 of 98,280 sweep runs win (gear 0–3 standing presses; a 1-up, 2-up or 1-down cluster at every 8th step with no jump or a jump at every 10th; walk / let go / walk back / 0–2 presses / run / one or two jumps over a grid of 18 × 15 × 4 × 21 × 3).
- **Park-line check:** the twin can only be home first after standing on Q with the runner still on its safe floor, which needs the held runner; the runner can never be home first (it must jump green, and the twin at the same x would be on its blue bridge green). The sweep below confirms it.
- **Cheese check:** the same 98,280-run sweep on the real level: 872 wins, **0** in which the twin was less than 3 tiles ahead when the runner got past the kerb (every win holds the runner at the kerb first). The twin's roof stops every twin jump; the runner's kerb is the only way past being one tile tall, and nothing else in the runner's lane can hold it.
- **Lane rules:** spawn rows 5 and 12 (7 apart); colored tiles only in rows 6 (runner) and 13 (twin). HUD area clear (the kerb is safe). 15 rows. Spread on the intended line at most 12.1 (sweep max 14.7; rule ≤ 26).
- **Safe spots:** both spawn pads, the runner's floor before the kerb and Q, the ground before both exits.
- **Seen on screen:** dev build on port 5187, both lanes, kerb, roof, pocket and both gear strips drawn as intended.
- **Hint (design-lead 2026-11-23 evening, batch 10; `decisions.md` "Walking back" and "Batch 10 w3-02 placement ruling"):** one runner-lane header, `hint: jump 5 3`, w2-01's "jump here". Two sittings needed 20+ tries here with no hint, and this level is the source of w3-05's kerb sequence. The pin (the new idea) and the shift to green are **not** hinted (the green bridge asks for green, as w1-02 and w3-01 teach). The glyph centre (x 5.5) is 2.1 tiles **behind** the runner held at the kerb (x 7.625), so "jump from back there" implies the walk back. Header only: no `version` bump, same recording, same `LEVELS` entry. Measured through the sim (`createSim`/`step`) on the fair line, everything else as in the recording:
  - **Walk-back stop (not hinted, kept for the record):** with the recorded run (25 steps, then jump) the stops that win are **51–122 steps of walking back, runner x 1.53–5.08** (centre 3.30); the recording stops at 3.63. With the jump re-timed, stops from x 6.68 (19 steps back) win, but the jump window is under 18 steps until x 4.98 (53 back). Further back is roomier (35–39-step windows from x 2–3); 122 steps is where the twin leaves Q.
  - **Kerb take-off (`jump 5 3`):** from the recording's stop (x 3.63) the take-offs that win are **x 4.22–7.03** (10–39 steps of running, 30 steps), **middle 5.63, col 5**. The late edge is 7.03–7.08 from every fair stop (past it the runner hits the kerb face in the air and is pinned); the early edge moves with the stop (5.60 from x 5.08, 3.23 from x 1.53). The green run is 6 tiles/s there, so a 150–200 ms reaction is 0.9–1.2 tiles: a player who jumps on passing under the glyph centre (x 5.5) takes off at 6.4–6.7 and wins from every stop from 1.63 to 4.63 (checked at nine stops). Under col 6 (centre 6.5) the same reaction takes off at 7.4–7.6 and is pinned every time, the w3-05 col-41 failure. Box cols 4–6 (world px 71–106 × 40–64), left of the kerb face (x 8, px 128), empty sky, floor row 6 under it (3 rows).
  - **No `shiftUp` (ruling):** with `jump` at col 5 the no-shared-cell rule allows `shiftUp` at col 2 at most, over the spawn, where it reads "shift up now" (as in w3-03 and w3-04), and shifting at the spawn is this level's first cheap failure.
  - Screen y 55–79 at every camera x (15 rows, scroll y −15), never under the HUD.

**Fastest known:** 476 steps (`222R 1R+ 10L 21R 1RJ 600R`: shift up while the runner is held and the twin is reaching Q, back up half a tile, run and jump the kerb; the twin parks first). The structured sweep's best with the stand-still start was 578.

**Solution:** 742 steps. Stand 20, walk 365 (runner held from step 143), let go (twin x = 19.7 on Q), walk back 80 (runner 3.6, twin 15.7), shift up standing, run 25 and jump the kerb green at x = 5.7, hold right: the twin parks at step 641, the runner at 742. Windows above are for this recording; ±3 passes on every transition.

## w3-03 Gear Split

**Teaches:** a stop in mid-air drops only that body's gear, so one input now gives two colors.

47 × 15, a short scroll. Runner lane on top (floor row 6), twin lane below (floor row 13, the template rows). Spawns col 1 (rows 5 and 12), both against a left wall.
- Runner: safe floor to col 24 with a **hanging safe block** (cols 16–17, rows 1–3: face at x = 16, bottom 2 tiles above the floor, top 5 above) → **blue bridge cols 25–34** → safe ground, exit col 38. Under the blue bridge the divider holds a closed pocket (rows 7–9, floor row 10).
- Twin: w2-02's Coast, **flat**: safe runway cols 1–7 → red runway cols 8–12 → 7-tile gap → yellow floor cols 20–39 (the landing pad and the floor to the exit) → safe, exit col 42.

**Differences from `levels-w3.md` (please rule):**
- **Flat landing pad (window 18, not 23).** With the pad 2 tiles lower the twin lands 7 steps after the runner, and a shift pressed in the last steps of the flight reached only the runner (shift buffer): with the block removed, 80 of 3,844 "jump, then press down once or twice in the air" lines won by splitting gears that way, a second, untaught way to split. Flat, both land on the same step (144). One frame-exact case remains on the block-less variant (the earliest takeoff, where the twin's box overhangs the gap for one more step, with the second down press on one exact step: 1 of 3,844); it needs the block gone, so the level as built is not affected. The window is the fairness floor exactly (18 steps, the w2-02 flat draft's number).
- **Blue bridge 10 tiles at cols 25–34, a pocket under it, and a long safe stretch before it.** With the block removed the runner lands yellow 8.7 tiles out, so the bridge must start after the twin's flight and be long enough that a yellow runner cannot jump it (with 8 tiles, a grace-and-coyote yellow jump cleared it). A runner that drops through it would otherwise land on the twin's yellow floor and finish in the twin's lane, so the divider catches it in a 3-row pocket (restart with R); a 2-row pocket let a jump reach the top of the bridge's far end. The pocket floor is row 10, so the twin (head at 11.5 on row 13) runs under it.
- The block is 2 columns wide in rows 1–3 (the spec's "rows 1–4" would leave 1 tile under it; 2 tiles is the rule).

- **The idea:** shift up to gear 4 standing, hold right, jump near the end of the twin's red runway. The runner hits the block's face in the air (step 112: `vx` 0, gear 1), drops straight down and lands on safe floor at x = 15.63; the twin flies on, drags to yellow (step 126) and lands yellow in gear 3, on the same step 144. Keep holding right: the runner walks blue to and over its blue bridge, the twin runs yellow to its exit and parks first (step 281).
- **Fair line:** shift up standing (no time limit), jump at x 11.10–14.50 (**18 steps**, 63–80 steps of running; the block catches every one of them), hold right.
- **Cheap failures:** no jump (the twin falls in its gap); jump too early (the twin lands in the gap); too late (the twin runs off its red runway, and the runner slips under the block and keeps gear 4); jumping yellow (the twin drags to green and falls through its yellow floor).
- **Split:** **final** (gear 1 vs gear 3; nothing resyncs them here).
- **Removal test:** block removed: 0 of 71,568 sweep runs win (gear 3 or 4, a jump at every step 40–110, no second jump or one 4 or 10 steps later, then at 21 points: hold, one up, one down, two down, two up, let go, another jump, or walk back). Shifting cannot fix it (one press moves both gears), and letting go stops the twin on yellow, which drops it.
- **Park-line check:** with the block removed the bodies land within one tile of each other and the twin's exit (col 42) is past the runner's blue bridge, so the runner reaches blue still yellow long before the twin can park. In the real level the twin parks at step 281 while the runner is still on safe ground (x = 22.45), but the runner is already in gear 1, which is the lesson.
- **Cheese check:** the same 71,568-run sweep on the real level: 4,992 wins, **0 without the runner's air wall stop**.
- **Lane rules:** spawn rows 5 and 12; colored tiles only in rows 6 (runner) and 13 (twin). HUD area clear. 15 rows. Spread on the intended line at most 19.2 (sweep max 21.4; rule ≤ 26).
- **Safe spots:** both runways (spawns), the runner's floor before its blue bridge, the ground before both exits. The twin has no stop spot after the jump (it is yellow on yellow to its exit), as in the spec.
- **Hint (design-lead 2026-11-19, runner lane only):** `hint: jump 12 3`, over the middle of the takeoff window (box x 11.4–13.6 tiles, cols 11–13, rows 2–3, empty sky), 3 tiles before the block and at its height; the runner floor under it is row 6. It says "jump here" and the block does the rest. Measured in the recording: the jump fires at x 12.70; the 18-step window (63–80 steps of running) is x 11.10–14.50, centre 12.80, inside the col-12 box (x 12–13).
- **Hint (design-lead 2026-11-20, batch 7 playtest, B8-01):** `hint: shiftUp 2 3` over the runner's spawn, so the level now reads "shift up here, jump here". The batch 7 playtest walked off w3-04's 7-tile red runway in gear 1 about 8 times; the twin has to be gear 4 before col 8, in the lane the player is not watching, and this level taught the opening with no shift glyph. Measured in the recording: the runner stands at x 1.50 for all three standing presses (steps 21–25; it first moves on step 26). Box cols 1–3, rows 2–3 (world px 28–52 × 40–64), empty sky; the floor under it is row 6, 3 rows below. Screen y 55–79 at every camera x (15 rows, scroll y −15), so never under the HUD. Render-only: no version bump, same recording.
- **Seen on screen:** dev build on port 5187.

**Fastest known:** 552 steps (`1R+ 1R 1R+ 1R 1R+ 58R 1RJ 600R`: shift while starting the run, earliest jump). The runner's blue walk is most of it.

**Solution:** 585 steps. Stand 20, shift up to gear 4, sprint 71 steps and jump at x = 12.70 (middle of the window), hold right: the twin parks at step 281, the runner at 585. ±3 passes on every transition.

## w3-04 Clamp

**Teaches:** pressing up past gear 4 brings split gears back together (the extra presses do nothing to the body already at the top).

66 × 15, scrolls. Runner lane on top (floor row 6), twin lane below (floor row 13). Spawns col 1 (rows 5 and 12).
- **Section A (a short w3-03):** the runner's hanging block (col 16, rows 1–3) and the twin's flat Coast (red runway cols 8–12, 7-tile gap, yellow from col 20). The runner's **blue bridge (cols 17–19, 3 tiles)** sits over the twin's gap, so a runner that drops through it falls out of the level; the twin's yellow bridge is its yellow floor, cols 20–33.
- **Section B (the clamp):** runner safe pad cols 20–25 (6) → **red bridge cols 26–31 (6)** → safe, exit col 34. Twin: **safe pad cols 34–49 (16)** → **red bridge cols 50–60 (11)** → safe, exit col 63. The runner's red bridge sits over the twin's yellow bridge, so a runner that is not red falls through both and out.

**Differences from `levels-w3.md`:** the Coast pad is flat (window 18), for the shift-buffer reason in w3-03. The runner's safe pad is 6 tiles (spec ≥ 4) so the let-go window has room. No pocket is needed: every hole in the runner's lane is above a hole or a non-matching color in the twin's lane.

- **The idea:** after the split the runner is gear 1, the twin gear 3. One up press gives green and red; three give red and red, because the twin's second and third presses are clamped.
- **Fair line:** shift up standing, jump in the 18-step window (63–80), hold right; once the runner is off its blue bridge, **let go** (the runner stops at once at x 19.68–23.28, the twin about 2.5 tiles later on its pad: **73 steps**, 128–200 steps after the jump), press up three times standing (no time limit; a fourth press is clamped for both), hold right. Both are red 3.23 tiles later.
- **Moving line:** keep holding and press up three times with the runner at x 19.10–23.35 (**86 steps**, 116–201): the twin is red 0.66 tiles after the first press, the runner about 3.1 tiles after.
- **Down-clamp line (allowed):** two down presses (both gear 1), then three up.
- **Cheap failures:** one or two up presses (the runner reaches its red bridge green or yellow: after the solution's let-go, 1 or 2 presses lose, 3 or 4 win); pressing while the runner is still on its blue bridge (it turns green there).
- **Split:** **undone (clamp)**, then both cruise gear 4 to their exits; the runner parks first.
- **Removal test (the clamp must be needed):** 33,366 sweep runs (a jump at three points of the window and at every 2nd step 0–110; hold 0–330 steps; then a press cluster moving or standing: 1, 2, 3 or 4 ups, one down then three ups, two downs then three ups, two downs, one up then two more 60 steps later; with or without a later jump; plus presses in the air before landing): 808 wins, **every one with a clamped press** (a press that moved one body and not the other, both on the ground and not home) and **every one with the runner's air stop**.
- **Park-line check:** "press once, let the twin cross and park, then press twice for the runner alone" fails. After one press at the let-go, two later presses win only when they come 0–35 steps after it (the twin still at gear 4 on its pad, so they are clamped presses). Later, the runner reaches its red bridge green and falls (step 375) while the twin is still on its own red bridge (x 59.5), not home and unable to stop. Skipping the split fails: with no jump the twin falls in its gap (step 127).
- **Lane rules:** spawn rows 5 and 12; colored tiles only in rows 6 and 13. HUD area clear. 15 rows. Spread on the intended line at most 20.7, largest at the let-go (sweep max 27.8 on a line that holds right 330 steps before pressing; the ≤ 26 rule is for the intended line, the camera limit is 28).
- **Safe spots:** both runways (spawns), the runner's pad (cols 20–25), the twin's pad (cols 34–49), the ground before both exits.
- **Hints (design-lead 2026-11-20, batch 7 playtest, B8-01):** `hint: shiftUp 2 3` and `hint: jump 12 3`, the same pair as w3-03. The batch 7 playtest cleared this level after about 16 tries, about 8 of them failed openings (walked off the twin's red runway in gear 1), so the 2026-11-19 fallback (more than 3 failed openings) fired. Measured in the recording: the runner stands at x 1.50 for the three standing presses (steps 21–25), and the jump fires at x 12.70; the 18-step window (63–80) is x 11.10–14.50, the same as w3-03 (section A is the same runway). Boxes cols 1–3 and 11–13, rows 2–3, empty sky (the block is col 16); the runner floor under both is row 6. Screen y 55–79 at every camera x. The clamp (the new idea here) is **not** hinted. Render-only: no version bump, same recording.
- **Seen on screen:** dev build on port 5187.

**Fastest known:** 342 steps (`1R+ 1R 1R+ 1R 1R+ 73R 1RJ 106R 1R+ 1R 1R+ 1R 1R+ 600R`: the moving line at the earliest press).

**Solution:** 396 steps. Stand 20, shift up to gear 4, sprint 71 and jump at x = 12.70, hold right 164 steps, let go (runner 21.48, twin 40.1), press up three times standing, hold right: runner home at step 354, twin at 396. ±3 passes on every transition.

## w3-05 Redshift

**Teaches:** combine: air-stop split, clamp down, a pin to re-align, a shared drag jump, park, and the twin braking alone. Each section is a known idea; the difficulty is the order.

**Version 2 (2026-11-23, `levels-w3.md` "w3-05 v2", batch 8 playtest).** Two cold sittings could not finish v1: the walk-back from the kerbs started wherever the player let go of Left, so it only worked if both gears already matched. v2 lowers the run-up by one tile in both lanes, so a **step face at x 36** at the back of the run-up holds both bodies at the same x whatever their gears. **No tile changed at cols < 30** (grid diff v1 to v2: 29 cells, cols 36–45 only).

72 × 15, scrolls. Runner lane on top (floor row 6), twin lane below (floor row 13). Spawns col 1 (rows 5 and 12).
1. **Split (w3-03):** runner's hanging block (col 16, rows 1–3); twin's flat Coast (red runway cols 8–12, gap cols 13–19, yellow pad cols 20–23).
2. **Out of step (w3-04):** runner's blue bridge cols 17–19 (over the twin's gap); the twin's yellow pad is its yellow stretch.
3. **Clamp down and pin (w3-04, w3-02):** twin: safe pad cols 24–31 (8, w1-04's numbers), **blue strip cols 32–34**, safe col 35; runner: safe cols 20–35.
   - **v2 run-up:** cols 36–44 are one tile lower in both lanes (runner floor row 7, twin floor row 14), all safe. The **step face** is the right face of col 35 (x = 36) in both lanes, 1 tile high: going right both bodies walk off it with no jump; walking left both are held against it at **x = 36.375 in both lanes** (the runner from row 7, the twin from row 14). The blue strip stays left of the step.
   - **Kerbs:** the old floor tile at col 45 (row 6 and row 13) is now the 1-tile safe kerb, 1 tile above the run-up, in both lanes (v1's raised kerb tiles at rows 5 and 12 are gone). Both bodies are still held at x = 44.625 there.
4. **Shared drag jump (w3-02, w2-02):** both lanes have the same 2-tile gap (cols 46–47) and **6-tile yellow pad (cols 48–53)**, flat, at the same columns (unchanged; the takeoff is now 1 tile below the pads).
5. **Park and brake alone (w3-01, w1-04):** the runner's exit is at col 55, right after its pad. The twin: safe pad cols 54–61 (8), **blue bridge cols 62–66**, exit col 69 (unchanged).

**Differences from `levels-w3.md` (accepted by design-lead 2026-11-23):**
- **Safe kerbs, not full-height blue walls** (v1, ruled 2026-11-17).
- **v2 construction:** rule 1's second example ("the run-up floor cols 36–44 one tile lower"). The first example (the floor of cols ≤ 35 one tile higher) would change cols < 30 or put a step up at col 30 that holds a body walking right.
- **"Kerbs removed: 0 wins" does not hold in v2 (accepted by design-lead 2026-11-23; the criterion is now "kerbs and step removed: 0 wins", which v2 meets).** The step is itself a pin: once the runner has walked off the step, holding Left holds both bodies at x 36.375. With the kerbs removed (run-up flat to col 45, gap cols 46–47) the player can let go of Right while the twin is still on the run-up and the runner is already past the step, then walk back to the step. That needs the twin less than about 9.9 tiles ahead, and the opening leaves it 6.86–13.49 tiles ahead (jump 63–80, down presses 53–108), so early openings can do it. Numbers are under "Removal tests". Every such win still re-aligns with a pin (the step), and still uses the air stop and the clamp. With **both** pins removed (no kerbs, no step: v1's kerbless grid) it is still 0 of 56,700. I found no construction inside rules 1–5 that brings this to 0: the run-up from the step to the twin's last floor tile would have to be shorter than the smallest opening offset (6.86 tiles; it is 8.25 to the kerb now), and the kerb jump then has no room for an 18-step window. Steps at x 37 and 38 were tried as well: kerb-jump windows 17 and 12 steps (under 18), and still 49 and 12 kerbless wins in the targeted sweep below; cols < 30, which set the offset, may not change.
- **What forces the down presses:** the twin's 3-tile blue strip (unchanged). Jumping the strip is now a valid route (rule 7): the twin arrives in gear 2, and the three up presses at the step clamp both bodies to gear 4.
- **Flat pads** in sections 1 and 4 (both bodies land on the same step). Coast window 18 steps; the shared jump window is 20 (22 in v1: the takeoff is now 1 tile lower than the pad, so the flight is shorter).
- No pocket is needed (`sealedPockets` finds none in w3-05): every hole in the runner's lane is above a hole or a non-matching color in the twin's lane. The runner's run-up (row 7) is a safe roof over the twin's run-up, 6 rows of headroom; the twin's kerb jump peaks at y 11.1.

- **Fair line:** shift up standing; jump in the 18-step window (63–80 steps of running, x 11.1–14.5); press down twice once the twin is on its safe pad (**56 steps**, 53–108 steps after the jump); hold right until the runner has walked off the step (from step 560; the twin is held at its kerb from step 524, the runner from step 725; holding longer changes nothing); hold Left until both are held at the step (**a position choice**: any hold of 128 steps or more wins, both are held from 165 steps on, step 986 in the recording); press up three times; run and jump the kerbs (**20 steps**, 33–52 steps of running, takeoff x 39.98–43.77); hold right; the runner parks; press down twice on the twin's safe pad (**58–113 steps** after the jump, 56) and hold right.
- **Run-up from the step, per gear pair** (held at the step at x 36.375 in both lanes, let go, three up presses, hold right, jump after c steps of running, rest of the recording). Pairs 1/1, 1/2 and 2/3 are reached in play (1/1 the recording; 1/2 a strip jump with no down presses; 2/3 that plus one up press at the kerbs); 1/3 cannot be reached at the kerbs in play, so it is set in the held state:

  | Gears runner/twin at the step | After three up presses | Winning c | Window |
  |---|---|---|---|
  | 1/1 | 4/4 | 33–52 | 20 steps |
  | 1/2 | 4/4 | 33–52 | 20 steps |
  | 1/3 | 4/4 | 33–52 | 20 steps |
  | 2/3 | 4/4 | 33–52 | 20 steps |

- **Cheap failures, each next to safe ground:** no jump at the start (the twin falls in its gap); jumping yellow; forgetting the down presses without jumping the strip (the twin reaches its blue strip yellow and falls); one up press at the step (the green jump hits the kerbs and drops both back in front of them); two up presses (a yellow takeoff drags to green and both fall through their yellow pads); jumping from too close to the kerbs (an air wall stop drops you at the kerb) or too early (short of the pads); not slowing the twin at the end (it reaches the blue bridge yellow).
- **Splits:** section 1's split is **undone**: gears by the down clamp (section 3) or by the up clamp at the step, positions by the pins (kerb, then step). The runner's park in section 5 is **final**; from there the twin is played alone.
- **Removal tests** (sweep, 56,700 runs: jump at three points of the opening window; no down presses, or two at 60 or 100 steps; hold right 300–820 steps; walk back 0–240 steps; 1, 2 or 3 up presses, or two down then three up; kerb jump at every 6th step 0–84; brake at the end):
  - **Real level:** 1,080 wins, **0 without the runner's air wall stop** (so every win undoes a split). Spread at most 12.06 over all wins.
  - **Kerbs removed** (run-up flat to col 45): **56 of 56,700 win (was 0 in v1; accepted by design-lead 2026-11-23, see above).** A targeted sweep (jump 63–80 every 3rd step, down presses at 53, 60, 70, 85 or 100, hold right 300–760 every 4th step, walk back 200): 114 of 3,480 win, every one with the twin 7.06–9.86 tiles ahead after the opening. In the real level the same sweep has 2,367 wins, and 19 of them never hold the twin at its kerb (twin 7.06–8.16 tiles ahead, let go just before it reaches the kerb). Kerbs and step both removed: 0 of 56,700 (v1).
  - **Block removed:** 1,392 of 56,700 win, all without an air stop (v1: 1,158). The bodies never split; accepted 2026-11-17 for the same reason as v1.
  - **Strip-jump lines** (rule 7; 38,880 runs: no, one or two down presses at 60 steps, a jump at every 6th step 1–139 after that, hold right 450, 600 or 750, walk back 0, 120, 180 or 240, 1–3 up presses, kerb jump every 6th step 0–84): **813 win**, all with the air stop, through the clamp at the step (accepted by `levels-w3.md` v2 rule 7). With the kerbs removed: 0 of 38,880.
  - **Park line:** the twin cannot be home before section 5 (its exit is at the far end), and the runner's exit comes only after the shared jump, so neither body can be parked to skip a section.
- **Lane rules:** spawn rows 5 and 12; colored tiles only in rows 6 and 13. HUD area clear. 15 rows. Spread on the intended line at most 10.06 (the twin waiting at its kerb); 20.15 at most over the strip-jump wins; rule ≤ 26.
- **Safe spots:** both runways (spawns), the twin's brake pad and the ground before its strip, the runner's floor from its blue bridge to its kerb, the whole run-up behind the step in both lanes, the twin's final pad, the ground before both exits.
- **Hints (design-lead 2026-11-20 and 2026-11-23):** three runner-lane headers, the maximum: `hint: jump 12 3`, `hint: shiftUp 36 3`, `hint: jump 40 3`. Measured again on v2; the columns did not need to move then. Batch 10 (design-lead 2026-11-23 evening, batch 9b sitting) moved the kerb `jump` from col 41 to col 40, header only: no `version` bump, same recording, same `LEVELS` entry. Read left to right they say "jump here" (the opening), then w1-03's "back up to the step, shift up", then w2-01's "jump here". The down presses are not hinted. All boxes rows 2–3, empty sky; screen y 55–79 at every camera x (15 rows, scroll y −15), never under the HUD.
  - **Opening jump:** unchanged (x 11.10–14.50, centre 12.80, the recording jumps at 12.70). Box cols 11–13, runner floor row 6 under it.
  - **Step (`shiftUp 36 3`):** both bodies are held at x 36.375, in col 36, the column just right of the step face. Box cols 35–37; under it row 6 (col 35, 3 rows below the anchor) and row 7 (cols 36–37).
  - **Kerb takeoff (`jump 40 3`):** from the held-at-the-step state the takeoffs that win are x **39.98–43.77** for every gear pair, centre **41.88**; the recording jumps at 41.97. The glyph sits one column early on purpose: at gear 4 (12 tiles/s) a 150–200 ms reaction is 1.8–2.4 tiles, so a player who jumps on passing under the glyph centre (x 40.5) takes off around 42.3–42.9 and one who anticipates around 40.5, both inside the window. Under the old col 41 (centre 41.5) a reacting player took off around 43.3–43.9, at or past the late edge (the batch 9b sitting's "pinned at the kerb"). Box cols 39–41 (world px 631–666), left of the kerb at 720 and clear of the `shiftUp` box (572–596); run-up row 7 under it (4 rows below). The one-column move is the one `onboarding-hints.md` allows.
  - At the recording's kerb step (725) both bodies are held at the kerbs, as in v1.
- **Seen on screen:** checked through the sim only for v2; the scene is unchanged code.

**Fastest known:** 680 steps (`1R+ 1R 1R+ 1R 1R+ 58R 1RJ 102R 1RJ 69R 1R+ 1R 1R+ 1R 1R+ 77R 59L 34R 1RJ 124R 1R- 1R 1R- 400R`: no down presses, the twin jumps its strip yellow, three up presses once the runner is past its blue bridge, the twin is held at its kerb, then both turn back and the twin is held at the step for a moment before the run (the runner takes off yellow, the twin red); found by a greedy search from random starts).

**Solution:** 1,389 steps (23.2 s). Stand 20, shift up to gear 4, sprint 71 and jump at x = 12.70; 80 steps later press down twice (twin on its pad); hold right 640 steps (both walk off the step: twin step 373, runner 574; twin held at its kerb from step 524, runner from 725); hold Left 200 steps (both held at the step at x = 36.375 from step 986) and let go; press up three times; run 43 steps and jump at x = 41.97; both drag to yellow and land on their pads (step 1123); the runner parks (1155); press down twice 86 steps after the jump; the twin walks its blue bridge and parks (won at 1389). ±3 passes on every transition.
