# Redshift — Game Design Document

_Owner: design-lead. Version 1.0 (2026-11-02). Source of truth for how the game plays. Every gameplay number lives in `src/data/tuning.json`; this document names the keys and explains them. Decisions and their reasons are logged in `docs/design/decisions.md`._

## 1. Pitch

A puzzle-platformer where **your pace is your color**. Stand still and you're white; sprint and you're red. Colored platforms are only solid when your color matches them, so every puzzle is about where you speed up, where you slow down, and where you take off.

Theme link: you **shift** gears with the **Shift** keys, and the world **red-shifts** as you speed up.

## 2. Pillars

1. **Pace is the puzzle.** Every level is solved by choosing where and how fast to move, not by reflexes alone.
2. **Readable at a glance.** A new player understands the color rule within 10 seconds, without text.
3. **Fair.** The solution never needs pixel-perfect input. Generous coyote time, jump buffering and color grace.
4. **One new idea per level.** Teach, test, twist, then combine.

## 3. Controls

| Action | Keys | Notes |
|---|---|---|
| Shift up | Right Shift | One press = one gear. Holding does not repeat. |
| Shift down | Left Shift | One press = one gear. |
| Face left / right | Left/Right arrows, A/D | **Sets heading only.** You do not hold it to move; your gear moves you. |
| Jump | Space, W, Up | Fixed height. |
| Restart level | R | Instant, any time. |

**Control model: auto-run.** The player behaves like a vehicle: the selected gear sets the target speed, the heading sets the direction, and the player keeps moving with no key held. Gear 0 means "brake to a stop". Pressing a direction while in gear 0 only turns the character. Level 1-1 shows a Right Shift key glyph above the player at spawn (a glyph, not text) so new players find the gas pedal.

## 4. Core rules (precise)

### 4.1 Units and simulation

- Positions and distances are in **tiles**, speeds in **tiles/second**, the simulation runs at a fixed `stepHz` = 60 steps/second (dt = 1/60 s). `tileSize` is used only for rendering.
- All `...Ms` tuning values convert to whole steps: `steps = round(ms × stepHz / 1000)`. Every shipped value is an exact multiple of 1/60 s (100 ms = 6 steps, 400 ms = 24 steps).
- "Up" is up on screen. Heights are measured from the player's feet.
- The player is an axis-aligned box `playerWidthTiles` × `playerHeightTiles` (0.75 × 1.5). The player's **x** is the box's horizontal center; **feet** are the bottom edge.
- **Overlap** always means strict overlap (positive area). Touching edges do not overlap.

### 4.2 Gears and shifting

- Five gears, 0–4, with target speeds `gearSpeeds` = [0, 3, 6, 9, 12]:

  | Gear | Pace | Band color |
  |---|---|---|
  | 0 | stopped | white |
  | 1 | walk | blue |
  | 2 | jog | green |
  | 3 | run | yellow |
  | 4 | sprint | red |

- The **gear** is the player's selected target. It is clamped to 0–4; presses beyond the ends do nothing.
- **Shifting only happens on the ground.** A shift press while airborne (including coyote time) is not applied immediately; it goes into the **shift buffer** (§4.8).
- Shifting while pressed against a solid wall in the heading direction does nothing visible: the wall stop rule (§4.10) returns the gear to 0 on the same step.

### 4.3 Speed model: speed takes distance to change

Speed is the player's horizontal **leg speed** `|vx|`. Vertical speed never counts toward color.

The range between two adjacent gear speeds is a **segment** n (between `gearSpeeds[n]` and `gearSpeeds[n+1]`). Within a segment, speed changes with constant acceleration chosen so that crossing the whole segment takes exactly a fixed ground distance:

- accelerating through segment n: `accel[n] = (v[n+1]² − v[n]²) / (2 × tilesPerGearChange)`
- braking through segment n: `brake[n] = (v[n+1]² − v[n]²) / (2 × brakeTilesPerGearChange)`

With shipped values (both distances 1.25 tiles) these are 3.6, 10.8, 18.0, 25.2 tiles/s² for segments 0–3. Engineers derive them at load time; they are not stored.

