# Redshift — Puzzle depth review: which mechanics ship

_Superseded in part by GDD v1.4 (2026-11-03): the owner picked Tandem as the core twist (`core-twists.md`, `features/tandem.md`). Colored walls stay in world 1; speed gates and ice became Should (world 4); this review's world 3 is the fallback if the Tandem decision gate fails on Nov 12. The ranking and cuts below still stand._

_Owner: design-lead. 2026-11-03. Input: the studio owner's verdict on the current build ("the mechanics need a lot of work to make the puzzles better"), the 2026-11-02 grey-box playtest, GDD v1.2. Output: the mechanic set for M2/M3, adopted in GDD v1.3 §7 and `level-plan.md` v2.0. All numbers come from GDD §5 (exact against the implemented sim) or are derived from the same step rules; derivations are noted where §5 has no row._

## 1. Diagnosis: why worlds 1–2 feel thin

Every planned world 1–2 level reduces to **one requirement at one place**: "be color X on this floor". With red only 3.23 tiles from a standstill, a stop 3.74 tiles from sprint, and safe pads between the sections, the player can always satisfy one requirement at a time. A puzzle with one constraint has one obvious answer, so the player is executing, not deciding.

The decision space Redshift actually has (pillar 1, "pace is the puzzle"):

| Decision | Cost the rules impose |
|---|---|
| **Where you build speed** | 0.6 / 1.9 / 3.2 tiles to green / yellow / red from standing; one gear up takes 0.56–0.66 tiles |
| **Where you shed speed** | 0.74–0.81 tiles per color down; braking and turning **pass through every lower color** |
| **What you are at a point** | the color test is made where the tile stands, not where you planned |
| **What you commit to at takeoff** | nothing changes in the air except drag: 1 color per 6 tiles, so color in flight is a function of distance |
| **Where your color changes** | a color change happens at a position you can aim (shift point + 0.56–0.81 tiles) |

**What makes a Redshift puzzle interesting:** two or more of these decisions **in tension at nearby places**, so that the answer is a specific place-and-pace pair, not the extreme. Good: "yellow at the wall, red two tiles later". Bad: "be as fast as possible" or "slow down before the bridge".

**The collapse test (used below for every paper puzzle):** a puzzle *collapses* if its answer is "go as fast as you can" or "go slow / stop" with no choice of *where*. A mechanic is cut if its paper puzzles collapse.

What worlds 1–2 lack is a tile that **constrains passing through a band**, or that **checks your color at a place where you can't stand still**. Colored floors only check "match while standing on me". Two cheap pieces add the missing constraints:

