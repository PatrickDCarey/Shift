/**
 * `mover:`, `emitter:` and `sweep:` header lines (docs/tech/level-format.md,
 * section 2 "Kinetic headers"). `parseKineticLines` checks each line on its
 * own while the header is read; `checkKineticGrid` needs the grid (cells inside
 * it, on a `.`, lanes in bounds) and runs after it. Errors name the file, the
 * header line and the column where the bad token starts. Cycle maths is
 * integer only and local to this lane (no import from src/core/motion).
 */
import {
  KIN_DIRS,
  KIN_SPEEDS,
  KIN_SPEED_UNIT,
  MAX_EMITTERS,
  MAX_EMITTER_PERIOD,
  MAX_EMITTER_RANGE,
  MAX_MOVERS,
  MAX_MOVER_WIDTH,
  MAX_MOVE_TILES,
  MAX_PATH_STEPS,
  MAX_SWEEP_DELAY,
  MAX_WAIT_STEPS,
  MIN_SWEEP_X0,
  type Band,
  type ColoredBand,
  type Emitter,
  type KinDir,
  type KinSpeed,
  type Mover,
  type MoverSolid,
  type PathStep,
  type Sweep,
} from '../types';
import type { GridView } from './hints';
import { atPos, parseWholeNumber, type HeaderEntry } from './text';

export const MOVER_KEY = 'mover';
export const EMITTER_KEY = 'emitter';
export const SWEEP_KEY = 'sweep';
export const KINETIC_KEYS = [MOVER_KEY, EMITTER_KEY, SWEEP_KEY] as const;

interface Token {
  readonly text: string;
  readonly col: number;
}

interface Kv {
  readonly value: string;
  /** Column of the value (after `=`). */
  readonly col: number;
}

/** A parsed piece with the file positions the grid check reports at. */
export interface Placed<T> {
  readonly piece: T;
  readonly line: number;
  /** Column of the first positional token (the cell). */
  readonly cellCol: number;
  /** Column of the `path=` value (movers) or the `range=` value (emitters). */
  readonly extentCol: number;
}

export interface KineticLines {
  readonly movers: readonly Placed<Mover>[];
  readonly emitters: readonly Placed<Emitter>[];
  readonly sweep: Sweep | null;
  readonly errors: readonly string[];
}

type Repeated = ReadonlyMap<string, readonly HeaderEntry[]>;

function tokenize(entry: HeaderEntry): readonly Token[] {
  return Array.from(entry.value.matchAll(/\S+/g), (m) => ({ text: m[0], col: entry.valueCol + (m.index ?? 0) }));
}

/** Reads `key=value` tokens: unknown, repeated and missing-required keys are errors. */
function readKv(
  file: string,
  entry: HeaderEntry,
  tokens: readonly Token[],
  allowed: readonly string[],
  required: readonly string[],
  errors: string[],
): Map<string, Kv> {
  const kv = new Map<string, Kv>();
  for (const t of tokens) {
    const eq = t.text.indexOf('=');
    const key = eq < 0 ? '' : t.text.slice(0, eq);
    if (!allowed.includes(key)) {
      errors.push(atPos(file, entry.line, t.col, `unknown or malformed token '${t.text}' (expected ${allowed.map((k) => `${k}=`).join(', ')})`));
    } else if (kv.has(key)) {
      errors.push(atPos(file, entry.line, t.col, `key '${key}' is repeated in this line`));
    } else {
      kv.set(key, { value: t.text.slice(eq + 1), col: t.col + eq + 1 });
    }
  }
  for (const key of required) {
    if (!kv.has(key)) errors.push(atPos(file, entry.line, entry.valueCol, `missing required key '${key}='`));
  }
  return kv;
}

