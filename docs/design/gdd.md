# Redshift — Game Design Document

_Owner: design-lead. **Version 1.12 (2026-11-23, expansion; owner's request "add more levels, some longer, projectiles to dodge, moving objects", which is the owner's scope sign-off; `decisions.md` 2026-11-23 "Expansion"): movers (§4.16, Must), bolts (§4.17, Must) and the sweep (§4.18, Should) added; worlds 4 Motion and 5 Signals plus w2-05 (§7): 23 Must levels; long levels without checkpoints (§4.12, `level-plan.md` "Long levels"); Gates world becomes Could; pillar 1 wording (§2). Reconciled with tech-lead's `docs/tech/expansion-approach.md`. No rule, tuning value or level changes for the 14 shipped levels.** Version 1.11 (2026-11-20, batch 7 playtest triage, `decisions.md` 2026-11-20): **no rule, tuning or geometry change; still 14 Must levels**. Hint glyphs added to w3-03 (spawn), w3-04 and w3-05 (opening and kerb) (§3). The restart card is drawn at 2× with a white outline. Menu sounds are now Could. Settings changed from pause apply at the next level load (Should: on resume). Version 1.10 (2026-11-19, batch 6 cold-playtest triage, `decisions.md` 2026-11-19): **no rule, tuning or geometry change; still 14 Must levels (w2-03 kept)**; hint glyphs added to w1-03, w2-04 and w3-03 (§3); a render-only restart card for a body stuck in a sealed pocket (§4.12, `features/restart-prompt.md`, Must); in-game sound effects confirmed Must and named in §10; a three-toggle settings screen specced as Should, pending producer sign-off (`features/settings.md`); w3-02..w3-05 need a cold play before submit (§10). Version 1.9 (2026-11-17, batch 6 closing): **all 14 Must levels built and approved** (§10 lists what is left on the Must list); Tandem pins are 1-tile safe kerbs, because no colored wall can hold a body (§4.11, §6, §8); w2-04's 13-step grace window is a stated fairness exception (§5.7); no rule or tuning-value change. Version 1.8 (2026-11-16, batch 6): **Tandem stays as world 3** (owner decision 2026-11-16: the gate is closed, the gates-world fallback is dropped, and calendar dates no longer drive the plan); three render/scene keys added to `tuning.json` (`runFramesPerTile` 3, `sprintFramesPerTile` 2, `cameraMaxApartTiles` 28, §9); no rule or gameplay-value change. Version 1.7 (2026-11-13, batch 4A): pixel cutover: `tileSize` 32 → 16 and the 480×270 base resolution noted (§4.1, §9, §11), no rule or level change; Tandem decision gate moved to Tue Nov 17 (owner decision, §10). Version 1.6 (2026-11-04, batch 2): the four cut tuning keys deleted (T-03); world-1 low roofs over bridges adopted as a level rule (§6); M3-02 specs written: `features/leaderboards.md` (rank by steps, show time), `adaptive-audio.md` (music per band, the ten SFX, per-body Tandem voices), `pixel-effects.md` (drop cue, reduced effects and reduced motion, Tandem per body). No rule or tuning-value change. Version 1.5 (2026-11-04): menus and onboarding specced for 480×270 (M2-34, M2-01); **the first level of every world is unlocked from the start** (owner decision), so a voter can reach w3-01 Tandem quickly; onboarding hints add `shiftDown` (w1-02) and `jump` (w2-01); the twin's art silhouette adopted. No rule or tuning change. Version 1.4 (2026-11-03): the studio owner picked **Tandem** as the core twist (`core-twists.md`): world 3 becomes five Tandem levels (Must, M3); speed gates and ice become Should; art direction C (Pixel Dither, 480×270 logical) noted in §11. Version 1.3 (2026-11-03): puzzle depth review (`docs/design/mechanics-review.md`): speed gates and colored walls come into worlds 1–2 (M2); worlds rebuilt (§7); mud, boost pads, conveyors, moving platforms, crates and afterimage cut. Core rules §4–5 unchanged except the gate tile (§4.7). Version 1.2 (2026-11-02): hold-to-move control model; sanity numbers and rule wording matched to the implemented M1 sim. Source of truth for how the game plays. Every gameplay number lives in `src/data/tuning.json`; this document names the keys and explains them. Decisions and their reasons are logged in `docs/design/decisions.md`._

## 1. Pitch

A puzzle-platformer where **your pace is your color**. Stand still and you're white; sprint and you're red. Colored platforms are only solid when your color matches them, so every puzzle is about where you speed up, where you slow down, and where you take off.

Then the twist: **one throttle, two runners.** A second runner, the twin, obeys the same keys on its own floor. Same input, but each body's color comes from its own history, so the puzzle becomes putting the two out of step (a wall that stops only one, a jump that resets one) and back in step.

Theme link: you **shift** gears with the **Shift** keys, the world **red-shifts** as you speed up, and in Tandem you phase-shift two runners against each other.

## 2. Pillars

1. **Pace is the puzzle.** Every level is solved by choosing where, when and how fast to move, not by reflexes alone. Everything that moves runs on a fixed clock you can read (v1.12).
2. **Readable at a glance.** A new player understands the color rule within 10 seconds, without text. One rule covers everything colored: blocks, slabs and bolts only exist for their own color (v1.12).
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
- Onboarding glyphs (icons, not text; `features/onboarding-hints.md`): an arrow-key glyph above the spawn in w1-01; a shift-up glyph (Right Shift/E/X) over the first pad of w1-02 and a shift-down glyph (Left Shift/Q/Z) over its second; a jump glyph in w2-01. Because every world's first level is open from the start, w2-01 and w3-01 also carry the glyphs a cold starter needs (Should). Added 2026-11-19 (Must), where the playtest showed the idea could not be read from the screen: a shift-up glyph over w1-03's back wall, a shift-up glyph stacked over a jump glyph on w2-04's green floor, and a jump glyph at w3-03's takeoff. Added 2026-11-20 (Must, batch 7 playtest): a shift-up glyph over the runner's spawn in w3-03 and w3-04; w3-03's jump glyph repeated in w3-04 and w3-05; and in w3-05 a shift-up glyph over the walk-back stop with a jump glyph at the kerb takeoff. The clamp and the down presses are never hinted.
- Menus are keyboard only and never need Shift (`features/menu-navigation.md`). Pause is Esc or P; focus loss pauses automatically (`features/pause.md`).

## 4. Core rules (precise)

### 4.1 Units and simulation

