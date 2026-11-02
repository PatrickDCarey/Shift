# Redshift — Game Design Document

_Owner: design-lead. Version 1.1 (2026-11-02): hold-to-move control model. Source of truth for how the game plays. Every gameplay number lives in `src/data/tuning.json`; this document names the keys and explains them. Decisions and their reasons are logged in `docs/design/decisions.md`._

## 1. Pitch

A puzzle-platformer where **your pace is your color**. Stand still and you're white; sprint and you're red. Colored platforms are only solid when your color matches them, so every puzzle is about where you speed up, where you slow down, and where you take off.

Theme link: you **shift** gears with the **Shift** keys, and the world **red-shifts** as you speed up.

## 2. Pillars

1. **Pace is the puzzle.** Every level is solved by choosing where and how fast to move, not by reflexes alone.
2. **Readable at a glance.** A new player understands the color rule within 10 seconds, without text.
3. **Fair.** The solution never needs pixel-perfect input. Generous coyote time, jump buffering and color grace.
4. **One new idea per level.** Teach, test, twist, then combine.

## 3. Controls

| Action | Keys | Sim button |
|---|---|---|
| Move left / right (hold) | Left/Right arrows, A/D | `L` / `R` |
| Shift up | Right Shift, **E**, **X** | `+` |
| Shift down | Left Shift, **Q**, **Z** | `-` |
| Jump | Space, W, Up | `J` |
| Restart level | R | (restart) |

**Control model: hold-to-move with a cruise gear.**

- **Hold** a direction to move that way. Your speed heads toward the **selected gear's** speed in that direction. **Let go** and you brake to a stop.
- The **Shift keys pick the gear (1–4)**, which works as your cruise speed. One press = one gear; holding does not repeat. The gear stays selected when you let go, land, or bump a wall.
- Your **color comes from your actual speed**, never from the selected gear.
- **Alternate gear keys are Must:** Q/E and Z/X do exactly what Left/Right Shift do (left key down, right key up), so WASD players use Q/E and arrow players use Z/X. All bindings are active at once.
- **Sticky Keys tip (Must):** on Windows (detected by user agent), the first time a level starts, show a one-time, dismissable tip with the Q/E and Z/X key glyphs: pressing Shift five times opens the Windows Sticky Keys popup; these keys avoid it. Shown once ever (saved); never blocks input. Not gameplay; no tuning key. ui-engineer owns it.
- A free key-remap screen is **Could** (cuttable).
- Onboarding glyphs (icons, not text): an arrow-key glyph above the player at spawn in w1-01; a Shift/E/X glyph on the first white pad of w1-02.

## 4. Core rules (precise)

### 4.1 Units and simulation

- Positions and distances are in **tiles**, speeds in **tiles/second**, the simulation runs at a fixed `stepHz` = 60 steps/second (dt = 1/60 s). `tileSize` is used only for rendering.
- All `...Ms` tuning values convert to whole steps: `steps = round(ms × stepHz / 1000)`. Every shipped value is an exact multiple of 1/60 s (100 ms = 6 steps, 400 ms = 24 steps).
- "Up" is up on screen. Heights are measured from the player's feet.
- The player is an axis-aligned box `playerWidthTiles` × `playerHeightTiles` (0.75 × 1.5). The player's **x** is the box's horizontal center; **feet** are the bottom edge.
- **Overlap** always means strict overlap (positive area). Touching edges do not overlap.

### 4.2 Gears and shifting

- `gearSpeeds` = [0, 3, 6, 9, 12]. Index 0 is "standing" (no selectable gear); gears **1–4** (`minGear` 1 to 4) are selectable:

  | Gear | Pace | Speed | Band color |
  |---|---|---|---|
  | — | standing | 0 | white |
  | 1 | walk | 3 | blue |
  | 2 | jog | 6 | green |
  | 3 | run | 9 | yellow |
  | 4 | sprint | 12 | red |

