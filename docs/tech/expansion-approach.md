# Expansion approach: movers, projectiles, longer levels

_Owner: tech-lead. Written 2026-11-23 for the owner's expansion request ("more levels, some longer, projectiles to dodge, moving objects"). Options and one recommendation per item, so engineering can start the day `docs/design/features/` lands. Not normative until design-lead's spec exists; where the spec disagrees, the spec wins on feel and this note is updated on mechanics. Fallback build: tag `rc-batch10`._

**Scope warning.** GDD v1.11 cut moving platforms (§7, 2026-11-03) and says "No checkpoints" (§5). Everything here is beyond the Must list: it needs a GDD amendment by design-lead and producer sign-off (CLAUDE.md, Scope). M4 freeze is **Nov 28**, five days out. The plan below is sized so the sim work is additive and every shipped level, recording and golden hash stays byte-identical.

## Revision 2026-11-23 (night): design specs adopted, contracts landed

Design's specs (`features/moving-objects.md`, `projectiles.md`, `sweep.md`; `decisions.md` "Expansion") are now normative. Contracts are in `src/core/contracts/kinetics.ts`, `state.ts`, `level.ts`, `lanes.ts`; rules in `architecture.md` §3.1 and §3.6 and `level-format.md` §2 "Kinetic headers". Where this note differs, those win:

