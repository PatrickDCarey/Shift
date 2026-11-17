import { describe, expect, it } from 'vitest';
import { InputSampler } from './inputSampler';
import { loadGameParams } from './params';
import { RunControl } from './runControl';
import { gridLevel } from './testkit';

const STEP_MS = 1000 / 60;
const { params } = loadGameParams();
const level = gridLevel(['.....', '.@.E.', '#####']);

describe('RunControl (live play)', () => {
  it('advances the sim from the keyboard sampler', () => {
    const sampler = new InputSampler();
    const run = new RunControl(level, params, sampler, null);
    sampler.keyDown('ArrowRight');
    run.advance(STEP_MS * 5);
    expect(run.driver.state.player.x).toBeGreaterThan(level.start.col);
  });

  it('restart() sends exactly one restart press on the next step', () => {
    const run = new RunControl(level, params, new InputSampler(), null);
    run.advance(STEP_MS * 3);
    run.restart();
    const first = run.advance(STEP_MS);
    expect(first.some((e) => e.type === 'restart')).toBe(true);
    const second = run.advance(STEP_MS * 2);
    expect(second.some((e) => e.type === 'restart')).toBe(false);
  });

  it('has no replay in live play', () => {
    expect(new RunControl(level, params, new InputSampler(), null).replay).toBeNull();
  });
});
