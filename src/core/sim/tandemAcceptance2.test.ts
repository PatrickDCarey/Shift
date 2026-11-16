/**
 * docs/design/features/tandem.md acceptance checks 4-15 (and determinism,
 * check 18, for them) through the real `step`. Checks 1-3, 16-17 live in
 * tandemAcceptance.test.ts. "Action step n" = n-th state of the run list.
 */
import { describe, expect, it } from 'vitest';
import type { InputFrame, Level, PlayerState, SimEvent, SimState } from '../types';
import { createSim } from './create';
import { at, cruise, eventTypes, firstStep, frame, gridLevel, params, repeat, row, runFrames, runFromSpawn, type Placement } from './testkit';

const HALF = params.playerWidth / 2;
const twinOf = (s: SimState): PlayerState => {
  if (!s.twin) throw new Error('no twin');
  return s.twin;
};
const onBody = (s: SimState, body: 0 | 1, type: string): SimEvent[] =>
  s.events.filter((e) => e.type === type && 'body' in e && e.body === body);

/** A blank `width` x `height` grid with `places` written over it. */
function build(width: number, height: number, places: readonly Placement[]): Level {
  const base = Array.from({ length: height }, () => row(width, '.'));
  const rows = places.reduce(
    (acc, p) => acc.map((line, r) => (r === p.row ? line.slice(0, p.col) + p.chars + line.slice(p.col + p.chars.length) : line)),
    base,
  );
  return gridLevel(rows);
}

const fill = (rows: readonly number[], col: number, chars: string): Placement[] => rows.map((r) => ({ row: r, col, chars }));

/** Stacked lanes: runner spawn (2, 5) on floor row 6, twin spawn (2, 12) on floor row 13; 14 rows. */
function stacked(width: number, extra: readonly Placement[] = [], twinFloor = '#'.repeat(width), pad = 0): Level {
  return build(width, 14 + pad, [
    { row: 5, col: 2, chars: '@' },
    { row: 6, col: 0, chars: '#'.repeat(width) },
    { row: 12, col: 2, chars: '&' },
    { row: 13, col: 0, chars: twinFloor },
    ...extra,
  ]);
}

const gears = (s: SimState): number[] => [s.player.gear, twinOf(s).gear];

describe('tandem check 4: a wall stops one body', () => {
  const lvl = stacked(120, fill([0, 1, 2, 3, 4, 5], 30, 'R'));
  const run = runFrames(lvl, cruise(lvl, 4), repeat(120, 'R'));
  const contact = firstStep(run, (s) => onBody(s, 0, 'wallStop').length > 0);

  it('contact step: runner vx 0, gear 4, band 0, one wallStop body 0; twin vx 12, band 4', () => {
    expect(contact).toBeGreaterThan(0);
    const s = at(run, contact);
    expect(onBody(s, 0, 'wallStop')).toHaveLength(1);
    expect(onBody(s, 1, 'wallStop')).toHaveLength(0);
    expect(s.player).toMatchObject({ vx: 0, gear: 4, band: 0 });
    expect(twinOf(s)).toMatchObject({ vx: 12, band: 4 });
  });

  it('runner ramps from standing: band 1, 2, 3, 4 on steps 1, 10, 23, 32; twin stays band 4', () => {
    const after = run.slice(contact);
    expect([1, 10, 23, 32].map((n) => at(after, n).player.band)).toEqual([1, 2, 3, 4]);
    expect(at(after, 9).player.band).toBe(1);
    expect(at(after, 22).player.band).toBe(2);
    expect(at(after, 31).player.band).toBe(3);
    [1, 10, 23, 32].forEach((n) => expect(at(after, n).twin?.band).toBe(4));
  });
});

/** Check 5 level: runner lane gets a hanging safe block 3.0 tiles past the launch x (heights +2..+5). */
function splitSetup(): { lvl: Level; start: SimState; face: number; flight: SimState[] } {
  // The cruise ramp leaves x at .897 (mod 1), so a face exactly 3.0 past the launch x is impossible on a
  // tile grid; settle 62 gives the nearest integer face above it, 3.103 past (derived, filed in requests).
  const settle = 62;
  const start = cruise(stacked(120), 4, 'R', settle);
  const face = Math.ceil(start.player.x + 3);
  const lvl = stacked(120, fill([1, 2, 3], face, '#'));
  const run = runFrames(lvl, cruise(lvl, 4, 'R', settle), [frame('RJ'), ...repeat(80, 'R')]);
  return { lvl, start, face, flight: run };
}

