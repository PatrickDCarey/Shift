# Redshift — Technical Architecture

_Owner: tech-lead. Keep in sync with the code; update when setup changes._

## 1. Stack

| Piece | Version | Notes |
|---|---|---|
| Phaser | 3.90.0 (pinned; last 3.x) | Phaser 4 exists; we stay on 3 for docs/examples maturity. |
| TypeScript | 7.0.2, `strict` + `noUncheckedIndexedAccess` | `npm run typecheck` checks `tsconfig.json` (browser, `src/`) and `tsconfig.node.json` (configs, `tests/`). |
| Vite | 8.3.5, `base: './'` | Relative asset paths so `dist/` runs from a zip in the itch.io iframe. |
| Vitest | 5.0.5 + `@vitest/coverage-v8` | Node environment. Threshold: `src/core/**` ≥ 80% lines/branches/functions/statements. |
| Playwright | 1.64.1, Chromium only | Runs against `vite build` + `vite preview` on port 4173. |
| Node | ≥ 22.12 (`.nvmrc` = 22) | |

## 2. Module layout and owners

```
index.html, src/main.ts   Phaser.Game config (960x540, pixelArt, FIT scaling)   tech-lead
src/core/                 PURE deterministic simulation (no Phaser)             gameplay-engineer
src/core/types.ts         shared types and format constants                     tech-lead
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
tests/arch/               architecture guards (core purity)                     tech-lead
tests/e2e/                Playwright                                            qa-tester
src/**/*.test.ts          unit tests, co-located with the code they test        owner of that code
```

Dependency direction (an arrow means "may import"):

```
scenes, entities, ui, fx, audio ──► core ──► data/*.json
            │                        ▲
            └──► net, save ──────────┘ (types only)
core ──► nothing outside core except src/data/*.json
```

`tests/arch/core-purity.test.ts` enforces the `core` rules in CI: no package imports (Phaser included), no imports from outside `src/core` except `src/data/*.json`, no `Math.random`, `Date`, `performance`, timers or DOM globals.

## 3. Simulation / render split

**The simulation (`src/core`) is a pure function of (level, params, input frames).**

```ts
createSim(level: Level, params: SimParams): SimState
step(state: SimState, input: InputFrame, level: Level, params: SimParams): SimState   // StepFn in types.ts
deriveParams(tuning: Tuning): SimParams
```

- `SimState` is immutable; `step` returns a new object. It contains everything needed to continue (including `prevInput` for edge detection). If randomness is ever needed, a seeded PRNG state lives inside `SimState`.
- Units: tiles and steps (see the header of `src/core/types.ts`). Pixels and milliseconds never enter the sim except through `Tuning`, converted once in `deriveParams`.
- `SimState.events` lists what happened in the last step (`shift`, `bandChange`, `jump`, `land`, `fallThrough`, `won`, `died`). Audio, FX and HUD react to events; they never mutate sim state.
- **Floating point.** Positions are JS numbers. Use only `+ - * /`, comparisons, `Math.abs/min/max/floor/ceil/round/sign/sqrt` (all exactly specified by IEEE 754 / ECMAScript). Do **not** use `Math.sin/cos/pow/exp/log` etc. in the sim: their results may differ between engines, which would break replays and server-side validation. Never iterate over object keys or `Set`s where order could affect the result.

**The renderer (Phaser scenes and entities)** reads `SimState` and draws it; it never decides game rules. Converting tiles to pixels (`× tileSize`) happens only here.

### Recommended step order (gameplay-engineer owns the details)

1. Derive press edges: `pressed = input.x && !state.prevInput.x`.
2. Shifts (ground only): adjust `targetGear`, clamp to 0..4.
3. Horizontal speed: on ground ramp toward `gearSpeeds[targetGear]` (one gear per `tilesPerGearChange` tiles travelled); in air apply drag (one gear per `airDragTilesPerGear` tiles flown).
4. Jump (press edge, coyote, buffer), then gravity.
5. Move and collide, X axis then Y axis, using the `band` at the **start** of the step to decide which coloured tiles are solid (decide and unit-test this rule explicitly).
6. Update `band` from the new actual speed; floor-colour grace (`mismatchSteps` vs `colorGraceSteps`).
7. Triggers: exit → `won`; below the grid → `died`; cameras (world 3).
8. Emit events; store `prevInput = input`; `step + 1`.

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

