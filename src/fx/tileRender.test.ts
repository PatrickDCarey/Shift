import { describe, expect, it } from 'vitest';
import type { BandColor } from '../core/types';
import { hexToNumber } from './color';
import { palette, patternOf, tintForSpeed, tintStops } from './palette';
import { drawGearGlyph, drawGearTile, drawSafeTile, type TileCanvas } from './tileRender';

type Call = readonly [string, ...number[]];

function recorder(): { canvas: TileCanvas; calls: Call[] } {
  const calls: Call[] = [];
  const rec =
    (name: string) =>
    (...args: number[]): undefined => {
      calls.push([name, ...args]);
      return undefined;
    };
  const canvas: TileCanvas = {
    fillStyle: rec('fillStyle'),
    fillRect: rec('fillRect'),
    fillCircle: rec('fillCircle'),
    lineStyle: rec('lineStyle'),
    strokeRect: rec('strokeRect'),
    lineBetween: rec('lineBetween'),
  };
  return { canvas, calls };
}

const count = (calls: Call[], name: string): number => calls.filter((c) => c[0] === name).length;

describe('drawGearTile', () => {
  it('draws a solid tile: opaque fill, continuous outline, pattern marks', () => {
    const { canvas, calls } = recorder();
    drawGearTile(canvas, 'blue', 'solid', 64, 32, 32);
    expect(calls[0]).toEqual(['fillStyle', hexToNumber(palette.gears.blue.solid.fill), 1]);
    expect(calls[1]).toEqual(['fillRect', 64, 32, 32, 32]);
    expect(count(calls, 'strokeRect')).toBe(1);
    expect(count(calls, 'lineBetween')).toBe(4); // four stripes, no dashes
  });

  it('draws a ghost tile: faint fill and a dashed outline made of many segments', () => {
    const { canvas, calls } = recorder();
    drawGearTile(canvas, 'blue', 'ghost', 0, 0, 32);
    expect(calls[0]).toEqual(['fillStyle', hexToNumber(palette.gears.blue.ghost.fill), palette.treatment.ghost.fillAlpha]);
    expect(count(calls, 'strokeRect')).toBe(0);
    expect(count(calls, 'lineBetween')).toBeGreaterThan(4 + 8); // stripes plus dashes
  });

  it('uses the pattern from the palette for every gear', () => {
    const expectedMarks: Record<BandColor, (calls: Call[]) => boolean> = {
      white: (c) => count(c, 'lineBetween') === 0 && count(c, 'fillCircle') === 0,
      blue: (c) => count(c, 'lineBetween') > 0 && count(c, 'fillCircle') === 0,
      green: (c) => count(c, 'fillCircle') === 9,
      yellow: (c) => count(c, 'lineBetween') === 6,
      red: (c) => count(c, 'lineBetween') > 6 && count(c, 'fillCircle') === 0,
    };
    for (const g of Object.keys(expectedMarks) as BandColor[]) {
      const { canvas, calls } = recorder();
      drawGearTile(canvas, g, 'solid', 0, 0, 32);
      expect(expectedMarks[g](calls), `${g} (${patternOf(g)})`).toBe(true);
    }
  });

  it('solid and ghost tiles of the same gear issue different draw calls', () => {
    const a = recorder();
    const b = recorder();
    drawGearTile(a.canvas, 'red', 'solid', 0, 0, 32);
    drawGearTile(b.canvas, 'red', 'ghost', 0, 0, 32);
    expect(a.calls).not.toEqual(b.calls);
  });
});

describe('drawSafeTile and drawGearGlyph', () => {
  it('safe tile is a flat fill and an outline with no pattern marks', () => {
    const { canvas, calls } = recorder();
    drawSafeTile(canvas, 0, 0, 32);
    expect(count(calls, 'fillRect')).toBe(1);
    expect(count(calls, 'strokeRect')).toBe(1);
    expect(count(calls, 'lineBetween')).toBe(0);
    expect(count(calls, 'fillCircle')).toBe(0);
  });

  it('glyph is the solid treatment at the requested size', () => {
    const a = recorder();
    const b = recorder();
    drawGearGlyph(a.canvas, 'green', 10, 10, 16);
    drawGearTile(b.canvas, 'green', 'solid', 10, 10, 16);
    expect(a.calls).toEqual(b.calls);
    expect(count(a.calls, 'fillCircle')).toBe(4); // coarser 2x2 dots at HUD size
  });
});

describe('tint', () => {
  it('resolves stops from the gear colours', () => {
    const stops = tintStops();
    expect(stops).toHaveLength(palette.tint.stops.length);
    expect(stops[0]?.color).toBe(palette.gears.white.solid.fill);
    expect(stops[stops.length - 1]?.color).toBe(palette.gears.red.solid.fill);
  });

  it('is white at rest, red at top speed, and blue at gear 1 speed', () => {
    expect(tintForSpeed(0, 12)).toEqual({ r: 242, g: 244, b: 255 });
    expect(tintForSpeed(12, 12)).toEqual({ r: 245, g: 40, b: 60 });
    expect(tintForSpeed(3, 12)).toEqual({ r: 76, g: 141, b: 255 });
    expect(tintForSpeed(99, 12)).toEqual({ r: 245, g: 40, b: 60 });
    expect(tintForSpeed(5, 0)).toEqual({ r: 242, g: 244, b: 255 });
  });
});
