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

### BUG-4: the release zip ships every level's solution recording (and `?replay=1` is live in it), against the 2026-11-04 ruling
Status: **OPEN** (known follow-up F1 of the tech-lead review sweep; filed so the M1 gate cannot pass it by accident)
Severity: minor (spoilers and ready-made leaderboard inputs; nothing breaks)
Owner: gameplay-engineer [scene] (`src/entities/solutionFiles.ts`), backend-engineer (package-script check)
Build/commit: working tree 2026-11-04 on top of 9ea8970
Steps: 1. `npm run package` 2. unzip `release/redshift-0.1.0.zip` 3. `grep -c "204R" assets/index-*.js` and search for `"/levels/w1-01.solution.txt":` in the bundle.
Expected: `architecture.md` section 6 and the review-sweep ruling: solutions do not ship; the raw `?raw` glob is bundled only when `QA_HOOK` is true, and `npm run package` fails if a bundled file holds a recording header (`level:` followed by `levelVersion:`).
Actual: the zip's single JS file contains the raw text of `w1-01.solution.txt` (and the others, for example `160R 30. 204R`). The package script did not object (it printed `packaged 2 files`), so the guard the ruling asks for does not exist yet either.
Evidence: scratchpad unzip of the 2026-11-04 15:07 package (sha256 `f823b052...9bf9b51`); `grep -o "/levels/w1-01.solution.txt\":.level: w1-01"` matches. The QA hook itself is correctly absent (only the unrelated `__redshift_probe__` storage key matches the substring; the script's word-boundary regex is right).
Note: the same build opened from a subfolder loads, canvas 960x540, no console errors (`docs/qa/evidence/package-zip-subfolder-load.png`). Re-check after the scene change and the package-script check land; both are in requests.md as OPEN (2026-11-04, tech-lead to scene and to backend).

### Checked, no bug: blur pause and the held key (pause.md check 10), 2026-11-04
e2e `pause.spec.ts` "window blur pauses ...": after a blur the game is paused (`paused` true, step frozen over 60 frames), the held ArrowRight is dropped, and after resuming with Esc `vx` stays 0 and the runner does not move on until Right is released and pressed again. The embed test now asserts the same. One nuance for the spec owner, not a defect: a real keyboard that is still held down when the window regains focus sends auto-repeat `keydown` events, and `InputSampler.keyDown` treats the first one as a new press (the held set was cleared), so a physically held Right would count as held again a moment after resume. Playwright's synthetic keyboard sends no repeats, so this is not automated. Fine for play (the key really is down); mention it in the pause spec if "pressed again" is meant literally.

### Checked, no bug (polish note): presses of one gear action inside a single rendered frame merge into one press, 2026-11-04
Found by a flaky test of mine: `page.keyboard.press` for E, Right Shift and X back to back (three different keys, all "shift up") reached gear 3, not 4, once in four full runs. `InputSampler` latches a key code once per sample and `heldActions` ORs the codes of one action, so two taps inside one rendered frame (under 17 ms at 60 fps, but 50 ms or more when headless Chromium or a slow laptop drops to ~20 fps) count as one. A human double-tap is never that fast, and a single tap is never lost (M1-14), so this is not filed as a bug; the tests now wait for each gear change before the next press. Worth knowing if a low-fps player reports "my second shift did not register".

Update 2026-11-05: still open at 68bdce0 (orchestrator confirmed the solutions are in the bundle). Not a gate blocker (minor); it must be closed before the first public itch.io upload.

### BUG-5: title -> LEVELS opens level select on w1-01 instead of the PLAY target
Status: **OPEN**
Severity: minor
Owner: ui-engineer (`src/ui/menuNav.ts` `titleJump`, `src/scenes/TitleScene.ts`)
Build/commit: 9f8ffb7 (batch 6)
Steps: 1. Fresh load of the preview build with a save that has `w1-01` completed (or play and win w1-01, then reload). 2. On the title press Down, Enter (LEVELS). 3. Read which cell has focus.
Expected: `docs/design/features/level-select.md` "Initial focus": from the title, the level `playTarget` returns (here w1-02), or w1-01 if it returns null.
Actual: focus is on w1-01 whatever the save holds: `titleJump({ type: 'levels' })` returns `{ target: 'levelSelect' }` with no `focusId`, and `LevelSelectScene` falls back to the first level. (Coming back from Results/Pause LEVELS does focus the level just played; only the title route is wrong.)
Evidence: `tests/e2e/menus.spec.ts` "initial focus from the title is the PLAY target (...; BUG-5)", marked `test.fail()` so the suite stays green and flips to a failure (remove the marker) when it is fixed; the same test with the save seed shows the model `playTargetId` is `w1-02` while the level select focus is `w1-01`.
Note: low impact (one extra keypress); title check 7 and level-select check 12 (Esc returns to the title with LEVELS focused) are fine.

### BUG-6: rare boot failure: every `pixel-*` image fails to load, the game stays black, no retry (seen 2 times in about 800 page loads)
Status: **OPEN** (not reproduced on demand; filed so it is not lost)
Severity: minor (polish if it only happens under test-machine CPU load; major if a real browser can hit it, since the player sees a black canvas and a reload is the only recovery)
Owner: tech-lead (`src/scenes/BootScene.ts`, preload) to decide whether Boot should retry or show a message; no product change is certain to be needed
Build/commit: 9f8ffb7 plus QA specs, `vite preview` of a `VITE_QA_HOOK=1` build, headless Chromium, 2 workers, machine busy (OneDrive and other background jobs)
Steps: 1. `npm run test:e2e` repeatedly on a busy machine (2 of about 7 full runs had one occurrence). 2. Look for a test failing in its first seconds with `window.__redshift never appeared` and a console error list.
Expected: every asset loads, or a failed load is retried or reported on screen.
Actual: console shows `Failed to process file: ... image pixel-player` (then the same for pixel-scenery, pixel-fx, pixel-tiles, pixel-hud, pixel-font, pixel-tileset) and `pageerror: texture "pixel-tileset" is not loaded (BootScene must load it)`. The scene never starts; the test times out at 45 s. The same page loads fine on the next attempt (all other tests in the same run, and a reload).
Evidence: `docs/qa/evidence/b6-asset-load-failure.txt` (Playwright output of run 5, 2026-11-18). Not seen in the 3 earlier full runs of the same day, nor in about 15 manual loads.
Note: cause unknown (a transient fetch or blob-decode failure under load; Phaser's loader has no retry). No e2e test hides it: the shared fixture fails any test that logs a console error, so it shows up as one flaky failure per run. If tech-lead judges it test-machine noise, close it as such.
