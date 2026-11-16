import { describe, expect, it } from 'vitest';
import type { Band, SimEvent } from '../core/types';
import { bodiesOf, musicEventsOf, musicFeed } from './musicFeed';
import { drivingBand } from './musicSpec';

const body = (band: Band, home = false) => ({ band, home }) as never;
const state = (runner: ReturnType<typeof body>, twin: ReturnType<typeof body> | null, events: readonly SimEvent[] = []) => ({
  player: runner,
  twin,
  events,
});

describe('musicFeed', () => {
  it('a solo level has one body with its band and home flag', () => {
    expect(bodiesOf(state(body(3), null))).toEqual([{ band: 3, home: false }]);
  });

  it('a twin level lists the runner first, then the twin, with home flags', () => {
    expect(bodiesOf(state(body(1, true), body(4)))).toEqual([
      { band: 1, home: true },
      { band: 4, home: false },
    ]);
  });

  it('feeds drivingBand the way the camera does (fastest non-home body)', () => {
    const f = musicFeed(state(body(1, true), body(4)));
    expect(drivingBand(f.bodies)).toBe(4);
  });

  it('keeps only airDrag, died, won and restart, in order', () => {
    const events = [
      { type: 'jump', body: 0, coyote: false, buffered: false },
      { type: 'airDrag', body: 0, from: 3, to: 2 },
      { type: 'land', body: 0 },
      { type: 'died', body: 0 },
      { type: 'won' },
      { type: 'restart' },
    ] as unknown as SimEvent[];
    expect(musicEventsOf(events).map((e) => e.type)).toEqual(['airDrag', 'died', 'won', 'restart']);
  });

  it('uses the state events by default and explicit events when given', () => {
    const s = state(body(0), null, [{ type: 'restart' }] as SimEvent[]);
    expect(musicFeed(s).events).toEqual([{ type: 'restart' }]);
    expect(musicFeed(s, [{ type: 'won' }]).events).toEqual([{ type: 'won' }]);
    expect(musicFeed(s, []).events).toEqual([]);
  });

  it('passes paused through, defaulting to false', () => {
    const s = state(body(2), null);
    expect(musicFeed(s).paused).toBe(false);
    expect(musicFeed(s, [], true).paused).toBe(true);
  });

  it('does not mutate its inputs', () => {
    const events = [{ type: 'airDrag', body: 0, from: 2, to: 1 }] as unknown as SimEvent[];
    const s = Object.freeze(state(body(2), null, events));
    expect(() => musicFeed(s)).not.toThrow();
    expect(events).toHaveLength(1);
  });
});
