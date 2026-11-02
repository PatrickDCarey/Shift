# Feature: Safe tiles, level bounds, death, restart, exit

_Owner: design-lead. Milestone: M1. GDD: §4.6, §4.10, §4.11._

## Rule

Grey terrain and white safe tiles are solid on every face at every color. Falling below the bottom of the level kills the player, who respawns at the spawn point after `deathFreezeMs` (24 steps); R restarts instantly at any time. Touching an exit tile completes the level.

## Details

- **Grey (terrain)** and **white (safe)** behave identically in the sim. White marks places designed for stopping, turning and shifting; grey is structure. Both ignore band and grace.
- **Bounds:** outside the grid to the left, right and above counts as grey solid; below the grid is open.
- **Death:** on the first step the top of the player's box is below the grid's bottom edge. The player is frozen (no movement, inputs ignored except R) for 24 steps, then respawned.
- **Respawn / restart** resets the whole run to its initial state: feet on top of the tile below the spawn marker, x at the spawn tile's center, `vx` = `vy` = 0, gear 0, band 0, heading = level spawn facing (default right), drag counter, grace, coyote, jump buffer, shift buffer all cleared, step counter 0. Restart takes effect on the step after R is pressed.
- **Exit:** the level completes on the first step the player's box overlaps an exit tile, at any band and gear. The exit is never solid. The sim then stops advancing the player and reports the completing step count as the run time.
- A run is one attempt. Deaths and restarts start a new run; the run time restarts.

## Edge cases

- **Color change on a safe floor** never drops you; grace is irrelevant there.
- **Straddling safe and colored:** safe holds you.
- **Turning around at speed** is safe only on safe/grey floors (you pass through lower bands).
- **Safe walls** stop you like any wall (gear 0).
- **Exit and death on the same step:** exit wins (checked first).
- **R during the death freeze:** respawn on the next step, skipping the rest of the freeze.
- **R on the exit step:** the level is already complete; R is ignored by the sim (menus handle what comes next).
- **Spawn facing a wall:** legal; the player must turn first.
- **Running into the left or right edge of the grid** is a normal wall stop. Jumping into the top edge is a normal ceiling bonk.

## Tuning

`deathFreezeMs`, `stepHz`, `playerWidthTiles`, `playerHeightTiles`.

## Acceptance

Test conventions: see `movement-and-gears.md`.

1. **Safe at every color.** For each band 0–4 (cruise at that gear; band 0 = standing), the player stays grounded on a 20-tile grey row over a pit and on a 20-tile white row over a pit.
2. **Safe walls at every color.** For each gear 1–4, cruising into a white wall and into a grey wall: wall stop (`vx` 0, gear 0).
3. **Color change on safe floor.** Cruising at gear 2 on a white floor, press Right Shift and later Left Shift twice: grounded on every step.
4. **Fall-out death.** Walk off the edge of a floor into a pit that reaches the bottom of the grid: a death event fires on the first step the box top is below the grid bottom, and no earlier.
5. **Respawn timing and state.** After the death step d, the player is frozen until step d+24 and is at the spawn on step d+25 (±1). The full sim state on the respawn step equals the state right after a fresh level load (every field compared).
6. **Freeze ignores input.** Pressing Right Shift and jump during the freeze changes nothing.
7. **Restart.** At any point mid-run (including mid-air and mid-skid), press R on step r: the state on step r+1 equals the fresh-load state.
8. **Restart skips freeze.** Press R 5 steps after a death: respawned on the next step.
9. **Exit.** Walk into an exit tile at gear 1: the level completes on the first overlapping step; the reported time equals that step count; further inputs don't change player state.
10. **Bounds.** Cruising at gear 4 into the right edge of a grid with no wall tile: wall stop. Jumping under the top edge of the grid with no ceiling tile: ceiling bonk.
11. **Spawn facing.** A level with spawn facing left: heading −1 at step 1; pressing Right Shift moves the player left.
12. **Determinism.** The same level and input recording, run twice, gives identical state on every step; a run after a restart gives the same states as a run from a fresh load with the same inputs.

## Priority

Must.
