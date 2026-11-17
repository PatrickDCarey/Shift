import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../core/types';
import { WHY_FELL_MS } from '../fx';
import { isRespawn, ringsFor, WhyFellTracker } from './whyFell';

const fall = (body: 0 | 1, cells: readonly { col: number; row: number; band: 1 | 2 | 3 | 4 }[]): SimEvent => ({ type: 'fallThrough', body, cells });

describe('ringsFor', () => {
  it('maps cells to tile top-lefts and ignores other events', () => {
    expect(ringsFor(fall(0, [{ col: 3, row: 5, band: 2 }]), 16)).toEqual([{ x: 48, y: 80, band: 2 }]);
    expect(ringsFor({ type: 'restart' }, 16)).toEqual([]);
  });
});

describe('WhyFellTracker', () => {
  it('draws bold, hold, fade and then stops', () => {
    const t = new WhyFellTracker();
    t.start([fall(0, [{ col: 1, row: 2, band: 4 }])], 1000, 16);
    expect(t.draw(1000, false)).toEqual([{ x: 16, y: 32, frame: 'fx/why/red/bold' }]);
    expect(t.draw(1300, false)[0]?.frame).toBe('fx/why/red/hold');
    expect(t.draw(1000 + WHY_FELL_MS - 10, false)[0]?.frame).toBe('fx/why/red/fade');
    expect(t.draw(1000 + WHY_FELL_MS, false)).toEqual([]);
    expect(t.draw(1000, false)).toEqual([]); // dropped for good
  });

  it('holds one frame under reduced motion', () => {
    const t = new WhyFellTracker();
    t.start([fall(0, [{ col: 0, row: 0, band: 1 }])], 0, 16);
    for (const ms of [0, 200, 700]) expect(t.draw(ms, true)[0]?.frame).toBe('fx/why/blue/hold');
  });

  it('keeps one cue per body, replaces on a new fall, shows both bodies at once', () => {
    const t = new WhyFellTracker();
    t.start([fall(0, [{ col: 1, row: 1, band: 1 }]), fall(1, [{ col: 9, row: 9, band: 3 }])], 0, 16);
    expect(t.draw(10, false)).toHaveLength(2);
    t.start([fall(0, [{ col: 2, row: 2, band: 2 }])], 500, 16);
    const frames = t.draw(520, false).map((d) => d.frame);
    expect(frames).toContain('fx/why/green/bold');
    expect(frames).not.toContain('fx/why/blue/hold');
  });

  it('clear removes everything (respawn)', () => {
    const t = new WhyFellTracker();
    t.start([fall(0, [{ col: 1, row: 1, band: 1 }])], 0, 16);
    t.clear();
    expect(t.draw(10, false)).toEqual([]);
  });
});

describe('isRespawn', () => {
  it('is true when dead or restarting goes back to playing, or on a restart event', () => {
    expect(isRespawn('dead', 'playing', [])).toBe(true);
    expect(isRespawn('restarting', 'playing', [])).toBe(true);
    expect(isRespawn('playing', 'playing', [{ type: 'restart' }])).toBe(true);
    expect(isRespawn('playing', 'playing', [])).toBe(false);
    expect(isRespawn('dead', 'dead', [])).toBe(false);
  });
});
