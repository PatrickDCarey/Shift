# Feature: Movement and gears

_Owner: design-lead. Milestone: M1. GDD: §3, §4.1–4.5, §4.10, §4.13._

## Rule

The player auto-runs: Right/Left Shift choose a target gear 0–4 (only on the ground), the direction keys choose a heading, and actual speed moves toward `heading × gearSpeeds[gear]` at a rate that makes each gear segment take a fixed ground distance (1.25 tiles up, 1.25 tiles down). The player's color band comes from actual speed, never from the selected gear.

## Details

- Segment accelerations: `accel[n] = (v[n+1]² − v[n]²) / (2 × tilesPerGearChange)`, `brake[n]` the same with `brakeTilesPerGearChange`. Accelerating uses the largest n with `v[n] ≤ speed`; braking uses the largest n with `v[n] < speed`. Chosen from the speed at the start of the step; clamp at the target, never overshoot.
- Position advances by `(oldSpeed + newSpeed) / 2 × dt`.
- Band: `band = count of colorBandEdges ≤ |vx|`. No hysteresis. Exactly on an edge = higher band.
- Reversal: if velocity opposes heading, brake toward 0. If the band is ≤ `pivotMaxBand` at the start of a grounded step, flip the velocity sign instantly (same magnitude) and continue normally.
- Wall stop: blocked horizontally by any solid tile → stop at contact, `vx = 0`, `gear = 0`.

## Edge cases

- **Shift presses in the air** go to the shift buffer (see `air-drag.md`); they are never applied mid-air.
- **Gear clamps** at 0 and 4. Extra presses do nothing and are not stored.
- **Shifting several times quickly:** each press changes the target immediately. The ramp rate depends only on current speed, so spreading presses over a few steps gives the same result as pressing them all at once until speed reaches the intermediate target.
- **Shift down mid-ramp** (speed below the old target, above the new one): starts braking at once.
- **Both direction keys on the same step:** heading unchanged.
- **Direction press at gear 0, standing still:** turns only. No movement.
- **Reversing at speed:** skid with normal braking, passing down through every lower band (which will drop you off a colored floor after grace). The gear is unchanged. Once the band is blue or white, pivot instantly. Heading back the original way mid-skid: accelerate again.
- **Left vs right:** perfectly mirrored. No rule depends on the sign.
- **Pressed against a wall in the heading direction with gear > 0:** the ramp produces a tiny speed, the wall stop zeroes it and sets gear 0 on the same step. Net effect: you can't shift up into a wall.
- **Wall stop in the air:** same rule; the player then falls straight down.
- **Step-up of any height** is a wall. There are no slopes.

## Tuning

`stepHz`, `gearSpeeds`, `tilesPerGearChange`, `brakeTilesPerGearChange`, `pivotMaxBand`, `colorBandEdges`, `playerWidthTiles`, `playerHeightTiles`.

## Acceptance

### Test conventions (apply to all M1 feature specs)

- Use the shipped `src/data/tuning.json`.
- **Flat floor:** a long row of grey tiles; the player spawns standing on it, gear 0, heading right, unless stated.
- **"Press K on step n"** means K goes down on step n and up on step n+1. Step 1 is the first simulated step after spawn.
- **Cruising at gear g** means the player has been on flat ground at `|vx| = gearSpeeds[g]` for at least 10 steps.
- **Distance** is the change in the player's center x. **Height** is the player's feet above the takeoff floor.
- Tolerances unless stated: step numbers ±2, distances ±0.15 tiles. Speeds set by snapping (gear speeds, drag drops, pivots, wall stops) must be exact.

### Checks

1. **Runway from rest.** On a flat floor press Right Shift on steps 1, 3, 5, 7. The band becomes 1 on step 25, 2 on step 59, 3 on step 72, 4 on step 81 (distance 4.45). `|vx|` equals 12 exactly from step 84 (distance 5.02) and stays 12. The band is never 4 while the distance is below 4.0 tiles.
2. **No overshoot.** In check 1, `|vx|` never exceeds `gearSpeeds[gear]` on any step.
3. **One gear up.** Cruising at gear 3, press Right Shift on step s. Band 4 on step s+4 (0.66 tiles later). `|vx|` = 12 on step s+8 (1.42 tiles).
4. **Braking.** Cruising at gear 4, press Left Shift on steps s, s+2, s+4, s+6. Band 3 on s+4, band 2 on s+12, band 1 on s+26, band 0 on s+58. `vx` = 0 exactly from step s+83, 4.87 tiles after s.
5. **Clamping.** From rest, press Right Shift 6 times (odd steps 1–11): gear is 4. Then press Left Shift 6 times: gear is 0. At rest in gear 0, Left Shift leaves gear 0.
6. **Mirror.** Repeat check 1 with heading left (press Left on step 1, then the shifts on 3, 5, 7, 9): every band change happens the same number of steps after the first Right Shift press as in check 1, and distances are exact mirrors (identical magnitudes, opposite sign).
7. **Reversal from sprint.** Cruising at gear 4 heading right, press Left on step s. `vx` stays positive and decreases until the pivot step s+26 (3.24 tiles past s). On the pivot step `vx` becomes negative with `|vx|` in [3, 4.5). `vx` = −12 exactly by step s+53. The gear stays 4 throughout. The band goes 4, 3, 2, 1, then back up to 4.
8. **Walking pivot.** Cruising at gear 1 heading right, press Left on step s: `vx` = −3 exactly at the end of step s.
9. **Turn in place.** At rest in gear 0, press Left: heading becomes −1, `vx` stays 0, x unchanged for 60 steps.
10. **Wall stop.** Cruising at gear 4 toward a grey wall: on the contact step `vx` = 0, gear = 0, band = 0, and the player's box edge is within 0.01 tiles of the wall face without overlapping it.
11. **Can't shift into a wall.** Standing in contact with a wall, heading into it, press Right Shift: at the end of that step gear = 0 and `vx` = 0.
12. **Band function (unit).** With the shipped edges: band(0) = 0, band(1.49) = 0, band(1.5) = 1, band(4.5) = 2, band(7.49) = 2, band(7.5) = 3, band(10.5) = 4, band(12) = 4.
13. **Segment accelerations (unit).** Derived `accel` = `brake` = [3.6, 10.8, 18.0, 25.2] (±1e-9).

## Priority

Must.