- The run starts in `startGear` (1). Presses beyond 1 or 4 do nothing and are not stored.
- **Shifting only happens on the ground.** A shift press while airborne (including coyote time) goes to the shift buffer (§4.8).
- Shifting while standing still is allowed: it changes the cruise gear, not the speed.

### 4.3 Direction input

- Each step the sim derives a **move direction** d ∈ {−1, 0, +1} from the held `L`/`R` buttons:
  - only one held → that direction;
  - neither held → 0;
  - both held → the one pressed more recently; if both went down on the same step, 0 until one is released.
- **Facing** is +1 or −1, starts at +1 (right), and becomes d whenever d ≠ 0 (ground or air). Facing is visual, except that a boost pad uses it when the player is standing still (§7.1).
- On the ground, the **target velocity** is `d × gearSpeeds[gear]` (0 when nothing is held).
- **In the air, held directions do nothing to velocity** (§4.8). They only update facing.

### 4.4 Speed model: walking is instant, running takes distance

Speed is the player's horizontal **leg speed** `s = |vx|`. Vertical speed never counts toward color.

**Walking range (instant).** On the ground, any change within 0 to `gearSpeeds[instantMaxGear]` (3 tiles/s) happens instantly: starting to walk, stopping from walking pace, and turning around at walking pace take no distance.

**Running range (takes distance).** Above walking pace, the range between two adjacent gear speeds is a **segment** n (between `v[n]` and `v[n+1]`, n = 1, 2, 3). Within a segment, speed changes with constant acceleration chosen so that crossing the whole segment takes exactly a fixed ground distance:

- accelerating through segment n: `accel[n] = (v[n+1]² − v[n]²) / (2 × tilesPerGearChange)`
- braking through segment n: `brake[n] = (v[n+1]² − v[n]²) / (2 × brakeTilesPerGearChange)`

With shipped values (both 1.25 tiles) these are 10.8, 18.0, 25.2 tiles/s² for segments 1–3. Derived at load, not stored.

**Grounded step**, with target velocity T and current velocity vx (speeds are magnitudes, signs are directions):

1. **Slowing toward 0** (T = 0 or T opposite to vx, and vx ≠ 0):
   - if `s ≤ v[1]`: speed drops to 0 instantly; if T ≠ 0, the player then starts in T's direction at `min(|T|, v[1])` on the same step (an instant turn at walking pace);
   - else brake: n = the largest n with `v[n] < s`; `s ← max(0, s − brake[n]·dt)`, same direction. (If this lands at or below 3, the next step finishes the stop instantly.)
2. **Otherwise** (moving with T, or standing still):
   - if `s < |T|` and `s < v[1]`: `s ← min(|T|, v[1])` instantly;
   - if `s < |T|` above walking pace: n = largest n with `v[n] ≤ s`; `s ← min(|T|, s + accel[n]·dt)`;
   - if `s > |T|` (downshift): n = largest n with `v[n] < s`; `s ← max(|T|, s − brake[n]·dt)`.
3. The segment is chosen from the speed at the start of the step and is not split if the step crosses a gear speed.
4. Horizontal position advances by `(vx_old + vx_new) / 2 × dt` (exact for constant acceleration).

Consequences: from standing, holding at gear 4 reaches full sprint in 4.0 tiles; letting go at full sprint stops in 3.74 tiles. **Letting go and shifting down brake at the same rate** (one braking rule). Speed **never changes in the air** except by air drag (§4.8) and wall stops (§4.10).

### 4.5 Reversing and skidding

- Holding the opposite direction at running speed is a **skid**: braking as in §4.4 step 1, down through every lower band, then an instant turn at walking pace, then normal acceleration the new way. The gear is unchanged.
- From full sprint, the skid covers 3.72 tiles and the turn happens on step 35; you are back at full sprint the other way on step 70, about where the skid began.
- Letting go mid-skid just keeps braking to a stop. Holding the original direction again mid-skid accelerates again.
- Left and right are perfectly symmetric. Only `|vx|` matters for color.
- Level-design consequence: **turning around or stopping at speed always passes through blue (and stopping ends at white)**, so doing it on a green, yellow or red floor drops you after grace. Stops and turnarounds belong on safe tiles.

