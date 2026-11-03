# Redshift: M1 test plan (grey-box)

_Owner: qa-tester. Task M1-26. Written 2026-11-02 against GDD v1.2 and the five M1 feature specs in `docs/design/features/`. Results for the last run are in section 7._

## 1. Layers and how to run them

| Layer | Where | Run | Proves |
|---|---|---|---|
| **Unit: spec acceptance** | `src/core/sim/{movement,jump,airDrag,gating,reset}Acceptance.test.ts` (one file per spec, one `describe` per numbered check) and `src/core/motion/acceptance.test.ts` (the same checks on the pure speed maths) | `npm test` or `npx vitest run src/core/sim` | The exact step numbers and distances printed in the specs, through the real `step`. |
| **Unit: module** | `src/core/{sim,motion,level}/*.test.ts`, `src/core/types.test.ts`, `src/entities/*.test.ts`, `src/ui/*.test.ts`, `src/save/save.test.ts` | `npm test` | Contracts, parsers, codecs, input sampler, bindings, storage, Sticky Keys logic. |
| **Arch** | `tests/arch/*.test.ts` | `npm test` | Core purity (no Phaser, `Math.random`, `Date`), lane imports, tuning schema, path case, level-format doc. |
| **Solvability** | `tests/levels/solvability.test.ts` | `npx vitest run tests/levels` | Every `levels/<id>.txt` has a recording and the real sim wins with it. |
| **Coverage** | vitest v8, threshold 80% on `src/core/**` | `npm run test:coverage` (part of `npm run check`) | CLAUDE.md quality bar. |
| **Type check / build** | `tsc` twice, `vite build` | `npm run typecheck`, `npm run build` | Browser code and tests/configs compile; the shipped bundle builds. |
| **E2E** | `tests/e2e/*.spec.ts` (Playwright, Chromium, 960x540 viewport) | `npm run test:e2e` (builds, serves `dist/` on 4173) | The real browser build: boot, canvas size, key bindings in a browser, focus, replay of every shipped solution, iframe embed. |
| **Manual / playtest** | this plan section 5; `docs/playtests/` | by hand | Feel, 60 fps, anything visual. |

**E2E conventions.** Never sleep on wall-clock time. Every wait polls `window.__redshift` (`tests/e2e/helpers.ts`: `waitForHook`, `pollState`, 20 s poll timeout, 90 s per test) because a loaded machine or headless Chromium can run the game at a few frames per second. A shared auto-fixture fails any test that logs a console error or a page error. Replay tests use `?level=<id>&replay=1&speed=60`.

## 2. M1 acceptance criteria in the five feature specs: where each is verified

Notation: **S** = `src/core/sim/<spec>Acceptance.test.ts`, **M** = `src/core/motion/acceptance.test.ts`, **E** = e2e. Every check appears once, with its primary verification first and extra coverage after it. Specs are exact since GDD v1.2, so unit checks assert the printed numbers, not tolerances.

### 2.1 movement-and-gears.md (17 checks)

| # | Criterion | Verified by |
|---|---|---|
| 1 | Runway from standing (vx 3 on step 1, bands on steps 10/23/32, 12 from step 36, never band 4 under 3.0 tiles) | S movement check 1-2; M check 1-2 |
| 2 | No overshoot of `gearSpeeds[gear]` | S movement check 2; M |
| 3 | Walking is instant (start, stop, turn) | S check 3; M check 3 |
| 4 | One gear up from gear 3 (band 4 on step 4, 12 on step 8) | S check 4; M |
| 5 | Let go from sprint (bands on 4/12/26, stop on 35, gear stays 4) | S check 5-6; M |
| 6 | Let go from jog (stop on step 18) | S check 5-6; M |
| 7 | Downshift while holding (3.24 / 3.72, gear 1) | S check 7; M |
| 8 | Gear persists through release (gear 3, vx 9 on step 28, 2.57 tiles) | S check 8; M |
| 9 | Reversal from sprint (turn on step 35, -12 from 70, net -0.25) | S check 9; M |
| 10 | Both directions (priority, same-step tie gives 0) | S check 10 |
| 11 | Clamping (gear 1..4) | S check 11-12; e2e `gear clamps at 1 and 4` |
| 12 | Shift while standing changes gear only | S check 11-12 |
| 13 | Mirror | S check 13; M |
| 14 | Wall stop keeps gear, snaps to the face, no overlap | S check 14 |
| 15 | Band function (unit) | `src/core/motion/bands.test.ts`; S check 15-16 |
| 16 | Derived rates 10.8 / 18.0 / 25.2 | `src/core/motion/rates.test.ts`; S check 15-16 |
| 17 | Alternate bindings: E, X = `+`; Q, Z = `-`, same as the Shift keys | **E `keyboard.spec.ts`** (each of ShiftRight, KeyE, KeyX up; ShiftLeft, KeyQ, KeyZ down, via `window.__redshift`); unit `src/ui/bindings.test.ts`, `src/entities/inputSampler.test.ts`, `src/entities/keyboardInput.test.ts` |

