# Feature: Color gating and color grace

_Owner: design-lead. Milestone: M1. GDD: §4.5–4.7, §4.10._

## Rule

A colored tile (blue, green, yellow, red) is solid on every face only while the player's band matches its color. When your color changes while you stand on a floor of your old color, that floor holds you for `colorGraceMs` (6 steps) before you fall, and you still get coyote time after that.

## Details

- **Solid-for-player test** for a colored tile: color matches the current band **and** the tile does not overlap the player's box (no-embed rule).
- **Grace start:** on a step where the player was grounded at the start and at the end, and the band changed, set `graceColor` = old band's color and `graceSteps` = 6.
- **Grace effect:** while `graceSteps > 0`, tiles of `graceColor` are floor-solid from above only (they support the feet; they do not block sideways or from below).
- **Grace end:** counts down each step; ends at 0, when the player leaves the ground, or when a newer grace replaces it.
- Grace is active for the move on the 6 steps after the band-change step. The player falls on the 7th, and coyote time then starts.

## Edge cases

- **Landing on a mismatched floor:** the floor is not there. You pass through. No grace on landing.
- **Walking onto a mismatched tile** from a matching or safe one: it's a hole. Coyote applies, grace does not.
- **Straddling:** if any tile under the box supports you (safe, matching, or grace color), you're supported.
- **Color change while overlapping a colored tile** (passing through a wall or floor): the tile stays empty for you until you stop overlapping it. You are never pushed out or trapped.
- **Walls and ceilings never get grace.** A green wall is not solid to a yellow player even during grace.
- **Second color change during grace** (yellow then quickly red): the grace color becomes the latest previous color (yellow); green stops holding you.
- **Jumping during grace:** allowed (you're grounded). Grace ends on takeoff, so you cannot land back on your old color with it.
- **Reversing on a colored floor** takes you down through lower bands, so grace starts and you fall. Intended.
- **Matching walls stop you** with the normal wall stop (`vx` 0, gear 0). Matching ceilings bonk you.
- **White band** has no colored tiles, so changing from white needs no grace.
- **Exactly on a band edge** counts as the higher band (see movement spec).

## Tuning

`colorBandEdges`, `colorGraceMs`, `coyoteMs`, `stepHz`.

## Acceptance

Test conventions: see `movement-and-gears.md`. A "pit" is a gap with no tiles below to the bottom of the level.

1. **Match holds.** Cruising at gear 1 across a 20-tile row of blue tiles over a pit: grounded on every step, never falls.
2. **Mismatch is a hole.** Cruising at gear 2 from a grey floor onto a row of blue tiles: the player is airborne on the first step no grey tile supports the box, and is never grounded on the blue row.
3. **No grace on landing.** A gear-4 flat jump (lands yellow) aimed at a green pad: the player passes through the pad without a grounded step on it.
4. **Grace window.** Cruising at gear 2 on a long green floor over a pit, press Right Shift on step s. Let c be the step the band becomes 3 (expected s+6). The player is grounded on steps c+1 to c+6 and airborne on step c+7 (exact relative to c).
5. **Grace plus coyote.** Same setup as check 4: a jump pressed on step c+11 launches; a jump pressed on step c+14 (no earlier press) does not.
6. **Jump in grace onto yellow.** Same setup, with a yellow ledge whose top is 2 tiles above the floor, spanning from 4 to 14 tiles past the player's x on step s: pressing jump on step c+3 lands the player on the yellow ledge in band 3 (flight is under 6 tiles, so no drag).
7. **Grace ends on takeoff.** Cruising at gear 2 on a long green floor over a pit, press Left Shift on step s; let c be the step the band becomes 1 (expected s+9). Jump on step c+1. The player comes down in band 1 onto the green floor and passes through it.
8. **Walls don't get grace.** Cruising at gear 2 on a grey floor toward a 1-tile-thick green wall 3 tiles ahead; press Right Shift so the band becomes 3 about 2 tiles before the wall: the player passes through the wall (`vx` never 0).
9. **Matching wall stops.** Cruising at gear 4 into a red wall: wall stop (`vx` 0, gear 0, band 0). Cruising at gear 3 into the same red wall: passes through.
10. **No-embed.** Cruising at gear 2 on a grey floor into a 3-tile-thick yellow wall; press Right Shift on the first step the box overlaps the wall. The band becomes 3 while inside; `vx` never becomes 0, and the player exits the far side at band 3 or 4.
11. **Ceilings.** Standing in band 0 under a blue tile 1 tile above the head, jump: passes through it. Cruising at gear 1 under the same blue ceiling, jump: `vy` becomes ≥ 0 on the contact step and `vx` is unchanged.
12. **Straddle.** Player at band 2 standing with the box half over a grey tile and half over a yellow tile above a pit: grounded indefinitely.
13. **Determinism.** Checks 4–7 run twice give identical step-by-step state.

## Priority

Must.
