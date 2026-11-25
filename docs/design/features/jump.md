# Feature: Jump, gravity, coyote time, jump buffer

_Owner: design-lead. Milestone: M1. GDD: §4.10, §5.3._

## Rule

Jump launches the player straight up at a fixed speed so the feet peak exactly `jumpHeightTiles` (3) above takeoff after `jumpTimeToApexMs` (24 steps), at every gear; horizontal speed at takeoff is kept for the whole flight, so faster gears jump farther, not higher. Coyote time and jump buffering each give 6 steps of slack.

## Details

- Gravity `g = 2h/t²` = 37.5 tiles/s², launch speed `2h/t` = 15 tiles/s. Derived from tuning at load.
- Vertical integration per step: `y += vy·dt + ½·g·dt²`, then `vy += g·dt`, capped at `maxFallSpeed` (20 tiles/s downward).
- Jump fires on the step it is pressed if grounded or in coyote time, after that step's ground speed update. Launch: `vy` = 15 up; airborne; grace ended; drag counter 0; coyote consumed.
- **Coyote:** after leaving the ground without jumping (walk-off, falling through a tile, grace expiry), a jump is allowed for 6 steps.
- **Buffer:** a jump pressed while airborne (outside coyote) is remembered for 6 steps; if the player lands in that window, it fires on the next step.
- No variable height.

## Edge cases

- **Standing jump** (nothing held): straight up and down, lands where it started.
- **J and an arrow on the same step from standing:** the ground update runs first, so takeoff is at walking pace (3). The launch step averages 0 and 3, so this jump lands 2.375 tiles out, 0.025 short of a jump from a walking cruise (2.4).
- **Walking off a ledge** (no jump): gravity starts on the step after the walk-off step (leaving the ground is detected after gravity in the step order), so a walk-off flies one step longer than the fall alone. Coyote time is unaffected.
- **Ceiling bonk:** `vy` ← 0 on contact, horizontal speed and gear unchanged. A coloured ceiling only bonks when it matches.
- **Jumping into a ledge face:** wall stop (`vx` 0) and the air rule drops the gear to 1. Jump earlier: feet reach 1 tile on step 5 and 2 tiles on step 10 of the rise.
- **Ledges:** 2 tiles is the highest climbable. 3-tile ledges are forbidden in levels.
- **Jump during grace:** allowed; you are grounded.
- **Jump from a buffered landing** uses the post-landing gear and one ground update with the held direction.
- **Holding J** does not auto-repeat; each jump needs a new press.
- **Arrows in the air** do nothing to the arc (see `air-drag.md`).

## Tuning

`jumpHeightTiles`, `jumpTimeToApexMs`, `maxFallSpeed`, `coyoteMs`, `jumpBufferMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. "Flight step" counts from the launch step (= 1).

1. **Arc from standing.** Standing, nothing held, jump: feet height 3.00 on flight step 24, never higher; lands on flight step 48; x unchanged.
2. **Same height at every gear.** Cruising at gears 1, 2, 3, 4 and jumping: maximum feet height 3.00 each time; air time 48 steps each time.
3. **No variable height.** Two runs, J held for 1 step vs 40 steps: identical state on every step.
4. **Derived values (unit).** Gravity = 37.5 and launch speed = 15 (±1e-9) from the shipped tuning.
5. **Walking takeoff.** Standing, press J and hold R on the same step: `vx` = 3 at launch; lands on flight step 48, 2.375 tiles out (the launch step moves (0 + 3)/2 × dt, the other 47 steps 3 × dt each).
6. **Coyote yes.** Cruising at gear 1, walk off a ledge. Press J on the 5th airborne step: the jump launches.
7. **Coyote no.** Same, press J on the 8th airborne step (and not before): no jump.
8. **Buffer yes.** Standing jump; press J again on flight step 44 (landing at 48): a new jump launches on the step after landing (flight step 49).
9. **Buffer no.** Same, press on flight step 38 only: no second jump.
10. **Ceiling.** Cruising at gear 2 under a safe ceiling 2 tiles above the head, jump: on the contact step `vy` ≥ 0, `|vx|` = 6, gear 2; the player falls back to the floor.
11. **2-tile ledge.** Cruising at gear 1 toward a 2-tile-high safe step; jump when the box's front edge is 1.0 tile from the face: the player lands on top, gear 1.
12. **Fall cap.** Walk off into a 20-tile drop: downward `vy` never exceeds 20.

## Priority

Must.
