/**
 * docs/design/features/tandem.md acceptance checks 1, 2, 3, 16, 17 (and the
 * determinism check 18 for them) through the real `step`. Check 2's parse
 * error for two `&` belongs to the level lane (parseTwin.test.ts).
 */
import { describe, expect, it } from 'vitest';
import type { InputFrame, Level, PlayerState, SimState } from '../types';
import { createSim } from './create';
import { advance, at, cruise, firstStep, frame, gridLevel, params, repeat, row, runFrames, runFromSpawn } from './testkit';

const HALF = params.playerWidth / 2;
const twinOf = (s: SimState): PlayerState => {
  if (!s.twin) throw new Error('no twin');
  return s.twin;
};

/** Two stacked lanes: runner `@` on floor row 7, twin `&` on floor row 15, same columns. */
function stacked(width: number): Level {
  const rows = Array.from({ length: 16 }, (_, r) => {
    if (r === 6) return row(width, '.', { 2: '@' });
    if (r === 7 || r === 15) return row(width, '#');
    if (r === 14) return row(width, '.', { 2: '&' });
    return row(width, '.');
  });
  return gridLevel(rows);
}

describe('tandem check 1: no twin, no change', () => {
  it('a level without & has twin null on every step', () => {
    const lvl = gridLevel([row(30, '.'), row(30, '.', { 2: '@' }), row(30, '#')]);
    const states = runFromSpawn(lvl, repeat(30, 'R'));
    expect(createSim(lvl, params).twin).toBeNull();
    expect(states.every((s) => s.twin === null)).toBe(true);
    expect(states.every((s) => s.player.home === false)).toBe(true);
  });

  it('a no-twin win emits won alone: no home event', () => {
    const lvl = gridLevel([row(30, '.'), row(30, '.', { 2: '@', 8: 'E' }), row(30, '#')]);
    const states = runFromSpawn(lvl, repeat(200, 'R'));
    const all = states.flatMap((s) => s.events);
    expect(all.some((e) => e.type === 'home')).toBe(false);
    expect(all.some((e) => e.type === 'won')).toBe(true);
  });
});

describe('tandem check 2: twin spawn', () => {
  it('stands at (col + 0.5, row + 1), facing right, gear 1, band 0, not home', () => {
    const lvl = stacked(40);
    expect(twinOf(createSim(lvl, params))).toMatchObject({ x: 2.5, y: 15, vx: 0, vy: 0, gear: 1, band: 0, facing: 1, grounded: true, home: false });
    const first = runFromSpawn(lvl, [frame('')])[0]!;
    expect(twinOf(first)).toMatchObject({ x: 2.5, y: 15, gear: 1, band: 0, facing: 1, grounded: true, home: false });
  });
});

describe('tandem check 3: same input, same lane, same result', () => {
  const lvl = stacked(120);
  const frames: InputFrame[] = Array.from({ length: 200 }, (_, i) => {
    const n = i + 1;
    return frame(`R${[1, 3, 5].includes(n) ? '+' : ''}${n === 60 ? 'J' : ''}`);
  });
  const states = runFromSpawn(lvl, frames);
  const ofBody = (s: SimState, b: 0 | 1) => s.events.filter((e) => 'body' in e && e.body === b).map((e) => ({ ...e, body: 0 }));

  it('twin (x - x0, y - y0), vx, vy, gear and band equal the runner on every step', () => {
    states.forEach((s) => {
      const t = twinOf(s);
      expect(t.x - 2.5).toBeCloseTo(s.player.x - 2.5, 12);
      expect(t.y - 15).toBeCloseTo(s.player.y - 7, 12);
      expect([t.vx, t.vy, t.gear, t.band]).toEqual([s.player.vx, s.player.vy, s.player.gear, s.player.band]);
    });
  });

  it('each step lists the runner events, then the same events with body 1', () => {
    states.forEach((s) => {
      expect(ofBody(s, 1)).toEqual(ofBody(s, 0));
      const bodies = s.events.map((e) => ('body' in e ? e.body : -1));
      expect(bodies).toEqual([...bodies].sort());
    });
    expect(states.some((s) => s.events.some((e) => e.type === 'jump'))).toBe(true);
    expect(states.some((s) => s.events.some((e) => e.type === 'land'))).toBe(true);
  });

  it('one shared direction priority: both bodies get the same moveDir with L and R held', () => {
    const run = runFromSpawn(lvl, [frame('R'), frame('RL'), frame('RL')]);
    run.forEach((s) => expect(twinOf(s).moveDir).toBe(s.player.moveDir));
    expect(twinOf(at(run, 3)).moveDir).toBe(-1);
  });
});

