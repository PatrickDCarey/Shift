# Cross-team change requests

Anyone who needs a change outside their own area adds a line here and mentions it in their report. The producer triages open lines into board tasks.

Format (one line each, newest at the bottom):

`- [OPEN|TRIAGED|DONE|REJECTED] YYYY-MM-DD from: <agent> to: <agent> — what: <change wanted> — why: <reason> — task: <board id or none>`

Rules:
- Only the producer changes the status of a line.
- Keep it to one line. Put detail in the owner's own docs.
- Files with no owner in `CLAUDE.md` (`README.md`, `LICENSE`, `CREDITS.md`, `.gitignore`) go to tech-lead. Art and audio add credits here.

## Requests

- [OPEN] 2026-11-02 from: design-lead to: tech-lead — what: adopt the step order in GDD §4.13 and the tile kinds in §4.6 (empty, grey, white, four colors, exit, spawn facing); add every `src/data/tuning.json` key to the `Tuning` type — why: M1 acceptance numbers depend on the step order — task: none
- [OPEN] 2026-11-02 from: design-lead to: art-director — what: grey and white tiles that clearly differ; a pattern or glyph per gear color; a flash when air drag drops a gear — why: readability pillar; stepwise drag must not read as a bug — task: none
- [OPEN] 2026-11-02 from: design-lead to: audio-designer — what: a "clunk" SFX when air drag drops a gear — why: sells the stepwise drag — task: none
- [OPEN] 2026-11-02 from: design-lead to: producer — what: level plan is now 13 Must (world 3 has 5) + 8 Should = 21 levels; update board and cut list — why: level-plan.md rewritten — task: none
- [DONE] 2026-11-02 from: tech-lead to: producer — what: give `index.html`, `src/main.ts`, `src/scenes/keys.ts`, `src/vite-env.d.ts`, `tests/arch/**` an owner (proposed: tech-lead) in the CLAUDE.md roster — why: unowned files — task: none
- [TRIAGED] 2026-11-02 from: tech-lead to: design-lead — what: confirm whether alternate gear bindings (Windows Sticky Keys) move from Should to Must — why: five Shift presses opens an OS dialog — task: user approved Must on 2026-11-02 (CLAUDE.md hard rules); design-lead to update GDD scope
