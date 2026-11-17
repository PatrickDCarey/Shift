# Review: batch 5 (commit aa4c1ed)

_Reviewer: tech-lead, 2026-11-16 (Batch 6, B6-04). Wave 1 agents are editing `src/ui`, `src/net`, `backend`, `src/audio` in the working tree, so every file in those areas was read at the commit (`git show aa4c1ed:<path>`); `src/scenes`, `src/entities` and `src/core/sim` are unchanged since the commit. The backend and `src/net` part was also read by a security-reviewer agent (it read the working tree, see the note under B-4). The browser look is the playtester's (B6-44); nothing here was run in a browser._

Severity follows `~/.claude/rules/common/code-review.md`: **Approve** means no CRITICAL or HIGH finding.

## Verdicts

| Area | Files | Verdict | Findings |
|---|---|---|---|
| T-20 Tandem scene | `src/entities/{tandemView,EdgeArrowView,TipLife,stickyTipBudget,LevelView,devLevel}.ts`, `src/scenes/GameScene.ts` | **Changes needed** | G1 (HIGH, known), G2, G3, G4 (MEDIUM), G5, G6 (LOW) |
| `fallThrough` event | `src/core/sim/{move,status}.ts`, `fallThrough.test.ts`, `contracts/state.ts` `FallThroughCell` | **Approve** | F1 (LOW) |
| Menus | `src/scenes/{TitleScene,LevelSelectScene}.ts`, `src/ui/{menuDraw,menuNav,heldKeys,MenuView}.ts` | **Changes needed** | U1 (HIGH), U2, U3 (LOW) |
| Audio | `src/audio/musicFeed.ts`, `musicGraph.ts` (ramp retarget), tests | **Approve** | A1 (LOW) |
| Backend, net | `backend/**`, `src/net/**` | **Changes needed** | B-1 (HIGH), B-2..B-5 (MEDIUM), B-6..B-11 (LOW) |

**Count:** CRITICAL 0, HIGH 3 (G1, U1, B-1), MEDIUM 7 (G2, G3, G4, B-2, B-3, B-4, B-5), LOW 12 (G5, G6, F1, U2, U3, A1, B-6..B-11).

Checked and fine: determinism (no `Math.random`, `Date` or Phaser in `src/core`; `fallThrough` is never read back by the sim); `fallThrough` cells come from the footprint *after* the X move (`move.ts:42`, `p = w.player` after phase 7), so a walk-off from the end of a matching coloured ledge lists no cells and emits nothing: every listed cell is one that failed to hold the body. `outcomePhase` drops `fallThrough` on a won step (`status.ts:74-76`). The Tandem pure maths (S1–S4, lane test, tip budget) are unit-tested in `tandemView.test.ts`. The QA hook stays behind the build-time flag (`GameScene.ts:416,433`). Menus are pure models plus thin Phaser plumbing, focus by shape (frame and caret), whole pixels. RLS, the service-role key and SQL injection are fine (security-reviewer).

## T-20 Tandem scene

- **G1 HIGH (known) — hints are never drawn.** No code in `src/entities` or `src/scenes` reads `level.meta.hints`, so the `hint:` lines of w1-01, w1-02 and w2-01 do not reach the player. These are the teaching hints for the first three levels.
  - Fix: B6-31 (scene, wave 2) draws them from `level.meta.hints` and adds a unit test for the pure placement.
- **G2 MEDIUM — size limits.** `GameScene.ts` is 435 lines (limit about 400), and `update()` (`GameScene.ts:174-226`) is 53 lines.
  - Fix: B6-26 splits the file. Move the per-body tint and snap block (`:181-202`) and the HUD block (`:215-225`) into helpers so `update()` is under 50 lines.
- **G3 MEDIUM — magic numbers that belong in tuning.**
  - `MAX_APART_TILES = 28` is at `tandemView.ts:13`, and the placeholder run stride is in `playerFrame.ts`.
  - Fix: B6-28 reads `cameraMaxApartTiles`, `runFramesPerTile` and `sprintFramesPerTile` (contract since B6-01, values in `tuning.json`). The run frame must follow the ADR (B6-03): `k = floor(x × fpt)`, frame `k mod 6`, left-facing `(6 - k mod 6) mod 6`, per body.
