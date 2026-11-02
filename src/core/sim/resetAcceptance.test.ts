/**
 * docs/design/features/safe-tiles-and-reset.md acceptance checks 1-14 through
 * the real `step`, plus the death/restart rulings of architecture.md §3.4.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type Gear, type SimState } from '../types';
import { createSim } from './create';
import { advance, at, cruise, eventTypes, firstStep, frame, gridLevel, params, repeat, room, runFrames, runFromSpawn } from './testkit';

const W = 240;
const HALF = params.playerWidth / 2;
const has = (type: string) => (s: SimState): boolean => eventTypes(s).includes(type);
const safeOverPit = room(W, 2, [{ row: 10, col: 0, chars: '#'.repeat(W) }], '.');
/** Safe floor on cols 0..9, then a pit to the bottom of the grid. */
const cliff = room(W, 2, [{ row: 10, col: 0, chars: '#'.repeat(10) }], '.');
const fresh = createSim(cliff, params);
const withoutPrev = (s: SimState): Omit<SimState, 'prevInput'> => {
  const { prevInput: _ignored, ...rest } = s;
  return rest;
};

/** Walk off the cliff holding `letters` (incl. R); returns the states and the death step d. */
function fallOut(letters = 'R', start: SimState = fresh, extra = 60): { s: SimState[]; d: number } {
  const s = runFrames(cliff, start, repeat(400 + extra, letters));
  return { s, d: firstStep(s, has('died')) };
}

describe('reset check 1-2: safe at every colour, safe walls at every gear', () => {
  it('standing and cruising at gears 1-4 on a safe row over a pit: grounded throughout', () => {
    expect(runFromSpawn(safeOverPit, repeat(60, '')).every((t) => t.player.grounded)).toBe(true);
    for (const gear of [1, 2, 3, 4] as Gear[]) {
      const start = cruise(safeOverPit, gear);
      expect(start.player.band).toBe(gear);
      expect(runFrames(safeOverPit, start, repeat(100, 'R')).every((t) => t.player.grounded)).toBe(true);
    }
  });

  it.each([1, 2, 3, 4] as Gear[])('gear %i into a safe wall: vx 0, gear unchanged', (gear) => {
    const lvl = room(W, 2, [7, 8, 9].map((r) => ({ row: r, col: 80, chars: '#' })));
    const s = runFrames(lvl, cruise(lvl, gear), repeat(2000, 'R'));
    const stop = at(s, firstStep(s, has('wallStop')));
    expect(stop.player).toMatchObject({ vx: 0, gear, x: 80 - HALF });
  });
});

describe('reset check 3: colour changes on a safe floor', () => {
  it('+, later - twice, later release, later skid from gear 4: grounded on every step', () => {
    const script = [
      frame('R+'), ...repeat(30, 'R'), frame('R-'), frame('R'), frame('R-'), ...repeat(30, 'R'),
      ...repeat(40, ''), frame('R+'), frame('R'), frame('R+'), frame('R'), frame('R+'), ...repeat(60, 'R'), ...repeat(80, 'L'),
    ];
    const s = runFrames(safeOverPit, cruise(safeOverPit, 2), script);
    expect(s.some((t) => t.player.vx < 0)).toBe(true);
    expect(s.every((t) => t.player.grounded)).toBe(true);
  });
});

describe('reset check 4: spawn state', () => {
  it('nothing held for 60 steps: gear 1, vx 0, band 0, x unchanged', () => {
    const s = runFromSpawn(cliff, repeat(60, ''));
    expect(s.every((t) => t.player.gear === 1 && t.player.vx === 0 && t.player.band === 0 && t.player.x === fresh.player.x)).toBe(true);
  });
});

describe('reset check 5-6: death and respawn', () => {
  const { s, d } = fallOut();

  it('died fires on the first step the box top is below the grid bottom, and no earlier', () => {
    expect(d).toBeGreaterThan(0);
    expect(at(s, d).player.y - params.playerHeight).toBeGreaterThan(cliff.height);
    expect(at(s, d - 1).player.y - params.playerHeight).toBeLessThanOrEqual(cliff.height);
    expect(s.slice(0, d - 1).some(has('died'))).toBe(false);
    expect(at(s, d)).toMatchObject({ status: 'dead', respawnInSteps: params.deathFreezeSteps });
  });

  it('frozen d+1..d+24, at the spawn on d+25 with the fresh-load state (except prevInput)', () => {
    for (let k = d + 1; k <= d + 24; k += 1) {
      expect(at(s, k).status).toBe('dead');
      expect(at(s, k).player).toEqual(at(s, d).player);
      expect(at(s, k).events).toEqual([]);
    }
    expect(withoutPrev(at(s, d + 25))).toEqual(withoutPrev(fresh));
    expect(at(s, d + 25).prevInput).toEqual(frame('R'));
  });
});

