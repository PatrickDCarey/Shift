# Review: batch 7 wave 1 (commit `6a8aad3`, B7-12)

_Reviewer: tech-lead, 2026-11-19 (Batch 7 wave 2). Read with `git diff 259d5ed..6a8aad3`. Wave 2 sittings were editing at the same time ([scene] `GameScene.ts`, `src/entities/**`; ui-engineer `src/ui/**`, `src/save/**`, menu scenes; backend `scripts/package*`); those working-tree edits are **not** reviewed here (B7-13 does that), except where noted under "Seen in flight". Single-path runs only: `src/entities/sealedPockets.test.ts` (10), `src/entities/restartCard.test.ts` (19), `src/audio` (175), `src/scenes/bootLoad.test.ts` (9), `tests/arch/scene-registration.test.ts` (17), `tests/levels` (93): all green. Nothing was run in a browser by me; the look and timing of the card are QA's (B7-14)._

Severity follows `~/.claude/rules/common/code-review.md`: **Approve** means no CRITICAL or HIGH finding.

## Verdicts

| Area | Files | Verdict | Findings |
|---|---|---|---|
| Restart card (B7-01, [scene]) | `src/entities/{sealedPockets,restartCard,RestartCardView,RestartCardController,TipLife,debugHook}.ts`, `GameScene.ts` (+7 lines), tests | **Approve with fixes** | S1 (MEDIUM, fix before B7-14), S2 (MEDIUM), S3..S7 (LOW) |
| SFX entry point, cue log (B7-02, audio) | `src/audio/{sfxStep,cueLog,sfx,index}.ts`, tests | **Approve** | A1, A2 (LOW) |
| BUG-6 boot retry, key, credits (B7-03..B7-05, tech-lead, self-review) | `src/scenes/{BootScene,bootLoad,keys}.ts`, `tests/arch/scene-registration.test.ts`, `CREDITS.md`, `architecture.md` | **Approve** | T1, T2 (LOW) |
| BUG-5 (B7-06, ui) | `src/ui/menuNav.ts`, `src/scenes/TitleScene.ts`, `menuNav.test.ts` | **Approve** | U1 (LOW, process) |
| Hint headers, README (B7-07, levels) | `levels/{w1-03,w2-04,w3-03}.txt`, `levels/README.md` | **Approve** | none (`tests/levels` green: replay, ±3, hint placement) |
| Ridge parallax in `RIDGES` (B7-08, art) | `src/fx/pixel/scenery.ts`, `assets/art/pixel/pixel-scenery.json` | **Approve** | none (consumer `BackdropView` is B7-10, in flight) |

**Count:** CRITICAL 0, HIGH 0, MEDIUM 2 (S1, S2), LOW 10 (S3..S7, A1, A2, T1, T2, U1) plus one QA doc item (Q1).

