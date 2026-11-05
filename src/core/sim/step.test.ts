/**
 * Unit tests for createSim, the status gate, step order details and every
 * SimEvent type (architecture.md §3.1, §3.4, contracts/state.ts).
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, INPUT_BUTTONS, type InputFrame, type SimEvent, type SimState } from '../types';
import { createSim } from './create';
import { step } from './step';
import { advance, at, block, cruise, eventTypes, firstStep, frame, gridLevel, params, repeat, room, runFrames, runFromSpawn } from './testkit';

const level = room(240, 2);
const fresh = createSim(level, params);
const firstEvent = (states: readonly SimState[], type: SimEvent['type']): { n: number; event: SimEvent | undefined } => {
  const n = firstStep(states, (s) => eventTypes(s).includes(type));
  return { n, event: n > 0 ? at(states, n).events.find((e) => e.type === type) : undefined };
};

/** 1-based steps whose events include `type`. */
const firstStepsWith = (states: readonly SimState[], type: SimEvent['type']): number[] =>
  states.flatMap((s, i) => (eventTypes(s).includes(type) ? [i + 1] : []));

describe('createSim', () => {
  it('spawns standing on the bottom edge of the @ cell, startGear, white, facing right, step 0', () => {
    expect(fresh).toEqual({
      step: 0,
      status: 'playing',
      wonAtStep: null,
      respawnInSteps: 0,
      prevInput: EMPTY_INPUT,
      dirPriority: 0,
      events: [],
      twin: null,
      player: {
        x: 2.5, y: 10, vx: 0, vy: 0, gear: 1, band: 0, facing: 1, moveDir: 0, grounded: true,
        coyoteSteps: 0, jumpBufferSteps: 0, shiftBufferSteps: 0, shiftBufferNet: 0, graceSteps: 0, graceBand: null, airDistance: 0, home: false,
      },
    });
  });

  it('a spawn over nothing starts airborne and falls', () => {
    const s = runFromSpawn(gridLevel(['.@.', '...', '...', '..E']), repeat(5, ''));
    expect(createSim(gridLevel(['.@.', '...', '..E']), params).player.grounded).toBe(false);
    expect(at(s, 5).player.y).toBeGreaterThan(1);
  });
});

/** Recursively freezes a value so any mutation throws (ES modules are strict). */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('purity', () => {
  it('never mutates the input state and returns fresh objects every step, in every status', () => {
    const cliff = room(240, 2, [{ row: 10, col: 0, chars: '#'.repeat(10) }], '.');
    const frames = [...repeat(300, 'R'), frame('!'), frame(''), ...repeat(5, 'J')];
    frames.reduce((s, f) => {
      const snapshot = JSON.stringify(s);
      const next = step(deepFreeze(s), f, cliff, params);
      expect(JSON.stringify(s)).toBe(snapshot);
      expect(next).not.toBe(s);
      expect(next.player).not.toBe(s.player);
      expect(next.prevInput).not.toBe(s.prevInput);
      expect(next.prevInput).not.toBe(f);
      return next;
    }, createSim(cliff, params));
  });

  it('won returns the state unchanged except prevInput and events', () => {
    const lvl = room(40, 2, [{ row: 9, col: 5, chars: 'E' }]);
    const s = runFromSpawn(lvl, repeat(60, 'R'));
    const w = firstStep(s, (t) => t.status === 'won');
    const after = step(at(s, w), frame('LJ!'), lvl, params);
    expect(after).toEqual({ ...at(s, w), prevInput: frame('LJ!'), events: [] });
  });
});

describe('prevInput', () => {
  const buttons = [...INPUT_BUTTONS].sort();
  const noisy = { ...frame('RJ'), analogX: 0.7, tick: 12 } as InputFrame;
  const keys = (s: SimState): string[] => Object.keys(s.prevInput).sort();

  it('stores exactly the six contract buttons, dropping extra fields, in every status', () => {
    const cliff = room(240, 2, [{ row: 10, col: 0, chars: '#'.repeat(10) }], '.');
    const exit = room(40, 2, [{ row: 9, col: 3, chars: 'E' }]);
    const playing = step(createSim(level, params), noisy, level, params);
    const restarting = step(createSim(level, params), { ...frame('!'), extra: true } as InputFrame, level, params);
    const won = step(runFromSpawn(exit, repeat(60, 'R')).at(-1) as SimState, noisy, exit, params);
    const dead = runFromSpawn(cliff, repeat(400, 'R')).find((t) => t.status === 'dead') as SimState;
    const frozen = step(dead, noisy, cliff, params);
    const respawned = step({ ...dead, respawnInSteps: 0 }, noisy, cliff, params);
    const states = [playing, restarting, won, frozen, respawned];
    expect(states.map((t) => t.status)).toEqual(['playing', 'restarting', 'won', 'dead', 'playing']);
    states.forEach((t) => expect(keys(t)).toEqual(buttons));
    expect(playing.prevInput).toEqual(frame('RJ'));
  });

  it('a frame with extra fields gives the same states as the clean frame', () => {
    const clean = repeat(40, 'R+');
    const dirty = clean.map((f, i) => ({ ...f, tick: i }) as InputFrame);
    expect(runFromSpawn(level, dirty)).toEqual(runFromSpawn(level, clean));
  });
});

