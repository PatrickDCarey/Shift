/**
 * `checkpoint: <col> <row> [clock=<n>]` header lines (docs/tech/level-format.md,
 * section 2 "Checkpoint headers"; rules in contracts/checkpoints.ts).
 * `parseCheckpointLines` checks each line on its own while the header is read;
 * `checkCheckpointGrid` needs the grid, the spawn and the twin and runs after
 * it. The respawn box rules (slab paths, shot lanes, exits, hints, HUD) belong
 * to tests/levels, not here. Errors name the file, the header line and the
 * column where the bad token starts.
 */
import {
  CHECKPOINT_MIN_FROM_START,
  CHECKPOINT_MIN_SPACING,
  MAX_CHECKPOINTS,
  MAX_CHECKPOINT_CLOCK,
  type Checkpoint,
  type TilePos,
} from '../types';
import type { GridView } from './hints';
import { atPos, parseWholeNumber, type HeaderEntry } from './text';

/** The header key that may repeat. */
export const CHECKPOINT_KEY = 'checkpoint';

/** A post that read cleanly, with the file positions the grid check reports at. */
export interface PlacedCheckpoint {
  readonly post: Checkpoint;
  readonly line: number;
  /** 1-based columns where the column and row tokens start. */
  readonly colCol: number;
  readonly rowCol: number;
}

export interface CheckpointLines {
  readonly posts: readonly PlacedCheckpoint[];
  readonly errors: readonly string[];
}

/** What the grid check needs besides the grid: the `@` cell, the `&` and the `sweep:` line. */
export interface CheckpointContext {
  readonly start: TilePos | undefined;
  /** The `&` cell with its file line, when the level has a twin. */
  readonly twin: (TilePos & { readonly line: number }) | undefined;
  readonly sweepLine: HeaderEntry | undefined;
}

interface Token {
  readonly text: string;
  readonly col: number;
}

const CLOCK_PREFIX = 'clock=';

function tokenize(entry: HeaderEntry): readonly Token[] {
  return Array.from(entry.value.matchAll(/\S+/g), (m) => ({ text: m[0], col: entry.valueCol + (m.index ?? 0) }));
}

function readCoordinate(file: string, line: number, t: Token, what: 'column' | 'row', errors: string[]): number | null {
  const n = parseWholeNumber(t.text);
  if (n === null) errors.push(atPos(file, line, t.col, `checkpoint ${what} must be a whole number of 0 or more, found '${t.text}'`));
  return n;
}

/** The optional 3rd token: `clock=<n>`, 0 to MAX_CHECKPOINT_CLOCK. Returns undefined after reporting. */
function readClock(file: string, line: number, t: Token | undefined, errors: string[]): number | undefined {
  if (!t) return 0;
  if (!t.text.startsWith(CLOCK_PREFIX)) {
    errors.push(atPos(file, line, t.col, `unknown or malformed token '${t.text}' (expected ${CLOCK_PREFIX}<n>)`));
    return undefined;
  }
  const value = t.text.slice(CLOCK_PREFIX.length);
  const n = parseWholeNumber(value);
  if (n === null || n > MAX_CHECKPOINT_CLOCK) {
    errors.push(atPos(file, line, t.col + CLOCK_PREFIX.length, `clock must be a whole number from 0 to ${MAX_CHECKPOINT_CLOCK}, found '${value}'`));
    return undefined;
  }
  return n;
}

function parseOne(file: string, entry: HeaderEntry, errors: string[]): PlacedCheckpoint | null {
  const tokens = tokenize(entry);
  const [colTok, rowTok, clockTok] = tokens;
  if (tokens.length < 2 || tokens.length > 3 || !colTok || !rowTok) {
    errors.push(atPos(file, entry.line, entry.valueCol, `checkpoint needs '<col> <row> [clock=<n>]' but found '${entry.value}'`));
    return null;
  }
  const before = errors.length;
  const col = readCoordinate(file, entry.line, colTok, 'column', errors);
  const row = readCoordinate(file, entry.line, rowTok, 'row', errors);
  const clock = readClock(file, entry.line, clockTok, errors);
  if (errors.length > before || col === null || row === null || clock === undefined) return null;
  return { post: { cell: { col, row }, clock }, line: entry.line, colCol: colTok.col, rowCol: rowTok.col };
}