- **Colored walls** (already in the sim): "anything but k passes here". Forces a mismatch at a point, which conflicts with needing k nearby.
- **Speed gates** (the GDD's "speed cameras", reframed): "only k passes here". On the ground, in the air and **in the floor** (a trapdoor that opens when you turn its color), which turns braking, skidding and ramping into aimed actions.

## 2. Scoring

Each mechanic scored 1–5 (5 best) on:

- **Variety:** how many distinct paper puzzles it creates that pass the collapse test.
- **Combines:** how much it multiplies with color gating and air drag (the two systems already built).
- **Read:** can a first-time jam player work out the rule from one bump or fall, without text (pillar 2).
- **Theme:** fit with SHIFT (gears, color shift, redshift).
- **Cost:** engineering cost in the deterministic tile sim, one gameplay engineer over four lanes (5 = nearly free, 1 = new subsystem). Includes art and test cost.

## 3. Ranked list

| Rank | Mechanic | Variety | Combines | Read | Theme | Cost | Total | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **Speed gate** (`w b g y r`; ground, air, floor) | 5 | 5 | 3 | 5 | 4 | 22 | **M2, Must** (sim + art); taught w2-04, deepened in world 3 |
| 2 | **Colored walls and ceilings** (`B G Y R` as walls) | 4 | 5 | 4 | 4 | 5 | 22 | **M2, Must** (no engineering); taught w1-05; ceilings in world 4 |
| 3 | **Ice** (`=`) | 3 | 3 | 4 | 3 | 3 | 16 | **M3, Should** (world 4); spec before M3 |
| 4 | Tint gate / memory blocks (new) | 4 | 3 | 2 | 4 | 2 | 15 | Cut (post-jam Could) |
| 5 | Conveyors (`<` `>`) | 4 | 2 | 2 | 5 | 2 | 15 | Cut |
| 6 | Afterimage ghosts | 4 | 4 | 2 | 4 | 1 | 15 | Cut (post-jam Could) |
| 7 | Boost pad (`*`) | 2 | 2 | 5 | 3 | 4 | 16 | Cut: collapses into "go fast" |
| 8 | Mud (`~`) | 2 | 2 | 4 | 2 | 4 | 14 | Cut: collapses into "slow here" |
| 9 | Spring pad (new) | 2 | 3 | 4 | 2 | 3 | 14 | Cut: collapses into the drag table |
| 10 | Crumble floor (new) | 1 | 2 | 4 | 1 | 3 | 11 | Cut: collapses into "go fast" |
| 11 | Speed-limit sign (new) | 1 | 2 | 4 | 2 | 4 | 13 | Cut: collapses into "go slow" |
| 12 | One-way arrow floors (new) | 2 | 1 | 3 | 1 | 4 | 11 | Cut: duplicates colored floors |
| 13 | Crates | 3 | 3 | 3 | 3 | 1 | 13 | Cut |
| 14 | Moving platforms | 3 | 2 | 3 | 2 | 1 | 11 | Cut |

Ties in the total are broken by the collapse test (boost scores 16 but every boost puzzle collapses, so it ranks below ice and the two cut ideas whose puzzles hold up).

## 4. Mechanics and paper puzzles

Conventions: distances in tiles from the point named; "edge" = the takeoff ledge; "launch x" = the player's x before the launch step (as in `air-drag.md`); box half-width 0.375. §5 numbers are quoted; derived numbers say how.

### 4.1 Speed gate — rank 1, **M2 Must**

**Rule:** a gate tile of band k is solid on every face **unless** your band is k. Read as "a gate that opens only for its color". A white gate (`w`) opens only when you stand still. Gates have their own no-embed group and no grace (spec: `features/speed-gates.md`).

Why it ranks first: it is the only piece that checks your color **at a point you pass through**, including in mid-air (where drag changes color by distance) and in the floor (where *becoming* its color drops you). That gives "where your color changes" real consequences. Cost: one solidity rule in the existing gating code, no tuning keys, glyphs already parse.

1. **Gate (teach).** Safe runway, a green gate column, 2 safe tiles, a yellow bridge over a pit. Blue or yellow bumps the gate (wall stop, gear kept); green passes but falls through the yellow bridge. Answer: green at the gate, shift up as you pass (yellow 0.56 tiles later, §5.1). Shift window (player x at the press) from 0.94 tiles before the gate face to 0.19 tiles before the bridge: 3.75 tiles, about 30 steps at 6–9 tiles/s. *Holds:* two constraints, answer is a place for the shift.
2. **Back up (ramp through).** A green gate with only a short floor before it and a red bridge after. From a standstill in gear 4, you are green from 0.60 to 1.88 tiles (steps 10–22, §5.1): start with your front edge 0.6–1.88 tiles from the gate and you pass it mid-ramp. Start closer and you touch it blue, stop, and every later step re-bumps at walking pace (you can never ramp up against a gate you don't match). *Holds:* the answer is "where to start", neither fastest nor slowest.
3. **Gate window (combine with drag).** One flight, a yellow gate 4 tiles past the edge and a green gate 7.5 tiles past it, safe landing 4 tiles lower. A yellow takeoff is yellow at 4 and, after its drag drop at 6.0 (flight step 40), green at 7.5; it lands 8.10 out (§5.4, gear 3 to −4). Red is red at 4: bounces. Green is green at 4: bounces. *Holds:* the answer is the middle color, and only drag explains it. Takeoff window about 1.95 tiles (early 0.975, late 0.975 with coyote) ≈ 13 steps.
4. **Trapdoor (gate floor, aim the change).** A 10-tile blue-gate floor over a pit with the exit pocket under its middle 3 tiles. Cross at any non-blue pace and it holds you; turn blue and it opens under you on the next step. Let go at sprint: blue after 3.24 tiles (step 26, §5.2), so let go about 3.2 tiles before the pocket (window = pocket width, 3 tiles ≈ 15 steps at sprint). Walk on at blue and you fall at the first tile into the pit. Arriving yellow, let go 2.03 tiles before (§5.2). *Holds:* the answer is "where to slow down".
5. **No green (braking zone).** A red sprint jump over a 7-tile gap lands yellow (8.7, §5.3) on a 6-tile green-gate floor, then a 4-tile safe pad, then a blue bridge. Letting go on the gate floor turns you green after 0.81 tiles and drops you. Let go so you turn green only once the box reaches the pad and blue (2.03) before the bridge: window about 3.5 tiles ≈ 23 steps. *Holds:* braking is forced, the puzzle is where.

**Risk: readability (score 3).** Colored blocks are solid *for* their color; gates are solid *except* for theirs. Two opposite rules per color is the biggest pillar-2 risk in this review. Mitigations, all required: gates never look like blocks (framed bars, not a filled tile; open/closed shown by the bars, not by color, see the art request); the first gate is met at walking pace on safe ground, so the first contact is a harmless bump; gates are taught after colored floors and walls are fluent (w2-04, level 9). If M2 playtests show players confusing the two, the fallback is to use gates only as walls and floors of `w`/`b` (fewest confusable pairs), not to change the rule.

### 4.2 Colored walls and ceilings — rank 2, **M2 Must**

**Rule (GDD §4.7, built in M1):** colored tiles are solid on every face when your band matches, so a red wall stops only red. A matching wall is a wall stop: `vx` 0, gear kept.

Why it ranks second: zero engineering, and it is the natural partner of colored floors: a floor says "be k here", a wall says "don't be k here". Taught in world 1 so world 2 can use it. Slightly less variety than gates because "not k" is a weaker constraint than "only k" (three colors pass a wall). Spec with extra acceptance checks for walls in flight: `features/colored-walls.md`.

1. **Red Wall (teach).** Safe runway, a red wall (1 thick, floor to ceiling), 1 safe tile, a red bridge. Arrive red: stopped dead. Arrive yellow and shift up: red 0.66 tiles later (§5.1), inside or after the wall (no-embed lets you turn red inside it). Shift window from 1.04 tiles before the wall face to 0.29 tiles before the bridge: 2.75 tiles ≈ 18 steps. Restarting from the wall face fails: red needs 3.23 tiles, only 2.75 are left. *Holds:* yellow-then-red at a place.
2. **Wall brake.** A red bridge runs into a red wall with a blue bridge right behind it. A matching wall is the fastest brake there is (`vx` 0 in one step) but keeps gear 4: holding on, you are blue for one step, pass the wall, and turn green 0.60 tiles later, off the blue bridge. Answer: hit the wall, shift down to gear 1 before moving on. *Holds:* teaches that gear and color are different things.
3. **Late wall (combine with drag).** A red wall column 7.0 tiles past launch x in a sprint jump: the jump is yellow from flight step 30, reaches the wall on flight step 35 (derived: 0.2/step to 6.0, then 0.15/step) and passes. The same wall 4.0 out stops it on flight step 19 while still red. *Holds:* with a wall at 4 the answer is a yellow takeoff and a target where yellow lands; with a wall at 7 a red takeoff is fine.
4. **Green roof (colored ceiling).** A green ceiling 3.5 tiles above the takeoff floor over the first 3 tiles of a gap, a green pad 4–7.5 tiles out. A green jump (lands 4.8) bonks on flight step 11 (head reaches 3.5 when the feet pass 2.0) and falls; a yellow jump passes the roof and lands green at 6.8 (§5.3). Without the roof a green jump would land on the pad, so the roof is the puzzle. *Holds:* go one gear up so drag brings you back.

### 4.3 Ice — rank 3, **M3 Should**

**Rule (GDD §7.1 direction):** while supported only by ice, speed and gear are locked; shifts, letting go and reversing do nothing. Value: the only way to hold a pace with no key held and no drag, and a place where you cannot brake or turn. Cost 3: a ground-phase bypass plus the speed-0 edge case (a player who lands on ice standing still would be stuck; the M3 spec must rule on it). Several puzzles collapse into "enter at color X", which is why it is Should, not Must.

1. **Locked (teach).** 4 safe tiles, 8 tiles of ice straight onto a green bridge. Pick green on the stone (0.60 tiles from standing, §5.1). *Holds weakly:* a middle color, but no tension.
2. **Brake budget.** A red jump over a 7-tile gap lands yellow on a 4-tile stone pad, then ice into a blue bridge. You need blue (2.03 tiles from yellow, §5.2) before the ice. *Holds:* budget between two constraints.
3. **No drag on ice.** A 2-tile-high corridor (no jumps) of 10 ice tiles ending at a red floor: red in, red out. *Collapses:* "go fast".
4. **Ice gate.** Ice through a yellow gate to an edge, a gap, a green pad: yellow lands green at 6.8. *Collapses:* the gap alone already demands yellow, the gate adds nothing.

### 4.4 Tint gate / memory blocks (new idea) — rank 4, cut

**Rule sketch:** crossing a tint gate stores your band; grey "memory" blocks then behave as colored tiles of that band. You pick a later constraint with your current pace.

1. **Set the bridge.** Tint gate, then a memory bridge, then a 7-tile gap to a green pad: the gap needs a yellow takeoff (lands green 6.8), so cross the gate yellow. *Collapses:* "be yellow".
2. **Two places.** The memory floor appears before a red wall and after a sprint jump: no single band works at both, so re-cross the gate between. *Holds,* but needs three rules on screen at once.
3. **White memory.** Cross the gate standing (a standing jump through it): memory blocks become floors only for a standing player. *Holds weakly;* hard to read.

Verdict: genuinely new decisions, but it needs runtime state, a new glyph, and blocks that **change color in the world**, which fights pillar 2. Cut for the jam.

### 4.5 Conveyors — rank 5, cut

1. **Belt carry.** A blue walker on a +6 belt moves at world 9 while legs stay blue on a blue belt. *Holds.*
2. **Treadmill.** A red runner on a −12 belt is at world 0; a white gate opens. *Holds,* but only if gates read world speed, which contradicts M2 gates (they read your own speed).
3. **Belt jump.** Does belt speed carry into the air, and does drag count world or leg distance? Either answer adds a second drag rule. *Unresolved.*

Verdict: thematic (relative speed is literally redshift) but every puzzle needs "legs vs world" explained without text, and the sim needs two velocities. Cut.

### 4.6 Afterimage ghosts — rank 6, cut

1. **Ghost bridge.** A red jump falls short onto a low ledge, leaving 1-tile ghosts every tile for its first 6 tiles; cross back at green before they fade (3 s). *Holds.*
2. **Long shadow.** Only the red part of a flight (first 6 tiles, §5.3) leaves ghosts: choose the takeoff ledge so they land where needed. *Holds.*
3. **Return trip.** Jump out, skid on a 3-tile pad (2.52 from yellow, §5.2), hop back on your ghosts. *Holds.*

Verdict: the puzzles are good, but it is a runtime-geometry subsystem (spawn, lifetime, no-embed for ghosts) whose rule still needs a design spike, and "ghost tiles that hold everyone except red" is a third solidity rule. Cut for cost; first candidate for a post-jam update.

### 4.7 Boost pad — rank 7, cut

1. **No runway.** A boost on a 2-tile platform before an 8-tile gap: red instantly, lands yellow at 8.7. *Collapses:* "go fast".
2. **Unwanted sprint.** A boost in a corridor before a blue bridge: you need 3.24 tiles to get back to blue (§5.2). *Collapses:* "slow down" (or jump the pad).
3. **Facing trick.** Standing on a boost sends you the way you face. *Collapses* into a direction choice.

Verdict: removes the runway decision instead of creating one. Cut. (Facing stays in the sim; it is harmless.)

### 4.8 Mud — rank 8, cut

1. **Mud brake.** A red bridge into 3 tiles of mud then a green bridge: mud caps you at gear 2, green after 1.91 tiles (§5.2). *Collapses:* the mud does the braking; the player only holds.
2. **Jump the mud.** Mud before a 7-tile gap: jump over it or lose red. *Collapses:* "avoid mud".
3. **Leaving mud.** The gear stays capped after the mud: shift up again. *Collapses* into busywork.

Verdict: a gear governor at a fixed place; nothing to decide. Cut.

### 4.9 Spring pad (new) — rank 9, cut

Sketch: launches to 6 tiles (same gravity: 68 airborne steps, derived from 2h/g).

1. **Long spring.** Red flies 11.7 tiles and lands yellow (one drop at 6.0; second would need 12). Green flies 6.4, dropping to blue at 6.0. *Collapses* into the drag table with longer numbers.
2. **High ledge.** A spring to a ledge 5 up. *Collapses:* vertical access, not pace.
3. **Spring over gate.** Spring over a gate column. *Collapses:* bypass.

### 4.10 Crumble floor (new) — rank 10, cut

1. Holds 0.5 s from first contact; a 4-tile crumble bridge needs ≥ 8 tiles/s: yellow or faster. *Collapses:* "go fast".
2. Crumble pad you must stop on. *Contradiction:* impossible by design.
3. Crumble plus colored: a yellow crumble bridge. *Collapses* into the yellow floor.

### 4.11 Speed-limit sign (new) — rank 11, cut

Sketch: a wall solid if your band is above k.

1. A green limit before a blue bridge. *Collapses:* "go slow".
2. A green limit at the top of a runway. *Collapses:* walk through slowly, ramp after; a colored wall of the faster colors does the same.
3. Limit in the air. *Collapses:* drag already caps flights.

### 4.12 One-way arrow floors (new) — rank 12, cut

Sketch: solid only while moving in the arrow's direction.

1. Turn around on it and fall. *Duplicates* "don't skid on a colored floor".
2. Standing on it drops you. *Duplicates* the white gate floor.
3. Arrow plus color. *Two rules per tile,* poor read.

### 4.13 Crates and moving platforms — ranks 13–14, cut

Crates (push rules still undecided, GDD §12.4) and moving platforms (time-varying geometry, path format, carry rules) are each a new subsystem. Their planned puzzles (w4-03 Lift, w4-04 Crate) are fine but no better than gate puzzles that cost a fraction. Cut.

## 5. Verdict

### Into M2 (worlds 1–2, Nov 15)

| Mechanic | Why | Engineering |
|---|---|---|
| **Colored walls** | Free (built in M1) and the natural opposite of a colored floor: gives world 1 its first real conflict ("yellow at the wall, red after it"). | None. Extra acceptance checks for walls in flight and colored ceilings (`features/colored-walls.md`). |
| **Speed gates** | The strongest constraint in the list: checks your color at a point, in the air (with drag) and in the floor (aimed braking). Cheap: one solidity rule, no tuning, glyphs already parse. | [sim] about 1.5 days with tests; art gate visuals; [scene] draws them through `src/fx`. Spec: `features/speed-gates.md`. |

No tuning change. Neither pick needs a new `tuning.json` key, so the tuning schema is untouched.

### M3

- **World 3 "Gates" (Must, 4 levels):** gate combinations, no new engineering in M3. This is a large cut in M3 sim work: the old M3 Must sim tasks (mud, ice, boost, cameras) become gates in M2 plus nothing.
- **World 4 "Remix" (Should, 4 levels):** colored ceilings (no engineering) and **ice** (the only new M3 mechanic; Should, spec before M3).

### Cut (post-jam at most)

Mud, boost pads, conveyors, moving platforms, crates, afterimage ghosts, and the new ideas (tint gates, springs, crumble floors, speed limits, one-way floors). Reasons are in §4. The provisional tuning keys `mudMaxGear`, `boostPadGear`, `ghostSpacingTiles`, `ghostLifetimeMs` become unused; they stay in `tuning.json` until tech-lead removes them from the schema, then design-lead deletes them in the same batch so the schema test never breaks.

## 6. Revised teaching order

| World | Theme | New pieces | Levels | Priority | Milestone |
|---|---|---|---|---|---|
| 1 Gears | moving, shifting, runway, braking, "not this color" | colored floors, safe tiles, **colored walls** | 5 | Must | M2 |
| 2 Commit | decide your pace before you arrive | air commitment, air drag, walk-offs, **speed gates** | 5 | Must | M2 |
| 3 Gates | where your color changes | gates in flight and in the floor (trapdoors), braking zones | 4 | Must | M3 |
| 4 Remix | old rules, new faces | colored ceilings, ice | 4 | Should | M3 |

**14 Must + 4 Should = 18 levels** (was 13 + 8 = 21). M2 grows from 8 to 10 levels; w1-05 needs no new engineering, so the level-designer can build it at once. M3 Must needs no new sim work at all. Details per level: `level-plan.md` v2.0.

Teach, test, twist, combine: world 1 teaches five ground ideas; world 2 teaches three air ideas plus gates, then combines; world 3 tests gates (no green), twists them (trapdoor), combines them with drag (gate window), and ends on a finale; world 4 twists walls (ceilings) and teaches ice.

## 7. Schedule and fallbacks

- **Gates slip past Nov 12:** w2-04 Gate moves to the top of world 3, M2 ships 9 levels; world 3 still fits M3 because it needs no other sim work.
- **Gates confuse players in the M2 playtest (M2-30):** keep the rule, restrict levels to `w`/`b` gates and gate floors, and strengthen the art (decision at M2-31).
- **M3 sim capacity left after the event stream (M3-05):** build ice (Should). If not, world 4 ships as 2 levels of colored ceilings and gates, or not at all.

## 8. Open risks

1. Gate readability (inverse of blocks): §4.1 mitigations; checked by M2-30.
2. Takeoff windows in flight levels with colored pads are near the 12-step floor (Coast, Gate Window). Level-designer widens them with lower landing pads (§5.4 rows) rather than shorter gaps.
3. Ice at speed 0 (stuck on ice): ruled in the ice spec before M3.
