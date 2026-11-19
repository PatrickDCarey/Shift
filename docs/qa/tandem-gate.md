# Tandem: QA table (T-13, B6-41). Gate table 2026-11-16; scene checks S1-S4 verified 2026-11-18

**Status 2026-11-18:** the gate decision is made (the owner kept Tandem on 2026-11-16). This table is now the Done checklist: sim checks 1-18 Pass (one gap on check 18), scene checks S1-S4 Pass (details at the bottom).

**Summary**
1. Sim checks 1-18 of `docs/design/features/tandem.md`: all have a named test and all pass (41 tests in two files, `npx vitest run src/core/sim/tandemAcceptance.test.ts src/core/sim/tandemAcceptance2.test.ts`, 2 files, 41 passed, run 2026-11-16). Gate checks 1-12: **12/12 Pass**.
2. One gap on check 18 only: the run-twice test covers checks 3, 16, 17 and five scenarios (wall, split, ledge, home, death), not checks 7, 11, 14, 15 individually. Not a gate check; the sim has no randomness source, so risk is low.
3. Scene checks S1-S4: **4/4 Pass** on 2026-11-18 (T-20 landed in batch 5; w3-01 exists). S1-S3 ran on the dev-only room `w0-97` (the dev server), S4 and the two gear strips on `w3-01` in the e2e build. See the last section.

Legend: Pass = a test asserts it and passes. Fail = a test asserts it and fails. Not-verified = no evidence yet. "Gate" = checks 1-12, the Nov 17 criterion.

## Sim checks

Files: `A` = `src/core/sim/tandemAcceptance.test.ts`, `B` = `src/core/sim/tandemAcceptance2.test.ts`, `P` = `src/core/level/parseTwin.test.ts`. Test names are given as `describe` / `it`.

| # | Check | Gate | Result | Test (file) |
|---|---|---|---|---|
| 1 | No twin, no change | yes | Pass | A: `tandem check 1: no twin, no change` / "a level without & has twin null on every step", "a no-twin win emits won alone: no home event". "Every M1 check unchanged" is carried by the M1 acceptance suites (`movementAcceptance`, `gatingAcceptance`, `airDragAcceptance`, `jumpAcceptance`, `resetAcceptance`, `coloredWallsAcceptance`), which the orchestrator's full run of 2202 tests keeps green |
| 2 | Twin spawn; two `&` fails to parse | yes | Pass | A: `tandem check 2: twin spawn` / "stands at (col + 0.5, row + 1), facing right, gear 1, band 0, not home". Parse error naming row and column: P: "rejects a second &, naming its row and column and the first" |
| 3 | Same input, same lane, same result | yes | Pass | A: `tandem check 3: same input, same lane, same result` / "twin (x - x0, y - y0), vx, vy, gear and band equal the runner on every step", "each step lists the runner events, then the same events with body 1", "one shared direction priority: both bodies get the same moveDir with L and R held" |
| 4 | A wall stops one body | yes | Pass | B: `tandem check 4: a wall stops one body` / "contact step: runner vx 0, gear 4, band 0, one wallStop body 0; twin vx 12, band 4", "runner ramps from standing: band 1, 2, 3, 4 on steps 1, 10, 23, 32; twin stays band 4" |
| 5 | Gear split in the air | yes | Pass | B: `tandem check 5: gear split in the air` / "runner: wall stop on flight step 14, vx 0, gear 1, x = face - half width; lands on step 48", "twin: drop to 9 on flight step 30, lands on step 48, 8.70 out, gear 3", "next step holding R: runner vx 3 (band 1), twin vx 9 (band 3)" |
| 6 | Clamp resync up | yes | Pass | B: `tandem check 6: clamp resync up` / "end state is runner gear 1 at 3, twin gear 3 at 9", "gears after steps 1, 3, 5: (2,4), (3,4), (4,4)", "twin band 4 on action step 4; runner band 4 on step 31 and vx 12 from step 35", "by action step 40 both are gear 4, band 4, vx 12" |
| 7 | Clamp resync down | yes | Pass | B: `tandem check 7: clamp resync down` / "runner gear 4, twin gear 2, both grounded: three separate - presses leave both in gear 1" |
| 8 | Shift while one body is airborne | yes | Pass | B: `tandem checks 8-9: one body airborne, one on the ground` / "setup: the runner is airborne for 29 steps and lands in gear 1", "+ on airborne step 10: twin gear 2 at the end of it; the runner buffers, it expires, lands in gear 1", "+ on airborne step 25: the runner is gear 2 at the end of its landing step" |
| 9 | Jump while one body is airborne | yes | Pass | B: same describe / "check 9: J on airborne step 26: the twin launches then; the runner jump fires the step after landing" |
| 10 | Home, then win | yes | Pass | B: `tandem check 10: home, then win` / "runner home first: home body 0, still playing; its state is frozen from then on", "twin home later: home body 1 then won; wonAtStep is that step" |
| 11 | Both home on the same step | yes | Pass | B: `tandem check 11: both home on the same step` / "won on the first step both overlap, home body 0 then body 1 then won" |
| 12 | Twin falls, run dies | yes | Pass | B: `tandem check 12: the twin falls, the run dies` / "died with body 1 on the step the twin box top passes below the grid", "after the freeze both bodies respawn at their spawns (gear 1, band 0, home false)" |
| 13 | Home beats death | no | Pass | B: `tandem check 13: home beats death` / "a runner home over the bottom row never triggers died; the twin then wins the run" |
| 14 | No win with one body dead the same step | no | Pass | B: `tandem check 14: no win with one body dead on the same step` / "the runner overlaps an exit on the step the twin falls out: dead, not won" |
| 15 | Restart resets both | no | Pass | B: `tandem check 15: restart resets both` / "setup: the runner is home, the twin is not, and the run is still playing", "restart press then the respawn step: both bodies equal the fresh-load state", "after the runner is home and the twin dies, the respawn clears the runner home flag" |
| 16 | No body collision | no | Pass | A: `tandem check 16: no body collision` / "both end flush against the wall with equal x", "the runner walks through the twin box at vx 3 until its own wall contact" |
| 17 | Per-body gating and grace | no | Pass | A: `tandem check 17: per-body gating and grace` / "setup: both cruise at gear 2", "twin band 3 on action step 5 with graceStart body 1; grounded c+1..c+6, airborne c+7; run dies", "the runner changes band on step c with its own graceStart and stays grounded on safe tiles" |
| 18 | Determinism | no | Pass, with gap | A: `tandem check 18: determinism` / "a twin run gives deep-equal states and events twice" (checks 3, 16, 17 setups). B: `tandem check 18 (checks 4-15): determinism` / "%s gives deep-equal states and events twice" for wall (4), split (5, 6), ledge (8, 9), home (10, 13), death (12). **Gap:** checks 7, 11, 14, 15 have no run-twice case |

