# Redshift — Task Board

_Owner: producer. Last updated: 2026-11-02 (Mon). Jam closes 2026-12-01 21:37 UTC; studio submits 2026-11-30._

**Status:** on track. M1 has not started; foundations (M1-01, M1-02) are in flight.
**Critical path:** `src/core` is a single lane (only gameplay-engineer may edit it), so M1-06 to M1-15 run one after another. Each task is kept to one sitting. Any slip there moves M1.

Line format: `- [Mx] <id> · <task> — owner: <agent> — accept: <criteria> — needs: <ids or none>`
Task ids are `M1-nn`, `M2-nn`, `M3-nn`, `M4-nn`, `S-nn`, and `USER-n` for things only the user can do.
"Reviewed" means tech-lead approved; "verified" means qa-tester passed the acceptance criteria. A task is Done only after both (see `CLAUDE.md` pipeline).

---

## Next batches

Run once M1-01 (design) and M1-02 (tech) land. Each batch holds one task per owner, with no dependencies between tasks in the batch. A batch starts when the previous one's tasks are all at least in Review.

**Batch 1** (needs only M1-01 and/or M1-02)
1. gameplay-engineer — **M1-06** sim skeleton, fixed step, tuning loader
2. tech-lead — **M1-03** feasibility review of the M1 specs (findings go to requests; start of M1-06 does not wait on it)
3. ui-engineer — **M1-16** safe storage wrapper and key-binding model
4. backend-engineer — **M1-19** Supabase schema and RLS draft (no credentials needed)
5. level-designer — **M1-20** grey-box room level file
6. art-director — **M1-22** `palette.json`
7. audio-designer — **M1-24** audio engine wrapper
8. qa-tester — **M1-26** M1 test plan
9. design-lead — **M2-01** specs for the M2 features (design-lead is free once M1-01 lands)

**Batch 2** (needs Batch 1 and/or M1-02)
1. gameplay-engineer — **M1-07** level parser
2. tech-lead — **M1-04** guard rails: determinism lint, coverage gate, secret check
3. backend-engineer — **M1-18** itch.io zip packaging
4. art-director — **M1-23** per-gear pattern textures (needs M1-22)
5. audio-designer — **M2-17** SFX set (needs M1-24)
6. ui-engineer — **M2-13** settings screen with Sticky Keys alternative bindings (needs M1-16, M2-01)
7. design-lead — **M2-02** World 3 tile specs (Must; needs lead time before engineering)

**Batch 3** (needs Batches 1–2)
1. gameplay-engineer — **M1-08** movement, gravity, jump, collision
2. tech-lead — **M1-30** review of core A (M1-06, M1-07)
3. art-director — **M2-14** accessibility doc and color-blind simulation (needs M1-22, M1-23)
4. backend-engineer — **M2-18** Supabase client skeleton, offline-safe (needs M1-19)

Batch 3 is thin on purpose: gameplay-engineer is the bottleneck. Idle owners are pulled forward onto M2 prep (above) rather than waiting.

---

## User actions (not agent tasks)

- `USER-1` — by **Nov 8**: create the **public GitHub repo** (suggest `redshift`), add it as `origin`, enable Actions. The folder is not a git repo yet; say when to `git init` and push. Needed by M2-24. Also pick a license (suggest MIT code; asset licenses go in `CREDITS.md`).
  - _2026-11-02:_ repo created at https://github.com/PatrickDCarey/Shift (private until release; must be public before submitting). `git init` done on `main`, `origin` set. Still open: first push, license.