### 4.6 Speed bands (color)

- The **band** (0–4) is the player's color: white, blue, green, yellow, red. `colorBandEdges` = [1.5, 4.5, 7.5, 10.5]; `band = number of edges ≤ s`. A speed exactly on an edge belongs to the higher band.
- Edges sit midway between gear speeds; every cruising speed is 1.5 tiles/s from the nearest edge.
- **No hysteresis.** Within a ramp, skid, or drag drop, speed moves monotonically through edges and cruising speeds are mid-band, so the color never flickers by itself. (A player can deliberately tap the arrow to hover near an edge; that is a player choice, and any flicker is honest feedback.)
- The band is recomputed once per step, after all speed changes for that step (§4.14).

### 4.7 Color gating (what is solid)

Tile kinds (level format characters from `docs/tech/level-format.md`):

| Tile | Char | Solid for the player |
|---|---|---|
| empty | `.` | never |
| safe | `#` | always, all faces. Drawn white/grey: "you can stop and turn here". |
| colored | `B` `G` `Y` `R` | all faces, **only while the player's band matches**, subject to no-embed and grace |
| exit | `E` | never solid; touching it completes the level |
| player start | `@` | empty; the player spawns standing on the bottom edge of this cell |

- **No-embed rule:** a colored tile that overlaps the player's box is treated as empty, even if the colors match, until the player stops overlapping it.
- Colored geometry exists as floors, walls and ceilings; the same rule applies to every face. A red wall stops a red player and lets everyone else through.
- **Landing** on a colored tile requires a match on the step of contact. There is no grace on landing.
- **Walking onto** a mismatched colored tile is walking into a hole (coyote applies, grace does not).
- The player is **supported** on any step where some floor-solid tile's top face is level with the feet and overlaps the player horizontally. Standing across two tiles counts if either supports.

### 4.8 Color grace

Grace is only for losing a match **because your color changed** while standing: shifting, letting go, skidding.

- If the band changes on a step where the player was grounded at the start and is grounded at the end, start grace: `graceColor` = the previous band's color, `graceSteps` = colorGraceMs in steps (6).
- While grace is active, tiles of `graceColor` count as solid **from above only** (they support the feet; they never block sideways or from below), including other tiles of that color you walk onto during grace.
- Grace counts down every step and ends at 0, when the player leaves the ground, or when a new grace starts (a second color change replaces the grace color with the newer previous color).
- When grace ends with no other support, the player falls, and **coyote time starts**. Total window from color change to last possible jump: 12 steps (0.2 s).
- Grace never applies to walls or ceilings, never on landing, never when you walk onto a mismatched tile.
- Previous band white has no colored tiles, so no grace is needed.

### 4.9 Airborne: you are committed

The player is airborne whenever not supported (after a jump, walking off a ledge, falling through a tile).

- **No steering.** Held directions never change velocity in the air, in either direction. Letting go in the air does not brake.
- **No shifting.** A shift press while airborne goes into the **shift buffer** (net count of up/down presses). Each new press restarts a `shiftBufferMs` window (6 steps); if it expires the buffer clears. On the landing step, buffered presses are applied (clamped 1–4) after the landing rules.
- **Gear follows color in the air.** Every airborne step, `gear ← max(minGear, min(gear, band))`. Flight can lower your gear but never raises it, so you land in the gear of the color you show and holding the arrow after landing does not re-accelerate you off a correct landing pad.
- **Air drag is stepwise.** From leaving the ground, the sim accumulates horizontal distance actually moved in the air (`|Δx|` per step). Each time the total reaches `airDragTilesPerGear` (6), the player drops **exactly one band**: `|vx| ← gearSpeeds[band − 1]` (sign kept), counter −= 6. At most one drop per step.
- **Drag floor:** drag never lowers the band below `airDragMinBand` (1, blue). Blue or white flyers keep their speed for any flight.
- The drag counter resets to 0 on landing. It also counts during coyote time.
- **On landing**, ground rules resume on the next step with whatever is held then: holding the same way cruises in the (possibly lowered) gear, nothing held brakes to a stop, the opposite direction skids.
- Rule of thumb: **every 6 tiles of flight costs one color.**

