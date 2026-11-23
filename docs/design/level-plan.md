# Redshift — Level plan

_Owner: design-lead. Built by level-designer in `levels/` (format: `docs/tech/level-format.md`). Rules and numbers: `docs/design/gdd.md` (§5 sanity math, §6 rules of thumb). **Version 4.0 (2026-11-23, expansion; owner request "more levels, some longer, projectiles, moving objects"; `decisions.md` 2026-11-23 "Expansion"): 11 new levels planned, 9 Must and 2 Should, so 23 Must levels in 5 worlds; world 2 gains w2-05 (long); world 4 becomes Motion (movers, `levels-w4.md`), world 5 Signals (bolts, `levels-w5.md`); the old Gates world 4 becomes Could (post-jam); long levels defined below, no checkpoints. No change to any shipped level.** Version 3.7 (2026-11-19, batch 6 cold-playtest triage): **no geometry change to any level; still 14 Must levels (w2-03 kept, world 2 stays 4 levels)**; three hint placements added (w1-03 `shiftUp` at the back wall, w2-04 `shiftUp` stacked over `jump`, w3-03 `jump` at the takeoff; no `version` bumps); pockets get the scene's restart card (`features/restart-prompt.md`); w3-02..w3-05 need a cold play before submit (`levels-w3.md`). Version 3.6 (2026-11-17, batch 6 closing): **all 14 Must levels built and approved** (w1-01..05, w2-01..04, w3-01..05); w2-04's 13-step grace window is a stated fairness-floor exception; Tandem pins are 1-tile safe kerbs (a colored wall cannot hold a body); Tandem Coast pads are flat; COMBINE levels are removal-tested as built, not by deleting a piece; world-3 rows below now describe the shipped levels. Version 3.5 (2026-11-16, batch 6): **Tandem stays (owner decision; the gates fallback is dropped)**; full specs for w3-02..w3-05 in `levels-w3.md` (w3-02 Out of Step revised to a blue-wall pin: the old sketch needed sub-tile bridges); w3-01 v1 accepted without roofs; w2-03 v2 (pit at the ledge foot); Tandem lane-colouring rule; HUD-area rule. Version 3.4 (2026-11-13, batch 4A): w2-01 and w2-02 approved; w2-01's grace-and-coyote yellow line accepted as an expert line (drag-rescue exception); w2-02's pad 2 tiles lower adopted; Tandem gate Nov 17. Version 3.3 (2026-11-05, M1-52): fairness floor per level; w1-01/w1-02 P2 4 tiles, w1-04 pad 8 tiles, w1-05 fair line recorded; w1-04 roofless bridge accepted. Version 3.2 (2026-11-04, batch 2): world-1 low roofs adopted with conditions; "fastest known" step count per level for the leaderboard floor; w1-01 and w1-02 approved. Version 3.1 (2026-11-04): first level of every world open from the start; hint glyph placements per level; title length cap. Version 3.0 (2026-11-03): the studio owner picked **Tandem** as the core twist (`core-twists.md`, `features/tandem.md`). World 3 becomes five Tandem levels; speed gates and ice move to a Should world 4. The v2.0 gates plan is kept below as the fallback._

25 planned levels in 5 worlds (v4.0: 23 Must, 2 Should; the 4 Gates levels are Could, post-jam). Each level introduces **one** new idea (or combines known ones, marked COMBINE/TEST/TWIST). A level is rejected if:
- it teaches two new ideas at once;
- it needs precision the pillars forbid;
- it can be solved while ignoring its idea.

**What a good level asks** (`mechanics-review.md` §1): two decisions in tension at nearby places, so the answer is a specific place and pace, not "as fast as possible" or "stop". Every sketch below names its tension.

**Priority:**
- Worlds 1–3 are **Must** (14 levels). **Status 2026-11-17: all 14 built and approved** (current versions in `levels/README.md`).
- **v4.0 (owner sign-off 2026-11-23):** w2-05, w4-01, w4-02, w4-03, w4-05, w5-01, w5-02, w5-03, w5-05 are **Must** (9); w4-04 and w5-04 (the sweep) are **Should**. Build order and cut order: "Expansion build order" below.
- The old Gates world (speed gates, ice) is **Could** since v4.0: its world slot went to Motion; it would need a sixth level-select row and `MAX_WORLD` 6.
- Tandem sim and scene: built; **Tandem stays as world 3** (owner decision 2026-11-16, gate closed, no fallback). Dates no longer drive the plan: build in priority order.