describe('tandem check 16: no body collision', () => {
  const rows = Array.from({ length: 11 }, (_, r) => {
    if (r === 9) return row(30, '.', { 2: '@', 5: '&', 10: '#' });
    if (r === 10) return row(30, '#');
    return row(30, '.', { 10: '#' });
  });
  const lvl = gridLevel(rows);
  const states = runFromSpawn(lvl, repeat(200, 'R'));

  it('both end flush against the wall with equal x', () => {
    const end = states[199]!;
    expect(end.player.x).toBeCloseTo(10 - HALF, 9);
    expect(twinOf(end).x).toBe(end.player.x);
  });

  it('the runner walks through the twin box at vx 3 until its own wall contact', () => {
    const contact = states.findIndex((s) => s.events.some((e) => e.type === 'wallStop' && e.body === 0));
    expect(contact).toBeGreaterThan(0);
    states.slice(0, contact).forEach((s) => expect(s.player.vx).toBe(3));
    expect(states.some((s) => s.player.x > 5.2 && s.player.x < 5.8)).toBe(true);
  });
});

describe('tandem check 17: per-body gating and grace', () => {
  const W = 200;
  const rows = Array.from({ length: 24 }, (_, r) => {
    if (r === 9) return row(W, '.', { 2: '@' });
    if (r === 10) return row(W, '#');
    if (r === 21) return row(W, '.', { 2: '&' });
    if (r === 22) return row(W, '#', { 20: 'G'.repeat(W - 20) });
    return row(W, '.');
  });
  const lvl = gridLevel(rows);
  const cruised = cruise(lvl, 2);
  const onGreen = runFrames(lvl, cruised, repeat(2000, 'R')).find((s) => twinOf(s).x - HALF >= 21)!;
  const s = runFrames(lvl, advance(lvl, onGreen, repeat(10, 'R')), [frame('R+'), ...repeat(40, 'R')]);

  it('setup: both cruise at gear 2', () => {
    expect([cruised.player.gear, twinOf(cruised).gear]).toEqual([2, 2]);
  });

  it('twin band 3 on action step 5 with graceStart body 1; grounded c+1..c+6, airborne c+7; run dies', () => {
    const c = firstStep(s, (t) => twinOf(t).band === 3);
    expect(c).toBe(5);
    expect(at(s, c).events).toContainEqual(expect.objectContaining({ type: 'graceStart', body: 1 }));
    for (let k = 1; k <= 6; k += 1) expect(twinOf(at(s, c + k)).grounded).toBe(true);
    expect(twinOf(at(s, c + 7)).grounded).toBe(false);
    const died = s.find((t) => t.status === 'dead');
    expect(died).toBeDefined();
    expect(died!.events).toContainEqual({ type: 'died', body: 1 });
  });

  it('the runner changes band on step c with its own graceStart and stays grounded on safe tiles', () => {
    expect(firstStep(s, (t) => t.player.band === 3)).toBe(5);
    expect(at(s, 5).events).toContainEqual(expect.objectContaining({ type: 'graceStart', body: 0 }));
    const deadAt = firstStep(s, (t) => t.status === 'dead');
    s.slice(0, deadAt - 1).forEach((t) => expect(t.player.grounded).toBe(true));
  });
});

describe('tandem check 18: determinism', () => {
  it('a twin run gives deep-equal states and events twice', () => {
    const lvl = stacked(120);
    const frames = repeat(100, 'R+');
    expect(runFromSpawn(lvl, frames)).toEqual(runFromSpawn(lvl, frames));
  });
});
