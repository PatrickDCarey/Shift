# Feature: Movers (lifts and shuttles)

_Owner: design-lead. Written 2026-11-23 for the owner's expansion request ("add more levels, longer levels, projectiles, moving objects"), which is the owner's sign-off for scope beyond the v1.11 Must list (`decisions.md` 2026-11-23 "Expansion"). Reconciled the same day with tech-lead's `docs/tech/expansion-approach.md` (§2, §4): the clock, the path model, the speeds and the format are tech-lead's; the faces (**top-only**) are design's ruling. GDD v1.12 §4.16. Worlds 4–5 (`levels-w4.md`, `levels-w5.md`). **Priority: Must** (vertical and horizontal, top-only). Moving platforms were cut on 2026-11-03 for cost (`mechanics-review.md` §4.13); this is the smallest form that keeps the color rule._

## Rule

A **mover** is a flat slab that loops along a fixed path on the run clock. You can land on its top and it carries you; you pass up through it from below and through it sideways (**top-only**). A **safe** (grey) mover holds everyone. A **colored** mover holds you only while your color matches it, exactly like a colored floor, so you can never ride one standing still: a colored mover is a bridge in motion that you cross at its pace.

Player-facing read: "grey lifts carry you; colored slabs are moving floors of that color".

## Why it fits (pillars)

- **Pace is the puzzle:** standing still is white, so a colored slab is crossable only at its pace and only while it is where you need it: a place, a pace and a moment. Grey lifts give "stop and wait" a new meaning.
- **Readable:** the same color rule as every floor; the track is always drawn.
- **Fair:** positions are a pure function of the run clock, so the pattern is identical on every attempt and every replay.
- **Small:** top-only means no pushing, no crushing, no side faces and no no-embed for movers. A mover never kills.

## Definition (level file, tech-lead's syntax)

One `mover:` header line per mover (`expansion-approach.md` §4.1), for example `mover: 10 8 3x1 safe speed=2 phase=0 path=w60,u6,w60,d6`:

| Field | Meaning | Design constraint |
|---|---|---|
| col, row | top-left cell at path time 0; must be `.` in the grid | |
| `w`x`h` | size in whole tiles | width 2–8, height 1 |
| kind | `safe`, `B`, `G`, `Y`, `R` | white slabs are Could |
| `speed` | 32nds of a tile per step: 1, 2, 4, 8 (1.875, 3.75, 7.5, 15 tiles/s) | **levels use 1 or 2 only** (`tests/levels` rule): a slab is never faster than a walk-plus |
| `path` | closed loop of `r<n> l<n> u<n> d<n>` (whole tiles) and `w<n>` (wait, steps); net displacement 0 | Must: each move token is horizontal or vertical (an L-shaped loop is allowed); every horizontal leg that a line steps on or off at has a `w` ≥ 30 at that end |
| `phase` | steps, 0 ≤ phase < cycle | |

A change to a `mover:` line bumps `version` (it is sim data; `hint:` is not).

## Position

`moverOffset(mover, t)` ([motion], `expansion-approach.md` §2.2) gives the slab's offset at run step t, an exact multiple of 1/32 tile. t is the sim's `step`: 0 at the spawn state, **0 again on every respawn** (so a death rewinds every slab to its start), frozen during the death and win freezes. Tandem bodies share the clock.

## Support, carry and step order (tech-lead's phase 6b, design's top-only faces)

- **Phases 1–6 unchanged.** A jump this step means the body leaves the slab: no carry this step.
- **6b Carry** (per body). If the body is grounded at the start of the step, did not jump, and its feet sit on the top of slab m at t (within ε, strict horizontal overlap, m solid for the body), it moves by m's delta `offset(m, t+1) − offset(m, t)`: x swept against tiles, feet snapped to m's new top. If several slabs qualify, the lowest index carries it. A body also standing on a tile is still carried (accepted from tech-lead).
  - **Blocked carry:** a horizontal carry blocked by a tile stops the body at contact (no `wallStop` event; `vx` unchanged); the slab slides on and the body falls once it no longer overlaps it. An upward carry blocked by a ceiling stops the body at contact; the slab rises through its feet and it is no longer supported. **No crush, no push** (top-only).
  - Carry never changes `vx`, `vy` (a carried-down rider keeps `vy` 0), the band, the gear, grace, `dxMoved` or the drag counter.
- **7 Move X:** slabs are not walls. Nothing changes.
- **8 Move Y:** the body **lands on** slab m when m is solid for it (`safe`; or m's band equals the body's band at the start of the step; or m's color is the active grace color, from above, as on tiles), its feet were at or above m's top at t and are at or below m's top at t+1 after its own vertical move, with strict horizontal overlap. Feet snap to the top, `vy` 0, grounded, a normal landing (drag reset, shift buffer, `land` event). This swept test stops a falling body passing through a rising slab, and lets a rising slab scoop up a body above it. `supported` also counts slab tops at t+1. `fallThrough` lists the slabs that let go (tech-lead's `movers?` field).
- **9 Air drag** counts leg motion only, never carry.

## Edge cases

