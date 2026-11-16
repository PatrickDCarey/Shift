# Review: batch 3 (commit cab74a1)

_Reviewer: tech-lead, 2026-11-13 (Batch 4A, line 8, after PX-4). Every file was read at the commit (`git show cab74a1:<path>`), because nine agents were editing the working tree. Three reviewer agents read the slices in parallel: two typescript-reviewers (sim, level, scene and levels; ui, save, audio and art) and one security-reviewer (backend, scripts, CI, `src/net`). I re-checked every MEDIUM finding at the commit: `submit-run/index.ts:35-42`, `musicGraph.ts:53-79`, `tandemAcceptance.test.ts` (no `home` or all-home `won` case), `hints.test.ts:38-43`, `hintPlacement.ts` `floorRowBelow`. I also re-checked the LOW items `solutionFiles.ts:10`, `schema.ts:152` and `stickyKeysTip.test.ts:25`. I dropped one agent finding: the `actions/checkout` pin `11d5960a…` is the real `v4.4.0` tag (`git ls-remote`). Per the 4A rule, the scene and ui views that the cutover rewrites were read for logic only._

Severity follows `~/.claude/rules/common/code-review.md`: **Approve** means no CRITICAL or HIGH finding. No CRITICAL or HIGH was found in any item.

## Verdicts

