/**
 * The pixel art and the simulation share one scale, written twice: the sim's
 * `tuning.json` (`tileSize`, player size in tiles, design-lead) and the art's
 * `palette.json` `pixel` block (art-director, used by `src/fx/pixel` to bake
 * the sheets). If they drift, sprites stop lining up with collision boxes.
 * Batch 4A review, finding X1. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import palette from '../../src/data/palette.json';
import tuning from '../../src/data/tuning.json';

describe('pixel scale matches the simulation', () => {
  it('palette.json pixel.tileSize equals tuning.json tileSize', () => {
    expect(palette.pixel.tileSize).toBe(tuning.tileSize);
  });

  it('the baked body is the sim body in pixels', () => {
    expect(palette.pixel.body.width).toBe(tuning.playerWidthTiles * tuning.tileSize);
    expect(palette.pixel.body.height).toBe(tuning.playerHeightTiles * tuning.tileSize);
  });
});