Checked and fine:
- **Determinism.** Nothing render-side writes the sim. The controller reads `SimState`, `SimEvent[]` and the camera scroll; the model is fed frame snapshots and returns a rectangle. Audio reads events only (`sfxStep.test.ts` checks it does not mutate them). `performance.now()` is in `cueLog.ts` (render side, debug only), never in `src/core`. No `Math.random`/`Date` added anywhere.
- **Lanes and imports.** `src/entities` imports `../core/types`, `../core` (index, tests only), `../ui` (index) and `../fx`; nothing reaches into a core lane. Audio imports `../core/types` only.
- **QA hook.** `restartCard` is a getter on the hook object, and the hook only reaches `window` under `QA_HOOK` (`debugHook.ts:61`). Shape matches QA request A-2 (`null` hidden, `{ visible: true, x, y, w, h }` shown). `debugCues` is exported from `src/audio` but not put on `window`; exposing it under `QA_HOOK` is B7-10 (check at B7-13).
- **Sealed-pocket rule vs `restart-prompt.md`.** Open cells are `empty`, `exit` and the two spawns; `safe`, `colored`, `ice` and `camera` (gate) tiles are boundaries; a region with a spawn or exit, or touching row 0 or the last row, is not sealed (`sealedPockets.ts:30-60`). "In" uses the cell of (x, feet − 0.75) (`restartCard.ts:76`). Shipped-level test pins w3-02 rows 7–9 cols 10–25 and w3-03 rows 7–9 cols 25–34, none elsewhere, ≥ 14 levels. Every inline-grid case of acceptance 1 is there.
- **Rulings of 2026-11-19.** Check 4 (60 steps, visible within 2 rendered frames): the card is updated in the same `update()` that ran the steps (`GameScene.ts:295`), so it is visible on the frame that reaches the count, except for S1. Check 5 (runner centre x ≥ 26): consistent with the code; the controller uses body x as the centre (`RestartCardController.ts:70`) and `playerWidthTiles` 0.75 puts the left edge at 25.625. Nothing in code depends on that number.
- **Clears.** Restart and respawn via `isRespawn` (`whyFell.ts:41`) plus a step counter that goes backwards; leaving the level destroys the view (`GameScene.ts` shutdown); no body in a pocket hides it. Pause freezes `state.step`, so paused frames add 0. Placement is decided once, when the card appears, as the spec says.
- **View.** Screen space, whole pixels, depth 150 (below HUD 200 and tip 1000), colours from `palette.ui.*`, redraw only on a position change, static in every motion setting.
- **Sizes.** Largest new file `restartCard.ts` 134 lines; `BootScene.ts` 167; no new function over ~50 lines; nesting ≤ 3. `GameScene.ts` is 376 at `6a8aad3`: wave 2 adds the audio call and hook field, so B7-13 checks it stays ≤ 400.
- **Tests test behaviour.** The timer tests drive the model through steps, pause (frozen step), reset, a step counter going back, pocket change and home bodies; placement tests check margins, HUD, the tip and the y 42 case. The weak spots are A1 and the S1 case below.

## Restart card ([scene])

- **S1 MEDIUM — the entering frame is credited with every step of that frame, so the card can show before 60 steps in the pocket.** `RestartCardModel.update` adds `delta = step − lastStep` to a new stay (`restartCard.ts:114,127`). If the body's centre enters a pocket on the last step of a multi-step frame, the steps before it are counted too. With `MAX_STEPS_PER_FRAME` 5 (`interpolation.ts:10`) the card can appear after 56 real steps. Check 4's 2026-11-19 pass rule says the card is **absent** while fewer than 60 consecutive steps have run, and headless Chromium does not render at a steady 60 Hz. The test `counts steps, not rendered frames` (`restartCard.test.ts`: `frame(30)` on a fresh model counts 30) writes the over-count down as intended.
  - Fix ([scene], wave 2, before B7-14): a new stay starts at 1 (the step this frame ends on), and only a stay that was already in the same pocket on the previous frame adds `delta`. The worst case is then late by `delta − 1` steps on the entering frame only, so the card shows on the frame of the 60th step or the next one at a normal cadence, inside the "within 2 rendered frames" rule. Change the test: fresh model, `frame(30)` stuck, then `frame(88)` → null (59 counted), `frame(89)` → card. Add a case where the body enters on a 5-step frame.
- **S2 MEDIUM — `STICKY_TIP_TOP` copies two private constants of another lane.** `RestartCardController.ts:17` is `VIEW.h − 46 − 12`, which only matches `PANEL_HEIGHT`/`PANEL_BOTTOM_MARGIN` in `StickyKeysTipView.ts:26-27` (ui-engineer) by hand. It is a layout number, not a gameplay or colour number, so it does not belong in `tuning.json` or `palette.json`. The problem is that if ui ever moves the tip, the card overlaps it with no failing test.
  - Fix: ui-engineer exports the tip panel's top (for example `STICKY_TIP_PANEL_TOP`, or `stickyTipTop(viewH)`) from `src/ui/index.ts`; [scene] imports it and deletes the local copy. [scene] files the request line. Not needed before B7-14.
