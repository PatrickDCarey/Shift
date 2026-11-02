# Feature: Movement and gears (hold-to-move)

_Owner: design-lead. Milestone: M1. GDD: §3, §4.1–4.6, §4.11, §4.14._

## Rule

Hold Left or Right to move; your speed heads toward the selected gear's speed in that direction, and letting go brakes you to a stop. The Shift keys (and Q/E, Z/X) pick the gear 1–4 on the ground, and it stays selected when you let go. Speeds up to walking pace (3 tiles/s) change instantly; above that, each gear segment takes 1.25 tiles of ground to speed up through and 1.25 to slow down through. Your color band comes from actual speed, never from the selected gear.

## Details

- **Direction d:** one of `L`/`R` held → that way; neither → 0; both → the more recently pressed; both pressed on the same step → 0 until one is released. Facing becomes d whenever d ≠ 0.
- **Target velocity** on the ground: `d × gearSpeeds[gear]`.
- **Walking range is instant:** within 0 to `gearSpeeds[instantMaxGear]` (3), start, stop and turn take no distance. A turn at or below 3 goes straight to `min(|T|, 3)` the other way on the same step.
- **Running range:** segments 1–3 use `accel[n] = (v[n+1]² − v[n]²) / (2 × tilesPerGearChange)` and `brake[n]` likewise with `brakeTilesPerGearChange` (10.8, 18.0, 25.2). Accelerating uses the largest n with `v[n] ≤ speed`; braking uses the largest n with `v[n] < speed`. Chosen from the speed at the start of the step; clamp at the target, never overshoot.
- **Letting go, shifting down and skidding** all use the same braking rule.
- Position advances by `(vx_old + vx_new) / 2 × dt`.
- **Band** = count of `colorBandEdges` ≤ `|vx|`. No hysteresis; exactly on an edge = higher band.
- **Gears** 1–4 (`minGear` 1), start in `startGear` (1). Shift presses only apply on the ground.
- **Bindings:** Right Shift, E, X → shift up (`+`); Left Shift, Q, Z → shift down (`-`). All active at once.
- **Wall stop:** blocked horizontally by a solid tile → stop at contact, `vx = 0`. Gear unchanged.

## Edge cases

- **Shift presses in the air** go to the shift buffer (see `air-drag.md`).
- **Gear clamps** at 1 and 4. Extra presses do nothing and are not stored.
- **Shifting while standing still** changes the gear only; nothing moves until you hold a direction.
- **Shifting several times quickly:** each press changes the target immediately. The ramp rate depends only on current speed, so spreading presses over a few steps gives the same result as pressing them together, unless speed reaches an intermediate target first.
- **Downshift while holding** brakes to the new cruise speed and holds it. **Letting go** brakes all the way to 0 (the last 3 tiles/s instantly).
- **Letting go at running speed then holding again** before stopping: accelerates again from the current speed, no instant step.
- **Reversing at running speed** is a skid through every lower band, then an instant turn at walking pace, then acceleration the other way. Gear unchanged. Letting go mid-skid keeps braking to a stop.
- **Left vs right:** perfectly mirrored.
- **Holding into a wall:** each step the instant start produces 3 tiles/s and the wall stop zeroes it. The player stays at the wall, band white, gear unchanged.
- **Wall stop in the air:** same rule; the player falls straight down; the air rule lowers the gear to 1 (band white).
- **Steps up of any height** are walls. No slopes.
- **Feathering** (tapping the arrow to hover near a band edge) is allowed; flicker that results is the player's own doing.

## Tuning

`stepHz`, `gearSpeeds`, `minGear`, `startGear`, `instantMaxGear`, `tilesPerGearChange`, `brakeTilesPerGearChange`, `colorBandEdges`, `playerWidthTiles`, `playerHeightTiles`.

## Acceptance

### Test conventions (apply to all M1 feature specs)

