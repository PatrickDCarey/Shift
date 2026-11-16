# Review: batch 4A (commit 2eb0527)

_Reviewer: tech-lead, 2026-11-16 (Batch 5, line 6). Ten agents edit the working tree in this batch, so every file was read at the commit (`git show 2eb0527:<path>`). Three reviewer agents read slices in parallel: a typescript-reviewer for the cutover views and ui models, a typescript-reviewer for T-11, audio and levels, and the security-reviewer for `src/net`, the shared name rule and `scripts/submit-run.test.ts`. I re-read every HIGH and MEDIUM finding at the commit and changed two severities (net N1 and N2, reasons below). I did PX-11 myself: `src/main.ts`, `src/scenes/BootScene.ts`, `index.html`, the QA hook lines, `camera.ts` and the `src/core` diff. `main.ts`, `BootScene.ts` and `index.html` are my own PX-4 work, so the boot items are also read by QA in run 6._

Severity follows `~/.claude/rules/common/code-review.md`: **Approve** means no CRITICAL or HIGH finding.

## Verdicts

| Task | Area | Verdict | Findings |
|---|---|---|---|
| PX-11 (PX-4..PX-10) | pixel cutover, logic read | **Approve** | X1 (MEDIUM, **fixed in this sitting**), X2, X3 (MEDIUM, Batch 6); X4–X6 (LOW) |
| T-11 | [sim] Tandem checks 4–15 (`tandemAcceptance2.test.ts`), `contracts/state.ts` | **Approve**; closes T-10 S1 | S3, S4 (MEDIUM); S5 (LOW) |
| PT-3/4/5 | ui pure models (`neededColourCue`, `dragBar`, `bracketArrival`, `meterPixels`, `gearMeterPlan`) and pixel views | **Approve** | U4, U5 (LOW) |
| B13, B14 | `src/net` response cap, display-name rule, `leaderboard.ts` contract | **Approve for merge; fix before M3-14** | N1, N2, N3 (MEDIUM); N4, N5 (LOW) |
| B9, B11 | audio exhaustive switch, `sfxSpec` | **Approve** | A4 (LOW) |
| B10 | audio voice counter reset | **Changes needed** (closes with Batch 5 line 7) | A5 (HIGH at the commit); A6 (MEDIUM) |
| PT-6, M2-22 | w1-01, w1-02, w1-04 v2; w2-03 v1 | **Approve** | L1 (LOW, **fixed in this sitting**) |
| T1, T4, C1 | batch 3 follow-ups (own work, this sitting) | done, see the end | none |

No CRITICAL finding. The one HIGH (A5) is a missing test, and the test exists in the working tree now as audio's Batch 5 work; I review it with Batch 5.

## PX-11: the cutover, logic read

What holds (each checked at the commit):
- **No sim change.** The `src/core` diff is additive: the `fallThrough` event type and `FallThroughCell` in `contracts/state.ts`, the leaderboard contract and its re-export in `types.ts:30`, and tests. `tileSize` 32 → 16 in `tuning.json` changes nothing in the sim: `src/core` uses it only in the `Tuning` contract (`contracts/tuning.ts:16,81`); distances are tiles (`types.ts:12`).
- **Rounding only in the renderer.** `snapFeet` (`src/entities/camera.ts`) is called from `GameScene.snapBody` and its results go only to `PlayerView.draw`, the effects and the camera. Nothing writes back to the run driver or `SimState`. `renderBodyPosition` blends only between two consecutive playing steps, so deaths and respawns do not slide.
- **Camera snapping invariant.** The sprite and the camera are rounded once, from the same interpolated value, in `snapBody`. `cameraFocus` works on those integer feet with `Math.floor` for the midpoint and the half body; `axisScroll` clamps and then rounds. So the scroll is always a whole pixel and the player never moves 1 px against the camera. A level smaller than the view is centred with `Math.round`.
- **QA hook gating intact.** `GameScene.ts:58` is the exact build-time flag; the hook install (`:362`) and removal (`:376`) sit on `if (QA_HOOK)` lines; `tests/arch/qa-hook.test.ts` passes. `solutionFiles.ts:10` is a second copy (C1, now guarded, see below).
- **BootScene loading.** Five atlases, the tileset and the bitmap font are loaded from `?url` imports (relative, `assetsInlineLimit 0`) with the atlas JSON inlined; `tests/arch/boot-assets.test.ts` ties the sheets on disk to `PIXEL_KEYS` and to BootScene. `create` calls `getSaveStore` so a wiring bug fails at boot. A missing sheet shows Phaser's missing-texture box, not a black page.
- **Canvas.** `main.ts`: 480×270, `pixelArt` and `roundPixels`, `Scale.NONE` with `MAX_ZOOM` and a `resize` re-zoom guarded by `isBooted`; 960×540 is exactly 2×. `fps.panicMax: 0` keeps the accumulator's own catch-up cap.
- **Imports and size.** `src/entities`, `src/ui`, `src/scenes` reach `src/core` only through `core` or `core/types`. Largest view files: `GearMeterView.ts` 240, `GameHud.ts` 209, `levelSelectModel.ts` 208 lines; `GameScene.ts` 378. No function over 50 lines found.

