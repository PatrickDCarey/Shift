# Redshift — Level plan

_Owner: design-lead. Built by level-designer in `levels/` (format: `docs/tech/level-format.md`). Rules and numbers: `docs/design/gdd.md` (§5 sanity math, §6 rules of thumb). Version 3.2 (2026-11-04, batch 2): world-1 low roofs adopted with conditions; "fastest known" step count per level for the leaderboard floor; w1-01 and w1-02 approved. Version 3.1 (2026-11-04): first level of every world open from the start; hint glyph placements per level; title length cap. Version 3.0 (2026-11-03): the studio owner picked **Tandem** as the core twist (`core-twists.md`, `features/tandem.md`). World 3 becomes five Tandem levels; speed gates and ice move to a Should world 4. The v2.0 gates plan is kept below as the fallback._

18 levels in 4 worlds. Each level introduces **one** new idea (or combines known ones, marked COMBINE/TEST/TWIST). A level is rejected if:
- it teaches two new ideas at once;
- it needs precision the pillars forbid;
- it can be solved while ignoring its idea.

**What a good level asks** (`mechanics-review.md` §1): two decisions in tension at nearby places, so the answer is a specific place and pace, not "as fast as possible" or "stop". Every sketch below names its tension.

**Priority:**
- Worlds 1–3 are **Must** (14 levels).
- World 4 is **Should** (4 levels).
- Milestones: worlds 1–2 in **M2** (Nov 15), worlds 3–4 in **M3** (Nov 22).
- Tandem sim and scene: Nov 9–13, decision gate Nov 12.

## Constraints for level-designer

- Until w2-02 teaches drag, no intended line should fly more than 6 horizontal tiles, and no likely wrong line should be "rescued" by a drag drop (a yellow flat jump always lands green). Check yellow and red takeoffs, not just the intended one. A colored runway is the easy way to fix the takeoff color.
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
  - every single-lane rule above applies to each lane.
- **Prove the idea is needed:** for each level, record in `levels/README.md` that the level fails when the new piece is ignored (remove the wall, block or twin feature and show a non-intended line now wins, or show the intended line is the only one through).
- Timing windows in intended solutions: at least 12 steps (0.2 s), or ≥ 3 tiles at sprint. Widen flight windows with lower landing pads (GDD §5.4) rather than shorter gaps.
- World 1 levels should be solvable without reading anything. Onboarding hint glyphs (`features/onboarding-hints.md`; placed by hint headers, at most 3 per level, anchor in an empty cell at least 3 rows above the floor, runner lane only in Tandem levels):
  - w1-01: `move` above the spawn (Must);
  - w1-02: `shiftUp` over the first pad and `shiftDown` over the second (Must);
  - w2-01: `jump` over the start pad (Must) and `shiftUp` (Should);
  - w3-01: `move` and `shiftUp` in the runner lane (Should).
- **The first level of every world is open from the start** (owner decision 2026-11-04, `features/level-select.md`). w2-01 and w3-01 must therefore be playable by someone who skipped every earlier world: gentle, with the hints above, and with no skill the level itself doesn't show. Inside a world, levels still unlock in order.
- Level `title`s: 20 characters at most (level select truncates at 24).
- Every level ships a solution recording.
- **World 1 roofs (v3.2):** a colored bridge in world 1 may sit under a low safe roof so no jump skips the lesson. Exactly 2 tiles of headroom over the bridge floor; roof made of safe tiles only (never colored); the roof's end faces sit over safe ground or exactly at the bridge's first and last columns (so a jump that hits a face drops back onto safe ground, never onto the bridge in the wrong color); every spawn and stop pad has at least 5 tiles of clear headroom (a standing jump reaches the full 3-tile apex with no ceiling event). In w1-05 the red wall column runs from the floor to the roof. Worlds 2 and 4 put no roof over the lesson (jumping is part of it); Tandem lanes are already capped by the divider.
- **Fastest known steps (for the leaderboard floor, `features/leaderboards.md`):** record in `levels/README.md`, per level, the lowest winning step count seen in your sweeps (`Fastest known: N steps`). Backend sets the floor at 85% of it.