- Positions and distances are in **tiles**, speeds in **tiles/second**, the simulation runs at a fixed `stepHz` = 60 steps/second (dt = 1/60 s). `tileSize` is used only for rendering: the game draws at **480×270 logical pixels with 16 px tiles**, scaled by a whole-number zoom (2× in the 960×540 itch frame), so the view is 30 × 16.875 tiles (§11). Changing the resolution or `tileSize` never changes a rule, a level or a solution.
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
- **Facing** is +1 or −1, starts at +1 (right), and becomes d whenever d ≠ 0 (ground or air). Facing is visual only (boost pads, which would have used it, are cut).
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
   - if `s > |T|` (downshift): if `s ≤ gearSpeeds[instantMaxGear]`, `s ← |T|` instantly (walking range); else n = largest n with `v[n] < s`; `s ← max(|T|, s − brake[n]·dt)`. (With shipped tuning the walking range holds only gear 1, so the instant case never arises; it matters only if `instantMaxGear` is raised.)
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

- The **band** (0–4) is the player's color: white, blue, green, yellow, red. `colorBandEdges` = [1.5, 4.5, 7.5, 10.5]; `band = number of edges ≤ s`. A speed exactly on an edge belongs to the higher band; "exactly" is judged within `SIM_EPSILON` (1e-9, `docs/tech/architecture.md` §3.3), so a ramp that sums to 7.5 (6 + 5 × 0.3) is yellow on that step.
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
| speed gate | `w` `b` `g` `y` `r` (band 0–4) | all faces, **unless the player's band equals the gate's band**; own no-embed group per band; never graced (Should since v1.4, `features/speed-gates.md`) |
| twin spawn | `&` | empty; the twin spawns standing on the bottom edge of this cell (§4.15); at most one |
| exit | `E` | never solid; touching it completes the level |
| player start | `@` | empty; the player spawns standing on the bottom edge of this cell |

- **No-embed rule (per color):** while the player's box overlaps any colored tile of color k at the start of a move, **every** color-k tile is treated as empty for that move (walls, floors, ceilings and grace), even if the colors match, until the box is clear of color k. In words: if you are inside a color, that color is a ghost to you until you are out. (Per tile would stop a player who changes color inside a thick wall at the wall's next column.) Level consequence: never hang a colored tile less than 1.5 tiles (player height) above a floor of the same color, or the player could fall through that floor while still inside the tile above it.
- Colored geometry exists as floors, walls and ceilings; the same rule applies to every face. A red wall stops a red player and lets everyone else through (taught in w1-05; checks in `features/colored-walls.md`).
- **Speed gates are the opposite:** a gate of band k is solid for everyone except a band-k player ("opens only for its color"). In the floor it is a trapdoor that opens on the step after you turn its color (no grace; coyote applies). Gates have their own no-embed group: being inside a green gate never empties green colored tiles, and vice versa. A white gate (`w`) opens only at speed 0, so it is used as a floor or ceiling, never as a wall.
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
- **Air drag is stepwise.** From leaving the ground, the sim accumulates horizontal distance actually moved in the air (`|Δx|` per step, counting the takeoff or walk-off step and the landing step). Each time the total reaches `airDragTilesPerGear` (6), the player drops **exactly one band**: `|vx| ← gearSpeeds[band − 1]` (sign kept), counter −= 6. At most one drop per step.
- **Drag floor:** drag never lowers the band below `airDragMinBand` (1, blue). Blue or white flyers keep their speed for any flight. At or below the floor the counter keeps adding up but can never cause a drop (speed never rises in the air) and is reset on landing; the HUD hides the drag meter there.
- The drag counter resets to 0 on landing. It also counts during coyote time.
- **On landing**, ground rules resume on the next step with whatever is held then: holding the same way cruises in the (possibly lowered) gear, nothing held brakes to a stop, the opposite direction skids.
- Rule of thumb: **every 6 tiles of flight costs one color.**

### 4.10 Jump, gravity, falling

- **Jump height does not depend on gear.** Apex `jumpHeightTiles` (3) after `jumpTimeToApexMs` (400 ms = 24 steps). Gravity `2h/t²` = 37.5 tiles/s², launch speed `2h/t` = 15 tiles/s, both derived. Faster gears jump farther, not higher.
- No variable jump height: releasing the key early does nothing.
- Vertical motion uses exact constant-acceleration kinematics per step (`y += vy·dt + ½·g·dt²`), so the apex is exactly 3.0 tiles on step 24.
- Falling speed is capped at `maxFallSpeed` (20 tiles/s).
- **Takeoff speed** is the ground speed after that step's ground update (§4.14): pressing jump and an arrow together from standing gives a walking jump (3 tiles/s). The launch step itself moves `(vx_old + vx_new)/2 × dt` like any ground step, so that walking jump lands 2.375 tiles out (not 2.4), and a jump pressed while braking takes off at the already-braked speed.
- **Walking off a ledge:** leaving the ground is only detected when vertical movement is resolved (§4.14 step 8), so gravity starts on the step after the walk-off step. A walk-off therefore flies one step longer than the fall alone takes (§5.4). The walk-off step does count toward air drag.
- **Coyote time:** a jump is allowed for `coyoteMs` (6 steps) after leaving the ground without jumping (walk-off, fall-through, grace expiry).
- **Jump buffer:** a jump pressed while airborne is remembered for `jumpBufferMs` (6 steps); if the player lands in that window, it fires on the next step (after one ground speed update with whatever is held).
- Jumping ends grace, resets the drag counter and consumes coyote time.
- **Climbing:** feet reach 2 tiles on step 10 of the rise; the highest reachable ledge is **2 tiles**. 3-tile ledges are forbidden (equal to the apex: knife-edge).

### 4.11 Walls and ceilings

- **Wall stop:** if horizontal movement is blocked by a solid tile (safe, or matching colored), the player stops at contact and `vx ← 0`. **The gear is unchanged.** Holding into a wall just pushes against it at speed 0 (white). Same on the ground and in the air (in the air the player then falls straight down, and the air rule lowers the gear to `minGear`).
- Steps up are walls: no slopes, no automatic step-up.
- **Only a safe wall holds you (noted 2026-11-17).** Pushing against a *colored* wall does not last: the step after the stop you restart at walking pace (blue), which passes any colored wall, a blue one included (you turn blue inside it; no-embed, §4.7). A wall meant to hold a body while the player keeps holding a direction must be safe tiles (in Tandem, a 1-tile kerb, cleared with a jump).
- **Ceiling:** hitting a solid tile from below sets `vy ← 0`; horizontal speed and gear unchanged.
- **Level bounds:** outside the grid left, right and top counts as safe solid. Below the grid is open.

