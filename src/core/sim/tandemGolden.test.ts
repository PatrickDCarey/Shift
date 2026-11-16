/**
 * T-12 / tandem check 18: determinism of a two-body run, and a golden hash.
 *
 * Reason for the hash: it pins the whole step function for Tandem (both bodies'
 * phases, event order, outcome, fallThrough) over 4000 steps. If it changes, a
 * rule changed: re-record it only for a deliberate rule change and say why in
 * the commit. Recorded 2026-11-16 with the fallThrough event in the stream.
 */
import { describe, expect, it } from 'vitest';
import { INPUT_BUTTONS, type InputFrame, type SimState } from '../types';
import { gridLevel, row, runFromSpawn } from './testkit';

const W = 100;
const at = (rows: string[], r: number, col: number, chars: string): void => {
  rows[r] = (rows[r] ?? '').slice(0, col) + chars + (rows[r] ?? '').slice(col + chars.length);
};

/** Stacked lanes: runner on safe/colour mix, twin on a blue bridge, a wall and a gap. */
function level() {
  const rows = Array.from({ length: 20 }, (_, r) => row(W, '.', r === 0 ? { [W - 1]: 'E' } : {}));
  at(rows, 5, 2, '@');
  at(rows, 6, 0, '#'.repeat(W));
  at(rows, 6, 12, 'GGGG');
  at(rows, 6, 60, '....');
  for (const r of [2, 3, 4, 5]) at(rows, r, 80, 'R');
  at(rows, 15, 2, '&');
  at(rows, 16, 0, '####' + 'B'.repeat(26) + '#'.repeat(70));
  at(rows, 16, 50, '...');
  at(rows, 16, 70, 'YYYY');
  for (const r of [12, 13, 14, 15]) at(rows, r, 90, '#');
  at(rows, 19, 0, '#'.repeat(45));
  return gridLevel(rows);
}

function scriptedLog(length: number, seed: number): InputFrame[] {
  let state = seed;
  let cur: InputFrame = { left: false, right: true, jump: false, shiftUp: false, shiftDown: false, restart: false };
  return Array.from({ length }, () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    if (state % 9 === 0) {
      const bits = state >> 8;
      const next = Object.fromEntries(INPUT_BUTTONS.map((b, k) => [b, ((bits >> k) & 1) === 1])) as Record<string, boolean>;
      cur = { ...(next as unknown as InputFrame), restart: (bits & 0x3fc0) === 0, right: next.right || !next.left };
    }
    return cur;
  });
}

/** FNV-1a 32-bit over the JSON of every step's state. */
function hashStates(states: readonly SimState[]): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(states)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

describe('tandem determinism (check 18)', () => {
  const lvl = level();
  const log = scriptedLog(4000, 20261116);
  const a = runFromSpawn(lvl, log);
  const b = runFromSpawn(lvl, log);

  it('the log exercises both bodies and the fallThrough event', () => {
    const evs = a.flatMap((s) => s.events);
    expect(evs.some((e) => e.type === 'fallThrough' && e.body === 1)).toBe(true);
    expect(evs.some((e) => e.type === 'fallThrough' && e.body === 0)).toBe(true);
    expect(evs.some((e) => e.type === 'jump')).toBe(true);
    expect(evs.some((e) => e.type === 'died')).toBe(true);
  });

  it('two runs are deep-equal on every step', () => {
    expect(b).toEqual(a);
  });

  it('golden hash of the two-body run', () => {
    expect(hashStates(a)).toBe('6f32796f');
  });
});
