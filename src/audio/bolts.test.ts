import { describe, expect, it } from 'vitest';
import { sfxForEvent, sfxForEvents } from './sfxEvents';
import { createSfx } from './sfx';
import { describeSfx, sfxDuration } from './sfxSpec';
import { SHOT_BURST_MAX, SHOT_MIN_GAP_MS, SHOT_WINDOW_MS, createShotLimiter } from './shotLimit';
import { setupEngine } from './testkit';

describe('hit death mapping', () => {
  it('a fall (no cause) stays reset; hit and sweep give hitDeath', () => {
    expect(sfxForEvent({ type: 'died', body: 0 })).toEqual({ id: 'reset' });
    expect(sfxForEvent({ type: 'died', body: 0, cause: 'hit' })).toEqual({ id: 'hitDeath' });
    expect(sfxForEvent({ type: 'died', body: 1, cause: 'sweep' })).toEqual({ id: 'hitDeath' });
  });

  it('a hit death plus restart sounds one death cue, still a hit', () => {
    const ids = sfxForEvents([{ type: 'died', body: 0, cause: 'hit' }, { type: 'restart' }]).map((c) => c.id);
    expect(ids).toEqual(['hitDeath']);
  });

  it('differs from the fall cue and stays short', () => {
    const hit = describeSfx({ id: 'hitDeath' });
    expect(hit).not.toEqual(describeSfx({ id: 'reset' }));
    expect(sfxDuration(hit)).toBeLessThanOrEqual(0.5);
  });
});

describe('shot rate limit', () => {
  it('enforces the minimum gap and the burst cap', () => {
    let t = 0;
    const allow = createShotLimiter(() => t);
    expect(allow()).toBe(true);
    t = SHOT_MIN_GAP_MS - 1;
    expect(allow()).toBe(false);
    t = SHOT_MIN_GAP_MS;
    expect(allow()).toBe(true);
    t = 2 * SHOT_MIN_GAP_MS;
    expect(allow()).toBe(true);
    t = 3 * SHOT_MIN_GAP_MS;
    expect(SHOT_BURST_MAX).toBe(3);
    expect(allow()).toBe(false);
    t = SHOT_WINDOW_MS + 1;
    expect(allow()).toBe(true);
  });
});

describe('sfx.shot', () => {
  it('plays when on screen, drops when off screen, and is rate limited', async () => {
    const { engine, ctx } = setupEngine();
    await engine.unlock();
    let t = 1000;
    const sfx = createSfx(engine, undefined, () => t);
    const layers = describeSfx({ id: 'shot', band: 2 }).length;
    expect(sfx.shot(2)).toBe(layers);
    expect(ctx.oscs.length).toBe(layers);
    expect(sfx.shot(2, false)).toBe(0);
    expect(sfx.shot(2)).toBe(0);
    t += SHOT_MIN_GAP_MS;
    expect(sfx.shot(2)).toBe(layers);
  });

  it('is silent before unlock and when muted, and never throws', async () => {
    const { engine, ctx } = setupEngine();
    const sfx = createSfx(engine, undefined, () => 0);
    expect(sfx.shot(1)).toBe(0);
    expect(sfx.hitDeath()).toBe(0);
    await engine.unlock();
    engine.setMuted(true);
    const before = ctx.oscs.length;
    expect(createSfx(engine, undefined, () => 5000).shot(1)).toBe(0);
    expect(sfx.hitDeath()).toBe(0);
    expect(ctx.oscs.length).toBe(before);
  });
});

describe('post cue', () => {
  it('is distinct from the win, shift, shot and death cues and short', () => {
    const post = describeSfx({ id: 'post' });
    for (const id of ['levelComplete', 'shiftUp', 'shot', 'hitDeath', 'reset'] as const) {
      expect(post).not.toEqual(describeSfx({ id }));
    }
    expect(sfxDuration(post)).toBeLessThanOrEqual(0.25);
  });

  it('plays after unlock, is silent before and when muted', async () => {
    const { engine, ctx } = setupEngine();
    const sfx = createSfx(engine);
    expect(sfx.post()).toBe(0);
    await engine.unlock();
    expect(sfx.post()).toBe(describeSfx({ id: 'post' }).length);
    engine.setMuted(true);
    const before = ctx.oscs.length;
    expect(sfx.post()).toBe(0);
    expect(ctx.oscs.length).toBe(before);
  });
});