### 4.12 Death, restart, exit

- **Death:** the only death in M1 is falling out of the level, when the top of the player's box is below the bottom edge of the grid. The player is frozen for `deathFreezeMs` (24 steps; inputs ignored except R), then respawns.
- **Respawn and restart (R)** reset the whole run: player standing at the spawn, `vx = vy = 0`, gear = `startGear` (1), band white, facing right, all buffers, timers, drag, grace and direction-priority state cleared, step counter 0. R works at any time, including during the death freeze, and takes effect on the next step. **The selected gear does not survive a death or restart.**
- Buttons still held across a respawn act normally from the first step of the new run (holding Right through a death walks you right as soon as you respawn).
- **No checkpoints.** Levels are single rooms sized for a 10–40 second solve. **v1.12 (amended 2026-11-24):** long levels (w2-05, w4-05, w5-05) are 8–12 rooms, 300–450 tiles and a 45–75 s clean run (≤ 5,400 steps), and **have checkpoints** (Must for long levels only; non-Tandem; a post every 3–4 rooms): a death after a post respawns there and the clock keeps running; R restarts the whole level (`features/checkpoints.md`, `level-plan.md` "Long levels"). Every other level keeps this rule.
- **v1.12 deaths:** falling out, a bolt hit (§4.17) and the sweep (§4.18). Movers never kill.
- **Exit:** the level is complete on the first step the player overlaps an exit tile, in any color and gear. Exit wins over death on the same step. The level time is the step count of that run.
- **With a twin (§4.15):** a body touching an exit is *home* and freezes there; the level is complete when both are home. Either body falling out kills the run, and death and restart reset both.
- **Stuck in a pocket (2026-11-19):** a Tandem level may close a pocket in the divider that a fallen body can never leave. That is not a death (the sim is unchanged); the scene shows a `[R] RESTART` card 1 s after a body is stuck there (`features/restart-prompt.md`, render-only).

### 4.13 Determinism

All rules above are pure functions of level + input frames (see `CLAUDE.md`, `docs/tech/architecture.md`). No randomness. Since v1.2 the acceptance numbers in `docs/design/features/` are exact for the implemented sim: step numbers exactly, distances to the printed precision.

### 4.14 Reference step order

Normative for M1, so acceptance numbers match. The implementation detail of each phase, and tech-lead's rulings on what this list leaves open, are in `docs/tech/architecture.md` §3.1–3.2; if the two ever differ, raise it in `docs/production/requests.md`.

1. Read input: held `L`/`R`/`J`/`+`/`-` and press edges (vs. the previous frame); restart.
2. **Shift:** if grounded, apply `+`/`-` presses to the gear (clamped 1–4). If airborne, add to the shift buffer.
3. **Direction:** update direction priority, compute d, update facing.
4. **Ground speed:** if grounded at the start of the step, apply §4.4 with target `d × gearSpeeds[gear]`.
5. **Jump:** if a jump is pressed or buffered and the player is grounded or in coyote time, launch (`vy` = 15 up), become airborne, end grace, reset drag counter.
6. **Gravity** (capped), if airborne at this point: airborne since an earlier step, or launched in step 5. A walk-off is only detected in step 8, so its first gravity step is the next one.
7. **Move X**, resolve walls (§4.11), including colored tiles and speed gates, with the band at the start of the step.
8. **Move Y**, resolve floors and ceilings using the band at the start of the step, no-embed and grace (grace never applies to gates). Determine grounded/airborne at end of step.
9. **Air drag:** if in the air this step (not grounded at both start and end: includes takeoff, walk-off and landing steps), add `|Δx|`, apply a band drop (§4.9).
10. **Band:** recompute from `|vx|`. If in the air this step, `gear ← max(minGear, min(gear, band))`.
11. **Landing:** if the player landed this step: drag counter ← 0, apply shift buffer, end coyote.
12. **Grace:** start grace if the band changed while grounded at both start and end of the step; otherwise count down.
13. **Timers:** coyote, jump buffer, shift buffer count down.
14. **Exit, then death checks.**

**v1.12 additions** (only in levels that have movers, emitters or a sweep; otherwise every phase is unchanged): **6b Carry** (per body, after gravity: a rider moves with its slab, `moving-objects.md`); phase 8 also lands bodies on slab tops; phase 14 is exit, then death by falling, bolt hit (`projectiles.md`) or sweep (`sweep.md`). Slabs, shots and the sweep are pure functions of the run step, which is 0 again on every respawn.

With a twin, phases 0, 1, 3, 14 and 15 run once per step, and phases 2 and 4–13 run per body, runner first, then twin (§4.15).

### 4.15 Tandem (one throttle, two runners)

Full rules and acceptance: `features/tandem.md`.

- A level may hold one twin spawn `&`. The twin is a second body with its own full player state (position, speed, gear, band, grace, buffers, drag counter).
- **Same input, separate bodies.** Every step both bodies get the same held direction, jump and shift presses. Direction is computed once; shifting, jumping and all physics run per body. A grounded body shifts now, an airborne one buffers, and the air rule lowers only its own gear, so **gears can split**.
- **Resync by clamping.** Presses past gear 4 or below gear 1 do nothing for a body already there. Pressing up until both reach 4 (or down until both reach 1) brings split gears back together.
- **No contact.** The bodies never collide, push or support each other.
- **Home and win.** A body overlapping an exit is home: frozen, no events, never dies. The run is won on the first step both are home. Home is checked before death on the same step.
- **Death and reset.** Either body falling out kills the run; respawn and restart reset both, home flags included.
- **Step order.** Runner (body 0) before twin (body 1) each step. This only orders events, since the bodies can't affect each other.
- **No twin, no change.** Without `&` the game plays exactly as §4.1–4.14.

### 4.16 Movers (v1.12, Must)

Full rules and acceptance: `features/moving-objects.md`. A slab loops along a fixed path of whole-tile moves and waits at 1.875 or 3.75 tiles/s. It is **top-only**: you land on it and it carries you; you pass through it from below and the sides; it never pushes or crushes. A safe slab holds everyone; a colored slab holds only a matching band (grace applies from above). Riding never changes your speed or color (standing on a moving lift is white) and jumping off keeps no platform speed.

### 4.17 Bolts (v1.12, Must)