Findings:
- **X1 MEDIUM, fixed** — the pixel scale is written twice: `tuning.json:3` `tileSize` 16 and `palette.json:141` `pixel.tileSize` 16 (used by `src/fx/pixel/tiles.ts:14` to bake the sheets). The body size is duplicated the same way (`palette.json` `pixel.body` 12×24 against `playerWidthTiles` 0.75 and `playerHeightTiles` 1.5). New `tests/arch/pixel-scale.test.ts` pins both, so a change to one side fails the build. The two files have different owners on purpose (design-lead, art-director), so a test is better than merging them.
- **X2 MEDIUM** — `src/entities/playerFrame.ts:16` `export const RUN_FRAMES_PER_TILE = 3;` is a gameplay-visible number outside `tuning.json`, re-exported at `entities/index.ts:8`. Labelled a placeholder and ruled by design-lead on 2026-11-16 (`run` 3, `sprint` 2). **Batch 6:** tech-lead adds `runFramesPerTile` and `sprintFramesPerTile` to `Tuning` and `TUNING_SCHEMA`; design-lead adds the values; [scene] reads them and deletes the constant and its re-export. Not done now: the contract is Batch 6 and [scene] is in `playerFrame.ts`'s lane today.
- **X3 MEDIUM** — `src/scenes/GameScene.ts:36` `MAX_APART_TILES = 28`, the Tandem camera framing limit, is a design number in a scene. Move it to `tuning.json` with the Batch 6 contract change (request filed to design-lead).
- **X4 LOW** — `GameHud.ts:26` `GEAR_METER_AREA` repeats `width: 110, height: 32` from `GEAR_METER_LAYOUT.panelW/panelH` (`src/ui/gearMeterLayout.ts:79`). If the meter grows, the message block overlaps it. Derive the area from the layout ([scene], Batch 6).
- **X5 LOW** — `FeedbackFx.ts:49` creates the flash rectangle with `0xffffff`. It is recoloured from `palette.flash.color` before it is shown, but read the palette at creation too. `DEATH_FLASH_MS` (200) sits beside `palette.flash.durationMs` (120); pick one source.
- **X6 LOW** — `playerFrame.ts:19` `RENDER_HZ = 60` repeats the step rate; read `tuning.stepHz` instead.

## T-11: [sim] Tandem checks 4–15

What holds: checks 4–12, 14 and 15 assert the spec's exact numbers (band steps 1/10/23/32; flight steps 14/30/48 and 8.7 tiles out; gear sequences; airborne steps 10/25/26; exact event lists in 11 and 14). `firstStep` returns −1 on a miss, so the assertions fail loudly. `home` per body, `home` before `won` and both `home` events on a shared win step are tested, which closes **T-10 S1**; T-10 is Done once QA verifies. `contracts/state.ts` `FallThroughCell` and the `fallThrough` event match `architecture.md` §3.2 and are additive only.

