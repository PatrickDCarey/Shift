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
- Last level without NEXT: a live win of w3-05 is a 1389 (v2; v1 was 1364)-step run. The test opens the real Results scene with launch data shaped like the game scene's (`nextLevelId` null), so the scene's own handling is exercised, but the game scene computing `null` for the last level is covered only by `resultsModel` / `nextLevel` unit tests.
- Beat (0.6 s of ignored keys): asserted with an in-page keydown at the instant the panel is not yet drawn; on a fast machine the press can land after the beat, and the test then records a note instead of an assertion.
- Sticky Keys card hidden on the win step (results check 14) and the pause-time tip (check 11): needs the tip visible in a Windows user agent flow, not covered.
- Pause during the death freeze (pause check 11): timing-bound, unit-only.
- Level-select greyscale distinguishability (check 15) and 8 px margins (check 16): visual; model/layout unit tests own the numbers.
- 60 fps (G6) still not measured.

## 9. Batch 7 additions (B7-09, added 2026-11-19; plan only, nothing run yet)

Verification sitting: **B7-14** (wave 3; port 4173 alone, two full e2e runs at most). Hand checks go to the owner (**USER-9**). Kinds: **E** = Playwright e2e, **U** = unit/level test (the owner's; QA only confirms it exists and passes in the suite), **H** = hand.

**Hook dependency.** The restart card checks read a new field `window.__redshift.restartCard` that [scene] is adding. QA assumes `null` when hidden and an object with at least `{ visible, x, y, w, h }` (480x270 screen px) when shown. If the shape differs, the specs are adjusted at B7-14; if the field is missing, R-2 (e2e half) to R-8 are blocked and filed as a bug against [scene].

### 9.1 restart-prompt.md (8 checks)

| ID | Check | How verified | Spec check | Kind |
|---|---|---|---|---|
| R-1 | `sealedPockets` finds exactly w3-02 rows 7-9 cols 10-25, w3-03 rows 7-9 cols 25-34, none in the other 12 levels (w0-02 too); inline-grid cases | Confirm the unit test exists and passes in `npm test`; QA cross-checks the two rectangles by reading the level rows | 1 | U + QA read |
| R-2 | 59 steps no card, 60 steps card; restart or respawn clears and recounts; pause steps do not count; a home body never counts | Unit test present and green. E2E side: after landing in the pocket (R-4), poll `state.step` and `restartCard` every frame; assert null until step - landStep reaches 60, shown within 1-2 rendered frames after | 2 | U + E |
| R-3 | Card 128x38 at 2x since 2026-11-20 (was 64x19), integer px, 8 px margins, clear of the HUD, y 42 when a body is at the bottom, 4 px above the Sticky Keys tip | Unit (placement helper). E2E: from the R-4 hook rectangle assert w = 128, h = 38 (2026-11-20; was 64 and 19), integer x/y, x + w/2 = 240, y + h = 262, no overlap with the HUD rectangle | 3 | U + E |
| R-4 | w3-02 repro: card within about 1 s of landing, centred at the bottom; R clears it on the first frame of the new run; `state.step` near 0 | E2E, `?level=w3-02`, the spec's input script (Right 4.8 s, E, Right 4.5 s, Q, Left 0.9 s, Right 0.75 s, Space) as real key events. **Pass rule (design 2026-11-19, restart-prompt check 4; tech-lead wave 1 Q1):** count sim steps: the card is absent while fewer than 60 consecutive steps have run with the runner's centre in a pocket cell (count starts on the first such step, which can be mid-fall) and visible within 2 rendered frames of the 60th. Not seconds. If the run does not end in the pocket the test fails showing the observed position | 4 | E |
| R-5 | w3-03: solution until the twin is home (step 281), hold Right until runner x >= 26, release; card about 1 s later; pause and resume keeps it; R clears | E2E. Solution inputs to step 281, then poll the hook and release Right on the frame x >= 26. Pause via Esc; assert `restartCard` non-null after resume and `state.step` frozen during the pause | 5 | E |
| R-6 | No false card: w1-01 let go on a bridge (death, respawn); w3-01 both bodies fall; w3-02 won by its solution | E2E: poll `restartCard` every frame through each scenario, assert never non-null; reuse the existing solution/replay helpers | 6 | E |
| R-7 | Same look with reduced motion and with reduced effects on | E2E: R-4 repeated with both settings seeded in the save; assert the hook rectangle equals R-4's and a clipped screenshot of the card rectangle is pixel-equal to R-4's. **One screenshot check:** `docs/qa/evidence/b7-restart-card.png` (default) judged by eye at B7-14: one row, `[R]` cap, word RESTART, bordered panel, centred at the bottom | 7 | E + H (look) |
| R-8 | `?replay=1` with a recording ending in the w3-02 pocket shows the card | E2E if a recording can be built from the R-4 inputs with the existing replay helper; no shipped file holds one. If it cannot be built without a new fixture it is a hand check and reported | 8 | E (or H) |

### 9.2 adaptive-audio.md 13-15 (in-game SFX)

Headless Chromium cannot be heard. Today `src/audio` exposes `audio.state`, `audio.getSettings()` and `audio.activeVoices()` (a count at one instant) and `MusicSnapshot`, but **no record of which cue played**, and the QA hook does not expose the engine. A voice count sampled at poll time cannot show that one particular cue played once. See request A-1.

| ID | Check | How verified | Spec check | Kind |
|---|---|---|---|---|
| A-13 | Per-frame wiring: two steps `[jump]`,`[airDrag]` give jump once then clunk once; no steps nothing; paused nothing; `[home 0, home 1, won]` only the sting | Confirm the fake-engine unit test exists and passes | 13 | U |
| A-14 | A caller of the SFX path exists outside `src/audio` | grep `src/scenes/GameScene.ts` and `src/entities` for the events call; paste the output into the B7-14 report | 14 | QA read |
| A-15a | Each named action produces its cue (w1-02 E and Q; w2-01 jump and land; w1-01 bridge fall-through then reset; R reset; w2-02 clunk; win sting; `?replay=1` the same) | If A-1 is delivered: E2E reads the cue log and asserts names and order per scenario, after a first key press to unlock. If not: hand only | 15 | E (if A-1) else H |
| A-15b | Clunk clearly not the shift-down click; the sounds sound right | By ear, owner (USER-9) | 15 | H |
| A-15c | `audio.state` is `locked` before the first key and `running` after; `activeVoices()` never above 24 over a full w1-02 run | E2E through the page if the engine is reachable (A-1), else skipped | 15 / 12 | E (if A-1) |

### 9.3 onboarding-hints.md 10-11

| ID | Check | How verified | Spec check | Kind |
|---|---|---|---|---|
| H-10 | w1-03 exactly `shiftUp 2 6`; w2-04 exactly `shiftUp 8 4` and `jump 8 6`; w3-03 exactly `jump 12 3`; anchors empty, boxes over empty cells, anchors >= 3 rows above the floor; `version` unchanged; `npx vitest run tests/levels` passes | QA reads the three level headers and grids, and `git diff` for the `version` line; the levels test runs inside the full unit run | 10 | QA read + U |
| H-11a | On a fresh load of w1-03, w2-04, w3-03 the new glyphs are visible on the first frame, and still after a death and after R | E2E, extension of `clarity.spec.ts` (hint key caps already read through `gameObjects`) | 11 | E |
| H-11b | w2-04: `shiftUp` box directly above `jump` box in one column, boxes at least 8 px apart | E2E: compare x and y of the two cap objects: equal x, vertical gap >= 8 | 11 | E |
| H-11c | w3-03: `jump` box in the runner's lane, left of the hanging block | E2E: y inside the runner lane band, x less than the block's x read from the level file | 11 | E |
| H-11d | Scrolled to the far right of w2-04 and w3-03, no glyph passes under the HUD panel | E2E: run the solution and sample every glyph box against the HUD rectangle (screen space) every 10th frame | 11 | E |
| H-12 | Cold playtest of the three hints | Playtester (B7-15), not QA | 12 | H |

### 9.4 settings.md 1-8 (keys only)

| ID | Check | How verified | Spec check | Kind |
|---|---|---|---|---|
| S-1 | SOUND OFF: silent in a level; persists over reload | E2E: flip with keys, read the saved `muted` flag, reload, read again (and `audio.getSettings().muted` if A-1). The silence itself by ear | 1 | E (state) + H (ear) |
| S-2 | REDUCED MOTION ON: no wipe or ring on the w2-02 red takeoff; with the OS flag and no saved value the row reads ON | E2E: row value through `menuModel`; OS flag via `emulateMedia({ reducedMotion: 'reduce' })` on a fresh context with no save, row reads ON. Wipe and ring are not assertable (section 8 limits): hand | 2 | E (row, OS) + H (wipe) |
| S-3 | REDUCED EFFECTS ON: no stars, afterimages, speed lines at red | E2E: flag set through the screen, then `gameObjects` shows no star or afterimage objects (extends the existing reduced-effects test). Speed lines only if distinguishable by frame name, else hand | 3 | E + H |
| S-4 | Esc returns to the title with SETTINGS focused; from pause (if built) back to pause, SETTINGS focused, `state.step` unchanged | E2E: `menuFocus` after Esc. Pause variant only if the pause item ships (Should); otherwise skipped and recorded | 4 | E |
| S-5 | Left/Right Shift, Q, E, Z, X change no row and no focus | E2E: press each, assert `menuModel` and `menuFocus` unchanged | 5 | E + U |
| S-6 | Model flips on Enter, Space, Left, Right; one save write per change; reduced motion with no saved value reads the OS flag | Unit (ui-engineer's), confirm present and green. E2E adds: flip one row, read the stored JSON before and after each key, assert exactly one change | 6 | U + E |
| S-7 | Greyscale: every row's value reads by box shape plus word | Hand, greyscale screenshot `docs/qa/evidence/b7-settings-grey.png`; the model unit test owns glyph and word | 7 | H |
| S-8 | Reachable from boot; every row flipped with arrows/WASD, Enter/Space, Esc only | E2E with no mouse calls: boot, title, SETTINGS, flip each row twice, Esc. A second run with storage blocked: toggles still work for the session | 8 | E |

### 9.5 pause.md 13 and the dropped-key edge case

| ID | Check | How verified | Spec check | Kind |
|---|---|---|---|---|
| P-13 | Space and Esc on one frame: pause opens; after RESUME (Space released first) no jump, `state.step` and `vy` as before the pause | E2E: one `page.evaluate` dispatches both keydowns in the same task (the technique of the existing Esc+Space test in `pause-menu.spec.ts`), release Space, resume, step a few frames, assert vy unchanged and the body still on the floor | 13 | E |
| P-13b | Closing frame: Space pressed with the closing Esc never reaches the sim | E2E, same helper reversed (rule text: "nothing pressed with the closing Esc reaches the sim") | rule | E |
| P-13c | Held keys still follow the held rule: Right held through open and close keeps running | Existing check 4; confirm it still passes | rule | E (existing) |
| P-13d | **Dropped-key edge case:** a key that goes down on the opening frame and is still held at resume | E2E asserting the literal reading: dropped until released and pressed again (see ambiguity in 9.8) | rule | E |
| P-13e | Other overlay frames: a key pressed on the win step does not reach Results; Controls round trip | Existing results and pause-menu specs; confirm green | rule | E (existing) |

### 9.6 BUG-5 and BUG-6

| ID | Check | How verified | Kind |
|---|---|---|---|
| B5-1 | BUG-5: with a save holding w1-01 cleared, title Down, Enter opens level select focused on the `playTarget` (w1-02) | At B7-14, remove `test.fail()` from `tests/e2e/menus.spec.ts` only once the fix is landed; the test must then pass in both full runs. If the fix has not landed, leave the marker and report | E |
| B5-2 | Other save shapes: fresh save opens on w1-01; all cleared opens on what `playTarget` returns (null falls back to w1-01) | Small extension of B5-1 using the existing save seed helper | E |
| B6-1 | BUG-6, one failed load recovers: no black screen | New `tests/e2e/boot-retry.spec.ts`. `page.route` on the `pixel-*` image URLs (pattern confirmed from the build output) aborts the first request of one texture (counter in the handler), then `route.continue()`. Expect the Title scene reached (`pollScenes`), a non-black canvas screenshot, and no console error other than the allow-listed loader warning for that URL | E |
| B6-2 | BUG-6, failing twice shows `COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.` | Same spec, `route.abort()` for every request of that texture. Expect the message text (read through `gameObjects` if it is bitmap text, else DOM text), Title never reached, and a bounded request count (no endless retry) | E |
| B6-4 | BUG-6 real signature: every `pixel-*.png` XHR returns a 200 with a 0-byte blob; Boot recovers over `<img src>` on attempt 2 | `boot-retry.spec.ts`: init script overrides `XMLHttpRequest.prototype.response` for blob responses of `/pixel-.*\.png/`. Title reached, no `#boot-error`, exactly one console warning matching `Boot: ... loaded on attempt 2` (printf-style args joined by the test) | E |
| B6-3 | Normal boot unaffected | Existing smoke spec, plus one assert that no asset URL is fetched twice on a clean boot | E |

### 9.7 Automate at B7-14, and hand checks for the owner (USER-9)

**Automate at B7-14** (two full runs at most; each new spec is first run alone with `--grep`, so no extra full runs): R-2 (e2e half), R-3, R-4, R-5, R-6, R-7 (state and clip compare), R-8 (if a recording can be built), H-11a to H-11d, S-1 (state half), S-2 (row, OS flag), S-3, S-4, S-5, S-6 (e2e half), S-8, P-13, P-13b to P-13e, B5-1, B5-2, B6-1 to B6-3; A-15a and A-15c only if request A-1 is delivered.
**QA reads or greps, no new test:** R-1 and A-13 (unit tests exist and pass), A-14, H-10.

**Hand, owner (USER-9):**
- A-15b, and the audible halves of A-15a and S-1: every SFX heard, the clunk clearly not the shift-down click, SOUND OFF silent before and after reload, `?replay=1` plays the same sounds.
- Visual halves of S-2 and S-3: wipe and ring gone under reduced motion; stars, afterimages and speed lines gone under reduced effects.
- S-7 greyscale legibility; the look of the restart card (QA captures the screenshot, the owner judges it).
- H-12 stays with the playtester (B7-15). 60 fps (G6) is not measured in this batch.

### 9.8 Ambiguous or untestable as written (for design-lead)

- restart-prompt 4: "the card shows within about 1 s of landing". The rule is 60 sim steps, so the test asserts 60 steps plus 1-2 rendered frames. Say whether the tolerance is frames or seconds.
- restart-prompt 5: "until the runner is wholly on its blue bridge (x >= 26)". Which body, and which edge of it: assumed the runner's `x` in tiles from the hook.
- restart-prompt 7: "the card looks the same". A look check; e2e proves only equal rectangle and equal clipped pixels.
- restart-prompt 8: "a recording that ends with the runner in the w3-02 pocket". No such recording ships and the spec does not say who produces it.
- restart-prompt placement: "If that would overlap any non-home body's sprite on screen" needs a body at the bottom of the view; no level does it, so unit only.
- adaptive-audio 15: "plays the shift up and shift down clicks" is by ear only without a cue log (A-1).
- settings 3: "no stars, afterimages or speed lines" is assertable only if each has a distinct display-list name.
- settings 4: "From pause (if built)" is conditional; skipped and recorded if the pause item is not built.
- pause 13 and the edge case: "Keys pressed on the frame the pause opens or closes ... are dropped" versus "Held keys still follow the rule above" (held through a pause counts as held after resume). A key down on the opening frame and still held at resume fits both. P-13d asserts "dropped until released and pressed again" (the Space example). If the other reading is meant, Right held with Esc keeps running after resume.
- onboarding 11: "left of the hanging block": no reference point given; assumed the block's column in the level file.

### 9.9 Requests to other owners (the requester adds the line to `docs/production/requests.md`; QA does not edit it)

- **A-1, audio-designer:** an inspectable record of played cues, for example `audio.debugCues()` returning the last 64 `{ cue, body?, atMs, audible }` (recorded where `sfx` schedules a tone, also when muted or locked). It must be reachable from the page under the `VITE_QA_HOOK` guard only, either as `window.__redshift.audio = { cues, state, activeVoices, settings }` (with [scene]) or as `window.__redshiftAudio`. Without it A-15a, A-15c and the state half of S-1 are hand checks.
- **A-2, gameplay-engineer [scene]:** `window.__redshift.restartCard`: `null` when hidden, else `{ visible: true, x, y, w, h }` in 480x270 screen px. Confirm the shape before B7-14.
- **A-3, tech-lead (BUG-6 fix):** state the asset URL pattern, the retry count, and where the failure message is drawn (Phaser bitmap text so `gameObjects` can read it, or a DOM element with an id). Otherwise B6-2 reads pixels.
- **A-4, design-lead:** answer the dropped-key ambiguity and the "x" in restart-prompt 5; name who records the restart-prompt 8 recording (level-designer) or drop to hand.

### 9.10 B7-14 results (written as each spec went green, 2026-11-20)

Single-spec runs first (`npx playwright test <file>`); the two full runs are at the end of this section.

| IDs | Spec | Result | Evidence / notes |
|---|---|---|---|
| R-1 cross-check | `restart-card.spec.ts` "pocket rectangles match the level files" | **Pass** | w3-02 rows 7-9 cols 10-25, w3-03 rows 7-9 cols 25-34 read from the level rows. Unit test is the owner's. |
| R-2 (e2e), R-3, R-4 | `restart-card.spec.ts` w3-02 first test | **Pass** (alone) | Every rendered frame sampled in the page; card absent while < 60 pocket steps, shown within 2 frames of the 60th; 64x19, integer, x + w/2 = 240; y + h = 262 or y = 42 (see note); R: first frame of the new run has no card and step <= 30. Evidence `docs/qa/evidence/b7-restart-card.png`. **Note:** the run is put in the pocket by a position-driven script (hold Right, jump at the kerb, release Right once the twin is on pad Q), not the wall-clock key script of the playtest; same end state. The card y varied between runs (243 and 42): the twin's sprite sits under the bottom spot, so the "body overlaps, use y 42" rule fires. Allowed by the rule; the owner may look at both. |
| R-5 | `restart-card.spec.ts` w3-03 | **Pass** (alone) | Scripted solution shape (stand, 3 shifts, sprint, jump at x >= 12.2, hold Right), released at runner x >= 26; card per the 60-step rule; Esc/Esc keeps it in the same place with `state.step` frozen; R clears it. |
| R-6 | `restart-card.spec.ts` no false card | **Pass** (alone) | w1-01 death and respawn, w3-01 both fall, w3-02 solution replay: `restartCard` never non-null on any frame (page-side watcher from boot). |
| R-7 | `restart-card.spec.ts` check 7 (reduced motion, reduced effects) | **Pass** (alone) | Same x and size; clipped pixels of the card rectangle equal to the default run (card panel is opaque). Look check by eye: owner (USER-9). |
| R-8 | `restart-card.spec.ts` (hand marker) | **Not automated: hand** | No shipped losing recording; replay loads only `levels/<id>.solution.txt`. Ruled a hand check 2026-11-19. |
| H-11a to H-11d | `hints-b7.spec.ts` (7 tests) | **Pass** (alone) | Glyph labels on first frame, after R and after a death (w1-03, w2-04) or after R (w3-03). Boxes are derived from the BitmapText labels (caps are Graphics and not readable): w2-04 shiftUp box ends 8 px above the jump box, same column 8; w3-03 jump box inside the runner lane and left of x = 256 px; along the solution replay (every 10th frame) no label overlaps the HUD panel 5,5,110x32. |
| B6-1 to B6-4 | `boot-retry.spec.ts` | **Pass** (alone, 3 repeats; B6-4 added after the 3-attempt retry change) | Decode failure of `pixel-player` on the first request: Title opens, one `Boot:` warning, no `#boot-error`, canvas has content. Always corrupt: `#boot-error` text exactly `COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.`, `role=alert`, no hook, at most 3 requests of the sheet (XHR, then two `<img>` retries after 500 ms and 2 s) and no more after 2 s (the console errors are expected and cleared in that test). Clean boot: no `/assets/` URL fetched twice, no `Boot:` warning. |
| B5-1, B5-2 | `menus.spec.ts` (BUG-5 test, no `test.fail`; two new cases) | **Pass** (alone) | Cleared w1-01: LEVELS opens on w1-02; fresh save: w1-01; all cleared: the title model's `playTargetId` (or w1-01 if null). BUG-5 closed below after the full runs. |
| S-1 (state), S-2, S-3, S-4, S-5, S-6, S-8 | `settings.spec.ts` (8 tests) | **Pass** (alone) | S-1 muted saved and kept over reload, row reads OFF; S-2 OS flag with no save reads ON, first flip saves `reducedMotionChosen`; S-3 horizon and stars hidden in the next level; S-4 title (Esc to SETTINGS focus) and pause (SETTINGS before LEVELS, Esc back to pause, `state.step` unchanged); S-5 six gear keys change nothing and write nothing; S-6 Enter/Space/Left/Right each one write and one changed field (`reducedEffects`); S-8 keys only, storage blocked. Known deviation W7 (pause changes apply at next level start) not tested. |
| P-13 (existing), P-13b | `pause-menu.spec.ts`, `pause-keys.spec.ts` | **Pass** | Space down with the closing Esc never jumps, even when still held after resume. |
| P-13d / pause 14 | `pause-keys.spec.ts` | **Pass (BUG-7 fixed, 4a28931)** | Right down with the opening Esc and held at resume does not run the player. `test.fail()` marker gone; passes in the 2026-11-20 post-fix full run. (B7-14 found it failing: `vx` 3, expected 0.) |
| P-13c, P-13e | existing `pause.spec.ts`, `results.spec.ts`, `pause-menu.spec.ts` | **Pass** | existing `pause.spec.ts` (held key keeps running), `results.spec.ts` and `pause-menu.spec.ts` green in both full runs. |
| A-15a, A-15c (partial), S-1 (audible half) | `audio-cues.spec.ts` (6 tests) | **Pass** (alone) | w1-02 E, Q: shiftUp, shiftDown; w2-01 jump, land; w1-01 fallThrough, reset, R gives reset; w2-02 replay: shiftUp x3, jump, airDragClunk, land, levelComplete (cues before the first key inaudible, after it audible); live win: one levelComplete; muted: requested, none audible. **Not done:** `activeVoices() <= 24` and `audio.state` (not on the hook). By ear (A-15b): owner. |

**Full runs** (`npm run test:e2e`, production build with the QA hook, 2 workers, port 4173 alone):

| Run | Result | Time | Failures |
|---|---|---|---|
| 1 | 188 passed, 2 failed, 5 skipped | 7m02s | `embed-menus.spec.ts` (menus in an iframe) and `pause-menu.spec.ts` (LEVELS, pause check 8): both stale key counts, since batch 7 put SETTINGS into the title (4th) and pause (before LEVELS) lists. Test bugs, fixed in `tests/e2e/`; both pass alone and in run 2. |
| 2 | 187 passed, 3 failed, 5 skipped | 6m50s | `audio-cues` "live win of w1-01", `restart-card` "check 7 reduced effects", `tandem-scene` "S4 greyscale": all `window.__redshift never appeared`, every pixel sheet failing decode twice (BUG-6 still present, see bugs.md). Re-run alone once (the three spec files together): all 3 pass (17 passed, 3 skipped). |

**Post-fix run (2026-11-20, after the BUG-7 fix and the BUG-6 3-attempt retry, uncommitted):** `npm run test:e2e`: 190 passed, 1 failed, 5 skipped, 15.3m (playtester sitting on port 5191 loading the machine). Failure: `restart-card` w3-03 check 5 ("restarted" predicate timed out after R, 20 s). Re-run `--last-failed --workers=1`: passed (12.1s). No boot failure in the run. `boot-retry.spec.ts` alone: 4 passed, and 12 of 12 with `--repeat-each=3`.

Differences between runs: the three BUG-6 boot failures appeared only in run 2; the two stale-key failures only in run 1 (fixed before run 2). The 5 skips are the dev-server-only tandem rooms and two `tandem.spec.ts` stubs, as before. BUG-7's test is `test.fail()` and counts as passed.
`npm run package -- --out <scratch>`: packaged 11 files, zip 0.40 MB; the zip holds `LICENSES.txt`, `index.html`, `assets/`; the only `__redshift` text in the bundle is `__redshift_probe__` (the storage probe key), no hook (whole-word check in `scripts/lib/checks.mjs`).
**Not done:** `activeVoices() <= 24` and `audio.state` (not on the hook); R-8; A-15b; visual and audible halves; 60 fps; the BUG-4 question of recordings in the zip was not re-examined.

## 10. Batch 8 results (B8-08 and B8-09, 2026-11-20, HEAD e60c755 plus uncommitted batch 8 changes)

New spec `tests/e2e/batch8.spec.ts` (13 tests) and helper `tests/e2e/b8-replay.ts` (per-frame sampler over `?replay=1`). Changed: `restart-card.spec.ts` (128x38, evidence `docs/qa/evidence/b8-restart-card-2x.png`, the "restarted" wait now uses `watchSteps`/`minStepSeen`), `hints-b7.spec.ts` (w3-03 now has `shiftUp` and `jump`), `settings.spec.ts` (header comment: W7 landed). Old `b7-restart-card.png` (1x card) deleted.

| Check | Spec | Result | Notes |
|---|---|---|---|
| restart-prompt 3 (R-3, R-7) | `restart-card.spec.ts` w3-02 first test, check 7 x2 | **Pass** | Hook rectangle 128x38, integer, x + w/2 = 240, y + h = 262 (or y = 42 under the HUD); clear of the HUD; reduced motion and reduced effects: same rectangle and pixel-equal clip (clipped at 2x from the hook). The 2 px outline is judged by eye on `b8-restart-card-2x.png`; the hook does not expose it. |
| restart-prompt 4 (R-4, R-2) | same | **Pass** | 59 pocket steps no card, 60 shows it within 2 frames; R clears it on the first frame of the new run. |
| restart-prompt 5 (R-5, the w3-03 pocket) | `restart-card.spec.ts` w3-03 | **Pass** (full run 1 and alone) | Open since batch 7: it was the one failure of the B7 post-fix run (the "restarted" wait, a poll that misses a 0.5 s window). That wait is now frame-sampled. Card until the runner is in the pocket, kept over pause and resume, cleared by R. |
| restart-prompt 8 | hand marker | **Hand** | unchanged (no losing recording). |
| tandem S5 | `batch8.spec.ts` S5 | **Pass** | w3-04 recording, every frame with both bodies not home (about 300 frames): both sprites wholly inside 480x270, no overlap with the HUD rectangle (5,5,110,32), no `hud/edge/runner|twin` arrow. At the let-go (step 262): runner x 21.48, twin x 38.9 (17.4 apart; 40.1 once braked), max apart in the run about 18 tiles; the 28-tile limit itself is only reachable in the dev room (S1-S3 stay dev-server only). |
| tandem S6 (camera) | `batch8.spec.ts` S6 | **Pass** | From step 354 to 396 the twin is wholly on screen and clear of the HUD, no edge arrow, the parked runner is off screen (intended). |
| tandem S6 (HUD strip) | `batch8.spec.ts` "S6 HUD" | **Pass** (B9-04, HEAD 50eb482) | A home glyph is on screen on every frame from step 356 to the twin's win. BUG-8 closed (fixed in 5321e78); was FAIL in batch 8. |
| park pan | `batch8.spec.ts` S5/S6 test and "park pan under reduced motion" | **Pass** | Default: scrollX 464 to 576 (the level's right clamp) over 6 frames, about 112 ms, 9,15,19,22,23,24 px per frame, never backwards, no one-frame snap; the pan itself is 250 ms of focus, which the clamp shortens. Reduced motion: the whole move in one frame. R3 (pan cancels on respawn) is covered by the owner's unit test only; replay R does not emit the restart event. |
| hints 10 / 13 | `tests/levels` (`hints.test.ts`, owner's), `levels-hints.spec.ts` | **Pass** | Exact header placements are pinned in `tests/levels`. |
| hints 11 / 14, w3-03 and w3-04 | `batch8.spec.ts` "hints 11/14" x2 | **Pass** | First frames: exactly `R⇧ E X ▲` and `SPACE W ↑`; both boxes on screen, clear of the HUD; shiftUp at column 2 (box inside cols 1-3, the runner's x 1.5 is in them), jump at column 12 and left of the block (col 16). Note: the drawn glyph is centred on col 2 (px 40), so it sits about 12 px right of the runner's centre at spawn. |
| hints 13 / 14, w3-05 v2 | `batch8.spec.ts` "hints 14 w3-05 v2"; `tests/levels/hints.test.ts` (owner's, header placements) | **Pass** (B9-04, HEAD 50eb482) | Three glyphs on the first frame. At step 986 (both bodies held at x 36.375): shiftUp box spans the step face (576 px) and sits over both bodies, the second jump box is ahead of them with its right edge left of the kerb (720 px), both on screen and clear of the HUD. Screenshot `docs/qa/evidence/b9-w3-05-step-glyphs.png`. v1 (step 725, kerbs) superseded; its screenshot `b8-w3-05-kerb-glyphs.png` is v1 evidence only. |
| settings 1 | `settings.spec.ts` S-1 | **Pass** (full run) | survives a reload. |
| settings 2 | `batch8.spec.ts` "settings 2 w2-02" x2, `clarity.spec.ts` door and ridges | **Pass** | w2-02 recording: the screen wipe is drawn with defaults and on 0 frames with reduced motion; door held on door_0, ridges still. The ring is a Graphics object and cannot be read; not asserted. |
| settings 3 | `settings.spec.ts` S-3, `clarity.spec.ts`, `batch8.spec.ts` PT-3 | **Pass** | horizon and stars hidden. |
| settings 4 (W7) | `batch8.spec.ts` x3 | **Pass** | From pause: SETTINGS, flip, Esc, RESUME: horizon and stars are gone on the first frames, `levelId` and `step` continue (no reload), still gone after R; REDUCED MOTION holds the door on door_0 after RESUME and after R; the pause menu RESTART path also applies it. Not covered: R3/R1/R2 leftovers (in-flight effects and the rebuilt tip), which are under 0.3 s and owner unit-tested. |
| PT-3 why you fell, reduced effects | `batch8.spec.ts` PT-3 x2 | **Pass** | w1-01 fall through blue bridge 1: the same three frames `fx/why/blue/bold, hold, fade` with defaults and with reduced effects. |

**Full run 1** (`npm run test:e2e`, port 4173 alone, 2 workers, 23.3 min, the machine was loaded by another agent's package dry run): 195 passed, 9 failed, 5 skipped. Failures: (1) BUG-8 test (real); (2) `hints-b7` H-11a w3-03: stale expectation after batch 8 added `shiftUp` to w3-03 (test bug, fixed); (3) `restart-card` w3-02: the "restarted" wait missed the 0.5 s window (the same test-side flake as the B7 post-fix run; the wait is now frame-sampled); (4) to (7) `menus` x3 and `pause-menu`: `ERR_CONNECTION_REFUSED`, `ERR_CONNECTION_RESET` and `ERR_NETWORK_ACCESS_DENIED` while loading `localhost:4173` (the preview server stopped answering for a stretch around tests 108-119; cause not found, not a game failure); (8) `audio-cues` A-15a "the win sting is audible after the key" and (9) `pause` blur "20 more steps" timeout (load).
**Rerun** (`--last-failed --workers=1`, run after the two test fixes above): 8 passed, 1 failed (the BUG-8 test). Then `restart-card` + `hints-b7` whole files: 16 of 16. No second full run was made (the edits after run 1 are to those two files only).

**B8-09 / BUG-6 observation:** across run 1 (209 tests), the rerun, the spec runs above and 3 boots of the unzipped release build (plain, `?replay=1` x2), the log search found no `loaded on attempt` warning, no `#boot-error`, no `Failed to process file` and no `window.__redshift never appeared`. About 330 page boots in total. BUG-6 stays "fixed, pending observation". BUG-4 closed against the zip (sha256 `657135ba2a9bf88f8540732a238078b84757b0a6e8d840d31f71bb10e490a164`).


## 11. Batch 9 results (B9-04, 2026-11-23, HEAD 50eb482 plus uncommitted QA spec edits)

w3-05 v2 (run-up step, recording wins at step 1389; v1 was 1364).

| Check | Evidence | Verdict |
|---|---|---|
| onboarding-hints 13 (w3-05 v2 headers) | `tests/levels/hints.test.ts` (owner's; with `sealedPockets` and `tests/levels`: 5 files, 127 tests green) | **Pass** |
| onboarding-hints 14 (v2 addendum, step 986) | `batch8.spec.ts` "hints 14 w3-05 v2"; `docs/qa/evidence/b9-w3-05-step-glyphs.png` | **Pass** |
| restart-prompt 1 (no sealed pocket in w3-05) | `src/entities/sealedPockets.test.ts`; `restart-card.spec.ts` "the pocket rectangles ... match the level files" | **Pass** |
| w3-05 replay wins at 1389 | `replay.spec.ts` "replay of w3-05 wins on step 1389"; direct `runInputLog` check, `wonAtStep` 1389 | **Pass** |
| tandem S6 HUD (runner home glyph when parked) | `batch8.spec.ts` "S6 HUD" | **Pass**; BUG-8 CLOSED |
| results.spec last level, no NEXT | launch data now `steps: 1389` | **Pass** |

Spec changes: `batch8.spec.ts` hints 14 now samples step 986 through a shared `sampleW305`/`checkW305Boxes` (v1's step-725 sample removed); `results.spec.ts` 1364 to 1389; `tandem-scene.spec.ts` check 3 read the old private `gearMeter`/`twinMeter` fields, which 5321e78 moved into `GearMeters` (`scene.meters.runner`/`.twin`): a stale test, not a game bug, fixed. No other w3-05 v1 dependency in `tests/e2e`.

**Full run 1:** 209 tests, 201 passed, 3 failed, 5 skipped, 11.0 min. Failures: `tandem-scene.spec.ts:65` (stale test, above; failed again in the rerun, passes after the fix); `batch8.spec.ts:324` settings 4 REDUCED EFFECTS and `pixel.spec.ts:79` 2x blocks (both passed in the `--last-failed --workers=1` rerun: flakes under 2-worker load). No second full run. After the fix, `tandem-scene.spec.ts` alone: 2 passed, 3 skipped (dev-server only).

BUG-6: about 209 page boots in run 1, 3 in the rerun and 5 in the tandem-scene file, with no `loaded on attempt` warning and no `#boot-error` outside the tests that inject it. The two flakes above are not boot failures (both booted).

## 12. B9 input measurements (design-lead line of 2026-11-23, run 2026-11-23, HEAD 7bd6dea)

Build: the QA-hook e2e build (`VITE_QA_HOOK=1`, served by `npm run test:e2e`'s own build on port 4173), because step counts need `window.__redshift`; the packaged zip has no hook. Same game code as `redshift-b9.zip` (no code change since). Spec: `tests/e2e/b9-input.spec.ts` (5 tests; run alone with `npx playwright test tests/e2e/b9-input.spec.ts --workers=1`; green: M1 x2 twice, M2 and M3 once each). Numbers: `docs/qa/evidence/b9-input-measurements.json`; one frame after respawn: `docs/qa/evidence/b9-m2-after-respawn.png`. Headless Chromium runs the game at about 25 render frames per second (2-3 sim steps per frame), so step numbers below are frame-resolution (+-2 steps); the sim steps are fixed 60 Hz.

| Item | Result | Evidence |
|---|---|---|
| 1. Three E taps (90 ms down, 90 ms gap, standing) then hold Right: twin red before col 8 | **Pass.** w3-05 and w3-03, each at fresh load with the Sticky Keys tip showing (Windows platform, empty save), after a death respawn, and after R: gears 4/4 after the taps, twin band 4 (red) at x 4.73 and at x 8, no death. E shifted under the tip; it was not swallowed. 12 of 12 sequences. | `M1 w3-05`, `M1 w3-03` in the JSON |
| 1b. First step after respawn at which a tap registers | **No dropped tap.** Taps fired when the first post-respawn state was observed (step 0 to 10; armed at step 0, 0, 1, 2, 3, 5, 8) registered 7 of 7 times, in the next render frame (observed at step 2 to 11). Finer than a frame cannot be read from the hook; by the sim (`respawnState` records held buttons as prevInput, the next step reads input) the first step after the respawn step takes a press. A key that went down during the freeze and is still held at respawn is not a new press (by rule). | `M1 onset after R (w3-05)` |
| 2. Death-to-control, w3-05, twin walked off its red runway at gear 1, Right held | **Pass, about 0.9 s against the 1.5 s target.** 9 deaths over 3 fresh loads: last grounded twin step to the first step a body moves after respawn 891-958 ms wall, worst 57 sim steps (950 ms at 60 Hz) = fall about 28 steps + freeze 24 + respawn 1 + 2-3 to move. First death of a load is no slower (908, 958, 913 ms). | `M2 w3-05 death-to-control` |
| 3. R during the death freeze with Right held | **Pass.** 36 trials (R at 40, 120, 250, 350 ms into the freeze; Right held throughout, pressed with R, or pressed just after R); 28 had R land inside the freeze. In all 19 where Right was down at the respawn, a body moved within 35-59 ms (2-3 frames); 0 lost. The 9 where Right came just after the respawn moved within 69-121 ms. R to respawn 17-72 ms. | `M3 R in the death freeze` |

Not reproduced: the batch 9 tester's presses ignored after respawn, a 3 s death loop, or a held key lost after R. Most likely causes are the tester's harness (about 55 fps with jitter, harness crashes) and taps made during the freeze (dropped by rule). No defect filed.

Spec notes: the freeze is about 430 ms, shorter than `expect.poll`'s default back-off, so the spec waits for `dead` with `waitForFunction({ polling: 10 })` over a log the in-page recorder keeps. Two analysis bugs found on the way (respawn matched by `step <= 1`, which a frame can skip) are fixed in the spec; the 4 s outliers seen in the first M2 runs were that bug, not a game stall.
