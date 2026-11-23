/**
 * checkpoints.md acceptance checks 2-10 plus the tech rules of contracts/checkpoints.ts
 * (two clocks, forward-only, respawn at the post, R clears) through the real `step`.
 * "Room K": spawn col 2, safe floor row 11, post col 30, pit col 40, exit col 60.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type Emitter, type InputFrame, type Level, type Mover, type SimState } from '../types';
import { kineticStep } from './checkpoints';
import { createSim } from './create';
import { arena, floorRow, liftPath, slab } from './moversKit';
import { frame, params, runFromSpawn, type Placement } from './testkit';
import { step } from './step';

interface Opts {
  pits?: readonly number[];
  posts?: readonly number[];
  clock?: number;
  exit?: number;
  movers?: readonly Mover[];
  emitters?: readonly Emitter[];
}

function roomK(o: Opts = {}): Level {
  const places: Placement[] = [
    { row: 10, col: 2, chars: '@' },
    floorRow(140, 11),
    ...(o.pits ?? [40]).map((col) => ({ row: 11, col, chars: '.' })),
    ...(o.exit === undefined ? [] : [{ row: 10, col: o.exit, chars: 'E' }]),
  ];
  const base = arena(140, 14, places, o.movers ?? []);
  const { movers, ...rest } = base;
  const posts = (o.posts ?? [30]).map((col) => ({ cell: { col, row: 10 }, clock: o.clock ?? 0 }));
  return { ...rest, ...(o.movers ? { movers } : {}), ...(o.emitters ? { emitters: o.emitters } : {}), checkpoints: posts };
}

const R = frame('R');
const RJ = frame('RJ');
const L = frame('L');

/** Drives the real step with a decision function; returns every state and the frames fed. */
function play(level: Level, decide: (s: SimState, deaths: number) => InputFrame, max: number) {
  const states: SimState[] = [];
  const frames: InputFrame[] = [];
  let s = createSim(level, params);
  let deaths = 0;
  for (let i = 0; i < max && s.status !== 'won'; i += 1) {
    const f = decide(s, deaths);
    frames.push(f);
    const next = step(s, f, level, params);
    if (next.status === 'dead' && s.status !== 'dead') deaths += 1;
    states.push(next);
    s = next;
  }
  return { states, frames };
}

/** Hold R; jump the pit at col 40 once `jumpAfter` deaths have happened. */
const pitBot = (jumpAfter: number) => (s: SimState, deaths: number): InputFrame =>
  deaths >= jumpAfter && s.status === 'playing' && s.player.grounded && s.player.x >= 38.8 && s.player.x < 39.5 ? RJ : R;

const firstLit = (states: readonly SimState[]): number => states.findIndex((s) => s.checkpoint !== undefined);
const deathIdx = (states: readonly SimState[], from = 0): number => states.findIndex((s, i) => i >= from && s.status === 'dead' && states[i - 1]?.status === 'playing');

describe('check 2: activation', () => {
  const lvl = roomK();
  const { states } = play(lvl, pitBot(99), 700);
  it('lights on the first step the box overlaps col 30, once', () => {
    const i = firstLit(states);
    expect(i).toBeGreaterThan(0);
    const s = states[i] as SimState;
    expect(s.checkpoint).toEqual({ index: 0, kinBase: 0 });
    expect(s.player.x).toBeGreaterThan(29.625);
    expect((states[i - 1] as SimState).player.x).toBeLessThanOrEqual(29.625 + 1e-6);
    const changes = states.filter((st, k) => st.checkpoint?.index !== states[k - 1]?.checkpoint?.index);
    expect(changes).toHaveLength(1);
  });
  it('a full jump over col 30 also lights it, in the air', () => {
    const jump = (st: SimState): InputFrame => (st.player.grounded && st.player.x >= 28.2 && st.player.x < 28.6 ? RJ : R);
    const { states } = play(roomK({ pits: [] }), jump, 700);
    const i = firstLit(states);
    expect(i).toBeGreaterThan(0);
    expect((states[i] as SimState).player.grounded).toBe(false);
  });
});

