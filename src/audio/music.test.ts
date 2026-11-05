import { describe, expect, it } from 'vitest';
import type { Band } from '../core/types';
import { createAudioEngine } from './engine';
import { createMusic, type MusicFrame } from './music';
import {
  BAND_TARGETS,
  GLIDE_SECONDS,
  LOOP_STEPS,
  SNAP_SECONDS,
  STEP_SECONDS,
  drivingBand,
  glideValue,
  notesAt,
  retarget,
  steadyGlide,
} from './musicSpec';
import { MockContext, MockFilter, setupEngine } from './testkit';
import type { AudioContextLike } from './webAudioTypes';

const solo = (band: Band, extra: Partial<MusicFrame> = {}): MusicFrame => ({ bodies: [{ band, home: false }], ...extra });

async function running() {
  const { engine, ctx } = setupEngine();
  await engine.unlock();
  const music = createMusic(engine);
  return { engine, ctx, music };
}

/** Cutoff ramps (target, end time) written to the music filter. */
const cutoffRamps = (ctx: MockContext) => ctx.filters[0]!.frequency.rampLog;
const lastCutoff = (ctx: MockContext) => cutoffRamps(ctx).at(-1)!;

describe('band targets (spec table)', () => {
  it('pitch and cutoff strictly rise from white to red; layers only grow', () => {
    for (let b = 1; b < 5; b += 1) {
      expect(BAND_TARGETS[b]!.semitones).toBeGreaterThan(BAND_TARGETS[b - 1]!.semitones);
      expect(BAND_TARGETS[b]!.cutoffHz).toBeGreaterThan(BAND_TARGETS[b - 1]!.cutoffHz);
      expect(BAND_TARGETS[b]!.layers.length).toBeGreaterThan(BAND_TARGETS[b - 1]!.layers.length);
    }
  });
  it('white is muffled (400 Hz) and red is open (at least 12 kHz)', () => {
    expect(BAND_TARGETS[0].cutoffHz).toBe(400);
    expect(BAND_TARGETS[4].cutoffHz).toBeGreaterThanOrEqual(12000);
    expect(BAND_TARGETS[0].semitones).toBe(0);
  });
  it('offsets stay on the major scale degrees 1 2 3 4 5', () => {
    expect(BAND_TARGETS.map((t) => t.semitones)).toEqual([0, 2, 4, 5, 7]);
  });
});

describe('driving body', () => {
  it('a lone runner drives', () => expect(drivingBand([{ band: 3, home: false }])).toBe(3));
  it('the faster non-home body drives', () =>
    expect(
      drivingBand([
        { band: 1, home: false },
        { band: 4, home: false },
      ]),
    ).toBe(4));
  it('a tie gives the shared band', () =>
    expect(
      drivingBand([
        { band: 2, home: false },
        { band: 2, home: false },
      ]),
    ).toBe(2));
  it('with the runner home, the twin drives, even when slower', () =>
    expect(
      drivingBand([
        { band: 4, home: true },
        { band: 1, home: false },
      ]),
    ).toBe(1));
  it('with the twin home, the runner drives', () =>
    expect(
      drivingBand([
        { band: 2, home: false },
        { band: 4, home: true },
      ]),
    ).toBe(2));
  it('empty or all home falls back to the runner', () => {
    expect(drivingBand([])).toBe(0);
    expect(
      drivingBand([
        { band: 3, home: true },
        { band: 1, home: true },
      ]),
    ).toBe(3);
  });
});

describe('glide maths', () => {
  it('is linear, clamped and restarts from the current value', () => {
    const g = retarget(steadyGlide(0), 10, 8, 2);
    expect(glideValue(g, 9)).toBe(0);
    expect(glideValue(g, 11)).toBe(4);
    expect(glideValue(g, 20)).toBe(8);
    expect(retarget(g, 11, 0, 1).from).toBe(4);
  });
});