Each grounded step, with target speed `T = gearSpeeds[gear]` and current speed `s`:

- if `s < T`: use segment n = the largest n with `v[n] ≤ s`; `s ← min(T, s + accel[n]·dt)`.
- if `s > T`: use segment n = the largest n with `v[n] < s`; `s ← max(T, s − brake[n]·dt)`.
- The segment is chosen from the speed at the start of the step and is not split if the step crosses a gear speed.
- Horizontal position advances by the average of the old and new speed × dt (exact for constant acceleration).

Consequences: from rest, reaching full sprint takes 5 tiles of ground; slowing from sprint to a stop takes 5 tiles. **Braking takes the same distance as accelerating** (`brakeTilesPerGearChange` exists as a separate key only so playtests can tune it independently).

Speed **never changes in the air** except through air drag (§4.8) and wall stops (§4.10).

### 4.4 Direction, reversing, and left vs right

- Left and right are perfectly symmetric. Only `|vx|` matters for color; the sign only says which way you move.
- The **heading** is +1 (right) or −1 (left). The target velocity is `heading × gearSpeeds[gear]`. Pressing a direction sets the heading immediately, on the ground or in the air. If both are pressed on the same step, the heading does not change.
- **Reversing on the ground** (velocity opposes heading): the player brakes toward 0 using the braking rule of §4.3 (a skid), passing down through each lower band. The gear is not changed.
- **Pivot:** on any grounded step where the velocity opposes the heading and the current band is ≤ `pivotMaxBand` (1, blue), the velocity flips sign instantly with the same magnitude, then normal acceleration toward the gear continues. So turning at walking pace is instant, and a skid from high speed ends in a quick turn once you have slowed to blue.
- If the heading flips back during a skid, the player simply accelerates again in the original direction.
- **In the air** a direction press changes the heading but not the velocity. On landing, the reversal rules above apply.
- Level-design consequence: **turning around at speed always passes through blue**, so turning around on a green, yellow or red floor drops you (after grace). Turn-arounds belong on safe tiles.

### 4.5 Speed bands (color)

- The **band** (0–4) is the player's color: white, blue, green, yellow, red. It comes from actual speed `s = |vx|`, never from the selected gear.
- `colorBandEdges` = [1.5, 4.5, 7.5, 10.5]: `band = number of edges ≤ s`. Edges sit midway between gear speeds, so every cruising speed is 1.5 tiles/s from the nearest edge. A speed exactly on an edge belongs to the higher band.
- **No hysteresis.** Speed only crosses edges monotonically (ground ramps, skids and air drag are all monotonic, and cruising speeds sit mid-band), so the color cannot flicker. If a later mechanic (world 4) makes speed oscillate around an edge, we revisit.
- The band is recomputed once per step, after all speed changes for that step (§4.13).

### 4.6 Color gating (what is solid)

Tile kinds in M1:

| Tile | Color | Solid for the player |
|---|---|---|
| empty | — | never |
| solid (terrain) | grey | always, all faces |
| safe | white | always, all faces (identical to grey physically; it marks "you can stop and turn here") |
| colored | blue / green / yellow / red | all faces, **only while the player's band matches the tile's color**, subject to the no-embed rule and grace |
| exit | — | never solid; touching it completes the level |

- **No-embed rule:** a colored tile that overlaps the player's box is treated as empty, even if the colors match, until the player stops overlapping it. The player is never pushed out of or trapped inside a tile because their color changed.
- Colored geometry exists as floors, walls and ceilings; the same rule applies to every face. A red wall stops a red player and lets everyone else through.
- **Landing** on a colored tile requires a match on the step of contact. There is no grace on landing: a mismatched floor is simply not there.
- **Walking onto** a mismatched colored tile is walking into a hole (coyote time applies, grace does not).
- The player is **supported** on any step where some floor-solid tile's top face is level with the feet and overlaps the player horizontally. Standing across two tiles counts if either supports.

### 4.7 Color grace

Grace is only for losing a match **because your color changed** while standing.