function readNumber(file: string, line: number, name: string, kv: Kv | undefined, min: number, max: number, errors: string[]): number | null {
  if (!kv) return null;
  const n = parseWholeNumber(kv.value);
  if (n === null || n < min || n > max) {
    errors.push(atPos(file, line, kv.col, `${name} must be a whole number from ${min} to ${max}, found '${kv.value}'`));
    return null;
  }
  return n;
}

function readSpeed(file: string, line: number, kv: Kv | undefined, errors: string[]): KinSpeed | null {
  if (!kv) return null;
  const n = parseWholeNumber(kv.value);
  const found = KIN_SPEEDS.find((s) => s === n);
  if (found === undefined) errors.push(atPos(file, line, kv.col, `speed must be one of ${KIN_SPEEDS.join(', ')}, found '${kv.value}'`));
  return found ?? null;
}

function readDir(file: string, line: number, kv: Kv | undefined, errors: string[]): KinDir | null {
  if (!kv) return null;
  const found = KIN_DIRS.find((d) => d === kv.value);
  if (found === undefined) errors.push(atPos(file, line, kv.col, `dir must be one of ${KIN_DIRS.join(', ')}, found '${kv.value}'`));
  return found ?? null;
}

function readPhase(file: string, line: number, kv: Kv | undefined, limit: number, what: string, errors: string[]): number | null {
  if (!kv) return 0;
  const n = readNumber(file, line, 'phase', kv, 0, Number.MAX_SAFE_INTEGER, errors);
  if (n !== null && n >= limit) {
    errors.push(atPos(file, line, kv.col, `phase must be less than the ${what} (${limit}), found '${kv.value}'`));
    return null;
  }
  return n;
}

// --- movers ---

const COLORED_BANDS: Readonly<Record<string, ColoredBand>> = { B: 1, G: 2, Y: 3, R: 4 };
const MOVER_KEYS = ['speed', 'path', 'phase'];
const DELTA: Readonly<Record<KinDir, readonly [number, number]>> = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };

function parseKind(file: string, line: number, t: Token, errors: string[]): MoverSolid | null {
  if (t.text === 'safe') return { kind: 'safe' };
  const band = Object.hasOwn(COLORED_BANDS, t.text) ? COLORED_BANDS[t.text] : undefined;
  if (band === undefined) {
    errors.push(atPos(file, line, t.col, `mover kind must be safe, B, G, Y or R, found '${t.text}'`));
    return null;
  }
  return { kind: 'colored', band };
}

function parseSize(file: string, line: number, t: Token, errors: string[]): number | null {
  const m = /^(0|[1-9][0-9]*)x1$/.exec(t.text);
  const w = m ? Number(m[1]) : 0;
  if (!m || w < 1 || w > MAX_MOVER_WIDTH) {
    errors.push(atPos(file, line, t.col, `mover size must be '<w>x1' with w from 1 to ${MAX_MOVER_WIDTH}, found '${t.text}'`));
    return null;
  }
  return w;
}

function parsePathToken(file: string, line: number, text: string, col: number, errors: string[]): PathStep | null {
  const m = /^([rludw])([1-9][0-9]*)$/.exec(text);
  const letter = m?.[1];
  const n = m ? Number(m[2]) : 0;
  if (!m || letter === undefined) {
    errors.push(atPos(file, line, col, `path token '${text}' must be r, l, u or d plus tiles, or w plus steps (for example r6 or w30)`));
    return null;
  }
  if (letter === 'w') {
    if (n <= MAX_WAIT_STEPS) return { kind: 'wait', steps: n };
    errors.push(atPos(file, line, col, `wait '${text}' is over ${MAX_WAIT_STEPS} steps`));
    return null;
  }
  if (n <= MAX_MOVE_TILES) return { kind: 'move', dir: letter as KinDir, tiles: n };
  errors.push(atPos(file, line, col, `move '${text}' is over ${MAX_MOVE_TILES} tiles`));
  return null;
}

