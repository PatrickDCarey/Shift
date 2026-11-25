# Redshift — Core twist candidates

_Owner: design-lead. 2026-11-03. The studio owner read `mechanics-review.md` (gates and walls, GDD v1.3 plan, commit b432391) and asked for bigger ideas: gates and walls are sound but are refinements of "be colour X at place Y". This document offers three different answers to "what is the puzzle?". Nothing here is adopted; the owner picks first. If none is picked, v1.3 ships as written._

Fixed inputs for all three:
- **Art direction C, Pixel Dither:** 480×270 logical at 2×, 16 px tiles (the screen stays 30 × 16.9 tiles). Every new element must read at 16×16 px by shape and pattern, never colour alone.
- **Built today:** hold-to-move gears, colour gating with grace and no-embed, air drag, jump, safe tiles, coloured walls (free, they are coloured tiles).
- **Numbers** come from GDD §5 (exact against the sim) or are worked out by hand from the same step rules. Hand-worked numbers are marked "derived" and must be confirmed by tests before any level uses them.
- **Collapse test** (`mechanics-review.md` §1): a puzzle fails if its answer is "go as fast as you can" or "go slow / stop" with no choice of where or when. Teach levels may be simple; the mechanic must also produce puzzles that pass.

| # | Twist | The puzzle becomes | Cost (engineer-days) | Risk |
|---|---|---|---|---|
| 1 | **Tandem**: one throttle, two runners | Put two bodies out of step: same keys, different colours | ~5 + 1 art | Medium-high |
| 2 | **Wet Paint**: your pace paints the floor | Plan two passes: your speed now is a floor you meet later | ~3 + 1 art (+ heavy level design) | Medium |
| 3 | **Redshift Clock**: speed slows the world | Choose when to freeze time | ~3.5 + 1 art | Medium (timing creep) |

Recommendation at the end (§5): **Tandem**, with a decision gate on Nov 12.

---

## 1. Tandem: one throttle, two runners

### Rule

- A level may place a **twin spawn** `&` (char to be confirmed by tech-lead). The twin is a second player body with its own complete player state: x, y, vx, vy, gear, band, grounded, grace, coyote, jump and shift buffers, drag counter, facing.
- Every step, **both bodies run phases 2–13 of the step order with the same input frame**: the same held direction, jump and shift presses. Each body applies its own clamps, air rule and buffers, so their **gears can drift apart**.
- Bodies do not collide with each other.
- **Home:** a body that overlaps an exit tile becomes *home*. It freezes there, stops simulating and emits no events. The level is won on the first step **both** bodies are home.
- **Death:** if either body falls out of the level, the run dies, and the respawn resets both.
- Optional twist (Should): a **mirrored twin** `%` sees L and R swapped.
- **New state:** `twin: PlayerState | null`, plus `home` flags for both bodies. Events carry a body id. Replays and recordings are unchanged: they are still one input stream.

### Why it fits SHIFT and pace

The puzzle is a **phase shift between two runners**. With one throttle you cannot give two bodies different paces directly; you create the difference with the level:
- a wall that stops one body and not the other;
- a mid-air stop that resets one body's gear to 1;
- an exit that parks one body.

You remove the difference with the gear clamp: pressing up past gear 4 brings both to 4. Pace stays the only verb, but each body's colour now depends on its own history. Every Tandem puzzle is planning; none needs reflexes.

### Paper puzzles

Lanes are stacked: your lane on top, the twin's lane below, separated by a solid band.

