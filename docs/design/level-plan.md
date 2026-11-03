# Redshift — Level plan

_Owner: design-lead. Built by level-designer in `levels/` (format: `docs/tech/level-format.md`). Rules and numbers: `docs/design/gdd.md` (§5 sanity math, §6 rules of thumb). Version 2.0 (2026-11-03): re-planned around the puzzle depth review (`mechanics-review.md`): colored walls and speed gates come into worlds 1–2; worlds 3–4 rebuilt; mud, boost, conveyors, moving platforms, crates and afterimage cut._

18 levels in 4 worlds. Each level introduces **one** new idea (or combines known ones, marked COMBINE/TEST/TWIST). A level is rejected if it teaches two new ideas at once, needs precision the pillars forbid, or can be solved while ignoring its idea.

**What a good level asks** (`mechanics-review.md` §1): two decisions in tension at nearby places, so the answer is a specific place and pace, not "as fast as possible" or "stop". Every sketch below names its tension.

**Priority:** worlds 1–3 are **Must** (14 levels), world 4 is **Should** (4 levels). Milestones: worlds 1–2 in **M2** (Nov 15), worlds 3–4 in **M3** (Nov 22).

## Constraints for level-designer

- Until w2-02 teaches drag, no intended line should fly more than 6 horizontal tiles, and no likely wrong line should be "rescued" by a drag drop (a yellow flat jump always lands green). Check yellow and red takeoffs, not just the intended one. A colored runway is the easy way to fix the takeoff color.
- Stops and turn-arounds above walking pace happen on safe ground (`#`). Players will let go of the arrow a lot; never put the natural "stop and think" spot on a colored floor or gate floor unless that is the lesson.
- Runway from standing: red needs ≥ 4 tiles (deny with ≤ 2.5); yellow ≥ 2.5 (deny ≤ 1.25). Stopping from sprint takes 3.74 tiles.
- Max climb 2 tiles; never a 3-tile ledge.
- A sprint walk-off stays red only down to a 4-tile drop (5.8 tiles of flight); 5+ tiles lands yellow.
- Never hang a colored tile less than 1.5 tiles above a floor of the same color, and never a gate tile less than 1.5 tiles above a gate floor of the same band (no-embed is per color and per gate band).
- **Gates** (`features/speed-gates.md`): a gate opens only for its band. Gate walls are full-height columns (no way over). `w` gates only as floors or ceilings. Never spawn on or in a gate. The first gate in the game (w2-04) is met at walking pace on safe ground so the first contact is a harmless bump.
- **Colored walls** (`features/colored-walls.md`): stand them on safe tiles; a red wall stops only red.
- **Prove the idea is needed:** for each level, record in `levels/README.md` that the level fails when the new piece is ignored (e.g. replace the gate or wall by empty space and show a non-intended pace now wins, or show the intended line is the only one through).
- Timing windows in intended solutions: at least 12 steps (0.2 s), or ≥ 3 tiles at sprint. Widen flight windows with lower landing pads (GDD §5.4) rather than shorter gaps.
- World 1 levels should be solvable without reading anything. w1-01 shows an arrow-key glyph at spawn; w1-02 shows a Shift/E/X glyph on its first pad.
- Every level ships a solution recording.

## World 1 — Gears (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w1-01 | First Steps | NEW: hold a direction to move; blue holds you only while you walk. | Hold right to walk (gear 1, blue, instantly) across a 6-tile blue bridge between safe pads; let go on the bridge and you turn white and drop through. |
| w1-02 | Shift | NEW: Shift changes your cruise gear, and with it your color. | Safe pad, green bridge, safe pad, blue bridge: shift up on the first pad so you're green (0.6 tiles from a standstill), shift back down on the second (blue after 0.8 tiles). Pads are 3 tiles. |
| w1-03 | Runway | NEW: running speed takes distance to build. | A red bridge starts 2 tiles in front of the spawn, with an 8-tile safe room behind: red needs 3.2 tiles, so walk back to the wall, turn (instant at walking pace), and come in from the far end already red. |
| w1-04 | Brake | NEW: slowing down takes distance too. | Sprint across a red bridge (4+ tiles of safe runway first), then a 6-tile safe pad, then a blue bridge: shift down to gear 1 early enough (or let go, stop on the pad, shift down to gear 1 and walk on) to be blue by the bridge, a ~3.5-tile window from the last 0.7 tiles of red to 2.8 tiles into the pad. |
| w1-05 | Red Wall | NEW: a colored wall stops only its own color. | Safe runway (≥ 6 tiles), a red wall column, 1 safe tile, a red bridge over a pit to the exit. Tension: not red at the wall, red 2 tiles later. Arrive red and the wall stops you dead (gear kept); from the wall face red needs 3.23 tiles but only 2.75 remain before the bridge. Arrive yellow and shift up: red 0.66 tiles later, inside or after the wall. Shift window (player x at the press) from 1.04 tiles before the wall face to 0.29 tiles before the bridge: 2.75 tiles ≈ 18 steps. Cruising green and shifting twice also works (red 1.83 tiles after the press). |

