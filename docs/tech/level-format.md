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

Unknown keys are an error (catches typos). New keys need a tech-lead change to this doc and `LevelMeta`.

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
| `~` | mud | always | World 3. Caps the gear at `mudMaxGear`. |
| `=` | ice | always | World 3. Locks speed and gear. |
| `<` | conveyor, moving left | always | World 4. Speed: tuning key TBD. |
| `>` | conveyor, moving right | always | World 4. |
| `*` | boost pad | always | World 3. Sets `boostPadGear` and its speed instantly. |
| `w` `b` `g` `y` `r` | speed camera for band 0 / 1 / 2 / 3 / 4 | unless band matches | World 3. Gate: solid unless your band equals its band. Lower-case colour initial = the band it admits. |
| `E` | exit | no | Touching it wins. At least one per level. |
| `@` | player start | no | Exactly one. Parses as empty; the player spawns standing on the bottom edge of this cell (feet x = col + 0.5, y = row + 1), facing right, in `startGear`. |

Mnemonic: **upper-case colour initial = solid coloured block, lower-case = camera of that colour.**

Reserved for later worlds (currently a parse error): `X` crate, `M` moving platform. World 4/5 pieces that need parameters (platform paths) will get an optional section after a second `---`; that format is defined when design-lead specs those pieces. Afterimage ghost platforms (world 5) are created at runtime and have no character.

### Validation (parser must reject with a message naming file, row and column)

- Missing/unknown header key, `id` ≠ file stem, non-integer `world`/`version`.
- Unknown or reserved character.
- Ragged rows; zero or more than one `@`; no `E`.

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
3. Save it as `levels/<id>.solution.txt` and run `npm test`.
