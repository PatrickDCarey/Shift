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
| w2-05 | Long Haul | 2 | test (long): worlds 1–2 in one run, reading ahead (9 rooms, 2 posts) | 4–8 min | **APPROVED (design-lead 2026-11-24)**, version 2 (level plan v4.1; v1 approved 2026-11-24 as the fallback); posts at cols 73 and 184; no hints; clean run 63.4 s |
| w3-01 | Two Lanes | 3 | NEW: a twin obeys the same keys on its own floor; both must reach home | 30–60 s | approved, version 1, no roofs (design-lead, 2026-11-16); first Tandem level and the T-20 test level; `move` and `shiftUp` hint headers |
| w3-02 | Out of Step | 3 | NEW: a wall in one lane holds that body while the other walks on, so you choose how far out of step they are | 60–120 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); safe kerb instead of the spec's blue wall (see section); runner-lane hint header `jump 5 3` only (batch 10, design-lead 2026-11-23 evening and the w3-02 placement ruling; header only, no version bump) |
| w3-03 | Gear Split | 3 | NEW: a stop in mid-air drops only that body's gear | 60–120 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); flat landing pad (18-step window); runner-lane hint headers `shiftUp 2 3` (2026-11-20, B8-01) and `jump 12 3` (2026-11-19) |
| w3-04 | Clamp | 3 | NEW: pressing up past gear 4 brings split gears back together | 90–150 s | approved, version 1 (design-lead 2026-11-17, re-stated 2026-11-19); runner-lane hint headers `shiftUp 2 3`, `jump 12 3` (2026-11-20, B8-01: the batch 7 fallback fired) |
| w3-05 | Redshift | 3 | combine: air-stop split + clamp down + pin + shared drag jump + park + brake | 3–5 min | **version 2, APPROVED** (design-lead 2026-11-23, tech-lead review 2026-11-23 `docs/tech/reviews/2026-11-batch9-review.md`; batch 8 playtest: a 1-tile step at x 36 at the back of the run-up in both lanes); v1 approved 2026-11-17; safe kerbs instead of blue walls; runner-lane hint headers `jump 12 3`, `shiftUp 36 3`, `jump 40 3` (re-measured for v2; the kerb `jump` moved from col 41 to col 40 in batch 10, design-lead 2026-11-23 evening, header only, no version bump; see section) |
| w4-01 | Lift | 4 | NEW: a grey lift carries you; standing on it you stay white | 15–25 s | **APPROVED (design-lead 2026-11-24)**, version 1 (B11-18, `levels-w4.md`); `move` hint header over the spawn |
| w4-02 | Ferry | 4 | NEW: a shuttle carries you sideways; leave when it docks, at the pace the far side asks | 20–30 s | **APPROVED (design-lead 2026-11-24)**, version 1 (B11-18); no hints; roof over the whole track (see section) |
| w4-03 | Moving Bridge | 4 | twist: a colored slab holds only its own color, so cross it at its pace while it is level | 25–40 s | **APPROVED (design-lead 2026-11-24)**, version 1 (B11-18); no hints |
| w4-05 | Commute | 4 | combine (long): lift, shuttle and colored slab, with runway, drag and the red wall (9 rooms, 2 posts) | 4–8 min | **APPROVED (design-lead 2026-11-24)**, version 1 (`levels-w4.md` v4.1); posts at cols 132 and 215 with `clock=`; no hints; clean run 66.8 s |
| w5-01 | Spark | 5 | NEW: a colored bolt only hits its own color; turn red only after the red lane | 15–25 s | **APPROVED (design-lead 2026-11-24)**, version 1; `move` and `shiftUp` hint headers |
| w5-02 | Keep Moving | 5 | TWIST: a white bolt hits only a runner standing still, so brake while moving | 25–40 s | **APPROVED (design-lead 2026-11-24)**, version 1; no hints; 16 emitters (the cap) |
| w5-03 | Hurdles | 5 | NEW: grey bolts hit everyone: jump the low ones on green, stay down under the high ones on yellow | 30–45 s | **APPROVED (design-lead 2026-11-24)**, version 1; no hints |
| w5-05 | Full Spectrum | 5 | combine (long finale): red, yellow, white and grey bolts, a grey lift and a green slab, with runway, drag, step-down and brake (12 rooms, 3 posts) | 3–5 min | **version 1, APPROVED** (design-lead 2026-11-24, as built) (`levels-w5.md` v4.1); posts at cols 80, 148 and 254 with `clock=`; no hints; clean run 62.3 s; deviations for review: width 345 (not 420–450), lift crossed walking under one white head-height lane, yellow rain rises from the pit, one horizontal white lane over a 10-tile pad 1 lower, post 2 `clock=` is a braking runner's step (see section) |

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

**Teaches:** nothing new (TEST, long; level plan v4.1 "Long levels" and "w2-05" v2): worlds 1–2 in one run. Read ahead and set your gear for the next room while you run the current one. Safe tiles, colored floors and walls only; no movers, bolts or hints. **Version 2.** v1 (106 tiles, 16.6 s, approved by design-lead 2026-11-24 as the fallback) is in git at c5cdcc0. v1's first 80 columns (rooms 1–3 and the brake pad) are unchanged cell for cell, and the recording replays v1's line through them.

306 × 15, scrolls; ground row 12 from col 50 to col 231, row 14 after it. Rows 0–1 hold no colored tile or exit. Nine rooms, three sections, two posts:

| # | Room | Cols | What you do | Window(s), steps |
|---|---|---|---|---|
| 1 | Coast (v1) | 0–23 | red runway, 7-tile gap, yellow pad 3 lower: take off red, drag to yellow | jump 25 |
| 2 | Step Down (v1) | 24–49 | press up once on the ledge, walk off red onto the red floor 4 below | 52 |
| 3 | Red Wall (v1) | 50–71 | brake to green on the approach, two presses up at the red door | 30, 30 |
| — | **Post 1** | **73** (row 11) | on v1's brake pad (cols 72–79): 7 safe tiles from the post to the Brake's bridge | |
| 4 | Brake (v1) | 80–97 | three presses down on the pad, walk the 18-tile blue bridge (no roof) | 37 |
| | recovery | 98–111 | 14 safe tiles | |
| 5 | Shift (w1-02) | 112–151 | green, blue, green, blue bridges (7 each, 2-row roofs flush with each) between 4-tile safe pads: up, down, up, down | up ≥ 241 (any time on the stretch), down 53, up 110, down 53 |
| | recovery | 152–165 | 14 safe tiles; press up for the green runway | ≥ 241 |
| 6 | Commit (w2-01) | 166–181 | green runway (8), 3-tile gap, green pad (5): jump green, land green | jump 31 |
| — | **Post 2** | **184** (row 11) | on the recovery stretch (cols 182–195): 12 safe tiles from the post to the Runway room | |
| 7 | Runway (w1-03) | 196–217 | press down before an 8-tile blue bridge and walk it, then three presses up on an 8-tile safe runway: red onto a 6-tile red bridge; both bridges under 2-row roofs | down 153, up triple 138 |
| | recovery | 218–231 | 14 safe tiles | |
| 8 | Coast, short (w2-02) | 232–245 | red runway (5), 5-tile gap, yellow pad 2 lower: jump red, drag to yellow | jump 33 |
| | recovery | 246–257 | 12 safe tiles (row 14); press down twice | 90 |
| 9 | Home (w1-01) | 258–305 | a 40-tile blue bridge on the bottom row (no roof: nothing clears it at gear 1), exit pad, exit col 302 | — |

