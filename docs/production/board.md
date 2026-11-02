# Redshift — Task Board

_Owner: producer. Last updated: 2026-11-02 (Mon), re-plan for GDD v1.1 (hold-to-move). Jam closes 2026-12-01 21:37 UTC; studio submits 2026-11-30._

**Status:** on track, tight. Design (M1-01) and the scaffold (M1-02) exist in the repo; v1.1 alignment is running (Batch A). Nothing is Done yet: Done needs tech-lead review and qa-tester verification. Biggest M1 exposure: the `src/core` simulation lane is 7 serial sittings (M1-06, 47, 08, 10, 11, 12, 13). The core split requested in `requests.md` (M1-41) takes about 3 other tasks off that lane; without it the lane is 10 sittings and M1 (Nov 8) is at risk.
**Critical path (M1):** M1-39 + M1-41 → M1-06 → M1-47 → M1-08 → M1-10 → M1-11 → M1-12 → M1-13 → M1-21 → playtest M1-28 (Nov 7) → tuning M1-29 → gate M1-37 (Nov 8). Side lanes (motion, level, scene, UI, art, audio, backend) have slack and must not block it.

Line format: `- [Mx] <id> · <task> — owner: <agent> — accept: <criteria> — needs: <ids or none>`
Task ids are `M1-nn`, `M2-nn`, `M3-nn`, `M4-nn`, `S-nn`, and `USER-n` for things only the user can do.
"Reviewed" means tech-lead approved; "verified" means qa-tester passed the acceptance criteria. A task is Done only after both (see `CLAUDE.md` pipeline). Tech-lead's own deliverables (M1-02, M1-39, M1-41, M2-03, M2-24) have no second reviewer in the pipeline; qa-tester verifies them and the code-reviewer agent should read the code.

**Lane tags.** If `docs/production/requests.md` split (M1-41) is accepted, `src/core` becomes three areas, each worked by one gameplay-engineer sitting at a time, plus the scene lane. Tags in task lines: **[sim]** `src/core/sim/**` (state, step orchestration, jump and collision, color gating, reset, tuning loader), **[motion]** `src/core/motion/**` (pure speed maths: gears, ground acceleration and braking, bands, air drag), **[level]** `src/core/level/**` (parser, input-log codec, replay, loader), **[scene]** `GameScene.ts` and `src/entities/**`. If the split is refused, the tags still show the order the lane must run in (sim order is the critical path; run motion and level work in the gaps).

---

## Decisions to revisit (provisional, user has not overruled)

Both were set by the producer/design-lead as defaults on 2026-11-02 and are recorded in `docs/design/decisions.md`. They are tied to the M1 playtest (M1-28, Nov 7). Verdicts are made by design-lead in M1-29 (Nov 7–8) and written to `decisions.md`; the user gets them in the Nov 8 gate summary. Deadline for changing either one cheaply is **M1-29**: World 2 levels (the first that depend on air rules) start about Nov 11.

| # | Provisional decision | What the playtest must answer | Cost if changed after M1-29 |
|---|---|---|---|
| D-1 | **No air control.** Held directions never change velocity in the air (GDD §4.9). | Do fresh players feel robbed of control, or do they plan the takeoff? Do they blame the game for failed jumps? | GDD §4.9, air-drag spec, every world 2–5 sketch and solution recording. Fallback (a nudge that cannot change band) complicates the drag maths. |
| D-2 | **Letting go brakes at the same rate as shifting down** (`brakeTilesPerGearChange`, one rule). | Is tapping the arrow a clean way to slow down, or do players want a faster release brake? | A new tuning key plus a small core change; level numbers for stopping (3.74 tiles from sprint) move. |
| D-3 (GDD §12.1) | **Stepwise air drag** (a visible instant drop every 6 tiles). | Does the drop read as a rule or as a bug, with the band-drop flash and clunk? | Needs continuous drag and re-tuning of all flight numbers. Fallback described in the GDD. |

---

## Next batches

A **batch** is one agent sitting per owner area (and per lane), with no dependencies between tasks inside the batch. "Sitting" means hours, not days. A batch starts when what it needs is at least in Review. Idle owners are pulled forward onto later work.

**Batch A — running now (Nov 2)** — see Doing:
1. tech-lead — M1-39 (v1.1 alignment: types, tuning type test, architecture, level-format, `.gitattributes`, README, CREDITS)
2. art-director — M1-22 palette, M1-23 per-gear patterns, M2-14 color-blind doc
3. ui-engineer — M1-16 storage, settings and key bindings (all bindings active at once), M1-40 Sticky Keys tip logic

**A+ — ready now, no area conflicts with A (launch if the orchestrator has capacity; none of these waits on M1-39):**
4. design-lead — M2-01 (specs part 1: HUD meter, Sticky Keys tip, controls screen, onboarding hints)
5. qa-tester — M1-26 M1 test plan from the rewritten v1.1 criteria
6. backend-engineer — M1-19 Supabase schema and RLS draft
7. audio-designer — M1-24 audio engine wrapper

**A-tail — tech-lead, right after M1-39:** M1-41 split `src/core` into `sim/`, `motion/`, `level/` and publish the lane contracts (small; it gates Batch B). If tech-lead is still in M1-39, it may fold this in.

