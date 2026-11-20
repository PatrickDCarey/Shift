# Batch 8 review: wave 1 (B8-05), hint rules (B8-06), release files (B8-07)

_Reviewer: tech-lead, 2026-11-20. Reviewed against the uncommitted working tree (`git diff`, `git status`) on top of 2677b13._

## Verdict

**Approve** for B8-01, B8-02, B8-03 and B8-04. Nothing blocks the commit. Four small required changes for gameplay-engineer [scene] are listed below. None of them fails a spec check today, so they can land in the next [scene] sitting.

| Task | Verdict |
|---|---|
| B8-01 hint headers (level-designer) | Approve |
| B8-02 restart card at 2x ([scene]) | Approve (one nit) |
| B8-03 W7 flag re-read ([scene]) | Approve with required changes R1, R2 |
| B8-04 park pan ([scene]) | Approve with required change R3 |

`src/scenes/GameScene.ts` is **396 lines** (limit about 400). The next scene change has to move code out before it adds any.

## Hard rules

- No Phaser in `src/core`: OK (grep finds none). No `src/core` file is touched in this wave.
- Import rules: the new `src/entities/effectPrefs.ts` imports `../fx` and `./motionPrefs`. `focusPan.ts` imports nothing. `tests/arch` passes (623 tests).
- Data-driven colours: the card uses `palette.ui.focus` and `palette.ui.panel` only (`RestartCardView.ts:53-61`). It sets no band colour.
- Magic numbers: `PAN_MS = 250` (`focusPan.ts:14`) and `CARD_SCALE = 2` (`restartCard.ts:28`) are render constants that come straight from the spec. They follow the existing render timings (`RING_MS`, `EXIT_PULSE_STEP_MS`), so they stay in code, not in `tuning.json`.
- Functions are under 50 lines and files under 400. There is no `console.log`. No sim, contract, level-format, `LEVELS`, version or recording change. The diff touches no `*.solution.txt`.
- Ownership: every file is in its owner's area (`levels/**` for level-designer; `src/entities/**` and `GameScene.ts` for [scene]).
- Several [scene] files are CRLF in the working copy. `.gitattributes` normalises them on commit, so there is nothing to do.

## B8-01: hint headers (level-designer)

The headers match `onboarding-hints.md` "2026-11-20 placements" and `decisions.md` 2026-11-20 exactly:

- w3-03: `shiftUp 2 3`, `jump 12 3`
- w3-04: `shiftUp 2 3`, `jump 12 3`
- w3-05: `jump 12 3`, `shiftUp 36 3`, `jump 41 3`

`version` stays 1 and nothing else in the files changed (geometry, recordings). The comments and `levels/README.md` record the measured ranges and the batch 7 reason. All boxes are rows 2-3 over empty sky, 3 rows above the runner floor (row 6). Every box is now covered by tests, including the new B8-06 rules below. The visual check confirms it (`evidence/b8-05-w3-05-*.png`). **Approve.**

## B8-02: restart card at 2x ([scene])

- `cardLayout()` doubles the 1x design: 128 x 38 with the default binding, a 22 x 22 cap, 2 px outlines on whole pixels, label text at `setScale(2)`. The placement rule is unchanged: centred, top y 224, y 42 when a body is at the bottom, 4 px above the tip. Tests are in `restartCard.test.ts`. This meets `restart-prompt.md` "Look" and check 3.
- Browser (dev server on 5192, headless Chromium at 960x540), w3-02 with the check 4 repro: the runner landed in the pocket, and `window.__redshift.restartCard` reported `{ visible: true, x: 176, y: 224, w: 128, h: 38 }`. Screenshot: `evidence/b8-05-w3-02-restart-card-2x.png`. The card is centred at the bottom, has the white outline, is clear of the HUD and does not blink.
- Nit (optional): `RestartCardView.ts:27` calls `cardLayout()` a second time for `.scale`. Use `this.layout.scale` instead.

**Approve.**

## B8-03: W7 re-read of the reduced-motion and reduced-effects flags ([scene])

The design is right. `readEffectPrefs` applies the saved choice first, then the OS preference. `applyEffectPrefs` is a no-op when nothing changed and otherwise pushes the new flags to every target. The re-read runs at two moments the scene already handles: resume (`GameScene.ts:210`) and the sim `restart` event (`GameScene.ts:179`).

**Restart trigger in Tandem: correct.** The sim emits one level-wide `{ type: 'restart' }` per R (`src/core/sim/status.ts:19`), never one per body, so a Tandem R re-reads once. `run.advance` returns the events of every step run that frame, so the event is never lost.

Pause-menu RESTART works as follows:
1. Resume re-reads the flags.
2. The queued restart press emits `restart` on the next advance.
3. That second re-read is a no-op.