### 4.10 Jump, gravity, falling

- **Jump height does not depend on gear.** Apex `jumpHeightTiles` (3) after `jumpTimeToApexMs` (400 ms = 24 steps). Gravity `2h/t²` = 37.5 tiles/s², launch speed `2h/t` = 15 tiles/s, both derived. Faster gears jump farther, not higher.
- No variable jump height: releasing the key early does nothing.
- Vertical motion uses exact constant-acceleration kinematics per step (`y += vy·dt + ½·g·dt²`), so the apex is exactly 3.0 tiles on step 24.
- Falling speed is capped at `maxFallSpeed` (20 tiles/s).
- **Takeoff speed** is the ground speed after that step's ground update (§4.14): pressing jump and an arrow together from standing gives a walking jump (3 tiles/s).
- **Coyote time:** a jump is allowed for `coyoteMs` (6 steps) after leaving the ground without jumping (walk-off, fall-through, grace expiry).
- **Jump buffer:** a jump pressed while airborne is remembered for `jumpBufferMs` (6 steps); if the player lands in that window, it fires on the next step (after one ground speed update with whatever is held).
- Jumping ends grace, resets the drag counter and consumes coyote time.
- **Climbing:** feet reach 2 tiles on step 10 of the rise; the highest reachable ledge is **2 tiles**. 3-tile ledges are forbidden (equal to the apex: knife-edge).

### 4.11 Walls and ceilings

- **Wall stop:** if horizontal movement is blocked by a solid tile (safe, or matching colored), the player stops at contact and `vx ← 0`. **The gear is unchanged.** Holding into a wall just pushes against it at speed 0 (white). Same on the ground and in the air (in the air the player then falls straight down, and the air rule lowers the gear to `minGear`).
- Steps up are walls: no slopes, no automatic step-up.
- **Ceiling:** hitting a solid tile from below sets `vy ← 0`; horizontal speed and gear unchanged.
- **Level bounds:** outside the grid left, right and top counts as safe solid. Below the grid is open.

### 4.12 Death, restart, exit

- **Death:** the only death in M1 is falling out of the level, when the top of the player's box is below the bottom edge of the grid. The player is frozen for `deathFreezeMs` (24 steps; inputs ignored except R), then respawns.
- **Respawn and restart (R)** reset the whole run: player standing at the spawn, `vx = vy = 0`, gear = `startGear` (1), band white, facing right, all buffers, timers, drag, grace and direction-priority state cleared, step counter 0. R works at any time, including during the death freeze, and takes effect on the next step. **The selected gear does not survive a death or restart.**
- Buttons still held across a respawn act normally from the first step of the new run (holding Right through a death walks you right as soon as you respawn).
- **No checkpoints.** Levels are single rooms sized for a 10–40 second solve.
- **Exit:** the level is complete on the first step the player overlaps an exit tile, in any color and gear. Exit wins over death on the same step. The level time is the step count of that run.

### 4.13 Determinism

All rules above are pure functions of level + input frames (see `CLAUDE.md`, `docs/tech/architecture.md`). No randomness. Acceptance tests allow small tolerances only so engineering may choose equivalent formulas.

### 4.14 Reference step order

Normative for M1, so acceptance numbers match. gameplay-engineer/tech-lead may propose a different order in `docs/tech/` if the acceptance tests in `docs/design/features/` still pass.

