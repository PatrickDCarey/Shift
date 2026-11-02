# Cut list

Pre-ranked: cut from the top first. **Must** items are never cut by the producer; they go to the user. Triggers are checked at each milestone gate. This list says what is *candidate* to cut; nothing has been cut yet.

## Never cut (Must, and protected small items)
- Core rules 1–5, worlds 1–3 (~12 levels), HUD gear meter, title and level select, color-blind patterns, itch.io web build.
- Fixed alternative bindings (Q/E, Z/X) and the Windows Sticky Keys tip. It is a Should in the GDD, but it is cheap and without it Windows players can lose control of the game. Only the free-remap UI is cuttable (rank 8).
- Offline-first behaviour (the game must work with no network).

## Could (cut first)
1. **Hidden "ultraviolet" reverse gear.** Cost: a new rule, new tiles, levels and tests. Benefit: small secret for the Innovation score. Cut unless there is slack after M3.
2. **Level timer medals.** Cost: tuning of the thresholds per level, UI and save. Benefit: replay value. Local best times (kept) cover most of it.
3. **Ghost replays of top runs.** Cost: replay storage on the backend, playback rendering, extra UI. Benefit: a showpiece for the leaderboard.
4. **Replay validation in the edge function (v2).** Not in the GDD list. Cost: running the sim in Deno and extra security testing. Benefit: cheat-proof times. Keep the v1 floor-time checks.

## Should (cut next, in this order)
5. **World 5 Afterimage (4 levels, ghost platforms).** Cost: new entity, expiry rules and 4 levels at the end of the serial gameplay lane. Benefit: strongest finale idea but least testing time. Trigger: World 3 not approved by Nov 19, or M3 gate more than 1 day behind.
6. **Crates in World 4 (keep the colour they were pushed at).** Cost: the most complex physics piece. Benefit: one extra idea. World 4 can run on conveyors and moving platforms alone.
7. **Rest of World 4 (conveyors, moving platforms, 4 levels).** Cost: 2 mechanics and 4 levels. Benefit: relative-speed puzzles. Trim to 2 levels before dropping it. Trigger: M3 gate behind by more than 2 days.
8. **Free key-remap UI** (keep the fixed Q/E and Z/X presets). Cost: capture UI and conflict handling. Benefit: nice but not needed once the presets exist.
9. **Per-level online leaderboards** (fall back to local best times). Cost: Supabase setup, edge function, UI and security review. Benefit: replay value, and an extra entry in the jam's "Innovation" story. Trigger: `USER-2` (Supabase) not done by Nov 17, or the backend integration is not working by Nov 20. Offline-first design means the game ships fine without it.
10. **Adaptive music beyond a filter** (cut to a low-pass filter and a pitch glide only, no layers). Cost: authoring and tuning. Benefit: the Audio score depends on it, so this is the last Should to be touched, and only reduced, not removed.

## Escalation
If cutting items 1–10 still leaves M3 behind, the producer reports it to the user as a Must-scope decision (for example, worlds 1–3 at 9 levels instead of ~12). The producer does not decide that alone.
