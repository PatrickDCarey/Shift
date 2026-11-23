import { describe, expect, it } from 'vitest';
import {
  ALL_SFX_IDS,
  BAND_PITCH,
  GEAR_NOTE_HZ,
  MAX_SHORT_SFX_SECONDS,
  MAX_STING_SECONDS,
  MAX_SUMMED_GAIN,
  MIN_AUDIBLE_HZ,
  MIN_LAYER_GAIN,
  SFX_IDS,
  TWIN_GAIN_SCALE,
  TWIN_PITCH_RATIO,
  UNISON_GAIN_SCALE,
  describeSfx,
  sfxDuration,
  sfxPeakSum,
  type SfxCue,
  type ToneLayer,
} from './sfxSpec';

const lowest = (layers: readonly ToneLayer[]): number =>
  Math.min(...layers.flatMap((l) => [l.freq, l.endFreq ?? l.freq]));
const highest = (layers: readonly ToneLayer[]): number =>
  Math.max(...layers.flatMap((l) => [l.freq, l.endFreq ?? l.freq]));
const waves = (layers: readonly ToneLayer[]): Set<string> => new Set(layers.map((l) => l.type));
const firstFreq = (layers: readonly ToneLayer[]): number => layers[0]?.freq ?? 0;

describe('sfx spec: all ten exist, short, readable at low volume', () => {
  it('lists ten distinct ids (plus the home chime as an extra)', () => {
    expect(SFX_IDS).toHaveLength(10);
    expect(new Set(SFX_IDS).size).toBe(10);
    expect(ALL_SFX_IDS).toHaveLength(13);
  });

  it.each(ALL_SFX_IDS)('%s: layers are valid, short, not too quiet, not clipping', (id) => {
    const cues: SfxCue[] = [{ id }, { id, band: 4 }];
    for (const cue of cues) {
      const layers = describeSfx(cue);
      expect(layers.length).toBeGreaterThan(0);
      for (const l of layers) {
        expect(Number.isFinite(l.freq) && l.freq > 0).toBe(true);
        if (l.endFreq !== undefined) expect(l.endFreq).toBeGreaterThan(0);
        expect(l.duration).toBeGreaterThan(0);
        expect(l.delay).toBeGreaterThanOrEqual(0);
        expect(l.gain).toBeGreaterThanOrEqual(MIN_LAYER_GAIN);
        expect(l.gain).toBeLessThanOrEqual(0.3);
        expect(l.freq).toBeGreaterThanOrEqual(MIN_AUDIBLE_HZ);
      }
      expect(sfxDuration(layers)).toBeLessThanOrEqual(id === 'levelComplete' ? MAX_STING_SECONDS : MAX_SHORT_SFX_SECONDS);
      expect(sfxPeakSum(layers)).toBeLessThanOrEqual(MAX_SUMMED_GAIN);
    }
  });

  it.each(ALL_SFX_IDS)('%s: twin and unison voices stay audible and do not clip', (id) => {
    for (const body of [1, 'both'] as const) {
      const layers = describeSfx({ id, body, band: 3, twinBand: 1 });
      for (const l of layers) {
        expect(l.gain).toBeGreaterThanOrEqual(0.055);
        expect(l.freq).toBeGreaterThanOrEqual(MIN_AUDIBLE_HZ * TWIN_PITCH_RATIO * 0.99);
      }
      expect(sfxPeakSum(layers)).toBeLessThanOrEqual(MAX_SUMMED_GAIN);
    }
  });

  it('land is a single soft thump under 80 ms', () => {
    const land = describeSfx({ id: 'land', band: 4 });
    expect(land).toHaveLength(1);
    expect(sfxDuration(land)).toBeLessThan(0.08);
  });

  it('UI move is tiny and UI select is firmer and lower', () => {
    const move = describeSfx({ id: 'uiMove' });
    const select = describeSfx({ id: 'uiSelect' });
    expect(sfxDuration(move)).toBeLessThan(0.06);
    expect(highest(select)).toBeLessThan(lowest(move));
    expect(sfxPeakSum(select)).toBeGreaterThan(sfxPeakSum(move));
  });

  it('the level-complete sting is the longest, at most 1.2 s, in C major', () => {
    const sting = describeSfx({ id: 'levelComplete' });
    const d = sfxDuration(sting);
    expect(d).toBeLessThanOrEqual(MAX_STING_SECONDS);
    for (const id of SFX_IDS) expect(d).toBeGreaterThanOrEqual(sfxDuration(describeSfx({ id })));
    const notes = sting.filter((l) => l.type === 'square').map((l) => l.freq);
    expect(notes).toEqual([GEAR_NOTE_HZ[1], GEAR_NOTE_HZ[2], GEAR_NOTE_HZ[3], GEAR_NOTE_HZ[4]]);
  });

  it('is deterministic (same cue, same layers)', () => {
    for (const id of ALL_SFX_IDS) expect(describeSfx({ id, band: 2 })).toEqual(describeSfx({ id, band: 2 }));
  });

  it('describes nothing for an unknown id', () => {
    expect(describeSfx({ id: 'nope' as SfxCue['id'] })).toEqual([]);
  });
});

