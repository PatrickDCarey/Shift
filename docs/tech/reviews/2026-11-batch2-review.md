# Review: batch 2 code (M2-25a, M2-26a, M2-27a)

_Reviewer: tech-lead, 2026-11-05 (batch 3). Reviewed at `HEAD` = `7a52b08` (batch 2 code is commit `68bdce0`; the gear meter parts of M2-08 came in `9ea8970`). Ten agents were editing the working tree in parallel, so every file was read from `git show HEAD:<path>`; later working-tree edits get reviewed with their own tasks. Checklist: `.claude/agents/tech-lead.md`. Three typescript-reviewer agents did the file-by-file reading (one per task). I spot-checked their findings at `HEAD`: `sfxEvents.ts:64`, `engine.ts:309`, `client.ts:108-109`, `levelSelectModel.ts:30`, `GameScene.ts:200,247,267-268`, plus the `src/net` import grep, and confirmed each one._

Severity follows `~/.claude/rules/common/code-review.md`: Approve means no CRITICAL or HIGH. No CRITICAL or HIGH item was found in any area.

## Verdicts

| Task | Area | Verdict | Follow-ups |
|---|---|---|---|
| M2-25a | [scene] M2-06 progression, pause, win flow; M2-39 Sticky Keys mount (`src/scenes/GameScene.ts`, `src/entities/*`) | **Approve** | B1, B2 (MEDIUM); B3 (LOW) |
| M2-25a | [level] M2-04 hint parser, T-04 `&` parser (`src/core/level/{hints,parseLevel,text}.ts`) | **Approve** | B4 (done in M1-56) |
| M2-26a | ui M2-08 rest: drag meter, pending bracket, drop pulse (`src/ui/gearMeter*.ts`, `dropPulse.ts`) | **Approve** | B5 (LOW) |
| M2-26a | M2-10 progress model (`src/save/{progress,schema,index}.ts`) | **Approve** | B7 (LOW) |
| M2-26a | pure menu models, input, focus, layout (`src/ui/*Model.ts`, `menuInput.ts`, `menuFocus.ts`, `menuLayout.ts`, `audioSettings.ts`) | **Approve** | B6 (MEDIUM); B8 (LOW) |
| M2-27a | M2-17 SFX (`src/audio/{sfx,sfxEvents,sfxSpec,testkit,index}.ts`, engine changes) | **Approve** | B9, B10 (MEDIUM); B11 (LOW). Not wired into the scene yet (by plan: scene wiring waits for the cutover) |
| M2-27a | M2-18 `src/net` skeleton | **Approve** | B12 (fixed here), B13 (MEDIUM), B14 (LOW) |
| M2-27a | pixel-fx sheets (`src/fx/pixel/{effects,atlas,tileset,player}.ts`, `assets/art/pixel/build.mjs`, `pixel-fx.json`) | **Approve** | none new (M1-59 items stand) |

## M2-25a: scene and level lanes

What holds:
- **Boundaries.** The scene decides no rules. It samples input, steps the sim through `RunDriver` and draws. Core is imported only via `../core` and `../core/types`. There is no `Math.random` or `Date` in scene code.
- **Pause.**
  - Esc and P toggle pause. Blur and `visibilitychange` clear held keys and then pause.
  - Keys pressed while paused are masked until they are released.
  - `resetClock()` on resume prevents catch-up steps.
  - R pressed while paused is applied on the next live frame.
- **Win flow.** One win is queued per win step. `recordRun` skips world 0 and replay mode.
- **Sticky Keys tip.** It mounts once per page, is skipped in replay, and hides on teardown.
- **Size.** `GameScene.ts` is 336 lines. Its longest function is `create()` at about 36 lines, and nesting is at most 3.
- **Level lane.**
  - Hints:
    - At most 3.
    - Glyph ids come from `HINT_GLYPHS`.
    - Coordinates are whole numbers.
    - A duplicate (same glyph and anchor) is rejected, and the message names the first line.
    - The anchor cell must be `.`.
    - Every error carries `file:line:col`.
  - `&`:
    - At most one, and the error names the first one.
    - It needs `@`.
    - An `E` directly above or below it is rejected.
    - Its cell parses as empty.
  - Functions are at most 21 lines and nesting is at most 3.
  - There are 14 hint tests and 11 twin tests.

