/**
 * `emitter:` and `sweep:` header lines: per-line checks and the grid check of an
 * emitter's cell and lane.
 */
import {
  MAX_EMITTER_PERIOD,
  MAX_EMITTER_RANGE,
  MAX_SWEEP_DELAY,
  MIN_SWEEP_X0,
  type Band,
  type Emitter,
  type Sweep,
} from '../types';
import type { GridView } from './hints';
import { cellErrors, DELTA, readCell, readDir, readKv, readNumber, readPhase, readSpeed, tokenize, type Kv, type Placed } from './kineticRead';
import { atPos, type HeaderEntry } from './text';

const EMITTER_KEYS = ['dir', 'range', 'speed', 'period', 'phase', 'band'];
const EMITTER_BANDS: Readonly<Record<string, Band>> = { W: 0, B: 1, G: 2, Y: 3, R: 4 };

/** null = no `band=` (grey); undefined = a bad value (already reported). */
function readEmitterBand(file: string, line: number, kv: Kv | undefined, errors: string[]): Band | null | undefined {
  if (!kv) return null;
  const band = Object.hasOwn(EMITTER_BANDS, kv.value) ? EMITTER_BANDS[kv.value] : undefined;
  if (band === undefined) errors.push(atPos(file, line, kv.col, `band must be W, B, G, Y or R, found '${kv.value}'`));
  return band;
}

export function parseEmitter(file: string, entry: HeaderEntry, errors: string[]): Placed<Emitter> | null {
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

export function parseSweep(file: string, entry: HeaderEntry, errors: string[]): Sweep | null {
  const before = errors.length;
  const kv = readKv(file, entry, tokenize(entry), ['x0', 'speed', 'delay'], ['x0', 'speed', 'delay'], errors);
  const x0 = readSweepX0(file, entry.line, kv.get('x0'), errors);
  const speed = readSpeed(file, entry.line, kv.get('speed'), errors);
  const delay = readNumber(file, entry.line, 'delay', kv.get('delay'), 0, MAX_SWEEP_DELAY, errors);
  if (errors.length > before || x0 === null || !speed || delay === null) return null;
  return { x0, speed, delay };
}

export function emitterErrors(file: string, p: Placed<Emitter>, grid: GridView): readonly string[] {
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

