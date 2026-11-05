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

**Rendering resolution:** decided in [`adr-pixel-rendering.md`](adr-pixel-rendering.md) (2026-11-03): 480 x 270 logical, `Scale.NONE` + integer `MAX_ZOOM`, 16 px tiles, bitmap font, atlases baked from `src/fx/pixel` + `palette.json` by `npm run art:build` and loaded at boot. The game still runs at 960 x 540 with 32 px tiles until the migration (PX-1 to PX-11) lands.

## 2. Module layout and owners

```
index.html, src/main.ts   Phaser.Game config (960x540, pixelArt, FIT), SaveStore  tech-lead
src/scenes/keys.ts, Boot  scene + registry keys, BootScene                     tech-lead
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
tests/arch/               architecture guards (purity, lanes, tuning, docs, case) tech-lead
tests/levels/             solvability + ±3-step robustness: real sim, every recording tech-lead
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
- `SimState.events` lists what happened in the last step, in step order (`shift`, `shiftBuffered`, `bandChange`, `airDrag`, `jump`, `land`, `wallStop`, `ceiling`, `graceStart`, `home`, `won`, `died`, `restart`). Every event about one body carries `body: 0 | 1` (`BodyId`; 0 = runner, 1 = twin; `BodyEvent` in `types.ts`); `won` and `restart` are run-level. Audio, FX and HUD react to events; they never mutate sim state. Respawn has no event: watch `status` change from `dead`/`restarting` to `playing`.
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
| 7 | **Move X** | `dx = (vxOld + vx) / 2 × dt`. Resolve walls with the **band at start of step** (no-embed applies; grace never applies to walls). Blocked → snap to the face, `vx = 0`; `wallStop` event only on contact (§3.2), not while pushing into a wall the box already touches. |
| 8 | **Move Y** | Resolve floors and ceilings with the band at start of step, no-embed, and grace (`graceBand` tiles solid from above only while `graceSteps > 0`). Ceiling → `vy = 0`, `ceiling` event. Landing → snap feet to the tile top, `vy = 0`. Then decide `grounded` (supported test, GDD §4.7). Grounded at start, airborne now, no jump this step → `coyoteSteps` = the param. |
| 9 | **Air drag** | If **in the air this step** (§3.2): `airDistance += |dx actually moved|`, then `motion.airDrag(vx, airDistance, params)`; `airDrag` event if it dropped. At most one drop per step. |
| 10 | **Band** | `band = motion.bandForSpeed(|vx|, edges)`; `bandChange` event if changed. If in the air this step: `gear = max(minGear, min(gear, band))`. |
| 11 | **Landing** | If airborne at start and grounded now: `airDistance = 0`, apply `shiftBufferNet` (clamped, `shift` event), clear the shift buffer, `coyoteSteps = 0`, `land` event. |
| 12 | **Grace** | Grounded at start and now, band changed, previous band ≥ 1: `graceBand` = previous band, `graceSteps = colorGraceSteps`, `graceStart` event. Otherwise, if `graceSteps > 0`, count down (clear `graceBand` at 0). Leaving the ground clears grace. |
| 13 | **Timers** | Decrement `coyoteSteps`, `jumpBufferSteps`, `shiftBufferSteps` if > 0 (a shift buffer reaching 0 clears `shiftBufferNet`). |
| 14 | **Exit, then death** | Box overlaps an exit tile → `won`, `wonAtStep = step + 1`, `won` event. Else box top below the grid bottom → `dead`, `respawnInSteps = deathFreezeSteps`, `died` event. Exit wins on the same step. |
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
- **`SimState.step` counts playing steps of the current run only** (ruling 2026-11-02). Frozen death steps, the restart step and `won` steps leave it unchanged; the respawn step resets it to 0. So `step` (and `wonAtStep`) is the run time; the number of recorded frames is the solution's `steps`, which also counts deaths, freezes and restarts.

### 3.5 Lanes inside `src/core` (M1-41)

`src/core` is split into three lanes so up to three gameplay-engineer sittings can work at once. Each lane has a public `index.ts`; **its exports and their signatures are fixed by `src/core/contracts/lanes.ts`** (`MotionApi`, `SimLaneApi`, `LevelLaneApi`, listed at runtime in `LANE_EXPORTS`). Build against the contract, not against another lane's internals.

| Lane | Folder | Contents | Publishes | May import |
|---|---|---|---|---|
| motion | `src/core/motion/` | pure speed maths: ground accel/brake/skid, bands, segment rates, air drag | `bandForSpeed`, `segmentRates`, `groundSpeed`, `airDrag` | `../types` |
| sim | `src/core/sim/` | state, step order (§3.1), jump, collision, colour gating and grace, death/restart, tuning loader | `createSim`, `step`, `deriveParams` | `../types`, `../motion` (index only), `src/data/*.json` |
| level | `src/core/level/` | level/solution parsers (LF + CRLF), input-log codec, `runInputLog`, `verifySolution`, `loadLevels` | 8 functions in `LevelLaneApi` | `../types` only |
| tech-lead | `src/core/types.ts`, `src/core/contracts/**`, `src/core/index.ts` | shared types, contracts, barrel | everything above + types | contracts only |

- **The level lane never imports the sim.** `runInputLog` and `verifySolution` take a `SimApi` (`{ createSim, step }`) argument, so the level lane is built and tested now with a stub sim. The real solution replay test (`tests/levels/solvability.test.ts`, tech-lead) imports the barrel `src/core`; tests are exempt from the lane-import rule.
- **Order of work:** motion and level can start immediately; sim needs `motion` for phases 4, 9, 10 but can stub them until motion lands (motion is small and has the acceptance numbers in `movement-and-gears.md` and `air-drag.md`).
- **Changing a contract:** ask tech-lead (requests.md). The signature changes in `contracts/lanes.ts` first; both lanes then follow.
- **Enforced in CI** by `tests/arch/core-purity.test.ts` (purity; lane import edges; cross-lane imports only via `index.ts`; no stray files in the `src/core` root; code outside `src/core` imports only the barrel or `types`) and `tests/arch/lane-contracts.test.ts` (no unlisted lane exports; every export matches its contract type). `REQUIRE_COMPLETE` is on since 2026-11-02 (all lanes implemented), so a missing export fails too.

## 4. Fixed-step loop (how Phaser drives the sim)

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
- **Solutions do not ship in the release build** (M1-33 ruling 2026-11-04). `?replay=1` is a QA and dev tool, not a player feature: the solution glob (`src/entities/solutionFiles.ts`) is bundled only when `QA_HOOK` is true (dev server, `VITE_QA_HOOK=1` e2e build), behind the same compile-time constant as the hook, so a plain build tree-shakes the `?raw` modules; there `?replay=1` is ignored (live play, no message). Reasons: no spoilers and no ready-made leaderboard inputs in the zip, a leaner bundle, and ghosts (Could) would come from leaderboard runs anyway. The recordings stay public in the repo, which is fine. `npm run package` and CI fail on a recording header (`level:` then `levelVersion:`) in a plain build. Until the scene change lands, the plain build still contains them (request 2026-11-04).
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
- `src/data/palette.json` is read by `src/fx` and the renderer only; its per-band entries sit under a `gears` object keyed by `BandColor` names. The sim never knows colours, just bands.

## 8. Networking stays optional (`src/net`)

- `src/net` is loaded with a **dynamic `import()`** only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both set, so offline builds don't ship the client code.
- Every call has a short timeout and resolves to a result value (`{ ok: false, reason }`) rather than throwing into game code. Nothing on the play path `await`s the network: submit after the win screen is shown, fetch boards in the background, and render "offline" if they never arrive.
- Only the URL and the anon key reach the client. Row Level Security on the Supabase side; the service-role key lives only in backend secrets (the edge function reads the injected `SUPABASE_SERVICE_ROLE_KEY`; nobody pastes it anywhere).
- **Env guard** (`config/envGuard.ts`, a Vite plugin in `vite.config.ts`): every `vite build`, dev and preview start fails if the client env has a `VITE_` variable other than `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_QA_HOOK`, a key that is not `sb_publishable_…` or a JWT with role `anon`, a secret key or non-anon JWT in any value, only one of the two Supabase values, a non-https URL (loopback http allowed for a local Supabase), or a widened `envPrefix`. Messages never echo values. `npm run package` builds through the same config and adds its release-only checks (no QA hook, output scan).

## 9. Saves (`src/save`)

`localStorage` can throw inside a sandboxed iframe or private window. Wrap every access in `try/catch`, version the save blob, and fall back to in-memory state. The game must be fully playable with storage blocked.

**One store per page session, shared through the Phaser registry (M2-40).**
- `src/main.ts` calls `createSaveStore()` once at module load and installs it with `setSaveStore(game.registry, store)` in the game config's `callbacks.preBoot`, which Phaser runs before any scene boots. `createSaveStore()` never throws: with storage blocked it keeps the save in memory and `isPersistent()` is false.
- Scenes read it with `getSaveStore(this.registry)` (`src/scenes/keys.ts`, key `REGISTRY_KEYS.saveStore`). Never call `createSaveStore()` anywhere else: a second store would hold a second copy of the save and the two would overwrite each other.
- `getSaveStore` throws if nothing is installed (a wiring bug, not a storage problem); `BootScene` calls it so that shows up at boot.
- Consumers: Sticky Keys tip (`showStickyKeysTipIfDue({ scene, store, ... })`, M2-39), `store.recordLevelComplete(levelId, wonAtStep)` on a win (M2-06, from the `RunResult`, `level-format.md` §4), level select and settings (ui-engineer).
- `src/scenes/keys.test.ts` checks the shared instance and the blocked-storage boot path (a `localStorage` whose every call throws).
- New game-wide services go the same way: a key in `REGISTRY_KEYS`, a typed getter in `keys.ts`, installed in `preBoot`.

## 10. Where each team plugs in

| Team | Entry point |
|---|---|
| gameplay-engineer | one lane per sitting: `src/core/sim`, `src/core/motion`, `src/core/level` (§3.5); scene lane: `GameScene` loop, `src/entities` |
| ui-engineer | menu scenes registered in `src/main.ts`, HUD reading `SimState.player.gear` (selected 1–4) and `.band` (colour), key bindings, Sticky Keys tip, `src/save` |
| art-director | `src/fx` consumes `SimState` + events (`airDrag` flash); `palette.json` per-band entries under `gears`, keyed by `BandColor` names |
| audio-designer | `src/audio` consumes `SimEvent`s (`airDrag` clunk) and `band` each step |
| backend-engineer | `src/net` (dynamic import), `backend/` |
| level-designer | `levels/*.txt` + `*.solution.txt` (format in `level-format.md`, LF or CRLF) |
| qa-tester | `tests/e2e/**`, runs `npm run check` + `npm run test:e2e` |

Adding a scene: create it in the owner's folder, add its key to `src/scenes/keys.ts`, register it in `src/main.ts` (ask tech-lead).

## 11. Quality gates

- CI (`.github/workflows/ci.yml`): `npm ci` → typecheck → unit tests with coverage (thresholds enforced; `src/`, `tests/` and `scripts/` tests) → build (env guard runs) → no `__redshift` in `dist/`; then a Playwright smoke job.
- `tests/levels`: solvability and ±3-step robustness of every level (§6).
- Review checklist: `.claude/agents/tech-lead.md`.
- **QA hook.** `window.__redshift` (read-only `{ levelId, state, replay }`, used by every e2e spec) is installed only when `import.meta.env.DEV` or `VITE_QA_HOOK=1` at build time. Playwright's `webServer` sets `VITE_QA_HOOK=1` for its build (locally and in CI); a plain `npm run build` (the itch.io zip) has no hook and no `__redshift` string in `dist/`. Replay mode (`?replay=1`) and the bundled solutions follow the same gate (§6 ruling; scene change pending). `tests/arch/qa-hook.test.ts` requires every `'__redshift'` use in `src/` to sit on an `if (QA_HOOK)` line. Never set `VITE_QA_HOOK` in `.env` or a release build.