- **Riding and color:** band comes from leg speed. Walking right at gear 1 on a slab moving right at 3.75 tiles/s moves you 6.75 tiles/s across the world and you are blue. Holding nothing on a moving slab: white, carried.
- **Colored slab, standing:** impossible; white is never a slab color. Letting go on a green slab gives the usual 6-step grace from above, then a fall with coyote.
- **Jumping off: no inheritance.** The flight uses leg `vx` only, so every jump number in GDD §5 holds measured from the take-off point. A standing jump from a moving horizontal slab goes straight up while the slab moves on. **Level rule:** intended jumps off horizontal slabs happen while they rest (`w` ≥ 30 at that end).
- **Shifting and ramping on a slab:** allowed; runway distances are slab-relative. A 4-wide slab cannot make red from standing.
- **Turning or stopping at speed** passes through blue and white (GDD §4.5): on a colored slab that drops you.
- **Headroom:** level rule, at least 2 tiles of clear space above every point of a slab's swept area, so blocked carries never happen in shipped levels (they exist so the sim is total).
- **Paths and tiles:** a slab's swept area overlaps no non-empty tile, spawn or exit (`tests/levels`, tech-lead §4.3). A slab may pass flush beside a ledge; stepping across needs equal tops at that moment.
- **Exits:** never on or in a slab path. A home body freezes and is never carried.
- **Tandem (Could for levels; sim tests Must):** per body; a slab's path stays inside one lane and colored slabs follow the lane coloring rule.
- **Death:** movers never kill. Being carried off the bottom of the grid is a fall.

## Readability (art; never color alone)

- A slab is a bar with a raised **top lip** (its only solid face) and the band's pattern, or plain grey for `safe`; rail clamps at both ends; side chevrons show its current direction (render-only, from the delta). It must not read as a static tile.
- The **track** is always drawn: a dotted line along the path with end stops, in every effects mode. It is the plan of the puzzle.
- Should: chevrons blink once in the last 12 steps of a wait (off under reduced motion).

## Tuning

No new `tuning.json` key: the speed set is a format constant (tech-lead) and the "1 or 2 only" limit is a `tests/levels` level rule. Everything else is per mover in the level file (geometry, like tiles).

## Acceptance

Conventions as `movement-and-gears.md`. "Lift L": `mover: … 3x1 safe speed=2 path=w60,u6,w60,d6` (each move 96 steps, cycle 312, 0.1171875 tiles/step). "Shuttle S": `8x1 safe speed=2 path=w60,r12,w60,l12` (each move 192 steps, cycle 504). Heights are above the slab's top at t 0.

1. **Position.** Lift L's top is 0 for t 0–60, 3.0 at t 108, 6.0 for t 156–216, 3.0 at t 264, 0 at t 312 and 372. With `phase` 108 it is 3.0 at t 0.
2. **Riding a lift standing.** A body on Lift L holding nothing: grounded every step; feet 0 at step 60, 3.0 at 108, 6.0 at 156 and 216, 3.0 at 264; band 0 and `vx` 0 every step; no `land` event.
3. **Walking on a shuttle.** A body on Shuttle S, 1 tile from its left end: x unchanged for steps 1–60; holding R (gear 1) on steps 61–120 gives band 1 each step and x at the end of step 120 = start + 10.00625 (legs 2.975, carry 7.03125).
4. **Jump cancels carry.** On Lift L while it rises, J on step 100: on step 100 the feet do not move with the slab (launch only); apex 3.0 above the step-99 feet on flight step 24; [sim] pins where it lands back on the slab.
5. **Swept landing.** A body falling at `maxFallSpeed` onto Lift L while it rises lands on it, never passes through; one `land` event.
6. **Carry into a wall.** On Shuttle S, a safe block at body height over the path ahead: the body stops touching the block, `vx` 0, no `wallStop`; the slab moves on; the body is airborne on the first step its box no longer overlaps the slab, with coyote. It never dies.
7. **Colored slab = colored floor.** A `G` slab inside a wait, flush with a safe ledge, behaves step for step like `G` tiles in the same place for: walking on at gear 2 (supported), at gear 1 (walks into a hole, coyote), letting go on it from gear 2 (grace 6 steps from above, then falls), landing in band 2 (lands) and band 3 (falls through).
8. **Top-only.** A standing jump from under any slab passes up through it; walking into a slab's side at any band never stops the body; a slab sliding sideways into a body never moves it.
9. **No inheritance.** A standing jump from Shuttle S while it moves: `vx` 0 every flight step; x unchanged through the flight.
10. **Drag ignores carry.** A gear-2 flat jump from a moving Shuttle S: drag counter at landing = the flight's leg distance (4.8), no drop.
11. **Respawn rewinds.** A death on step 200 on Lift L: on the respawn step the slab is at its t 0 position.
12. **Tandem.** Two bodies on two slabs are each carried by their own slab; both on one slab are both carried; a home body is never moved.
13. **Determinism and no regression.** Checks 2–12 run twice give identical state; every shipped recording and golden hash is unchanged.

## Priority

- **Must:** safe and colored slabs, horizontal and vertical legs, top-only, carry, swept landing, the drawn track.
- **Should:** the leaving blink.
- **Could:** all-faces solid slabs with push and crush (tech-lead's §2.3 design; a "crusher" hazard), white slabs, Tandem mover levels.
- **If [sim] runs late:** horizontal legs become Could and w4-02 becomes a lift level (`levels-w4.md`).
- **Not in this feature:** falling or crumbling platforms, switches, pushable crates, conveyors (a second world velocity still fails the 10-second read).
