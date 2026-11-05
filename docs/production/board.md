# Redshift — Task Board

_Owner: producer. Last updated: 2026-11-05 (Thu), after batch 2 (commit 68bdce0, QA run 4 in 7a52b08) and the M1 playtest; Batch 3 defined below. Jam closes 2026-12-01 21:37 UTC; studio submits 2026-11-30._

**Status (2026-11-05):** on track, about two days ahead of the Nov 3 plan. Batch 1 and 2 are committed; `npm run check` passes (1840 tests, 84.9% coverage), e2e 64/64; M1-35 and M1-36 PASS; M1-28 playtest done (overall 3, innovation 4, theme 4). The M1 gate (M1-37) waits on five by-hand checks (M1-55) and the owner review (planned Nov 8; it can happen earlier if the owner signs off sooner). Open: BUG-4 (solutions ship in the zip; fix is M1-54, must close before any public upload), the playtest clarity fixes (PT-1..PT-7), security follow-ups (SEC-1..SEC-3). **The pixel cutover (PX-4..PX-10) still starts only after the owner's M1 review; Batch 3 contains no cutover work and needs no `m1` tag.** Everything below this line up to "Critical paths" is the Nov 3 text, kept for history.

**Status (2026-11-03, history):** on track for M1 (Nov 8), **at risk for M2 (Nov 15) and M3 (Nov 22)**. The M1 simulation is built far ahead of the old board: `src/core/{sim,motion,level}` with 1055 unit and arch tests passing, 27 e2e tests passing, HUD gear meter mounted, replay mode, `w0-02` with a recording (QA run 2, 2026-11-03; tech-lead review `docs/tech/reviews/2026-11-core-lanes.md`). What is missing for M1 is verification, one level fix and the side tracks (packaging, audio engine, Supabase schema). The risk is everything the owner added today: the pixel cutover (~43 h across five owners), Tandem (sim, scene, HUD, art, contracts) and 9 levels for M2, all on one gameplay engineer and a tech-lead who is on every critical path. Nothing is Done until tech-lead has reviewed it and qa-tester has verified it; most M1 work is therefore in Review, and one verification sweep (M1-35/36) will close it.

**Critical paths**
- **M1 (Nov 8):** M1-21 (w0-02 headroom fix, Nov 4) → M1-28 fresh playtest (Nov 6–7) → M1-29 done → M1-37 gate (Nov 8). In parallel: tech-lead review sweep (M1-30/33/34, Nov 5–6) → qa M1-35/36 (Nov 6–7). Side tracks M1-18, M1-19, M1-24 must be in Review by Nov 7 or they slip to M2 without holding the gate.
- **M2 (Nov 15):** art PX-1/2/3 (Nov 4–7) → tag `m1` (Nov 8) → pixel cutover PX-4..PX-10 (Nov 8–10, scene lane PX-6/7/8 = 11 h is the long pole) → ui PX-9 then M2-11 title and level select (Nov 10–12) → M2-12 pause/results, M2-13 controls → M2-28 e2e → M2-29 verify (Nov 13–14) → M2-30 playtest → M2-31 → M2-32 gate (Nov 15). Parallel: 9 levels (M2-19..22, M2-45, Nov 4–11) → M2-23 approvals.
- **M3 (Nov 22):** T-01 Tandem contracts (tech-lead, Nov 4–5) → T-10..T-12 Tandem sim (Nov 9–12) → **T-13/T-15 decision gate (Nov 12)** → T-20 Tandem scene (Nov 10–14, needs the cutover) → w3-01..w3-05 (Nov 13–20) → M3-33 verify → M3-34 playtest (Nov 21) → M3-36 gate (Nov 22). Leaderboards: USER-2 (Nov 14) → M3-12 → M3-13 → M3-14.

**Calendar**