describe('checks 3 and 4: respawn at the post, level time includes the death', () => {
  const lvl = roomK({ exit: 60 });
  const { states, frames } = play(lvl, pitBot(1), 3000);
  const d = deathIdx(states);
  it('after 24 frozen steps the body stands at the post as a fresh spawn', () => {
    expect(states[d]?.respawnInSteps).toBe(24);
    for (let k = 1; k <= 24; k += 1) expect(states[d + k]?.status).toBe('dead');
    const died = states[d] as SimState;
    const r = states[d + 25] as SimState;
    expect(r.status).toBe('playing');
    expect(r.player).toMatchObject({ x: 30.5, y: 11, vx: 0, vy: 0, gear: params.startGear, band: 0, facing: 1, grounded: true, home: false });
    expect(r.step).toBe(died.step + 25);
    expect(r.checkpoint).toEqual({ index: 0, kinBase: r.step });
    expect(kineticStep(r)).toBe(0);
    expect(r.events).toEqual([]);
  });
  it('the level clock counts every frame since load: wonAtStep = frames', () => {
    const won = states[states.length - 1] as SimState;
    expect(won.status).toBe('won');
    expect(won.wonAtStep).toBe(frames.length);
    expect(won.step).toBe(frames.length);
  });
  it('the kinetic clock stands still through the freeze', () => {
    const k0 = kineticStep(states[d] as SimState);
    for (let k = 1; k <= 24; k += 1) expect(kineticStep(states[d + k] as SimState)).toBe(k0);
  });
});

describe('check 5: death before the post is today\'s respawn', () => {
  it('respawns at the spawn with step 0 and no checkpoint', () => {
    const lvl = roomK({ pits: [10] });
    const { states } = play(lvl, () => R, 400);
    const d = deathIdx(states);
    expect(d).toBeGreaterThan(0);
    expect(states.some((s) => s.checkpoint !== undefined)).toBe(false);
    const r = states[d + 25] as SimState;
    expect(r.step).toBe(0);
    expect(r.player.x).toBe(2.5);
    expect('checkpoint' in r).toBe(false);
  });
});

describe('check 6: R clears', () => {
  it('after R the body is at the spawn, step 0, post unlit; dying then respawns at the spawn', () => {
    const lvl = roomK({ pits: [10] });
    const jump = (s: SimState): InputFrame => (s.player.grounded && s.player.x >= 8.8 && s.player.x < 9.5 && s.step < 2000 ? RJ : R);
    const lit = play(lvl, jump, 700).states;
    const i = firstLit(lit);
    expect(i).toBeGreaterThan(0);
    const before = lit[lit.length - 1] as SimState;
    expect(before.checkpoint?.index).toBe(0);
    const pressed = step(before, { ...EMPTY_INPUT, restart: true }, lvl, params);
    expect(pressed.status).toBe('restarting');
    expect(pressed.step).toBe(before.step);
    const fresh = step(pressed, EMPTY_INPUT, lvl, params);
    expect(fresh.step).toBe(0);
    expect(fresh.player.x).toBe(2.5);
    expect('checkpoint' in fresh).toBe(false);
    // Now walk into the col-10 pit: respawn at the spawn, not the post.
    const after = Array.from({ length: 300 }, () => R).reduce<SimState[]>((acc, f) => [...acc, step(acc[acc.length - 1] as SimState, f, lvl, params)], [fresh]);
    const d = deathIdx(after);
    expect(d).toBeGreaterThan(0);
    const r = after[d + 25] as SimState;
    expect(r.step).toBe(0);
    expect(r.player.x).toBe(2.5);
    expect('checkpoint' in r).toBe(false);
  });
});

describe('check 7: same-step order', () => {
  it('reaching the post column and being hit on one step respawns at the post', () => {
    const dense: Emitter = { cell: { col: 29, row: 0 }, dir: 'd', range: 12, speed: 4, period: 12, phase: 0, band: null };
    const lvl = roomK({ emitters: [dense] });
    const start = createSim(lvl, params);
    const near: SimState = { ...start, step: 200, player: { ...start.player, x: 29.6, vx: 3 } };
    const hit = step(near, R, lvl, params);
    expect(hit.status).toBe('dead');
    expect(hit.events.find((e) => e.type === 'died')).toMatchObject({ cause: 'hit' });
    expect(hit.checkpoint).toEqual({ index: 0, kinBase: 0 });
    const frozen = Array.from({ length: 25 }, () => R).reduce((s) => step(s, R, lvl, params), hit);
    expect(frozen.status).toBe('playing');
    expect(frozen.player.x).toBe(30.5);
  });
});

