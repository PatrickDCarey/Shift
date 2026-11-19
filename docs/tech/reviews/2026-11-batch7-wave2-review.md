# Review: batch 7 wave 2 (commit `a94b315`, B7-13)

_Reviewer: tech-lead, 2026-11-19. Read with `git diff 6a8aad3..a94b315`, against `CLAUDE.md`, `architecture.md`, `settings.md` and the wave 1 review (`2026-11-batch7-wave1-review.md`). Single-path runs after my fixes: `tests/arch` (611), `src/ui` (325), `src/entities` (258), `src/save` (85), `src/scenes` (17, of which `bootLoad.test.ts` 12, +3 new), `scripts/lib/licenses.test.ts` (6): all green. `npm run typecheck` clean. Not run by me: `npm run check`, coverage, build, e2e, package (orchestrator's). Nothing was looked at in a browser; the look, sound and timing are QA's (B7-14)._

Severity follows `~/.claude/rules/common/code-review.md`: **Approve** means no CRITICAL or HIGH finding.

## Verdict: **Approve** (with fixes made in this sitting)

| Area | Files | Verdict | Findings |
|---|---|---|---|
| SFX wiring, audio hook, parallax, motion prefs, wave 1 S1..S4 ([scene], B7-10) | `GameScene.ts`, `src/entities/{debugHook,BackdropView,motionPrefs,restartCard,RestartCardController,GameHud}.ts`, tests | **Approve** | W5, W6 (LOW) |
| Settings screen, save field, tip constant (ui, B7-11) | `src/ui/{settingsModel,panelDraw,menuFlow,titleModel,menuNav,pauseModel,stickyKeysTip,StickyKeysTipView,index}.ts`, `src/scenes/{SettingsScene,menuScenes}.ts`, `src/save/schema.ts`, tests | **Approve** | W1 (MEDIUM), W2..W4 (LOW), W7 (LOW, design) |
| Licence notices in the zip (backend, B7-05 request) | `scripts/lib/licenses.mjs`, `scripts/package.mjs`, test | **Approve** | W8 (LOW, optional) |
| `BootScene` audio call (ui edit in my file) | `src/scenes/BootScene.ts` | **Kept, guarded by me** | F1 |

**Count:** CRITICAL 0, HIGH 0, MEDIUM 1 (W1), LOW 7 (W2..W8). Fixed by tech-lead this sitting: F1..F4.

## Checked and fine

- **Determinism.** No change touches `src/core`. `playStepEvents` and `music.update` read the frame's events after the steps ran; `bodiesOf(...).map(b => b.band)` reads state. No `Math.random`, `Date` or wall clock added; `performance.now()` stays in the debug cue log (render side). Settings are read in `create()` and never reach the sim.
- **Lanes and imports.** `src/entities` importing `STICKY_TIP_PANEL_TOP` from `../ui` (the barrel) is allowed: the lane rule (`CLAUDE.md`, `core-purity.test.ts`) restricts imports of `src/core` only, and entities already import the ui barrel (`DEFAULT_BINDINGS`, `GEAR_METER_LAYOUT`). This is exactly the S2 fix asked for. No cycle: nothing in `src/ui`, `src/audio`, `src/fx` or `src/save` imports `src/entities` or `src/scenes`. `SettingsScene` (a scene) importing `entities/motionPrefs` is fine. `restartCard.ts` now imports `./GameHud`, which imports Phaser as a type only.
- **QA hook.** `audio: { cues }` sits on the hook object, which reaches `window` only under `QA_HOOK` (`debugHook.ts:66`); `installDebugHook` itself is called only under `QA_HOOK` (`GameScene.ts:167`). `tests/arch/qa-hook.test.ts` green. Shape matches audio-designer's B7-10 request (`cues()` = last 64 `{ cue, body?, atMs, audible }`). QA's A-1 also floated `state`/`settings`; those are not exposed, so the S-1 state half stays a hand check, but `audible: false` on a muted cue is enough evidence for settings check 1.
- **Wave 1 findings.** **S1 fixed**: a new stay starts at 1 and only a continuing stay adds the frame's steps (`restartCard.ts:136`); the reset frame counts nothing (`:118-121`). Tests are the ones asked for: fresh model `frame(30)`, `frame(88)` null, `frame(89)` card, plus the 5-step entering frame (`restartCard.test.ts:93-106`). **S2 fixed** (`STICKY_TIP_PANEL_TOP`, pinned to 212 by `stickyKeysTip.test.ts`, so a drift fails). **S3 fixed** (`bodyPocket(..., playerHeightTiles)`, with a 6-tile body case). **S4 fixed** (`HUD_BOTTOM` derived in `GameHud.ts:31` and reused for the messages; `VIEW` from `VIEW_W`/`VIEW_H`).
- **Parallax.** `BackdropView` reads `RIDGES[layer].parallax` (B7-08 data), the local copy is gone; gated by `modes.ridgeParallax` as before.
- **Save.** `reducedMotionChosen` is additive with a `false` default, read field by field (`schema.ts:100`); a v1 save without it reads `false`, so reduced motion follows the OS exactly as before. No code before B7-11 ever wrote `reducedMotion: true`, so moving from "saved OR OS" to "chosen ? saved : OS" loses nothing. No version bump needed; the rule is now written down in `architecture.md` §9 (see W3 for the missing test).
- **Sizes.** `GameScene.ts` 376 lines (limit ~400; 24 left). `settingsModel.ts` 128, `menuFlow.ts` 155, `restartCard.ts` 143, `BootScene.ts` 174. No function over ~50 lines; nesting ≤ 3.
- **Tests test behaviour.** `settingsModel.test.ts` drives the model through intents (Enter/Space/Left/Right flip, Up/Down move without wrap, Esc/BACK, gear keys produce no intent), counts storage writes per change (exactly one), checks the engine receives mute, and covers blocked storage. Menu tests updated for the fourth title item and the fifth pause item, including the 160x140 panel bound. `licenses.test.ts` checks each failure mode and runs the check against the real `node_modules` licence files.
- **Magic numbers.** New layout constants (`LABEL_X`, `VALUE_X`, `ROWS_Y`, glyph 9) are the spec's layout numbers, in the ui lane, not gameplay or colour; fine.
- **Secrets.** None. `licenses.mjs` names the copyright holders from the licence files.

## `settings.md` checks 1–8 (code reading; QA verifies at B7-14)

1. **Mute, then reload.** SOUND flip → `applySettingsAction` saves once and pushes `muted` to the engine at once. Saved settings are pushed again in `BootScene.create` (before any gesture) and `GameScene.create` (every level start). Code path complete; by ear is QA's.
2. **Reduced motion.** First open with the OS set and nothing saved shows ON (`shownReducedMotion`, unit tested). In play, `motionPrefs.reducedMotion` uses the same rule; both read at level start. See W7 for the pause case.
3. **Reduced effects.** `effectModes({ reducedEffects, ... })` in `GameScene.create`. The restart card and why-you-fell cue do not read it. Visual check is QA's.
4. **Back.** `settingsReturn` gives title + focus SETTINGS, or pause + its data + focus SETTINGS. Game stays frozen underneath (same route as CONTROLS). `settingsReturn` itself has no direct unit test (W2).
5. **Gear keys inert.** `resolveIntent` gives `none` for Shift L/R, Q, E, Z, X (tested).
6. **Unit.** Present and behavioural (above).
7. **Greyscale.** ON = 9x9 frame plus solid fill, OFF = 9x9 frame (`outlineBars` draws outside the inset rect), plus the word. The draw-plan test only compares rect counts (W2).
8. **e2e.** QA's.

## Findings

- **W1 MEDIUM (ui-engineer; design-lead if they prefer 0.7) — music now plays at 0.7, the spec says 0.6.** `DEFAULT_SETTINGS.musicVolume` is 0.7 (`src/save/schema.ts:43`), while `settings.md` ("stay at their defaults (0.6 and 0.8)") and `adaptive-audio.md` ("Defaults: music 0.6") say 0.6, which is also the engine's own default (`src/audio/engine.ts` `DEFAULTS.music`). Until this wave nothing pushed saved settings into the engine, so 0.6 was what played; with `applyAudioSettings` at boot and level start every player now gets 0.7. Fix: set the save default to 0.6 and add a test that pins it to the spec. No slider exists, so a stored 0.7 was never a player's choice; tester saves that already hold 0.7 keep it (acceptable before release). Not blocking B7-14; QA should not fail a mix check on it.
- **W2 LOW (ui-engineer) — two thin spots in tests.** `settingsReturn` (check 4) has no direct unit case (both openers, focus `settings`, pause data passed through); `parseSettingsData` is `parseControlsData`, so it is covered there. The glyph test (`settingsModel.test.ts`, "fills the glyph when ON") asserts only `on.rects.length > off.rects.length`; assert the fill rect at the glyph's inner 7x7 instead. Next ui sitting.
- **W3 LOW (ui-engineer) — no test that an old save without `reducedMotionChosen` reads `false`.** The field-by-field mechanism is tested for `muted` (`progress.test.ts`, "a v1 save without it loads as false") but not for this field, and this one decides whether the OS preference still applies. Add the same case. The `SAVE_VERSION` comment (`schema.ts:9`, "Bump when the stored shape changes") should point to the rule now in `architecture.md` §9: additive fields with a safe default do not bump.
- **W4 LOW (ui-engineer) — leftovers.** `src/ui/audioSettings.ts:2-5` still says "Not wired into any scene yet". `src/ui/StickyKeysTipView.ts:27-28`: two blank lines where the moved constants were. **Process:** `src/scenes/BootScene.ts` is tech-lead's and was edited without a request line (wave 1 "Seen in flight"); kept and guarded by me (F1), no revert.
- **W5 LOW ([scene]) — the reduced-motion rule exists twice.** `motionPrefs.ts:26` duplicates `settingsModel.shownReducedMotion` "so this module stays import-free"; both are tested with the same truth table, so they cannot silently diverge today. If the file is touched: import `shownReducedMotion` from `../ui` (entities already import the ui barrel). No action required.
- **W6 LOW ([scene], process) — request line still open.** `docs/production/requests.md` audio-designer B7-10 line (`playStepEvents` and `window.__redshift.audio.cues`) is done in code but still `[OPEN]`; mark it DONE.
- **W7 LOW (design-lead, open request) — settings changed from pause apply from the next level start**, not "to the frozen frame at once" (`settings.md` edge cases): GameScene reads motion and effects in `create()` only. ui-engineer filed this to design-lead. Mute is not affected (it reaches the engine at once). **QA:** treat it as a known deviation pending the ruling, not a B7-14 failure; check 4 (focus, `state.step` unchanged) is unaffected.
- **W8 LOW (backend-engineer, optional) — `Phaser 3.90.0` is typed into the `LICENSES.txt` heading** (`scripts/lib/licenses.mjs:23`). `package.json` pins `phaser` to exactly `3.90.0`, so it is correct today and only goes stale on a version bump, which nobody plans before the jam. If the file is touched: read `version` from `node_modules/phaser/package.json` in `package.mjs` and pass it in (the builder stays pure). Not worth a sitting on its own.

## Fixed by tech-lead this sitting

- **F1 — `BootScene` audio call kept, but it can no longer stop the boot.** New pure helper `runBootSideJob(label, job, log = console)` in `src/scenes/bootLoad.ts`: runs the job, and on any throw logs one `console.warn('Boot: %s failed; continuing without it', label, error)` and returns `false`. `BootScene.create` calls `applyAudioSettings` through it, so Boot always reaches `afterLoad` (start, retry, or the BUG-6 message). `getSaveStore` still throws on purpose (a wiring bug must show at boot, §9). Tests first (`bootLoad.test.ts`, 3 new: clean run, a throw does not escape and the code after it runs, a non-`Error` throw); they failed before the helper existed. I kept it in Boot rather than `main.ts` so it runs after the scene system is up and next to the existing boot checks.
- **F2 —** `src/scenes/keys.ts:18`: the `settings` key comment now says it is registered in `MENU_SCENES` (was "not registered yet").
- **F3 (wave 1 T1) —** `bootLoad.ts` `captureLoaderErrors` docstring now matches the code: a recovered retry drops the held lines and logs one summary `console.warn`; a double failure logs the held lines as errors, then Boot's own line.
- **F4 (wave 1 T2, partly) —** the loader-error capture is now also released on `SHUTDOWN` (Boot is stopped when it hands off, never destroyed), not only on `DESTROY`. **Load timeout left out on purpose:** Phaser 3.90 supports one (`loader.timeout` scene config, `xhr.ontimeout → File.onError`, then its own 2 retries, then ours), but a wrong number would fail the boot for a slow itch player, and it cannot be checked without a throttled browser run. A hung request still means a black page with no message; this predates BUG-6. Post-jam, or a deliberate task with a throttled e2e case.
- **Docs.** `architecture.md` §8 (`npm run package` writes and checks `LICENSES.txt`) and §9 (where audio settings reach the engine and the guard; the save versioning rule; `reducedMotionChosen`).
- **Not edited: `CLAUDE.md` Commands.** The `npm run package` row should also say it adds `LICENSES.txt` (licence notices) at the zip root. I did not change `CLAUDE.md` without the owner's go-ahead; the orchestrator can apply that one-line change if the owner agrees.

## QA request A-3 (BUG-6), answered for B7-14

- **URLs.** In the preview/e2e build the boot assets are Vite assets at `assets/<name>-<hash><ext>` relative to the page (`base: './'`, `assetsInlineLimit: 0`): `pixel-player`, `pixel-tiles`, `pixel-scenery`, `pixel-hud`, `pixel-fx` (`.png`; their atlas JSON is inlined, no request), `pixel-tileset.png`, `pixel-font.png` and `pixel-font.xml`. Route with a glob such as `**/assets/pixel-hud-*.png`. On the dev server they are `/assets/art/pixel/<name>.<ext>`.
- **Retries.** Two load attempts (`BOOT_LOAD_ATTEMPTS`). Within each, Phaser retries a request that fails on the network 2 more times (`LOADER_REQUEST_RETRIES`), so a file that always fails on the network is requested up to 6 times; a file that downloads but fails to decode (for example a 200 with garbage) is requested once per attempt, 2 times in all. Only the keys still missing are re-queued.
- **Message.** A DOM element `<p id="boot-error" role="alert">` with `COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.` over the canvas; no other scene starts. A recovered retry logs one `console.warn` and starts the title (or the deep-linked level).

## Must fix before QA's verification sitting (B7-14)

1. **Q1** (qa-tester, carried from wave 1, still open): `docs/qa/test-plan.md:490` R-4 still says "card within about 1 s of landing"; use the step-count pass rule of `restart-prompt.md` check 4. QA does this at the start of B7-14.

Nothing in the wave 2 code blocks B7-14. W1 should land in the next ui sitting; everything else is LOW.