describe('before the first gesture', () => {
  it('update never throws and creates no audio nodes', () => {
    const { engine, ctx } = setupEngine();
    const music = createMusic(engine);
    expect(() => music.update(solo(4, { events: [{ type: 'airDrag' }] }))).not.toThrow();
    expect(ctx.gains).toHaveLength(0);
    expect(music.snapshot().running).toBe(false);
  });
  it('works with no Web Audio at all', () => {
    const engine = createAudioEngine({ contextFactory: () => null });
    const music = createMusic(engine);
    expect(() => music.update(solo(2))).not.toThrow();
    expect(() => music.dispose()).not.toThrow();
  });
  it('a context without a biquad filter stays silent without throwing', async () => {
    const ctx = new MockContext();
    (ctx as unknown as { createBiquadFilter?: unknown }).createBiquadFilter = undefined;
    const engine = createAudioEngine({ contextFactory: () => ctx as unknown as AudioContextLike });
    await engine.unlock();
    const music = createMusic(engine);
    expect(() => music.update(solo(3))).not.toThrow();
    expect(ctx.oscs).toHaveLength(0);
  });
  it('mute before the gesture does not throw', () => {
    const { engine } = setupEngine();
    engine.setMuted(true);
    const music = createMusic(engine);
    expect(() => music.update(solo(1))).not.toThrow();
  });
});

describe('the loop starts on the current band', () => {
  it('white starts low and muffled: 400 Hz, 0 semitones, pad only, no glide', async () => {
    const { ctx, music } = await running();
    music.update(solo(0));
    expect(lastCutoff(ctx).value).toBe(400);
    expect(ctx.filters[0]!.type).toBe('lowpass');
    expect(music.snapshot()).toMatchObject({ running: true, band: 0, semitones: 0, layers: ['pad'] });
    expect(music.snapshot().cutoffHz).toBeCloseTo(400, 3);
  });
  it('starting at red is already bright, high and full (no glide up from white)', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    expect(lastCutoff(ctx).value).toBe(14000);
    expect(music.snapshot().semitones).toBe(7);
    expect(music.snapshot().cutoffHz).toBeCloseTo(14000, 3);
    expect(music.snapshot().layers).toEqual(['pad', 'bass', 'pulse', 'hats', 'lead']);
  });
  it('schedules notes ahead of the clock', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    expect(ctx.oscs.length).toBeGreaterThan(0);
    for (let i = 1; i <= 600; i += 1) {
      ctx.currentTime = i / 60;
      music.update(solo(4));
    }
    expect(ctx.oscs.length).toBeGreaterThan(50);
    expect(ctx.oscs.every((o) => o.started !== null)).toBe(true);
  });
  it('higher bands play more notes than white (more layers)', async () => {
    const play = async (band: Band) => {
      const { ctx, music } = await running();
      for (let i = 0; i <= 300; i += 1) {
        ctx.currentTime = i / 60;
        music.update(solo(band));
      }
      return ctx.oscs.length;
    };
    const [b4, b2, b0] = [await play(4), await play(2), await play(0)];
    expect(b4).toBeGreaterThan(b2);
    expect(b2).toBeGreaterThan(b0);
  });
});