### 2.2 jump.md (12 checks)

| # | Criterion | Verified by |
|---|---|---|
| 1 | Arc from standing (3.00 on flight step 24, lands on 48) | S jump check 1 |
| 2 | Same height at every gear | S check 2 |
| 3 | No variable height (J held 1 vs 40 steps identical) | S check 3 |
| 4 | Derived gravity 37.5, launch speed 15 | `src/core/sim/params.test.ts` |
| 5 | Walking takeoff lands 2.375 out | S check 5 |
| 6 | Coyote yes (5th airborne step) | S check 6-7 |
| 7 | Coyote no (8th airborne step) | S check 6-7 |
| 8 | Buffer yes (J on flight step 44) | S check 8-9 |
| 9 | Buffer no (J on flight step 38) | S check 8-9 |
| 10 | Ceiling under a safe tile | S check 10 |
| 11 | 2-tile ledge reachable | S check 11 |
| 12 | Fall cap 20 | S check 12 |

(Browser smoke: e2e `Space, W and ArrowUp each jump` shows all three jump keys leave the ground and land back on the floor; the numbers stay in unit tests.)

### 2.3 air-drag.md (15 checks)

| # | Criterion | Verified by |
|---|---|---|
| 1 | Sprint jump: drop on flight step 30, lands step 48 at 8.70 | S airDrag check 1; M check 1-3; `src/core/motion/drag.test.ts` |
| 2 | Jog jump: no drop | S check 2-3; M |
| 3 | Run jump: drop on step 40 | S check 2-3; M |
| 4 | Walk-off keeps red (29 steps, 5.80) | S check 4 |
| 5 | Two drops (steps 30 and 70) | S check 5; M check 5 |
| 6 | Drag floor (gear 1 keeps 3) | S check 6; M |
| 7 | Standing jump | S check 7; M |
| 8 | No steering in the air | S check 8 |
| 9 | Let go mid-air, then land | S check 9; M |
| 10 | Counter resets on landing | S check 10; M |
| 11 | Gear follows band at takeoff | S check 11; M |
| 12 | Downshift kept | S check 12; M |
| 13 | No mid-air shift | S check 13-14 |
| 14 | Shift buffer (L-4 applies, L-10 does not) | S check 13-14 |
| 15 | Wall in the air | S check 15 |

### 2.4 color-gating.md (16 checks)

| # | Criterion | Verified by |
|---|---|---|
| 1-3 | Match holds; mismatch is a hole; no grace on landing | S gating check 1, 2, 3 |
| 4-7 | Grace window (shift, let go); walking stop and turn on blue | S check 4-5, 6-7 |
| 8 | Grace plus coyote | S check 8 |
| 9 | Jump in grace onto yellow | S check 9 |
| 10 | Grace ends on takeoff | S check 10 |
| 11-12 | Walls get no grace; matching wall stops | S check 11, 12 |
| 13 | No-embed (per color) | S check 13 |
| 14 | Ceilings | S check 14 |
| 15 | Straddle | S check 15 |
| 16 | Determinism of checks 4-10 | S check 16; `src/core/sim/determinism.test.ts` |

### 2.5 safe-tiles-and-reset.md (14 checks)

