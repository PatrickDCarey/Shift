import { describe, expect, it } from 'vitest';
import { winText } from './GameHud';

describe('winText', () => {
  it('reads "Level complete — steps N — press R"', () => {
    expect(winText(312)).toBe('Level complete — steps 312 — press R');
  });

  it('does not print null if the step count is missing', () => {
    expect(winText(null)).toContain('steps ?');
  });
});
