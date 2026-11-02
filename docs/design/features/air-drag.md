# Feature: Air commitment and air drag

_Owner: design-lead. Milestone: M1. GDD: §4.8, §5.3–5.4._

## Rule

In the air you cannot shift, your gear can only fall to match your color, and every `airDragTilesPerGear` (6) tiles of horizontal flight instantly drops you one band (speed snaps to the next lower gear speed), never below blue.

## Details

- **Airborne** = not supported this step (after a jump, walking off, falling through).
- **Drag counter** starts at 0 when leaving the ground, adds `|Δx|` actually moved each airborne step (after wall collision), resets to 0 on landing. It also runs during coyote time.
- When the counter ≥ 6 and band > `airDragMinBand`: `|vx| ← gearSpeeds[band − 1]` (sign kept), counter −= 6. At most one drop per step.
- Every airborne step, after drag and band update: `gear ← min(gear, band)`.
- **Shift buffer:** a shift press in the air adds ±1 to a buffered net count and restarts a 6-step window (`shiftBufferMs`). If the window runs out, the buffer clears. On the landing step the buffered count is applied to the gear, clamped 0–4.

## Edge cases

- **Takeoff while ramping** (gear 4, band 3): gear becomes 3 on the launch step. You land in gear 3 and must shift up again.
- **Takeoff after a downshift** (gear 2, band 4): gear stays 2 (it's already lower). After landing, braking toward gear 2 continues.
- **Takeoff mid-band** (10.5 tiles/s, red): the first drop snaps to 9, same as from 12. Slower takeoff just covers the 6 tiles more slowly.
- **Blue or white in the air:** no drag. A gear-1 player keeps 3 tiles/s through any fall. A standing jump (0) stays at 0.
- **Wall hit in the air:** `vx` 0, gear 0; the counter stops growing (no horizontal movement).
- **Direction press in the air:** changes heading only; velocity is unchanged until landing.
- **Landing color** is whatever the band is at the landing step; there is no "re-acceleration" because the gear already equals or is below that band.
- **Shift buffer and jump buffer on the same landing:** landing rules run first (drag reset, shift buffer applied), then the buffered jump fires on the next step with the new gear target.
- **Drop on the landing step itself:** drag is applied in the step order before landing; the player lands in the lower band.

## Tuning

`airDragTilesPerGear`, `airDragMinBand`, `gearSpeeds`, `shiftBufferMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. "Launch step" is the step the jump fires; flight steps count from it.

1. **Sprint jump, flat.** Cruising at gear 4, jump onto flat ground. On flight step 30 (±1), when air distance first reaches ≥ 6.0, `|vx|` becomes exactly 9 and gear 3. Landing on flight step 48 (±1), 8.7 tiles from the launch x. After landing: band 3, gear 3, `|vx|` stays 9 for the next 60 steps.
2. **Jog jump, flat.** Cruising at gear 2, jump: no drop; lands 4.8 tiles out, `|vx|` = 6, gear 2.
3. **Run jump, flat.** Cruising at gear 3, jump: drop on flight step 40 (±1) to `|vx|` = 6; lands 6.8 tiles out in band 2, gear 2.
4. **Walk-off keeps red.** Cruising at gear 4 off a 4-tile-high ledge (no jump): lands 5.6 tiles out with `|vx|` = 12, band 4.
5. **Two drops.** Cruising at gear 4, jump off a ledge onto ground 7 tiles lower: drops on flight steps 30 and 70 (±1); lands with `|vx|` = 6, band 2.
6. **Drag floor.** Cruising at gear 1, walk off into a 40-tile drop: `|vx|` = 3 on every airborne step and on landing.
7. **Standing jump.** At rest, jump: `vx` = 0 throughout, band 0.
8. **Counter resets on landing.** Do check 1, and press jump 3 steps before landing (buffered). In the second flight (launched at `|vx|` = 9) the first drop happens on that flight's step 40 (±1), not earlier.
9. **Gear follows band at takeoff.** From rest, press Right Shift on steps 1, 3, 5, 7; jump on step 75 (band 3). Gear is 3 at the end of the launch step and is ≤ 3 on landing.
10. **Downshift kept.** Cruising at gear 4, press Left Shift twice then jump on the next step (band 4, gear 2): gear stays 2 for the whole flight.
11. **No mid-air shift.** Jump from rest; press Right Shift on flight step 10: gear stays 0 through the flight and after landing.
12. **Shift buffer.** Jump from rest; press Right Shift on flight step L−4, where L is the landing step: gear is 1 at the end of step L, and `|vx|` increases from step L+1. Pressed on step L−10 instead: gear 0 after landing.
13. **Wall in the air.** Cruising at gear 4, jump toward a grey wall 3 tiles away: on contact `vx` = 0, gear 0; no drag drop occurs afterward; the player falls straight down.

## Priority

Must.