Full rules and acceptance: `features/projectiles.md`. An emitter fires shots in a straight line on a fixed period; shots ignore tiles and vanish at their range; the lane is empty at the start of every run. A colored shot hits only a body of its band, a white shot only a standing body, a grey shot everyone. A hit is a death.

### 4.18 The sweep (v1.12, Should)

Full rules: `features/sweep.md`. A full-height front moves right at 3.75 or 7.5 tiles/s after a delay; it kills a body whose centre it reaches.

## 5. Sanity math

All numbers come from stepping these rules at 60 Hz with shipped tuning, and were re-checked against the implemented sim (v1.2). Distances are center travel in tiles; step counts start at 1 on the first step of the action.

### 5.1 Runway from standing (hold a direction in gear 4)

| Becomes | After | Step | Time |
|---|---|---|---|
| blue (3 tiles/s, instant) | 0.03 tiles | 1 | 0.02 s |
| green | 0.60 tiles | 10 | 0.17 s |
| yellow | 1.88 tiles | 23 | 0.38 s |
| red | 3.23 tiles | 32 | 0.53 s |
| full sprint (12) | 4.00 tiles | 36 | 0.60 s |

So **2.5 tiles of runway can never make red; 4 tiles always reach full sprint.** Yellow needs 1.9 tiles (deny with ≤ 1.25).

Cruising, one gear up: blue→green after 0.57 tiles (9 steps), green→yellow 0.56 (5 steps: 6 + 5 × 0.3 lands exactly on the 7.5 edge, which is yellow), yellow→red 0.66 (4 steps). Reaching the new cruise speed takes 1.25–1.42 tiles.

### 5.2 Slowing down

| From cruise | Let go: stops after | Color sequence (let go) |
|---|---|---|
| gear 4 (12) | 3.74 tiles, step 35 | yellow 0.74 (step 4), green 1.91 (12), blue 3.24 (26), white 3.74 (35) |
| gear 3 (9) | 2.54 tiles, step 28 | green 0.81 (6; step 5 ends exactly on 7.5, still yellow), blue 2.03 (19), white 2.54 (28) |
| gear 2 (6) | 1.29 tiles, step 18 | blue 0.78 (9), white 1.29 (18) |
| gear 1 (3) | instantly, step 1 | white |

Shifting down while holding brakes at the same rate: gear 4 → gear 1 reaches blue after 3.24 tiles (step 26) and cruises at 3 from step 34 (3.72 tiles). One gear down changes color after 0.74–0.81 tiles (4→3: 0.74, 3→2: 0.81, 2→1: 0.78).

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
| red mid-ramp (10.5) | 8.075 | step 35 | yellow |

Takeoffs are from cruising speed. A walking jump from standing (jump and arrow pressed together) lands 2.375 tiles out, because the launch step accelerates from 0 (§4.10).

Headline: **a gear-4 jump flies 8.7 tiles and lands yellow (gear 3).** Gear 2 and below keep their color on any flat jump. Drag happens at step 30, after the apex at step 24, so a sprint jump could only land red on a surface ≥ 2.8 tiles above takeoff, which the 2-tile climb limit forbids: **sprint jumps always land yellow or lower.**

### 5.4 Jumps to other heights

| Landing height | Lands on flight step | Gear 4 lands | Gear 3 lands |
|---|---|---|---|
| +2 tiles | 38 | 7.20 tiles, yellow | 5.70 tiles, **yellow** (no drop; it would come on step 40) |
| +1 | 44 | 8.10, yellow | 6.40, green (drop on step 40, 4 steps before landing) |
| 0 | 48 | 8.70, yellow | 6.80, green |
| −2 | 55 | 9.75, yellow | 7.50, green |
| −4 | 61 | 10.65, yellow | 8.10, green |
| −7 | 70 | 12.00, **green** (two drops: steps 30 and 70) | 9.00, green |

The −7 gear-4 row is a knife-edge: the second drop happens on the landing step itself (drag runs before landing, §4.14), so a takeoff even slightly below 12 lands yellow. Don't build a level on it.

**Walking off a ledge at full sprint** (no jump). The walk-off step has no gravity yet (§4.10), so the flight is one step longer than the fall. Distances are from the player's x on the last grounded step; measured from where the box clears the edge they are 0–0.2 tiles shorter, depending on where in the step that happens.

| Drop | Airborne steps (walk-off step = 1) | Lands | Color |
|---|---|---|---|
| 2 tiles | 21 | 4.20 | red |
| 3 | 25 | 5.00 | red |
| 4 | 29 | 5.80 | **red** (drag would come on step 30) |
| 5 | 32 | 6.30 | yellow (drop on step 30) |
| 7 | 38 | 7.20 | yellow |

**4 tiles is the tallest drop a sprint walk-off survives in red.** That 1-step margin is safe: sprint (12) is the top speed and the flight length is fixed by the drop, so no input can push the flight past 6 tiles.

### 5.5 After landing

Landing never re-accelerates you past your landing color (gear follows color). Holding the same direction cruises on; letting go stops you per §5.2 (a sprint jump lands at 9: stop in 2.54 tiles, passing green and blue, so stop on safe ground).

### 5.6 Gaps

Widest flat gap you can just clear ≈ flight distance + 0.75 (player width). Recommended maximum leaves ≥ 1 tile of slack: **gear n clears 2n tiles comfortably** (gear 1: 2, gear 2: 4, gear 3: 6, gear 4: 8).

### 5.7 Fairness windows

- Color grace + coyote: 12 steps (0.2 s) from your color changing under you to the last valid jump.
- Two Colors (shift green→yellow, then jump): yellow on the 5th step counting the press as step 1, then up to 12 steps to jump (13 counting the turn-yellow step). As built, w2-04's window is 13 steps: a **stated exception** to the world-2 level floor below, because the window is the grace being taught and is timed from the player's own press (ruled 2026-11-17).
- Brake (w1-04): the window to start slowing is ~3.5 tiles at sprint (≥ 17 steps). Since v2 (M1-52), the 8-tile pad gives ≥ 35 steps.
- Level floor (M1-52, 2026-11-05): every level has one winning line whose timed inputs each have a window of ≥ 30 steps in world 1 (≥ 18 from world 2), or are position choices at walking pace with ≥ 1 tile of valid spots.

### 5.8 What changed and why

