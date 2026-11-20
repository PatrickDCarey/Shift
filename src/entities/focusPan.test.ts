import { describe, expect, it } from 'vitest';
import { FocusPan, PAN_MS } from './focusPan';

const A = { x: 100, y: 50 };
const B = { x: 280, y: 50 };

describe('FocusPan', () => {
  it('passes the focus through while the framing does not switch', () => {
    const pan = new FocusPan();
    expect(pan.apply(A, 2, 16, false)).toEqual(A);
    expect(pan.apply({ x: 110, y: 50 }, 2, 16, false)).toEqual({ x: 110, y: 50 });
    expect(pan.apply({ x: 110, y: 50 }, 1, 16, false)).toEqual({ x: 110, y: 50 }); // a park where the camera already looks
  });

  it('pans from the old focus to the new over PAN_MS when one body parks', () => {
    const pan = new FocusPan();
    pan.apply(A, 2, 16, false);
    const first = pan.apply(B, 1, 16, false);
    expect(first.x).toBeGreaterThan(A.x);
    expect(first.x).toBeLessThan(B.x);
    let last = first;
    let elapsed = 16;
    while (elapsed < PAN_MS) {
      const f = pan.apply(B, 1, 16, false);
      expect(f.x).toBeGreaterThanOrEqual(last.x); // monotone
      last = f;
      elapsed += 16;
    }
    expect(pan.apply(B, 1, 16, false)).toEqual(B); // done and exact
    expect(pan.apply(B, 1, 16, false)).toEqual(B);
  });

  it('takes whole pixels', () => {
    const pan = new FocusPan();
    pan.apply(A, 2, 16, false);
    for (let i = 0; i < 20; i++) {
      const f = pan.apply(B, 1, 7, false);
      expect(Number.isInteger(f.x) && Number.isInteger(f.y)).toBe(true);
    }
  });

  it('snaps under reduced motion', () => {
    const pan = new FocusPan();
    pan.apply(A, 2, 16, true);
    expect(pan.apply(B, 1, 16, true)).toEqual(B);
  });

  it('does not pan when the body count rises (a respawn) or the first focus arrives', () => {
    const pan = new FocusPan();
    expect(pan.apply(B, 1, 16, false)).toEqual(B);
    expect(pan.apply(A, 2, 16, false)).toEqual(A);
  });

  it('a reduced-motion switch mid-pan finishes at once', () => {
    const pan = new FocusPan();
    pan.apply(A, 2, 16, false);
    pan.apply(B, 1, 16, false);
    expect(pan.apply(B, 1, 16, true)).toEqual(B);
  });
});