describe('tandem check 5: gear split in the air', () => {
  const { start, flight: s, face } = splitSetup();
  const land = (b: 0 | 1): number => firstStep(s, (t) => onBody(t, b, 'land').length > 0);

  it('runner: wall stop on flight step 14, vx 0, gear 1, x = face - half width; lands on step 48', () => {
    expect(firstStep(s, (t) => onBody(t, 0, 'wallStop').length > 0)).toBe(14);
    expect(at(s, 14).player).toMatchObject({ vx: 0, gear: 1 });
    expect(at(s, 14).player.x).toBeCloseTo(face - HALF, 9);
    expect(land(0)).toBe(48);
    expect(at(s, 48).player.vx).toBe(0);
  });

  it('twin: drop to 9 on flight step 30, lands on step 48, 8.70 out, gear 3', () => {
    expect(firstStep(s, (t) => onBody(t, 1, 'airDrag').length > 0)).toBe(30);
    expect(at(s, 30).twin?.vx).toBe(9);
    expect(land(1)).toBe(48);
    expect(twinOf(at(s, 48)).x - twinOf(start).x).toBeCloseTo(8.7, 2);
    expect(twinOf(at(s, 48)).gear).toBe(3);
  });

  it('next step holding R: runner vx 3 (band 1), twin vx 9 (band 3)', () => {
    expect(at(s, 49).player).toMatchObject({ vx: 3, band: 1 });
    expect(twinOf(at(s, 49))).toMatchObject({ vx: 9, band: 3 });
  });
});

describe('tandem check 6: clamp resync up', () => {
  const { lvl, flight } = splitSetup();
  const end = at(flight, 49);
  const s = runFrames(lvl, end, [frame('R+'), frame('R'), frame('R+'), frame('R'), frame('R+'), ...repeat(40, 'R')]);

  it('end state is runner gear 1 at 3, twin gear 3 at 9', () => {
    expect(gears(end)).toEqual([1, 3]);
    expect([end.player.vx, twinOf(end).vx]).toEqual([3, 9]);
  });

  it('gears after steps 1, 3, 5: (2,4), (3,4), (4,4)', () => {
    expect(gears(at(s, 1))).toEqual([2, 4]);
    expect(gears(at(s, 3))).toEqual([3, 4]);
    expect(gears(at(s, 5))).toEqual([4, 4]);
  });

  it('twin band 4 on action step 4; runner band 4 on step 31 and vx 12 from step 35', () => {
    expect(firstStep(s, (t) => twinOf(t).band === 4)).toBe(4);
    expect(firstStep(s, (t) => t.player.band === 4)).toBe(31);
    expect(firstStep(s, (t) => t.player.vx === 12)).toBe(35);
  });

  it('by action step 40 both are gear 4, band 4, vx 12', () => {
    const t = at(s, 40);
    expect(gears(t)).toEqual([4, 4]);
    expect([t.player.band, twinOf(t).band]).toEqual([4, 4]);
    expect([t.player.vx, twinOf(t).vx]).toEqual([12, 12]);
  });
});

describe('tandem check 7: clamp resync down', () => {
  it('runner gear 4, twin gear 2, both grounded: three separate - presses leave both in gear 1', () => {
    const lvl = stacked(40);
    const base = createSim(lvl, params);
    const split: SimState = { ...base, player: { ...base.player, gear: 4 }, twin: { ...twinOf(base), gear: 2 } };
    const s = runFrames(lvl, split, [frame('-'), frame(''), frame('-'), frame(''), frame('-')]);
    expect(gears(at(s, 1))).toEqual([3, 1]);
    expect(gears(at(s, 3))).toEqual([2, 1]);
    expect(gears(at(s, 5))).toEqual([1, 1]);
  });
});

