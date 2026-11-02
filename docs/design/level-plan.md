# Redshift — Level plan

_Owner: design-lead. Built by level-designer in `levels/`. Rules and numbers: `docs/design/gdd.md` (§5 sanity math, §6 rules of thumb)._

21 levels in 5 worlds. Each level introduces **one** new idea (or combines known ones, marked COMBINE). A level is rejected if it teaches two new ideas at once, needs precision the pillars forbid, or can be solved while ignoring its idea.

**Priority:** worlds 1–3 are **Must** (13 levels), worlds 4–5 are **Should** (8 levels). Milestone: worlds 1–2 in **M2** (Nov 15), worlds 3–5 in **M3** (Nov 22).

## Constraints for level-designer

- Until 2-2 teaches drag, no intended line should fly more than 6 horizontal tiles, and no likely wrong line should be "rescued" by a drag drop. Check yellow and red takeoffs, not just the intended one.
- Turn-arounds above blue happen on white/grey ground only.
- Max climb 2 tiles; never a 3-tile ledge. Runway to red ≥ 5 tiles; to deny red ≤ 4.
- Timing windows in intended solutions: at least 12 steps (0.2 s), or ≥ 3 tiles at sprint.
- World 1 levels should be solvable without reading anything. 1-1 shows a Right Shift glyph above the player at spawn.
- Every level ships a solution recording.

## World 1 — Gears (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w1-1 | First Gear | NEW: Right Shift moves you, and blue is solid only while you are blue. | A 6-tile pit bridged by blue tiles between white pads: shift up once and walk across; shift twice and you turn green (after 1.8 tiles) and drop through. |
| w1-2 | Match | NEW: each color needs its gear, and Left Shift slows you down. | Blue bridge, white pad, green bridge, white pad, blue bridge: shift up on the first pad and back down on the second (color changes after ~0.6–0.8 tiles, so pads are 3 tiles). |
| w1-3 | Runway | NEW: speed takes distance to build. | A yellow bridge starts 2 tiles in front of the spawn, with an 8-tile white room behind: you can't turn yellow in 2 tiles (needs 3.1), so walk back to the wall, turn, and come in from the far end already yellow. |
| w1-4 | Brake | NEW: slowing down takes distance too. | Sprint across a red bridge (5-tile white runway first), then a 6-tile white pad, then a blue bridge: shift down three gears in a ~3.5-tile window (from the last 0.7 tiles of red to 2.8 tiles into the pad) so you're blue by the blue bridge. |

## World 2 — Flight (Must, M2)

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w2-1 | Commit | NEW: you can't shift in the air; you land in the color you took off in. | A 3-tile white ledge (too short to reach yellow), a 4-tile gap, a green pad with the exit: a blue jump falls short (clears ~3) and shifting mid-air does nothing; a green takeoff lands green on the pad. |
| w2-2 | Coast | NEW: air drag, every 6 tiles of flight costs one color. | Red runway, a 7-tile flat gap, a yellow landing pad: a red takeoff flies 8.7 tiles and turns yellow at 6, landing safely; a yellow takeoff lands green and drops through. |
| w2-3 | Step Down | NEW: walking off a ledge is a shorter flight than jumping. | Sprint off a 4-tile-high ledge onto a long red floor below: walking off lands 5.6 tiles out, still red; jumping flies 10.7 tiles, turns yellow, and falls through the red floor. |
| w2-4 | Two Colors | COMBINE: runway, commit, color grace. | A green floor runs under a yellow ledge 2 tiles up: cruise green, shift up mid-run, and jump in the 12 steps after you turn yellow, before the green floor lets you go. |

## World 3 — Ground (Must, M3)

Specs for these pieces are due before M3 (GDD §7.1).

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w3-1 | Red Wall | NEW: colored walls stop only their own color. | A red bridge ends at a white pad and then a red wall across the corridor: arrive red, shift down on the pad, and be yellow by the wall so you slip through it. |
| w3-2 | Mud | NEW: mud caps you at green. | A red bridge runs straight into 3 tiles of mud and then a green bridge, with no white pad to brake on: the mud caps your gear at green and brakes you there in ~1.9 tiles, so you cross the green bridge. Arrive slower than green and the bridge drops you. |
| w3-3 | Ice | NEW: on ice your speed and gear are locked. | A long ice floor leads straight onto a green bridge with no stone between: pick green on the short stone before the ice, because nothing you press on the ice changes your speed. |
| w3-4 | Boost | NEW: boost pads set you to sprint instantly. | A boost pad on a 2-tile platform with no runway is the only way to get a red takeoff over an 8-tile gap; you land yellow on the far pad. |
| w3-5 | Camera | NEW: camera gates admit only their gear. | A green camera gate stands between two yellow bridges on a white pad: drop to green on the pad to pass the gate, then build back to yellow before the second bridge. |

## World 4 — Relative (Should, M3)

Conveyors and moving platforms add their speed to your world velocity; colored tiles read your legs, camera gates read the world (GDD §7.1). Specs due before M3.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w4-1 | Belt | NEW: conveyors move you without changing your color. | A blue conveyor running right carries a blue walker fast enough to clear a gap a blue jump never could, while staying solid on the blue belt. |
| w4-2 | Treadmill | NEW: camera gates read world speed, not leg speed. | A white camera gate sits on a red belt running toward you: sprint against the belt so your legs are red (solid on the belt) while the world sees you standing still, and the gate opens. |
| w4-3 | Lift | NEW: a moving platform adds its speed to your jump. | Jumping from a platform sliding right turns a green takeoff into a jump long enough to reach a far green pad, as long as you jump while it moves your way. |
| w4-4 | Crate | NEW: crates take and keep the color you push them at. | Push a crate at green into a pit so it becomes a green step, then come back green to climb on it to the exit ledge. |

## World 5 — Afterimage (Should, M3)

Depends on the afterimage rule (GDD §7.1, open question 3). Sketches assume the candidate rule: while red and airborne you leave ghost tiles along your path that last 3 s and hold you up when you are not red.

| Id | Title | Idea | Puzzle sketch |
|---|---|---|---|
| w5-1 | Afterimage | NEW: sprinting through the air leaves ghost platforms behind you. | Sprint-jump across a pit onto a white pad, turn around, and hop back onto your own fading ghosts to reach the exit hanging above the pit. |
| w5-2 | Ghost Bridge | NEW: ghosts are only for your slower self. | A gap too wide for any jump: lay a ghost line with a red jump that falls short onto a lower ledge, then cross at green on the ghosts before they fade. |
| w5-3 | Long Shadow | COMBINE: afterimage and air drag. | Only the first 6 tiles of a sprint jump leave ghosts (you turn yellow after that), so take off from exactly the right ledge to lay ghosts where you need them. |
| w5-4 | Redshift | COMBINE: finale using runway, braking, drag, colored walls and ghosts. | One long room: build to red, coast a gap, brake through a red wall, and climb your own afterimage to the exit. |

## Summary

| World | Levels | Priority | Milestone |
|---|---|---|---|
| 1 Gears | 4 | Must | M2 |
| 2 Flight | 4 | Must | M2 |
| 3 Ground | 5 | Must | M3 |
| 4 Relative | 4 | Should | M3 |
| 5 Afterimage | 4 | Should | M3 |
| **Total** | **21** | 13 Must, 8 Should | |
