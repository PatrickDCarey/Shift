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
- UTF-8, LF line endings, **ASCII only** inside the grid.
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
| `#` | safe | always | White/grey geometry. Also a wall (instant stop). |
| `B` | colored, gear 1 (blue) | when band = 1 | |
| `G` | colored, gear 2 (green) | when band = 2 | |
| `Y` | colored, gear 3 (yellow) | when band = 3 | |
| `R` | colored, gear 4 (red) | when band = 4 | |
| `~` | mud | always | World 3. Caps gear (cap value from tuning). |
| `=` | ice | always | World 3. Locks current gear. |
| `<` | conveyor, moving left | always | World 4. Speed from tuning. |
| `>` | conveyor, moving right | always | World 4. |
| `*` | boost pad | always | World 3. Instant gear 4. |
| `w` `b` `g` `y` `r` | speed camera for gear 0 / 1 / 2 / 3 / 4 | no | World 3. Gate volume; the rule it checks is design-lead's spec. Lower-case colour initial = the gear it checks. |
| `E` | exit | no | Touching it wins. At least one per level. |
| `@` | player start | no | Exactly one. Parses as empty; the player spawns standing on the bottom edge of this cell. |

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
teaches: format example, holding gear 1 over a blue floor
version: 1
---
....................
.@................E.
#####BBBBBBBBB######
```

The player starts on safe floor, shifts to gear 1 and walks right. The ramp from gear 0 to gear 1 (1.25 tiles) finishes on the safe floor, so the player is blue before reaching the blue strip. A player who never shifts stays white and never moves; a player who shifts to gear 2 turns green on the strip and falls through after the colour grace.

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
buttons = "." (nothing held)  |  any of L R J + -  in this canonical order, each at most once
          L = left, R = right, J = jump, + = shift up (Right Shift), - = shift down (Left Shift)
```

Regex per token: `^[1-9][0-9]*(\.|(?=[LRJ+-])L?R?J?\+?-?)$`

Each letter means the button is **held** during those steps (edge semantics in `InputFrame`, `src/core/types.ts`). A shift is one press, so a shift is normally a 1-step run: `1R+ 40R` = shift up once while starting to run right, then keep running. `2R+` would still be one shift (held, not re-pressed); to shift twice you need a release between: `1R+ 1R 1R+`.

Adjacent tokens with identical buttons should be merged; the encoder always emits the canonical form so recordings diff cleanly.

### Pass criteria (replay test)

Replay all frames from `createSim(level, params)`. The solution passes if `status === 'won'` and `wonAtStep <= steps`. The recorder trims frames after the win, so normally `wonAtStep === steps`.

### Example solution

`levels/w0-01.solution.txt`

```
level: w0-01
levelVersion: 1
# Shift up on the first step while starting right, then hold right.
steps: 360
---
1R+ 359R
```

_The step count is illustrative (~0.8 s ramp + ~5 s walking at 3 tiles/s). Real solution files are produced by the in-game recorder, never hand-tuned._

### How solutions get made

1. Play the level in the dev build (`npm run dev`) and finish it.
2. The recorder outputs the solution text (dev-only key or console helper; gameplay-engineer provides it in M2).
3. Save it as `levels/<id>.solution.txt` and run `npm test`.
