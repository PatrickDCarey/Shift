# Feature: Speed gates

_Owner: design-lead. Milestone: M2 (pulled forward from world 3 by `mechanics-review.md`, 2026-11-03). GDD: §4.7, §4.14, §7. Level chars `w b g y r` (`docs/tech/level-format.md`; formerly "speed camera")._

## Rule

A gate tile of band k is solid on every face **unless the player's band is k**: it opens only for its own color. White gates (`w`, band 0) open only for a player at speed 0.

Player-facing reading: "a gate that only lets its color through". Colored blocks are the opposite ("a block that only exists for its color"); art must make the two impossible to confuse (see Readability).

## Details

- **Solid-for-player test** for a gate tile of band k: the band at the start of the step is **not** k **and** the player's box (at the start of the move) overlaps **no gate tile of band k** (no-embed, per gate band).
- **Gates are their own no-embed group.** Overlapping a green gate never makes green colored tiles (`G`) empty, and overlapping a `G` tile never opens green gates.
- **No grace.** Gates are never held by color grace and grace never opens one. `graceBand` affects colored tiles only, as before.
- **Same faces as any solid tile:** walls stop you (`vx` 0, gear kept, `wallStop` once per contact), floors support you, ceilings bonk you.
- **Band, not gear,** is tested, as for colored tiles (`docs/tech/architecture.md` §3).
- **Step order (GDD §4.14):** no new phase. Gates join the solidity test in phase 7 (Move X, walls) and phase 8 (Move Y, floors and ceilings, supported test), using the band at the start of the step. A band change in phase 10 affects gates from the next step. Phase 12 (grace) ignores gates.

## Edge cases

- **Becoming k on a k-gate floor** (shifting, letting go, skidding, ramping through k): the floor opens on the next step's move. Grounded at the end of the change step c, airborne at the end of c+1, coyote from c+1 (jump allowed on c+1 to c+6). This is the trapdoor.
- **Passing through k on a k-gate floor** while ramping or braking drops you too: braking from yellow to blue on a green-gate floor always passes green. Levels use this on purpose ("no green zone"); stops belong on safe tiles as usual.
- **Touching a gate you don't match while standing next to it:** holding the direction gives walking speed (blue) each step, which is blocked each step; `vx` is 0 at the end of every step and the band stays 0. You can never ramp up against a gate; back off and take a run.
- **Ramping through a gate:** only the band at the first step of overlap matters; once inside, no-embed keeps that gate band empty until the box is clear, so you may change color inside a thick gate.
- **Landing on a gate floor:** solid unless you match on the contact step (no grace on landing), so a mismatched gate floor is a landing pad and a matched one is a hole.
- **White gates:** on the ground the slowest moving speed is 3 (blue), so a `w` wall can't be passed horizontally. `w` is for floors (stand still to drop through) and ceilings (a standing jump passes up through). A player stopped by a wall in the air is white and falls through `w` floors.
- **Spawn:** never on or inside a gate (the run starts at band 0).
- **Level rule (no-embed side effect):** never hang a gate tile of band k less than 1.5 tiles above a gate floor of band k (same reason as GDD §6 for colored tiles).
- **Straddling:** if any tile under the box supports you (safe, matching colored, grace color, or a mismatched gate), you are supported.
- **Air drag mid-gate:** a drag drop while overlapping a gate keeps that gate band empty until the box is clear (no-embed), so a flight never stops inside a gate.
- **Exit inside or behind a gate:** exits are never solid; the gate decides whether you can reach the exit tile.
- **Future conveyors (cut):** gates test the band of the player's own speed `|vx|`. If a world-speed piece ever ships, this is revisited.

## Readability (requirements for art, never color alone)

- Gates are drawn as a **frame with bars** (or a hatch, for floor-only use), never as a filled tile, and carry the band's pattern/glyph from `palette.json`. A colored block is a filled tile with a flat lit top edge.
- **Open/closed** is shown by shape (bars retracted or drawn), not by hue or brightness alone, and must read in grayscale and under every color-vision simulation in `docs/art/accessibility.md`.
- The white gate uses the white/standing glyph so "stand still to open" reads at a glance.

## Tuning

No new keys. Uses `colorBandEdges`, `coyoteMs`, `jumpBufferMs`, `playerWidthTiles`, `playerHeightTiles`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. A "gate column" is a 1-tile-wide column of gate tiles standing on the floor and reaching the ceiling (no way over). A "pit" is a gap with no tiles below to the bottom of the level. "Launch x" = the player's x before the launch step; "flight step" counts from the launch step (= 1).