function parsePath(file: string, line: number, kv: Kv, errors: string[]): readonly PathStep[] | null {
  const parts = kv.value.split(',');
  if (parts.length > MAX_PATH_STEPS) {
    errors.push(atPos(file, line, kv.col, `path has ${parts.length} tokens (at most ${MAX_PATH_STEPS})`));
    return null;
  }
  let col = kv.col;
  const steps = parts.map((p) => {
    const step = parsePathToken(file, line, p, col, errors);
    col += p.length + 1;
    return step;
  });
  const good = steps.filter((s): s is PathStep => s !== null);
  return good.length === steps.length ? good : null;
}

/** Steps of one loop at `speed`: waits plus `tiles * 32 / speed` per move. */
function cycleOf(path: readonly PathStep[], speed: KinSpeed): number {
  return path.reduce((sum, s) => sum + (s.kind === 'wait' ? s.steps : (s.tiles * KIN_SPEED_UNIT) / speed), 0);
}

function netDisplacement(path: readonly PathStep[]): readonly [number, number] {
  let dx = 0;
  let dy = 0;
  for (const s of path) {
    if (s.kind !== 'move') continue;
    dx += DELTA[s.dir][0] * s.tiles;
    dy += DELTA[s.dir][1] * s.tiles;
  }
  return [dx, dy];
}

function checkLoop(file: string, line: number, kv: Kv, path: readonly PathStep[], errors: string[]): boolean {
  if (!path.some((s) => s.kind === 'move')) {
    errors.push(atPos(file, line, kv.col, 'path needs at least one move (r, l, u or d token)'));
    return false;
  }
  const [dx, dy] = netDisplacement(path);
  if (dx !== 0 || dy !== 0) {
    errors.push(atPos(file, line, kv.col, `path must return to its start (net displacement is ${dx} right, ${dy} down)`));
    return false;
  }
  return true;
}

function readCell(file: string, entry: HeaderEntry, tokens: readonly Token[], errors: string[]): { col: number; row: number } | null {
  const [c, r] = tokens;
  const col = c ? parseWholeNumber(c.text) : null;
  const row = r ? parseWholeNumber(r.text) : null;
  if (c && r && col !== null && row !== null) return { col, row };
  const bad = c && col === null ? c : r;
  errors.push(atPos(file, entry.line, bad?.col ?? entry.valueCol, `cell column and row must be whole numbers of 0 or more, found '${bad?.text ?? ''}'`));
  return null;
}

function parseMover(file: string, entry: HeaderEntry, errors: string[]): Placed<Mover> | null {
  const tokens = tokenize(entry);
  const before = errors.length;
  const [first, , sizeTok, kindTok] = tokens;
  if (tokens.length < 5 || !first || !sizeTok || !kindTok) {
    errors.push(atPos(file, entry.line, entry.valueCol, `mover needs '<col> <row> <w>x1 <kind> speed=<n> path=<tokens>' but found '${entry.value}'`));
    return null;
  }
  const origin = readCell(file, entry, tokens, errors);
  const width = parseSize(file, entry.line, sizeTok, errors);
  const solid = parseKind(file, entry.line, kindTok, errors);
  const kv = readKv(file, entry, tokens.slice(4), MOVER_KEYS, ['speed', 'path'], errors);
  const speed = readSpeed(file, entry.line, kv.get('speed'), errors);
  const pathKv = kv.get('path');
  const path = pathKv ? parsePath(file, entry.line, pathKv, errors) : null;
  const loop = pathKv && path ? checkLoop(file, entry.line, pathKv, path, errors) : false;
  const cycle = path && speed && loop ? cycleOf(path, speed) : 0;
  const phase = cycle > 0 ? readPhase(file, entry.line, kv.get('phase'), cycle, 'cycle', errors) : null;
  if (errors.length > before || !origin || !width || !solid || !speed || !path || phase === null) return null;
  const piece: Mover = { origin, width, height: 1, solid, path, speed, phase };
  return { piece, line: entry.line, cellCol: first.col, extentCol: pathKv?.col ?? first.col };
}

