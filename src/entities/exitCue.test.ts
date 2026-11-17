import { describe, expect, it } from 'vitest';
import { EDGE_ARROW_W } from '../fx/pixel';
import { exitCue } from './exitCue';
import { ARROW_TOP, edgeArrowPlacement, spriteX } from './tandemView';

const VIEW = { w: 480, h: 270 };
const TS = 16;

describe('exitCue', () => {
  it('is null while an exit is on screen, even partly', () => {
    expect(exitCue([{ col: 10, row: 5 }], { x: 0, y: 0 }, VIEW, TS)).toBeNull();
    expect(exitCue([{ col: 29, row: 5 }], { x: 0, y: 0 }, VIEW, TS)).toBeNull();
    expect(exitCue([{ col: 0, row: 5 }], { x: 10, y: 0 }, VIEW, TS)).toBeNull();
  });

  it('is null when there is no exit', () => {
    expect(exitCue([], { x: 0, y: 0 }, VIEW, TS)).toBeNull();
  });

  it('points right at the right edge, all 22 px on screen', () => {
    const cue = exitCue([{ col: 60, row: 10 }], { x: 0, y: 0 }, VIEW, TS);
    expect(cue).toMatchObject({ flipX: false, angle: 0 });
    expect((cue?.x ?? 0) + EDGE_ARROW_W).toBeLessThanOrEqual(VIEW.w);
    expect(cue?.y).toBe(10 * TS + 8);
  });

  it('mirrors at the left edge with the sprite box inside 0..21+margin', () => {
    const cue = exitCue([{ col: 2, row: 10 }], { x: 500, y: 0 }, VIEW, TS);
    expect(cue).toMatchObject({ flipX: true, angle: 0 });
    expect(cue?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((cue?.x ?? 0) + EDGE_ARROW_W).toBeLessThanOrEqual(VIEW.w);
  });

  it('keeps the arrow under the HUD strips and above the bottom margin', () => {
    const high = exitCue([{ col: 60, row: 0 }], { x: 0, y: 0 }, VIEW, TS);
    expect(high?.y ?? 0).toBeGreaterThanOrEqual(ARROW_TOP);
    const low = exitCue([{ col: 60, row: 40 }], { x: 0, y: 0 }, VIEW, TS);
    expect(low?.y ?? 999).toBeLessThanOrEqual(VIEW.h - 8);
  });

  it('rotates for an exit straight below or above', () => {
    const down = exitCue([{ col: 15, row: 40 }], { x: 0, y: 0 }, VIEW, TS);
    expect(down).toMatchObject({ angle: 90, flipX: false });
    expect((down?.y ?? 0) + EDGE_ARROW_W).toBeLessThanOrEqual(VIEW.h);
    const up = exitCue([{ col: 15, row: 0 }], { x: 0, y: 400 }, VIEW, TS);
    expect(up).toMatchObject({ angle: -90 });
    expect((up?.y ?? 0) - EDGE_ARROW_W).toBeGreaterThanOrEqual(0);
  });

  it('keeps an up arrow right of the HUD block', () => {
    const up = exitCue([{ col: 2, row: 0 }], { x: 0, y: 400 }, VIEW, TS);
    expect(up?.x ?? 0).toBeGreaterThanOrEqual(125);
  });

  it('points at the exit nearest the view centre', () => {
    const cue = exitCue([{ col: 100, row: 5 }, { col: 40, row: 5 }], { x: 0, y: 0 }, VIEW, TS);
    expect(cue?.flipX).toBe(false);
    const left = exitCue([{ col: 0, row: 5 }, { col: 100, row: 5 }], { x: 100, y: 0 }, VIEW, TS);
    expect(left?.flipX).toBe(true);
  });
});

describe('spriteX: all 22 px on screen for both arrows (flipX mirrors about the position)', () => {
  const box = (a: { x: number; flipX: boolean }): readonly [number, number] => {
    const px = spriteX(a);
    return a.flipX ? [px - EDGE_ARROW_W, px] : [px, px + EDGE_ARROW_W];
  };

  it('twin arrow, left and right edge', () => {
    const left = edgeArrowPlacement({ px: 100, py: 2 * TS }, 24, { x: 500, y: 0 }, VIEW);
    const right = edgeArrowPlacement({ px: 900, py: 2 * TS }, 24, { x: 0, y: 0 }, VIEW);
    for (const a of [left, right]) {
      const [lo, hi] = box(a as NonNullable<typeof a>);
      expect(lo).toBeGreaterThanOrEqual(5);
      expect(hi).toBeLessThanOrEqual(VIEW.w - 5);
    }
    expect(left?.flipX).toBe(true);
    expect(right?.flipX).toBe(false);
  });

  it('exit arrow, left and right edge, with the same margin as the twin arrow', () => {
    const left = exitCue([{ col: 2, row: 10 }], { x: 500, y: 0 }, VIEW, TS);
    const right = exitCue([{ col: 80, row: 10 }], { x: 0, y: 0 }, VIEW, TS);
    expect(box(left as NonNullable<typeof left>)).toEqual([5, 27]);
    expect(box(right as NonNullable<typeof right>)).toEqual([VIEW.w - 27, VIEW.w - 5]);
  });
});
