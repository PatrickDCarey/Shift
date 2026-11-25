# World 5 — Signals (level specs)

_Owner: design-lead. Written 2026-11-23 (expansion, `decisions.md` 2026-11-23 "Expansion"), reconciled with tech-lead's `docs/tech/expansion-approach.md` the same day: shot speeds 2 or 4 (3.75 or 7.5 tiles/s), no stream from before step 0 (a phase-0 shot sits at its muzzle on step 0; BUG-9 ruling 2026-11-24), recordings ≤ 5,400 steps. Checkpoints were ruled out that day and brought back as Must for long levels on 2026-11-24 (`decisions.md` "Long levels redefined"): w5-05 has 3 posts; w5-01..04 have none. Built by level-designer in `levels/`. Rules: GDD v1.12 §4.17 (bolts), §4.16 (movers), §4.18 (sweep, Should); specs `features/projectiles.md`, `moving-objects.md`, `sweep.md`. World name in level select: **5 SIGNALS**._

World 5 is the action world: things fly at you on fixed clocks, and the dodge is usually **a colour, not a reflex**. It needs world 1–2 skills, and world 4's lifts for its finale. Single-runner only.

**Fairness floor:** ≥ 18 steps per timed input at the intended pace, including every lane crossing, and the ±3-step robustness test. At most one grey emitter on screen at once in w5-01..w5-03.

| Id | Title | Kind | Long | Priority | Target first clear | Difficulty |
|---|---|---|---|---|---|---|
| w5-01 | Spark | puzzle (teach) | no | Must | 15–25 s | 1/5 |
| w5-02 | Keep Moving | puzzle (twist) | no | Must | 25–40 s | 2/5 |
| w5-03 | Hurdles | action (teach grey) | no | Must | 30–45 s | 3/5 |
| w5-04 | Chase | action (sweep + bolts) | medium (≈ 100 tiles) | Should | 40–60 s | 4/5 |
| w5-05 | Full Spectrum | flow and action (finale) | **yes** (345 tiles, 12 rooms, 3 posts, clean run 62.3 s) | Must | 4–8 min | 4/5 |

## w5-01 Spark

**Teaches:** a coloured bolt only hits its own colour.

**Intent.** Two seconds after the spawn a red bolt falls through the walking runner and nothing happens: the rule is shown before it is needed. A ceiling emitter near col 4 rains red (`dir=d`, `band=R`) across the first steps. Then w1-05's grammar with a bolt instead of a wall: a **dense** red rain lane (spacing ≤ 2 tiles, so a body is always in a bolt) over the runway near col 12, then a red bridge to the exit starting about 3 tiles after the lane. Sprint from the spawn and you are red in the lane. Arrive yellow, shift up after the lane: red 0.66 tiles later.

