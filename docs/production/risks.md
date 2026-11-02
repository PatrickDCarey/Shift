# Top 5 risks

Reviewed at every milestone gate. Likelihood and impact are H/M/L.

| # | Risk | L / I | Mitigation | Owner |
|---|---|---|---|---|
| R1 | **Tuning does not feel good.** Speed ramp, air drag and the color grace are the whole game. If the 1.25 tiles per gear and 4 tiles of drag feel wrong, all levels have to be redone. | M / H | Everything is in `tuning.json`, so changing it costs minutes. The first playtest and tuning pass (M1-28, M1-29) run before any level beyond the grey-box room exists. Lock the numbers at the M2 gate: after that, changes need a decision in `decisions.md` and a replay re-run. Solutions must survive ±3 steps of timing slop, so small tuning changes do not break levels. | design-lead |
| R2 | **Level content volume.** 12 Must levels plus 8 Should levels, each needing a recording, solved by one agent in about three weeks. | H / H | Levels are two per task and start as soon as a mechanic exists. World 3 specs are written in M2 so tiles land in the first days of M3. The cut-list is pre-ranked (World 5, then crates, then World 4 trimmed). Decision date: Nov 19. Replay test catches broken levels automatically. | level-designer |
| R3 | **`src/core` is a single lane.** Only gameplay-engineer may edit it, so M1 (10 tasks) and the World 3–5 tiles are serial. One slow task moves everything behind it. | M / H | Tasks are one sitting each; specs land before engineering starts; tech-lead reviews in groups so review does not stall the lane. If the lane slips by more than a day, ask tech-lead to split `src/core` into two owned sub-areas (for example movement and tiles) so two gameplay-engineer runs can proceed in parallel. | producer |
| R4 | **Supabase setup needs user credentials.** Backend work cannot be verified end to end until the user makes a project. | M / M | The schema and RLS are written in M1 with a copy-paste setup README (M1-19). The client is a no-op without env vars. The user is asked by Nov 14 (`USER-2`). Fallback: ship offline with local best times (cut-list rank 9). | backend-engineer |
| R5 | **Solo-user review bandwidth.** One person approves repo creation, accounts and the final submit, and cannot watch eleven agents. | M / M | The user needs only four short gate summaries (Nov 8, 15, 22, 28). All user-only tasks are listed with dates at the top of the board. design-lead has final say on feel, and tech-lead is the review gate, so the user does not approve individual levels or code. | producer |

## Watch list (not top 5)
- **Windows Sticky Keys** interrupts play after five Shift presses. Mitigated by the alternative bindings preset and the one-time tip (M2-13). QA checks on Windows (M2-29). Owner: ui-engineer.
- **Determinism drift** from floating-point maths or hidden state would break the replay test and leaderboards. Guard rails are in M1-04 and M1-13. Owner: tech-lead.
- **Browser audio autoplay and iframe focus** on itch.io. Covered by M1-17, M1-24 and the embed check in M4-15. Owner: ui-engineer.
- **Ownership gaps:** `README.md`, `LICENSE`, `CREDITS.md`, `.gitignore` and the itch page copy have no owner in `CLAUDE.md`. Assigned to tech-lead (repo files) and design-lead (page copy). Needs the user's nod to add to `CLAUDE.md`.