## Constraints for level-designer

- Until w2-02 teaches drag, no intended line should fly more than 6 horizontal tiles, and no likely wrong line should be "rescued" by a drag drop (a yellow flat jump always lands green). Check yellow and red takeoffs, not just the intended one. A colored runway is the easy way to fix the takeoff color. Exception (2026-11-13): a yellow takeoff that is only possible inside grace and coyote after a shift on the colored runway itself is an accepted expert line (w2-01), because it is not a likely line: every other shift on the runway drops you.
- Stops and turn-arounds above walking pace happen on safe ground (`#`). Players will let go of the arrow a lot; never put the natural "stop and think" spot on a colored floor unless that is the lesson.
- Runway from standing: red needs ≥ 4 tiles (deny with ≤ 2.5); yellow ≥ 2.5 (deny ≤ 1.25). Stopping from sprint takes 3.74 tiles.
- Max climb 2 tiles; never a 3-tile ledge.
- A sprint walk-off stays red only down to a 4-tile drop (5.8 tiles of flight); 5+ tiles lands yellow.
- Never hang a colored tile less than 1.5 tiles above a floor of the same color (no-embed is per color).
- **Colored walls** (`features/colored-walls.md`): stand them on safe tiles; a red wall stops only red.
- **Tandem levels** (`features/tandem.md`):
  - two lanes plus divider take at most 15 rows (the HUD sits above);
  - lanes stacked (runner on top, twin below) with a safe divider at least 1 tile thick, each lane at most 7 rows;
  - each body has its own reachable exit;
  - bodies start aligned in x unless the sketch says otherwise;
  - intended solutions keep the bodies within 26 tiles of each other;
  - every split comes from the level (a wall, an air stop, a gap, an exit), never from timing;
  - say in `levels/README.md` whether each split is undone (clamp) or final (park);
  - every single-lane rule above applies to each lane;
  - spawn rows at least 3 apart, and every colored tile strictly nearer its own body's start row than the other's (v3.5; the scene colours tiles by nearer start row, `features/tandem.md`). With spawns on rows 5 and 12: no colored tile in twin-lane rows 7–8.
- **HUD area (v3.5):** no colored tile, exit or hint box under the HUD panel at the top-left of the screen (the gear meter or the two Tandem strips: screen x 0–120, y 0–40 px of the 480 × 270 view, inset included). The camera scrolls horizontally, so any tile row that is drawn inside y 0–40 can pass under it: keep colored tiles, exits and hint boxes out of those rows. Safe tiles may pass under it (w1-01's roof, w1-04's pillar: accepted 2026-11-16).
- **Prove the idea is needed:** for each level, record in `levels/README.md` that the level fails when the new piece is ignored (remove the wall, block or twin feature and show a non-intended line now wins, or show the intended line is the only one through). **COMBINE levels (v3.6):** show instead that no win in the level as built skips any of its ideas (for example 0 wins without the air stop); deleting a piece need not make the level fail, because each idea has its own removal-tested level (w3-05, ruled 2026-11-17).
- **Tandem pins (v3.6):** hold a body with a 1-tile safe kerb, never a colored wall (after a wall stop a body restarts at walking pace and passes any colored wall). Tandem Coast pads are flat (both bodies land on the same step). Pockets: `features/tandem.md` "Level rules".
- Timing windows in intended solutions: at least 12 steps (0.2 s), or ≥ 3 tiles at sprint. Widen flight windows with lower landing pads (GDD §5.4) rather than shorter gaps.
- **Fairness floor (v3.3, M1-52):** every level has at least one winning line whose timed inputs each have a window of **≥ 30 steps in world 1** (**≥ 18 steps from world 2 on**), or are position choices at walking pace with ≥ 1 tile of valid spots. Record that line and its windows in `levels/README.md`. **Stated exception (v3.6): w2-04 Two Colors**, whose jump window is the color grace itself (grace 6 + coyote 6 + the turn-yellow step = 13), timed from the player's own shift press; no other level may use it.
- World 1 levels should be solvable without reading anything. Onboarding hint glyphs (`features/onboarding-hints.md`; placed by hint headers, at most 3 per level, anchor in an empty cell at least 3 rows above the floor, runner lane only in Tandem levels):
  - w1-01: `move` above the spawn (Must);
  - w1-02: `shiftUp` over the first pad and `shiftDown` over the second (Must);
  - w2-01: `jump` over the start pad (Must) and `shiftUp` (Should);
  - w3-01: `move` and `shiftUp` in the runner lane (Should);
  - **v3.7 (2026-11-19, Must):** w1-03 `shiftUp 2 6` over the back wall; w2-04 `shiftUp 8 4` stacked over `jump 8 6`; w3-03 `jump 12 3` in the runner lane. Hint headers never bump `version` (the run is identical). Hints otherwise stop after a world's teach levels; a later level gets one only when a cold playtest shows its idea cannot be read from the screen.