1. **Two Lanes (teach).** Identical lanes: safe pad, blue bridge, safe pad, green bridge. Hold right in gear 1, both walk blue; shift up on the pad, both turn green after 0.6 tiles (GDD §5.1). Let go on the twin's bridge and it falls; the run dies. *Teaches "same keys"; simple by design.*
2. **Out of Step (a wall makes one colour into two).** Both cruise red (gear 4). Your lane has a red wall at x = X; the twin's lane is open.
   - Your body stops dead at the wall (vx 0, gear 4 kept). Keep holding: it restarts at blue, passes the red wall, and ramps green from 0.60 to 1.88 tiles past its stop point (§5.1, steps 10–22).
   - The twin keeps sprinting: on those steps it is 2.0–4.6 tiles past the wall (0.2 tiles per step, derived).
   - Your lane: a green bridge from X+0.25 to X+1.5. You are wholly on it from 1.0 to 1.5 tiles past the stop: green. Twin lane: a red bridge from X+2 to X+5.
   - Arrive yellow instead and the wall doesn't stop you: you are yellow on green and fall. *Holds:* you must be red so the wall stops you, and that one input then gives two colours.
3. **Gear Split (an air stop resets one gear).** Both cruise gear 4 and jump together.
   - A hanging safe block 3 tiles past launch, in your lane only, stops your body on flight step 14 (front edge passes 2.625, derived). vx goes to 0, band 0, and the air rule sets gear 1. You fall straight down to your floor.
   - The twin flies on: 8.7 tiles, dragged to yellow on step 30, landing in gear 3 (§5.3).
   - Now holding right gives your body blue (3) and the twin yellow (9). Your lane has a blue bridge where the twin's has a yellow one. *Holds:* the split is created on purpose, at a chosen place.
4. **Clamp (re-sync at the top).** After puzzle 3 (gears 1 and 3), both must be red over parallel red bridges. Press up three times: you go 1→2→3→4, the twin 3→4 and then stays at 4 (clamped).
   - The twin is red 0.66 tiles after the first press (§5.1). Your body needs about 3.1 tiles from blue cruise to red (derived: 1.25 + 1.25 + 0.58).
   - So the red bridges start at least 3.1 tiles past the press point in your lane; the twin's lane may start sooner. *Holds:* the answer is where to press, decided by the slower body.
5. **Park.** Your lane's exit sits right after a blue bridge; the twin's lane continues to a red bridge and its own exit. Walk both blue until your body is home, then the twin goes on alone: shift to 4 and sprint. Try sprinting first and your body is red on the blue bridge. *Holds:* order matters.
6. **Two Gates (combine with v1.3 gates).** A green gate in your lane and a yellow gate in the twin's lane at the same x. That needs a one-gear split first: a yellow wall earlier in your lane stops your body while both cruise yellow, so you ramp from blue and are green 0.60–1.88 tiles later while the twin stays yellow. *Holds:* two gates, one input, one place.

### How it combines

