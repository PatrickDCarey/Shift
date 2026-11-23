# Batch 11 review: wave 1 (B11-04..B11-10) and B11-15

Tech-lead, 2026-11-23. Read from the uncommitted tree (`git diff` / `git status` against `13d8fa6`). Not reviewed here: the two sittings still open in wave 2, [sim] B11-13 (`src/core/sim/**`) and [scene] B11-14 (`src/entities/**`, `GameScene.ts`); they go in B11-22.

Checks run (single path only): `npx vitest run tests/levels` 231/231 green on all **15** levels (w2-05 included); `npx vitest run tests/arch` 671/671 after A1 was fixed (665/667 before); `npm run typecheck` clean.

## 1. Verdicts

| Task | Owner | Verdict |
|---|---|---|
| B11-04 tuning values | design-lead | **Approve** (`tuning.json` 0.5 / 300, matches `decisions.md` ruling 11). See A2 for how the schema half landed. |
| B11-05 kinetic path maths | [motion] | **Approve.** `src/core/motion/paths.ts` 92 lines, pure, integer clock, no float accumulation; exported through `motion/index.ts` only. The six names are now **required** (`LANE_PENDING.motion` emptied in `src/core/contracts/lanes.ts:211`). |
| B11-06 kinetic header parser | [level] | **Approve with one condition** (L1). The three format readings are accepted and written into `level-format.md` §2 "Rejected": every origin cell of a slab must be `.`; a second `sweep:` has its own message; `x0` checked on both sides (−64 ≤ x0 ≤ width). Shipped levels parse identically (all 15 replay to their recordings). |
| B11-07 scene extraction (`BodyViews`) | [scene] | **Approve.** `src/entities/BodyViews.ts` 111 lines, type-only core imports, unit test present. `GameScene.ts` is at 337 lines mid-B11-14; the ≤ 400 check moves to B11-22. |
| B11-08 kinetics sprites | art-director | **Approve** (boot wiring was missing, A1, now fixed). Sprites themselves approved: `fx/pixel/movers.ts` 183, `bolts.ts` 195, `kinetics.ts` 56; core imported as types only; patterns as well as colour on every band. |
| B11-09 shot and hit cues | audio-designer | **Approve**, one Low (U1). `sfxForEvent` stays exhaustive (`never` default, `src/audio/sfxEvents.ts:66`); `died` without `cause` still maps to `reset`, so shipped levels sound the same. `performance.now()` in `shotLimit.ts:10` is render-side and injected; fine outside `src/core`. |
| B11-10 five-row level select | ui-engineer | **Approve**, one Low (U2). |
| B11-15 `tests/levels` rules | tech-lead | Done (section 3). |

## 2. Findings, by severity

- **A1 High (fixed during the review): `src/scenes/BootScene.ts` did not load `PIXEL_KEYS.kinetics`.** Art added `kinetics: 'pixel-kinetics'` (`src/fx/pixel/atlas.ts:143`) and the sheet but nothing booted it, so `tests/arch/boot-assets.test.ts` failed twice. The two imports and the `ATLASES` row (`BootScene.ts:31-32, 51`) were added by another sitting while this review ran (this sitting's own edit was refused: not in its file list). Content approved; BootScene is tech-lead's file, so the orchestrator should name who made the edit (same as A2).
- **A2 Medium (ownership): `src/core/contracts/tuning.ts` was edited during wave 2 by a sitting other than tech-lead** (it was clean in the wave-2 start status). The content is right and is step 1b's type half: `projectileSizeTiles: 'positiveNumber'`, `emitterTellMs: 'ms'`, `SimParams.projectileSize?` optional. Accepted as-is so `tuning.json` and the schema stay in lockstep; the orchestrator should name who edited it. The name is `projectileSize`, not the `shotSize` written earlier in `architecture.md` (now corrected).
- **L1 Medium: `src/core/level/kinetics.ts` is at 399 lines. It must split before anything is added** (B12-01 sweep rules or any new key). Suggested cut, no behaviour change: `kineticRead.ts` (token, `readKv`, number/speed/dir/phase readers, ~130 lines), `kinetics.ts` keeps the three line parsers and `checkKineticGrid`. Filed in `docs/production/requests.md` for [level].
- **U1 Low: `src/audio/sfxSpec.ts:261` `baseLayers` still ends `default: return []`** (pre-existing). A new `SfxId` would play silence instead of failing the typecheck. Make it `const never: never = cue.id`, as `sfxEvents.ts` does.
- **U2 Low: `src/ui/levelSelectModel.ts:217` moves the status line from `y + 20` to `y + 16` for every row count**, so today's 3-row screen shifts 4 px. Harmless, but the e2e screenshot baseline (if any) will move; QA note for B11-19.
- **Client env:** no new `import.meta.env`, `VITE_` or network call in any wave-1 file. **Determinism:** no `Math.random`, `Date` or wall clock in `src/core` changes.

## 3. B11-15: `tests/levels` rules

New `tests/levels/kineticRules.ts` (216 lines, pure) and `kineticRules.test.ts` (each rule on all shipped levels, `KNOWN_FAILURES` and `REST_EXEMPT` maps, a planted fixture per rule that must fail with an exact message):

| Rule | Check |
|---|---|
| values | slab speed ∈ {1, 2}, width 2–8; shot speed ∈ {2, 4}, period ≥ 12 |
| slabRoom | swept area holds only empty cells; ≥ 2 empty in-grid rows above it |
| slabRest | ≥ 30 steps of wait at every end of a horizontal leg (exempt per README line) |
| lanes | lane cells empty; the end cell is a wall |
| keepOut | swept areas and lanes clear of spawn boxes, exits, hint boxes, and the HUD at any camera position |
| recording | ≤ 5,400 steps (all levels) |

w2-05 passes all six. Sweep rules wait for B12-01. `hintPlacement.ts` exports `reachesOnAxis` (no behaviour change).

## 4. Fix list per owner

- orchestrator: name the sittings that edited `BootScene.ts` (A1) and `contracts/tuning.ts` (A2); both edits are approved.
- [level]: L1 split before B12-01.
- audio-designer: U1 (next audio sitting).
- qa-tester: U2 note in B11-19.

## 5. Step 1b plan: the one commit for the bolts sitting (B11-17)

The schema half is already in the tree (A2), so what is left is one atomic change in the B11-17 commit:

1. `src/core/contracts/tuning.ts` (tech-lead pre-approves this exact edit by [sim] in that commit): `readonly projectileSize?: number;` becomes `readonly projectileSize: number;` and its comment loses "Optional only until…".
2. `src/core/sim/params.ts` `deriveParams`, after `playerHeight`: `projectileSize: tuning.projectileSizeTiles,`
3. `src/data/tuning.json`: unchanged (`"projectileSizeTiles": 0.5`, `"emitterTellMs": 300`).
4. `emitterTellMs` stays out of `SimParams`; [scene] converts it with `round(300 × 60 / 1000)` = 18 steps and drops `TELL_MS_FALLBACK` in `KineticsView.ts` in its next sitting.

Accept: `npx vitest run src/core/sim` and `src/core/types.test.ts` green, every golden hash unchanged (a new `SimParams` field is not hashed state), `npm run typecheck` clean.