- **The first level of every world is open from the start** (owner decision 2026-11-04, `features/level-select.md`). w2-01 and w3-01 must therefore be playable by someone who skipped every earlier world: gentle, with the hints above, and with no skill the level itself doesn't show. Inside a world, levels still unlock in order.
- Level `title`s: 20 characters at most (level select truncates at 24).
- Every level ships a solution recording.
- **World 1 roofs (v3.2):** a colored bridge in world 1 may sit under a low safe roof so no jump skips the lesson. Exactly 2 tiles of headroom over the bridge floor; roof made of safe tiles only (never colored); the roof's end faces sit over safe ground or exactly at the bridge's first and last columns (so a jump that hits a face drops back onto safe ground, never onto the bridge in the wrong color); every spawn and stop pad has at least 5 tiles of clear headroom (a standing jump reaches the full 3-tile apex with no ceiling event). In w1-05 the red wall column runs from the floor to the roof. Exception (v3.3): a bridge may go without a roof when a roof face would let a jump wall-stop past the lesson, as long as it is long enough that no takeoff clears it, with 0 skips in the sweep (w1-04's 12-tile blue bridge). Worlds 2 and 4 put no roof over the lesson (jumping is part of it); Tandem lanes are already capped by the divider.
- **Fastest known steps (for the leaderboard floor, `features/leaderboards.md`):** record in `levels/README.md`, per level, the lowest winning step count seen in your sweeps (`Fastest known: N steps`). Backend sets the floor at 85% of it.
- **Movers and bolts (v4.0):** `features/moving-objects.md` and `projectiles.md` "Level rules": slab speeds 1 or 2 only, shot speeds 2 or 4 only; horizontal slabs rest ≥ 30 steps where a line steps on or off; ≥ 2 tiles of headroom over every slab path; no slab path or shot lane under the HUD, over a hint box, a spawn or an exit; every lane crossing ≥ 18 steps and through the ±3 test. Record each slab's and emitter's line and its windows in the README.

## Long levels (v4.0)

**What "long" means:** 100–150 tiles wide, ≤ 15 rows (one screen tall; the camera scrolls horizontally as today, no change), a clean run (the recording) of **40–80 s and never more than 5,400 steps** (tech-lead's robustness-test cap; aim ≤ 4,800 for margin), a first clear of 2–4 minutes. Normal levels stay 10–40 s.

**No checkpoints (ruled 2026-11-23).** A long level is one run from the spawn, so it is built not to need one:
- **Hardest room first, easiest last.** The last third of a long level is a victory lap of world-1 skills with windows ≥ 30 steps, so a death near the end is rare. A long level's hardest window is no harder than the hardest short level of its world.
- **Rooms, not new ideas.** A long level is TEST or COMBINE: 3–4 rooms the player has solved before with new numbers. Never a new idea in a long level.
- **No waiting rooms.** No forced wait over 3 s (slab rests, timed lanes) anywhere, so a retry never repeats dead time.
- **R is still instant**, and a cold-play check asks whether the restart felt too long. If two cold plays of a long level say so, design rules again (options: split it into two levels, or checkpoints post-jam, `features/checkpoints.md`).
- Longer journeys than 80 s become two consecutive levels.

**Camera:** unchanged (horizontal follow, the HUD rule). A small look-ahead in the running direction is **Could** (render-only). The sweep's left-edge marker is Should with the sweep.

## Expansion build order (v4.0)

Engineering first (tech-lead's order, `docs/tech/expansion-approach.md` §6.3). Content in this order; the producer and owner cut from the end if the calendar bites:
1. **w2-05 Long Haul** (no new engineering: can start now).
2. **w4-01, w4-02, w4-03** (movers).
3. **w5-01, w5-02, w5-03** (bolts).
4. **w4-05 Commute**, then **w5-05 Full Spectrum** (long combines).
5. Should: **w4-04 Outrun**, **w5-04 Chase** (sweep).

## World 1 — Gears (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w1-01 | First Steps | NEW: hold a direction to move; blue holds you only while you walk. | Hold right to walk (gear 1, blue, instantly) across a 6-tile blue bridge between safe pads; let go on the bridge and you turn white and drop through. |
| w1-02 | Shift | NEW: Shift changes your cruise gear, and with it your color. | Safe pad, green bridge, safe pad, blue bridge: shift up on the first pad so you're green (0.6 tiles from a standstill), shift back down on the second (blue after 0.8 tiles). P1 is 3 tiles; P2 is 4 tiles (v3.3: shift-down window ≥ 50 steps). w1-01 uses the same room with both bridges blue. |
| w1-03 | Runway | NEW: running speed takes distance to build. | A red bridge starts 2 tiles in front of the spawn, with an 8-tile safe room behind: red needs 3.2 tiles, so walk back to the wall, turn (instant at walking pace), and come in from the far end already red.<br>2026-11-19: a `shiftUp` glyph over the back wall (`shiftUp 2 6`), away from the spawn, so the first fall still happens and the glyph then says where to start. |
| w1-04 | Brake | NEW: slowing down takes distance too. | Sprint across a red bridge (4+ tiles of safe runway first), then an 8-tile safe pad (v3.3; was 6), then a 12-tile blue bridge with no roof. Be blue by the bridge: shift down to gear 1 early enough, or let go, stop on the pad, shift down to gear 1 and walk on. Running window ≥ 35 steps, let-go window ≥ 32. |
| w1-05 | Red Wall | NEW: a colored wall stops only its own color. | Safe runway (≥ 6 tiles), a red wall column, 1 safe tile, a red bridge over a pit to the exit. Tension: not red at the wall, red 2 tiles later.<br>• Arrive red: the wall stops you dead (gear kept). From the wall face red needs 3.23 tiles, but only 2.75 remain before the bridge.<br>• Arrive yellow and shift up: red 0.66 tiles later, inside or after the wall.<br>• Shift window (player x at the press): from 1.04 tiles before the wall face to 0.29 tiles before the bridge, 2.75 tiles ≈ 18 steps.<br>• Cruising green and shifting twice also works (red 1.83 tiles after the press).<br>• Fair line (v3.3): stand 0.7–3.6 tiles before the wall face in gear 4 and run; no timing. The geometry can't widen the yellow window: a wall-to-bridge distance of 3 lets a wall-stopped red player re-ramp in time.<br>Also the colored-wall lesson Tandem builds on. |

## World 2 — Flight (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w2-01 | Commit | NEW: in the air nothing you press changes your speed; you land in the color you took off in. | Safe pad, a green runway, a 4-tile gap, a green landing pad. Being green is the only way to stand on the runway, so you take off green and land green; jump too early and steering back does nothing. |
| w2-02 | Coast | NEW: air drag, every 6 tiles of flight costs one color. | Red runway, a 7-tile gap, a yellow landing pad 2 tiles lower (v3.4: lowered from flat to widen the jump window from 18 to 23 steps). A red takeoff flies about 9.6 tiles and turns yellow at 6, landing safely; a yellow takeoff lands green and drops through. |
| w2-03 | Step Down | NEW: walking off a ledge is a shorter flight than jumping. | Sprint off a 4-tile-high ledge onto a long red floor below. Walking off lands 5.8 tiles out (29 airborne steps, under the 6-tile drag point), still red; jumping flies 10.65 tiles, turns yellow, and falls through the red floor. Keep the drop at exactly 4 tiles: a 5-tile drop makes the walk-off land yellow too.<br>**v2 (2026-11-16 playtest: "teaches nothing new"):** open a 3-tile pit at the foot of the ledge (red floor starts 3 tiles past the edge column), so the drop reads as a gap to jump: the natural world-2 move. The red walk-off still lands about 3 tiles past the pit (x ≈ 17.1).<br>**Kept as v2, no change (2026-11-19):** the cold playtest solved it in 1 try (fun 2/5), but its lesson is the counter-habit to w2-01/w2-02's "jump at the edge", which a script without that habit cannot feel; it is the 4-second breather before the world's hardest level. Not cut. |
| w2-04 | Two Colors | COMBINE: runway, commit, color grace. | A green floor runs under a yellow ledge 2 tiles up: cruise green, shift up mid-run, and jump in the 12 steps after you turn yellow, before the green floor lets you go.<br>**APPROVED v1 (2026-11-17):** jump window 13 steps (the step you turn yellow plus 12), a stated fairness-floor exception; shift spots 41 steps / 4 tiles; 0 wins from safe ground.<br>**2026-11-19:** no tuning or geometry change; a `shiftUp` glyph stacked over a `jump` glyph at x ≈ 8 says "shift up, then jump, here" (grace is taught nowhere else). |

### w2-05 Long Haul (v4.0, Must, long, flow)

| Id | Title | Idea | Sketch |
|---|---|---|---|
| w2-05 | Long Haul | TEST, long: worlds 1–2 in one run, reading ahead. | About 120 tiles, clean run ≈ 45–60 s, first clear 2–3 min, difficulty 3/5. Hardest room first: a Coast (red runway, 7-tile gap, yellow pad 2 lower, w2-02), then a Step Down walk-off onto red (w2-03), a red wall into a red bridge (w1-05), and an easy last third: a long brake pad into a blue bridge (w1-04) and the exit. Every timed input ≥ 24 steps; no Two Colors grace jump (its exception window stays w2-04's alone). A flow level: a player who reads ahead never has to stop. Needs no new engineering. No hints. COMBINE rule: no win skips the Coast or the walk-off. |

## World 3 — Tandem (Must, M3)

One throttle, two runners. Your runner's lane on top, the twin's below. Sim and scene are built; **all five levels are built and approved (2026-11-17)**. Specs and as-built notes for w3-02..w3-05: `levels-w3.md`; grids and sweeps: `levels/README.md`. Derived numbers are pinned by the sim tests in `features/tandem.md`.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w3-01 | Two Lanes | NEW: a twin obeys the same keys on its own floor; both must reach home. | Identical lanes: safe pad, blue bridge, safe pad, green bridge, safe ground to an exit. Hold right in gear 1, both walk blue; shift up on the pad, both are green 0.6 tiles later.<br>• The runner's exit is 3 tiles nearer than the twin's, so the runner parks first and the twin walks on alone. This shows "home" without asking anything of it.<br>• Let go on the twin's bridge and it falls: the run dies and both respawn.<br>• The level fails if you play only your own lane. |
| w3-02 | Out of Step | NEW: a wall in one lane holds that body still while the other walks on. | **APPROVED v1 (2026-11-17).** A 1-tile safe kerb on the runner's floor holds the walking runner while the twin walks over its blue bridge to a safe pad Q that lies wholly under the runner's green bridge. Let go with the twin on Q, walk back, shift up once, run and jump the kerb green.<br>• Tension: how far out of step (a 95-step choice), then a 30-step kerb jump.<br>• Kerb removed: 0 wins. Twin lane roofed; a divider pocket catches a fallen runner. |
| w3-03 | Gear Split | NEW: a stop in mid-air drops only that body's gear. | **APPROVED v1 (2026-11-17).** Both sprint and jump; a hanging safe block in the runner's lane stops it in the air (gear 1, drops down) while the twin Coasts over a flat 7-tile gap and lands yellow in gear 3. Then a 10-tile blue bridge for the runner, yellow floor to the exit for the twin.<br>• Tension: take off where the block catches the runner and the twin clears its gap (18 steps).<br>• Block removed: 0 wins.<br>• 2026-11-19: a `jump` glyph at the takeoff (`jump 12 3`), because the block was not read as the tool. |
| w3-04 | Clamp | NEW: pressing up past gear 4 brings split gears back together. | **APPROVED v1 (2026-11-17).** A short w3-03, then red bridges in both lanes, the twin's 11 tiles long. Press up three times: runner 1→4, twin 3→4 then held at 4.<br>• Tension: where to press, set by the slower body (let-go 73 steps, moving 86).<br>• Every win uses a clamped press; "press once, park the twin, press twice" fails. |
| w3-05 | Redshift | COMBINE finale: split, out-of-step bridges, clamp down, kerb pin, clamp up, shared drag jump, park, brake. | **APPROVED v1 (2026-11-17).** Split at the block, cross blue/yellow out of step, press down twice (a blue strip in the twin lane forces it), hold until both kerbs hold both bodies in step, walk back, press up three times, jump both kerbs into one shared drag jump (22 steps), park the runner, brake the twin alone onto its blue bridge.<br>• Removal (COMBINE rule): 0 wins without the air stop, 0 wins without the kerbs. |

## World 4 — Motion (v4.0, Must except w4-04)

Full specs: `levels-w4.md`. Movers: `features/moving-objects.md`. Needs only world 1–2 skills.

| Id | Title | Kind | Long | Priority | Idea |
|---|---|---|---|---|---|
| w4-01 | Lift | puzzle | no | Must | NEW: a grey lift carries you; standing on it you stay white. |
| w4-02 | Ferry | puzzle | no | Must | NEW: a shuttle carries you sideways; leave at its dock in gear 2 onto a green bridge. |
| w4-03 | Moving Bridge | puzzle | no | Must | TWIST: a green slab holds only green: cross it at pace while it rests level. |
| w4-04 | Outrun | flow | medium | Should | NEW (sweep): a front at 3.75 tiles/s; budget where you can walk. |
| w4-05 | Commute | flow | **yes** | Must | COMBINE: shuttle into a red wall, Coast and lift, green slab and brake. |

## World 5 — Signals (v4.0, Must except w5-04)

Full specs: `levels-w5.md`. Bolts: `features/projectiles.md`.

| Id | Title | Kind | Long | Priority | Idea |
|---|---|---|---|---|---|
| w5-01 | Spark | puzzle | no | Must | NEW: a red bolt only hits red; turn red after the lane. |
| w5-02 | Keep Moving | puzzle | no | Must | TWIST: white bolts hit only a stopped runner; brake while moving. |
| w5-03 | Hurdles | action | no | Must | NEW: grey bolts hit everyone; jump low ones on green, stay down on yellow. |
| w5-04 | Chase | action | medium | Should | COMBINE: a 7.5-tile/s sweep and colored rain (Could swap: Tandem "Crossfire"). |
| w5-05 | Full Spectrum | flow and action | **yes** | Must | COMBINE finale: every bolt kind, a lift, the green slab, home. |

## Gates (old world 4; COULD since v4.0, post-jam)

Not built for the jam. Its world slot went to Motion (owner's expansion request, 2026-11-23). Kept as the design if it ever ships as a sixth world. Specs: `features/speed-gates.md`.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w4-01 | Gate | NEW: a gate opens only for its own color. | Spawn a few tiles before a green gate column: walking into it (blue) bumps harmlessly. Behind the spawn, a ≥ 6-tile safe runway; after the gate, 2 safe tiles, then a yellow bridge over a pit.<br>• Tension: green at the gate, yellow at the bridge.<br>• Shift window from 0.94 tiles before the gate face to 0.19 tiles before the bridge: 3.75 tiles ≈ 30 steps. |
| w4-02 | Trapdoor | TWIST: a gate floor opens the moment you turn its color. | A 10-tile blue-gate floor over a pit; the exit pocket under its middle 3 tiles. Arrive red and let go: blue 3.24 tiles later (§5.2), and you drop there. Walk on blue and you fall at the first tile. |
| w4-03 | Two Gates | COMBINE: Tandem and gates. | A green gate in the runner's lane, a yellow gate in the twin's, same x. Make a one-gear split first: a yellow wall stops the runner while both cruise yellow; it ramps from blue and is green 0.60–1.88 tiles later, while the twin stays yellow. |
| w4-04 | Ice | NEW: on ice your speed and gear are locked. | 4 safe tiles, then 8 tiles of ice straight onto a green bridge: pick green on the stone (0.6 tiles from standing), because nothing you press on the ice changes your speed. Needs the ice spec and sim work. |

If gates are not built, world 4 is dropped. If ice is not built, w4-04 is dropped.

## Fallback (DROPPED 2026-11-16)

_The owner closed the Tandem gate on 2026-11-16: Tandem stays as world 3 and this fallback will not be built. Kept as history and as a source of world-4 ideas._

World 3 would have reverted to the v2.0 Gates world (speed gates Must again; `features/speed-gates.md`):

| Id | Title | Idea | Sketch |
|---|---|---|---|
| w3-01 | Gate | NEW: gates | as w4-01 above |
| w3-02 | Trapdoor | TWIST: gate floors | as w4-02 above |
| w3-03 | No Green | TEST: braking zones | A red jump lands yellow (8.7) on a 6-tile green-gate floor, then a 4-tile safe pad, then a blue bridge. Turn green only once the box is over the pad; blue (2.03 after letting go) before the bridge. The let-go window is about 3.5 tiles ≈ 23 steps. |
| w3-04 | Gate Window | COMBINE: gates and drag | A yellow gate 4 tiles out and a green gate 7.5 tiles out in one gap, landing 4 tiles lower. Only a yellow takeoff passes both (yellow at 4, dragged to green at 6.0, lands 8.10). |
| w3-05 | Redshift | COMBINE finale | runway, red wall, drag, gates, trapdoor |

## Changes in v3.0 (Tandem, 2026-11-03)

- **World 2** back to four levels (Commit, Coast, Step Down, Two Colors as w2-04). w2-04 Gate moved to world 4 (Should).
- **World 3** is Tandem: Two Lanes, Out of Step, Gear Split, Clamp, Redshift (finale).
- **World 4** is Gates (Should): Gate, Trapdoor, Two Gates, Ice. Green Roof, Brake Budget, Black Ice dropped.
- **Must** stays 14 (5 + 4 + 5); M2 ships 9 levels.
- **Open (GDD §12.7):** Tandem first appears at level 10. Partly mitigated in v3.1: w3-01 is open from the start. If the M2 playtest shows voters still stopping early, Two Colors moves after w3-01 or world 1 trims to four levels.

## Changes in v2.0 (puzzle depth review)

- Colored walls into world 1 (w1-05); gates into world 2; worlds 3–4 rebuilt; mud, boost, conveyors, moving platforms, crates, afterimage cut (`mechanics-review.md`).

## Summary

| World | Levels | Priority | Status (2026-11-17) | New engineering |
|---|---|---|---|---|
| 1 Gears | 5 | Must | all approved | none |
| 2 Flight | 4 | Must | all approved | none |
| 3 Tandem | 5 | Must | all approved | Tandem (sim + scene built; stays, owner 2026-11-16) |
| 2 Flight (+ w2-05, v4.0) | +1 | Must | planned | none |
| 4 Motion (v4.0) | 5 | 4 Must, 1 Should | planned | movers; sweep (Should) |
| 5 Signals (v4.0) | 5 | 4 Must, 1 Should | planned | emitters; sweep (Should) |
| Gates | 4 | Could (post-jam) | not started | speed gates, ice |
| **Total (v4.0)** | **25 + 4 Could** | 23 Must, 2 Should | 14 of 23 Must approved | |
