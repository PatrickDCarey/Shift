/**
 * `fallThrough` sim event (architecture.md 3.2, T-07; adaptive-audio.md check 5):
 * "the floor you stood on let you go". Never mid-flight, never on a jump.
 */
import { describe, expect, it } from 'vitest';
import type { PlayerState, SimEvent, SimState } from '../types';
import { outcomePhase } from './status';
import { at, eventTypes, firstStep, frame, gridLevel, params, repeat, row, runFromSpawn, type Placement } from './testkit';

type FallThrough = Extract<SimEvent, { type: 'fallThrough' }>;
const falls = (s: SimState): FallThrough[] => s.events.filter((e): e is FallThrough => e.type === 'fallThrough');
const allFalls = (states: readonly SimState[]): FallThrough[] => states.flatMap(falls);
const twinOf = (s: SimState): PlayerState => {
  if (!s.twin) throw new Error('no twin');
  return s.twin;
};

/** A blank grid with `places` (row, col, chars) written over it. */
function build(width: number, height: number, places: readonly Placement[]) {
  const rows = places.reduce(
    (acc, p) => acc.map((line, r) => (r === p.row ? line.slice(0, p.col) + p.chars + line.slice(p.col + p.chars.length) : line)),
    Array.from({ length: height }, () => row(width, '.')),
  );
  return gridLevel(rows);
}

describe('fallThrough: letting go on a blue bridge (check 5a)', () => {
  // Runner spawns on safe cols 0-3, then a blue bridge; run right, then let go.
  const lvl = build(60, 14, [
    { row: 9, col: 2, chars: '@' },
    { row: 10, col: 0, chars: '####' + 'B'.repeat(56) },
  ]);
  const s = runFromSpawn(lvl, [...repeat(60, 'R'), ...repeat(40, '')]);
  const step = firstStep(s, (t) => falls(t).length > 0);

  it('fires exactly once, for body 0, on the step the body leaves the floor', () => {
    expect(allFalls(s)).toHaveLength(1);
    expect(step).toBeGreaterThan(60);
    const prev = at(s, step - 1);
    const now = at(s, step);
    expect(prev.player.grounded).toBe(true);
    expect(now.player.grounded).toBe(false);
    expect(now.player.coyoteSteps).toBeGreaterThan(0);
    expect(falls(now)[0]?.body).toBe(0);
  });

  it('lists the blue cells under the footprint, left to right, never empty', () => {
    const cells = falls(at(s, step))[0]?.cells ?? [];
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.band === 1 && c.row === 10)).toBe(true);
    expect(cells.map((c) => c.col)).toEqual([...cells.map((c) => c.col)].sort((a, b) => a - b));
  });

  it('is ordered right after ceiling and before airDrag, bandChange, land, graceStart', () => {
    const order = eventTypes(at(s, step));
    const i = order.indexOf('fallThrough');
    for (const later of ['airDrag', 'bandChange', 'land', 'graceStart']) {
      const j = order.indexOf(later);
      if (j >= 0) expect(j).toBeGreaterThan(i);
    }
  });
});

describe('fallThrough: walking off a safe tile onto a mismatched one', () => {
  const lvl = build(40, 14, [
    { row: 9, col: 2, chars: '@' },
    { row: 10, col: 0, chars: '######' + 'GGGG' },
  ]);
  const s = runFromSpawn(lvl, repeat(100, 'R'));

  it('fires when the last safe support goes, listing the green cells', () => {
    const step = firstStep(s, (t) => falls(t).length > 0);
    expect(step).toBeGreaterThan(0);
    const cells = falls(at(s, step))[0]?.cells ?? [];
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.band === 2 && c.row === 10 && c.col >= 6)).toBe(true);
    expect(allFalls(s)).toHaveLength(1);
  });
});