describe('reset check 7-9: gear reset, frozen input, held through respawn', () => {
  it('cruise at gear 3, die: gear 1 after respawn', () => {
    const { s, d } = fallOut('R', cruise(cliff, 3, 'R', 10));
    expect(at(s, d).player.gear).toBe(3);
    expect(at(s, d + 25).player.gear).toBe(1);
  });

  it('+, J and L during the freeze change nothing', () => {
    const { s, d } = fallOut();
    const dead = at(s, d);
    const busy = runFrames(cliff, dead, [frame('+'), frame('J'), ...repeat(10, 'L'), frame('L+J'), ...repeat(11, 'L')]);
    const idle = runFrames(cliff, dead, repeat(24, ''));
    expect(busy.map(withoutPrev)).toEqual(idle.map(withoutPrev));
  });

  it('holding R, J and + through death and respawn: vx 3, gear 1, no shift or jump on new-run step 1', () => {
    const { s, d } = fallOut('RJ+');
    const first = at(s, d + 26);
    expect(first.step).toBe(1);
    expect(first.player).toMatchObject({ vx: 3, gear: 1 });
    expect(eventTypes(first).filter((t) => t === 'shift' || t === 'jump' || t === 'shiftBuffered')).toEqual([]);
  });
});

describe('reset check 10-11: restart', () => {
  const startOf = (s: SimState): Omit<SimState, 'prevInput'> => withoutPrev(s);

  it('mid-run, mid-air and mid-skid: R on step r gives the fresh-load state on r+1', () => {
    const midRun = cruise(cliff, 2, 'R', 5);
    const midAir = advance(safeOverPit, cruise(safeOverPit, 4), [frame('RJ'), ...repeat(10, 'R')]);
    const midSkid = advance(safeOverPit, cruise(safeOverPit, 4), repeat(10, 'L'));
    expect(midAir.player.grounded).toBe(false);
    expect(midSkid.player.vx).toBeGreaterThan(0);
    for (const [lvl, state] of [[cliff, midRun], [safeOverPit, midAir], [safeOverPit, midSkid]] as const) {
      const s = runFrames(lvl, state, [frame('R!'), frame('RJ')]);
      expect(at(s, 1)).toMatchObject({ status: 'restarting', events: [{ type: 'restart' }] });
      expect(startOf(at(s, 2))).toEqual(startOf(createSim(lvl, params)));
    }
  });

  it('R 5 steps after a death: respawned on the next step', () => {
    const { s, d } = fallOut();
    const r = runFrames(cliff, at(s, d), [...repeat(4, ''), frame('!'), frame('')]);
    expect(at(r, 5).status).toBe('restarting');
    expect(withoutPrev(at(r, 6))).toEqual(withoutPrev(fresh));
  });

  it('holding restart does not repeat; a second press restarts again', () => {
    const s = runFromSpawn(cliff, [...repeat(5, 'R'), ...repeat(5, '!'), frame(''), frame('!')]);
    expect(s.filter(has('restart'))).toHaveLength(2);
  });
});

describe('reset check 12: exit', () => {
  it('walking into an exit at gear 1 completes on the first overlapping step; time = that step; inputs ignored after', () => {
    const lvl = room(60, 2, [{ row: 9, col: 12, chars: 'E' }]);
    const s = runFromSpawn(lvl, [...repeat(300, 'R'), frame('!'), ...repeat(5, 'LJ+')]);
    const w = firstStep(s, has('won'));
    expect(at(s, w)).toMatchObject({ status: 'won', wonAtStep: w, step: w });
    expect(at(s, w).player.x + HALF).toBeGreaterThan(12);
    expect(at(s, w - 1).player.x + HALF).toBeLessThanOrEqual(12 + 1e-9);
    expect(s.slice(w).every((t) => JSON.stringify(t.player) === JSON.stringify(at(s, w).player) && t.events.length === 0 && t.status === 'won')).toBe(true);
  });

  it('exit wins over death on the same step', () => {
    const lvl = gridLevel(['.....', '.@...', '.###.', '.....', 'E....']);
    const s = runFromSpawn(lvl, repeat(80, 'L'));
    const end = s.find((t) => t.status !== 'playing');
    expect(end?.status).toBe('won');
    expect(eventTypes(end!)).toEqual(expect.arrayContaining(['won']));
    expect(eventTypes(end!)).not.toContain('died');
  });
});

describe('reset check 13: bounds', () => {
  it('gear 4 into the right edge of the grid: wall stop', () => {
    const lvl = room(60, 2);
    const s = runFrames(lvl, cruise(lvl, 4, 'R', 10), repeat(300, 'R'));
    expect(at(s, firstStep(s, has('wallStop'))).player).toMatchObject({ vx: 0, x: 60 - HALF });
  });

  it('jumping under the top edge of the grid: ceiling bonk', () => {
    const lvl = gridLevel(['......', '.@....', '######', '#####E']);
    const s = runFromSpawn(lvl, [frame('J'), ...repeat(20, '')]);
    const hit = at(s, firstStep(s, has('ceiling')));
    expect(hit.player.y - params.playerHeight).toBe(0);
    expect(hit.player.vy).toBe(0);
  });
});

describe('reset check 14: determinism', () => {
  const script = [...repeat(20, 'R'), frame('R+'), ...repeat(40, 'R'), frame('RJ'), ...repeat(80, 'R'), ...repeat(30, '')];

  it('the same recording run twice gives identical states', () => {
    expect(runFromSpawn(cliff, script)).toEqual(runFromSpawn(cliff, script));
  });

  it('a run after a restart matches a run from a fresh load with the same inputs', () => {
    const before = runFromSpawn(cliff, [...repeat(30, 'R'), frame('!'), frame('')]);
    const after = runFrames(cliff, before.at(-1)!, script);
    expect(before.at(-1)!.prevInput).toEqual(EMPTY_INPUT);
    expect(after).toEqual(runFromSpawn(cliff, script));
  });
});