describe('sfx spec: shifts are one family and follow the gear', () => {
  it('shift up rises and shift down falls, as two clean notes', () => {
    const up = describeSfx({ id: 'shiftUp', from: 1, to: 2 });
    const down = describeSfx({ id: 'shiftDown', from: 2, to: 1 });
    expect(up).toHaveLength(2);
    expect(down).toHaveLength(2);
    expect(up[1]?.freq).toBeGreaterThan(up[0]?.freq ?? Infinity);
    expect(down[1]?.freq).toBeLessThan(down[0]?.freq ?? 0);
    expect(up[0]?.freq).toBe(GEAR_NOTE_HZ[1]);
    expect(up[1]?.freq).toBe(GEAR_NOTE_HZ[2]);
    expect(waves(up)).toEqual(waves(down));
  });

  it('pitch climbs with the target gear', () => {
    const tops = [
      describeSfx({ id: 'shiftUp', from: 1, to: 2 })[1]?.freq ?? 0,
      describeSfx({ id: 'shiftUp', from: 2, to: 3 })[1]?.freq ?? 0,
      describeSfx({ id: 'shiftUp', from: 3, to: 4 })[1]?.freq ?? 0,
    ];
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(3);
  });

  it('defaults are sane at the gear limits', () => {
    expect(() => describeSfx({ id: 'shiftUp', from: 4 })).not.toThrow();
    expect(() => describeSfx({ id: 'shiftDown', from: 1 })).not.toThrow();
  });

  it('a buffered (soft) press is half gain with no high harmonics', () => {
    const hard = describeSfx({ id: 'shiftUp', from: 1, to: 2 });
    const soft = describeSfx({ id: 'shiftUp', from: 1, to: 2, soft: true });
    expect(waves(soft)).toEqual(new Set(['triangle']));
    expect(soft[0]?.gain).toBeCloseTo((hard[0]?.gain ?? 0) / 2, 9);
    expect(soft[0]?.gain).toBeGreaterThanOrEqual(MIN_LAYER_GAIN);
  });
});

describe('sfx spec: the air-drag clunk is nothing like shift down (adaptive-audio.md acceptance 4)', () => {
  const clunk = describeSfx({ id: 'airDragClunk' });
  const downs = ([2, 3, 4] as const).flatMap((from) => describeSfx({ id: 'shiftDown', from, to: (from - 1) as 1 | 2 | 3 }));
  const lowestShiftDown = lowest(downs);

  it('has its fundamental at least an octave below the lowest shift-down note', () => {
    expect(clunk[0]?.freq).toBeLessThanOrEqual(lowestShiftDown / 2);
    expect(highest(clunk)).toBeLessThan(lowestShiftDown / 2);
  });

  it('is one hard attack with a pitch drop, 100 to 150 ms', () => {
    expect(new Set(clunk.map((l) => l.delay))).toEqual(new Set([0]));
    for (const l of clunk) expect(l.endFreq).toBeLessThan(l.freq);
    const d = sfxDuration(clunk);
    expect(d).toBeGreaterThanOrEqual(0.1);
    expect(d).toBeLessThanOrEqual(0.15);
  });

  it('has grit that shift down does not: sawtooth and a square layer, never clean notes only', () => {
    expect(waves(clunk).has('sawtooth')).toBe(true);
    expect(waves(clunk).has('square')).toBe(true);
    for (const l of downs) expect(l.type).not.toBe('sawtooth');
  });

  it('is two notes for shift down, one blow for the clunk', () => {
    expect(new Set(describeSfx({ id: 'shiftDown', from: 3, to: 2 }).map((l) => l.delay)).size).toBe(2);
  });
});