/** Checks each `checkpoint:` line by itself, in file order. */
export function parseCheckpointLines(file: string, entries: readonly HeaderEntry[]): CheckpointLines {
  const errors: string[] = [];
  const posts: PlacedCheckpoint[] = [];
  entries.forEach((entry, i) => {
    if (i >= MAX_CHECKPOINTS) {
      errors.push(atPos(file, entry.line, 1, `too many checkpoint lines (at most ${MAX_CHECKPOINTS} per level)`));
      return;
    }
    const parsed = parseOne(file, entry, errors);
    if (parsed) posts.push(parsed);
  });
  return { posts, errors };
}

function cellErrors(file: string, p: PlacedCheckpoint, grid: GridView): readonly string[] {
  const { col, row } = p.post.cell;
  const here = `checkpoint cell (column ${col}, row ${row})`;
  if (col >= grid.width) return [atPos(file, p.line, p.colCol, `checkpoint column ${col} is outside the grid (columns 0 to ${grid.width - 1})`)];
  if (row >= grid.rows) return [atPos(file, p.line, p.rowCol, `checkpoint row ${row} is outside the grid (rows 0 to ${grid.rows - 1})`)];
  const ch = grid.chars[row * grid.width + col];
  if (ch !== '.') return [atPos(file, p.line, p.colCol, `${here} is '${ch}', not '.'`)];
  if (row + 1 >= grid.rows) return [atPos(file, p.line, p.rowCol, `${here} is on the last row: it needs a safe '#' directly below`)];
  const below = grid.chars[(row + 1) * grid.width + col];
  if (below !== '#') return [atPos(file, p.line, p.rowCol, `${here} needs a safe '#' directly below, found '${below}'`)];
  return [];
}

/** First post at least CHECKPOINT_MIN_FROM_START right of `@`; then strictly increasing and CHECKPOINT_MIN_SPACING apart. */
function spacingErrors(file: string, posts: readonly PlacedCheckpoint[], start: TilePos | undefined): readonly string[] {
  const errors: string[] = [];
  posts.forEach((p, i) => {
    const col = p.post.cell.col;
    const prev = posts[i - 1];
    if (!prev) {
      if (start && col - start.col < CHECKPOINT_MIN_FROM_START) {
        errors.push(atPos(file, p.line, p.colCol, `the first checkpoint (column ${col}) is ${col - start.col} columns right of the start '@' (column ${start.col}); at least ${CHECKPOINT_MIN_FROM_START} are needed`));
      }
      return;
    }
    const before = prev.post.cell.col;
    if (col <= before) {
      errors.push(atPos(file, p.line, p.colCol, `checkpoint column ${col} must be right of the previous post (column ${before}, line ${prev.line}): columns strictly increase`));
    } else if (col - before < CHECKPOINT_MIN_SPACING) {
      errors.push(atPos(file, p.line, p.colCol, `checkpoint column ${col} is ${col - before} columns after the previous post (column ${before}); at least ${CHECKPOINT_MIN_SPACING} are needed`));
    }
  });
  return errors;
}

/** Levels with a twin or a sweep have no posts; the error sits on the later of the two lines. */
function exclusionErrors(file: string, first: PlacedCheckpoint, ctx: CheckpointContext): readonly string[] {
  const errors: string[] = [];
  const { twin, sweepLine } = ctx;
  if (twin) {
    errors.push(atPos(file, twin.line, twin.col + 1, `twin start '&' in a level with checkpoint posts (the checkpoint on line ${first.line}); Tandem levels never have posts`));
  }
  if (sweepLine) {
    const later = Math.max(sweepLine.line, first.line);
    const other = later === first.line ? `the sweep: on line ${sweepLine.line}` : `the checkpoint on line ${first.line}`;
    errors.push(atPos(file, later, 1, `checkpoint posts and a sweep: line cannot share a level (${other})`));
  }
  return errors;
}

/** Cell, floor, spacing and exclusion rules, once the grid, the `@` and the `&` are known. */
export function checkCheckpointGrid(file: string, lines: CheckpointLines, grid: GridView, ctx: CheckpointContext): readonly string[] {
  const first = lines.posts[0];
  if (!first) return [];
  return [
    ...lines.posts.flatMap((p) => cellErrors(file, p, grid)),
    ...spacingErrors(file, lines.posts, ctx.start),
    ...exclusionErrors(file, first, ctx),
  ];
}
