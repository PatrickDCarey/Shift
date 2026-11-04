/**
 * Simulation state and events. Owner: tech-lead. Import via `src/core/types`.
 */
import type { Band, ColoredBand, Facing, Gear, MoveDir } from './bands';
import type { InputFrame } from './input';

/**
 * Which body a player state or event belongs to (Tandem, features/tandem.md):
 * 0 = the runner (spawn `@`, `SimState.player`), 1 = the twin (spawn `&`,
 * `SimState.twin`). Per-body phases run body 0 first, so events of body 0
 * always precede those of body 1 within a step.
 */
export type BodyId = 0 | 1;

export const RUNNER: BodyId = 0;
export const TWIN: BodyId = 1;

/**
 * One body's state (the runner's or the twin's). Everything here is reset on
 * respawn/restart (GDD §4.12). Position is the BOTTOM-CENTRE of the box (the
 * feet), tiles. Shared input state (`prevInput`, `dirPriority`) lives on
 * `SimState`, not here.
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
  /**
   * Direction d used by this body's latest step (0 = none held, or tied).
   * Skid = d opposite sign(vx). d is shared by both bodies; a home body keeps
   * the value from its home step.
   */
  readonly moveDir: MoveDir;
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
  /**
   * Reached an exit (phase 14). A home body is frozen: phases 2-13 skip it,
   * it emits no events and is never checked for death. False at spawn.
   */
  readonly home: boolean;
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
 * Every event about one body carries `body`; `won` and `restart` are run-level.
 */
export type SimEvent =
  /** Selected gear changed on the ground (press or buffered presses on landing). */
  | { readonly type: 'shift'; readonly body: BodyId; readonly from: Gear; readonly to: Gear }
  /**
   * A shift press was stored in the air buffer. `net` is the running buffer
   * total AFTER this press (`player.shiftBufferNet`), unclamped and possibly 0
   * (`+` then `-`). The clamped result arrives as `shift` on landing; a buffer
   * that expires is cleared silently, so HUDs read the state, not events.
   */
  | { readonly type: 'shiftBuffered'; readonly body: BodyId; readonly net: number }
  | { readonly type: 'bandChange'; readonly body: BodyId; readonly from: Band; readonly to: Band }
  /** Stepwise air drag dropped one band ("clunk" + flash). */
  | { readonly type: 'airDrag'; readonly body: BodyId; readonly from: Band; readonly to: Band }
  | { readonly type: 'jump'; readonly body: BodyId; readonly coyote: boolean; readonly buffered: boolean }
  | { readonly type: 'land'; readonly body: BodyId }
  /**
   * Horizontal movement blocked by a wall the box was not already touching:
   * fires once per contact (blocked AND (vx at step start != 0 OR the box
   * moved this step)), never again while the player keeps pushing into the
   * same wall. `speed` = |vx| before the stop, tiles/s (architecture.md §3.2).
   */
  | { readonly type: 'wallStop'; readonly body: BodyId; readonly speed: number }
  | { readonly type: 'ceiling'; readonly body: BodyId }
  /** Grace started: `band` tiles hold the player from above for colorGraceSteps. */
  | { readonly type: 'graceStart'; readonly body: BodyId; readonly band: ColoredBand }
  /**
   * This body overlapped an exit and is now home (phase 14, before `won`).
   * Only in levels with a twin: without one the win step emits `won` alone,
   * exactly as before Tandem.
   */
  | { readonly type: 'home'; readonly body: BodyId }
  /** Every body is home. Run-level. */
  | { readonly type: 'won' }
  /** A non-home body fell below the grid; the whole run dies. Both on one step: body 0. */
  | { readonly type: 'died'; readonly body: BodyId }
  | { readonly type: 'restart' };

/** Events that belong to one body (everything except `won` and `restart`). */
export type BodyEvent = Extract<SimEvent, { readonly body: BodyId }>;

/**
 * Whole simulation state. Immutable: `step()` returns a new object.
 * Same Level + SimParams + input frames => identical SimState, always.
 */
export interface SimState {
  /**
   * Playing steps of the current run (0 at spawn and on the respawn step). The
   * run time for leaderboards. Frozen on dead, restart and won steps
   * (architecture.md §3.4); not the number of recorded frames.
   */
  readonly step: number;
  readonly status: SimStatus;
  /** Run step on which the last body got home, i.e. the run was won (null until won). */
  readonly wonAtStep: number | null;
  /** While dead/restarting: frozen steps left before the respawn step (0 = respawn next step). */
  readonly respawnInSteps: number;
  /** Body 0, the runner (spawn `@`). */
  readonly player: PlayerState;
  /** Body 1, the twin (spawn `&`), or null when the level has no `&` (then the sim behaves exactly as before Tandem). */
  readonly twin: PlayerState | null;
  /** Input of the previous step, for press edges. Shared by both bodies. Survives respawn (held keys are not new presses). */
  readonly prevInput: InputFrame;
  /**
   * Winner when both left and right are held: the more recently pressed one;
   * 0 if both were pressed on the same step (or none pressed since respawn).
   * Run-level: one direction d per step for both bodies (phase 3).
   */
  readonly dirPriority: MoveDir;
  /** Events produced by the most recent step only. */
  readonly events: readonly SimEvent[];
}