/**
 * Runner (top) walks off a 4-tile ledge at col `edge`; twin lane (bottom) is flat.
 * Runner spawn (2, 5); ledge floor row 6, lower floor row 10, divider rows 10-11, twin floor row 18.
 */
function ledgeLevel(edge: number): Level {
  return build(60, 19, [
    { row: 5, col: 2, chars: '@' },
    { row: 6, col: 0, chars: '#'.repeat(edge) },
    { row: 10, col: 0, chars: '#'.repeat(60) },
    { row: 11, col: 0, chars: '#'.repeat(60) },
    { row: 17, col: 2, chars: '&' },
    { row: 18, col: 0, chars: '#'.repeat(60) },
  ]);
}

describe('tandem checks 8-9: one body airborne, one on the ground', () => {
  const lvl = ledgeLevel(8);
  const base = runFromSpawn(lvl, repeat(200, 'R'));
  const off = firstStep(base, (s) => !s.player.grounded);
  const landing = off + 28;
  /** Frames holding R, with `extra` letters on airborne step k (walk-off step = 1). */
  const withAt = (k: number, letters: string): InputFrame[] =>
    repeat(200, 'R').map((f, i) => (i === off + k - 2 ? frame(`R${letters}`) : f));

  it('setup: the runner is airborne for 29 steps and lands in gear 1', () => {
    expect(onBody(at(base, landing), 0, 'land')).toHaveLength(1);
    expect(base[landing - 2]!.player.grounded).toBe(false);
    expect(at(base, landing).player.gear).toBe(1);
  });

  it('+ on airborne step 10: twin gear 2 at the end of it; the runner buffers, it expires, lands in gear 1', () => {
    const s = runFromSpawn(lvl, withAt(10, '+'));
    expect(onBody(at(s, off + 9), 1, 'shift')).toHaveLength(1);
    expect(twinOf(at(s, off + 9)).gear).toBe(2);
    expect(onBody(at(s, off + 9), 0, 'shiftBuffered')).toHaveLength(1);
    expect(at(s, landing).player.gear).toBe(1);
  });

  it('+ on airborne step 25: the runner is gear 2 at the end of its landing step', () => {
    const s = runFromSpawn(lvl, withAt(25, '+'));
    expect(onBody(at(s, landing), 0, 'land')).toHaveLength(1);
    expect(at(s, landing).player.gear).toBe(2);
  });

  it('check 9: J on airborne step 26: the twin launches then; the runner jump fires the step after landing', () => {
    const s = runFromSpawn(lvl, withAt(26, 'J'));
    expect(onBody(at(s, off + 25), 1, 'jump')).toHaveLength(1);
    expect(onBody(at(s, off + 25), 0, 'jump')).toHaveLength(0);
    expect(onBody(at(s, landing), 0, 'jump')).toHaveLength(0);
    expect(onBody(at(s, landing + 1), 0, 'jump')).toHaveLength(1);
  });
});

describe('tandem check 10: home, then win', () => {
  const lvl = stacked(60, [{ row: 5, col: 8, chars: 'E' }, { row: 12, col: 14, chars: 'E' }]);
  const s = runFromSpawn(lvl, repeat(400, 'R'));
  const h0 = firstStep(s, (t) => t.player.home);
  const h1 = firstStep(s, (t) => twinOf(t).home);

  it('runner home first: home body 0, still playing; its state is frozen from then on', () => {
    expect(h0).toBeGreaterThan(0);
    expect(onBody(at(s, h0), 0, 'home')).toHaveLength(1);
    expect(at(s, h0).status).toBe('playing');
    expect(at(s, h0 - 1).player.x + HALF).toBeLessThanOrEqual(8 + 0.06);
    s.slice(h0).forEach((t) => expect(t.player).toEqual(at(s, h0).player));
    s.slice(h0).forEach((t) => expect(t.events.filter((e) => 'body' in e && e.body === 0 && e.type !== 'home')).toEqual([]));
  });

  it('twin home later: home body 1 then won; wonAtStep is that step', () => {
    expect(h1).toBeGreaterThan(h0);
    const w = at(s, h1);
    expect(eventTypes(w).slice(-2)).toEqual(['home', 'won']);
    expect(onBody(w, 1, 'home')).toHaveLength(1);
    expect(w.status).toBe('won');
    expect(w.wonAtStep).toBe(w.step);
    expect(at(s, h1 - 1).status).toBe('playing');
  });
});