| # | Criterion | Verified by |
|---|---|---|
| 1-2 | Safe at every color; safe walls at every gear | S reset check 1-2 |
| 3 | Color changes on safe floor | S check 3 |
| 4 | Spawn state | S check 4 |
| 5-6 | Fall-out death; respawn timing and state (24 frozen steps) | S check 5-6 |
| 7-9 | Gear resets; freeze ignores input; held through respawn | S check 7-9 |
| 10-11 | Restart anywhere; restart skips freeze | S check 10-11 |
| 12 | Exit wins, wins over death, time = step count | S check 12 |
| 13 | Bounds (right edge wall, top edge ceiling) | S check 13 |
| 14 | Determinism and restart equals fresh load | S check 14; `determinism.test.ts` |

## 3. M1 board tasks: how each acceptance line will be verified (M1-35 to M1-37)

| Task | Acceptance (short) | Verification |
|---|---|---|
| M1-01 | Specs have Rule/Edge/Tuning/Acceptance/Priority; tuning keys present | Read the five specs; `tests/arch/tuning-schema.test.ts` |
| M1-02 | Scaffold runs; base `./`; CI; `.env.example` | `npm run check`; inspect `vite.config.ts`, `.github/workflows/ci.yml`, `.env.example` (two keys only) |
| M1-39 | Tuning keys equal `Tuning` keys; `SimState` expresses the rules; README commands match `package.json` | `tuning-schema.test.ts`; `npm run check`; diff README commands against `package.json` |
| M1-41 | Lane folders, contracts, arch test fails on a Phaser import | `core-purity.test.ts`, `lane-contracts.test.ts`; plant and revert an import in each lane |
| M1-06 | Initial state, ms to steps, tuning errors, frozen-input test | `src/core/sim/step.test.ts`, `params.test.ts`, `testkit.test.ts` |
| M1-47 | Runway numbers through `step` | S movement checks 1-14 |
| M1-09 | Motion functions reproduce GDD 5.1 and 5.2 | M; `ground.test.ts`, `rates.test.ts`, `bands.test.ts` |
| M1-45 | Air drag pure function (6.0 and 12.0, floors, one drop per step) | `drag.test.ts`; M air-drag rows |
| M1-07 / M1-43 | Parser per glyph, CRLF identical, codec round trip, `runInputLog` equals stepping | `parseLevel.test.ts`, `loadLevels.test.ts`, `codec.test.ts`, `replay.test.ts`, `solutionFile.test.ts` |
| M1-08 | Jump and collision numbers | S jump checks; `collision.test.ts` |
| M1-10 | Color gating, grace boundaries | S gating checks |
| M1-11 | Air commitment, drag, `airDrag` event | S airDrag checks; `step.test.ts` |
| M1-12 | Death, restart, exit | S reset checks |
| M1-13 | Determinism, golden hash, mirrored runs, coverage >= 80% | `determinism.test.ts`; `npm run test:coverage` (numbers in section 7) |
| M1-14 | 960x540, fixed step independent of fps, all six gear keys, tap not lost, no scroll | e2e `keyboard.spec.ts`, `embed.spec.ts`; unit `runDriver.test.ts`, `inputSampler.test.ts`; fps independence is a unit test (mocked clock), also manual at throttled fps |
| M1-15 | Debug overlay values equal state; hook absent from production build | Overlay: `debugText.test.ts` plus manual F3. **Conflict:** the scene lane ships `window.__redshift` in every build (requests.md, 2026-11-02) and e2e depends on it; this acceptance line says absent. See BUG-1 |
| M1-16 / M1-40 | Storage never throws; every action bound; no key on two actions; Shift told apart by code; Sticky Keys logic | `src/save/save.test.ts`, `src/ui/bindings.test.ts`, `src/ui/stickyKeysTip.test.ts` |
| M1-17 | Game starts with no console errors; keys do not scroll | e2e (auto console-error fixture; default-prevented and scroll checks; iframe host scroll) |
| M1-18 | Zip loads from a subfolder, no secrets | Manual: `npm run package` (not yet present), unzip, serve, play; grep zip for `.env` |
| M1-19 | RLS denies anon writes | Review by security-reviewer; SQL read-through (not run against a DB in M1) |
| M1-20 / M1-21 | Room parses; solution wins; still wins with key inputs shifted +-3 | `tests/levels/solvability.test.ts` plus e2e replay (`replay.spec.ts`). The +-3 robustness check is **not automated**: see gap G3 |
| M1-22 / M1-23 | Palette contrast, patterns distinct, mapping tested | `src/fx/*.test.ts`; `docs/art/` numbers; patterns screenshot reviewed by eye |
| M1-24 | Audio nothing throws before a gesture | Unit tests with a mocked context |
| M1-25 / M1-29 | Design approvals and D-1..D-3 verdicts | Read `docs/design/decisions.md` (no QA execution) |
| M1-37 | Room plays end to end with every alternate binding; suite, typecheck, build pass; replay equals playthrough | E2E replay (`wonAtStep` equals the `steps` header); manual playthrough by hand using Q/E/Z/X; full `npm run check` plus `npm run test:e2e` |

