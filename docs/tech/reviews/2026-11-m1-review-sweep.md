# Review sweep: M1-30, M1-33, M1-34 (batch 2)

_Reviewer: tech-lead, 2026-11-04. Reviewed at commit `9ea8970` (batch 1). Ten agents were editing in parallel, so working-tree changes made after that commit are not covered here. They get reviewed with their own tasks. Checklist: `.claude/agents/tech-lead.md`. Security input: `2026-11-security-backend.md` (security-reviewer agent, read-only), folded in under M1-34. The fx and gear-meter reading was done by a typescript-reviewer agent and spot-checked here (`hud.ts:72-99`, `gearMeter.ts:46,67`, `player.ts:183,196` confirmed)._

## Verdicts

| Task | Area | Verdict | Blocking items |
|---|---|---|---|
| M1-30 | sim lane (`src/core/sim/**`) | **Approve** | none |
| M1-33 | scene, HUD mount, replay mode, QA hook | **Approve** | none. Follow-up F1: solutions must not ship (ruling below). |
| M1-34 | storage (`src/save`) | **Approve** | none |
| M1-34 | bindings, Sticky Keys logic (`src/ui/bindings.ts`, `stickyKeysTip.ts`) | **Approve** | none |
| M1-34 | packaging (`scripts/package.mjs`, `scripts/lib/zip.mjs`) | **Approve** | none left. HIGH 2 is fixed in config (below). MEDIUM 4 and 5 must land before the first public itch.io upload. |
| M1-34 | Supabase schema and RLS (`backend/`) | **Changes needed** | HIGH 1 (`backend/README.md:25` service-role key paste). The SQL has never been executed. |
| M1-34 | palette, patterns (`src/fx/*.ts`, `palette.json`) | **Approve** | none |
| M1-34 | `src/fx/pixel` | **Changes needed** | P1: the edge arrow shows the band by colour only. This blocks wiring the edge arrow (T-20/PX-7), not M1. |
| M1-34 | audio engine (`src/audio/engine.ts`) | **Approve** | none |
| M1-34 | ui gear meter (`src/ui/gearMeter*.ts`, `GearMeterView.ts`, `dropPulse.ts`, `gearKeyCaps.ts`) | **Approve** | none. Two MEDIUM items filed. |

## M1-30: sim lane

- **S1 fixed.**
  - `move.ts:20-22` emits `wallStop` only when `w.vxOld !== 0 || res.x !== p.x`, so pushing into a wall the box already touches is silent.
  - Tests:
    - `step.test.ts:175`: hold 30 steps into a wall, exactly one event.
    - `:186`: leave and hit again, two events.
    - `:195`: a jump into a wall mid-air gives one event.
    - `coloredWallsAcceptance.test.ts`: walls that switch with the band.
- **S2 fixed.**
  - `input.ts:9-11` `recordInput` copies exactly `INPUT_BUTTONS`. Every `prevInput` write uses it: `step.ts:42,49`, `status.ts:57,64,71`.
  - `step.test.ts:86` covers extra fields in every status. `:101` proves a frame with extra fields gives the same states as the clean frame.
- **Purity, determinism and lanes.** `tests/arch` is green (core purity, lane contracts with `REQUIRE_COMPLETE`, path case). The 6000-step determinism replay passes.
- **Coverage** (`src/core`, v8; `src/core` + `tests/arch` + `tests/levels`, 843 tests): 100% lines, 100% functions, 99.6% statements, 93.8% branches.
  - Lowest real file: `level/text.ts`, 82% branches.
  - `motion/testkit.ts` is at 50% branches (test helper).
- **Size and nesting.** No sim function is over 25 lines, and nesting is at most 3.
- **Magic numbers.** None added.

## M1-33: scene, HUD mount, replay, QA hook

Checked:
- `src/scenes/GameScene.ts`, `BootScene.ts`, `src/main.ts`
- `src/entities/` (`replay.ts`, `solutionFiles.ts`, `levelFiles.ts`, `runDriver.ts`, `inputSampler.ts`, `keyboardInput.ts`, `GameHud.ts`, `params.ts`)

What holds:
- The scene decides no game rules. It samples input, calls `step` through `RunDriver`, and draws.
- Core is imported only through `../core` or `../core/types`.
- The fixed-step accumulator is in `runDriver.ts` and `interpolation.ts`.
- Replay feeds one recorded frame per sim step whatever the frame rate, and a bad or missing solution gives a message, never a throw.
- The QA hook is gated by `QA_HOOK` (`GameScene.ts:42,183,193`), and `tests/arch/qa-hook.test.ts` passes.
- HUD mount: `GearMeterView` sits in `GEAR_METER_AREA`, and the title moved to top centre. Colours come from `palette.ui`.
- Bound keys call `preventDefault`. Releases always pass. Blur and tab-hide clear the held keys.

