# Feature: Air commitment and air drag

_Owner: design-lead. Milestone: M1. GDD: §4.9, §5.3–5.5._

## Rule

In the air nothing you press changes your speed: held directions don't steer, letting go doesn't brake, and shifts wait for landing. Your gear can only fall to match your colour, and every `airDragTilesPerGear` (6) tiles of horizontal flight instantly drops you one band (speed snaps to the next lower gear speed), never below blue.

## Details

- **Airborne** = not supported this step (after a jump, walking off, falling through).
- **Held directions in the air** update facing only.
- **Drag counter** starts at 0 when leaving the ground, adds `|Δx|` actually moved on each step in the air (after wall collision; "in the air this step" = not grounded at both start and end, so the takeoff or walk-off step and the landing step count), resets to 0 on landing. It also runs during coyote time. At or below `airDragMinBand` it keeps adding up but can never cause a drop; the HUD hides the drag meter then.
- **Walk-off:** leaving the ground is detected after gravity in the step order, so the walk-off step itself has no gravity; the flight is one step longer than the fall alone (GDD §4.10, §5.4).
- When the counter ≥ 6 and band > `airDragMinBand`: `|vx| ← gearSpeeds[band − 1]` (sign kept), counter −= 6. At most one drop per step.
- Every airborne step, after drag and band update: `gear ← max(minGear, min(gear, band))`.
- **Shift buffer:** a shift press in the air adds ±1 to a buffered net count and restarts a 6-step window (`shiftBufferMs`). If the window runs out, the buffer clears. On the landing step the buffered count is applied, clamped 1–4.
- **After landing**, the ground rules use whatever is held on the next step: same direction cruises in the current gear, nothing held brakes to a stop, opposite direction skids.

## Edge cases

- **Takeoff while ramping** (gear 4, band 3): gear becomes 3 on the launch step. Holding R after landing cruises at 9; shift up again to sprint.
- **Takeoff after a downshift** (gear 2, band 4): gear stays 2. After landing (holding), braking toward 6 continues.
- **Takeoff mid-band** (10.5, red): first drop snaps to 9, same as from 12.
- **Blue or white in the air:** no drag. A standing jump stays at 0; the gear stays 1.
- **Wall hit in the air:** `vx` 0, band 0, gear drops to 1 (the air rule); the counter stops growing.
- **Letting go before takeoff** brakes on the ground until the jump step; takeoff speed is whatever the ground update left.
- **Shift buffer and jump buffer on the same landing:** landing rules run first (drag reset, shift buffer applied), then the next step does one ground update with the held direction, then the buffered jump fires.
- **Drop on the landing step:** drag runs before landing in the step order; the player lands in the lower band.

## Tuning

`airDragTilesPerGear`, `airDragMinBand`, `gearSpeeds`, `minGear`, `shiftBufferMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. "Flight step" counts from the launch step (= 1). Unless stated, the direction key stays held through the flight.

1. **Sprint jump, flat.** Cruising at gear 4, jump onto flat ground. On flight step 30, when air distance first reaches 6.0, `|vx|` becomes exactly 9 and gear 3. Landing on flight step 48, 8.70 tiles from launch x. After landing, still holding R: band 3, gear 3, `|vx|` stays 9 for the next 60 steps.
2. **Jog jump, flat.** Cruising at gear 2, jump: no drop; lands 4.8 tiles out, `|vx|` = 6, gear 2.
3. **Run jump, flat.** Cruising at gear 3, jump: drop on flight step 40 to `|vx|` = 6; lands 6.8 tiles out in band 2, gear 2.
4. **Walk-off keeps red.** Cruising at gear 4 off a 4-tile-high ledge (no jump). Count airborne steps from the walk-off step (the first step that ends unsupported) = 1 through the landing step: 29 steps. Lands 5.80 tiles past the x of the last grounded step, with `|vx|` = 12, band 4, no drop.
5. **Two drops.** Cruising at gear 4, jump off a ledge onto ground 7 tiles lower: drops on flight steps 30 and 70; lands on flight step 70 (the second drop happens on the landing step, before landing in the step order) with `|vx|` = 6, band 2.
6. **Drag floor.** Cruising at gear 1, walk off into a 40-tile drop: `|vx|` = 3 on every airborne step and on landing.
7. **Standing jump.** Standing, no direction held, jump: `vx` = 0 throughout, band 0, gear 1.
8. **No steering.** Two runs of check 1: in one, hold L for the whole flight; in the other, hold nothing during the flight. Both have exactly the same `vx`, x and y as check 1 on every flight step up to landing.
9. **Let go mid-air, then land.** Check 1, but release R on flight step 10 and hold nothing after: lands at `|vx|` = 9, then stops 2.54 tiles after the landing step (on the 28th step after landing), passing band 2 and band 1.
10. **Counter resets on landing.** Check 1, pressing J again 3 steps before landing (flight step 45, buffered). The second jump fires on the step after landing; in that flight (launched at `|vx|` = 9) the first drop happens on its step 40.
11. **Gear follows band at takeoff.** Hold R from spawn, press `+` on run steps 1, 3, 5; jump on run step 26 (band 3). Gear is 3 at the end of the launch step and is ≤ 3 on landing.
12. **Downshift kept.** Cruising at gear 4, press `-` on action steps 1 and 3, jump on step 4. At the end of step 3: band 4 (`|vx|` 10.74), gear 2. The launch step's ground update brakes once more, so takeoff is at 10.32 (band 3) with gear 2: gear stays 2 for the whole flight.
13. **No mid-air shift.** Standing jump; press `+` on flight step 10: gear stays 1 through the flight and after landing.
14. **Shift buffer.** Standing jump; press `+` on flight step L−4, where L is the landing step: gear is 2 at the end of step L. Pressed on step L−10 instead: gear 1 after landing.
15. **Wall in the air.** Cruising at gear 4, jump toward a safe wall 3 tiles away: on contact `vx` = 0, gear becomes 1; no drag drop afterward; the player falls straight down.

## Priority

Must.
