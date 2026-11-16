# Feature: Tandem (one throttle, two runners)

_Owner: design-lead. Milestone: M3 content, sim and scene from Nov 9 (decision gate **Tue Nov 17**, owner decision 2026-11-13; see Priority). GDD: §1, §4.15, §7, §11. Chosen by the studio owner on 2026-11-03 from `core-twists.md`. Fallback if the gate fails: world 3 reverts to the v1.3 gates plan._

## Rule

A level may contain a second runner, the **twin**, spawned at `&`. Every step, the twin receives **the same input** as the runner (the same held direction, jump and shift presses) but has its own body: its own position, speed, gear, color, grace, buffers and air drag. The two bodies never touch each other.
- A body that reaches an exit is **home** and stays there.
- The level is won when **both** bodies are home.
- If **either** body falls out of the level, the whole run dies and both respawn.

## Details

### Bodies and spawn

- **Body 0, the runner,** spawns at `@`, exactly as today.
- **Body 1, the twin,** spawns at `&`: standing on the bottom edge of that cell (feet x = col + 0.5, y = row + 1), facing right, gear `startGear`, band 0, `vx = vy = 0`. `&` parses as empty.
- **A level has at most one `&`.** Without one, the sim behaves exactly as before; every M1 acceptance check is unchanged.
- **Each body carries the full M1 player state:** x, y, vx, vy, gear, band, grounded, facing, grace (band and steps), coyote, jump buffer, shift buffer (net and steps), drag counter, plus a new `home` flag.

### Shared input, separate results

- **Direction (phase 3)** is computed **once per step** from the shared input, with one shared direction-priority state, so both bodies get the same d. Facing is per body and becomes d when d ≠ 0.
- **Shift (phase 2)** is applied **per body:**
  - a body grounded at the start of the step changes its own gear (clamped to `minGear`..4);
  - an airborne body adds the press to its own shift buffer.
  - So **gears can differ**, when one body is in the air or the air rule (`gear ← max(minGear, min(gear, band))`) lowers one body's gear.
- **Resync by clamping:** a press that would take a body above gear 4 or below `minGear` does nothing for that body (the existing clamp). With gears g0 ≠ g1, pressing up `4 − min(g0, g1)` times leaves both in gear 4; pressing down `max(g0, g1) − minGear` times leaves both in gear 1. This is the only way to bring split gears back together, and levels teach it.
- **Jump (phase 5)** is per body: a jump press launches every body that is grounded or in coyote time; any airborne body without coyote buffers it in its own jump buffer.
- **Everything else is per body:** ground speed, gravity, walls, floors, ceilings, color gating, no-embed, grace, air drag, band, gear-follows-band, landing, and the timers. One body's walls, gaps and colored tiles never affect the other.

### No interaction

- The bodies **never collide**. They may overlap; neither pushes, supports or blocks the other. Tiles never treat a body as solid.
- Stepping order (runner, then twin) therefore changes no positions or speeds; it only fixes the order of events in `SimState.events`.

### Home (exits)

- In phase 14, any non-home body whose box overlaps an exit tile becomes **home** (`home` event with its body id). Exits are shared: either body may use any exit tile.
- **A home body is frozen.** From the step after it got home, phases 2–13 skip it; its state stays exactly as it was at the end of the home step. It emits no events, is never checked for death, and is ignored for camera framing.
- **Win:** on the first step on which every body is home, the run is `won` (`wonAtStep` as in architecture.md §3.1). In a level without a twin this is identical to today's rule.
- **Same step:** home is checked for both bodies first. If every body is now home, the run is won, even if one of them was also below the grid (exit beats death, as today). Otherwise, if any non-home body's box top is below the bottom of the grid, the run dies.

### Death, restart, respawn

- **Either body falling out kills the run.** The `died` event carries the body id; if both fall on the same step it carries 0. The run freezes for `deathFreezeMs` and then respawns as today.
- **Respawn and restart (R)** return the fresh-load state for **both** bodies, home flags cleared, exactly as `createSim` builds it, including `prevInput` held through as in architecture.md §3.4.

## Step order (GDD §4.14)

