# Redshift — Task Board

_Owner: producer. Last updated: 2026-11-16, after batch 5 (commit aa4c1ed: 2331 unit, 86 browser tests, package ok) and the owner's decisions of the same day. The jam closes 2026-12-01 13:37 PST (21:37 UTC). That is a fact, not a plan: work runs in priority order, batch after batch (owner: "ignore date and time deadlines, just keep working")._

**Update 2026-11-23 night (producer): the owner expanded scope** ("more levels, longer levels, projectiles, moving objects"). Plan: "Batch 11 (expansion)" and "Batch 12" under "Next batches": 9 Must levels (23 total), 2 Should (sweep), waves back to back, drop order sweep, then bolts, then movers; `rc-batch10` is the fallback. Status: on track so far (design specs and the tech note are in, contracts and w2-05 started); the risk is late sim work and the serial level-designer queue (see `risks.md` R9-R12). The old "Road to submit" text below is history for the 14-level build.

## Road to submit (2026-11-19; no calendar gates, work runs wave after wave; the jam closes 2026-12-01 21:37 UTC, studio target 2026-11-30)

**Status (2026-11-20): on track.** Batch 7 is closed (restart card, SFX wiring, settings, BUG-5/6/7, hints, itch page art, design triage). Content is complete (14 Must levels approved, menus, pause, results, controls, Tandem, music built). What remains in studio hands is Batch 8 below: three hint headers per w3-03..w3-05, the 2x restart card, QA verdicts, one fresh playtest of w3-04/w3-05/w2-04/w1-03, a package dry run and the README. Then the owner's release list ("Needs the owner" under Batch 8). Studio = S, owner = USER-n. Lines 9-16 below are the batch 7 plan, kept for history; their open parts moved to Batch 8.

1. **Must left in code (S):** restart card, 8 in-game SFX wired, three hint headers, BUG-5, BUG-6 boot retry (Batch 7 waves 1-2).
2. **Should (S, cut first if waves slip):** settings screen (signed off 2026-11-19), menu move/select sounds, pause-menu settings item.
3. **Verify (S):** tech-lead review, QA verification of Batch 7 (two full runs max), packaged build rebuilt.
4. **Playtest (S):** cold play of w3-02..w3-05, w1-03, w2-04, w3-03 hints on the Batch 7 build (Must: nobody has finished w3-04 or w3-05); design-lead triage; one fix batch if needed.
5. **Owner hand check (USER-9):** win w3-01 Tandem in a real browser; keyboard-only with Q/E and Z/X; SFX by ear; a non-Chromium browser.
6. **Page (S + owner):** art-director cover, 5 screenshots, 1 GIF from the final build; design-lead re-checks the `itch-page.md` section 7 list; `CREDITS.md` team names (owner gives the names, tech-lead fills); USER-3 create the itch draft and upload `npm run package` zip; test in the itch iframe.
7. **Leaderboards (owner decision):** USER-2 Supabase project plus the B-1 replay decision, or ship local best times only and delete the LEADERBOARDS block in the itch copy. Nothing in the studio plan assumes either.
8. **Release (S then owner):** USER-8 install gitleaks, tech-lead SEC-3 full-history secret scan (clean or rotate), final `npm run check` and package; USER-6 make the repo public; push; USER-3 publish the page; USER-4 submit the entry to the jam with the repo link.
9. **Freeze rule:** after the playtest triage only bug fixes; no new features.

**Proposed cuts, owner has not decided (none blocks; recommendations given 14 levels are done):** (a) world 4 gates and ice: CUT, nothing is scheduled. (b) M3-18 effects reduction: CUT as a task (keep what is built plus the reduced-effects path; no new effects work). (c) roof-band art: CUT. Also moved down by the 2026-11-19 rulings: volume sliders (M3-15) are Could, mute is Should (the SOUND toggle), menu sounds Should, pause settings item Should.

**Owner-only questions open:** (1) leaderboards: provide USER-2 and decide B-1, or ship local-only? (2) team names for `CREDITS.md` and the itch credits. (3) USER-9 hand checks and USER-8 gitleaks install, when convenient.

_Older status (2026-11-16):_ Tandem is world 3 (decided; no fallback). Built: pixel cutover, worlds 1-2 except w2-04, w3-01 and the Tandem scene (T-20), `fallThrough` event, title and level select scenes (not yet reachable: not registered in `main.ts`), audio engine and music feed helper, leaderboard code (not deployed, USER-2). Not built: pause, results and controls screens, music wiring, "why you fell" cue, exit cue, horizon/pulse/wipe wiring, w2-04, w3-02..w3-05, leaderboard deploy. Unreviewed: all of batch 5. Never verified on screen: Tandem checks S1-S4. The proposed cuts in `cut-list.md` are undecided and do not block; the work is ordered so the Must list comes first and those items come last.

**Milestones are checklists in priority order, not dates.** A milestone is met when every line is true, verified by qa-tester after tech-lead review.

**M2 First worlds (checklist)**
1. Title and level select reachable from a fresh page load (Batch 6).
2. Pause, results and controls screens work (M2-12, M2-13); win card makes "Enter: next level" primary.
3. Nine levels (w1-01..w1-05, w2-01..w2-04) with recordings, replay and +-3 tests green.
4. HUD gear meter, hints (jump hint visible in w2-01), "why you fell" and exit cues.
5. e2e for title, level select, game, pause, results; QA verifies; playtester plays from the title.

**M3 Content complete (checklist, Must items first)**
1. World 3 Tandem w3-01..w3-05 with recordings; Tandem scene checks S1-S4 verified by QA.
2. Leaderboards live (needs USER-2; until then local best times) with name entry.
3. Adaptive music wired (M3-21) and SFX; palette and horizon, exit pulse.
4. Last, undecided and non-blocking: world 4 (Should), M3-18 effects reduction, roof-band art.

**Freeze (checklist)** polish and bug fixes only; itch.io page copy and page ready (USER-3); secret scan clean (USER-8); full suite, package and playtest green.

**Submit (checklist)** repo made public (USER-6), source pushed, game uploaded to itch.io, entry submitted to the jam (USER-4).

**Critical path (no dates).** Wave 1 contract and tuning keys, then scene sitting 1, then scene sitting 2 (all of it in `GameScene.ts`/`src/entities`), then QA and playtest. Everything else runs beside it.

Line format: `- [Mx] <id> · <task> — owner: <agent> — est: <hours> — accept: <criteria> — needs: <ids or none>`
Task ids: `M1-nn`..`M4-nn`, `PX-n` (pixel rendering, from the ADR), `T-nn` (Tandem), `G-n` (gates package: Should, or Must if the Tandem gate fails), `S-nn`, `USER-n`. "Reviewed" means tech-lead approved; "verified" means qa-tester passed the acceptance criteria. A task is Done only after both (`CLAUDE.md`). Tech-lead's own deliverables have no second reviewer in the pipeline: qa-tester verifies them and the code-reviewer agent reads the code.

**Lane tags.** `src/core` is split into three areas plus the scene lane, one gameplay-engineer sitting per lane at a time: **[sim]** `src/core/sim/**`, **[motion]** `src/core/motion/**`, **[level]** `src/core/level/**`, **[scene]** `GameScene.ts` and `src/entities/**`. Only the scene lane touches rendering. **`src/scenes/BootScene.ts` has no owner in the roster: tech-lead takes it (offered in PX-4); the roster row in `CLAUDE.md` needs the user or orchestrator to add it (see requests triage).**

---

## Settled decisions (owner and design-lead, 2026-11-03)

| Decision | State | Where |
|---|---|---|
| **Core twist: Tandem** (two runners, one set of controls). | **Decided by the owner 2026-11-16: Tandem stays as world 3.** No fallback plan. GDD v1.4, `features/tandem.md`, level plan v3.0. | `decisions.md`, `requests.md` |
| **Art direction C, Pixel Dither** (480×270 at integer zoom, 16 px tiles, 12×24 player, 5×7 bitmap font). | Adopted. Pixel migration PX-1..PX-11 (~43 h). Cutover lands before the M2 menus and before the Tandem scene work. | `adr-pixel-rendering.md` |
| **D-1 no air control: KEEP. D-2 release braking at the shift-down rate: KEEP (and the remembered gear at rest). D-3 stepwise air drag: KEEP.** No `tuning.json` change. | Settled by design-lead in M1-29. Re-checked with real levels at M2-30 (R1), numbers lock at M2-31. | `decisions.md` (2026-11-03) |
| HUD gear meter pulled into M1 (core strip); drag meter and pending-shift bracket Should for M1, else M2. | Meter exists and is mounted (Review). Rest is M2-08. | `features/hud-gear-meter.md` |
| Win banner shows time `M:SS.ss`, not steps. | Built (request 2026-11-03, DONE). | `decisions.md` |
| Cut for good: mud, boost pads, conveyors, moving platforms, crates, afterimage ghosts, camera-tint gates, springs, crumble floors, speed limits, one-way floors. Ice and speed gates are Should (world 4). | See cut list. | `mechanics-review.md` |
| Worlds: 1 Gears (5), 2 Flight (4) = M2, 9 levels. 3 Tandem (5) = M3, Must. 4 Gates (4) = Should. Must 14, total 18. | | `level-plan.md` v3.0 |

---

## Next batches

A **batch** is one agent sitting per owner area (and per gameplay lane), with no dependencies between the tasks inside it. Details with "done" definitions are in the report; the lines here are the contract.

