import { describe, expect, it } from 'vitest';
import { axisScroll, cameraScroll } from './camera';

describe('axisScroll', () => {
  it('centres the focus in the middle of a big world', () => {
    expect(axisScroll(1000, 960, 3000)).toBe(520);
  });

  it('clamps at the start and the end of the world', () => {
    expect(axisScroll(100, 960, 3000)).toBe(0);
    expect(axisScroll(2950, 960, 3000)).toBe(2040);
  });

  it('centres a world smaller than the view (negative scroll)', () => {
    expect(axisScroll(100, 960, 640)).toBe(-160);
    expect(axisScroll(100, 960, 960)).toBe(0);
  });

  it('rounds to whole pixels', () => {
    expect(Number.isInteger(axisScroll(1000.4, 960, 3000))).toBe(true);
  });
});

describe('cameraScroll', () => {
  it('handles both axes independently', () => {
    expect(cameraScroll(1000, 100, 960, 540, 3000, 320)).toEqual({ x: 520, y: -110 });
  });
});
