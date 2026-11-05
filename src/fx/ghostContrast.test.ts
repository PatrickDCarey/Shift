/**
 * M2-14b: every band's ghost outline against the brightest background that can
 * sit behind a tile, at the 49 speeds the pixel scenery tests sample (0 to 12
 * in quarter steps), in normal vision, greyscale and the three dichromacies.
 * "Brightest" means every decor colour (flat field, pace hue, both ridges and
 * the stars), so yellow (speed 9, the lightest tint) is always included.
 *
 * One documented exception: red under protanopia (see docs/art/accessibility.md
 * section 11). Every other band and vision is at least 3:1.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../core/types';
import { contrastRatio, hexToRgb, simulateVision, VISIONS, type Rgb, type Vision } from './color';
import { palette } from './palette';
import { getPixel } from './pixel/raster';
import { sceneryColors } from './pixel/scenery';
import { bakeGhostTile } from './pixel/tiles';

const GEARS: readonly BandColor[] = ['white', 'blue', 'green', 'yellow', 'red'];
const SPEEDS = Array.from({ length: 49 }, (_, i) => i / 4);
const TOP = 12;
const MIN = 3;
/** The tested floor for the single exception, red under protanopia (measured 2.20 with stars, 2.31 without). */
const EXCEPTION_FLOOR = 2.15;

interface Backdrop {
  readonly name: string;
  readonly speed: number;
  readonly color: Rgb;
}

const backdrops: readonly Backdrop[] = SPEEDS.flatMap((speed) => {
  const c = sceneryColors(speed, TOP);
  return [
    { name: 'base', speed, color: c.base },
    { name: 'hue', speed, color: c.hue },
    { name: 'ridgeFar', speed, color: c.ridgeFar },
    { name: 'ridgeNear', speed, color: c.ridgeNear },
    { name: 'star', speed, color: c.star },
  ];
});

function worst(outline: Rgb, vision: Vision): { min: number; at: string } {
  let min = Infinity;
  let at = '';
  for (const b of backdrops) {
    const c = contrastRatio(simulateVision(outline, vision), simulateVision(b.color, vision));
    if (c < min) {
      min = c;
      at = `${b.name} at speed ${b.speed}`;
    }
  }
  return { min, at };
}

const isException = (band: BandColor, vision: Vision): boolean => band === 'red' && vision === 'protanopia';

describe('ghost outline vs the brightest background, every band, 49 speeds', () => {
  it('samples 49 speeds including yellow (speed 9) and the stars', () => {
    expect(SPEEDS).toHaveLength(49);
    expect(SPEEDS).toContain(9);
    expect(backdrops.some((b) => b.name === 'star')).toBe(true);
  });

  describe.each(VISIONS)('%s', (vision) => {
    it.each(GEARS)('%s ghost outline is at least 3:1 (red under protanopia: tested floor 2.15)', (band) => {
      const { min, at } = worst(hexToRgb(palette.gears[band].ghost.outline), vision);
      const floor = isException(band, vision) ? EXCEPTION_FLOOR : MIN;
      expect(min, `${band} worst at ${at}`).toBeGreaterThanOrEqual(floor);
    });
  });

  it('the exception is exactly one cell: red under protanopia is below 3:1, nothing else is', () => {
    const below: string[] = [];
    for (const vision of VISIONS) {
      for (const band of GEARS) {
        if (worst(hexToRgb(palette.gears[band].ghost.outline), vision).min < MIN) below.push(`${band}/${vision}`);
      }
    }
    expect(below).toEqual(['red/protanopia']);
  });

  it('every dash pixel of the baked 16 px ghost tiles keeps the same floors', () => {
    for (const band of ['blue', 'green', 'yellow', 'red'] as const) {
      const tile = bakeGhostTile(band);
      for (const vision of VISIONS) {
        const floor = isException(band, vision) ? EXCEPTION_FLOOR : MIN;
        for (const [x, y] of [[0, 0], [1, 0], [2, 0], [15, 0], [0, 15], [15, 15], [0, 7], [15, 7]] as const) {
          const p = getPixel(tile, x, y);
          expect(p[3], `${band} outline pixel ${x},${y} is opaque`).toBe(255);
          const { min } = worst({ r: p[0], g: p[1], b: p[2] }, vision);
          expect(min, `${band} ${vision} pixel ${x},${y}`).toBeGreaterThanOrEqual(floor);
        }
      }
    }
  });
});
