# Redshift: M1 test plan (grey-box)

_Owner: qa-tester. Tasks M1-26, M1-50, M1-35 and M1-36. Written 2026-11-02 against GDD v1.2 and the five M1 feature specs in `docs/design/features/`; HUD gear meter, time banner and shift-buffer scene checks added 2026-11-04 (sections 2.6 to 2.8); pause, win recording, hint and Sticky Keys mounting checks added 2026-11-04, batch 2 (sections 2.9 to 2.12). Results for the last run are in section 7._

## 1. Layers and how to run them

| Layer | Where | Run | Proves |
|---|---|---|---|
| **Unit: spec acceptance** | `src/core/sim/{movement,jump,airDrag,gating,reset}Acceptance.test.ts` (one file per spec, one `describe` per numbered check) and `src/core/motion/acceptance.test.ts` (the same checks on the pure speed maths) | `npm test` or `npx vitest run src/core/sim` | The exact step numbers and distances printed in the specs, through the real `step`. |
| **Unit: module** | `src/core/{sim,motion,level}/*.test.ts`, `src/core/types.test.ts`, `src/entities/*.test.ts`, `src/ui/*.test.ts`, `src/save/save.test.ts` | `npm test` | Contracts, parsers, codecs, input sampler, bindings, storage, Sticky Keys logic. |
| **Arch** | `tests/arch/*.test.ts` | `npm test` | Core purity (no Phaser, `Math.random`, `Date`), lane imports, tuning schema, path case, level-format doc. |
| **Solvability** | `tests/levels/solvability.test.ts` | `npx vitest run tests/levels` | Every `levels/<id>.txt` has a recording and the real sim wins with it. |
| **Coverage** | vitest v8, threshold 80% on `src/core/**` | `npm run test:coverage` (part of `npm run check`) | CLAUDE.md quality bar. |
| **Type check / build** | `tsc` twice, `vite build` | `npm run typecheck`, `npm run build` | Browser code and tests/configs compile; the shipped bundle builds. |
| **E2E** | `tests/e2e/*.spec.ts` (Playwright, Chromium, 960x540 viewport; canvas 480x270 since the pixel cutover) | `npm run test:e2e` (builds with `VITE_QA_HOOK=1`, serves `dist/` on 4173; **port 4173 must be free**, the config never reuses a server) | The real browser build: boot, canvas size, key bindings in a browser, focus, replay of every shipped solution, iframe embed. |
| **Manual / playtest** | this plan section 5; `docs/playtests/` | by hand | Feel, 60 fps, anything visual. |

**E2E conventions.** Never sleep on wall-clock time. Every wait polls `window.__redshift` (`tests/e2e/helpers.ts`: `waitForHook` 45 s boot timeout, `pollState` 20 s, 120 s per test via `test.describe.configure`) because a loaded machine or headless Chromium can run the game at a few frames per second. The 960x540 viewport comes from `playwright.config.ts` (set on the chromium project after the device spread; BUG-2 closed), so specs no longer call `test.use`; `embed.spec.ts` asserts `page.viewportSize()` equals `EMBED_VIEWPORT` as a regression guard. The suite runs `workers: 2` (BUG-3 closed). `window.__redshift` exists only in dev and in builds made with `VITE_QA_HOOK=1` (BUG-1 closed): the e2e build has it, a plain `npm run build` does not, so never point e2e at a plain build. A shared auto-fixture fails any test that logs a console error or a page error. Replay tests use `?level=<id>&replay=1&speed=60`; `replay.done` is true on `won` or when the frames run out, never on `dead` (recordings include deaths).

Reactive setup (walking to a spot) is lag-prone, so helpers detect deaths and retry (`walkIntoOpenPit`); timing-critical key presses are dispatched inside the page (`armAirPress` with an `afterSteps` or `minVy` trigger, used by `jumpAndPressInAir`) and a jump is judged from per-frame samples recorded in the page (`startTracker`/`stopTracker`), not from Playwright round trips. A jump at w0-02's spawn is a full arc since w0-02 v2 (`m2-additions.spec.ts`); most jump tests still drop into the pit because the walk-in helpers exist. Jumps cannot be tested in the dev room (`w0-00` is used only when no level files exist; an unknown `?level=` falls back to w0-02), so jump tests drop through the blue bridge into the pit (x 8.5-12.5, floor y 12, 6 open tiles overhead).

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

