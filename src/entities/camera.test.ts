import { describe, expect, it } from 'vitest';
import { axisScroll, cameraFocus, cameraScroll, snapFeet } from './camera';

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

describe('snapping invariant', () => {
  const VIEW_W = 480;
  const VIEW_H = 270;
  const BODY_W = 12;
  const BODY_H = 24;

  it('keeps the player at one screen position while the camera is unclamped, for any fractional x', () => {
    const screenXs = new Set<number>();
    const screenYs = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const xTiles = 40 + i * 0.0137;
      const yTiles = 10 + i * 0.0071;
      const { px, py } = snapFeet(xTiles, yTiles, 16);
      const focus = cameraFocus([{ px, py, home: false }], BODY_H, 28 * 16);
      const s = cameraScroll(focus?.x ?? 0, focus?.y ?? 0, VIEW_W, VIEW_H, 200 * 16, 100 * 16);
      screenXs.add(px - s.x);
      screenYs.add(py - s.y);
    }
    expect([...screenXs]).toEqual([VIEW_W / 2]);
    expect(screenYs.size).toBe(1);
    expect(BODY_W % 2).toBe(0);
  });

  it('snaps feet to whole pixels', () => {
    expect(snapFeet(1.5 + 1 / 32, 2.99, 16)).toEqual({ px: 25, py: 48 });
    expect(Number.isInteger(snapFeet(3.3333, 4.4444, 16).px)).toBe(true);
  });

  it('gives integer scrolls even for the Tandem midpoint of odd positions', () => {
    const focus = cameraFocus([{ px: 101, py: 200, home: false }, { px: 160, py: 201, home: false }], BODY_H, 448);
    expect(focus).toEqual({ x: 130, y: 188, edgeBody: null });
    const s = cameraScroll(focus?.x ?? 0, focus?.y ?? 0, VIEW_W, VIEW_H, 3200, 1600);
    expect(Number.isInteger(s.x) && Number.isInteger(s.y)).toBe(true);
  });
});

describe('cameraFocus', () => {
  const a = (px: number, home = false): { px: number; py: number; home: boolean } => ({ px, py: 100, home });

  it('follows the one body that is not home', () => {
    expect(cameraFocus([a(50, true), a(300)], 24, 448)).toEqual({ x: 300, y: 88, edgeBody: null });
    expect(cameraFocus([a(50), a(300, true)], 24, 448)).toEqual({ x: 50, y: 88, edgeBody: null });
  });

  it('follows the runner and flags the twin beyond 28 tiles', () => {
    expect(cameraFocus([a(0), a(449)], 24, 448)).toEqual({ x: 0, y: 88, edgeBody: 1 });
    expect(cameraFocus([a(0), a(448)], 24, 448)?.edgeBody).toBeNull();
  });

  it('returns null when every body is home', () => {
    expect(cameraFocus([a(1, true), a(2, true)], 24, 448)).toBeNull();
  });
});
