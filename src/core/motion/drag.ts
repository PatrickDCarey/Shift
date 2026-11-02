import { SIM_EPSILON, type AirDragResult, type Band, type SimParams } from '../types';
import { bandForSpeed } from './bands';

/**
 * Stepwise air drag (GDD §4.9, step phase 9). `airDistance` already includes
 * this step's |dx|. Once it reaches airDragTilesPerGear (with SIM_EPSILON),
 * and the band of |vx| is above airDragMinBand, |vx| snaps to
 * gearSpeeds[band - 1] (sign kept) and the counter loses one threshold.
 * At most one drop per call; below the floor the counter is left as is.
 */
export function airDrag(vx: number, airDistance: number, params: SimParams): AirDragResult {
  const band = bandForSpeed(Math.abs(vx), params.colorBandEdges);
  const reached = airDistance + SIM_EPSILON >= params.airDragTilesPerGear;
  if (!reached || band <= params.airDragMinBand) return { vx, airDistance, dropped: false };
  const speed = params.gearSpeeds[(band - 1) as Band];
  return {
    vx: speed === 0 ? 0 : Math.sign(vx) * speed,
    airDistance: airDistance - params.airDragTilesPerGear,
    dropped: true,
  };
}