## 4. Alternate bindings and Sticky Keys (explicit list)

| Check | How |
|---|---|
| Right Shift, E, X each raise the gear by one | e2e `keyboard.spec.ts` (3 tests) |
| Left Shift, Q, Z each lower the gear by one | e2e (3 tests) |
| A and D move like the arrows; Space, W, Up jump | e2e |
| Gear clamps; holding a Shift key does not repeat | e2e |
| Bound keys are `preventDefault`ed, page does not scroll, also inside an iframe | e2e `keyboard.spec.ts`, `embed.spec.ts` |
| Ctrl+E (browser shortcut) is not a gear shift | e2e `embed.spec.ts` |
| No key maps to two actions; Left and Right Shift told apart by `e.code` | unit `bindings.test.ts` |
| Sticky Keys tip logic: true on Windows UA when unseen, false after dismissal, false on mac/Linux/mobile, blocked storage safe | unit `stickyKeysTip.test.ts` |
| Sticky Keys tip **shown in the game**, once, non-blocking | **Not testable yet**: mounting is M2-39. E2E is M2-28 (emulate a Windows user agent). Manual: pressing Shift five times in Windows to see the OS dialog is the thing the tip prevents; cannot be automated |

## 5. Manual and playtest checks (cannot be automated in M1)

1. Feel of acceleration, brake and air drag (playtester M1-28, answers D-1, D-2, D-3).
2. 60 fps on a mid-range laptop at 960x540 (read the F3 overlay fps; automated headless fps is not meaningful).
3. Real-keyboard check: Left Shift vs Right Shift on a physical keyboard, Windows Sticky Keys dialog not triggered when using Q/E/Z/X.
4. Visual: tiles solid vs ghost, patterns per gear visible without color (screenshots in `docs/art/`).
5. Resize and focus: window resize, tab switch while holding a key, pausing mid-shift (partially covered by e2e blur test).
6. Storage blocked and network off: covered by unit tests for storage; browser-level check deferred until the SaveStore is wired (M2-40).

## 6. Gaps (known, with owner or milestone)

- **G1:** Only one level exists (`w0-02`), so replay e2e covers one recording. The test globs `levels/*.solution.txt`, so new levels are picked up automatically.
- **G2:** The e2e config sets `viewport` at top level, but the Chromium project preset (`devices['Desktop Chrome']`) overrides it with 1280x720. Specs work around it with `test.use`; the config should be fixed by tech-lead (BUG-2).
- **G3:** No automated "inputs shifted by +-3 steps still win" check (M1-21 acceptance, level-format fairness). Proposal: a Vitest in `tests/levels/` that shifts each input transition by +-3 steps and runs `verifySolution`. Needs tech-lead (owns `tests/levels/**`).
- **G4:** Sticky Keys tip view, HUD gear meter, pause, results, level select and title do not exist in the scene yet, so no e2e for them until M2 (M2-28).
- **G5:** Production-build hook policy is undecided (BUG-1); once decided, the e2e `replay` and `keyboard` specs may need to run against the dev server instead.
- **G6:** No fps or performance measurement in e2e.
- **G7:** No cross-browser run (Chromium only; Firefox and Safari left for M4 manual check on the itch embed).
- **G8:** Packaging (`npm run package`) does not exist yet, so M1-18 is unverifiable.
- **G9:** The default Playwright web server build (`npm run build && vite preview`) can exceed its 120 s start-up timeout on a busy machine; CI should be fine.

## 7. Results

See the bottom of this file, filled after each full run.

### Run 1: 2026-11-02

_(filled in below)_
