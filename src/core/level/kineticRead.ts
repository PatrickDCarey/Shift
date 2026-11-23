/**
 * Shared readers for the `mover:`, `emitter:` and `sweep:` header lines: tokens,
 * `key=value` pairs, numbers, speed, direction, phase and the cell check against
 * the grid. Errors name the file, the header line and the column where the bad
 * token starts. Split out of kinetics.ts without change (2026-11 batch 11 review).
 */
import { KIN_DIRS, KIN_SPEEDS, type KinDir, type KinSpeed } from '../types';
import type { GridView } from './hints';
import { atPos, parseWholeNumber, type HeaderEntry } from './text';

export interface Token {
  readonly text: string;
  readonly col: number;
}

export interface Kv {
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

export const DELTA: Readonly<Record<KinDir, readonly [number, number]>> = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };

export function tokenize(entry: HeaderEntry): readonly Token[] {
  return Array.from(entry.value.matchAll(/\S+/g), (m) => ({ text: m[0], col: entry.valueCol + (m.index ?? 0) }));
}

/** Reads `key=value` tokens: unknown, repeated and missing-required keys are errors. */
export function readKv(
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

export function readNumber(file: string, line: number, name: string, kv: Kv | undefined, min: number, max: number, errors: string[]): number | null {
  if (!kv) return null;
  const n = parseWholeNumber(kv.value);
  if (n === null || n < min || n > max) {
    errors.push(atPos(file, line, kv.col, `${name} must be a whole number from ${min} to ${max}, found '${kv.value}'`));
    return null;
  }
  return n;
}

export function readSpeed(file: string, line: number, kv: Kv | undefined, errors: string[]): KinSpeed | null {
  if (!kv) return null;
  const n = parseWholeNumber(kv.value);
  const found = KIN_SPEEDS.find((s) => s === n);
  if (found === undefined) errors.push(atPos(file, line, kv.col, `speed must be one of ${KIN_SPEEDS.join(', ')}, found '${kv.value}'`));
  return found ?? null;
}

export function readDir(file: string, line: number, kv: Kv | undefined, errors: string[]): KinDir | null {
  if (!kv) return null;
  const found = KIN_DIRS.find((d) => d === kv.value);
  if (found === undefined) errors.push(atPos(file, line, kv.col, `dir must be one of ${KIN_DIRS.join(', ')}, found '${kv.value}'`));
  return found ?? null;
}

export function readPhase(file: string, line: number, kv: Kv | undefined, limit: number, what: string, errors: string[]): number | null {
  if (!kv) return 0;
  const n = readNumber(file, line, 'phase', kv, 0, Number.MAX_SAFE_INTEGER, errors);
  if (n !== null && n >= limit) {
    errors.push(atPos(file, line, kv.col, `phase must be less than the ${what} (${limit}), found '${kv.value}'`));
    return null;
  }
  return n;
}
export function readCell(file: string, entry: HeaderEntry, tokens: readonly Token[], errors: string[]): { col: number; row: number } | null {
  const [c, r] = tokens;
  const col = c ? parseWholeNumber(c.text) : null;
  const row = r ? parseWholeNumber(r.text) : null;
  if (c && r && col !== null && row !== null) return { col, row };
  const bad = c && col === null ? c : r;
  errors.push(atPos(file, entry.line, bad?.col ?? entry.valueCol, `cell column and row must be whole numbers of 0 or more, found '${bad?.text ?? ''}'`));
  return null;
}

export function cellErrors(file: string, p: Placed<unknown>, col: number, row: number, width: number, grid: GridView, what: string): string[] {
  if (col < 0 || col + width > grid.width || row < 0 || row >= grid.rows) {
    return [atPos(file, p.line, p.cellCol, `${what} cell (column ${col}, row ${row}) is outside the grid (${grid.width} columns, ${grid.rows} rows)`)];
  }
  for (let c = col; c < col + width; c += 1) {
    const ch = grid.chars[row * grid.width + c];
    if (ch !== '.') return [atPos(file, p.line, p.cellCol, `${what} cell (column ${c}, row ${row}) is '${ch}', not '.'`)];
  }
  return [];
}
