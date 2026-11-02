/**
 * Simulation state and events. Owner: tech-lead. Import via `src/core/types`.
 */
import type { Band, ColoredBand, Facing, Gear, MoveDir } from './bands';
import type { InputFrame } from './input';

/**
 * Player state. Everything here is reset on respawn/restart (GDD §4.12).
 * Position is the BOTTOM-CENTRE of the box (the feet), tiles.
 */
export interface PlayerState {
  /** Feet centre x, tiles. */
  readonly x: number;
  /** Feet y (bottom edge of the box), tiles; y grows down. */
  readonly y: number;
  /** Leg velocity, tiles/s, sign = direction. Speed = |vx| sets the band. */
  readonly vx: number;
  /** Vertical velocity, tiles/s, positive = falling. Never affects the band. */
  readonly vy: number;
  /** Selected cruise gear 1..4. Ground target speed = d * gearSpeeds[gear]. */
  readonly gear: Gear;
  /** Band of |vx| after the latest step: the player's colour. */
  readonly band: Band;
  readonly facing: Facing;
  /** Direction d used by the latest step (0 = none held, or tied). Skid = d opposite sign(vx). */
  readonly moveDir: MoveDir;
  /**
   * Winner when both left and right are held: the more recently pressed one;
   * 0 if both were pressed on the same step (or none pressed since respawn).
   */
  readonly dirPriority: MoveDir;
  /** Supported at the end of the latest step. */
  readonly grounded: boolean;
  /** Coyote steps left; > 0 lets an airborne player jump. */
  readonly coyoteSteps: number;
  /** Buffered-jump steps left; > 0 fires a jump once grounded. */
  readonly jumpBufferSteps: number;
  /** Shift-buffer steps left; 0 = buffer empty (shiftBufferNet then 0). */
  readonly shiftBufferSteps: number;
  /** Net buffered shift presses from the air (+up, -down), applied clamped on landing. */
  readonly shiftBufferNet: number;
  /** Grace steps left; > 0 makes `graceBand` tiles floor-solid from above. */
  readonly graceSteps: number;
  /** Previous colour held by grace, or null when no grace is active. */
  readonly graceBand: ColoredBand | null;
  /** Air-drag accumulator: |dx| flown since leaving the ground, tiles (minus 6 per drop). */
  readonly airDistance: number;
}

/**
 * playing: normal. dead: fell out; frozen until respawn. restarting: restart
 * pressed; respawns on the next step. won: terminal, step() changes nothing.
 */
export type SimStatus = 'playing' | 'dead' | 'restarting' | 'won';

/**
 * What happened during one step, in step order, for audio/fx/HUD to react to
 * without diffing state. Informational only: never read back by the sim.
 * Respawn has no event: watch `status` go from dead/restarting to playing.
 */
export type SimEvent =
  /** Selected gear changed on the ground (press or buffered presses on landing). */
  | { readonly type: 'shift'; readonly from: Gear; readonly to: Gear }
  /** A shift press was stored in the air buffer. */
  | { readonly type: 'shiftBuffered'; readonly net: number }
  | { readonly type: 'bandChange'; readonly from: Band; readonly to: Band }
  /** Stepwise air drag dropped one band ("clunk" + flash). */
  | { readonly type: 'airDrag'; readonly from: Band; readonly to: Band }
  | { readonly type: 'jump'; readonly coyote: boolean; readonly buffered: boolean }
  | { readonly type: 'land' }
  /** Horizontal movement blocked; `speed` = |vx| before the stop, tiles/s. */
  | { readonly type: 'wallStop'; readonly speed: number }
  | { readonly type: 'ceiling' }
  /** Grace started: `band` tiles hold the player from above for colorGraceSteps. */
  | { readonly type: 'graceStart'; readonly band: ColoredBand }
  | { readonly type: 'won' }
  | { readonly type: 'died' }
  | { readonly type: 'restart' };

/**
 * Whole simulation state. Immutable: `step()` returns a new object.
 * Same Level + SimParams + input frames => identical SimState, always.
 */
export interface SimState {
  /** Steps simulated in the current run (0 at spawn). The run time for leaderboards. */
  readonly step: number;
  readonly status: SimStatus;
  /** Run step on which the exit was reached (null until won). */
  readonly wonAtStep: number | null;
  /** While dead/restarting: frozen steps left before the respawn step (0 = respawn next step). */
  readonly respawnInSteps: number;
  readonly player: PlayerState;
  /** Input of the previous step, for press edges. Survives respawn (held keys are not new presses). */
  readonly prevInput: InputFrame;
  /** Events produced by the most recent step only. */
  readonly events: readonly SimEvent[];
}
