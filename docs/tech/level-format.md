# Redshift — Level and Solution Format

_Owner: tech-lead. The legend below mirrors `TILE_LEGEND` in `src/core/types.ts`; the code is the source of truth and a unit test keeps them aligned._

Goals: easy for agents and humans to write, readable in a diff, no tooling needed.

## 1. Files

```
levels/
  w1-01.txt            the level
  w1-01.solution.txt   its solution recording (required, see CLAUDE.md)
```

- File stem = level `id`: `w<world>-<nn>`, two-digit number, e.g. `w2-04`. Levels are ordered by world, then number.
- UTF-8 without BOM, **ASCII only** inside the grid.
- **Line endings:** the repo stores LF (`.gitattributes`: `* text=auto eol=lf`), but a Windows checkout or editor may produce CRLF. **Parsers must accept both `\n` and `\r\n`** (and tolerate a leading UTF-8 BOM): split on `/\r?\n/` and never let a stray `\r` reach a header value, a grid row or a run token. The same file with either line ending must parse to an identical `Level` / `Solution`; a unit test with a CRLF copy of a level guards this.
- Example/test levels use world `0` and the stem `w0-<nn>`; they are excluded from level select.

## 2. Level file

```
<header lines>
---
<grid rows>
```

### Header

`key: value` lines, one per line, in any order. Blank lines and lines starting with `#` are ignored.

| Key | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Must equal the file stem. |
| `title` | string | yes | Shown in level select. |
| `world` | integer 0–5 | yes | World from the GDD toolbox; 0 = test. |
| `teaches` | string | yes | One short phrase: what the level teaches. |
| `version` | integer ≥ 1 | yes | Bump on **every** grid change. Solutions name the version they solve. |
| `hint` | `<glyph> <col> <row>` | no, up to 3 | Onboarding glyph anchored on a grid cell (below). Repeatable. Render-only. |
| `mover` | `<col> <row> <w>x1 <kind> key=value…` | no, up to 16 | A top-only slab on a fixed loop (§2 "Kinetic headers"). Repeatable. **Sim data.** |
| `emitter` | `<col> <row> key=value…` | no, up to 16 | A bolt emitter (§2 "Kinetic headers"). Repeatable. **Sim data.** |
| `sweep` | `x0=<int> speed=<n> delay=<n>` | no, at most 1 | A chasing front (Should; §2 "Kinetic headers"). **Sim data.** |

Unknown keys are an error (catches typos). Every key except `hint`, `mover` and `emitter` appears at most once. New keys need a tech-lead change to this doc and `LevelMeta`.

### Hint headers (M2-03)

Onboarding glyphs are key-cap icons, never text (GDD §3). Design, art and placement rules: `docs/design/features/onboarding-hints.md`. A level places them with `hint:` lines:

```
hint: move 1 0
hint: shiftUp 6 0
```

- **Value:** exactly three whitespace-separated tokens: a glyph id, then the anchor cell's column and row (zero-based integers, same grid coordinates as the legend; row 0 is the first grid row after `---`).
- **Glyph ids** (`HINT_GLYPHS` in `src/core/types.ts`; they match the `InputButton` names):

  | Id | Shows |
  |---|---|
  | `move` | left/right keys |
  | `shiftUp` | shift-up keys |
  | `shiftDown` | shift-down keys |
  | `jump` | jump keys |

- **Anchor:** the glyph's box is centred horizontally on the anchor cell's centre (col + 0.5) and its bottom edge sits on the cell's bottom edge (row + 1). The glyph never collides.
- **Parsed into** `LevelMeta.hints` in file order, as `{ glyph, anchor: { col, row } }`. The field is **absent** when the file has no `hint:` line (never an empty array).
- **Render-only:** the sim never reads hints, so adding, moving or removing a hint needs **no** `version` bump and keeps the solution valid.
- **Placement** (`onboarding-hints.md`): the glyph's box touches columns col−1 … col+1 of rows row−1 … row; every one of those cells must be inside the grid and empty (`@` and `&` cells count as empty), and the highest non-empty, non-exit tile below the anchor row in any of the box's columns (col−1 … col+1) must be at least 3 rows below the anchor row (a pit under every box column passes). The parser does not check this; `tests/levels/hints.test.ts` does, for every shipped level, and also replays each hinted level with its `hint:` lines removed to the same `wonAtStep`.
- The scene draws hints in M2-41 (glyph art: M2-36).

### Kinetic headers (expansion, 2026-11-23)

Movers (slabs), emitters (bolts) and the sweep are header lines, not grid glyphs. Specs: `docs/design/features/moving-objects.md`, `projectiles.md`, `sweep.md`. Types and the exact clock and arithmetic rules: `src/core/contracts/kinetics.ts`. Every position is a pure function of the run step (`SimState.step`), so they rewind on respawn and freeze during the death and win freezes.