Findings:
- **F1 (MEDIUM, follow-up of the ruling below):** `src/entities/solutionFiles.ts:6` bundles every `levels/*.solution.txt` into every build, and `?replay=1` works in the release build. → request (scene, backend).
- **F2 (LOW):** `runDriver.ts` `startNewRun` stores the raw `frame` as `prevInput`. The sim only stores the six buttons (S2), so a sampler that adds fields makes post-win states differ from replayed ones. Copy only `INPUT_BUTTONS`. → request (scene).
- **F3 (LOW):** `runDriver.ts` `stepOnce` keeps appending frames while the sim is `won`, so `recording` grows after the win. Stop recording at the win step (the `RunResult` is built there anyway). → request (scene).
- **F4 (LOW):** `params.ts:16` throws on a bad `tuning.json`, so the result is an uncaught exception and a blank canvas. Already covered by design-lead's BootScene error-screen request (PX-4).

### Ruling: `levels/*.solution.txt` do not ship in the release build

Recorded in `architecture.md` §6 and §11.

- **Why.** `?replay=1` is a QA and dev tool, not a player feature. Ghost replays (Could) would come from leaderboard runs, not from shipped recordings. Keeping recordings out of the zip removes spoilers, removes ready-made leaderboard inputs and keeps the bundle lean. The recordings stay public in the repo (jam rule), and that is fine.
- **Scene lane.** Bundle the glob only when `QA_HOOK` is true, using the same compile-time constant as the hook (`import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1'`), so the plain build tree-shakes the `?raw` modules. In a plain build `?replay=1` is ignored: live play, no error banner. The e2e build keeps replay.
- **Backend.** `npm run package` fails if a bundled file contains a recording header, meaning a `level:` line followed by a `levelVersion:` line.
- **tech-lead.** Add the same grep to CI's plain-build job once the scene change lands. If it went in now, CI would go red before then.

## M1-34: side tracks

### Storage (`src/save`): Approve

What holds:
- Every `localStorage` touch is inside try/catch (`storage.ts:31-41,52-81`), with an in-memory fallback and `isPersistent()`.
- The schema is versioned and parsed defensively, with id and step validation and caps.
- Snapshots are immutable.

Findings:
- LOW (security 15) `schema.ts:103-106` and `store.ts:70`: `bestSteps` is a plain `{}`. `LEVEL_ID_PATTERN` admits `constructor`, so `store.ts:70` reads `Object.prototype.constructor` as the previous best and never records one. Use `Object.create(null)` or a `Map`, or tighten the id pattern to `w[0-5]-NN`.
- LOW (security 16) `schema.ts:99-104,149`: there is no size cap before `JSON.parse`, and the code filters before it slices. Use defaults above 64 KiB, and slice before filtering.
- LOW `store.ts:43`: `createSaveStore` is 56 lines. That is accepted as a factory of small methods.

### Bindings and Sticky Keys logic: Approve

What holds:
- Q/E and Z/X and both Shifts are in `DEFAULT_BINDINGS`.
- `sanitizeBindings` validates codes.
- `stickyKeysTip.ts` is pure, and the Windows detection is defensive.

Findings:
- LOW `stickyKeysTip.ts:48`: `STICKY_TIP_DISMISS_CODES` repeats the alternate gear keys. Derive them from `DEFAULT_BINDINGS.shiftUp`/`shiftDown` (minus the Shift keys), so a later default change cannot drift.
- LOW `bindings.ts:124-130`: `sanitizeBindings` filters a stored array of any length. Cap each list (for example 8 codes) before filtering.

### Packaging: Approve (security HIGH 2 fixed here, MEDIUM items filed)

What holds:
- The build goes to a temp directory, never to `dist/`.
- The zip is deterministic: sorted entries, a fixed timestamp, forward slashes and path-escape checks.
- The QA hook, env files, source maps and absolute asset paths are refused.

