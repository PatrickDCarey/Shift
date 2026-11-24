# Feature: Bolts (emitters and shots)

_Owner: design-lead. Written 2026-11-23 for the owner's expansion request (`decisions.md` 2026-11-23 "Expansion"), reconciled the same day with tech-lead's `docs/tech/expansion-approach.md` §3–4 (clock, emission, range, format and hit order are tech-lead's; the polarity, white shots and the level rules are design's). GDD v1.12 §4.17. World 5 (`levels-w5.md`). **Priority: Must.** Player-facing name: **bolts**; code name: emitter and shot._

## Rule

An **emitter** fires **bolts** in a straight line on a fixed clock. A bolt flies through everything and vanishes at the end of its range. **A colored bolt only exists for its own color:** it kills a runner whose band matches and passes harmlessly through everyone else. A **white** bolt kills only a runner standing still (band 0). A **grey** bolt kills everyone. Being hit is a death, like falling out.

One rule for the whole world: "colored things only exist for their color". A red block holds only red, a red slab carries only red, a red bolt hits only red. (Tech-lead's default polarity; design confirms it.)

## Why it fits (pillars)

- **Pace is the puzzle:** a colored bolt is dodged by **being another color** when it reaches you (ramp later, brake earlier, cross before you turn red) or by being elsewhere. A white bolt turns "stop on safe tiles", the safest habit, into a choice. Grey bolts are the genre's jump-dodge, kept few and slow.
- **Readable:** w5-01's first bolt falls through the walking runner within 2 s; no text.
- **Fair:** positions are a pure function of the run clock, so every attempt starts with the same lane; nothing is in flight at the start except a phase-0 emitter's first bolt at its muzzle; a fresh (white, standing) runner can never be hit where it appears, because grey and white lanes stay off spawn and respawn boxes (Edge cases); every later shot is told by the emitter's glow; every crossing meets the ±3-step robustness test.

## Definition (level file, tech-lead's syntax)

`emitter: <col> <row> dir=<l|r|u|d> range=<tiles> speed=<1|2|4|8> period=<steps> phase=<steps> [band=<W|B|G|Y|R>]`

| Field | Meaning | Design constraint |
|---|---|---|
| col, row | the emitter's cell, `.` in the grid (drawn as an emitter) | |
| `dir` | direction | |
| `range` | whole tiles from the cell's centre | the lane is clear of tiles and ends at a solid face or the grid edge (`tests/levels`) |
| `speed` | 32nds of a tile per step | **levels use 2 or 4** (3.75 or 7.5 tiles/s); 8 (15 tiles/s, faster than sprint) is never used |
| `period` | steps between shots | ≥ 12 |
| `phase` | steps, 0 ≤ phase < period | |
| `band` | absent = grey (hits everyone); `W` = white (hits band 0 only; **design asks tech-lead to add it**); `B G Y R` = that band only | |

A change to an `emitter:` line bumps `version`.

## Shots

- A shot leaves on every run step s ≥ 0 with (s + phase) mod period = 0, centred on the emitter cell's centre, and moves `speed`/32 tiles per step along `dir`. It is alive while 0 ≤ t − s < range × 32 / speed. **No shot exists from before step 0** (no pre-filled stream): at t 0 the only live shots are those of `phase` 0 emitters, which leave at s 0 and sit at the muzzle (distance 0). The kinetic clock is 0 again on every spawn respawn and R (and is the post's `clock=` after a post respawn, `checkpoints.md`), so every attempt starts with the same lane. *(BUG-9 ruling, 2026-11-24: this is the code as built and is intended; the earlier "the lane is empty at t 0" wording meant "no pre-filled stream" and is withdrawn. A step-0 shot has no tell before it; that is accepted because the spawn and respawn rules below keep it away from anything a fresh runner can be hit by.)*
- The shot box is a square of side `projectileSizeTiles` (0.5).
- Shots ignore tiles, slabs, exits, other shots and bodies they do not hit.

## Hits (phase 14)

Order: home, won (exit wins), then death by fall or hit; one `died` event with `cause: 'hit'`. A non-home body is **hit** when its box after phases 7–8 strictly overlaps a live shot's box at t+1 and the shot can hit its band at the start of the step (the same band colored tiles use on that step): grey always; `W` when the band is 0; a band color when equal. No grace, no coyote. With a twin, either body hit kills the run.

## Edge cases

