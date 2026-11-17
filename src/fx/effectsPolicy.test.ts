import { describe, expect, it } from 'vitest';
import {
  EXIT_PULSE_CYCLE,
  EXIT_PULSE_STEP_MS,
  FULL_EFFECTS,
  MAX_FLASHES_PER_SECOND,
  effectModes,
  exitPulseFrame,
  requestFlash,
  wipeAt,
  whyFellFrame,
  WHY_FELL_MS,
} from './effectsPolicy';
import { palette } from './palette';

describe('effectModes', () => {
  it('full effects turn everything on, the wipe only without a twin', () => {
    const m = effectModes(FULL_EFFECTS, false);
    expect(m).toMatchObject({ shiftFrames: true, ringBurst: true, screenWipe: true, afterimages: true, speedLines: true, dust: 'full', horizonDither: true, stars: true, ridgeParallax: true, exitPulse: true });
    expect(effectModes(FULL_EFFECTS, true).screenWipe).toBe(false);
  });

  it('reduced effects drops decoration but keeps the drop cue (frames, ring, wipe) and the exit pulse', () => {
    const m = effectModes({ reducedEffects: true, reducedMotion: false }, false);
    expect(m).toMatchObject({ afterimages: false, speedLines: false, dust: 'off', horizonDither: false, stars: false });
    expect(m).toMatchObject({ shiftFrames: true, ringBurst: true, screenWipe: true, exitPulse: true, ridgeParallax: true });
  });

  it('reduced motion drops flashes, wipe, ring, parallax and pulse; dust stays as static specks; the drop is held 2 frames', () => {
    const m = effectModes({ reducedEffects: false, reducedMotion: true }, false);
    expect(m).toMatchObject({ shiftFrames: false, ringBurst: false, screenWipe: false, ridgeParallax: false, exitPulse: false, deathFlash: false, dust: 'static', dropHoldFrames: 2 });
    expect(m.afterimages).toBe(false);
    expect(m.horizonDither).toBe(true);
  });

  it('both settings: the stricter entry of each row (dust off)', () => {
    const m = effectModes({ reducedEffects: true, reducedMotion: true }, false);
    expect(m.dust).toBe('off');
    expect(m.afterimages || m.speedLines || m.screenWipe || m.ringBurst || m.shiftFrames).toBe(false);
    expect(m.dropHoldFrames).toBe(2);
  });

  it('every mode keeps some drop cue on the body (frames or the held outline)', () => {
    for (const reducedEffects of [false, true]) {
      for (const reducedMotion of [false, true]) {
        const m = effectModes({ reducedEffects, reducedMotion }, true);
        expect(m.shiftFrames || m.dropHoldFrames > 0, `${reducedEffects}/${reducedMotion}`).toBe(true);
      }
    }
  });
});

describe('exitPulseFrame', () => {
  it('cycles through every door frame', () => {
    const seen = new Set<number>();
    for (let t = 0; t < EXIT_PULSE_CYCLE.length * EXIT_PULSE_STEP_MS; t += EXIT_PULSE_STEP_MS) seen.add(exitPulseFrame(t, false));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('is slow: a full cycle takes at least 1.5 s and a step at least 200 ms', () => {
    expect(EXIT_PULSE_CYCLE.length * EXIT_PULSE_STEP_MS).toBeGreaterThanOrEqual(1500);
    expect(EXIT_PULSE_STEP_MS).toBeGreaterThanOrEqual(200);
  });

  it('holds door_0 under reduced motion, and tolerates negative time', () => {
    for (let t = 0; t < 4000; t += 50) expect(exitPulseFrame(t, true)).toBe(0);
    expect(exitPulseFrame(-5, false)).toBe(0);
  });
});

describe('wipeAt', () => {
  it('shows frame 0 then frame 1, each half the flash duration, then nothing', () => {
    const half = palette.flash.durationMs / 2;
    expect(wipeAt(0)).toEqual({ frame: 0, alpha: palette.flash.alpha });
    expect(wipeAt(half - 1)?.frame).toBe(0);
    expect(wipeAt(half)?.frame).toBe(1);
    expect(wipeAt(palette.flash.durationMs)).toBeNull();
    expect(wipeAt(-1)).toBeNull();
  });
});

describe('requestFlash (3 per second across the screen)', () => {
  it('allows 3 flashes in a second and refuses the rest, then allows again after the window', () => {
    let h: readonly number[] = [];
    const results: boolean[] = [];
    for (const t of [0, 100, 200, 300, 400, 500]) {
      const r = requestFlash(h, t);
      results.push(r.allowed);
      h = r.history;
    }
    expect(results).toEqual([true, true, true, false, false, false]);
    expect(requestFlash(h, 1001).allowed).toBe(true);
  });

  it('six band-change flashes inside one second produce at most 3 white frames', () => {
    let h: readonly number[] = [];
    let shown = 0;
    for (let i = 0; i < 6; i++) {
      const r = requestFlash(h, i * 150);
      if (r.allowed) shown++;
      h = r.history;
    }
    expect(shown).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('does not mutate the history it was given', () => {
    const h = Object.freeze([0, 10]);
    requestFlash(h, 20);
    expect(h).toEqual([0, 10]);
  });
});

describe('whyFellFrame', () => {
  it('motion: bold, hold, fade, then done after 750 ms', () => {
    expect(whyFellFrame(0, false)).toBe('bold');
    expect(whyFellFrame(119, false)).toBe('bold');
    expect(whyFellFrame(120, false)).toBe('hold');
    expect(whyFellFrame(599, false)).toBe('hold');
    expect(whyFellFrame(600, false)).toBe('fade');
    expect(whyFellFrame(WHY_FELL_MS - 1, false)).toBe('fade');
    expect(whyFellFrame(WHY_FELL_MS, false)).toBeNull();
  });
  it('reduced motion holds one static frame for the same time', () => {
    for (const t of [0, 100, 400, WHY_FELL_MS - 1]) expect(whyFellFrame(t, true)).toBe('hold');
    expect(whyFellFrame(WHY_FELL_MS, true)).toBeNull();
  });
  it('is null before the fall starts', () => {
    expect(whyFellFrame(-1, false)).toBeNull();
    expect(whyFellFrame(-1, true)).toBeNull();
  });
});
