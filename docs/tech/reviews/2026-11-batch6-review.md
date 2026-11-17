# Review: batch 6 wave 1 (uncommitted working tree, B6-25)

_Reviewer: tech-lead, 2026-11-17 (Batch 6 wave 2). Read with `git diff` against `3fdb614` plus the new files. Wave 2 sittings were editing at the same time: `src/scenes/GameScene.ts` and `src/entities/**` (scene lane), `levels/w2-03*` and new `levels/w3-*` (level-designer), and `backend/**`/`src/net/**` (backend). Those scene and level edits are wave 2 and are **not** reviewed here (B6-40 does that). The backend tree already holds work past B6-11..B6-13 (migration `0004_atomic_submit.sql`, `clientIp`, `record_run`); it is reviewed as found, marked "in flight". Nothing here was run in a browser; the menus, pause, results and controls look and feel are QA's (B6-42) and the playtester's (B6-44)._

Severity follows `~/.claude/rules/common/code-review.md`: **Approve** means no CRITICAL or HIGH finding.

## Verdicts

| Area | Files | Verdict | Findings |
|---|---|---|---|
| Tuning keys (B6-01, B6-05) | `src/core/contracts/tuning.ts`, `src/data/tuning.json`, `tests/arch/tuning-schema.test.ts` | **Approve** | none |
| Sim tests (B6-08) | `src/core/sim/tandemAcceptance2.test.ts` | **Approve** | test-only |
| Audio (B6-09, B6-10) | `src/audio/{engine,sfxEvents,sfxSpec,index}.ts` + tests | **Approve** | none (A4, A6, B9 tail closed) |
| fx "why you fell" (B6-14) | `src/fx/pixel/{effects,atlas}.ts`, `src/fx/effectsPolicy.ts`, sheets | **Approve** | X1 (LOW) |
| Menus: Pause, Results, Controls, flow (B6-15..B6-21) | `src/scenes/{PauseScene,ResultsScene,ControlsScene,menuScenes,runJump}.ts`, `src/ui/{menuFlow,panelDraw,MenuView,menuInput,heldKeys,resultsModel,StickyKeysTipView,GearMeterView,gearMeterLayout,menuNav}.ts`, `LevelSelectScene.ts` | **Approve** | M1 (MEDIUM), M2, M3 (LOW) |
| Backend, net (B6-11..B6-13 + in-flight B-2/B-3/B-5/B-6) | `backend/functions/submit-run/{index,rules}.ts`, `backend/migrations/0004_atomic_submit.sql`, `src/net/{client,validate}.ts` | **Approve with B-1 still open** | N1, N2, N4 closed; K1 (MEDIUM), K2, K3 (LOW); B-1 HIGH from batch 5 unchanged |
| w2-04 Two Colors (B6-22) | `levels/w2-04*.txt`, README | **Approve** | replay, ±3, hints, level rules green; 13-step window is design-lead's ruling |
| Arch rule for net (this review, item 1) | `tests/arch/render-imports.test.ts`, `architecture.md` §3, §8 | **Approve** | ruling below |

**Count:** CRITICAL 0, HIGH 0 new (B-1 from batch 5 stays open and is not a wave 1 item), MEDIUM 2 (M1, K1), LOW 3 (M2 = X1, K2, K3; M3 only points at K3).

