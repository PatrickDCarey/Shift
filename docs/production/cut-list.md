# Cut list

Pre-ranked: cut from the top first. **Must** items are never cut by the producer; they go to the user. Triggers are checked at each milestone gate. Nothing in the Could and Should sections has been cut except what is listed under "Already cut". Updated 2026-11-03 for GDD v1.4 (Tandem), level plan v3.0 and art direction C.

## Never cut (Must, and protected small items)
- Core rules (GDD §4), **worlds 1–3 = 14 levels** (5 + 4 + 5; world 3 is Tandem), HUD gear meter, title and level select, color-blind patterns (and shape differences for the twin), itch.io web build, itch.io page copy (design-lead, M4).
- **Alternate gear bindings (Q/E, Z/X) in M1 and the one-time Windows Sticky Keys tip in M2.** Only the free key-remap screen is cuttable.
- **Band-drop flash and clunk on air drag** (mitigation for D-3). Cut only if playtests show drag reads fine without it.
- **Onboarding hint glyphs in w1-01 and w1-02** (M2-36, M2-41). Pillar 2.
- **Offline-first behaviour.**
- **Every level ships with a recording, and the replay and ±3-step tests stay green.**

## Already cut (2026-11-03, `mechanics-review.md`)
Mud, boost pads, conveyors, moving platforms, crates, afterimage ghosts, tint gates, springs, crumble floors, speed limits, one-way floors, the Doppler tint shader (replaced by pixel effects), the world 5 and old world 4 levels. Speed gates and ice are Should (world 4); they are Must only if the Tandem decision gate fails.

## In cut order if we slip

### Could (cut first)
1. **Hidden "ultraviolet" reverse gear.** Not on the board.
2. **Level timer medals.** Not on the board; best times already shown.
3. **Ghost replays of top runs.** Not on the board.
4. **Replay validation in the edge function (v2).** Keep the v1 floor-time checks.
5. **Free key-remap screen.** Not scheduled; add only if M3 has slack.
6. **Mirrored twin** (a Tandem variant that mirrors input; GDD v1.4 lists it as Should for world 4). Not on the board. Post-jam.

### Should
7. **World 4 Ice** (G-6 w4-04 and the ice spec M2-02, ice sim). Trigger: the Tandem sim is not in Review by Nov 14, or M2 is behind. The spec and the level go first because half its puzzles collapse into "enter at color X".
8. **World 4 Gates, the rest** (G-1..G-7, w4-01 to w4-03). Trigger: Nov 16 decision, or Tandem scene (T-20) not in Review by Nov 16. This frees about 20 engineering hours. If the Tandem gate fails these are not cut; they are the plan.
9. **Reduce the M3 pixel effects** (M3-18) to the afterimages and the reduced-effects path; drop speed lines and dust. Trigger: M3 gate more than one day behind. The band-drop flash stays.
10. **Per-level online leaderboards** (fall back to local best times). Trigger: `USER-2` not done by Nov 17, or the backend not working by Nov 20. Offline-first design means the game ships fine without it.
11. **Adaptive music beyond a filter** (low-pass and pitch glide only). Last Should to be touched, and only reduced.

### Pixel-cutover slip responses (before any Must is touched)
- **PX-1..3 not in Review by Nov 7 end of day:** the cutover starts Nov 9 instead of Nov 8. Tandem scene work waits; Tandem sim and levels continue (they do not need the renderer).
- **Cutover not landed by Nov 11:** reduce it to the pipeline: PX-4 (480×270, integer zoom), PX-6 (tilemap), PX-7 (player sprite, camera) and PX-8; the HUD stays on the current meter at half size by tech-lead's compact variant only if PX-9 is the blocker. The M2 menus are built at 480×270 regardless. M2-15 (horizon, exit pulse, wipe) shrinks to the exit and ghost contrast fixes.
- **Cutover not landed by Nov 13:** escalate to the user. The alternatives are shipping M2 on the old renderer and doing the pixel look as an M3 task after the gate, or dropping to the cheaper option (B Flat Poster, no bitmap font) in the art-director's style frames. This is a user decision (Must scope: the art direction).

## Triggers tied to this plan
- **Tandem decision gate, Nov 12:** checks 1–12 of `tandem.md` pass or world 3 reverts to gates (G tasks become Must, Tandem tasks T-20, T-05, T-06, T-21 and the Tandem levels are replaced). Decided by the producer on qa-tester's T-13 report.
- **Tandem passes but the scene or levels are late at M3 (Nov 18):** first cut items 7–9 above. Then escalate to the user: world 3 at four levels (w3-01 Two Lanes, w3-02 Out of Step, w3-03 Gear Split and the finale w3-05), dropping w3-04 Clamp (Must scope, 13 Must levels).
- **M2 levels behind at Nov 13:** cut item 7 and 8's design time first; then ask the user before reducing world 2 (it would cut a Must level). `M2-19..M2-22, M2-45` start Nov 4 and have no engineering dependency, so a slip here means the level-designer is the bottleneck.
- **M1 not met by Nov 8:** nothing to cut (all Must). The response is to shrink M1-28 to the HUD and D-questions and move packaging, schema and audio engine (M1-18, M1-19, M1-24) to M2 without holding the gate. M1 is already met in code; this trigger only fires on verification.
- **Voter-reach risk (R3):** if the M2 playtest says a 10-minute player does not reach level 10, M2-31 moves Two Colors after w3-01 or trims world 1 to four levels (a Must-count change from 14 to 13, so the user is told).

## Re-plan 2026-11-13 (8 days lost, Nov 6–12): proposed cuts, owner decides
Never cut: any Must. Proposed now, in order, because the M3 gate moved to Nov 25 (A) or Nov 26 (B):
1. **World 4 entirely** (items 7 and 8: G-1..G-7, ice spec M2-02, w4-01..w4-04). Cut now, not at a trigger; it is the only way to keep Tandem and the cutover in the same 12 days. Not cut if the Tandem gate falls back to gates (then G tasks are Must).
2. **M3-18 reduced** (item 9): afterimages and the reduced-effects path only; no speed lines or dust. The band-drop flash stays.
3. **Leaderboards stay Should** with a hard trigger: `USER-2` not done by Nov 17 means local best times only (item 10).
4. **Could items 1–6 stay off the board;** the world-1 roof-band art idea (design-lead, 2026-11-05) is Could and cut.
5. **Tandem gate is extended once, to Nov 16, final.** If checks 1–12 do not pass that day, world 3 reverts to gates (Must); no second extension.
Escalation if the M3 gate (Nov 25/26) slips a further day: world 3 at four levels (drop w3-04 Clamp, 13 Must levels), the owner's call. M2 menus are not cut.

## Escalation
If cutting items 1–11 and the pixel responses still leaves M3 behind, the producer reports a Must-scope decision to the user: world 3 at three or four Tandem levels (11 or 13 Must levels), or reverting to the gates world. The producer does not decide that alone.
