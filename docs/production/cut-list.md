# Cut list

Pre-ranked: cut from the top first. **Must** items are never cut by the producer; they go to the user. Triggers are checked at each milestone gate. This list says what is *candidate* to cut; nothing has been cut yet. Updated 2026-11-02 for GDD v1.1 (hold-to-move) and the user's scope decisions.

## Never cut (Must, and protected small items)
- Core rules (GDD §4), **worlds 1–3 = 13 levels** (4 + 4 + 5), HUD gear meter, title and level select, color-blind patterns, itch.io web build, itch.io page copy (design-lead, due M4).
- **Alternate gear bindings (Q/E, Z/X, all active at once) in M1 and the one-time Windows Sticky Keys tip in M2.** User decision 2026-11-02: both are Must (`CLAUDE.md` hard rules, GDD §3 and §10). Only the free key-remap screen is cuttable (Could, rank 5).
- **Band-drop flash and clunk on air drag** (GDD §11, M2-15 and M2-17). Cheap, and it is the mitigation for D-3 (stepwise drag reading as a bug). Cut only if the M1/M2 playtests show the drag reads fine without it.
- **Onboarding hint glyphs in w1-01 and w1-02** (M2-36, M2-39). Pillar 2 (readable without text).
- Offline-first behaviour (the game must work with no network).

## Could (cut first)
1. **Hidden "ultraviolet" reverse gear.** Cost: a new rule, new tiles, levels and tests. Benefit: small secret for the Innovation score. Cut unless there is slack after M3. (Not on the board.)
2. **Level timer medals.** Cost: tuning of the thresholds per level, UI and save. Benefit: replay value. Local best step counts (kept) cover most of it. (Not on the board.)
3. **Ghost replays of top runs.** Cost: replay storage on the backend, playback rendering, extra UI. Benefit: a showpiece for the leaderboard. (Not on the board.)
4. **Replay validation in the edge function (v2).** Not in the GDD list. Cost: running the sim in Deno and extra security testing. Benefit: cheat-proof times. Keep the v1 floor-time checks. (Not on the board.)
5. **Free key-remap screen** (GDD §10 Could; the fixed bindings and `withBinding`/`sanitizeBindings` helpers already exist from M1-16). Cost: capture UI, conflict handling, tests. Benefit: accessibility nicety; the fixed Q/E and Z/X bindings already solve the Sticky Keys problem. Kept last among the Could items because it is the cheapest. Not scheduled on the board; add it only if M3 has slack.

## Should (cut next, in this order)
6. **World 5 Afterimage (4 levels, ghost platforms).** Cost: new entity, expiry rules and 4 levels at the end of the serial `[sim]` lane. Benefit: strongest finale idea but least testing time. Trigger: World 3 not approved by Nov 19, or M3 gate more than 1 day behind.
7. **Crates in World 4 (keep the colour they were pushed at).** Cost: the most complex physics piece. Benefit: one extra idea. World 4 can run on conveyors and moving platforms alone.
8. **Rest of World 4 (conveyors, moving platforms, 4 levels).** Cost: 2 mechanics and 4 levels. Benefit: relative-speed puzzles. Trim to 2 levels before dropping it. Trigger: M3 gate behind by more than 2 days. Together with rank 6 this is the whole 8-level Should set of worlds 4–5.
9. **Per-level online leaderboards** (fall back to local best step counts). Cost: Supabase setup, edge function, UI and security review. Benefit: replay value, and an extra entry in the jam's "Innovation" story. Trigger: `USER-2` (Supabase) not done by Nov 17, or the backend integration is not working by Nov 20. Offline-first design means the game ships fine without it.
10. **Adaptive music beyond a filter** (cut to a low-pass filter and a pitch glide only, no layers). Cost: authoring and tuning. Benefit: the Audio score depends on it, so this is the last Should to be touched, and only reduced, not removed.

## Triggers tied to the v1.1 plan
- **M1 sim lane (M1-06 to M1-13) not done by Nov 6 end of day.** There is nothing to cut in M1 (all Must), so the response is not a cut: (a) tech-lead splits off a fourth core area for tile collision and color gating, (b) the playtest M1-28 moves to the morning of Nov 8 and M1-29 shrinks to the D-1/D-2/D-3 verdicts, (c) the debug overlay M1-15 is reduced to the `window.__redshift` hook. If M1 still misses Nov 8 by more than 2 days, it moves M2 and is reported to the user, because world 1–2 levels cannot be recorded without the sim.
- **Level lane (level-designer) behind at the M2 gate:** drop to 3 levels in world 2 only after asking the user (it would cut a Must level); first cut Should items 6 to 8 to free the engineers.
- **World 3 is five levels (a Must).** If the M3 gate is behind, cutting Should items 6 to 8 comes first; only after that is the Must-scope decision below raised with the user.

## Escalation
If cutting items 1–10 still leaves M3 behind, the producer reports it to the user as a Must-scope decision (for example, world 3 at 3 levels instead of 5, 11 Must levels in total, dropping the camera level w3-05 and the ice level w3-03 together with their tiles). The producer does not decide that alone.
