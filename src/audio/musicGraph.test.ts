import { describe, expect, it } from 'vitest';
import { buildMusicGraph, glideCutoff, glideDuck, glideLayers } from './musicGraph';
import { LAYER_LEVEL, PAUSE_DUCK_GAIN } from './musicSpec';
import { MockContext, MockGain, type MockParam } from './testkit';
import type { AudioContextLike, GainNodeLike } from './webAudioTypes';

function graph() {
  const ctx = new MockContext();
  const bus = new MockGain();
  const g = buildMusicGraph(ctx as unknown as AudioContextLike, bus as unknown as GainNodeLike)!;
  return { ctx, g };
}
const param = (p: unknown) => p as MockParam;

describe('A1: ramps retarget from the live value', () => {
  it('a layer retargeted halfway through a glide starts from its midpoint, not its start', () => {
    const { g } = graph();
    const pad = param(g.layers.pad.gain);
    const level = LAYER_LEVEL.pad;
    glideLayers(g, 0, new Set(), new Set(['pad']), 0.15);
    glideLayers(g, 0.075, new Set(['pad']), new Set(), 0.15);
    const start = pad.sets.at(-1)!;
    expect(start).toBeGreaterThan(level * 0.4);
    expect(start).toBeLessThan(level * 0.6);
  });

  it('the pause duck mid-glide does not jump', () => {
    const { g } = graph();
    const duck = param(g.duck.gain);
    glideDuck(g, 0, true, 0.15);
    glideDuck(g, 0.05, false, 0.15);
    expect(duck.sets.at(-1)!).toBeCloseTo(1 + (PAUSE_DUCK_GAIN - 1) / 3, 5);
  });

  it('a 30 ms snap 50 ms into a 150 ms cutoff glide starts at the live cutoff', () => {
    const { g } = graph();
    const f = param(g.filter.frequency);
    glideCutoff(g, 0, 400, 4000, 0.15);
    glideCutoff(g, 0.05, 4000, 400, 0.03);
    const start = f.sets.at(-1)!;
    expect(start).toBeCloseTo(400 * Math.pow(10, 1 / 3), 3);
    expect(start).toBeLessThan(4000);
  });

  it('a retarget after the glide finished starts at the old target, ignoring `from`', () => {
    const { g } = graph();
    const f = param(g.filter.frequency);
    glideCutoff(g, 0, 400, 4000, 0.15);
    glideCutoff(g, 1, 123, 400, 0.15);
    expect(f.sets.at(-1)).toBeCloseTo(4000, 5);
  });

  it('the first ramp on a fresh param uses the given from value', () => {
    const { g } = graph();
    const f = param(g.filter.frequency);
    glideCutoff(g, 0, 700, 700, 0);
    expect(f.sets.at(-1)).toBe(700);
  });
});