Notes for the owner:
- The two files pin the sim value where the spec said "(derived)" (checks 5 and 6). They pass at the spec numbers, so design-lead has no number to update.
- These are unit tests through the real `step`. Nothing here proves the scene draws or steers two bodies correctly; that is S1-S4 and T-20.

## Scene checks S1-S4 (verified 2026-11-18, HEAD 9f8ffb7 plus QA specs)

Spec: `tests/e2e/tandem-scene.spec.ts` (5 tests). **Why two builds:** w3-01 keeps both bodies at the same x and is 28 tiles wide (under one 30-tile screen), so its camera never scrolls and "20 / 30 tiles apart" cannot occur in it. The scene lane's dev-only room `w0-97` (`src/entities/devLevel.ts`: the twin is held by a wall at column 20, the runner runs to its exit at column 57) is only in the dev server. In `npm run test:e2e` (production-like build) the three S1-S3 tests therefore **skip with a message**; QA ran them against `npm run dev` (5 of 5 pass; run recorded below). The same facts are pinned by the scene lane's pure `cameraFocus` tests (28-tile switch both sides).

| # | Check | Result | Evidence |
|---|---|---|---|
| S1 | Bodies 20 tiles apart: both fully on screen | **Pass** (dev room) | First frame with runner.x - twin.x >= 20: camera scrollX 233, twin sprite at screen x 81, runner sprite at screen x 400 (screen is 480 wide, sprites 16 px); no twin edge arrow on any frame under 28 tiles apart. Screenshot `docs/qa/evidence/tandem-s1-w0-97-run.png` (taken at the end of the run: by then the runner is home); the numbers are from the per-frame in-page record |
| S2 | Runner home, twin moving: the camera follows the twin | **Pass** (dev room) | Runner home at step 385; camera eases to scrollX 74, twin sprite at screen x 240 (centre), the parked runner is at screen x 832 (off screen). `docs/qa/evidence/tandem-s2-camera-on-twin.png`. Not observable in w3-01 (camera clamped, level narrower than the screen) |
| S3 | Bodies 30 tiles apart: camera follows the runner, edge arrow at the twin | **Pass** (dev room) | At 29.9 apart: twin sprite at screen x -166 (off screen left), runner at screen x 316 (camera at the level's right bound, 480), `hud/edge/twin/white` visible at the left edge (x 27, y 227, the twin's row); no twin arrow below 28 tiles. At 27.5 apart the twin was still on screen at x 19. Existing orchestrator screenshot `docs/qa/evidence/tandem-edge-arrow.png` |
| S4 | Twin and runner distinguishable in a grayscale screenshot at 1x (480x270) | **Pass** (w3-01) | Greyscale 1x capture `docs/qa/evidence/tandem-s4-w3-01-greyscale-1x.png`; 4x crop of both sprites `docs/qa/evidence/tandem-s4-sprites-grey-4x.png`: the runner has a flat head with a dark visor slit, the twin has an antenna and two dot eyes; the test asserts more than 5% of sprite pixels differ by more than 24/255 grey levels. Band 0 only; a band-4 (red) greyscale pair was not captured: not verified |

Other things seen on w3-01 (from `tandem.md` verification item 3): both bodies are drawn (runner and twin sprites in the Game display list) and two gear strips exist (runner top, twin bottom) - `tandem-scene.spec.ts` "both bodies and a second gear strip are drawn". The orchestrator's hand-played win with both home: `docs/qa/evidence/tandem-w3-01-won.png`; `tandem.spec.ts` replays w3-01 to a win with both home.

Not covered by an automated check: the home glyph and dimming on the strip of a home body, the parked pose frame (the sprite frame `park_0` was seen on the runner in the S2 run), the band-4 pair for S4.

Run of 2026-11-18 against the dev server (copy of the config with `baseURL` 5173 and no web server): `tandem-scene.spec.ts` 5 passed. In `npm run test:e2e`: 2 passed, 3 skipped (S1-S3, dev only).