- `USER-2` — by **Nov 14**: create the **Supabase project**. Run `backend/migrations/*.sql`, then put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env`. Put the service role key only in Supabase function secrets. `backend/README.md` (M1-19) has the exact steps. Needed by M3-12. If skipped, the game ships offline-only (see cut-list).
- `USER-3` — by **Nov 26**: create the **itch.io game page as a draft** (kind: HTML, "play in browser", 960×540, restricted visibility) and upload a test zip from `npm run package`. Optional: create a butler API key and store it as a GitHub secret. Needed by M4-16.
- `USER-4` — by **Nov 29**: confirm you are signed up for the **GitHub Game Off 2026** jam on itch.io, then **publish** the page and **submit the entry** on **Nov 30** with the public repo link (S-03, S-06).
- `USER-5` — standing: review windows. design-lead has the final say on feel, so you only need to look at the milestone gate summaries (about 30 minutes each, at Nov 8, 15, 22, 28).

---

## Doing

- [M1] M1-01 · Expand the GDD; write M1 feature specs (gears, acceleration over distance, color gating, air drag, safe tiles/reset) in `docs/design/features/`; write `src/data/tuning.json` and `docs/design/level-plan.md` — owner: design-lead — accept: each spec has Rule/Edge cases/Tuning/Acceptance/Priority; every tuning key from the GDD present; level-plan lists worlds 1–5 with one idea per level — needs: none
- [M1] M1-02 · Scaffold Vite + Phaser + TypeScript + Vitest + Playwright; write `src/core/types.ts`, `docs/tech/architecture.md`, `docs/tech/level-format.md`, CI workflow, `.env.example`, `.gitignore` — owner: tech-lead — accept: `npm run dev/test/build` run; vite `base` is `./`; types cover InputFrame, SimState, Tile, Level, InputLog; CI runs typecheck, test and build; `.env.example` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only — needs: none

## Review

_(empty)_

## Done

_(empty)_

---

## Todo — M1 Grey-box (Nov 3–8)

Target pacing: Nov 3 foundations land and Batch 1 runs. Nov 4–6 sim core and reviews. Nov 6 GameScene playable. Nov 7 playtest and tuning pass. Nov 8 QA gate.

### Design
- [M1] M1-25 · Approve the grey-box room (layout and solution) against the specs — owner: design-lead — accept: approval or change list recorded in `docs/design/decisions.md`; room demonstrates all five M1 mechanics — needs: M1-21
- [M1] M1-29 · Tuning pass 1 from the playtest report — owner: design-lead — accept: every `tuning.json` change has a one-line reason in `decisions.md`; unit tests still pass after the change — needs: M1-28

### Tech
- [M1] M1-03 · Feasibility review of the M1 feature specs (pipeline step 3) — owner: tech-lead — accept: written notes in `docs/tech/spec-review-m1.md`; blocking issues raised to design-lead via requests — needs: M1-01
- [M1] M1-04 · Guard rails: ESLint rule banning Phaser, `Math.random` and `Date` in `src/core`; Vitest 80% coverage threshold on `src/core`; CI secret check — owner: tech-lead — accept: a deliberate violation fails lint in CI (shown and reverted); coverage gate fails below 80% — needs: M1-02
- [M1] M1-05 · Fill the **Commands** section of `CLAUDE.md` — owner: tech-lead — accept: lists dev, test, coverage, e2e, build, package commands that actually run — needs: M1-02
- [M1] M1-30 · Review core A (sim skeleton, level parser) — owner: tech-lead — accept: Approve with no CRITICAL/HIGH findings, or Changes needed with `file:line` list — needs: M1-06, M1-07
- [M1] M1-31 · Review core B (movement, gears, color gating) — owner: tech-lead — accept: as M1-30 — needs: M1-08, M1-09, M1-10
- [M1] M1-32 · Review core C (air drag, reset, replay, determinism test) — owner: tech-lead — accept: as M1-30; determinism test inspected — needs: M1-11, M1-12, M1-13
- [M1] M1-33 · Review scene work (GameScene, debug overlay, BootScene) — owner: tech-lead — accept: as M1-30; Phaser is only used for input and drawing — needs: M1-14, M1-15, M1-17
- [M1] M1-34 · Review side tracks (storage and bindings, packaging, Supabase schema and RLS, palette, patterns, audio engine) — owner: tech-lead — accept: as M1-30; RLS reviewed by the security-reviewer agent — needs: M1-16, M1-18, M1-19, M1-22, M1-23, M1-24

### Gameplay (serial lane in `src/core`; tests first)
- [M1] M1-06 · Sim skeleton: `step(state, input, tuning)`, InputFrame, initial state, tuning loader with validation — owner: gameplay-engineer — accept: pure function; fixed 60 Hz; a missing tuning key throws a clear error; no Phaser/Math.random/Date in core; tests pass — needs: M1-01, M1-02
- [M1] M1-07 · Minimal level parser (tile grid, start, goal, tile kinds per the level format) — owner: gameplay-engineer — accept: parses a sample level to the expected grid; malformed input gives a descriptive error; one test per tile glyph — needs: M1-02
- [M1] M1-08 · Grid movement, gravity, jump (apex height, coyote, jump buffer), solid collision for white/grey tiles — owner: gameplay-engineer — accept: apex matches `jumpHeightTiles` within 0.1 tile; coyote and buffer windows match tuning; tests per spec — needs: M1-06, M1-07
- [M1] M1-09 · Gears: shift edges to a target gear (0–4), speed ramps toward the target over `tilesPerGearChange` per gear, color from the actual speed band — owner: gameplay-engineer — accept: speed over distance matches the spec table; color follows speed, not target; clamped at 0 and 4; tests — needs: M1-06
- [M1] M1-10 · Color-gated tile collision, safe (white/grey) tiles, fall-through after `colorGraceMs` — owner: gameplay-engineer — accept: coloured tile solid only on match; safe tiles always solid; grace window boundary tests (just under and just over) — needs: M1-08, M1-09
- [M1] M1-11 · Air commit: shift ignored in air; horizontal flight drags speed down one gear per `airDragTilesPerGear`; landing color uses post-drag speed — owner: gameplay-engineer — accept: tests for drag distance, shift ignored in air, landing in a different color — needs: M1-08, M1-09
- [M1] M1-12 · Reset and death: out-of-bounds and the reset input restore the start state — owner: gameplay-engineer — accept: state after reset deep-equals the initial state; works mid-air and mid-shift; tests — needs: M1-08
- [M1] M1-13 · Input log record/replay (`runInputLog`) and determinism golden test — owner: gameplay-engineer — accept: the same log run twice gives an identical state hash; a golden hash test exists; `src/core` coverage ≥ 80% shown in the report — needs: M1-10, M1-11, M1-12
- [M1] M1-14 · GameScene: fixed-step accumulator, key mapping (Left/Right Shift, arrows/A-D, Space/W/Up, R reset), draw tiles and player tinted by color — owner: gameplay-engineer — accept: runs in the dev server at 960×540; sim step rate is independent of display fps; keys behave as in the GDD — needs: M1-07, M1-08, M1-09
- [M1] M1-15 · Debug overlay (F3: gear, target, speed, color, grounded, air distance) and a dev-only read-only state hook `window.__redshift` — owner: gameplay-engineer — accept: overlay values match sim state; hook is absent from the production build — needs: M1-10, M1-11, M1-12, M1-14

### UI
- [M1] M1-16 · Safe storage wrapper and key-binding model with defaults (Shift) and alternative presets (Q/E, Z/X) — owner: ui-engineer — accept: never throws when storage is blocked (test); presets cover every action without conflicts; unit tests — needs: M1-02
- [M1] M1-17 · BootScene starts GameScene; canvas focus on click; `preventDefault` for Space, arrows and Shift combos; no page scroll inside an iframe — owner: ui-engineer — accept: game starts in the dev server with no console errors; keys do not scroll the page — needs: M1-14

### Backend / release
- [M1] M1-18 · `npm run package`: production build zipped for itch.io — owner: backend-engineer — accept: unzip into a subfolder, serve it, and the game loads (relative paths); zip has no `.env` or secrets — needs: M1-02
- [M1] M1-19 · Supabase schema draft: `backend/migrations/0001_runs.sql` with RLS (public read, no client writes), plus `backend/README.md` listing the exact steps the user must do — owner: backend-engineer — accept: policies deny anon insert/update/delete; no keys in the repo; README steps are copy-pasteable — needs: none

### Level design
- [M1] M1-20 · `levels/grey-box-room.txt` with header and `levels/README.md` entry: safe start, color-gated floors, a runway to a red bridge, a gap needing air drag onto a yellow pad, a safe tile mid-room — owner: level-designer — accept: parses with the M1-07 parser; each M1 mechanic is used at least once — needs: M1-01, M1-02
- [M1] M1-21 · Solution recording for the grey-box room, verified with `runInputLog` — owner: level-designer — accept: replay reaches the goal; still reaches the goal with key inputs shifted ±3 steps — needs: M1-13, M1-20

### Art
- [M1] M1-22 · `src/data/palette.json`: five gear colors per the GDD, background, ghost color, a pattern id per gear — owner: art-director — accept: keys match the types; gameplay colors have ≥ 3:1 contrast against the background (numbers noted in `docs/art/`) — needs: M1-02
- [M1] M1-23 · `src/fx/patterns.ts`: five distinct per-gear pattern textures generated in code — owner: art-director — accept: five visually distinct patterns shown in a screenshot at `docs/art/patterns.png`; id-to-pattern mapping unit-tested — needs: M1-22

### Audio
- [M1] M1-24 · `src/audio/engine.ts`: lazy AudioContext resumed on the first keydown/click, master/music/SFX buses, mute, tone helper — owner: audio-designer — accept: nothing throws before a gesture (mocked-context unit tests); mute and bus volumes tested — needs: M1-02

### QA and playtest
- [M1] M1-26 · `docs/qa/test-plan.md`: every M1 acceptance criterion mapped to unit, replay, e2e or manual — owner: qa-tester — accept: each criterion in the M1 specs appears exactly once — needs: M1-01
- [M1] M1-27 · Playwright smoke test: boot, canvas is 960×540, no console errors, state hook reachable, a Shift keypress changes the target gear — owner: qa-tester — accept: `npm run e2e` passes locally; test file at `tests/e2e/smoke.spec.ts` — needs: M1-15, M1-17
- [M1] M1-28 · Fresh-eyes playtest of the grey-box room (first 30 seconds, feel of acceleration, confusion points) — owner: playtester — accept: report at `docs/playtests/2026-11-07-m1-greybox.md` per the playtest template — needs: M1-21, M1-27
- [M1] M1-35 · Verify the simulation against the M1 specs; run the full suite — owner: qa-tester — accept: each spec criterion Pass/Fail with evidence; unit test counts and coverage reported; core coverage ≥ 80% — needs: M1-26, M1-30, M1-31, M1-32
- [M1] M1-36 · Verify side tracks (storage, packaging, palette, patterns, audio engine) — owner: qa-tester — accept: each task's accept line checked with evidence — needs: M1-26, M1-34
- [M1] M1-37 · **M1 gate**: the grey-box room plays end to end in the browser; full suite, typecheck and production build pass — owner: qa-tester — accept: no open blocker or major bug in `docs/qa/bugs.md`; playthrough with the solution recording matches the replay result — needs: M1-25, M1-29, M1-33, M1-35, M1-36

### Producer
- [M1] M1-38 · M1 close-out: check the repo against the board, move tasks, re-plan M2 — owner: producer — accept: board and files agree; M2 start batch listed — needs: M1-37

---

## Todo — M2 First worlds (Nov 9–15)

Done when: level loader, solution replay test, worlds 1–2 (8 levels), HUD gear meter, title and level select.

### Design and tech
- [M2] M2-01 · Specs: level loader and replay test, HUD gear meter, title and level select, pause and results, key bindings with Sticky Keys tip, color-blind patterns; level-plan intents for worlds 1–2 — owner: design-lead — accept: all specs have the five required sections — needs: M1-01
- [M2] M2-02 · Specs for World 3 tiles (walls, mud, ice, boost pads, speed cameras) with tuning keys — owner: design-lead — accept: edge cases cover each tile at each gear; keys added to `tuning.json` — needs: M1-01 (Must)
- [M2] M2-03 · Approve M2 specs; finalize level-format and shared types for loader, solution recording and RunResult — owner: tech-lead — accept: `types.ts` and `level-format.md` updated; changes announced via requests — needs: M2-01
- [M2] M2-24 · Public-repo readiness: `README.md` with play and run instructions, `LICENSE`, `CREDITS.md`, push, CI green on GitHub — owner: tech-lead — accept: repo is public; CI badge green; `CREDITS.md` exists — needs: USER-1
- [M2] M2-23 · Approve World 1 and 2 levels (rolling, per pair as they land) — owner: design-lead — accept: each level has a one-line verdict in `decisions.md`; any rejection names the pillar broken — needs: M2-22

### Gameplay
- [M2] M2-04 · Level loader: all `levels/*.txt` via Vite glob, header parse, validation errors — owner: gameplay-engineer — accept: loads every level in `levels/`; a bad file gives a descriptive error naming the file — needs: M2-03, M1-13
- [M2] M2-05 · Solution replay test: Vitest replays every level's recording and fails if any does not finish — owner: gameplay-engineer — accept: a deliberately broken recording fails the test (shown, then reverted) — needs: M2-04
- [M2] M2-06 · Progression in GameScene: goal reached gives a complete event with step count, restart, next level — owner: gameplay-engineer — accept: completing a level reports steps equal to the replay's — needs: M2-04
- [M2] M2-07 · GameScene reads key bindings (default and alternative) from `src/save` — owner: gameplay-engineer — accept: switching preset changes the keys without reload — needs: M2-03, M1-16
- [M2] M2-09 · Mount the HUD gear meter in GameScene — owner: gameplay-engineer — accept: meter updates every step; matches sim state — needs: M2-08, M2-06
- [M2] M2-16 · GameScene adopts the `src/fx` tile and player style — owner: gameplay-engineer — accept: solid and mismatched tiles differ in more than hue (screenshot) — needs: M2-15

### UI
- [M2] M2-08 · HUD gear meter component: current gear, target gear, progress, color plus pattern — owner: ui-engineer — accept: renders from a plain state object; pattern shown for every gear; unit test for the pure parts — needs: M2-01, M1-22, M1-23, M2-03
- [M2] M2-10 · Progress persistence: unlocked levels and best step counts in `src/save` — owner: ui-engineer — accept: survives reload; blocked storage falls back to memory; unit tests — needs: M1-16, M2-03
- [M2] M2-11 · Title scene and level select (keyboard nav, locked and unlocked, best time) — owner: ui-engineer — accept: reachable with keyboard only; locked levels cannot start — needs: M2-01, M2-04, M2-10
- [M2] M2-12 · Pause and results scenes (retry, next, back to select) — owner: ui-engineer — accept: pause freezes the sim; results show steps and best — needs: M2-06, M2-11
- [M2] M2-13 · Settings screen: **Sticky Keys alternative bindings** (Q/E and Z/X presets), remapping, one-time Windows tip — owner: ui-engineer — accept: all controls reachable without Shift; tip shows once on Windows only; setting persists — needs: M2-01, M1-16

### Art and audio
- [M2] M2-14 · `docs/art/accessibility.md`: palette under deuteranopia, protanopia, tritanopia; adjust patterns if gears confuse — owner: art-director — accept: each gear distinguishable by pattern alone in the screenshots — needs: M1-22, M1-23
- [M2] M2-15 · `src/fx` tile and player visual module (solid vs mismatched: brightness, fill, outline, pattern) — owner: art-director — accept: module has a documented API for GameScene; screenshots show solid vs ghost at a glance — needs: M1-23, M2-14
- [M2] M2-17 · SFX set: shift up and down (distinct), jump, land, fall-through, reset, level complete, UI move and select — owner: audio-designer — accept: all eleven triggers exist behind a function each; audible at low volume (noted in the report) — needs: M1-24

### Backend
- [M2] M2-18 · `src/net` Supabase client skeleton: timeout, quiet failure, no-op when env is missing — owner: backend-engineer — accept: unit tests with a mocked fetch: timeout, 500 and offline all resolve without throwing — needs: M1-19

### Level design
- [M2] M2-19 · World 1 levels 1-1 and 1-2, each with a recording — owner: level-designer — accept: replay test passes; headers set; safe spot near the start — needs: M2-01, M2-05
- [M2] M2-20 · World 1 levels 1-3 and 1-4 with recordings — owner: level-designer — accept: as M2-19 — needs: M2-19
- [M2] M2-21 · World 2 levels 2-1 and 2-2 with recordings — owner: level-designer — accept: as M2-19; teaches air drag — needs: M2-20
- [M2] M2-22 · World 2 levels 2-3 and 2-4 with recordings — owner: level-designer — accept: as M2-19 — needs: M2-21

### Review, QA, playtest
- [M2] M2-25 · Review loader, replay test, progression, bindings, HUD mount and fx adoption — owner: tech-lead — accept: Approve, no CRITICAL/HIGH — needs: M2-04, M2-05, M2-06, M2-07, M2-09, M2-16
- [M2] M2-26 · Review UI work — owner: tech-lead — accept: as M2-25 — needs: M2-08, M2-10, M2-11, M2-12, M2-13
- [M2] M2-27 · Review art, audio and net skeleton — owner: tech-lead — accept: as M2-25 — needs: M2-14, M2-15, M2-17, M2-18
- [M2] M2-28 · E2E: boot, title, level select, play, complete, results, settings persist — owner: qa-tester — accept: passes via `npm run e2e` — needs: M2-09, M2-11, M2-12
- [M2] M2-29 · Verify M2: all accept lines, 960×540 in an iframe, keyboard-only, alternative bindings — owner: qa-tester — accept: Pass/Fail per criterion with evidence — needs: M2-23, M2-25, M2-26, M2-27, M2-28
- [M2] M2-30 · Playtest worlds 1–2 (fresh eyes) — owner: playtester — accept: report in `docs/playtests/` with per-level sections — needs: M2-29
- [M2] M2-31 · Triage the playtest into decisions (tuning, level changes, accept) — owner: design-lead — accept: each issue has a decision and a reason in `decisions.md` — needs: M2-30
- [M2] M2-32 · **M2 gate**: suite, build, worlds 1–2 verified after the decisions are applied — owner: qa-tester — accept: no open blocker or major bug — needs: M2-29, M2-31, M2-24
- [M2] M2-33 · M2 close-out and M3 re-plan — owner: producer — accept: board current; cut-list triggers checked — needs: M2-32

---

## Todo — M3 Content complete (Nov 16–22)

Done when: worlds 3–5, leaderboards live, adaptive audio, palette and shaders. World 3 is a Must; Worlds 4–5 are Should and are the first scope-cut candidates (see `cut-list.md`).

### Design and tech
- [M3] M3-01 · Specs for World 4 (conveyors, moving platforms, crates) and World 5 (afterimage) — owner: design-lead — accept: spec sections complete; keys in `tuning.json` — needs: M1-01 (Should)
- [M3] M3-02 · Specs: leaderboard UX, adaptive audio mapping, Doppler shader and reduced-effects behaviour — owner: design-lead — accept: spec sections complete — needs: M1-01
- [M3] M3-03 · itch.io page copy in `docs/design/itch-page.md`: title, short description, controls, accessibility note — owner: design-lead — accept: ≤ 120-word pitch; controls include the alternative bindings — needs: M1-01
- [M3] M3-04 · Approve M3 specs; add shared types for events and new tiles — owner: tech-lead — accept: `types.ts` and docs updated, requests answered — needs: M2-02, M3-01, M3-02
- [M3] M3-28 · Approve World 3 levels — owner: design-lead — accept: verdict per level in `decisions.md` — needs: M3-23
- [M3] M3-29 · Approve Worlds 4 and 5 levels — owner: design-lead — accept: as M3-28 — needs: M3-27

### Gameplay
- [M3] M3-05 · Sim event stream (shift, jump, land, fall-through, reset, complete) for audio and fx — owner: gameplay-engineer — accept: events deterministic; replay of a log yields the same event list; tests — needs: M3-04
- [M3] M3-06 · World 3 tiles A: walls (instant stop), mud (caps gear 2), ice (locks gear) — owner: gameplay-engineer — accept: tests from the spec; core coverage ≥ 80% — needs: M2-02, M3-04 (Must)
- [M3] M3-07 · World 3 tiles B: boost pads (instant gear 4), speed cameras — owner: gameplay-engineer — accept: as M3-06 — needs: M3-06 (Must)
- [M3] M3-08 · Conveyors and moving platforms — owner: gameplay-engineer — accept: world speed vs leg speed per spec; deterministic movers; tests — needs: M3-01, M3-07 (Should)
- [M3] M3-09 · Crates that keep the color they were pushed at — owner: gameplay-engineer — accept: tests from the spec — needs: M3-08 (Should)
- [M3] M3-10 · Afterimage: gear-4 ghost platforms that expire — owner: gameplay-engineer — accept: lifetime deterministic and in tuning; tests — needs: M3-09 (Should)
- [M3] M3-21 · GameScene feeds state and events to audio and fx; reduced-effects flag — owner: gameplay-engineer — accept: fx and audio receive the same steps as the sim; toggling the flag removes post-processing — needs: M3-05, M3-16, M3-18

### Backend and leaderboards
- [M3] M3-11 · Edge function `submit-run` v1: payload, floor-time, name checks, per-IP rate limit; RLS tests — owner: backend-engineer — accept: unit tests for each rejection; the service key is read only from function secrets — needs: M3-02, M2-18
- [M3] M3-12 · Deploy the migration and function to the user's Supabase project; integration check — owner: backend-engineer — accept: submit then read round-trip works; direct client insert is denied — needs: M3-11, USER-2
- [M3] M3-13 · Wire `src/net` to the real endpoints (read top N, submit) — owner: backend-engineer — accept: offline, slow and error responses never block play (tests) — needs: M3-11, M2-18
- [M3] M3-14 · Results leaderboard panel, name entry, quiet offline state; best times in level select — owner: ui-engineer — accept: menus work with the network off; name rules shown — needs: M3-13, M3-02
- [M3] M3-15 · Settings: reduced effects, music and SFX volume, mute, reduced motion — owner: ui-engineer — accept: all persist; mute works before the first gesture without error — needs: M2-13, M3-02

### Art and audio
- [M3] M3-16 · Adaptive music engine: pitch and filter glide with gear — owner: audio-designer — accept: low and muffled at gear 0, bright at gear 4; glide time matches the speed ramp time; no throw before a gesture — needs: M3-02, M2-17
- [M3] M3-17 · Wire SFX to the event stream and music/SFX volume to settings — owner: audio-designer — accept: every event plays the right sound; volumes respond to settings — needs: M3-05, M3-16, M3-15
- [M3] M3-18 · Doppler tint shader, glow, particles, reduced-effects path — owner: art-director — accept: 60 fps on a mid-range laptop (measured, noted); reduced mode removes post-processing — needs: M2-15, M3-02
- [M3] M3-19 · Final palette and tile visuals for World 3–5 pieces — owner: art-director — accept: each tile has a distinct pattern or glyph; accessibility doc updated — needs: M2-14, M2-02, M3-01
- [M3] M3-20 · itch.io cover (630×500) and first screenshot set — owner: art-director — accept: files in `assets/art/itch/`; readable at thumbnail size — needs: M3-18, M2-23

### Level design
- [M3] M3-22 · World 3 levels 3-1 and 3-2 with recordings (Must) — owner: level-designer — accept: replay test passes; one new idea each — needs: M3-06, M2-05
- [M3] M3-23 · World 3 levels 3-3 and 3-4 with recordings (Must) — owner: level-designer — accept: as M3-22 — needs: M3-07, M3-22
- [M3] M3-24 · World 4 levels 4-1 and 4-2 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-08, M3-23
- [M3] M3-25 · World 4 levels 4-3 and 4-4 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-09, M3-24
- [M3] M3-26 · World 5 levels 5-1 and 5-2 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-10, M3-25
- [M3] M3-27 · World 5 levels 5-3 and 5-4 (Should) — owner: level-designer — accept: as M3-22 — needs: M3-26

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
- [M4] M4-10 · Final itch.io page copy — owner: design-lead — accept: matches the final build and controls — needs: M3-03
- [M4] M4-11 · Final review of all fixes; bundle size and performance check — owner: tech-lead — accept: Approve — needs: M4-02, M4-03, M4-04, M4-05, M4-07, M4-08, M4-09
- [M4] M4-12 · Repo hygiene: README, LICENSE, CREDITS complete, `.env.example`, secret scan, `CLAUDE.md` Commands current — owner: tech-lead — accept: checklist in the report — needs: M2-24
- [M4] M4-13 · Full regression: all level recordings, e2e, build, 960×540 iframe, keyboard-only, alternative bindings, reduced effects, blocked storage, network off, 60 fps — owner: qa-tester — accept: Pass/Fail per item with evidence — needs: M4-11
- [M4] M4-14 · Full-game fresh-eyes playtest on the freeze build — owner: playtester — accept: report with jam-category scores and the one change that would help most — needs: M4-11
- [M4] M4-15 · Verify the draft itch.io embed (iframe, 960×540, keyboard, focus) — owner: qa-tester — accept: evidence screenshots — needs: USER-3, M4-08
- [M4] M4-16 · **M4 gate (Nov 28)**: freeze build tagged; only blocker fixes after this — owner: producer — accept: M4-12, M4-13, M4-14 and M4-15 are Pass — needs: M4-12, M4-13, M4-14, M4-15

---

## Todo — Submit (Nov 29–30)

- [Submit] S-01 · Final zip from the tagged commit, with a checksum — owner: backend-engineer — accept: unzip and serve from a subfolder and it plays; checksum in the report — needs: M4-16
- [Submit] S-02 · Push to the public repo, verify it is public, CI green, tag `v1.0` — owner: tech-lead — accept: repo opens in a logged-out browser; no secrets in history — needs: M4-16, USER-1
- [Submit] S-03 · Upload the zip to itch.io, publish the page, link the repo — owner: USER (USER-4) — accept: page public — needs: S-01, S-02
- [Submit] S-04 · Smoke-test the live itch.io page (iframe, keyboard, leaderboards offline-safe) — owner: qa-tester — accept: evidence screenshots — needs: S-03
- [Submit] S-05 · Fresh-eyes check of the live page: first 30 seconds — owner: playtester — accept: short report in `docs/playtests/` — needs: S-03
- [Submit] S-06 · Submit the entry to GitHub Game Off 2026 with the repo link — owner: USER (USER-4) — accept: entry visible on the jam page before Nov 30 end of day — needs: S-04
- [Submit] S-07 · Submission checklist and the Dec 1 buffer plan — owner: producer — accept: checklist ticked on the board — needs: S-06
