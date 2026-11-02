# Review: src/core lanes (motion, level, sim)

_Reviewer: tech-lead, 2026-11-02. Commits `b97708e` (motion + level) and `b190192` (sim). Checklist: `.claude/agents/tech-lead.md`._

## Verdicts

| Lane | Verdict | Blocking items |
|---|---|---|
| motion (`src/core/motion/**`) | **Approve** | none |
| level (`src/core/level/**`) | **Approve** | none. Follow-ups filed (one MEDIUM, before leaderboards in M3). |
| sim (`src/core/sim/**`) | **Changes needed** | S1: `wallStop` once per contact (from the event ruling below). Everything else approved. |

## What was checked

- **Determinism and purity.** No `Math.random`, `Date`, timers, DOM or `import.meta` in any lane. Only `+ − × ÷`, `abs/min/max/floor/ceil/round/sign` are used. Every iteration runs over arrays in a fixed order. `SIM_EPSILON` is used for every "reached" or overlap test. Contacts snap exactly (`collision.ts:34,39,52,58`; `move.ts:32`). Phases are pure `(Work, StepCtx) → Work` with no mutation. `sim/determinism.test.ts` replays a 6000-step scripted log with deaths and restarts twice: the results are deep-equal and no state object is shared between steps. `tests/arch/core-purity.test.ts` passes.
- **Lane imports and contracts.** Imports follow only sim → motion through `../motion`. The level lane gets the sim injected as `SimApi`. Every lane exports exactly its `LANE_EXPORTS`. **`REQUIRE_COMPLETE` is now on** in `tests/arch/lane-contracts.test.ts`, so a missing export fails too.
- **Step order.** `sim/step.ts:15-28` runs phases 2–13 in the order of architecture.md §3.1. Phase 0/1 is handled in `step.ts:46-50` and `status.ts`, and phase 14 in `status.ts:42`. The timer, grace and coyote windows match §3.2. The acceptance suites pin the numbers for all five M1 feature specs.
- **Tests and coverage** (`src/core`, v8): 100% lines, 100% functions, 99.5% statements, 93.4% branches. The lowest file is `level/text.ts` at 81% branches. 582 tests pass.
- **Size.** The largest function is about 25 lines and the largest non-test file is `parseLevel.ts` at 190 lines. Nesting stays at 3 levels or fewer.
- **Magic numbers.** No gameplay number is hard-coded. Every speed, time and size comes from `SimParams`. The remaining literals are geometry from the contract (spawn `col + 0.5`), unit conversion (`1000` ms/s), kinematics (`½`), and named parser limits.

## Findings (by severity)

### HIGH

- **S1 `src/core/sim/move.ts:17-18`: `wallStop` fires on every blocked step.** A player holding into a wall walks from standing every step: vx goes 0 → 3, the move is blocked, vx goes back to 0. That emits `wallStop {speed: 3}` 60 times a second, so audio and FX would thud continuously. Per the ruling below, emit it only when blocked **and** (`w.vxOld !== 0` **or** `res.x !== p.x`). Add a test: hold into a wall for 30 steps and expect exactly one `wallStop`, from the contact step. Also check that a flight into a wall still emits one. → request filed (sim).

### MEDIUM

- **L1 `src/core/level/replay.ts:59` (with `:15-20`): `verifySolution` keeps every intermediate state.** It calls `runInputLog`, which builds `states[]` with one `SimState` per frame. A submission at `MAX_REPLAY_STEPS` (1,000,000) allocates a million state objects, roughly hundreds of MB. That is a cheap denial of service on leaderboard validation (§6), and it wastes memory in the solvability test. `verifySolution` should fold over the runs and keep only the current state. It can also stop at the first `won` state, because `won` is terminal. `runInputLog` keeps its contract. → request filed (level).

### LOW

