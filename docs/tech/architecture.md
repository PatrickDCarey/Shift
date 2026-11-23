# Redshift — Technical Architecture

_Owner: tech-lead. Keep in sync with the code; update when setup changes. Matches GDD v1.4 (hold-to-move; Tandem, `docs/design/features/tandem.md`)._

## 1. Stack

| Piece | Version | Notes |
|---|---|---|
| Phaser | 3.90.0 (pinned; last 3.x) | Phaser 4 exists; we stay on 3 for docs/examples maturity. |
| TypeScript | 7.0.2, `strict` + `noUncheckedIndexedAccess` | `npm run typecheck` checks `tsconfig.json` (browser, `src/`) and `tsconfig.node.json` (configs, `tests/`). |
| Vite | 8.3.5, `base: './'` | Relative asset paths so `dist/` runs from a zip in the itch.io iframe. |
| Vitest | 5.0.5 + `@vitest/coverage-v8` | Node environment. Threshold: `src/core/**` ≥ 80% lines/branches/functions/statements. |
| Playwright | 1.64.1, Chromium only | Runs against `vite build` (with `VITE_QA_HOOK=1`, §11) + `vite preview` on port 4173. 960×540 viewport, 2 workers. |
| Node | ≥ 22.12 (`.nvmrc` = 22) | |

**Rendering resolution:** decided in [`adr-pixel-rendering.md`](adr-pixel-rendering.md) (2026-11-03): 480 x 270 logical, `Scale.NONE` + integer `MAX_ZOOM`, 16 px tiles, bitmap font, atlases baked from `src/fx/pixel` + `palette.json` by `npm run art:build` and loaded at boot. **In effect from the Batch 4A cutover (PX-4..PX-10, 2026-11-13); PX-11 review in Batch 5.** Details in §4.1.

## 2. Module layout and owners

```
index.html, src/main.ts   Phaser.Game config (480x270, NONE + integer zoom), SaveStore  tech-lead
src/scenes/keys.ts, Boot  scene + registry keys, BootScene (loads pixel sheets) tech-lead
src/core/                 PURE deterministic simulation (no Phaser), 3 lanes    see §3.5
  sim/ motion/ level/     lanes, each with a public index.ts                    gameplay-engineer (one sitting per lane)
  types.ts, contracts/    shared types + lane contracts                         tech-lead
  index.ts                barrel: the only core entry for other areas           tech-lead
src/scenes/               Phaser scenes: Boot, Game (+ menu scenes)             gameplay-engineer (GameScene), ui-engineer (menus)
src/entities/             display objects that DRAW sim state                   gameplay-engineer
src/ui/                   HUD, menus, settings                                  ui-engineer
src/save/                 localStorage progress/settings/best times             ui-engineer
src/fx/                   tint, shaders, particles, colour-blind patterns       art-director
src/audio/                adaptive music + SFX driven by SimEvents              audio-designer
src/net/                  optional leaderboard client                           backend-engineer
src/data/                 tuning.json (design-lead), palette.json (art-director)
levels/                   *.txt levels + *.solution.txt recordings              level-designer
backend/                  Supabase schema, edge functions                       backend-engineer
assets/art, assets/audio  source and exported assets                            art-director / audio-designer
tests/arch/               architecture guards (purity, lanes, tuning, docs, case,  tech-lead
                          render/net imports, repo secrets, env guard, QA hook)
tests/levels/             solvability, ±3-step robustness, hint placement: real  tech-lead
                          sim, every recording
config/envGuard.ts        Vite plugin: only safe VITE_ vars reach the client    tech-lead
scripts/                  npm run package (itch.io zip)                         backend-engineer
tests/e2e/                Playwright                                            qa-tester
src/**/*.test.ts          unit tests, co-located with the code they test        owner of that code
```

Dependency direction (an arrow means "may import"):

```
scenes, entities, ui, fx, audio ──► core (index.ts or types.ts) ──► data/*.json
            │                        ▲
            └──► net, save ──────────┘ (types only)
core ──► nothing outside core except src/data/*.json
```

`tests/arch/core-purity.test.ts` enforces the `core` rules in CI: no package imports (Phaser included), no imports from outside `src/core` except `src/data/*.json` (sim lane only), no `Math.random`, `Date`, `performance`, timers, `import.meta` or DOM globals, plus the lane rules in §3.5. `tests/arch/path-case.test.ts` fails on two paths that differ only in case and on imports whose case differs from the file on disk (Windows hides both; Linux CI breaks).

## 3. Simulation / render split

**The simulation (`src/core`) is a pure function of (level, params, input frames).**

```ts
deriveParams(tuning: Tuning): SimParams          // validate first with tuningErrors / isTuning (types.ts)
createSim(level: Level, params: SimParams): SimState
step(state: SimState, input: InputFrame, level: Level, params: SimParams): SimState   // StepFn in types.ts
```

- `SimState` is immutable; `step` returns a new object. It contains everything needed to continue (including `prevInput` for press edges). If randomness is ever needed, a seeded PRNG state lives inside `SimState`.
- **Units** (header of `src/core/types.ts`): distances in tiles, **speeds in tiles/second everywhere** (tuning, params and state), time in whole steps, `dt = 1 / stepHz`. Snapped speeds are therefore exact (`vx === 3`, `vx === 12`), as the acceptance tests require. Pixels and milliseconds never enter the sim except through `Tuning`, converted once in `deriveParams` (`steps = round(ms × stepHz / 1000)`).
- **Gear vs band.** `Gear` (1–4) is the selected cruise gear; `Band` (0–4) is the colour of the actual speed `|vx|`. They differ while ramping, braking, standing and after drag. Coloured tiles and speed gates test the **band**, never the gear.
- `SimState.events` lists what happened in the last step, in step order (`shift`, `shiftBuffered`, `bandChange`, `airDrag`, `jump`, `land`, `wallStop`, `ceiling`, `graceStart`, `home`, `won`, `died`, `restart`). Every event about one body carries `body: 0 | 1` (`BodyId`; 0 = runner, 1 = twin; `BodyEvent` in `types.ts`); `won` and `restart` are run-level. Audio, FX and HUD react to events; they never mutate sim state. Respawn has no event: watch `status` change from `dead`/`restarting` to `playing`. `fallThrough` (§3.2, T-07) is in the contract since Batch 4; the sim emits it from Batch 5.
- **Bodies (Tandem).** `SimState.player` is body 0, the runner (spawn `@`). `SimState.twin` is body 1 (spawn `&`, `Level.twinStart`), or `null` in a level without `&`; then the sim behaves exactly as before Tandem (same states, same events, all with `body: 0`). Renderers, HUD and audio handle one or two bodies the same way: a list of `[player, twin]` without the nulls.
- **Renderer** (Phaser scenes and entities) reads `SimState` and draws it; it never decides game rules. Tiles → pixels (`× tileSize`) happens only there.

### 3.1 Step order (normative: GDD §4.14)

The sim lane implements exactly this order; acceptance numbers in `docs/design/features/` depend on it. "Grounded at start" means `player.grounded` from the previous step.

