# Feature: Safe tiles, level bounds, death, restart, exit

_Owner: design-lead. Milestone: M1. GDD: §4.7, §4.11, §4.12._

## Rule

Safe tiles (`#`, drawn white/grey) are solid on every face at every color. Falling below the bottom of the level kills the player, who respawns at the start after `deathFreezeMs` (24 steps); R restarts instantly at any time. Every run, including after death, starts standing in `startGear` (1). Touching an exit tile completes the level.

## Details

- **Safe tiles** ignore band and grace. They are where you stop, turn and shift.
- **Bounds:** outside the grid to the left, right and above counts as safe solid; below the grid is open.
- **Death:** on the first step the top of the player's box is below the grid's bottom edge. The player is frozen (no movement; inputs ignored except R) for 24 steps, then respawned.
- **Respawn / restart** resets the whole run: standing on the bottom edge of the `@` cell, `vx = vy = 0`, gear = `startGear` (1), band 0, facing right, direction priority, drag counter, grace, coyote, jump buffer and shift buffer cleared, step counter 0. Restart takes effect on the step after R is pressed.
- **The selected gear does not survive a death or restart.**
- **Held buttons across a respawn** act normally from the first step of the new run; a button held through the respawn does not count as a new press (no shift or jump edge).
- **Exit:** the level completes on the first step the player's box overlaps an exit tile, at any band and gear. The exit is never solid. The sim then stops advancing the player and reports the completing step count as the run time.
- A run is one attempt. Deaths and restarts start a new run; the run time restarts.

## Edge cases

- **Color change on a safe floor** never drops you.
- **Straddling safe and colored:** safe holds you.
- **Stopping and turning at speed** are safe only on safe floors.
- **Safe walls** stop you like any wall (gear kept).
- **Exit and death on the same step:** exit wins.
- **R during the death freeze:** respawn on the next step.
- **R on the exit step:** ignored by the sim (menus handle what comes next).
- **Running into the left or right edge of the grid** is a normal wall stop. Jumping into the top edge is a normal ceiling bonk.

## Tuning

`deathFreezeMs`, `startGear`, `stepHz`, `playerWidthTiles`, `playerHeightTiles`.

## Acceptance

Test conventions: see `movement-and-gears.md`.

1. **Safe at every color.** For each band 0–4 (cruise at that gear; band 0 = standing), the player stays grounded on a 20-tile safe row over a pit.
2. **Safe walls at every gear.** For each gear 1–4, cruising into a safe wall: `vx` 0, gear unchanged.
3. **Color changes on safe floor.** Cruising at gear 2 on a safe floor: press `+`, later `-` twice, later release, later skid by holding L from gear 4: grounded on every step.
4. **Spawn state.** At spawn with nothing held for 60 steps: gear 1, `vx` 0, band 0, x unchanged.
5. **Fall-out death.** Walk off a floor into a pit that reaches the bottom of the grid: a death event fires on the first step the box top is below the grid bottom, and no earlier.
6. **Respawn timing and state.** After the death step d, the player is frozen until step d+24 and at the spawn on step d+25 (±1). The full sim state on the respawn step equals the state right after a fresh level load (every field compared except the previous-input record used for press edges).
7. **Gear resets.** Cruise at gear 3, die: after respawn, gear 1.
8. **Freeze ignores input.** Pressing `+`, J and holding L during the freeze changes nothing.
9. **Held through respawn.** Hold R through a death and respawn without releasing: on the first step of the new run `vx` = 3; gear 1; no shift or jump happens from buttons that were already held.
10. **Restart.** At any point mid-run (including mid-air and mid-skid), press R on step r: the state on step r+1 equals the fresh-load state (except the previous-input record).
11. **Restart skips freeze.** Press R 5 steps after a death: respawned on the next step.
12. **Exit.** Walk into an exit tile at gear 1: the level completes on the first overlapping step; the reported time equals that step count; further inputs don't change player state.
13. **Bounds.** Cruising at gear 4 into the right edge of a grid with no wall tile: wall stop. Jumping under the top edge of the grid with no ceiling tile: ceiling bonk.
14. **Determinism.** The same level and input recording, run twice, gives identical state on every step; a run after a restart gives the same states as a run from a fresh load with the same inputs.

## Priority

Must.
