import { describe, expect, it } from 'vitest';
import { createCueLog } from './cueLog';
import { createSfx } from './sfx';
import { createStepEventPlayer } from './sfxStep';

describe('cue log (QA A-1)', () => {
  it('keeps the last 64 entries, oldest first', () => {
    const log = createCueLog(() => 0);
    for (let i = 0; i < 70; i++) log.record({ id: 'jump', body: i % 2 === 0 ? 0 : 1 }, true);
    const all = log.recent();
    expect(all).toHaveLength(64);
    expect(all[0]!.atMs).toBe(0);
  });

  it('records cue, body, time and audibility, including when the engine refuses tones', () => {
    let t = 10;
    const log = createCueLog(() => t++);
    const locked = createSfx({ tone: () => false }, log);
    const open = createSfx({ tone: () => true }, log);
    locked.jump();
    open.land();
    expect(log.recent()).toEqual([
      { cue: 'jump', atMs: 10, audible: false },
      { cue: 'land', atMs: 11, audible: true },
    ]);
  });

  it('records step events with their body, in order, even when muted', () => {
    const log = createCueLog(() => 0);
    createStepEventPlayer({ tone: () => false }, log)([
      { type: 'jump', body: 1, coyote: false, buffered: false },
      { type: 'airDrag', body: 0, from: 4, to: 3 },
    ]);
    expect(log.recent().map((e) => [e.cue, e.body, e.audible])).toEqual([
      ['jump', 1, false],
      ['airDragClunk', 0, false],
    ]);
  });

  it('returns copies and clears', () => {
    const log = createCueLog(() => 0);
    log.record({ id: 'reset' }, true);
    expect(log.recent()).not.toBe(log.recent());
    log.clear();
    expect(log.recent()).toEqual([]);
  });
});