describe('glide on a band change', () => {
  it('white to red glides cutoff and pitch over 150 ms', async () => {
    const { ctx, music } = await running();
    music.update(solo(0));
    ctx.currentTime = 1;
    music.update(solo(4));
    const last = lastCutoff(ctx);
    expect(last.value).toBe(14000);
    expect(last.time).toBeCloseTo(1 + GLIDE_SECONDS, 9);
    ctx.currentTime = 1 + GLIDE_SECONDS / 2;
    const mid = music.snapshot();
    expect(mid.semitones).toBeCloseTo(3.5, 6);
    expect(mid.cutoffHz).toBeGreaterThan(400);
    expect(mid.cutoffHz).toBeLessThan(14000);
    ctx.currentTime = 1 + GLIDE_SECONDS;
    expect(music.snapshot()).toMatchObject({ semitones: 7 });
    expect(music.snapshot().cutoffHz).toBeCloseTo(14000, 3);
  });
  it('red to white darkens to the lowest pitch and 400 Hz', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    ctx.currentTime = 2;
    music.update(solo(0));
    ctx.currentTime = 3;
    expect(music.snapshot()).toMatchObject({ band: 0, semitones: 0, layers: ['pad'] });
    expect(music.snapshot().cutoffHz).toBeCloseTo(400, 3);
  });
  it('each step up is higher and brighter than the one before', async () => {
    const { ctx, music } = await running();
    music.update(solo(0));
    let prev = music.snapshot();
    for (const band of [1, 2, 3, 4] as const) {
      ctx.currentTime += 1;
      music.update(solo(band));
      ctx.currentTime += 1;
      const now = music.snapshot();
      expect(now.semitones).toBeGreaterThan(prev.semitones);
      expect(now.cutoffHz).toBeGreaterThan(prev.cutoffHz);
      prev = now;
    }
  });
  it('a held band does not restart the glide every frame', async () => {
    const { ctx, music } = await running();
    music.update(solo(0));
    ctx.currentTime = 1;
    music.update(solo(2));
    const n = cutoffRamps(ctx).length;
    ctx.currentTime = 1.05;
    music.update(solo(2));
    expect(cutoffRamps(ctx)).toHaveLength(n);
  });
  it('bends sounding pad voices to the new pitch', async () => {
    const { ctx, music } = await running();
    music.update(solo(0));
    ctx.currentTime = 0.1;
    music.update(solo(0));
    const pad = ctx.oscs[0]!;
    const before = pad.frequency.rampLog.length;
    music.update(solo(4));
    expect(pad.frequency.rampLog.length).toBeGreaterThan(before);
    const end = pad.frequency.rampLog.at(-1)!;
    expect(end.value / pad.frequency.sets[0]!).toBeCloseTo(Math.pow(2, 7 / 12), 6);
  });
});

describe('air drag clunk', () => {
  it('snaps to the lower band within 30 ms', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    ctx.currentTime = 5;
    music.update(solo(1, { events: [{ type: 'airDrag' }] }));
    expect(lastCutoff(ctx).time - 5).toBeLessThanOrEqual(SNAP_SECONDS + 1e-9);
    ctx.currentTime = 5 + SNAP_SECONDS;
    expect(music.snapshot()).toMatchObject({ band: 1, semitones: 2 });
    expect(music.snapshot().cutoffHz).toBeCloseTo(800, 3);
  });
  it('a natural slowdown without airDrag still glides at 150 ms', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    ctx.currentTime = 5;
    music.update(solo(3));
    expect(lastCutoff(ctx).time - 5).toBeCloseTo(GLIDE_SECONDS, 9);
  });
});

