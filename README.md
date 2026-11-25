# Redshift

A puzzle-platformer about pace, made for **GitHub Game Off 2026** (theme: **SHIFT**).

Your speed is your colour. Stand still and you're white; sprint and you're red. Coloured platforms are only solid when your colour matches them, so every puzzle is about where you speed up, where you slow down, and where you take off. Shift gears with the Shift keys while the world red-shifts around you.

- **Play:** _itch.io link coming soon_
- **Jam entry:** _Game Off 2026 link coming soon_
- **Built with:** Phaser 3, TypeScript, Vite

## What's in this build

- **25 levels in 5 worlds:** Gears (5), Flight (5), Tandem (5), where one throttle drives two runners at once, Motion (5) and Signals (5). The first level of each world is open; each other level unlocks when you clear the one before it.
- **Moving platforms** (world 4): grey lifts and shuttles carry anyone, and a coloured platform only holds a runner of its colour. You land on top and ride; riding never changes your speed or colour.
- **Bolts from launchers** (world 5): a coloured bolt only hits a runner of that colour, a white bolt only a runner standing still, and a grey bolt hits everyone. A launcher glows just before it fires.
- **The sweep:** in Outrun (4-4) and Chase (5-4) a front chases you from the left at a steady pace; anything it passes is gone, so you slow down only where you can afford to.
- **Long levels with checkpoints:** Long Haul (2-5), Commute (4-5) and Full Spectrum (5-5) run across many rooms and have checkpoint posts. After a post lights, a death sends you back to it while the clock keeps running; R restarts the whole level.
- **Local best times.** Your clears and best time per level are saved in your browser and shown on the level select and results screens. If the browser blocks storage, the game still plays and the title screen says progress is not being saved.
- **Settings** (from the title screen or the pause menu): Sound, Reduced motion and Reduced effects, each on or off and saved at once. Reduced motion follows your system setting until you change it.
- **Plays offline.** Nothing needs a network connection. Online leaderboards are optional and are not enabled in this build.

## Controls

| Action | Keys |
|---|---|
| Move left / right (hold) | Left / Right arrows, or A / D |
| Shift up a gear | Right Shift, E or X |
| Shift down a gear | Left Shift, Q or Z |
| Jump | Space, W or Up |
| Restart level | R |
| Pause | Esc or P |

Menus: arrows or WASD to move, Enter or Space to choose, Esc to go back. The in-game **Controls** screen lists the same keys.

Hold a direction to move towards your selected gear's speed; let go to brake to a stop. The Shift keys pick the gear (1 to 4), which stays selected when you let go or land; every new attempt starts in gear 1. Your **colour comes from your actual speed**, not from the gear. You can't steer or shift in the air: your takeoff decides the jump.

Every colour also has its own pattern, and moving platforms, bolts and checkpoint posts each have a shape that reads without colour, so the game never relies on colour alone. On Windows, pressing Shift five times can open the Sticky Keys dialog. Q/E and Z/X do the same as the Shift keys and avoid it; the game shows a one-time tip about this on Windows, and the Controls screen can show it again.

## Run it locally

Requires Node 22.12 or newer (see `.nvmrc`). Run commands from the project root.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (CI uses `npm ci`) |
| `npm run dev` | Dev server with hot reload at http://localhost:5173 |
| `npm run build` | Production build to `dist/` (relative paths; zip the folder's contents for itch.io) |
| `npm run preview` | Serve `dist/` at http://localhost:4173 |
| `npm run package` | Checked production build zipped to `release/redshift-<version>.zip` plus `.sha256` (the itch.io upload) |
| `npm run typecheck` | TypeScript check of browser code, configs and tests |
| `npm test` | All unit, architecture, level and `scripts/` tests once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Tests with coverage; fails if `src/core` is under 80% |
| `npm run test:e2e:install` | One-time: download Playwright's Chromium |
| `npm run test:e2e` | End-to-end tests (Playwright) against a fresh build; port 4173 must be free |
| `npm run check` | Typecheck, tests with coverage, and build |
| `npm run art:build` | Re-bake the pixel sheets in `assets/art/pixel/` after changing `src/fx/pixel` or `palette.json` |

Every level ships with a recorded solution, and the test suite replays each one: an unsolvable level fails the build.

Design: [`docs/design/gdd.md`](docs/design/gdd.md). Architecture: [`docs/tech/architecture.md`](docs/tech/architecture.md). Level format: [`docs/tech/level-format.md`](docs/tech/level-format.md).

## Licence

Code is released under the [MIT License](LICENSE). Third-party assets and their licences are listed in [`CREDITS.md`](CREDITS.md).