1. Read input: held `L`/`R`/`J`/`+`/`-` and press edges (vs. the previous frame); restart.
2. **Shift:** if grounded, apply `+`/`-` presses to the gear (clamped 1–4). If airborne, add to the shift buffer.
3. **Direction:** update direction priority, compute d, update facing.
4. **Ground speed:** if grounded at the start of the step, apply §4.4 with target `d × gearSpeeds[gear]`.
5. **Jump:** if a jump is pressed or buffered and the player is grounded or in coyote time, launch (`vy` = 15 up), become airborne, end grace, reset drag counter.
6. **Gravity** (capped).
7. **Move X**, resolve walls (§4.11).
8. **Move Y**, resolve floors and ceilings using the current band, no-embed and grace. Determine grounded/airborne at end of step.
9. **Air drag:** if airborne this step, add `|Δx|`, apply a band drop (§4.9).
10. **Band:** recompute from `|vx|`. If airborne, `gear ← max(minGear, min(gear, band))`.
11. **Landing:** if the player landed this step: drag counter ← 0, apply shift buffer, end coyote.
12. **Grace:** start grace if the band changed while grounded at both start and end of the step; otherwise count down.
13. **Timers:** coyote, jump buffer, shift buffer count down.
14. **Exit, then death checks.**

## 5. Sanity math

All numbers come from stepping these rules at 60 Hz with shipped tuning. Distances are center travel in tiles; step counts start at 1 on the first step of the action.

### 5.1 Runway from standing (hold a direction in gear 4)

| Becomes | After | Step | Time |
|---|---|---|---|
| blue (3 tiles/s, instant) | 0.03 tiles | 1 | 0.02 s |
| green | 0.60 tiles | 10 | 0.17 s |
| yellow | 1.88 tiles | 23 | 0.38 s |
| red | 3.23 tiles | 32 | 0.53 s |
| full sprint (12) | 4.00 tiles | 36 | 0.60 s |

So **2.5 tiles of runway can never make red; 4 tiles always reach full sprint.** Yellow needs 1.9 tiles (deny with ≤ 1.25).

Cruising, one gear up: blue→green after 0.57 tiles (9 steps), green→yellow 0.69 (6 steps), yellow→red 0.66 (4 steps). Reaching the new cruise speed takes 1.25–1.42 tiles.

### 5.2 Slowing down

| From cruise | Let go: stops after | Color sequence (let go) |
|---|---|---|
| gear 4 (12) | 3.74 tiles, step 35 | yellow 0.74 (step 4), green 1.91 (12), blue 3.24 (26), white 3.74 (35) |
| gear 3 (9) | 2.54 tiles, step 28 | green 0.69 (5), blue 2.03 (19), white 2.54 (28) |
| gear 2 (6) | 1.29 tiles, step 18 | blue 0.78 (9), white 1.29 (18) |
| gear 1 (3) | instantly, step 1 | white |

Shifting down while holding brakes at the same rate: gear 4 → gear 1 reaches blue after 3.24 tiles (step 26) and cruises at 3 from step 34 (3.72 tiles). One gear down changes color after 0.69–0.78 tiles.

**Reversal (hold the other way):**

| From | Turn step (distance skidded) | Full speed the other way | Net displacement |
|---|---|---|---|
| gear 4 | step 35 (3.72 tiles) | step 70 | −0.25 tiles |
| gear 3 | step 28 (2.52) | step 55 | −0.03 |
| gear 2 | step 18 (1.27) | step 35 | −0.02 |
| gear 1 | step 1 (0) | step 1 | 0 |

### 5.3 Jumps on flat ground (take off and land at the same height)

Air time is always 48 steps (0.8 s); apex 3.0 tiles on step 24. Unchanged by the control model (the air is identical).

| Takeoff | Distance | Drag drop | Lands as |
|---|---|---|---|
| standing (0) | 0 | — | white |
| gear 1 (3) | 2.4 | none (floor) | blue |
| gear 2 (6) | 4.8 | none (< 6 tiles) | green |
| gear 3 (9) | 6.8 | step 40 at 6.0 tiles | **green** |
| gear 4 (12) | 8.7 | step 30 at 6.0 tiles | **yellow** |
| red mid-ramp (10.5) | 8.1 | step 35 | yellow |

Headline: **a gear-4 jump flies 8.7 tiles and lands yellow (gear 3).** Gear 2 and below keep their color on any flat jump. Drag happens at step 30, after the apex at step 24, so a sprint jump could only land red on a surface ≥ 2.8 tiles above takeoff, which the 2-tile climb limit forbids: **sprint jumps always land yellow or lower.**

