# Feature: restart prompt in a sealed pocket

_Owner: design-lead. Written 2026-11-19 from the batch 6 cold playtest (`docs/playtests/2026-11-18-batch6.md`, top change 1; `decisions.md` 2026-11-19). Builder: **gameplay-engineer [scene]** (`src/entities/`, `src/scenes/GameScene.ts`). GDD: pillars 2 and 3, §4.12. Related: `clarity-fixes.md` PT-3 (the "why you fell" cue), `onboarding-hints.md` (key-cap look), `sticky-keys-tip.md` (card placement), `features/tandem.md` "Level rules" (pockets). **Render-only: no sim, contract or level-format change.** **Amended 2026-11-20** (batch 7 playtest, `decisions.md` 2026-11-20): the card is drawn at 2× with a 2 px white (`ui.focus`) outline. At 1× it read like a tile label on the lower lane's slab._

## Why

w3-02 and w3-03 close a pocket in the divider so a fallen runner cannot finish in the twin's lane. A body in a pocket can never get out, so the run is lost, but nothing on screen says so. The playtester waited 12 s with no cue and found R only because it had read the controls screen. A voter who never opened Controls sits there or quits.

## Rule

When a body that is not home has been inside a **sealed pocket** for 1 s, a small card `[R] RESTART` appears at the bottom of the screen. It stays until the run restarts or respawns, or the level is left. Nothing else changes: the sim keeps running, and only the player's R (or Pause > RESTART) restarts.

## Sealed pocket (pure helper)

Computed once per level load by a pure, unit-tested helper in `src/entities/` (for example `sealedPockets(level)`), from the level grid alone:

- Take the 4-connected regions of cells that are `.`, a spawn (`@`, `&`) or an exit (`E`). Safe tiles, colored tiles (`B G Y R`) and gate tiles are boundaries. Colored tiles count as boundaries even though a body can pass them, because that is how a body falls in.
- A region is a **sealed pocket** if it contains no spawn and no exit cell, and none of its cells is in the grid's top row or bottom row. A region that reaches the bottom row is a pit (the body falls out and respawns). A region that reaches the top row is open sky.
- A body is **in** a pocket on a step when the cell holding its centre point (x, feet − 0.75 tiles) belongs to that region.

Shipped levels (acceptance 1): exactly one pocket in w3-02 (rows 7–9, cols 10–25) and one in w3-03 (rows 7–9, cols 25–34). No other shipped level has one. If a future level's helper output differs from what its designer intended, the level is fixed, not the helper.

## When it appears and clears

- **Appears** on the first rendered frame after any non-home body has been in the same sealed pocket for **60 consecutive sim steps** (1 s at `stepHz` 60). The steps are counted from the sim's own step counter, so pause and the death freeze behave exactly like the sim. The 1 s lets the fall cue (0.75 s, PT-3) play first, and stops the prompt firing on a body that only passes through.
- **Clears** on restart (R, or Pause > RESTART), on respawn after a death (for example the twin falls out while the runner is stuck), when the level is left, or on the first step no non-home body is in a pocket (unreachable in shipped levels, but it keeps the card honest).
- **Pause and results** are scenes drawn over the game, so they cover the card. On resume it is still there.
- One card per run, whichever body is stuck. R restarts both bodies, so the card does not say which one.

## Look and placement (480×270)

- **Drawn at 2× (2026-11-20).** The 1× card (64 × 19 px) read as a tile label in the batch 7 playtest. Every part below is the 1× design doubled with nearest-neighbour, on whole pixels.
- One row: a key cap for the `restart` action, generated from `DEFAULT_BINDINGS` (today `[R]`). At 1× it uses the cap look of `onboarding-hints.md` (`ui.panel` fill, 1 px `ui.focus` outline, `redshift-5x7` label in `ui.text`, 11 × 11 px), then a 4 px gap, then the word `RESTART` in `ui.text`. It is the same label as the controls screen's row.
- On a panel in `ui.panel` with 4 px padding (1× units): **128 × 38 px with the shipped binding**. The panel edge is a **2 px `ui.focus` (white) outline**, not `ui.panelBorder`. White is the menu's focus color: it says "this is for you" and is the brightest UI color, while staying out of the band colors, which mean gears (a red card would read as "be red"). Integer pixels, at least 8 px inside every edge.
- **Placement**, decided when the card appears, with the Sticky Keys tip rule (`sticky-keys-tip.md`, `tipPlacement`): horizontally centred, 8 px above the bottom edge. If that would overlap any non-home body's sprite on screen, put it at y = 42 instead (just under the HUD). It never covers the HUD. If the Sticky Keys tip is showing, the card sits 4 px above the tip panel.
- Screen space, drawn above tiles, bodies and effects, below the HUD, the Sticky Keys tip and overlays.
- **Static:** no blink, no pulse, no fade. It is gameplay information, like the PT-3 cue, so it shows the same in full, reduced effects and reduced motion, and it is outside the flash cap.