describe('input edges', () => {
  it('a held shift does not repeat; both shifts on one step cancel', () => {
    expect(at(runFromSpawn(level, repeat(10, '+')), 10).player.gear).toBe(2);
    const both = runFromSpawn(level, [frame('+-')]);
    expect(at(both, 1).player.gear).toBe(1);
    expect(at(both, 1).events).toEqual([]);
  });

  it('direction priority: the more recent press wins; same-step press ties at 0', () => {
    const s = runFromSpawn(level, [frame('R'), frame('LR'), frame('LR'), frame('L'), frame('LR')]);
    expect(s.map((t) => t.dirPriority)).toEqual([1, -1, -1, -1, 1]);
    expect(s.map((t) => t.player.moveDir)).toEqual([1, -1, -1, -1, 1]);
    expect(s.map((t) => t.player.facing)).toEqual([1, -1, -1, -1, 1]);
    const tie = runFromSpawn(level, [frame('LR'), frame('')]);
    expect(at(tie, 1).dirPriority).toBe(0);
    expect(at(tie, 1).player).toMatchObject({ moveDir: 0, facing: 1 });
  });

  it('facing follows held directions in the air', () => {
    const s = runFromSpawn(level, [frame('J'), ...repeat(5, 'L')]);
    expect(at(s, 6).player).toMatchObject({ facing: -1, vx: 0 });
  });
});