describe('tandem check 11: both home on the same step', () => {
  it('won on the first step both overlap, home body 0 then body 1 then won', () => {
    const lvl = stacked(60, [{ row: 5, col: 8, chars: 'E' }, { row: 12, col: 8, chars: 'E' }]);
    const s = runFromSpawn(lvl, repeat(200, 'R'));
    const w = at(s, firstStep(s, (t) => t.status === 'won'));
    expect(w.events).toEqual([
      { type: 'home', body: 0 },
      { type: 'home', body: 1 },
      { type: 'won' },
    ]);
    expect(w.player.home && twinOf(w).home).toBe(true);
    expect(s.filter((t) => t.player.home).map((t) => t.step)[0]).toBe(w.step);
  });
});

describe('tandem check 12: the twin falls, the run dies', () => {
  const lvl = stacked(60, [], '#'.repeat(5) + '.'.repeat(55));
  const s = runFromSpawn(lvl, repeat(200, 'R'));
  const died = firstStep(s, (t) => t.status === 'dead');

  it('died with body 1 on the step the twin box top passes below the grid', () => {
    expect(died).toBeGreaterThan(0);
    expect(at(s, died).events).toEqual([{ type: 'died', body: 1 }]);
    expect(twinOf(at(s, died)).y - 1.5).toBeGreaterThan(lvl.height);
    expect(twinOf(at(s, died - 1)).y - 1.5).toBeLessThanOrEqual(lvl.height);
    expect(at(s, died).player.grounded).toBe(true);
  });

  it('after the freeze both bodies respawn at their spawns (gear 1, band 0, home false)', () => {
    const back = died + firstStep(s.slice(died), (t) => t.status === 'playing');
    expect(back).toBeGreaterThan(died + params.deathFreezeSteps - 1);
    const fresh = createSim(lvl, params);
    expect(at(s, back).player).toEqual(fresh.player);
    expect(twinOf(at(s, back))).toEqual(twinOf(fresh));
    expect(twinOf(at(s, back))).toMatchObject({ gear: 1, band: 0, home: false });
  });
});

/** Runner lane at the bottom (exit in the last row, over a pit), twin lane on top with a far exit. */
function homeOverBottom(): Level {
  return build(40, 14, [
    { row: 5, col: 2, chars: '&' },
    { row: 6, col: 0, chars: '#'.repeat(40) },
    { row: 12, col: 2, chars: '@' },
    { row: 13, col: 0, chars: '#'.repeat(6) },
    { row: 13, col: 7, chars: 'E' },
    { row: 5, col: 20, chars: 'E' },
  ]);
}

describe('tandem check 13: home beats death', () => {
  const lvl = homeOverBottom();
  const s = runFromSpawn(lvl, repeat(600, 'R'));
  const h0 = firstStep(s, (t) => t.player.home);

  it('a runner home over the bottom row never triggers died; the twin then wins the run', () => {
    expect(h0).toBeGreaterThan(0);
    expect(at(s, h0).player.y).toBeGreaterThan(13);
    expect(s.some((t) => t.status === 'dead' || eventTypes(t).includes('died'))).toBe(false);
    const w = firstStep(s, (t) => t.status === 'won');
    expect(w).toBeGreaterThan(h0 + 100);
    expect(onBody(at(s, w), 1, 'home')).toHaveLength(1);
    expect(at(s, w).player).toEqual(at(s, h0).player);
  });
});