- v1.2 → v1.3 (puzzle depth review): no number in §5 changed and no tuning change. New derived flight positions used by gates and walls: a gear-4 flat jump reaches x = 3.8 on flight step 19 (red) and x = 6.75 on flight step 35 (yellow); a gear-3 jump to −4 reaches x = 3.75 on flight step 25 (yellow) and 7.2 on flight step 52 (green).
- v1.1 → v1.2 (matched to the implemented sim; no tuning change): speeds that land exactly on a band edge count as the higher band (green→yellow upshift 0.56 tiles / 5 steps; let go from gear 3 turns green at 0.81 / step 6); a walk-off has one gravity-free step (4-tile drop: 5.8 tiles, still red); a walking jump from standing lands 2.375; no-embed is per color; jump-to-height distances printed to two decimals (−7 row 12.00, knife-edge).
- v1.0 → v1.1 (hold-to-move): walking range 0–3 is now instant on the ground, gears are 1–4, wall stops keep the gear. Runway to full sprint 5.02 → **4.00 tiles**; red 4.45 → **3.23**; stopping from sprint 4.87 → **3.74**. Air numbers are unchanged.
- Seed → v1.0: `airDragTilesPerGear` 4 → 6 and `jumpTimeToApexMs` 380 → 400 (see decisions.md).

## 6. Level design rules of thumb

- Runway from standing: red needs ≥ 4 tiles (deny with ≤ 2.5); yellow ≥ 2.5 (deny ≤ 1.25); green ≥ 1 (deny with ≤ 0.5). Blue is instant.
- Upshift one gear from a cruise: color changes after 0.56–0.66 tiles. Downshift or letting go: 0.74–0.81 tiles per color.
- Stopping from sprint takes 3.74 tiles and passes every color: stop on safe tiles. Turnarounds above walking pace too.
- Max climb: 2 tiles. Never 3. Jump headroom: player 1.5 + jump 3 = 4.5 tiles.
- Every 6 tiles of flight costs one color, down to blue. Sprint jumps always land yellow or lower.
- Recommended max gap: 2 × gear tiles.
- Corridors: the player is 1.5 tiles tall; 2-tile-tall corridors are fine.
- **World 1 roofs (v1.6):** a world-1 colored bridge may sit under a low safe roof (exactly 2 tiles of headroom) so no jump can skip the lesson. The roof is safe tiles only; its end faces sit over safe ground or exactly at the bridge's first and last columns; every spawn and stop pad stays open (at least 5 tiles of clear headroom, so a standing jump shows the full 3-tile apex). A bridge may go without a roof when a roof face would let a jump wall-stop past the lesson, as long as the bridge is long enough that no takeoff clears it (w1-04, ruled 2026-11-05). Worlds 2 and 4 do not use roofs over a level's lesson: jumping is part of it there. Tandem lanes have their own ceilings (the divider).
- Keep intended drag drops at least 3 steps away from the intended landing. (Exception: a sprint walk-off off a 4-tile drop lands red one step before its drop would come; that is safe because sprint is the top speed.)
- A sprint walk-off keeps red down to a 4-tile drop; 5 tiles or more lands yellow.
- Never hang a colored tile less than 1.5 tiles above a floor of the same color (no-embed is per color, §4.7). Same for gate tiles over a gate floor of the same band.
- Walls stop you but keep your gear.
- **A good level puts two decisions in tension at nearby places** (where to build speed, where to shed it, what you are at a point, what you commit to at takeoff, where your color changes), so the answer is a place-and-pace pair, not "go fast" or "stop". Each level must fail when its new piece is removed (`mechanics-review.md` §1).
- Gates: full-height columns as walls; `w` only as floors and ceilings; never spawn on or in a gate; the first gate is met at walking pace on safe ground.
- A sprint jump is red for its first 6.0 tiles of flight and yellow after: a wall or gate 4 tiles out sees red, one 7 tiles out sees yellow.
- **Tandem levels:** two lanes plus divider take at most 15 rows (the HUD sits above); lanes stacked with a safe divider at least 1 tile thick, each lane at most 7 rows; each body has its own reachable exit; intended solutions keep the bodies within 26 tiles in x; every split comes from the level (wall, air stop, gap, exit), never from timing; a body is pinned by a 1-tile safe kerb, never a colored wall (§4.11); Tandem Coast pads are flat (both bodies land on the same step).
- **COMBINE levels** are removal-tested as built: no win may skip any of their ideas (each idea has its own removal-tested level).
- Every level must ship a solution recording that passes the replay test.

## 7. Puzzle toolbox (teaching order)

Revised 2026-11-03 by the puzzle depth review (`mechanics-review.md`): the old plan taught one requirement per place ("be color X on this floor"), which made worlds 1–2 thin. v1.3 brought colored walls ("not this color here") into world 1 and speed gates ("only this color here") into M2. In v1.4 walls stay; gates move to Should behind the Tandem twist.

v1.4 (owner decision): the core twist is **Tandem** (`core-twists.md`). Worlds 1–2 teach one runner; world 3 hands you a second one.

| World | Theme | New pieces | Levels | Priority | Milestone |
|---|---|---|---|---|---|
| 1 Gears | moving, shifting, runway, braking, "not this color" | colored floors, safe tiles, **colored walls** | 5 | Must | M2 |
| 2 Flight | decide your pace before takeoff | air commitment, air drag, walk-offs | 4 | Must | M2 |
| 3 Tandem | one throttle, two runners | the twin; splitting by kerbs (safe walls) and air stops; resync by clamping; parking at exits | 5 | Must | M3 |
| 2 (+1, v1.12) | long run | w2-05 Long Haul: worlds 1–2 in one long run | 1 | Must | expansion |
| 4 Motion (v1.12) | things that move under you | grey lifts and shuttles, colored slabs; the sweep (Should) | 5 | 4 Must, 1 Should | expansion |
| 5 Signals (v1.12) | things that fly at you | colored, white and grey bolts; the sweep (Should) | 5 | 4 Must, 1 Should | expansion |
| Gates | only this color here | speed gates, gate floors, ice | 4 | **Could since v1.12** (post-jam; its world slot went to Motion) | — |