// --- emitters ---

const EMITTER_KEYS = ['dir', 'range', 'speed', 'period', 'phase', 'band'];
const EMITTER_BANDS: Readonly<Record<string, Band>> = { W: 0, B: 1, G: 2, Y: 3, R: 4 };

/** null = no `band=` (grey); undefined = a bad value (already reported). */
function readEmitterBand(file: string, line: number, kv: Kv | undefined, errors: string[]): Band | null | undefined {
  if (!kv) return null;
  const band = Object.hasOwn(EMITTER_BANDS, kv.value) ? EMITTER_BANDS[kv.value] : undefined;
  if (band === undefined) errors.push(atPos(file, line, kv.col, `band must be W, B, G, Y or R, found '${kv.value}'`));
  return band;
}

function parseEmitter(file: string, entry: HeaderEntry, errors: string[]): Placed<Emitter> | null {
  const tokens = tokenize(entry);
  const before = errors.length;
  const [first] = tokens;
  if (tokens.length < 2 || !first) {
    errors.push(atPos(file, entry.line, entry.valueCol, `emitter needs '<col> <row> dir=<d> range=<n> speed=<n> period=<n>' but found '${entry.value}'`));
    return null;
  }
  const cell = readCell(file, entry, tokens, errors);
  const kv = readKv(file, entry, tokens.slice(2), EMITTER_KEYS, ['dir', 'range', 'speed', 'period'], errors);
  const dir = readDir(file, entry.line, kv.get('dir'), errors);
  const range = readNumber(file, entry.line, 'range', kv.get('range'), 1, MAX_EMITTER_RANGE, errors);
  const speed = readSpeed(file, entry.line, kv.get('speed'), errors);
  const period = readNumber(file, entry.line, 'period', kv.get('period'), 1, MAX_EMITTER_PERIOD, errors);
  const phase = period === null ? null : readPhase(file, entry.line, kv.get('phase'), period, 'period', errors);
  const band = readEmitterBand(file, entry.line, kv.get('band'), errors);
  if (errors.length > before || !cell || !dir || !range || !speed || !period || phase === null || band === undefined) return null;
  const piece: Emitter = { cell, dir, range, speed, period, phase, band };
  return { piece, line: entry.line, cellCol: first.col, extentCol: kv.get('range')?.col ?? first.col };
}

// --- sweep ---

function readSweepX0(file: string, line: number, kv: Kv | undefined, errors: string[]): number | null {
  if (!kv) return null;
  const n = /^-?(0|[1-9][0-9]*)$/.test(kv.value) ? Number(kv.value) : null;
  if (n === null || n < MIN_SWEEP_X0) {
    errors.push(atPos(file, line, kv.col, `x0 must be a whole number of ${MIN_SWEEP_X0} or more, found '${kv.value}'`));
    return null;
  }
  return n;
}

function parseSweep(file: string, entry: HeaderEntry, errors: string[]): Sweep | null {
  const before = errors.length;
  const kv = readKv(file, entry, tokenize(entry), ['x0', 'speed', 'delay'], ['x0', 'speed', 'delay'], errors);
  const x0 = readSweepX0(file, entry.line, kv.get('x0'), errors);
  const speed = readSpeed(file, entry.line, kv.get('speed'), errors);
  const delay = readNumber(file, entry.line, 'delay', kv.get('delay'), 0, MAX_SWEEP_DELAY, errors);
  if (errors.length > before || x0 === null || !speed || delay === null) return null;
  return { x0, speed, delay };
}

// --- all lines ---

function parseAll<T>(
  entries: readonly HeaderEntry[],
  max: number,
  name: string,
  file: string,
  errors: string[],
  one: (e: HeaderEntry) => T | null,
): T[] {
  const out: T[] = [];
  entries.forEach((entry, i) => {
    if (i >= max) {
      errors.push(atPos(file, entry.line, 1, `too many ${name} lines (at most ${max} per level)`));
      return;
    }
    const parsed = one(entry);
    if (parsed) out.push(parsed);
  });
  return out;
}