- **S3 MEDIUM** — `tandemAcceptance2.test.ts:277-290` (check 13, "home beats death"): the level cannot produce a death on the home step. The home body is frozen and an exit in the last row overlaps only above the death line, so the test passes whether or not phase 14(b) ("won even if also below the grid", §3.1.1) is implemented. Fix: build the state directly (twin home, runner below the grid on the same step) and assert `won`. [sim], after T-12.
- **S4 MEDIUM** — `:356-366` (determinism): the rerun uses its own 'split' and 'ledge' inputs, not the inputs of checks 5 and 8, and checks 7, 10, 11, 14 and 15 are not rerun. The `toEqual` has no guard that the event list is non-empty. Fix: rerun each check's own level and frames and assert a non-trivial event count.
- **S5 LOW** — `:250-251` hard-codes `1.5`; use `params.playerHeight`. Check 5 asserts face 3.103 where the spec said 3.0; design-lead reworded check 5 on 2026-11-16, so this now matches.

## PT-3/4/5: ui models and views

What holds: `neededColourCue`, `dragBar`, `bracketArrival` and `meterPixels` are pure and covered by `clarityFixes.test.ts` and `meterPixels.test.ts`; colours come from `palette.json`; the meter carries the gear by pattern as well as colour; `levelSelectModel` and `progress.ts` take `ReadonlySet`. No file over 400 lines.
- **U4 LOW** — layout constants (`levelSelectModel.ts:170` `CELL_H = 32`, `controlsModel.ts:91` `LABEL_X = 16`, `GameHud.ts` `MARGIN`, `MESSAGE_WRAP = 460`, which is 480 − 20) are view layout, not gameplay, so they may stay in code; derive `MESSAGE_WRAP` from the canvas width.
- **U5 LOW** — the M1 stand-in pause label in `GameHud.ts` overlaps `src/ui/pauseModel.ts`. Remove it when the pause scene lands (M2-12, Batch 6).

## B13/B14: `src/net` and the name rule (security-reviewer, re-checked)

What holds: only `VITE_SUPABASE_URL` and the anon or publishable key reach the client (`config.ts` refuses `sb_secret_*` and service-role JWTs, https only except localhost). Every `fetchTopRuns` path resolves and never rejects; a 5 s `AbortController` timeout is cleared in `finally`; `redirect: 'error'`, `credentials: 'omit'`, `cache: 'no-store'`. `submitRun` makes no request. Query values are validated and go through `URLSearchParams`; `select` names columns, so `input_log` is never fetched. A bad row rejects the whole board. The server rule (`rules.ts:61`, `0002_submit_run.sql:15-16`, `leaderboard.ts:17`) is one allowlist, `^[A-Z0-9-]+( [A-Z0-9-]+)*$`, max 12, which rejects bidi, zero-width and non-ASCII names. Offline-first holds: `getNetClient` is not wired into any scene yet.

- **N1 MEDIUM** (agent: HIGH) — `src/net/client.ts:110-114`: the size cap is checked before the read only when `Content-Length` is present and honest; otherwise `res.text()` buffers the whole body and the check at `:114` runs after. The comment at `:110` says this. Downgraded because the only host is the project's own Supabase URL over https, fixed at build time, and the read is time-bounded at 5 s; the risk is memory use from a misbehaving server, not data exposure. Fix before M3-14: read `res.body` with a reader, count bytes, `cancel()` past the cap; add a test with no header and a large body.
- **N2 MEDIUM** (agent: HIGH) — `src/net/validate.ts:11,28,37-38`: the client checks names with its own 24-character denylist instead of the shared `isDisplayName` (`src/core/contracts/leaderboard.ts:17-33`, 12 characters, allowlist). So the client accepts lowercase, punctuation and Unicode names the server can never write. Downgraded because nothing displays leaderboard names yet, and the HUD draws text with the bitmap font (no HTML, so no injection path). Fix before M3-14: `parseEntry` calls `isDisplayName`. The "legacy 24-character rows" concern is void: no database exists before USER-2.
- **N3 MEDIUM** — `scripts/submit-run.test.ts:128-131`: the "shared core constant agrees" case reads `src/core/types.ts`, which only re-exports, so the `if` is false and nothing is asserted. Already on backend's Batch 5 line 8 ("points at `leaderboard.ts` and never skips"); import `DISPLAY_NAME_PATTERN` and the max length rather than the literal at `:122`.
- **N4 LOW** — `backend/functions/submit-run/index.ts:44-45` reads the request body and then checks its length; check `Content-Length` first (the platform also caps request size).
- **N5 LOW** — `validate.ts:28` misses some format characters (U+00AD, U+061C, U+180E, U+2061-2064, tag characters). Moot once N2 uses the allowlist.