- **S3 LOW — the 0.75-tile centre rise is half the body height, typed in again.** `CENTRE_RISE_TILES = 0.75` (`restartCard.ts:27`) is `tuning.playerHeightTiles / 2` (1.5 / 2) today. The spec writes 0.75 because that is the value today, but the body size is owned by `tuning.json`. **Ruling:** derive it. Pass `playerHeightTiles` (the controller already holds it in `CardTuning`) into `bodyPocket` and use `playerHeightTiles / 2`. Keep the existing `bodyPocket` test with 1.5. Next [scene] sitting; no behaviour change.
- **S4 LOW — `HUD_BOTTOM = 42` and `VIEW` are literals, and 42 is also where HUD messages go.** `restartCard.ts:19,21`. 42 equals `GEAR_METER_AREA.y + height + MARGIN` in [scene]'s own `GameHud.ts:40`, which is the y of the load/parse/replay message block (left, wraps at 460 px). In replay mode a long message could sit under a raised card. Fix: derive `HUD_BOTTOM` from `GEAR_METER_AREA` (same lane), and take the view size from one shared constant (`VIEW_W` in `src/fx/pixel` or `SCREEN_W` in `src/ui/menuLayout.ts`) rather than a fourth copy. QA: in the R-8 hand check, look for overlap with a replay message.
- **S5 LOW — per-frame allocation, only on pocket levels.** On w3-02/w3-03 each frame allocates about ten small objects: the bodies array and spread (`RestartCardController.ts:53`), a `CardBody` and rect per body (`:66-71`), a new `stays` array and `Stay` objects (`restartCard.ts:117,127`), and the scroll literal (`GameScene.ts:295`). On the other twelve levels it returns early (`RestartCardController.ts:50`). That is negligible next to Phaser's own per-frame garbage; **no action required**. If the file is touched anyway: build the rects only on the frame the card is placed, and keep `Stay` counts in a reused array.
- **S6 LOW — the overlap test uses sim positions, not the drawn ones.** `cardBody` places rects from `state.player.x/y` (`RestartCardController.ts:66-71`); the sprites are drawn at the interpolated, snapped feet (`GameScene.snapBody`). They differ by less than a step of motion, and only at the moment the card is placed. Note only; pass the snapped feet in if S5 is done.
- **S7 LOW (rule note, no code change) — coloured boundaries.** Per the spec, a coloured tile is a boundary, so a future pocket whose floor or wall is coloured would be reported as sealed even though a body could fall out of it. No shipped level has one (test-pinned). The spec already says the designer checks the helper output per level; level-designer keeps this in mind for world 4 gates.

## Audio

- **A1 LOW — two tests do not test what their names say.** `sfxStep.test.ts:72-73` ("plays one jump, not two") asserts `solo ≤ pair ≤ 2 × solo`, which passes without any merge. `:80` checks `firstHz('land') > 0`, a property of the spec table, not of the call. The merge itself is pinned in `sfxEvents.test.ts:72-89`, so this is a weak test, not a gap. Fix (audio): assert `pair.tones` equals the layers of the unison cue (`describeSfx({ id: 'jump', body: 'both', … })`), and assert the land layer is among the scheduled tones.
- **A2 LOW — orphaned doc comment.** `src/audio/index.ts:32`, the `sfx` JSDoc, now sits above the `cueLog` JSDoc, so neither attaches to the right symbol. Move it down to `export const sfx`.
- Fine: the ring buffer allocates one entry per cue played, not per frame. `recent()` copies only on a QA read. `playStepEvents([])` is a no-op. The entry point is safe before the gesture and when muted.

## Boot retry (tech-lead, self-review)

Read critically because I wrote it. The policy is pure and tested: start, retry once with only the missing keys, then fail and name what is left. A `RangeError` is thrown for an attempt below 1. The message comes from the design copy, in a DOM `<p role="alert">` rather than canvas text, because the font may be what failed. The retry is driven by the caches, not by loader events (Phaser 3.90 `File.onProcessError` emits no `loaderror`). I checked two Phaser details in `node_modules/phaser/src/loader`. First, re-queueing a key cannot be skipped as a cache conflict (`LoaderPlugin.keyExists`), because a `MultiFile` (atlas, bitmap font) adds its texture only when every part has processed, so a half-failed asset leaves nothing in the cache. Second, `start()` on an empty queue completes at once.