Each window moves one input (or one press group) earlier and later, with every other input placed by position as a player would. The shift-up windows on the long safe stretches were cut off by the ±120-step search, so they are at least 241.

**Sections and posts.** Section 1 is v1's three rooms, Coast first (the narrowest window, 25 steps, next to the spawn). Post 1 sits on the brake pad, so a death on the Brake's bridge or anywhere in section 2 respawns 7 tiles before the Brake. Section 2 runs Brake (37), Shift (53 and up), Commit (31): the order is design's (v1's Brake right after the Red Wall, then Shift, then Commit), but the narrowest window of the section comes last, so "hardest first" holds only loosely. Section 2 order: accepted by design-lead 2026-11-24 (no swap). Post 2 sits on the recovery stretch after the Commit; section 3 is the easiest (windows 33–153, all ≥ 30), and it ends with a walk.

**Run length and pace.** Clean run (the recording) **3,804 steps, 63.4 s**, 306 tiles (5.0 tiles/s average): sprint rooms (both Coasts, the Red Wall, the Runway) alternate with walking rooms (the Brake's bridge 6 s, the Shift room at gears 1 and 2, the Runway's blue bridge, Home 13 s).

**Differences from `level-plan.md` v4.1 (accepted by design-lead 2026-11-24):**
- **Width 306, not ≈ 330–380** (inside the definition's 300–450). More width means a longer clean run, and 63.4 s is already near the top of design's 50–65 s.
- **Commit gap 3, not 4.** w2-01's 4-tile gap gives a 21-step window; 3 gives 31 (≥ 25).
- **Short Coast pad 2 lower, not 3.** Everything after v1's rooms is on row 12, so a pad 3 lower would be row 15, outside the 15 rows. The window is still 33, and a walk-off still lands red on the pad and falls.
- **Runway without the back wall.** w1-03's back-up needs you to arrive slow near the bridge with room behind you. On a run that moves right, that needs a 3-row drop into a covered room, which does not fit in 15 rows with the short Coast after it. Instead the room opens with an 8-tile blue bridge (you arrive at walking pace, gear 1) and an 8-tile safe runway: three presses up as you step off the blue, red by the red bridge (3.1 tiles from walking pace). Still "speed takes distance", without the reversal.

**Checks (through the real sim):**
- **No room can be skipped.** Every win in these sweeps touched every room's key floor in its color (grounded on each Shift bridge, the Commit pad, the Runway's red bridge, the short Coast's pad, the Home bridge, and v1's rooms): the recording with one extra jump at every step (3,804 runs, 3,095 wins) and with two at random steps (1,500 runs, 994 wins). From each post, one fixed gear (1–4) and one or two jumps anywhere (7,840 runs): 966 lines got past the Brake, every one grounded blue on its bridge; with a single gear none gets past the Shift room or the Runway (each needs a gear change), so those rooms are covered by the injection sweeps and their 2-row roofs (top 4 tiles above the floor: no jump clears a bridge or lands on a roof).
- **Posts (first real use of the checkpoint sim):** post 1 lights at step 467 (x 72.71, the first step the box overlaps col 73), post 2 at step 2112 (x 183.71). A death on the Brake's bridge after post 1 (no presses down; died at step 536, x 86.46) respawns at step 561 (after the 24-step freeze) standing at x 73.50, y 12, gear 1, band 0, `vx` 0; the run step keeps counting (561, not 0). A death on the Runway's red bridge after post 2 (no presses up, step 2684) respawns at x 184.50 at step 2709. R after post 1 (step 600) restarts at the spawn with step 0 and no post lit. A death in the first Coast with no post lit is a full restart (step 0). All as `features/checkpoints.md` says; nothing off.
- **Seen on screen:** not confirmed. The dev build on port 5187 loaded w2-05 and the replay started, but the hidden preview pane ran it at about one step every 2 s, so it never reached a post. The post sprite and the respawn at a post still need a look (playtester or QA).
- **Pockets:** none (`tests/levels` passes with v2). Respawn boxes, recovery stretches and size pass `checkpointRules.ts`.
- **Safe spots:** the spawn run-up, the Step Down ledge, the Red Wall approach, the brake pad (post 1), every recovery stretch (12–14 tiles), the Shift room's pads, the Runway's safe runway, the exit pad.
- **Hints:** none.

