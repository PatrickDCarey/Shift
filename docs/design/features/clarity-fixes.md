# Feature: clarity fixes from the M1 playtest (M1-52)

_Owner: design-lead. Written 2026-11-05 (M1-52). Source: `docs/playtests/2026-11-07-m1-greybox.md` (overall 3, innovation 4, theme 4) and its screenshots. Board lines: PT-1..PT-7. GDD: pillars 2 and 3, §11 (HUD), §6 (level rules). Decisions: `decisions.md` 2026-11-05._

None of these fixes adds a feature. Each one makes an existing Must or Should feature (start level, exit, HUD meter, results, world-1 levels) say what it already means. No `tuning.json` change: every issue was missing information or level geometry, not a wrong number. The one new idea the playtest asked for, a one-time air-shift hint, is **rejected** (PT-4), so nothing needs producer sign-off.

## Verdicts

| Fix | Verdict | Builder | When | Priority |
|---|---|---|---|---|
| PT-1 `/` opens on w1-01 | **Do** | gameplay-engineer [scene] | Batch 3 | Must |
| PT-2 exit doorway and off-screen exit cue | **Do**. The opening camera pan is rejected; the w0-02 pocket cue is rejected | art-director (PT-2a frame), [scene] (PT-2b) | PT-2a Batch 3; cue helper Batch 4; drawing after PX-6 | Must; idle animation Should |
| PT-3 show why you fell | **Do**, with one Should trigger added (colored wall stop; airborne pass-through cut 2026-11-16) | tech-lead (T-07 contract), [sim] (`fallThrough` event), [scene] (tile highlight), ui-engineer (HUD cell pulse) | ui model Batch 4; contract Batch 4, event Batch 5; drawing after PX-7 / PX-9 and the event | Must for walk-off and grace fall-through; Should for the rest |
| PT-4 drag bar label | **Change**: the bar is labelled by its shape (it points at the cell you will drop to), not by a word | ui-engineer | model Batch 4, view in PX-9 | Should (like the drag meter). If it is not built, the bar is hidden |
| PT-4 one-time air-shift hint | **Reject**: it would teach a false rule | none | none | none |
| PT-5 "slot 4 lit while yellow" | **Change**: the bracket is drawn thin until you reach its color, then bold. Fix any model bug the investigation finds | ui-engineer | investigation Batch 3; model Batch 4; view PX-9 | Must (part of the Must meter) |
| PT-6 tight windows | **Change** w1-02 (and w1-01 to match) and w1-04 geometry. **Keep** w1-05 geometry, because the lesson caps it, and record its timing-free line | level-designer | Batch 4 | Must |
| PT-7 win card "press R" vs "Enter: next level" | **Defer** to the results panel (M2-12): NEXT is the primary action. No change to the interim banner | ui-engineer (M2-12); [scene] removes the banner | M2-12 | Must (in `results.md`) |

---

## PT-1 · Open on w1-01

**Why:** w0-02 asks six ideas at once and was the playtester's biggest quit risk. w1-01 teaches one idea in 8 seconds.

**Rule:** with no `?level=`, the game starts w1-01. `?level=<id>` still loads any level, w0-02 included. Once the title screen exists (M2-11), `/` opens the title, and PLAY for a fresh save starts w1-01 (`title-screen.md`).

**Edge cases**
- An unknown `?level=` loads w1-01 and keeps today's on-screen message (scene spec gap 5, answered). After M2-11 it opens the title instead.
- The Sticky Keys tip follows `sticky-keys-tip.md` unchanged. Its size and placement (240 × 44 logical, moved under the HUD if it would cover the player) arrive with PX-9. Until then the oversized grey-box card is accepted for the internal build only.