### 5.4 Jumps to other heights

| Landing height | Gear 4 lands | Gear 3 lands |
|---|---|---|
| +2 tiles | 7.2 tiles, yellow | 5.7 tiles, **yellow** (no drop) |
| +1 | 8.1, yellow | 6.4, green (drop 4 steps before landing) |
| 0 | 8.7, yellow | 6.8, green |
| −2 | 9.8, yellow | 7.5, green |
| −4 | 10.7, yellow | 8.1, green |
| −7 | 12.1, **green** (two drops) | — |

**Walking off a ledge at full sprint** (no jump): a 2-tile drop lands 4.0 tiles out, a 4-tile drop 5.6 tiles out, both still **red**; a 7-tile drop lands 7.2 tiles out, yellow.

### 5.5 After landing

Landing never re-accelerates you past your landing color (gear follows color). Holding the same direction cruises on; letting go stops you per §5.2 (a sprint jump lands at 9: stop in 2.54 tiles, passing green and blue, so stop on safe ground).

### 5.6 Gaps

Widest flat gap you can just clear ≈ flight distance + 0.75 (player width). Recommended maximum leaves ≥ 1 tile of slack: **gear n clears 2n tiles comfortably** (gear 1: 2, gear 2: 4, gear 3: 6, gear 4: 8).

### 5.7 Fairness windows

- Color grace + coyote: 12 steps (0.2 s) from your color changing under you to the last valid jump.
- Two Colors (shift green→yellow, then jump): yellow 6 steps after the press, then up to 12 steps to jump.
- Brake (w1-04): the window to start slowing is ~3.5 tiles at sprint (≥ 17 steps).

### 5.8 What changed and why

- v1.0 → v1.1 (hold-to-move): walking range 0–3 is now instant on the ground, gears are 1–4, wall stops keep the gear. Runway to full sprint 5.02 → **4.00 tiles**; red 4.45 → **3.23**; stopping from sprint 4.87 → **3.74**. Air numbers are unchanged.
- Seed → v1.0: `airDragTilesPerGear` 4 → 6 and `jumpTimeToApexMs` 380 → 400 (see decisions.md).

## 6. Level design rules of thumb

- Runway from standing: red needs ≥ 4 tiles (deny with ≤ 2.5); yellow ≥ 2.5 (deny ≤ 1.25); green ≥ 1 (deny with ≤ 0.5). Blue is instant.
- Upshift one gear from a cruise: color changes after ~0.6–0.7 tiles. Downshift or letting go: ~0.7–0.8 tiles per color.
- Stopping from sprint takes 3.74 tiles and passes every color: stop on safe tiles. Turnarounds above walking pace too.
- Max climb: 2 tiles. Never 3. Jump headroom: player 1.5 + jump 3 = 4.5 tiles.
- Every 6 tiles of flight costs one color, down to blue. Sprint jumps always land yellow or lower.
- Recommended max gap: 2 × gear tiles.
- Corridors: the player is 1.5 tiles tall; 2-tile-tall corridors are fine.
- Keep intended drag drops at least 3 steps away from the intended landing.
- Walls stop you but keep your gear.
- Every level must ship a solution recording that passes the replay test.

## 7. Puzzle toolbox (teaching order)

| World | Theme | Pieces | Milestone |
|---|---|---|---|
| 1 Gears | moving, shifting, runway, braking | colored floors, safe tiles | M2 |
| 2 Flight | committing at takeoff | air drag, long gaps, drops, colored landing pads | M2 |
| 3 Ground | surfaces that change pace | colored walls, mud, ice, boost pads, speed cameras | M3 |
| 4 Relative | speed relative to the world | conveyors, moving platforms, crates | M3 (Should) |
| 5 Afterimage | your past pace as geometry | red ghost platforms | M3 (Should) |

### 7.1 World 3–5 pieces (provisional, specs due before M3)

Direction, not specs. Each gets a feature spec before engineering starts.

