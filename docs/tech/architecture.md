# Redshift — Technical Architecture

_Owner: tech-lead. Keep in sync with the code; update when setup changes. Matches GDD v1.1 (hold-to-move)._

## 1. Stack

| Piece | Version | Notes |
|---|---|---|
| Phaser | 3.90.0 (pinned; last 3.x) | Phaser 4 exists; we stay on 3 for docs/examples maturity. |
| TypeScript | 7.0.2, `strict` + `noUncheckedIndexedAccess` | `npm run typecheck` checks `tsconfig.json` (browser, `src/`) and `tsconfig.node.json` (configs, `tests/`). |
| Vite | 8.3.5, `base: './'` | Relative asset paths so `dist/` runs from a zip in the itch.io iframe. |
| Vitest | 5.0.5 + `@vitest/coverage-v8` | Node environment. Threshold: `src/core/**` ≥ 80% lines/branches/functions/statements. |
| Playwright | 1.64.1, Chromium only | Runs against `vite build` (with `VITE_QA_HOOK=1`, §11) + `vite preview` on port 4173. 960×540 viewport, 2 workers. |
| Node | ≥ 22.12 (`.nvmrc` = 22) | |

## 2. Module layout and owners

```
index.html, src/main.ts   Phaser.Game config (960x540, pixelArt, FIT scaling)   tech-lead
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
tests/levels/             solvability test: real sim replays every level's solution tech-lead
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
- **Gear vs band.** `Gear` (1–4) is the selected cruise gear; `Band` (0–4) is the colour of the actual speed `|vx|`. They differ while ramping, braking, standing and after drag. Coloured tiles and cameras test the **band**, never the gear.
- `SimState.events` lists what happened in the last step, in step order (`shift`, `shiftBuffered`, `bandChange`, `airDrag`, `jump`, `land`, `wallStop`, `ceiling`, `graceStart`, `won`, `died`, `restart`). Audio, FX and HUD react to events; they never mutate sim state. Respawn has no event: watch `status` change from `dead`/`restarting` to `playing`.
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
- **Pairing is test policy, not lane API** (ruling 2026-11-02). Matching `<id>.txt` to `<id>.solution.txt` is done by file name inside the solvability test, per level, so each level reports its own failure. `LevelLaneApi` does not gain a pairing function; the game never loads solutions.
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
- Only the URL and the anon key reach the client. Row Level Security on the Supabase side; the service-role key lives only in backend secrets.

## 9. Saves (`src/save`)

`localStorage` can throw inside a sandboxed iframe or private window. Wrap every access in `try/catch`, version the save blob, and fall back to in-memory state. The game must be fully playable with storage blocked.

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

- CI (`.github/workflows/ci.yml`): `npm ci` → typecheck → unit tests with coverage (thresholds enforced) → build; then a Playwright smoke job.
- Review checklist: `.claude/agents/tech-lead.md`.
- **QA hook.** `window.__redshift` (read-only `{ levelId, state, replay }`, used by every e2e spec) is installed only when `import.meta.env.DEV` or `VITE_QA_HOOK=1` at build time. Playwright's `webServer` sets `VITE_QA_HOOK=1` for its build (locally and in CI); a plain `npm run build` (the itch.io zip) has no hook and no `__redshift` string in `dist/`. Replay mode (`?replay=1`) is not gated. `tests/arch/qa-hook.test.ts` requires every `'__redshift'` use in `src/` to sit on an `if (QA_HOOK)` line. Never set `VITE_QA_HOOK` in `.env` or a release build.
