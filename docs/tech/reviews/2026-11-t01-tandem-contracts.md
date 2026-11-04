# Review log: Tandem contracts (T-01), shared SaveStore (M2-40), hint headers and RunResult (M2-03)

_tech-lead, 2026-11-04, batch 1. Specs: `docs/design/features/tandem.md`, `docs/design/features/onboarding-hints.md`. Docs: `architecture.md` §3, §3.1.1, §3.4, §9; `level-format.md`; `adr-pixel-rendering.md`._

## Out-of-area edits (authorized by the orchestrator: sim and level lanes idle, mechanical only, no behaviour change)

**Source (to compile against the new contract):**
- `src/core/sim/{air,grace,input,jump,move,status}.ts`: `body: 0` on every body event the sim already emits (`shift`, `shiftBuffered`, `bandChange`, `airDrag`, `jump`, `land`, `wallStop`, `ceiling`, `graceStart`, `died`).
- `src/core/sim/create.ts`: `twin: null` in `createSim`. `src/core/sim/step.ts`: `twin: state.twin` in the playing-step result.
- `src/core/level/parseLevel.ts`: `twinStart: null` on the returned `Level` (`&` stays a parse error until T-04).
- `src/core/sim/testkit.ts`: `twinStart: null` on the test `Level`.

**Tests (fixtures and expected literals only; no assertion removed or weakened):**
- `src/core/level/replay.test.ts`: `twin: null` in the fake sim state, `twinStart: null` in the fake level.
- `src/core/sim/step.test.ts`: `twin: null` in the fresh-state expectation; `body: 0` added to 15 expected event literals.
- `src/core/sim/airDragAcceptance.test.ts`, `gatingAcceptance.test.ts`, `jumpAcceptance.test.ts`: `body: 0` in 2, 1 and 2 expected event literals.

Every other test passes unchanged (`src/core`, `tests/arch`, `tests/levels`, `src/scenes`: 724/724). With one body the sim's states and events are identical except for the added `body: 0` and `twin: null`.

## Staged: T-01 stage 2 (not landed)

`PlayerState.home` and moving `dirPriority` from `PlayerState` to `SimState` also change `src/ui/testkit.ts` (ui-engineer, active this batch; one line: `dirPriority: 0` becomes `home: false`). Not authorized, so held. The full stage-2 patch (contracts, sim, the two core tests, the ui fixture) is prepared and verified in a scratch copy: typecheck clean, 1028/1028 tests in `src/core`, `tests`, `src/ui`, `src/entities`, `src/scenes`, `src/audio`. In the sim it computes phase 3 once in `step` (`StepCtx.dirPriority`, `StepCtx.moveDir`) and `directionPhase` only writes `moveDir` and `facing` per body, which is exactly `architecture.md` §3.1.1.

## Decisions

- **`home` events only with a twin.** Without one the win step emits `won` alone, so `tandem.md` check 1 ("no twin, no change") holds literally.
- **Event order with a twin:** runner's per-body events, twin's, then phase 14's (`home` per body, runner first; then `won` or `died`).
- **`&` validation:** at most one; an `E` directly above `&` (the spawn box overlaps it, so the twin is home on step 1) or directly below (exits are not solid) is an error.
- **Hints live in `LevelMeta.hints`, optional, absent when none.** An empty array would have changed the parser's `meta` for every hint-free level and broken the existing exact-equality tests; "absent" keeps old parses identical. Hints are render-only: no `version` bump.
- **`RunResult = { wonAtStep, solution }`.** The recording is a `Solution`, so the same object saves as a solution file, feeds `recordLevelComplete(solution.levelId, wonAtStep)`, and is what the leaderboard server re-runs with `verifySolution`. No death or restart counters until a results spec asks for them.
- **SaveStore through `preBoot`.** `callbacks.preBoot` runs before the texture manager is ready and before any scene boots (`Phaser.Game#boot`), so no scene can miss the store. `getSaveStore` throws instead of creating a fallback store: a second store would overwrite the first one's writes.
- **Atlases are loaded, not baked at boot** (ADR "Tile size and sprites"): `buildPixelAssets()` measured 0.55 to 0.87 s in Node; the PNGs are about 30 KB.