describe('events', () => {
  it('shift and bandChange on the step they happen', () => {
    const s = runFromSpawn(level, [frame('R+')]);
    expect(at(s, 1).events).toEqual([
      { type: 'shift', body: 0, from: 1, to: 2 },
      { type: 'bandChange', body: 0, from: 0, to: 1 },
    ]);
  });

  it('jump, shiftBuffered, land with a buffered shift in step order', () => {
    const s = runFromSpawn(level, [frame('J'), ...repeat(43, ''), frame('+'), ...repeat(10, '')]);
    expect(at(s, 1).events).toEqual([{ type: 'jump', body: 0, coyote: false, buffered: false }]);
    expect(at(s, 45).events).toEqual([{ type: 'shiftBuffered', body: 0, net: 1 }]);
    expect(at(s, 48).events).toEqual([{ type: 'shift', body: 0, from: 1, to: 2 }, { type: 'land', body: 0 }]);
  });

  it('shift buffer sums presses and clamps on landing', () => {
    const s = runFromSpawn(level, [frame('J'), ...repeat(40, ''), frame('-'), frame(''), frame('+'), frame(''), frame('+'), ...repeat(10, '')]);
    expect(at(s, 46).events).toEqual([{ type: 'shiftBuffered', body: 0, net: 1 }]);
    expect(at(s, 48).player.gear).toBe(2);
    const down = runFromSpawn(level, [frame('J'), ...repeat(44, ''), frame('-'), ...repeat(10, '')]);
    expect(at(down, 48).player.gear).toBe(1);
    expect(eventTypes(at(down, 48))).toEqual(['land']);
  });

  it('airDrag then bandChange on the drop step', () => {
    const s = runFrames(level, cruise(level, 4), [frame('RJ'), ...repeat(40, 'R')]);
    expect(at(s, 30).events).toEqual([
      { type: 'airDrag', body: 0, from: 4, to: 3 },
      { type: 'bandChange', body: 0, from: 4, to: 3 },
    ]);
  });

  it('wallStop carries |vx| before the stop; ceiling on contact', () => {
    const walled = room(240, 2, [7, 8, 9].map((r) => ({ row: r, col: 40, chars: '#' })));
    const { event } = firstEvent(runFrames(walled, cruise(walled, 4), repeat(400, 'R')), 'wallStop');
    expect(event).toEqual({ type: 'wallStop', body: 0, speed: 12 });
    const roofed = room(40, 2, [{ row: 6, col: 0, chars: '#'.repeat(40) }]);
    const c = firstEvent(runFromSpawn(roofed, [frame('J'), ...repeat(30, '')]), 'ceiling');
    expect(c.event).toEqual({ type: 'ceiling', body: 0 });
    expect(at(runFromSpawn(roofed, [frame('J'), ...repeat(30, '')]), c.n).player.y).toBe(8.5);
  });

  it('wallStop fires once per contact: holding into a wall emits one event, not one per step', () => {
    const wall = room(60, 2, block([5, 6, 7, 8, 9], 6, '#'));
    const s = runFromSpawn(wall, repeat(150, 'R'));
    const stops = firstStepsWith(s, 'wallStop');
    const contact = stops[0] ?? -1;
    expect(stops).toHaveLength(1);
    expect(contact).toBeGreaterThan(0);
    expect(150 - contact).toBeGreaterThanOrEqual(60);
    expect(at(s, 150).player.x).toBeCloseTo(6 - params.playerWidth / 2, 9);
  });

  it('wallStop fires again when the player leaves the wall and hits it again', () => {
    const wall = room(60, 2, block([5, 6, 7, 8, 9], 6, '#'));
    const s = runFromSpawn(wall, [...repeat(100, 'R'), ...repeat(30, 'L'), ...repeat(80, 'R')]);
    const stops = firstStepsWith(s, 'wallStop');
    expect(stops).toHaveLength(2);
    expect(stops[0]).toBeLessThan(100);
    expect(stops[1]).toBeGreaterThan(130);
  });

  it('wallStop fires once for a jump into a wall mid-air, and not again while still held in', () => {
    const wall = room(60, 2, block([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, '#'));
    const s = runFromSpawn(wall, [frame('RJ'), ...repeat(150, 'R')]);
    const stops = firstStepsWith(s, 'wallStop');
    expect(stops).toHaveLength(1);
    expect(at(s, stops[0] ?? 0).player.grounded).toBe(false);
  });

  it('graceStart names the previous band; a second change replaces the grace colour', () => {
    const s = runFrames(level, cruise(level, 2), [frame('R+'), ...repeat(3, 'R'), frame('R'), frame('R+'), ...repeat(10, 'R')]);
    const starts = s.flatMap((t) => t.events.filter((e) => e.type === 'graceStart'));
    expect(starts).toEqual([{ type: 'graceStart', body: 0, band: 2 }, { type: 'graceStart', body: 0, band: 3 }]);
  });

  it('died, restart and won', () => {
    const cliff = room(240, 2, [{ row: 10, col: 0, chars: '#'.repeat(10) }], '.');
    expect(firstEvent(runFromSpawn(cliff, repeat(400, 'R')), 'died').event).toEqual({ type: 'died', body: 0 });
    expect(at(runFromSpawn(level, [frame('!')]), 1).events).toEqual([{ type: 'restart' }]);
    const exit = room(40, 2, [{ row: 9, col: 5, chars: 'E' }]);
    expect(firstEvent(runFromSpawn(exit, repeat(60, 'R')), 'won').event).toEqual({ type: 'won' });
  });

  it('a jump during coyote is flagged coyote; a buffered one buffered', () => {
    const ledge = room(240, 2, [{ row: 10, col: 0, chars: '#'.repeat(10) }], '.');
    const s = runFromSpawn(ledge, repeat(400, 'R'));
    const k = firstStep(s, (t) => !t.player.grounded);
    const c = advance(ledge, at(s, k), [frame('RJ')]);
    expect(c.events).toContainEqual({ type: 'jump', body: 0, coyote: true, buffered: false });
  });
});

describe('reserved tiles (solidity only)', () => {
  it('ice is a floor; a speed gate admits only its band', () => {
    for (const ch of ['=']) {
      expect(at(runFromSpawn(room(40, 2, [], ch), repeat(30, 'R')), 30).player.grounded).toBe(true);
    }
    const gate = room(60, 2, [7, 8, 9].map((r) => ({ row: r, col: 20, chars: 'b' })));
    const s = runFromSpawn(gate, repeat(400, 'R'));
    expect(s.some((t) => eventTypes(t).includes('wallStop'))).toBe(false);
    const fast = runFrames(gate, cruise(gate, 2, 'R', 10), repeat(400, 'R'));
    expect(fast.some((t) => eventTypes(t).includes('wallStop'))).toBe(true);
  });
});