1. **Slabs are top-only.** No push, no crush, no mover boxes in `sweepX`/`sweepY`, no no-embed for slabs, no `crushed` flag and no `cause: 'crush'`. Phase 6b is carry only; landing is the swept top test in phase 8. §2.3 rows 6b (2) and (3), §2.4's sweep-argument and no-embed bullets are **Could** (a later "crusher"), not built. Format: slab height is fixed at 1 (`<w>x1`).
2. **Emitters gain white:** `Emitter.band: Band | null` (null grey, 0 white, 1-4 that band); hit iff `band === null || band === bandAtStart`.
3. **No checkpoints** (§5.2 stays unbuilt). *Superseded 2026-11-24: checkpoints are Must for long levels, see §8.*
4. **The sweep is in** (Should, cheap and stateless): `sweep:` header, `sweepFront` in [motion], a phase-14 check, `cause: 'sweep'`. It fits after emitters in the [sim] sitting (S: one header, one pure function, one comparison).
5. **Contract details settled here:** [motion] also publishes `moverCorners` (track corners for drawing and swept areas) and `nextShotIn` (tell glow and fire cue, render-side); no new sim event type (audio's exhaustive switch); new motion names sit in `LANE_PENDING` until [motion] lands; the `projectileSizeTiles` / `emitterTellMs` schema keys land as step 1b with design-lead's values (the tuning lockstep test forbids either side first).
6. **Shot at t = 0:** with `phase` 0 the s = 0 shot sits at the muzzle at t = 0 (as `projectiles.md` "Room B" requires); "empty lane" means no shot with s < 0. `projectiles.md` check 5's first clause reads that way.

## 0. Decisions in one table

| Item | Recommendation | Alternative (one line) |
|---|---|---|
| Moving objects | **Kinematic movers: position is a pure function of the run step `SimState.step`.** No new state. | Entity list in `SimState`: needed only for reactive pieces (crumble, switch, pushable); state-shape change, rejected for this jam. |
| Mover maths | Piecewise-linear loops of whole-tile moves and waits; speed in 32nds of a tile per step (1, 2, 4, 8), so every position is an exact binary fraction. | Eased (sine) paths: banned by §3.3 (`Math.sin` is not exactly specified). |
| Mover collision | Static sweep against mover boxes at their **end-of-step** positions, after a per-body **push/carry phase**. All faces solid; optional band. | True swept-vs-swept AABB: more code, no gameplay gain at these speeds. One-way tops: a later flag (S). |
| Projectiles | **Emitters with period and phase; shot positions are a pure function of the run step.** Straight line, fixed range, no tile collision (range ends at a wall by level rule). | Spawned entities in state: same rejection as movers. |
| Hit rule | Body box strictly overlaps a shot box after the body's move, phase 14, exit beats hit. Coloured shot hits only a body whose band **matches** it (colour = "solid for you"), uncoloured hits everyone. Design-lead may flip the polarity; it is one boolean. | Shots that bounce or stop on tiles: needs tile sweeps per shot, M more for no puzzle value. |
| Level format | **Header lines** `mover:` and `emitter:` in the `hint:` style; no new grid glyph; no global `format` key. Any change to these lines bumps the level `version` (they are sim data, unlike `hint:`). | Grid glyphs (`M` runs) plus a second `---` section: two places to keep in sync, bigger parser change. |
| Long levels | **No checkpoints.** Long levels are single runs of up to ~90 s (5,400 steps). | Deterministic checkpoints (design in §5.2): M-L, state-shape change; build only if design insists and the producer schedules it. |
| Lanes | Path maths in **[motion]**, parsing in **[level]**, collision/push/carry/hit in **[sim]**, drawing in **[scene]**. Contracts first (tech-lead). | Path maths in [sim]: then the scene could not import it (only via barrel exports of a lane), and [level] could not validate paths. |

## 1. Where state lives today

- **State.** `SimState` (`src/core/contracts/state.ts:147-173`): run-level `step`, `status`, `wonAtStep`, `respawnInSteps`, `prevInput`, `dirPriority`, `events`; bodies `player` and `twin` (`PlayerState`, `state.ts:24-65`). `step` counts playing steps of the current run, is frozen on dead/restarting/won steps and is **0 again on the respawn step** (`architecture.md` §3.4). Nothing else is stateful: the level is immutable (`Level`, `contracts/level.ts:122-134`).
- **Step order.** `src/core/sim/step.ts:15-28` lists phases 2-13 as a reduce over `Work` (`sim/work.ts:37-48`); `playingStep` (`step.ts:43-60`) runs the runner then the twin, then `outcomePhase` (`sim/status.ts:54-81`) does exit, win and death (phase 14). Restart and the death freeze are in `status.ts:11-33`; the respawn step is `createSim` with `prevInput` kept (`status.ts:24-26`, `sim/create.ts:36-48`).
- **Collision.** Axis-separated grid sweeps in `sim/collision.ts:26-63` walk every crossed tile face and snap to it; `supported` (`collision.ts:66-71`) is the grounded test. Everything is cell based (`sim/geometry.ts:31-54`): there is no notion of a box that is not a tile.
- **Colour gating.** `sim/gating.ts`: `Gate` = band at start, grace band, per-band no-embed mask from tiles the box overlaps (`gating.ts:13-37`); `solidAll` / `solidFloor` (`gating.ts:40-58`) decide per tile. Phase 7 uses `solidAll`, phase 8 `solidFloor` (`sim/move.ts:13-44`). `fallThrough` lists grid cells (`move.ts:50-60`).
- **Lane contracts.** `src/core/contracts/lanes.ts`: `MotionApi` (`:48-53`), `SimLaneApi` (`:70-72`), `LevelLaneApi` (`:112-121`), runtime `LANE_EXPORTS` (`:129-146`), `LANE_IMPORTS` sim -> motion only (`:149-153`). `tests/arch/lane-contracts.test.ts` fails on any unlisted export.
- **Level parser.** `src/core/level/parseLevel.ts`: required keys and the repeatable `hint` key (`:33-34`, `:78-96`), grid scan (`:147-190`), `M` is reserved as "moving platform" (`:36-43`; `RESERVED_CHARS`, `contracts/level.ts:70`), a second `---` is an error (`:184`). Limits in `level/limits.ts` (`MAX_REPLAY_STEPS` 1,000,000, `MAX_WORLD` 5).
- **Solutions and replay.** Run-length codec (`level/codec.ts`, `tokens.ts`), `parseSolution`/`formatSolution` (`level/solutionFile.ts`, cap at `:90`), `runInputLog`/`verifySolution` (`level/replay.ts`, cap at `:11` and `:37`). The sim is injected (`SimApi`), so replay needs no change for new pieces: they are read from `Level` by the sim.
- **Backend.** `backend/functions/submit-run/rules.ts`: `LEVELS` table of `{ version, fastest }` per id (`:15-30`, drift-checked by `scripts/levels-table.test.ts`), `MAX_RUN_STEPS` 36,000 (`:35`), `MAX_LOG_CHARS` 16,000 (`:36`). **The server never replays** (`backend/README.md` "Unverified times"), so sim changes cannot break submission; new levels need new `LEVELS` rows.
- **Rendering.** `GameScene.drawBodies` (`src/scenes/GameScene.ts:287-317`) reads `driver.state` and `level`; `LevelView` (`src/entities/LevelView.ts`) draws static Tilemap layers and swaps coloured cells' frames when the answer to "solid for this body" changes. Positions are interpolated between the previous and current state (`entities/interpolation.ts`). The camera scrolls both axes (`entities/camera.ts:20-28`). Sealed pockets for the restart card come from the grid alone (`entities/sealedPockets.ts`). `GameScene.ts` is **370 lines** of a 400 budget.

## 2. Moving objects

### 2.1 Recommendation: kinematic movers on the run clock

A mover's offset from its origin at run step `t` is `moverOffset(mover, t)`, a pure [motion] function. The sim uses `t = state.step` for "start of step" and `t + 1` for "end of step". No field is added to `SimState`.

Consequences, all wanted:
- **Respawn rewinds movers**, because `step` is 0 on the respawn step. That matches the existing rule that respawn is the fresh-load state (`architecture.md` §3.4), so a death never leaves a platform in a worse place.
- **The death freeze and the win freeze also freeze movers** (`step` does not advance), so the frozen frame is honest.
- Tandem shares one clock. Replays, robustness trials and the server (if it ever replays) get movers for free.
- Interpolation: the renderer evaluates `moverOffset` at `prev.step` and `state.step` and blends with the same `alpha` as the bodies.

Rejected: (b) an entity list in `SimState`. It is only needed for movers that react to bodies (crumbling, switch-triggered, pushable crates). Those change `SimState`'s shape, every acceptance fixture, `createSim`, `respawnState` and the golden hashes, and they were cut once already for that reason (GDD §7). If design asks for one, it is a separate ruling.

### 2.2 Path model (exact arithmetic)

- Path = a closed loop of steps `r<n> l<n> u<n> d<n>` (move n whole tiles) and `w<n>` (wait n steps). Net displacement must be 0.
- `speed` ∈ {1, 2, 4, 8}: 32nds of a tile per step (1.875, 3.75, 7.5, 15 tiles/s). A whole-tile move then takes an integer number of steps (`32 n / speed`), every offset is a multiple of 1/32 (exact in binary), and `pos(t+1) - pos(t)` is exact. `cycleSteps` is an integer; `u = (t + phase) mod cycle` uses integers only.
- Size: whole tiles (`w x h`), origin = top-left cell at path time 0. Visual size equals collision size.

### 2.3 Step order with movers (sim lane)

Only levels with movers take the new branches; with `level.movers` absent every phase is today's code path.

| # | Change |
|---|---|
| 5 Jump | unchanged. A jump this step means the body leaves the mover: no carry this step. |
| 6 Gravity | unchanged. |
| **6b Push and carry** (new, per body) | (1) **Carry:** if grounded at start and not jumped, and the feet sit on the top of mover m at time t (|feet − top| ≤ ε, strict horizontal overlap, m solid for this body by the gate), move the body by `Δm = offset(m, t+1) − offset(m, t)`: X with `sweepX` against tiles, Y snapped to m's new top. Several riding movers: lowest index. A body also on a tile is still carried. (2) **Push:** each solid mover (index order) whose box at t+1 overlaps the body's box, and did not at t, pushes the body out along its own motion axis, sweeping against tiles. (3) **Crush:** a push or upward carry blocked by a tile sets `work.crushed`. Carry and push never touch `vx`, `vy` (except a carried-down rider stays `vy = 0`), `dxMoved` or the air-drag counter, and emit no `wallStop`. |
| 7 Move X | sweep against tiles **and** mover boxes at t+1 (static boxes; their motion was handled in 6b). |
| 8 Move Y | same; `supported` also tests mover tops at t+1; landing on a mover snaps the feet to its top. `fallThrough` gains the movers that let go (§2.5). |
| 9 Air drag | unchanged: it counts `dxMoved`, i.e. leg motion only. |
| 14 Outcome | (a) home, (b) won, (c) dead if fell out **or** `crushed` **or** hit (§3). Exit still wins. |

**Colour and momentum rulings proposed to design-lead** (they follow from `vx` being leg speed):
- Riding never changes `vx`, so it never changes the band: standing still on a moving platform is white.
- Jumping off a moving platform does **not** inherit its velocity (it would change the colour mid-air).

### 2.4 What the collision code needs

- A new `sim/movers.ts` (about 150 lines): mover boxes at t and t+1, `moverSolid(m, gate)` mirroring `solidAll`/`solidFloor` (safe mover always; coloured mover when the band matches, or the grace band for floors), push and carry.
- `sweepX` / `sweepY` / `supported` take an extra `boxes: readonly SolidBox[]` argument and return the nearer of the tile hit and the box hit. Boxes are static during the sweep, so it is a plain AABB-face test: no swept-vs-swept maths. At these speeds (mover ≤ 0.25 tiles/step, body ≤ 0.2 tiles/step plus falls ≤ 0.34) nothing tunnels through a 1-tile mover.
- `embeddedBands` (`gating.ts:23-25`) also counts coloured mover boxes at t, so no-embed holds for a coloured mover that slides over a body of its colour (it simply passes through, and pushes nothing).
- Grace (`solidFloor`) applies to coloured movers unchanged.
- **Untouched:** motion lane speed maths, input, shift, jump, timers, band, landing, grace timing, Tandem order, restart/respawn, the codec and replay.

### 2.5 Contract changes for movers

`fallThrough` keeps `cells` (grid cells) and gains `movers?: readonly number[]` (mover indices). The "never empty" rule becomes "`cells` or `movers` is non-empty". Additive: no existing consumer breaks.

## 3. Projectiles and timed hazards

- **Emitter** = a cell, a direction, a range in whole tiles, a speed (same 1/2/4/8 scale), a period ≥ 1 step and a phase. A shot leaves on every run step `s ≥ 0` with `(s + phase) mod period = 0` (the lane is empty at t = 0, so a respawn never starts with a shot in flight); it is alive while `0 ≤ t − s < range·32/speed` (an integer: `range` is whole tiles and `speed` divides 32). `shotsAt(emitter, t)` returns the live shots' centres; at most `ceil(life / period)` per emitter.
- **Pure function of the run clock**, like movers: rewinds on respawn, freezes on death and win. No state, no spawn list.
- **Box:** a square of `projectileSizeTiles` (new `tuning.json` key, design-lead; suggested 0.5), centred on the shot. Relative speed per step stays below the combined half-widths, so overlap at t+1 cannot skip a body.
- **Hit test (phase 14):** a non-home body's box (after phases 7-8) strictly overlaps a live shot's box at t+1 and the shot can hit that body's band (uncoloured: any band; coloured: band at start of step equals the shot's band, per §0). Order: home, won, then death by fall, crush or hit; one `died` event as today (both bodies on one step: body 0).
- **Shots ignore tiles.** The level rule test (§4.3) requires the whole shot lane to be clear of non-empty tiles and to end against a solid face or the grid edge, so a shot reads as "hits the wall".
- **Timed hazard blocks** (lasers, spikes that blink) are the same idea: `active(t) = (t + phase) mod period < onSteps`, a box, hit rule as above. Recommend building them only if design specs them; they reuse all of the emitter plumbing (S on top).
- **Cost:** [motion] S, [sim] S (one overlap loop in phase 14), [scene] S-M (pooled sprites).
- **Event:** `died` gains `cause?: 'hit' | 'crush'` (absent = fell out). Additive; audio and fx can give a hit its own cue.