Exception: in `?replay=1` (QA only), R calls `restartReplay`, which swaps the driver and emits no event, so R does not re-read there. Resume still does. This is acceptable and needs no change.

Do the mutable setters leave a view half-updated? Each target:

| Target | Mid-level toggle | Result |
|---|---|---|
| `LevelView` exit pulse | `exitPulseFrame` is recomputed every frame | OK: reduced motion holds frame 0 from the next frame |
| `BackdropView` horizon and stars | `setModes` sets visibility at once; tint keeps the last key | OK |
| `BackdropView` ridges | parallax x is recomputed every frame from `modes.ridgeParallax` | OK: they snap to x 0 |
| `PlayerView` | checked at each `pulse()` | OK |
| `FallCue` | passed to `tracker.draw` every frame | OK |
| Gear meters | read on each update; a drop pulse runs on `scene.time.now` and has long expired after a pause | OK |
| `CameraRig` | reduced motion read on each `follow`; a running pan finishes at once (tested) | OK |
| `TipLife` | the tip is destroyed on pause and rebuilt on resume **before** the re-read | **R1** |
| `FeedbackFx` | new rings, wipes and flashes are gated; ones already in flight are frozen during pause and play out after resume | **R2** |

QA's `settings.md` check 4 ("no wipe and no ring from the first frame after RESUME") passes with the code as it is: new effects are gated at once. R1 and R2 are leftovers of under 0.3 s.

The scene-side wiring (the two call sites and `prefTargets`) has no unit test. The scene engineer did no visual check. QA's B8-08 settings check 4 is the browser cover for it.

## B8-04: park pan ([scene])

`FocusPan` starts a 250 ms smoothstep pan only when the count of active bodies drops but stays above 0 and the target moved. It snaps under reduced motion, and a switch to reduced motion mid-pan finishes at once. It uses whole pixels. A rising count (respawn) or the first frame never pans. `CameraRig.follow` keeps `lastFocus` as the target, not the shown focus, so the all-home hold is unchanged. The single `GameScene` call passes `delta` (`GameScene.ts:315`). This meets `tandem.md` "Camera answers" (Could). One gap is listed as **R3**.

## Required changes

All are for **gameplay-engineer [scene]**, in the next [scene] sitting, before M4 freeze. None blocks this commit.

- **R1 (Medium), `src/scenes/GameScene.ts:208-210`:** call `this.refreshPrefs()` before `this.tip?.resume()`. Today the tip rebuilt on resume is built with the old reduced-motion flag (`TipLife.ts:55`). If the player turned reduced motion on while paused, that tip still fades out instead of vanishing (`StickyKeysTipView.ts:107`). This is a one-line move.
- **R2 (Low), `src/entities/FeedbackFx.ts:58`:** in `setModes`, drop effects that are in flight when their mode turns off: `rings = []` when `!ringBurst`, `wipeStart = null` when `!screenWipe`, `flashPeak = 0` when `!deathFlash`. `fx.update` does not run while paused, so a death flash or ring frozen under the pause menu otherwise finishes its fade after resume with reduced motion on. Add a unit test if `FeedbackFx` can be built with a stub scene; otherwise note why not.
- **R3 (Low), `src/entities/focusPan.ts:30-36`:** cancel a running pan (`from = null`) when `active` rises. Today an R within 250 ms of a park glides from the pre-park focus to the spawn instead of cutting with the respawn. Add a unit test: start a pan, apply with `active` back to 2 and a new target, and expect that target exactly.
- **R4 (Low), `src/entities/TipLife.ts:64-65`:** the doc comment `/** Leaving the level: hidden for good. */` now sits above `setReducedMotion`, and `destroy()` has lost its comment. Move it back above `destroy()`.

## B8-06: onboarding-hints checks 10, 13 and 14 in `tests/levels`

Answers the M2-03 lines in `docs/production/requests.md` (2026-11-04 tech-lead to design-lead, and 2026-11-20 design-lead).

