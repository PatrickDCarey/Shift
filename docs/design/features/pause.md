# Feature: pause

_Owner: design-lead. Milestone: **M2** (M2-34). GDD: §4.12, §4.13. Builders: gameplay-engineer [scene] (M2-06: the pause flag freezes the sim accumulator; input masking; blur), ui-engineer (M2-12: the pause overlay). Navigation conventions: `menu-navigation.md`._

## Rule

Pressing **Esc or P** during play freezes the run and opens a pause menu over the dimmed level, with four items: **RESUME** (focused), **RESTART**, **CONTROLS** and **LEVELS**. Pressing Esc or P again resumes. While paused, no sim steps run, so the level time, the recording and the result are exactly what they would have been without the pause.

## Layout (480×270)

- The level stays drawn, frozen, under a 50% Bayer-dither overlay of `palette.ui.panel`. It is a dither, not a blur or alpha fade, to stay in the pixel style. The HUD stays visible and frozen (`hud-gear-meter.md`).
- A centred panel, at most 160 × 120 px, holds:
  - the level label and title at 1× (`1-3 RUNWAY`);
  - the current run time at 1× (`TIME 0:07.33`, from `state.step / stepHz`, formatted with `formatTime`);
  - the four items at 2×, 20 px apart.

## Edge cases

- **No catch-up.** On resume the step accumulator starts empty. A 5-minute pause must not run 18,000 steps on the next frame.
- **Keys held through the pause** (down at pause, still down at resume) count as held from the first step after resume, with no new press edge. Holding Right through a pause keeps you running.
- **Keys pressed while paused** are ignored by the game until they are released. This covers Space or Enter used to choose RESUME, a Shift or Q tapped in the menu, and the P that closes pause. The scene masks them out of the frames it feeds the sim, so the recording shows exactly what the sim got.
- **Keys pressed on the frame the pause opens or closes** (ruled 2026-11-17) belong to the overlay: they are dropped, never queued for the game. A Space pressed together with the Esc that opens pause does not jump, and nothing pressed with the closing Esc reaches the sim. Held keys still follow the rule above. **Which rule wins (ruled 2026-11-19, QA A-4):** "held through the pause" means down *before* the opening frame. A key that goes down on the opening frame (or while paused, or on the closing frame) is a pressed key, not a held one: it is ignored by the game until it is released and pressed again, even if it is still down at resume. So Right pressed together with the opening Esc and held through RESUME does not move the runner; Right held from before the Esc keeps running (check 4).
- **R while paused:** the same as RESTART. The run restarts as in GDD §4.12 and the pause closes. The recording keeps appending, as with R in play.
- **LEVELS:** abandons the run without saving anything, and opens level select focused on this level.
- **CONTROLS:** opens the controls screen. Esc there returns to this pause menu with focus on CONTROLS, still paused.
- **Focus loss** (canvas blur, window blur, tab hidden): the game **pauses automatically and drops every held key**. Browsers lose the key-up events while unfocused, so without this a held arrow would stick and run the player off a ledge (pillar 3). On return the pause menu is showing, and the player resumes deliberately.
- **Pause during the death freeze:** allowed. The freeze counts steps (`deathFreezeMs`), so it finishes after resume on the same step as without the pause.
- **After the win step:** Esc and P do nothing. The results screen owns the screen from that step on (`results.md`).
- **Sticky Keys tip visible:** pausing hides it while paused; on resume it comes back with the rest of its 12 s (amended 2026-11-13, B1; `sticky-keys-tip.md`). Quitting from the pause leaves it hidden.
- **Tandem:** nothing differs. Both bodies freeze.
- **Replay mode** (`?replay=1`): Esc and P pause the replay in the same way. RESTART restarts the replay from frame 0.
- **Audio** (Should): music ducks and low-passes while paused (audio-designer).

## Tuning

None. The time display reads `stepHz`.

## Acceptance

1. Hold Right at gear 4, then press Esc: `state.step` does not change over 120 rendered frames. Press Esc again and stepping continues from the identical state (deep-equal).
2. After 5 s paused, the first rendered frame after resume runs no more steps than a normal frame does (at most `MAX_STEPS_PER_FRAME`, and normally 1–2).
3. The recorder receives no frames while paused. The recording of a won run with pauses in it equals the frames the sim stepped, and replaying it gives the same `wonAtStep`.
4. Hold Right, pause, keep holding, resume: the player keeps running right, with no stop and no skid.
5. Pause, then press and hold Space to choose RESUME: no jump happens until Space is released and pressed again.
6. Pause, press Q, resume: the gear is unchanged.
7. R while paused: the run restarts (step 0, gear 1, at the spawn) and the pause closes.
8. LEVELS: level select opens focused on this level, and the save is unchanged.
9. CONTROLS, then Esc: back on the pause menu, still paused, and `state.step` unchanged.
10. Blur the window while holding Right: the game pauses. After refocus and RESUME, Right counts as held only if it is physically pressed again.
11. Pause during the death freeze, wait, resume: the respawn happens on the same sim step as in an unpaused run.
12. Esc on the results screen does not open pause.
13. Space and Esc pressed on the same frame during play: pause opens, and after RESUME (Space released first) no jump has happened (`state.step` and `vy` as before the pause).
14. (2026-11-19) Right pressed on the same frame as the opening Esc and held down through RESUME: after resume the runner does not move (`vx` 0) until Right is released and pressed again.

## Priority

- **Must:** freezing the sim with no catch-up, RESUME / RESTART / LEVELS, the held and pressed-while-paused key rules, auto-pause on blur.
- **Should:** CONTROLS from pause, the run time on the panel, the audio duck.
- **Could:** pause in replay mode.

## Amendment 2026-11-25: RESTART label while a post is lit (Should)

**Rule:** in a long level, while a checkpoint post is lit, the RESTART item reads **RESTART FROM START**; otherwise it reads **RESTART**. The behaviour does not change: both are R, a full restart (`checkpoints.md`). Reason: a cold player expected R to return them to the last post (`decisions.md` 2026-11-25 world-5 triage, item 4).

**Edge cases:** a post lit on the step you pause shows the long label. After R, no post is lit, so the next pause shows RESTART. Replay mode follows the replayed run's post state. The menu width must fit 18 characters at 2×; if it does not, use **RESTART LEVEL** in all levels instead.

**Tuning:** none. Text only, in the pause model; the lit-post state comes from the existing checkpoint state through `src/core/index.ts`.

**Acceptance:** 15. w4-05: pause before post A → RESTART; pass post A, pause → RESTART FROM START; choose it → spawn, step 0, then pause again → RESTART. 16. In a level without posts (w1-01) the label is always RESTART.

**Priority:** Should; cut at freeze if not merged.
