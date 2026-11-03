import { describe, expect, it } from 'vitest';
import { embeddedMask, isEmbedded } from './embedded';
import { gridLevel } from './testkit';

// Row 1: blue tiles at cols 2-3 and a green tile at col 6 (B blue, G green), plus a start and an exit.
const level = gridLevel(['@.......', '..BB..GE', '########']);
const W = 0.75;
const H = 1.5;

describe('embeddedMask', () => {
  it('is empty when the box overlaps no coloured tile', () => {
    expect(embeddedMask(level, 0.5, 2, W, H)).toBe(0);
  });

  it('flags the colour of a tile the box overlaps', () => {
    const mask = embeddedMask(level, 2.5, 2, W, H);
    expect(isEmbedded(mask, 1)).toBe(true);
    expect(isEmbedded(mask, 2)).toBe(false);
  });

  it('does not count touching edges as overlap', () => {
    // Box right edge exactly on the left side of col 2.
    expect(embeddedMask(level, 2 - W / 2, 2, W, H)).toBe(0);
  });

  it('flags every colour overlapped at once', () => {
    const wide = embeddedMask(level, 4.5, 2, 5, H);
    expect(isEmbedded(wide, 1)).toBe(true);
    expect(isEmbedded(wide, 2)).toBe(true);
  });

  it('does not crash outside the grid', () => {
    expect(embeddedMask(level, -3, 2, W, H)).toBe(0);
    expect(embeddedMask(level, 3, 50, W, H)).toBe(0);
    expect(embeddedMask(level, 3, -10, W, H)).toBe(0);
  });
});