v1.12: worlds 4–5 need only world 1–2 skills, never Tandem, so a player who finds world 3 hard can still play them (each world's first level is open from the start). Specs: `levels-w4.md`, `levels-w5.md`.

### 7.1 Pieces after M1

- **Colored walls and ceilings (M2, Must):** §4.7; built in M1. Spec with extra checks: `features/colored-walls.md`.
- **Tandem (M3, Must):** §4.15; spec `features/tandem.md`. Sim and scene built; the decision gate was closed by the owner on 2026-11-16: Tandem stays as world 3 and there is no fallback.
- **Speed gates (Should since v1.4):** §4.7; spec `features/speed-gates.md`. Replaces the "speed camera" of v1.2: same characters, but gates read the band of the player's own speed (there is no world speed, conveyors are cut).
- **Ice (M3, Should)** (`=`, always solid): while supported only by ice, speed and gear are locked. Shift presses are ignored (not buffered); holding, letting go and reversing do nothing. You leave ice at the speed you entered. Open: what happens at speed 0 on ice (§12). Spec before M3; no tuning key expected.
- **v1.12:** moving platforms return as top-only movers (§4.16); the 2026-11-03 cost objection is answered by positions being a pure function of the run step (no new sim state) and by top-only faces (no push, no crush). Conveyors, crates, crumble floors and afterimage stay cut.
- **Cut 2026-11-03** (reasons in `mechanics-review.md` §4; post-jam at most): mud (`~`) and boost pads (`*`), whose puzzles collapse into "slow here" and "go fast"; conveyors (`<` `>`), moving platforms, crates and afterimage ghosts, which each need a new subsystem; and the new ideas considered in the review (tint gates, springs, crumble floors, speed limits, one-way floors).

## 8. Example puzzles (with numbers)

- **Runway:** a red bridge 2 tiles in front of the spawn, an 8-tile room behind it. Red needs 3.2 tiles; walk back, turn (instant at walking pace), and come in from the far end already red.
- **Coast:** red runway, a 7-tile flat gap, a yellow landing pad. A red takeoff flies 8.7 tiles, turns yellow at 6, lands yellow. Take off yellow and you land green and fall through.
- **Step down:** sprint off a 4-tile ledge onto a red floor. Walking off keeps you red (5.8 tiles of flight); jumping lands yellow and drops you.
- **Two colors:** a green floor under a yellow ledge 2 tiles up. Shift up mid-run and jump in the 12 steps after you turn yellow.
- **Stop sign:** a green bridge ends at the exit ledge with no safe pad: let go on the bridge and you drop; hold through it.
- **Out of Step (Tandem, w3-02 as built 2026-11-17):** both walk blue; a 1-tile safe kerb in your lane holds you for as long as you hold right, while the twin walks on over its blue bridge to a safe pad far ahead. Let go with the twin on its pad, walk back about 4 tiles, shift up once, run and jump the kerb green: you land green on your green bridge and the twin walks green over its own. Spec: `levels-w3.md`.
- **Gear Split (Tandem):** both sprint-jump; a hanging block in your lane stops you in the air and drops your gear to 1, while the twin drags to gear 3. Holding right now gives you blue and the twin yellow. Press up three times and both clamp at gear 4.
- **Red Wall (w1-05):** a red wall, 1 safe tile, a red bridge. Arrive red and the wall stops you; from its face red needs 3.23 tiles but only 2.75 remain. Arrive yellow and shift up: red 0.66 tiles later (shift window 2.75 tiles ≈ 18 steps).
- **Gate (w4-01, Should):** a green gate, 2 safe tiles, a yellow bridge. Green at the gate, yellow 0.56 tiles after shifting up; shift window 3.75 tiles.
- **Trapdoor (w4-02, Should):** a blue-gate floor over a pit with the exit pocket under its middle. Let go at sprint 3.24 tiles before the pocket (from yellow, 2.03): you turn blue and it opens under you.
- **Gate Window (was the fallback world 3; unused since the fallback was dropped 2026-11-16, kept as a world-4 idea):** a yellow gate 4 tiles out and a green gate 7.5 tiles out in one gap, landing 4 tiles lower. Only a yellow takeoff passes both: yellow at 4, dragged to green at 6.0, lands 8.10 out.

## 9. Tuning keys (`src/data/tuning.json`)

| Key | Value | Unit | Meaning |
|---|---|---|---|
| `stepHz` | 60 | steps/s | Simulation steps per second. |
| `tileSize` | 16 | art px | Art pixels per tile at the 480×270 logical resolution (§11). Render only; the sim works in tiles. Was 32 at the old 960×540 config; changed in the pixel cutover (PX-5, 2026-11-13). |
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
| `runFramesPerTile` | 3 | frames/tile | Render only. Run-cycle stride for the `run` anim (blue, green): frame = `floor(x × 3) mod 6` (`decisions.md` 2026-11-16). |
| `sprintFramesPerTile` | 2 | frames/tile | Render only. Run-cycle stride for the `sprint` anim (yellow, red). |
| `cameraMaxApartTiles` | 28 | tiles | Scene only. Tandem: two non-home bodies further apart than this are not framed together; the camera follows the runner and an edge arrow points at the twin (`features/tandem.md`). Levels keep intended spreads ≤ 26. |

**v1.12, pending tech-lead's schema change (added to `tuning.json` in the same batch, never before):** `projectileSizeTiles` 0.5 (shot box side) and `emitterTellMs` 300 (render only: emitter glow before a shot). Slab and shot speeds are a format constant (32nds of a tile per step); everything else about movers, emitters and the sweep is level data.

Derived at load (never stored): dt, ms→steps, `accel[n]`, `brake[n]`, gravity, jump launch speed. Removed in v1.1: `pivotMaxBand` (replaced by `instantMaxGear`). Removed in v1.6 (T-03, same batch as tech-lead's T-02): `mudMaxGear`, `boostPadGear`, `ghostSpacingTiles`, `ghostLifetimeMs` (their mechanics were cut 2026-11-03). Speed gates, colored walls and the Tandem sim need no keys (the Tandem camera limit `cameraMaxApartTiles` is a scene number, added in v1.8 so no gameplay number lives in code). Audio, effect and leaderboard constants are not gameplay numbers: they live with their owners (`src/audio`, `src/fx`, `backend/`) as named constants, sized by `features/adaptive-audio.md`, `pixel-effects.md` and `leaderboards.md`.

## 10. Scope and deliverables

- **Expansion Must (v1.12, owner sign-off 2026-11-23):** movers (§4.16), bolts (§4.17), **9 new levels** (w2-05; w4-01, w4-02, w4-03, w4-05; w5-01, w5-02, w5-03, w5-05; three of them long), level select with five world rows (names 4 MOTION, 5 SIGNALS), art and sounds for slabs, tracks, emitters and bolts. Build and cut order: `level-plan.md` "Expansion build order". `rc-batch10` stays the fallback build. **Checkpoints for long levels (Must since 2026-11-24)**; if they miss freeze, the long levels ship at medium length. **Should:** the sweep and its two levels (w4-04, w5-04). **Could:** crushers and all-faces slabs, white slabs, Tandem mover or bolt levels, camera look-ahead, the Gates world.
- **Must:** core rules §4 including **Tandem** (§4.15), worlds 1–3 (**14 levels**), HUD gear meter for one or two bodies, title + level select (**the first level of every world unlocked from the start; the rest of a world unlocks in order**, owner decision 2026-11-04), pause and results, progress save, controls screen, **in-game sound effects wired to sim events** (`adaptive-audio.md`; always Must there, named here 2026-11-19), the restart card for sealed pockets (2026-11-19, a clarity fix to Must levels), color-blind patterns (including the twin's silhouette), **alternate gear bindings (Q/E, Z/X) and the one-time Sticky Keys tip**, web build on itch.io, **itch.io page copy**.
- **Should:** world 4 Gates (4 levels: speed gates, gate floors, ice), per-level leaderboards, adaptive music that pitch-shifts with gear, mirrored twin, **a settings screen with SOUND, REDUCED MOTION and REDUCED EFFECTS toggles** (`features/settings.md`, signed off by the producer 2026-11-19 and built in batch 7; reduced motion already follows the OS, which is the Must part).
- **Could:** menu UI sounds (Should until 2026-11-20), free key-remap screen, music and SFX volume sliders, ghost replays of top runs, level timer medals, a hidden "ultraviolet" reverse gear; boost pads as a Tandem split tool (`core-twists.md` §1).
- **Cut (2026-11-03):** mud, conveyors, moving platforms, crates, afterimage ghosts (`mechanics-review.md`); the Paint and Clock twists (`core-twists.md`).
- **No fallback (owner decision 2026-11-16):** Tandem stays as world 3; the decision gate is closed and the gates-world fallback is off the table. Batches run in priority order; dates do not drive cuts (the owner cuts if and when they choose).

### Must: what is left after the batch 7 playtest (2026-11-20)

Rulings in `decisions.md` 2026-11-20. In priority order, no dates:
1. **Hint headers for w3-03, w3-04 and w3-05** (level-designer; headers only, no re-recording; `onboarding-hints.md` "2026-11-20 placements").
2. **Restart card at 2× with a white outline** ([scene], `restart-prompt.md`).
3. **QA:** `tandem.md` S5–S6, `restart-prompt.md` 3 and 5, `onboarding-hints.md` 13–14, `settings.md` 1–4.
4. **A playtest of w3-04 and w3-05 with the hints** (a fresh sitting if possible), plus w2-04 actually attempted. w3-05 has still not been finished by any player.
5. Release items: CREDITS names, itch draft (`itch-page.md`, art in `docs/art/itch/`), the owner's listening check, repo public, submit.

Should after that: settings applied on resume (W7, [scene]), then leaderboards.

### Must: what was left after the batch 6 cold playtest (2026-11-19)

Rulings in `decisions.md` 2026-11-19. In priority order, no dates:
1. **Restart card for sealed pockets** ([scene], `features/restart-prompt.md`).
2. **Wire the in-game sound effects** ([scene] with audio-designer, `adaptive-audio.md` "Wiring").
3. **Three hint placements** (level-designer: w1-03, w2-04, w3-03; headers only, no re-recording; `onboarding-hints.md`).
4. **A cold playtest of w3-02..w3-05** (and the three hinted levels) on a build with 1–3 in (`levels-w3.md` "Cold-play checks"); design triages within the batch.
5. The existing release items below (BUG-6 boot retry with tech-lead, itch draft, secrets scan, CREDITS, repo public, submit).

First Should: the settings screen if the producer signs it off, then leaderboards.

### Must: status and what is left (2026-11-17)

**Built:** core rules and Tandem (sim checks 1–18), all **14 levels built and approved** (w1-01..05, w2-01..04, w3-01..05; versions in `levels/README.md`), HUD for one or two bodies, title and level select, pause, results, controls screen, progress save, hint glyphs, alternate bindings and the Sticky Keys tip, color-blind patterns and the twin silhouette, packaging (`npm run package`). Batch 6 is still in tech-lead review and QA verification (B6-40..B6-43), so none of it is Done until those pass.

**Left, in priority order (no dates):**
1. **Verify batch 6 and fix what fails:** QA B6-41..B6-43, plus the scene's open review follow-ups (S1: no `preventDefault` while an overlay is open; S2 restart test), since pause and results are Must.
2. **Fresh playtest of all 14 levels from the title** (B6-44 and, if it did not cover them, a second sitting on w2-04 and w3-02..w3-05, which no player has seen); design triages within the batch.
3. **Tandem completion checklist line 5:** the owner wins w3-01 by hand in a browser (USER-9).
4. **itch.io page copy** (`docs/design/itch-page.md`, design-lead) and the itch draft page with a packaged build (USER-3).
5. **Release:** secrets scan (USER-8, SEC-3), freeze checklist, repo public (USER-6), submit (USER-4).

First Should after these: leaderboards live (USER-2 deploy, backend K1 fix before `submitRun` is enabled). World 4 stays unscheduled.

### Design deliverables

| Deliverable | File | Due |
|---|---|---|
| GDD | `docs/design/gdd.md` | M1 |
| M1 feature specs | `docs/design/features/*.md` | M1 |
| Level plan | `docs/design/level-plan.md` (v3.6, 2026-11-17) | M2 |
| World 3 level specs | `docs/design/levels-w3.md` | done 2026-11-16, revised as built 2026-11-17 |
| Puzzle depth review | `docs/design/mechanics-review.md` | done 2026-11-03 |
| Speed gates and colored walls specs | `features/speed-gates.md` (Should), `features/colored-walls.md` (M2) | done 2026-11-03 |
| Core twist candidates | `docs/design/core-twists.md` | done 2026-11-03; owner picked Tandem |
| Tandem spec | `docs/design/features/tandem.md` | done 2026-11-03 (sim Nov 9–13) |
| Ice spec (Should) | `docs/design/features/ice.md` | before M3 (Nov 15) |
| Menu, progression and onboarding specs (M2-34, M2-01) | `features/menu-navigation.md`, `title-screen.md`, `level-select.md`, `pause.md`, `results.md`, `progress-save.md`, `level-loading.md`, `sticky-keys-tip.md`, `controls-screen.md`, `onboarding-hints.md` | done 2026-11-04 |
| M3 specs (M3-02): leaderboard UX, adaptive audio, pixel effects | `features/leaderboards.md`, `adaptive-audio.md`, `pixel-effects.md` | done 2026-11-04 (due Nov 11) |
| itch.io page copy | `docs/design/itch-page.md` | written 2026-11-18; re-check at submit (its §7) |
| Restart prompt, settings screen specs | `features/restart-prompt.md` (Must), `features/settings.md` (Should, sign-off) | done 2026-11-19 |
| Decision log | `docs/design/decisions.md` | ongoing |

### Milestone mapping

- **M1 grey-box (Nov 8):** §4 in full in one test room, all input bindings including Q/E and Z/X. Specs: `features/movement-and-gears.md`, `color-gating.md`, `air-drag.md`, `jump.md`, `safe-tiles-and-reset.md`.
- **M2 first worlds (Nov 15):** worlds 1–2 (9 levels), HUD gear meter, title, level select, Sticky Keys tip. Tandem sim and scene built alongside from Nov 9 (decision gate closed 2026-11-16: Tandem stays). Milestones are checklists, not dates (owner decision 2026-11-16).
- **M3 content (Nov 22):** world 3 Tandem (Must, 5 levels), world 4 Gates (Should: gates, ice).
- **M4 freeze (Nov 28):** itch.io page copy final.

## 11. HUD, audio and visual direction

- **Art direction C, Pixel Dither (owner decision 2026-11-03):** 480×270 logical, scaled 2× to the 960×540 itch frame; 16 px tiles (the screen still shows 30 × 16.9 tiles); the player is 12×24 px. **Base resolution (pixel cutover, 2026-11-13):** the game canvas is 480×270, scaled by the largest whole-number zoom that fits (2× in the itch embed, 4× at 1920×1080, letterboxed otherwise), never a fractional scale; `tileSize` is 16. All HUD, menu and text layout is specified in 480×270 pixels. Every gameplay element must read at that size by shape and dither pattern, never by color alone. Rendering approach: tech-lead's pixel-rendering ADR (`docs/tech/`); look: `docs/art/`.
- The world's tint slides along the spectrum with your actual speed, while gameplay rules use the discrete bands.
- The player's body shows the band color **and** the band's pattern or glyph (color is never the only signal).
- **The twin** (Tandem) differs from the runner **by shape** at 12×24 px (art-director's design, adopted 2026-11-04: antenna, chamfered shoulders, wide stance, two square eyes; no extra head marker unless the M3 playtest asks for one) and shows its own band pattern. A home body shows a parked pose or glyph and stops animating. Stacked lanes are separated by a solid safe divider.
- **Camera with a twin:** frames the midpoint of the non-home bodies. With one body home it frames the other; if both are moving and more than 28 tiles apart it follows the runner and shows an edge arrow with the twin's silhouette (`features/tandem.md`).
- **HUD gear meter** shows the **selected cruise gear (1–4)** and the **current band (white–red)** side by side. They differ while ramping, braking, standing still (gear 2 selected, white band) and after drag. In the air, a small drag meter fills toward the next 6-tile drop; it is hidden while the band is at or below `airDragMinBand` (blue or white), since no drop can come. Layout and checks: `docs/design/features/hud-gear-meter.md` (a five-cell white–red strip: lit cell = band, bracket = selected gear, speed needle, pending-shift bracket in the air). Pulled into M1 by the 2026-11-02 playtest. **With a twin, the HUD shows two strips stacked** (top = runner, bottom = twin), each marked with its body's silhouette and showing that body's band, gear, needle, drag meter and pending shift; a home body's strip dims and shows the home glyph.
- **Level time** is shown as time, not steps: `wonAtStep / stepHz` as `M:SS.ss` (hundredths, truncated). Steps stay the stored and compared value (saves, replays, leaderboards).
- A drag drop plays a short down-shift "clunk" and a color flash, because the speed change is instant. The clunk must not sound like a shift down: one is the game taking a gear, the other is you choosing to (`features/adaptive-audio.md`). The drop cue survives every accessibility setting in some form (`features/pixel-effects.md`).
- Music pitch and filter follow your band: muffled and low when slow, bright and high at sprint (`features/adaptive-audio.md`). With a twin, the music and the world tint follow the faster body that is not home.
- Effects are render-only and come in three modes: full, reduced effects (decoration off) and reduced motion (no flashes, wipes or parallax); there is no screen shake anywhere (`features/pixel-effects.md`).
- Leaderboards (Should) rank by steps and show time; a run is posted only after the player has chosen a name (`features/leaderboards.md`).

## 12. Open questions

1. **Stepwise drag feel.** The instant speed drop mid-flight is a visible kink. We sell it with audio and a flash; if it reads as a bug in playtests, the fallback is continuous drag (needs re-tuning).
2. **No air control** is a strong choice for players used to platformers. Playtest early; the fallback is a small air nudge that cannot change speed band, which would complicate drag math.
3. ~~World 5 afterimage rule~~ closed 2026-11-03: afterimage cut.
4. ~~Crates push rules~~ closed 2026-11-03: crates cut.
5. **Gate readability** (now Should): gates are solid *except* for their color, blocks only *for* their color. Mitigations in `features/speed-gates.md`; matters again only if world 4 ships.
6. **Ice at speed 0** (Should): a player who lands on ice standing still would be locked at 0. The ice spec rules on it before M3.
7. **Tandem first appears at level 10** (after 5 + 4 single-runner levels). A jam voter plays about 10 minutes, so the twist may be missed. **Mitigated 2026-11-04 (owner decision):** the first level of every world is open from the start, so w3-01 is one menu move away (`features/level-select.md`). Still open: whether voters *find* it, and whether level order should change too (move Two Colors after w3-01, or trim world 1). The M2-30 playtest checks it; decide at M2-31.
8. **Two bodies at a glance** (pillar 2): can a new player tell which body is which, and which gear strip belongs to which, within a few seconds? Checked in the M3 playtest (M3-34); fallbacks are a stronger silhouette difference and lane-colored dividers (with a pattern).
9. ~~Tandem decision gate~~ closed 2026-11-16 by the owner: Tandem stays as world 3, no fallback.
10. **Long levels without checkpoints (v1.12).** Do 2–4 minute first clears feel fair with only R? Checked in the long levels' cold plays; if two say no, design rules between splitting the level and post-jam checkpoints.
11. **Colored bolts read (v1.12).** Does a player understand within 10 s of w5-01 that a red bolt passed through them because they were not red? Fallback: a stronger pass-through shimmer.
12. **Schedule (v1.12).** Freeze is Nov 28. Tech-lead's note: if [sim] is not merged by the end of Nov 25, emitters go first, then movers, and the content falls back to w2-05 plus more levels from existing pieces.