| # | Phase | Notes for implementation |
|---|---|---|
| 0 | **Status gate** | `won`: return the state unchanged except `prevInput` and `events = []`. `dead`/`restarting`: see §3.4. |
| 1 | **Input** | `pressed(b) = input[b] && !prevInput[b]`. A `restart` press (any status but `won`) ends the step here (§3.4). |
| 2 | **Shift** | `net = pressed(shiftUp) − pressed(shiftDown)` (both on one step cancel). Grounded at start: `gear = clamp(gear + net, minGear, MAX_GEAR)`, `shift` event if it changed. Airborne (incl. coyote): if `net ≠ 0`, add it to `shiftBufferNet` and restart the buffer window (`shiftBufferSteps`), `shiftBuffered` event carrying the new running total (§3.2). |
| 3 | **Direction** | Update `dirPriority` from the L/R press edges (only L pressed → −1, only R → +1, both → 0, none → unchanged). `d`: one held → it; none → 0; both → `dirPriority`. If `d ≠ 0`, `facing = d`. Store `moveDir = d`. |
| 4 | **Ground speed** | Only if grounded at start: `motion.groundSpeed(vx, d × gearSpeeds[gear], params)` (GDD §4.4–4.5; segment chosen from the speed at the start of the step). Keep `vxOld` for phase 7. |
| 5 | **Jump** | If (`pressed(jump)` or `jumpBufferSteps > 0`) and (grounded at start or `coyoteSteps > 0`): `vy = −jumpSpeed`, airborne, grace cleared, `airDistance = 0`, `coyoteSteps = 0`, `jumpBufferSteps = 0`, `jump` event. Else if `pressed(jump)` while airborne: `jumpBufferSteps` = the param. |
| 6 | **Gravity** | If airborne (`player.grounded` is false here: airborne at start, or jumped in phase 5; a walk-off is only detected in phase 8, so the walk-off step gets no gravity, §3.2): exact kinematics `dy = vy·dt + ½·g·dt²`, then `vy = min(vy + g·dt, maxFallSpeed)`. |
| 6b | **Carry** (levels with `movers` only) | Per body, top-only slabs (§3.6): grounded at start, no jump in phase 5, feet on slab m's top at `t` → move by `moverOffset(m, t+1) − moverOffset(m, t)`; x swept against tiles, feet snapped to m's top at `t+1`. Changes no velocity, band, timer, `dxMoved` or drag counter; no event. |
| 7 | **Move X** | `dx = (vxOld + vx) / 2 × dt`. Resolve walls with the **band at start of step** (no-embed applies; grace never applies to walls). Blocked → snap to the face, `vx = 0`; `wallStop` event only on contact (§3.2), not while pushing into a wall the box already touches. |
| 8 | **Move Y** | Resolve floors and ceilings with the band at start of step, no-embed, and grace (`graceBand` tiles solid from above only while `graceSteps > 0`). Ceiling → `vy = 0`, `ceiling` event. Landing → snap feet to the tile top, `vy = 0`. With `movers`: also the swept slab landing and slab-top support of §3.6 (slabs are never walls or ceilings). Then decide `grounded` (supported test, GDD §4.7). Grounded at start, airborne now, no jump this step → `coyoteSteps` = the param. |
| 9 | **Air drag** | If **in the air this step** (§3.2): `airDistance += |dx actually moved|`, then `motion.airDrag(vx, airDistance, params)`; `airDrag` event if it dropped. At most one drop per step. |
| 10 | **Band** | `band = motion.bandForSpeed(|vx|, edges)`; `bandChange` event if changed. If in the air this step: `gear = max(minGear, min(gear, band))`. |
| 11 | **Landing** | If airborne at start and grounded now: `airDistance = 0`, apply `shiftBufferNet` (clamped, `shift` event), clear the shift buffer, `coyoteSteps = 0`, `land` event. |
| 12 | **Grace** | Grounded at start and now, band changed, previous band ≥ 1: `graceBand` = previous band, `graceSteps = colorGraceSteps`, `graceStart` event. Otherwise, if `graceSteps > 0`, count down (clear `graceBand` at 0). Leaving the ground clears grace. |
| 13 | **Timers** | Decrement `coyoteSteps`, `jumpBufferSteps`, `shiftBufferSteps` if > 0 (a shift buffer reaching 0 clears `shiftBufferNet`). |
| 14 | **Exit, then death** | Box overlaps an exit tile → `won`, `wonAtStep = step + 1`, `won` event. Else box top below the grid bottom, **or** hit by a bolt, **or** caught by the sweep (§3.6) → `dead`, `respawnInSteps = deathFreezeSteps`, one `died` event (`cause` absent for a fall, `'hit'`, `'sweep'`; first cause in that order). Exit wins on the same step. |
| 15 | **Bookkeeping** | `step + 1` (playing steps only, §3.4), `prevInput = input`, `events` = this step's list. |

### 3.1.1 Tandem: two bodies, one input (normative: `features/tandem.md` "Step order")

With a twin (`SimState.twin !== null`) the table above runs as follows. Without a twin it is exactly the table above.

| # | Phase | Runs |
|---|---|---|
| 0 | Status gate | **once** (run-level status) |
| 1 | Input | **once**: press edges from the shared `SimState.prevInput`; a `restart` press ends the step for both bodies |
| 3 | Direction | **once, before any body's phase 2** (it reads only the input, so moving it ahead of phase 2 changes nothing): one shared `dirPriority`, one `d` for both bodies. `moveDir = d` and `facing = d` (when `d ≠ 0`) are written per body |
| 2, 4–13 | Shift, ground speed, jump, gravity, move X, move Y, air drag, band, landing, grace, timers | **per body: body 0 (runner) first, then body 1 (twin).** Each body uses its own "grounded at start", band at start, buffers and timers. A body that is **home is skipped** (state unchanged, no events) |
| 14 | Exit, then death | **once:** (a) home check for each non-home body, runner first: its box overlaps an exit tile → `home = true`, `home { body }` event; (b) if every body is now home → `won`, `wonAtStep = step + 1`, `won` event; (c) else if any non-home body's box top is below the grid bottom → `dead`, `respawnInSteps = deathFreezeSteps`, one `died { body }` event (the body that fell; **both on one step → body 0**). Home is decided before death, so a body that gets home on the step its partner falls still dies with the run (`tandem.md` check 14), and a run whose last body gets home is won even if it was also below the grid (check 13) |
| 15 | Bookkeeping | **once:** `step + 1`, `prevInput = input`, `events` = runner's events, then twin's, then the run-level phase 14 events in the order (a)–(c) |