- **G4 MEDIUM — the Tandem camera and edge arrow only handle horizontal distance.**
  - `cameraFocus` (`camera.ts:63`) compares `px` only. `edgeArrowPlacement` (`tandemView.ts:46-47`) returns null whenever the body's x is on screen, even if the body is above or below the view.
  - `tandem.md:83` keeps both lanes plus the divider within 15 rows, so the camera never needs to scroll vertically. Nothing enforces that rule: a taller Tandem level would lose a body off the top or bottom with no arrow.
  - Fix: tech-lead adds a level check in `tests/levels` (wave 2): a level with a twin has `|start.row - twinStart.row|` plus the body height within 15 rows. The scene adds a `y` test to `edgeArrowPlacement` (an off-screen-above/below case, with a unit test) or documents that the level check is the guard.
- **G5 LOW — layout literals that already exist elsewhere.** `TANDEM_STRIPS.twin.y = MARGIN + 14 + 2` and `ARROW_TOP = 40` (`tandemView.ts:17,23`) repeat the compact strip height.
  - Fix: derive both from `COMPACT_STRIP_LAYOUT` (`src/ui`), so a strip change cannot overlap the arrow.
- **G6 LOW — `twinLaneTest` uses an unnamed shared-room threshold.** It is `Math.abs(a - b) < 3` at `tandemView.ts:69`.
  - Fix: name the constant and cite design-lead's B6-06 ruling (shared-room colouring) in its comment once it lands.

## `fallThrough`

- **F1 LOW — misleading comment.** `supportCells`' comment (`move.ts:46-48`) says the cells are "under the feet at the start of the step". The row is the start row, but `x` is after the phase 7 move, and that is what makes the event correct.
  - Fix: say "support row at the start of the step, footprint after the X move". `architecture.md` §3.2 already has that wording (tech-lead, B6-04).

## Menus

- **U1 HIGH — the menus do not capture the arrow keys, WASD or Escape, so in the itch.io iframe they can scroll the host page.**
  - `MenuKeys` passes `KeyboardEvent.code` strings to Phaser's `keyboard.addCapture([...MENU_CAPTURE_CODES])` (`MenuView.ts:71` at aa4c1ed; `menuInput.ts:69`).
  - Phaser maps strings through `KeyCodes[name.trim().toUpperCase()]` (`KeyboardManager.js:324-327`). `Space`, `Enter` and `Backspace` resolve, but `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD` and `Escape` become `undefined`, and their default action is never prevented.
  - The game scene is not affected: it calls `preventDefault` itself (`keyboardInput.ts:31,38`). The e2e page is not scrollable, so no test catches this.
  - Also, `removeCapture` in `dispose` (`MenuView.ts:91`) is global in Phaser. When Pause or Results is launched over a running Game scene, closing the menu removes captures every scene shares.
  - Fix:
    - In the `keydown` listener, call `e.preventDefault()` when `MENU_CAPTURE_CODES.includes(e.code)`, the same way as `keyboardInput.ts`, and drop `addCapture` and `removeCapture`.
    - Add a unit test that every code in `MENU_CAPTURE_CODES` is prevented.
    - Add an e2e check in a scrollable host page (qa-tester, B6-42) that ArrowDown on the title leaves `scrollY` unchanged.
- **U2 LOW — hard-coded fallback level.** `LevelSelectScene.ts:15` hard-codes `FALLBACK_ID = 'w1-01'`.
  - Fix: use the first id of `levelOrder(...)`, so a renamed or reordered world 1 cannot leave the focus on nothing.
- **U3 LOW — the menus can jump to scenes that are not registered yet.** Title and Level select call `scene.start(SCENE_KEYS.controls / .game, ...)`, but `main.ts` does not register the menus or Controls yet.
  - Fix: B6-17 (Controls) and B6-24 (tech-lead registers `MENU_SCENES`). The B6-24 arch test checks that every `SceneTarget` in `menuNav.ts` is a registered key.

## Audio

- **A1 LOW — retarget memory can go stale.** `segments` (`musicGraph.ts:62`) remembers the last ramp per param at module level. A param written outside `ramp` (today only the build-time `setValueAtTime` at `:40,46`, before any ramp) would make the next retarget start from a stale value.
  - Fix: keep every later write going through `ramp`, and say so in the comment. No code change is needed now.
- `musicFeed` is pure and tested. It is not wired yet: that is B6-30 (scene).

## Backend and `src/net` (security-reviewer + tech-lead)