## 4. Level format

### 4.1 Syntax: header lines

```
mover: 10 8 3x1 safe speed=2 phase=0 path=r6,w30,l6,w30
mover: 20 4 2x1 G    speed=4 phase=15 path=d3,w20,u3,w20
emitter: 30 6 dir=l range=12 speed=4 period=90 phase=0
emitter: 30 9 dir=l range=12 speed=4 period=90 phase=45 band=R
```

- `mover: <col> <row> <w>x<h> <safe|B|G|Y|R> key=value...` with `speed`, `path` required and `phase` optional (default 0).
- `emitter: <col> <row> key=value...` with `dir` (`l r u d`), `range`, `speed`, `period` required; `phase` (default 0) and `band` (`B G Y R`) optional.
- Repeatable keys, like `hint:`; caps `MAX_MOVERS` 16 and `MAX_EMITTERS` 16 per level. Parsed into `Level.movers` / `Level.emitters` in file order (the index is the id); **absent when the file has none** (the `hints` convention), so every existing parse, fixture and golden hash is unchanged.
- **No new grid glyph.** `M` stays reserved and is never reused. The mover's cells at path time 0 must be `.` in the grid (a parse error otherwise), so the grid still reads as the static level.

### 4.2 Versioning and validation

- No global `format` key: old files have no new lines and parse identically; old builds already reject unknown keys.
- **`version` bumps on any change to a `mover:` or `emitter:` line** (they change the sim; `hint:` does not). The `LEVELS` row in `submit-run/rules.ts` follows, as today.
- Parser errors (file, line, column, as today): wrong token count or unknown key; non-integer or out-of-range numbers; speed not in {1, 2, 4, 8}; path token not `[rlud][1-9][0-9]*` or `w[1-9][0-9]*`; path with net displacement ≠ 0 or no move; `phase` ≥ cycle (movers) or ≥ period (emitters); origin or any position along the path (bounding box of the loop) outside the grid; mover cells at time 0 not `.`; emitter cell not `.`; more than the cap.

