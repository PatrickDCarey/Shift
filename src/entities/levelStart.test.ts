import { describe, expect, it } from 'vitest';
import { createLevelStartTracker } from './levelStart';

describe('level start tracker', () => {
  it('is the first start exactly once per tracker', () => {
    const t = createLevelStartTracker();
    expect(t.consumeFirstStart()).toBe(true);
    expect(t.consumeFirstStart()).toBe(false);
    expect(t.consumeFirstStart()).toBe(false);
  });

  it('trackers are independent (the page-session one is a module singleton)', () => {
    expect(createLevelStartTracker().consumeFirstStart()).toBe(true);
    expect(createLevelStartTracker().consumeFirstStart()).toBe(true);
  });
});