- **Airborne:** same test. Air keeps your band, so mid-flight the only color changes are a drag drop or a wall stop; both are legal dodges.
- **White and walls:** a body held against a wall is band 0 (or flickers 0/1 against a colored wall, GDD §4.11), so white bolts hit it. Level rule: no white lane where the intended line wall-stops.
- **Spawns:** no emitter fires into a spawn box in the first 60 steps (tech-lead's rule; this includes a step-0 shot). Beyond that, grey and white lanes never cross a spawn box; colored lanes may (w5-01 teaches with one). A fresh runner is white and standing (band 0), so a colored bolt cannot hit it anyway.
- **Post respawns:** the respawn box is clear of every grey and white lane (`checkpoints.md` placement rule, checked by `tests/levels`), so the lane state at the post's `clock=` (step-0 muzzle shots for `clock=0`, a stream mid-flight otherwise) can never hit the respawned, standing runner. **No empty-lane grace after a clock reset** (BUG-9): fairness at a spawn or post comes from where lanes may run, not from a quiet period, and a grace would make the first seconds of every attempt differ from the steady pattern the player is learning.
- **Restart and respawn:** the clock rewinds, so the pattern after R or a death is the first-attempt pattern.
- **Tell before the first shot:** a shot at s ≥ 18 always has a full 18-step glow; a shot with 0 < s < 18 has a shortened glow (from step 0); a step-0 shot has none. Level rule (added with BUG-9; QA found no shipped level affected): no crossing that needs a dodge depends on reading the tell of a shot that leaves before step 18.
- **No reflection, gravity, homing, aiming or randomness.**

## Level rules (fairness)

- Every intended lane crossing passes `tests/levels`' ±3-step robustness test and has a window of **≥ 18 steps** at the intended pace, recorded in `levels/README.md`.
- **Grey shots at floor height** (emitter one row above a floor: the shot spans 0.25–0.75 above it) are cleared while the feet are above 0.75: flight steps 4–44 of any jump (41 steps). See check 6 for the window that leaves.
- At most one grey emitter on screen at once in w5-01..w5-03.
- A "dense" lane (always occupied for a body) needs shot spacing ≤ 2 tiles along the lane (spacing = speed/32 × period).

## Readability (art and audio; never color alone)

- **Shapes by kind:** colored and white bolts are diamonds carrying the band's pattern and glyph; grey bolts have a different silhouette (art's call) so "hits everyone" reads by shape. A bolt passing through a non-matching runner shimmers through the body (render-only): the visible proof it is harmless.
- **Emitter:** a muzzle on the `dir` face and the kind's glyph; it **glows for `emitterTellMs`** before each shot (18 steps; a static fill change under reduced motion, never a flash).
- **Sink:** a catcher mark where the range ends.
- **Audio:** a soft shot cue per emitter on screen (rate-limited); the death cue for a hit differs from a fall (audio-designer, Should).

## Tuning (`src/data/tuning.json`, added in tech-lead's schema batch)

| Key | Value | Meaning |
|---|---|---|
| `projectileSizeTiles` | 0.5 | Shot box side (tech-lead's name). |
| `emitterTellMs` | 300 | Render only: emitter glow before each shot (18 steps). |

Per emitter in the level file: everything else.

## Acceptance

Conventions as `movement-and-gears.md`. "Room B": a long safe floor; `emitter: 20 r dir=l range=12 speed=4 period=300 phase=0` one row above the floor (shot centre 0.5 above it, 0.125 tiles/step, alive 96 steps). The shot that leaves at s 0 has its centre at x 20.5 − 0.125 t.

1. **Grey, standing.** A body standing at x 10.5 (box 10.125–10.875): hit on step 76 (first strict overlap), `cause: 'hit'`.
2. **Colored passes through.** `band=R`: the shot overlaps the standing body on steps 76–84 and never hits it.
3. **White hits only standing.** `band=W`: the standing body is hit on step 76; a body walking left at gear 1 through the lane is never hit.
4. **Range.** Grey, a body standing at x 7.0: never hit (the shot's last live box, at t 95, starts at x 8.375).
5. **Start of the run (BUG-9 wording).** With `phase` 0, at t 0 exactly one shot of that emitter is alive, `firedAt` 0, at the emitter cell's centre (distance 0), and no shot with `firedAt` < 0 ever exists. With `phase` 100 no shot is alive before t 200, and the first shot leaves at t 200.
6. **Jump over a grey shot.** Grey, the body at x 10.5 jumps straight up: J on any step 41–73 is never hit (33 steps); J on step 40 is hit on step 84 (flight step 45); J on step 74 is hit on step 76 (flight step 3).
7. **Band at the start of the step.** A body ramping through yellow under a `band=Y` lane is hit only on a step whose start band is 3.
8. **Exit wins** over a hit on the same step.
9. **Home body is never hit.** With a twin: no death for a home body in a grey lane.
10. **Respawn rewinds.** After a death with no lit post (or R), the shot set on the respawn step equals the shot set at t 0 (check 5: phase-0 shots at the muzzle, nothing else).
11. **Determinism and no regression.** Checks 1–10 run twice give identical state; every shipped recording and golden hash is unchanged.

## Priority

- **Must:** emitters in four directions; grey, white and colored kinds; the hit rule; the tell glow; the sink; the pass-through shimmer.
- **Should:** the shot cue and the hit death cue.
- **Could:** bolt Tandem levels; timed blinking hazard blocks (tech-lead §3); emitters on slabs.
