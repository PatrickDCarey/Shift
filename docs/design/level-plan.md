# Redshift — Level plan

_Owner: design-lead. Built by level-designer in `levels/` (format: `docs/tech/level-format.md`). Rules and numbers: `docs/design/gdd.md` (§5 sanity math, §6 rules of thumb). Version 1.1: re-checked for hold-to-move._

21 levels in 5 worlds. Each level introduces **one** new idea (or combines known ones, marked COMBINE). A level is rejected if it teaches two new ideas at once, needs precision the pillars forbid, or can be solved while ignoring its idea.

**Priority:** worlds 1–3 are **Must** (13 levels), worlds 4–5 are **Should** (8 levels). Milestone: worlds 1–2 in **M2** (Nov 15), worlds 3–5 in **M3** (Nov 22).

## Constraints for level-designer

- Until w2-02 teaches drag, no intended line should fly more than 6 horizontal tiles, and no likely wrong line should be "rescued" by a drag drop (a yellow flat jump always lands green). Check yellow and red takeoffs, not just the intended one. A colored runway is the easy way to fix the takeoff color.
- Stops and turn-arounds above walking pace happen on safe ground (`#`). Players will let go of the arrow a lot; never put the natural "stop and think" spot on a colored floor unless that is the lesson.
- Runway from standing: red needs ≥ 4 tiles (deny with ≤ 2.5); yellow ≥ 2.5 (deny ≤ 1.25). Stopping from sprint takes 3.74 tiles.
- Max climb 2 tiles; never a 3-tile ledge.
- Timing windows in intended solutions: at least 12 steps (0.2 s), or ≥ 3 tiles at sprint.
- World 1 levels should be solvable without reading anything. w1-01 shows an arrow-key glyph at spawn; w1-02 shows a Shift/E/X glyph on its first pad.
- Every level ships a solution recording.

## World 1 — Gears (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w1-01 | First Steps | NEW: hold a direction to move; blue holds you only while you walk. | Hold right to walk (gear 1, blue, instantly) across a 6-tile blue bridge between safe pads; let go on the bridge and you turn white and drop through. |
| w1-02 | Shift | NEW: Shift changes your cruise gear, and with it your color. | Safe pad, green bridge, safe pad, blue bridge: shift up on the first pad so you're green (0.6 tiles from a standstill), shift back down on the second (blue after 0.8 tiles). Pads are 3 tiles. |
| w1-03 | Runway | NEW: running speed takes distance to build. | A red bridge starts 2 tiles in front of the spawn, with an 8-tile safe room behind: red needs 3.2 tiles, so walk back to the wall, turn (instant at walking pace), and come in from the far end already red. |
| w1-04 | Brake | NEW: slowing down takes distance too. | Sprint across a red bridge (4+ tiles of safe runway first), then a 6-tile safe pad, then a blue bridge: shift down to gear 1 early enough (or let go, stop on the pad, shift down to gear 1 and walk on) to be blue by the bridge, a ~3.5-tile window from the last 0.7 tiles of red to 2.8 tiles into the pad. |

## World 2 — Flight (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w2-01 | Commit | NEW: in the air nothing you press changes your speed; you land in the color you took off in. | Safe pad, a green runway, a 4-tile gap, a green landing pad: being green is the only way to stand on the runway, so you take off green and land green; jump too early and steering back does nothing. |
| w2-02 | Coast | NEW: air drag, every 6 tiles of flight costs one color. | Red runway, a 7-tile flat gap, a yellow landing pad: a red takeoff flies 8.7 tiles and turns yellow at 6, landing safely; a yellow takeoff lands green and drops through. |
| w2-03 | Step Down | NEW: walking off a ledge is a shorter flight than jumping. | Sprint off a 4-tile-high ledge onto a long red floor below: walking off lands 5.6 tiles out, still red; jumping flies 10.7 tiles, turns yellow, and falls through the red floor. |
| w2-04 | Two Colors | COMBINE: runway, commit, color grace. | A green floor runs under a yellow ledge 2 tiles up: cruise green, shift up mid-run, and jump in the 12 steps after you turn yellow, before the green floor lets you go. |

## World 3 — Ground (Must, M3)

