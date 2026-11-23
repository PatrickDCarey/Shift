/**
 * The value threaded through the phases of one step (architecture.md §3.1).
 * Every phase is a pure function (Work, StepCtx) -> Work; nothing is mutated.
 */
import {
  MAX_GEAR,
  type Band,
  type BodyId,
  type Gear,
  type InputFrame,
  type Level,
  type MoveDir,
  type PlayerState,
  type SimEvent,
  type SimParams,
} from '../types';

/** Read-only facts about the step, fixed before phase 2. */
export interface StepCtx {
  /** Which body this per-body pass is for (0 runner, 1 twin). */
  readonly body: BodyId;
  readonly input: InputFrame;
  /** Press edges: held now and not held in prevInput. */
  readonly pressed: InputFrame;
  readonly level: Level;
  readonly params: SimParams;
  /** `player.grounded` from the previous step. */
  readonly startGrounded: boolean;
  /** Band at the start of the step: decides collisions in phases 7-8. */
  readonly startBand: Band;
  /** Run step at the start of this step (SimState.step): the clock for movers. */
  readonly t: number;
  /** Phase 3, computed once per step for every body: the run-level priority after this step's presses. */
  readonly dirPriority: MoveDir;
  /** Phase 3: the shared direction d. */
  readonly moveDir: MoveDir;
}

export interface Work {
  readonly player: PlayerState;
  readonly events: readonly SimEvent[];
  /** vx at the start of the step (before phase 4), for the trapezoid move. */
  readonly vxOld: number;
  /** A jump launched this step (phase 5). */
  readonly jumped: boolean;
  /** Vertical displacement from phase 6, tiles. */
  readonly dy: number;
  /** Horizontal distance actually moved in phase 7, tiles (signed). */
  readonly dxMoved: number;
}

export type Phase = (w: Work, ctx: StepCtx) => Work;

export const withPlayer = (w: Work, patch: Partial<PlayerState>): Work => ({
  ...w,
  player: { ...w.player, ...patch },
});

export const emit = (w: Work, event: SimEvent): Work => ({ ...w, events: [...w.events, event] });

/** "In the air this step" = not (grounded at start and at end), architecture.md §3.2. */
export const inAirThisStep = (w: Work, ctx: StepCtx): boolean => !(ctx.startGrounded && w.player.grounded);

export const clampGear = (gear: number, params: SimParams): Gear =>
  Math.max(params.minGear, Math.min(MAX_GEAR, gear)) as Gear;