## World 2 — Commit (Must, M2)

Decide your pace before you arrive: in the air, and at gates.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w2-01 | Commit | NEW: in the air nothing you press changes your speed; you land in the color you took off in. | Safe pad, a green runway, a 4-tile gap, a green landing pad: being green is the only way to stand on the runway, so you take off green and land green; jump too early and steering back does nothing. |
| w2-02 | Coast | NEW: air drag, every 6 tiles of flight costs one color. | Red runway, a 7-tile flat gap, a yellow landing pad: a red takeoff flies 8.7 tiles and turns yellow at 6, landing safely; a yellow takeoff lands green and drops through. |
| w2-03 | Step Down | NEW: walking off a ledge is a shorter flight than jumping. | Sprint off a 4-tile-high ledge onto a long red floor below: walking off lands 5.8 tiles out (29 airborne steps, under the 6-tile drag point), still red; jumping flies 10.65 tiles, turns yellow, and falls through the red floor. Keep the drop at exactly 4 tiles: a 5-tile drop makes the walk-off land yellow too. |
| w2-04 | Gate | NEW: a gate opens only for its own color. | Spawn on safe ground a few tiles before a green gate column: walking into it (blue) bumps harmlessly, which teaches "it's shut for me". Behind the spawn, a ≥ 6-tile safe runway; after the gate, 2 safe tiles, then a yellow bridge over a pit to the exit. Tension: green at the gate, yellow at the bridge. Yellow or red at the gate bumps; green all the way falls through the yellow bridge. Shift window from 0.94 tiles before the gate face to 0.19 tiles before the bridge: 3.75 tiles ≈ 30 steps. Gate removed: cruising yellow wins, so the gate is the puzzle. |
| w2-05 | Two Colors | COMBINE: runway, commit, color grace. | A green floor runs under a yellow ledge 2 tiles up: cruise green, shift up mid-run, and jump in the 12 steps after you turn yellow, before the green floor lets you go. |

## World 3 — Gates (Must, M3)

Where your color changes. No new engineering: gates and walls exist from M2.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w3-01 | No Green | TEST: a gate floor won't hold its own color, so you can't slow down through it. | Red runway, a 7-tile gap, a 6-tile green-gate floor over a pit, a 4-tile safe pad, a blue bridge. A red jump lands yellow (8.7) on the gate floor, which holds yellow. Let go there and you turn green 0.81 tiles later and drop. Tension: brake, but only once green can no longer drop you: turn green with the box over the pad and blue (2.03 tiles after letting go) before the bridge; let-go window ≈ 3.5 tiles ≈ 23 steps. |
| w3-02 | Trapdoor | TWIST: a gate floor opens under you the moment you turn its color, so you can aim where you fall. | A 10-tile blue-gate floor over a pit; the exit pocket lies under its middle 3 tiles. Walk on blue and you fall at the first tile. Arrive red (or yellow) and let go: blue 3.24 tiles later from sprint (2.03 from yellow), and you drop there. Tension: where you start braking. Pocket 3 tiles wide ≈ 15 steps of let-go at sprint; allow ~1.5 tiles of forward drift while falling 2 tiles at blue. Skidding (holding the other way) brakes the same and also works. |
| w3-03 | Gate Window | COMBINE: gates read your color where they stand, and drag changes it mid-flight. | One gap: a yellow gate column 4 tiles past the edge and a green gate column 7.5 tiles past it, safe landing floor 4 tiles below the takeoff, starting under the green gate. Only a yellow takeoff passes both: yellow at 4, dropped to green at 6.0 (flight step 40), lands 8.10 out. Red bounces off the yellow gate (red at 4); green bounces too. Tension: the middle color, explained only by drag. Takeoff window ≈ 1.95 tiles ≈ 13 steps. Gates removed: red and yellow both land, so the gates are the puzzle. |
| w3-04 | Redshift | COMBINE finale: runway, red wall, drag, gates, trapdoor. | One long room: pass a red wall yellow and shift up behind it, sprint-jump a gap whose far gate needs your dragged color, land on a no-green floor, brake on the safe pad, then drop through a blue trapdoor into the exit pocket. Each section is a known idea; the finale's difficulty is the order, not new rules. |