| Day | Plan |
|---|---|
| Wed Nov 4 | DONE. Batch 1 (commit 9ea8970). T-01 Tandem contracts landed (stage 2 too). |
| Thu Nov 5 | **Batch 3 (pre-cutover, below).** Batch 2 is committed (68bdce0); QA run 4 PASS. PX-1..3 built (Review). |
| Fri Nov 6 | Batch 4 (pre-cutover): playtest fixes that survive the cutover (retunes after design-lead's rulings, scene cue logic that is render-free, CI grep for recordings, T-11 if T-10 lands). M1-55 hand checks by the owner or orchestrator. |
| Sat Nov 7 | Buffer day. M1-37 gate can close as soon as M1-55 is done and the owner signs off; **if the owner signs off on Nov 6 or 7, tag `m1` and start the cutover that day** (PX-1..3 are already built). |
| Sun Nov 8 | **M1 gate** latest date (M1-37), owner review, tag `m1`. Cutover starts if not already running. |
| Mon Nov 9 | Cutover continues (PX-4..PX-10). Tandem sim continues (T-11). |
| Tue Nov 10 | Cutover lands (target); PX-11 review and playtest; Tandem scene T-20 starts; menus start. |
| Thu Nov 12 | **Tandem decision gate** (checks 1–12). |
| Sat Nov 14 | M2 playtest. USER-2 (Supabase) due. |
| Sun Nov 15 | **M2 gate** (worlds 1–2 = 9 levels, pixel build, HUD, title and level select, colored-wall tests). |
| Sun Nov 22 | **M3 gate** (Tandem world 3, leaderboards, audio). |
| Sat Nov 28 | M4 freeze. Mon Nov 30: submit. |

Line format: `- [Mx] <id> · <task> — owner: <agent> — est: <hours> — accept: <criteria> — needs: <ids or none>`
Task ids: `M1-nn`..`M4-nn`, `PX-n` (pixel rendering, from the ADR), `T-nn` (Tandem), `G-n` (gates package: Should, or Must if the Tandem gate fails), `S-nn`, `USER-n`. "Reviewed" means tech-lead approved; "verified" means qa-tester passed the acceptance criteria. A task is Done only after both (`CLAUDE.md`). Tech-lead's own deliverables have no second reviewer in the pipeline: qa-tester verifies them and the code-reviewer agent reads the code.

**Lane tags.** `src/core` is split into three areas plus the scene lane, one gameplay-engineer sitting per lane at a time: **[sim]** `src/core/sim/**`, **[motion]** `src/core/motion/**`, **[level]** `src/core/level/**`, **[scene]** `GameScene.ts` and `src/entities/**`. Only the scene lane touches rendering. **`src/scenes/BootScene.ts` has no owner in the roster: tech-lead takes it (offered in PX-4); the roster row in `CLAUDE.md` needs the user or orchestrator to add it (see requests triage).**

---

## Settled decisions (owner and design-lead, 2026-11-03)

| Decision | State | Where |
|---|---|---|
| **Core twist: Tandem** (two runners, one set of controls). | Adopted, GDD v1.4, `features/tandem.md`, level plan v3.0. **Fallback:** if `tandem.md` checks 1–12 do not pass by **Nov 12**, world 3 reverts to the v1.3 gates world (speed gates become Must; package G-1..G-6 below becomes the plan). | `decisions.md` |
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

**Batch 4 — Fri Nov 6 – Sat Nov 7 (pre-cutover, needs Batch 3 in Review and design-lead's rulings)**
level-designer PT-6 (w1 retunes), [sim] T-11, tech-lead CI recording grep and T-14 prep, backend M3-11 finish or SEC-2, art-director M2-14c/T-05 remainder, ui-engineer pure models for the PT-3 "needed slot" cue, design-lead M2-23 rolling, qa run 5. Then the cutover (**Batch C**: PX-4..PX-10 after the `m1` tag and the owner's review) and Batch 5 (PX-11, T-20, M2-11/12/13, T-05, T-06, M2-15, T-12).

---

## User actions (not agent tasks)

- `USER-1` — **DONE 2026-11-02:** repo created at https://github.com/PatrickDCarey/Shift (private until release), MIT license. Making it public is `USER-6`.
- `USER-2` — by **Nov 14**: create the **Supabase project** and run `backend/migrations/*.sql` (steps in `backend/README.md`, written in M1-19). Needed by M3-12. If skipped, the game ships offline-only (cut list).
- `USER-3` — by **Nov 26**: create the **itch.io game page as a draft** (HTML, play in browser, 960×540, restricted) and upload a test zip from `npm run package` (M1-18). Needed by M4-15.
- `USER-4` — by **Nov 29**: confirm you are signed up for the **GitHub Game Off 2026** jam on itch.io; **publish** and **submit the entry** on **Nov 30** with the public repo link (S-03, S-06).
- `USER-5` — standing: review windows. design-lead has the final say on feel; the user only reads the gate summaries (Nov 8, 15, 22, 28, about 30 minutes each). The Nov 12 Tandem decision-gate result is sent as a short note.
- `USER-6` — **Nov 30 morning, before S-02:** make the GitHub repo public after the secrets audit (M4-09). Reminder at the M4 gate.
- `USER-8` — by **Nov 22**: install `gitleaks` (or allow `trufflehog`) so tech-lead can run the full-history secret scan (SEC-3). Until then the scan cannot run.
- `USER-9` — by the **M1 review (Nov 8 or earlier)**: do or witness the M1-55 hand checks (keyboard-only w0-02 with Q/E and Z/X, SFX listen, greyscale meter, 60 fps from F3, a non-Chromium browser), then say "M1 signed off" so the cutover can start. The Nov 8 date is a plan, not a constraint.
- `USER-7` — before **Nov 8**: add `src/scenes/BootScene.ts` to the tech-lead row of the `CLAUDE.md` roster (only the user or orchestrator may edit it). Until then tech-lead edits it under PX-4 by agreement.

---

## Doing

Batch 3 (above) starts now. Its lines are in "Todo — Batch 3 and playtest fixes" further down.

## Review

Built in the repo and waiting on tech-lead review, a QA verification, or a closing fix. Nothing here is Done yet.

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
- [M3] T-15 · **Decision gate, decide (Nov 12):** checks 1–12 pass → world 3 stays Tandem, G-1..G-6 stay Should. Checks 1–12 do not pass → world 3 reverts to the gates plan (level plan v3.0 fallback), G-1..G-6 become Must, T-20 and T-05, T-06, T-21, M3-22, M3-23, M3-40, M3-41 are replaced by G-6 levels. The user gets a short note either way — owner: producer — est: 0.5 h — accept: decision and date written on this board and in `decisions.md` request to design-lead — needs: T-13
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
- [M2] M2-32 · **M2 gate (Nov 15):** suite, build, worlds 1–2 verified after the decisions — owner: qa-tester — est: 1.5 h — accept: no open blocker or major — needs: M2-29, M2-31
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
- [M3] M3-15 · Settings: reduced effects, music and SFX volume, mute, reduced motion — owner: ui-engineer — est: 3 h — accept: all persist; mute works before the first gesture — needs: M2-13, M3-02

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
- [M3] M3-36 · **M3 gate (Nov 22)** — owner: qa-tester — est: 1 h — accept: no open blocker or major — needs: M3-33, M3-35
- [M3] M3-37 · M3 close-out and freeze plan — owner: producer — est: 1 h — accept: freeze list on the board — needs: M3-36

### Should: world 4 and the gates package (G-1..G-6)
Built only if Tandem world 3 is on track. **If the Nov 12 decision gate fails, every G task becomes Must and replaces T-20, T-05, T-06, T-21 and the world 3 Tandem levels** (fallback table in `level-plan.md`). Schedule if Should: start Nov 14 earliest; decide Nov 16 whether to continue (cut list).
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