- **Colored walls:** already covered by §4.7. Blocks only its own color.
- **Mud** (`~`, always solid): while supported only by mud, `gear ← min(gear, mudMaxGear)` (2). Entering faster brakes at the normal rate, so you stay fast for a short distance; the gear stays capped after you leave.
- **Ice** (`=`, always solid): while supported only by ice, speed and gear are locked. Shift presses are ignored (not buffered); holding, letting go and reversing do nothing. You leave ice at the speed you entered.
- **Boost pad** (`*`, always solid): touching its top while grounded sets gear `boostPadGear` (4) and `|vx|` 12 instantly, in the direction of motion (or facing, if standing).
- **Speed camera gate** (`w b g y r`): solid unless your band equals the camera's gear. A colored wall stops its color; a camera admits only its color. On the ground you can't move at white pace, so white cameras only open to vertical movement or riding a conveyor.
- **Conveyors / moving platforms (world 4):** world velocity = leg velocity + surface velocity. Colored tiles read **leg** speed; camera gates read **world** speed. Not holding on a belt = white legs, carried along.
- **Crates (world 4):** running into a crate pushes it; it takes your band color and keeps it. Details open.
- **Afterimage (world 5), candidate rule:** while red and airborne, you leave a ghost tile under your feet every `ghostSpacingTiles` (1); ghosts last `ghostLifetimeMs` (3000 ms), become solid only once you no longer overlap them, and are solid from above for every band except red. Needs a design spike.

## 8. Example puzzles (with numbers)

- **Runway:** a red bridge 2 tiles in front of the spawn, an 8-tile room behind it. Red needs 3.2 tiles; walk back, turn (instant at walking pace), and come in from the far end already red.
- **Coast:** red runway, a 7-tile flat gap, a yellow landing pad. A red takeoff flies 8.7 tiles, turns yellow at 6, lands yellow. Take off yellow and you land green and fall through.
- **Step down:** sprint off a 4-tile ledge onto a red floor. Walking off keeps you red (5.6 tiles of flight); jumping lands yellow and drops you.
- **Two colors:** a green floor under a yellow ledge 2 tiles up. Shift up mid-run and jump in the 12 steps after you turn yellow.
- **Stop sign:** a green bridge ends at the exit ledge with no safe pad: let go on the bridge and you drop; hold through it.
- **Treadmill (world 4):** a white camera gate on a belt. Sprint against the belt so your world speed is zero while your legs stay red.

## 9. Tuning keys (`src/data/tuning.json`)

| Key | Value | Unit | Meaning |
|---|---|---|---|
| `stepHz` | 60 | steps/s | Simulation steps per second. |
| `tileSize` | 32 | px | Pixels per tile. Render only. |
| `gearSpeeds` | [0, 3, 6, 9, 12] | tiles/s | Speed per gear; index 0 is standing. Strictly increasing from 0. |
| `minGear` | 1 | gear | Lowest selectable gear. |
| `startGear` | 1 | gear | Gear at spawn, respawn and restart. |
| `instantMaxGear` | 1 | gear | On the ground, speeds from 0 to `gearSpeeds[instantMaxGear]` change instantly (start, stop, turn). |
| `tilesPerGearChange` | 1.25 | tiles | Ground distance to accelerate across one gear segment above walking pace. |
| `brakeTilesPerGearChange` | 1.25 | tiles | Ground distance to brake across one segment: letting go, downshifting and skidding. |
| `colorBandEdges` | [1.5, 4.5, 7.5, 10.5] | tiles/s | Speeds where the color changes; band = number of edges ≤ speed. |
| `airDragTilesPerGear` | 6 | tiles | Horizontal flight distance that costs one band. |
| `airDragMinBand` | 1 | band | Air drag never lowers the band below this. |
| `jumpHeightTiles` | 3 | tiles | Jump apex height (feet), same for every gear. |
| `jumpTimeToApexMs` | 400 | ms | Time to apex; sets gravity (2h/t²) and launch speed (2h/t). |
| `maxFallSpeed` | 20 | tiles/s | Terminal falling speed. |
| `coyoteMs` | 100 | ms | Jump still allowed after leaving the ground without jumping. |
| `jumpBufferMs` | 100 | ms | A jump pressed this early before landing still fires. |
| `shiftBufferMs` | 100 | ms | A shift pressed in the air this close to landing is applied on landing. |
| `colorGraceMs` | 100 | ms | Floor of your previous color holds you this long after your color changes. |
| `playerWidthTiles` | 0.75 | tiles | Player collision box width. |
| `playerHeightTiles` | 1.5 | tiles | Player collision box height. |
| `deathFreezeMs` | 400 | ms | Pause between falling out and respawning. |
| `mudMaxGear` | 2 | gear | World 3, provisional. Gear cap on mud. |
| `boostPadGear` | 4 | gear | World 3, provisional. Gear and speed set by a boost pad. |
| `ghostSpacingTiles` | 1 | tiles | World 5, provisional. Distance between afterimage ghosts. |
| `ghostLifetimeMs` | 3000 | ms | World 5, provisional. How long a ghost lasts. |

