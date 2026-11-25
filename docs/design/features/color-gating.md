# Feature: Colour gating and colour grace

_Owner: design-lead. Milestone: M1. GDD: §4.6–4.8, §4.11._

## Rule

A coloured tile (`B` blue, `G` green, `Y` yellow, `R` red) is solid on every face only while the player's band matches its colour. When your colour changes while you stand on a floor of your old colour (shifting, letting go, skidding), that floor holds you for `colorGraceMs` (6 steps) before you fall, and you still get coyote time after that.

## Details

- **Solid-for-player test** for a coloured tile: colour matches the band at the start of the step **and** the player's box (at the start of the move) overlaps **no** tile of that colour (no-embed rule, per colour: while you are inside any colour-k tile, every colour-k tile is empty for you, including grace floors).
- **Grace start:** on a step where the player was grounded at the start and at the end, and the band changed, set `graceColor` = old band's colour and `graceSteps` = 6.
- **Grace effect:** while `graceSteps > 0`, tiles of `graceColor` are floor-solid from above only.
- **Grace end:** counts down each step; ends at 0, when the player leaves the ground, or when a newer grace replaces it.
- Grace is active for the move on the 6 steps after the band-change step. The player falls on the 7th, and coyote time then starts.

## Edge cases

- **Letting go on a coloured floor** brakes you through lower bands (or straight to white from walking pace), so you drop after grace. Stopping belongs on safe tiles. Intended.
- **Landing on a mismatched floor:** the floor is not there. No grace on landing.
- **Walking onto a mismatched tile** from a matching or safe one: it's a hole. Coyote applies, grace does not.
- **Straddling:** if any tile under the box supports you (safe, matching, or grace colour), you're supported.
- **Colour change while overlapping a coloured tile:** that whole colour stays empty for you until your box is clear of every tile of it. So a 3-tile-thick wall you turn its colour inside never stops you at its next column.
- **Per-colour side effect:** while inside a colour-k tile you cannot stand on a colour-k floor either. Levels avoid this by never hanging a coloured tile less than 1.5 tiles above a floor of the same colour (GDD §6).
- **Walls and ceilings never get grace.**
- **Second colour change during grace:** the grace colour becomes the latest previous colour.
- **Jumping during grace:** allowed. Grace ends on takeoff.
- **Reversing on a coloured floor** passes through lower bands: grace starts and you fall. A walking-pace turn on a blue floor is instant and stays blue: safe.
- **Matching walls stop you** with the normal wall stop (`vx` 0, gear kept). Matching ceilings bonk you.
- **White band** has no coloured tiles, so changing from white needs no grace.

## Tuning

`colorBandEdges`, `colorGraceMs`, `coyoteMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. A "pit" is a gap with no tiles below to the bottom of the level.

1. **Match holds.** Cruising at gear 1 across a 20-tile row of blue tiles over a pit: grounded on every step.
2. **Mismatch is a hole.** Cruising at gear 2 from a safe floor onto a row of blue tiles: airborne on the first step no safe tile supports the box; never grounded on the blue row.
3. **No grace on landing.** A gear-4 flat jump (lands yellow) aimed at a green pad: passes through without a grounded step on it.
4. **Grace window (shift).** Cruising at gear 2 on a long green floor over a pit, press `+` on action step 1. The band becomes 3 on action step 5 (= c; 6 + 5 × 0.3 lands exactly on the 7.5 edge, which is yellow). The player is grounded on steps c+1 to c+6 and airborne on c+7 (exact relative to c).
5. **Grace window (let go).** Cruising at gear 2 on a long green floor over a pit, release R. The band becomes 1 on action step 9 (= c). Grounded on c+1 to c+6, airborne on c+7.
6. **Walking stop on blue.** Cruising at gear 1 on a long blue floor over a pit, release R: band 0 on action step 1 (= c); grounded c+1 to c+6, airborne c+7.
7. **Walking turn on blue is safe.** Cruising at gear 1 on a blue floor over a pit, switch to holding L: band stays 1 on every step; never airborne.
8. **Grace plus coyote.** Setup of check 4: a jump pressed on step c+11 launches; a jump pressed on step c+14 (no earlier press) does not.
9. **Jump in grace onto yellow.** Setup of check 4 with a yellow ledge whose top is 2 tiles above the floor, spanning 4 to 14 tiles past the player's x at action step 1: pressing J on step c+3 lands the player on the yellow ledge in band 3.
10. **Grace ends on takeoff.** Cruising at gear 2 on a long green floor over a pit, keep holding R and press `-`; the band becomes 1 on action step 9 (= c). Jump on step c+1. The player comes down in band 1 onto the green floor and passes through it.
11. **Walls don't get grace.** Cruising at gear 2 on a safe floor toward a 1-tile-thick green wall 3 tiles ahead; press `+` on the first step the box's front edge is within 2.6 tiles of the wall face (setup, so the band becomes 3 on action step 5 with the front edge about 2 tiles from the wall): the player passes through the wall (`vx` never 0).
12. **Matching wall stops.** Cruising at gear 4 into a red wall: `vx` 0, gear 4, band 0. Cruising at gear 3 into the same wall: passes through.
13. **No-embed.** Cruising at gear 2 on a safe floor into a 3-tile-thick yellow wall; press `+` on the first step the box overlaps the wall. The band becomes 3 while inside; `vx` never becomes 0; the player exits the far side in band 3.
14. **Ceilings.** Standing (band 0) under a blue tile 1 tile above the head, jump: passes through it. Cruising at gear 1 under a row of blue ceiling tiles, jump: `vy` ≥ 0 on the contact step, `vx` unchanged.
15. **Straddle.** Standing still (band 0), box half over a safe tile and half over a yellow tile above a pit: grounded indefinitely.
16. **Determinism.** Checks 4–10 run twice give identical step-by-step state.

## Priority

Must.