## Audio B9–B11

What holds: B9's `switch` in `sfxEvents.ts` is exhaustive with a `never` default; the silent cases are exactly `bandChange`, `graceStart`, `wallStop` and `ceiling`; the local `FallThroughEvent` stays until the sim event lands. B11 removes the non-null assertion. Nothing throws before a gesture: the context is created lazily and `watchContextState` is inside a try.
- **A5 HIGH (at the commit)** — B10 adds `dropAllVoices` (`engine.ts:176`), the `onstatechange` handler (`:192`) and the reset in `tone()` (`:266`) with no test; the commit changes no audio test, and the board's done line for B9–B11 was "tests for each". The test is in the working tree as audio's Batch 5 line 7 (`engine.test.ts`, "onstatechange to suspended clears the voice counter"). Closes when that lands and QA verifies.
- **A6 MEDIUM** — `engine.ts:176-187`: `voices` counts music and SFX voices (`:291`), but `dropAllVoices` stops only SFX voices and then zeroes the whole count. Music voices still playing are no longer counted, so the cap can be exceeded until they end. Track the music count separately or subtract only the SFX voices stopped.
- **A4 LOW** — `sfxSpec.ts:181` `?? 1046.5` repeats a constant and cannot be reached; reference `GEAR_NOTE_HZ[4]`.

## Levels v2 (PT-6, M2-22)

What holds: step totals match the headers (w1-01 434, w1-02 326, w1-04 469, w2-03 167); the three changed grids are v2 and each solution names its version; w2-03 is v1. Hint anchors (w1-01 `move 1 6`; w1-02 `shiftUp 1 6`, `shiftDown 9 6`) pass the placement rules. Headers use only keys from `level-format.md`. `tests/levels/shipped.ts` globs `levels/*.txt`, so replay, hints and the ±3 robustness test cover all four; `npx vitest run tests/levels` is green for them (an uncommitted `w3-01.txt` without a solution fails, which is level-designer's Batch 5 work in progress).
- **L1 LOW, fixed** — `level-format.md` §2 still said the floor under a hint is found "in its column"; since the batch 3 T3 fix, `hintPlacement.ts:51` takes the highest floor under any box column. Doc updated.

## Batch 3 follow-ups done in this sitting

- **T1** — `tests/arch/repo-secrets.test.ts`: forbidden file names now match case-insensitively; the self-check adds `A.PEM`, `deploy.Key`, `.ENV`, `.Env.Local`, `.NPMRC`, `ID_RSA`.
- **T4** — new `tests/arch/sourceText.ts` `stripComments` skips string and template literals, so `'/levels/*.solution.txt'` is no longer read as a comment opener; line breaks are kept. `render-imports.test.ts` now flags a dynamic `import('../core')` from `src/audio`, `src/fx` or `src/net`; self-checks for both. Known limit: a regex literal containing a quote or `//` is not recognised and could hide the code after it; the arch suite passes on today's sources, and a full tokenizer is not worth it for these guards.
- **C1** — `tests/arch/qa-hook.test.ts` uses the shared `stripComments` and adds a check: every `QA_HOOK` declaration must be the exact build-time expression, and every `import.meta.glob` that pulls in `*.solution.txt` (not a `!` exclusion) must sit in a file that declares it; it also asserts at least one such file exists. The second copy in `solutionFiles.ts:10` can no longer drift. Sharing one constant is still [scene]'s (request filed for Batch 6).
- `npx vitest run tests/arch tests/levels/hints.test.ts`: 12 files, 517 tests, green. `npm run typecheck`: clean.
