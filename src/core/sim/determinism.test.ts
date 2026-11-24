/**
 * Golden determinism (architecture.md §6): a long scripted input log over a
 * level with every M1 tile kind, deaths and restarts, run twice, gives
 * deep-equal states on every step, and no state object is shared between steps.
 */
import { describe, expect, it } from 'vitest';
import { INPUT_BUTTONS, type InputFrame, type SimState } from '../types';
import { arena, floorRow, liftPath, shuttlePath, slab } from './moversKit';
import { gridLevel, row, runFromSpawn } from './testkit';

const W = 120;
const level = gridLevel([
  row(W, '.', { [W - 1]: 'E' }),
  row(W, '.'),
  row(W, '.', { 30: 'BBBB', 60: '####' }),
  row(W, '.'),
  row(W, '.', { 45: 'YYYY' }),
  row(W, '.'),
  row(W, '.', { 20: 'R', 70: 'GGG' }),
  row(W, '.', { 20: 'R', 90: '#' }),
  row(W, '.', { 2: '@', 20: 'R', 90: '#' }),
  row(W, '#', { 25: 'GGGGG', 35: '...', 50: 'BBBB', 80: 'YYYY', 100: '....' }),
  row(W, '#', { 25: '.....', 35: '...', 50: '....', 80: '....', 100: '....' }),
]);

/** Deterministic pseudo-random input log (LCG, fixed seed): held buttons change every few steps. */
function scriptedLog(length: number, seed: number): InputFrame[] {
  const out: InputFrame[] = [];
  let state = seed;
  let current: InputFrame = { left: false, right: true, jump: false, shiftUp: false, shiftDown: false, restart: false };
  for (let i = 0; i < length; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    if (state % 7 === 0) {
      const bits = state >> 8;
      const next = Object.fromEntries(INPUT_BUTTONS.map((b, k) => [b, ((bits >> k) & 1) === 1])) as Record<string, boolean>;
      current = { ...(next as unknown as InputFrame), restart: (bits & 0xfc0) === 0, right: next.right || !next.left };
    }
    out.push(current);
  }
  return out;
}

describe('determinism', () => {
  const log = scriptedLog(6000, 20261102);
  const a = runFromSpawn(level, log);
  const b = runFromSpawn(level, log);

  it('the log exercises the rules (jumps, shifts, wall stops, deaths, restarts)', () => {
    const types = new Set(a.flatMap((s) => s.events.map((e) => e.type)));
    for (const t of ['jump', 'shift', 'land', 'bandChange', 'wallStop', 'restart', 'died']) expect(types).toContain(t);
  });

  it('two runs of the same log are deep-equal on every step', () => {
    expect(b).toEqual(a);
  });

  it('no state, player, prevInput or events object is shared between steps', () => {
    const seen = new Set<object>();
    const parts = (s: SimState): object[] => [s, s.player, s.prevInput, s.events];
    for (const s of a) {
      for (const o of parts(s)) {
        expect(seen.has(o)).toBe(false);
        seen.add(o);
      }
    }
  });
});

/** FNV-1a over the JSON of every state: a compact fingerprint of a whole run. */
const fnv = (states: readonly SimState[]): string => {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(states)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16);
};

describe('determinism fixture: two slabs, two emitters', () => {
  const kin = {
    ...arena(80, 24, [{ row: 9, col: 4, chars: '@' }, floorRow(80, 19)], [
      slab(10, 12, 3, liftPath),
      slab(24, 10, 8, shuttlePath, { phase: 30 }),
    ]),
    emitters: [
      { cell: { col: 60, row: 18 }, dir: 'l' as const, range: 40, speed: 4 as const, period: 90, phase: 7, band: null },
      { cell: { col: 40, row: 0 }, dir: 'd' as const, range: 19, speed: 2 as const, period: 50, phase: 0, band: 2 as const },
    ],
  };
  const log = scriptedLog(3000, 7771);
  const a = runFromSpawn(kin, log);
  const b = runFromSpawn(kin, log);

  it('two runs are deep-equal on every step', () => {
    expect(b).toEqual(a);
  });

  it('exercises bolts and matches its pinned fingerprint', () => {
    expect(a.some((st) => st.events.some((e) => e.type === 'died' && e.cause === 'hit'))).toBe(true);
    expect(fnv(a)).toBe('65955fb');
  });
});

describe('determinism fixture 2: a slab and a sweep', () => {
  const swept = {
    ...arena(80, 24, [{ row: 9, col: 6, chars: '@' }, floorRow(80, 19)], [slab(12, 12, 3, liftPath)]),
    sweep: { x0: 0, speed: 2 as const, delay: 100 },
  };
  const log = scriptedLog(3000, 4242);
  const a = runFromSpawn(swept, log);

  it('two runs are deep-equal on every step', () => {
    expect(runFromSpawn(swept, log)).toEqual(a);
  });

  it('is caught by the sweep and matches its pinned fingerprint', () => {
    expect(a.some((st) => st.events.some((e) => e.type === 'died' && e.cause === 'sweep'))).toBe(true);
    expect(fnv(a)).toBe('7ae3fb00');
  });
});