**Acceptance**
1. Unit: the default-level choice returns `w1-01` when the query has no `level`.
2. Unit: `?level=w0-02` returns `w0-02`, and `?level=nope` returns `w1-01` with the message flag set.
3. e2e (qa-tester): every test that relied on `/` loading w0-02 now passes `?level=w0-02` explicitly, and one smoke test checks that `/` reaches w1-01 (the QA hook's level id).

---

## PT-2 · The exit is unmistakable, even off screen

**Why:** pillar 2. The goal must be the most distinct object on screen (ruled 2026-11-03), and a level wider than the 30-tile view must say that it continues.

**Rule**
- **Doorway (Must):** the exit tile is drawn with art's exit frame (pure white, used by nothing else, at least 4.5:1 against the background, the doorway and the safe fill; `docs/art/accessibility.md` §8). Art names the frame in `docs/art/style.md`. The doorway is render-only; the sim's exit is still the one tile.
- **Off-screen cue (Must):** while no part of the exit tile is inside the camera view, an exit edge arrow (PT-2a frame, readable by shape, no band pattern) sits at the view edge nearest the exit and points at it. It is vertically level with the exit's centre, clamped between 4 px below the HUD panel and 4 px above the bottom edge.
- **Idle animation (Should):** a slow shimmer on the doorway at most 2 Hz. None under reduced motion.

**Rejected parts**
- **Opening camera pan to the exit:** it delays control at every start and restart (pillar 3: fast retries), and the edge arrow gives the same information.
- **A cue on w0-02's drop-through pocket:** world 0 is an internal room and is not in level select (2026-11-03 ruling stands).

**Edge cases**
- The arrow is hidden on the first rendered frame in which any part of the exit tile is in view, and comes back when the exit leaves the view.
- Tandem: the exit arrow and the twin's body arrow can both show. They differ by shape (art test), and if they would overlap, the exit arrow moves 12 px toward the view's vertical centre.
- Pause, results and the death freeze show the arrow frozen as it was.
- The arrow is drawn above tiles and below the HUD, the Sticky Keys tip and overlays.

**Acceptance**
1. Unit (scene, pure helper, e.g. `exitCue(viewRect, exitRect, hudBottom)`): returns `null` when the exit rect overlaps the view by any amount; returns `right` or `left` with the clamped y otherwise; clamps y at both ends.
2. Screenshot of w1-04 (v2, 37 tiles wide) at spawn: the arrow is at the right edge at the exit's height. Holding right, it disappears as the exit enters view.
3. Screenshot of each world-1 level at spawn: the exit is the only white-framed object, and it is identifiable in greyscale.
4. Art test (M1-59/PT-2a): the exit arrow frame differs from both Tandem body arrows by shape in greyscale and carries no band pattern.
5. Reduced motion: no doorway animation.

---

## PT-3 · Show why you fell

**Why:** the first deaths in w0-02, w1-01 and w1-02 slid the player off screen with no cause shown, and "did it right but too slowly" read as a bug. Pillar 2: the rule must be visible at the moment it acts.

**Rule:** when a colored tile acts on you because of your color, that tile's run is highlighted and the HUD rings that tile's color cell, for **45 frames (0.75 s)** or until respawn or restart, whichever comes first. For a fall-through, this shows the color you needed. For a wall stop, it shows the color that stopped you.

**Triggers**
- **Must, fall-through:** the sim event `fallThrough { body, cells }` (T-07 ruling, `docs/tech/architecture.md` §3.2; amended 2026-11-13, there is no derived helper). It fires when a body goes grounded → airborne with no jump and a colored tile under its footprint. This covers walking onto a mismatched tile, letting go on a bridge (grace runs out) and shifting while standing on a bridge. `cells` gives the tiles to start the run from and their band, so the scene and HUD need no state diffing.
- ~~Should, airborne pass-through~~ **CUT 2026-11-16** (`decisions.md`): a falling body crossing a mismatched colored tile shows no cue, and there is no `passThrough` event. The ghost outline it passes is the cue, and the HUD drop pulse and drag bar (PT-4) already showed the color change in flight.
- **Should, colored wall stop:** a `wallStop` event whose blocking tile is colored (w1-05's red wall at red).

**What is highlighted**
- The **run**: the contiguous horizontal run of same-color tiles in the row under the feet that contains the tile(s) under the footprint (the bridge), capped at 12 tiles each side. For a wall, the vertical run of same-color tiles containing the contact tile.
- **Look:** the run draws its **solid** outline (not the ghost dashes) plus a 1 px ring in `ui.text`, held steady. The highlight never blinks, so it stays inside the 3-per-second flash cap and needs no reduced-motion variant. It shows under reduced effects too, because it is gameplay information.
- **HUD:** the cell of that tile's band gets the same 1 px `ui.text` ring for the same time, plus one brightness pulse like the drop pulse (no pulse under reduced motion; the ring stays). The lit cell, bracket and needle are unchanged.

**Edge cases**
- A new trigger replaces the current cue (one cue at a time per body).
- While grace is holding you there is no cue. The cue starts on the step the fall begins.
- An intentional drop through a colored floor (w0-02 pocket, later levels) shows the same cue. It is still true, so it is not noise.
- Walking off a ledge into an empty pit shows no cue (no colored tile under the feet).
- The cue runs on render time and survives the 400 ms death freeze. Respawn and R clear it.
- Tandem: the HUD ring goes on that body's strip. Tile highlights from both bodies may show at once.
- Replay mode shows cues as in play.

**Acceptance**
1. Unit ([sim] emits; scene maps the event's `cells` to a run over the level): blue body walking from P1 onto w1-02's green bridge → a `fallThrough` with band 2 cells, mapped to the bridge's run (cols 3–7 of row 9). A walk-off into an empty pit → no event, no cue. A jump takeoff from a bridge → no event, no cue.
2. Unit: let go on w1-01 bridge 1 → after grace, a `fallThrough` with band 1 cells, mapped to the run of bridge 1.
3. Unit (ui model): with a band-2 cue active, the model reports ring cell 2. After 45 frames, or on respawn, it reports none. The pulse is off under reduced motion and the ring stays.
4. Screenshot (qa-tester), w1-02 holding right from spawn: during the fall the green bridge is outlined solid with the ring, and HUD cell 2 is ringed. Readable in greyscale.
5. Should: w1-05 arriving red → the red wall column is highlighted and cell 4 is ringed.

---

## PT-4 · The drag bar says what it does; no air-shift hint

**Why:** the playtester read the thin bar as a loading bar. A bar under the whole strip says nothing about where it leads.

**Rule (change):** the drag bar runs on the needle's axis, **from the needle toward the centre of the next lower cell** (`litBand − 1`). It fills that span by `min(airDistance / airDragTilesPerGear, 1)` and ends in a 3 × 5 px chevron pointing at the lower cell. When drag drops a gear, the needle snaps to where the bar ended (existing snap and pulse), so one drop teaches the bar. There is no word label (pillar 2). Visibility is unchanged: airborne only, band > `airDragMinBand`, hidden on the landing step.

**Fallback:** if this is not in the pixel HUD by M2-29, hide the drag bar entirely. An unexplained bar is worse than none; the drop pulse and needle snap remain.

**Air-shift hint: rejected.** Shifting is not possible in the air. A press is buffered and applied only if you land within 6 steps (GDD §4.10), so a hint saying "you can shift in the air" would teach a false rule. The pending-shift bracket already shows a buffered press. No glyph id, no producer sign-off.

**Acceptance**
1. Model: gear-4 flat jump. The bar spans needle → cell 3, its fill rises each step, and after the flight-step-30 drop it spans cell 3 → cell 2 from the carried remainder. It is null on the landing step.
2. Model: blue (band 1) or white flights → null (unchanged check 6 of `hud-gear-meter.md`).
3. Screenshot during a sprint jump: the bar runs left from the lit cell toward the cell below it, with the chevron. Readable in greyscale.
4. M2-30 question for the playtester: "What does the thin bar under the strip do?" Pass: the answer is "it shows when I'll lose a gear in the air" or something close.

---

## PT-5 · Show that speed is still building

**Why:** in w1-03, cell 4 had the bold bracket while the player was still yellow, and "4 is lit, why am I yellow?" read as a bug. In the M1 HUD the unlit red checker is nearly as bright as a lit cell, and the bold white bracket makes it look lit.

**Rule (change):** the selected-gear bracket is drawn **thin** (1 px, dimmed, `ui.textMuted`) while its cell is not the lit cell. It turns **bold** (today's frame) on the step the lit cell reaches it ("arrived"). Unlit cells use the ghost treatment (no fill, dashed rim, pattern visible), so the **lit cell is the only filled cell**. The M1-29 ruling stands: no distance-to-go is shown (pillar 1).

If ui-engineer's PT-5 test finds that `litBand` ever differs from `state.band`, that is a bug: fix it in the model. The rule above applies either way.

**Edge cases**
- Standing: white is lit, and the bracket on the remembered gear is thin. Walking in gear 1: blue is lit and the bracket is bold.
- Braking or skidding below the bracket's gear: thin until you are back at it.
- In the air, gear follows color down, so the bracket and the lit cell usually agree (bold). A pending-shift bracket stays dashed, as today.
- Wall stop: white is lit, and the bracket is thin.

**Acceptance**
1. Model: gear 4, grounded, band 3 → `arrived false`; band 4 → `true`; standing in gear 1 → `false`; walking in gear 1 → `true`.
2. Model (from the PT-5 investigation): for a w1-03 state with gear 4 and band 3, `litBand` is 3.
3. Screenshot w1-03 mid-ramp: cell 3 is filled and cell 4 has a thin bracket. At red: cell 4 is filled with a bold bracket. In greyscale a viewer can name the lit cell when the bracket is elsewhere.
4. `hud-gear-meter.md` checks 11 and 12 still pass. The thin bracket is exempt from the 3:1 bracket rule, but it must be at least 3:1 against the panel when bold.

---

## PT-6 · Widen the tight windows (level geometry)

**Fairness floor (new level rule, level plan v3.3):** every level has at least one winning line in which each timed input has a window of **at least 30 steps (0.5 s) in world 1**, or **at least 18 steps (0.3 s) from world 2 on**, or is a position choice at walking pace with at least 1 tile of valid spots. Windows are measured as in `levels/README.md`: move one input with the others fixed. Other intended lines keep the old floor of 12 steps. The ±3-step robustness test stays the build gate.

### w1-02 Shift (v2) and w1-01 First Steps (v2): pad P2 3 → 4 tiles
Today the shift-down window is 43 steps, but the last 0.39 tiles of the 3-tile pad fail (blue comes 0.78 tiles after the press), and the pad reads as smaller than it is. Instructions:
- **Insert one safe column into P2:** P2 becomes cols 8–11. The second bridge moves to cols 12–17 and its roof moves with it (rows 0–6, flush with the bridge ends). Cols 8–11 stay open sky. The exit pad and `E` move one column right. The grid is 24 wide.
- **Hints unchanged:** `shiftUp 1 6`, and `shiftDown 9 6`, whose box (cols 8–10) now sits over the first three pad tiles, where pressing works.
- **Targets (w1-02):** shift-down window (walk held) **≥ 50 steps** (expected about 53), let-go window **≥ 45** (expected about 47), shift-up unchanged. Removal test, cheese sweep and ±3 pass.
- **w1-01 gets the same insertion** so the two rooms stay identical (the "spot the difference" premise). Its lesson does not depend on P2's width. Re-record it, and update its "dies exactly when wholly on a bridge" x ranges.
- Bump `version` to 2 on both. Update `Fastest known`.

### w1-04 Brake (v2): middle pad 6 → 8 tiles
Today the running window is 27 steps (0.45 s), and pressing in the back 2.7 tiles of the pad fails. The early edge is set by the red bridge's grace, so only the pad's length can move the late edge.
- **Insert two safe columns into the pad:** the pad becomes cols 13–20 (open sky). The blue bridge becomes cols 21–32 (still 12 tiles, still no roof). The exit pad becomes cols 33–36, with `E` at col 35. The grid is 37 wide.
- **Targets:** running shift-down window **≥ 35 steps** (expected about 37: +2 tiles at 12 tiles/s), let-go window **≥ 32** (expected about 34). If either falls short, make the pad 9 tiles.
- **Re-check:** "sprint, jump, never brake" lines still win 0 times, no line skips the blue bridge, and the removal tests still hold. Fix the x-range mismatch between the file comment (11.3–16.5) and the README (11.1–16.3).
- Bump `version` to 2. Update `Fastest known`. The exit is now off screen at spawn by 7 tiles, which PT-2's arrow covers.

### w1-05 Red Wall: geometry unchanged; record the timing-free line
The yellow-press window (19 steps, 0.32 s) cannot widen without breaking the lesson. The wall-face-to-bridge distance D is 2 tiles. A wall-stopped red player stands 0.75 tiles before the face and has D + 0.75 = 2.75 tiles to re-ramp, which must stay under red's 3.23. D = 3 gives 3.75, so bumping the wall would cost nothing and the wall could be ignored (pillar 4). The level is still fair (pillar 3) because two lines need no tight timing:
- **Standing start:** stand 0.7–3.6 tiles before the wall face in gear 4 and hold right (2.9 tiles of spots). After a wall stop, this is "back up a little", which is w1-03's skill.
- **Green cruise, two presses:** 29 steps.

Instructions:
- No grid change and no version bump.
- In `levels/README.md`, record as the w1-05 fair line: (a) the let-go window for walking in gear 1 to a standing-start spot, then shifting to 4 and running (target **≥ 30 steps**; about 58 expected at 3 tiles/s); (b) from a wall stop in gear 4, the range of left-hold lengths (then let go, then hold right) that wins.
- If (a) is under 30 steps, report it to design-lead before changing anything.

---

## PT-7 · Win card: NEXT is the primary action

**Rule:** on a win, the results panel (`results.md`, M2-12) shows NEXT focused. **Enter or Space chooses it**, **R** is RETRY, **Esc** is LEVELS. The M1 banner, with its "press R" line and its "Enter: next level" stand-in, is removed when the panel lands. Nothing on a win screen names R before NEXT.

**Defer, no interim change:** the banner is replaced in M2-12, and the M1 build is internal.

**Acceptance:** `results.md` checks 1, 6, 7 and 9, plus: in a screenshot of the results panel, the first and focused item is NEXT and no text says "press R".

---

## Scene spec gaps (requests 2026-11-04, answered here)

1. Results beat and key-ignore: built with the panel in M2-12, as `results.md` says. Accept the interim behaviour.
2. M1 banner in `?replay=1`: keep it until M2-12 (QA reads it through M1-57). The panel will not show in replay.
3. Blur after the win step does not pause: accept (nothing is running).
4. R while paused is fed as one restart press after resume: accept (the recording matches R in play).
5. Unknown `?level=`: w1-01 plus the message (PT-1). The title after M2-11.
6. A replay load consumes the session's tip first-start: accept (replay is QA-only after M1-54).

## Tuning

None. PT-6 is geometry only. The cue timings (45 frames, 2 Hz) are UI constants with their owners, not gameplay numbers.
