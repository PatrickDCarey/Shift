import { describe, expect, it } from 'vitest';
import { createAudioEngine } from './engine';
import { createSfx, playCue } from './sfx';
import { describeSfx, SFX_IDS, TWIN_PITCH_RATIO, type SfxId } from './sfxSpec';
import { setupEngine } from './testkit';

describe('sfx player', () => {
  it('never throws and plays nothing before the first gesture', () => {
    const engine = createAudioEngine({ contextFactory: () => null });
    const sfx = createSfx(engine);
    expect(() => {
      sfx.shiftUp();
      sfx.shiftDown();
      sfx.jump();
      sfx.land();
      sfx.fallThrough();
      sfx.reset();
      sfx.levelComplete();
      sfx.homeChime(1);
      sfx.uiMove();
      sfx.uiSelect();
      sfx.airDragClunk();
      sfx.playEvents([{ type: 'won' }]);
    }).not.toThrow();
    expect(sfx.uiMove()).toBe(0);
  });

  it('each of the ten functions schedules its layers once unlocked', async () => {
    const { engine, ctx } = setupEngine();
    await engine.unlock();
    const sfx = createSfx(engine);
    const calls: [SfxId, () => number][] = [
      ['shiftUp', () => sfx.shiftUp(1, 2)],
      ['shiftDown', () => sfx.shiftDown(2, 1)],
      ['jump', () => sfx.jump(2)],
      ['land', () => sfx.land(2)],
      ['fallThrough', () => sfx.fallThrough()],
      ['reset', () => sfx.reset()],
      ['levelComplete', () => sfx.levelComplete()],
      ['uiMove', () => sfx.uiMove()],
      ['uiSelect', () => sfx.uiSelect()],
      ['airDragClunk', () => sfx.airDragClunk()],
    ];
    expect(calls.map(([id]) => id).sort()).toEqual([...SFX_IDS].sort());
    for (const [id, play] of calls) {
      const before = ctx.oscs.length;
      const expected = describeSfx({ id }).length;
      expect(play()).toBe(expected);
      expect(ctx.oscs.length - before).toBe(expected);
    }
  });

  it('uses the described frequencies, waves and start offsets on the oscillators', async () => {
    const { engine, ctx } = setupEngine();
    await engine.unlock();
    const cue = { id: 'airDragClunk' } as const;
    expect(playCue(engine, cue)).toBe(2);
    const layers = describeSfx(cue);
    ctx.oscs.forEach((osc, i) => {
      expect(osc.type).toBe(layers[i]?.type);
      expect(osc.frequency.sets[0]).toBeCloseTo(layers[i]?.freq ?? -1, 9);
      expect(osc.frequency.ramps[0]).toBeCloseTo(layers[i]?.endFreq ?? -1, 9);
      expect(osc.started).toBeCloseTo(layers[i]?.delay ?? -1, 9);
    });
  });

  it('is silent when muted or when the SFX volume is zero', async () => {
    const { engine, ctx } = setupEngine();
    await engine.unlock();
    const sfx = createSfx(engine);
    engine.setMuted(true);
    expect(sfx.uiSelect()).toBe(0);
    engine.setMuted(false);
    engine.setSfxVolume(0);
    expect(sfx.uiSelect()).toBe(0);
    expect(ctx.oscs).toHaveLength(0);
  });

  it('plays both bodies on one step once, as a unison of two voices', async () => {
    const { engine, ctx } = setupEngine();
    await engine.unlock();
    const sfx = createSfx(engine);
    const perJump = describeSfx({ id: 'jump' }).length;
    const n = sfx.playEvents(
      [
        { type: 'jump', body: 0, coyote: false, buffered: false },
        { type: 'jump', body: 1, coyote: false, buffered: false },
      ],
      { bands: [2, 2] },
    );
    expect(n).toBe(2 * perJump);
    const runnerHz = ctx.oscs[0]?.frequency.sets[0] ?? 0;
    const twinHz = ctx.oscs[perJump]?.frequency.sets[0] ?? 0;
    expect(twinHz / runnerHz).toBeCloseTo(TWIN_PITCH_RATIO, 6);
  });

  it('30 SFX requested in one frame never exceed 24 voices', async () => {
    const { engine } = setupEngine();
    await engine.unlock();
    const sfx = createSfx(engine);
    for (let i = 0; i < 30; i += 1) sfx.levelComplete();
    expect(engine.activeVoices()).toBeLessThanOrEqual(24);
  });
});
