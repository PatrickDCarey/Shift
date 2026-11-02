# Redshift — Game Off 2026

**Redshift** is a puzzle-platformer for GitHub Game Off 2026 (theme: **SHIFT**). Your pace sets your color, and colored geometry is only solid when your color matches it. Left Shift and Right Shift change gear. The puzzles are about where and how fast you move.

- **Jam deadline:** submissions close **2026-12-01 13:37 PST (21:37 UTC)**. Studio target: submit **2026-11-30**.
- **Jam rules:** source in a **public GitHub repo**, pushed before the deadline. Game submitted on itch.io.
- **Repo:** https://github.com/PatrickDCarey/Shift (private during development; **must be made public before submitting**).
- **Stack:** Phaser 3 + TypeScript + Vite. Vitest for unit tests, Playwright for end-to-end. Supabase for leaderboards (optional at runtime).
- **Design source of truth:** `docs/design/gdd.md`.

## Studio roster

Agent definitions live in `.claude/agents/`.

| Agent | Role | Owns |
|---|---|---|
| `producer` | Lead: schedule, board, scope | `docs/production/**` |
| `design-lead` | Lead: game design, final say on feel | `docs/design/**` (incl. itch page copy in `docs/design/itch-page.md`), `src/data/tuning.json` |
| `tech-lead` | Lead: architecture, review gate | `docs/tech/**`, `src/core/types.ts`, `src/core/contracts/**`, `src/core/index.ts`, project config, CI, `index.html`, `src/main.ts`, `src/scenes/keys.ts`, `src/vite-env.d.ts`, `tests/arch/**`, `tests/levels/**`, `README.md`, `LICENSE`, `CREDITS.md`, `.gitignore`, `.gitattributes` |
| `gameplay-engineer` [sim] | Frontend: state, step order, jump, collision, color gating, reset | `src/core/sim/**` |
| `gameplay-engineer` [motion] | Frontend: pure speed maths (ground speed, bands, air drag) | `src/core/motion/**` |
| `gameplay-engineer` [level] | Frontend: level parser, solution codec, replay | `src/core/level/**` |
| `gameplay-engineer` [scene] | Frontend: game scene, input sampling | `src/scenes/GameScene.ts`, `src/entities/**` |
| `ui-engineer` | Frontend: menus, HUD, settings, saves | `src/ui/**`, menu scenes, `src/save/**` |
| `backend-engineer` | Backend: leaderboards, release | `backend/**`, `src/net/**`, build/deploy scripts |
| `level-designer` | Design: levels and puzzles | `levels/**` |
| `art-director` | Design: visuals, shaders, accessibility | `src/data/palette.json`, `src/fx/**`, `assets/art/**`, `docs/art/**` |
| `audio-designer` | Design: adaptive music, SFX | `src/audio/**`, `assets/audio/**` |
| `qa-tester` | QA: correctness, regression | `tests/e2e/**`, `docs/qa/**` |
| `playtester` | QA: fresh-eyes experience | `docs/playtests/**` |

## Pipeline

1. **producer** turns milestones into small, single-owner tasks on `docs/production/board.md`.
2. **design-lead** writes the feature spec (`docs/design/features/`) before engineering starts on it.
3. **tech-lead** approves the approach for anything touching architecture or shared types.
4. **Engineers** implement, test first for logic in `src/core`.
5. **tech-lead** reviews the change.
6. **qa-tester** verifies acceptance criteria and runs the full suite.
7. **playtester** plays it fresh; **design-lead** decides what changes.

A task is **Done** only after steps 5 and 6 pass.

## Ownership

Only edit files in your own area. If you need a change somewhere else, add a line to `docs/production/requests.md` (who, what, why) and mention it in your report. Agents working in parallel must never share an area.

`gameplay-engineer` runs as up to four separate sittings, one per lane. Lanes talk only through the contracts in `src/core/contracts/lanes.ts`; the only allowed cross-lane import is sim → motion via `src/core/motion/index.ts`. Code outside `src/core` imports only `src/core/index.ts` or `src/core/types.ts`. Arch tests enforce this.

**No case-only filename differences.** This repo is developed on Windows, where `foo.ts` and `Foo.ts` are the same file. `tests/arch/path-case.test.ts` enforces it.

## Hard rules

- **Deterministic simulation.** Game rules live in `src/core/` as plain TypeScript: no Phaser imports, fixed 60 Hz step, no `Math.random`, no `Date`. Same level + same inputs = same result, always.
- **Data-driven.** Gameplay numbers only in `src/data/tuning.json`; colors and patterns only in `src/data/palette.json`; levels only in `levels/`.
- **Every level ships with a solution recording.** An automated test replays each one; an unsolvable level fails the build.
- **Color is never the only signal.** Every gear also has a distinct pattern or glyph.
- **Alternate gear bindings are Must.** Q/E and Z/X shift gears as well as the Shift keys, plus a one-time Windows Sticky Keys tip. Only a free key-remap screen is cuttable.
- **License.** Code is MIT (`LICENSE`). Third-party assets must be CC0 or compatible and listed in `CREDITS.md`.
- **Offline first.** Leaderboard failures never block or slow down play.
- **Secrets.** Only the Supabase URL and anon key may reach the client. No keys in the repo; `.env` is git-ignored, `.env.example` is committed.
- **itch.io build.** 960×540, runs in an iframe from a zip, keyboard-only playable.
- **Scope.** Anything beyond the GDD's *Must* list needs producer sign-off.
- **Quality bar.** `src/core` coverage ≥ 80%. Functions under ~50 lines, files under ~400.

## Milestones

| Date | Milestone | Done when |
|---|---|---|
| Nov 8 | **M1 Grey-box** | One room: gears, acceleration over distance, color-gated tiles, air drag, safe tiles. Deterministic sim with tests. |
| Nov 15 | **M2 First worlds** | Level loader, solution replay test, worlds 1–2 (8 levels), HUD gear meter, title and level select. |
| Nov 22 | **M3 Content complete** | Worlds 3–5, leaderboards live, adaptive audio, palette and shaders. |
| Nov 28 | **M4 Freeze** | Polish and bug fixes only. itch.io page ready. |
| Nov 30 | **Submit** | Public repo pushed, game live on itch.io, entered in the jam. |

## Commands

Node ≥ 22.12 (`.nvmrc`). Run from the project root.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (CI uses `npm ci`). |
| `npm run dev` | Dev server with hot reload at http://localhost:5173. |
| `npm run build` | Production build to `dist/` (relative paths; zip the folder's contents for itch.io). |
| `npm run preview` | Serve `dist/` at http://localhost:4173. |
| `npm run typecheck` | `tsc` on browser code (`tsconfig.json`) and configs/tests (`tsconfig.node.json`). |
| `npm test` | All unit + architecture tests once (Vitest). |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run test:coverage` | Tests with v8 coverage; fails if `src/core` < 80%. HTML report in `coverage/`. |
| `npm run test:e2e:install` | One-time: download Playwright's Chromium. |
| `npm run test:e2e` | Playwright against a fresh build + preview server. |
| `npm run check` | typecheck + coverage + build: run before calling a task done. |

Single test file: `npx vitest run src/core/types.test.ts`. Level solvability only (every `levels/*.txt` replayed with its solution): `npx vitest run tests/levels`. Tech docs: `docs/tech/architecture.md`, `docs/tech/level-format.md`.