- If the band changes on a step where the player was grounded at the start and is grounded at the end, start grace: `graceColor` = the previous band's color, `graceSteps` = colorGraceMs in steps (6).
- While grace is active, tiles of `graceColor` count as solid **from above only** (they can support the feet; they never block sideways or from below). This includes other tiles of that color you walk onto during grace.
- Grace counts down every step and ends when it reaches 0, when the player leaves the ground (jump, walk-off, or falling through), or when a new grace starts (a second color change replaces the old grace color with the newer previous color).
- When grace ends with no other support, the player falls, and **coyote time starts**, so the player still has `coyoteMs` to jump. Total window from color change to last possible jump: 12 steps (0.2 s).
- Grace never applies to walls or ceilings, never on landing, and never when you walk onto a mismatched tile.
- Previous band white (0) has no colored tiles, so no grace is needed.

### 4.8 Airborne: you are committed

The player is airborne whenever not supported (after a jump, walking off a ledge, falling through a tile).

- **Gear follows color in the air.** Every airborne step, `gear ← min(gear, band)`. Flight can lower your gear but never raises it. You take off in the color you are, and you land in the gear of the color you show. If you jump while still ramping up (gear 4, currently yellow), you are gear 3 in the air.
- **No shifting in the air.** A shift press while airborne is stored in the **shift buffer** (net count of up/down presses). Each new press restarts a `shiftBufferMs` window (6 steps); if the window expires, the buffer clears. On the landing step, any buffered presses are applied (clamped 0–4) after the landing rules.
- **Air drag is stepwise.** From the moment the player leaves the ground, the sim accumulates horizontal distance actually travelled in the air (`|Δx|` per step). Each time the total reaches `airDragTilesPerGear` (6 tiles), the player drops **exactly one band**: `|vx| ← gearSpeeds[band − 1]` (sign kept) and the counter decreases by 6. The gear then follows (`min(gear, band)`).
- **Drag floor:** drag never lowers the band below `airDragMinBand` (1, blue). A player who is blue or white in the air keeps their speed for any flight length. Drag can never push speed below 0 or reverse it.
- The drag counter resets to 0 on landing. It also counts during coyote time.
- Rule of thumb for players and designers: **every 6 tiles of flight costs one color.**

### 4.9 Jump, gravity, falling

- **Jump height does not depend on gear.** Every jump has the same apex `jumpHeightTiles` (3) reached after `jumpTimeToApexMs` (400 ms = 24 steps). Gravity `g = 2h/t²` = 37.5 tiles/s²; jump launch speed `2h/t` = 15 tiles/s. Both are derived, not stored. Faster gears jump farther, not higher.
- No variable jump height: releasing the key early does nothing. Arcs are fully predictable.
- Vertical motion uses exact constant-acceleration kinematics per step (`y += vy·dt + ½·g·dt²`), so the sim hits the apex at exactly 3.0 tiles on step 24.
- Falling speed is capped at `maxFallSpeed` (20 tiles/s, 1/3 tile per step: no tunnelling).
- **Coyote time:** a jump is allowed for `coyoteMs` (6 steps) after leaving the ground without jumping (walk-off or fall-through).
- **Jump buffer:** a jump pressed while airborne is remembered for `jumpBufferMs` (6 steps); if the player lands within that window, they jump on the next step.
- Jumping ends grace, resets the drag counter and consumes coyote time.
- Climbing: feet reach 2 tiles on step 10 of the rise; **the highest ledge a player can reach is 2 tiles.** A 3-tile ledge equals the apex exactly and is forbidden in levels (knife-edge).

### 4.10 Walls and ceilings

- **Wall stop:** if horizontal movement is blocked by a solid tile (grey, white, or matching colored), the player stops at contact, `vx ← 0`, `gear ← 0`, band becomes white. Same on the ground and in the air (in the air the player then falls straight down). There is no speed at which you break through or bounce.
- Steps up are walls: there are no slopes and no automatic step-up.
- **Ceiling:** hitting a solid tile from below sets `vy ← 0` (start falling); horizontal speed and gear are unchanged.
- **Level bounds:** outside the grid to the left, right and top counts as grey solid. Below the grid is open.