describe('fallThrough: never fires', () => {
  it('on a walk-off from a safe-only ledge', () => {
    const lvl = build(40, 14, [
      { row: 9, col: 2, chars: '@' },
      { row: 10, col: 0, chars: '######' },
    ]);
    const s = runFromSpawn(lvl, repeat(100, 'R'));
    expect(firstStep(s, (t) => !t.player.grounded)).toBeGreaterThan(0);
    expect(allFalls(s)).toHaveLength(0);
  });

  it('on a jump off a coloured floor', () => {
    const lvl = build(60, 14, [
      { row: 9, col: 2, chars: '@' },
      { row: 10, col: 0, chars: '####' + 'B'.repeat(56) },
    ]);
    const s = runFromSpawn(lvl, [...repeat(30, 'R'), frame('RJ'), ...repeat(30, 'R')]);
    expect(s.some((t) => eventTypes(t).includes('jump'))).toBe(true);
    expect(allFalls(s)).toHaveLength(0);
  });

  it('mid-flight, falling through coloured tiles the body does not match', () => {
    // Walk off a safe ledge; a green floor and a blue floor lie below, in the fall path.
    const lvl = build(40, 30, [
      { row: 9, col: 2, chars: '@' },
      { row: 10, col: 0, chars: '######' },
      { row: 14, col: 0, chars: 'G'.repeat(40) },
      { row: 18, col: 0, chars: 'B'.repeat(40) },
    ]);
    const s = runFromSpawn(lvl, repeat(90, 'R'));
    expect(allFalls(s)).toHaveLength(0);
  });

  it('on a restart or respawn step', () => {
    const lvl = build(40, 14, [
      { row: 9, col: 2, chars: '@' },
      { row: 10, col: 0, chars: '######' + 'GGGG' },
    ]);
    // Restart while the body is walking onto the green floor, then run again.
    const s = runFromSpawn(lvl, [...repeat(5, 'R'), frame('!'), ...repeat(3, ''), ...repeat(10, 'R')]);
    expect(s.some((t) => eventTypes(t).includes('restart'))).toBe(true);
    expect(allFalls(s)).toHaveLength(0);
  });
});

describe('fallThrough: Tandem, each body on its own', () => {
  // Runner lane: safe floor all along. Twin lane: safe stub, then a blue bridge.
  const lvl = build(60, 16, [
    { row: 5, col: 2, chars: '@' },
    { row: 6, col: 0, chars: '#'.repeat(60) },
    { row: 12, col: 2, chars: '&' },
    { row: 13, col: 0, chars: '####' + 'B'.repeat(56) },
  ]);
  const s = runFromSpawn(lvl, [...repeat(60, 'R'), ...repeat(40, '')]);

  it('only the twin falls through: one event with body 1, none for body 0', () => {
    const all = allFalls(s);
    expect(all).toHaveLength(1);
    expect(all[0]?.body).toBe(1);
    expect(all[0]?.cells.every((c) => c.band === 1 && c.row === 13)).toBe(true);
    const step = firstStep(s, (t) => falls(t).length > 0);
    expect(twinOf(at(s, step)).grounded).toBe(false);
    expect(at(s, step).player.grounded).toBe(true);
  });

  it('is deterministic: a second run gives deep-equal states and events', () => {
    expect(runFromSpawn(lvl, [...repeat(60, 'R'), ...repeat(40, '')])).toEqual(s);
  });
});

describe('fallThrough: never on a won step', () => {
  it('outcomePhase drops it when the step ends all-home', () => {
    const lvl = build(10, 4, [
      { row: 1, col: 2, chars: '@' },
      { row: 2, col: 2, chars: 'E' },
    ]);
    const s = runFromSpawn(lvl, [frame('')]);
    const p: PlayerState = { ...s[0]!.player, x: 2.5, y: 3 };
    const events: SimEvent[] = [{ type: 'fallThrough', body: 0, cells: [{ col: 2, row: 3, band: 1 }] }];
    const res = outcomePhase(p, null, events, lvl, params);
    expect(res.outcome).toBe('won');
    expect(res.events.map((e) => e.type)).toEqual(['won']);
  });
});