1. **Mismatched gate stops.** Cruising at gear 1 on a safe floor into a green gate column: on the contact step `vx` 0, gear 1, band 0, one `wallStop` event. Keep holding R for 30 more steps: `vx` 0 and band 0 at the end of every step, no further `wallStop`, the box never overlaps the gate.
2. **Matching gate admits.** Cruising at gear 2 into the same column: `vx` = 6 on every step; the player exits the far side.
3. **Band matrix.** For each cruising gear g in 1–4 and gate band k in 1–4 (`b g y r`): the player passes iff g = k, otherwise a wall stop with gear g kept.
4. **Ramp through.** Gear 4 selected, standing on a safe floor with the box's front edge 1.00 tile before a green gate column; hold R from action step 1: never blocked, `vx` never 0, band 4 reached on action step 32 (as GDD §5.1).
5. **Too close to ramp.** Same as 4 with the front edge 0.40 tiles before the gate: blocked on action step 8 (band 1 at the start of that step), `vx` 0, then as in check 1 (stuck at band 0 while holding).
6. **Too fast for the gate.** Same as 4 with the front edge 2.50 tiles before the gate: blocked on the contact step with band 3 at the start of that step.
7. **Trapdoor by shifting.** Cruising at gear 1 on a long row of green gate tiles over a pit (grounded every step). Press `+` on action step 1: band 2 on action step 9 (= c; as GDD §5.1). Grounded at the end of step c, airborne at the end of c+1. A jump pressed on step c+6 launches; a jump first pressed on step c+7 does not.
8. **Trapdoor by braking.** Cruising at gear 3 on a long row of green gate tiles over a pit, release R: band 2 on action step 6 (= c; as GDD §5.2), grounded at the end of c, airborne at the end of c+1. Same result pressing `-` instead of releasing.
9. **White gate floor.** Cruising at gear 1 on a long row of `w` tiles over a pit: grounded on every step. Release R: band 0 on action step 1 (= c), airborne at the end of c+1.
10. **Landing.** A gear-1 walking jump onto a flat green gate floor: lands, grounded, band 1. A gear-2 flat jump onto the same floor: never grounded on it. A gear-3 flat jump onto a green gate floor 6.8 tiles out (it drops to band 2 on flight step 40): never grounded on it.
11. **Ceilings.** Standing (band 0) under a green gate tile 1 tile above the head, jump: ceiling contact, `vy` ≥ 0 on the contact step. Cruising at gear 2 under the same tile, jump: no ceiling contact, apex 3.0 on flight step 24. Standing under a `w` tile 1 tile above the head, jump: no ceiling contact.
12. **No-embed.** Cruising at gear 2 into a 3-tile-thick green gate; press `+` on the first step the box overlaps it. Band 3 on action step 5 while inside; `vx` never 0; the player exits the far side in band 3.
13. **Separate groups.** A green gate column stands on a row of green colored tiles (`G`) over a pit. Cruising at gear 2 along the `G` row through the gate: grounded on every step, `vx` never 0.
14. **No grace on gates.** Cruising at gear 3 on a row of tiles alternating yellow colored (`Y`) and green gate (`g`) over a pit, release R. The band becomes 2 on action step 6 (= c). Whatever the box straddles, a `g` tile under it never supports it on steps c+1 onward; the `Y` tiles under it support it on c+1 to c+6 (grace); with the box over `g` only, it is airborne at the end of the first such step after c.
15. **Gate window in flight.** Cruising at gear 3 on a safe ledge; pit beyond; a yellow gate column with its face 4.0 tiles past launch x and a green gate column with its face 7.5 tiles past launch x, both spanning heights −2 to +5 relative to the ledge top; a safe floor 4 tiles below the ledge top from 7.5 tiles past launch x onward. Jump from cruise: the box first overlaps the yellow gate on flight step 25 (band 3) and the green gate on flight step 52 (band 2); `vx` never 0 in flight; drop to `|vx|` 6 on flight step 40; lands 8.10 tiles past launch x on flight step 61 in band 2 (as GDD §5.4, gear 3 to −4).
16. **Gate window rejects other paces.** Check 15 from gear 4: wall stop at the yellow gate on flight step 19 (band 4 at the start of the step), then gear 1. From gear 2: wall stop at the yellow gate on flight step 37 (band 2), then gear 1 and no drag drop.
17. **Events.** In checks 1, 5 and 16, exactly one `wallStop` per contact; in checks 7–9, a `land` event never fires on a gate tile after c.
18. **Determinism.** Checks 4–16 run twice give identical step-by-step state.

## Priority

Must (M2). Fallback if it slips past Nov 12: w2-04 moves to world 3 (M3), M2 ships 9 levels.
