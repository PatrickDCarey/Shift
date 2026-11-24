/**
 * Camera look-ahead (features/camera-lookahead.md): while one body is followed, the camera's x target
 * leads the runner by up to `cameraLookAheadTiles` in its direction of travel. Only the lead moves, at a
 * capped rate of one full lead per `cameraLookAheadEaseMs` (0 to full in that time, exact arrival, the same
 * under reduced motion); the body follow is untouched.
 * The lead resets to 0 at once on a respawn, post respawn, R or level load. Pure maths and a small
 * state holder; render only. Owner: gameplay-engineer [scene].
 */
import type { SimStatus, Tuning } from '../core/types';

export type LookAheadTuning = Pick<Tuning, 'cameraLookAheadTiles' | 'cameraLookAheadEaseMs' | 'colorBandEdges' | 'tileSize'>;

/** Where the lead is heading, px: signed, full at red speed (the red band's lower edge), linear below. */
export function leadTargetPx(vx: number, t: LookAheadTuning): number {
  const red = t.colorBandEdges[3];
  const share = Math.min(Math.abs(vx) / red, 1);
  return Math.sign(vx) * share * t.cameraLookAheadTiles * t.tileSize;
}

/** Move `current` toward `target` by at most `maxStep`, arriving exactly. */
export function slewToward(current: number, target: number, maxStep: number): number {
  const d = target - current;
  return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep;
}

export class LookAhead {
  private lead = 0;
  private lastStep = -1;
  private lastStatus: SimStatus | null = null;

  constructor(private readonly tuning: LookAheadTuning) {}

  /** Lead 0 at once (a teleport of the body: respawn, post respawn, R, load). */
  reset(): void {
    this.lead = 0;
  }

  /**
   * Slew the lead one frame and return it in whole pixels. A step counter that went backwards (R, a
   * respawn to step 0) or a run that came back from dead/restarting (post respawn) resets it first.
   */
  update(vx: number, status: SimStatus, step: number, deltaMs: number): number {
    const respawned = this.lastStatus !== null && this.lastStatus !== 'playing' && status === 'playing';
    if (respawned || step < this.lastStep) this.reset();
    this.lastStep = step;
    this.lastStatus = status;
    const { cameraLookAheadTiles: tiles, cameraLookAheadEaseMs: easeMs, tileSize } = this.tuning;
    const rate = easeMs <= 0 ? Infinity : (tiles * tileSize) / easeMs; // px per ms: a full lead per easeMs
    this.lead = slewToward(this.lead, leadTargetPx(vx, this.tuning), rate * Math.max(0, deltaMs));
    return Math.round(this.lead);
  }
}