**Batch 1 — Wed Nov 4 (starts now; lands in Review by Thu Nov 5)**
1. art-director — PX-1, PX-2, PX-3 (in Doing; the only work in `src/fx`, `palette.json`, `assets/art`)
2. tech-lead — T-01 Tandem contracts, then M2-40 SaveStore wiring, then M2-03 hint headers
3. design-lead — M2-34 specs part 2 (title, level select, pause, results, progress), M2-01 remainder (tip, controls screen, onboarding)
4. gameplay-engineer [sim] — M1-46 sim follow-ups, M2-47 colored-wall tests
5. gameplay-engineer [level] — M1-48 level follow-ups
6. level-designer — M1-21 w0-02 headroom, then M2-19 (w1-01, w1-02)
7. ui-engineer — M2-08 (drag meter, pending bracket, drop pulse, key-cap hints, built at today's 960×540 layout, PX-9 halves it)
8. backend-engineer — M1-19 Supabase schema, then M1-18 packaging
9. audio-designer — M1-24 audio engine
10. qa-tester — M1-42 close BUG-1..3, M1-50 test-plan additions

(No scene-lane task in Batch 1: M2-06 needs the SaveStore from M2-40, which tech-lead builds in this batch.)

**Batch 2 — Fri Nov 6 – Sat Nov 7 (needs Batch 1 in Review)**
1. tech-lead — M1-30/33/34 review sweep, M1-44 ±3-step test, M2-03 if not done, T-02 (cut glyphs and unused tuning keys)
2. design-lead — T-03 (delete the cut tuning keys in the same batch as T-02), M3-02 specs, M1-25, M2-23 (rolling)
3. gameplay-engineer [scene] — M2-06 progression and pause hook, M2-39 Sticky Keys tip mount
4. gameplay-engineer [motion] — M1-51 test cleanup
5. ui-engineer — M2-10 progress model, pure menu models
6. level-designer — M2-20 (w1-03, w1-04), M2-45 (w1-05)
7. audio-designer — M2-17 SFX set
8. backend-engineer — M2-18 net skeleton
9. qa-tester — M1-35, M1-36 verification sweeps
10. playtester — M1-28 fresh playtest (with the HUD)
11. art-director — PX-1..3 to Review, confirm API names in requests, M2-14 accessibility doc for pixel patterns

**Batch 3 — Thu Nov 5 (pre-cutover; no `m1` tag needed; owner said "Start the batch")**
No task depends on another in the batch, and no two sittings share files. Parallel agents run only single-file tests (`npx vitest run <path>`), never `npm run check`, `npm run build` or `npm run test:e2e`; the orchestrator runs those at the end, then qa-tester verifies.
1. design-lead — M1-52 playtest triage and rulings (docs only)
2. tech-lead — M2-25a/M2-26a/M2-27a reviews of batch 2 code, M1-04, T-07 (fall-through predicate ruling), M1-56 (level-format.md and hint tests)
3. gameplay-engineer [sim] — T-10 Tandem sim part 1
4. gameplay-engineer [level] — T-02b reserved glyph names
5. gameplay-engineer [scene] — M1-54 (BUG-4, F1-F3), PT-1 (open on w1-01), M1-57 (QA hook meter and banner)
6. ui-engineer — M1-58 review follow-ups in pure code, PT-5 (HUD slot 4 investigation)
7. level-designer — M2-21 (w2-01, w2-02)
8. backend-engineer — SEC-1 (HIGH 1, MEDIUM 4/5, zip split), then M3-11
9. audio-designer — M3-16 prototype, M2-17b spec alignment, engine follow-ups
10. art-director — M1-59 (edge arrow carries the band, fx follow-ups), PT-2a (exit off-screen cue frame)
11. qa-tester — M1-55 gate checklist, M2-60 e2e additions (writes only; runs last)
Left out because the cutover would discard them: [motion] (nothing pending), PX-6..PX-9 work, GameHud and meter view relayout, menu scenes, playtester.

**Batch 4 — Fri Nov 13 – Sat Nov 14 (Batch 3 landed in cab74a1; rewritten 2026-11-13)**
Rules as Batch 3: one sitting per owner area, no shared files, no in-batch dependencies; parallel agents run only `npx vitest run <path>`; the orchestrator then runs `npm run check`, build and `npm run test:e2e`; qa-tester's run 5 comes last (port 4173). Ports: art 5185, ui 5186, level 5187, audio 5188, backend 5189, scene 5190, playtester 5191. Common lines (both variants) first.

*Common to 4A and 4B*
1. [sim] gameplay-engineer — T-11 Tandem part 2 (per-body shift and jump, clamp resync, wall stop, home, win, death and restart; checks 4–15). Files: `src/core/sim/**` only (new tests `tandemAcceptance2.test.ts`; no `fallThrough` yet). Done: `npx vitest run src/core/sim` green, all M1 and T-10 tests unchanged, derived numbers that differ filed in requests. Not Done until T-13 verifies checks 1–12.
2. level-designer — PT-6 (w1-01 v2, w1-02 v2, w1-04 v2 per `clarity-fixes.md`, w1-05 README line), then M2-22 w2-03 Step Down (exact 4-tile drop; spec `level-plan.md` row w2-03). Files: `levels/**`. Done: `npx vitest run tests/levels` green (replay and ±3), windows meet the numbers in the request of 2026-11-05, `Fastest known` and version bumps recorded, request line to backend-engineer. w2-04 follows in Batch 5.
3. design-lead — rulings in `docs/design/decisions.md`: w2-01 (the one expert line keeping yellow alive, 73 of 708 random wins: accept as an expert line or ask for a roof/gap change), w2-02 (pad lowered 2 tiles, 23-step window: accept or revert); amend the T-07 lines (`decisions.md`, `adaptive-audio.md` fall-through trigger points at the sim event); B1 Sticky Keys tip burn rule; M2-23 verdicts for w1-04 and the 11-05 levels; name blocklist handed to backend-engineer by request line. Files: `docs/design/**`. Done: a verdict and reason per item; any level change is a requests line to level-designer. In 4A also PX-5 (below).
4. ui-engineer — pure models for PT-5 (bracket `arrived`), PT-4 (drag bar span), PT-3 (needed-slot cue, one 45-frame ring, cleared on respawn), B6 `MAX_CELLS_PER_ROW`, B7/B8. Files: `src/ui/**` model files and tests, `src/save/**`. Done: one unit test per `clarity-fixes.md` check of those items; `npx vitest run src/ui src/save` green; no view change. Port 5186.
5. audio-designer — B9 (exhaustive `switch` with a `never` check in `sfxEvents.ts`, keeping the local `FallThroughEvent` until Batch 5), B10, B11. Files: `src/audio/**`. Done: tests for each; `npx vitest run src/audio` green. Port 5188.
6. backend-engineer — SEC-2 (name pattern and 1–12 length in `rules.ts` and the SQL check, code `name`), B13 (`content-length` guard in `src/net/client.ts`), B14 (`validate.ts` bidi and zero-width rejection, dead `try/catch`). Files: `backend/**`, `src/net/**`. Done: unit test per rejection, `npx vitest run scripts src/net` green. Port 5189.
7. art-director — M2-14b (accessibility doc for the pixel patterns, three simulations) and T-05 (home pose, silhouette glyph, divider as solid ground; runner against twin in greyscale). Files: `src/fx/**`, `src/data/palette.json`, `assets/art/**`, `docs/art/**` (rerun `npm run art:build`, commit sheets). Done: numbers and images in `docs/art/`, drift test green, no API rename (the scene lane codes against it). Port 5185. (Tandem-fallback swap: G-5 instead of T-05.)
8. tech-lead — **in this order:** `FallThroughCell` and the union member in `src/core/contracts/state.ts` (per `architecture.md` §3.2, with the airborne pass-through question from design-lead decided in the ruling), the name-rule constant (M3-04), then the review of Batch 3 at commit cab74a1: T-10 sim, M1-54/PT-1/M1-57, M1-58, M3-16, M1-59 (edge arrow re-review), SEC-1 and M3-11 (security-reviewer agent; M1-19 re-review), M1-04, M1-56, w2-01/w2-02 (hints test). Files: `src/core/contracts/**`, `src/core/types.ts`, `docs/tech/**`. Done: a review file `docs/tech/reviews/2026-11-batch3-review.md` with Approve or file:line per item; contract compiles (`npx tsc -p tsconfig.json --noEmit` by the orchestrator). In 4A the review runs after PX-4 and the scene/ui views that the cutover rewrites are read for logic only.
9. qa-tester — test-plan additions in `docs/qa/test-plan.md` (clarity checks, menu and level-select checks, Tandem checks 1–18, protanopia screenshot), then run 5 verifying Batch 3 acceptance lines (written last, 4173 at the end only). Files: `docs/qa/**`, `tests/e2e/**` (writes only). Done: Pass/Fail per Batch 3 line with evidence.

*4A only — cutover (PX-4..PX-10), one coordinated set, starts now*
- tech-lead (added to line 8, first): PX-4 `src/main.ts`, `src/scenes/BootScene.ts`, `index.html`, `architecture.md`; 480×270, `Scale.NONE` plus integer zoom, boots with storage blocked, BootScene builds the pixel textures.
- design-lead (added to line 3): PX-5 `src/data/tuning.json` `tileSize` 32 to 16 and the GDD 480×270 note; no `src/core` test change.
- [scene] gameplay-engineer: PX-6, PX-7, PX-8 in order (`src/scenes/GameScene.ts`, `src/entities/**`: tilemap `LevelView`, sprite `PlayerView`, camera helper with tests, bitmap-font `GameHud`), plus B2 and B3. Done: unit tests for `playerFrame` and the camera snapping invariant, `npx vitest run src/entities`; the build renders only after PX-4 and PX-9 land together. Port 5190.
- ui-engineer (line 4 is second to this): PX-9 first (`GearMeterView` 110×32, compact 110×14 strip, `StickyKeysTipView`, B5 floor), `hudModel` tests unchanged. Port 5186.
- qa-tester (line 9, written against the ADR): PX-10 e2e for the new canvas (480×270 attributes, whole-multiple CSS widths at four viewports, live resize, 2× screenshot). Orchestrator runs `npm run test:e2e` after the set lands; green means the cutover is Done pending PX-11 in Batch 5.
- No playtester sitting (build is in flux). If PX-4..PX-9 are not all in by Nov 14 evening, the orchestrator does not merge a half cutover; it lands Nov 15.

*4B only — no cutover*
- [scene] gameplay-engineer: B2, B3, and `exitCue(view, exitRect, hudBottom)` pure helper (PT-2b) in a new `src/entities/exitCue.ts` with tests. Files: `src/entities/**`, `GameScene.ts` for B2/B3 only. Done: unit tests, `npx vitest run src/entities`. Port 5190. Nothing that the cutover rewrites (LevelView, PlayerView, GameHud, meter view).
- No ui view work, no PX lines, no playtester; the owner does the M1-55 hand checks and says "M1 signed off"; the cutover moves to Batch 5B.

*Tandem decision:* closed by the owner on 2026-11-16 (Tandem stays as world 3; no fallback).

**Batch 11 (expansion; planned 2026-11-23 night by the producer; the owner's sign-off is his 2026-11-23 request "add more levels, longer levels, projectiles, moving objects"; no calendar gates, waves run back to back)**

*Scope and status.* GDD v1.12, level plan v4.0: 11 new levels, **9 Must** (w2-05 Long Haul, w4-01..03, w4-05, w5-01..03, w5-05) and **2 Should** (w4-04 Outrun, w5-04 Chase: the sweep), so 23 Must levels in 5 worlds. Checkpoints are Could and not for the jam. The fallback release is the 14-level build tagged `rc-batch10`. Batch 10 (hint headers for w3-05 and w3-02) landed in 8cdc1df, e733f11 and 4e54f78; its QA pass is in 4e54f78. Specs: `features/moving-objects.md`, `projectiles.md`, `sweep.md`, `levels-w4.md`, `levels-w5.md`, `level-select.md`; engineering: `docs/tech/expansion-approach.md` (design's 2026-11-23 rulings override it in three places: **slabs are top-only** (no push, no crush, no mover boxes in `sweepX`/`sweepY`), emitters gain `band=W`, no checkpoints).

*Invariants for every task below.* (1) **Every existing recording and golden hash is unchanged**: the 14 shipped levels replay to the same `wonAtStep` and `npx vitest run tests/levels` stays green; a sim, level or contract task that moves one is rejected, not "updated". (2) No `tuning.json` key other than `projectileSizeTiles` and `emitterTellMs` (design). (3) `src/core` stays deterministic and at 80% coverage. (4) Files under about 400 lines; `GameScene.ts` is at 370 and gets nothing until B11-07 lands. (5) Rules as batch 8: one sitting per owner area (and per gameplay lane: [sim], [motion], [level], [scene] are separate sittings that never share files), no shared files inside a wave, touch only the files listed; parallel agents run only a single-path `npx vitest run <path>` plus one typecheck; the orchestrator runs `npm run check`, `npm run test:e2e` and `npm run package` between waves and commits; QA alone on 4173. Ports: art 5185, ui 5186, level-designer 5187, audio 5188, backend 5189, scene 5190, playtester 5191, tech-lead 5192/5193 ([sim], [motion], [level] need none). Nothing is Done until tech-lead reviewed it and QA verified it.

*Drop order if engineering stalls* ("stalls" = a sim task fails tech-lead review twice, or a wave does not land after two sittings; no dates): **Sweep (Should) first, then bolts (B11-17, world 5), then movers (B11-13).** Cut the dependent levels with the piece; the producer reports, the owner decides. Never cut a shipped level or `rc-batch10`.

*Wave 0 (running now; started by the orchestrator)*
- **B11-01** tech-lead (5192/5193) — contracts for movers and emitters. Files: `src/core/types.ts`, `src/core/contracts/**` (`level.ts` Mover and Emitter with `band` incl. W, `MAX_MOVERS`/`MAX_EMITTERS`; `lanes.ts` `moverOffset`, `moverCycle`, `shotsAt` in `MotionApi` and `LANE_EXPORTS`; `state.ts` `died.cause?: 'hit'` and `fallThrough.movers`; `tuning.ts` keys `projectileSizeTiles`, `emitterTellMs`), `src/core/index.ts`, `docs/tech/level-format.md`, `architecture.md` rows 6b/14, `expansion-approach.md` revised to the three rulings. Spec: `expansion-approach.md` 6.1, design request 2026-11-23. Accept: `npx tsc -p tsconfig.json --noEmit` clean (orchestrator), `npx vitest run tests/arch` green, no existing fixture changes (new `Level` fields absent when empty). Reviewer: QA runs the suite. Needs: none.
- **B11-02** level-designer (5187) — w2-05 Long Haul. Files: `levels/w2-05.txt` and recording, `levels/README.md`. Spec: `level-plan.md` v4.0 "w2-05" and "Long levels". Accept: `npx vitest run tests/levels` green (replay, ±3, hints, HUD); recording at most 4,800 steps; at most 15 rows; windows at least 24; hardest room first; no forced wait over 3 s; COMBINE sweep and fair line in the README; `Fastest known`; `LEVELS` line filed in `requests.md`. Reviewer: tech-lead (B11-15), design-lead approves. Needs: none (no new engineering).
- *Orchestrator step A:* **B11-03** `LEVELS` row for w2-05 (`backend/functions/submit-run/rules.ts`), `npx vitest run scripts`, `npm run check`, commit.

*Wave 1 (needs B11-01 landed; seven parallel sittings plus one doc)*
- **B11-04** design-lead — `projectileSizeTiles` and `emitterTellMs` values. Files: `src/data/tuning.json`, `docs/design/**`. Accept: values present, schema test green (`npx vitest run src/core/types.test.ts`). Needs: B11-01.
- **B11-05** [motion] gameplay-engineer — `moverOffset`, `moverCycle`, `shotsAt`. Files: `src/core/motion/paths.ts` (new), `motion/index.ts`, tests. Spec: `expansion-approach.md` 2.2 and 3. Accept: exact 1/32-tile offsets, integer cycle, phase and wrap, emitter lane empty at t = 0, shot life integer, no `Math.sin`; `npx vitest run src/core/motion` green; `lane-contracts` arch test lists the exports. Reviewer: tech-lead. Needs: B11-01.
- **B11-06** [level] gameplay-engineer — `mover:` and `emitter:` header lines. Files: `src/core/level/kinetics.ts` (new), `parseLevel.ts`, tests. Spec: `expansion-approach.md` 4.1-4.2, `moving-objects.md`, `projectiles.md`. Accept: every parser error in 4.2 has a file/line/column test; absent when none; all shipped levels parse identically; slab speed 1 or 2 and shot speed 2 or 4 enforced only in `tests/levels` (B11-15), parser accepts 1/2/4/8; `npx vitest run src/core/level` green. Reviewer: tech-lead. Needs: B11-01.
- **B11-07** [scene] gameplay-engineer sitting 1 — move `drawBodies` out of `GameScene.ts`. Files: `src/scenes/GameScene.ts`, `src/entities/**` (new helper). Accept: behaviour identical (existing entity tests and e2e unchanged), `GameScene.ts` under 340 lines, `npx vitest run src/entities` green. Reviewer: tech-lead. Needs: none. Port 5190.
- **B11-08** art-director (5185) — sprites and patterns per design request 2026-11-23 items 1-6 (slab safe and four bands with a raised top lip, track, emitter four facings with tell frame, bolts per band with a distinct grey silhouette, pass-through shimmer, sink mark). Files: `src/fx/**`, `src/data/palette.json`, `assets/art/**`, `docs/art/**`; run `npm run art:build`, commit sheets. Accept: drift test green, `npx vitest run src/fx` green, greyscale check recorded in `docs/art/`, no API rename, never colour alone. Reviewer: tech-lead. Needs: none.
- **B11-09** audio-designer (5188) — shot cue (rate-limited, on-screen emitters only), hit-death cue distinct from a fall (from `died` with `cause: 'hit'`). Files: `src/audio/**`. Accept: exhaustive `switch` still compiles, tests per cue, `npx vitest run src/audio` green. Reviewer: tech-lead. Needs: B11-01.
- **B11-10** ui-engineer (5186) — level select with five world rows (names 4 MOTION, 5 SIGNALS, world 2 now five cells, numbering gaps, `CLEARED n/m` from whatever ships, unlock rule for new ids). Files: `src/ui/**`, `src/save/**`, `src/scenes/LevelSelectScene.ts`. Spec: `features/level-select.md` checks 1-16. Accept: fixture levels in worlds 4-5 pass checks 1-16 (every row fits, 5 rows); `npx vitest run src/ui src/save` green; saves from the 14-level build still load. Reviewer: tech-lead. Needs: none.
- **B11-11** tech-lead — answer design: does the sweep (`sweep.md`, one stateless `sweep:` header line, phase-14 kill) fit after emitters, and what is its contract? Files: `docs/tech/**`. Accept: a size per lane and the contract sketch in `expansion-approach.md`. Needs: B11-01.
- *Orchestrator step B:* **B11-12** `npm run check`, commit.

*Wave 2 (needs wave 1 landed and step B green)*
- **B11-13** [sim] gameplay-engineer — slabs. Files: `src/core/sim/**` (new `movers.ts`; `collision.ts`, `gating.ts`, `move.ts`, `step.ts`, tests). Spec: `moving-objects.md`, `expansion-approach.md` 2.3-2.5 as amended (top-only, phase 6b carry, swept top landing, blocked carry stops silently, `fallThrough.movers`, riding never changes `vx`, jumping off inherits nothing). Accept: acceptance tests with numbers (exact carry offsets, landing from above, no side contact, coloured slab with grace, Tandem both bodies on one slab, respawn rewinds slabs, death and win freeze them); all existing sim and golden-hash tests unchanged; `npx vitest run src/core/sim` green; no file over 400 lines. Reviewer: tech-lead. Needs: B11-05, B11-06 (a hand-built `Level` may stand in for the parser).
- **B11-14** [scene] gameplay-engineer sitting 2 (5190) — `KineticsView` (slabs, tracks, emitters, shots, tell glow; interpolated with `moverOffset`/`shotsAt` at `prev.step` and `step`), `sealedPockets` counts slab-swept cells as open, mover state on the QA hook under `QA_HOOK`, one call in `GameScene.ts`. Files: `src/entities/**`, `src/scenes/GameScene.ts`. Accept: unit tests for interpolation and pockets; static fixture draws; reduced effects replaces the tell glow with a static fill; `GameScene.ts` stays at or under 400; `npx vitest run src/entities` green. Reviewer: tech-lead. Needs: B11-05, B11-06, B11-07, B11-08.
- **B11-15** tech-lead — `tests/levels` rules for movers and emitters and long levels, plus review of wave 1 into `docs/tech/reviews/2026-11-batch11-review.md`. Files: `tests/levels/**`, `docs/tech/**`. Spec: design request 2026-11-23 (slab speed 1 or 2, shot speed 2 or 4, at least 2 tiles of headroom, horizontal rests at least 30 at ends a line uses, recordings at most 5,400 steps, swept areas and lanes clear of HUD, hints, spawn, exit; shot lanes clear of tiles). Accept: `npx vitest run tests/levels` green on all 15 levels; a negative fixture per rule fails; review lists Approve or file:line per B11-04..11. Needs: B11-06.
- *Orchestrator step C:* **B11-16** `npm run check`, commit.

*Wave 3 (needs wave 2 landed and step C green)*
- **B11-17** [sim] gameplay-engineer — bolts and the hit rule. Files: `src/core/sim/**` (new `hazards.ts`, `status.ts`, tests, determinism fixture with two slabs and two emitters in `determinism.test.ts`). Spec: `projectiles.md`, `expansion-approach.md` 3 (phase 14 hit after home and win, `band=W` hits only a band-0 body, coloured shot hits a matching band, `died.cause = 'hit'`, exit beats hit). Accept: tests per rule with numbers, the fixture replays twice deep-equal with a snapshot hash, every golden hash of the 14 levels unchanged; `npx vitest run src/core/sim` green. Reviewer: tech-lead. Needs: B11-13.
- **B11-18** level-designer (5187) — world 4 teach: w4-01 Lift, w4-02 Ferry, w4-03 Moving Bridge. Files: `levels/w4-0[1-3].txt` with recordings, `levels/README.md`. Spec: `levels-w4.md`, `level-plan.md` v4.0. Accept: `npx vitest run tests/levels` green (replay, ±3, the B11-15 rules); removal tests in the README (no slab: 0 wins; w4-03 static `G` tiles and a safe slab both shown); fair line and windows at least 18; `Fastest known`; `LEVELS` lines filed. Reviewer: tech-lead, design-lead approves. Needs: B11-13, B11-14, B11-15.
- **B11-19** qa-tester — write only: test-plan and specs for five-row level select, slabs on the QA hook, long-level replay at `speed=60`, bolt and hit cues, and the e2e wall-clock budget. Files: `docs/qa/**`, `tests/e2e/**` (no runs). Accept: each check listed once with how it is verified; new specs skip cleanly until their feature exists. Needs: B11-10, B11-14.
- *Orchestrator step D:* **B11-20** `LEVELS` rows for w4-01..03, `npm run check`, full `npm run test:e2e` (record minutes), commit.

*Wave 4 (needs wave 3 landed and step D green)*
- **B11-21** level-designer (5187) — world 5 teach: w5-01..w5-03. Files: `levels/w5-0[1-3].txt` with recordings, `levels/README.md`. Spec: `levels-w5.md`, `projectiles.md` "Level rules". Accept: as B11-18 plus every shot lane crossing at least 18 steps and clear through ±3, no emitter fires into a spawn box in the first 60 steps; removal test (no emitters: the lane is not needed or the level wins trivially, shown). Reviewer: tech-lead, design-lead approves. Needs: B11-17.
- **B11-22** tech-lead — review of the engineering (B11-13, B11-14, B11-17) into the batch 11 review file. Files: `docs/tech/**`. Accept: Approve or file:line per item; every golden hash and recording unchanged; line counts noted; a fix list per owner. Needs: B11-17.
- **B11-23** playtester (5191) — cold play of w2-05 and w4-01..03 on the step D build, no README (10 tries, then only that level's "The idea:" line). Files: `docs/playtests/2026-11-2x-batch11a.md`. Accept: attempts, minutes, quit point per level; did a slab read by shape and pattern; did the long level's restart feel too long; "Not verified" list. Reviewer: design-lead. Needs: step D.
- *Orchestrator step E:* **B11-24** `LEVELS` rows for w5-01..03, `npm run check`, `npm run test:e2e`, commit; then the fix list from B11-22 (**B11-25**, owners as the findings say, one sitting per area).

*Wave 5 (needs step E)*
- **B11-26** level-designer (5187) — w4-05 Commute (long). Files: `levels/w4-05.*`, README. Spec: `levels-w4.md`, `level-plan.md` "Long levels". Accept: as B11-02 plus COMBINE rule (no win skips the lift, shuttle or coloured slab); recording at most 5,400 steps and `npx vitest run tests/levels` inside the 30 s test timeout. Needs: B11-25.
- **B11-27** qa-tester (4173 alone, two full runs at most) — verify B11-01..25 acceptance lines, the five-row level select, mover hook, replay of every level, 14 shipped levels at the same `wonAtStep`. Files: `docs/qa/**`, `tests/e2e/**`. Accept: Pass or Fail per check with a file or test name; no new `test.fail`. Needs: B11-25, B11-19.
- **B11-28** design-lead — triage of B11-23 into `decisions.md` (a verdict per finding; level changes as request lines). Files: `docs/design/**`. Needs: B11-23.
- *Orchestrator step F:* `LEVELS` row, `npm run check`, commit.

*Wave 6 (needs step F)*
- **B11-29** level-designer (5187) — w5-05 Full Spectrum (long COMBINE of slabs and bolts). Files: `levels/w5-05.*`, README. Accept: as B11-26 plus no win skips a slab or a bolt lane. Needs: B11-26, B11-28.
- **B11-30** playtester (5191) — cold play of w5-01..03 and w4-05, same rules as B11-23. Files: `docs/playtests/2026-11-2x-batch11b.md`. Needs: step F.
- *Orchestrator step G:* `LEVELS` row, check, e2e, commit. Then **B11-31** design-lead triage of B11-30 (Files: `docs/design/**`).

**Batch 12 (Should, last: the sweep; then close-out)**

*Wave 7* **B12-01** tech-lead — sweep contract (`sweep:` header line, `Level.sweep`, event cause) per B11-11. Files: `src/core/contracts/**`, `src/core/types.ts`, `docs/tech/**`. Accept: arch tests green, shipped levels unchanged. Needs: B11-11, B11-31.

*Wave 8 (parallel, all against the contract)* **B12-02** [level] `sweep:` parser (`src/core/level/**`). **B12-03** [sim] stateless phase-14 kill (`src/core/sim/**`; all golden hashes unchanged). **B12-04** [scene] sweep view and left-edge marker (`src/entities/**`, `GameScene.ts` only if under 400). **B12-05** art-director sweep front with hatch (`src/fx/**`, `palette.json`, `assets/art/**`; art:build). **B12-06** audio-designer gap hum (`src/audio/**`). Accept per task: single-path vitest green, tests with numbers per `sweep.md`. Reviewer: tech-lead. Needs: B12-01.

*Wave 9* **B12-07** level-designer — w4-04 Outrun and w5-04 Chase (`levels/**`, README, recordings, removal test: a gear-1 walk with long rests wins without the sweep and must not with it; `LEVELS` lines filed). Needs: B12-02..B12-04.

*Wave 10 (close-out)* **B12-08** tech-lead review of the sweep and a final review of the expansion (`docs/tech/reviews/2026-11-batch11-review.md`). **B12-09** qa-tester final verification (4173 alone, two full runs, e2e minutes recorded, every level replayed, 14 shipped hashes unchanged). **B12-10** playtester cold play from the title on the packaged build (world 4, 5, w2-05, long-level restart feel; `docs/playtests/2026-11-2x-batch12.md`). Needs: B12-07.

*Wave 11* **B12-11** design-lead triage of B12-10 and `itch-page.md` re-count (levels, worlds, long levels, controls, section 7). **B12-12** tech-lead `README.md` re-count and status (23 or 25 levels, no dead promises). **B12-13** art-director itch shots from the final build (one slab, one bolt lane; `assets/art/page/**`, `docs/art/**`). **B12-14** backend-engineer raises `MAX_LOG_CHARS` and body limits only if a recorded long run is near 16,000 characters (`backend/**`). Needs: B12-10.

*Orchestrator step H:* `LEVELS` rows for the last levels, final `npm run check`, `npm run test:e2e`, `npm run package` (record name, size, sha256, file count); this zip replaces `redshift-b9.zip` as the upload candidate. Then the owner's release list below.

*Producer, every wave:* check files and commits, move lines to Done only after review and QA, refresh this section.

**Batch 9 (planned 2026-11-23, after batch 8 waves 1-4 at b6916ee, e60c755, 5321e78, 65ae833, 2a07d67; no calendar gates, runs back to back)**

*Status (producer, 2026-11-23, B9-08, checked against commits 50eb482, e465ec7, 356e5a7, 7bd6dea and the QA input commit 32238da):* ON TRACK, no cuts, **waiting on the owner.** w3-05 v2 is built, approved by design, reviewed by tech-lead (approve) and verified by QA; `npm run check` passed (132 files, 2,755 tests, build OK); full e2e 209 tests, 201 passed, 5 skipped, 2 flakes that passed on rerun, 1 stale test fixed. BUG-8 CLOSED; BUG-6 about 220 more boots without a failure (stays "fixed pending observation"). The one thing not yet measured is whether a fresh player can finish w3-05 v2: the cold playtest (B9-05) skipped w3-04 and edited the save, so it never reached v2's new part. Design's ruling (B9-07): the owner's hand play is the deciding check. **Upload candidate:** `redshift-b9.zip`, sha256 811d3a18307eefc5c3e5b23923a423b437d9a950b32ac22760ae154a6e9bef05, 416,863 bytes, 11 files, offline build (leaderboards not configured); final only if the owner items do not change the code. No cut-list change; checkpoints stay rejected (producer sign-off needed to raise).

*Batch 9 task states (checked in the repo):*
- **B9-01** w3-05 v2 (level-designer) — DONE (50eb482; step at x 36 in both lanes; design approved; criterion amended to "kerbs and step removed: 0 wins", met 0 of 56,700).
- **B9-02** `LEVELS` w3-05 `{ version: 2, fastest: 680 }` (orchestrator) — DONE (50eb482; drift test green).
- **B9-03** tech-lead review and hint tests pinned to v2 — DONE (approve; `docs/tech/reviews/2026-11-batch9-review.md`).
- **B9-04** QA against v2 — DONE (e465ec7; every v2 check Pass; BUG-8 CLOSED; the stale `tandem-scene.spec.ts` fixed).
- **B9-05** cold playtest — DONE as a sitting, NOT a verdict on v2 (356e5a7; skipped w3-04, edited the save). Replaced as the deciding check by the owner's hand play (owner item 4).
- **B9-06** README follow-up — NOT NEEDED as a task, except one removal: the root `README.md` bullet "Work in progress: last level of world 3 is being reworked" is now false. Filed as a request line to tech-lead.
- **B9-07** design triage — DONE (7bd6dea; no level, tuning or sim change). Its QA line (input after respawn, death-to-control, R in the freeze) is also DONE in 32238da: all Pass, death-to-control up to 950 ms against the 1.5 s target, `tests/e2e/b9-input.spec.ts`.
- **B9-08** this refresh — DONE.

*Engineering work left that does not need the owner:* one tiny item, the README bullet removal (tech-lead, request line filed; one line, no rebuild risk beyond the zip hash, which does not cover README). Orchestrator step C (final `npm run check`, `npm run test:e2e`, `npm run package`) reruns only if something changes. **There is nothing else worth doing before the owner acts.** Accepted post-jam or Could items, not scheduled: Tandem HUD strip ring on first differing gears (post-jam Could), menu sounds (Could), checkpoints (rejected), volume sliders (Could), world 4 gates and ice (cut). A further scripted sitting is the fallback only if the owner cannot play (owner item 4).

Source: design-lead's request lines of 2026-11-23 (end of `requests.md`), `docs/design/decisions.md` 2026-11-23, `docs/design/levels-w3.md` "w3-05 v2", `docs/playtests/2026-11-20-batch8.md`. No `tuning.json`, sim, contract or format change; only w3-05 changes version (`levels/w3-05.*`, `LEVELS` row). Rules as batch 8: one sitting per owner area, no shared files inside a wave, touch only the files listed, parallel agents run only `npx vitest run <single path>`; the orchestrator runs `npm run check` and commits between waves; QA alone on 4173. Ports: art 5185, ui 5186, level-designer 5187, audio 5188, backend 5189, scene 5190, playtester 5191, tech-lead 5192/5193. Idle this batch: art, ui, audio, backend, [sim], [motion], [level], [scene]. Nothing is Done until reviewed and verified.

*Wave 1 (build)*
1. **level-designer** (5187) — **B9-01** w3-05 v2 (**IN PROGRESS, started by the orchestrator 2026-11-23**). Files: `levels/w3-05.txt` (and its recording file), `levels/README.md`. Spec: request line 2026-11-23 to level-designer; `levels-w3.md` "w3-05 v2". Accept: `npx vitest run tests/levels` green (replay and +-3); from the held-at-the-step state, gear pairs 1/1, 1/2, 1/3, 2/3 plus three up presses, hold right and a jump wins in a window of >= 18 steps for every pair; step x equal in both lanes; kerbs removed still 0 wins; 0 wins without the air stop; `sealedPockets` finds no pocket; no tile change at cols < 30; `version: 2`, README (fair line, windows, removal tests, strip-jump sweep, spread, `Fastest known`), header comment; the `LEVELS` line filed in `requests.md`. Reviewer: tech-lead (B9-03). Needs: none.

*Orchestrator step A (after B9-01 lands)* `npx vitest run tests/levels`, then **B9-02** (below, orchestrator): `LEVELS` row for w3-05 version 2 with the new fastest known steps in `backend/functions/submit-run/rules.ts` (batch 6 rule; no backend sitting). Accept: `LEVELS` drift test green (`npx vitest run scripts`). Needs: B9-01.

*Wave 2 (tech-lead; needs wave 1 landed)*
1. **tech-lead** (5192/5193) — **B9-03** update the pinned w3-05 hint placements in `tests/levels` (`hints.test.ts` / `hintPlacement.ts`) to the v2 headers (`shiftUp` over the step, second `jump` over the middle of the measured take-off range, still 3 hints), and review w3-05 v2 (geometry, recording, README) into `docs/tech/reviews/2026-11-batch9-review.md`. Files: `tests/levels/**`, `docs/tech/**`. Accept: `npx vitest run tests/levels` green with the v2 headers; the review notes the step x in both lanes, that cols < 30 are unchanged, and either Approve or file:line items; flags whether the README (B8-13) needs a w3-05 line (B9-06). Needs: B9-01. (A failing header goes back to level-designer as a request line, not edited here.)

*Orchestrator step B (after wave 2)* `npm run check`, `npm run test:e2e` (port 4173 free), `npm run package`; record name, size, sha256, file count; commit.

*Wave 3 (verify)*
1. **qa-tester** (4173 alone, two full runs max) — **B9-04** against w3-05 v2: `onboarding-hints.md` 13 and 14 with the v2 headers (held-at-the-step state: `shiftUp` box over the step, both boxes on screen, clear of the HUD); `restart-prompt.md` 1 (no pocket in w3-05); replay of w3-05 to its new `wonAtStep`; close BUG-8 in `docs/qa/bugs.md` if `tandem.md` S6 HUD passes (fixed in 5321e78), else re-open with evidence; update any e2e that pinned w3-05 v1 numbers. Files: `docs/qa/**`, `tests/e2e/**`. Accept: Pass or Fail per check with a file or test name; BUG-8 Status line set; no new `test.fail`. Reviewer: tech-lead reads the specs, producer reads the verdicts. Needs: B9-02, B9-03, orchestrator step B.

*Wave 4 (playtest; the build is the step B package)*
1. **playtester** (5191) — **B9-05 (Must before submit)** a fresh cold sitting (new agent with no memory of w3-05 v1; say so if not possible) on the packaged batch 9 build from a scratch folder: w3-01..w3-04 to learn, then w3-05 v2 with no README. Count lives, minutes and run-up attempts from the first arrival at the kerbs; say whether you backed up to the step without reading. Files: `docs/playtests/2026-11-2x-batch9.md`. Accept (findings for design-lead): w3-05 cleared within 10 lives and 15 minutes, run-up cleared within 5 attempts from the first arrival at the kerbs; a "Not verified" list (sound unjudged). Reviewer: design-lead. Needs: wave 3 green.

*Wave 5 (close-out)*
1. **design-lead** — **B9-07** triage of the batch 9 playtest into `decisions.md` (a verdict per finding), re-tick `itch-page.md` section 7 art and count lines after v2, sign off feel. Files: `docs/design/**`. Needs: B9-05.
2. **tech-lead** — **B9-06 (only if B9-03 flags it)** README follow-up for w3-05 v2 (status or level notes). Files: `README.md`. Accept: every command and claim still true. Needs: B9-03, B8-13.
3. **producer** — **B9-08** board, requests and owner-list refresh after the verdicts.
4. Orchestrator step C: final `npm run check`, `npm run test:e2e`, `npm run package` after B9-06/B9-07 land; compare against the batch 8 hash (only the w3-05 level data and README should differ); this zip is the one the owner uploads. Any playtest fix goes to one more small batch (not planned; sign-off from producer).

*Batch 8 status (producer, 2026-11-23, checked against commits and files):* B8-01, B8-02, B8-03, B8-04 DONE (b6916ee); B8-05 DONE (review file, follow-ups R1-R4 fixed in e60c755); B8-06, B8-07 DONE (b6916ee/e60c755); B8-08 DONE (QA batch 8 in 5321e78; BUG-8 found and fixed there, status line in `bugs.md` still to be set, batch 9 B9-04); B8-09 and B8-10 DONE (package reproducible, sha256 657135ba..., 416,681 bytes, 11 files); B8-11 DONE (65ae833); B8-12 DONE (2a07d67); B8-13 README IN PROGRESS (tech-lead); B8-14 DONE with this section.

**Batch 8 (planned 2026-11-20, after batch 7 closed at fd11cf2; runs back to back, no dates) — LANDED except B8-13; history**

Source: design-lead's triage `docs/design/decisions.md` 2026-11-20 ("Design's order for batch 8"), `docs/playtests/2026-11-20-batch7.md`. State at fd11cf2 (checked in the repo): restart card, step-event SFX call, settings, parallax in `RIDGES`, BootScene retry and w1-03/w2-04/w3-03 hints are in; w3-03 has only `jump 12 3`; w3-04 and w3-05 have no hints; BUG-5, BUG-6 (pending observation), BUG-7 are closed or fixed; BUG-4 in `docs/qa/bugs.md` still reads OPEN although `src/entities/solutionFiles.ts` now gates the recordings behind `QA_HOOK` (QA confirms against the zip in B8-09). Hint-placement tests already exist in `tests/levels/` (`hints.test.ts`, `hintPlacement.ts`, `levelRules.ts`), which answers most of tech-lead's M2-03 line (B8-06). No `tuning.json`, contract, `LEVELS`, version or recording change anywhere in this batch (headers and render only). Menu sounds are Could (design 2026-11-20): not scheduled. Backend, audio, art and ui have no build task this batch.

Rules as batch 7: one sitting per owner area, no shared files inside a wave, touch only the files listed, parallel agents run only `npx vitest run <single path>`; the orchestrator runs `npm run check` and commits between waves; QA alone on 4173. Ports: art 5185, ui 5186, level-designer 5187, audio 5188, backend 5189, scene 5190, playtester 5191, tech-lead 5192/5193. Reviewer column: tech-lead reviews code and levels; design-lead signs off feel in B8-12. Nothing is Done until reviewed and verified.

*Wave 1 (build; start at once; independent)*
1. **level-designer** (5187) — **B8-01** hint headers only: w3-03 add `hint: shiftUp 2 3` (keep `jump 12 3`); w3-04 add `shiftUp 2 3` and `jump 12 3`; w3-05 add `jump 12 3`, `shiftUp 36 3`, `jump 41 3` (the maximum of 3). Update each file's "No hint glyph" comment and the README sections (`levels/README.md`, hint line per level, note the batch 7 playtest reason). No `version` bump, no re-record, no geometry change. Files: `levels/w3-03.txt`, `levels/w3-04.txt`, `levels/w3-05.txt`, `levels/README.md`. Spec: `decisions.md` 2026-11-20 top five 1 and 3; `onboarding-hints.md` "2026-11-20 placements"; `levels-w3.md`. Accept: `npx vitest run tests/levels` green (hint-placement tests, replay and the +-3 shifts unchanged); by-hand check that each glyph box (3x2 tiles, anchor bottom on the cell's bottom edge) is clear of tiles and 3+ rows above the floor and does not pass under the HUD at any camera position in w3-03..w3-05 (they scroll); w3-05 anchors sit at tile columns 12, 36 and 41 of the runner lane; no other file changes. Reviewer: tech-lead (B8-05). Needs: none.
2. **[scene] gameplay-engineer sitting 1** (5190) — **B8-02** the restart card at 2x: 128 x 38 px with the shipped binding, a 2 px `ui.focus` (white) outline instead of the 1 px `ui.panelBorder`, same placement rule (centred, top y 224; y 42 if a body is at the bottom of the view; 4 px above the Sticky Keys tip), static, no band colour, same look under reduced motion and reduced effects. Files: `src/entities/RestartCardView.ts`, `src/entities/RestartCardController.ts` (only if the size is there), `src/entities/restartCard.ts` and `restartCard.test.ts` (placement and size cases), `src/entities/debugHook.ts` only if the hook rectangle needs the new size; `GameScene.ts` untouched here. Spec: `restart-prompt.md` "Look" and check 3 (amended 2026-11-20). Accept: unit test that the card is 128 x 38, integer positions, 8 px margins, 2 px white outline, never overlaps the HUD rectangle; `window.__redshift.restartCard` reports `{ visible: true, x, y, w: 128, h: 38 }` under `QA_HOOK`; `npx vitest run src/entities` green; no sim, contract or format change. Reviewer: tech-lead (B8-05). Needs: none. Then, in the same sitting and in this order (each cuttable by itself): **B8-03 (Should)** W7: read the reduced-motion and reduced-effects flags again when the run resumes from pause and on R (one read at a moment the scene already handles; flash cap, no shake and the OS preference hold from frame 1 in every mode). Files: `src/scenes/GameScene.ts` (stay at or under 400 lines; put the read in a new `src/entities` helper if it would push it over), `src/entities/**`. Spec: `settings.md` "Edge cases" and check 4 (amended 2026-11-20). Accept: unit test of the re-read helper (flag changed while paused is in force after resume and after R); `npx vitest run src/entities` green. **B8-04 (Could, only if B8-02 and B8-03 are in and the sitting has room)** a pan of about 0.25 s when a park switches the camera framing from the midpoint to the remaining body (an instant cut under reduced motion). Files: `src/entities/**` camera helper, `GameScene.ts` for the one call. Spec: `tandem.md` "Camera answers from the batch 7 playtest". Accept: unit test of the pan (length, snap under reduced motion, no change when the framing does not switch); `npx vitest run src/entities` green. Reviewer: tech-lead (B8-05). Needs: B8-02 landed.

*Wave 2 (tech-lead; after wave 1 landed and `npm run check` is green)*
1. **tech-lead** (5192/5193) — **B8-05** review of wave 1 (B8-01..B8-04) into `docs/tech/reviews/2026-11-batch8-review.md`. Accept: Approve or file:line per item; `GameScene.ts` line count noted. Needs: wave 1. **B8-06** answer the open M2-03 line (requests 2026-11-04 tech-lead to design-lead): say whether `tests/levels` already enforces `onboarding-hints.md` 10 (3x2 box clear, 3+ rows above the floor, at most 3 hints, anchor on an empty cell, unknown id rejected) and checks 13 and 14; if a rule is not enforced, add it to `tests/levels/hints.test.ts` or `hintPlacement.ts` so the batch 8 headers are covered (a failing header goes back to level-designer as a request line, not edited here). Files: `tests/levels/**`, `docs/tech/**`. Accept: each rule listed with the test name that enforces it; `npx vitest run tests/levels` green. Needs: B8-01 landed. **B8-07** release read: `CREDITS.md` audit (every third-party item listed; names stay owner-pending, see "Needs the owner") and `.gitignore`, `.env.example` and `LICENSE` present and consistent; files `CREDITS.md`, `docs/tech/**`. Accept: a list in the review file of anything missing; none new, or fixed. Needs: none.

*Wave 3 (verify)*
1. Orchestrator: `npm run check`, `npm run test:e2e`, `npm run package`.
2. **qa-tester** (4173 alone, two full runs max) — **B8-08** verdicts with evidence in `docs/qa/**` and e2e in `tests/e2e/**`: `tandem.md` S5 and S6 (w3-04 by its recording: both bodies on screen, no HUD overlap, no edge arrow; runner home at step 354 then camera on the twin, dimmed strip, no twin arrow); `restart-prompt.md` 3 (card 128 x 38, 2 px white outline; update the R-4 and R-7 rectangle and screenshot expectations), 4 and 5 (card in w3-03 until the runner is on its blue bridge); `onboarding-hints.md` 13 and 14 (w3-04 and w3-05 headers present and the glyph boxes on screen at their points, from the hook) and 10-11 for the three edited levels; `settings.md` 1 (survives a reload), 2 (reduced motion visibly changes the screen), 3, 4 (W7 re-read on resume and on R, if B8-03 landed; else mark deferred); PT-3 "why you fell" cue unchanged under reduced effects (compare cue frames in both modes). Restart-prompt 8 stays a hand check (no w3-02 pocket recording; design-lead's answer of 2026-11-19). Accept: Pass or Fail per check with a file or test name; no new `test.fail`; two full runs at most. Reviewer: tech-lead reads the specs, producer reads the verdicts. Needs: B8-02, B8-05. **B8-09** close or re-open BUG-4 against the packaged zip: unzip in a scratch folder, grep for recording text and `?replay`, confirm `LICENSES.txt` and no `__redshift`; set the `bugs.md` status accordingly; note on BUG-6 how many boots were observed without a failure (no new failure = stays "fixed pending observation"). Files: `docs/qa/bugs.md`, `docs/qa/**`. Accept: BUG-4 Status line says CLOSED with the zip hash, or OPEN with what ships. Needs: the orchestrator's `npm run package`.
3. **backend-engineer** (5189) — **B8-10** final package dry run, read-only unless a check fails: from a clean checkout of HEAD run `npm ci` and `npm run package` into a scratch folder (`-- --out <file.zip>`), confirm the zip loads from a subfolder, the version and sha256 match `.sha256`, size noted, 960x540, no source maps, no `.env`, `LICENSES.txt` present and readable, no recordings. The file list goes in the sitting's report (the producer records it); fix only `scripts/**` or `backend/**` if a check fails. Files: `scripts/**`, `backend/**` (fixes only). Accept: package passes twice with the same sha256; the report lists the zip name, size, sha256 and file count; any failure is fixed with a test or filed as a request line. Reviewer: tech-lead. Needs: wave 1 and 2 landed (run after the orchestrator's check so it packages the same tree).

*Wave 4 (playtest; the build is the wave 3 package)*
1. **playtester** (5191) — **B8-11** a fresh sitting (a new agent with no memory of w3-04 or w3-05; say so in the report if that was not possible) on the packaged build from a scratch folder, cold, no README unless stuck 10 tries and then only that level's "The idea:" line. Plays, with real attempts and counted failures: w3-04 and w3-05 with the hints (questions: `levels-w3.md` "Cold-play checks"; does the `shiftUp 2 3` glyph make the opening readable; does the w3-05 sequence of three glyphs read as "back up, shift up, run, jump"; retries needed against about 16 for w3-04 and over 14 for w3-05 last time); w2-04 with the hint, real attempts (trigger: more than 5 failed jumps with the hint reopens design's frame question); w1-03 (check 12: solved within 3 falls); w3-03 for the new shift glyph and the 2x restart card seen in play. Files: `docs/playtests/2026-11-2x-batch8.md` (date of the sitting). Accept: per-level attempts, time and quit point; answers to the questions; top five changes; a "Not verified" list (sound stays unjudged: scripts cannot hear). Reviewer: design-lead (B8-12). Needs: wave 3 green.

*Wave 5 (triage and release prep)*
1. **design-lead** — **B8-12** triage of the batch 8 playtest into `docs/design/decisions.md` (one verdict per finding; any level change is a request line, then at most one small fix batch, not planned), and the re-check of `docs/design/itch-page.md` section 7 for everything that does not need the owner (count line, controls table, settings, restart card, art list, pattern list). Files: `docs/design/**`. Accept: a verdict and reason per finding; section 7 boxes ticked or a request line each. Needs: B8-11.
2. **tech-lead** — **B8-13** `README.md` status: state what the build is (14 levels in 3 worlds, settings, offline best times, leaderboards only if the owner ships them), keep the itch and jam links as "coming soon" until the owner supplies them, controls table equals `DEFAULT_BINDINGS`, run and test commands equal `CLAUDE.md`. Files: `README.md`. Accept: a unit-free read check: every command in the README exists in `package.json`; no dead promises. Needs: B8-12 (so the status matches the final scope).
3. **producer** — **B8-14** board, requests and cut-list refresh and the owner's release list (below) after the verdicts; status report.

**Needs the owner (refreshed 2026-11-23 after batch 9, B9-08; list unchanged by the expansion. Note 2026-11-23 night: the owner's scope change means the upload candidate below will change once Batch 11/12 land (new package, new sha256; item 4's hand play moves to the batch 10/expansion build, and the w3-05 hand play is still pending). The fallback release is the 14-level build tagged `rc-batch10`. Nothing here can be done by an agent; the studio is waiting on these; order is the release order; current upload candidate `redshift-b9.zip`, sha256 811d3a18307eefc5c3e5b23923a423b437d9a950b32ac22760ae154a6e9bef05, 416,863 bytes, offline build)**
1. Team names for `CREDITS.md` and the itch credits (tell the names; tech-lead then fills them, and design-lead's §7 team-names box follows).
2. Leaderboards: create the Supabase project (USER-2) and decide B-1, or ship local best times only and drop the LEADERBOARDS block from the itch copy.
3. Listening check on the packaged build (unblocks the one held audio line in `itch-page.md` §7): music follows pace; the w2-02 clunk differs from a downshift; SOUND OFF silences everything. If it fails, the audio line is deleted and the page makes no audio claim.
4. **The deciding check for w3-05 v2 (design, B9-07):** hand play in a real browser of w3-01 to w3-05 in order, each unlocked by play (no save edits). Pass: w3-05 cleared within 10 lives and 15 minutes, backing up to the step unprompted. Also **w2-04** (if you fail its jump more than 5 times, design re-opens the ruling). Fallback only if you cannot play by Nov 26: one more scripted playtester sitting, w3-01..w3-05 in order, no `localStorage` edits, at most 10 tries per level and then only that level's "The idea:" line. A fail goes to design-lead, who decides the change (then one small fix batch, new zip). Plus USER-9 from `docs/qa/m1-gate.md`: keyboard-only play with Q/E and Z/X, and one non-Chromium browser.
5. USER-8: install `gitleaks`, then tech-lead runs the SEC-3 full-history scan (clean, or rotate and rewrite). USER-7: add the roster row for `BootScene.ts` and the menu scenes to `CLAUDE.md` (only the owner or the orchestrator may).
6. USER-3: create the itch draft (HTML, 960x540, play in browser, fullscreen on), upload the final `npm run package` zip (after batch 9 step C), use the art in `docs/art/itch/`, and test inside the itch iframe in Chrome and Firefox (click to focus, keyboard).
7. USER-6: after a clean scan, make https://github.com/PatrickDCarey/Shift public and check the link works logged out; push.
8. Publish the page (USER-3), then USER-4 submit the jam entry with the repo link (jam closes 2026-12-01 21:37 UTC; studio target 2026-11-30).
9. Standing, undecided and not re-raised: the three proposed cuts in `cut-list.md`. Checkpoints were rejected again (design, B8-12); raising them needs producer sign-off.

**Batch 7 (planned 2026-11-19, after batch 6 at 373236e; runs back to back, no dates) — CLOSED 2026-11-20: landed in 4a28931, d498cb5, df88936 and fd11cf2; history**

Rulings (producer, 2026-11-19): **settings screen: YES, signed off as the first Should** (three toggles plus BACK from the title; the saved flags already exist, reduced motion is an accessibility item, it is a one-sitting M; cut first if a wave slips, and the itch page claims it only once it ships). **M3-15 volume sliders: Could** (cut); mute is Should and is the SOUND toggle. **Restart card: not new scope**, a clarity fix to Must levels w3-02/w3-03, render-only (no sim, contract or format change); it is Must. **SFX call:** audio-designer owns and exposes the one call in `src/audio` (takes a step's event list; Tandem once per body, `won` plays only the sting); [scene] owns the single call site next to `music.update`. **`BootScene.ts`: tech-lead owns it explicitly** (USER-7 still wants the `CLAUDE.md` roster row added by the owner or orchestrator). Level count stays 14; no `tuning.json`, contract or `LEVELS` change anywhere in this batch.

Rules as batch 6: one sitting per owner area and gameplay lane, no shared files inside a wave, touch only the files listed, parallel agents run only `npx vitest run <single path>`; the orchestrator runs `npm run check` and commits between waves; QA alone on 4173. Ports: art 5185, ui 5186, level 5187, audio 5188, scene 5190, playtester 5191. Nothing is Done until tech-lead reviewed it and qa-tester verified it.

*Wave 1 (start at once; independent)*
1. **[scene] gameplay-engineer sitting 1** — **B7-01** restart card per `features/restart-prompt.md`: pure `sealedPockets(level)` and 60-step trap timer, the `[R] RESTART` card (key cap from `DEFAULT_BINDINGS`, Sticky Keys tip placement), cleared by restart, respawn, leaving. Files: new files in `src/entities/` (`sealedPockets.ts`, `restartCard.ts`, tests) and the one mount line in `GameScene.ts` (stay at or under 400 lines); plus `restartCard: boolean` on the QA hook under `QA_HOOK`. Accept: `restart-prompt.md` 1-8 (unit where pure), `npx vitest run src/entities` green, no sim or contract change. Needs: none.
2. **audio-designer** (5188) — **B7-02** the one SFX entry point `playStepEvents(events)` (name is theirs) exported from `src/audio/index.ts`: once per event in order, `won` step plays only the sting, Tandem once per body, nothing for a frame with no steps. First action: a requests line to [scene] giving the exact import and call. Files: `src/audio/**`. Accept: `adaptive-audio.md` 13 (fake engine) green, `npx vitest run src/audio` green. Needs: none.
3. **tech-lead** — **B7-03** BUG-6: `BootScene.ts` retries failed preloads once (Phaser loader `loaderror`) and, if the retry also fails, shows `COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.` at 1x instead of a black canvas; never an uncaught exception. Files: `src/scenes/BootScene.ts` (pure retry/message helper plus tests in the same folder or `tests/arch`). Accept: unit test of the retry policy (fail once then succeed; fail twice then message); `npx vitest run tests/arch` green; the on-screen look is QA's. **B7-04** add `SCENE_KEYS.settings` to `src/scenes/keys.ts` (needed by wave 2 ui). **B7-05** `CREDITS.md` team names: write once the owner gives the names (owner question 2); until then audit that every third-party item is listed. Files: `src/scenes/BootScene.ts`, `src/scenes/keys.ts`, `CREDITS.md`, `docs/tech/**`. Needs: none (B7-05 names: owner).
4. **ui-engineer** (5186) — **B7-06** BUG-5: `titleJump({ type: 'levels' })` returns `{ focusId: model.playTargetId }`, passed through `TitleScene`; unit case added. Files: `src/ui/menuNav.ts`, `src/scenes/TitleScene.ts`, their tests. Accept: new unit case green, `npx vitest run src/ui src/save` green; QA removes the `test.fail` marker in `tests/e2e/menus.spec.ts` in wave 3. Needs: none.
5. **level-designer** (5187) — **B7-07** hint headers only, no `version` bump, no re-record, no `LEVELS` change: w1-03 `hint: shiftUp 2 6`; w2-04 `hint: shiftUp 8 4` and `hint: jump 8 6`; w3-03 `hint: jump 12 3`. Update each file's "No hint glyph" comment and the README sections; README status table: w2-03 v2, w2-04 v1, w3-02..w3-05 v1 APPROVED (design-lead 2026-11-17). Files: `levels/**`. Accept: `npx vitest run tests/levels` green (hint placement tests), replay and +-3 unchanged, by-hand check that no glyph box passes under the HUD at any camera position (w2-04 scrolls 2 tiles, w3-03 scrolls), `onboarding-hints.md` 10. Needs: none.
6. **art-director** (5185) — **B7-08** S4: ridge parallax (far 0.15, near 0.3) moves into `RIDGES` in `src/fx/pixel` as a per-layer `parallax`; `WHY_FELL_MS` stays as is (the matching `CUE_FRAMES` pin is ui's, wave 2). Rerun `npm run art:build`, commit sheets. Files: `src/fx/**`, `assets/art/**`, `docs/art/**`, `src/data/palette.json`. Accept: drift test green, `npx vitest run src/fx` green, no API rename. Page art is wave 4 (needs the final build). Needs: none.
7. **qa-tester** — **B7-09** test-plan additions for `restart-prompt.md` 1-8, `adaptive-audio.md` 13-15 (by ear via the audio debug state, headless cannot hear), `onboarding-hints.md` 10-11, `settings.md` 1-8, `pause.md` 13 and the dropped-key-on-overlay-frame edge case. Files: `docs/qa/test-plan.md` only (no runs). Accept: each check listed once with how it is verified. Needs: none.

*Wave 2 (after wave 1 landed and `npm run check` is green)*
1. **[scene] gameplay-engineer sitting 2** (5190) — **B7-10** one call to audio's step-events entry per rendered frame next to `music.update` (events of every step run that frame, none while paused); import the parallax from `RIDGES` (S4); confirm the scene reads the saved reduced-motion, reduced-effects and mute flags at level start and wire it if not. Files: `GameScene.ts`, `src/entities/**`. Accept: `adaptive-audio.md` 14 (grep finds the caller), unit test of the per-frame events helper, `npx vitest run src/entities` green. Needs: B7-02, B7-08, and B7-01 landed (same files).
2. **ui-engineer** (5186) — **B7-11** settings per `features/settings.md`: SOUND, REDUCED MOTION, REDUCED EFFECTS, BACK; title item after CONTROLS; saved at once; `settings.muted` through the audio engine's existing `setMuted`; reduced motion with no saved value reads the OS flag. Then, Should and cut first: pause item, menu move/select sounds, `CUE_FRAMES` = `WHY_FELL_MS` pin test. Files: `src/ui/**`, `src/save/**`, `src/scenes/SettingsScene.ts`, `TitleScene.ts`, `menuScenes.ts`. Accept: `settings.md` 5, 6 as unit tests, keyboard-only nav model tests, integer positions at 480x270, `npx vitest run src/ui src/save` green. Needs: B7-04, B7-06 landed (same files).
3. **tech-lead** — **B7-12** review of wave 1 (B7-01..B7-08; security read not needed) into `docs/tech/reviews/2026-11-batch7-review.md`. Accept: Approve or file:line per item. Needs: wave 1.

*Wave 3 (verify)*
1. Orchestrator: `npm run check`, `npm run test:e2e`, `npm run package`. 2. **tech-lead** **B7-13** review of wave 2, appended. 3. **qa-tester** (4173 alone, two full runs max) **B7-14** verdicts for B7-01..B7-12: restart card (QA hook field), SFX through the audio debug state, settings flips with keys only, BUG-5 (remove the `test.fail`), pause.md 13, hint placement; files `docs/qa/**`, `tests/e2e/**`.

*Wave 4 (final build exists)*
1. **playtester** (5191) **B7-15** cold play of w3-02..w3-05 (first play of w3-04/05), w1-03, w2-04, w3-03 hints, clunk vs shift-down by ear, per request 2026-11-19 (no README; Must before submit). 2. **art-director** **B7-16** itch page art per `itch-page.md` section 5 from the packaged build (cover 630x500, 5 screenshots, 1 GIF, optional greyscale); files `assets/art/page/**`, `docs/art/**`. 3. **design-lead** **B7-17** triage of the playtest and the re-check of `itch-page.md` section 7; any fix is a request line, then one small fix batch (reserved, not planned).

*Wave 5 (release; mostly owner)* USER-8 gitleaks, **tech-lead** SEC-3 scan, final check and package, USER-3 draft page and zip upload, USER-9 hand checks, USER-6 repo public, push, USER-3 publish, USER-4 submit.

Backend-engineer: no sitting this batch (leaderboard deploy needs USER-2 and the B-1 decision).

**Batch 6 (planned 2026-11-16, starts after batch 5 at aa4c1ed; runs back to back, no dates) — LANDED in 9f8ffb7..373236e; history**

Rules for every sitting: one sitting per owner area (and per gameplay lane), no two sittings in a wave share a file; touch only the files listed. Parallel agents run only `npx vitest run <single path>`, never `npm run check`, `npm run build`, `npm run test:e2e`, `npm test` or coverage. Dev-server ports: art 5185, ui 5186, level-designer 5187, audio 5188, backend 5189, scene 5190, playtester 5191; QA alone uses 4173 at the end. After each wave the orchestrator runs `npm run check`, fixes only wiring (for example a missing `LEVELS` row, see below) and commits before the next wave. `LEVELS` rows (`backend/functions/submit-run/rules.ts`): backend-engineer adds w3-01 in wave 1; for every level made later the level-designer files the row in `requests.md` and the orchestrator adds it before verification (the drift test fails otherwise); there is no second backend sitting. Nothing is Done until tech-lead has reviewed it and qa-tester has verified it.

*Wave 1 (start at once; independent)*
1. **tech-lead** — files: `src/core/contracts/**`, `src/core/types.ts`, `tests/arch/**`, `docs/tech/**`. In order: **B6-01** `Tuning` and `TUNING_SCHEMA` gain `runFramesPerTile`, `sprintFramesPerTile`, `cameraMaxApartTiles` (accept: `npx vitest run tests/arch/tuning-schema.test.ts` green once B6-05 lands; the orchestrator confirms the pair). **B6-02** `tests/arch/qa-hook.test.ts` accepts one exported `QA_HOOK` in `src/entities/qaHook.ts` imported by `GameScene.ts` and `solutionFiles.ts` (accept: passes today and after B6-27). **B6-03** ADR: change `mod 4` to the atlas frame count 6, note the left-facing rule `(6 - k mod 6) mod 6` (accept: text in `docs/tech/adr-pixel-rendering.md`). **B6-04** review batch 5 at `aa4c1ed` (T-20 scene, `fallThrough`, menus, audio, backend) into `docs/tech/reviews/2026-11-batch5-review.md` (accept: Approve or file:line per item; security-reviewer agent on backend; the browser look is the playtester's).
2. **design-lead** — files: `docs/design/**`, `src/data/tuning.json`. **B6-05** add the three tuning keys (3, 2, and the Tandem camera limit, now 28) to `tuning.json` (accept: schema test green with B6-01). **B6-06** rulings in `decisions.md`, one verdict and reason each: shared-room Tandem tile colouring; w3-01 roofs (world-2 jump skills skip its bridges, ask for v2 or accept); w2-03 "teaches nothing new" and w2-02's yellow bridge that never matters (accept or request level change); win card order ("Enter: next level" primary); whether w1-04 keeps the exit off screen at start (it is the exit-cue test level) and whether the HUD overlap there is a level fix. Level changes go out as request lines to level-designer. **B6-07** specs for w3-02..w3-05 in `level-plan.md` or `features/` if the plan rows do not give the grid rules (accept: each level has a one-paragraph intent, the removal test and numbers). w2-04 has a plan row (v3.0) and needs no new spec.
3. **gameplay-engineer [sim]** — files: `src/core/sim/**`. **B6-08** S3, S4, S5 in `tandemAcceptance2.test.ts`: check 13 builds the state directly and asserts `won` per architecture 3.1.1 phase 14(b); the determinism case reruns each check's own level and inputs and asserts a non-empty event list; `params.playerHeight` replaces the literal `1.5` (accept: `npx vitest run src/core/sim` green, coverage of sim not lower).
4. **audio-designer** (port 5188) — files: `src/audio/**`. **B6-09** A6 `dropAllVoices` keeps a separate music voice count (or subtracts only SFX voices) with a test; A4 `sfxSpec.ts` uses `GEAR_NOTE_HZ[4]`. **B6-10** B9 tail: delete the local `FallThroughEvent` copy and import the contract type (accept: `npx vitest run src/audio` green, no local copy).
5. **backend-engineer** (port 5189) — files: `backend/**`, `src/net/**`. **B6-11** N1 byte-counting reader with `cancel()` past the cap in `client.ts` (tests: no and lying `Content-Length`); N2 `parseEntry` uses `isDisplayName` from `src/core`; N3 confirm batch 5 closed it (the `DISPLAY_NAME_PATTERN` test never skips); N4 check `Content-Length` before `req.text()` in `submit-run/index.ts`. **B6-12** the name blocklist from design-lead's request of 2026-11-16 (`SH1T`, `F-UCK`, `ASS` rejected `name`; `CLASS`, `GRAPE`, `COCKPIT`, `BASS` accepted). **B6-13** `LEVELS` has w3-01 version 1, fastest 195. Accept: `npx vitest run scripts src/net` green.
6. **art-director** (port 5185) — files: `src/fx/**`, `src/data/palette.json`, `assets/art/**`, `docs/art/**`. **B6-14** the "why you fell" ring (a short dithered ring or flash frame set drawn around the mismatched tile, reduced-motion variant) and confirm the exit edge-arrow frame (PT-2a) exists and is named in `docs/art/style.md`, adding it only if missing; rerun `npm run art:build` and commit the sheets (accept: frame names listed in `docs/art/style.md`, drift test green, no API rename). No pause, results or controls screen art: those use the existing bitmap font and `menuDraw`.
7. **ui-engineer** (port 5186) — files: `src/ui/**`, `src/save/**`, menu scenes in `src/scenes/` (`PauseScene.ts`, `ResultsScene.ts`, `ControlsScene.ts`, `menuScenes.ts`). **B6-15** M2-12 pause scene per `features/pause.md` (text lines no longer touch). **B6-16** M2-12 results scene per `features/results.md`: "Enter: next level" is the primary action, R secondary. **B6-17** M2-13 controls scene per `features/controls-screen.md` (the title's CONTROLS entry starts it). **B6-18** `src/scenes/menuScenes.ts` exports `MENU_SCENES` (Title, LevelSelect, Pause, Results, Controls); first action of the sitting is a requests line to gameplay-engineer [scene] and tech-lead saying how Pause and Results are launched and what data they take, and how they return to level select (`{ focusId: levelId }`). **B6-19** a hide call on `StickyKeysTipView` for the win moment (the scene calls it). **B6-20** HUD meter 2 px more inset or a panel fill so it does not touch the w1-01 roof corner (art-director's request). **B6-21** mount the existing `neededColourCue` model in `GearMeterView` as `setNeededCue(slot | null)`, one 45-frame ring, cleared on respawn. Accept: `npx vitest run src/ui src/save` green; keyboard-only nav model tests for the three new scenes; integer positions at 480x270.
8. **level-designer** (port 5187) — files: `levels/**`. **B6-22** w2-04 Two Colors with recording from the `level-plan.md` row (green floor under a yellow ledge 2 tiles up; jump in the 12 steps after turning yellow), README entry with removal test and `Fastest known`, request line to backend for `LEVELS` (accept: `npx vitest run tests/levels` green, replay and +-3). **B6-23** `levels/README.md` status table edits (w2-03 approved, current versions).

*Wave 2 (after wave 1 is landed and checked: needs the Tuning keys, the ui launch contract, `menuScenes.ts`, the w3 specs and the design rulings)*
1. **tech-lead** — files: `src/main.ts`, `src/scenes/BootScene.ts`, `docs/tech/**`. **B6-24** register `MENU_SCENES` in `src/main.ts`; Boot starts `SCENE_KEYS.title` (accept: a fresh page load shows the title; `npx vitest run tests/arch` green; the browser check is QA's). **B6-25** review of wave 1 (ui scenes, audio, backend, w2-04, tuning) into `docs/tech/reviews/2026-11-batch6-review.md`.
2. **gameplay-engineer [scene] sitting 1** (port 5190) — files: `src/scenes/GameScene.ts`, `src/entities/**` only. In order: **B6-26** split `GameScene.ts` (435 lines, limit about 400) into new files in `src/entities/`, no behaviour change. **B6-27** one exported `QA_HOOK` in `src/entities/qaHook.ts` (C1). **B6-28** read `runFramesPerTile`, `sprintFramesPerTile`, `cameraMaxApartTiles` and `stepHz` from tuning (X2, X3, X6, replacing `RUN_FRAMES_PER_TILE`, `MAX_APART_TILES`, `RENDER_HZ`), X4 `GEAR_METER_AREA` from `GEAR_METER_LAYOUT`, X5 `FeedbackFx` reads `palette.flash` once. **B6-29** Pause and Results launched per the ui contract, the in-scene win banner and pause overlay replaced, Sticky Keys card hidden on win, `window.__redshift.banner` kept for the QA hook. **B6-30** music wiring (M3-21): one `music.update(musicFeed(state, eventsSinceLastFrame, this.paused))` per rendered frame, per audio's request. **B6-31** hint glyphs in the pixel scene: confirm there is no jump hint in w2-01 and fix (w1-01 arrow, w1-02 Shift/E/X, w2-01 jump visible at start). Accept: `GameScene.ts` at or under 400 lines; `npx vitest run src/entities` green; pure parts unit-tested.
3. **level-designer** (port 5187) — files: `levels/**`. **B6-32..B6-35** w3-02, w3-03, w3-04, w3-05 in that order, each with recording and README entry (removal test, whether each split is undone by the clamp or final, `Fastest known`), request line to backend for each `LEVELS` row. **B6-36** the level changes design-lead ruled in B6-06 (w3-01 v2, w1-04 v3, w2-02), if any. Accept: `npx vitest run tests/levels` green.

*Wave 3 (after wave 2 is landed; the scene needs the same files, so it is one more sitting)*
1. **gameplay-engineer [scene] sitting 2** (port 5190) — files as sitting 1. **B6-37** PT-3 "why you fell": draw art's ring on the mismatched tile from the `fallThrough` event and call `setNeededCue` (cleared on respawn; no airborne cue, cut). **B6-38** PT-2b exit cue arrow (a pure `exitCue` helper with tests) and the edge arrow clipped at the left screen edge. **B6-39** exit pulse (`exitPulseFrame`), wipe on a single-body `airDrag` only (`wipeAt`, `effectModes`, `requestFlash`), horizon (`bakeHorizon`, `sceneryColors`, standing background from `backgroundForSpeed`), all reduced-motion safe. Accept: `npx vitest run src/entities` green. Its review is the first line of the next batch.
2. **tech-lead** — files: `docs/tech/**`. **B6-40** review of wave 2 (scene sitting 1, w3 levels, main.ts) appended to the batch 6 review.

*Last (orchestrator, then QA and playtester)*
1. Orchestrator: `npm run check`, build, `npm run test:e2e`, `npm run package`.
2. **qa-tester**, alone on 4173 — files: `docs/qa/**`, `tests/e2e/**`. **B6-41** formal verification of Tandem scene checks S1-S4 and the `tandem-gate.md` table. **B6-42** new e2e: fresh load shows the title, title to level select to game, pause, results, controls; update any test that read the old banner or pause overlay. **B6-43** full suite verdicts for every batch 5 and 6 line (Pass/Fail with evidence).
3. **playtester** (port 5191) — files: `docs/playtests/**`. **B6-44** fresh play of the packaged build (unzipped in a scratch folder) from the title screen: menus, w1-01, w2-01 (jump hint), w3-01 Tandem, pause, results, "why you fell", exit cue.

*Order inside the whole plan:* Must first (menus, pause and results, hints, world 3 levels, Tandem verified, leaderboard code), effects and horizon last; world 4, M3-18 and roof-band art stay undecided and unscheduled.

**Batch 5 — LANDED in aa4c1ed (2331 unit, 86 browser tests, package ok); history, all lines below it are Review until tech-lead's batch 5 review (B6-03) and QA verify. Batch 4 above is history too.**
One sitting per owner area and lane, no shared files, no in-batch dependencies. Parallel agents run only `npx vitest run <path>`; the orchestrator then runs `npm run check`, build and `npm run test:e2e`; QA (line 11) goes last on port 4173. Ports: art 5185, ui 5186, level 5187, audio 5188, backend 5189, scene 5190, playtester 5191. Idle this batch: [motion], [level] (nothing pending).
1. **[scene] gameplay-engineer, port 5190 — T-20 and B1 only.** Files: `src/scenes/GameScene.ts`, `src/entities/**` (put Tandem view code in new files, GameScene must not grow past its limits). Done: twin `PlayerView` frames and home pose, twin edge arrow (`hud/edge/twin/<band>`, `cameraFocus(...).edgeBody`), two compact `GearMeterView` strips (runner top, twin bottom, parked when home), events by body, a level without `&` renders unchanged, scene checks S1-S4 as unit tests where pure; B1 hides the Sticky Keys tip while paused only. `npx vitest run src/entities` green. Waits (Batch 6/7): PT-3 mounting (needs the sim event), PT-2b exit cue, M3-21 music wiring, `runFramesPerTile`. Load is honest: T-20 alone fills the sitting; PT-3, PT-2b and music wiring each touch `GameScene.ts` and stay serial after it.
2. **[sim] gameplay-engineer — `fallThrough` event and T-12.** Files: `src/core/sim/**`. Done: event built exactly per `architecture.md` 3.2 (never mid-flight; no `passThrough`); `adaptive-audio.md` check 5 four cases plus a twin case; golden hash for a two-body log with a reason; coverage of sim stays >= 80%; T-11 home / all-home won / twin-death cases kept. `npx vitest run src/core/sim` green. No port.
3. **design-lead — rulings in `docs/design/**` only.** Done: `runFramesPerTile` number (decisions.md; `tuning.json` waits for tech-lead's contract, Batch 6); tandem.md check 5/6 rewording; w2-03 verdict (M2-23); airborne pass-through ruling (producer recommends cut); name blocklist handed to backend by a request line; one-paragraph Tandem gate criteria for Nov 17 (what "checks 1-12 pass plus playable" means); a spec for the w3-01 Two Lanes level if the level plan row needs more than it says. No port.
4. **level-designer, port 5187 — w3-01 Two Lanes (Tandem opener, runner hints `move`, `shiftUp` Should), with recording.** Files: `levels/**`. Done: `npx vitest run tests/levels` green (replay and +-3); README entry with removal test and `Fastest known`; request line to backend for `LEVELS`. This is also the Tandem test level for T-20 (picked up by the glob, no code change; the scene does not wait for it). w2-04 moves to Batch 6.
5. **ui-engineer, port 5186 — M2-11 title and level select** (scene classes and views; keys agreed: `title`, `levelSelect`, `pause`, `results`, `controls`) plus LOWs U1-U3. Files: `src/ui/**`, menu scenes, `src/save/**`. Done: keyboard-only nav model tests, locked levels cannot start, first level of each world open, integer positions at 480x270; `npx vitest run src/ui src/save` green. Pause, results (M2-12) and controls (M2-13) are Batch 6; scenes are registered in `main.ts` in Batch 6, so nothing is reachable in the browser yet.
6. **tech-lead — review, then keys.** Order: (a) review batch 4A at 2eb0527 into `docs/tech/reviews/2026-11-batch4a-review.md`: PX-4..PX-10, T-10/T-11 tests, w1/w2 levels, B1-B14 items, UI pure models; PX-11 as a logic read (the browser look is playtester and owner); (b) add `SCENE_KEYS` title, levelSelect, pause, results, controls to `src/scenes/keys.ts`; (c) follow-ups T1, T4, C1. Files: `docs/tech/**`, `src/scenes/keys.ts`, `tests/arch/**`, `tests/levels/**`. Done: Approve or file:line per item; `npx tsc -p tsconfig.json --noEmit` clean (orchestrator). `Tuning.runFramesPerTile` and menu `main.ts` registration are Batch 6.
7. **audio-designer, port 5188.** Files: `src/audio/**`. Done: B10 test (voice counters reset when the context leaves `running`); A1 `ramp` from the live value plus retarget test; M3-21 prep as a pure `musicFeed` helper (state and events to `music.update` args) with tests so wiring is one call. B9 tail waits for the sim event. `npx vitest run src/audio` green.
8. **backend-engineer, port 5189.** Files: `backend/**`, `src/net/**`. Done: review B1, B2, B4, B9 (B7 if cheap) fixed with a test each; `LEVELS` updated (w1-01 v2 384, w1-02 v2 273, w1-04 v2 366, w2-03 v1 142; w1-03 77, w1-05 114, w2-01 157, w2-02 153 unchanged); the `isDisplayName` case in `scripts/submit-run.test.ts` points at `src/core/contracts/leaderboard.ts` and never skips. `npx vitest run scripts src/net` green. M3-12 deploy still needs USER-2.
9. **art-director, port 5185 — M2-15.** Files: `src/fx/**`, `src/data/palette.json`, `assets/art/**`, `docs/art/**`. Done: dithered horizon with pace tint (yellow at least delta-E 20 from standing), exit glow and slow pulse (reduced-motion safe), two-frame dither wipe, reduced-effects variants; `npm run art:build` rerun, drift test green, no API rename; screenshots in `docs/art/`.
10. **playtester, port 5191 — pixel build, decoupled from the scene lane.** Serve the `release/redshift-<version>.zip` from 2eb0527 unzipped to a scratch folder (not the working tree, so GameScene edits cannot break it). Files: `docs/playtests/**`. Done: report `docs/playtests/2026-11-16-pixel-build.md` on w1-01, w1-02, w2-01: first impressions, can you see the exit, win banner, pause, exit glow (the three never seen), readability of patterns at 480x270. Tandem and menus are not in this build; do not test them.
11. **qa-tester — last, 4173 at the end only.** Files: `docs/qa/**`, `tests/e2e/**` (writes). Done: `docs/qa/tandem-gate.md` with Pass/Fail per `tandem.md` check 1-18 citing the test names (T-13; a single-file `npx vitest run src/core/sim/tandemAcceptance*.test.ts` is enough); run 5 and 6 verdicts for Batch 3 and 4A lines; e2e for the w2-03 replay case and the changed checks (sticky-keys 11, adaptive-audio 5, clarity-fixes PT-3); T-21 stubs skipped with a clear message until T-20.

**Batch 5 outline from Nov 13 (history)** — A: PX-11 (tech-lead review, playtester), M2-11 title and level select, M2-12 pause and results, M2-13 controls ([ui] sittings in order; one ui area per batch so M2-11 and M2-12 split across Batch 5 and 6), T-12 and the `fallThrough` event ([sim], after the contract), T-13 (qa), T-20 start ([scene]), M2-15 (art, needs PX-4), w2-04 and world 3 drafts (level-designer), audio B9 tail and M3-21 wiring prep, backend M3-12 (USER-2). B: the cutover set above plus T-12/fallThrough, w2-04, T-13.

---

## User actions (not agent tasks)

- `USER-1` — **DONE 2026-11-02:** repo created at https://github.com/PatrickDCarey/Shift (private until release), MIT license. Making it public is `USER-6`.
- `USER-0` — **DONE 2026-11-16:** M1 signed off (`m1` tagged), Tandem stays as world 3, dates no longer drive the plan. The proposed cuts in `cut-list.md` stay undecided and do not block.
- `USER-2` — create the **Supabase project** and run `backend/migrations/*.sql` (steps in `backend/README.md`). No date. Needed by M3-12 (deploy). Until it exists the game uses local best times only; nothing else waits on it.
- `USER-3` — create the **itch.io game page as a draft** (HTML, play in browser, 960x540, restricted) and upload a test zip from `npm run package`. Needed by the freeze checklist.
- `USER-4` — confirm you are signed up for the **GitHub Game Off 2026** jam on itch.io; publish and submit the entry with the public repo link (S-03, S-06). The jam closes 2026-12-01 13:37 PST.
- `USER-5` — standing: design-lead has the final say on feel; you read the summary when a milestone checklist is met.
- `USER-6` — make the GitHub repo public after the secrets scan (USER-8, M4-09) and before submitting. Reminder at the freeze checklist.
- `USER-7` — add `src/scenes/BootScene.ts` (and the menu scene files, `src/scenes/*Scene.ts` and `menuScenes.ts`, split between tech-lead and ui-engineer) to the roster in `CLAUDE.md` (only you or the orchestrator may edit it). Until then tech-lead edits BootScene and `main.ts`, and ui-engineer the menu scenes, by agreement.
- `USER-8` — install `gitleaks` (or allow `trufflehog`) so tech-lead can run the full-history secret scan (SEC-3) before the repo goes public.
- `USER-9` — hand checks on the pixel build when convenient: keyboard-only play with Q/E and Z/X, SFX listen, greyscale meter, 60 fps from F3, a non-Chromium browser (M1-55 list in `docs/qa/m1-gate.md`), plus one hand play of w3-01 Tandem in a browser after batch 6.

---

## Doing

2026-11-23 (B9-08): nothing in progress. Batches 8 and 9 landed; the studio waits on the owner list. Only open agent item: README bullet removal (tech-lead, request line).

## Moved on 2026-11-16 (files checked in 2eb0527 per the orchestrator; all Review until tech-lead's batch 4A review and QA run 5/6)

- **Done:** USER-0 questions (M1 signed off, `m1` tagged on cab74a1; Tandem gate Nov 17); M1-37 gate (met by owner sign-off; hand checks M1-55 move to the pixel build at the M2 gate); T-01; T-11 sim-level checks (T-10 plus T-11 pass; T-13 verification still owed); T-02b, M1-52, PT-5, M1-48, M1-51.
- **Review (built, unreviewed, not Done):** PX-4..PX-10 (cutover; browser-looked at on w1-01 only, win banner, pause screen and exit glow unseen), PX-6/7/8 scene, PX-9 ui views, `FallThroughCell` contract (event not built), M3-04 name rule, PT-6 (w1-01, w1-02, w1-04 v2), M2-22 w2-03 (design-lead approval pending), PT-3/4/5 pure models (unmounted), B2, B3, B5-B8, B9-B11 (B10 has no test), SEC-2, B13, B14, M2-14b, T-05, M2-21 approved by design-lead.
- **Not built:** T-20, T-06 remainder, `fallThrough` event, w2-04, w3-xx, M2-11/12/13, M3-21 wiring, PT-2b, `runFramesPerTile`, backend `LEVELS` refresh, rate-limit fixes B1/B2/B4.

## Review

Built in the repo and waiting on tech-lead review, a QA verification, or a closing fix. Nothing here is Done yet.

**Batch 3, landed in cab74a1 (files checked 2026-11-13; unit 2031 and e2e 73 pass per the orchestrator). All Review until tech-lead's `2026-11-batch3-review.md` and QA run 5 (Batch 4 lines 8 and 9):** T-10 (`src/core/sim/tandemAcceptance.test.ts`; checks 1, 2, 3, 16, 17), T-02b, M1-52 (`clarity-fixes.md`), M1-54/PT-1/M1-57 (`src/entities/solutionFiles.ts` gated by `QA_HOOK`), M1-58, PT-5 (answered: intended, pinned), M2-21 (`levels/w2-01.*`, `w2-02.*`; design-lead rulings in Batch 4 line 3), SEC-1 and M3-11 (`backend/functions/submit-run/`), M3-16 and M2-17b (`src/audio/music*.ts`), M1-59 and PT-2a, M1-55 (`docs/qa/m1-gate.md`; steps not yet done by a human), M2-60, T-07 ruling (`architecture.md` §3.2; the `FallThroughCell` contract is **not** in `src/core/contracts` yet), M2-25a/26a/27a (`docs/tech/reviews/2026-11-batch2-review.md`), M1-04, M1-56. M1-48 and M1-51 are confirmed at HEAD by tech-lead (2026-11-05 line): moved to Done below.

- [M1] PX-1, PX-2, PX-3 · Pixel data, atlases, bitmap font (below, moved from Doing 2026-11-05: built, art's final format is `docs/art/style.md`) — tech-lead review: `src/fx/pixel` "Changes needed" (edge arrow colour-only, HIGH, blocks T-20 only; closes in M1-59). QA: drift tests pass in run 4.
- [M1] M1-19 · Supabase schema and RLS, `backend/README.md` — owner: backend-engineer — tech-lead verdict "Changes needed" until SEC-1 (HIGH 1) lands; SQL never executed (first real run is USER-2).
- [M1] M1-48, M1-51 · [level] follow-ups, [motion] test cleanup — suite green in run 4; not named in the tech-lead sweep. Confirm in M1-04 pass, then Done.
- [M1] M1-50 · Test-plan additions — QA wrote sections 2.6 to 2.12; the e2e half needs M1-57 (meter and banner fields in the hook).
- [M2] M2-03, M2-04 (hints), M2-40, T-01 (stages 1 and 2), T-02, T-03, T-04 · tech and level lane contract work — landed; tech-lead reviews its own work in M1-56; T-04 and M2-04 parser need an independent read in M2-25a.
- [M2] M2-06, M2-39 · [scene] progression, pause, Sticky Keys mount — QA run 4 covers them; tech-lead review is M2-25a (this batch).
- [M2] M2-08 (rest), M2-10 · drag meter, pending bracket, drop pulse, progress model — review is M2-26a (this batch); M1-34 follow-ups are M1-58.
- [M2] M2-17, M2-18 · SFX set, `src/net` skeleton — review is M2-27a (this batch).
- [M2] M2-47 · colored-wall tests — QA verifies in M2-29 (check 6 restated at 4 tiles).
- [M2] M2-19, M2-20, M2-45 · w1-01..w1-05 with recordings — design-lead APPROVED w1-01, w1-02 (M2-23 partial); w1-03..w1-05 await M1-52 (w1-04 roof ruling); replay and ±3 tests green.
- [M2] M2-24 · Repo readiness — CI-green link still needed; closes in M4-12.
- [M1] M1-24 spillover: audio engine approved with MEDIUM/LOW (M2-17b).
- [M1] M1-01 spillover: M2-34, M2-01, M3-02 specs — written; M2-34/M2-01 specs reviewed by the builders as they go; M3-02 specs wait for M3-04 (tech-lead approval, Nov 6).

### Moved from Doing (art)

- [M1] PX-1 · Pixel data in `palette.json` (1-bit pattern cells redesigned for pixel scale, lip and shade rows, dither densities, key-color-to-role map, palette deltas from the style-frame README: exit, ghost outlines, yellow tint, ledge lip), texture builders in `src/fx` with unit tests (`buildPixelTextures`, `tileFrame`, `playerTextureKey`) — owner: art-director — est: 8 h — accept: builders unit-tested; every pattern pair differs on at least 15% of a tile cell; ghost outlines at least 3:1 against the background for all five bands, exit at least 4.5:1 against background and safe tiles (numbers in `docs/art/`); API names confirmed or renamed in requests before Batch 3 — needs: none
- [M1] PX-2 · `assets/art/player.png` + `player.json` (Phaser JSON-hash; frames `stand`, `run-0..3`, `jump`, `fall`, the same seven as `twin-*` as a hollow outline body with a 1 px inner line, plus `exit`; 18×26 cell, even width, 1 px gap, key colors only) — owner: art-director — est: 6 h — accept: frame names and cell size as in the ADR; runner and twin distinguishable in grayscale at 1× (check S4 in `tandem.md`); no final color baked in — needs: none

## Done — reviewed by tech-lead and verified by qa-tester (2026-11-05)

Evidence: tech-lead `docs/tech/reviews/2026-11-m1-review-sweep.md` (M1-30, M1-33, M1-34 verdicts, 2026-11-04), qa-tester `docs/qa/test-plan.md` section 7 run 4 (M1-35 PASS, M1-36 PASS), `npm run check` 1840 tests, 84.9% coverage, e2e 64/64. **Also Done by the same evidence (ids from the M1 Todo section below): M1-05, M1-25, M1-30, M1-33, M1-35, M1-36, M1-42, M1-44, M1-46, M1-28 (report `docs/playtests/2026-11-07-m1-greybox.md`), M1-21 (w0-02 v2 approved).** The lines below were Review on Nov 3 and are now Done, except where marked. Follow-ups from the reviews are separate tasks (M1-54, M1-58, M1-59, SEC-1..SEC-3), none of them reopens these lines. BUG-4 is the one open QA bug: it concerns the release build, tracked by M1-54, and it blocks only the first public upload.

- [M1] M1-01 · GDD v1.4, feature specs (movement, jump, color gating, air drag, safe tiles, HUD meter, colored walls, speed gates, Tandem), `tuning.json`, level plan v3.0 — owner: design-lead — needs: none. _Specs exist; tech-lead feasibility is covered by the core review._
- [M1] M1-02 · Scaffold, types, architecture, level format, CI, `.env.example`, `.gitignore`, LICENSE — owner: tech-lead — needs: none. _Present (`.github/workflows/ci.yml` exists)._
- [M1] M1-39 · v1.1 alignment (types, tuning type test, `.gitattributes`, README, CREDITS) — owner: tech-lead — _`tests/arch/tuning-schema.test.ts`, `.gitattributes`, `README.md`, `CREDITS.md` exist._
- [M1] M1-41 · `src/core` split into `sim/`, `motion/`, `level/` with lane contracts — owner: tech-lead — _`src/core/contracts/lanes.ts`, `tests/arch/lane-contracts.test.ts`, `core-purity.test.ts`._
- [M1] M1-06, M1-47, M1-08, M1-10, M1-11, M1-12, M1-13 · **[sim]** skeleton, shift and direction wiring, vertical motion and collision, color gating, air commitment, death and restart, determinism golden test — owner: gameplay-engineer — _`src/core/sim/*Acceptance.test.ts` (one per spec) and `determinism.test.ts`; coverage of `src/core` is 100% lines, 93% branches (tech-lead review). Review verdict: sim "Changes needed" for S1 (`wallStop` once per contact); `move.ts:21` now has the contact guard, so S1 looks fixed. M1-30 closes it._
- [M1] M1-09, M1-45 · **[motion]** ground speed model and air drag functions — owner: gameplay-engineer — _Approved in the core review; `acceptance.test.ts`._
- [M1] M1-07, M1-43 · **[level]** parser (CRLF tolerant), input-log codec, `runInputLog`, `verifySolution` — owner: gameplay-engineer — _Approved with follow-ups (M1-48)._
- [M1] M1-14, M1-15, M1-17 · **[scene]** GameScene with all key bindings and fixed step, debug overlay and `window.__redshift` (now dev or `VITE_QA_HOOK=1` only, guard `tests/arch/qa-hook.test.ts`), BootScene and focus prompt — owners: gameplay-engineer (M1-14, M1-15), ui-engineer (M1-17) — _`src/scenes/GameScene.ts`, `src/entities/*`, review `docs/tech/reviews/2026-11-qa-hook.md`._
- [M1] M1-16, M1-40 · Safe storage, settings, key-binding table (all bindings active), Sticky Keys tip logic and view — owner: ui-engineer — _`src/save/*`, `src/ui/bindings.ts`, `stickyKeysTip.ts`, `StickyKeysTipView.ts` with tests. Mounting is M2-39._
- [M1] M1-22, M1-23 · Palette and per-gear patterns — owner: art-director — _`palette.json`, `src/fx/*`, tests. Being reworked for pixel scale in PX-1._
- [M1] M1-27 · Playwright suite (smoke, keyboard, embed, replay) — owner: qa-tester — _`tests/e2e/*`, 27 passed twice (run 2)._
- [M1] M1-20 · `levels/w0-02.txt` and `w0-02.solution.txt` — owner: level-designer — _exist; spawn headroom fix is M1-21._
- [M2] M2-05 · Solution replay test — owner: tech-lead (the test lives in `tests/levels/`, tech-lead's area; the old task named gameplay-engineer) — _`tests/levels/solvability.test.ts` passes (6 tests). The ±3-step check is M1-44._
- [M2] M2-08 (Must part) · HUD gear meter component: five-cell strip, lit band, selected-gear bracket, needle, pure `hudModel` — owner: ui-engineer — _`src/ui/gearMeter.ts`, `GearMeterView.ts`, `gearMeter.test.ts`. The rest of the spec (drag meter, pending bracket, drop pulse, key-cap hints) is M2-08 in Todo._
- [M2] M2-09 · Mount the HUD gear meter in GameScene and show time in the win banner — owner: gameplay-engineer [scene] — _`GameScene.ts` creates `GearMeterView`; `GameHud.winText` change was requested and reported done._
- [M2] M2-04 (core) · **[level]** `loadLevels` and the scene's level files — _`src/core/level/loadLevels.ts`, `src/entities/levelFiles.ts`. Hint headers are M2-04 in Todo._
- [M2] M2-14 · `docs/art/accessibility.md` — owner: art-director — _exists; needs the pixel-pattern update (Todo, M2-14b)._
- [M2] M2-24 · Repo readiness — owner: tech-lead — _README, LICENSE, CREDITS, CI present and verified in M1-36. **Not fully done:** the "CI green on `main`" link is still needed; it is carried by M4-12 (also listed under Review)._

## Done

- [M1] M1-48, M1-51 · [level] follow-ups, [motion] test cleanup — tech-lead confirmed at HEAD 2026-11-05; suite green in run 4 and at cab74a1. Done 2026-11-13.
- `USER-1` — repo created and pushed (2026-11-02).
- [M1] M1-26 · `docs/qa/test-plan.md` mapping every M1 criterion — owner: qa-tester — verified: file exists and lists every check once. (Checked by the producer against the five specs; tech-lead read not needed for a plan.)
- [M1] M1-29 · Tuning pass 1 and D-1..D-3 verdicts — owner: design-lead — verified: `decisions.md` (2026-11-03) has a verdict per decision and a reason for every change (none changed); board table updated by the producer today.

---

## Todo — Batch 3 and playtest fixes (Nov 5–8)

Playtest source: `docs/playtests/2026-11-07-m1-greybox.md` (overall 3, innovation 4, theme 4). All fixes below are clarity fixes of existing Must features (HUD meter, exit, onboarding, level fairness); anything that adds a feature is flagged for producer sign-off in M1-52.

### Batch 3 (Thu Nov 5)
- [M1] M1-52 · Playtest triage and rulings, written into `decisions.md` and `features/clarity-fixes.md` (checks per fix): (1) `/` opens on w1-01; (2) exit doorway and off-screen exit cue; (3) show why you fell: flash the mismatched tile, pulse the needed HUD slot; (4) drag bar label and one-time air-shift hint (say whether it uses the existing four glyph ids or is new, in which case file it for producer sign-off, default Could); (5) win card: R and Enter conflict (folds into results M2-12). Also rule on: red ghost outline under protanopia 2.20:1 (art proposes accept), w1-04 blue bridge without roof, the edge arrow carries the band or is neutral (M1-59 builds the pattern version unless you rule neutral), w1-03..w1-05 approvals (M2-23 rest), tight windows w1-02 middle platform, w1-04 braking, w1-05 timing (~0.2 s) as numbers for the level-designer — owner: design-lead — est: 4 h — accept: a verdict with a reason per item in `decisions.md` 2026-11-05; `clarity-fixes.md` has acceptance checks per fix; requests lines to level-designer and ui-engineer — needs: none
- [M1] M1-54 · [scene] BUG-4 and review F1-F3: `src/entities/solutionFiles.ts` bundles the solution glob only when `QA_HOOK` (shared constant with GameScene), else `{}`; `?replay=1` is ignored without solutions (live play, no banner); `runDriver.ts` `startNewRun` stores only the six `INPUT_BUTTONS` in `prevInput`; stop appending to `recording` once won — owner: gameplay-engineer [scene] — est: 2 h — accept: unit tests for each of F1 (glob empty when flag off, by mocking the constant), F2, F3; `tests/arch/qa-hook.test.ts` green; e2e replay unchanged (QA hook builds). Orchestrator confirms a plain `vite build` has no `levelVersion:` text — needs: none
- [M1] PT-1 · [scene] `/` (no `?level=`) opens on w1-01 instead of w0-02; `?level=w0-02` still works — owner: gameplay-engineer [scene] — est: 0.5 h — accept: unit test of the default level choice; w0-02 reachable by query — needs: none
- [M1] M1-57 · [scene] `window.__redshift.meter` (latest `gearMeterModel`) and `banner` (win text or null) under the `QA_HOOK` guard (request 2026-11-04 from qa-tester) — owner: gameplay-engineer [scene] — est: 1 h — accept: fields present in hook builds only; `qa-hook.test.ts` green — needs: none
- [M1] M1-58 · Review follow-ups in pure code: `MAX_GEAR` and band lists imported from `core/types`; needle interpolates through `gearSpeeds` and band edges (uneven-speed test); `bestSteps` as `Object.create(null)` or a Map (LOW 15); input above 64 KiB gets defaults before `JSON.parse` and slice before filter (LOW 16); dismiss codes derived from `DEFAULT_BINDINGS`; `bindings.ts` list capped before filter; `GearMeterView` `import type` — owner: ui-engineer — est: 3 h — accept: each as a unit test; `src/ui` and `src/save` tests green; no view layout change — needs: none
- [M1] PT-5 · Investigate "HUD slot 4 lit while the player was yellow in w1-03": reproduce in `hudModel`/`gearMeterModel` with a w1-03 state, decide bug or selected-gear bracket read as lit cell; fix in the pure model or report as design question — owner: ui-engineer — est: 1 h — accept: a test that pins the answer, or a requests line to design-lead with the numbers — needs: none
- [M1] T-02b · [level] add names for `~ * < >` to `RESERVED_NAMES` in `parseLevel.ts` and one test per glyph (message, row, column) — owner: gameplay-engineer [level] — est: 0.5 h — accept: four tests green — needs: none
- [M1] T-10 · see Todo — Tandem (starts now, T-01 stage 2 landed). Done for the batch means checks 1, 2, 3, 16, 17 of `tandem.md` and all M1 acceptance tests unchanged
- [M1] T-07 · Rule on the fall-through predicate: a pure helper exported from `src/core/index.ts` or a sim event, one shared by audio and fx (request from design-lead 2026-11-04); write it in `architecture.md` and the contract — owner: tech-lead — est: 1 h — accept: ruling filed; contract stub if helper, no behaviour change — needs: none
- [M1] M1-56 · Tech-lead area follow-ups: `level-format.md` (drop "Parser status", add duplicate-hint rule), `tests/levels` hint 3x2 and 3-rows-above-floor checks (Should), `architecture.md` `src/net` listing — owner: tech-lead — est: 2 h — accept: docs match the parser; hint test fails on a planted bad hint (shown, reverted) — needs: none
- [M2] M2-25a · Review [scene] M2-06/M2-39, [level] M2-04/T-04 — owner: tech-lead — est: 2 h — accept: Approve or file:line list — needs: none
- [M2] M2-26a · Review ui M2-08 rest, M2-10, pure menu models — owner: tech-lead — est: 2 h — accept: as above — needs: none
- [M2] M2-27a · Review audio SFX (M2-17), `src/net` (M2-18), pixel-fx sheets — owner: tech-lead — est: 1.5 h — accept: as above — needs: none
- [M1] M1-04 · (listed below) now also: confirm M1-48 and M1-51 and close them; CI hardening LOW 18 (pin actions by SHA, `npm audit`, run `npm run package`) goes in this sitting — owner: tech-lead — needs: none
- [M2] M2-21 · w2-01 Commit and w2-02 Coast with recordings, `jump` hint over the w2-01 start pad (Must, cold start), `shiftUp` hint Should — owner: level-designer — est: 4 h — accept: replay and ±3 tests pass (`npx vitest run tests/levels`); README records removal tests, roof conditions checked and `Fastest known`; w2-02 red takeoff lands yellow on the pad, a yellow takeoff falls — needs: none (spec: `level-plan.md` v3.2). Uses only `levels/**`. Port 5187 if a dev server is needed
- [M1] SEC-1 · Security follow-ups, backend part: HIGH 1 (drop the service-role paste at `backend/README.md:25`, read the injected `SUPABASE_SERVICE_ROLE_KEY`, add a rotation note), MEDIUM 4 (decode JWTs in the output scan, allow-list the env key), MEDIUM 5 (scan every non-binary file; `*.pem|*.key|.npmrc` forbidden), `createZip` split under 50 lines, package check that fails on a bundled recording header (`level:` then `levelVersion:`; unit-tested on fixtures; the real build passes once M1-54 lands), MEDIUM 9 README (sign-ups off, anonymous sign-ins off, check `/graphql/v1`), MEDIUM 10 RLS test gaps, LOW 11, 13, 17, and `src/net/index.test.ts` stubs `import.meta.env` so it passes with a real `.env` — owner: backend-engineer — est: 5 h — accept: `npx vitest run scripts` green; README has no paste step; M1-19 can move to Done after tech-lead re-review — needs: none
- [M3] M3-11 · Edge function `submit-run` v1 (spec `features/leaderboards.md` "Server rules", M3-02 specs exist, `src/net` skeleton exists): payload, name rule, floor 0.85 of fastest known, rate limit at least 20 per minute per IP, replay on submit, step caps (MEDIUM 7), hashed IP (MEDIUM 8) — owner: backend-engineer — est: 4 h — accept: unit tests per rejection code (`name`, `floor`, `version`, `rate`, `invalid`); service key only from function secrets. Second item in the backend sitting; if SEC-1 overruns, M3-11 moves to Batch 4 — needs: M3-02 (exists), M2-18 (exists)
- [M3] M3-16 · Adaptive music engine prototype from `features/adaptive-audio.md` (band table, 150 ms glide, 30 ms snap on `airDrag`, follows the faster non-home body), plus M2-17b: check the SFX set against the spec (clunk an octave below shift down, reset on died and restart, level complete under 1.2 s, land under 80 ms, no SFX on `bandChange`) and the M1-34 items (move `tone()` and graph helpers out of the 170-line `createAudioEngine` closure, voice-leak order, remove `as unknown as`) — owner: audio-designer — est: 5 h — accept: mocked-context tests; no throw before a gesture; low and muffled at white, bright at red — needs: none. Touches `src/audio/**`, `assets/audio/**` only (scene wiring waits for the cutover). Port 5188
- [M1] M1-59 · Art follow-ups: `src/fx/pixel/hud.ts` `bakeEdgeArrow` carries the band by pattern ink or a pip row (HIGH, unblocks T-20; if design-lead rules neutral in M1-52, draw it neutral instead), `player.ts` flash colour from `palette.flash.color` and mix ratios into `palette.pixel`, `tiles.ts`/`scenery.ts` mix ratios, one tile and body size constant, cached `tintStops()`; PT-2a: an exit edge-arrow frame in `pixel-hud` readable by shape (no band needed); rerun `npm run art:build` — owner: art-director — est: 5 h — accept: unit tests for the arrow (band distinguishable in greyscale from pattern alone), drift test green, exit frame named in `docs/art/style.md`. Touches `src/fx/**`, `src/data/palette.json`, `assets/art/**`, `docs/art/**`. Port 5185 — needs: none
- [M1] M1-55 · M1-37 gate checklist: `docs/qa/m1-gate.md` with the by-hand steps (keyboard-only w0-02 run with Q/E and Z/X, SFX listen, greyscale look at the meter, 60 fps from F3, a non-Chromium browser) and the pass criteria for each; no run is claimed done unless a human did it — owner: qa-tester — est: 1 h — accept: each step has an exact command or URL and a pass line — needs: none
- [M2] M2-60 · e2e additions (writes only): spawn jump on w0-02 now unblocked (fix stale comments in `helpers.ts`, `keyboard.spec.ts`); w1-03..w1-05 replay cases if not present; HUD meter and banner checks once M1-57 exists (skip with a clear message if the field is absent). The orchestrator runs `npm run test:e2e` at the end; QA then writes run 5 — owner: qa-tester — est: 2 h — accept: tests typecheck (`npx tsc -p tsconfig.node.json --noEmit` or `npm run typecheck` by the orchestrator); port 4173 only when run by the orchestrator — needs: none

### Playtest fixes held for later batches
- [M2] PT-2b · [scene] draw the exit doorway and exit edge-arrow cue — owner: gameplay-engineer [scene] — accept: exit readable at a glance in the pixel build (screenshot) — needs: PX-6, M1-59 (cutover renders the doorway anyway; the cue wiring shares T-20 camera code)
- [M2] PT-3 · Show why you fell: [scene] flash the mismatched tile on fall-through; ui-engineer pulses the needed HUD slot (pure model first, drawn in PX-9 layout) — owners: gameplay-engineer [scene], ui-engineer — accept: per `clarity-fixes.md` checks — needs: M1-52, T-07, PX-7, PX-9
- [M2] PT-4 · Label the drag bar; one-time air-shift hint if M1-52 keeps it — owner: ui-engineer — accept: per `clarity-fixes.md` — needs: M1-52, PX-9
- [M2] PT-6 · w1-02 middle platform, w1-04 braking and w1-05 shift timing retunes (about 0.2 s window) to the numbers in M1-52; re-record, replay and ±3 pass — owner: level-designer — est: 4 h — needs: M1-52 (Batch 4)
- [M2] PT-7 · Win card "press R" vs "Enter: next level" — folded into results M2-12 (the banner is replaced); no separate task
- [M4] SEC-2 · Security MEDIUM 6 name allow-list lands in M3-02 follow-up; backend and ui mirror it in M3-11/M3-14 — owner: design-lead (rule), then backend-engineer — needs: M1-52
- [M4] SEC-3 · **Full-history secret scan before the repo goes public** (`gitleaks detect` or `trufflehog git`; security HIGH 3), key rotation if anything is found; run once on Nov 24 (time to rotate) and again Nov 30 morning before USER-6 — owner: tech-lead — est: 1 h each — accept: scan output shown clean, or findings rotated and re-scanned — needs: USER-8 if the tool is not installed
- [M4] M4-17 · CI grep that a plain build contains no recording header, plus CI hardening tail (security LOW 18) — owner: tech-lead — est: 1 h — needs: M1-54

---

## Todo — M1 Grey-box (Nov 4–8)

**2026-11-05: M1-05, M1-21, M1-25, M1-28, M1-30, M1-33, M1-35, M1-36, M1-42, M1-44, M1-46 are Done (see the Done section). Still open here: M1-04, M1-34 (partly, M1-19 and the fx edge arrow), M1-37, M1-38, M1-50, M1-18/M1-19/M1-24 as noted in Review.**

Done when: one room with gears, acceleration over distance, color-gated tiles, air drag and safe tiles; deterministic sim with tests. **Met in code; the remaining work is verification and one level fix.**

### Level design and approval
- [M1] M1-21 · `w0-02` spawn headroom: open the ceiling over cols 0–2 so the first jump from the start pad reaches the full 3-tile apex, keep the low ceiling over the blue bridge, re-record `w0-02.solution.txt`, rerun the cheese sweeps, update `levels/README.md` — owner: level-designer — est: 1.5 h — accept: a standing jump at the spawn never touches a ceiling (apex 3.0 tiles, shown by replay or sim); solution still wins and still wins with inputs shifted ±3 steps; `npx vitest run tests/levels` passes; the bridge still cannot be jumped — needs: none
- [M1] M1-25 · Approve the grey-box room — owner: design-lead — est: 0.5 h — accept: verdict in `decisions.md` — needs: M1-21
- [M1] M1-28 · Fresh-eyes playtest of w0-02 with the HUD, answering D-1..D-3 again plus design-lead's four extra questions (can you say which gear red needs, did the first jump look full, can you see the exit and yellow ghosts, did you notice the drag meter and pending bracket) — owner: playtester — est: 2 h — accept: report `docs/playtests/2026-11-07-m1-greybox.md`. **Known:** exit contrast and ghost contrast are pixel-art fixes (PX-1) and will still fail on the old render; the report records them for PX-11 and is not a blocker — needs: M1-21, M1-27, M2-08 Must part

### Tech
- [M1] M1-30 · Close the core review: confirm S1 (`wallStop` once per contact) and S2 (`prevInput` holds only the six buttons) are fixed and approve the sim lane — owner: tech-lead — est: 1 h — accept: Approve, no CRITICAL/HIGH; replaces M1-31 and M1-32 — needs: M1-46
- [M1] M1-33 · Review scene work, HUD mount, replay mode and the hook; **decide whether `levels/*.solution.txt` ship in the release build** (request 2026-11-02, architecture §6) — owner: tech-lead — est: 1.5 h — accept: Approve; decision written in `architecture.md` — needs: none
- [M1] M1-34 · Review side tracks (storage, bindings, Sticky Keys logic, packaging, Supabase schema and RLS with the security-reviewer agent, palette, patterns, audio engine). Side tracks not yet in Review on Nov 7 are reviewed in M2 — owner: tech-lead — est: 2 h — accept: Approve or file:line list — needs: M1-16, M1-40
- [M1] M1-04 · Guard rails: confirm the arch test covers all three sub-folders and the 80% gate, add the CI secret check (no `.env`, no service-key patterns) — owner: tech-lead — est: 1 h — accept: a planted fake key fails the check (shown, reverted) — needs: none
- [M1] M1-05 · `CLAUDE.md` Commands table gets `npm run package` — owner: tech-lead — est: 0.25 h — accept: every listed command runs — needs: M1-18. _`CLAUDE.md` edits need the user or orchestrator; tech-lead files the line._
- [M1] M1-44 · Robustness test: every level's recording still wins with each input transition shifted ±3 steps (gap G3) — owner: tech-lead — est: 1.5 h — accept: Vitest in `tests/levels/`; a recording that only wins at exact timing fails (shown, reverted) — needs: none

### Gameplay
- [M1] M1-46 · **[sim]** Follow-ups from the core review and design replies: S2 (`prevInput` stores exactly the six buttons, `step.ts`, `status.ts`), replace "pinned, spec expects" comments and tolerance assertions with the exact spec values (requests 2026-11-02, design-lead lines) — owner: gameplay-engineer — est: 1.5 h — accept: a frame with extra fields gives the same state hash as one without; spec numbers asserted exactly; suite green — needs: none
- [M1] M1-48 · **[level]** Review follow-ups L1–L6: `verifySolution` folds states and stops at the first `won`, delete `pairSolutions`, BOM as an escape, one `MAX_WORLD`, `MAX_REPLAY_STEPS`-derived digit limit, speed up the codec round-trip test — owner: gameplay-engineer — est: 2 h — accept: a 1,000,000-step log verifies without allocating a state per step (test); codec test under 1 s; coverage stays ≥ 80% — needs: none
- [M1] M1-51 · **[motion]** Drop the "GDD prints… within tolerance" comments and the secondary tolerance assertions in `src/core/motion/acceptance.test.ts` (red mid-ramp row is 8.075) — owner: gameplay-engineer — est: 0.5 h — accept: assertions equal the GDD v1.2 tables — needs: none

### Backend and release
- [M1] M1-19 · Supabase schema draft `backend/migrations/0001_runs.sql` with RLS (public read, no client writes) and `backend/README.md` with copy-paste user steps — owner: backend-engineer — est: 2 h — accept: policies deny anon insert, update, delete; no keys in the repo; steps copy-pasteable — needs: none
- [M1] M1-18 · `npm run package`: production build zipped for itch.io (the `package` script does not exist yet) — owner: backend-engineer — est: 2 h — accept: unzip into a subfolder, serve it, and the game loads; zip has no `.env` or secrets; script is in `package.json` — needs: none. _Re-check after the cutover (PX-4 changes `main.ts` and `index.html`)._

### Audio
- [M1] M1-24 · `src/audio/engine.ts`: lazy AudioContext resumed on first gesture, master/music/SFX buses, mute, tone helper (`src/audio/index.ts` is an empty stub today) — owner: audio-designer — est: 3 h — accept: nothing throws before a gesture (mocked-context tests); mute and bus volumes tested — needs: none

### QA
- [M1] M1-42 · Close BUG-1, BUG-2, BUG-3 in `docs/qa/bugs.md` after re-running the e2e suite (tech-lead fixed them in b432391: hook gated to dev or `VITE_QA_HOOK=1`, viewport after the device spread, `workers: 2`, `reuseExistingServer: false`) — owner: qa-tester — est: 0.5 h — accept: each bug has a closed entry with evidence (`dist/` search shown for BUG-1) — needs: none
- [M1] M1-50 · Add to the test plan: HUD checks 1–12 and the time banner, the shift-buffer scene check (press on flight step 10 of a 48-step jump is dropped, within 6 steps of landing applies), and e2e for them where the scene exposes the meter model (gap G4) — owner: qa-tester — est: 1.5 h — accept: each added check appears once with its verification layer — needs: none
- [M1] M1-35 · Verify the simulation against the five M1 specs and run the full suite; on pass, the whole Review list above moves to Done — owner: qa-tester — est: 2 h — accept: Pass/Fail per spec criterion with evidence; test counts and coverage reported — needs: M1-26, M1-30
- [M1] M1-36 · Verify side tracks and repo files — owner: qa-tester — est: 1.5 h — accept: each task's accept line checked with evidence; packaging, schema and audio engine only if in Review — needs: M1-34, M1-18, M1-19, M1-24
- [M1] M1-37 · **M1 gate (Nov 8, earlier if the owner signs off)**: w0-02 plays end to end in the browser with every alternate binding; suite, typecheck and build pass — owner: qa-tester — est: 1 h — accept: no open blocker or major in `docs/qa/bugs.md` (BUG-4 is minor, tracked by M1-54, must close before any public upload); replay result matches; by-hand checks of M1-55 done by a human; commit tagged `m1` — needs: M1-55 (the other predecessors are Done)

### Producer
- [M1] M1-38 · M1 close-out: board against the repo, move tasks, publish the cutover go or no-go — owner: producer — est: 1 h — accept: board and files agree — needs: M1-37

**Superseded in M1:** M1-03 (feasibility review of the specs: the sim was built and reviewed directly, `docs/tech/reviews/2026-11-core-lanes.md`), M1-31 and M1-32 (merged into M1-30).

---

## Todo — Pixel cutover (Nov 8–10, one commit; ADR `docs/tech/adr-pixel-rendering.md`)

Starts after the `m1` tag and PX-1..PX-3 in Review. Batch 3 tasks touch disjoint areas and land together; the game and the e2e suite are inconsistent in between. **Trigger:** if PX-1..3 are not in Review by Nov 7 end of day, the cutover starts Nov 9 and Tandem scene work waits for it (see risks R8 and the cut list).

- [M2] PX-4 · `src/main.ts` to 480×270 with `Scale.NONE` + `MAX_ZOOM` + centre, re-zoom on window resize, `fps.panicMax: 0`; `BootScene` preloads atlas and font and calls `buildPixelTextures` (tech-lead owns BootScene); `index.html` letterbox colour; `architecture.md` — owner: tech-lead — est: 3 h — accept: canvas 480×270 at 2× in a 960×540 frame; zoom becomes 4× at 1920×1080 after a live resize; boots with storage blocked; SaveStore (M2-40) still shared via the registry — needs: PX-1, PX-2, PX-3, M2-40, M1-37
- [M2] PX-5 · `tuning.json` `tileSize` 32 → 16 (render-only), note the 480×270 base in the GDD — owner: design-lead — est: 0.25 h — accept: no `src/core` test changes; view is 30 × 16.875 tiles; no level change — needs: M1-37
- [M2] PX-6 · **[scene]** `LevelView` on Tilemap layers over the generated tileset (top and inner variants, colored indices swapped on mode change), exit as a sprite — owner: gameplay-engineer — est: 4 h — accept: no per-frame rect redraw; solid, ghost and exit visible at 2× (screenshot); band change swaps tiles without a frame hitch — needs: PX-1, PX-2
- [M2] PX-7 · **[scene]** `PlayerView` as a sprite, one instance per body, `playerFrame(player, params)` pure and tested, camera helper taking a list of snapped body positions with the snapping invariant and unit tests, `FeedbackFx` sizes halved, `GameScene` wiring (including the drop flash) — owner: gameplay-engineer — est: 5 h — accept: for any x the player's screen x is constant while the camera is unclamped (unit test); animation frame comes from sim state, not wall clock; a replay renders identically twice — needs: PX-1, PX-2, PX-6
- [M2] PX-8 · **[scene]** `GameHud` on BitmapText at 480×270: title, banner at 2×, debug overlay, focus prompt, halved constants — owner: gameplay-engineer — est: 2 h — accept: all text uses the bitmap font and integer positions; win banner still `M:SS.ss` — needs: PX-3, PX-7
- [M2] PX-9 · `GearMeterView` at 110×32 with the bitmap font, a compact 110×14 strip variant for two bodies, `StickyKeysTipView` rebuilt for 480×270, tests — owner: ui-engineer — est: 7 h — accept: meter model unchanged (`hudModel` tests pass); both sizes drawn from the same model; tip dismissable by key — needs: PX-3, M2-08
- [M2] PX-10 · e2e for the new canvas: 480×270 attributes, CSS width a whole multiple of 480 at 960, 1366×768, 1920×1080 and 2560×1440, live resize test, a 2× screenshot check, `EMBED_VIEWPORT` comment — owner: qa-tester — est: 3 h — accept: `npm run test:e2e` green against the new build — needs: PX-4
- [M2] PX-11 · Review of the cutover and fresh play in the 960×540 iframe and fullscreen at 1366×768 and 1920×1080 (judder, legibility, dither, exit and ghost contrast) — owners: tech-lead (review, 1.5 h) and playtester (play, 1.5 h) — accept: review Approve; playtest report lists legibility and the exit and ghost questions left from M1-28 — needs: PX-4..PX-10

---

## Todo — Tandem (sim Nov 9–13, decision gate Nov 12)

Spec: `docs/design/features/tandem.md`. Contract and architecture first, then the sim, then the scene after the cutover.

- [M3] T-01 · Tandem contracts: `SimState.twin: PlayerState | null`, `PlayerState.home`, `body: 0 | 1` on player events, `home { body }` event, `died` gains `body`, shared input state at run level, `Level` twin spawn; level format `&` (at most one, parses as empty, spawn rule like `@`, reject `&` on an exit); `architecture.md` §3.1/3.4 (phases 0, 1, 3, 14, 15 once, phases 2 and 4–13 per body, home before death); the second player view and camera rules in the ADR; lane contracts updated and arch tests green — owner: tech-lead — est: 4 h — accept: `npm run check` passes with the types in place and no behaviour change; docs state the step order exactly as `tandem.md`; announced in requests — needs: none. **Must land by Nov 5 so the sim lane can start Nov 9 without waiting.**
- [M3] T-02 · Cut the dead items: `~` mud, `*` boost, `<` `>` conveyors become a parse error or reserved (tech-lead's call), remove `mudMaxGear`, `boostPadGear`, `ghostSpacingTiles`, `ghostLifetimeMs` from `Tuning`, `TUNING_SCHEMA`, `SimParams`; `=` ice stays (Should); "speed camera" becomes "speed gate" in `level-format.md` — owner: tech-lead — est: 1.5 h — accept: `tests/arch` green in the same batch as T-03; no `src/core` behaviour change — needs: T-01
- [M3] T-03 · Delete the four unused keys from `src/data/tuning.json` in the same batch as T-02 — owner: design-lead — est: 0.25 h — accept: tuning-schema test green — needs: T-01
- [M3] T-04 · **[level]** Parse the twin spawn `&` (error naming row and column on a second); `Level` carries the twin spawn — owner: gameplay-engineer — est: 2 h — accept: one test per rule; a CRLF copy parses identically; levels without `&` parse as before — needs: T-01
- [M3] T-10 · **[sim]** Tandem part 1: per-body player state, twin spawn, shared direction priority and `prevInput` at run level, phases split once vs per body (runner first), events with `body`, checks 1, 2, 3, 16, 17 — owner: gameplay-engineer — est: 6 h — accept: checks 1–3 and 16–17 of `tandem.md` pass; every M1 acceptance test passes unchanged (check 1) — needs: T-01
- [M3] T-11 · **[sim]** Tandem part 2: per-body shift and jump (grounded now, airborne buffers), clamp resync, wall stop for one body, home, win, death and restart for both bodies, checks 4–15 — owner: gameplay-engineer — est: 5 h — accept: checks 4–15 pass (**checks 1–12 are the decision gate**); derived numbers pinned by tests, differences filed in requests — needs: T-10
- [M3] T-12 · **[sim]** Tandem part 3: determinism (check 18), golden hash for a two-body log, coverage ≥ 80%, request lines for every derived number that differs — owner: gameplay-engineer — est: 3 h — accept: checks 1–18 pass; golden hash recorded with a reason — needs: T-11
- [M3] T-13 · **Decision gate, verify:** run `tandem.md` checks 1–12 against the sim; report Pass/Fail per check — owner: qa-tester — est: 2 h — accept: written table in `docs/qa/`; Nov 12 — needs: T-11
- [M3] T-14 · Review the Tandem sim and contract — owner: tech-lead — est: 2 h — accept: Approve, no CRITICAL/HIGH; determinism inspected — needs: T-12
- [M3] T-15 · **DONE 2026-11-16, decided by the owner: Tandem stays as world 3.** The fallback is off the table; G-1..G-6 stay Should. T-13 (QA table of checks 1-18) is still owed as verification, not as a gate — owner: producer
- [M3] T-05 · Art for Tandem: home and parked pose or glyph, silhouette glyph for the HUD strips and the camera edge arrow, lane divider reads as solid ground, runner vs twin checked in grayscale and in the three color-vision simulations (added to `docs/art/accessibility.md`) — owner: art-director — est: 3 h — accept: runner and twin distinguishable by shape in the simulation images; both show their band pattern in every frame — needs: PX-2, T-01
- [M3] T-06 · HUD for two bodies: two stacked compact strips (top runner, bottom twin), each marked with its silhouette glyph, band cell, bracket, needle, drag meter and pending shift; a home strip dims and shows a home glyph; one strip when `twin` is null — owner: ui-engineer — est: 4 h — accept: unit checks: two strips from a two-body state, a gear 1 / gear 3 split shows different brackets, home strip dimmed — needs: T-01, PX-9, T-05
- [M3] T-20 · **[scene]** Tandem view: second `PlayerView` (twin frames), camera per `tandem.md` (midpoint of non-home bodies, the non-home body when one is home, runner plus an edge arrow beyond 28 tiles), home pose, events by body in `FeedbackFx`, scene checks S1–S4 — owner: gameplay-engineer — est: 8 h — accept: S1–S4 pass; level with no `&` renders unchanged — needs: PX-7, T-10, T-05
- [M3] T-21 · e2e for Tandem scene checks S1–S4 and the two-strip HUD; add `tandem.md` checks 1–18 to the M3 test plan — owner: qa-tester — est: 3 h — accept: passes via `npm run test:e2e`; plan lists checks 1–18 once each — needs: T-20, T-06

---

## Todo — M2 First worlds (Nov 9–15)

Done when: level loader and replay test, **worlds 1–2 = 9 levels**, HUD gear meter (Must part plus drag meter), title and level select, Sticky Keys tip, colored-wall tests, on the pixel build.

### Design and tech
- [M2] M2-34 · Specs part 2: title, level select (locked, unlocked, best time), pause and results, progress save, loader behaviour; **include a first-level-of-each-world unlock rule proposal for the 10-minute voter (R9)** — owner: design-lead — est: 4 h — accept: Rule/Edge cases/Tuning/Acceptance/Priority; written for 480×270 — needs: M1-01
- [M2] M2-01 · Remaining specs: Sticky Keys tip overlay, controls screen, onboarding glyph hints (arrow in w1-01, Shift/E/X in w1-02); HUD part is `hud-gear-meter.md` — owner: design-lead — est: 2 h — accept: as M2-34 — needs: M1-01
- [M2] M2-02 · Ice spec (Should, world 4) with tuning keys — owner: design-lead — est: 2 h — accept: edge cases per gear incl. speed 0; due Nov 15; drop first if behind — needs: M1-01
- [M2] M2-03 · Hint headers in `level-format.md` (glyph id plus tile position), `LevelMeta` and `RunResult` types — owner: tech-lead — est: 3 h — accept: types and docs updated, requests answered — needs: M1-01
- [M2] M2-40 · `src/main.ts` creates one `SaveStore` (`createSaveStore()`), shares it through the Phaser registry (key in `src/scenes/keys.ts`), documented in `architecture.md` — owner: tech-lead — est: 1.5 h — accept: scenes read the registry store; game boots with storage blocked — needs: M1-16. _Lands before PX-4 so both edits of `main.ts` are sequential._
- [M2] M2-23 · Approve levels, rolling per pair — owner: design-lead — est: 2 h — accept: one-line verdict per level in `decisions.md`; a rejection names the pillar — needs: M2-19, M2-20, M2-21, M2-22, M2-45
- [M2] M2-25 · Review loader, progression, mounts, hint mount — owner: tech-lead — est: 2 h — accept: Approve — needs: M2-04, M2-06, M2-39, M2-41
- [M2] M2-26 · Review UI (menus, HUD, tip, controls, glyphs) — owner: tech-lead — est: 2 h — accept: Approve — needs: M2-08, M2-10, M2-11, M2-12, M2-13, M2-36
- [M2] M2-27 · Review art, audio and net skeleton — owner: tech-lead — est: 1.5 h — accept: Approve — needs: M2-14, M2-15, M2-17, M2-18

### Gameplay
- [M2] M2-47 · **[sim]** Colored-wall acceptance tests from `features/colored-walls.md` checks 1–7 (behaviour already built) — owner: gameplay-engineer — est: 3 h — accept: seven checks as tests, no sim change needed (if one fails, a request is filed) — needs: none
- [M2] M2-04 · **[level]** Hint headers in the parser and loader — owner: gameplay-engineer — est: 2 h — accept: a level with hint headers loads; a bad hint names file, row and column; CRLF identical — needs: M2-03
- [M2] M2-06 · **[scene]** Progression: goal gives a complete event with time (steps stored), restart, next level; `store.recordLevelComplete(levelId, wonAtStep)` on the shared SaveStore; a pause flag freezes the sim accumulator — owner: gameplay-engineer — est: 3 h — accept: stored step count equals the replay's; pause freezes the sim (test) — needs: M2-04 (core), M2-40
- [M2] M2-39 · **[scene]** Mount the Sticky Keys tip (`showStickyKeysTipIfDue`, first level start of the page session) — owner: gameplay-engineer — est: 1.5 h — accept: tip shows once on a Windows user agent and never blocks input — needs: M1-40, M2-40
- [M2] M2-41 · **[scene]** Mount the onboarding hint glyphs at the positions in the level file — owner: gameplay-engineer — est: 1.5 h — accept: glyphs appear where the headers say — needs: M2-36, M2-04, PX-7

### UI
- [M2] M2-08 · HUD remainder: drag meter (hidden at or below `airDragMinBand`, else `airDistance / airDragTilesPerGear` capped at 1), pending-shift bracket, drop pulse, key-cap hints, reduced-motion respected — owner: ui-engineer — est: 3 h — accept: checks 1–12 of `hud-gear-meter.md` as unit tests; built at 960×540 (PX-9 halves it) — needs: none
- [M2] M2-10 · Progress model on `SaveStore`: unlock rule (completing a level unlocks the next; world 0 never listed; plus design-lead's rule for first levels per world if adopted) and best-time helpers — owner: ui-engineer — est: 3 h — accept: survives reload; blocked storage falls back to memory; unit tests — needs: M1-16, M2-34
- [M2] M2-36 · Onboarding hint glyph renderer (arrow, Shift, E, X; icons not text) at 480×270 — owner: ui-engineer — est: 2 h — accept: each glyph id renders from a plain object; unit test for id lookup — needs: M2-03, PX-3
- [M2] M2-11 · Title scene and level select at 480×270 (keyboard nav, locked, unlocked, best time, BitmapText, integer positions) — owner: ui-engineer — est: 5 h — accept: reachable with keyboard only; locked levels cannot start — needs: M2-34, M2-10, PX-9
- [M2] M2-12 · Pause and results scenes (retry, next, back to select) — owner: ui-engineer — est: 4 h — accept: pause freezes the sim; results show time and best — needs: M2-06, M2-11
- [M2] M2-13 · Controls screen: every binding including Q/E and Z/X, "show the Sticky Keys tip again", no remapping — owner: ui-engineer — est: 2 h — accept: usable without Shift; every binding from the table listed — needs: M2-01, PX-9

### Art and audio
- [M2] M2-14b · Update `docs/art/accessibility.md` for the 1-bit pixel patterns (each gear distinguishable by pattern alone in the three simulations; red crosshatch checked against "reads as grating") — owner: art-director — est: 2 h — accept: numbers and simulation images in `docs/art/` — needs: PX-1
- [M2] M2-15 · Pixel world look beyond the pipeline: dithered horizon with the pace tint (yellow distinct from white), exit door glow and slow pulse (reduced-motion safe), two-frame dither wipe for the band-drop flash, reduced-effects variants — owner: art-director — est: 5 h — accept: yellow background at least delta-E 20 from standing; flash visible without color; screenshots in `docs/art/`. **Replaces old M2-15 and M2-16 (the scene half is in PX-7)** — needs: PX-1, PX-4
- [M2] M2-17 · SFX set behind one function each: shift up, shift down, jump, land, fall-through, reset, level complete, UI move, UI select, air-drag clunk — owner: audio-designer — est: 4 h — accept: all ten exist and are audible at low volume; clunk differs from shift down — needs: M1-24

### Backend
- [M2] M2-18 · `src/net` Supabase client skeleton: timeout, quiet failure, no-op without env — owner: backend-engineer — est: 3 h — accept: mocked fetch: timeout, 500 and offline all resolve without throwing — needs: M1-19

### Level design (9 levels; each records in `levels/README.md` that removing the new piece breaks the intended line)
- [M2] M2-19 · w1-01 First Steps and w1-02 Shift, with recordings (hint headers added when M2-04 lands) — owner: level-designer — est: 4 h — accept: replay test passes; ±3-step test passes; safe spot near the start; w1-01 fails if you let go on the bridge — needs: M1-21
- [M2] M2-20 · w1-03 Runway and w1-04 Brake — owner: level-designer — est: 4 h — accept: as M2-19; w1-03 red bridge 2 tiles out, 8-tile safe room behind — needs: M2-19
- [M2] M2-45 · w1-05 Red Wall — owner: level-designer — est: 3 h — accept: as M2-19; the shift window is the 2.75 tiles in the plan; removing the wall breaks it — needs: M2-20
- [M2] M2-21 · w2-01 Commit and w2-02 Coast — owner: level-designer — est: 4 h — accept: as M2-19; w2-02 red takeoff lands yellow on the pad, a yellow takeoff falls — needs: M2-45
- [M2] M2-22 · w2-03 Step Down (drop exactly 4 tiles) and w2-04 Two Colors — owner: level-designer — est: 4 h — accept: as M2-19; w2-03 walk-off lands 5.8 tiles out, jump 10.65 — needs: M2-21. _Hint headers for w1-01 and w1-02 and the `levels/README.md` pass: 1 h, after M2-04._

### QA, playtest, gate
- [M2] M2-28 · E2E: boot, title, level select, play, complete, results, Q/E and Z/X, Sticky Keys tip once (Windows user agent emulated), controls screen, a colored wall — owner: qa-tester — est: 4 h — accept: passes via `npm run test:e2e` — needs: M2-06, M2-11, M2-12, M2-13, M2-39
- [M2] M2-29 · Verify M2 on the pixel build: all accept lines, colored-wall checks 1–7, 960×540 in an iframe, keyboard only, alternate bindings, color-blind screenshots — owner: qa-tester — est: 3 h — accept: Pass/Fail per criterion with evidence — needs: M2-23, M2-25, M2-26, M2-27, M2-28, M2-47
- [M2] M2-30 · Playtest worlds 1–2 (fresh eyes) including re-checks of D-1 and D-3 and **how far a 10-minute player gets** (R9) — owner: playtester — est: 2 h — accept: report with per-level sections and a "would they reach level 10" estimate — needs: M2-29
- [M2] M2-31 · Triage the playtest into decisions, lock tuning, **decide whether Two Colors moves after w3-01 or world 1 trims** (GDD §12.7) — owner: design-lead — est: 2 h — accept: each issue decided with a reason; lock recorded — needs: M2-30
- [M2] M2-32 · **M2 gate (Nov 18 in A, Nov 20 in B; was Nov 15):** suite, build, worlds 1–2 verified after the decisions — owner: qa-tester — est: 1.5 h — accept: no open blocker or major — needs: M2-29, M2-31
- [M2] M2-33 · M2 close-out, M3 re-plan, Tandem gate outcome applied — owner: producer — est: 1 h — accept: board current; cut triggers checked — needs: M2-32

---

## Todo — M3 Content complete (Nov 16–22)

Done when: Tandem world 3 (5 levels), leaderboards live, adaptive audio, pixel effects and reduced-effects path.

### Design and tech
- [M3] M3-02 · Specs: leaderboard UX (time vs steps, name rules), adaptive audio mapping, pixel effects and reduced-effects behaviour (including flash and clunk, Tandem effects per body) — owner: design-lead — est: 4 h — accept: sections complete; due Nov 11 so audio and backend can start — needs: M1-01
- [M3] M3-04 · Approve M3 specs, shared types for the leaderboard payload — owner: tech-lead — est: 1 h — accept: `types.ts` and docs updated — needs: M3-02
- [M3] M3-28 · Approve world 3 levels (rolling) — owner: design-lead — est: 2 h — accept: verdict per level — needs: M3-22, M3-23, M3-40, M3-41

### Gameplay
- [M3] M3-05 · **[sim]** Event stream completeness: shift, bandChange, airDrag, jump, land, fallThrough, reset, home, won identical on replay with `body` ids; golden event list for w0-02 and a Tandem level — owner: gameplay-engineer — est: 3 h — accept: replay yields the same event list twice — needs: T-12
- [M3] M3-21 · **[scene]** Feed state and events (with body ids) to audio and fx; reduced-effects flag — owner: gameplay-engineer — est: 3 h — accept: fx and audio receive the same steps as the sim; flag removes post effects — needs: M3-05, M3-16, M3-18, T-20

### Backend and leaderboards
- [M3] M3-11 · Edge function `submit-run` v1: payload, floor-time, name checks, per-IP rate limit; RLS tests — owner: backend-engineer — est: 4 h — accept: unit tests for each rejection; service key only from function secrets — needs: M3-02, M2-18
- [M3] M3-12 · Deploy migration and function to the user's Supabase project — owner: backend-engineer — est: 2 h — accept: submit and read round trip; direct client insert denied — needs: M3-11, USER-2
- [M3] M3-13 · Wire `src/net` to the real endpoints — owner: backend-engineer — est: 2 h — accept: offline, slow and error responses never block play (tests) — needs: M3-11, M2-18
- [M3] M3-14 · Results leaderboard panel, name entry, quiet offline state, best times in level select (480×270) — owner: ui-engineer — est: 5 h — accept: works with the network off; name rules shown — needs: M3-13, M3-02, M2-12
- [M3] M3-15 · (2026-11-19: now B7-11, Should; volume sliders are Could and cut; mute is the SOUND toggle) Settings: reduced effects, music and SFX volume, mute, reduced motion — owner: ui-engineer — est: 3 h — accept: all persist; mute works before the first gesture — needs: M2-13, M3-02

### Art and audio
- [M3] M3-16 · Adaptive music engine: pitch and filter glide with band (a prototype can start once M3-02 is in) — owner: audio-designer — est: 5 h — accept: low and muffled at white, bright at red; no throw before a gesture — needs: M3-02, M2-17
- [M3] M3-17 · Wire SFX to the event stream, volumes to settings — owner: audio-designer — est: 3 h — accept: every event plays the right sound; Tandem events play once per body — needs: M3-05, M3-16, M3-15
- [M3] M3-18 · Pixel effects: dithered afterimages in earlier band colors, 1 px speed lines, dust pixels, lean, reduced-effects path (replaces the Doppler shader plan) — owner: art-director — est: 6 h — accept: 60 fps on a mid-range laptop (measured, noted); reduced mode removes everything but the flash — needs: M2-15, M3-02
- [M3] M3-20 · itch.io cover (630×500) and first screenshot set in the pixel look — owner: art-director — est: 3 h — accept: files in `assets/art/itch/`; readable at thumbnail size — needs: M3-18, M2-23

### Level design
- [M3] M3-22 · w3-01 Two Lanes and w3-02 Out of Step with recordings; paper drafts of w3-01..w3-03 (in `levels/drafts/`, not `*.txt`, so the loader ignores them) can start Nov 11 — owner: level-designer — est: 5 h — accept: replay and ±3 tests pass; lanes plus divider ≤ 15 rows, lanes ≤ 7, spread ≤ 26 tiles; each split says undone or final in `levels/README.md`; removing the new piece breaks the solution — needs: T-04, T-11
- [M3] M3-23 · w3-03 Gear Split — owner: level-designer — est: 3 h — accept: as M3-22; the block catches the runner on flight step 14 — needs: M3-22
- [M3] M3-40 · w3-04 Clamp — owner: level-designer — est: 3 h — accept: as M3-22; the runner's red bridge starts at least 3.5 tiles after the last safe pad — needs: M3-23
- [M3] M3-41 · w3-05 Redshift (finale) — owner: level-designer — est: 5 h — accept: as M3-22; only known ideas, difficulty from the order — needs: M3-40

### Review, QA, playtest
- [M3] M3-30 · Review scene and fx wiring — owner: tech-lead — est: 2 h — accept: Approve — needs: M3-05, M3-21, T-20
- [M3] M3-31 · Review backend and net with the security-reviewer agent — owner: tech-lead — est: 2 h — accept: no secrets in the repo; Approve — needs: M3-11, M3-12, M3-13
- [M3] M3-32 · Review UI, audio and fx — owner: tech-lead — est: 2 h — accept: Approve; effects are render-only — needs: M3-14, M3-15, M3-16, M3-17, M3-18, M3-20, T-06
- [M3] M3-33 · Verify M3: world 3 solvable, Tandem checks 1–18 and S1–S4, leaderboards online and offline, audio after a gesture, 60 fps, reduced effects — owner: qa-tester — est: 4 h — accept: Pass/Fail per criterion with evidence — needs: M3-30, M3-31, M3-32, T-21, M3-28
- [M3] M3-34 · Playtest worlds 1–3 as a jam voter (about 10 minutes) — owner: playtester — est: 2 h — accept: report with jam-category scores and where the player stopped — needs: M3-33
- [M3] M3-35 · Triage the playtest into decisions — owner: design-lead — est: 1.5 h — accept: each issue decided — needs: M3-34
- [M3] M3-36 · **M3 gate (Nov 25 in A, Nov 26 in B; was Nov 22)** — owner: qa-tester — est: 1 h — accept: no open blocker or major — needs: M3-33, M3-35
- [M3] M3-37 · M3 close-out and freeze plan — owner: producer — est: 1 h — accept: freeze list on the board — needs: M3-36

### Should: world 4 and the gates package (G-1..G-6)
Should, last in the order. Tandem is decided as world 3, so the gates package is no fallback; it is built only after every Must item is done.
- [M3] G-1 · Gate tiles in the contract: `w b g y r` solid in phases 7–8 unless the band at the start of the step equals the gate band, own no-embed group per band, never graced; `architecture.md` §3.1/3.2; rename in `level-format.md` — owner: tech-lead — est: 1.5 h — accept: types and docs; tests/arch green — needs: T-02
- [M3] G-2 · **[sim]** Speed gates per `features/speed-gates.md` checks 1–18 — owner: gameplay-engineer — est: 8 h — accept: 18 checks as tests; all M1 and Tandem checks unchanged — needs: G-1, T-12
- [M3] G-3 · **[level]** Parse test for a level using all five gate glyphs — owner: gameplay-engineer — est: 1 h — accept: test passes — needs: G-1
- [M3] G-4 · **[scene]** Draw gates (open or closed per the player's band) through the `src/fx` gate drawing — owner: gameplay-engineer — est: 2 h — accept: gates read as gates (screenshot) — needs: G-5, T-20
- [M3] G-5 · Gate visuals: frame with bars, band pattern in the frame, open vs closed by shape, floor-gate hatch, white gate uses the standing glyph, grayscale and color-vision checks in `docs/art/accessibility.md` — owner: art-director — est: 3 h — accept: gate and colored block distinguishable in grayscale — needs: PX-1
- [M3] G-6 · World 4 levels w4-01 Gate, w4-02 Trapdoor, w4-03 Two Gates (needs Tandem), w4-04 Ice (needs ice spec and sim, first cut), recordings; if the Tandem gate fails: w3-01..w3-05 are the gates levels — owner: level-designer — est: 3 h each — accept: as M3-22 — needs: G-2, M3-23 (w4-03), M2-02 (w4-04)
- [M3] G-7 · qa verification: `speed-gates.md` checks 1–18 — owner: qa-tester — est: 2 h — accept: Pass/Fail table — needs: G-2

---

## Todo — M4 Freeze (Nov 23–28)

Polish and bug fixes only. No new features.

- [M4] M4-01 · Final triage, content freeze, final tuning pass — owner: design-lead — est: 2 h — accept: decisions logged; no new content after this — needs: M3-37
- [M4] M4-02 · Fix level issues from playtests; re-record affected solutions — owner: level-designer — est: 4 h — accept: replay and ±3 tests pass for every level — needs: M4-01
- [M4] M4-03 · Gameplay bug fixes from `docs/qa/bugs.md` (blocker and major first) — owner: gameplay-engineer — est: 6 h — accept: each bug verified closed by qa-tester — needs: M4-01
- [M4] M4-04 · UI polish and bug fixes — owner: ui-engineer — est: 4 h — accept: as M4-03 — needs: M4-01
- [M4] M4-05 · Visual polish and performance pass in the pixel look — owner: art-director — est: 4 h — accept: 60 fps measured; reduced effects works — needs: M4-01
- [M4] M4-06 · Final itch.io assets: cover, 4–6 screenshots, 1–2 GIFs (2× pixel art, no smoothing) — owner: art-director — est: 3 h — accept: files in `assets/art/itch/`; sizes match itch requirements — needs: M3-20, M4-02
- [M4] M4-07 · Audio mix and balance pass — owner: audio-designer — est: 3 h — accept: no clipping; levels noted — needs: M4-01
- [M4] M4-08 · Production build, zip, butler script (dry run) — owner: backend-engineer — est: 2 h — accept: zip from a tagged commit runs from a subfolder — needs: M3-37
- [M4] M4-09 · Leaderboard production smoke test and secrets audit — owner: backend-engineer — est: 2 h — accept: no service key in repo, history or bundle (search shown) — needs: M3-12
- [M4] M4-10 · itch.io page copy in `docs/design/itch-page.md`: title, short description, pitch ≤ 120 words, controls incl. Q/E and Z/X and a Sticky Keys note, accessibility note, tags, **a line saying Tandem arrives in world 3** — owner: design-lead — est: 2 h — accept: matches the final build; word count shown — needs: M3-37
- [M4] M4-11 · Final review of all fixes; bundle size and performance check — owner: tech-lead — est: 2 h — accept: Approve — needs: M4-02, M4-03, M4-04, M4-05, M4-07, M4-08, M4-09
- [M4] M4-12 · Repo hygiene: README, LICENSE, CREDITS (bitmap font and any third-party asset), `.env.example`, `.gitattributes`, secret scan, `CLAUDE.md` Commands current — owner: tech-lead — est: 1.5 h — accept: checklist in the report — needs: M2-24
- [M4] M4-13 · Full regression: all recordings, e2e, build, 960×540 iframe, fullscreen integer zoom, keyboard only, alternate bindings, Sticky Keys tip once, reduced effects, blocked storage, network off, 60 fps — owner: qa-tester — est: 4 h — accept: Pass/Fail per item — needs: M4-11
- [M4] M4-14 · Full-game fresh-eyes playtest on the freeze build — owner: playtester — est: 2 h — accept: report with jam-category scores and the one change that would help most — needs: M4-11
- [M4] M4-15 · Verify the draft itch.io embed (iframe, 960×540, keyboard, focus, integer scale) — owner: qa-tester — est: 1 h — accept: evidence screenshots — needs: USER-3, M4-08
- [M4] M4-16 · **M4 gate (Nov 28)**: freeze build tagged; remind the user of USER-6 — owner: producer — est: 0.5 h — accept: M4-10, M4-12, M4-13, M4-14, M4-15 Pass — needs: M4-10, M4-12, M4-13, M4-14, M4-15

## Todo — Submit (Nov 29–30)

- [Submit] S-01 · Final zip from the tagged commit, with a checksum — owner: backend-engineer — est: 1 h — accept: unzip and serve from a subfolder and it plays — needs: M4-16
- [Submit] S-02 · Verify the repo is public, CI green, no secrets in history, tag `v1.0` — owner: tech-lead — est: 1 h — accept: repo opens in a logged-out browser — needs: M4-16, USER-6
- [Submit] S-03 · Upload the zip to itch.io, publish, link the repo — owner: USER (USER-4) — accept: page public — needs: S-01, S-02
- [Submit] S-04 · Smoke-test the live page — owner: qa-tester — est: 1 h — accept: evidence screenshots — needs: S-03
- [Submit] S-05 · Fresh-eyes check of the live page: first 30 seconds — owner: playtester — est: 1 h — accept: short report — needs: S-03
- [Submit] S-06 · Submit the entry to GitHub Game Off 2026 — owner: USER (USER-4) — accept: entry visible before Nov 30 end of day — needs: S-04
- [Submit] S-07 · Submission checklist and Dec 1 buffer plan — owner: producer — est: 0.5 h — accept: checklist ticked — needs: S-06

---

## Superseded and cut (as of 2026-11-03)

| Task | Status | Why |
|---|---|---|
| M1-03 feasibility review of specs | Superseded | The sim was built and reviewed directly. |
| M1-31, M1-32 | Merged into M1-30 | One closure of the core review. |
| M2-02 mud, ice, boost, speed-camera specs | Cut (mud, boost, camera as designed); ice kept as Should | Mechanics review v1.3. |
| M2-07, M2-38 | Removed 2026-11-02 | See that day's changes. |
| M2-15, M2-16 (Graphics-based `src/fx` and scene adoption) | Superseded by PX-1, PX-6, PX-7 and the new M2-15 | Pixel direction. |
| M3-06, M3-07 (mud, ice, boost pads, speed cameras in the sim) | Cut; ice is Should, gates are G-2 | v1.3 and v1.4. |
| M3-08, M3-09, M3-10 (conveyors, platforms, crates, afterimage) | Cut | v1.3 (collapse test). |
| M3-01 specs for worlds 4–5 | Reduced to the existing gates spec plus M2-02 ice | World 5 cut. |
| M3-24..M3-27 (old world 4–5 levels) | Replaced by G-6 | Level plan v3.0. |
| M3-18 Doppler tint shader | Reshaped into pixel effects | Direction C has no shader glow. |
| M3-19 world 3–5 tile visuals | Replaced by T-05 (Tandem) and G-5 (gates, Should) | |
| w2-04 Gate as an M2 level | Moved to world 4 | v1.4. |
| Gates as Must | Should (Must again only if the Tandem gate fails) | v1.4. |

---

## Request triage map (2026-11-03)

Statuses are marked in `requests.md`. Lines on the board: 67 → M1-21; 68 → PX-1 and M2-15; 69, 72 → M1-50; 70 → M1-28; 74 → M2-47 (walls) and G-2 (gates, Should); 75 → G-3; 76 → G-4; 77 → T-02 and G-1; 78 → M2-15 and G-5; 79, 96 → M2-19..M2-45 and M3-22..M3-41; 80, 97 → M2-29, T-21, G-7; 81 → M1-42; 85, 86 → PX-1..PX-11; 87 → PX-5; 88 → PX-9 and M2-11; 90 → T-01, T-02, PX-4; 91 → T-10..T-12; 92 → T-04; 93 → T-20; 94 → T-06; 95 → PX-2, T-05. Superseded: 73 (by 89). Done: 62, 63, 64, 65, 66, 71, 82, 83, 84, 89.

## Changes on 2026-11-03 (v1.4 and pixel re-plan)

- Board rewritten from the repo: most of M1 is built and in Review; M2-05, M2-08 (Must part), M2-09, M2-14, M2-24 and the core of M2-04 exist.
- New: PX-1..PX-11, T-01..T-06, T-10..T-15, T-20, T-21, G-1..G-7, M1-42, M1-44, M1-46, M1-48, M1-50, M1-51, M2-45, M2-47, M2-14b, M3-41.
- Superseded and cut tasks are in the table above. D-1..D-3 verdicts moved to Settled.
- Hours are agent-hours; the gameplay-engineer total for Nov 4–22 is about 75 h over four lanes (see R10).
