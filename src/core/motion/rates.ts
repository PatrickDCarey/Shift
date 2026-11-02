import type { PerBand, PerSegment } from '../types';

/**
 * Constant rate per speed segment n = 0..3 (gearSpeeds[n] .. gearSpeeds[n+1])
 * so that crossing the whole segment takes exactly `tilesPerSegment` of
 * ground: (v[n+1]^2 - v[n]^2) / (2 * tilesPerSegment), tiles/s^2 (GDD §4.4).
 * Used for both accel (tilesPerGearChange) and brake (brakeTilesPerGearChange).
 */
export function segmentRates(gearSpeeds: PerBand<number>, tilesPerSegment: number): PerSegment<number> {
  const [v0, v1, v2, v3, v4] = gearSpeeds;
  const rate = (lo: number, hi: number): number => (hi * hi - lo * lo) / (2 * tilesPerSegment);
  return [rate(v0, v1), rate(v1, v2), rate(v2, v3), rate(v3, v4)];
}
