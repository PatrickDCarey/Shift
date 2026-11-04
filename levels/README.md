# Levels

Owner: level-designer. Format: `docs/tech/level-format.md`. Every level ships with `<id>.solution.txt`; `tests/levels/solvability.test.ts` replays each one through the real sim. World 0 is for test rooms and is not in level select.

| Id | Title | World | Teaches | Target first-time solve | Status |
|---|---|---|---|---|---|
| w0-02 | Grey Box | 0 (test) | combine (M1 test room): hold to move, runway to red, air drag, letting go to drop through | 60–90 s | M1 playtest room (M1-20, M1-21), version 2 |
| w1-01 | First Steps | 1 | NEW: hold a direction to walk; blue floors hold you only while you walk | 15–30 s | built (M2-19), awaiting design-lead approval |
| w1-02 | Shift | 1 | NEW: Shift changes your cruise gear, and with it your color | 30–60 s | built (M2-19), awaiting design-lead approval |

`w0-01` is the format example in `docs/tech/level-format.md`; it is not a file here.

How the checks below were made: candidate input logs replayed through the real sim (`createSim`/`step` from `src/core`), not hand-tuned. "Fairness" moves each key input earlier and later, one step at a time, until the run stops winning (capped at the number shown); the pillar needs at least 3 each way.

## w0-02 Grey Box

The M1 playtest room (54 × 17, a short scroll). It is not a shipped level. It uses each M1 mechanic once, in order, with safe ground (`#`) between sections so the player can stop and think:

1. **Hold to move (cols 0–12).** Start pad, then an 8-tile blue bridge under a low ceiling. Gear 1 walking is blue, so holding Right crosses it. If you let go over the first 4 tiles you turn white and fall to your death. The low ceiling stops you jumping over the bridge. The start pad (cols 0–2) is open to the top of the room (version 2, M1-21): a standing jump there reaches the full 3.0-tile apex with no ceiling contact. The ceiling starts at col 3, over the bridge only.
2. **Runway and decoy (cols 7–17).** At the end of the bridge you drop into the runway room and land at the very edge of a 5-tile red bridge. The red bridge also has a low ceiling. Running from where you land is the decoy: there is under 1 tile of runway, and red needs 3.2. Walk back to the left wall, shift up to gear 4 and sprint the 5-tile room to cross red.
3. **Air drag (cols 18–36).** An 8-tile safe pad (P3), a 7-tile gap, then a 4-tile yellow pad. A sprint jump drops to yellow after 6 tiles and lands on the yellow pad. A yellow takeoff drops to green and falls through it. P3 is long enough to stop on and still build red again before the gap.
4. **Letting go on purpose (cols 37–53).** Stop on a 5-tile safe pad (P4) and shift down to gear 1. Walk onto the 9-tile blue floor, which dead-ends on a safe nub. The exit is in a pocket under the far end of the floor. Let go over the pocket: grace runs out, you fall through, and you walk into the exit. Under the first 6 tiles of the floor is a death pit. A low ceiling stops anyone jumping across it.

Mechanics covered: gears up and down, acceleration over distance, color-gated floors, color grace, air drag, safe tiles, walls, death and respawn.

**Version 2 (M1-21, 2026-11-04):** rows 4–5 over cols 0–2 opened. Spawn jump: apex 3.0 tiles on flight step 24, lands on step 48, no ceiling event; the same from anywhere on the pad up to x = 2.6 (where the box starts to pass under the bridge ceiling). The pit, the blue bridge (cols 3–10), the divider at col 7, the runway-room floor (row 12) and everything to the right are unchanged, so the e2e pit walk still works.

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

One screen (23 × 13): spawn pad P1 (3 tiles, open sky) → blue bridge 1 (5 tiles) → safe pad P2 (3 tiles, open sky) → blue bridge 2 (6 tiles) → exit pad. Both bridges sit over death pits, under a tunnel roof with 2 tiles of headroom; the pads are open to the sky.