Findings:
- **B1 (MEDIUM)** `src/ui/StickyKeysTipView.ts:171-181` and `src/scenes/GameScene.ts:200`: the tip is saved as shown when it mounts. A focus-loss pause in the first seconds hides it for good, so an accidental click outside the iframe burns the one-time tip. This matches the spec's "pausing hides it for good", so it is not a bug. → design-lead decides (requests): either save "shown" after about 1 s on screen, or let a blur pause keep the tip.
- **B2 (MEDIUM)** `src/scenes/GameScene.ts:247`: `handleWins` calls `loadLevelSet(LEVEL_FILES)` and re-parses every level on each win. Compute the set once in `create()` and reuse it. → [scene], next sitting.
- **B3 (LOW)** `src/scenes/GameScene.ts:267-268`: `consumeFirstStart()` runs before the `replayRequested` check, so a replay load uses up the page's first start. It only matters on the dev/QA path. Check `replayRequested` first. → [scene].
- **B4 (LOW, done)** The hint placement rules (3 x 2 box over empty cells, 3 rows above the floor) were not tested anywhere. They now are, in `tests/levels/hints.test.ts` (M1-56, below).

## M2-26a: UI models and progress

What holds:
- **Unlocks.**
  - The unlock rule matches `decisions.md`: a level is open if it is first in its world, if its predecessor is cleared, or if it is cleared itself.
  - Unlocks are derived on every read and never stored.
  - A best time is kept only when it improves, and an equal time is not a new best.
- **Untrusted JSON.**
  - `parseSave` never throws.
  - Ids must start alphanumeric, so `__proto__` is rejected.
  - `hasOwnProperty` guards are used.
- **Menu input.**
  - It matches `menu-navigation.md`: arrows/WASD, Enter/Space, Esc/Backspace.
  - The Shift keys and Q/E/Z/X are never read as menu keys.
  - A key acts only on a fresh press.
  - Focus does not wrap, as the spec says.
- **Models** return new objects and stay within the import boundaries.
- **Size.** The longest function is `gearMeterPlan` at about 35 lines.
- **Gear meter.**
  - The drag fill is hidden when grounded or at `band <= airDragMinBand`, and reads `airDragTilesPerGear` from params (not hard-coded).
  - The pending bracket appears only in the air with a non-zero buffer.
  - The drop pulse is off under reduced motion.

Findings:
- **B5 (LOW)** `src/ui/gearMeterPlan.ts:99`: the drag fill width `inner.w * fill` is fractional while the rest of the HUD is pixel-snapped. Use `Math.floor`, and loosen the test at `gearMeterPlan.test.ts:174`. → ui-engineer; it folds into the PX-9 relayout.
- **B6 (MEDIUM, latent)** `src/ui/levelSelectModel.ts:30`: `MAX_CELLS_PER_ROW = 5` is exported but `cellRect` never splits rows. A sixth level in one world lands at x 438..502 and breaks the 8 px margin. Every world has 5 levels today. Either wrap rows or add a test that fails when a world has more than 5 levels. → ui-engineer.
- **B7 (LOW)** `src/save/progress.ts:39-43`: ids sort as strings. This is correct while ids are zero-padded, and the parser enforces `w<d>-<dd>`, so it is safe. Add a note. `progress.ts:32-33`: `toSet` assumes a `Set` instance. → ui-engineer, optional.
- **B8 (LOW)** `src/ui/resultsModel.ts:80`: caption limit 32 and offsets 8/20/40/58/68/82 are unnamed. `src/ui/controlsModel.ts:100`: `6 * label.length + 5` should use `ADVANCE`. Both are layout only. → ui-engineer, optional.