| Task | Area | Verdict | Findings |
|---|---|---|---|
| T-10 | [sim] Tandem part 1 (`src/core/sim/*`, `tandemAcceptance.test.ts`) | **Approve** | S1 (MEDIUM, closed by T-11), S2 (LOW) |
| — | [level] reserved and cut glyphs (`parseLevel.ts` + test) | **Approve** | none |
| M1-54, PT-1, M1-57 | [scene] BUG-4, default level, QA hook fields (`src/entities/{solutionFiles,replay,runDriver,levelSelect}.ts`, `GameScene.ts`) | **Approve** | C1, C2 (LOW) |
| M1-58 | ui and save follow-ups (`src/ui/*`, `src/save/schema.ts`) | **Approve** | U1, U2, U3 (LOW) |
| M3-16, M2-17b | adaptive music prototype, SFX check (`src/audio/*`) | **Approve** (prototype) | A1, A2 (MEDIUM); A3 (LOW) |
| M1-59 | art: edge arrow pattern, exit arrow (`src/fx/pixel/{hud,atlas}.ts`, sheets) | **Approve** | R1 (LOW) |
| SEC-1 | backend README, package checks (`scripts/package.mjs`, `scripts/lib/*`) | **Approve** | none |
| M3-11 | `submit-run` v1 (`backend/functions/submit-run/*`, `0002_submit_run.sql`) | **Approve for merge; deploy gate** | B1, B2, B3, B4 (MEDIUM, fix before M3-12); B5–B8 (LOW) |
| M1-19 | schema and RLS re-review | **Approve** (was "Changes needed" until SEC-1) | B9 (LOW) |
| M1-04 | CI hardening, repo-secret check (tech-lead's own; read independently by the security reviewer) | **Approve** | T1 (LOW) |
| M1-56 | tech-lead doc and hint-test follow-ups (own work) | **Approve after fixes** | T2, T3 (MEDIUM, **fixed in this sitting**); T4 (LOW) |
| — | w2-01, w2-02 levels and solutions | **Approve** (code side; design rulings are design-lead's, Batch 4 line 3) | none |
| — | `src/net` diffs | **Approve** | none |

## Findings

### [sim] T-10
- **S1 MEDIUM** — `src/core/sim/step.ts:42-58`, `status.ts` `outcomePhase`: the twin-only branches had no test at cab74a1. These are the `home` event, the all-home win, a twin-only death, a home body being skipped, and exit beating death. They are logic in `src/core` without unit tests (a review-checklist item). This is accepted only because the checks were split by plan: T-11 owns checks 4–15. Its `tandemAcceptance2.test.ts`, in progress now, asserts `home` per body, `home` before `won`, and both `home` events on a shared win step (lines 209–234 of the working copy). **T-10 is Done only when T-11 lands with those tests.**
- **S2 LOW** — `tandemAcceptance.test.ts` check 3: `[...bodies].sort()` uses the default string sort. It works for 0/1, but it does not assert that runner events precede twin events when the event types differ. Assert the order directly.

What holds:
- Phases 2–13 run per body, runner first. Press edges, `dirPriority` and the restart/status gate run once per step.
- Every per-body event carries `ctx.body`.
- `twin` is null for levels without `&`, and check 1 pins "no `home` event without a twin".
- There is no `Math.random`, `Date` or other clock. Check 18 deep-equals two runs.
- The acceptance tests assert real numbers: lane equivalence to 1e-12, and grace on `c+1..c+6`.

### [scene] M1-54, PT-1, M1-57
- **C1 LOW** — `src/entities/solutionFiles.ts:10` re-declares `QA_HOOK` instead of sharing the `GameScene.ts:55` constant (the M1-54 line asked for a shared one). `tests/arch/qa-hook.test.ts` only checks files that name `'__redshift'`, so the two copies can drift. `scripts/lib/checks.mjs` (the recording-header check in `npm run package`) is the backstop. Fix in Batch 5 together with a qa-hook test update (tech-lead).
- **C2 LOW** — `runDriver.ts` `buttonsOf`: the `as unknown as InputFrame` cast is safe (a test pins the six keys). A typed build from `INPUT_BUTTONS` would remove it.

What holds:
- The solution glob sits behind a build-time ternary, so it is tree-shaken. `?replay=1` is ignored without solutions, and a test covers that.
- The recorder keeps the winning frame and nothing after it.
- `startNewRun` keeps only the six buttons.
- `DEFAULT_LEVEL_ID` is `w1-01`, and the w0-02 query still works.
- The `meter` and `banner` getters sit on `if (QA_HOOK)` lines.

### ui and save, M1-58
- **U1 LOW** — `src/save/schema.ts:152`: `MAX_SAVE_BYTES` compares UTF-16 length, not bytes. It still bounds `JSON.parse`, so this is a naming issue: rename it to `MAX_SAVE_CHARS` or fix the comment.
- **U2 LOW** — `src/ui/stickyKeysTip.test.ts:25` rebuilds the expected codes with the same formula as the code, so it is tautological. Also assert the literal `['Enter', 'KeyE', 'KeyQ', 'KeyX', 'KeyZ']`.
- **U3 LOW** — `src/ui/bindings.ts:117-119`: the new comment splits the `CODE_PATTERN` JSDoc from its const.

What holds: every M1-58 line is done and tested.
- Core constants are imported.
- The needle interpolates through `gearSpeeds` and band edges, with an uneven-speed test.
- `bestSteps` has a null prototype.
- Oversized input returns defaults before `JSON.parse`.
- Lists are sliced before filtering.
- Dismiss codes come from `DEFAULT_BINDINGS`.

### audio, M3-16 and M2-17b
- **A1 MEDIUM** — `src/audio/musicGraph.ts:53-60, 68-79`: `ramp` cancels the schedule and restarts from the nominal `from` value, not the live gain. Retargeting a layer or the pause duck mid-glide therefore jumps the gain. For example, an `airDrag` 30 ms snap 50 ms into a 150 ms glide clicks. Start from the param's current value, as pitch already does, and add a mid-ramp retarget test. Fix before M3 polish.
- **A2 MEDIUM (status)** — `music` is exported but nothing calls `music.update`. The prototype is fine as built, but the board must not read M3-16 as "music in the game": the wiring is M3-21.
- **A3 LOW** — music voices bypass the engine's `MAX_VOICES`. They are bounded by the loop at about 15 voices. Note this in `engine.ts`.

What holds:
- Nothing throws before a gesture.
- No `Date`, `performance.now` or `Math.random` in `src/audio`.
- Nodes are released on `onended`, and `pruneLive` and `dispose` clean up the rest.
- The 150 ms glide and the 30 ms `airDrag` snap are tested.
- The faster non-home body drives the music.

### art, M1-59
- **R1 LOW** — the `src/fx/pixel/tandem.test.ts:174` title says "in luminance only", but the test asserts only ink-mask difference. Fix the title or add the check.

What holds:
- `bakeEdgeArrow` carries the band by pattern ink, not by colour only.
- `hud/edge/exit` exists, with contrast and distinctness tests.
- Colours come from `palette.json` only.
- The sheets and previews were rebaked in the same commit.

### backend, SEC-1, M3-11, M1-19
- **B1 MEDIUM** — `backend/functions/submit-run/index.ts:35-42`:
  - Every call inserts a `submit_attempts` row before the rate check.
  - The hourly cleanup at :42 runs only when the call is not rate-limited.
  - So a flood grows the table without bound.
  - Fix: count first and insert only under the limit, or also clean up in the limited branch.
- **B2 MEDIUM** — `index.ts:56-62`, `rules.ts:26-29`:
  - One IP can store 30 runs a minute with logs up to 16 KB.
  - There is no per-level retention cap, so the 500 MB free tier can fill.
  - Fix: cap stored rows per (ip_hash, level) per hour, or keep only each name's best per level version.
- **B3 MEDIUM** — no replay on submit in v1 (`rules.ts:107-114`):
  - `steps` is checked only against the 0.85 floor, so a forged log at the floor ranks.
  - The spec defers replay to v2 (`leaderboards.md:67`), so this is consistent with the spec.
  - **Owner and design-lead must know that the board is unverified until v2.** Replay is the reason `src/core` is pure (§6).
- **B4 MEDIUM** — `index.ts:35-41` fails open. The insert and count errors are ignored, and `count ?? 0` turns a database error into "not limited". Check `error` and reply `rate` or 503.
- **B5 LOW** — `rules.ts:32`: the blocklist is a placeholder (design-lead hands over the real list before M3-12).
- **B6 LOW** — `index.ts:34`: a missing `cf-connecting-ip` puts every such caller in one `'unknown'` bucket.
- **B7 LOW** — `index.ts:63`: a database failure answers `invalid` with 500. Nothing leaks, but the code is misleading.
- **B8 LOW** — the client sends `apikey` only for `sb_publishable_` keys, so `submit-run` needs `verify_jwt = false`. Check this at M3-12. It fails safe.
- **B9 LOW** — `backend/tests/0001_runs_rls.sql:27-28` inserts the lower-case `'rls-test'`. That fails the 0002 name check on a re-run. Upper-case it.

What holds:
- The README asks for no paste, and the function reads the injected key. There is a rotation note.
- `checkEnv` allow-lists the env keys. The output scan decodes JWTs and scans every non-binary file. `.pem`, `.key`, `.npmrc` and `.env*` are forbidden, and a recording header fails the package step.
- RLS is enabled and forced, with SELECT only. Writes are revoked, and `input_log` is excluded by column grants.
- There is no SECURITY DEFINER function and no string-built SQL.
- Each of the five rejection codes has a unit test.
- The IP is stored only as an HMAC.

### tech-lead's own items, M1-04 and M1-56
- **T1 LOW** — `tests/arch/repo-secrets.test.ts:27-30`: forbidden file names are matched case-sensitively, so `.PEM` and `.KEY` slip through. Make the match case-insensitive (Batch 5). CI itself is fine:
  - `permissions: contents: read`;
  - every action is pinned by a verified SHA;
  - `npm audit --audit-level=high` runs;
  - the package step runs;
  - a planted fake key fails the secret scan.
- **T2 MEDIUM, fixed** — `tests/levels/hints.test.ts`: the "same `wonAtStep` without hints" case passed vacuously when both sides were `null`, and an empty `hinted` list passed everything. It now asserts that at least one level is hinted and that each hinted level has a winning recording.
- **T3 MEDIUM, fixed** — `tests/levels/hintPlacement.ts` `floorRowBelow` looked only at the anchor column. A taller floor under a neighbouring box column passed. It now takes the highest floor under any box column. There is a new planted case (a pit with a higher neighbour fails) and a wide-pit pass case. The shipped levels still pass: `npx vitest run tests/levels/hints.test.ts`, 14 tests.
- **T4 LOW** — `tests/arch/render-imports.test.ts`:
  - A dynamic `import('../core')` from `src/audio`, `src/fx` or `src/net` is not caught.
  - `stripComments` can treat a glob string such as `'/levels/*.solution.txt'` as the start of a comment.
  - Neither happens in today's code. Fix in Batch 5.

### levels w2-01, w2-02
- The grids are rectangular, the exits sit over floor, and the spawns stand on floor.
- The solution step totals match the headers: 209 and 182.
- The hints sit at rows 3 and 6 and pass the tightened placement check.