- **Colour gating:** each body tests its own band. Grace and coyote apply per body.
- **Air drag and the air rule:** the main split tools (drag lowers one gear only when the two flights differ).
- **Walls:** the main offset tool (one lane's wall).
- **Safe tiles:** where you split and re-sync.
- **Gates:** per-lane checkpoints (puzzle 6).
- **Cut list revisited:**
  - A **boost pad** in one lane becomes a one-step gear split (sets that body to gear 4 at speed 12) and no longer collapses.
  - **Ice** in one lane locks one body's pace while the other changes.
  - Both stay optional (Should).

### What it replaces or cuts

- Gates move from the M2 headline to **Should** (puzzle 6 is their best use).
- World 3 becomes **Tandem** (4–5 levels, Must). Worlds 1–2 stay single-runner, as in v1.3 minus w2-04.
- Ice stays Should; mirror twin is Should.

### Engineering estimate (one gameplay engineer)

| Lane | Work | Days |
|---|---|---|
| tech-lead | `SimState.twin`, events with body id, level format `&`, contract and arch-test updates | 0.5 |
| [sim] | run the per-body phases twice; home and death rules; tests for all six puzzles | 2.5 |
| [level] | twin spawn parse and validation | 0.5 |
| [scene] | second player view, camera framing both lanes, second HUD strip, events per body | 1.5 |
| art | twin body: same band pattern, hollow outline, distinct silhouette at 12×24 px; lane divider | 1 |

**Total about 5 engineer-days plus 1 art-day.**
- **Schedule:** the sim lane is on M1 work until about Nov 8, so it builds Nov 9–13 and Tandem levels come in M3 (Nov 16–22).
- **Risk:** medium-high. The SimState shape change touches the scene, HUD and tests. A one-body sim must keep passing every M1 check unchanged (twin null).
- **Fallback:** if Tandem isn't green by Nov 12, world 3 reverts to v1.3 Gates (levels already sketched).

**Readability at 480×270:**
- Two 12×24 px bodies, told apart by silhouette (solid vs hollow) and by lane, and each wears its band pattern.
- Each lane is at most 8 tiles tall, so both fit one screen.
- The HUD shows two stacked gear strips, each marked with its body's silhouette.

### First 3 levels

1. **Two Lanes:** same keys, same colours (puzzle 1).
2. **Out of Step:** a wall makes two colours from one input (puzzle 2).
3. **Gear Split:** an air stop leaves your body two gears behind (puzzle 3).

---

## 2. Wet Paint: your pace paints the floor

### Rule

- New tile, **canvas** (char to be confirmed). A blank canvas tile is solid on every face for every band, like a safe tile.
- **Painting:** at the end of every step on which the player is grounded (after the band is recomputed, phase 10), every canvas tile under the feet that the box overlaps horizontally is painted with the current band (0–4).
  - A launch step ends airborne, so it paints nothing.
  - So each canvas tile keeps the band you had **on the last step you stood on it**.
- **A painted tile behaves exactly as a coloured tile of its band.** White paint (band 0) is solid only for a standing player.
  - Landing on paint needs a match (no grace on landing).
  - Walking onto mismatched paint is walking into a hole.
- While you stand on canvas it is repainted every step, so canvas never drops you on the pass that paints it. Paint only matters **the next time you meet it**.
- Only feet paint. A canvas wall stays blank (safe) forever; levels use canvas as floors.
- Paint resets on death and restart.
- **New state:** one small array, the paint per canvas tile (blank or 0–4), updated immutably. Deterministic, no timers.

### Why it fits SHIFT and pace

Your pace leaves a red-shifted trail that becomes geometry. The question changes from "what must I be here?" to "**what will I be here next time**?": you write a constraint for your future self. This is the cheap, readable form of the cut afterimage idea (feet only, on the ground, kept until repainted).

### Paper puzzles

Paint needs a second pass, so levels loop: out along a lower canvas floor, up at the far end, back along an upper walkway, and down onto the canvas again (or back across it).

1. **Footprints (teach).** Out across a 10-tile canvas floor over a pit; back along the upper walkway, which ends in a blue bridge and a 3-tile drop onto the canvas. You land blue, 1.25 tiles out (derived: 25 airborne steps at 0.05). Sprint out and the canvas is red, so you land on red paint at blue and fall through. *Teaches "the floor remembers how fast you crossed".*
2. **Paint the Landing (combine with drag).** The return route ends with a sprint jump off a ledge 2 tiles above the canvas: it lands 9.75 tiles out, **yellow** (§5.4, gear 4 to −2). So on the way out, cross the stretch around 9.75 tiles past that ledge at yellow: cruise in gear 3, or catch the yellow part of a ramp (1.88–3.23 tiles from a standstill, §5.1). Landing x varies about 1.5 tiles with takeoff, so paint about 3 tiles. *Holds:* a middle colour at a chosen place, set by a flight you make later.
3. **Dig (stop and hop).** The exit pocket lies under canvas tile k. On the way out, walk to k, let go (instant stop, band 0, the tiles under you turn white) and hop on with jump + right from standing. The launch step ends airborne, so the white mark stays; the hop lands 2.375 tiles on (§5.3 note). Come back walking blue: white is a hole, and you drop into the pocket. *Holds:* the answer is where you stopped.
4. **Bridge for Later (the future picks the pace).**
   - The outbound route has a long runway, so red is tempting.
   - The return reaches the same canvas bridge from a 2.5-tile pad: red is impossible there (it needs 3.23, §5.1), yellow is possible (1.88).
   - After the bridge, a 7-tile gap to a pad 2 tiles lower: a yellow jump lands green at 7.50 (§5.4); green can't reach even with coyote (derived: at most 6.85).
   - So paint the bridge yellow on the way out (gear 3 cruise). Red paint makes the return impossible; green paint means a green return and too short a jump. *Holds:* a middle colour chosen by the second pass.
5. **Gate Ink (combine with gates).** A green gate on the outbound route forces green at one spot, so that canvas is green, and the return must cross it green, before a yellow bridge 2 tiles later (0.56 tiles to yellow, §5.1). *Holds;* gates are optional.

### How it combines

- **Colour gating:** paint *is* colour gating, written by the player.
- **Air drag:** landing colour decides what you must have painted (puzzle 2).
- **Safe tiles:** don't record, so they are where you change pace without leaving a mark.
- **Walls:** a wall stop is white for one step, but walking away repaints at blue, so walls leave no mark. Only a hop does (puzzle 3).
- **Gates:** pin the paint at a point (puzzle 5).
- **Cut list:** afterimage is folded in (this is its ground version); tint gates are folded in (paint is memory you can see under your feet).

### What it replaces or cuts

- Gates become Should.
- World 3 becomes **Paint** (4–5 levels, Must). Worlds 1–2 as v1.3 minus w2-04.

### Engineering estimate

| Lane | Work | Days |
|---|---|---|
| tech-lead | canvas char, `SimState.paint`, paint phase in architecture.md | 0.5 |
| [sim] | paint phase; painted canvas uses the coloured-tile solidity; reset; tests | 1.5 |
| [level] | canvas char | 0.25 |
| [scene] | redraw tiles when paint changes; paint FX | 0.75 |
| art | blank canvas (dotted primer grid) and painted state (band pattern plus a brush-stroke corner notch) at 16 px | 1 |

**Total about 3 engineer-days plus 1 art-day. This is the cheapest of the three.**
- **The hidden cost is level design:** every puzzle needs a loop or a return pass, rooms get bigger, and the level-designer's M3 load roughly doubles per level.
- **Risk:** medium.
- **Quantization trap:** paint is per tile, while ramps and brakes change colour at fractional positions. Puzzles must paint whole stretches at a cruise, never rely on ramp boundaries landing on tile edges.

**Readability at 480×270:**
- Painted tiles reuse the coloured-tile patterns, so players already know them; the notch shows they are paint.
- The trail under the runner is the most legible new element of the three.

### First 3 levels

1. **Footprints:** the floor remembers (puzzle 1).
2. **Bridge for Later:** paint for the pace you'll have (puzzle 4).
3. **Dig:** stop and hop to mark a hole (puzzle 3).

---

## 3. Redshift Clock: speed slows the world

### Rule

- A **world clock** W (integer ticks, 0 at spawn) advances once per step by `clockRatePerBand[b]`, where b is the band at the start of the step. Proposed rates: white 4, blue 3, green 2, yellow 1, **red 0**.
- In words: **standing still, the world runs at full speed; at a sprint it stops.**
- New **blinker** tiles come in two sets, A and B (chars to be confirmed). Set A is solid on every face while `floor(W / phaseTicks)` is even; set B while it is odd. `phaseTicks` is proposed at 180, so one phase lasts:
  - 45 steps standing;
  - 60 at blue;
  - 90 at green;
  - 180 at yellow;
  - forever at red.
- **No-embed per set:** a blinker that turns solid around the box stays empty for it until the box is clear.
- **No grace:** a blinker that turns off under you is a hole (coyote applies).
- The tick rate in the air follows your band, so a drag drop restarts the clock mid-flight.
- **New state:** W (one integer). New tuning keys: `clockRatePerBand`, `phaseTicks`.

### Why it fits SHIFT and pace

It is the game's title made literal: the faster you go, the slower the world (time dilation). Slowing down gets a purpose (standing fast-forwards), and every pace choice also sets the world's clock rate.

### Numbers (derived from the step rules, start-of-step band)

- **Ramp from standing to red in gear 4:** 4 + 9×3 + 13×2 + 9×1 = **66 ticks** over 3.23 tiles (bands from §5.1). Red from step 33 on: 0.
- **Let go from sprint to a stop:** 4×0 + 8×1 + 14×2 + 9×3 = **63 ticks** over 3.74 tiles (bands from §5.2).
- **Flat flight in ticks, by takeoff band:**
  - red: 30 steps × 0 + 18 × 1 = **18**;
  - yellow: 40 × 1 + 8 × 2 = **56**;
  - green: 48 × 2 = **96**;
  - blue: 48 × 3 = **144**.
  Drag drops on steps 30 and 40, as in §5.3.
- **Ticks per tile at cruise:** blue 60, green 20, yellow 6.7, red 0.

### Paper puzzles

1. **Freeze (teach).** An 8-tile set-A bridge over a pit after a 6-tile safe runway. Walking across costs 480 ticks (more than two phases), so it vanishes under you.
   - Sprint: start the ramp with at least 66 ticks of on-time left and the bridge stays on while you are red.
   - Start window: 114 ticks, about 28 steps of standing.
   - Yellow (53 ticks) also works. *Teach level; on its own it leans toward "go fast".*
2. **Thaw (freeze late).** A set-B wall stands 1 tile before a 7-tile gap that needs red (lands yellow 8.7, §5.3). The wall opens in 120 ticks.
   - Sprint at once: you are red (frozen) after 66 ticks, the wall is still shut, and it stays shut while you're red. You bump into it, and from a standstill red is impossible in 1 tile.
   - Stand still 54 ticks (14 steps) first, so that you freeze only once it's open. Any wait from 54 to 233 ticks works (14–58 steps).
   - *Holds:* the answer is **when** to go fast, and going fast at once fails.
3. **Fixed Clock (combine with coloured floors).** A 9-tile green floor over a pit ends at a set-A wall, then a safe pad. Green is forced, so the crossing costs exactly 180 ticks: one phase.
   - Step onto the green floor while the wall is **closed** and it is open when you arrive. Any moment of the closed phase works: a 180-tick window.
   - Step on while it is open and you arrive as it shuts: you bump, turn white on green and drop.
   - *Holds:* the coloured floor fixes your clock, and the decision is when to commit.
4. **Hand-off (combine with drag).** Takeoff from a set-A runway, landing on a set-B pad 6.5–8 tiles out.
   - Take off while A is still on and land once B is on: the flip must happen during the flight.
   - Yellow flies 56 ticks and lands 6.8 out. On a yellow-paced runway (1 tick per step) you can watch A's last 56 ticks and jump inside them: about 56 steps of window.
   - Green flies 96 ticks but falls short (4.8). Red lands too far (8.7), and its window would be 18 ticks under a frozen approach.
   - *Holds:* the middle colour, set by distance and time together.

### Honest caveat: timing creep

The clock is global and standing makes it run fastest, so the player can almost always wait for the right moment. Puzzles therefore turn into "wait for the countdown, then execute" unless something fixes your pace while time must pass: a coloured floor (puzzle 3) or flight (puzzle 4).

I tried a "ride the wave" puzzle (alternating blinker sections matched to green speed) and rejected it. Its window is the box width divided by speed (7.5 steps at green), below the 12-step fairness floor. Expect a share of clock levels to read as timing, which pushes against pillar 1.

### How it combines

- **Coloured floors:** set the clock rate per place (puzzle 3).
- **Drag:** restarts the clock mid-flight (puzzle 4).
- **Safe tiles:** the place to fast-forward.
- **Walls:** a wall stop is instant white, so a bump fast-forwards.
- **Gates:** fix your rate at a point.
- **Cut list revisited:** a **boost pad** becomes an instant freeze that skips the 66-tick ramp, a real tool (Should). **Ice** becomes a time lock.

### What it replaces or cuts

- Gates become Should.
- World 3 becomes **Clock** (4–5 levels, Must).
- Worlds 1–2 as v1.3 minus w2-04.

### Engineering estimate

| Lane | Work | Days |
|---|---|---|
| tech-lead | two tuning keys in the schema, two blinker chars, clock phase in architecture.md | 0.5 |
| [sim] | clock advance, blinker solidity, no-embed per set, tests | 1.5 |
| [level] | blinker chars | 0.25 |
| [scene] | blinker drawing; HUD clock that visibly stops at red | 1 |
| art | blinker on (solid brick dither) and off (dotted outline), with a 4-pip countdown on the tile edge; a global clock glyph | 1 |

**Total about 3.5 engineer-days plus 1 art-day.**
- **Risk:** medium. The code is small, but puzzle quality depends on avoiding timing creep, and that is only proven by playtest (M3-34).
- **Readability at 480×270:** a 4-pip countdown on a 16 px tile is legible. The global "frozen" state needs a strong cue (HUD clock hand stops, dither shimmer freezes) that works without colour.

### First 3 levels

1. **Freeze:** sprint and the world stops (puzzle 1).
2. **Thaw:** freeze only after the door opens (puzzle 2).
3. **Fixed Clock:** a coloured floor sets the clock (puzzle 3).

---

## 4. Seeds considered and rejected

- **Doppler by direction** (approaching tiles look and act different from receding ones): needs a reference frame per tile and doubles the colour set into signed colours. It is unreadable at 16 px in pixel art, and it reduces to direction-gated floors, which duplicate coloured floors.
- **Each gear rotates which colours are solid:** decouples colour from speed, breaks "your pace is your colour" (the pitch) and pillar 2.
- **Recorded ghost of your previous attempt as a solid body:** the replay format already includes earlier runs, but a moving solid body is the moving-platform subsystem (carry, push, crush), and leaderboard times would depend on earlier attempts. Too expensive for the jam.
- **Conveyors and relative speed:** two velocities, and "legs vs world" fails the 10-second read (unchanged from the review).

## 5. Recommendation

**Pick Tandem.** It is the only candidate whose puzzles are pure planning (no timing) and genuinely new: one input, two colours, created by walls, flights and parking, and removed by the gear clamp. Pace stays the only verb, so the game's identity gets sharper rather than adding a second system. Its puzzles also use the cut boost pad and the existing walls well.

**Second choice: Wet Paint**, if the engineering budget is the binding constraint (cheapest code, strongest read at 480×270). Its cost moves to level design.

**Third: Redshift Clock.** Best theme story, but its puzzles drift toward timing.

**Plan if Tandem is picked:**
- Nov 4: Tandem spec, tech-lead contract.
- Nov 9–13: sim and scene.
- **Decision gate Nov 12:** if a two-body grey-box room doesn't pass its tests, world 3 reverts to v1.3 Gates.
- M2 (Nov 15): worlds 1–2 as v1.3 (Red Wall in, Gate out): 9 levels.
- M3 (Nov 22): world 3 Tandem (5 levels, Must).
- Gates and ice: Should.
- Must stays at 14 levels.

**Placement risk for any twist:** a jam voter plays about 10 minutes, so the twist must appear by level 8–9. If the owner wants it earlier, move Two Colours after the first twist level.

**Fallback: if none of these is picked, ship gates and walls as in v1.3** (`mechanics-review.md`, `level-plan.md` v2.0, `features/speed-gates.md`, `features/colored-walls.md`).
