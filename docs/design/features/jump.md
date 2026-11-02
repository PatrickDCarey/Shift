# Feature: Jump, gravity, coyote time, jump buffer

_Owner: design-lead. Milestone: M1. GDD: §4.9, §5.3._

## Rule

Jump launches the player straight up at a fixed speed so the feet peak exactly `jumpHeightTiles` (3) above takeoff after `jumpTimeToApexMs` (24 steps), at every gear; horizontal speed is kept, so faster gears jump farther, not higher. Coyote time and jump buffering each give 6 steps of slack.

## Details

- Gravity `g = 2h/t²` = 37.5 tiles/s², launch speed `2h/t` = 15 tiles/s. Derived from tuning at load.
- Vertical integration per step: `y += vy·dt + ½·g·dt²`, then `vy += g·dt`, capped at `maxFallSpeed` (20 tiles/s downward). This makes sampled heights lie exactly on the parabola.
- Jump fires on the step it is pressed if grounded or in coyote time. Launch: `vy` = 15 up; airborne; grace ended; drag counter 0; coyote consumed; `gear ← min(gear, band)`.
- **Coyote:** after leaving the ground without jumping (walk-off, falling through a tile, grace expiry), a jump is allowed for 6 steps.
- **Buffer:** a jump pressed while airborne (outside coyote) is remembered for 6 steps; if the player lands in that window, it fires on the next step.
- No variable height. Releasing or holding the key changes nothing after launch.

## Edge cases

- **Jump at gear 0:** straight up and down, lands where it started.
- **Ceiling bonk:** `vy` ← 0 on contact (then gravity), horizontal speed and gear unchanged. A colored ceiling only bonks when it matches.
- **Jumping into a ledge face:** that's a wall stop (gear 0). Jump earlier to clear it: feet reach 1 tile on step 5 and 2 tiles on step 10 of the rise.
- **Ledges:** 2 tiles is the highest climbable. 3 tiles equals the apex exactly and is forbidden in levels.
- **Jump during grace:** allowed; you are grounded.
- **Jump from a buffered landing** uses the post-landing gear (after the shift buffer).
- **Holding jump** does not auto-repeat; each jump needs a new press.
- **Fall speed cap** only affects falls longer than about 5.3 tiles below the apex.

## Tuning

`jumpHeightTiles`, `jumpTimeToApexMs`, `maxFallSpeed`, `coyoteMs`, `jumpBufferMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. "Flight step" counts from the launch step (= 1).

1. **Arc from rest.** Jump at rest on a flat floor: feet height 3.00 (±0.02) on flight step 24, never higher; lands on flight step 48 (±1); x unchanged.
2. **Same height at every gear.** Cruising at gears 1, 2, 3, 4 and jumping: maximum feet height is 3.00 (±0.02) each time; air time 48 (±1) steps each time.
3. **No variable height.** Two runs, jump key held for 1 step vs 40 steps: identical state on every step.
4. **Derived values (unit).** Gravity = 37.5 and launch speed = 15 (±1e-9) from the shipped tuning.
5. **Coyote yes.** Cruising at gear 1, walk off a ledge. Press jump on the 5th airborne step: the jump launches.
6. **Coyote no.** Same, press jump on the 8th airborne step (and not before): no jump; the player keeps falling.
7. **Buffer yes.** Jump from rest; press jump again on flight step 44 (landing at 48): a new jump launches within 1 step after landing.
8. **Buffer no.** Same, press on flight step 38 only: no second jump.
9. **Ceiling.** Cruising at gear 2 under a grey ceiling 2 tiles above the head, jump: on the contact step `vy` ≥ 0, `|vx|` = 6, gear 2; the player falls back to the floor.
10. **2-tile ledge.** Cruising at gear 1 toward a 2-tile-high grey step; jump when the box's front edge is 1.0 tile from the face: the player lands on top, with gear 1.
11. **Fall cap.** Walk off into a 20-tile drop: downward `vy` never exceeds 20.

## Priority

Must.
