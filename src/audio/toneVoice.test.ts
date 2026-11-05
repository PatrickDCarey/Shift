import { describe, expect, it } from 'vitest';
import { setupEngine } from './testkit';

describe('voice accounting', () => {
  it('a voice that fails to start is never counted (no leaked slot)', async () => {
    const { engine, ctx } = setupEngine();
    await engine.unlock();
    const realCreate = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = () => {
      const osc = realCreate();
      osc.start = () => {
        throw new Error('boom');
      };
      return osc;
    };
    for (let i = 0; i < 40; i += 1) expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    expect(engine.activeVoices()).toBe(0);
    ctx.createOscillator = realCreate;
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(true);
    expect(engine.activeVoices()).toBe(1);
  });
});