/** Checks each kinetic line by itself, in file order. */
export function parseKineticLines(file: string, repeated: Repeated): KineticLines {
  const errors: string[] = [];
  const movers = parseAll(repeated.get(MOVER_KEY) ?? [], MAX_MOVERS, 'mover:', file, errors, (e) => parseMover(file, e, errors));
  const emitters = parseAll(repeated.get(EMITTER_KEY) ?? [], MAX_EMITTERS, 'emitter:', file, errors, (e) => parseEmitter(file, e, errors));
  const sweeps = repeated.get(SWEEP_KEY) ?? [];
  for (const e of sweeps.slice(1)) {
    errors.push(atPos(file, e.line, 1, `only one sweep: line is allowed (the first is on line ${sweeps[0]?.line})`));
  }
  const first = sweeps[0];
  const sweep = first ? parseSweep(file, first, errors) : null;
  return { movers, emitters, sweep, errors };
}

// --- grid checks ---

function cellErrors(file: string, p: Placed<unknown>, col: number, row: number, width: number, grid: GridView, what: string): string[] {
  if (col < 0 || col + width > grid.width || row < 0 || row >= grid.rows) {
    return [atPos(file, p.line, p.cellCol, `${what} cell (column ${col}, row ${row}) is outside the grid (${grid.width} columns, ${grid.rows} rows)`)];
  }
  for (let c = col; c < col + width; c += 1) {
    const ch = grid.chars[row * grid.width + c];
    if (ch !== '.') return [atPos(file, p.line, p.cellCol, `${what} cell (column ${c}, row ${row}) is '${ch}', not '.'`)];
  }
  return [];
}

function moverErrors(file: string, p: Placed<Mover>, grid: GridView): readonly string[] {
  const { origin, width, path } = p.piece;
  const start = cellErrors(file, p, origin.col, origin.row, width, grid, 'mover');
  if (start.length > 0) return start;
  let { col, row } = origin;
  for (const s of path) {
    if (s.kind !== 'move') continue;
    col += DELTA[s.dir][0] * s.tiles;
    row += DELTA[s.dir][1] * s.tiles;
    if (col < 0 || col + width > grid.width || row < 0 || row >= grid.rows) {
      return [atPos(file, p.line, p.extentCol, `mover path leaves the grid: the slab would be at column ${col}, row ${row} (${width} wide)`)];
    }
  }
  return [];
}

function emitterErrors(file: string, p: Placed<Emitter>, grid: GridView): readonly string[] {
  const { cell, dir, range } = p.piece;
  const start = cellErrors(file, p, cell.col, cell.row, 1, grid, 'emitter');
  if (start.length > 0) return start;
  const x = cell.col + 0.5 + DELTA[dir][0] * range;
  const y = cell.row + 0.5 + DELTA[dir][1] * range;
  if (x < 0 || x > grid.width || y < 0 || y > grid.rows) {
    return [atPos(file, p.line, p.extentCol, `emitter lane ends outside the grid at (${x}, ${y}); the grid is ${grid.width} by ${grid.rows}`)];
  }
  return [];
}

/** Cells in the grid on a `.`, tracks and lanes in bounds, sweep x0 not past the right edge. */
export function checkKineticGrid(file: string, lines: KineticLines, grid: GridView, sweepLine: HeaderEntry | undefined): readonly string[] {
  const errors = [...lines.movers.flatMap((m) => moverErrors(file, m, grid)), ...lines.emitters.flatMap((e) => emitterErrors(file, e, grid))];
  if (lines.sweep && sweepLine && lines.sweep.x0 > grid.width) {
    errors.push(atPos(file, sweepLine.line, sweepLine.valueCol, `sweep x0 ${lines.sweep.x0} is past the right edge (level width ${grid.width})`));
  }
  return errors;
}