(Browser smoke: e2e `Space, W and ArrowUp each jump a full 3-tile arc` jumps in the open pit under w0-02's bridge (apex over 2 tiles, lands on the floor); the exact numbers stay in unit tests.)

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
| 13 | No mid-air shift | S check 13-14; **E** `keyboard.spec.ts` "KeyE / ShiftRight / KeyX pressed early in a jump does not change the gear" |
| 14 | Shift buffer (L-4 applies, L-10 does not) | S check 13-14 (e2e covers only the early press; the late press is too timing-sensitive for a browser) |
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

### 2.6 hud-gear-meter.md (13 checks, added 2026-11-04, M1-50)

The meter model is the pure function `gearMeterModel` in `src/ui/gearMeter.ts`; the Phaser drawing is `src/ui/GearMeterView.ts`, mounted by the scene (`GameScene.update` calls `gearMeterModel(state.player, params)`). **U** = `src/ui/gearMeter.test.ts` (model fed hand-built player states). **SIM** = `src/ui/gearMeter.sim.test.ts` (ui-engineer, written this batch: one `describe` per spec check 1-9, stepping the real sim through `step` and reading the model each step; in the working tree, not yet committed; `npx vitest run src/ui` passed 7 files / 157 tests on 2026-11-04). Since batch 2 the hook exposes the model as read-only `meter` (and `banner`, `paused`), so checks 1, 2, 3 and 9 are also asserted in the browser by `tests/e2e/win.spec.ts` "gear meter in the scene" (gap G12 closed): the model equals `{litBand 0, selectedGear 1, needle 0, dragFill null, pendingGear null}` at load and again after R; three up-presses read gear 4 with lit 0; and on every sampled frame of a gear-4 run `litBand` equals the sim band, `selectedGear` the sim gear and `needle` `min(4, |vx| / 3)`. The drawn objects are still canvas-only.

| # | Criterion | Verified by |
|---|---|---|
| 1 | Initial state: lit 0, gear 1, needle 0, no drag fill, no pending | SIM check 1; U "initial state" (exact `toEqual`); **E `win.spec.ts` "check 1: initial model"** |
| 2 | Standing, three up-presses: gear 4, lit 0, needle 0 | SIM check 2; U "standing in gear 1..4"; the presses reaching gear 4 through keys: e2e `keyboard.spec.ts` "raises the selected gear" and "gear clamps at 1 and 4"; S movement 11-12 |
| 3 | Gear 4 from rest: lit = `state.band` every step (2 on 10, 3 on 23, 4 on 32), needle non-decreasing, 4 from step 36 | SIM check 3 (real sim, every step); S movement 1-2; U "lit band is the sim band" and the needle table (vx 0..12 to 0..4, `abs(vx)`, clamp) |
| 4 | Let go at full sprint: needle reaches 0, gear stays 4 | SIM check 4; S movement 5-6; U needle table and "holding into a wall" (speed 0) |
| 5 | Gear-4 flat jump: drag fill from takeoff and rising, wraps below 0.2 on the drop (flight step 30), lit becomes 3, null on landing | SIM check 5 (takeoff step, drop on flight step 30, landing step); S airDrag 1; U "starts at 0 on the takeoff step", "wraps to the carried remainder", "capped at 1", "null on the ground" |
| 6 | Blue flight and standing (white) jump: drag fill always null | SIM check 6 (gear-1 walking jump, standing jump, long fall); U "hidden at blue", "hidden at white", "shown at green", `airDragMinBand` variants; S airDrag 2, 7 |
| 7 | Up-press on flight step 10 of a 48-step jump: pending 2 on the press step, null when the buffer runs out, landing gear unchanged; press 3 steps before landing: pending until landing, then the applied gear | Model through the real sim: SIM check 7; U "pending shift" (set, net, clamp, null after the window); S airDrag 13-14. **Scene: e2e** SB1 and SB2 in 2.8 (the second also asserts the fields the bracket reads, `shiftBufferSteps > 0` with `shiftBufferNet` +1 while airborne) |
| 8 | Up-press while airborne at gear 4: no pending | SIM check 8; U "clamps to 4 and shows nothing" (also the gear-1 down-press and over-large net cases) |
| 9 | After death or R: same model as check 1 | SIM check 9 (restart and death freeze/respawn through the sim); S reset 4, 6, 7. Not read through the scene after a real death or R (G12) |
| 10 | Needle divisor from `gearSpeeds[1]`, not hard-coded | U "divides by gearSpeeds[1]" (doctored 4/8/12/16) and "degenerate 0 speed, no NaN" |
| 11 | Greyscale screenshot: cells identifiable by pattern; lit vs dim and bracket visible without color | **Manual at the M1 gate** (screenshot of the strip, greyscale filter). Automated parts: patterns distinct (HUD cell ink 25-50%, any pair differs on 37.5%+) in `src/fx/patterns.test.ts`; greyscale read-back of the baked tiles in `src/fx/pixel/tiles.test.ts`. The bracket and lit/dim states are shape and brightness, checked by eye only |
| 12 | Lit-cell glyphs and bracket at least 3:1 against `palette.ui.panel` | Band fills vs panel at least 4.5:1: `src/fx/accessibility.test.ts` (HUD panel block). The white bracket and ghost cells vs panel are **not under test** (white on `#0F1220` is about 18:1 by hand calculation). Visual confirmation together with check 11 |
| 13 | A fresh player can name the target gear for red before the red bridge | Playtest question (next playtest, `docs/playtests/`), not QA |

### 2.7 M1 time banner ("Level complete - M:SS.hh - press R", `src/entities/GameHud.ts`)

Replaced by the results panel in M2 (`results.md`), so only the format is held to account. Minutes unpadded, seconds two digits, hundredths **truncated**, time = `wonAtStep / stepHz` (GDD 11).

| # | Criterion | Verified by |
|---|---|---|
| B1 | 775 steps at 60 Hz reads `0:12.91`, 60 reads `0:01.00`, 3601 reads `1:00.01`, 0 reads `0:00.00` | U `src/entities/hud.test.ts` "winText" |
| B2 | Hundredths truncate, never round (119 steps is `0:01.98`) | U `hud.test.ts` "truncates hundredths" |
| B3 | A missing step count never prints `null` | U `hud.test.ts` "does not print null" |
| B4 | The title clears the gear meter area; messages sit below it | U `hud.test.ts` `hudLayout` (2 checks) |
| B5 | The banner time equals the run time (win step) in the real build | **E `win.spec.ts` "a live w1-01 win stores ..."**: the hook's `banner` equals `Level complete — M:SS.hh — press R` computed independently from `wonAtStep` for each live win; B1 proves the text function; `replay.spec.ts` asserts `wonAtStep` equals the recording's `steps` header |
| B6 | `99:59.99` display cap (level-select.md check 8) | **Not covered** for the banner: `formatRunTime` has no cap test. Only matters from 100 minutes; the M2 `formatTime` carries it |

### 2.8 Shift buffer through the scene (design ruling 2026-11-03, `decisions.md`)

A standing jump in the pit is a 48-step flight at gear 1; the buffer is 6 steps (100 ms). Press steps are exact in the page; whether an attempt proves anything is judged from per-frame samples, and an attempt a slow frame rate spoiled is repeated (up to 8 and 14 attempts).

| # | Criterion | Verified by |
|---|---|---|
| SB1 | Press on flight step 10 is dropped: gear 1 in every later sample and 30 steps after landing | e2e `keyboard.spec.ts` "KeyE pressed on flight step 10 ... is dropped" (accepted only with at least 9 steps of flight left after the press) |
| SB2 | Press within 6 steps of landing: gear unchanged in the air, applied on landing (gear 2), buffered fields read +1 while airborne | e2e `keyboard.spec.ts` "KeyE pressed within 6 steps of landing ..." (press on the first frame falling at 11.5 tiles/s or more, flight step 43+; accepted only if touchdown was at most 5 steps after the press) |
| SB3 | Press on the first airborne step: dropped | e2e "pressed early in a jump does not change the gear" (KeyE, ShiftRight, KeyX) |
| SB4 | Same rules from a fast jump at gear 3-4 | Unit only (S airDrag 13-14): no level has a runway for it yet (G11) |
| SB5 | Any early press that applies is a bug (design-lead's rule) | SB1 and SB3 would fail; neither has |

### 2.9 pause.md (12 checks; spec M2-34, scene lane M2-06; the M1 stand-in label, the menu is M2-12)

Read through the hook's `paused`, `state` and per-frame samples (`startTracker` also records `x`, `vx`, `paused`). **E** = `tests/e2e/pause.spec.ts` unless noted.

| # | Criterion | Verified by |
|---|---|---|
| 1 | Esc (and P) freezes the sim for 120 rendered frames; pressing again resumes from the same state | E "Escape / KeyP pauses ..." (step and whole player state equal after 120 frames; first live frame at most 5 steps and 5 steps of travel on) |
| 2 | No catch-up after 3 s paused | E "no catch-up" (largest step jump in one rendered frame after resume at most `MAX_STEPS_PER_FRAME` 5). `advanceClock` also clamps at 5, so the browser cannot tell an emptied accumulator from a clamped one; the reset itself is unit-tested in `runDriver.test.ts` |
| 3 | Recorder gets no frames while paused; a paused run's recording replays to the same `wonAtStep` | Sim frozen: E check 1. Recording equality: unit `runDriver.test.ts` (the e2e cannot read the recording) |
| 4 | Right held through pause and resume keeps running, no stop or skid | E "a key held through the pause ..." (vx never 0 on any live sample after resume) |
| 5 | Space held while paused (and the P that closes the pause) does not jump until released and pressed again | E "Space held while paused ..." (40 steps grounded with Space still down, then a fresh press jumps) |
| 6 | Q and other keys pressed while paused do not act | E "keys tapped while paused ..." (Q, both Shifts, ArrowRight, Space tapped while paused: gear, x and grounded unchanged) |
| 7 | R while paused restarts (step 0, gear 1, spawn) and closes the pause | E "R while paused ..." and "input works normally after a restart from the pause" |
| 8 | LEVELS: level select opens on this level, save unchanged | **Not testable yet**: the pause menu is M2-12 (the M1 stand-in has only Esc, P and R) |
| 9 | CONTROLS then Esc returns to the pause menu | **Not testable yet** (M2-12) |
| 10 | Blur pauses and drops held keys; Right must be pressed again | E "window blur pauses ..."; `embed.spec.ts` "losing window focus pauses ..."; E "tab hidden (visibilitychange) pauses like blur". Not automated: browser auto-repeat after refocus (bugs.md, "Checked, no bug") |
| 11 | Pause during the death freeze respawns on the same step | Unit only (the freeze is 24 steps, too short to hit reliably in a browser) |
| 12 | Esc on the results screen does not open pause | Unit `pauseState.test.ts` (`canPause` false after the win). The results screen is M2-12; browser not covered |

### 2.10 Win recording (progress-save.md, results.md; `recordRun` in `src/save/progress.ts`)

| # | Criterion | Verified by |
|---|---|---|
| W1 | A live win of w1-01 (hold ArrowRight all the way) stores the level once in `completedLevels` and its win step in `bestSteps` under `redshift.save` | E `win.spec.ts` "a live w1-01 win stores ..." |
| W2 | A faster later win replaces the best; a slower one leaves it; `completedLevels` stays one entry; the save survives a reload | same test (three wins: 60 steps standing first, straight, 90 steps standing first) |
| W3 | Replay mode (`?replay=1`) writes nothing | E "a replayed win writes nothing to localStorage" (w1-01 replay wins on 434 (v2); no completed level, no best) |
| W4 | Nothing is stored before the first win | E "nothing is stored before the first win" |
| W5 | World 0 writes nothing | Unit `progress.test.ts` (`recordRun` skips world < 1). Browser: not covered (a live w0-02 win needs 775 steps of exact input) |

### 2.11 Onboarding hints (onboarding-hints.md checks 5 and 6, level review)

Node-side spec `tests/e2e/levels-hints.spec.ts` (no browser; it parses the real files through the `src/core` barrel). Check 5: w1-01 wins on 434 and w1-02 on 326 (both v2; were 414 and 311 before 4A) with and without their `hint:` lines. Check 6: every shipped level's hints are empty cells at least 3 rows above the floor under the anchor, at most 3 per level; w1-01 has `move`; w1-02 has `shiftUp` over columns 0-2 and `shiftDown` over columns 8-10. No level has `jump` yet, so the w2-01 parts of checks 5, 6 and 8 wait for that level. Checks 1-4 are unit (builders); check 7 is a screenshot (manual).

### 2.12 Sticky Keys tip mounting (sticky-keys-tip.md, M2-39)

E `sticky-keys.spec.ts`: on a Windows user agent the first level start sets `settings.stickyKeysTipShown` and keys still move the runner while the tip is up (non-blocking); the flag persists across a reload; replay mode never shows it; a macOS user agent never sets it. The panel is a canvas object: see `docs/qa/evidence/package-zip-subfolder-load.png` (taken from the packaged zip). Auto-hide, Enter dismissal and pause-hides-it are not automated.

### 2.13 Clarity fixes PT-1 to PT-7 (`clarity-fixes.md`, added 2026-11-13, batch 4A)

Verified in run 5 or the M2 gate once each lands. U = unit, E = e2e (hook), H = by hand on the pixel build.

| Check | What to verify | How |
|---|---|---|
| PT-1 | `/` with no `?level=` opens w1-01 (`hook.levelId`); `?level=w0-02` still loads w0-02; unknown id loads w1-01 plus the message. After M2-11 `/` opens the title. | E (add to `levels-hints.spec.ts` after the scene lane lands), U |
| PT-2 | Exit is the most distinct object (idle animation Should); off-screen exit arrow shows only while no exit tile is in view, points at it, level with its centre, clamped 4 px under the HUD and 4 px above the bottom; no band pattern; differs from the Tandem arrows in greyscale (art test M1-59). | U (`exitCue`), H screenshot |
| PT-3 | Why-you-fell cue: the failing tile run highlights and the HUD cell rings for one 45-frame ring, cleared on respawn and restart; one ring only; walk-off and grace fall-through are Must, the two Should triggers noted. | U (model), H |
| PT-4 | Drag bar runs from the needle to the centre of cell `litBand - 1`, fills by `min(airDistance / airDragTilesPerGear, 1)`, ends in a chevron; hidden if not built. No air-shift hint exists anywhere (rejected). | U, H |
| PT-5 | Bracket thin and dimmed while its cell is not lit, bold on the step the lit cell reaches it (`arrived`); `litBand === state.band` in w1-03 at gear 4, band 3. | U; E reads `hook.meter.litBand` against `state.band` on every sampled frame (already in `m2-additions`) |
| PT-6 | w1-01 v2, w1-02 v2, w1-04 v2: timed windows at least 30 steps (world 1), 18 steps (world 2); w1-05 geometry kept with its timing-free line; `version` and `Fastest known` bumped; the recordings still win and win with inputs shifted +-3 steps. | `npx vitest run tests/levels`, E replay of every solution |
| PT-7 | The interim banner is unchanged; on M2-12 the results panel focuses NEXT, Enter or Space picks it, R retries, Esc goes to levels, and nothing names R before NEXT. | E once M2-12 lands |

### 2.15 Changed checks of 2026-11-13 and Tandem (added 2026-11-16)

`sticky-keys-tip.md` check 11 (tip returns after resume, 12 s unpaused) and `adaptive-audio.md` check 5 / `clarity-fixes.md` PT-3 checks 1-2 (the `fallThrough` sim event) are unit-owned (ui, audio, sim lanes) and not observable through the hook, so `tests/e2e/tandem.spec.ts` holds skipped stubs with the reason. Tandem: sim checks 1-18 in `docs/qa/tandem-gate.md`; scene checks S1-S4 after T-20. The w2-03 replay needs no code: `listSolutions()` globs `levels/*.solution.txt`.

### 2.14 Pixel cutover (PX-4 to PX-10, `docs/tech/adr-pixel-rendering.md`, added 2026-11-13)

Automated in `tests/e2e/pixel.spec.ts`, `smoke.spec.ts`, `embed.spec.ts` (hook-based specs are unchanged: sim units are tiles).

| Check | Verified by |
|---|---|
| Canvas attributes are 480 x 270 on boot (smoke, embed, iframe) | E |
| CSS width is a whole multiple of 480 and the box is centred at 960x540 (960), 1366x768 (960), 1920x1080 (1920), 2560x1440 (2400); non-multiple viewports 1000x600 (960) and 1500x1000 (1440) | E `pixel.spec.ts` |
| 640x360 gives a centred 480 x 270 box (zoom 1, no fractional fit) | E `embed.spec.ts` |
| Live resize 960 to 1920 to 960 re-zooms (4 then 2) without touching the sim | E |
| 2x screenshot is 960x540, made of uniform 2x2 blocks, under 200 colours (`docs/qa/evidence/px-10-embed-2x.png`) | E |
| `image-rendering` is pixelated on the canvas | E |
| Boot with storage blocked (PX-4) | add in run 5 (`addInitScript` throwing from `localStorage`) |
| Player screen x constant while the camera follows (snapping invariant) | U (scene lane); H: no jitter between player and tiles at gear 1 to 4 |
| `tileSize` is 16 and no level changes; every recording still replays | `tests/levels`, e2e replay |
| Bitmap font legible at 2x and 4x; `---` and the shift glyph render | H (PX-11) |
| 60 fps in the 960x540 embed, F3 overlay | H (M2 gate); the spike measured 54 fps headless software GL |
| Fullscreen at 1366x768 and 1920x1080: dither clean, letterbox black | H (PX-11, playtester) |
| Reduced-effects mode, keyboard-only, alternative bindings on the pixel build | H (M2 gate) |

Assumptions that depend on the cutover lanes' exact output: (1) `main.ts` re-zooms on window `resize` (ADR); (2) the canvas CSS box is `canvas.boundingBox()` and Phaser centres it with margins, so centre equals viewport centre within 1 px; (3) the CSS `image-rendering` computes to `pixelated` or `crisp-edges`; (4) the frame at step 30 on w0-02 contains no smoothed pixels (no scaled bitmap text at fractional scale, no alpha-blended fades; a fade or glow would raise the 2x2 non-uniform count and the 200-colour cap, so loosen the caps and note it if art adds alpha effects); (5) `w0-02` is the level loaded by `?level=`.

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
| M1-15 | Debug overlay values equal state; hook absent from production build | Overlay: `debugText.test.ts` plus manual F3. Hook: gated to dev or `VITE_QA_HOOK=1` (BUG-1 closed 2026-11-04): a plain `vite build` has no `__redshift`, a `VITE_QA_HOOK=1` build has it; guarded by `tests/arch/qa-hook.test.ts` and the CI step "No QA hook in the release build" |
| M1-16 / M1-40 | Storage never throws; every action bound; no key on two actions; Shift told apart by code; Sticky Keys logic | `src/save/save.test.ts`, `src/ui/bindings.test.ts`, `src/ui/stickyKeysTip.test.ts` |
| M1-17 | Game starts with no console errors; keys do not scroll | e2e (auto console-error fixture; default-prevented and scroll checks; iframe host scroll) |
| M1-18 | Zip loads from a subfolder, no secrets | `npm run package`; unzip into `sub/game/`; serve and load (960x540, no console errors, no hook); grep the bundle for `.env`, keys, `__redshift`; package twice and compare sha256; run it with `VITE_QA_HOOK=1`, a stray `VITE_` variable and an `sb_secret_` key set (all refused). Results in section 7, run 4; BUG-4 for the shipped solutions |
| M1-19 | RLS denies anon writes | Review by security-reviewer; SQL read-through (not run against a DB in M1) |
| M1-20 / M1-21 | Room parses; solution wins; still wins with key inputs shifted +-3 | `tests/levels/solvability.test.ts` plus e2e replay (`replay.spec.ts`). The +-3 robustness check is **not automated**: see gap G3 |
| M1-22 / M1-23 | Palette contrast, patterns distinct, mapping tested | `src/fx/*.test.ts`; `docs/art/` numbers; patterns screenshot reviewed by eye |
| M1-24 | Audio nothing throws before a gesture | Unit tests with a mocked context |
| M1-25 / M1-29 | Design approvals and D-1..D-3 verdicts | Read `docs/design/decisions.md` (no QA execution) |
| M1-29 / M1-50 | HUD gear meter acceptance 1-13, time banner, shift-buffer scene check | Sections 2.6 to 2.8 |
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
| Sticky Keys tip **shown in the game**, once, non-blocking | e2e `sticky-keys.spec.ts` (section 2.12). Manual: pressing Shift five times in Windows to see the OS dialog is the thing the tip prevents; cannot be automated |

## 5. Manual and playtest checks (cannot be automated in M1)

1. Feel of acceleration, brake and air drag (playtester M1-28, answers D-1, D-2, D-3).
2. 60 fps on a mid-range laptop at 960x540 (on the pixel build, M2 gate) (read the F3 overlay fps; automated headless fps is not meaningful).
3. Real-keyboard check: Left Shift vs Right Shift on a physical keyboard, Windows Sticky Keys dialog not triggered when using Q/E/Z/X.
4. Visual: tiles solid vs ghost, patterns per gear visible without color (screenshots in `docs/art/`).
5. Resize and focus: window resize, tab switch while holding a key, pausing mid-shift (partially covered by e2e blur test).
6. Storage blocked and network off: covered by unit tests for storage; browser-level check deferred until the SaveStore is wired (M2-40).

## 6. Gaps (known, with owner or milestone)

- **G1:** Closed: six levels ship (`w0-02`, `w1-01` to `w1-05`); the replay spec globs `levels/*.solution.txt`, so new levels are picked up automatically (2026-11-04: 283, 444 and 139 steps for w1-03 to w1-05 pass).
- **G2:** Closed 2026-11-04 (BUG-2): the viewport is on the chromium project after the device spread; specs have no `test.use`.
- **G3:** No automated "inputs shifted by +-3 steps still win" check (M1-21 acceptance, level-format fairness). Proposal: a Vitest in `tests/levels/` that shifts each input transition by +-3 steps and runs `verifySolution`. Needs tech-lead (owns `tests/levels/**`).
- **G4:** Closed 2026-11-18 (batch 6): title, level select, controls, pause and results are covered in e2e (section 8). Still hand checks: how they look, audio.
- **G5:** Closed 2026-11-04 (BUG-1): the hook is a build flag; e2e runs against the production build with `VITE_QA_HOOK=1`.
- **G6:** No fps or performance measurement in e2e.
- **G7:** No cross-browser run (Chromium only; Firefox and Safari left for M4 manual check on the itch embed).
- **G8:** Closed 2026-11-04: `npm run package` exists and was verified (section 7, run 4). Open: BUG-4 (solutions ship), the package script has no recording-header check yet.
- **G10:** The iframe test frames the game from a routed same-origin host page (`/itch-host.html`). An `about:blank` host (what the test used before) is blocked by Chrome's Local Network Access check (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`, the frame becomes `chrome-error://`), and so is a different loopback origin, so the cross-origin case is not automated; check by hand on the real itch.io embed (M4).
- **G11:** An air shift from a fast jump at gear 3-4 is only unit-tested (no level has a runway). The 4-worker flakiness (BUG-3) is closed by `workers: 2`; a machine shared with several other jobs can still push 2 workers past the 120 s per-test timeout (seen 2026-11-04, see section 7).
- **G12:** Closed 2026-11-04 (batch 2): the hook exposes read-only `meter`, `banner` and `paused`. Remaining: the lit cell on the exact printed steps (2 on 10, 3 on 23, 4 on 32) is not asserted in the browser (no level has a safe 3.2-tile runway for a gear-4 start; the e2e checks every sampled frame against the sim instead); the pending bracket (check 7) and drag fill (check 5) are not read through the hook in the browser (unit and SIM only); a death (as opposed to R) returning to the check 1 model is not asserted.
- **G9:** The default Playwright web server build (`npm run build && vite preview`) can exceed its 120 s start-up timeout on a busy machine; CI should be fine.

## 7. Results

Newest run first. Run 5 is below; runs 4 to 1 follow it.

### Run 5: 2026-11-16 (batch 3 at cab74a1 and batch 4A at 2eb0527; numbers are the orchestrator's, QA did not rerun the suite in this phase)

| Check | Result |
|---|---|
| Batch 3 (cab74a1) full suite | **2031 unit tests passed**, e2e **73 passed** |
| Batch 4A (2eb0527) `npm run check` | **2202 unit tests passed**; coverage **84.27% statements, 83.32% branches** (threshold 80% held); build ok |
| Batch 4A `npm run test:e2e` | **82 passed**, after three stale step counts were updated (w1-01 414 to 434 and w1-02 311 to 326 in `levels-hints.spec.ts` and `win.spec.ts`; the expected values were the new v2 recordings, not a regression) |
| Plain build | no `window.__redshift` and no solution text in `dist/` (bears on BUG-4; status stays in `bugs.md` until QA confirms against the packaged zip) |
| `npm run package` | ok: 10 files, 0.37 MB |
| Tandem sim checks (QA, 2026-11-16) | `npx vitest run src/core/sim/tandemAcceptance.test.ts src/core/sim/tandemAcceptance2.test.ts`: 2 files, 41 passed. Table: `docs/qa/tandem-gate.md` |
| w2-03 replay | picked up by the glob `listSolutions()` (`levels/w2-03.solution.txt` exists; `replay.spec.ts` makes one test per file, so `replay of w2-03 wins on step <n>`); included in the 82 |

Evidence class: orchestrator command output (not captured to a file). Where a line below says Not-verified, no test or screenshot exists for it.

#### Batch 3 (cab74a1: Tandem sim, world 2 openers, playtest rulings, release hardening)

| Acceptance line | Verdict | Evidence |
|---|---|---|
| Whole suite green after the batch | Pass | 2031 unit, 73 e2e (orchestrator) |
| Tandem sim (T-10, T-11) builds and its tests pass | Pass | 41 tandem acceptance tests green today (`tandem-gate.md`) |
| World 2 openers (w2-01, w2-02) solvable and win in the browser | Pass | `tests/levels` replay and +-3, `replay of w2-01` and `w2-02` e2e, inside the 73 |
| Release hardening: env guard, package script refuse list | Pass (unit) | `scripts/` tests inside the 2031; `npm run package` ok in 4A. A negative run of the refuse list in a real package was not repeated by QA: Not-verified |
| Playtest rulings applied | Not-verified | Design rulings; behaviour changes land in 4A (PT-1 to PT-7), see below |

#### Batch 4A (2eb0527: pixel cutover, Tandem checks 4-15, world 1 retunes, w2-03)

| Acceptance line | Verdict | Evidence |
|---|---|---|
| PX-4 to PX-10 cutover: 480x270 canvas, integer-multiple CSS size, live resize, 2x screenshot | Pass | `pixel.spec.ts`, `smoke.spec.ts`, `embed.spec.ts` inside the 82 |
| PX-11 the look of the pixel build in a browser | Not-verified by QA | Playtester and owner (hand check; `docs/playtests/2026-11-16-pixel-build.md` is batch 5) |
| Tandem checks 4-15 as tests | Pass | `tandemAcceptance2.test.ts` (see `tandem-gate.md`) |
| PT-6 world 1 retunes (w1-01 v2, w1-02 v2, w1-04 v2): windows >= 30 steps, recordings win, win with inputs shifted +-3 | Pass | `npx vitest run tests/levels` in the 2202; e2e replays; `levels-hints.spec.ts` check 5 at 434 and 326 |
| w2-03 Step Down: solvable, replay wins | Pass | glob picked it up (replay spec); tests/levels. Exact 4-tile drop number: design-lead's verdict (M2-23) |
| Stale e2e step counts after the retunes | Pass after update | 414 to 434 and 311 to 326; no other file referenced them |
| Coverage of `src/core` >= 80% | Pass | 84.27% statements, 83.32% branches |
| Plain build ships no hook and no solution text | Pass | orchestrator grep of `dist/` |
| itch zip: `npm run package` ok, size sane | Pass | 10 files, 0.37 MB |
| PT-1 (`/` opens w1-01), PT-5 (litBand equals band) | Pass if those specs carry them; QA did not re-read the specs against the plan this phase | inside the 82 (orchestrator); line-by-line confirmation is Not-verified |
| PT-2 exit cue, PT-3 why-you-fell cue, PT-4 drag bar, PT-7 results | Not-verified | PT-2/3/4 are unit-model plus hand checks on the pixel build; PT-3 mounting waits for the `fallThrough` event (Batch 6); PT-7 waits for M2-12 |
| 60 fps in the pixel build | Not-verified | G6 stands: no fps measurement |

#### Batch 5 additions (written 2026-11-16, not run yet)

- `tests/e2e/tandem.spec.ts` (new): Tandem smoke on `w3-01` (both bodies in the hook; replay wins with both home) and two stubs for the changed checks (sticky-keys-tip 11, adaptive-audio 5 / PT-3 1-2). Skips with a message until `levels/w3-01.solution.txt` exists and the hook state carries `twin`. Expect the orchestrator's count to rise by 4 skipped (or 4 run).
- The changed checks of 2026-11-13 are not observable through the hook, so they are unit-owned and stubbed (section 2.15).
- Stale 414 and 311 in this file fixed (sections 2.10 and 2.11).

### Run 4: 2026-11-05 (batch 2: M1-35 simulation, M1-36 side tracks, pause, win recording, hints; commit 68bdce0)

| Check | Result |
|---|---|
| `npm run check` (orchestrator, 2026-11-05) | 87 files, **1840 tests passed**; coverage 84.88% statements, 84.39% branches; build ok (1,288.13 kB, gzip 351.04 kB) |
| `npm run test:coverage` (QA, 2026-11-04) | 87 files, 1836 tests passed, 34.8 s. `src/core` only (39 files): lines 751/751 = **100%**, statements 901/905 = 99.56%, functions 212/212 = 100%, branches 548/584 = 93.84%. Threshold 80% held. Lowest: `level/text.ts` 82.35% branches, `motion/testkit.ts` and `sim/testkit.ts` (helpers) 50% and 82% |
| `npx vitest run src/core tests/arch tests/levels` | 33 files, 843 tests passed (all six levels solvable, plus the +-3 robustness test) |
| `npx vitest run src/save src/ui src/audio scripts tests/arch` | 24 files, 826 tests passed |
| `npm run test:e2e` (orchestrator) | **64 passed, 0 failed**, 4.2 min (was 31 in run 3: new `pause` 10, `win` 7, `levels-hints` 10, `sticky-keys` 3, replay of w1-03 to w1-05, `embed` blur test rewritten) |
| `npm run test:e2e` (QA, same day, before that) | Run A 60 passed, 4 failed (the first four tests of the run: `__redshift never appeared` after 45 s and two timeouts at 1.5 to 2.9 min: machine starvation at start-up, all later tests passed). Run B **64 passed, 0 failed, 3.8 min**. Run C 63 passed, 1 failed: my own test pressed three different shift-up keys back to back and one press merged (see bugs.md, polish note); fixed by waiting for each gear change. A final pair of runs on the fixed spec was interrupted by two session drops (the log shows 3 failures with "4.0 h" durations, i.e. the machine was suspended; not a game result). The orchestrator's 64/64 is the clean run of record |
| Plain `vite build` | no `__redshift` in `dist/` (`grep -rlw`, orchestrator); the packaged zip has only the unrelated `__redshift_probe__` storage key |
| `npm run typecheck` | clean (QA, 2026-11-04, with the new specs) |

#### M1-35: simulation against the five M1 specs (verdict: PASS)

Evidence: the acceptance suites run through the real `step` and every `describe` is named `<spec> check N`; a script over those names found every numbered check present (movement 1-16, jump 1-12 minus 4, airDrag 1-15, gating 1-16, reset 1-14, colored walls 1-7). The two missing numbers have other homes: movement check 17 (alternate bindings) is e2e `keyboard.spec.ts` (passes), jump check 4 (gravity 37.5, launch 15) is `params.test.ts`. Test counts: movement 21, jump 10, air-drag 16, gating 20, reset 17, colored walls 11, motion lane 34.

| Spec | Checks | Verdict | Evidence |
|---|---|---|---|
| movement-and-gears | 17 | Pass 17/17 | `movementAcceptance.test.ts` (1-16), `motion/acceptance.test.ts`; check 17: `keyboard.spec.ts` (3 up keys, 3 down keys) |
| color-gating | 16 | Pass 16/16 | `gatingAcceptance.test.ts`, `determinism.test.ts` |
| air-drag | 15 | Pass 15/15 | `airDragAcceptance.test.ts`; checks 13-14 also in browser (`keyboard.spec.ts` SB1 to SB3) |
| jump | 12 | Pass 12/12 | `jumpAcceptance.test.ts` (11), `params.test.ts` (4) |
| safe-tiles-and-reset | 14 | Pass 14/14 | `resetAcceptance.test.ts`, `determinism.test.ts` |
| colored-walls (design-lead restated check 6) | 7 | Pass 7/7 | `coloredWallsAcceptance.test.ts`: check 6 at 4 tiles (row 5) asserts first ceiling contact on flight step 15 (so none on 14), vy >= 0 after, vx 6; gear 3 no contact, apex 3.0 on step 24, lands 6.8 out in band 2. Note: the head heights 3.979 and 4.078 are not asserted, only the steps, and a comment above that test still talks about the old 3.5 tiles (sim lane, cosmetic) |

Not verifiable by QA: feel (playtest), 60 fps (no headless measure), hud-gear-meter checks 11 and 12 (greyscale and 3:1 by eye, manual at the gate), check 13 (playtest question).

#### M1-36: side tracks (verdict: PASS, with BUG-4 open and two reviewer items outstanding)

| Track | Accept line | Verdict | Evidence |
|---|---|---|---|
| Storage (M1-16) | never throws; survives reload; blocked storage falls back | Pass | `save.test.ts`, `progress.test.ts` (826-test run above); e2e: the save survives a reload (`win.spec.ts`), replay writes nothing. Browser with storage actually blocked: not run (`main.ts` wiring is M2-40) |
| Bindings (M1-40) | every action bound, no key on two actions, Shift told apart by code, Q/E/Z/X | Pass | `bindings.test.ts`; e2e `keyboard.spec.ts` (six gear keys), `pause.spec.ts` (Esc, P, R) |
| Sticky Keys tip (M1-40, M2-39) | shown once on Windows, non-blocking, not elsewhere | Pass | `stickyKeysTip.test.ts`; e2e `sticky-keys.spec.ts` (3 tests); screenshot of the tip `docs/qa/evidence/package-zip-subfolder-load.png` |
| Packaging (M1-18) | zip loads from a subfolder; no `.env` or secrets; script in `package.json` | Pass | `npm run package` built `release/redshift-0.1.0.zip` (2 files: `index.html` 500 B and one JS, 0.33 MB zipped, 1.29 MB unpacked). Unzipped into `sub/game/` and served under `/sub/game/`: canvas 960x540, no console errors, no 404s, `window.__redshift` undefined. Same sha256 on a second package (`f823b052...9bf9b51`), so it is reproducible. Refused as designed: `VITE_QA_HOOK=1`, `VITE_FOO=1`, `VITE_SUPABASE_ANON_KEY=sb_secret_...` (each printed "package failed" and wrote no zip). No `.env`, key or Supabase string in the bundle; `.env` and `release/` are git-ignored, only `.env.example` is tracked. **Fails the tech-lead ruling** that recordings do not ship: BUG-4 |
| Supabase schema (M1-19) | policies deny anon insert, update, delete; no keys in repo; steps copy-pasteable | Pass (read-through only) | Files exist (`backend/migrations/0001_runs.sql` 92 lines, `backend/tests/0001_runs_rls.sql` 145 lines). The README's table, limits (name 1-24, steps 1..1,000,000, log 200,000 chars), forced RLS, single SELECT policy and column-level SELECT without `input_log` all match the SQL; the test file ends with the documented `ok: all checks for 0001_runs passed` row. **Never run against a database, so not verified.** Open reviewer items (not QA's): security HIGH 1 (`backend/README.md` still tells the owner to paste the service-role key later, step 5 text) and MEDIUMs 6-10 |
| Audio engine and SFX (M1-24, M2-17) | nothing throws before a gesture; mute and bus volumes; ten SFX, clunk unlike shift down | Pass (unit) | `engine.test.ts`, `sfxSpec.test.ts`, `sfxEvents.test.ts`, `sfx.test.ts` all pass (mocked context: no context before a gesture, resume failure and missing Web Audio do not throw, mute, volumes, voice cap; ten ids exist, short, not clipping; the clunk is an octave below and gritty). **Audibility is not verifiable by QA** (no sound output); needs a human listen |

#### Blockers for M1-37 (gate)

- No open blocker or major bug. Open: BUG-4 (minor, releases only; needs the scene change and a package-script check).
- Still to do at the gate by hand: greyscale and contrast look at the gear meter (hud checks 11, 12), a keyboard-only playthrough of w0-02 with Q/E/Z/X, 60 fps read from the F3 overlay, a listen to the SFX.
- Not verified and will stay so for M1: the Supabase SQL against a real database (owner step USER-2), blocked-storage behaviour in a real browser, any non-Chromium browser.

### Run 3: 2026-11-04 (M1-42 closures, M1-50 additions; batch 1 with nine agents editing in parallel)

Machine shared with other agents all session, so wall times are high. Working tree on top of 90453b5 (tech-lead's b432391 fixes in).

| Check | Result |
|---|---|
| `npm run test:e2e` final run | **31 passed, 0 failed**, 3.9 min, 2 workers, port 4173 free (31 tests = 27 from run 2 + 2 shift-buffer tests + replay of the new levels w1-01 and w1-02) |
| `npx vitest run tests/levels` | 8 passed (w0-02 re-recorded by the level designer, still 775 steps) |
| `npx vitest run src/ui` | 7 files, 157 tests passed (includes the new `gearMeter.sim.test.ts`) |
| `npx vitest run tests/arch/qa-hook.test.ts` | 3 passed |
| plain `vite build` into a scratch folder | no `__redshift` in the output (BUG-1 closed) |
| `tsc -p tsconfig.node.json` | e2e files clean; `tests/arch/level-format-doc.test.ts` had syntax errors (unterminated strings, lines 39-41) while tech-lead was editing it; not mine. `npm test`, `npm run check` and `npm run build` were not run (batch instruction) |

Earlier runs the same day, and what they were (nothing here was a game bug):
- **Run 1: 25/29.** `replay` x2 and `embed` iframe: `levels/w0-02.txt` was version 2 (spawn pad opened to the top) while `w0-02.solution.txt` was still the old recording (`tests/levels` failed the same way); the replay never started. The iframe test pressed Space then Right Shift, but with headroom Space is now a full 48-step jump and a shift pressed in the air is dropped by the shift buffer: a test bug, fixed (it waits for touchdown by sim steps first). The fourth failure was my new late-press test, whose watcher counted steps from its own first airborne sample and assumed a frame every step.
- **Run 2: 30/31.** `walkIntoOpenPit` timed out on a machine shared with several other jobs (the same test passed alone in 24 s). Fixed by releasing the walk key inside the page (`holdRightUntilPastX`) instead of from a Playwright poll.
- Two helper lessons recorded in `tests/e2e/helpers.ts`: a watcher armed with an un-awaited `page.evaluate` races the key press (the page may already be mid-jump); and headless frames carry about 3 sim steps, so "5 steps before landing" is only reliable as a velocity trigger (`minVy` 11.5, flight step 43+) with the attempt judged from the samples.

New e2e (keyboard.spec.ts): shift buffer SB1 (press on flight step 10 dropped) and SB2 (press 4 steps before landing buffered in the air, applied on landing). Changed: `embed.spec.ts` asserts the default viewport; no spec calls `test.use`.

Open: none of BUG-1..3 (closed). Test-plan gaps G12 (scene exposes no HUD meter or banner text; request filed) and G11 (no runway for a fast-jump air shift).

### Run 2: 2026-11-03 (e2e batch: parked tests fixed, air-shift check added)

Machine otherwise idle. Build: working tree (no commits yet; the scene lane's HUD gear meter and "Level complete" time banner were already in).

| Check | Result |
|---|---|
| `npm test` (unit + arch) | 49 files, 1055 tests passed |
| `npx vitest run tests/levels` (solvability) | 6 passed |
| `npm run typecheck` | clean |
| `npm run build` | ok (`dist/assets/index-*.js` 1,245.50 kB, gzip 337.29 kB) |
| `npm run test:e2e` | **27 passed, 0 failed, 0 skipped**, twice in a row (2.0 and 2.1 min, 4 workers). The heavy specs also passed 32/32 with `--workers=2 --repeat-each=4` |

What was wrong with the two parked tests:
- **Jump test:** w0-02's spawn has a 0.5-tile ceiling, and the built-in dev room is only used when no level files exist (an unknown `?level=` falls back to w0-02). Fixed by dropping through the blue bridge into the pit (open overhead) and asserting the apex is over 2 tiles from per-frame samples, for Space, KeyW and ArrowUp.
- **Iframe test:** a test bug, not a game bug. The host was `about:blank` + `setContent`; Chrome's Local Network Access check refuses to let it frame `http://localhost` (`net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`), so the frame was a `chrome-error://` page and `window.__redshift` never existed. Now hosted by a routed same-origin page; asserts the frame URL is the game, keys reach it, and the host `scrollY` stays 0.

New or changed: air-shift e2e (3 tests; result: no bug, the selected gear never rises, see bugs.md "Checked, no bug"); replay spec asserts `done` stays true after `won` and `frames >= steps` and documents the `done`/`speed` semantics; smoke spec waits for the hook and uses the console-error fixture; per-spec `EMBED_VIEWPORT` and `TEST_TIMEOUT_MS`; `BOOT_TIMEOUT_MS` 45 s. Flakiness found and removed along the way: setup lag at low frame rates (a death and respawn missed by polling; landing on top of the divider wall at column 7).

Open: BUG-1 (hook in the production build), BUG-2 (config viewport), BUG-3 (4 workers on a busy machine). A `vite preview --port 4199` that qa started for a header check is still running (stopping it was denied by the permission layer); it is harmless and ports 4173/5191/5192 are untouched.

### Run 1: 2026-11-02

_(superseded by run 2 for e2e)_

## 8. Menus, overlays and clarity cues in e2e (added 2026-11-18, batch 6, B6-42)

**How menu scenes are observed.** The QA hook (`window.__redshift`) belongs to the game scene only; it is absent on the title, level select and controls. `tests/e2e/helpers.ts` has an auto fixture (`gameProbe`) that keeps a handle on the `Phaser.Game` (an init script wraps `Phaser.Game` when the bundle assigns `window.Phaser`; `Phaser.GAMES` does not exist in 3.90). With it a spec reads, test-side only and never from product code: `activeScenes` / `pollScenes` (which scenes run), `menuFocus` (focused item or level id), `menuModel` (a menu scene's model as plain data), `resultsPanelUp` (the 0.6 s beat is over), `gameObjects` (the Game scene's display list: frame names, depth, visibility, bitmap text). Nothing in `src` changed for this.

| Spec file | Covers |
|---|---|
| `smoke.spec.ts` | plain load = title only (no hook); `?level=` and `?replay=1` boot the game |
| `menus.spec.ts` | title checks 1-2, 4-11 (PLAY target rules, LEVELS/CONTROLS round trips, storage blocked, Esc inert); controls check 1 and 3; level-select checks 1, 2, 12, 13 (down from world 1 lands on w2-01, then w3-01) and the unlock model; BUG-5 as `test.fail` |
| `pause-menu.spec.ts` | one Esc or P opens Pause and one closes it, nothing re-toggles (review M1); ArrowUp/W/ArrowDown/S, no wrap; sim frozen under Pause and Controls (120 frames each); Pause > Controls > Esc returns to Pause with focus on CONTROLS (controls check 4); R and RESTART; LEVELS returns to level select focused on the level, game stopped, save unchanged (pause check 8); Esc+Space on one frame (check 13, first version); navigation after an R restart |
| `pause.spec.ts` | pause checks 1, 2, 4-7, 10 (rewritten for overlays: checks 5 and 6 no longer tap Space/Enter, which now pick RESUME) |
| `results.spec.ts` | live win opens Results after the beat (first clear, NEXT focused, save written once); Enter goes to the next level; R retries exactly once; Esc and LEVELS open level select focused on the level with its best time; Space held through the win chooses nothing; P and keys in the beat do nothing; last level has no NEXT (see limits); navigation after a retry |
| `win.spec.ts` | updated: banner assertions replaced by the Results time line; replay mode opens no Results |
| `embed-menus.spec.ts` | tall 3000 px host page, game iframe 960x540: arrows, Space, Enter, Esc, WASD never scroll the host or the frame on title, level select, controls, play, Pause, Results (review U1) |
| `clarity.spec.ts` | hint key caps in w1-01, w1-02, w2-01 (text of every cap, present from the first frame, still drawn after a death and R, none in w1-04); "why you fell" ring frames `fx/why/blue/*` on the w1-01 bridge; exit arrow visible on the right edge in w1-04 and hidden in w1-01; reduced motion (door held on `door_0`, ridges do not parallax, ring still drawn; also via the OS setting); reduced effects (no horizon, no stars; plays through a fall and a restart without errors); both on |
| `tandem-scene.spec.ts` | S1-S4 (see `tandem-gate.md`) |

**Not asserted, and why** (human checks stay with the playtester and the owner):
- How anything looks: dither quality, glyph legibility, ring size, colour. Only structure is read (frame names, depths, positions, text).
- The drag **wipe** (`fx/wipe`, `airDrag`) and the death flash: no level in a production build gives a quick deterministic air-drag drop with a readable result, and the wipe image is always in the display list (alpha/frame changes within a few frames). The shared 3-per-second flash budget is unit-tested (`requestFlash`); not seen in a browser by QA. Under reduced motion "no wipe, no flash" is therefore **not verified**; what is verified is the door held, ridge parallax off, ring still drawn.
- Audio (music, SFX, ducking on pause): not observable headless; the owner or playtester must listen.
- The exit arrow on the left, top and bottom edges (tech-lead's list): no shipped level has the exit off screen in those directions; only the right edge (w1-04) is asserted. The twin edge arrow on the left edge is asserted in the dev room (tandem-gate.md S3).
- Last level without NEXT: a live win of w3-05 is a 1364-step run. The test opens the real Results scene with launch data shaped like the game scene's (`nextLevelId` null), so the scene's own handling is exercised, but the game scene computing `null` for the last level is covered only by `resultsModel` / `nextLevel` unit tests.
- Beat (0.6 s of ignored keys): asserted with an in-page keydown at the instant the panel is not yet drawn; on a fast machine the press can land after the beat, and the test then records a note instead of an assertion.
- Sticky Keys card hidden on the win step (results check 14) and the pause-time tip (check 11): needs the tip visible in a Windows user agent flow, not covered.
- Pause during the death freeze (pause check 11): timing-bound, unit-only.
- Level-select greyscale distinguishability (check 15) and 8 px margins (check 16): visual; model/layout unit tests own the numbers.
- 60 fps (G6) still not measured.