describe('sfx spec: pace shows in sound', () => {
  it('jump starts higher at higher bands', () => {
    const starts = ([0, 1, 2, 3, 4] as const).map((band) => firstFreq(describeSfx({ id: 'jump', band })));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(new Set(starts).size).toBe(5);
    expect(BAND_PITCH[4]).toBeGreaterThan(BAND_PITCH[0]);
  });

  it('a fast landing is higher and louder than a slow one', () => {
    const slow = describeSfx({ id: 'land', band: 0 });
    const fast = describeSfx({ id: 'land', band: 4 });
    expect(firstFreq(fast)).toBeGreaterThan(firstFreq(slow));
    expect(fast[0]?.gain).toBeGreaterThan(slow[0]?.gain ?? 1);
  });

  it('jump glides up and fall-through glides down', () => {
    const jump = describeSfx({ id: 'jump' })[0];
    const fall = describeSfx({ id: 'fallThrough' })[0];
    expect(jump?.endFreq).toBeGreaterThan(jump?.freq ?? Infinity);
    expect(fall?.endFreq).toBeLessThan(fall?.freq ?? 0);
  });

  it('reset is one descending sweep (respawn is silent: nothing rises afterwards)', () => {
    const layers = describeSfx({ id: 'reset' });
    for (const l of layers) expect(l.endFreq).toBeLessThan(l.freq);
  });

  it('the home chime rises in two notes', () => {
    const c = describeSfx({ id: 'homeChime' });
    expect(c).toHaveLength(2);
    expect(c[1]?.freq).toBeGreaterThan(c[0]?.freq ?? Infinity);
  });
});

describe('sfx spec: Tandem voices', () => {
  const runner = describeSfx({ id: 'jump', body: 0, band: 2 });

  it('the twin is the same sound 5 semitones down and 3 dB softer; the runner is the default', () => {
    const twin = describeSfx({ id: 'jump', body: 1, band: 2 });
    expect(describeSfx({ id: 'jump', band: 2 })).toEqual(runner);
    expect(TWIN_PITCH_RATIO).toBeCloseTo(0.7492, 4);
    expect(TWIN_GAIN_SCALE).toBeCloseTo(0.7079, 4);
    twin.forEach((l, i) => {
      expect(l.freq).toBeCloseTo((runner[i]?.freq ?? 0) * TWIN_PITCH_RATIO, 9);
      expect(l.endFreq).toBeCloseTo((runner[i]?.endFreq ?? 0) * TWIN_PITCH_RATIO, 9);
      expect(l.gain).toBeCloseTo((runner[i]?.gain ?? 0) * TWIN_GAIN_SCALE, 9);
      expect(l.duration).toBe(runner[i]?.duration);
    });
  });

  it('a unison is both voices, each 3 dB further down, and no louder in power than one body', () => {
    const both = describeSfx({ id: 'jump', body: 'both', band: 2 });
    expect(both).toHaveLength(runner.length * 2);
    const runnerHalf = both.slice(0, runner.length);
    const twinHalf = both.slice(runner.length);
    runnerHalf.forEach((l, i) => expect(l.gain).toBeCloseTo((runner[i]?.gain ?? 0) * UNISON_GAIN_SCALE, 9));
    twinHalf.forEach((l, i) =>
      expect(l.gain).toBeCloseTo((runner[i]?.gain ?? 0) * TWIN_GAIN_SCALE * UNISON_GAIN_SCALE, 9),
    );
    const power = (ls: readonly ToneLayer[]): number => ls.reduce((s, l) => s + l.gain * l.gain, 0);
    expect(power(both)).toBeLessThan(power(runner));
  });

  it('a unison uses the twin band for the twin voice', () => {
    const both = describeSfx({ id: 'jump', body: 'both', band: 4, twinBand: 0 });
    const twinFirst = both[runner.length]?.freq ?? 0;
    expect(twinFirst).toBeCloseTo(300 * TWIN_PITCH_RATIO, 6);
  });

  it('UI and run-level sounds ignore body', () => {
    for (const id of ['uiMove', 'uiSelect', 'levelComplete', 'reset', 'shot', 'hitDeath'] as const) {
      expect(describeSfx({ id, body: 1 })).toEqual(describeSfx({ id, body: 0 }));
      expect(describeSfx({ id, body: 'both' })).toEqual(describeSfx({ id, body: 0 }));
    }
  });
});
