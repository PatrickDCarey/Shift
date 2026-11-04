# Redshift bug list

_Owner: qa-tester. Newest last. Severity: blocker | major | minor | polish._

### BUG-1: `window.__redshift` ships in the production build, against M1-15 acceptance
Status: **CLOSED 2026-11-04** (fixed in b432391, verified by qa-tester; see Verification below)
Severity: minor
Owner: tech-lead (policy), gameplay-engineer [scene] (code)
Build/commit: working tree 2026-11-02 (no git history yet)
Steps: 1. `npm run build` 2. serve `dist/` 3. open the page, evaluate `typeof window.__redshift`.
Expected: M1-15 says the debug hook is absent from the production build.
Actual: `"object"`; the scene installs it in every build (`GameScene.installDebugHook`) and the e2e suite depends on it (requests.md, 2026-11-02).
Evidence: `src/scenes/GameScene.ts` (`Object.defineProperty(window, '__redshift', ...)`); e2e passes against `vite preview`.
Note: read-only and harmless to players, so minor. Decide: accept (and amend M1-15) or gate it behind `?debug`/dev and run e2e against a build that enables it.
Verification (2026-11-04, working tree on top of b432391): `npx vite build --outDir <scratch>/plain --emptyOutDir` (a plain build, no env, into a scratch folder so `dist/` and the running e2e were untouched) built `index.html` plus `assets/index-D_IoQXFT.js`; `grep -rl "__redshift" <scratch>/plain` returned 0 files (0 matches in each file). The same build with `VITE_QA_HOOK=1` (`<scratch>/hook`, `index-BKL8K_IE.js`) returned 1 file containing it, so the flag is what keeps the hook in. The e2e suite, whose `webServer` sets `VITE_QA_HOOK=1`, passes 31/31 against it (test-plan section 7, run 3). Guards: `tests/arch/qa-hook.test.ts` (3 tests pass) and the CI step "No QA hook in the release build" (`.github/workflows/ci.yml`). M1-15 holds as written.

### BUG-2: `playwright.config.ts` top-level `viewport` is overridden by the Chromium device preset
Status: **CLOSED 2026-11-04** (fixed in b432391)
Severity: polish
Owner: tech-lead
Build/commit: working tree 2026-11-02
Steps: 1. read `playwright.config.ts` (`use.viewport` 960x540, project `use: { ...devices['Desktop Chrome'] }`) 2. run a test with no `test.use` and log `page.viewportSize()`.
Expected: 960x540 (the itch.io embed size).
Actual: 1280x720, because the project's device preset wins over the config-level `use`.
Evidence: Playwright option precedence. Worked around: every spec calls `test.use({ viewport: EMBED_VIEWPORT })` (`tests/e2e/helpers.ts`). Fix: move `viewport` into the project's `use` after the spread.
Verification (2026-11-04): `playwright.config.ts` now has `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: EMBED_VIEWPORT } }]`. QA removed every per-spec `test.use({ viewport })` from `embed`, `keyboard`, `replay` and `smoke` and added `expect(page.viewportSize()).toEqual(EMBED_VIEWPORT)` to `embed.spec.ts` "canvas is 960x540 logical and fills the 960x540 viewport" as a permanent regression guard. That test and the 960x540 canvas and no-scrollbar tests pass (31/31, run 3); under the old precedence they would see 1280x720.

### BUG-3: default `npm run test:e2e` (4 parallel workers) is slow and flaky on a busy dev machine
Status: **CLOSED 2026-11-04** (fixed in b432391: `workers: 2`, `reuseExistingServer: false`); residual load sensitivity is a test-plan note (G11), not this bug
Severity: minor
Owner: tech-lead (`playwright.config.ts`, `package.json`)
Build/commit: working tree 2026-11-03
Steps: 1. while other work is using the machine, run `npm run test:e2e` (4 workers by default) 2. watch the keyboard specs.
Expected: 27 passing tests in about 2 minutes.
Actual: four headless Chromium pages each run the Phaser WebGL loop in software at once; frames drop to a few per second, tests take 45-90 s, and 3-10 of them fail with "window.__redshift never appeared" or poll timeouts (2026-11-03, two such runs). Alone on the machine the same command passes 27/27 in 2.0-2.1 min (two runs). With `--workers=2` the heavy specs passed repeatedly (32/32).
Evidence: the failing runs' console output (not kept); passing runs in test-plan section 7.
Suggestion: set `workers: 2` (or 50%) in `playwright.config.ts`. The suite's own waits (45 s boot, 20 s poll, 120 s per test) tolerate a slow game; they cannot tolerate a starved one.
Verification (2026-11-04): `playwright.config.ts` has `workers: 2` and `webServer.reuseExistingServer: false`; every run printed "Running N tests using 2 workers". Runs with port 4173 free (the config refuses to reuse a server; checked with `netstat` before each run): run 1 25/29 (4 failures, all attributed in test-plan section 7: three from the level designer's in-flight w0-02 change, one new test of mine), run 2 30/31 (1 timeout on a machine shared with nine other agents), run 3 31/31 in 3.9 min. A busy machine can still push a pit-walking test past its 120 s timeout (run 2); that is load, not the worker count, and `walkIntoOpenPit` now releases the key in the page to cut that exposure.

### Checked, no bug: shift pressed in the air changes the selected gear (playtest 2026-11-02)
Not reproduced. e2e `keyboard.spec.ts` "KeyE / ShiftRight / KeyX pressed early in a jump does not change the gear": jump in the open (w0-02 pit, floor y 12), key dispatched on the first airborne frame, at least 10 steps before landing (verified from recorded frames), selected gear stays 1 in every sampled frame and 30 steps after landing (passes in the full runs and in repeat runs). The sim unit checks air-drag 13-14 (no mid-air shift; buffer L-4 applies, L-10 does not) also pass.
Possible explanations for the playtest report: a shift pressed within 100 ms of landing is applied by design; a shift pressed on the ground just before jumping is kept, but the gear then drops to follow the band at takeoff (a standing jump always leaves gear 1); or the new HUD gear indicator lagged.
Not covered: a shift in the air during a fast jump from gear 3-4 (needs a runway; unit tests only). Ask the playtester for gear, speed and timing if it recurs.