- **Bodies never interact.** Tiles never treat a body as solid; bodies may overlap. Order (runner first) changes no position or speed, only the event order.
- **Shared, per run:** `prevInput`, `dirPriority`, `step`, `status`, `wonAtStep`, `respawnInSteps`. **Per body:** everything in `PlayerState`, including `home`.
- **Home is frozen:** from the step after a body got home, phases 2–13 skip it; it emits nothing, is never checked for death and is ignored for camera framing. Exits are shared: either body may use any exit tile.
- **`home` events exist only with a twin.** Without one the win step emits `won` alone, as today (`tandem.md` check 1).
- **Contract status (T-01, 2026-11-04).** In `src/core/contracts/`: `BodyId`, `RUNNER`, `TWIN`, `body` on every body event, `home { body }`, `died { body }`, `BodyEvent`, `SimState.twin`, `Level.twinStart`, `TWIN_START_CHAR`. The sim emits `body: 0` and `twin: null` until T-10. **Stage 2 is pending** a one-line fixture update by ui-engineer (`src/ui/testkit.ts`): `PlayerState.home` is added and `dirPriority` moves from `PlayerState` to `SimState`. Build T-10 against the stage-2 shape described here.

### 3.2 Conventions the GDD leaves implicit (tech-lead rulings)

These make §3.1 deterministic and unambiguous. If design-lead disagrees, change the GDD and this section together.

- **In the air this step** = *not* (grounded at start *and* grounded at end). It covers the takeoff, walk-off and landing steps. Used by drag (9) and gear-follows-band (10). This makes a gear-4 jump drop on flight step 30 (flight step 1 = takeoff step), and makes a drop on the landing step lower the gear too.
- **Timer windows.** Every timer is "steps left"; phase 13 decrements every running timer, **including one set earlier in the same step**. Grace is the exception: it counts down in phase 12, not on the step it starts. Resulting windows, which the acceptance tests match:
  - grace started on step c holds on steps c+1 … c+6; the player falls on c+7;
  - coyote set on the walk-off step k allows a jump on steps k+1 … k+5 (step k itself started grounded, so a jump on k is a ground jump). With grace expiring (c+7 = k) that gives jumps on c+1 … c+12: the GDD's 12-step window;
  - a jump pressed in the air on step p fires on step L+1 if the landing step L ≤ p+4;
  - a shift pressed in the air on step p applies if the landing step L ≤ p+5.
