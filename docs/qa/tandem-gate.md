# Tandem decision gate: QA table (T-13), 2026-11-16 (for the owner's decision on Tue Nov 17)

**Summary**
1. Sim checks 1-18 of `docs/design/features/tandem.md`: all have a named test and all pass (41 tests in two files, `npx vitest run src/core/sim/tandemAcceptance.test.ts src/core/sim/tandemAcceptance2.test.ts`, 2 files, 41 passed, run 2026-11-16). Gate checks 1-12: **12/12 Pass**.
2. One gap on check 18 only: the run-twice test covers checks 3, 16, 17 and five scenarios (wall, split, ledge, home, death), not checks 7, 11, 14, 15 individually. Not a gate check; the sim has no randomness source, so risk is low.
3. Scene checks S1-S4 are not verified: T-20 is being built in this batch. No `levels/w3-01` exists yet either, so Tandem has not been played in a browser. Verify after the batch lands (list at the bottom).

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

## Scene checks (pending T-20, verify after the batch)

| # | Check | Result |
|---|---|---|
| S1 | Bodies 20 tiles apart: both fully on screen | Not-verified: pending T-20, verify after the batch |
| S2 | Runner home, twin moving: the camera follows the twin | Not-verified: pending T-20, verify after the batch |
| S3 | Bodies 30 tiles apart: camera follows the runner, edge arrow points at the twin | Not-verified: pending T-20, verify after the batch |
| S4 | Twin and runner distinguishable in a grayscale screenshot at 1x (480x270) | Not-verified: pending T-20, verify after the batch |

What I will look at once T-20 lands (and `levels/w3-01` exists; it is the only Tandem level, so the browser checks need it or a QA fixture):

- **Unit side (from the scene lane's `npx vitest run src/entities`):** the pure camera-focus tests for S1-S3: `cameraFocus(...)` returns the midpoint at 20 tiles, the twin when the runner is home, the runner plus `edgeBody` at 30 tiles; and the 28-tile switch point on both sides (27.9 and 28.1).
- **Browser, hook (`?level=w3-01`, QA hook build):** `window.__redshift.state.twin` is non-null; both bodies move on the same key press; hold R to the divider wall and watch the twin's x/vx diverge from the runner's. Camera and arrow have no hook field today (request line to the scene lane if S2/S3 need numbers).
- **Browser, screenshots at 960x540:** S1 both bodies visible, no vertical scroll; S2 after the runner reaches the exit, the frame follows the twin; S3 the edge arrow appears (`hud/edge/twin/<band>`) with the twin's pattern ink; S4 a 2x crop of the canvas at 480x270 converted to grayscale: the twin's hollow outline must read apart from the filled runner, in both bands 0 and 4. Evidence goes to `docs/qa/evidence/`.
- **HUD:** two gear strips (runner top, twin bottom), the home glyph and dimming on the strip of a home body, parked pose for the home body.
- **Regression:** a level without `&` (w1-01, w0-02) renders and plays unchanged: the e2e suite stays green and `twin` is null in the hook.
- **Smoke test already written:** `tests/e2e/tandem.spec.ts` (skips with a message until `levels/w3-01` and the hook's twin exist).
