# Batch 9 review: w3-05 v2 (B9-01) and the pinned hint test (B9-03)

_Reviewer: tech-lead, 2026-11-23. Reviewed against the uncommitted working tree on top of d2b7cd1: `levels/w3-05.txt`, `levels/w3-05.solution.txt`, `levels/README.md` (w3-05 section), the `LEVELS` row in `backend/functions/submit-run/rules.ts` (B9-02), and design-lead's ruling (`decisions.md` 2026-11-23, `levels-w3.md` "w3-05 v2")._

## Verdict

**Approve** w3-05 v2. Nothing blocks the commit. One README status nit (N1) for level-designer, one spec-text follow-up (D1) for design-lead, and a QA follow-up list for B9-04 (below).

`npx vitest run tests/levels`: 4 files, 117 tests, all green (replay, ±3 robustness, level rules, hints).

## Geometry (checked here, not taken from the README)

Cell-by-cell diff of the grid against `git show HEAD:levels/w3-05.txt`. Both grids are 72 × 15 and no row changed width.

- **29 cells changed, all in cols 36–45. Cols < 30: 0 changes.**
- Runner lane: row 6 cols 36–44 `#` → `.`, row 7 cols 36–44 `.` → `#` (run-up one tile lower). Row 5 col 45 `#` → `.` (v1's raised kerb removed). Row 6 col 45 (the old floor) is now the kerb.
- Twin lane: row 13 cols 36–44 `#` → `.` (row 14 cols 35–45 was already safe, so it is now the run-up floor). Row 12 col 45 `#` → `.`. Row 13 col 45 is now the kerb.
- **Step x is the same in both lanes:** the step tile is col 35 (row 6 runner, row 13 twin), so the face is at x 36 in both. The recording confirms it: from step 986 both bodies are at x = 36.375 exactly (face + half the body width), and neither is at step 985. Kerb face x 45 in both lanes; both bodies are at 44.625 at step 725.
- Step and kerb are each 1 tile high in both lanes. The run-up cols 36–44 is safe tiles only. The blue strip (twin cols 32–34) is left of the step and unchanged.
- **Header:** `version: 2` (`levels/w3-05.txt:38`), hints `jump 12 3`, `shiftUp 36 3`, `jump 41 3` (`:31-33`), unchanged as design ruled. The header comment's numbers match the grid and the sim: runner safe cols 20–35, twin safe col 35, held x 44.625 and 36.375, take-off 41.97, box cols 40–42 = world px 640–688, kerb at 720.
- **Recording:** `levelVersion: 2`, `steps: 1389`. Replays to `wonAtStep` 1389 and passes ±3 (`tests/levels`). The comment's step numbers match a replay: the twin drops off the step at 373, the runner leaves it at 561 and lands at 574; the twin is held at its kerb from 524 and the runner from 725; both are held at the step from 986.

## README (w3-05 section) consistency

Checked against the files and a replay:

- Solution 1,389 steps and the fair-line step numbers (560/574, 524, 725, 986 = 821 + 165) match the recording.
- **Fastest known 680:** I replayed the quoted log (`levels/README.md:388`). It wins at step 680, and it matches the `LEVELS` row `{ version: 2, fastest: 680 }` (`rules.ts:29`).
- Kerb window 20 steps (33–52), take-off x 39.98–43.77, centre 41.88 (col 41): these match the recording (43R, jump at 41.97) and the hint header.
- Hint box notes (`:383-384`) match `hintPlacement.ts` (box cols 35–37 over row 6/7; cols 40–42 = 640–688 px, 4 rows above row 7).
- Headroom "6 rows" between the runner's run-up (row 7) and the twin's (row 14): correct (rows 8–13 empty).

**N1 (nit, level-designer):** `levels/README.md:21` still reads "**version 2, for review**". Design-lead has approved it, so make it "approved 2026-11-23" like the w3-05 section's other notes. This may be the one-line fix already in progress.

## Test change (B9-03, `tests/levels/hints.test.ts`)

- `PLACEMENTS` (`:119`) now pins the version per level: w3-05 is 2 and the rest are 1. The test name prints the version. The headers are unchanged.
- Check 14's sim half (`:173-234`) is rewritten for v2 and tests the state design asked for:
  - **Arrival, step 725** (kept from v1): both bodies are held at the kerb face (x 44.625), both kerb-area boxes are on screen and clear of the HUD, and the `shiftUp` box is behind both bodies.
  - **Held at the step, step 986:** both bodies are at x 36.375 = step face + half-width, and step 985 is not, so 986 is the first held step. The `shiftUp` box spans the step face (x 36 = 576 px) and covers both bodies' x. The `jump` box is ahead of both bodies and its right edge is left of the kerb (720 px). Both boxes are on screen and clear of the HUD at that camera.
- v1's "`shiftUp` box left of both bodies" cannot hold at the step state, because the glyph is now over the bodies by design. It stays only at the arrival state.
- `hintPlacement.ts`: no change needed.

**D1 (design-lead, spec text):** `docs/design/features/onboarding-hints.md:115` (check 14) still describes the v1 state: "held at the kerbs (runner held from step 725) … the `shiftUp` box is left of both bodies". Line 43 says check 14's step number changes to the v2 values. Suggested text: "play the recording to step 986 (both bodies held at the step, x 36.375): the `shiftUp` box spans the step face (x 36) over both bodies, the `jump` box is right of both bodies and left of the kerb (720 px), both on screen and clear of the HUD." Check 13 (`:114`) needs no change: the headers are the same.

## QA follow-up for B9-04 (tests/e2e is QA's; not edited here)

1. **`tests/e2e/batch8.spec.ts:169-218` "hints 14 w3-05"** samples the replay at step ≥ 725 (`:184`, `:205` `≤ 727`) and asserts the v1 check: `shiftUp` right ≤ leftmost body (`:216`), kerb jump right ≤ leftmost body (`:218`). In v2 this probably still passes, because both bodies are still held at 44.625 at 725. But it no longer tests check 14. Add (or switch to) a sample at step ≥ 986 (bodies at 36.375). There, `:216` must become "`shiftUp` box spans x 36 × 16 = 576 px", and `:218` must become "kerb jump left edge right of both bodies". Keep the < 720 px and on-screen/HUD checks. The evidence file name `b8-w3-05-kerb-glyphs.png` (`:202`) should get a v2 name. The replay of 986 steps at speed 1 is about 16.5 s, inside its 150 s timeout.
2. **`tests/e2e/results.spec.ts:152-158`** uses synthetic launch data, `steps: 1364` / `best: 1364`. That is v1's `wonAtStep`, and the comment says "Winning w3-05 by hand is a 1364-step run". It does not depend on the level, so it passes either way. Update the comment and number to 1389, or drop "by hand". The same text is in `docs/qa/test-plan.md:470`.
3. **`docs/qa/test-plan.md:634`** records the "hints 14, w3-05" Pass at step 725 / x 44.63 (v1). Re-run it and re-record it at the v2 state.
4. No other e2e file references w3-05. `b8-replay.ts` is generic: it takes the level id from its caller, and batch8 calls it only for w3-04. `hints-b7.spec.ts` and `levels-hints.spec.ts` cover w1-03, w2-04 and w3-03 only. The `kerb` mentions in `restart-card.spec.ts` are w3-02's kerb.

## Other

- Root `README.md` has no w3-05 numbers or version claims, so **B9-06 is not needed** for v2.
- No setup change. `docs/tech/architecture.md`, `level-format.md` and the CLAUDE.md Commands section are unchanged.
- Ownership: the level files are in `levels/**` (level-designer). The `LEVELS` row was set by the orchestrator under the batch 6 rule. The test change is in `tests/levels/**` (tech-lead).