Specs for these pieces are due before M3 (GDD §7.1).

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w3-01 | Red Wall | NEW: colored walls stop only their own color. | A red bridge ends at a safe pad and then a red wall across the corridor: arrive red, shift down (or ease off) on the pad, and be yellow by the wall so you slip through it. |
| w3-02 | Mud | NEW: mud caps you at green. | A red bridge runs straight into 3 tiles of mud and then a green bridge, with no safe pad to brake on: the mud caps your gear at green and brakes you there in ~1.9 tiles, so you cross the green bridge. |
| w3-03 | Ice | NEW: on ice your speed and gear are locked. | A long ice floor leads straight onto a green bridge with no stone between: pick green on the short stone before the ice, because nothing you press on the ice (Shift, letting go, turning) changes your speed. |
| w3-04 | Boost | NEW: boost pads set you to sprint instantly. | A boost pad on a 2-tile platform with no runway is the only way to get a red takeoff over an 8-tile gap; you land yellow on the far pad. |
| w3-05 | Camera | NEW: camera gates admit only their gear. | A green camera gate stands between two yellow bridges on a safe pad: drop to green on the pad to pass the gate, then build back to yellow before the second bridge. |

## World 4 — Relative (Should, M3)

Conveyors and moving platforms add their speed to your world velocity; colored tiles read your legs, camera gates read the world (GDD §7.1). Specs due before M3.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w4-01 | Belt | NEW: conveyors move you without changing your color. | A blue conveyor running right carries a walking (blue) player fast enough to clear a gap a blue jump never could, while staying solid on the blue belt. |
| w4-02 | Treadmill | NEW: camera gates read world speed, not leg speed. | A white camera gate sits on a red belt running toward you: sprint against the belt so your legs are red (solid on the belt) while the world sees you standing still, and the gate opens. |
| w4-03 | Lift | NEW: a moving platform adds its speed to your jump. | Jumping from a platform sliding right turns a green takeoff into a jump long enough to reach a far green pad, as long as you jump while it moves your way. |
| w4-04 | Crate | NEW: crates take and keep the color you push them at. | Push a crate at green into a pit so it becomes a green step, then come back green to climb on it to the exit ledge. |

## World 5 — Afterimage (Should, M3)

Depends on the afterimage rule (GDD §7.1, open question 3). Sketches assume the candidate rule: while red and airborne you leave ghost tiles along your path that last 3 s and hold you up when you are not red.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w5-01 | Afterimage | NEW: sprinting through the air leaves ghost platforms behind you. | Sprint-jump across a pit onto a safe pad at least 3 tiles long (a skid from yellow takes 2.5), turn around, and hop back onto your own fading ghosts to reach the exit hanging above the pit. |
| w5-02 | Ghost Bridge | NEW: ghosts are only for your slower self. | A gap too wide for any jump: lay a ghost line with a red jump that falls short onto a lower ledge, then cross at green on the ghosts before they fade. |
| w5-03 | Long Shadow | COMBINE: afterimage and air drag. | Only the first 6 tiles of a sprint jump leave ghosts (you turn yellow after that), so take off from exactly the right ledge to lay ghosts where you need them. |
| w5-04 | Redshift | COMBINE: finale using runway, braking, drag, colored walls and ghosts. | One long room: build to red, coast a gap, brake through a red wall, and climb your own afterimage to the exit. |

## Changes in v1.1 (hold-to-move)

- **w1-01** rewritten: teaches holding to move; the failure is letting go on the bridge (was: shifting twice).
- **w1-02** retitled "Shift": now the level that introduces the Shift keys (the run starts in gear 1).
- **w1-03** uses a red bridge 2 tiles out (yellow now needs only 1.9 tiles, so a yellow bridge would no longer deny it).
- **w1-04** notes letting go as an equal way to brake; runway 4 tiles (was 5).
- **w2-01** rebuilt around a green runway: under hold-to-move a yellow takeoff from a safe runway would land green on the pad via drag.
- **w3-02, w3-03** mention letting go. Other sketches unchanged: air physics did not change.
- Ids follow the level format (`w1-01`).

## Summary

| World | Levels | Priority | Milestone |
|---|---|---|---|
| 1 Gears | 4 | Must | M2 |
| 2 Flight | 4 | Must | M2 |
| 3 Ground | 5 | Must | M3 |
| 4 Relative | 4 | Should | M3 |
| 5 Afterimage | 4 | Should | M3 |
| **Total** | **21** | 13 Must, 8 Should | |