### 4.11 Death, restart, exit

- **Death:** the only death in M1 is falling out of the level, when the top of the player's box is below the bottom edge of the grid. The sim freezes the player for `deathFreezeMs` (400 ms = 24 steps; inputs ignored except R), then respawns.
- **Respawn and restart (R):** reset the whole run: player at the spawn point (feet on the top of the tile below the spawn marker, x at the spawn tile's center), velocity 0, gear 0, band white, heading = the level's spawn facing (default right), all buffers, timers, drag and grace cleared, step counter to 0. R works at any time, including during the death freeze, and takes effect on the next step. Level geometry has no state in M1; later moving objects reset too.
- **No checkpoints.** Levels are single rooms sized for a 10–40 second solve.
- **Exit:** the level is complete on the first step the player overlaps an exit tile, in any color and gear. The sim stops; the level time is the step count of that run (deaths and restarts start a new run).

### 4.12 Determinism

All rules above are pure functions of level + inputs per step (see `CLAUDE.md`). No randomness. Floating-point results must be identical across runs on the same build; acceptance tests allow small tolerances only so engineering may choose equivalent formulas.

### 4.13 Reference step order

Normative for M1, so that acceptance numbers match. tech-lead may propose a different order in `docs/tech/` if the acceptance tests in `docs/design/features/` still pass.

1. Read this step's input edges (shift up/down, left/right, jump, restart).
2. **Shift:** if grounded, apply presses to the gear (clamped). If airborne, add to the shift buffer.
3. **Heading:** apply a direction press.
4. **Ground speed:** if grounded at the start of the step, apply pivot (§4.4), then acceleration or braking (§4.3).
5. **Jump:** if a jump is pressed or buffered and the player is grounded or in coyote time, launch (vy = −15), become airborne, end grace, reset drag counter, `gear ← min(gear, band)`.
6. **Gravity** (capped).
7. **Move X**, resolve walls (§4.10).
8. **Move Y**, resolve floors and ceilings using current band, no-embed and grace (§4.6, §4.7). Determine grounded/airborne at end of step.
9. **Air drag:** if airborne this step, add `|Δx|`, apply band drops (§4.8).
10. **Band:** recompute from `|vx|`. If airborne, `gear ← min(gear, band)`.
11. **Landing:** if the player landed this step: drag counter ← 0, apply shift buffer, end coyote.
12. **Grace:** start grace if the band changed while grounded at both start and end of the step; otherwise count down.
13. **Timers:** coyote, jump buffer, shift buffer count down.
14. **Death and exit checks.**

## 5. Sanity math

All numbers below come from stepping the rules above at 60 Hz (shipped tuning). Distances are feet travel in tiles. "Step" counts start at the first step of the action.

### 5.1 Runway from a standstill (shift straight to gear 4)

| Becomes | After | Steps | Time |
|---|---|---|---|
| blue | 0.31 tiles | 25 | 0.42 s |
| green | 1.82 tiles | 59 | 0.98 s |
| yellow | 3.10 tiles | 72 | 1.20 s |
| red | 4.45 tiles | 81 | 1.35 s |
| full sprint (12) | 5.02 tiles | 84 | 1.40 s |

So **4 tiles of runway can never make red; 5 tiles always can.** The first gear is the slow one (0.83 s to reach walking speed), then the upper gears come quickly.

Cruising, one gear up: blue→green after 0.57 tiles (9 steps), green→yellow 0.69 tiles (6 steps), yellow→red 0.66 tiles (4 steps).

### 5.2 Braking

From full sprint, shifting down to gear 0: yellow after 0.74 tiles (4 steps), green 1.91 (12), blue 3.24 (26), white 4.58 (58), stopped 4.87 tiles (83 steps).
One gear down from a cruise: color changes after 0.69–0.94 tiles.

**Reversal from full sprint:** skid 3.24 tiles forward (26 steps), pivot to the other direction at 4.3 tiles/s on step 27, full sprint the other way by step 53, ending almost exactly where the reversal began. Turning at blue or white is instant.

### 5.3 Jumps on flat ground (take off and land at the same height)

Air time is always 48 steps (0.8 s); apex 3.0 tiles on step 24.

| Takeoff | Distance | Drag drop | Lands as |
|---|---|---|---|
| gear 0 (0) | 0 | — | white |
| gear 1 (3) | 2.4 | none (floor) | blue |
| gear 2 (6) | 4.8 | none (< 6 tiles) | green |
| gear 3 (9) | 6.8 | step 40 at 6.0 tiles | **green** |
| gear 4 (12) | 8.7 | step 30 at 6.0 tiles | **yellow** |
| red mid-ramp (10.5) | 8.1 | step 35 | yellow |

Headline: **a gear-4 jump flies 8.7 tiles and lands yellow (gear 3).** Gear 2 and below keep their color on any flat jump. Because drag happens at step 30 and the apex is at step 24, a sprint jump can only land red on a surface at least 2.8 tiles above takeoff, which the 2-tile climb limit forbids: **sprint jumps always land yellow or lower.**

### 5.4 Jumps to other heights (gear 4 / gear 3 takeoff)

| Landing height | Gear 4 lands | Gear 3 lands |
|---|---|---|
| +2 tiles | 7.2 tiles, yellow | 5.7 tiles, **yellow** (no drop) |
| +1 | 8.1, yellow | 6.4, green (drop 4 steps before landing) |
| 0 | 8.7, yellow | 6.8, green |
| −2 | 9.8, yellow | 7.5, green |
| −4 | 10.7, yellow | 8.1, green |
| −7 | 12.1, **green** (two drops) | — |

**Walking off a ledge at full sprint** (no jump): a 2-tile drop lands 4.0 tiles out, a 4-tile drop 5.6 tiles out, both still **red**; a 7-tile drop lands 7.2 tiles out, yellow. Stepping down keeps your color better than jumping.

### 5.5 Gaps

With a 0.75-tile-wide player, the widest flat gap you can just clear is roughly flight distance + 0.75. Recommended maximum gaps leave ≥ 1 tile of slack: **gear n clears 2n tiles comfortably** (gear 1: 2, gear 2: 4, gear 3: 6, gear 4: 8). Coyote jumps add more.

### 5.6 Fairness windows

- Color grace + coyote: 12 steps (0.2 s) from your color changing under you to the last valid jump.
- Two Colors (shift green→yellow, then jump): yellow arrives 6 steps after the press; you then have up to 12 steps to jump.
- Brake puzzle (1-4): see the level plan; windows are sized ≥ 3 tiles at sprint (≥ 15 steps).

### 5.7 Changes made to the seed values

- `airDragTilesPerGear` 4 → **6**. With 4, every jump at gear 2 or above lost a color, gear-2 jumps lost it 5 steps before landing (knife-edge), and a sprint jump into a 2-tile drop lost two. With 6, slow jumps are safe, sprint jumps lose exactly one color, with the drop well before landing.
- `jumpTimeToApexMs` 380 → **400**. Makes air time exactly 48 steps, gravity 37.5 and launch speed 15 (round numbers), and spreads flat-jump distances evenly around the 6-tile drag point (gear 2: 4.8, gear 3: 6.8, each ~1 tile from it).
- Bands, accelerating and braking distances, coyote, buffers and grace keep the seed values.

## 6. Level design rules of thumb

- Runway to red from a standstill: ≥ 5 tiles. To deny red: ≤ 4 tiles.
- Upshift one gear from a cruise: color changes after ~0.7 tiles. Downshift: ~0.7–0.9 tiles.
- Turnarounds above blue need safe tiles (you pass through every lower color).
- Max climb: 2 tiles. Never 3 (knife-edge). Jump headroom: player 1.5 + jump 3 = 4.5 tiles.
- Every 6 tiles of flight costs one color, down to blue. Sprint jumps always land yellow or lower.
- Recommended max gap: 2 × gear tiles.
- Corridors: the player is 1.5 tiles tall; 2-tile-tall corridors are fine.
- Keep intended drag drops at least 3 steps away from the intended landing (avoid knife-edges like gear 3 onto a +1 pad, which has only 4).
- Hitting any solid wall drops you to gear 0. Use it as an instant brake, or punish a bad line with it.
- Every level must ship a solution recording that passes the replay test.

## 7. Puzzle toolbox (teaching order)

| World | Theme | Pieces | Milestone |
|---|---|---|---|
| 1 Gears | shifting, runway, braking, safe spots | colored floors, safe tiles, walls | M2 |
| 2 Flight | committing at takeoff | air drag, long gaps, drops, colored landing pads | M2 |
| 3 Ground | surfaces that change pace | colored walls, mud, ice, boost pads, speed cameras | M3 |
| 4 Relative | speed relative to the world | conveyors, moving platforms, crates | M3 (Should) |
| 5 Afterimage | your past pace as geometry | red ghost platforms | M3 (Should) |

### 7.1 World 3–5 pieces (provisional, specs due before M3)

These are direction, not specs. Each gets a feature spec before engineering starts.

- **Colored walls:** already covered by §4.6 (no extra code). Blocks only its own color.
- **Mud** (always solid, brown): while supported only by mud, the gear is capped at `mudMaxGear` (2). Entering above the cap brakes at the normal rate, so you stay fast for a short distance.
- **Ice** (always solid): while supported only by ice, speed and gear are locked. Shift presses are ignored (not buffered), no acceleration, no braking, no pivot. You leave ice at the speed you entered.
- **Boost pad** (always solid): landing on or running onto it sets gear and speed instantly to `boostPadGear` (4) in the heading direction.
- **Speed camera gate:** a column marked with a gear glyph. Solid unless your band equals the camera's gear. The inverse of a colored wall: a colored wall stops its color, a camera admits only its color.
- **Conveyors / moving platforms (world 4):** your world velocity = leg velocity + surface velocity. Colored tiles read **leg** speed; camera gates read **world** speed. That split is the whole idea of world 4.
- **Crates (world 4):** running into a crate pushes it; it takes your band color and keeps it, becoming a colored block. Details open.
- **Afterimage (world 5), candidate rule:** while red and airborne, you leave a ghost tile under your feet every `ghostSpacingTiles` (1); ghosts last `ghostLifetimeMs` (3000 ms), become solid only once you no longer overlap them, and are solid from above for every band except red ("you can stand on your past, not your present"). Needs a design spike; see open questions.

## 8. Example puzzles (with numbers)

- **Runway:** a yellow bridge 2 tiles in front of the spawn, an 8-tile room behind it. You can't reach yellow (3.1 tiles) in front of you; go back to use the room and come in already yellow.
- **Coast:** red runway, a 7-tile flat gap, a yellow landing pad. A red takeoff flies 8.7 tiles, drag turns you yellow at 6 tiles, you land yellow. Take off yellow and you land green and fall through.
- **Step down:** sprint off a 4-tile ledge onto a red floor below. Walking off keeps you red (5.6 tiles of flight); jumping lands yellow and drops you.
- **Two colors:** a green floor under a yellow ledge 2 tiles up. Shift up mid-run and jump in the 12 steps after you turn yellow, before the floor drops you.
- **Treadmill (world 4):** a white camera gate on a belt. Sprint against the belt so your world speed is zero while your legs stay red.

## 9. Tuning keys (`src/data/tuning.json`)

| Key | Value | Unit | Meaning |
|---|---|---|---|
| `stepHz` | 60 | steps/s | Simulation steps per second. |
| `tileSize` | 32 | px | Pixels per tile. Render only. |
| `gearSpeeds` | [0, 3, 6, 9, 12] | tiles/s | Target speed per gear 0–4. Must be strictly increasing, starting at 0. |
| `tilesPerGearChange` | 1.25 | tiles | Ground distance to accelerate across one gear segment. |
| `brakeTilesPerGearChange` | 1.25 | tiles | Ground distance to brake across one gear segment (downshift and skids). |
| `pivotMaxBand` | 1 | band | At or below this band, reversing direction on the ground is instant. |
| `colorBandEdges` | [1.5, 4.5, 7.5, 10.5] | tiles/s | Speeds where the color changes; band = number of edges ≤ speed. |
| `airDragTilesPerGear` | 6 | tiles | Horizontal flight distance that costs one band. |
| `airDragMinBand` | 1 | band | Air drag never lowers the band below this. |
| `jumpHeightTiles` | 3 | tiles | Jump apex height (feet), same for every gear. |
| `jumpTimeToApexMs` | 400 | ms | Time to apex; sets gravity (2h/t²) and launch speed (2h/t). |
| `maxFallSpeed` | 20 | tiles/s | Terminal falling speed. |
| `coyoteMs` | 100 | ms | Jump still allowed after leaving the ground without jumping. |
| `jumpBufferMs` | 100 | ms | A jump pressed this early before landing still fires. |
| `shiftBufferMs` | 100 | ms | A shift pressed in the air this close to landing is applied on landing. |
| `colorGraceMs` | 100 | ms | Floor of your previous color stays solid this long after your color changes under you. |
| `playerWidthTiles` | 0.75 | tiles | Player collision box width. |
| `playerHeightTiles` | 1.5 | tiles | Player collision box height. |
| `deathFreezeMs` | 400 | ms | Pause between falling out and respawning. |
| `mudMaxGear` | 2 | gear | World 3, provisional. Gear cap on mud. |
| `boostPadGear` | 4 | gear | World 3, provisional. Gear and speed set by a boost pad. |
| `ghostSpacingTiles` | 1 | tiles | World 5, provisional. Distance between afterimage ghosts. |
| `ghostLifetimeMs` | 3000 | ms | World 5, provisional. How long a ghost lasts. |

Derived at load (never stored): step dt, ms→steps, `accel[n]`, `brake[n]`, gravity, jump launch speed.

## 10. Scope

- **Must:** core rules §4, worlds 1–3 (13 levels), HUD gear meter, title + level select, color-blind patterns, web build on itch.io.
- **Should:** worlds 4–5 (8 levels), per-level leaderboards, adaptive music that pitch-shifts with gear, alternate key bindings.
- **Could:** ghost replays of top runs, level timer medals, a hidden "ultraviolet" reverse gear.

### Milestone mapping

- **M1 grey-box (Nov 8):** §4 in full in one test room. Feature specs: `features/movement-and-gears.md`, `color-gating.md`, `air-drag.md`, `jump.md`, `safe-tiles-and-reset.md`.
- **M2 first worlds (Nov 15):** worlds 1–2 (8 levels, see `level-plan.md`), HUD gear meter, title, level select.
- **M3 content (Nov 22):** world 3 (Must), worlds 4–5 (Should), specs for §7.1 first.

## 11. HUD, audio and visual direction

- Neon geometry on near-black. The world's tint slides smoothly along the spectrum with your actual speed, while gameplay rules use the discrete bands.
- The player's body shows the band color **and** the band's pattern or glyph (color is never the only signal).
- **HUD gear meter** shows two things: the selected gear (0–4) and the current band. When they differ (ramping, skidding) the gap is visible. In the air, a small drag meter fills toward the next 6-tile drop.
- A drag drop plays a short down-shift "clunk" and a color flash, because the speed change is instant.
- Music pitch and filter follow your band: muffled and low when slow, bright and high at sprint.

## 12. Open questions

1. **Control model.** Auto-run (direction keys only turn) is assumed throughout. If playtests show players expect hold-to-move, that changes every number above. Confirm early.
2. **Stepwise drag feel.** The instant speed drop mid-flight is a visible kink in the arc. We sell it with audio and a flash; if it reads as a bug in playtests, the fallback is continuous drag with matching band edges (needs re-tuning).
3. **World 5 afterimage rule** needs a design spike before M3; the candidate rule in §7.1 is unproven.
4. **Crates** (world 4) push rules are undecided.