Security fixes:
- **HIGH 2 fixed (tech-lead, this batch).** The key checks lived only in the package script, so `npm run build` and `npm run dev` could put a pasted secret into `dist/`. The new `config/envGuard.ts` is a Vite plugin in `vite.config.ts` that runs on every build, dev and preview start. It:
  - allows only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_QA_HOOK`;
  - accepts the key only as `sb_publishable_…` or a JWT whose `role` is `anon`;
  - rejects `sb_secret_` and non-anon JWTs inside any `VITE_` value;
  - requires both Supabase values or neither, and https (or loopback http);
  - refuses a widened `envPrefix`;
  - never echoes values.

  Tests are in `tests/arch/env-guard.test.ts`. A resolved config was checked to throw on a stray `VITE_` variable. The package script builds through the same config, so it inherits the guard.

Findings:
- MEDIUM (security 4) `package.mjs:28-33`: the output scan does not decode JWTs, so a `service_role` JWT is base64 and is missed. Scan for `eyJ…\.eyJ…\.…` and fail unless the role is `anon`.
- MEDIUM (security 5) `package.mjs:25,114`: only known text extensions are scanned. Scan every file except known binary types, and add `*.pem`, `*.key` and `.npmrc` to `FORBIDDEN_NAME`.
- MEDIUM `zip.mjs:39-102`: `createZip` is 64 lines. Extract the local-header and central-record builders.
- LOW (security 17) `zip.mjs:24-33`: reject NUL, `:` and names over 65535 bytes. `readZip` is for trusted input only, so say so in its comment.
- LOW (security 18) `ci.yml`: actions are pinned to mutable tags, there is no `npm audit`, and CI never runs `npm run package`. This is tech-lead's own follow-up after M2.

### Supabase schema and RLS: Changes needed

Nothing has been executed against Postgres yet. The first run is the owner's USER-2 step 4.

- **HIGH (security 1) `backend/README.md:25`, `0001_runs.sql:14`:** the plan has the owner paste the service-role key into function secrets. Instead, read the injected `SUPABASE_SERVICE_ROLE_KEY` in the edge function, drop the paste step, and add a rotation note.
- MEDIUM (security 7) `0001_runs.sql:50-53`: `input_log` allows 200,000 characters and `steps` allows 1,000,000. Fix:
  - Cap `input_log` at about 16,000 characters and set a per-level step cap.
  - The edge function bounds the sum of run counts before expanding (a `999999999R` token is a replay-CPU DoS).
  - Replay on submit with a step cap, so `steps` is verified rather than claimed.
- MEDIUM (security 8): the planned `0002` migration needs revoke plus RLS, or a non-exposed schema. Hash IPs and take them from `cf-connecting-ip`.
- MEDIUM (security 9) `README.md:53`: the owner turns off sign-ups and anonymous sign-ins, and checks that `/graphql/v1` does not expose `input_log`.
- MEDIUM (security 10) `backend/tests/0001_runs_rls.sql`: every denial comes from the column revoke, so the RLS layer is never tested on its own. Add:
  - temporary grants inside the transaction, asserting that RLS denies the write;
  - the `authenticated` role;
  - `has_column_privilege` checks;
  - Unicode and padded-name cases;
  - the exact policy roles.
- MEDIUM (security 6) `0001_runs.sql:39-43`: display names need an explicit allow-list. Design-lead rules on the name rules (M3-02), and backend mirrors them in SQL and in the edge function. Render names with Phaser `Text`, never `innerHTML`.
- LOW (security 11, 12, 13): `FORCE ROW LEVEL SECURITY` comments overstate what it does. Keep the column-privilege checks as a runbook, and smoke-test `?select=input_log` for refusal.

### Palette and patterns: Approve

- Every band has a distinct pattern in `palette.json`. Pairwise differences are tested.
- There are no hex literals outside `palette.json` on this path.
- MEDIUM (still open from batch 1) `src/fx/palette.ts:5`, `src/fx/pixel/player.ts:30`, `tileset.ts:17`: `BANDS` and `ColoredBand` still clash with the `src/core` exports of the same names. Rename them before the PX-4 wiring imports both barrels.
- LOW `tileRender.ts:48-52,152-158`: the pattern draw loop is duplicated.
- LOW `palette.ts:127`: `tintStops()` is rebuilt on every per-frame call.

### `src/fx/pixel`: Changes needed (scoped)

- **P1 HIGH (hard rule "colour is never the only signal") `hud.ts:72-99` `bakeEdgeArrow`:** the off-screen body's band is shown only by the fill colour. Stamp the band's pattern ink, or a pip row, into the silhouette. If design-lead rules that the band is not needed on the arrow, draw it in a neutral colour instead. This blocks wiring the edge arrow (T-20/PX-7), not M1.
- MEDIUM `player.ts:183`: `hexToRgb('#FFFFFF')` renders on the player. Use `palette.flash.color`.
- MEDIUM `player.ts:196`: the flash shade mix `0.35` belongs in `palette.pixel`.
- LOW `tiles.ts:56-82` and `scenery.ts:98`: the inline mix ratios and alphas belong in `palette.pixel`.
- LOW `tiles.ts:13`, `atlas.ts:212,249` and `playerBody.ts:11-18`: they repeat `palette.pixel.tileSize` and the body size. Use one constant and assert it against the palette.
- The drift test is real: `sheets.test.ts:23-33` decodes the committed PNGs and compares every RGBA byte.

### Audio engine: Approve

What holds:
- No timers.
- Every Web Audio call is guarded.
- The gesture unlock removes its listeners.
- A voice cap and a tone-length cap are in place.
- Audio only reads events.

Findings:
- MEDIUM `engine.ts:189-361`: `createAudioEngine` is a 170-line closure. Every inner function is under 50 lines, so it is accepted as a module object. Move `tone()` (47 lines, at the limit) and the graph helpers into their own file before SFX (M2-16) grows it.
- LOW `engine.ts:304-319`: `voices += 1` runs before `o.start()`. If `start` throws, the catch returns without decrementing or disconnecting. Increment after `start`, or decrement in the catch.
- LOW `engine.ts:342-349`: `as unknown as AudioBuses`. Type the buses so no double cast is needed.

### ui gear meter: Approve

What holds:
- `destroy()` frees the container and its children.
- No Phaser objects are created after construction.
- Redraws are skipped when nothing changed.
- Reduced motion turns the drop pulse off.
- Cells use pattern glyphs, and the selected and buffered gears are shown by shape.

Findings:
- MEDIUM `gearMeter.ts:46`: a local `MAX_GEAR = 4` duplicates core's `MAX_GEAR`. `gearMeterPlan.ts:83-84` keeps local `BANDS`/`GEARS` lists. Import them from `core/types`.
- MEDIUM `gearMeter.ts:67`: the needle is `|vx| / gearSpeeds[1]`, which assumes evenly spaced gears and ignores `colorBandEdges`. A retune would misalign the needle and the cells. Interpolate through `gearSpeeds` and the band edges, and add an uneven-speed test.
- LOW:
  - `gearMeterPlan.ts:30`: `pattern: string` should be `PatternId`.
  - `GearMeterView.ts:1`: `import type Phaser`.
  - `GearMeterView.ts:190-204`: the stroke and radius literals belong in the layout.
  - `GearMeterView.ts:68`: key caps are read once (rebinds need a new view).

## Other work this batch (for the record)

- **M1-44** (`tests/levels/robustness.test.ts`, shared loading in `tests/levels/shipped.ts`):
  - What it does: every shipped recording still wins when any single input transition moves 1-3 steps earlier or later. A crossed neighbour is pushed, so a 1-step tap moves as a whole. The last run is held 1 s longer, so a recording that only ends a few steps short is not counted as a loss.
  - Shipped levels: all 6 pass (w0-02, w1-01 to w1-05).
  - Self-check: an in-memory shaft fixture must be flagged.
  - Demo: a temporary `tests/levels/zz-demo-exact.test.ts` ran the timing-exact recording `78R 120.` through the real assertion. It failed with "transition at step 78 shifted by -1/-2/-3: did not win". The file was then deleted.
  - Replay cost: each trial starts from the cached state at its first changed frame. w0-02 takes 0.44 s, where a replay from step 0 took 2-6 s and timed out under coverage.
  - Each level case has a 30 s timeout.
- **T-02:**
  - `~ * < >` are now `RESERVED_CHARS`: a parse error with the "reserved" message, and they must never be reused.
  - The `mud`, `conveyor` and `boost` tile kinds are gone from `Tile`, `TILE_KINDS` and `TILE_LEGEND`.
  - `mudMaxGear`, `boostPadGear`, `ghostSpacingTiles` and `ghostLifetimeMs` are removed from `Tuning` and `TUNING_SCHEMA`, and their derived fields from `SimParams`.
  - `=` ice stays as a Should.
  - "speed camera" becomes "speed gate" in `level-format.md` and `architecture.md`. The kind is still `camera` until G-1.
  - Mechanical edits outside tech-lead's area:
    - `src/core/sim/params.ts` (4 lines);
    - `src/core/sim/collision.test.ts:43-44`, `step.test.ts:227-229`, `params.test.ts:34` (the cut kinds and fields);
    - `src/core/motion/testkit.ts:48-51` (4 lines). The motion lane was running, but without this edit typecheck breaks. The motion lane was told through `requests.md`.
  - No `src/core` behaviour changed.