## Edge cases

- **Single-runner levels:** the rule is generic, but no shipped single-runner level has a sealed pocket, so it never shows there. A fall into a pit is a death and a respawn, as today.
- **Body in a pocket on the win step:** impossible (a stuck body is never home). Results cover the screen anyway.
- **Replay mode:** shows as in play (QA watches replays).
- **World 0:** the helper runs; w0-02's drop-through pocket holds the exit, so it is not sealed.
- **Gates (world 4, Should):** gate tiles count as boundaries. If world 4 ships, its designer checks the helper output per level.
- **Why not auto-reset:** a scene-made restart would put an input in the recording that the player never pressed, take control away on a heuristic, and still not teach R, which every other level needs too.
- **The card covers lane tiles (2026-11-23, batch 8 playtest): accepted.** At the bottom centre it can cover part of the lower lane (w3-03's yellow floor). It shows only once the run is already lost, and it moves to y 42 whenever it would cover a body. No placement change.
- **Why not change the levels:** the pocket exists so the runner cannot land in the twin's lane and finish there (approved 2026-11-17). In w3-02 its floor is the twin's roof, so it cannot be opened to a death drop.

## Tuning

None. The 60-step delay is a UI constant owned by [scene] (it reads `stepHz` for the conversion), not a gameplay number.

## Acceptance

1. **Unit, helper:** on every shipped `levels/*.txt`, `sealedPockets` returns exactly one region for w3-02 (rows 7–9, cols 10–25), one for w3-03 (rows 7–9, cols 25–34), and none for the other twelve levels (w0-02 too). On inline grids: a `.` box closed by `#` on all sides gives one pocket; the same box with one `.` in the bottom row gives none; with an `E` or `@` inside, none; closed on top by `GGG` and on the other sides by `#`, one.
2. **Unit, timer:** a non-home body inside a pocket for 59 steps gives no card; at 60 it gives one. Restart or respawn clears it, and the count starts again from 0. Steps that do not run (pause) do not count. A home body never counts.
3. **Unit, placement (2026-11-20 size):** the card is 128 × 38 px with the default bindings, on integer pixels, within 8 px margins, with a 2 px `ui.focus` outline, and it never overlaps the HUD rectangle. Default spot: centred, top y 224 (8 px above the bottom). With a body at the bottom of the view it goes to y 42. With the Sticky Keys tip showing, it sits 4 px above the tip.
4. **Browser, w3-02 (qa-tester):** with the playtest's repro (`?level=w3-02`, hold Right 4.8 s, tap E, hold Right 4.5 s, release, tap Q, hold Left 0.9 s, release, hold Right 0.75 s then Space), the runner lands in the pocket and the card shows, centred at the bottom, at 2× with the white outline (compare `docs/playtests/evidence/b7-01-w3-02-restart-card.png`, the old 1× card). **Pass rule (2026-11-19):** count sim steps, not seconds: the card is absent while fewer than 60 consecutive steps have run with the runner's centre in the pocket (the count starts on the first step its centre is in a pocket cell, which can be mid-fall, before landing), and it is visible within 2 rendered frames of the 60th such step. Press R: the card is gone on the first frame of the new run, and `state.step` is back near 0.
5. **Browser, w3-03:** play the recorded solution until the twin is home (step 281), keep holding Right until the runner is wholly on its blue bridge, then release. "Wholly on" (2026-11-19): the **runner's** (body 0) `x` from the QA hook, in tiles, is the box centre, and `x ≥ 26` puts the box's left edge at 25.625 or more, clear of the last safe column (col 24, ends at x 25): the runner drops into the pocket and the card shows about 1 s later. Pause and resume: the card is still there. R clears it.
6. **Browser, no false card:** in w1-01 let go on a bridge (death, respawn) and in w3-01 let both bodies fall (death): no card at any point. Win w3-02 by its solution: no card at any point.
7. **Settings:** with reduced motion and with reduced effects on, the card looks the same as in check 4.
8. **Replay (hand check, ruled 2026-11-19):** play check 4's repro, then open the same level in `?replay=1` with that run's recording if the build can load it; the card shows as in play. No one is asked to make a shipped fixture: a recording that does not win cannot live in `levels/*.solution.txt` (the solvability test would fail it). qa-tester may automate it later with a fixture in `tests/e2e/**` (QA's area) only if the replay path can load one without a code change; otherwise it stays a hand check, recorded in the test plan. Checks 2 and 6 already cover the rule.

## Priority

**Must.** It is the playtest's first change and a clarity fix to Must levels, the same class as PT-2 and PT-3 (`clarity-fixes.md`), not new scope. Could: a matching muted line in the pause panel (`STUCK? R RESTARTS`), only if a later playtest still misses it.