- **S2 `src/core/sim/step.ts:41,47`, `status.ts:17,24,31`: `prevInput: { ...input }` copies any extra properties the caller's frame carries.** If the sampler adds fields, live states stop deep-equalling replayed states (the codec normalises frames in `level/tokens.ts:34`; the sim does not). Copy only the six `INPUT_BUTTONS`. → request filed (sim).
- **L2 `src/core/level/loadLevels.ts:82-110`: `pairSolutions` is now dead code.** It was superseded by the pairing ruling below. Delete it and its tests (`loadLevels.test.ts:4` and the cases that use it). → request filed (level).
- **L3 `src/core/level/text.ts:35`: the BOM constant is a raw invisible U+FEFF inside quotes.** An editor or formatter can strip it silently. Write `'﻿'`. → same request (level).
- **L4 `src/core/level/parseLevel.ts:75` and `loadLevels.ts:13`: the world range 0–5 is written twice** (the `0, 5` arguments and the regex `[0-5]`). Use one `MAX_WORLD` in `limits.ts`. → same request (level).
- **L5 `src/core/level/tokens.ts:69`: `digits.length > 7` restates `MAX_REPLAY_STEPS`.** Derive it with `String(MAX_REPLAY_STEPS).length`. → same request (level).
- **L6 `src/core/level/codec.test.ts:100-112`: the round-trip test is flaky under load.** It takes about 0.5 s alone, but it timed out at 5 s once during a full `npm run check` with coverage while other agents were running (it passed on the rerun). The cause is thousands of `expect` calls inside the 300-iteration loop. Collect the mismatches and assert once, or cut the iterations. → request filed (level).
- **M1 `src/core/motion/testkit.ts:24-53`: `paramsForTests` duplicates `deriveParams` (`sim/params.ts:25`).** Accepted: `sim/params.test.ts` asserts the two agree, so they cannot drift silently. No request.

### Notes (no action)

- `sim/gating.ts:47-48` already gives speed cameras (a RESERVED tile) the rule from their `Tile` doc comment. That is fine. World 3 gets a design-lead spec before anything more is built on it.
- `sim/testkit.ts` and `motion/testkit.ts` are test-only helpers inside the lanes, not exported from `index.ts`, so they are never bundled. They count toward coverage, and that is acceptable.
- Producer's open `dragDrop` request (M1-39): the contract already has it as the `airDrag` event (`from`, `to`), emitted in phase 9 (`sim/air.ts:17`). No new event is needed.
- Art-director's palette wording request: architecture.md §7 and §10 already say `BandColor` names under `gears`.

## Rulings on open tech requests (recorded in architecture.md)

1. **Solution pairing** (level lane request): pairing level ↔ solution is **repo policy, not lane API**. The new `tests/levels/solvability.test.ts` pairs files by name, per level, using public `parseSolution` + `verifySolution`, so each level reports its own failure. `LevelLaneApi` is unchanged and `pairSolutions` should be removed (L2). Architecture.md §3.5 and §6 are updated.
2. **`wallStop`**: fires **once per contact** (S1). The contract doc comment in `src/core/contracts/state.ts` and architecture.md §3.1 phase 7 and §3.2 are updated.
3. **`shiftBuffered.net`**: **kept as the running buffer total** after the press. It is unclamped and may be 0. The clamped outcome is the `shift` event on landing, and buffer expiry has no event. No code change. The contract doc comment and §3.2 are updated.
4. **Gravity after a walk-off**: **accepted as implemented**. Phase 6 sees `player.grounded` before phase 8 detects the walk-off, so the fall starts the next step. There is no look-ahead. §3.1 phase 6 and §3.2 are updated. The sim's numbers are normative, and design-lead already has the request to update the spec tables.
5. **Step counter**: **accepted as implemented**. `SimState.step` counts the current run's playing steps only. It is frozen on dead, restart and won steps and reset to 0 on the respawn step. It is the run time, not the frame count. §3.4 and the `SimState.step` doc comment are updated.