describe('tandem check 14: no win with one body dead on the same step', () => {
  /** Twin pit at `pit`; finds the exit col that the runner first overlaps on the step the twin dies. */
  function coincident(): { lvl: Level; died: number } | null {
    // Fall time (hence the death step) grows with the rows under the pit; x advances 0.05 a step, so
    // some padding makes the runner cross an exit edge on exactly the death step.
    const floor = '#'.repeat(5) + '.'.repeat(75);
    for (let pad = 0; pad < 40; pad += 1) {
      const plain = runFromSpawn(stacked(80, [], floor, pad), repeat(300, 'R'));
      const d = firstStep(plain, (t) => t.status === 'dead');
      if (d < 2) continue;
      const col = Math.floor(at(plain, d).player.x + HALF);
      if (col <= at(plain, d - 1).player.x + HALF) continue;
      const lvl = stacked(80, [{ row: 5, col, chars: 'E' }], floor, pad);
      const s = runFromSpawn(lvl, repeat(300, 'R'));
      if (firstStep(s, (t) => t.player.home) === d) return { lvl, died: d };
    }
    return null;
  }

  it('the runner overlaps an exit on the step the twin falls out: dead, not won', () => {
    const found = coincident();
    expect(found).not.toBeNull();
    const s = runFromSpawn(found!.lvl, repeat(300, 'R'));
    const t = at(s, found!.died);
    expect(t.status).toBe('dead');
    expect(t.wonAtStep).toBeNull();
    expect(eventTypes(t)).toEqual(['home', 'died']);
    expect(onBody(t, 1, 'died')).toHaveLength(1);
    expect(s.some((x) => x.status === 'won')).toBe(false);
  });
});

describe('tandem check 15: restart resets both', () => {
  const lvl = stacked(60, [{ row: 5, col: 8, chars: 'E' }, { row: 12, col: 20, chars: 'E' }]);
  const run = runFromSpawn(lvl, repeat(150, 'R'));
  const mid = run[run.length - 1]!;

  it('setup: the runner is home, the twin is not, and the run is still playing', () => {
    expect([mid.player.home, twinOf(mid).home, mid.status]).toEqual([true, false, 'playing']);
  });

  it('restart press then the respawn step: both bodies equal the fresh-load state', () => {
    const [pressed, respawn] = runFrames(lvl, mid, [frame('R!'), frame('R')]);
    expect(pressed!.status).toBe('restarting');
    expect(pressed!.events).toEqual([{ type: 'restart' }]);
    const fresh = createSim(lvl, params);
    expect(respawn!.status).toBe('playing');
    expect(respawn!.player).toEqual(fresh.player);
    expect(twinOf(respawn!)).toEqual(twinOf(fresh));
    expect([respawn!.player.home, twinOf(respawn!).home, respawn!.player.gear]).toEqual([false, false, 1]);
  });

  it('after the runner is home and the twin dies, the respawn clears the runner home flag', () => {
    const pit = stacked(60, [{ row: 5, col: 8, chars: 'E' }], '#'.repeat(40) + '.'.repeat(20));
    const s = runFromSpawn(pit, repeat(1500, 'R'));
    const died = firstStep(s, (t) => t.status === 'dead');
    expect(at(s, died).player.home).toBe(true);
    const back = at(s, died + firstStep(s.slice(died), (t) => t.status === 'playing'));
    expect([back.player.home, twinOf(back).home]).toEqual([false, false]);
    expect(back.player).toEqual(createSim(pit, params).player);
  });
});

describe('tandem check 18 (checks 4-15): determinism', () => {
  const scenarios: [string, Level, InputFrame[]][] = [
    ['wall', stacked(120, fill([0, 1, 2, 3, 4, 5], 30, 'R')), [...repeat(6, 'R+'), ...repeat(250, 'R')]],
    ['split', splitSetup().lvl, [...repeat(80, 'R+'), frame('RJ'), ...repeat(80, 'R')]],
    ['ledge', ledgeLevel(8), repeat(200, 'R').map((f, i) => (i % 17 === 0 ? frame('RJ+') : f))],
    ['home', homeOverBottom(), repeat(600, 'R')],
    ['death', stacked(60, [], '#'.repeat(5) + '.'.repeat(55)), [...repeat(200, 'R'), frame('!'), ...repeat(10, 'R')]],
  ];
  it.each(scenarios)('%s gives deep-equal states and events twice', (_n, lvl, frames) => {
    expect(runFromSpawn(lvl, frames)).toEqual(runFromSpawn(lvl, frames));
  });
});
