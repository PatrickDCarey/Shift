# World 3 Tandem: level specs w3-02 to w3-05

_Owner: design-lead. Written 2026-11-16 (board B6-07) for level-designer; **revised 2026-11-17 to match the levels as built and approved** (B6-32..B6-36, `decisions.md` 2026-11-17). All four levels are **APPROVED, version 1**. **Amended 2026-11-20** (batch 7 playtest): hint glyphs for w3-03..w3-05, with no geometry change. **Amended 2026-11-23** (batch 8 playtest): w3-05 v2, a step at the back of the run-up (section "w3-05 v2"). The grid, lines and sweep numbers of record are in `levels/README.md`; this file keeps the intent, the rules each level must keep, and why it is built the way it is. Rules that apply to every level here: `features/tandem.md` "Level rules" (including the lane-colouring rule), `level-plan.md` "Constraints for level-designer", GDD §6._

Only mechanics the sim already has are used (`features/tandem.md` checks 1–18; coloured walls, `features/colored-walls.md`). No new tiles, no new tuning.

## Common to all four

- **Template:** 15 rows, like w3-01. Runner lane on top (floor row 6), divider (row 7 and below, safe where the runner lane has a floor), twin lane below (floor row 13, row 14 safe under pads). Each lane ≤ 7 rows. Both spawns at col 1.
- **Lane colouring (scene, `tandem.md`):** every coloured tile must be strictly nearer its own body's start row than the other's. With spawns on rows 5 and 12 the midpoint is 8.5: **no coloured tile in twin-lane rows 7–8**. Automated in `tests/levels/levelRules.test.ts`.
- **Holding one body still (ruled 2026-11-17): use a 1-tile safe kerb, never a coloured wall.** After any wall stop a body is band 0 and restarts at walking pace on the next step, so it passes every coloured wall, blue included (no-embed: it turns blue inside the wall). A safe kerb (one `#` on the lane's floor) holds a walking body for as long as you hold the direction, in any gear, and is cleared with a jump.
- **Coast pads in Tandem are flat (ruled 2026-11-17).** With w2-02's pad 2 tiles lower the twin lands 7 steps after the runner, and a shift pressed late in the flight is buffered for only one body: an untaught second way to split. Flat, both land on the same step. The window is then 18 steps, the world-2 floor.
- **Pockets:** where a body that falls through its own coloured tile would land in the other lane and could finish there, the divider closes a pocket under that tile (at least 3 rows tall, so no jump climbs back out). A body in a pocket waits for R; since 2026-11-19 the scene shows a `[R] RESTART` card 1 s after a body is stuck there (`features/restart-prompt.md`), so a pocket must be a region its helper finds as sealed (no spawn, no exit, not reaching the grid's top or bottom row). Prefer an open drop out of the grid when the other lane is a hole or a non-matching colour below it.
- **README per level:** fair line with windows (≥ 18 steps or a walking-pace position choice with ≥ 1 tile of spots), removal test, whether each split is undone (clamp) or final (park), spread (≤ 26 tiles between non-home bodies on the intended line), `Fastest known`, and a request line to backend for its `LEVELS` row.
- **Removal tests must include the park line:** when one body is home the other is played alone, so for each level show that "get one body home first, then solve the other lane alone" cannot skip the new idea.
- **Hints (amended 2026-11-20, `decisions.md` 2026-11-20):** all in the runner's lane, headers only, no `version` bump, no re-record, no `LEVELS` change (`features/onboarding-hints.md` "2026-11-20 placements"). w3-02: none. w3-03: `shiftUp 2 3`, `jump 12 3`. w3-04: `shiftUp 2 3`, `jump 12 3` (the 2026-11-19 fallback fired: about 8 failed openings in the batch 7 playtest). w3-05: `jump 12 3`, `shiftUp 36 3`, `jump 41 3` (v2, 2026-11-23: the last two move to the step and the measured take-off). The new idea of w3-04 (the clamp) and w3-05's down presses are never hinted.

### Cold-play checks before submit (2026-11-19)

No player has finished w3-04 or w3-05 cold (the batch 6 playtest stopped at w3-04's first half). A cold playtest of w3-02..w3-05 with the 2026-11-19 changes in is **Must before submit**. No README reads; if stuck after 10 tries on one level, the playtester may read only that level's "**The idea:**" line and must say so. Findings for design-lead (not engineering pass/fail):
- **w3-02:** if the runner lands in the pocket, does the `[R] RESTART` card appear and is R pressed within about 5 s of it? Did the kerb read as "holds my runner while the twin walks on"?
- **w3-03:** with the jump glyph, does the first jump come near it, and can the player say the block took the runner's gear? Solved within 6 tries?
- **w3-04:** is the opening recognised from w3-03 (≤ 3 failed openings, else add the glyph, above)? Do they find "press up until both are red" (the clamp), and how many tries?
- **w3-05:** does the blue strip read as the reason for the down presses? Is the order readable? Time to solve (target 3–5 min) and whether they quit.

**Batch 7 results (2026-11-20, `docs/playtests/2026-11-20-batch7.md`):** w3-02's card showed and R worked. w3-03 was not a cold play. w3-04 was cleared after about 16 tries, about 8 of them failed openings, so the glyph fallback fired. w3-05 was not finished after about 14 tries: the twin waits white at its kerb and nothing said "back up and run". The fix is the 2026-11-20 hints above. **Next playtest (Must before submit):** the same w3-04 and w3-05 questions with the hints in, plus `onboarding-hints.md` check 15. Use a fresh sitting if possible, because this playtester now knows w3-04. If w3-05 is still not finished, design-lead rules again. No checkpoint and no geometry change is pre-approved.

**Batch 8 results (2026-11-23, `docs/playtests/2026-11-20-batch8.md`, fresh sitting):** w3-03 was solved in 5 tries and the hints were read. w3-04 was cleared in about 8 tries (16 before), so its opening now reads; the clamp stays unhinted. w3-05 was again not finished in about 14 lives. The tester reached the kerbs at least four times and lost there because the walk-back moved the two bodies by unequal amounts. The ruling is the v2 run-up step (below, under w3-05), Must for release. Its cold-play check replaces the w3-05 line above.

Known numbers used below (GDD §5, `tandem.md`, `levels/README.md`):

| Fact | Value |
|---|---|
| Gear 4 from standing (or from a wall stop), holding | blue at once, green 0.60, yellow 1.88, red 3.23 tiles |
| Gear 2 from standing | green 0.6 tiles |
| Gear-4 flat jump | 8.7 tiles, drags to yellow at 6.0 (flight step 30), lands step 48 in gear 3 |
| Coast, flat pad (Tandem levels) | red runway 5 tiles, 7-tile gap, flat yellow pad; takeoff window 18 steps (x 11.10–14.50 in w3-03..05) |
| Air stop on a hanging safe block (face about 3 tiles past launch) | flight step 14, `vx` 0, gear 1; drops straight down; lands at face − 0.375 on flight step 48 |
| Let go from yellow cruise | blue after 2.03 tiles, standing after about 2.5 |
| Clamp from runner gear 1 cruising / twin gear 3 cruising, up on steps 1, 3, 5 | twin red 0.66 tiles after the first press (step 4); runner red on step 31, about 3.1 tiles |

---

## w3-02 Out of Step — APPROVED v1

**NEW: a wall in one lane holds that body still while the other walks on, so you choose how far out of step they are.**

**Tandem rule it leans on:** walls are per body (`tandem.md` "Edge cases", check 4). The wall is a **1-tile safe kerb** on the runner's floor: it stops the walking runner every step for as long as you hold right, whatever the gear. (The 2026-11-16 text used a full-height blue wall; it cannot hold a walking body, see "Common".)

**Intent.** Hold right in gear 1: both walk blue. The kerb stops the runner; the twin, with no kerb, walks on across its blue bridge to a safe pad Q. Every x where the twin can stand on Q is over the runner's green bridge, so with the bodies in step any shift that saves one drops the other; only the held runner lets the twin be on Q while the runner is on safe ground. Let go, walk back (the twin stays on Q), shift up once, run and jump the kerb green: the runner lands green on its green bridge, the twin walks green over its own.

**As built (34 × 15):**
- Runner: safe floor cols 0–9 with the **kerb at col 8** → green bridge cols 10–25 → safe ground, exit col 29. A closed **pocket** in the divider (rows 7–9) under the green bridge catches a runner that drops through it.
- Twin: safe pad cols 0–2 → blue bridge cols 3–13 → **safe pad Q cols 14–21 (8 tiles**, so the twin stays on it while you back up about 4 tiles) → green bridge cols 22–27 → safe ground, exit col 31. A **safe roof** over the twin lane (row 10, 2 tiles of headroom) stops twin jumps from skipping its bridges.

**Lines.**
- **Fair line:** walk until the twin is on Q (95-step window), walk back (72), shift up standing, run and jump the kerb (30 steps). Position choices plus one jump ≥ 18.
- **Park line (allowed, it still uses the pin):** with the twin on Q and the runner held, shift up and keep holding: the twin crosses and parks; then walk the runner back, run, jump.
- **Cheap failures, all by safe ground:** shift up at the spawn; hold too long; back up too far; let go with the twin on its blue bridge; jump the kerb in blue (lands blue on green, into the pocket) or from the kerb face (air wall stop).

**Split:** **final** in position (about 7–15 tiles apart from the pin on).

**Removal test:** kerb removed: 0 of 98,280 sweep runs win. Cheese: 0 of 872 real wins have the twin less than 3 tiles ahead when the runner passes the kerb.

**Numbers:** spread on the intended line at most 12.1 (≤ 26). Target first-time solve 60–120 s.

---

## w3-03 Gear Split — APPROVED v1

**NEW: a stop in mid-air drops only that body's gear, so one input now gives two colours.**

**Tandem rule it leans on:** checks 5 and 17 (`tandem.md`): an air wall stop sets that body's `vx` to 0 and its gear to 1, while the other body flies on and drags.

**Intent.** Both sprint red and jump together. In the runner's lane a hanging safe block stops the runner in the air: it drops straight down and lands in gear 1. The twin's lane is a flat Coast: a red takeoff drags to yellow and lands yellow in gear 3. From then on holding right gives a blue runner and a yellow twin at once: the runner's lane has a blue bridge, the twin's a yellow floor all the way to its exit.

**As built (47 × 15):**
- Runner: safe floor to col 24 with a **hanging safe block, cols 16–17, rows 1–3** (2 tiles of clearance under it; the 2026-11-16 "rows 1–4" left only 1) → **blue bridge cols 25–34 (10 tiles)** over a closed 3-row pocket → safe ground, exit col 38. The long bridge starts after the twin's flight so a block-less yellow runner can neither jump it nor land in the twin's lane.
- Twin: safe runway cols 1–7 → red runway cols 8–12 → 7-tile gap → **flat** yellow floor cols 20–39 → safe, exit col 42.

**Lines.**
- **Fair line:** shift up to gear 4 standing, hold right, jump at x 11.10–14.50 (18 steps; the block catches every one), hold right.
- **Cheap failures:** no jump; jump too early (twin in the gap) or too late (twin off its runway, runner under the block); jumping yellow.

**Split:** **final** (gear 1 vs gear 3). w3-04 teaches the undo.

**Removal test:** block removed: 0 of 71,568 sweep runs win. Cheese: 0 of 4,992 real wins without the air stop. Park line: the twin parks while the runner is already in gear 1, which is the lesson.

**Numbers:** spread at most 19.2 (≤ 26). Target first-time solve 60–120 s.

**Batch 7 change (2026-11-20): hints only, v1 stays.** It adds `shiftUp 2 3` over the runner's spawn next to the existing `jump 12 3`: be in gear 4 before the twin's red runway at col 8.

---

## w3-04 Clamp — APPROVED v1

**NEW: pressing up past gear 4 brings split gears back together (the extra presses do nothing to the body already at the top).**

**Tandem rule it leans on:** the clamp (`tandem.md` "Resync by clamping", checks 6 and 7).

**Intent.** Open with a short w3-03 (known), then both lanes reach safe pads and then **red bridges**. From gear 1 and gear 3, one up press gives green and red; three give red and red. The twin's red bridge is long, so you can neither let go nor press down while the twin is on it, and the runner must already be red at its own.

**As built (66 × 15):**
- Section A: the runner's block (col 16, rows 1–3) and **3-tile blue bridge (cols 17–19)** over the twin's gap (a fallen runner leaves the grid); the twin's flat Coast, yellow from col 20.
- Section B: runner safe pad cols 20–25 (**6 tiles**, for the let-go window) → red bridge cols 26–31 → exit col 34. Twin safe pad cols 34–49 (16) → red bridge cols 50–60 (11) → exit col 63. No pocket needed.

**Lines.**
- **Fair line:** the w3-03 jump (18 steps), let go with the runner off its blue bridge (73 steps), press up three times standing, hold right.
- **Moving line:** press up three times while running with the runner at x 19.10–23.35 (86 steps).
- **Down-clamp line (allowed):** two down presses, then three up.
- **Cheap failures:** one or two up presses; pressing on the runner's blue bridge.

**Split:** **undone (clamp)**, then both cruise gear 4 to their exits.

**Removal test:** all 808 of 33,366 sweep wins use a clamped press and the air stop. Park line ("press once, park the twin, press twice more") fails: the runner reaches its red bridge green while the twin is still on its own.

**Numbers:** spread at most 20.7 on the intended line. Target first-time solve 90–150 s.

**Batch 7 change (2026-11-20): hints only, v1 stays.** `shiftUp 2 3` over the runner's spawn and `jump 12 3` at the takeoff, as in w3-03. The camera: after the runner parks (step 354 on the recording) the camera follows the twin, and the runner may leave the screen. That is intended (`tandem.md` S6).

---

## w3-05 Redshift (finale) — APPROVED v1; v2 ordered 2026-11-23 (see "w3-05 v2" at the end of this section)

**COMBINE: air-stop split, out-of-step bridges, clamp down, kerb pin to re-align, clamp up, a shared drag jump, park, and the twin braking alone.** Each section is a known idea; the difficulty is the order.

**Intent and as built (72 × 15), in order:**
1. **Split (w3-03):** the runner's block (col 16) and the twin's flat Coast (red runway cols 8–12, gap 13–19, yellow pad cols 20–23).
2. **Out of step (w3-03):** the runner's 3-tile blue bridge (cols 17–19), the twin's yellow pad.
3. **Clamp down and pin (w3-04, w3-02):** twin safe pad cols 24–31, a **3-tile blue strip cols 32–34**, safe cols 35–44; runner safe cols 20–44. **Both lanes have a safe kerb at col 45.** Press down twice on the twin's pad (the runner is clamped at gear 1; the twin brakes to blue). The blue strip is what makes the presses needed: a yellow twin falls through it. Hold right: the twin waits at its kerb while the runner catches up; both are then held at x = 44.625, exactly in step.
4. **Clamp up and a shared drag jump (w3-04, w2-02):** walk back about 8 tiles, press up three times, run and jump both kerbs together: the same 2-tile gap (cols 46–47) and flat 6-tile yellow pad (cols 48–53) in both lanes; both drag to yellow and land on their pads (window 22 steps).
5. **Park and brake alone (w3-01, w1-04):** the runner's exit at col 55; the twin's safe pad cols 54–61, blue bridge cols 62–66, exit col 69. Shift down twice on the pad.

**Lines.** Fair line in `levels/README.md`; every timed input ≥ 18 steps (Coast 18, down presses 56, walk back 72, kerb jump 22, final brake 56), the pins are position choices. Cheap failures each next to safe ground: no jump; jumping yellow; forgetting the down presses (blue strip); one or two up presses; jumping the kerbs from too close or too far; not slowing the twin at the end.

**Splits:** section 1's split is **undone** (gears by the down clamp, positions by the kerbs); the runner's park in section 5 is **final**.

**Removal tests (COMBINE rule, 2026-11-17):** a combine level must show that **no win in the level as built skips any of its ideas**; it need not fail when one piece is deleted, because each idea already has its own removal-tested level.
- **Air stop:** 0 of 792 wins without the runner's air wall stop, so every player splits and must undo it. (Deleting the block does not fail: the bodies never split and 1,158 of 56,700 lines win. Accepted 2026-11-17; a longer runner bridge would put a falling runner on the twin's brake pad.)
- **Kerbs removed:** 0 of 56,700 wins (the twin stays about 10 tiles ahead, far outside the shared jump window).
- **Park line:** neither body can be home before the shared jump.

**Numbers:** spread at most 10.1 on the intended line. Target first-time solve 3–5 min.

**Batch 7 change (2026-11-20): hints only, v1 stays.** Three runner-lane glyphs: `jump 12 3` (the opening), `shiftUp 36 3` over the walk-back stop (fair stop about x 34.7–38.2, the recording stops at 36.13) and `jump 41 3` over the kerb takeoff (about x 39.6–43.7 from that stop, the recording jumps at 41.72). Level-designer may move either of the last two by one column to centre it on the measured range, and records the range in the README.
- **Why not a checkpoint:** the game has none. It would be new sim, replay and validation work (needs producer) and changes what a run is.
- **Why not shorter:** the length is the walk to the kerbs that the pin needs. A trim would save under 2 s and cost a v2, a re-record, the sweeps and a `LEVELS` row.
- **Why no pinned-twin cue:** a twin standing white at its kerb is the intended re-align state, not an error. The glyph behind it says what to do next.
- A retry stays about 20 s.

### w3-05 v2 (2026-11-23, batch 8 playtest; `decisions.md` 2026-11-23): a step at the back of the run-up

**Why.** Two cold sittings did not finish w3-05. The kerbs re-align positions, but the walk-back starts from wherever the player lets go of Left, so the run-up only works if both gears already match. A player who jumps the twin's blue strip (a world-2 skill) reaches the kerbs at gears 1 and 2. One hold of Left then moves the bodies about 120 px and 45 px, and nothing says why. That makes "equalise the gears first" a hidden step, and pillar 3 forbids that.

**Rule for v2 (level-designer builds it; the construction is theirs if it meets every point):**
1. **A step-up face at the back of the run-up, at the same column in both lanes, near x 36** (for example: the floor of cols ≤ 35 one tile higher than the run-up, or the run-up floor cols 36–44 one tile lower). Walking Left from the kerbs, both bodies stop against it at the same x whatever their gears (it holds like a kerb, the other way round). Walking right on the first approach, they walk off the 1-tile step without a jump.
2. **The run-up, from the step face to the kerbs, is safe tiles only in both lanes.** The twin's blue strip stays left of the step.
3. **From the held-at-the-step state, three up presses clamp both bodies to gear 4 from any split (1/1, 1/2, 1/3, 2/3), and holding right then jumping in the window wins.** The kerb jump window is ≥ 18 steps (it is 22 in v1), measured from the step, not from a free stop.
4. **The kerbs stay at one column in both lanes**, and both bodies are still held at the same x there. The shared drag jump, the pads, the park and the twin's brake are unchanged except for any shift the step forces.
5. **Nothing changes left of col 30:** the opening, the split, the blue strip and the twin's pad. That keeps the opening, its `jump 12 3` glyph and itch shot 5 valid.
6. **Hints:** still three. `jump 12 3` stays. `shiftUp` sits over the step (where you stop), and `jump` over the middle of the measured take-off range. Both must follow the placement rules (empty box, at least 3 rows above the floor under it, right edge of the `jump` box left of the kerb).
7. **`version: 2`**, a re-recorded solution, and README updates: the fair line, every window, the removal tests (kerbs removed still 0 wins, no win without the air stop, the park line), a new sweep of strip-jump lines (they may now win, through the clamp at the step: accepted, since the clamp is a w3 idea), the spread (≤ 26) and `Fastest known`. `sealedPockets` must still find no pocket in w3-05.

**Not changed:** no checkpoint (a new mechanic, rejected 2026-11-20 and 2026-11-23), no shorter opening, the level stays the finale.

**Ruling on the build (2026-11-23): APPROVED v2 as built.** The construction is the run-up cols 36–44 one tile lower in both lanes, with the step face at x 36 and both bodies held at 36.375. The kerb-jump window is 20 steps, take-off x 39.98–43.77. The hints stay `jump 12 3`, `shiftUp 36 3`, `jump 41 3`. **Rule 7's removal item is amended: "kerbs and step removed: 0 wins"** (0 of 56,700), not "kerbs removed". With the kerbs removed 56 lines win, because the step is itself a pin: it holds the runner while the twin walks back to it. That is still the re-align idea (w3-02), done by a different face, so no win skips it (COMBINE rule). Moving the step would cost the 18-step window and would not remove those wins.

**Batch 9 cold play (2026-11-23, `decisions.md` B9-07): the result does not count for v2.** The script skipped worlds 1–2 and w3-04, unlocked w3-05 by editing the save, and never got past the opening (cols < 30, unchanged). **The deciding check is now the owner's hand play:** w3-01 → w3-05 in order, unlocked by play; w3-05 cleared within 10 lives and 15 minutes; backs up to the step unprompted. One more scripted sitting, played in order with no save edits, runs only if the owner cannot play by Nov 26.

**Batch 9b fallback sitting (2026-11-23 evening, `decisions.md`):** not cleared. It found the step by walking left, then failed 9+ kerb jumps, all late (0.8–2.0 s into the run against a 0.55–0.87 s window). **Batch 10, headers only:** w3-05 `jump 41 3` becomes `jump 40 3`, so a player who reacts to passing under the glyph still takes off inside 39.98–43.77. w3-02 gets `jump 5 3` only, over the kerb take-off and behind the pinned runner (ruled on level-designer's measurements: a `shiftUp` would be forced over the spawn, where it reads "shift now", the level's first cheap failure). That teaches w3-05's kerb sequence where it starts. **Pre-approved fallback:** if the owner does not walk back to the step unprompted, w3-05 swaps `jump 12 3` for `move` stacked above `shiftUp` over the step. The owner's hand play on the batch 10 build is the deciding check.

**Cold-play check for v2 (Must before submit; a fresh sitting with no memory of w3-05):** w3-05 cleared within **10 lives and 15 minutes** of play. From the first time both bodies are held at the kerbs, the run-up section is cleared within **5 attempts**. Report whether the player backs up to the step without reading anything. A miss is a finding for design-lead.

---

## Order check (pillar 4)

| Level | New | Known it uses |
|---|---|---|
| w3-01 | the twin, both home | blue/green floors, shift (w1-01, w1-02) |
| w3-02 | a kerb in one lane holds that body: chosen offset | walls stop you (M1), back-up run-up (w1-03), jumping (w2-01) |
| w3-03 | an air stop splits gears | Coast drag (w2-02), sprint jump |
| w3-04 | the clamp resyncs gears | w3-03 |
| w3-05 | combine | everything above, plus w1-04's brake for the twin alone |