- **T1 LOW — doc and code disagree on what a recovered retry logs.** `bootLoad.ts:73` says Boot logs the held loader lines "as a warning"; `BootScene.ts:118` logs one summary `console.warn` with the keys and drops the held lines. `architecture.md` (one `console.warn`) matches the code. Fix (tech-lead, B7-13): correct the docstring.
- **T2 LOW — a load that never completes keeps `console.error` filtered and the page black.** The capture is released on the two terminal `afterLoad` paths and on `DESTROY` (`BootScene.ts:89-90`), but Boot is only ever stopped (`SHUTDOWN`), and Phaser's XHR timeout is 0, so a hung request never reaches `afterLoad`. This was already the case before BUG-6 (no timeout on the first load either). Fix (tech-lead, post-jam or B7-13 if cheap): release on `SHUTDOWN` too; consider `load.setXHRSettings` / `xhr.timeout` so a hang becomes a failure and reaches the message.
- `BootScene` wiring itself has no unit test; it was seen in Chromium (commit message, `docs/qa/evidence/b7-boot-error-message.png`) and QA automates B6-1..B6-3 at B7-14.
- **`RESERVED_KEYS`: removed in this sitting.** ui-engineer's `SettingsScene` is registered in `MENU_SCENES` (`src/scenes/menuScenes.ts`, working tree, uncommitted, B7-11), so `tests/arch/scene-registration.test.ts` now has `RESERVED_KEYS = []` (mechanism kept for the next reservation) and passes (17/17) against the tree. If B7-11 were cut before commit, that test would fail on `settings`, which is correct. `architecture.md` now lists Settings in the scene list. **Left for B7-13:** the `keys.ts:18` comment still says "not registered yet".
- `CREDITS.md`: audit recorded (no third-party art, fonts, audio; Phaser the only runtime dependency). The team-names placeholder stays until the owner answers (owner question 2): a submit blocker, already on the board.

## UI

- `titleJump(action, playTargetId)` passes `focusId` only when there is a target; unit cases cover both. Approve.
- **U1 LOW (process) — QA's `test.fail` marker was removed in this commit.** `tests/e2e/menus.spec.ts:189` is QA's file, and the board says QA removes the marker at B7-14 once the fix is in. Removing it is right, because the fix landed and a passing `test.fail` would fail the run, but it was done outside QA's sitting and the e2e suite was not run on it. QA confirms B5-1 at B7-14. No revert.

## Levels, art

- Three hint headers, no version bump and no recording change; comments and README updated; `tests/levels` green (93). Approve.
- `RIDGES.far/near.parallax` 0.15 / 0.3 with the sheet JSON re-baked (drift test green in the orchestrator's check). The scene reads it in B7-10 (in flight). Approve.

## QA doc

- **Q1 (qa-tester, before B7-14) — test plan row R-4 predates the ruling.** `docs/qa/test-plan.md:490` still says "card within about 1 s of landing". Use the 2026-11-19 pass rule: count sim steps from the first step the runner's centre is in a pocket cell, card absent below 60, visible within 2 rendered frames of the 60th (`restart-prompt.md` check 4).

## Seen in flight (for B7-13)

- **ui-engineer edited `src/scenes/BootScene.ts` (tech-lead's).** The working tree adds `applyAudioSettings(store.getSettings())` in `create()` before `afterLoad()`. That is outside B7-11's file list and should have been a request line. The intent is fine (saved mute reaches the engine before any gesture), but if that call throws, Boot never reaches `afterLoad`, and BUG-6's black canvas is back with no message. B7-13 decides: keep it (owner tech-lead, guarded so it cannot stop the boot) or move it to where the store is created (`main.ts`, also tech-lead's).

## Must fix before QA's wave 3 sitting (B7-14)

1. **S1** ([scene]): the entering-frame over-count, with the test changed as above. R-4 automates exactly that boundary.
2. **Q1** (qa-tester): align R-4 with the step-count pass rule.

Everything else can land in wave 2 or later, or stays as a note.