Checked and fine: no `Math.random`, `Date` or Phaser in `src/core` (the only new `Math.random` is the server's prune chance in `submit-run/index.ts`, outside the sim); fx imports core with `import type` only; no secrets; no file over ~400 lines (largest touched: `engine.ts` 334, `GearMeterView.ts` 252); no function over ~50 lines in the new scenes or `menuFlow.ts`; the U1 fix is real: Phaser's `KeyboardManager` dispatches to scene plugins synchronously inside the DOM handler (`MANAGER_PROCESS`, `KeyboardManager.js:194-196`), so `preventDefault` in the `MenuKeys` listener runs in time, and dropping `addCapture`/`removeCapture` removes the global-capture side effect. U2 closed (`LevelSelectScene.ts:48`, first id of the order). U3 closed by B6-24 (`main.ts` registers `MENU_SCENES`; `tests/arch/scene-registration.test.ts`).

## Item 1 ruling: `src/net` and `isDisplayName`

`npm run check` failed one test: `render-imports.test.ts` flagged `src/net/validate.ts:4` (`import { isDisplayName } from '../core/types'`), which my own batch 4A finding N2 asked for. **Ruling: `src/net` may value-import the leaderboard contract's own values, and nothing else from core.** Exactly: the `export const` / `export function` names of `src/core/contracts/leaderboard.ts` (today `DISPLAY_NAME_PATTERN`, `DISPLAY_NAME_MIN_LENGTH`, `DISPLAY_NAME_MAX_LENGTH`, `isDisplayName`), only through `src/core/types` (the CLAUDE.md import rule), only in a braced named import (no namespace, default, side-effect import or re-export). Reason: one source of truth for the name rule; a copy in `src/net` would be a fourth copy to drift (SQL, function, client, core). Audio and fx stay type-only. Sim code stays unreachable: the test also asserts that `leaderboard.ts` imports nothing and that `types.ts` and every `contracts/*.ts` import only inside `contracts/`. Self-checks cover an allowed import with `type` and `as` members, and refuse a non-contract name, `../core`, a direct `contracts/leaderboard` path, a namespace import, a re-export, and the same import from `src/fx`. No backend change is needed. `architecture.md` §3 (fall-through point 2) and §8 say so.

## Menus

- **M1 MEDIUM — the game scene's keyboard keeps reading keys under Pause and Results, and nothing tests that it ignores them.** The launch contract keeps `GameScene` running with its window listeners attached (`keyboardInput.ts:65-66`), so Esc, P, R and Enter reach both the overlay (`MenuKeys`) and the game's sampler. The contract says the game must ignore them; that is B6-29 (scene, wave 2), not yet written. Two hazards: (a) Esc in Pause resumes from Pause **and** toggles pause in the game on the same press if the scene forgets the mask, and (b) the game's handler calls `preventDefault` on bound codes (`keyboardInput.ts:31,38`), and Phaser's `KeyboardManager` drops any event that is already `defaultPrevented` (`KeyboardManager.js:187`). Today Phaser's window listener is registered at boot, before `attachKeyboard`, so it runs first and the overlays do see the keys; that order is an accident, not a contract.
  - Fix (scene, B6-29): while `scene.isActive('Pause')` or `'Results'`, the game ignores Esc, P, R, Enter, Space (feed nothing to `PauseState`/restart), with a pure test of that gate. Keep `attachKeyboard` after boot; say in its comment that it must stay registered after Phaser's listener. QA (B6-42): one e2e that opens Pause with Esc and closes it with Esc, asserting `paused` false and Pause inactive after exactly one press each.
- **M2 LOW — "why you fell" duration has two sources.** `WHY_FELL_MS = 750` (`effectsPolicy.ts:91`) and the ui ring's `CUE_FRAMES` (45 frames, `neededColourCue.ts:16`) say the same thing in two places.
  - Fix: art-director derives `WHY_FELL_MS` from `CUE_FRAMES` (or both read one number from `palette.json`'s effect timings); a unit test pins them equal. (Listed under fx as X1 too: same item.)
- **M3 LOW — a results rank of a slower repeat.** Not ui: see K3.
- Noted, no change: `StickyKeysTip` keeps "won this visit" in a module `WeakSet` keyed by scene (`StickyKeysTipView.ts:44`), cleared on `SHUTDOWN`; correct because Phaser reuses the scene object across restarts. `GearMeterView.drawPanel` fills the panel twice (halo then body) at alpha 1, harmless.

## fx

- **X1 LOW** = M2 above (the 750 ms / 45 frame pair).

## Backend and `src/net`

**Batch 4A N1, N2, N4: closed** (B-4 in the batch 5 review).
- N1: `client.ts:97-115` `readCappedText` counts bytes from the stream and `cancel()`s past 64 KB; declared `Content-Length` checked first (`:147`). Tests cover no and lying `Content-Length` (`client.test.ts`). B-9 (64 KB) also closed.
- N2: `validate.ts:4,34` `parseEntry` uses `isDisplayName` from `src/core/types` (allowed by the item 1 ruling). B-8 also closed (`MAX_STEPS` 36 000, `validate.ts:11`).
- N4: `submit-run/index.ts:85-87` rejects a declared length over the cap before reading, then `readCappedBody` (`:38-55`) caps what is actually read.
- B6-12 blocklist and B6-13 `LEVELS` rows (w2-04 192, w3-01 195) present (`rules.ts:24-25,46-53`).

In flight (seen in the tree, past wave 1; B6-40 re-reads them when they land):
- **K1 MEDIUM — the IP for the rate limit can come from a client-set header.** `clientIp` (`rules.ts:174-185`) falls back to `x-real-ip` and then the **first** hop of `x-forwarded-for`. The first hop is whatever the client sent; a proxy appends the real address at the end. Behind a gateway that passes a client `x-forwarded-for` through, a script rotates that header per request and gets a fresh bucket each time, which defeats B-2/B-3 and, with names unlimited, also the storage bound (B-10). `cf-connecting-ip` is only trustworthy when Cloudflare is really in front.
  - Fix: on the deployed Supabase function (USER-2), log which of the three headers the platform sets and trust only that one (or the **last** hop of `x-forwarded-for` if the platform appends), and document it in `backend/README.md`. Until checked, prefer the last hop over the first. A unit test with a spoofed first hop.
- **K2 LOW — no-IP requests answer 400 `invalid`.** Correct fail-closed, but the client reads `invalid` as a bad submission. Use `rate` (503) like the other server-side refusals, or a `server` code (B-6).
- **K3 LOW — rank of a slower repeat.** `record_run` (`0004_atomic_submit.sql:84-90`) returns the rank of the submitted time, not of the stored best, when it did not store. Fine if the results panel says "this run would place N"; otherwise return the rank of the stored row too. Decide with ui (results.md) before M3-14 wiring.
- Fine: both functions `security definer` with a pinned `search_path` and execute revoked from `anon`/`authenticated`; per-hash advisory lock makes count-and-insert atomic; the upsert keeps the lower time and ties keep the older run; duplicates collapsed before the unique index. **B-1 HIGH (batch 5) is still open**: `p_verified` is always false and `PUBLIC_BOARD_VERIFIED_ONLY = false` (`client.ts:29`) is the stop-gap switch, off by default. That needs the producer/design decision already filed; no new request.

## w2-04

Replays, ±3 robustness, hint checks and the new level rules (`tests/levels/levelRules.test.ts`) are green on w2-04 and on every shipped level, w3-01 included (no known failures). The 13-step jump window under the world-2 floor of 18 is design-lead's open ruling (level-designer request 2026-11-16); not a tech finding.

## Wave 2 items by tech-lead in this sitting (for B6-40 to note)

- B6-24: `src/main.ts` registers `[BootScene, GameScene, ...MENU_SCENES]`; `BootScene.create` starts `bootTarget(location.search)` (`src/scenes/keys.ts`): the title on a plain load, the game on `?level=<id>` or `?replay=1`. Arch test `tests/arch/scene-registration.test.ts`.
- G4 and design-lead's 2026-11-16 level rules: `tests/levels/levelRules.ts` + `levelRules.test.ts`.
- Known e2e fallout for QA (B6-42): `tests/e2e/smoke.spec.ts` and `m2-additions.spec.ts` "plain URL `/` opens on w1-01" load `./` and wait for the game's QA hook; a plain load now shows the title, so both need `?level=w1-01` or a title assertion. Every other spec uses `?level=` and is unaffected.

## Follow-ups filed (`docs/production/requests.md`)

gameplay-engineer [scene] (M1), qa-tester (M1 e2e, plain-URL specs), art-director (M2/X1), backend-engineer (K1-K3).

---

# Review: batch 6 waves 2 and 3 (uncommitted working tree, B6-40)

_Reviewer: tech-lead, 2026-11-17 (Batch 6 wave 3). Read the code (`git diff` against `3fdb614` plus untracked files), not the reports. Ran only `npx vitest run` on `tests/levels/levelRules.test.ts` (30/30), `tests/arch/qa-hook.test.ts` (9/9) and `src/entities/overlayGate.test.ts` (7/7). The orchestrator's headless playthroughs are taken as given. Nobody has seen reduced motion, reduced effects, the exit arrow on the left/top/bottom edges, or audio. Backend also went through the security-reviewer agent; its points are folded in below._

## Verdicts

| Area | Verdict | Findings |
|---|---|---|
| Scene lane (`GameScene.ts`, `src/entities/**`) | **Approve** | S1 (MEDIUM), S2, S3, S4 (LOW) |
| ui wave 2 (`menuInput`, `MenuView`, `heldKeys`, `gearMeterLayout`, `resultsModel`, `panelDraw`, `StickyKeysTipView`, `LevelSelectScene`) | **Approve** | none; U1 closed |
| Backend wave 2 (`0004` + checks, `submit-run/{index,rules}.ts`, `src/net/{client,validate}.ts`, README) | **Approve to merge and to deploy to the test project; not to open submissions** | K1, K4 (MEDIUM); K2, K3, K5, K6 (LOW); B-1 HIGH (batch 5) still open |
| Levels (rules test only; content not reviewed) | n/a | `levelRules.test.ts` globs all 14 `levels/*.txt` present: w0-02, w1-01..05, w2-01..04, w3-01..04. All 30 cases pass; `KNOWN_FAILURES` is empty. w3-05 is not in the tree yet, and the level-designer is still editing, so this is a snapshot. |

**Count:** CRITICAL 0. HIGH 0 new (B-1 from batch 5 stays open). MEDIUM 3 (S1, K1, K4). LOW 7 (S2, S3, S4, K2, K3, K5, K6).

## Scene lane

Checked and fine:
- **QA hook unreachable in release.**
  - There is one flag, `QA_HOOK` (`qaHook.ts:9`, `DEV || VITE_QA_HOOK === '1'`), inlined by Vite.
  - Both inner guards are intact (`debugHook.ts:54,58`), and so are the two call sites (`GameScene.ts:162,364`).
  - The arch test passes.
  - `?debug` in a release build (`GameScene.ts:101`) only shows the read-only debug text, not the hook. This is not new.
- **Imports.** Nothing in `src/entities` or `src/scenes` reaches into `src/core` past `index.ts`/`types.ts`. `runControl.ts` imports `'../core'`, which is the index.
- **Launch contract** (requests.md, ui section) is followed:
  - Pause launches with `pauseLaunchData(id, title, step, stepHz)` (`GameScene.ts:194`).
  - `PAUSE_RESULT_EVENT` is registered with `on` in `create` and removed with `off` in teardown (`:163,346`).
  - A restart from Pause goes through `RunControl.restart`, the same path as R.
  - Results launches once per win, after `recordWin`, and never in replay (`:211-226`).
  - `hideOnWin` is called on the win.
  - The sampler is paused under both overlays.
- **M1 (Esc/P/R/Enter/Space) is closed by `overlayGate`, whatever the listener order.**
  - While an overlay is open, those codes are blocked.
  - The overlay closes inside its own handler for the same keydown. So at `closed()`, `performance.now()` is at or after `event.timeStamp`, and that keydown is still blocked if the game's listener runs second (`overlayGate.ts:40-43`, test `:27`).
  - Blocked codes are neither acted on nor prevented.
  - The remaining gap is S1.
- **Flash safety.**
  - The drag wipe and the death flash both go through `takeFlash`, which calls `requestFlash`.
  - They share one history and one 3-per-second cap (`FeedbackFx.ts`, `airDrag`/`died`/`takeFlash`). An in-sim restart keeps the instance, so the history carries over.
  - The why-fell ring and the 1.68 s exit pulse are not flashes.
- **Reduced motion** (`effectsPolicy.ts:47-62`) drops the wipe, ring burst, death flash, ridge parallax and exit pulse. `LevelView`, `PlayerView`, `FallCue`, `TipLife` and both meters receive the flag.
- **Reduced effects** drops the horizon, stars, afterimages, speed lines and dust.
- Neither reduced path has been seen in a browser yet (QA).
- **Size.** `GameScene.ts` is 366 lines, and its longest function, `create()`, is about 38. All new entities files are under 160 lines.
- **Tests.** There are pure tests for `overlayGate`, `exitCue`, `hintLayout`, `whyFell` and `backdropView`.

Findings:
- **S1 MEDIUM: M1 is closed only for keydown of the six overlay codes. The game still calls `preventDefault` on the other bound keys while an overlay is open.**
  - Under Pause, Results or Controls, `handleKeyDown` still prevents the game-bound menu-move keys: `ArrowUp`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyD`. The test at `overlayGate.test.ts:57` asserts this behaviour.
  - `handleKeyUp` prevents every bound keyup, including Esc, P, R and Space (`keyboardInput.ts:41-45`).
  - Phaser's `KeyboardManager` drops keydown and keyup events that are already `defaultPrevented` (`node_modules/phaser/src/input/keyboard/KeyboardManager.js:188,208`).
  - If the game's window listener ever ran before Phaser's, the overlays would lose up/left/right navigation, and `HeldKeys` would never see those keyups, so keys would stay "down" in the menu.
  - It works today only because Phaser registers its listener at boot. That is the same accident M1 was about.
  - Fix (scene):
    - While `gate.isOpen`, or for an event stamped at or before `closedAtMs`, the game calls `preventDefault` on nothing, keydown or keyup.
    - `MenuKeys` already prevents its own codes, so the iframe still does not scroll.
    - Keep feeding keyups, and move/gear keydowns, to the sampler; it masks keys pressed while paused.
    - Make the decision a pure function with a test, and flip the assertion at `overlayGate.test.ts:57`.
- **S2 LOW: `runControl.ts` has no unit test**, although it is Phaser-free logic: the queued pause-menu restart and the replay rewind on R.
  - Add `runControl.test.ts` with two cases.
  - A restart while paused yields exactly one `restart: true` frame.
  - A restart during replay rewinds the feed and starts a fresh driver.
- **S3 LOW: magic depth.** `cameraRig.ts:40` passes a literal depth: `new EdgeArrowView(scene, 204)`. Name it beside the other depths.
- **S4 LOW, and ruling on the parallax factors** (`BackdropView.ts:20`, far 0.15 and near 0.3).
  - They are render-only visual constants, not gameplay numbers, so they do not go in `tuning.json`.
  - They are not colours or patterns either, so `palette.json` is not required.
  - They do describe the scenery the art-director owns, and that scenery's ridge geometry already lives in `RIDGES` (`src/fx/pixel`).
  - Ruling: named constants in the view are fine for now. At the next art sitting, the art-director moves them into `RIDGES` as a per-layer `parallax`. Not blocking.

## ui wave 2

**Approve. U1 is closed.**
- `MenuKeys` prevents its own codes in its own keydown handler, via `shouldPreventDefault` (`MenuView.ts`, `menuInput.ts`).
  - It skips modifier combos and non-menu keys.
  - No `addCapture` or `removeCapture` is left.
- `HeldKeys.takePressed` latches a keydown and keyup that land in the same frame.
- The `StickyKeysTip` `WeakSet` is right:
  - It is keyed by the scene object, which Phaser reuses.
  - A tip rebuilt after a win stays hidden.
  - The first tip's `SHUTDOWN` handler clears the entry.
- The gear meter halo and alpha 1 are layout values in `GEAR_METER_LAYOUT`.
- The Results key lines differ by wording and size, not only colour.
- `panelDraw` is covered via `menuModels.test.ts` and `menuFlow.test.ts`.
- `LevelSelectScene` falls back to the first level in order.

## Backend wave 2

Fine:
- Both SQL functions are `security definer` with a pinned `search_path`.
- Execute is revoked from `public`/`anon`/`authenticated` and granted to `service_role`, and the checks file asserts it.
- A per-IP-hash advisory lock makes count + insert atomic.
- DB errors surface only as a generic code.
- The client sends only the URL and the anon key, keeps the service-role guard and `credentials: 'omit'`, and caps reads.
- `submitRun` is still a stub (`src/net/client.ts:215`), so no player reaches the function yet.

**K1 ruling: the spoofable client IP, still open.**

How it works now: `clientIp` (`rules.ts:174-185`) tries `cf-connecting-ip`, then `x-real-ip`, then the **first** `x-forwarded-for` hop.

How Supabase's edge gateway treats these headers:
- Supabase edge functions are reached through Cloudflare, then Supabase's own gateway.
- Cloudflare sets and overwrites `cf-connecting-ip` with the real peer.
- Cloudflare appends to any `x-forwarded-for` the client sent, so the first hop is chosen by the attacker.
- The last hop may be Cloudflare's or the gateway's own address. Trusting it could put every player in one bucket.
- Whether the gateway overwrites `x-real-ip` is undocumented.

The fix:
1. `clientIp` trusts **`cf-connecting-ip` only**. Delete the `x-real-ip` and `x-forwarded-for` fallbacks. With no `cf-connecting-ip`, fail closed as now (see K2 for the error code).
2. Normalise IPv4-mapped IPv6 (`::ffff:a.b.c.d` becomes `a.b.c.d`), and bucket IPv6 by its /64.
3. Add unit tests:
   - forged `x-forwarded-for` and `x-real-ip` with no `cf-connecting-ip` give `null`;
   - a forged first hop next to a real `cf-connecting-ip` uses the real `cf-connecting-ip`;
   - two addresses in one /64 share a bucket.
4. On the first deploy to the test project (USER-2):
   - deploy a throwaway echo function;
   - send forged `cf-connecting-ip`, `x-forwarded-for` and `x-real-ip`;
   - record in `backend/README.md` (item 4) which headers the platform overwrites.
5. Only if `cf-connecting-ip` turns out to be absent: use a fixed, measured position counted from the **right** of `x-forwarded-for`, never the first hop.

**Blocks a first deploy? No.** That deploy is where step 4 happens, and `submitRun` is still a stub. **K1 does block turning submissions on**: M3-14 wiring, or any public build that calls `submitRun`. While B-1 is open, the rate limit is the only abuse control, and K1 defeats both it and the storage bound.

Other backend findings:
- **K4 MEDIUM: an unverified run can replace a verified best.**
  - `record_run`'s upsert (`0004_atomic_submit.sql:74-79`) replaces the row whenever `r.steps > excluded.steps`, ignoring `verified`.
  - This is unreachable while `p_verified` is always false (B-1). The day server replay ships, a forged faster row would overwrite a verified best.
  - Fix together with B-1 option A, in a new migration: `where r.steps > excluded.steps and (excluded.verified or not r.verified)`, plus a check in `backend/tests/`.
- **B-1 HIGH (batch 5), unchanged.**
  - Anyone can post a faster fake time under any display name, bounded only by the 85% floor.
  - `PUBLIC_BOARD_VERIFIED_ONLY` stays as the stop-gap. The decision is already filed.
- **K2 LOW, still open:** a request with no IP answers `invalid` (`index.ts:72`).
- **K3 LOW, still open:** the rank returned for a slower repeat is the rank of the submitted time.
- **K5 LOW: two hardening items.**
  - The IP hash is keyed with the service-role key (`index.ts:73`), so rotating that key resets every bucket. Use a dedicated function secret (`IP_HASH_SALT`), checked at start-up.
  - Tighten `MAX_BODY_BYTES` from 128 KB to about 40 KB, to match the 32 000-character log limit.
- **K6 LOW: stale text and dead code.**
  - `rules.ts:38` and `backend/README.md` still describe pruning on every call; it is now 2% of calls.
  - `rateVerdict` and `isRateLimited` are no longer used by `index.ts`.
  - The README should say that the hourly cap also counts rejected attempts.

## What the next batch fixes first

1. Backend K1: steps 1-3 in code now, step 4 on the USER-2 deploy. It gates opening submissions.
2. Scene S1: no `preventDefault` under an overlay. It is small, and it removes the last dependence on listener order.
3. QA (B6-42) checks on the frozen build:
   - reduced motion and reduced effects;
   - the exit arrow on the left, top and bottom edges;
   - Esc opens Pause and Esc closes it, exactly one press each;
   - arrow navigation in Pause after a restart;
   - music and SFX audible.
4. K4 lands together with B-1 option A. S2, S3, S4, K2, K3, K5 and K6 are filler.

## Follow-ups filed (`docs/production/requests.md`)

gameplay-engineer [scene] (S1, S2, S3), art-director (S4), backend-engineer (K1, K4, K5, K6), qa-tester (unseen paths).