## M2-27a: SFX, net, pixel-fx sheets

What holds:
- **SFX.**
  - `tone()` returns false until the context runs, so nothing throws before a gesture.
  - The SFX voice cap steals the oldest SFX voice only, never music.
  - `sfxEvents` and `sfxSpec` are pure and import types only.
  - Event mapping matches `adaptive-audio.md`:
    - A unison merge for two bodies.
    - `home` is dropped on the win step.
    - `died` and `restart` share one reset sound.
  - Level complete ends within 1.2 s.
- **Net.**
  - The client never throws.
  - A timeout aborts the request, and `clearTimeout` is in a `finally`.
  - `levelId` is gated by an anchored regex, and the version is an integer.
  - Query strings are built with `URLSearchParams`, with clamped limits.
  - Fetch uses `redirect: 'error'` and `credentials: 'omit'`.
  - Responses are validated field by field, with no spread, so there is no prototype-pollution path.
  - `config.ts` refuses:
    - http, except localhost;
    - userinfo in the URL;
    - `sb_secret_` keys;
    - service-role JWTs.
  - `submitRun` is a stub.
- **Pixel-fx sheets.**
  - Colours come from `palette.json`.
  - Baking is deterministic (Bayer dither, no clock).
  - Drift tests compare the PNGs and JSON byte for byte.
  - Effects are 1-bit masks with distinct shapes.
  - `readability16` and `ghostContrast` cover greyscale and five vision modes.

Findings:
- **B9 (MEDIUM)** `src/audio/sfxEvents.ts:64`: `default: return null`. A new `SimEvent` type (`fallThrough` is coming, see the T-07 ruling) would be silently mute. List the deliberately silent types and end with `const _never: never = event`. → audio-designer.
- **B10 (MEDIUM)** `src/audio/engine.ts:309` with `:335-339`: `voices` is decremented only in `onended`. A suspended or interrupted context (a hidden tab, Safari) can leave the counter at `MAX_VOICES`, and then non-SFX voices are refused. Reset the counters when the context leaves `running`. This is separate from the known voice-leak-order item. → audio-designer, in the M3-16 sitting.
- **B11 (LOW)** `src/audio/sfxSpec.ts:184`: a non-null assertion `n[n.length - 1]!`. `:88`: comment that `MIN_AUDIBLE_HZ` applies to start pitch only. → audio-designer.
- **B12 (MEDIUM, fixed in this review)** architecture §8 said `src/net` is loaded by dynamic `import()`. Today nothing imports it at all. The new arch test `tests/arch/render-imports.test.ts` now fails on any static (non-type) import of `src/net` from outside it, so M3-13 must wire it with `await import('../net')`. §8 is corrected.
- **B13 (MEDIUM)** `src/net/client.ts:108-109`: `res.text()` buffers the whole body before the 256 KB check. Reject early on a `content-length` over `MAX_BODY_CHARS`. The 5 s timeout bounds the current behaviour. → backend-engineer, M3-13.
- **B14 (LOW)** `src/net/validate.ts:35`: `display_name` allows bidi overrides and zero-width characters (U+202E, U+200B, U+2066-2069). Reject them, in line with the SEC-2 name allow-list. `src/net/index.ts:28-33`: the `try/catch` around `import.meta.env` is dead code. → backend-engineer.
- Pixel-fx: `src/fx/pixel/atlas.ts:290`: the tints are a JSON note with no consumer yet. Read them from `palette.json` when PX-7 wires them. No new item.

## Requests filed

One line each in `docs/production/requests.md` (2026-11-05, tech-lead): [scene] B2/B3; design-lead B1; ui-engineer B5-B8; audio-designer B9-B11; backend-engineer B13/B14.
