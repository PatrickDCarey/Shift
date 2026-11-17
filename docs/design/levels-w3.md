# World 3 Tandem: level specs w3-02 to w3-05

_Owner: design-lead. Written 2026-11-16 (board B6-07) for level-designer, who builds these in Batch 6 wave 2 (B6-32..B6-35) from this text alone. Format: like the w3-01 row in `level-plan.md`, plus a grid sketch per level. Rules that apply to every level here: `features/tandem.md` "Level rules" (including the 2026-11-16 lane-colouring rule), `level-plan.md` "Constraints for level-designer", GDD §6._

Only mechanics the sim already has are used (`features/tandem.md` checks 1–18; colored walls, `features/colored-walls.md`). No new tiles, no new tuning.

## Common to all four

- **Template:** 15 rows, like w3-01. Runner lane on top (floor row 6), divider (row 7, safe where the runner lane has a floor), twin lane below (floor row 13, row 14 safe under pads). Each lane ≤ 7 rows. Both spawns at col 1 unless stated.
- **Lane colouring (scene, `tandem.md`):** every colored tile must be strictly nearer its own body's start row than the other's. With spawns on rows 5 and 12 the midpoint is 8.5: **no colored tile in twin-lane rows 7–8**. Runner-lane walls (rows 0–5) are fine.
- **README per level:** fair line with windows (≥ 18 steps or a walking-pace position choice with ≥ 1 tile of spots), removal test, whether each split is undone (clamp) or final (park), spread (≤ 26 tiles between non-home bodies on the intended line), `Fastest known`, and a request line to backend for its `LEVELS` row.
- **Removal tests must include the park line:** when one body is home the other is played alone, so for each level show that "get one body home first, then solve the other lane alone" cannot skip the new idea. Each spec below says where the geometry stops it; the sweep proves it.
- **Numbers marked (measure)** are my estimates. Pin the sim's value in the README; if it moves a window under the fairness floor, change the geometry, not the rule, and tell me.
- **No hints** in w3-02..w3-05 (the plan's hint list ends at w3-01).

Known numbers used below (GDD §5, `tandem.md`, `levels/README.md`):

| Fact | Value |
|---|---|
| Gear 4 from standing (or from a wall stop), holding | blue at once, green 0.60, yellow 1.88, red 3.23 tiles |
| Gear 2 from standing | green 0.6 tiles |
| Gear-4 flat jump | 8.7 tiles, drags to yellow at 6.0 (flight step 30), lands step 48 in gear 3 |
| Gear-4 jump to a pad 2 lower (w2-02) | about 9.6 tiles, drop on step 30, lands step 55; takeoff window 23 steps off a 5-tile red runway with a 7-tile gap |
| Air stop on a hanging safe block (face about 3 tiles past launch) | flight step 14, `vx` 0, gear 1; drops straight down; lands at face − 0.375 on flight step 48 |
| Let go from yellow cruise | blue after 2.03 tiles, standing after about 2.5 |
| Clamp from runner gear 1 cruising / twin gear 3 cruising, up on steps 1, 3, 5 | twin red 0.66 tiles after the first press (step 4); runner red on step 31, about 3.1 tiles |

---

## w3-02 Out of Step

**NEW: a wall in one lane holds that body still while the other walks on, so you choose how far out of step they are.** (Revised from the v3.0 sketch: the old version needed a 1.25-tile green bridge starting a quarter tile into a wall column, which the grid can't build, and the split it made lasted under 1.3 tiles. A pin lasts as long as you hold, so the split is a position choice at walking pace, pillar 1 and 3.)

**Tandem rule it leans on:** walls are per body (`tandem.md` "Edge cases", check 4), and a colored wall stops only its own color (w1-05). A **blue** wall stops a walking body every step: walking is instant up to 3 tiles/s (blue), so a body held against it restarts at blue each step and is blocked again, in any gear. It passes only if it arrives already green or faster, which needs about 0.6 tiles of run-up in gear 2.

**Intent.** Hold right in gear 1: both walk blue. The runner meets a full-height blue wall and stops; the twin, with no wall, walks on across its blue bridge. The twin's lane has a safe pad Q a long way past the wall's x, then a green bridge; the runner's lane has a green bridge straight after the wall. The shift to green must happen with **each** body on safe ground and with room to reach green before its green bridge, and the only way the twin is on Q while the runner is on safe ground is to keep the runner pinned while the twin walks to Q. Then back both up a tile (the twin stays on Q), shift up, hold right: the runner is green by the wall and passes it, the twin is green before its bridge.

**Grid sketch (about 30 × 15, one screen or a short scroll):**
- Runner lane: safe floor cols 0 to W+1 (W about 8); **blue wall column at col W, rows 0–5** (floor to the top of the grid, so no jump clears it; it stands on safe floor); green bridge from col W+2 to about col 22 (over the twin lane, open below as in w3-01, or with the divider under it: your call); safe ground and the runner's exit (2 tall) after it.
- Twin lane: safe spawn pad cols 0–2; blue bridge from col 3 to Q−1; **safe pad Q, 5 tiles** (cols about 14–18); green bridge about 6 tiles; safe ground and the twin's exit.
- **The constraint that makes the wall necessary:** every x where the twin can stand on Q lies over the runner's green bridge (Q starts at least 2 tiles past W+2 and ends before the runner's green bridge does). Then a body-aligned shift on Q has the runner already fallen through its green bridge in blue.

**Lines.**
- **Fair line:** hold right until the twin stands on Q (runner pinned), hold left about 1 tile (both walk back; the twin stays on Q), let go, shift up once, hold right. The hold-right is a walking-pace position choice: the twin may stop anywhere on Q that leaves ≥ 0.6 tiles plus the back-up before Q's end (about 3 tiles of spots, 60 steps (measure)).
- **Park line (allowed, it still uses the pin):** with the twin on Q and the runner pinned, shift up and hold right. The runner stays pinned (it restarts at blue every step); the twin turns green on Q, crosses and parks. Then back the runner up, hold right, green by the wall, through. Record it in the README as a second intended line.
- **Cheap failures, all by safe ground:** shift up at the spawn (the twin turns green on its blue bridge and falls); shift up while the twin is still on its blue bridge (same fall); hold too long (the twin walks off Q onto its green bridge in blue); back up too far (the twin leaves Q, and the shift then drops it on its blue bridge). Note: letting go while the twin stands on its blue bridge also drops it (blue holds only while walking), as in w1-01.

**Split:** undone by design? No: it is **final** in position (the bodies are about 7–10 tiles apart from the pin on); both cruise gear 2 to their exits. Say so in the README.

**Removal test:** remove the blue wall. The bodies stay aligned; any shift with the twin on Q has the runner on its green bridge in blue (already fallen), and a shift with both near the spawn drops the twin on its blue bridge, so 0 wins. Letting go to stop the runner before its green bridge stops the twin on its blue bridge, and shifting there drops it. Sweep: gear 1–2, a shift at every step, hold left/right/let go segments.

**Numbers:** spread on the intended line ≈ Q − W, about 7–10 (≤ 26). Target first-time solve 60–120 s.

---

## w3-03 Gear Split

**NEW: a stop in mid-air drops only that body's gear, so one input now gives two colors.**

**Tandem rule it leans on:** checks 5 and 17 (`tandem.md`): an air wall stop sets that body's `vx` to 0 and its gear to 1 (the air rule), while the other body flies on and drags. Drag is known from w2-02.

**Intent.** Both sprint red and jump together. In the runner's lane a hanging safe block stops the runner in the air: it drops straight down and lands in gear 1. The twin's lane is w2-02's Coast: a red takeoff drags to yellow and lands yellow in gear 3. From then on holding right gives a blue runner and a yellow twin at once: the runner's lane has a blue bridge, the twin's a yellow floor all the way to its exit.

**Grid sketch (about 36 × 15, a short scroll):**
- Twin lane: safe runway from the spawn (≥ 6.5 tiles to red, as w2-02), **red runway 5 tiles**, **7-tile gap**, **yellow landing pad 2 tiles lower** and then yellow floor continuing (a yellow bridge) all the way to the twin's exit pad. The twin's exit is far enough that the twin is still on yellow when the runner reaches its blue bridge (see removal test).
- Runner lane: safe floor all along the twin's runway and gap (the runner must land on safe ground when it drops). A **hanging safe block, bottom 2 tiles above the runner's floor, top at least 5 above (rows 1–4 over floor row 6)**, 1–2 columns wide, with its face about 3 tiles past the middle of the twin's takeoff window (so every twin-valid takeoff is caught by it (measure)). At least 2 safe tiles past the block's far side, then a **blue bridge** (4–5 tiles), then safe ground and the runner's exit.
- The block is safe (`#`), never colored. Walking under it is fine (the 1.5-tile body passes under a 2-tile gap).

**Lines.**
- **Fair line:** shift up to gear 4 standing (no time limit), hold right, jump in the twin's 23-step Coast window. Keep holding right: runner blue over its bridge, twin yellow to its exit; the twin parks first.
- **The place decision:** jump too late (inside about 0.4 tiles of the block) and the runner slips under it and only bonks (ceiling, no `vx` loss), so it lands in gear 3. Too early and the twin falls in the gap. The twin's window is the binding one; the block must catch all of it.
- **Cheap failures:** no jump (the twin falls in its gap, the runner meets blue in red); jumping yellow (the twin drags to green and falls through the yellow pad, as in w2-02).

**Split:** **final** (gear 1 vs gear 3; nothing in this level resyncs them). w3-04 teaches the undo.

**Removal test:** remove the block. Both land in gear 3; the runner is yellow at its blue bridge and falls. Shifting cannot fix it (one press moves both gears), and letting go stops the twin on yellow floor, which drops it. **Park line check:** the twin's yellow runs from its landing to past the x where the runner's blue bridge starts, so the twin cannot be home before the runner needs blue. Sweep: gear 3–4, jump at every step, shift up/down and let-go at every step after landing.

**Numbers:** spread right after the split about 5.7 (8.7 − 3.0), growing about 6 tiles/s while both hold right; the twin should be home before it exceeds 26 (measure). Target first-time solve 60–120 s.

---

## w3-04 Clamp

**NEW: pressing up past gear 4 brings split gears back together (the extra presses do nothing to the body already at the top).**

**Tandem rule it leans on:** the existing clamp (`tandem.md` "Resync by clamping", checks 6 and 7). Down works too: pressing down twice leaves both in gear 1.

**Intent.** Open with a short w3-03 (known): sprint, jump, the runner's block, the twin's Coast, then the runner's blue bridge and the twin's yellow bridge side by side. Then both lanes reach safe pads and then **red bridges**, and only gear 4 crosses red. From gear 1 and gear 3, one up press gives green and red; three give red and red. The twin's red bridge is long, so while the twin is on it you can neither let go nor press down, and the runner must already be red at its own red bridge then. The place to press is set by the slower body (the runner needs about 3.1 tiles from blue cruise, or 3.23 from standing; the twin needs 0.66).

**Grid sketch (about 50 × 15, scrolls):**
- Section A (the split, compressed w3-03): as w3-03, with the runner's blue bridge 3 tiles and the twin's yellow bridge 3 tiles.
- Section B (the clamp):
  - Twin lane: a **safe pad long enough to stop on and run up from** (the twin arrives yellow and fast, so it must not reach its red bridge yellow before the runner is off its blue bridge: about 15 tiles (measure)); then a **red bridge about 10–12 tiles**; then the twin's exit.
  - Runner lane: safe pad after the blue bridge, **≥ 4 tiles** (the runner needs 3.23 from standing; 3.5 + box); then a **red bridge (≥ 5 tiles)**; then the runner's exit.
  - Place the two red bridges so that, on any line where the twin is on its red bridge, the runner has to be on (or past the start of) its own red bridge before the twin can reach its exit.

**Lines.**
- **Fair line:** after the runner leaves its blue bridge (the twin is on its long pad), let go: the runner stops at once, the twin about 2.5 tiles later, both on safe ground. Press up three times standing (or four: any extra is clamped for both), hold right. Both are red 3.23 tiles later and cross. The let-go is a position choice with several tiles of spots (measure: target ≥ 1 tile, ≥ 18 steps).
- **Moving line:** keep holding and press up three times once the runner is off its blue bridge; the twin is red 0.66 tiles after the first press, the runner about 3.1 tiles after.
- **Down-clamp line (allowed):** press down twice (both gear 1), then up three times. Same idea.
- **Cheap failures:** one up press (twin red, runner green on red); pressing while the runner is on its blue bridge (it turns green there).

**Split:** **undone (clamp)**, then both cruise gear 4 to their exits.

**Removal test (the clamp must be needed):** every win has the twin at gear 4 when a later press arrives (a clamped press), and lines with fewer than three ups after the split lose. **Park line check:** "press once, the twin crosses and parks, then press twice for the runner alone" must fail: the twin's red bridge is long enough that the runner, still green, reaches its red bridge first, and you can't let go to wait because the twin would stop on red. Also show that the w3-03 part can't be skipped (no jump: both red, the runner falls on blue). Sweep: 1–4 up presses and 0–2 down presses at every step after landing, let-go at every step.

**Numbers:** spread grows to about 12–16 before the let-go (≤ 26). Target first-time solve 90–150 s.

---

## w3-05 Redshift (finale)

**COMBINE: air-stop split, out-of-step bridges, clamp down, pin to re-align, clamp up, a shared drag jump, park, and the twin braking alone.** Each section is a known idea; the difficulty is the order.

**Tandem rules it leans on:** all of the above, plus home bodies being frozen (checks 10, 13) so the last section is single-body play for the twin.

**Intent, in order:**
1. **Split (w3-03):** sprint red from the spawn and jump: the runner's block drops it to gear 1; the twin Coasts onto a yellow pad in gear 3.
2. **Out of step (w3-03):** runner blue bridge, twin yellow bridge.
3. **Clamp down and pin (w3-04, w3-02):** after the twin's yellow bridge, both lanes are safe, and **each lane has a full-height blue wall at the same column**. Press down twice: the runner stays at gear 1 (clamped), the twin brakes to gear 1 (blue after 2.03 tiles, on safe ground). Both walk into their blue walls and are pinned: the twin waits while the runner catches up. Now they are aligned exactly.
4. **Clamp up and a shared jump (w3-04, w2-02):** back both up at least 0.6 tiles (≥ 1 tile of safe floor behind each wall's face), press up three times, hold right: both pass their walls (green by the face) and are red 3.23 tiles from where they started. Both lanes then have the **same** red runway (5 tiles), 7-tile gap and yellow pad 2 lower, at the same columns. One jump; both drag to yellow and land on their pads.
5. **Park and brake alone (w3-01, w1-04):** the runner's exit is right after its yellow pad: it parks. The twin's lane continues: yellow pad, a **safe pad ≥ 8 tiles** (w1-04 v2 numbers), a **blue bridge** (≥ 5 tiles), the twin's exit. Shift down twice (or let go on the pad and walk) so the twin is blue by its bridge. The runner, parked, ignores the presses.

**Grid sketch (about 65–75 × 15, scrolls; keep sections 3–4 on one screen if you can):** section widths about 20 (split), 8 (bridges), 6 (walls and run-up), 20 (runway, gap, pad), 18 (pad, blue bridge, exit). If it runs over 75 columns, shorten the safe stretches first; never shorten a fairness window.

**Lines.**
- **Fair line:** the fair lines of w3-03, then "press down twice on safe ground, hold right until both are pinned, walk back 1 tile, press up three times, hold right, jump in the 23-step window, hold right, shift down twice on the twin's safe pad". Every timed input ≥ 18 steps (measure); the down presses and the pin are position choices.
- **Cheap failures, each next to safe ground:** no jump at the start; jumping yellow; forgetting the down presses (the twin is yellow, passes its blue wall, and meets its red runway yellow); one up press (runner green on its red runway); not slowing the twin at the end.

**Splits:** section 1 split **undone** by the down clamp (3) and the pin (aligned positions); the runner's park in section 5 is **final**.

**Removal tests:**
- Block removed: no gear split, so section 2 fails (as w3-03).
- Blue walls removed: the bodies arrive at the shared gap out of step (the twin about 6+ tiles ahead (measure)), and no single jump step is inside both takeoff windows (show the offset is larger than the 23-step window's 4.4 tiles of red takeoff). Letting go instead cannot re-align them to within the window (the twin stops about 2.5 tiles after the runner from yellow, and from equal gears they stop at the same offset): show it with the sweep.
- Park line: the twin cannot be home before section 4 (its exit is at the far end), and the runner's exit comes only after the shared jump.

**Numbers:** spread ≤ 26 on the intended line (largest just before the pin, when the twin waits at its wall; measure). Target first-time solve 3–5 min.

---

## Order check (pillar 4)

| Level | New | Known it uses |
|---|---|---|
| w3-01 | the twin, both home | blue/green floors, shift (w1-01, w1-02) |
| w3-02 | a wall pins one body: chosen offset | colored walls (w1-05), back-up run-up (w1-03) |
| w3-03 | an air stop splits gears | Coast drag (w2-02), sprint jump |
| w3-04 | the clamp resyncs gears | w3-03 |
| w3-05 | combine | everything above, plus w1-04's brake for the twin alone |