- **B-1 HIGH — leaderboard times are not verified; the server trusts the client's `steps`.**
  - `checkSubmission` (`rules.ts:117-121`) only checks that the log's summed counts reach `steps` and that `steps` is at or above the 85% floor. It never replays the log.
  - `POST {steps: <floor>, inputLog: "36000R", ...}` therefore takes rank 1 on any level (row `verified = false`).
  - `leaderboards.md:67,106` defers server replay to v2, so this is a known gap. It still means anyone can forge a top time on a public board that ships on Nov 30.
  - Fix (backend, decision by producer and design-lead, Batch 7):
    - Replay `input_log` in the function with the shared core (`createSim` and `step` over the decoded log, capped at `MAX_RUN_STEPS` = 36 000 steps, a few ms of work). Store `verified = true` only when it wins at `steps`, and reject otherwise.
    - The cheap stop-gap is for the public board query to filter `verified = true` or show the flag.
    - Architecture §6 already states the sim bundles for Deno.
- **B-2 MEDIUM — one shared rate-limit bucket for requests without an IP.** `hashIp(req.headers.get('cf-connecting-ip') ?? 'unknown', ...)` (`index.ts:35`) puts every such request in one bucket. 30 requests per minute from anyone then lock out every client that lacks the header.
  - Fix: fall back to the first hop of `x-forwarded-for` or `x-real-ip`. With none, reject with `400 invalid` instead of using a shared bucket.
- **B-3 MEDIUM — the rate limit is check-then-insert.** The prune, two counts and then the insert are separate round trips (`index.ts:37-45`), so a parallel burst passes the limit. The table-wide prune also runs on every call.
  - Fix: one SQL function (RPC) that counts and inserts under the limit in one statement. Prune with `pg_cron`, or on about 1 call in N.
- **B-4 MEDIUM — N1, N2 and N4 were still open at aa4c1ed.**
  - N1: the client reads `res.text()` and then checks the length (`client.ts:113-114`).
  - N2: `parseEntry` has its own name rules (`validate.ts:37-38`), not `isDisplayName`.
  - N4: the function calls `req.text()` before any size check (`index.ts:47-48`).
  - B6-11 fixes them in this wave. The security-reviewer read the working tree and found all three closed (`client.ts` byte-counting reader, `validate.ts` using `isDisplayName`, `index.ts` Content-Length check and capped body). That is unverified and uncommitted until B6-25 reviews it.
- **B-5 MEDIUM — best-per-name is select, insert, delete with no transaction or unique key** (`index.ts:60-72`). Concurrent submits can leave two rows for one name, and a failed delete at `:72` is ignored.
  - Fix: add a unique index on `(level_id, level_version, display_name)` and do one `insert ... on conflict do update set ... where runs.steps > excluded.steps` in an RPC.
- **B-6 LOW — server faults are reported as bad submissions.** A database error returns HTTP 500 with `code: 'invalid'` (`index.ts:29,62,71`), so the client reads it as a bad submission.
  - Fix: add a `server` code (or 503 `rate`, as the rate path does).
- **B-7 LOW — `mine()` filters `display_name` without an index.** The only `runs` index is `runs_leaderboard_idx` (`0001_runs.sql:66`).
  - Fix: add an index on `(level_id, level_version, display_name, steps)`, or let the unique index from B-5 cover it.
- **B-8 LOW — the client accepts more steps than the server allows.** `validate.ts:10` accepts `steps` up to 1 000 000; the server and `runs_steps_range` cap at 36 000 (`0002_submit_run.sql:20`).
  - Fix: import or mirror 36 000 (the comment there is stale).
- **B-9 LOW — the response cap is loose.** `MAX_BODY_CHARS = 256 KB` (`client.ts:20`) is large for a board of about 15 KB.
  - Fix: 64 KB.
- **B-10 LOW — storage has no global bound.** Stored runs are capped per IP per hour (`rules.ts:36`) but not across IPs or names; each row can carry 16 KB.
  - Fix: accept for the jam, or add a per-level row cap.
- **B-11 LOW — the blocklist normaliser only maps `0 1 3 4 5 7`** (`rules.ts:60-65`), so creative spellings pass.
  - Fix: accept, since a blocklist is best effort. Keep a way to delete a row by hand (README).

## Follow-ups filed (`docs/production/requests.md`)

One line per owner: gameplay-engineer [scene] (G1–G6), gameplay-engineer [sim] (F1), ui-engineer (U1–U3), audio-designer (A1), backend-engineer (B-1..B-11), producer (B-1 decision, G4 and U1 scheduling). Tech-lead's own items: the G4 level check in `tests/levels`, the U3 arch test in B6-24, and the F1 wording in `architecture.md` §3.2.