- **Both shifts on one step** cancel (net 0). Presses are per logical action, so with two keys on one action (Right Shift held, then E pressed) there is no new press until the action is released. Documented for ui-engineer.
- **Band at start of step** decides collisions in phases 7–8; the band is recomputed only in phase 10. A colour change affects collisions from the next step.
- **Air drag judges the band of the current `|vx|`** (after a wall stop that is white, so no drop).
- **Gravity starts the step after a walk-off** (ruling 2026-11-02). Phase 6 runs before phase 8 can see that the floor is gone, so on the walk-off step the player moves only horizontally; coyote starts that step and the fall starts on the next. No look-ahead or second Y pass. Walk-off flights are therefore one step longer than a "same-step gravity" model (the sim lane's numbers in `*Acceptance.test.ts` are normative; design-lead updates the spec tables).
- **`wallStop` fires once per contact** (ruling 2026-11-02): when phase 7 is blocked **and** (`vxOld ≠ 0` **or** the box moved this step). Holding into a wall from standing (vx 0 → 3 → blocked, box already flush) emits nothing, so audio/FX get one thud per impact, not 60 per second. `speed` stays `|vx|` before the stop. In the air a stop zeroes `vx`, so it cannot repeat anyway.
- **Fall-through is a sim event, `fallThrough`** (T-07 ruling 2026-11-05; request from design-lead 2026-11-04, `adaptive-audio.md` "Fall-through trigger"). Audio and fx (and the PT-3 tile flash and HUD pulse) all need "a coloured floor let this body go". It is a sim event, not a derived helper, because:
  1. events exist so consumers never diff states (§3); a helper would need the previous state, the level and `SimParams` in every consumer;
  2. `src/audio`, `src/fx` and `src/net` import only types from core, statically or by dynamic `import()` (`tests/arch/render-imports.test.ts`; the one exception is §8's name rule for `src/net`), so they could not call a core helper anyway, and audio already models a `{ type: 'fallThrough', body }` cue;
  3. the sim already knows the exact condition in phase 8, with its own footprint and `SIM_EPSILON`, so audio, fx and HUD cannot disagree;
  4. it costs nothing in determinism: events are never read back by the sim, recordings and `wonAtStep` do not change, and no solution needs re-recording.

  This supersedes the "no sim event; a pure derived helper" line in `decisions.md` (2026-11-05 list); design-lead amended it on 2026-11-13. Shape and rule, **in `contracts/state.ts` since Batch 4** (additive: no sim, audio or ui code had to change):
  ```ts
  /** A coloured tile that was under a body's footprint when the floor let it go. */
  export interface FallThroughCell { readonly col: number; readonly row: number; readonly band: ColoredBand }
  // SimEvent member:
  | { readonly type: 'fallThrough'; readonly body: BodyId; readonly cells: readonly FallThroughCell[] }
  ```
  - **When:** phase 8, for a non-home body, on the step where it was grounded at start, is not grounded after phase 8, did not jump in phase 5, and at least one coloured tile (`B G Y R`, later the coloured gates) lay in its support row (the row under its feet at the start of the step) across its footprint after the phase 7 X move. Because the body is unsupported there, every listed cell is one that failed to hold it; walking off the end of a matching coloured ledge lists none and emits nothing. That is exactly the coyote-start condition plus the coloured-cell test. `cells` lists those coloured cells left to right (never empty).
  - **Fires on:** letting go on a blue bridge (the step the body leaves the floor), grace expiry on a mismatched floor, walking off a safe tile onto a mismatched coloured one. **Never on:** a walk-off from a safe-only ledge, a jump (phase 5 fired), a restart or respawn step, a home body, a `won` step.
  - **Order:** in the body's event list right after `ceiling` (phase 8), before `airDrag`, `bandChange`, `land`, `graceStart`.
  - **Airborne pass-through is not reported (ruling 2026-11-13, PT-3 Should; design-lead left it to tech-lead).** `fallThrough` always means "the floor you stood on let you go" and never fires mid-flight, so audio can keep playing one whoosh per event. A pass-through cue (a falling body's feet cross the top edge of a coloured tile it does not match) is not in the contract because "at most one cue per body per flight" needs a per-flight latch in `PlayerState`. That is a state-shape change touching spawn, respawn, every acceptance fixture and golden hashes, for a Should. If the producer schedules the PT-3 Should, it lands as its **own** event `passThrough { body, cells }` (never an extension of `fallThrough`), with that latch, after a contract change by tech-lead. Until then the scene shows nothing for it.
  - **Sequence:** (1) done in Batch 4: tech-lead added `FallThroughCell` and the union member (no behaviour change; the sim emits none yet; `types.test.ts` pins the shape); (2) [sim] emits it, with the four cases of `adaptive-audio.md` check 5 as tests plus a Tandem case (twin event carries `body: 1`); (3) audio maps the sim event and deletes its local `FallThroughEvent`; [scene] PT-3 flashes `cells`, ui pulses the slot of `cells[0].band`. No contract stub lands in Batch 3, because [sim] is mid-T-10 in `src/core/sim`.
- **`shiftBuffered.net` is the running buffer total** after the press (`player.shiftBufferNet`), unclamped, and may be 0 (`+` then `-` in one jump; the event still fires). The clamped outcome is the `shift` event on landing. Buffer expiry (phase 13) has no event: HUDs show pending shifts from `player.shiftBufferNet`/`shiftBufferSteps`, not from events.

### 3.3 Floating point

- Positions are JS numbers. Use only `+ − × ÷`, comparisons, `Math.abs/min/max/floor/ceil/round/sign/sqrt/trunc` (exactly specified by IEEE 754 / ECMAScript). Do **not** use `Math.sin/cos/pow/exp/log` etc.: results may differ between engines, which would break replays and server-side validation. Never iterate over object keys or `Set`s where order could affect the result.
- **Use `SIM_EPSILON` (1e-9, `types.ts`) for every "reached" test on an accumulated value**: drag counter vs `airDragTilesPerGear`, band edges, overlap tests (`a < b − ε`). Example: at gear 2, 60 steps of `6 × dt` sum to 5.999999999999995, so a plain `≥ 6` drops one step late.
- **Snap, don't accumulate, at contacts:** wall stops set x so the box face equals the tile edge; landings set feet y to the tile top; instant speed changes and drag drops assign exact gear speeds. Box sizes (0.75 × 1.5) are exact binary fractions, so snapped edges compare exactly.

### 3.4 Death, restart, respawn

- **Death** (phase 14) sets `status = 'dead'`, `respawnInSteps = deathFreezeSteps` (24). While `dead`, each step is frozen (no rules run, inputs ignored except restart) and decrements `respawnInSteps`; the step that starts with `respawnInSteps === 0` is the **respawn step**. Death on step d: frozen d+1 … d+24, respawn on d+25.
- **Restart** (a `restart` press on step r, any status except `won`) sets `status = 'restarting'`, `respawnInSteps = 0` and emits `restart`; nothing else runs on step r. Step r+1 is the respawn step. During a death freeze this skips the rest of the freeze.
- **The respawn step** returns `{ ...createSim(level, params), prevInput: input }`: exactly the fresh-load state except `prevInput`, so buttons held through the respawn are not new presses. The new run's step 1 is the step after. This satisfies `safe-tiles-and-reset.md` checks 6, 10 and 11 literally (the state on the respawn step equals the fresh-load state).
- `won` is terminal in the sim (R on the exit step is ignored); the scene starts a new run with `createSim`.
- **Tandem.** Either body falling out kills the whole run (phase 14, §3.1.1); the freeze, restart and respawn rules above are run-level and unchanged. The respawn step returns `createSim(level, params)` with `prevInput` held through, so **both** bodies are back at their spawns, `home` false, `twin` rebuilt from `Level.twinStart` (`tandem.md` checks 12 and 15). There is no partial respawn.
- **Checkpoint posts** (§3.7) add a third kind of respawn: a death with a post lit respawns at the post and `step` runs on; R is always the full restart above.
- **`SimState.step` counts playing steps of the current run only** (ruling 2026-11-02; exception: while a checkpoint post is lit, §3.7). Frozen death steps, the restart step and `won` steps leave it unchanged; the respawn step resets it to 0. So `step` (and `wonAtStep`) is the run time; the number of recorded frames is the solution's `steps`, which also counts deaths, freezes and restarts.

### 3.5 Lanes inside `src/core` (M1-41)

`src/core` is split into three lanes so up to three gameplay-engineer sittings can work at once. Each lane has a public `index.ts`; **its exports and their signatures are fixed by `src/core/contracts/lanes.ts`** (`MotionApi`, `SimLaneApi`, `LevelLaneApi`, listed at runtime in `LANE_EXPORTS`). Build against the contract, not against another lane's internals.

| Lane | Folder | Contents | Publishes | May import |
|---|---|---|---|---|
| motion | `src/core/motion/` | pure speed maths: ground accel/brake/skid, bands, segment rates, air drag; kinetic clock maths (slab offsets, shots, sweep front) | `bandForSpeed`, `segmentRates`, `groundSpeed`, `airDrag`, `moverCycle`, `moverOffset`, `moverCorners`, `shotsAt`, `nextShotIn`, `sweepFront` | `../types` |
| sim | `src/core/sim/` | state, step order (§3.1), jump, collision, colour gating and grace, death/restart, tuning loader | `createSim`, `step`, `deriveParams` | `../types`, `../motion` (index only), `src/data/*.json` |
| level | `src/core/level/` | level/solution parsers (LF + CRLF, incl. `mover:` / `emitter:` / `sweep:` headers), input-log codec, `runInputLog`, `verifySolution`, `loadLevels` | 8 functions in `LevelLaneApi` | `../types` only |
| tech-lead | `src/core/types.ts`, `src/core/contracts/**`, `src/core/index.ts` | shared types, contracts, barrel | everything above + types | contracts only |

- **The level lane never imports the sim.** `runInputLog` and `verifySolution` take a `SimApi` (`{ createSim, step }`) argument, so the level lane is built and tested now with a stub sim. The real solution replay test (`tests/levels/solvability.test.ts`, tech-lead) imports the barrel `src/core`; tests are exempt from the lane-import rule.
- **Order of work:** motion and level can start immediately; sim needs `motion` for phases 4, 9, 10 but can stub them until motion lands (motion is small and has the acceptance numbers in `movement-and-gears.md` and `air-drag.md`).
- **Changing a contract:** ask tech-lead (requests.md). The signature changes in `contracts/lanes.ts` first; both lanes then follow.
- **Enforced in CI** by `tests/arch/core-purity.test.ts` (purity; lane import edges; cross-lane imports only via `index.ts`; no stray files in the `src/core` root; code outside `src/core` imports only the barrel or `types`) and `tests/arch/lane-contracts.test.ts` (no unlisted lane exports; every export matches its contract type). `REQUIRE_COMPLETE` is on since 2026-11-02 (all lanes implemented), so a missing export fails too, except names listed in `LANE_PENDING` (`contracts/lanes.ts`): contract names whose lane sitting is still open. Since 2026-11-23 the six kinetic motion functions are pending; tech-lead empties the list in the review that lands them.

### 3.6 Kinetic pieces: slabs, bolts, sweep (expansion, 2026-11-23)

Normative specs: `docs/design/features/moving-objects.md` (Must), `projectiles.md` (Must), `sweep.md` (Should). Approach and sizing: `expansion-approach.md`. Types and arithmetic: `src/core/contracts/kinetics.ts`. With `Level.movers`, `Level.emitters` and `Level.sweep` all absent, every phase runs exactly today's code path, so every shipped recording and golden hash is unchanged (acceptance criterion for the whole expansion).

- **Clock.** Positions are pure functions of the run step: `t = state.step` (with a lit checkpoint post, the kinetic clock `kineticStep(state)`, §3.7) is the start of the step, `t + 1` (the returned state's `step`) is its end. Nothing kinetic is stored in `SimState`. Respawn rewinds (step 0), freezes freeze. The sim, renderer and `tests/levels` all call the same [motion] functions (`moverOffset`, `shotsAt`, `nextShotIn`, `sweepFront`), never their own copies.
- **Slabs are top-only.** A slab's only face is its top. It is never a wall or a ceiling (phase 7 and the phase 8 ceiling test ignore it), never pushes, never crushes, never kills and takes no part in no-embed. Solid for a body = `safe`, or band at start of step equals its band, or its band is the body's active grace colour (from above only, as tiles).
- **Phase 6b carry** (per body, runner first, after jump and gravity): if the body was grounded at start, did not jump in phase 5, and its feet are within `SIM_EPSILON` of slab m's top at `t` with strict horizontal overlap and m solid for it, then Δ = `moverOffset(m, t+1) − moverOffset(m, t)`; lowest index wins when several qualify; a body also on a tile is still carried. X: swept against tiles with the band-at-start gate; a blocked carry stops flush at the tile, no `wallStop`, `vx` unchanged. Y: feet snapped to m's top at `t+1`; an upward carry blocked by a ceiling stops at contact (the slab rises through the feet and the body is no longer supported). Carry never changes `vx`, `vy`, band, gear, grace, `dxMoved` or the drag counter, and emits nothing.
- **Phase 8 landing on a slab** (swept top test): after the body's own vertical move, it lands on slab m when m is solid for it, its feet were ≤ m's top at `t` (+ε) and are ≥ m's top at `t+1` (−ε), with strict horizontal overlap; nearest top wins (then the tile landing if nearer), feet snap to the top, `vy = 0`, normal landing (phase 11, `land` event). **Supported** (grounded) also counts slab tops at `t+1`. A coloured slab that lets a grounded body go is listed in `fallThrough.movers`.
- **Phase 14 order:** (a) home, (b) won (exit wins), (c) death: for each non-home body, runner first, first of: fell out (no `cause`), hit by a bolt (`cause: 'hit'`), caught by the sweep (`cause: 'sweep'`). One `died` event (both bodies → body 0).
- **Bolt hit:** the body's box after phases 7-8 strictly overlaps (`SIM_EPSILON`) a shot box at `t+1` (`shotsAt(e, t+1)`, a square of side `projectileSizeTiles` centred on the shot) and `e.band === null || e.band === bandAtStartOfStep`. Emitter index order; no grace, no coyote.
- **Sweep catch:** `sweepFront(sweep, t+1, level.width) ≥ body.x − SIM_EPSILON` (feet centre).
- **No new events** besides `died.cause` and `fallThrough.movers`. The shot "fire" cue and the emitter tell glow are derived render-side from `nextShotIn(e, state.step)` on steps where `state.step` advanced (audio's event switch is exhaustive, so a new event type would break `src/audio`).
- **Tuning (step 1b).** `projectileSizeTiles` (sim) and `emitterTellMs` (render) are in `Tuning`/`TUNING_SCHEMA` and `tuning.json` (0.5 and 300, design B11-04) as of wave 2 of batch 11; `SimParams.projectileSize` is declared **optional** until the bolts sitting (B11-17) adds the one `deriveParams` line and makes it required in the same commit (plan in `reviews/2026-11-batch11-review.md` §5). `emitterTellMs` never reaches `SimParams`; the renderer converts it with the same `round(ms × stepHz / 1000)` (18 steps).

### 3.7 Checkpoint posts (long levels, 2026-11-24)

Spec: `docs/design/features/checkpoints.md` (Must for long levels). Types and the normative rule text: `src/core/contracts/checkpoints.ts`. Format: `level-format.md` §2 "Checkpoint headers". Lane briefs: `expansion-approach.md` §8. With `Level.checkpoints` absent, no state ever carries `SimState.checkpoint` and every phase runs today's code path: every shipped recording and golden hash is unchanged.

- **Where:** single-body levels only (parser rejects posts with `&` or `sweep:`).
- **Activation, phase 14 (a2)**, between won (b) and death (c): on a playing step, post i lights when the runner's box after phases 7-8 strictly overlaps the post's column span `[col, col+1)` horizontally (any height, band, ground or air) and i > the lit index (or none is lit). Forward only; several on one step → highest index. A post lit on a death step is the one the body respawns at; an exit on that step still wins. The body moves ≤ 0.25 tiles per step, so a post column cannot be skipped.
- **Two clocks.** `step` is the level clock: while `checkpoint` is present it advances on every step except a restart press and `won` steps (playing, dead freeze steps and the respawn step all count), so `wonAtStep` = frames since the last full restart. The **kinetic clock** `kineticStep(state) = step − checkpoint.kinBase` (`= step` without a post) is the `t` of every mover, bolt and sweep call in the sim, the renderer and `tests/levels`; lighting a post keeps `kinBase`, dead steps advance `kinBase` with `step` (the freeze freezes kinetics, as today).
- **Full restart** (load, restart press, or death with no post lit): unchanged §3.4, `checkpoint` absent.
- **Post respawn** (death with post i lit): after `deathFreezeSteps`, the respawn step returns createSim's state with the runner spawned at the post (feet `col + 0.5`, `row + 1`, standing, `startGear`, band 0, `vx = vy = 0`, facing right, every timer cleared), `prevInput = input`, `step = previous + 1`, `checkpoint = { index: i, kinBase: step − post.clock }`. So the kinetic clock is `post.clock` (default 0: empty bolt lanes, slabs at their origins) on every respawn at that post: the room after a post replays identically on every life. Deviation from `checkpoints.md` acceptance 8 ("movers carry on from τ"), filed to design-lead: a running kinetic clock would put the post room in a different phase on each life and break the "same inputs, same room" rule the ±3 test and the level rules assume.
- **No new event.** "Post lit" = `next.checkpoint` present and its `index` differs from `prev.checkpoint?.index` (render and audio derive it; audio's event switch is exhaustive). A post respawn keeps the index.
- **Recordings and server:** a player recording is still every frame since load; `verifySolution` is unchanged (the sim is deterministic through post respawns). Shipped solutions of post levels are deathless. The server never replays; its checks (`steps ≤ frames`, floor, caps) hold because `wonAtStep ≤ frames` still holds.

## 4. Fixed-step loop (how Phaser drives the sim)

### 4.1 Canvas, zoom and boot (PX-4, `adr-pixel-rendering.md`)

- **Canvas 480 x 270**, `Scale.NONE`, `zoom: MAX_ZOOM`, `autoCenter: CENTER_BOTH`, `pixelArt: true` (`src/main.ts`). The browser upscales by a whole number: 2x in the 960 x 540 itch embed, 4x at 1920 x 1080, 5x at 2560 x 1440; between whole multiples the page background (`#000`, `index.html`) letterboxes. Below 480 x 270 the zoom stays 1 and the canvas is clipped.
- **Re-zoom on resize.** Phaser does not re-zoom in `NONE` mode, so `main.ts` calls `scale.getParentBounds()` then `scale.setMaxZoom()` on every window `resize` (ignored before boot). itch's fullscreen button resizes the iframe, so this covers fullscreen.
- **`fps.panicMax: 0`.** Phaser otherwise clamps the frame delta to one step for the first 120 frames, which made slow machines run in slow motion after boot. The accumulator below caps catch-up itself.
- **Boot order.** `main.ts` creates the one `SaveStore` (never throws; storage blocked means in memory, §9) and installs it in `preBoot`. `BootScene.preload` loads every `PIXEL_KEYS` sheet: five JSON-hash atlases (`pixel-player`, `-tiles`, `-scenery`, `-hud`, `-fx`; PNG as `?url`, JSON imported as data), the Tilemap grid `pixel-tileset` (`load.image`) and the bitmap font `pixel-font` (PNG + XML as `?url`). `create` checks the store and starts `bootTarget(location.search)` (`keys.ts`, B6-24): the title on a plain load, `Game` directly on a deep link (`?level=<id>`, non-blank, or `?replay=1`/`true`), exactly as before the menus, so the QA hook, every Playwright spec and the replay tool keep working; GameScene still reads `level`, `replay` and `speed` from the URL itself and still decides whether replay is allowed. Scene list (`main.ts`): `[BootScene, GameScene, ...MENU_SCENES]` (`src/scenes/menuScenes.ts`, ui-engineer: Title, LevelSelect, Pause, Results, Controls, Settings); Pause and Results are overlays launched over Game, so they are registered after it and draw on top. `tests/arch/scene-registration.test.ts` fails if a `SCENE_KEYS` entry, a `menuNav` `SceneTarget`, a `menuFlow` `FlowTarget` or any `SCENE_KEYS.x` used in `src/scenes` or `src/ui` is not registered, if Boot is not first or an overlay is before Game, and pins the `bootTarget` table. Every later scene finds the textures and font in the global caches under the `PIXEL_KEYS` names; no other scene loads pixel files. A failed load is retried twice, then reported (B7-03, BUG-6; policy `BOOT_LOAD_PLAN` in `src/scenes/bootLoad.ts`, unit tested; owner notes `docs/tech/reviews/2026-11-bug6-boot-load.md`): Phaser itself retries a request that fails on the network `LOADER_REQUEST_RETRIES` (2) times, but a file that downloads and then fails to decode is never retried, emits no `loaderror` and is not counted in `complete`'s `totalFailed` (Phaser 3.90 `File.onProcessError`), so after each load Boot checks the texture and bitmap-font caches itself. Anything missing is queued again (`BOOT_LOAD_ATTEMPTS` = 3): after 500 ms, then after 2 s, each retry loading images with a plain `<img src>` (`load.imageLoadType = 'HTMLImageElement'`) instead of the default XHR + blob, because the reproduced BUG-6 failure was XHR blobs coming back empty; if it is still missing after the third attempt, Boot adds `<p id="boot-error" role="alert">COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.</p>` over the canvas (DOM, system font, `palette.json` colours: the bitmap font may be what failed) and starts no other scene; it never throws. While loading, Boot holds back Phaser's own loader `console.error` lines (`captureLoaderErrors`): after a recovered retry they become one `console.warn` naming the attempt that worked, after a final failure they are logged as errors. `SCENE_KEYS.settings` (B7-04) belongs to the settings screen `SettingsScene` (B7-11, ui-engineer), registered in `MENU_SCENES`; the registration test's `RESERVED_KEYS` (keys added ahead of their scene) is empty again since B7-12. `tests/arch/boot-assets.test.ts` fails if a sheet in `assets/art/pixel/` or a `PIXEL_KEYS` entry is not loaded. `tests/arch/pixel-scale.test.ts` fails if `palette.json` `pixel.tileSize` or `pixel.body` stop matching `tuning.json` `tileSize` and the player size in tiles.
- **Pixels only in the renderer.** `tuning.tileSize` is 16 (render-only), and so are `runFramesPerTile` (3), `sprintFramesPerTile` (2) (run-cycle stride, ADR "Animation frames"; integers 1..12) and `cameraMaxApartTiles` (28, the Tandem framing limit; integer 1..256), added in B6-01; `deriveParams` ignores all four. Snap after interpolation, never write back (ADR "Sub-pixel positions").

Phaser calls `GameScene.update(time, delta)` once per display frame (60, 120, 144 Hz…). The scene runs the sim at exactly `stepHz` using an accumulator:

```ts
const STEP_MS = 1000 / params.stepHz;
const MAX_STEPS_PER_FRAME = 5;            // avoid the spiral of death after a tab stall

update(_time: number, delta: number): void {
  this.acc += Math.min(delta, STEP_MS * MAX_STEPS_PER_FRAME);
  while (this.acc >= STEP_MS) {
    const frame = this.input.sample();    // latched held state, see §5
    this.recorder.push(frame);
    this.prev = this.sim;
    this.sim = step(this.sim, frame, this.level, this.params);
    this.handleEvents(this.sim.events);   // audio, fx, HUD
    this.acc -= STEP_MS;
  }
  const alpha = this.acc / STEP_MS;       // 0..1
  this.view.draw(this.prev, this.sim, alpha); // interpolate positions for smooth motion
}
```

The accumulator and `delta` are render-side and non-deterministic, and that is fine: they only decide *when* a step runs, never *what* it computes. Everything the sim sees is in the recorded frames.

## 5. Input → frames → recording

- **Sampling.** `InputFrame` holds the *held* state of six **logical actions** for one step: `left`, `right`, `jump`, `shiftUp`, `shiftDown`, `restart` (edge semantics in `types.ts`). The sampler listens to keydown/keyup and **latches** any key that went down since the last step, so taps shorter than 16 ms are not lost.
- **Bindings** (ui-engineer, `src/ui/`) map physical keys to actions, all active at once (GDD §3): left = Left/A, right = Right/D, jump = Space/W/Up, shiftUp = Right Shift/E/X, shiftDown = Left Shift/Q/Z, restart = R. An action is held if **any** of its keys is held. The sim never sees keys, so remapping (Could) needs no sim change.
- **Left vs right Shift.** Phaser's `Key` objects cannot tell the two Shift keys apart (both keyCode 16). Use the native event: `this.input.keyboard!.on('keydown', (e: KeyboardEvent) => …)` and check `e.code === 'ShiftLeft' | 'ShiftRight'`.
- **iframe hygiene.** Call `keyboard.addCapture` for Space and the arrow keys so the itch.io page does not scroll; show a "click to focus" prompt when the canvas loses focus.
- **Windows Sticky Keys.** Five Shift presses open the OS dialog. Mitigated by the Q/E and Z/X bindings (Must, M1) and the one-time tip (Must, M2), both ui-engineer.
- **Recording.** Every played step's frame is appended to a recorder. On level completion the recording (every frame since level load, including deaths and restarts) is encoded as run-length text (`docs/tech/level-format.md` §4) and can be saved as a solution, kept as a local best, or submitted to the leaderboard.

## 6. Replays and solvability tests

- **Replay** = `createSim` + `step` over the decoded frames. No Phaser needed, so it runs in Vitest (Node), in the browser, and in a server function.
- **Solvability test** (`tests/levels/solvability.test.ts`, tech-lead, part of `npm test`). It loads levels exactly as the game bundles them (the §7 `import.meta.glob` raw map → `loadLevels`) plus a second glob for `levels/*.solution.txt`, derives params from the shipped `tuning.json`, and gets the real sim from the `src/core` barrel. One test case per level: the solution exists, parses (`parseSolution`), and `verifySolution` passes (`levelVersion` matches, `status === 'won'`, `wonAtStep <= steps`; `wonAtStep` counts the winning run only). Separate cases fail on an unparsable level, an orphaned solution (no level of that id) and a glob that disagrees with the files on disk. It passes with zero levels; a harness self-check proves each failure is reported.
- **Pairing is test policy, not lane API** (ruling 2026-11-02). Matching `<id>.txt` to `<id>.solution.txt` is done by file name inside the solvability test, per level, so each level reports its own failure. `LevelLaneApi` does not gain a pairing function. Both tests load through `tests/levels/shipped.ts`.
- **Timing robustness** (`tests/levels/robustness.test.ts`, M1-44, GDD §1 "Fair"). Every recording must still win with any single input transition moved 1–3 steps earlier or later (a neighbouring transition it would cross is pushed along, so a 1-step tap moves as a whole; the last run is held 1 s longer so ending a few steps short of the exit is not a loss). A recording that only wins at exact timing fails; the self-check proves it on an in-memory fixture. Trials replay from the cached state at their first changed frame.
- **Review-only level rules** (`tests/levels/levelRules.test.ts`, pure checks in `levelRules.ts`, Batch 6 wave 2). Over every shipped level (same glob, so new files are picked up): a Tandem level's bodies span at most 15 rows at spawn (`|start.row - twinStart.row| + playerHeightTiles`, batch 5 review G4; the camera never scrolls vertically to keep both, so `edgeArrowPlacement` needs no y case); Tandem spawn rows at least 3 apart and every colored tile strictly nearer its own lane's start row (lane = the upper body's rows down to its floor, the lower body's rows below it; `decisions.md` 2026-11-16); and no colored tile, exit or hint box (the widest cap pair, 48 x 24 px) under the HUD area, screen x 0-120, y 0-40, at the starting camera, framed with the scene's own `cameraFocus`/`cameraScroll`. A shipped level that breaks a rule goes in `KNOWN_FAILURES` with its request line and asserts the breach still exists; the rule is never weakened.
- **Solutions do not ship in the release build** (M1-33 ruling 2026-11-04). `?replay=1` is a QA and dev tool, not a player feature: the solution glob (`src/entities/solutionFiles.ts`) is bundled only when `QA_HOOK` is true (dev server, `VITE_QA_HOOK=1` e2e build), behind the same compile-time constant as the hook, so a plain build tree-shakes the `?raw` modules; there `?replay=1` is ignored (live play, no message). Reasons: no spoilers and no ready-made leaderboard inputs in the zip, a leaner bundle, and ghosts (Could) would come from leaderboard runs anyway. The recordings stay public in the repo, which is fine. `npm run package` and CI fail on a recording header (`level:` then `levelVersion:`) in a plain build. The scene change landed (BUG-4, `solutionFiles.ts`).
- **Golden determinism test.** Replaying the same solution twice must give deep-equal final states; a hash of the final state per level can be snapshotted to catch accidental rule changes.
- **Ghosts (Could).** A ghost is just a replay drawn with a translucent player.
- **Leaderboard validation.** Submissions carry the RLE input, not a time. The server can re-run `src/core` (pure TS, bundles for Deno edge functions) to verify `wonAtStep` (the run time) before accepting it.

## 7. Data loading

- `src/data/tuning.json` is imported statically by the sim lane, checked with `tuningErrors()` / `isTuning()` from `types.ts` (fail fast with those messages), then passed through `deriveParams`. `tests/arch/tuning-schema.test.ts` fails CI if the JSON and the `Tuning` type drift apart in either direction (keys or value kinds), both at typecheck and at test time.
- Levels are bundled as raw text so the zip needs no fetch:
  ```ts
  const files = import.meta.glob(['/levels/*.txt', '!/levels/*.solution.txt'],
    { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  ```
  The scene passes that map to `loadLevels` (level lane); parsing is pure, shared with the Node tests, and accepts LF and CRLF (`level-format.md` §1).
- Pixel sheets (`assets/art/pixel/`) are generated by `npm run art:build` and loaded once in `BootScene` (§4.1).
- `src/data/palette.json` is read by `src/fx` and the renderer only; its per-band entries sit under a `gears` object keyed by `BandColor` names. The sim never knows colours, just bands.

## 8. Networking stays optional (`src/net`)

- **Public API** (M2-18, backend-engineer; `src/net/index.ts`): `getNetClient()` (shared client built from `import.meta.env`) or `createNetClient({ config, fetch?, timeoutMs?, isOnline? })`; `fetchTopRuns(levelId, levelVersion, limit, offset?)` and `submitRun(runResult)` resolve `{ ok: true, data } | { ok: false, reason, status? }` and never throw. `submitRun` returns `unavailable` until the edge function (M3-11). Plain `fetch` (no supabase-js); `src/net` imports only types from core, with one exception: it may value-import the leaderboard contract's own values (`isDisplayName`, `DISPLAY_NAME_*`, i.e. the `export const`/`export function` names of `src/core/contracts/leaderboard.ts`) from `src/core/types`, by name in a braced import (ruling 2026-11-17, batch 6 review item 1: one source of truth for the name rule). `leaderboard.ts` imports nothing and the `types.ts` barrel reaches only `contracts/**`, so no sim, motion or level code is reachable from net; `render-imports.test.ts` checks all three. Audio and fx stay type-only.
- **Status (2026-11-05):** built and reviewed (M2-27a), **not wired**: nothing imports it yet. M3-13 wires it.
- `src/net` must be loaded with a **dynamic `import()`** only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both set, so offline builds don't ship the client code. `tests/arch/render-imports.test.ts` fails on any static (non-type) import of `src/net` from outside it.
- Every call has a short timeout and resolves to a result value (`{ ok: false, reason }`) rather than throwing into game code. Nothing on the play path `await`s the network: submit after the win screen is shown, fetch boards in the background, and render "offline" if they never arrive.
- **Name rule (M3-04, SEC-2):** `DISPLAY_NAME_PATTERN` (`^[A-Z0-9-]+( [A-Z0-9-]+)*$`), `DISPLAY_NAME_MIN_LENGTH` 1, `DISPLAY_NAME_MAX_LENGTH` 12 and `isDisplayName(name)` in `src/core/contracts/leaderboard.ts` (via `types.ts`). The client name entry uses `isDisplayName`; the SQL check and `submit-run/rules.ts` keep copies that `scripts/submit-run.test.ts` compares with it. Nobody trims or upper-cases on the player's behalf.
- Only the URL and the anon key reach the client. Row Level Security on the Supabase side; the service-role key lives only in backend secrets (the edge function reads the injected `SUPABASE_SERVICE_ROLE_KEY`; nobody pastes it anywhere).
- **Env guard** (`config/envGuard.ts`, a Vite plugin in `vite.config.ts`): every `vite build`, dev and preview start fails if the client env has a `VITE_` variable other than `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_QA_HOOK`, a key that is not `sb_publishable_…` or a JWT with role `anon`, a secret key or non-anon JWT in any value, only one of the two Supabase values, a non-https URL (loopback http allowed for a local Supabase), or a widened `envPrefix`. Messages never echo values. `npm run package` builds through the same config and adds its release-only checks (no QA hook, output scan) and writes `LICENSES.txt` at the zip root (the game's `LICENSE` plus the full MIT text of Phaser and eventemitter3, which Vite strips from the bundle; `scripts/lib/licenses.mjs`, B7-05), failing if a copyright line or the MIT text is missing.

## 9. Saves (`src/save`)

`localStorage` can throw inside a sandboxed iframe or private window. Wrap every access in `try/catch`, version the save blob, and fall back to in-memory state. The game must be fully playable with storage blocked.

**One store per page session, shared through the Phaser registry (M2-40).**
- `src/main.ts` calls `createSaveStore()` once at module load and installs it with `setSaveStore(game.registry, store)` in the game config's `callbacks.preBoot`, which Phaser runs before any scene boots. `createSaveStore()` never throws: with storage blocked it keeps the save in memory and `isPersistent()` is false.
- Scenes read it with `getSaveStore(this.registry)` (`src/scenes/keys.ts`, key `REGISTRY_KEYS.saveStore`). Never call `createSaveStore()` anywhere else: a second store would hold a second copy of the save and the two would overwrite each other.
- `getSaveStore` throws if nothing is installed (a wiring bug, not a storage problem); `BootScene` calls it so that shows up at boot.
- Consumers: Sticky Keys tip (`showStickyKeysTipIfDue({ scene, store, ... })`, M2-39), `store.recordLevelComplete(levelId, wonAtStep)` on a win (M2-06, from the `RunResult`, `level-format.md` §4), level select and settings (ui-engineer).
- **Audio settings reach the engine** in `BootScene.create` (`applyAudioSettings(store.getSettings())`, so a saved mute holds before the first gesture; wrapped in `runBootSideJob` from `bootLoad.ts`, so a throw is one `console.warn` and Boot still reaches its load check and the BUG-6 message), again in `GameScene.create` on every level start, and from the settings screen on each SOUND flip (`applySettingsAction`).
- **Save versioning rule (B7-13).** `SAVE_VERSION` stays 1 while changes are additive: a new field with a safe default, read field by field by `sanitizeSettings` / `sanitizeProgress`, so an older save simply reads the default (`muted`, `reducedMotionChosen`). Bump the version and add a `MIGRATIONS` step only when an existing field is renamed, removed, changes type or changes meaning for values already stored. Every new field gets a unit test that a v1 save without it loads with the default. `reducedMotionChosen` (B7-11): reduced motion is the saved `reducedMotion` once the player has flipped it on the settings screen, else the OS `prefers-reduced-motion` (`motionPrefs.reducedMotion`, `settingsModel.shownReducedMotion`). No shipped code ever wrote `reducedMotion: true` before B7-11, so the change from "saved OR OS" loses nothing.
- `src/scenes/keys.test.ts` checks the shared instance and the blocked-storage boot path (a `localStorage` whose every call throws).
- New game-wide services go the same way: a key in `REGISTRY_KEYS`, a typed getter in `keys.ts`, installed in `preBoot`.

## 10. Where each team plugs in

| Team | Entry point |
|---|---|
| gameplay-engineer | one lane per sitting: `src/core/sim`, `src/core/motion`, `src/core/level` (§3.5); scene lane: `GameScene` loop, `src/entities` |
| ui-engineer | menu scenes registered in `src/main.ts`, HUD reading `SimState.player.gear` (selected 1–4) and `.band` (colour), key bindings, Sticky Keys tip, `src/save` |
| art-director | `src/fx` consumes `SimState` + events (`airDrag` flash); `palette.json` per-band entries under `gears`, keyed by `BandColor` names. Imports only types from core |
| audio-designer | `src/audio` consumes `SimEvent`s (`airDrag` clunk, `fallThrough` from Batch 5, §3.2) and `band` each step; the scene calls it. Imports only types from core |
| backend-engineer | `src/net` (dynamic import), `backend/` |
| level-designer | `levels/*.txt` + `*.solution.txt` (format in `level-format.md`, LF or CRLF) |
| qa-tester | `tests/e2e/**`, runs `npm run check` + `npm run test:e2e` |

Adding a scene: create it in the owner's folder, add its key to `src/scenes/keys.ts`, register it in `src/main.ts` (ask tech-lead; a menu scene goes in `MENU_SCENES`, which `main.ts` spreads after `GameScene`).

## 11. Quality gates

- CI (`.github/workflows/ci.yml`): `npm ci` → `npm audit --audit-level=high` → typecheck → unit tests with coverage (thresholds enforced; `src/`, `tests/` and `scripts/` tests) → build (env guard runs) → no `__redshift` in `dist/` → `npm run package` (the release zip and its checks); then a Playwright smoke job. Every third-party action is pinned to a full commit SHA with the tag in a comment (security LOW 18); update with `git ls-remote https://github.com/actions/<name> refs/tags/<tag>`.
- **Secret check** (`tests/arch/repo-secrets.test.ts`, M1-04, part of `npm test`): every file git would commit (`git ls-files --cached --others --exclude-standard`, so the ignored local `.env` is never read) is checked for secret file names (`.env*` except `.env.example`, `*.pem`, `*.key`, `.npmrc`, SSH keys) and secret content (Supabase secret keys, non-`anon` JWTs, PEM private keys, GitHub and AWS tokens, a `SUPABASE_SERVICE_ROLE_KEY` value), and `.env.example` must stay empty. Messages never echo the value. Test fixtures build fake keys at run time. Full-history scanning is SEC-3 (gitleaks).
- `tests/levels`: solvability and ±3-step robustness of every level (§6); hint placement and hint-free replay (`hints.test.ts`, `level-format.md` §2); Tandem 15 rows, lane colouring and the HUD area (`levelRules.test.ts`, §6).
- Review checklist: `.claude/agents/tech-lead.md`.
- **QA hook.** `window.__redshift` (read-only `{ levelId, state, replay }`, used by every e2e spec) is installed only when `import.meta.env.DEV` or `VITE_QA_HOOK=1` at build time. Playwright's `webServer` sets `VITE_QA_HOOK=1` for its build (locally and in CI); a plain `npm run build` (the itch.io zip) has no hook and no `__redshift` string in `dist/`. Replay mode (`?replay=1`) and the bundled solutions follow the same gate (§6 ruling). `tests/arch/qa-hook.test.ts` requires every `'__redshift'` use in `src/` to sit on an `if (QA_HOOK)` line, and every file that names the hook or globs `*.solution.txt` to get the build-time flag. Target layout (B6-27): one `export const QA_HOOK = import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1';` in `src/entities/qaHook.ts`, imported unrenamed as a value (`import { QA_HOOK } from './qaHook'`) by `GameScene.ts`, `solutionFiles.ts` and any file split out of them; once that module exists, any other `QA_HOOK` declaration fails. Before the move, each file keeps the exact inline copy (B6-02 accepts both). `npm run package` re-scans the built files, so a flag that stopped folding across the module boundary would still be caught. Never set `VITE_QA_HOOK` in `.env` or a release build.