describe('check 8: the kinetic clock restarts at the post (identical every life)', () => {
  const lane = (col: number): Emitter => ({ cell: { col, row: 10 }, dir: 'l', range: 12, speed: 4, period: 300, phase: 200, band: null });
  for (const clock of [0, 48]) {
    it(`bolt lane after a respawn is the same on every life (clock ${clock})`, () => {
      const lvl = roomK({ emitters: [lane(18)], posts: [8], clock, pits: [] });
      const { states } = play(lvl, (st) => (st.checkpoint ? frame('') : R), 1300);
      const respawns = states.map((s, i) => (s.status === 'playing' && states[i - 1]?.status === 'dead' ? i : -1)).filter((i) => i >= 0);
      expect(respawns.length).toBeGreaterThanOrEqual(2);
      expect(kineticStep(states[respawns[0] as number] as SimState)).toBe(clock);
      const gaps = respawns.map((r) => deathIdx(states, r) - r).filter((g) => g >= 0);
      expect(gaps.length).toBeGreaterThanOrEqual(2);
      // First shot leaves at s = 100 (phase 200) and first overlaps the body at t1 = 176: 176 - clock steps after the respawn.
      expect(new Set(gaps)).toEqual(new Set([176 - clock]));
    });
  }
  it('slab carry reads the kinetic clock, not the level clock', () => {
    const lvl = roomK({ movers: [slab(10, 11, 3, liftPath)], pits: [] });
    const start = createSim(lvl, params);
    const on: SimState = { ...start, step: 160, checkpoint: { index: 0, kinBase: 100 }, player: { ...start.player, x: 11.5, y: 11, grounded: true } };
    const next = step(on, frame(''), lvl, params);
    expect(next.player.y).toBe(11 - 0.0625);
    expect(next.step).toBe(161);
  });
});

describe('check 9: forward only', () => {
  it('after lighting col 80, walking back and dying respawns at col 80; col 30 lights once', () => {
    const lvl = roomK({ posts: [30, 80] });
    let back = false;
    const decide = (s: SimState, deaths: number): InputFrame => {
      if (s.checkpoint?.index === 1 && s.player.x >= 80.6 && deaths === 0) back = true;
      return back && deaths === 0 ? L : pitBot(0)(s, deaths);
    };
    const { states } = play(lvl, decide, 3200);
    const d = deathIdx(states);
    expect(d).toBeGreaterThan(0);
    const r = states[d + 25] as SimState;
    expect(r.player.x).toBe(80.5);
    expect(r.checkpoint?.index).toBe(1);
    const order = states.reduce<number[]>((acc, s) => (s.checkpoint && acc[acc.length - 1] !== s.checkpoint.index ? [...acc, s.checkpoint.index] : acc), []);
    expect(order).toEqual([0, 1]);
  });
});

describe('check 10 and the deathless identity', () => {
  const lvl = roomK({ exit: 60 });
  it('a recording with two deaths after the post replays to the same wonAtStep', () => {
    const { states, frames } = play(lvl, pitBot(2), 6000);
    const won = states[states.length - 1] as SimState;
    expect(won.status).toBe('won');
    const replay = runFromSpawn(lvl, frames);
    expect(replay).toEqual(states);
    expect(replay[replay.length - 1]?.wonAtStep).toBe(frames.length);
    expect(states.filter((s, i) => s.status === 'dead' && states[i - 1]?.status === 'playing')).toHaveLength(2);
  });
  it('a deathless run is identical to the same level without posts (apart from the field)', () => {
    const jump = (s: SimState): InputFrame => (s.player.grounded && s.player.x >= 38.8 && s.player.x < 39.5 ? RJ : R);
    const withPosts = play(lvl, jump, 2000).states;
    const { checkpoints: _c, ...plain } = lvl;
    const without = play(plain, jump, 2000).states;
    const strip = (s: SimState): SimState => {
      const { checkpoint: _l, ...rest } = s;
      return rest;
    };
    expect(withPosts.map(strip)).toEqual(without);
    expect(withPosts[withPosts.length - 1]?.status).toBe('won');
  });
});