## World 1 — Gears (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w1-01 | First Steps | NEW: hold a direction to move; blue holds you only while you walk. | Hold right to walk (gear 1, blue, instantly) across a 6-tile blue bridge between safe pads; let go on the bridge and you turn white and drop through. |
| w1-02 | Shift | NEW: Shift changes your cruise gear, and with it your color. | Safe pad, green bridge, safe pad, blue bridge: shift up on the first pad so you're green (0.6 tiles from a standstill), shift back down on the second (blue after 0.8 tiles). Pads are 3 tiles. |
| w1-03 | Runway | NEW: running speed takes distance to build. | A red bridge starts 2 tiles in front of the spawn, with an 8-tile safe room behind: red needs 3.2 tiles, so walk back to the wall, turn (instant at walking pace), and come in from the far end already red. |
| w1-04 | Brake | NEW: slowing down takes distance too. | Sprint across a red bridge (4+ tiles of safe runway first), then a 6-tile safe pad, then a blue bridge. Be blue by the bridge: shift down to gear 1 early enough, or let go, stop on the pad, shift down to gear 1 and walk on. The window is about 3.5 tiles, from the last 0.7 tiles of red to 2.8 tiles into the pad. |
| w1-05 | Red Wall | NEW: a colored wall stops only its own color. | Safe runway (≥ 6 tiles), a red wall column, 1 safe tile, a red bridge over a pit to the exit. Tension: not red at the wall, red 2 tiles later.<br>• Arrive red: the wall stops you dead (gear kept). From the wall face red needs 3.23 tiles, but only 2.75 remain before the bridge.<br>• Arrive yellow and shift up: red 0.66 tiles later, inside or after the wall.<br>• Shift window (player x at the press): from 1.04 tiles before the wall face to 0.29 tiles before the bridge, 2.75 tiles ≈ 18 steps.<br>• Cruising green and shifting twice also works (red 1.83 tiles after the press).<br>Also the colored-wall lesson Tandem builds on. |

## World 2 — Flight (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w2-01 | Commit | NEW: in the air nothing you press changes your speed; you land in the color you took off in. | Safe pad, a green runway, a 4-tile gap, a green landing pad. Being green is the only way to stand on the runway, so you take off green and land green; jump too early and steering back does nothing. |
| w2-02 | Coast | NEW: air drag, every 6 tiles of flight costs one color. | Red runway, a 7-tile flat gap, a yellow landing pad. A red takeoff flies 8.7 tiles and turns yellow at 6, landing safely; a yellow takeoff lands green and drops through. |
| w2-03 | Step Down | NEW: walking off a ledge is a shorter flight than jumping. | Sprint off a 4-tile-high ledge onto a long red floor below. Walking off lands 5.8 tiles out (29 airborne steps, under the 6-tile drag point), still red; jumping flies 10.65 tiles, turns yellow, and falls through the red floor. Keep the drop at exactly 4 tiles: a 5-tile drop makes the walk-off land yellow too. |
| w2-04 | Two Colors | COMBINE: runway, commit, color grace. | A green floor runs under a yellow ledge 2 tiles up: cruise green, shift up mid-run, and jump in the 12 steps after you turn yellow, before the green floor lets you go. |

## World 3 — Tandem (Must, M3)

