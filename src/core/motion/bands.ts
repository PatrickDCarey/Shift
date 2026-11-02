import { SIM_EPSILON, type Band, type BandEdges } from '../types';

/**
 * Colour band of a speed (GDD §4.6): the number of edges <= speed, with
 * SIM_EPSILON so an accumulated speed a hair under an edge counts as on it.
 * Exactly on an edge belongs to the higher band; no hysteresis.
 */
export function bandForSpeed(speed: number, edges: BandEdges): Band {
  let band = 0;
  for (const edge of edges) {
    if (edge <= speed + SIM_EPSILON) band += 1;
  }
  return band as Band;
}
