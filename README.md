# Redshift

A puzzle-platformer about pace, made for **GitHub Game Off 2026** (theme: **SHIFT**).

Your speed is your color. Stand still and you're white; sprint and you're red. Colored platforms are only solid when your color matches them, so every puzzle is about where you speed up, where you slow down, and where you take off. Shift gears with the Shift keys while the world red-shifts around you.

- **Play:** _itch.io link coming soon_
- **Jam entry:** _Game Off 2026 link coming soon_
- **Built with:** Phaser 3, TypeScript, Vite

## Controls

| Action | Keys |
|---|---|
| Move left / right (hold) | Left / Right arrows, or A / D |
| Shift up a gear | Right Shift, E or X |
| Shift down a gear | Left Shift, Q or Z |
| Jump | Space, W or Up |
| Restart level | R |

Hold a direction to move toward your selected gear's speed; let go to brake to a stop. The Shift keys pick the gear (1 to 4), which stays selected when you let go or land; every new attempt starts in gear 1. Your **color comes from your actual speed**, not from the gear. You can't steer or shift in the air: your takeoff decides the jump.

Every color also has its own pattern, so the game never relies on color alone. On Windows, pressing Shift five times can open the Sticky Keys dialog. Q/E and Z/X do the same as the Shift keys and avoid it.

## Run it locally

Requires Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` | Production build to `dist/` (zip its contents for itch.io) |
| `npm run preview` | Serve the build at http://localhost:4173 |
| `npm test` | Unit and architecture tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright; run `npm run test:e2e:install` once first) |
| `npm run check` | Typecheck, tests with coverage, and build |

Design: [`docs/design/gdd.md`](docs/design/gdd.md). Architecture: [`docs/tech/architecture.md`](docs/tech/architecture.md). Level format: [`docs/tech/level-format.md`](docs/tech/level-format.md).

## License

Code is released under the [MIT License](LICENSE). Third-party assets and their licenses are listed in [`CREDITS.md`](CREDITS.md).