- Use the shipped `src/data/tuning.json`.
- **Flat floor:** a long row of safe tiles (`#`); the player spawns standing on it, gear 1, facing right, unless stated.
- **Input** is given as held buttons per step, as in solution files (`L R J + -`). "Press `+` on step n" means `+` is held on step n only (an edge). "Hold R" means R is held every step until stated otherwise.
- **Run steps** count from 1 at spawn. **Action steps** count from 1 on the step an action (a press, a release, a direction change) first appears in the input.
- **Cruising at gear g** means holding a direction on flat ground at `|vx| = gearSpeeds[g]` for at least 10 steps.
- **Distance** is the change in the player's center x since the step before action step 1 (or since spawn). **Height** is the player's feet above the takeoff floor.
- Tolerances unless stated: step numbers ±2, distances ±0.15 tiles. Speeds set by snapping (instant walking-range changes, gear speeds, drag drops, wall stops) must be exact.

### Checks

1. **Runway from standing.** Hold R from run step 1 and press `+` on run steps 1, 3, 5. `vx` = 3 exactly at the end of step 1 (band 1). Band 2 on step 10, band 3 on step 23, band 4 on step 32 (distance 3.23). `vx` = 12 exactly from step 36 (distance 4.00) and stays 12. The band is never 4 while the distance is below 3.0.
2. **No overshoot.** In check 1, `|vx|` never exceeds `gearSpeeds[gear]` on any step.
3. **Walking is instant.** Standing in gear 1: hold R → `vx` = 3 at the end of action step 1. Then release → `vx` = 0 at the end of that action step 1. Then hold L → `vx` = −3 at the end of that action step 1. While walking right at 3, switch to holding L → `vx` = −3 at the end of action step 1.
4. **One gear up.** Cruising at gear 3, press `+`: band 4 on action step 4 (0.66 tiles); `vx` = 12 on action step 8 (1.42 tiles).
5. **Let go from sprint.** Cruising at gear 4, release R (action step 1): band 3 on step 4 (0.74), band 2 on step 12 (1.91), band 1 on step 26 (3.24), `vx` = 0 exactly on step 35 (3.74). Gear stays 4.
6. **Let go from jog.** Cruising at gear 2, release: band 1 on action step 9 (0.78), `vx` = 0 on step 18 (1.29).
7. **Downshift while holding.** Cruising at gear 4, keep holding R, press `-` on action steps 1, 3, 5: band 1 on step 26 (3.24); `vx` = 3 exactly from step 34 (3.72) and stays 3. Gear 1.
8. **Gear persists through release.** Cruising at gear 3, release for 60 steps (player stops), then hold R again: gear is 3 throughout; `vx` reaches 9 on action step 28 of the new hold, 2.57 tiles later.
9. **Reversal from sprint.** Cruising at gear 4 holding R; on action step 1 switch to holding only L. `vx` stays positive and decreasing until action step 35, the turn step (3.72 tiles skidded), on which `vx` = −3 exactly. `vx` = −12 exactly from step 70. Net displacement at step 70: −0.25. Gear 4 throughout. Band goes 4, 3, 2, 1, then 2, 3, 4.
10. **Both directions.** Cruising at gear 1 holding R, also press L (R still held): `vx` = −3 on that step. Release L with R still held: `vx` = +3 on that step. From standing, R and L go down on the same step and stay held: `vx` stays 0.
11. **Clamping.** At spawn press `-`: gear stays 1. Press `+` five times (odd steps): gear 4.
12. **Shift while standing.** At spawn press `+` twice, hold nothing for 60 steps: gear 3, `vx` = 0, x unchanged.
13. **Mirror.** Check 1 with L instead of R: every band change on the same step, distances exact mirrors.
14. **Wall stop keeps gear.** Cruising at gear 4 into a safe wall: on the contact step `vx` = 0, gear 4, band 0, and the box edge is within 0.01 tiles of the wall face without overlapping it. Keep holding R for 30 steps: `vx` = 0 at the end of every step, no overlap. Then hold L: `vx` = −3 on action step 1, −12 by action step 36.
15. **Band function (unit).** band(0) = 0, band(1.49) = 0, band(1.5) = 1, band(4.5) = 2, band(7.49) = 2, band(7.5) = 3, band(10.5) = 4, band(12) = 4.
16. **Derived rates (unit).** `accel` = `brake` = 10.8, 18.0, 25.2 for segments 1–3 (±1e-9).
17. **Alternate bindings (e2e, input module).** In the running game, E and X each produce one `+` press, Q and Z each one `-` press, same as Right/Left Shift.

## Priority

Must.