| # | Phase | Tandem |
|---|---|---|
| 0 | Status gate | once (run-level) |
| 1 | Input | once; press edges from the shared `prevInput` |
| 3 | Direction | once, before any body's phase 2 (it reads only input, so moving it ahead of phase 2 changes nothing); shared priority, facing per body |
| 2, 4–13 | Shift, ground speed, jump, gravity, move X, move Y, air drag, band, landing, grace, timers | **per body: body 0 (runner) first, then body 1 (twin)**; home bodies skipped |
| 14 | Exit, then death | once: home check for each non-home body, then win if all are home, else death if any non-home body is below the grid |
| 15 | Bookkeeping | once: `step + 1`, `prevInput`, `events` (runner events first, then twin's) |

## New sim state (for tech-lead's contract)

- `SimState.twin: PlayerState | null`: null when the level has no `&`.
- `PlayerState.home: boolean`: false at spawn.
- Every player event (`shift`, `shiftBuffered`, `bandChange`, `airDrag`, `jump`, `land`, `wallStop`, `ceiling`, `graceStart`) gains `body: 0 | 1`.
- New event `home { body }`. `died` gains `body`.
- `won` and `restart` are run-level.
- Shared input state (`prevInput`, direction priority) moves to run level if it currently lives on the player.
- `Level` gains the twin spawn (or null). Recordings and the solution format are unchanged: still one input stream.

## Edge cases

- **Walls:** a wall stops only the body that touches it. The stopped body keeps its gear on the ground; in the air it drops to `minGear` (air rule).
- **Gaps:** a body over a gap falls on its own; the other keeps running. A fall below the grid kills the run.
- **One airborne, one grounded:** the grounded body shifts now, the airborne one buffers (6-step window). A jump launches the grounded body and is buffered for the airborne one.
- **Both in coyote or grace:** per body, with their own windows.
- **Let go with one body on a colored floor:** its grace and coyote run; if it falls out, the run dies. "Stop on safe tiles" now applies to both lanes at once.
- **Home body on a colored exit approach:** irrelevant once home (frozen, can't fall).
- **Bodies overlapping in a shared room:** allowed; both are drawn, twin behind runner.
- **Spawns:** `&` never inside a solid tile or on an exit; a twin spawning on a colored floor falls at band 0 like the runner would. Level validation should reject `&` on or above-adjacent to `E` (tech-lead's call).

## Camera framing (scene, not sim)

- 480×270 logical shows 30 × 16.9 tiles, and the HUD sits on top. **Two lanes plus the divider take at most 15 rows,** so the camera never scrolls vertically (tech-lead's ADR, `docs/tech/adr-pixel-rendering.md`).
- **Which body the camera keeps:**
  - both non-home and within 28 tiles: the camera's x target is their midpoint, clamped to the level bounds and eased as today;
  - one body home: the camera frames the body that is not home;
  - both non-home and more than 28 tiles apart: the camera follows the runner, and a pixel arrow (with the twin's silhouette) at the screen edge points at the twin. The arrow carries the twin's band by its pattern ink (white is plain), so the band never depends on color alone (ruled in M1-52, 2026-11-05; built by art in M1-59).
- **Level rule:** intended solutions keep the bodies within 26 tiles of each other.

## Readability (requirements for art and UI; color is never the only signal)

- **The twin differs by shape at 12×24 px:** for example a hollow outline body with a 1-px inner line where the runner is filled. Both show their band's pattern.
- A home body shows a "parked" pose or glyph and stops animating.
- **HUD:** two gear strips stacked, top = runner, bottom = twin, each marked with its body's silhouette. Each has the five-cell band strip, selected-gear bracket and needle (`hud-gear-meter.md`). A home body's strip dims and shows the home glyph.
- **Lanes:** a solid safe band at least 1 tile thick separates stacked lanes, so it is always clear which floor belongs to which body.

## Level rules (for level-designer)

- Two lanes plus the divider take at most 15 rows (the HUD sits above). Lanes are stacked with a safe divider at least 1 tile thick, each lane at most 7 rows.
- Each body needs its own reachable exit.
- Bodies start aligned in x unless the puzzle says otherwise.
- The split must come from the level (a wall, an air stop, an exit, a gap), never from timing.
- Every split a level needs must be undoable or final by design (say which in `levels/README.md`).
- All existing rules (GDD §6, `level-plan.md`) apply to each lane.

## Tuning

No new keys. Uses every existing key per body; `deathFreezeMs` and `stepHz` at run level.

## Acceptance

Test conventions: see `movement-and-gears.md`. "Lane" = a row of tiles holding one body. Numbers marked **(derived)** are worked out by hand from the step rules, not printed in GDD §5. Tests must confirm them; if the sim differs, the test pins the sim value and design-lead updates this spec.

1. **No twin, no change.** A level without `&`: `twin` is null and every acceptance check in `movement-and-gears.md`, `color-gating.md`, `air-drag.md`, `jump.md` and `safe-tiles-and-reset.md` passes unchanged.
2. **Twin spawn.** A level with `&`: on the first step, the twin is standing with feet at (col + 0.5, row + 1), facing right, gear 1, band 0, home false. A level with two `&` fails to parse with a message naming the row and column of the second.
3. **Same input, same lane, same result.** Runner and twin lanes identical relative to their spawns. Inputs: hold R from step 1; press `+` on steps 1, 3, 5; press J on step 60; 200 steps in total. On every step the twin's (x − x0, y − y0), vx, vy, gear and band equal the runner's. Each step's events list is the runner's events followed by the same events with `body: 1`.
4. **A wall stops one body.** Both cruising at gear 4; the runner's lane has a red wall column, the twin's is open.
   - On the runner's contact step: runner `vx` 0, gear 4, band 0, one `wallStop` with `body: 0`; twin `vx` 12, band 4.
   - Keep holding R. Counting the step after contact as step 1, the runner is band 1 on step 1, band 2 on step 10, band 3 on step 23, band 4 on step 32 (GDD §5.1, ramp from standing). The twin is band 4 on every one of those steps.
5. **Gear split in the air.** Both cruising at gear 4 on flat safe lanes; jump on the same step. The runner's lane has a hanging safe block whose face is 3.0 tiles past the runner's launch x, spanning heights +2 to +5 above the floor.
   - Runner: wall stop on flight step 14 **(derived)**, `vx` 0, gear 1, x snapped to launch x + 2.625; lands on flight step 48 with `vx` 0.
   - Twin: drop to `|vx|` 9 on flight step 30, lands on flight step 48, 8.70 tiles out, gear 3 (`air-drag.md` check 1).
   - On the next step, holding R: runner `vx` 3 (band 1), twin `vx` 9 (band 3).
6. **Clamp resync up.** From check 5's end state (runner gear 1 cruising at 3, twin gear 3 cruising at 9), holding R, press `+` on action steps 1, 3 and 5.
   - Gears after step 1: runner 2, twin 4; after step 3: 3, 4; after step 5: 4, 4.
   - Twin band 4 on action step 4 (GDD §5.1, yellow→red 4 steps).
   - Runner band 4 on action step 31 **(derived:** one step ahead of the ramp from standing, because it starts at 3), `vx` = 12 from action step 35 **(derived)**.
   - By action step 40 both are gear 4, band 4, `vx` 12.
7. **Clamp resync down.** Runner gear 4, twin gear 2 (any setup), both grounded: press `-` on three separate steps → both gear 1.
8. **Shift while one body is airborne.** Both walking at gear 1; the runner walks off a 4-tile ledge, the twin's lane is flat. The runner is airborne for 29 steps (walk-off step = 1, `air-drag.md` check 4).
   - Press `+` on the runner's airborne step 10: the twin is gear 2 at the end of that step; the runner's press is buffered, expires before landing, and the runner lands in gear 1.
   - Same setup, `+` on airborne step 25 (landing step 29 ≤ 25 + 5): the runner is gear 2 at the end of its landing step.
9. **Jump while one body is airborne.** Check 8's setup, J on the runner's airborne step 26: the twin launches on that step. The runner's jump is buffered and fires on the step after its landing (landing step 29 ≤ 26 + 4).
10. **Home, then win.** The runner's lane has an exit tile 6 tiles from its spawn; the twin's exit is 12 tiles from its spawn. Hold R in gear 1.
    - On the first step the runner's box overlaps its exit: `home` event with `body: 0`, status still `playing`, and on every later step the runner's state is identical to that step's.
    - On the first step the twin overlaps its exit: `home` with `body: 1`, then `won`; `wonAtStep` = that step's number per architecture.md §3.1.
11. **Both home on the same step.** Exits at the same distance from both spawns: `won` on the first step both overlap, with two `home` events (body 0 then body 1) before `won`.
12. **Twin falls, run dies.** The twin's lane has a pit 3 tiles ahead and the runner's is flat; hold R in gear 1. When the twin's box top passes below the grid: `died` with `body: 1`, status `dead`; after the freeze both bodies respawn at their spawns with gear 1, band 0, home false.
13. **Home beats death on the same step.** The runner is already home; on the step the twin overlaps an exit, the run is won. And a body that is home never triggers `died`, even if its exit hangs over the bottom row.
14. **No win with one body dead on the same step.** The runner overlaps an exit on the same step the twin's box top passes below the grid: status `dead`, not `won`.
15. **Restart resets both.** After check 10's runner is home, press restart: on the respawn step both bodies equal their fresh-load state (home false, gear 1).
16. **No body collision.** Twin spawn 3 tiles right of the runner's in the same corridor, which ends at a safe wall 8 tiles right of the runner's spawn. Hold R in gear 1 for 200 steps: both end flush against the wall with equal x, and the runner's `vx` is 3 on every step before its own wall contact (it walks through the twin's box).
17. **Per-body gating and grace.** Runner on a safe lane, twin on a long green floor over a pit; both cruising at gear 2. Press `+` on action step 1. The twin's band becomes 3 on action step 5 (= c, `color-gating.md` check 4); it gets `graceStart` (`body: 1`), is grounded c+1..c+6, airborne on c+7, and the run dies when it leaves the grid. The runner also changes band on step c and gets its own `graceStart` (`body: 0`), but safe tiles keep it grounded on every step.
18. **Determinism.** Checks 3–17 run twice give identical step-by-step state and events.

### Scene checks (for gameplay-engineer [scene] and qa-tester)

- S1. Bodies 20 tiles apart: both fully on screen.
- S2. Runner home, twin moving: the camera follows the twin.
- S3. Bodies 30 tiles apart: the camera follows the runner and an edge arrow points at the twin.
- S4. Twin and runner distinguishable in a grayscale screenshot at 1× (480×270).

## Priority

Must (M3 content). **Decision gate Tue Nov 17** (owner decision 2026-11-13; was Nov 12): if checks 1–12 are not passing in qa-tester's T-13 run by then, world 3 reverts to the v1.3 Gates world (`features/speed-gates.md`, level plan v2.0 sketches). Tandem stays world 3 until the gate; no Tandem level or scene work is dropped before it.