```
mover: 10 8 3x1 safe speed=2 phase=0 path=w60,u6,w60,d6
mover: 20 4 4x1 G speed=1 path=w30,r6,w30,l6
emitter: 30 6 dir=l range=12 speed=4 period=90
emitter: 30 9 dir=l range=12 speed=4 period=90 phase=45 band=W
sweep: x0=-6 speed=2 delay=90
```

- **`mover: <col> <row> <w>x1 <kind> key=value…`**, positional tokens first, then `key=value` tokens in any order, each key at most once.
  - `<col> <row>`: top-left cell at path time 0. `<w>x1`: width 1–16 whole tiles, height exactly 1 (slabs are top-only). `<kind>`: `safe` (grey, holds every band) or `B G Y R` (holds a body like a coloured floor of that band: band at start of step, or that band's grace from above).
  - `speed=` (required): 1, 2, 4 or 8 = 32nds of a tile per step (1.875, 3.75, 7.5, 15 tiles/s).
  - `path=` (required): comma-separated tokens, no spaces, 1–32 of them: `r<n> l<n> u<n> d<n>` move n whole tiles (1–256; `u` is up, −y), `w<n>` waits n steps (1–3600). A move takes `n × 32 / speed` steps. The loop is closed: net displacement 0, and at least one move.
  - `phase=` (optional, default 0): steps, `0 ≤ phase < cycle`, where `cycle` = sum of waits + sum of `n × 32 / speed` over moves. Path time `u = (t + phase) mod cycle`.
- **`emitter: <col> <row> key=value…`**
  - `<col> <row>`: the emitter's cell (a `.` in the grid; drawn as an emitter).
  - `dir=` (required) `l r u d`; `range=` (required) 1–256 whole tiles from the cell's centre; `speed=` (required) 1, 2, 4 or 8; `period=` (required) 1–3600 steps; `phase=` (optional, default 0) `0 ≤ phase < period`; `band=` (optional): absent = grey (hits every band), `W` = white (hits band 0 only), `B G Y R` = that band only.
  - A shot leaves on every run step `s ≥ 0` with `(s + phase) mod period = 0` at the cell's centre and lives while `0 ≤ t − s < range × 32 / speed`. No shot with `s < 0` exists: no bolt is ever past the muzzle at `t = 0`.
- **`sweep: x0=<int> speed=<n> delay=<n>`** (Should): all three keys required. `x0` integer −64 … width; `speed` 1, 2, 4 or 8; `delay` 0–36000 steps. Front at `t`: `min(width, x0 + speed/32 × max(0, t − delay))`.
- **Parsed into** `Level.movers`, `Level.emitters` (file order; the index is the piece's id) and `Level.sweep`. Each field is **absent** when the file has no such line (never an empty array), so levels without kinetic headers parse, run and hash exactly as before.
- **Version rule:** unlike `hint:`, these lines change the simulation. **Any change to a `mover:`, `emitter:` or `sweep:` line bumps `version`** (and the solution is re-recorded), exactly like a grid change; the backend `LEVELS` row follows.
- **Level rules, not parser rules** (`tests/levels/kineticRules.ts`, tech-lead, B11-15; a planted fixture per rule proves it fails): slab speed ∈ {1, 2}, slab width 2–8; shot speed ∈ {2, 4}, period ≥ 12; a slab's **swept area** (bounding box of its `moverCorners`, width × 1) holds only empty cells and has ≥ 2 empty in-grid rows above every cell; every end of a horizontal leg (two consecutive moves, cyclic, either `l`/`r`, not the same direction) rests ≥ 30 steps, unless the end is listed in `REST_EXEMPT` with its `levels/README.md` line (an end no line uses); an emitter's **lane** (its cell up to the end cell = cell + `range` along `dir`) crosses no non-empty tile, and the end cell, where the bolt sinks, is a wall (non-empty, not an exit); swept areas and lanes overlap no spawn box (`@`, `&`: the spawn column, `ceil(playerHeight)` rows up from the spawn row), exit, hint box, or the HUD area at **any** camera position the level allows (as hints); recordings ≤ 5,400 steps (every level). Not yet enforced, with the piece that needs them: sweep speed ∈ {2, 4}, delay ≥ 60, `x0 ≤` spawn x − 6 (B12-01); no slab box over a spawn box at `t = 0` and no shot reaching a spawn box in the first 60 steps are implied by the keep-out rule. Design's per-level pacing rules (crossing windows ≥ 18 steps, w2-05's 4,800-step clean run) stay in `levels/README.md`.

### Grid

Everything after the `---` line, until end of file. One character per tile.

- All rows must have the same width. Trailing blank lines are ignored; blank lines inside the grid are an error.
- Row 0 is the top. `x` grows right, `y` grows down.
- Outside the grid: left, right and top behave as safe solid walls; falling below the bottom row kills the player (respawn at start).
- One screen is 30 × 16.875 tiles at 32 px. Levels may be wider or taller; the camera scrolls. Keep height ≤ 17 rows unless the level needs vertical scrolling.

### Legend

| Char | Tile | Solid | Notes |
|---|---|---|---|
| `.` | empty | no | |
| `#` | safe | always | White/grey geometry, all faces. Walls stop you (`vx` 0, gear kept). |
| `B` | colored, band 1 (blue) | when band = 1 | All faces. No-embed and grace rules (GDD §4.7–4.8). |
| `G` | colored, band 2 (green) | when band = 2 | |
| `Y` | colored, band 3 (yellow) | when band = 3 | |
| `R` | colored, band 4 (red) | when band = 4 | |
| `=` | ice | always | World 3 (Should; rules need a design-lead spec). Locks speed and gear. |
| `w` `b` `g` `y` `r` | speed gate for band 0 / 1 / 2 / 3 / 4 | unless band matches | World 3. Solid unless your band equals its band. Lower-case colour initial = the band it admits. (The contract kind is still `camera` until G-1 renames it.) |
| `E` | exit | no | Touching it wins. At least one per level. |
| `@` | player start | no | Exactly one. Parses as empty; the player spawns standing on the bottom edge of this cell (feet x = col + 0.5, y = row + 1), facing right, in `startGear`. |
| `&` | twin start (Tandem, world 3) | no | At most one. Parses as empty; spawn rule exactly as `@` (feet x = col + 0.5, y = row + 1, facing right, `startGear`). `Level.twinStart`, null without one. See `docs/design/features/tandem.md`. |

Mnemonic: **upper-case colour initial = solid coloured block, lower-case = speed gate of that colour.**

Reserved (a parse error naming the character as reserved, `RESERVED_CHARS`): `X` crate and `M` moving platform (later worlds); `~` mud, `*` boost pad, `<` `>` conveyors (cut 2026-11-04, T-02: their tuning keys are gone; boost pads may return as a Could). A reserved character is never reused for another piece: `M` stays reserved even though slabs now exist, because slabs are `mover:` header lines (§2 "Kinetic headers"), not grid glyphs. A second `---` remains an error. Afterimage ghost platforms (world 5) are created at runtime and have no character.

### Validation (parser must reject with a message naming file, row and column)

- Missing/unknown header key, `id` ≠ file stem, non-integer `world`/`version`.
- Unknown or reserved character.
- Ragged rows; zero or more than one `@`; no `E`.
- More than one `&`: the error names the row and column of the second one.
- `&` with an `E` directly above it (the spawn box overlaps that cell, so the twin would be home on step 1) or directly below it (an exit is not solid, so the twin would drop into it): an error naming the `&`'s row and column. Tech-lead ruling 2026-11-04 on `tandem.md` "Edge cases". `&` can never sit inside a solid tile or on an exit, because the character itself fills the cell.
- `hint`: not three tokens; an unknown glyph id; a non-integer or negative column or row; an anchor outside the grid; an anchor cell that is not `.` in the file; more than 3 `hint:` lines (`MAX_LEVEL_HINTS`); a **duplicate hint**, i.e. the same glyph id at the same anchor as an earlier line (the message names that earlier line). The same glyph at two anchors is allowed, and two different glyphs on one anchor are not a parse error (the placement test and level review catch overlapping boxes). The message names the file, the header line (its row) and the column where the bad token starts. The placement rules (box over empty cells, 3 rows above the floor) are checked by `tests/levels/hints.test.ts`, not the parser (§2 "Hint headers").
- `mover`: fewer than 5 tokens or an unknown, repeated or missing required key; a non-integer number or one out of the ranges in §2 "Kinetic headers"; a size not `<w>x1`; a kind not `safe B G Y R`; a speed not in {1, 2, 4, 8}; a path token not `[rlud][1-9][0-9]*` or `w[1-9][0-9]*`; a path with no move or a net displacement ≠ 0; `phase ≥ cycle`; any cell of the slab at any track corner (origin + every prefix sum of the moves) outside the grid; any cell of the slab at its origin (all `w` cells) that is not `.` in the file; more than 16 (`MAX_MOVERS`).
- `emitter`: an unknown, repeated or missing required key; a number out of range; `dir` not `l r u d`; `band` not `W B G Y R`; `phase ≥ period`; a cell outside the grid or not `.` in the file; a lane end (cell centre + range along `dir`) outside `[0, width] × [0, height]`; more than 16 (`MAX_EMITTERS`).
- `sweep`: a second `sweep:` line (its own message, naming the line of the first); an unknown, repeated or missing key; a number out of range, including `x0` below −64 or above the level width.
- *Readings confirmed by tech-lead (B11-15, 2026-11-23), as the [level] lane built them in `src/core/level/kinetics.ts`:* (1) every origin cell of a slab must be `.`, not only its top-left (the slab is drawn there at `t = 0`); (2) a second `sweep:` line has its own message; (3) `x0` is range-checked on both sides, `−64 ≤ x0 ≤ width`.
- Kinetic messages name the file, the header line and the column where the bad token starts, as for `hint`.


## 3. Example level

`levels/w0-01.txt`

```
# Format example: one colored strip between safe floors.
id: w0-01
title: Blue Mile
world: 0
teaches: format example, walking (gear 1) over a blue floor
version: 1
---
....................
.@................E.
#####BBBBBBBBB######
```

Every run starts in gear 1 (`startGear`), and walking pace is instant on the ground: holding Right moves the player at 3 tiles/s (blue) from the very first step, so they are blue long before the strip and simply walk across to the exit. Ways to fail, each a lesson:

- **Letting go on the strip** drops the speed to 0 instantly (white); the blue floor holds for the 6-step colour grace, then the player falls through.
- **Shifting to gear 2** while walking on the safe floor turns the player green about 0.6 tiles later; walking onto the blue strip green is walking into a hole.
- **Turning around** on the strip is safe: a turn at walking pace is instant and stays blue.

## 4. Solution file

`levels/<id>.solution.txt`

```
<header lines>
---
<run tokens>
```

### Header

| Key | Meaning |
|---|---|
| `level` | Level `id`. |
| `levelVersion` | The level `version` this solves. A mismatch fails the replay test (re-record after editing a level). |
| `steps` | Total number of frames = sum of all run counts. |

`#` comments and blank lines are allowed in the header.

### Runs

Whitespace-separated tokens (spaces or newlines, wrap freely). Each token is one run of identical input frames:

```
<count><buttons>
count   = positive integer, number of consecutive steps
buttons = "." (nothing held)  |  any of L R J + - !  in this canonical order, each at most once
          L = left, R = right, J = jump, + = shift up, - = shift down, ! = restart
```

Letters are **logical actions**, not keys: `+` is whatever the bindings map to shift up (Right Shift, E or X), `-` is shift down (Left Shift, Q or Z), `!` is restart (the R key; not the letter `R`, which is "right").

Regex per token: `^[1-9][0-9]*(\.|(?=[LRJ+!-])L?R?J?\+?-?!?)$`

Each letter means the button is **held** during those steps (edge semantics in `InputFrame`, `src/core/types.ts`). A shift is one press, so a shift is normally a 1-step run: `1R+ 40R` = shift up once while starting to walk right, then keep holding right. `2R+` would still be one shift (held, not re-pressed); to shift twice you need a release between: `1R+ 1R 1R+`.

Adjacent tokens with identical buttons should be merged; the encoder always emits the canonical form so recordings diff cleanly.

### Pass criteria (replay test)

Replay all frames from `createSim(level, params)`. The solution passes if `status === 'won'` and `wonAtStep <= steps`.

**In the game** a finished run becomes a `RunResult` (`src/core/types.ts`): `wonAtStep` (the run time that best times and leaderboards rank) plus the recording as a `Solution` (`levelId`, `levelVersion`, `steps` = frames recorded). Saving it with `formatSolution` gives exactly this file; `verifySolution` accepts it against its level by construction, which is how the leaderboard server checks a submission.

A recording covers **every frame since the level was loaded**, including deaths and restarts (`!`) before the winning run, and ends on the winning step. It is never trimmed to the last run, because the first frame of a run is not independent of the frame before it (buttons held through a respawn are not new presses). `wonAtStep` counts steps of the winning run only, so it equals `steps` when the recording has no death or restart, and is smaller otherwise.

### Example solution

`levels/w0-01.solution.txt`

```
level: w0-01
levelVersion: 1
# Hold right from the first step: gear 1 walks at 3 tiles/s straight to the exit.
steps: 323
---
323R
```

_The step count is illustrative (16.1 tiles at 3 tiles/s until the box overlaps the exit). Real solution files are produced by the in-game recorder, never hand-tuned._

### How solutions get made

1. Play the level in the dev build (`npm run dev`) and finish it.
2. The recorder outputs the solution text (dev-only key or console helper; gameplay-engineer provides it in M2).
3. Save it as `levels/<id>.solution.txt` and run `npx vitest run tests/levels` (the solvability test, also part of `npm test`). Each level is its own test case; failures name the level and what went wrong.
