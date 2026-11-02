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
- [OPEN] 2026-11-02 from: orchestrator to: tech-lead — what: add `.gitattributes` (`* text=auto eol=lf`) and make the level parser tolerate `\r\n` — why: this machine has `core.autocrlf` on; CRLF in `levels/*.txt` or solution files must not change parsing or replays — task: none
- [TRIAGED] 2026-11-02 from: tech-lead to: design-lead — what: confirm whether alternate gear bindings (Windows Sticky Keys) move from Should to Must — why: five Shift presses opens an OS dialog — task: user approved Must on 2026-11-02 (CLAUDE.md hard rules); design-lead to update GDD scope
- [OPEN] 2026-11-02 from: design-lead to: tech-lead — what: update `Tuning`/`SimState` types and architecture.md for hold-to-move (GDD v1.1): gears 1–4 via new keys `minGear`/`startGear`, `instantMaxGear` replaces removed `pivotMaxBand`, wall stops keep the gear, sim tracks direction priority and facing, step order is GDD §4.14; also fix the level-format w0-01 example text (runs now start in gear 1 and walking is instant) — why: user switched the control model to hold-to-move — task: none
- [OPEN] 2026-11-02 from: design-lead to: gameplay-engineer — what: implement the rewritten M1 specs in `docs/design/features/` (hold-to-move movement, air commitment, reset to gear 1); acceptance numbers changed — why: control model change (GDD v1.1) — task: none
- [OPEN] 2026-11-02 from: design-lead to: ui-engineer — what: bind Q/E and Z/X to shift down/up alongside the Shift keys (all active at once); HUD gear meter shows selected gear 1–4 (no 0) next to the current band; one-time Windows Sticky Keys tip at first level start, saved, non-blocking; onboarding glyphs (arrows in w1-01, Shift/E/X in w1-02) — why: alternate bindings and tip are now Must (GDD §3, §11) — task: none
- [OPEN] 2026-11-02 from: design-lead to: qa-tester — what: M1 acceptance criteria in all five feature specs were rewritten for hold-to-move; use the new test conventions in movement-and-gears.md — why: control model change — task: none
- [OPEN] 2026-11-02 from: design-lead to: level-designer — what: level plan v1.1: w1-01..w1-04 and w2-01 changed, ids now `w1-01` style, new runway numbers (red needs 4 tiles, deny with 2.5) — why: hold-to-move changed ground numbers — task: none
- [OPEN] 2026-11-02 from: design-lead to: art-director — what: ignore "grey and white tiles that clearly differ" from my earlier line; there is one safe tile kind (`#`), drawn white/grey — why: matches the level format — task: none
- [OPEN] 2026-11-02 from: design-lead to: producer — what: scope change: alternate gear bindings (M1) and the Sticky Keys tip (M2) are Must, key-remap screen is Could; `docs/design/itch-page.md` is a design-lead deliverable due M4 — why: user decisions 2026-11-02, GDD §10 — task: none