| Rule (`onboarding-hints.md`) | Enforced by |
|---|---|
| 10/13: the glyph's 3 x 2 box covers only empty cells | `tests/levels/hints.test.ts` "hint placement (shipped levels) > %s: boxes empty, 3 rows above the floor" (`hintPlacement.ts` `boxProblems`), already there |
| 10/13: anchor at least 3 rows above the floor under it | same test (`floorRowBelow`), already there |
| 10/13: anchor on an empty cell | parser, `src/core/level/parseHints.test.ts` "rejects an anchor that is not '.', including the start and exit cells"; shipped levels must load (`solvability.test.ts`); the anchor is also inside the box check |
| 10/13: unknown glyph id rejected | parser, `parseHints.test.ts` "rejects an unknown glyph id at the id column, listing the valid ids" |
| 10/13: at most 3 hints | parser, `parseHints.test.ts` "rejects more than MAX_LEVEL_HINTS, naming the fourth hint line"; **new** `hints.test.ts` "design placements > no shipped level has more than MAX_LEVEL_HINTS hints" |
| 10/13: hints are render-only (replay identical with and without hints) | `hints.test.ts` "%s: same wonAtStep without its hint lines", already there |
| 10: HUD area at the starting camera | `levelRules.test.ts` "%s: no colored tile, exit or hint under the HUD at the start", already there |
| 10/13: the exact placements (w1-03, w2-04, w3-03, w3-04, w3-05) and `version` unchanged | **new** `hints.test.ts` "design placements (onboarding-hints.md checks 10 and 13) > %s has exactly its placed hints and version 1" |
| 13: every anchor 3 rows above the runner floor (row 6) | covered by the exact pin (row 3 for every 2026-11-20 anchor) plus the floor rule |
| 11/14: no glyph passes under the HUD at **any** camera position | **new** `hints.test.ts` "hint boxes never pass under the HUD > %s: no hint box under the HUD at any scroll" (`hintPlacement.ts` `hintHudReachProblems`; each axis takes its whole clamped scroll range, so the check is conservative), with two self-checks on planted levels |
| 14 (sim half): w3-05 at step 725 of the recording, both kerb boxes on screen and clear of the HUD, the `shiftUp` box left of both bodies, the `jump` box's right edge left of the kerb (world px 720) | **new** `hints.test.ts` "w3-05 kerb hints (onboarding-hints.md check 14, from the recording)", two tests |
| 13: recordings and `LEVELS` unchanged | not a test: the reviewed diff touches no `*.solution.txt` and no `LEVELS` list (the render-only replay test above would catch a behaviour change) |
| 14 (browser half): glyphs visible on the first frame | qa-tester B8-08; also seen in `evidence/b8-05-w3-05-start-hints.png` and `evidence/b8-05-w3-05-kerb-hints.png` |

Tests were written first and failed for the missing helpers, then passed. All the batch 8 headers pass, so no request goes back to level-designer. `hintBoxPx` moved into `levelRules.ts` so the HUD rules share one box. If design later uses the allowed one-column move in w3-05, update the `PLACEMENTS` pin in the same change.

## B8-07: release files

| File | Finding | Action |
|---|---|---|
| `CREDITS.md` | Phaser 3.90.0 (MIT) and its only runtime dependency eventemitter3 (MIT) are listed and match `package.json` and `node_modules/phaser/package.json`. No third-party art, audio or fonts: every tracked image is generated by `assets/art/pixel/build.mjs` or is a team capture of the game. New since B7-05: one GIF (`docs/art/itch/redshift-runway.gif`, the team's own capture, encoded with ffmpeg, which is not shipped) and the itch page PNGs. No external URL in `src/`, `assets/` or `index.html`. | Updated the "Last audit" line (2026-11-20, B8-07). **The team-name placeholder stays** until the owner supplies names (board "Needs the owner" 1); it must not ship as is. |
| `.gitignore` | `.env`, `.env.*` (with `!.env.example`), `*.env`, `release/`, `*.zip`, `dist/`, `coverage/` and Playwright output are ignored. `git check-ignore` confirms `.env`, `.env.local`, `release/*.zip`. No `.env` file is tracked. | None |
| `.env.example` | Tracked. `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` are empty; `IP_HASH_SALT` is commented out with a warning not to put a real value. No real URL or key. A repo scan for JWTs, `*.supabase.co` hosts and live keys finds nothing. | None |
| `LICENSE` | MIT, copyright 2026 with the owner's name; matches `CREDITS.md` "Code" and the packaged `LICENSES.txt`. | None |

Nothing is missing except the owner's team names.

## Evidence

Taken on a dev server on port 5192 (stopped afterwards) with headless Chromium at 960x540:

- `docs/tech/reviews/evidence/b8-05-w3-02-restart-card-2x.png`: w3-02, runner in the pocket, card at (176, 224), 128 x 38.
- `docs/tech/reviews/evidence/b8-05-w3-05-start-hints.png`: w3-05 first frame, the `jump 12 3` glyph over the opening.
- `docs/tech/reviews/evidence/b8-05-w3-05-kerb-hints.png`: w3-05 replay at step 740 (both bodies at x 44.625): the `shiftUp` glyph left of both bodies, the `jump` glyph left of the kerb, neither under the HUD.

## Tests run

- `npx vitest run tests/levels`: 4 files, 116 tests pass (97 before, 19 new).
- `npx vitest run src/entities`: 30 files, 272 tests pass.
- `npx vitest run tests/arch`: 12 files, 623 tests pass.
- `npm run typecheck`: clean.
- `npm run check` is the orchestrator's run, not repeated here.