One throttle, two runners. Your runner's lane on top, the twin's below. Sim and scene are built Nov 9–13; **draw w3-01 to w3-03 on paper now** and build them when the sim lands. Numbers marked (derived) are pending tests in `features/tandem.md`.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w3-01 | Two Lanes | NEW: a twin obeys the same keys on its own floor; both must reach home. | Identical lanes: safe pad, blue bridge, safe pad, green bridge, safe ground to an exit. Hold right in gear 1, both walk blue; shift up on the pad, both are green 0.6 tiles later.<br>• The runner's exit is 3 tiles nearer than the twin's, so the runner parks first and the twin walks on alone. This shows "home" without asking anything of it.<br>• Let go on the twin's bridge and it falls: the run dies and both respawn.<br>• The level fails if you play only your own lane. |
| w3-02 | Out of Step | NEW: a wall that stops one body splits one input into two colors. | Both cruise red from a 6-tile runway. The runner's lane has a red wall at x = X; the twin's lane is open.<br>• The runner stops dead, then (still holding) restarts at blue, passes the red wall, and is green 0.60–1.88 tiles past its stop point (GDD §5.1). Meanwhile the twin, still red, is 2.0–4.6 tiles past the wall (derived).<br>• Runner lane: a green bridge from X+0.25 to X+1.5 (wholly on it 1.0–1.5 tiles past the stop: green). Twin lane: a red bridge from X+2 to X+5.<br>• Arrive yellow: the wall doesn't stop you, so you are yellow on green and fall.<br>• Tension: you must be red **so that** the wall stops you. Wall removed: no split, and no single pace satisfies both bridges. |
| w3-03 | Gear Split | NEW: a stop in mid-air drops only that body's gear. | Both cruise gear 4 and jump together. A hanging safe block 3 tiles past launch, 2 tiles above the floor, in the runner's lane only, stops the runner on flight step 14 (derived): `vx` 0, gear 1, and it drops straight down. The twin flies 8.7 and lands yellow in gear 3 (§5.3).<br>• Then: runner lane a blue bridge, twin lane a yellow bridge, side by side. Holding right gives blue and yellow at once.<br>• Tension: take off at a place where the block catches the runner. Without the block, both land in gear 3. |
| w3-04 | Clamp | NEW: pressing up past gear 4 brings split gears back together. | Starts split (a w3-03-style block early in the level), then both lanes must cross red bridges. Press up three times: runner 1→4, twin 3→4 then held at 4.<br>• The twin is red 0.66 tiles after the first press; the runner needs about 3.1 tiles from blue cruise (derived).<br>• Runner's red bridge starts ≥ 3.5 tiles after the last safe pad; the twin's may start sooner.<br>• Tension: where to press, set by the slower body. |
| w3-05 | Redshift | COMBINE finale: runway, red wall, drag, split, clamp, park. | One long two-lane room. Split the bodies with a wall, then cross a blue/green pair of bridges out of step. Clamp both to red for a shared 7-tile gap (both land yellow, 8.7). Then park the runner at a mid-lane exit, walk the twin alone onto a blue bridge to its exit. Each section is a known idea; the difficulty is the order. |

## World 4 — Gates (Should, M3)

Built only if Must is done. Specs: `features/speed-gates.md`, ice spec due Nov 15.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w4-01 | Gate | NEW: a gate opens only for its own color. | Spawn a few tiles before a green gate column: walking into it (blue) bumps harmlessly. Behind the spawn, a ≥ 6-tile safe runway; after the gate, 2 safe tiles, then a yellow bridge over a pit.<br>• Tension: green at the gate, yellow at the bridge.<br>• Shift window from 0.94 tiles before the gate face to 0.19 tiles before the bridge: 3.75 tiles ≈ 30 steps. |
| w4-02 | Trapdoor | TWIST: a gate floor opens the moment you turn its color. | A 10-tile blue-gate floor over a pit; the exit pocket under its middle 3 tiles. Arrive red and let go: blue 3.24 tiles later (§5.2), and you drop there. Walk on blue and you fall at the first tile. |
| w4-03 | Two Gates | COMBINE: Tandem and gates. | A green gate in the runner's lane, a yellow gate in the twin's, same x. Make a one-gear split first: a yellow wall stops the runner while both cruise yellow; it ramps from blue and is green 0.60–1.88 tiles later, while the twin stays yellow. |
| w4-04 | Ice | NEW: on ice your speed and gear are locked. | 4 safe tiles, then 8 tiles of ice straight onto a green bridge: pick green on the stone (0.6 tiles from standing), because nothing you press on the ice changes your speed. Needs the ice spec and sim work. |

If gates are not built, world 4 is dropped. If ice is not built, w4-04 is dropped.

## Fallback: if the Tandem decision gate fails (Nov 12)

World 3 reverts to the v2.0 Gates world (speed gates become Must again; `features/speed-gates.md`):

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

| World | Levels | Priority | Milestone | New engineering |
|---|---|---|---|---|
| 1 Gears | 5 | Must | M2 | none |
| 2 Flight | 4 | Must | M2 | none |
| 3 Tandem | 5 | Must | M3 | Tandem (sim + scene Nov 9–13) |
| 4 Gates | 4 | Should | M3 | speed gates, ice |
| **Total** | **18** | 14 Must, 4 Should | | |