**Fastest known:** 3206 steps (v1's fastest opening, `1R+ 1R 1R+ 1R 1R+ 75R 1RJ 59R 1R+ 148R 1R- 56R 1R+ 70R 1R- 2R 1R- 1R 1R-`, then each shift pressed as late or as early as its window allows so the fast stretches stay fast; found by a random search around the recording).

**Solution:** 3,804 steps (63.4 s), deathless from the load, lights both posts in order. Section 1 is v1's line; then press down three times at x 73.51, walk the blue bridge, up at x 104.1, down 119.6, up 130.4, down 141.4, up 158.1, jump at 173.5; down at 186.1, three up at 204.6, jump at 235.5, down twice at 247.3, walk home. `tests/levels` passes, including ±3 on every transition.

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

## w4-01 Lift

**Teaches:** a grey lift carries you; standing on it you stay white (`levels-w4.md` "w4-01").

30 × 15, one screen (no scroll). Safe room (cols 0–8, open sky, spawn col 6) at the foot of a **6-tile safe wall** (cols 12–17; the jump is 3). A grey lift, `mover: 9 12 3x1 safe speed=2 path=w90,u6,w90,d6` (cols 9–11, 96 steps per move, cycle 372 = 6.2 s), rests flush with the floor in a 1-tile dip whose floor is safe, so the first room has no pit. At the top it rests 90 steps flush with a 6-tile ledge; then a 6-tile **blue bridge** (cols 18–23) over a pit, under a 2-row safe roof (rows 2–3: 2 tiles of headroom, top 4 tiles above the ledge, so nothing stands on it), and the exit pad.

- **Fair line (the recording):** walk on during the bottom rest, let go, ride standing (band 0, `vx` 0 every step: white, as the spec says), walk off at gear 1 at the top.
  - **Walk on:** from the spawn, starting to walk 0–46 steps after the load boards the first ride (**47 steps**); every later ride is 372 steps on (313+ in the sweep). Measured on the cycle: you must overlap the lift before it leaves (bottom rest, steps 0–90 of each cycle).
  - **Let go:** any time on the lift. Holding Right is also fine: you are held against the wall (`wallStop`, white) and ride up the same way.
  - **Walk off:** holding Right from any step 87–247 wins (the top rest is 186–276; the latest start leaves 29 steps to clear the lift's 1.4 tiles to the ledge). **62 steps** if you wait for the top.
- **Arriving at another point of the cycle:** costless. Miss it and it comes back in 6.2 s. Walk into the dip after it has left and a 1-tile hop puts you back on it: a jump in the dip wins from any step 313–473 when you walk in at 100 (it lands you on the lift while it is down or coming down). That hop is a world-2 skill; a cold player who only holds Right waits in the dip.
- **Removal:** no lift → **0 wins** (1,200 lines: gear 1 or 4, Right from 0–198, a jump at six points).
- **Cheese check:** the blue bridge's first roof was 1 row (top 3 above the ledge, exactly the jump height): a green jump landed on it and walked over the bridge (fastest 340). The roof is now 2 rows. Remaining expert line: a green jump off the top of the lift hits the roof's left face, the air stop drops you to gear 1 and you walk the bridge blue (still rides the lift).
- **Safe spots:** the spawn room and dip, the lift itself, the ledge at the top, the exit pad.
- **Hints:** `hint: move 6 8` over the spawn (box cols 5–7, rows 7–8, empty sky; floor row 12 under it).
- **Seen on screen:** looked at in the dev build (`?level=w4-01&replay=1`): the lift and its track draw, it rises with the player standing on it white.

**Fastest known:** 432 steps (`1R+ 1R 1R+ 1R 199R 1RJ 4R 1RJ 600R`: gear 3, a green jump off the top of the lift into the roof's face, which drops you to gear 1 for the bridge).

**Solution:** 519 steps (8.7 s). Walk right 75 steps (onto the lift, x 10.25), let go for 115 (carried up 90–186, stands at the top), hold right 329 to the exit. `tests/levels` passes, including ±3 on every transition.

## w4-02 Ferry

**Teaches:** a shuttle carries you sideways; leave when it docks, at the pace the far side asks (`levels-w4.md` "w4-02").

30 × 13, one screen. Safe ledge (cols 0–4, spawn col 1) → **16 empty columns** (cols 5–20) → 5-tile **green bridge** (cols 21–25) → safe exit pad (cols 26–29). Shuttle `mover: 5 9 4x1 safe speed=2 path=w90,r12,w90,l12`: rests 90 steps flush with the ledge, moves 12 tiles in 192, rests 90 with its front flush with the bridge, returns (cycle 564 = 9.4 s). A **2-row safe roof over the whole track and the bridge** (rows 5–6, cols 5–25) leaves exactly 2 tiles of headroom.

**Differences from `levels-w4.md`:**
- **The pit is 16 columns, not 14:** a 4-wide slab moving 12 tiles sweeps 16 columns, and nothing solid may sit in a swept area (`kineticRules.ts`). With these numbers the gap is 16.
- **The roof spans the track, not only the bridge.** With a roof over the bridge alone, a yellow run along the moving shuttle, off its front and a jump that drags to green landed on the bridge 77 steps before the dock (won at step 276 without waiting for it). Over the track, every jump is a 0.5-tile hop. Remaining expert lines all hinge on the dock: a coyote hop off the front of the shuttle green, 23 steps before it docks, over a 1.4-tile closing gap (fastest known), and a green jump on the shuttle that commits gear 2 (world 2's Commit).

- **Fair line (the recording):** walk on during the left rest, stand (white), shift up once standing, ride, hold right at gear 2 while docked.
  - **Board:** be on it by step 90 of the cycle. From the ledge's edge, stepping on wins for any start 533–650 of the second cycle (**118 steps**; the first cycle is shorter only because the spawn is 4 tiles away: starting to walk 0–25 steps after the load).
  - **Shift up:** standing, no time limit.
  - **Depart:** holding right from any step **226–344** wins (**119 steps**; the dock is 282–372). Early starts walk forward along the shuttle and reach its front as it docks; the latest leaves 28 steps to get from the back of the shuttle onto the bridge.
  - **Where you stand on the shuttle** does not matter: from its front edge the 0.75-tile body is still partly on the shuttle when the ramp reaches green (4.8 tiles/s after 0.75 tiles).
- **Which gear:** gear 1 (blue) and gear 3 (ramps to yellow 1.9 tiles from the start, on the bridge) both fall: 0 wins with no jump. Gears 3–4 win only with a jump that commits green (above).
- **Arriving at another point of the cycle:** missing the left rest costs one cycle (9.4 s) standing on the ledge; nothing kills you there.
- **Removal:** no shuttle → **0 wins** (6,552 lines: gears 1–4, Right from every 3rd step 95–640, a jump at nine offsets).
- **Safe spots:** the ledge, the shuttle (grey, any gear), the exit pad.
- **Hints:** none (`levels-w4.md`).
- **Seen on screen:** looked at in the dev build: the shuttle and its dotted track draw across the pit, under the roof.

**Fastest known:** 330 steps (`116R 1+ 100. 30R 1RJ 300R`: board late and walk forward, gear 2, run off the front of the shuttle green and hop the last 1.4 tiles to the bridge 23 steps before the dock).

**Solution:** 404 steps (6.7 s). Walk right 85 (onto the back of the shuttle, x 5.72), shift up standing, stand 214 (ride 90–282, docked from 282), hold right from step 300 to the exit. `tests/levels` passes, including ±3 on every transition.

## w4-03 Moving Bridge

**Teaches:** twist: a colored slab holds only its own color, so you cannot stand on it: cross it at its pace while it is level (`levels-w4.md` "w4-03").

30 × 15, one screen. Safe ledge (cols 0–10, spawn col 7) → 6-column gap (cols 11–16), open to the bottom of the grid → safe ledge (cols 17–29, exit col 27). Green slab `mover: 11 7 6x1 G speed=2 phase=186 path=w90,d6,w30,u6`: level with the ledges for 90 steps, sinks 6 tiles (96), rests 30 at the bottom, rises (96); cycle 312 (5.2 s). `phase=186` starts it at the bottom: it rises from step 30 and is level for steps 126–216 of every cycle. A 2-row safe roof (rows 3–4, cols 10–17, the gap plus one column each side) leaves exactly 2 tiles over the ledges, and its top is 4 tiles up, so nothing jumps the gap or stands on the roof.

- **Fair line (the recording):** shift up once standing on the ledge; hold right at gear 2 as the slab arrives.
  - **Depart:** holding right from any step **23–119** wins (**97 steps**, from the spawn 3.5 tiles from the edge). Of these, **81–119 (39 steps)** cross with the slab level the whole way; **23–80** step off the ledge while it is still rising and are caught green by its swept landing (the scoop), then carried up as you walk. Design estimated 22 steps on the rest alone; the 0.75-tile body and the scoop make it wider.
  - **Shift up:** standing, no time limit.
- **Which gear:** standing (white), gear 1 (blue), gear 3 and gear 4 (ramp past green on the slab) all fall through: **0 wins** with no jump for gears 1, 3 and 4.
- **Arriving at another point of the cycle:** a fall is a death (respawn rewinds the slab to its start, so every attempt sees the same rise). Leaving late rides it down green into the right ledge's face, a wall stop, white, and a fall.
- **Removal (README sweep, `levels-w4.md`):**
  - **No slab:** 0 wins (91,440 lines: gears 1–4, an optional 140-step walk back first, Right from every 3rd step to 500, a jump at every 2nd step 1–159 after it).
  - **Static `G` tiles in the gap:** gear 2 wins from **every** departure step 2–700 (no timing); every other gear 0.
  - **`safe` slab instead:** every gear wins (gear 1 from 1–32, 238–344, …; gear 3 from 4–700): a standing ride wins, so the color is the lesson.
- **Jump sweep on the real level** (the same 91,440 lines): 7,414 wins, every one landing green on the slab. Gears 3 and 4 win only after the 140-step walk back, by jumping while still green during the ramp (world 2's Commit locks gear 2) and walking on at gear 2; with no jump they never win.
- **Safe spots:** both ledges.
- **Hints:** none (`levels-w4.md`).
- **Seen on screen:** looked at in the dev build: the green slab draws at the bottom of its track at the start, with the band pattern.

**Fastest known:** 200 steps (`1+ 2. 78R 1RJ 300R`: leave at once, drop green onto the slab 3.3 tiles below the ledge while it rises, and jump from it onto the right ledge).

**Solution:** 268 steps (4.5 s). Shift up standing, wait 70, hold right: green at x 8.1, step down onto the rising slab (lands step 121, 0.25 below the ledge), carried level, across and on to the exit. `tests/levels` passes, including ±3 on every transition.

## w4-05 Commute

**Teaches:** nothing new (COMBINE, long; `levels-w4.md` "w4-05" v4.1, level plan v4.1 "Long levels"): lift, shuttle and colored slab, with runway, drag and the red wall, as one journey. No hints, no sweep, no bolts, no Tandem.

300 × 15, scrolls. Rows 0–2 hold no colored tile, exit or slab path. Six slabs, all speed 2, and two posts:

```
mover: 12 10 4x1 safe speed=2 phase=453 path=w90,r12,w90,l12   (Across shuttle; cycle 564)
mover: 81 12 3x1 safe speed=2 phase=48 path=w90,u6,w90,d6      (Up lift; cycle 372)
mover: 99 6 6x1 G speed=2 phase=115 path=w150,d6,w30,u6        (section 1 green slab, long rest; cycle 372)
mover: 144 6 4x1 safe speed=2 phase=524 path=w90,r12,w90,l12   (Ferry; cycle 564)
mover: 180 6 6x1 G speed=2 phase=223 path=w90,d6,w30,u6        (Moving Bridge; cycle 312)
mover: 227 6 3x1 safe speed=2 phase=2 path=w90,d6,w90,u6       (down-lift; cycle 372)
checkpoint: 132 5 clock=1543
checkpoint: 215 5 clock=2804
```

| # | Room | Cols | What you do | Window(s), steps |
|---|---|---|---|---|
| 1 | Across | 0–56 | walk onto the shuttle while it rests (left rest steps 111–200) and on to its front; shift up to gear 4 standing; run at the dock (docked 393–482): yellow through the 2-tile red door (col 31), red on the red bridge (33–38) under the door's mass (w1-05) | board: start walking up to 37 steps late; run: 94 (−15/+78) |
| 2 | Up | 57–83 | red runway (5), 5-tile gap, yellow pad 2 lower: jump red, drag to yellow; 10 safe tiles; a grey lift (81–83, in a dip with a safe floor) 6 up a 6-tile wall; shift down to gear 2 while riding | jump 33; shift down 178; walk off 205 |
| 3 | Level | 84–129 | a green slab (99–104) in a 6-col gap under a 2-row roof, level for 150 steps: cross at gear 2; brake pad (106–117), press down; blue bridge (118–129, no roof) | press down 84 |
| — | **Post 1** | **132** | on a 14-tile recovery stretch, 12 tiles before the Ferry | |
| 4 | Ferry | 144–178 | shuttle over a 16-col pit docking at a 5-tile green bridge, roof over both (w4-02): board at its back, shift up standing, leave at gear 2 while docked | shift up 84; leave 70 (−52/+17) |
| 5 | Moving Bridge | 179–186 | a green slab in a 6-col gap, level for 90 steps (w4-03): cross at gear 2 (the Ferry's leave window above includes it) | — |
| 6 | Brake | 187–212 | 12-tile pad, press down; 14-tile blue bridge | 44 |
| — | **Post 2** | **215** | on a 14-tile recovery stretch, 12 tiles before the shaft | |
| 7 | Lift down | 227–229 | a grey lift down an open shaft (no floor: ride it); shift up to gear 4 standing while it carries you | 291 |
| 8 | Runway | 230–245 | the shaft wall behind you, 10 safe tiles under a ceiling, a red bridge (6) under it: run from the lift, red by the bridge (w1-03, from a standing start) | — |
| 9 | Home | 246–299 | 20 safe tiles, press down three times; a 26-tile blue bridge; exit pad (exit col 296) | 97 |

Each window moves one input (or press group, or the step a wait ends) earlier and later with every other input placed by position or by its own step, as a player would; ±150 was the search range, so 205 and 291 are cut off.

**Clocks and late arrival.** Every slab room is entered from safe ground (the spawn ledge, the 10-tile stretch before the lift, the upper ground, the post stretches, the ledge before each green slab), so a player who arrives late waits there for the next cycle (at most 564 steps, 9.4 s, at a shuttle) and never dies for it. On the recording the longest standing wait apart from the rides is about 70 steps (1.2 s, held against the wall on the up-lift); no forced wait is over 3 s. Each `phase=` puts the slab's rest where the recording arrives: the shuttle's left rest starts 30 steps before the runner reaches the pit, the up-lift's bottom rest as the runner reaches it, the green slabs' level rests just before the runner reaches the gap. Each post's `clock=` is **the recording's step when the runner, walking at gear 1, passes the post's respawn x** (x 132.5 at step 1543; x 215.5 at step 2804). A player who respawns there (standing, gear 1, instant 3 tiles/s on the first step) and walks on meets every slab after the post at the same phase as the recording, so every window above holds after a post death.

**Deliberate deaths (sim, first use of posts with slabs):** after post 1, walking into the Ferry's pit dies at step 1908 and respawns at step 1933 standing at x 132.50, y 6, gear 1, band 0, kinetic clock 1543; holding right from there reaches the pit edge with the Ferry at u 34 of 564 (the recording: 32), in its left rest. After post 2, a death on the Runway's red bridge (no presses up, step 3397) respawns at step 3422 at x 215.50 with kinetic clock 2804; walking on reaches the shaft with the down-lift at u 41 (top rest 0–89). On both respawn steps the kinetic clock (step − kinBase) is the post's `clock=`. R after post 2 (step 2851) restarts at the spawn with clock 0 and no post lit. Nothing off.

**COMBINE (no win skips a slab):** the recording with one extra jump at every 2nd step (2,003 runs, 1,362 wins) and with two at random steps (1,200 runs, 579 wins): every win stood on all six slabs (checked against `moverOffset` each step). The pits under the shuttles, the shaft and the green slabs are open to the bottom; the 6-tile walls beside the lifts and the 2-row roofs over the green slabs and the Ferry stop every jump.

**Run length and pace.** Clean run (the recording) **4,006 steps, 66.8 s**, 300 tiles: sprints (Across, the Coast, the Runway) between rides and walks (the brake pads and blue bridges at gear 1, the Ferry, the lifts).

**Differences from `levels-w4.md` (accepted by design-lead 2026-11-24):**
- **Width 300, not ≈ 350**: wider means more walking; 66.8 s is already in the upper half of 45–75 s.
- **Room 3 is not "Down"**: v4.0's third room ended the level going down; here it is section 1's easy end on the lift's upper level (row 6), so it is named "Level". Its slab rests 150 steps (window ≥ 30 asked).
- **Runway has no back-up**: the down-lift sets you down at the shaft wall (the back wall) at speed 0, and 10 tiles is enough runway; w1-03's turn-back would need the runway behind the lift, across its path.
- **The shaft has no floor**: with a 1-deep dip, a player could drop down the empty shaft and hop out, skipping the down-lift. Walking into the empty shaft is a death (respawn at post 2, 12 tiles back).
- **Coast pad 2 lower, 5-tile gap** (w2-05 v2's short Coast), as the long-level windows ask (33).
- **Seen on screen:** not looked at; the preview pane runs hidden at about one step every 2 s.

**Fastest known:** 3946 steps (`252R 1+ 1. 1+ 1. 1+ 159. 179R 1RJ 132R 1. 1- 128. 340R 1R- 588R 1+ 237. 424R 1R- 562R 1+ 1. 1+ 1. 1+ 317R 1R- 1R 1R- 1R 1R- 607R`: the recording with each wait trimmed to its earliest; a random search around the recording).

**Solution:** 4,006 steps (66.8 s), deathless from the load, lights post 1 at step 1525 and post 2 at step 2787. `tests/levels` passes, including ±3 on every transition and the kinetic and checkpoint rules.

## w5-01 Spark

**Teaches:** a colored bolt only hits its own color.

**Bolts as built (first real use of the sim; notes for w5-01..w5-03).** Before building, the spec's "Room B" acceptance cases were replayed through the sim on a scratch level: grey standing hit on step 76; red never hits a standing body; white hits standing (76), never a body walking through; a straight-up jump survives for J on steps 41–73 (33 steps), J 40 is hit on step 84, J 74 on step 76; exit beats a hit on the same step (exit touch and first overlap both on step 44: won); after each death the next hit is again on run step 76 (respawn rewinds the clock). All as specified; no sim, parser or spec problem found. Note for the measuring method: the hit test uses the band at the **start** of the step, so a runner turning red while leaving a red lane can show band 4 inside the lane for one step without being hit (by rule; check 7).

Every lane here is speed 2 (3.75 tiles/s). "Dense" lanes use period 32: a bolt every 2 tiles, so a body inside the lane always overlaps a bolt once the lane has filled (60 steps for a lane 6 tiles tall).

One screen (30 × 13), w1-05's grammar with a bolt instead of a wall: safe runway (cols 0–15, spawn col 1, open sky) → red bridge (cols 16–21) over a death pit under a safe roof (2 tiles of headroom, flush with the bridge) → exit pad (`E` col 27).

- `emitter: 4 3 dir=d range=6 speed=2 period=32 band=R` — the demo lane, 3 tiles from the spawn, hanging under a safe block at (4, 2). Walking from the spawn, the body is inside it on steps 48–72 and the first bolt reaches head height on step 60: a red bolt falls through the walking (blue) runner about one second in. Nobody can be red there going right (2.4 tiles from the spawn; red needs 3.23).
- `emitter: 12 3 dir=d range=6 speed=2 period=32 band=R` — the test lane, dense. A sprint from the spawn is red there and is hit (step 69; with any idle 0–60 first, steps 74–99). The lane is full by step 60 and the earliest red arrival is step 69, so the empty-at-start rule leaves no gap to sprint through.
- **The decision:** cross col 12 in another color, then turn red in the 3 safe tiles before the bridge. Yellow cruise and one press up: **24 steps** (83–106 steps of running, x 12.47–15.92). Green and two presses: 36 steps. Walking blue and three presses: **72 steps** (first press at x 9.83–13.38). Bolts never constrain timing here (the lane is dense, so arrival phase does not matter): the windows are positions.
- **Fair line:** walk in gear 1 and press up three times anywhere from x 9.8 to 13.4 (72 steps), or the recorded yellow line (24 steps).
- **Removal:** without the emitters, the plain sprint from the spawn wins (step 143). Sweep of 25,000 lines (gears 0–3 up presses before and after a run of 1–300 steps, jumps at 4 points, plus 20,000 random logs): 2,490 wins without lanes, 2,109 of them red through col 12; with the lanes 404 wins. Strict check on 15,000 of those lines (band at the start of a step red while the body overlaps the col-12 lane): **0 wins red inside the lane** (249 wins). The red bridge's roof stops a yellow jump over it, as in w1-05.
- **Safe spots:** the whole runway (spawn included) and the 3 tiles after the lane.
- **Hints (Must, cold start):** `hint: move 1 6` over the spawn (box cols 0–2, rows 5–6) and `hint: shiftUp 14 6` over the second safe tile after the lane (box cols 13–15; col 13, the first tile, would put the box on the lane). Both 3 rows above the floor, clear of both lanes and the HUD. The glyph centre x 14.5 sits in the middle of the yellow press window (12.47–15.92).

**Fastest known:** 156 steps (`1R+ 1R 1R+ 80R 1R+ 300R`: shift to gear 3 while starting, last press as early as the window allows). Leaderboard floor 85%.

**Solution:** 182 steps. Stand 20, shift up twice standing, run 94 steps, press up once at x 14.0 (window 83–106), sprint the bridge. ±3 passes on every transition.

## w5-02 Keep Moving

**Teaches (twist):** a white bolt hits only a runner standing still, so a safe pad is no longer a safe stop.

69 × 13, scrolls. Room 1 is w1-04's Brake unchanged under the rain: runway cols 0–6, red bridge cols 7–12 under a safe roof, 8-tile safe pad cols 13–20, 12-tile blue bridge cols 21–32 (no roof). Room 2: safe floor cols 33–40 (no rain: stop and think), red bridge cols 41–46 under a safe roof, 6-tile safe pad cols 47–52, 10-tile green bridge cols 53–62 (no roof), exit pad (`E` col 66). A safe ceiling at row 2 over each pad carries the emitters.

- **16 emitters (the cap):** `emitter: <c> 3 dir=d range=6 speed=2 period=32 phase=<p> band=W` for c = 13–21 (phases 0, 12, 24, 4, 16, 28, 8, 20, 0) and c = 47–53 (phases 4, 16, 28, 8, 20, 0, 12). A lane in every column (0.5-tile gaps are narrower than the 0.75-tile body), so a body standing anywhere on a pad overlaps a lane; each lane is dense. Staggered phases are only for the look; density does not depend on them.
- **Why cols 21 and 53:** with lanes over the pads only, a body could let go and stop with its box over the last pad tile and the first bridge tile, just outside the last lane (x 21.24 in room 1): 11 stood wins in the sweep. The extra lanes over the first bridge tile close that; a body walking blue (or running green) under them is never hit.
- **The decision:** shed red **while moving**. Room 1: three presses down while running, first press at x 11.09–18.29, **37 steps** (w1-04's window, unchanged). Room 2: two presses down (gear 4 → 2) while running, first press at x 44.94–51.74, **35 steps**. Letting go only as a brake (and pressing down or jumping before you stop) also works; stopping does not. The room-2 shift up is a position choice on the dry floor (press at x 31.5–38.3 while walking, 136 steps; or stop there, shift up standing, and run: 34 steps for the brake).
- **Phase:** the rain is dense and full by step ~92, long before anyone reaches a pad, so every window is the same at any arrival time.
- **No wall stop** on the intended line (projectiles.md: no white lane where the line wall-stops).
- **Removal:** sweep of 2,781 structured lines (sprint 40–130 steps, then a running brake, or let go for 10–90 steps and press down standing, or let go and jump; room 2 the same with two or three presses; plus 5,000 random logs). Room 1: 133 wins with rain, **0 that stand on the pad**; without the emitters 322 wins, **187 standing on the pad** (the w1-04 let-go line). Room 2: 253 wins, **0 standing**; without emitters 283, **30 standing**. (Random logs win neither version.)
- **Safe spots:** the runway (spawn), room 2's dry floor (cols 33–40), the exit pad. The pads are no longer stop spots, which is the twist.
- **Hints:** none (spec).

**Fastest known:** 546 steps (`1R+ 1R 1R+ 1R 1R+ 94R 1R- 1R 1R- 1R 1R- 223R 1R+ 1R 1R+ 1R 1R+ 116R 1R- 1R 1R- 5R 1RJ 300R`: late room-2 brake, then a jump keeps the braking speed onto the green bridge; coordinate-descent search from the best sweep line).

**Solution:** 721 steps. Stand 20, shift up to gear 4, sprint 81, three presses down at x 14.7, walk 360, three presses up at x 34.8, sprint 77, two presses down at x 48.3, run the green bridge. ±3 passes on every transition.

## w5-03 Hurdles

**Teaches:** grey bolts hit everyone: jump the low ones, stay down under the high ones.

94 × 15, scrolls; the level steps down from left to right, so no climb is ever needed (a climb would be a wall stop, and a standing jump has no air control).

1. **Green hurdles.** Safe spawn ledge (cols 0–7, top row 8) → walk off 1 tile onto a 14-tile **green** floor (cols 8–21, row 9) over a pit → safe floor. `emitter: 22 8 dir=l range=15 speed=2 period=240` sits over the first safe tile after the green and fires at foot height; bolts sink into the spawn ledge's face, below the feet of a player standing on it. Jump them green: a green flight is 4.8 tiles and lands green.
2. **Yellow, stay down.** Safe floor (cols 22–28: stop, shift to yellow) → 24-tile **yellow** floor (cols 29–52, row 9) over a pit → safe floor. `emitter: 55 6 dir=l range=27 speed=2 period=32`, head height (the bolt passes 0.75 tiles over a standing head), dense, hanging under a block at (55, 5); bolts sink into an overhang at cols 27–28 (2 tiles of headroom under it). Any jump here meets a bolt, and a yellow flat jump drags to green and falls through anyway.
3. **Mixed, safe floor, timing only.** From the row-9 floor, a 1-tile drop onto a 10-tile high floor (cols 59–68, row 10: foot height), then a 2-tile drop onto the low floor (row 12: the same bolts pass overhead) to the exit (`E` col 91). `emitter: 87 9 dir=l range=29 speed=2 period=240`, hanging under a block at (87, 8); bolts sink into the face at (58, 9), right under a player waiting on the row-9 floor: the cue to go.

- **One grey emitter on screen:** emitters at cols 22, 55, 87 (33 and 32 apart; the view is 30 wide).
- **Windows (recorded line):** section 1, first hurdle **34 steps** (jump at x 9.4–12.7), second **40 steps** (the bolt just leaving the emitter, landing on the safe floor); shift up to yellow on the safe floor **44 steps** (x 24.7–29.0); section 3, go 20 steps after a bolt sinks, jump at x 61.7–66.6, **34 steps**.
- **Arrival phase (section 1):** you can wait on the spawn ledge as long as you like, so every phase can happen. Greedy search per arrival phase (idle 0–232 every 8 steps): every phase is solvable with one or two jumps, the tightest jump window over all phases is **19 steps** (idle 40), most are 25–46.
- **Arrival phase (section 3):** going when a bolt sinks, or up to 40 steps later: one jump, 33–34 steps; 60–80 steps later: one jump, 22–28 steps; 100–120 steps later: 16 and 10 steps (under 18: the next bolt meets you at the drop); 140–180 steps later: two jumps needed (163–318 two-jump wins per phase); 200–220 steps later (the next cycle): one jump, 35 steps. Waiting is always safe on the row-9 floor and on the low floor, so the fair line is "wait for a bolt to sink at your feet, then go".
- **Fair line:** shift up once standing; walk off at green and jump each bolt (34 and 40 steps); shift up once on the safe floor (44 steps); run the yellow floor without jumping (no timed input); stop on the safe floor; when a bolt sinks into the face below you, run and jump once (34 steps); hold right.
- **Removal:** without the emitters, the straight run (gear 2, one press up on the safe floor, hold right) wins on step 705; with them it is hit on step 142. **Section 1 with no jump: 0 of 240 arrival phases** clear the green floor. **Jumps on yellow:** after the recorded opening, a jump on each of the 163 steps spent on the yellow floor: **0 clear it** (without emitters 53 of 165 do, the late ones landing on the safe floor); 2 further jumps taken under the overhang, on the safe floor, bonk and land yellow (not jumps on yellow). Section 3 with no jump: hit at every one of 12 sampled departure phases.
- **Not cheese, noted:** gear 3 and gear 4 lines also clear section 1 (970 and 213 of a coarse sweep; gear 1: 0): a yellow takeoff from the ledge drags to green and lands green (w2-02's Coast), and every one of them still jumps the bolts.
- **Safe spots:** the spawn ledge, the safe floor after the green (cols 22–28), the safe floor after the yellow (cols 53–58), the low floor. The high floor is the only safe-tile stretch you cannot stand on.
- **Hints:** none (spec).

**Fastest known:** 721 steps (`1R+ 106R 1RJ 96R 1R+ 315R 1RJ 600R`: one green hurdle at the right phase, no stop before section 3; greedy plus coordinate-descent search, so a lower one may exist).

**Solution:** 1,028 steps (17.1 s). Stand 20, shift up once, run 99 and jump at x 11.0, run 94 and jump, run 59 and press up at x 26.6, run 190 over the yellow floor, let go and wait 257 steps on the safe floor (a bolt sinks at step 704; go at 724), run 56 and jump at x 64.1, hold right to the exit. ±3 passes on every transition.

**Checks (w5-01..w5-03, at build time):** `npx vitest run tests/levels`: all 406 tests passed once all three levels were in (that run included the other sitting's w4 files). A later full run had 3 failures, all 30-second robustness timeouts on other sittings' long levels (w2-05 41 s, w4-05 38 s, w5-05 47 s) while sweeps were loading the machine. `-t "w5-0[123]"` on its own: 42 passed. `npx vitest run scripts/levels-table.test.ts`: fails only on the missing `LEVELS` rows (w5-01..03, plus w4-05 from the other sitting).

`LEVELS` rows needed (backend): see the report; version 1 each.

## w5-05 Full Spectrum

**Teaches:** nothing new (COMBINE, long finale; `levels-w5.md` "w5-05" v4.1, level plan v4.1 "Long levels"): every bolt kind (red, yellow, white, grey), a grey lift and a green slab, with runway, drag, step-down and brake, as one journey. No hints, no sweep, no Tandem.

345 × 15, scrolls. Rows 0–3 hold no colored tile, exit, lane or slab path. Two slabs (speed 2), six emitters (all speed 2), three posts:

```
mover: 92 12 8x1 safe speed=2 phase=96 path=w90,u6,w90,d6      (Lift; cycle 372)
mover: 113 6 6x1 G speed=2 phase=327 path=w120,d6,w30,u6        (Moving Bridge; cycle 342)
emitter: 17 6 dir=d range=4 speed=2 period=32 band=R            (Rain, dense)
emitter: 43 14 dir=u range=10 speed=2 period=32 band=Y          (Coast fountain, dense, rises from the pit)
emitter: 99 5 dir=l range=8 speed=2 period=32 band=W            (Lift: head height over the top rest)
emitter: 174 10 dir=l range=15 speed=2 period=240 phase=190     (Hurdles, grey, foot height)
emitter: 212 8 dir=l range=27 speed=2 period=32                 (Stay down, grey, head height, dense)
emitter: 238 11 dir=l range=11 speed=2 period=32 band=W         (Brake pad, body height)
checkpoint: 80 11 clock=850
checkpoint: 148 9 clock=1642
checkpoint: 254 11 clock=2675
```

| # | Room | Cols | What you do | Window(s), steps |
|---|---|---|---|---|
| 1 | Rain | 0–27 | gear 3 standing; run yellow through the dense red lane (col 17); press up in the 4 safe tiles after it; red on the red bridge (22–27, roof) (w5-01) | press up 31 |
| 2 | Coast in yellow rain | 28–51 | 10 safe tiles; red runway (5), 5-col gap, yellow pad 2 lower; a dense yellow fountain rises in the gap's first column: take off red and you are still red in it, then drag to yellow on the pad | jump 32 |
| 3 | Blue bridge | 52–77 | 12 safe tiles, press down twice; 14-tile blue bridge (no roof) | 32 |
| — | **Post 1** | **80** (row 11) | 12 safe tiles before the lift dip | |
| 4 | Lift under white | 92–99 | 8-wide grey lift in a 1-deep dip rises 6 tiles to the upper ledge; a white lane sweeps head height over its top rest. Walk straight on at gear 1 and keep walking: you cross it while it rises and step off at the top. Standing on it dies; walking on too early reaches the far wall before the top (a wall stop is white) and dies | board: reach the dip edge in a 55-step span of each 372-step cycle |
| 5 | Moving Bridge | 100–119 | 12-tile upper ledge, press up once; green slab in a 6-col gap under a 2-row roof, level for 120 steps (w4-03) | press up 159; go: 125 of each 342 |
| 6 | Step Down | 120–145 | 12-tile ledge, three presses up; walk off red over a 3-col pit onto the red floor 4 below (w2-03) | 91 |
| — | **Post 2** | **148** (row 9) | 12 safe tiles; the hurdle bolts sink into this ledge's face, under your feet | |
| 7 | Hurdles | 146–183 | press down to gear 2 (67); walk off onto the 14-tile green floor 1 below and jump the grey foot-height bolt (period 240) (w5-03) | jump 35 |
| 8 | Stay down | 184–209 | 10 safe tiles, press up to gear 3; 24-tile yellow floor under a dense grey head-height stream: do not jump (w5-03) | press up 141 |
| 9 | Brake | 210–251 | 12 safe tiles, press up; red bridge (roof); 10-tile pad 1 lower swept at body height by white bolts; three presses down while running; 14-tile blue bridge (w5-02) | press up 97; brake 30 |
| — | **Post 3** | **254** (row 11) | 11 safe tiles of runway | |
| 10 | Runway | 252–270 | three presses up while walking; red on the red bridge (265–270, roof) (w1-03) | 212 |
| 11 | short Coast | 271–296 | 12 safe tiles; red runway (5), 5-col gap, yellow pad 2 lower (w2-05's) | jump 32 |
| 12 | Home | 297–344 | 12 safe tiles, press down twice; 28-tile blue bridge; exit col 341 | 84 |

Each window moves one input (or press group) earlier and later with every other input placed by position, as a player would; ±120 was the search range, so 159 and 212 are cut off. Every timed window is at least 30 except Rain's press (31 is fine), the first Coast's 32 and room 3's 32; all are ≥ 25, and the last section's are all ≥ 32.

**Clocks and late arrival.** The red, yellow, head-height grey and both white lanes are dense (a bolt every 2 tiles), so they do not care when you arrive. The slabs and the hurdle bolts are timed for the recording, which never waits, and each is entered from safe ground where waiting is free: the lower floor before the lift dip (the dip has a floor and no lane at its height), the upper ledge before the green slab, the post-2 ledge before the hurdles (the bolts sink into its face below a standing player's feet: go when one sinks, as in w5-03). Each post's `clock=` is the recording's step when the runner passes the post's respawn x (x 80.5 at step 850, walking; x 148.5 at step 1642; x 254.5 at step 2675, walking). Measured from each post (sim):
- **Post 1, Lift.** Respawn and walk on at once: on the lift at the recording's phase. Waiting D steps at the post first: D 0–36 board in time (again from 342, the next cycle); otherwise you reach the dip while the lift is away or rising and wait (nothing kills you down there).
- **Post 2, Hurdles.** Respawn at gear 1, press up once and go: jump window 35. Waiting D first: one jump wins for D 0–48 and 192–288 (sampled every 12 steps; the cycle is 240), windows 26–39; between those, one jump is not enough and you wait on the ledge.
- **Green slab** (standing on the upper ledge at x 103, then press up and go): wins for 125 of every 342 steps.
- **Post 3:** no kinetic piece after it.

**Deliberate deaths (sim).** Stand on the lift after post 1: hit at step 1190 (y 7.0, rising into the top rest); respawn at step 1215 at x 80.50, gear 1, band 0, kinetic clock 850; the recorded inputs from there win. No jump on the green floor after post 2: hit at step 1829; respawn at 1854, x 148.50, clock 1642; press up and the recorded jump win. No presses up after post 3: fall at step 2923; respawn at 2948, x 254.50, clock 2675; wins. R after post 1 (step 900): step 0 at the spawn, no post lit. Nothing off.

**Every bolt room's wrong choice dies** (recording up to the room, then the wrong input): sprint red from the spawn into the red lane (0 of 401 idle times 0–400 get past it); take off yellow on the Coast (hit in the fountain, step 269, x 43.0); stand on the lift (hit); no jump on green (hit); jump on the yellow floor (0 wins of 161, one jump at each step spent on it); let go on the brake pad, or brake late and stop at its end (hit, band 0).

**COMBINE (no win skips a room):** the recording with one extra jump at every 2nd step (1,870 runs, 1,358 wins) and with two at random steps (1,000 runs, 534 wins): every win stood on the lift and the green slab and overlapped the red lane, the yellow fountain, the lift's white lane, the hurdle lane and the pad's white lane (checked each step against `moverOffset` and the lane cells). No win touches the head-height grey lane, by design: you run under it, and no win jumps on the yellow floor (above). Roofs over the red bridges and the green slab, the 6-tile wall beside the lift, the blue bridges' length (14, 14, 28) and the open pits stop every jump past a room.

**Run length and pace.** Clean run (the recording) **3,739 steps, 62.3 s**, 345 tiles (5.5 tiles/s): sprints (Rain, both Coasts, the Step Down, the Brake, the Runway) between walking rooms (three blue bridges, the lift crossing at gear 1, the green slab at gear 2).

**Differences from `levels-w5.md` (for design-lead):**
- **Width 345, not ≈ 420–450** (inside level plan v4.1's 300–450): 62.3 s is already mid-range of 60–75 s; more width is more walking.
- **The Lift is crossed, not ridden standing.** Rain over a shaft would need a floor to sink into. Instead an 8-wide lift rises while you walk across it, and one white lane sweeps head height over its top rest. A standing rider dies at the top; a walker who starts too early is stopped by the far wall (white) and dies; the window is the 55-step arrival span above.
- **The Coast's yellow rain rises from the pit** (`dir=u`, emitter on the bottom row, sinking into a block at row 4): a falling lane would need a sink in the pit, which is a ledge to land on.
- **The brake pad's white rain is one horizontal lane at body height** (a horizontal lane reaches every standing spot), and the pad sits 1 tile below the red bridge so the lane sinks into the bridge's end. Pad 10 tiles (w5-02: 8), so the moving brake has 30 steps.
- **Post 2's `clock=`** is the recording's step at x 148.5 while it brakes from red (not a walker's); the hurdle `phase=190` puts both the recording and a player who respawns, presses up and goes mid-window (35 steps each).
- `levels-w5.md`'s first w5-05 line still says "no checkpoints"; the v4.1 paragraph asks for 3 posts, which is what is built.
- **Seen on screen:** looked at in the dev build (port 5195, `?level=w5-05&replay=1`): room 1 draws (red lane under its block, red bridge under its roof); the pane ran the replay too slowly to watch further rooms.

**Fastest known:** 3652 steps (the recording with two extra jumps, a random pair from the sweep above; no faster line found).

**Solution:** 3,739 steps (62.3 s), deathless from the load, lights post 1 at step 833, post 2 at 1638, post 3 at 2658. `tests/levels` passes for w5-05, including ±3 on every transition (that case takes about 25 s alone, close to the 30 s test timeout on a busy machine; w2-05 and w4-05 timed out the same way in a loaded full run) and the kinetic and checkpoint rules.