describe('death, restart, win, pause', () => {
  it('died glides to band 0 targets and restart returns to the live band', async () => {
    const { ctx, music } = await running();
    music.update(solo(3));
    ctx.currentTime = 1;
    music.update(solo(3, { events: [{ type: 'died' }] }));
    ctx.currentTime = 1.5;
    music.update(solo(3));
    expect(music.snapshot()).toMatchObject({ mode: 'dead', band: 0, semitones: 0 });
    expect(music.snapshot().cutoffHz).toBeCloseTo(400, 3);
    ctx.currentTime = 2;
    music.update(solo(2, { events: [{ type: 'restart' }] }));
    expect(music.snapshot()).toMatchObject({ mode: 'play', band: 2 });
  });
  it('won holds pitch and layers and fades the cutoff to band 0 over 0.6 s', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    ctx.currentTime = 1;
    music.update(solo(4, { events: [{ type: 'won' }] }));
    expect(lastCutoff(ctx).value).toBe(400);
    expect(lastCutoff(ctx).time).toBeCloseTo(1.6, 9);
    ctx.currentTime = 1.3;
    music.update(solo(0));
    const mid = music.snapshot();
    expect(mid).toMatchObject({ mode: 'won', semitones: 7 });
    expect(mid.layers).toHaveLength(5);
    expect(mid.cutoffHz).toBeGreaterThan(400);
    ctx.currentTime = 2;
    expect(music.snapshot().cutoffHz).toBeCloseTo(400, 3);
  });
  it('reset() leaves a won or dead state', async () => {
    const { music } = await running();
    music.update(solo(2, { events: [{ type: 'won' }] }));
    music.reset();
    expect(music.snapshot().mode).toBe('play');
  });
  it('pause ducks 12 dB and takes the band 0 cutoff; resume restores', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    ctx.currentTime = 1;
    music.update(solo(4, { paused: true }));
    const duckGain = Math.pow(10, -12 / 20);
    const duck = ctx.gains.find((g) => g.gain.rampLog.some((r) => Math.abs(r.value - duckGain) < 1e-9));
    expect(duck).toBeDefined();
    expect(lastCutoff(ctx).value).toBe(400);
    expect(music.snapshot().ducked).toBe(true);
    ctx.currentTime = 2;
    music.update(solo(4));
    ctx.currentTime = 3;
    expect(music.snapshot().ducked).toBe(false);
    expect(music.snapshot().cutoffHz).toBeCloseTo(14000, 3);
  });
});

describe('twin driving in update', () => {
  it('follows the twin when the runner is home', async () => {
    const { ctx, music } = await running();
    ctx.currentTime = 1;
    music.update({
      bodies: [
        { band: 4, home: true },
        { band: 1, home: false },
      ],
    });
    expect(music.snapshot().band).toBe(1);
  });
});

describe('the loop pattern', () => {
  it('is deterministic and wraps', () => {
    expect(notesAt(5)).toEqual(notesAt(5));
    expect(notesAt(LOOP_STEPS + 5)).toEqual(notesAt(5));
    expect(notesAt(-1)).toEqual(notesAt(LOOP_STEPS - 1));
  });
  it('every layer appears somewhere in the loop; the pad is longer than a bar', () => {
    const layers = new Set<string>();
    for (let s = 0; s < LOOP_STEPS; s += 1) for (const n of notesAt(s)) layers.add(n.layer);
    expect([...layers].sort()).toEqual(['bass', 'hats', 'lead', 'pad', 'pulse']);
    const pad = notesAt(0).find((n) => n.layer === 'pad')!;
    expect(pad.duration).toBeGreaterThan(16 * STEP_SECONDS);
  });
  it('every note except the pad is short', () => {
    for (let s = 0; s < LOOP_STEPS; s += 1) {
      for (const n of notesAt(s)) if (n.layer !== 'pad') expect(n.duration).toBeLessThan(STEP_SECONDS * 3);
    }
  });
});

describe('robustness', () => {
  it('a throwing oscillator never reaches the caller', async () => {
    const { ctx, music } = await running();
    ctx.createOscillator = () => {
      throw new Error('boom');
    };
    expect(() => music.update(solo(2))).not.toThrow();
  });
  it('a filter whose param throws never reaches the caller', async () => {
    const { ctx, music } = await running();
    const bad = new MockFilter();
    bad.frequency.setValueAtTime = () => {
      throw new Error('boom');
    };
    ctx.createBiquadFilter = () => bad;
    expect(() => music.update(solo(2))).not.toThrow();
  });
  it('dispose stops the voices and later updates are silent no-ops', async () => {
    const { ctx, music } = await running();
    music.update(solo(4));
    const n = ctx.oscs.length;
    music.dispose();
    expect(ctx.oscs.every((o) => o.stopped !== null)).toBe(true);
    music.update(solo(4));
    expect(ctx.oscs).toHaveLength(n);
  });
});