- **Sampling.** `InputFrame` holds the *held* state of five buttons for one step (edge semantics documented in `types.ts`). The sampler listens to keydown/keyup and **latches** any key that went down since the last step, so taps shorter than 16 ms are not lost.
- **Left vs right Shift.** Phaser's `Key` objects cannot tell the two Shift keys apart (both keyCode 16). Use the native event: `this.input.keyboard!.on('keydown', (e: KeyboardEvent) => …)` and check `e.code === 'ShiftLeft' | 'ShiftRight'`.
- **iframe hygiene.** Call `keyboard.addCapture` for Space and the arrow keys so the itch.io page does not scroll; show a "click to focus" prompt when the canvas loses focus.
- **Risk — Windows Sticky Keys.** Pressing Shift five times quickly opens the OS Sticky Keys dialog. Gear-heavy play will hit this. Alternate bindings (GDD *Should*) should ship with M1 or M2; flagged to design-lead/producer.
- **Bindings.** Key → button mapping lives in the input module (ui-engineer owns rebinding UI). The sim only sees `InputFrame`.
- **Recording.** Every played step's frame is appended to a recorder. On level completion the run is encoded as run-length text (`docs/tech/level-format.md` §4) and can be saved as a solution, kept as a local best, or submitted to the leaderboard.

## 6. Replays and solvability tests

- **Replay** = `createSim` + `step` over the decoded frames. No Phaser needed, so it runs in Vitest (Node), in the browser, and in a server function.
- **Solvability test (M2).** One Vitest file iterates `levels/*.txt`, loads `<id>.solution.txt`, checks `levelVersion` matches, replays it, and asserts `status === 'won'` with `wonAtStep <= steps`. A level without a solution, or with a failing one, fails CI. Implemented by gameplay-engineer in `src/core/replay.ts` + `src/core/replay.test.ts`; the test reads files with `node:fs`.
- **Golden determinism test.** Replaying the same solution twice must give deep-equal final states; a hash of the final state per level can be snapshotted to catch accidental rule changes.
- **Ghosts (Could).** A ghost is just a replay drawn with a translucent player.
- **Leaderboard validation.** Submissions carry the RLE input, not a time. The server can re-run `src/core` (pure TS, bundles for Deno edge functions) to verify `wonAtStep` before accepting it.

## 7. Data loading

- `src/data/tuning.json` is imported statically (`import tuning from '../data/tuning.json'`) and passed through `deriveParams`. Its shape is `Tuning` in `types.ts`; validate at load and fail fast with a clear message.
- Levels are bundled as raw text so the zip needs no fetch:
  ```ts
  const files = import.meta.glob(['/levels/*.txt', '!/levels/*.solution.txt'],
    { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  ```
  Parsing (`src/core/level.ts`) is pure and shared with the Node tests.
- `src/data/palette.json` is read by `src/fx` and the renderer only; the sim never knows colours, just gears.

## 8. Networking stays optional (`src/net`)

- `src/net` is loaded with a **dynamic `import()`** only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both set, so offline builds don't ship the client code.
- Every call has a short timeout and resolves to a result value (`{ ok: false, reason }`) rather than throwing into game code. Nothing on the play path `await`s the network: submit after the win screen is shown, fetch boards in the background, and render "offline" if they never arrive.
- Only the URL and the anon key reach the client. Row Level Security on the Supabase side; the service-role key lives only in backend secrets.

## 9. Saves (`src/save`)

`localStorage` can throw inside a sandboxed iframe or private window. Wrap every access in `try/catch`, version the save blob, and fall back to in-memory state. The game must be fully playable with storage blocked.

## 10. Where each team plugs in

| Team | Entry point |
|---|---|
| gameplay-engineer | `src/core/*` (`step`, `deriveParams`, level parser, replay), `GameScene` loop, `src/entities` |
| ui-engineer | menu scenes registered in `src/main.ts`, HUD reading `SimState.player.targetGear/band`, `src/save` |
| art-director | `src/fx` consumes `SimState` + events; `palette.json` keyed by `GearColor` names |
| audio-designer | `src/audio` consumes `SimEvent`s and `band` each step |
| backend-engineer | `src/net` (dynamic import), `backend/` |
| level-designer | `levels/*.txt` + `*.solution.txt` (format in `level-format.md`) |
| qa-tester | `tests/e2e/**`, runs `npm run check` + `npm run test:e2e` |

Adding a scene: create it in the owner's folder, add its key to `src/scenes/keys.ts`, register it in `src/main.ts` (ask tech-lead).

## 11. Quality gates

- CI (`.github/workflows/ci.yml`): `npm ci` → typecheck → unit tests with coverage (thresholds enforced) → build; then a Playwright smoke job.
- Review checklist: `.claude/agents/tech-lead.md`.