**Batch B — starts when M1-39 and M1-41 land (target Nov 3):**
1. gameplay-engineer **[sim]** — M1-06 sim skeleton, tuning loader, v1.1 state
2. gameplay-engineer **[motion]** — M1-09 ground speed model (pure functions, tested against GDD §5.1/§5.2)
3. gameplay-engineer **[level]** — M1-07 level parser (CRLF tolerant)
4. tech-lead — M1-03 feasibility review of the M1 specs
5. ui-engineer — M2-08 HUD gear meter component (needs only A's palette and patterns)
6. level-designer — M1-20 grey-box room `levels/w0-02.txt` (hand-checked against `level-format.md`; M1-21 re-checks it with the real parser)
7. design-lead — M2-34 (specs part 2: title, level select, pause and results, progress, loader behaviour)
8. backend-engineer — M1-18 itch.io zip packaging
9. audio-designer — M2-17 SFX set (including the air-drag "clunk")

Priority if the orchestrator can run fewer concurrent sittings: sim (M1-06) > motion (M1-09) > tech-lead M1-03 > level (M1-07) > the rest.

**Batch C — starts when B's tasks are at least in Review (target Nov 4–5):**
1. gameplay-engineer **[sim]** — M1-47 shift, direction, facing and ground-speed wiring (needs M1-06, M1-09)
2. gameplay-engineer **[motion]** — M1-45 air drag pure functions (needs M1-09)
3. gameplay-engineer **[level]** — M1-43 input-log codec and `runInputLog` (needs M1-06, M1-07)
4. gameplay-engineer **[scene]** — M1-14 GameScene with all key bindings (needs M1-06, M1-07, M1-16)
5. tech-lead — M1-30 review core A (M1-06, M1-07, M1-09)
6. art-director — M2-15 `src/fx` tile and player module, with the band-drop flash (needs M1-23, M2-14)
7. ui-engineer — M2-13 controls screen (needs M2-01, M1-16)
8. design-lead — M2-02 World 3 tile specs (Must; lead time before M3)
9. backend-engineer — M2-18 Supabase client skeleton (needs M1-19)

Priority if constrained: sim (M1-47) > scene (M1-14, M1-15 and the playtest need it) > level (M1-43 is needed by M1-13) > motion (M1-45 is needed only by M1-11).

**After C (sketch, re-planned at each batch close):** D: sim M1-08, level-lane idle, tech-lead M1-31, M1-04 and M2-40 (SaveStore at start-up), ui M1-17, qa starts M1-27 when M1-15 lands. E: sim M1-10, scene M1-15 (needs M1-10 to M1-12), tech-lead M1-32. F: sim M1-11, level-designer M1-21 once M1-13 lands. G: sim M1-12. H: sim M1-13, then M1-21, M1-25, M1-28 playtest (Nov 7), M1-29, M1-37 (Nov 8). Level-designer and audio-designer have slack Nov 3–6 by design.

---

## User actions (not agent tasks)

- `USER-1` — **DONE 2026-11-02:** repo created at https://github.com/PatrickDCarey/Shift (private until release), `git init` done, two commits pushed, MIT license chosen (`LICENSE` exists). The remaining step, making it public, is `USER-6`.
- `USER-2` — by **Nov 14**: create the **Supabase project**. Run `backend/migrations/*.sql`, then put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env`. Put the service role key only in Supabase function secrets. `backend/README.md` (M1-19) has the exact steps. Needed by M3-12. If skipped, the game ships offline-only (see cut-list).
- `USER-3` — by **Nov 26**: create the **itch.io game page as a draft** (kind: HTML, "play in browser", 960×540, restricted visibility) and upload a test zip from `npm run package`. Optional: create a butler API key and store it as a GitHub secret. Needed by M4-15.
- `USER-4` — by **Nov 29**: confirm you are signed up for the **GitHub Game Off 2026** jam on itch.io, then **publish** the page and **submit the entry** on **Nov 30** with the public repo link (S-03, S-06).
- `USER-5` — standing: review windows. design-lead has the final say on feel, so you only need to look at the milestone gate summaries (about 30 minutes each, at Nov 8, 15, 22, 28). The Nov 8 summary includes the D-1/D-2/D-3 verdicts.
- `USER-6` — on **Nov 30 (morning, before S-02)**: **make the GitHub repo public** (Settings, Danger zone, Change visibility) after the secrets audit (M4-09) is clean. The jam requires a public repo. I will remind you at the M4 gate (Nov 28).

---

## Doing

Batch A, running in parallel on 2026-11-02 (no two share an area):

- [M1] M1-39 · v1.1 alignment: update `Tuning` and `SimState` in `types.ts` (keys `minGear`, `startGear`, `instantMaxGear`; no `pivotMaxBand`; gears 1–4; direction priority, facing, shift buffer, drag counter, grace and coyote state; step order GDD §4.14), add `dragDrop` to the event list, make the tuning type test fail when `tuning.json` and `Tuning` diverge, update `architecture.md` and `level-format.md` (fix the w0-01 example text; require CRLF tolerance), add `.gitattributes` (`* text=auto eol=lf`), `README.md` (what it is, play, run, MIT, link to CREDITS) and `CREDITS.md` — owner: tech-lead — accept: every key in `tuning.json` is in `Tuning` and vice versa (test); `SimState` can express every rule in the M1 specs; `npm run check` passes; README commands match `package.json` — needs: M1-02
- [M1] M1-22 · `src/data/palette.json`: five gear colors per the GDD plus white, background, ghost color, and a pattern id per band — owner: art-director — accept: keys match the types; gameplay colors have ≥ 3:1 contrast against the background (numbers noted in `docs/art/`) — needs: M1-02
- [M1] M1-23 · Per-gear pattern definitions and textures generated in code (`src/fx/patterns.ts`) — owner: art-director — accept: five distinct patterns plus the white/safe pattern, shown in a screenshot at `docs/art/patterns.png`; id-to-pattern mapping unit-tested — needs: M1-22
- [M2] M2-14 · `docs/art/accessibility.md`: palette under deuteranopia, protanopia, tritanopia; adjust patterns if gears confuse — owner: art-director — accept: each gear distinguishable by pattern alone in the simulation images (screenshots of the real game are added at M2-29) — needs: M1-22, M1-23
- [M1] M1-16 · Safe storage wrapper (`src/save`), settings store, and the key-binding table with every binding **active at once**: shift down = Left Shift, Q, Z; shift up = Right Shift, E, X; move = arrows and A/D; jump = Space, W, Up; restart = R — owner: ui-engineer — accept: never throws when storage is blocked (test); every action has at least one binding; no key maps to two actions; Left and Right Shift are told apart by `e.code`; pure helpers `heldActions`, `toSimButtons`, `boundCodes` (no Phaser) for the input sampler; unit tests — needs: M1-02
- [M1] M1-40 · Sticky Keys tip logic (pure): "should show" is true only on Windows (user agent) and only until dismissed once; dismissal saved via the safe storage — owner: ui-engineer — accept: true on a Windows user agent when unseen, false after dismissal, false on macOS/Linux/mobile user agents; blocked storage does not throw (falls back to memory, may show again next session); the non-blocking overlay (`StickyKeysTipView`, Q/E and Z/X glyphs, dismissable) is part of this task and only needs a scene to be mounted (M2-39); unit tests — needs: M1-16

## Review

Exist in the repo; waiting on tech-lead review and qa-tester verification (M1-03 reviews the specs; M1-35/M1-36 verify).

- [M1] M1-01 · Expand the GDD; write M1 feature specs in `docs/design/features/`; write `src/data/tuning.json` and `docs/design/level-plan.md` — owner: design-lead — accept: each spec has Rule/Edge cases/Tuning/Acceptance/Priority; every tuning key from the GDD present; level-plan lists worlds 1–5 with one idea per level — needs: none. _State: GDD v1.1, five specs rewritten for hold-to-move, level plan v1.1 (21 levels), `decisions.md` current._
- [M1] M1-02 · Scaffold Vite + Phaser + TypeScript + Vitest + Playwright; `src/core/types.ts`, `docs/tech/architecture.md`, `docs/tech/level-format.md`, CI workflow, `.env.example`, `.gitignore`, `LICENSE` — owner: tech-lead — accept: `npm run dev/test/build` run; vite `base` is `./`; types cover InputFrame, SimState, Tile, Level, InputLog; CI runs typecheck, test and build; `.env.example` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only — needs: none. _State: files present, coverage and dist outputs exist. Types are v1.0 until M1-39._

## Done

_(empty)_

---

## Todo — M1 Grey-box (Nov 3–8)

Target pacing: Nov 2 Batch A, A+ and M1-41. Nov 3 Batch B. Nov 4–5 Batch C. Nov 5–7 the sim lane finishes (M1-08 to M1-13) and the scene becomes playable. Nov 7 playtest (M1-28) and tuning pass (M1-29), with the D-1 to D-3 verdicts. Nov 8 QA gate.

### Design
- [M1] M1-25 · Approve the grey-box room (layout and solution) against the specs — owner: design-lead — accept: approval or change list recorded in `docs/design/decisions.md`; room demonstrates all five M1 mechanics — needs: M1-21
- [M1] M1-29 · Tuning pass 1 from the playtest report, **plus a keep/change verdict on D-1 (no air control), D-2 (release braking) and D-3 (stepwise drag)** — owner: design-lead — accept: every `tuning.json` change has a one-line reason in `decisions.md`; each of D-1 to D-3 has a written verdict and the board section above is updated by the producer; unit tests still pass after the change — needs: M1-28

### Tech
- [M1] M1-03 · Feasibility review of the M1 feature specs v1.1 (pipeline step 3) — owner: tech-lead — accept: written notes in `docs/tech/spec-review-m1.md`; GDD §4.14 step order confirmed implementable or an alternative proposed; blocking issues raised to design-lead via requests — needs: M1-01, M1-39
- [M1] M1-04 · Guard rails: the core-purity arch test and the 80% coverage threshold already exist; add the ESLint (or arch-test) ban on Phaser, `Math.random`, `Date` for every `src/core` sub-folder, and a CI secret check (no `.env`, no service key patterns) — owner: tech-lead — accept: a deliberate violation in each of `sim/`, `motion/`, `level/` fails CI (shown and reverted); coverage gate fails below 80% (shown and reverted); a planted fake key fails the secret check — needs: M1-41
- [M1] M1-05 · Commands section of `CLAUDE.md` (exists) gets the `npm run package` row and is checked against `package.json` — owner: tech-lead — accept: every listed command runs — needs: M1-18
- [M1] M1-41 · **Split `src/core`** (see `requests.md`): create `src/core/sim/`, `src/core/motion/`, `src/core/level/`; keep `types.ts` shared; add the lane contracts to `types.ts` (function types for the ground-speed step, band lookup, air-drag step, level parser, input-log codec and `runInputLog`); update `architecture.md` §2/§6/§10 and the core-purity arch test to cover every sub-folder; the coverage threshold still covers `src/core/**` — owner: tech-lead — accept: `npm run check` passes with the empty folders; the arch test fails if a file in any sub-folder imports Phaser (shown, reverted); contracts documented; a request is filed naming the roster rows for `CLAUDE.md` — needs: M1-39
- [M1] M1-30 · Review core A (sim skeleton, speed model, level parser) — owner: tech-lead — accept: Approve with no CRITICAL/HIGH findings, or Changes needed with a `file:line` list — needs: M1-06, M1-07, M1-09
- [M1] M1-31 · Review core B (shift/direction wiring, vertical and collision, air drag functions, codec and `runInputLog`) — owner: tech-lead — accept: as M1-30 — needs: M1-47, M1-08, M1-45, M1-43
- [M1] M1-32 · Review core C (color gating, air commitment, reset and exit, determinism test) — owner: tech-lead — accept: as M1-30; determinism test inspected — needs: M1-10, M1-11, M1-12, M1-13
- [M1] M1-33 · Review scene work (GameScene, debug overlay, BootScene) — owner: tech-lead — accept: as M1-30; Phaser is only used for input and drawing; all bindings come from the `src/save` table — needs: M1-14, M1-15, M1-17
- [M1] M1-34 · Review side tracks (storage, bindings and Sticky Keys logic, packaging, Supabase schema and RLS, palette, patterns, audio engine) — owner: tech-lead — accept: as M1-30; RLS reviewed by the security-reviewer agent — needs: M1-16, M1-40, M1-18, M1-19, M1-22, M1-23, M1-24

### Gameplay — **[sim]** lane (`src/core/sim/**`, serial, tests first; order M1-06, 47, 08, 10, 11, 12, 13)
- [M1] M1-06 · **[sim]** Sim skeleton: `createSim`, pure `step`, `deriveParams` with tuning validation, v1.1 `SimState`, press-edge derivation from `prevInput`, step counter, GDD §4.14 step order with later steps as stubs — owner: gameplay-engineer — accept: initial state is standing on the `@` cell, gear `startGear` (1), facing right, band 0; ms→steps exact (100 ms = 6 steps); missing or invalid tuning key throws a clear error naming the key; `step` does not mutate its inputs (frozen-object test); no Phaser/Math.random/Date; tests pass — needs: M1-01, M1-39, M1-41
- [M1] M1-47 · **[sim]** Shift, direction and ground-speed wiring: press edges move the gear one step (clamped 1–4, holding does not repeat, extra presses not stored), direction priority (latest press wins, same-step tie gives 0), facing, ground target `d × gearSpeeds[gear]` fed to the motion functions — owner: gameplay-engineer — accept: the runway-from-standing numbers of GDD §5.1 hold through `step` (vx = 3 after step 1; band 2 on step 10, 3 on step 23, 4 on step 32; vx = 12 from step 36); shifting while standing changes gear not speed; gear persists through letting go; mirrored left/right tests; tests per `movement-and-gears.md` — needs: M1-06, M1-09
- [M1] M1-08 · **[sim]** Vertical motion and solid collision: gravity with exact kinematics, jump (apex height, coyote, jump buffer), safe-tile collision, wall stop (vx = 0, gear kept), ceiling, level bounds (left/right/top solid, bottom open), supported test — owner: gameplay-engineer — accept: apex = `jumpHeightTiles` ±0.1 on step 24; flat jump is 48 steps; coyote and buffer windows match tuning; a 2-tile ledge is reachable, a 3-tile ledge is not; jump plus arrow from standing gives a walking jump (3 tiles/s); tests per `jump.md` — needs: M1-06, M1-07
- [M1] M1-10 · **[sim]** Color-gated tiles: solid only on a matching band, no-embed rule, landing needs a match, walking onto a mismatch is a hole, grace (6 steps, from above only, replaced by a new change, ended by leaving the ground), coyote starts when grace ends — owner: gameplay-engineer — accept: grace boundary tests (exactly 6 steps holds, step 7 falls); colored walls stop only their color; grace never applies on landing or to walls or ceilings; tests per `color-gating.md` — needs: M1-08, M1-47
- [M1] M1-11 · **[sim]** Air commitment: held directions never change velocity in the air, shift presses are buffered (net count, 6-step window, applied on landing, clamped 1–4), gear follows color down but never up, stepwise drag via the motion function (floor at `airDragMinBand`, counter reset on landing, counts during coyote), `dragDrop` event emitted — owner: gameplay-engineer — accept: GDD §5.3 table through `step` (gear 4 flat jump 8.7 tiles, drop at step 30, lands yellow; gear 3 drop at step 40, lands green; gears 1–2 keep their color; standing jump stays white); letting go in the air does not brake; tests per `air-drag.md` — needs: M1-10, M1-45
- [M1] M1-12 · **[sim]** Death, restart and exit: falling out of the grid freezes 24 steps then respawns; R restarts at any time (even during the freeze) on the next step; reset restores the whole initial state including gear 1; buttons held through a respawn act normally but are not new presses; touching `E` wins in any color and gear, and wins over death on the same step; level time is the step count — owner: gameplay-engineer — accept: state after reset deep-equals the initial state; works mid-air, mid-shift and mid-skid; tests per `safe-tiles-and-reset.md` — needs: M1-08, M1-47
- [M1] M1-13 · **[sim]** Determinism golden test: the same log run twice gives an identical state hash; a golden hash is checked in; mirrored left/right runs match; `src/core` coverage ≥ 80% shown in the report — owner: gameplay-engineer — accept: all four items demonstrated; golden hash changes only with a recorded reason — needs: M1-10, M1-11, M1-12, M1-43

### Gameplay — **[motion]** lane (`src/core/motion/**`, pure functions of numbers, no level or state)
- [M1] M1-09 · **[motion]** Ground speed model: segment acceleration and braking derived at load (`tilesPerGearChange`, `brakeTilesPerGearChange`), instant walking range (`instantMaxGear`), slowing, skid and instant turn at walking pace, band lookup (edge belongs to the higher band) — owner: gameplay-engineer — accept: stepping the functions at 60 Hz on flat ground reproduces GDD §5.1 and §5.2 (from standing at gear 4: 3 exact after step 1, band 2 step 10, band 3 step 23, band 4 step 32 at 3.23 ±0.15 tiles, 12 exact from step 36; letting go at 12 stops at step 35 after 3.74 ±0.15; gear-4 reversal turns on step 35 after 3.72); left/right mirror tests; no Phaser/Math.random/Date — needs: M1-39, M1-41
- [M1] M1-45 · **[motion]** Air drag as a pure function: accumulate `|Δx|`, drop exactly one band per `airDragTilesPerGear`, floor at `airDragMinBand`, at most one drop per step, counter carries over — owner: gameplay-engineer — accept: a gear-4 flight drops at 6.0 tiles and again at 12.0; gear 2 and below never drop in a 5.9-tile flight; blue never drops; one drop per step even for a huge Δx; tests per `air-drag.md` — needs: M1-09

### Gameplay — **[level]** lane (`src/core/level/**`)
- [M1] M1-07 · **[level]** Level parser per `level-format.md` v1.1: header and grid, every tile glyph, `@` start, `E` exit, validation errors naming file, row and column, **tolerates `\r\n`** — owner: gameplay-engineer — accept: one test per tile glyph; a CRLF copy of a level parses to the same `Level` as the LF copy; malformed input (ragged rows, two `@`, no `E`, unknown key, `id` ≠ stem) gives the documented error; no Phaser/Math.random/Date — needs: M1-39, M1-41
- [M1] M1-43 · **[level]** Input-log codec (run-length text, CRLF tolerant) and `runInputLog(level, params, log)` returning final state and status — owner: gameplay-engineer — accept: encode then decode is the identity; invalid tokens give a descriptive error; `runInputLog` equals manual stepping of the same frames; `steps` header check — needs: M1-06, M1-07

### Gameplay — **[scene]** lane (`GameScene.ts`, `src/entities/**`)
- [M1] M1-14 · **[scene]** GameScene: fixed-step accumulator (capped steps per frame), input sampler that latches taps, **every binding active at once**: the sampler (in `src/entities/`, gameplay-engineer's area; `keys.ts` stays scene keys only) tracks held `e.code` values from native keydown/keyup, calls `heldActions` and `toSimButtons` from `src/ui/bindings.ts` each step, uses restart and pause on press edges, and calls `addCapture(boundCodes())` (Left/Right Shift by `e.code`, Q/E, Z/X, arrows and A/D, Space/W/Up, R), draws tiles and the player tinted by band color (band pattern once M1-23 lands) — owner: gameplay-engineer — accept: runs in the dev server at 960×540; sim step rate is independent of display fps (mocked-clock test); each of Right Shift, E and X raises the selected gear by one and each of Left Shift, Q and Z lowers it; a key tap shorter than one frame is not lost; page does not scroll; the sampler has a unit test with fake key events — needs: M1-06, M1-07, M1-16
- [M1] M1-15 · **[scene]** Debug overlay (F3: gear, band, speed, direction, facing, grounded, air distance and drag counter, grace and coyote timers) and a dev-only read-only state hook `window.__redshift` — owner: gameplay-engineer — accept: overlay values match sim state; hook is absent from the production build (search of `dist/` shown) — needs: M1-10, M1-11, M1-12, M1-14

### UI
- [M1] M1-17 · BootScene starts GameScene; canvas focus on click and a "click to focus" cue; `preventDefault` for Space and arrows; no page scroll inside an iframe — owner: ui-engineer — accept: game starts in the dev server with no console errors; keys do not scroll the page — needs: M1-14

### Backend / release
- [M1] M1-18 · `npm run package`: production build zipped for itch.io — owner: backend-engineer — accept: unzip into a subfolder, serve it, and the game loads (relative paths); zip has no `.env` or secrets — needs: M1-02
- [M1] M1-19 · Supabase schema draft: `backend/migrations/0001_runs.sql` with RLS (public read, no client writes), plus `backend/README.md` listing the exact steps the user must do — owner: backend-engineer — accept: policies deny anon insert/update/delete; no keys in the repo; README steps are copy-pasteable — needs: none

### Level design
- [M1] M1-20 · `levels/w0-02.txt` (the grey-box room; `w0-01` stays the format example, and ids must equal the file stem) with a `levels/README.md` entry: safe start, color-gated floors, a runway to a red bridge (red needs 4 tiles, deny with 2.5), a gap needing air drag onto a yellow pad (a gear-4 takeoff flies 8.7 tiles and lands yellow), a safe tile mid-room to stop on — owner: level-designer — accept: follows `level-format.md`; each M1 mechanic (gears, runway, color gating, air drag, safe tiles and reset) is used at least once; parse is re-checked with the real parser in M1-21 — needs: M1-01, M1-39
- [M1] M1-21 · Solution recording `levels/w0-02.solution.txt`, verified with `runInputLog` — owner: level-designer — accept: the room parses with the M1-07 parser; replay reaches the goal; still reaches the goal with key inputs shifted ±3 steps — needs: M1-13, M1-20, M1-43

### Art
(M1-22 and M1-23 are in Doing.)

### Audio
- [M1] M1-24 · `src/audio/engine.ts`: lazy AudioContext resumed on the first keydown/click, master/music/SFX buses, mute, tone helper — owner: audio-designer — accept: nothing throws before a gesture (mocked-context unit tests); mute and bus volumes tested — needs: M1-02

### QA and playtest
- [M1] M1-26 · `docs/qa/test-plan.md`: every M1 acceptance criterion in the v1.1 specs mapped to unit, replay, e2e or manual, using the test conventions in `movement-and-gears.md` — owner: qa-tester — accept: each criterion in the five M1 specs appears exactly once; the alternate-binding and Sticky Keys checks are listed — needs: M1-01
- [M1] M1-27 · Playwright smoke test: boot, canvas is 960×540, no console errors, state hook reachable; Right Shift, E and X each raise the selected gear by one and Left Shift, Q and Z each lower it; Space and arrows do not scroll the page — owner: qa-tester — accept: `npm run test:e2e` passes locally; test file at `tests/e2e/smoke.spec.ts` — needs: M1-15, M1-17
- [M1] M1-28 · Fresh-eyes playtest of the grey-box room (first 30 seconds, feel of acceleration, confusion points) **answering three questions: air control (D-1), release braking (D-2), stepwise drag (D-3)** — owner: playtester — accept: report at `docs/playtests/2026-11-07-m1-greybox.md` per the playtest template, with a direct answer to each of D-1 to D-3 — needs: M1-21, M1-27
- [M1] M1-35 · Verify the simulation against the M1 specs; run the full suite — owner: qa-tester — accept: each spec criterion Pass/Fail with evidence; unit test counts and coverage reported; core coverage ≥ 80% — needs: M1-26, M1-30, M1-31, M1-32
- [M1] M1-36 · Verify side tracks and repo files (storage, bindings, Sticky Keys logic, packaging, palette, patterns, audio engine, v1.1 types, `.gitattributes`, README, CREDITS) — owner: qa-tester — accept: each task's accept line checked with evidence — needs: M1-26, M1-34, M1-39, M1-41
- [M1] M1-37 · **M1 gate**: the grey-box room plays end to end in the browser with every alternate binding; full suite, typecheck and production build pass — owner: qa-tester — accept: no open blocker or major bug in `docs/qa/bugs.md`; playthrough with the solution recording matches the replay result — needs: M1-25, M1-29, M1-33, M1-35, M1-36

### Producer
- [M1] M1-38 · M1 close-out: check the repo against the board, move tasks, record D-1 to D-3 verdicts on this board, re-plan M2 — owner: producer — accept: board and files agree; M2 start batch listed — needs: M1-37

---

## Todo — M2 First worlds (Nov 9–15)

Done when: level loader, solution replay test, worlds 1–2 (8 levels), HUD gear meter, title and level select, Sticky Keys tip.

### Design and tech
- [M2] M2-01 · Specs part 1: HUD gear meter (selected gear 1–4 beside the current band, in-air drag meter, pattern per gear), Sticky Keys tip overlay, controls screen, onboarding glyph hints (arrow glyph at the w1-01 spawn, Shift/E/X glyph on the first white pad of w1-02), color-blind patterns in play — owner: design-lead — accept: each spec has Rule/Edge cases/Tuning/Acceptance/Priority — needs: M1-01
- [M2] M2-34 · Specs part 2: title, level select (locked, unlocked, best steps), pause and results, progress save, loader and replay-test behaviour — owner: design-lead — accept: as M2-01 — needs: M1-01
- [M2] M2-02 · Specs for World 3 tiles (mud, ice, boost pads, speed cameras; colored walls need no new spec, see GDD §4.7) with tuning keys — owner: design-lead — accept: edge cases cover each tile at each gear; keys added to `tuning.json` — needs: M1-01 (Must)
- [M2] M2-03 · Approve M2 specs; finalize `level-format.md` (including optional onboarding **hint** headers: glyph id and tile position) and shared types for loader, solution recording, RunResult and hints — owner: tech-lead — accept: `types.ts` and `level-format.md` updated; changes announced via requests — needs: M2-01, M2-34
- [M2] M2-40 · `src/main.ts` creates one `SaveStore` at start-up (`createSaveStore()`), shares it with scenes through the Phaser registry (registry key in `src/scenes/keys.ts`) and documents it in `architecture.md` — owner: tech-lead — accept: scenes read the store from the registry (no second store); the game still boots with storage blocked (e2e or unit test) — needs: M1-16
- [M2] M2-24 · Repo readiness (repo stays private until S-02): `README.md` play and run instructions, `LICENSE` (MIT), `CREDITS.md` complete, CI green on GitHub — owner: tech-lead — accept: README commands run; `CREDITS.md` lists every third-party asset or says none; latest CI run on `main` is green (link in the report) — needs: M1-39
- [M2] M2-23 · Approve World 1 and 2 levels (rolling, per pair as they land) — owner: design-lead — accept: each level has a one-line verdict in `decisions.md`; any rejection names the pillar broken — needs: M2-22

### Gameplay
- [M2] M2-04 · **[level]** Level loader: all `levels/*.txt` via Vite glob, header parse including hint headers, validation errors naming the file — owner: gameplay-engineer — accept: loads every level in `levels/`; a bad file gives a descriptive error naming the file; CRLF files load identically — needs: M2-03, M1-43
- [M2] M2-05 · **[level]** Solution replay test: Vitest replays every level's recording and fails if any does not finish — owner: gameplay-engineer — accept: a deliberately broken recording fails the test (shown, then reverted); a level without a recording fails — needs: M2-04
- [M2] M2-06 · **[scene]** Progression in GameScene: goal reached gives a complete event with step count, restart, next level — owner: gameplay-engineer — accept: completing a level reports steps equal to the replay's and calls `store.recordLevelComplete(levelId, wonAtStep)` on the shared SaveStore — needs: M2-04, M2-40
- [M2] M2-09 · **[scene]** Mount the HUD gear meter in GameScene — owner: gameplay-engineer — accept: meter updates every step; selected gear and band match sim state; drag meter fills in the air — needs: M2-08, M2-06
- [M2] M2-39 · **[scene]** Mount the Sticky Keys tip (`showStickyKeysTipIfDue` from `src/ui/StickyKeysTipView.ts`, store from the registry, first level start of the page session) and the onboarding hint glyphs in GameScene — owner: gameplay-engineer — accept: tip appears once on a Windows user agent at the first level start and never blocks input; hint glyphs appear at the positions in the level file — needs: M1-40, M2-36, M2-04, M2-40
- [M2] M2-16 · **[scene]** GameScene adopts the `src/fx` tile and player style and plays the band-drop flash and clunk on the `dragDrop` event — owner: gameplay-engineer — accept: solid and mismatched tiles differ in more than hue (screenshot); an air-drag drop shows a flash and plays the clunk — needs: M2-15, M2-17, M1-11

### UI
- [M2] M2-08 · HUD gear meter component: selected gear 1–4, current band, progress, color plus pattern, in-air drag meter — owner: ui-engineer — accept: renders from a plain state object; pattern shown for every gear; selected and current differ when standing, ramping or after drag; unit test for the pure parts — needs: M2-01, M1-22, M1-23, M1-39
- [M2] M2-36 · Onboarding hint glyph renderer (arrow, Shift, E, X glyphs; icons not text) — owner: ui-engineer — accept: renders each glyph id from a plain data object; unit test for id lookup — needs: M2-03
- [M2] M2-10 · Progress model on top of `SaveStore` (best steps are already recorded by `recordLevelComplete`): unlock rule (completing a level unlocks the next; world 0 never listed) and best-step helpers — owner: ui-engineer — accept: survives reload; blocked storage falls back to memory; unit tests for the unlock rule — needs: M1-16, M2-34
- [M2] M2-11 · Title scene and level select (keyboard nav, locked and unlocked, best steps) — owner: ui-engineer — accept: reachable with keyboard only; locked levels cannot start — needs: M2-34, M2-04, M2-10
- [M2] M2-12 · Pause and results scenes (retry, next, back to select) — owner: ui-engineer — accept: pause freezes the sim; results show steps and best — needs: M2-06, M2-11
- [M2] M2-13 · Controls screen: lists every binding including Q/E and Z/X, with "show the Sticky Keys tip again". No remapping (Could) — owner: ui-engineer — accept: reachable and usable without Shift; every binding from the `src/save` table is listed — needs: M2-01, M1-16

### Art and audio
- [M2] M2-15 · `src/fx` tile and player visual module (solid vs mismatched: brightness, fill, outline, pattern) plus a one-shot band-drop flash — owner: art-director — accept: module has a documented API for GameScene; screenshots show solid vs ghost at a glance; flash is visible without color (brightness pulse) — needs: M1-23, M2-14
- [M2] M2-17 · SFX set behind one function each: shift up, shift down (distinct), jump, land, fall-through, reset, level complete, UI move, UI select, **air-drag clunk** (ten) — owner: audio-designer — accept: all ten exist; audible at low volume (noted in the report); clunk is clearly different from shift down — needs: M1-24

### Backend
- [M2] M2-18 · `src/net` Supabase client skeleton: timeout, quiet failure, no-op when env is missing — owner: backend-engineer — accept: unit tests with a mocked fetch: timeout, 500 and offline all resolve without throwing — needs: M1-19

### Level design
- [M2] M2-19 · World 1 levels w1-01 (First Steps) and w1-02 (Shift), each with a recording and the onboarding hint headers — owner: level-designer — accept: replay test passes; headers set; safe spot near the start; w1-01 fails if you let go on the bridge; recordings survive ±3 steps — needs: M2-01, M2-05, M2-03
- [M2] M2-20 · World 1 levels w1-03 (Runway) and w1-04 (Brake) with recordings — owner: level-designer — accept: as M2-19; w1-03 red bridge 2 tiles out, 8-tile safe room behind — needs: M2-19
- [M2] M2-21 · World 2 levels w2-01 (Commit) and w2-02 (Coast) with recordings — owner: level-designer — accept: as M2-19; w2-01 uses a green runway, w2-02 teaches drag (a yellow takeoff lands green and drops) — needs: M2-20
- [M2] M2-22 · World 2 levels w2-03 (Step Down) and w2-04 (Two Colors) with recordings — owner: level-designer — accept: as M2-19 — needs: M2-21

### Review, QA, playtest
- [M2] M2-25 · Review loader, replay test, progression, HUD mount, tip and hint mount, fx adoption — owner: tech-lead — accept: Approve, no CRITICAL/HIGH — needs: M2-04, M2-05, M2-06, M2-09, M2-39, M2-16
- [M2] M2-26 · Review UI work (including the Sticky Keys tip view from M1-40) — owner: tech-lead — accept: as M2-25 — needs: M2-08, M2-36, M2-10, M2-11, M2-12, M2-13
- [M2] M2-27 · Review art, audio and net skeleton — owner: tech-lead — accept: as M2-25 — needs: M2-14, M2-15, M2-17, M2-18
- [M2] M2-28 · E2E: boot, title, level select, play, complete, results, Q/E and Z/X shift gears, Sticky Keys tip shows once (Windows user agent emulated), controls screen — owner: qa-tester — accept: passes via `npm run test:e2e` — needs: M2-09, M2-39, M2-11, M2-12, M2-13
- [M2] M2-29 · Verify M2: all accept lines, 960×540 in an iframe, keyboard-only, alternate bindings, tip, color-blind screenshots added to `docs/art/` evidence — owner: qa-tester — accept: Pass/Fail per criterion with evidence — needs: M2-23, M2-25, M2-26, M2-27, M2-28
- [M2] M2-30 · Playtest worlds 1–2 (fresh eyes), including a re-check of D-1 and D-3 with real levels — owner: playtester — accept: report in `docs/playtests/` with per-level sections — needs: M2-29
- [M2] M2-31 · Triage the playtest into decisions (tuning, level changes, accept) and **lock the tuning numbers** — owner: design-lead — accept: each issue has a decision and a reason in `decisions.md`; the lock is recorded — needs: M2-30
- [M2] M2-32 · **M2 gate**: suite, build, worlds 1–2 verified after the decisions are applied — owner: qa-tester — accept: no open blocker or major bug — needs: M2-29, M2-31, M2-24
- [M2] M2-33 · M2 close-out and M3 re-plan — owner: producer — accept: board current; cut-list triggers checked — needs: M2-32

---

## Todo — M3 Content complete (Nov 16–22)

Done when: worlds 3–5, leaderboards live, adaptive audio, palette and shaders. World 3 (5 levels) is a Must; Worlds 4–5 (8 levels) are Should and are the first scope-cut candidates (see `cut-list.md`).

### Design and tech
- [M3] M3-01 · Specs for World 4 (conveyors, moving platforms, crates) and World 5 (afterimage) — owner: design-lead — accept: spec sections complete; keys in `tuning.json` — needs: M1-01 (Should)
- [M3] M3-02 · Specs: leaderboard UX, adaptive audio mapping, Doppler shader and reduced-effects behaviour (including the band-drop flash and clunk) — owner: design-lead — accept: spec sections complete — needs: M1-01
- [M3] M3-04 · Approve M3 specs; add shared types for new tiles — owner: tech-lead — accept: `types.ts` and docs updated, requests answered — needs: M2-02, M3-01, M3-02
- [M3] M3-28 · Approve World 3 levels — owner: design-lead — accept: verdict per level in `decisions.md` — needs: M3-40
- [M3] M3-29 · Approve Worlds 4 and 5 levels — owner: design-lead — accept: as M3-28 — needs: M3-27

(The itch.io page copy moved to M4-10, owned by design-lead; old M3-03 removed.)

### Gameplay
- [M3] M3-05 · **[sim]** Event stream completeness and determinism: shift, bandChange, dragDrop, jump, land, fallThrough, reset, won are emitted identically on replay; golden event list for the grey-box room — owner: gameplay-engineer — accept: replay of a log yields the same event list twice; tests — needs: M3-04
- [M3] M3-06 · **[sim]** World 3 tiles A: mud (caps gear at `mudMaxGear`) and ice (locks speed and gear, ignores shifts). Colored walls already exist from M1-10 — owner: gameplay-engineer — accept: tests from the spec; core coverage ≥ 80% — needs: M2-02, M3-04 (Must)
- [M3] M3-07 · **[sim]** World 3 tiles B: boost pads (instant gear 4) and speed cameras — owner: gameplay-engineer — accept: as M3-06 — needs: M3-06 (Must)
- [M3] M3-08 · **[sim]** Conveyors and moving platforms — owner: gameplay-engineer — accept: world speed vs leg speed per spec; deterministic movers; tests — needs: M3-01, M3-07 (Should)
- [M3] M3-09 · **[sim]** Crates that keep the color they were pushed at — owner: gameplay-engineer — accept: tests from the spec — needs: M3-08 (Should)
- [M3] M3-10 · **[sim]** Afterimage: gear-4 ghost platforms that expire — owner: gameplay-engineer — accept: lifetime deterministic and in tuning; tests — needs: M3-09 (Should)
- [M3] M3-21 · **[scene]** GameScene feeds state and events to audio and fx; reduced-effects flag — owner: gameplay-engineer — accept: fx and audio receive the same steps as the sim; toggling the flag removes post-processing — needs: M3-05, M3-16, M3-18

### Backend and leaderboards
- [M3] M3-11 · Edge function `submit-run` v1: payload, floor-time, name checks, per-IP rate limit; RLS tests — owner: backend-engineer — accept: unit tests for each rejection; the service key is read only from function secrets — needs: M3-02, M2-18
- [M3] M3-12 · Deploy the migration and function to the user's Supabase project; integration check — owner: backend-engineer — accept: submit then read round-trip works; direct client insert is denied — needs: M3-11, USER-2
- [M3] M3-13 · Wire `src/net` to the real endpoints (read top N, submit) — owner: backend-engineer — accept: offline, slow and error responses never block play (tests) — needs: M3-11, M2-18
- [M3] M3-14 · Results leaderboard panel, name entry, quiet offline state; best times in level select — owner: ui-engineer — accept: menus work with the network off; name rules shown — needs: M3-13, M3-02
- [M3] M3-15 · Settings: reduced effects, music and SFX volume, mute, reduced motion — owner: ui-engineer — accept: all persist; mute works before the first gesture without error — needs: M2-13, M3-02

### Art and audio
- [M3] M3-16 · Adaptive music engine: pitch and filter glide with band — owner: audio-designer — accept: low and muffled at white, bright at red; no throw before a gesture — needs: M3-02, M2-17
- [M3] M3-17 · Wire SFX to the event stream and music/SFX volume to settings — owner: audio-designer — accept: every event plays the right sound; volumes respond to settings — needs: M3-05, M3-16, M3-15
- [M3] M3-18 · Doppler tint shader, glow, particles, reduced-effects path (including a reduced band-drop flash) — owner: art-director — accept: 60 fps on a mid-range laptop (measured, noted); reduced mode removes post-processing — needs: M2-15, M3-02
- [M3] M3-19 · Final palette and tile visuals for World 3–5 pieces — owner: art-director — accept: each tile has a distinct pattern or glyph; accessibility doc updated — needs: M2-14, M2-02, M3-01
- [M3] M3-20 · itch.io cover (630×500) and first screenshot set — owner: art-director — accept: files in `assets/art/itch/`; readable at thumbnail size — needs: M3-18, M2-23

### Level design
- [M3] M3-22 · World 3 levels w3-01 (Red Wall; no new tile, may start early if the level lane is free) and w3-02 (Mud), with recordings (Must) — owner: level-designer — accept: replay test passes; one new idea each — needs: M3-06, M2-05
- [M3] M3-23 · World 3 levels w3-03 (Ice) and w3-04 (Boost) with recordings (Must) — owner: level-designer — accept: as M3-22 — needs: M3-07, M3-22
- [M3] M3-40 · World 3 level w3-05 (Camera) with recording (Must) — owner: level-designer — accept: as M3-22; the gate cannot be passed without dropping to its gear — needs: M3-07, M3-23
- [M3] M3-24 · World 4 levels w4-01 and w4-02 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-08, M3-40
- [M3] M3-25 · World 4 levels w4-03 and w4-04 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-09, M3-24
- [M3] M3-26 · World 5 levels w5-01 and w5-02 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-10, M3-25
- [M3] M3-27 · World 5 levels w5-03 and w5-04 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-26

### Review, QA, playtest
- [M3] M3-30 · Review sim and new tiles — owner: tech-lead — accept: Approve, no CRITICAL/HIGH — needs: M3-05, M3-06, M3-07, M3-08, M3-09, M3-10, M3-21
- [M3] M3-31 · Review backend and net, with the security-reviewer agent (validation, RLS, secrets) — owner: tech-lead — accept: no secrets in the repo; Approve — needs: M3-11, M3-12, M3-13
- [M3] M3-32 · Review UI, audio and fx — owner: tech-lead — accept: Approve; effects are render-only — needs: M3-14, M3-15, M3-16, M3-17, M3-18, M3-19, M3-20
- [M3] M3-33 · Verify M3: all worlds solvable, leaderboards online and offline, audio starts after a gesture, 60 fps, reduced effects — owner: qa-tester — accept: Pass/Fail per criterion with evidence — needs: M3-30, M3-31, M3-32
- [M3] M3-34 · Playtest of worlds 1–5 as a jam voter (about 10 minutes) — owner: playtester — accept: report with jam-category scores — needs: M3-33, M3-28
- [M3] M3-35 · Triage the playtest into decisions — owner: design-lead — accept: each issue has a decision — needs: M3-34
- [M3] M3-36 · **M3 gate**: suite and build pass; content complete — owner: qa-tester — accept: no open blocker or major bug — needs: M3-33, M3-35
- [M3] M3-37 · M3 close-out and freeze plan — owner: producer — accept: the freeze list is published on the board — needs: M3-36

---

## Todo — M4 Freeze (Nov 23–28)

Polish and bug fixes only. No new features.

- [M4] M4-01 · Final triage, content freeze, final tuning pass — owner: design-lead — accept: decisions logged; no new content after this task — needs: M3-37
- [M4] M4-02 · Fix level issues from playtests; re-record affected solutions — owner: level-designer — accept: replay test passes for every level — needs: M4-01
- [M4] M4-03 · Gameplay bug fixes from `docs/qa/bugs.md` (blocker and major first) — owner: gameplay-engineer — accept: each bug id verified closed by qa-tester — needs: M4-01
- [M4] M4-04 · UI polish and bug fixes — owner: ui-engineer — accept: as M4-03 — needs: M4-01
- [M4] M4-05 · Visual polish and performance pass — owner: art-director — accept: 60 fps measured; reduced effects works — needs: M4-01
- [M4] M4-06 · Final itch.io assets: cover, 4–6 screenshots, 1–2 GIFs — owner: art-director — accept: files in `assets/art/itch/`; sizes match itch requirements — needs: M3-20, M4-02
- [M4] M4-07 · Audio mix and balance pass — owner: audio-designer — accept: no clipping; music vs SFX levels noted — needs: M4-01
- [M4] M4-08 · Production build, zip, butler script (dry run) — owner: backend-engineer — accept: zip from a tagged commit runs from a subfolder — needs: M3-37
- [M4] M4-09 · Leaderboard production smoke test and secrets audit — owner: backend-engineer — accept: no service key in the repo, history or bundle (search results shown) — needs: M3-12
- [M4] M4-10 · **itch.io page copy** in `docs/design/itch-page.md` (design-lead deliverable, due Nov 28): title, short description, pitch of at most 120 words, controls including the alternate bindings (Q/E, Z/X) and a Sticky Keys note, accessibility note, tags — owner: design-lead — accept: matches the final build and controls; word count shown — needs: M3-37
- [M4] M4-11 · Final review of all fixes; bundle size and performance check — owner: tech-lead — accept: Approve — needs: M4-02, M4-03, M4-04, M4-05, M4-07, M4-08, M4-09
- [M4] M4-12 · Repo hygiene: README, LICENSE, CREDITS complete, `.env.example`, `.gitattributes`, secret scan, `CLAUDE.md` Commands current — owner: tech-lead — accept: checklist in the report — needs: M2-24
- [M4] M4-13 · Full regression: all level recordings, e2e, build, 960×540 iframe, keyboard-only, alternate bindings, Sticky Keys tip once on Windows, reduced effects, blocked storage, network off, 60 fps — owner: qa-tester — accept: Pass/Fail per item with evidence — needs: M4-11
- [M4] M4-14 · Full-game fresh-eyes playtest on the freeze build — owner: playtester — accept: report with jam-category scores and the one change that would help most — needs: M4-11
- [M4] M4-15 · Verify the draft itch.io embed (iframe, 960×540, keyboard, focus) — owner: qa-tester — accept: evidence screenshots — needs: USER-3, M4-08
- [M4] M4-16 · **M4 gate (Nov 28)**: freeze build tagged; only blocker fixes after this; remind the user of USER-6 — owner: producer — accept: M4-10, M4-12, M4-13, M4-14 and M4-15 are Pass — needs: M4-10, M4-12, M4-13, M4-14, M4-15

---

## Todo — Submit (Nov 29–30)

- [Submit] S-01 · Final zip from the tagged commit, with a checksum — owner: backend-engineer — accept: unzip and serve from a subfolder and it plays; checksum in the report — needs: M4-16
- [Submit] S-02 · Verify the repo is public, CI green, no secrets in history, tag `v1.0` — owner: tech-lead — accept: repo opens in a logged-out browser; no secrets in history — needs: M4-16, USER-6
- [Submit] S-03 · Upload the zip to itch.io, publish the page, link the repo — owner: USER (USER-4) — accept: page public — needs: S-01, S-02
- [Submit] S-04 · Smoke-test the live itch.io page (iframe, keyboard, leaderboards offline-safe) — owner: qa-tester — accept: evidence screenshots — needs: S-03
- [Submit] S-05 · Fresh-eyes check of the live page: first 30 seconds — owner: playtester — accept: short report in `docs/playtests/` — needs: S-03
- [Submit] S-06 · Submit the entry to GitHub Game Off 2026 with the repo link — owner: USER (USER-4) — accept: entry visible on the jam page before Nov 30 end of day — needs: S-04
- [Submit] S-07 · Submission checklist and the Dec 1 buffer plan — owner: producer — accept: checklist ticked on the board — needs: S-06

---

## Changes on 2026-11-02 (v1.1 re-plan)

- **Removed:** M2-07 (GameScene reads preset bindings; superseded because all bindings are active at once and M1-14/M1-16 cover it), M2-38 (tip overlay; the ui-engineer built it inside M1-40, mounting is M2-39), M3-03 (itch copy; moved to M4-10).
- **Merged or reshaped:** M1-09 split into M1-09 (motion) and M1-47 (sim wiring); M1-11 drag maths moved to M1-45; M1-13 codec and `runInputLog` moved to M1-43; M2-01 split into M2-01 and M2-34; M2-13 is now a controls screen (no remap); M2-19 to M2-22 renumbered to the level ids `w1-01`…`w2-04`; level 3-5 is M3-40.
- **New:** M1-39, M1-40, M1-41, M1-43, M1-45, M1-47, M2-34, M2-36, M2-39, M2-40, M3-40, USER-6.
- **Requests from ui-engineer answered:** the input-sampler wiring is in M1-14 (gameplay-engineer, `src/entities/`), the shared `SaveStore` in M2-40 (tech-lead, `main.ts`), the tip and `recordLevelComplete` calls in M2-39 and M2-06.
- **Fixes:** grey-box room is `levels/w0-02.txt` (the old `grey-box-room.txt` broke the id = file stem rule); e2e command is `npm run test:e2e`; USER-3 is needed by M4-15 (was M4-16).