- The first lane may cross the spawn path (coloured lanes may; not in the first 60 steps per tech-lead's rule, so time its phase to fall just after).
- Hints (first of a world, cold start): `move` over the spawn and `shiftUp` over the first safe tile after the lane (Must).
- **Removal:** without the lane a sprint from the spawn wins; with it, 0 wins red inside the lane.
- **APPROVED v1 as built (2026-11-24).** 30 × 13. Demo lane at col 4 (a red bolt passes through the walking runner about 1 s in), dense test lane at col 12, 3 safe tiles, red bridge under a roof. Fair line: walk blue, three presses up at x 9.8–13.4 (72 steps); the yellow one-press line (24) is the expert line. Hints `move 1 6`, `shiftUp 14 6`. Recording 182, fastest known 156.

## w5-02 Keep Moving

**Teaches (twist):** a white bolt hits only a runner standing still, so a safe pad is no longer a safe stop.

**Intent.** w1-04's Brake room with dense **white** rain over the safe pad between the red bridge and the blue bridge. World 1 allowed two answers: stop on the pad, shift down, walk on; or shift down early while running. White rain removes the first: shed red to blue **while moving** (3.24 tiles). A second short room repeats it toward a green bridge (gear 4 → 2 while moving).

- No hints (a white diamond falling on the pad is the cue).
- **Removal:** without the lane, the stop-and-walk line wins; with it, 0 wins that stand on the pad.
- **APPROVED v1 as built (2026-11-24).** 69 × 13, two rooms, **16 white lanes (the format's cap)**: one per pad column plus one over each first bridge tile (cols 21 and 53), because a body stopped on the pad's last edge otherwise survived. Room 2's floor (cols 33–40) is dry: the stop-and-think spot. Moving brake 37 and 35 steps. Recording 721, fastest known 546. No lanes left for any later edit of this level.

## w5-03 Hurdles

**Teaches:** grey bolts hit everyone: jump the low ones, stay down under the high ones.

**Intent.** The genre's dodge, made Redshift's by the floor. A long **green** floor with grey bolts rolling toward you at foot height (`speed=2`): jump them at green (a 4.8-tile flight that lands green). Then a **yellow** floor where grey bolts fly at head height: stay down; a jump here is wrong twice over, since a yellow flat jump also lands green after drag and falls through. The last stretch mixes both heights on a **safe** floor, where only timing remains.

- Level-designer measures every hurdle window at the intended pace (≥ 18; `projectiles.md` check 6 gives 33 steps for a standing jump over a 7.5-tile/s bolt; running toward a bolt shortens it).
- No hints.
- **Removal:** without bolts a straight run wins; with them, 0 wins without a jump on green and 0 wins with a jump on yellow.
- **APPROVED v1 as built (2026-11-24).** 94 × 15, **steps down with no climbs** (a plateau climb gave an 11-step window). Three grey emitters 32–33 columns apart (one on screen). Green hurdles 34 and 40 (tightest over all arrival phases 19); shift to yellow on safe floor 44; yellow floor has no timed input; last stretch on safe floors, period 240.
- **Last-stretch ruling (2026-11-24): the wait is the fair line, no change.** Going within 0–80 steps after a bolt sinks into the face at your feet gives one jump with a 22–34-step window; going 100–120 after gives 16 and 10; 140–180 needs two jumps. Waiting there is always safe, and the sinking bolt is the cue, right under the player. A period change only moves the bad band. **Trigger:** 3+ deaths there in a cold play, or one called unfair, and design asks for a measured period/range change.
- Recording 1,028 (waits 257 steps on the safe floor), fastest known 721.
- **v2 (2026-11-24, B12-C3): APPROVED as built, with one measured condition.**
  - **Last stretch:** the row-9 drop is replaced by a 12-tile safe floor (row 10), a red catcher tile at (65, 9), a 4-tile high floor and the low floor. Emitter `87 9 dir=l range=22 period=152`. From the x 58.1 stop, every phase wins with one jump; the worst window is 26 steps. That meets "≥ 22 from any phase". "Wait for a sink" is no longer the fair line.
  - **Stops closer to the catcher** (worst window 19 at x 59.9, 10 at x 61.5, 1 against it): accepted **if** the level-designer measures that from every stop x 58–64.6, going 0–30 steps after a bolt ends at the red tile wins with one jump, window ≥ 22. That bolt end is visible at the player's feet, in front of them, so it is a fair cue at any stop. Waiting is safe, and the bad windows come only from going at an arbitrary phase from close up. If the check fails, the level-designer proposes a geometry change (a longer run-in, or the catcher further right) and design rules.
  - **Trigger** for the follow-up sitting: 3+ deaths in the last stretch, and the tester was standing close to the red tile → `hint: jump` over the middle of the measured take-off range.
  - **Red catcher tile: accepted.** It obeys the rule (a red wall stops only red). Non-red runners walk through it, which shows the rule a second time and does not contradict it. It gives the grey bolts a visible end in front of the player. A red arrival is stopped on safe floor, which is harmless.
  - **Section 1:** emitter `24 8 range=17`. Hurdle windows 36 and 34, not ≥ 40: accepted. My "≥ 40" relied on the point-blank shot, so it conflicted with "≥ 2 tiles of flight". Both windows are over 30. The arrival-phase worst stays 19 (≥ 18).
  - Removal tests hold. Recording 830 (13.8 s), fastest known 731.

## w5-04 Chase (Should; needs `sweep.md`)

**Combines:** the sweep with coloured rain. Sweep `speed=4` (7.5 tiles/s, between green and yellow): you need yellow or red on average, but the route crosses yellow and red rain you must pass in another colour, plus a green bridge. About 100 tiles, ≥ 3 tiles of lead at the closest point.

- **APPROVED v1 as built (2026-11-24).** 92 × 13, `sweep: x0=-4 speed=4 delay=90`, spawn col 2; eight dense red/yellow lanes (`speed=2 period=32`), full height. Windows 40, 42, 43, 84, 30 (all ≥ 18); closest gap 7.9 tiles (63 steps); a stop still wins for 62–91 steps. Every lane's wrong gear dies by a hit; the sweep removal is caught on step 142. Recording 731 (12.2 s), fastest known 697. No hints.
- **Length (12.2 s, 92 tiles): ACCEPTED.** Inside the medium rule (40–120 tiles, under about 25 s); the difficulty is six presses in 12 s against a front, not distance, and a short sharp level before the 62 s finale is good pacing. The 40–60 s first-clear target includes deaths.
- **"Forces green" read from colours alone: ACCEPTED, no hint.** Alternating yellow and red lanes say "neither fast colour", and the green bridge right after them names the answer; each wrong colour dies at the first lane of its own colour, on safe floor, so the death teaches. **Trigger:** 3+ cold deaths in the gauntlet without the player saying "green" (or blue) as the answer → design asks for a `shiftDown` hint before col 38.
- **Spawn col 2, not spawn − 6 from the spec:** accepted — from col 6 a red sprint beat the col-13 lane's fill and skipped the lesson.
- **Could alternative for the slot** if the sweep is cut but bolts ship: **Crossfire**, a Tandem level where one coloured lane crosses both lanes and the bodies must be split by one gear to pass (w3-02's kerb or w3-03's air stop makes the split).

## w5-05 Full Spectrum (long finale)

**Combines:** all three bolt kinds, a lift, the coloured slab, runway, drag, walls. No sweep; 3 checkpoint posts (long level, v4.1).

**v4.1 (2026-11-24): 12 rooms, ≈ 420–450 tiles, 60–75 s clean, 3 posts (`level-plan.md` "Long levels").** Each of the four rooms below becomes a three-room section, hardest first, with a post after sections 1–3: (1) Rain, then a red Coast through yellow rain, then a slow blue bridge; (2) the Lift under white rain, a green Moving Bridge, a walk-off Step Down; (3) Hurdles on green, grey head-height bolts on yellow, a Brake to blue under white rain on the pad; (4) easiest: a Runway, a short Coast, a blue walk home. Recovery stretches carry no white rain. No sweep.

**Intent.** The game's last level: four rooms, hardest first, ending on a victory lap.

1. **Rain (hardest):** a red rain lane over a runway before a red bridge (w5-01), then a Coast jump through a **yellow** lane: take off red and you are still red crossing it (it sits inside the first 6 tiles of flight), so it is harmless; take off yellow and it kills you.
2. **Lift:** a grey lift whose top rest sits under white rain: walk across the slab instead of standing on it.
3. **Hurdles:** grey foot-height bolts on a green floor, then a green moving bridge with a long rest.
4. **Home (easy):** red runway, red wall, a brake to a blue bridge with white rain on the pad (w5-02), the exit.

- Clean run ≤ 4,500 steps (75 s); par 60–75 s; first clear 4–8 minutes with deaths mostly in the first room of each section.
- **COMBINE rule:** no win skips any bolt kind, the lift or the coloured slab.
- **APPROVED v1 as built (2026-11-24).** 345 × 15, 12 rooms, posts at cols 80, 148, 254 (clocks 850, 1642, 2675). Sections: (1) Rain (dense red lane, press up 31) → red Coast through a dense yellow fountain rising from the pit (`dir=u`; jump 32) → blue bridge (32); (2) Lift: an 8-wide grey lift rising 6 under one white head-height lane, **crossed walking while it rises** (arrival span 55 of each 372-step cycle; standing or a wall stop dies) → green Moving Bridge (go 125 of 342) → Step Down (91); (3) Hurdles on green (grey foot height, period 240, `phase=190`, jump 35) → stay down on yellow under a dense grey head-height stream (no timed input; 0/161 jumps win) → Brake to blue on a 10-tile pad 1 lower, swept at body height by one white lane (brake 30); (4) Runway (212) → short Coast (32) → 28-tile blue bridge home (84). Late arrivals at the lift, the slab and the hurdles wait on safe ground. Every win uses both slabs and five of six lanes (the head-height grey lane is run under). Recording 3,739 (62.3 s), fastest known 3,652.
- **Deviations accepted:** width 345 (62.3 s is mid-range; more width is more walking); the lift crossed, not ridden (white rain needs you moving; "keep walking on the lift" is w4-01 + w5-02, not a new idea); the yellow rain rising from the pit (a falling lane needs a sink, which is a ledge); the pad's one horizontal white lane, pad 1 lower; post 2's clock and hurdle `phase=190` putting a respawned runner mid-window (35); section 3's brake (30) after Hurdles (35), within 5 steps, as w2-05's section-2 ruling.

## Cold-play checks (playtester, when built)

1. w5-01: within 10 s, did a bolt pass through you? Then, why did the second lane kill you?
2. w5-02: tried to stop on the pad? Tries to the moving brake?
3. w5-03: deaths per hurdle section; any death "unfair" in your words?
4. w5-05: minutes, deaths per room, and whether a death late in the level made you want to quit (the checkpoint question).
5. **Watch list for the cold play (2026-11-24, as built):**
   - w5-01: did you notice the first bolt pass through you? First death at the col-12 lane: did you understand why (red), and did the `shiftUp` glyph after the lane say "turn red here"?
   - w5-02: did you try to stop on the first pad, and how many deaths before you braked while moving? Did you use room 2's dry floor to stop and think?
   - w5-03: deaths per section; did you ever jump on yellow? In the last stretch, did you wait for a bolt to sink before going, or run straight in (count deaths there; the trigger above)? Any death called unfair.
   - w5-04 (added 2026-11-24 after the sweep review): deaths by hit vs. by the front; deaths in the gauntlet (cols 38–44) and in which colour; how would you say what the gauntlet wanted? Did the front ever catch you on the short blue bridge under the roof? Any death called unfair.
   - **w5-05 (finale):** first note which worlds the player cleared before it (did they ever see world 4's lift and slab? world 3?). Count deaths per room, grouped by section, and total minutes. **Room 4 Lift:** deaths standing on it vs. stopped at the far wall, and whether a late player waited on the floor or jumped in. **Room 2 Coast:** deaths in the yellow fountain (took off yellow?). **Room 7 Hurdles:** did they go when a bolt sank at the post-2 ledge? **Room 8:** any jump on yellow. **Room 9 Brake:** stops on the pad. Did they see each post coming, and did any death make them want to quit (say where)?
   - **w5-05 triggers:** 5+ deaths in any one room, a room called unfair, or a quit → design asks level-designer for a measured change to that room only. Any death in section 4 is reported on its own (it is the victory lap).
