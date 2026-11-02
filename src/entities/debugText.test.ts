import { describe, expect, it } from 'vitest';
import { createSim } from '../core';
import { debugText } from './debugText';
import { loadGameParams } from './params';
import { gridLevel } from './testkit';

describe('debugText', () => {
  it('shows band, gear, vx and step', () => {
    const state = createSim(gridLevel(['.@.E', '####']), loadGameParams().params);
    const text = debugText(state, 59.6);
    expect(text).toContain('band 0  gear 1');
    expect(text).toContain('vx 0.00');
    expect(text).toContain('step 0  playing');
    expect(text).toContain('60 fps');
  });
});
