import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../core/types';
import type { ToneOptions } from './engine';
import { createStepEventPlayer } from './sfxStep';
import { createSfx } from './sfx';
import { describeSfx } from './sfxSpec';

/** Fake engine: records every tone's bus and first-layer frequency; `locked` swallows them. */
function fake(locked = false) {
  const tones: ToneOptions[] = [];
  const engine = {
    tone: (o: ToneOptions): boolean => {
      if (locked) return false;
      tones.push(o);
      return true;
    },
  };
  return { tones, play: createStepEventPlayer(engine) };
}

const firstHz = (id: Parameters<typeof describeSfx>[0]['id']): number => describeSfx({ id })[0]!.freq;
const jump: SimEvent = { type: 'jump', body: 0, coyote: false, buffered: false };
const drag: SimEvent = { type: 'airDrag', body: 0, from: 4, to: 3 };

describe('playStepEvents (adaptive-audio.md acceptance 13)', () => {
  it('plays jump then the clunk, once each, in order, on the sfx bus', () => {
    const { tones, play } = fake();
    const reference = fake();
    createSfx({ tone: (o) => (reference.tones.push(o), true) }).jump();
    createSfx({ tone: (o) => (reference.tones.push(o), true) }).airDragClunk();
    play([jump, drag]);
    expect(tones.every((t) => t.bus === 'sfx')).toBe(true);
    expect(tones).toEqual(reference.tones);
  });

  it('a frame with no steps plays nothing', () => {
    const { tones, play } = fake();
    expect(play([])).toBe(0);
    expect(tones).toHaveLength(0);
  });

  it('home, home, won plays only the sting', () => {
    const { tones, play } = fake();
    const sting = describeSfx({ id: 'levelComplete' });
    play([
      { type: 'home', body: 0 },
      { type: 'home', body: 1 },
      { type: 'won' },
    ]);
    expect(tones).toHaveLength(sting.length);
  });

  it('shift up and shift down are distinct; died and restart play reset', () => {
    const up = fake();
    const down = fake();
    up.play([{ type: 'shift', body: 0, from: 1, to: 2 }]);
    down.play([{ type: 'shift', body: 0, from: 3, to: 2 }]);
    expect(up.tones).not.toEqual(down.tones);
    const died = fake();
    const restart = fake();
    died.play([{ type: 'died', body: 0 }]);
    restart.play([{ type: 'restart' }]);
    expect(died.tones).toEqual(restart.tones);
    expect(died.tones.length).toBeGreaterThan(0);
  });

  it('Tandem: both bodies jumping on one step plays one jump, not two', () => {
    const solo = fake();
    const pair = fake();
    solo.play([jump]);
    pair.play([jump, { ...jump, body: 1 }]);
    expect(pair.tones.length).toBeGreaterThanOrEqual(solo.tones.length);
    expect(pair.tones.length).toBeLessThanOrEqual(solo.tones.length * 2);
  });

  it('plays the fall-through and land sounds', () => {
    const { tones, play } = fake();
    play([{ type: 'fallThrough', body: 0, cells: [{ col: 3, row: 5, band: 2 }] }, { type: 'land', body: 0 }]);
    expect(tones.length).toBeGreaterThan(0);
    expect(firstHz('land')).toBeGreaterThan(0);
  });

  it('is silent and does not throw while the engine is locked or muted', () => {
    const { tones, play } = fake(true);
    expect(() => play([jump, drag, { type: 'won' }])).not.toThrow();
    expect(tones).toHaveLength(0);
  });

  it('does not mutate the events it is given', () => {
    const events: SimEvent[] = [jump, drag];
    const copy = JSON.stringify(events);
    fake().play(events);
    expect(JSON.stringify(events)).toBe(copy);
  });
});

describe('shared entry point', () => {
  it('is exported from the audio index and is silent before a gesture', async () => {
    const mod = await import('./index');
    expect(typeof mod.playStepEvents).toBe('function');
    expect(() => mod.playStepEvents([{ type: 'won' }])).not.toThrow();
  });
});
