# Feature: Colored walls and ceilings

_Owner: design-lead. Milestone: M2 (taught in w1-05, pulled forward from world 3 by `mechanics-review.md`, 2026-11-03). GDD: §4.7, §4.11, §4.14. No new engineering: the rule is built in M1 (`color-gating.md`); this spec fixes the level-facing behaviour and adds acceptance checks for walls met in flight and at speed._

## Rule

A colored tile (`B G Y R`) is solid on every face only while your band matches it, so a colored wall **stops only its own color** and a colored ceiling **bonks only its own color**. Every other band passes through it. A matching wall is a normal wall stop: `vx` 0, gear kept.

## Details

- Same solid-for-player test, no-embed (per color) and grace rules as `color-gating.md`. Grace never applies to walls or ceilings.
- **Step order (GDD §4.14):** walls in phase 7 (Move X), ceilings in phase 8 (Move Y), both with the band at the start of the step. A drag drop in phase 9 affects walls from the next step.
- A wall stop in the air sets band 0, and the air rule then lowers the gear to `minGear`; the player falls straight down (GDD §4.11).

## Edge cases

- **Matching wall as a brake:** the fastest stop in the game (one step), but the gear is kept. Holding on afterward starts at walking pace (blue, passes the wall) and ramps toward the kept gear.
- **Changing color inside a wall:** allowed (no-embed): arriving yellow at a red wall and shifting up inside it never stops you.
- **Drag mid-flight:** a wall in the air tests the band at the moment of contact, so a sprint jump is red for its first 6.0 tiles of flight and yellow after (GDD §5.3).
- **Walls on colored floors:** a red wall standing on a red floor is fine for a red player only if they never touch the wall; levels should stand colored walls on safe tiles.
- **Ceiling over a takeoff:** blocks only jumps of its color; a ceiling of a color you can't be on that floor is decoration.
- **Level rule:** never hang a colored tile less than 1.5 tiles above a floor of the same color (GDD §6).

## Readability

A colored wall reads as the same material as a colored floor (pattern, flat lit edge), in its solid or ghost state from `src/fx`. A wall the player can currently pass must look passable (ghost treatment), so a full-height ghost column reads as "open" and a solid one as "blocked". No new art beyond checking that a 3–5 tile tall column reads correctly in both states.

## Tuning

No new keys. Uses `colorBandEdges`, `airDragTilesPerGear`, `jumpHeightTiles`, `jumpTimeToApexMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. "Wall column" = a 1-tile-wide column of colored tiles from the floor to the ceiling, standing on safe tiles. "Launch x" = the player's x before the launch step; "flight step" counts from the launch step (= 1). These add to `color-gating.md` checks 11–14, which still apply.

1. **Wall brake keeps the gear.** Cruising at gear 4 into a red wall column: on the contact step `vx` 0, gear 4, band 0. Keep holding R: `vx` = 3 at the end of the next step and the box overlaps the wall on that step (band 1 passes red). Band 4 is first reached 3.23 tiles past the stop x (as GDD §5.1).
2. **Shift up inside a wall.** Cruising at gear 3 toward a 1-tile-thick red wall column; press `+` on the first step the box's front edge is within 0.20 tiles of the wall face. The box first overlaps the wall while in band 3; band 4 on action step 4; `vx` never 0; the player exits the far side in band 4.
3. **Red in flight, then yellow.** Cruising at gear 4, flat jump over a pit; a red wall column with its face 4.0 tiles past launch x, spanning heights −2 to +5 relative to the takeoff floor: wall stop on flight step 19 (band 4 at the start of the step); `vx` 0, then gear 1; no drag drop afterward.
4. **Drag lets you through.** Check 3 with the red wall's face 7.0 tiles past launch x: drop to `|vx|` 9 on flight step 30, the box first overlaps the wall on flight step 35 (band 3) and passes; `vx` never 0 in flight.
5. **Drag stops you.** Check 4 with a yellow wall instead: wall stop on flight step 35 (band 3 at the start of the step), then gear 1.
6. **Colored ceiling.** Cruising at gear 2 on a safe floor, flat jump under a row of green tiles whose bottom is 3.5 tiles above the floor, spanning 0.5 to 3.5 tiles past launch x: ceiling contact on flight step 11, `vy` ≥ 0 after it, `vx` = 6 unchanged. The same jump from gear 3: no ceiling contact, apex 3.0 on flight step 24, lands 6.8 tiles out in band 2.
7. **Determinism.** Checks 1–6 run twice give identical step-by-step state.

## Priority

Must (M2). Engineering cost: tests only.