Derived at load (never stored): dt, ms→steps, `accel[n]`, `brake[n]`, gravity, jump launch speed. Removed in v1.1: `pivotMaxBand` (replaced by `instantMaxGear`).

## 10. Scope and deliverables

- **Must:** core rules §4, worlds 1–3 (13 levels), HUD gear meter, title + level select, color-blind patterns, **alternate gear bindings (Q/E, Z/X) and the one-time Sticky Keys tip**, web build on itch.io, **itch.io page copy**.
- **Should:** worlds 4–5 (8 levels), per-level leaderboards, adaptive music that pitch-shifts with gear.
- **Could:** free key-remap screen, ghost replays of top runs, level timer medals, a hidden "ultraviolet" reverse gear.

### Design deliverables

| Deliverable | File | Due |
|---|---|---|
| GDD | `docs/design/gdd.md` | M1 |
| M1 feature specs | `docs/design/features/*.md` | M1 |
| Level plan | `docs/design/level-plan.md` | M2 |
| World 3 specs (mud, ice, boost, camera) | `docs/design/features/` | before M3 |
| World 4–5 specs | `docs/design/features/` | before M3 |
| itch.io page copy | `docs/design/itch-page.md` | M4 (Nov 28) |
| Decision log | `docs/design/decisions.md` | ongoing |

### Milestone mapping

- **M1 grey-box (Nov 8):** §4 in full in one test room, all input bindings including Q/E and Z/X. Specs: `features/movement-and-gears.md`, `color-gating.md`, `air-drag.md`, `jump.md`, `safe-tiles-and-reset.md`.
- **M2 first worlds (Nov 15):** worlds 1–2 (8 levels), HUD gear meter, title, level select, Sticky Keys tip.
- **M3 content (Nov 22):** world 3 (Must), worlds 4–5 (Should).
- **M4 freeze (Nov 28):** itch.io page copy final.

## 11. HUD, audio and visual direction

- Neon geometry on near-black. The world's tint slides smoothly along the spectrum with your actual speed, while gameplay rules use the discrete bands.
- The player's body shows the band color **and** the band's pattern or glyph (color is never the only signal).
- **HUD gear meter** shows the **selected cruise gear (1–4)** and the **current band (white–red)** side by side. They differ while ramping, braking, standing still (gear 2 selected, white band) and after drag. In the air, a small drag meter fills toward the next 6-tile drop.
- A drag drop plays a short down-shift "clunk" and a color flash, because the speed change is instant.
- Music pitch and filter follow your band: muffled and low when slow, bright and high at sprint.

## 12. Open questions

1. **Stepwise drag feel.** The instant speed drop mid-flight is a visible kink. We sell it with audio and a flash; if it reads as a bug in playtests, the fallback is continuous drag (needs re-tuning).
2. **No air control** is a strong choice for players used to platformers. Playtest early; the fallback is a small air nudge that cannot change speed band, which would complicate drag math.
3. **World 5 afterimage rule** needs a design spike before M3.
4. **Crates** (world 4) push rules are undecided.