### 4.3 What `tests/levels` adds (tech-lead)

- **Solvability** and **±3-step robustness**: no code change; they run the real sim on the parsed level. Robustness stays ±3 (that is the fairness rule; a periodic hazard that needs frame-exact timing fails, which is the point). A level that cannot meet it goes in `KNOWN_FAILURES` with a request line; the rule is never weakened.
- New `levelRules` checks: every mover's swept area (union of its boxes over one cycle) overlaps no non-empty tile, no spawn cell and no exit; no mover box overlaps a spawn body box at t = 0 (no step-1 crush); every shot lane is clear of non-empty tiles and ends at a solid face or the grid edge; no emitter fires into a spawn box in the first 60 steps.
- **Hint placement** (`hintPlacement.ts`): a hint box must not overlap any mover swept area or shot lane. **HUD area** (`levelRules.ts` and `hints.test.ts`'s every-camera check): swept areas and shot lanes join the "must not sit under the HUD" set.
- **Sealed pockets** (`entities/sealedPockets.ts`, [scene]): cells a mover sweeps count as open, so a pocket a platform can reach is never "sealed".
- **Determinism:** one fixture level with two movers and two emitters in `sim/determinism.test.ts` (replay twice, deep-equal, snapshot hash). Acceptance criterion for the whole expansion: **every existing golden hash and recording is unchanged.**

## 5. Longer levels

### 5.1 Limits today

| Limit | Value | Effect on a 90 s level |
|---|---|---|
| Grid width/height | no parser cap; widest shipped is 72 cols (w3-05) | fine; `LevelView` is one Tilemap layer per kind, cheap at a few hundred columns |
| Camera | scrolls both axes; Tandem framing 28 tiles apart, bodies within 15 rows | fine; Tandem levels keep the 15-row rule |
| HUD-clear check | `hints.test.ts` checks every camera x; `levelRules.ts` the start camera | linear in width; trivial |
| Recording | `MAX_REPLAY_STEPS` 1,000,000 | far above |
| Backend | `MAX_RUN_STEPS` 36,000 (10 min), `MAX_LOG_CHARS` 16,000 | 5,400 steps is fine; a messy run with many restarts could pass 16,000 chars. Backend-engineer raises it to 32,000 (and `MAX_BODY_*`) only if a recorded long run gets near it |
| Robustness test | trials ≈ transitions × 6, each replayed from its cached prefix; 30 s per level | cost ≈ transitions × remaining steps; a 5,400-step recording with ~300 transitions is a few million sim steps, near the timeout under coverage. **Cap a level's recording at 5,400 steps** (90 s); split longer ideas into two levels |
| 1M-step test | `replay.test.ts` replays 1,000,000 frames on a fixture level | unaffected (fixture, not a shipped level) |
| e2e | `replay.spec.ts` replays every solution at `speed=60` (60 steps per frame) | 5,400 steps ≈ 90 frames; fine |

### 5.2 Checkpoints (recommended: do not build for the jam)

If design insists, the cheapest sound design:
- `checkpoint: <col> <row>` header lines (cell must be `.` with floor under it), **non-Tandem levels only** (parser rejects `checkpoint:` with `&`; a two-body checkpoint needs two spawns and a both-reached rule).
- `SimState.checkpoint: number | null` (**a state-shape change**: `createSim`, every fixture, `ui/testkit.ts`, golden hashes).
- Reached = body box overlaps the cell, phase 14 (after home). A `checkpoint { index }` event.
- **Death respawn** at the latest checkpoint keeps `step` running (it does not reset), so movers keep their clock and `wonAtStep` is the time since load or the last restart, **deaths included**. **Restart** (`!`) still returns the fresh-load state (`step` 0, checkpoint null).
- Best times, leaderboard `steps` and the recording rule ("every frame since load") are unchanged in shape; the meaning of `wonAtStep` in checkpoint levels becomes "including deaths after a checkpoint", which design must state on the results screen. Backend: no change (it does not replay).
- Sizing: [level] S, [sim] M, contracts and fixtures M, scene/HUD S. Risk: the only item here that changes `SimState`.

The alternative that costs nothing: a "long" level is ~60-90 s in one run, and longer journeys are two consecutive levels.

## 6. Ownership, contracts and order

### 6.1 Contract sketch (tech-lead, lands first)

```ts
// contracts/level.ts
/** 32nds of a tile per step: 1.875, 3.75, 7.5 or 15 tiles/s. */
export type KinSpeed = 1 | 2 | 4 | 8;
export type PathStep =
  | { readonly kind: 'move'; readonly dir: 'l' | 'r' | 'u' | 'd'; readonly tiles: number }
  | { readonly kind: 'wait'; readonly steps: number };
/** Safe (always solid) or coloured (solid like a coloured tile). */
export type MoverSolid = { readonly kind: 'safe' } | { readonly kind: 'colored'; readonly band: ColoredBand };
export interface Mover {
  /** Top-left cell at path time 0. */
  readonly origin: TilePos;
  /** Whole tiles. */
  readonly width: number;
  readonly height: number;
  readonly solid: MoverSolid;
  /** Closed loop: net displacement 0. */
  readonly path: readonly PathStep[];
  readonly speed: KinSpeed;
  /** Steps, 0 <= phase < cycle. */
  readonly phase: number;
}
export interface Emitter {
  readonly cell: TilePos;
  readonly dir: 'l' | 'r' | 'u' | 'd';
  /** Whole tiles a shot travels from the cell's centre. */
  readonly range: number;
  readonly speed: KinSpeed;
  readonly period: number;
  readonly phase: number;
  /** null: hits every band. */
  readonly band: ColoredBand | null;
}
export const MAX_MOVERS = 16;
export const MAX_EMITTERS = 16;
// Level gains (absent when empty, like LevelMeta.hints):
//   readonly movers?: readonly Mover[];
//   readonly emitters?: readonly Emitter[];

// contracts/lanes.ts, MotionApi gains:
/** Offset of the mover from its origin at run step t (t >= 0), tiles; exact multiples of 1/32. */
export type MoverOffsetFn = (mover: Mover, t: number) => { readonly x: number; readonly y: number };
/** Steps in one loop of the path. */
export type MoverCycleFn = (mover: Mover) => number;
/** Centres of the shots alive at run step t, oldest first, tiles. */
export type ShotsAtFn = (emitter: Emitter, t: number) => readonly { readonly x: number; readonly y: number }[];
// LANE_EXPORTS.motion += 'moverOffset', 'moverCycle', 'shotsAt'

// contracts/state.ts
//   died:        + readonly cause?: 'hit' | 'crush'        (absent = fell out)
//   fallThrough: + readonly movers?: readonly number[]      (indices into Level.movers)
// contracts/tuning.ts: + projectileSizeTiles (design-lead sets the value in tuning.json)
```

The path maths lives in [motion] because it is pure and stateless, and because sim → motion is the one allowed cross-lane import: the sim, the level lane's tests (through the barrel) and the renderer all evaluate the **same** function, so drawn and simulated positions cannot drift.

### 6.2 Who owns what

| Piece | Owner | Files |
|---|---|---|
| Contracts, barrel, docs, `level-format.md`, `architecture.md` §3.1 rows 6b/14 | tech-lead | `src/core/contracts/**`, `src/core/index.ts`, `docs/tech/**` |
| `moverOffset`, `moverCycle`, `shotsAt` + unit tests | [motion] | `src/core/motion/paths.ts` (new), `motion/index.ts` |
| `mover:` / `emitter:` parsing and validation | [level] | `src/core/level/kinetics.ts` (new), `parseLevel.ts` (keys, call) |
| Boxes, gating, push/carry/crush, sweeps, supported, hit, events | [sim] | `src/core/sim/movers.ts`, `sim/hazards.ts` (new), `collision.ts`, `gating.ts`, `move.ts`, `status.ts`, `step.ts` |
| Mover and shot sprites, interpolation, sealed pockets | [scene] | `src/entities/KineticsView.ts` (new), `sealedPockets.ts`, one call in `GameScene.ts` |
| Level rules, hint/HUD checks, determinism fixture | tech-lead | `tests/levels/**` |
| `projectileSizeTiles`, spec, GDD amendment | design-lead | `tuning.json`, `docs/design/**` |
| Platform, emitter and shot art (per-band pattern, never colour alone) | art-director | `src/fx/pixel`, `palette.json`, `npm run art:build` |
| Hit/crush cue, mover hum (optional) | audio-designer | `src/audio/**` |
| New levels + recordings | level-designer | `levels/**` |
| `LEVELS` rows, optional log cap raise | backend-engineer | `backend/functions/submit-run/rules.ts` |

### 6.3 Order and parallelism

1. **Day 0, tech-lead:** contracts and `LANE_EXPORTS` with stub-free types; `level-format.md` §2 and `architecture.md` §3.1 updated to the design spec. (S)
2. **In parallel, no shared files:** [motion] `paths.ts` (S, lands first, half a day); [level] parser (M); [scene] the GameScene extraction (below) and `KineticsView` against the motion contract; art sprites; design-lead tuning key.
3. **[sim]** once motion lands (it may stub `moverOffset` for its first tests): movers, then hazards. (L)
4. **tech-lead** `tests/levels` rules and the determinism fixture, as soon as [level] parses. (S-M)
5. **level-designer** builds levels once [sim] and [scene] are merged (recordings need the real sim and the dev build).
6. Review (tech-lead), then QA, as usual. Nothing merges unless every existing recording and golden hash is unchanged.

## 7. Risks and budget

- **GameScene.ts is at 370/400.** [scene] first moves `drawBodies` (`GameScene.ts:287-317`) into an entities helper, then wires `KineticsView` with one call. No feature line lands in `GameScene.ts` before that extraction.
- **sim files:** `collision.ts` (71), `move.ts` (60), `gating.ts` (58) have room; push/carry goes in its own `movers.ts`, hazards in `hazards.ts`. Watch `step.ts` (80): phase 6b joins the `PHASES` list; no logic in `step.ts`.
- **Coverage ≥ 80% in `src/core`:** every new branch needs an acceptance test with numbers (carry exact offsets, crush by tile, push into wall, coloured mover with grace and no-embed, hit vs band, exit beats hit, Tandem with both bodies on one mover, respawn rewinds movers).
- **Arch tests:** `lane-contracts.test.ts` needs the new motion exports listed; `core-purity.test.ts` already bans `Math.sin` and friends (keep paths linear); `level-format-doc.test.ts` keeps the legend aligned (no glyph change planned).
- **Determinism:** integer clock, 1/32-tile offsets, fixed iteration order (mover index), no `Set`/object-key iteration. Golden hashes for shipped levels must not move.
- **Package size:** a few sprite frames; negligible against the zip.
- **Schedule:** freeze Nov 28. If [sim] is not merged by end of Nov 25, drop emitters first, then movers, and ship more levels with existing pieces; `rc-batch10` remains the fallback.

| Piece | Size |
|---|---|
| Contracts + docs (tech-lead) | S |
| [motion] paths | S |
| [level] parser + validation | M |
| [sim] movers (push/carry/crush/gating) | L |
| [sim] emitters + hit | S |
| [scene] extraction + KineticsView + pockets | M |
| tests/levels rules | S-M |
| Art (platform, emitter, shot, per-band patterns) | M |
| Checkpoints (only if scheduled) | M-L |
| Levels (content) | L |

## 8. Checkpoints (Must for long levels, 2026-11-24)

Design reversed ruling 2 (`decisions.md` 2026-11-24, `level-plan.md` v4.1, `features/checkpoints.md`): a long level is 8–12 rooms, 300–450 tiles, ≤ 15 rows, clean run 45–75 s (≤ 4,500 steps), a post every 3–4 rooms, no sweep with posts. Contracts landed 2026-11-24: `src/core/contracts/checkpoints.ts` (rules), `Level.checkpoints?`, `SimState.checkpoint?`, sim `kineticStep` (in `LANE_PENDING.sim`), `tests/arch/checkpoint-contract.test.ts`. Normative text: `architecture.md` §3.7, `level-format.md` §2 "Checkpoint headers". §5.2 above is superseded where it differs.

### 8.1 Rules fixed

| Question | Rule |
|---|---|
| Activation | Phase 14 after won, before death; runner's box overlaps the post **column** (any height, band, air); forward only (index > lit); highest wins; a post lit on a death step counts. |
| Respawn | Fresh spawn at the post (feet col+0.5, row+1; startGear, band 0, v 0, facing right, timers cleared); `prevInput` kept; after the normal 24-step freeze. |
| Level clock | `step` counts every frame (dead and respawn steps too) from the first lit post until a full restart; `wonAtStep` = frames since the last full restart. |
| Kinetic clock | `kineticStep = step − kinBase`; post respawn sets it to `post.clock` (default 0: lanes empty, slabs at origin) so the post room is identical every life; freezes freeze it. **Differs from `checkpoints.md` acceptance 8** (filed to design). |
| R / `!` | Full restart, `checkpoint` absent. |
| Signal | No new event: "lit" = `checkpoint.index` changed (audio switch untouched). |
| Recording | Shipped solution = deathless run from load (`wonAtStep === steps`), lights every post. |
| Robustness | ±3 unchanged; a trial fails on its first `died` in a post level. |
| Server | Never replays; unchanged checks hold (`wonAtStep ≤ frames`). Runs whose log exceeds the caps stay local-only. |

### 8.2 Limits for 300–450-tile levels

| Limit | Value | Verdict |
|---|---|---|
| Grid width | no parser cap; add `tests/levels` rule width ≤ 480 | confirm |
| Rows | ≤ 15 (long levels), HUD rule unchanged | confirm |
| HUD/keep-out check at every camera x | ~450 positions × (hints + lanes + posts) | linear, < 50 ms; confirm |
| Recording cap | `MAX_RECORDING_STEPS` 5,400 (design target ≤ 4,500) | confirm |
| ±3 robustness | 60 transitions × 6 trials × ≤ 4,500 remaining steps ≈ 0.8–1.6 M sim steps per level | keep 30 s; raise `LEVEL_TIMEOUT_MS` to 60 s only for width > 120 if a long level passes 20 s under coverage locally |
| 1M-step replay test | fixture level | unaffected |
| e2e replay (`speed=60`) | 4,500 steps ≈ 75 frames ≈ 1.3 s per level | confirm; per-test timeout unchanged |
| Backend | `MAX_RUN_STEPS` 36,000 (10 min since load) | keep; raise `MAX_LOG_CHARS` 16,000 → 32,000, `MAX_BODY_CHARS` 32,000 → 40,000, `MAX_BODY_BYTES` 40,000 → 56,000 |

### 8.3 Lane briefs

- **[level]** First split `kinetics.ts` (399 lines; readers to `kineticRead.ts`). Then `checkpoints.ts` (new, < 150 lines): parse `checkpoint:` per `level-format.md` §2, every listed error with file/line/column; `Level.checkpoints` absent when none; parse tests per error.
- **[sim]** Export `kineticStep`; use it for every kinetic `t` (movers, hazards, sweep). Activation in phase 14 (a2); post respawn and the dead-step clock in `status.ts`/`create.ts` (a `spawnAt(level, params, cell)` helper); field absent unless lit. Acceptance tests for `checkpoints.md` 1–7, 9 and 10 (8 per §8.1); determinism fixture with a post; every golden hash unchanged.
- **[scene]** Post view (idle/lit from `state.checkpoint`), camera snaps to the post on a post respawn (no pan, no interpolation across the teleport), respawn wipe at the post, HUD unchanged; the restart card's R stays a full restart; QA hook gains `checkpoint: number | null` and `kineticStep`. `KineticsView` must evaluate at `kineticStep`, not `step`.
- **ui-engineer** Results/best time keep "time" wording; the value now includes deaths after a post. Optional "incl. respawns" line is design's call. Saves never store a post.
- **art-director** Post sprite, 1 × 2 tiles on a safe tile: idle (outline pole, flag down) and lit (filled flag up, short rise; static under reduced motion). Shape differs, never colour alone; `npm run art:build`.
- **audio-designer** Post cue from the state diff (`checkpoint.index` changed), called by the scene like the shot fire cue; no `SimEvent` change, so `sfxEvents.ts`'s switch is untouched.
- **backend-engineer** `LEVELS` rows for new versions (orchestrator step); raise the caps in §8.2; client skips submitting when frames > `MAX_RUN_STEPS` (best stays local).
- **tech-lead (`tests/levels`)** Rules of `level-format.md` §2 "Checkpoint headers" with planted fixtures; width ≤ 480; deathless shipped recording lights every post; ±3 trial fails on `died` in post levels; drop `kineticStep` from `LANE_PENDING` at review; then `SimParams.projectileSize` required (§8.4).

### 8.4 Open follow-ups

- **`SimParams.projectileSize` stays optional.** Making it required breaks one file: `src/core/motion/testkit.ts:26` (`paramsForTests` lacks the key). [motion] adds `projectileSize: t.projectileSizeTiles` there; [sim] then drops the `size === undefined` guard in `sim/hazards.ts:22`; tech-lead tightens the type in the same review.
- **Design:** acceptance 8 (kinetic clock resets to `post.clock` on a post respawn) and "forward only" activation (design wrote "last touched wins").