- **Teach → test:** bridge 1 is the cheap place to learn that letting go drops you (you respawn a few tiles away). P2 shows the other half: let go on a white pad and nothing happens, so white is where you stop and think. Bridge 2 (6 tiles, the plan's bridge) is the test.
- **Fails if you let go on a bridge** (acceptance): letting go after every possible number of steps, the run dies exactly when the box is wholly on a bridge (x 3.37–7.57 on bridge 1, 11.38–16.58 on bridge 2) and survives everywhere else.
- **Removing the new piece breaks it:** the only lines through stand on both blue bridges while walking (0 of 21,226 winning sweep runs skip a bridge). Paint the bridges white and the level has no lesson (letting go stops nothing from working); remove them and there is no way across.
- **Cheese check:** 42,832 runs (all four gears, every takeoff point, coyote and double jumps, random input logs): 0 wins that skip a bridge. The tunnel roofs stop every jump (the bonked flight is too short for any gear). The spawn pad is 3 tiles so it can't build red (3.23 tiles): with a 5-tile spawn pad a red coyote jump under the roof did skip a 4-tile bridge 1, which is why bridge 1 is 5 tiles and P1 is 3.
- **Safe spots:** P1 (spawn) and P2.
- **Hint (to add when M2-03/M2-04 land):** `move` anchored at col 1, row 6, above the spawn. Its 3 × 2 box (cols 0–2, rows 5–6) is empty sky, 3 rows above the floor row 9. Noted as a comment in the level file for now.

**Solution:** 414 steps. Stand 20 steps, walk to P2, let go there for 30 steps (safe), walk on to the exit. Fairness: start 20/30, let-go on P2 30/30, walk-on 30/30 (earlier/later, capped). Holding right from the first step wins at step 364.

## w1-02 Shift

**Teaches:** Shift changes your cruise gear, and with it your color. Solvable without reading anything.

The same room as w1-01 on purpose, with bridge 1 painted green: the player recognises the room and spots the one difference. Spawn pad P1 (3 tiles) → green bridge (5 tiles) → safe pad P2 (3 tiles) → blue bridge (6 tiles) → exit pad; death pits and 2-tile tunnel roofs as in w1-01.

- **How fast (P1):** press up once. Gear 2 is green 0.6 tiles from standing, or 0.57 tiles after the press if already walking; the last press that still works is at x ≈ 2.87, about 28 steps of walking from the spawn. Two presses make you yellow and you fall through green. No presses: you are blue and walk into the green hole, the cheap first failure right by the spawn.
- **Where (P2):** shift down while holding right, so you are blue 0.78 tiles later. Press too early (still on the green bridge) and you turn blue on green and fall; too late and you reach the blue bridge still green. The window is 43 steps (press at x 6.41–10.61, measured with the walk held throughout). Letting go to stop on P2, then shifting down and walking on, also works (let-go window 37 steps).
- **Removing the new piece breaks it:** with no shift presses, 0 of 3,208 lines win (walks, jumps, double jumps, walking back first). Two presses up and walking on (yellow onto green) also never wins; only a later press back down to gear 2 before the bridge saves it.
- **Cheese check:** 39,632 runs (all gears, every takeoff point, mid-run shifts both ways, random logs): 359 wins, 0 that skip a bridge. Jumping over either bridge at any gear is stopped by the tunnel roofs.
- **Safe spots:** P1 (spawn) and P2.
- **Hints (to add when M2-03/M2-04 land):** `shiftUp` anchored at col 1, row 6 (over P1), and `shiftDown` at col 9, row 6 (over P2). Both 3 × 2 boxes (cols 0–2 and 8–10, rows 5–6) are empty sky, 3 rows above the floor row 9.

**Solution:** 311 steps. Stand 20 steps, shift up once, walk right, shift down on P2 while walking, walk to the exit. Fairness: shift-up 20/21, shift-down 21/21 (earlier/later).
