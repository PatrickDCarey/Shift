/**
 * Which colours the player's box overlaps right now. While it overlaps colour
 * k, every colour-k tile is non-solid (the no-embed rule, GDD section 4.7), so
 * the renderer draws them as ghosts. Pure; mirrors the sim's overlap test
 * (strict, with SIM_EPSILON) without importing the sim lane.
 *
 * Owner: gameplay-engineer [scene].
 */
import { SIM_EPSILON, type Level } from '../core/types';

/** Band numbers (1..4 coloured) the box overlaps, as a bit mask (bit b = band b). */
export type EmbeddedMask = number;

/** Cells i with i < hi - eps and i + 1 > lo + eps, clamped to 0..size-1. */
function cellRange(lo: number, hi: number, size: number): readonly [number, number] {
  const first = Math.max(0, Math.floor(lo + SIM_EPSILON));
  const last = Math.min(size - 1, Math.ceil(hi - SIM_EPSILON) - 1);
  return [first, last];
}

/** `x` = feet centre, `y` = feet (bottom edge), sizes in tiles, as in `PlayerState`. */
export function embeddedMask(level: Level, x: number, y: number, widthTiles: number, heightTiles: number): EmbeddedMask {
  const [c0, c1] = cellRange(x - widthTiles / 2, x + widthTiles / 2, level.width);
  const [r0, r1] = cellRange(y - heightTiles, y, level.height);
  let mask = 0;
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const tile = level.tiles[row * level.width + col];
      if (tile?.kind === 'colored') mask |= 1 << tile.band;
    }
  }
  return mask;
}

export function isEmbedded(mask: EmbeddedMask, band: number): boolean {
  return (mask & (1 << band)) !== 0;
}