## World 4 — Remix (Should, M3)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w4-01 | Green Roof | TWIST: colored ceilings bonk only their own color. | A green ceiling 3.5 tiles above the takeoff over the first 3 tiles of a gap; a green pad 4–7.5 tiles out. A green jump (would land 4.8) bonks on flight step 11 and falls; a yellow jump passes the roof and lands green at 6.8. Roof removed: green wins, so the roof is the puzzle. |
| w4-02 | Ice | NEW: on ice your speed and gear are locked. | 4 safe tiles, then 8 tiles of ice straight onto a green bridge: pick green on the stone (0.6 tiles from standing), because nothing you press on the ice changes your speed. Needs the ice spec and sim work (Should). |
| w4-03 | Brake Budget | TEST: shed speed before the ice. | A red jump over a 7-tile gap lands yellow on a 4-tile stone pad, then ice into a blue bridge: blue needs 2.03 tiles from yellow, and the ice won't let you brake. |
| w4-04 | Black Ice | COMBINE: ice, gates, drag. | Ice carries a locked pace through a gate and off an edge; the landing color after drag decides the far pad. Sketch to be drawn once the ice spec lands. |

If ice is not built, w4-02 to w4-04 are dropped and world 4 ships w4-01 alone or is cut (`mechanics-review.md` §7).

## Changes in v2.0 (puzzle depth review, 2026-11-03)

- **New:** w1-05 Red Wall (colored walls, moved from w3-01), w2-04 Gate (speed gates, from w3-05), w3-01 No Green, w3-02 Trapdoor, w3-03 Gate Window, w3-04 Redshift (new finale), w4-01 Green Roof, w4-03 Brake Budget, w4-04 Black Ice.
- **Moved:** Two Colors w2-04 → w2-05; Ice w3-03 → w4-02 (now Should).
- **World 2** renamed "Commit" (air commitment and gates).
- **Cut:** w3-02 Mud, w3-04 Boost, all of the old world 4 (Belt, Treadmill, Lift, Crate) and world 5 (Afterimage, Ghost Bridge, Long Shadow, old finale). Reasons: `mechanics-review.md` §4.
- **New constraints:** prove each level needs its idea; gate rules; widen flight windows with lower pads.

## Changes in v1.1 (hold-to-move)

- **w1-01** rewritten: teaches holding to move; the failure is letting go on the bridge (was: shifting twice).
- **w1-02** retitled "Shift": now the level that introduces the Shift keys (the run starts in gear 1).
- **w1-03** uses a red bridge 2 tiles out (yellow now needs only 1.9 tiles, so a yellow bridge would no longer deny it).
- **w1-04** notes letting go as an equal way to brake; runway 4 tiles (was 5).
- **w2-01** rebuilt around a green runway: under hold-to-move a yellow takeoff from a safe runway would land green on the pad via drag.
- Ids follow the level format (`w1-01`).

## Summary

| World | Levels | Priority | Milestone | New engineering |
|---|---|---|---|---|
| 1 Gears | 5 | Must | M2 | none |
| 2 Commit | 5 | Must | M2 | speed gates (M2) |
| 3 Gates | 4 | Must | M3 | none |
| 4 Remix | 4 | Should | M3 | ice (Should) |
| **Total** | **18** | 14 Must, 4 Should | | |
