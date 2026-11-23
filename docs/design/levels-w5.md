# World 5 — Signals (level specs)

_Owner: design-lead. Written 2026-11-23 (expansion, `decisions.md` 2026-11-23 "Expansion"), reconciled with tech-lead's `docs/tech/expansion-approach.md` the same day: no checkpoints, shot speeds 2 or 4 (3.75 or 7.5 tiles/s), lanes empty at the start of every run, recordings ≤ 5,400 steps. Built by level-designer in `levels/`. Rules: GDD v1.12 §4.17 (bolts), §4.16 (movers), §4.18 (sweep, Should); specs `features/projectiles.md`, `moving-objects.md`, `sweep.md`. World name in level select: **5 SIGNALS**._

World 5 is the action world: things fly at you on fixed clocks, and the dodge is usually **a color, not a reflex**. It needs world 1–2 skills, and world 4's lifts for its finale. Single-runner only.

**Fairness floor:** ≥ 18 steps per timed input at the intended pace, including every lane crossing, and the ±3-step robustness test. At most one grey emitter on screen at once in w5-01..w5-03.

| Id | Title | Kind | Long | Priority | Target first clear | Difficulty |
|---|---|---|---|---|---|---|
| w5-01 | Spark | puzzle (teach) | no | Must | 15–25 s | 1/5 |
| w5-02 | Keep Moving | puzzle (twist) | no | Must | 25–40 s | 2/5 |
| w5-03 | Hurdles | action (teach grey) | no | Must | 30–45 s | 3/5 |
| w5-04 | Chase | action (sweep + bolts) | medium (≈ 100 tiles) | Should | 40–60 s | 4/5 |
| w5-05 | Full Spectrum | flow and action (finale) | **yes** (≈ 150 tiles, clean run ≤ 80 s) | Must | 3–4 min | 4/5 |

## w5-01 Spark

**Teaches:** a colored bolt only hits its own color.

**Intent.** Two seconds after the spawn a red bolt falls through the walking runner and nothing happens: the rule is shown before it is needed. A ceiling emitter near col 4 rains red (`dir=d`, `band=R`) across the first steps. Then w1-05's grammar with a bolt instead of a wall: a **dense** red rain lane (spacing ≤ 2 tiles, so a body is always in a bolt) over the runway near col 12, then a red bridge to the exit starting about 3 tiles after the lane. Sprint from the spawn and you are red in the lane. Arrive yellow, shift up after the lane: red 0.66 tiles later.

- The first lane may cross the spawn path (colored lanes may; not in the first 60 steps per tech-lead's rule, so time its phase to fall just after).
- Hints (first of a world, cold start): `move` over the spawn and `shiftUp` over the first safe tile after the lane (Must).
- **Removal:** without the lane a sprint from the spawn wins; with it, 0 wins red inside the lane.

## w5-02 Keep Moving

**Teaches (twist):** a white bolt hits only a runner standing still, so a safe pad is no longer a safe stop.

**Intent.** w1-04's Brake room with dense **white** rain over the safe pad between the red bridge and the blue bridge. World 1 allowed two answers: stop on the pad, shift down, walk on; or shift down early while running. White rain removes the first: shed red to blue **while moving** (3.24 tiles). A second short room repeats it toward a green bridge (gear 4 → 2 while moving).

- No hints (a white diamond falling on the pad is the cue).
- **Removal:** without the lane, the stop-and-walk line wins; with it, 0 wins that stand on the pad.

## w5-03 Hurdles

**Teaches:** grey bolts hit everyone: jump the low ones, stay down under the high ones.

**Intent.** The genre's dodge, made Redshift's by the floor. A long **green** floor with grey bolts rolling toward you at foot height (`speed=2`): jump them at green (a 4.8-tile flight that lands green). Then a **yellow** floor where grey bolts fly at head height: stay down; a jump here is wrong twice over, since a yellow flat jump also lands green after drag and falls through. The last stretch mixes both heights on a **safe** floor, where only timing remains.

- Level-designer measures every hurdle window at the intended pace (≥ 18; `projectiles.md` check 6 gives 33 steps for a standing jump over a 7.5-tile/s bolt; running toward a bolt shortens it).
- No hints.
- **Removal:** without bolts a straight run wins; with them, 0 wins without a jump on green and 0 wins with a jump on yellow.

## w5-04 Chase (Should; needs `sweep.md`)

**Combines:** the sweep with colored rain. Sweep `speed=4` (7.5 tiles/s, between green and yellow): you need yellow or red on average, but the route crosses yellow and red rain you must pass in another color, plus a green bridge. About 100 tiles, ≥ 3 tiles of lead at the closest point.

- **Could alternative for the slot** if the sweep is cut but bolts ship: **Crossfire**, a Tandem level where one colored lane crosses both lanes and the bodies must be split by one gear to pass (w3-02's kerb or w3-03's air stop makes the split).

## w5-05 Full Spectrum (long finale)

**Combines:** all three bolt kinds, a lift, the colored slab, runway, drag, walls. No sweep, no checkpoints.

**Intent.** The game's last level: four rooms, hardest first, ending on a victory lap.

1. **Rain (hardest):** a red rain lane over a runway before a red bridge (w5-01), then a Coast jump through a **yellow** lane: take off red and you are still red crossing it (it sits inside the first 6 tiles of flight), so it is harmless; take off yellow and it kills you.
2. **Lift:** a grey lift whose top rest sits under white rain: walk across the slab instead of standing on it.
3. **Hurdles:** grey foot-height bolts on a green floor, then a green moving bridge with a long rest.
4. **Home (easy):** red runway, red wall, a brake to a blue bridge with white rain on the pad (w5-02), the exit.

- Clean run ≤ 4,800 steps (80 s); par 60–75 s; first clear 3–4 minutes with deaths mostly in room 1.
- **COMBINE rule:** no win skips any bolt kind, the lift or the colored slab.

## Cold-play checks (playtester, when built)

1. w5-01: within 10 s, did a bolt pass through you? Then, why did the second lane kill you?
2. w5-02: tried to stop on the pad? Tries to the moving brake?
3. w5-03: deaths per hurdle section; any death "unfair" in your words?
4. w5-05: minutes, deaths per room, and whether a death late in the level made you want to quit (the checkpoint question).
