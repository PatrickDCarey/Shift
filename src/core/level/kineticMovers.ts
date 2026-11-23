/**
 * `mover:` header lines: size, kind, path tokens, loop and phase checks, and the
 * grid check of the start cell and every leg of the track.
 */
import {
  MAX_MOVER_WIDTH,
  MAX_MOVE_TILES,
  MAX_PATH_STEPS,
  MAX_WAIT_STEPS,
  KIN_SPEED_UNIT,
  type ColoredBand,
  type KinDir,
  type KinSpeed,
  type Mover,
  type MoverSolid,
  type PathStep,
} from '../types';
import type { GridView } from './hints';
import { cellErrors, DELTA, readCell, readKv, readPhase, readSpeed, tokenize, type Kv, type Placed, type Token } from './kineticRead';
import { atPos, type HeaderEntry } from './text';

const COLORED_BANDS: Readonly<Record<string, ColoredBand>> = { B: 1, G: 2, Y: 3, R: 4 };
const MOVER_KEYS = ['speed', 'path', 'phase'];

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

export function parseMover(file: string, entry: HeaderEntry, errors: string[]): Placed<Mover> | null {
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

export function moverErrors(file: string, p: Placed<Mover>, grid: GridView): readonly string[] {
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
