/**
 * Checkpoint posts for long levels (Must for long levels, design ruling
 * 2026-11-24; spec docs/design/features/checkpoints.md; tech rules
 * docs/tech/architecture.md §3.7, format docs/tech/level-format.md §2
 * "Checkpoint headers", lane briefs docs/tech/expansion-approach.md §8).
 * Owner: tech-lead. Import via `src/core/types`.
 *
 * A level without `checkpoint:` lines has `Level.checkpoints` absent and its
 * states never carry `SimState.checkpoint`, so every shipped level steps,
 * replays and hashes exactly as before.
 *
 * ACTIVATION (phase 14, after home/won, before death). Single-body levels only
 * (the parser rejects `checkpoint:` with `&`). On a playing step, post i lights
 * when the runner's box at the end of the step strictly overlaps the post's
 * COLUMN span [col, col + 1) horizontally (|x - (col + 0.5)| < playerWidth / 2
 * + 0.5 - SIM_EPSILON), at any height, band, ground or air, AND i is greater
 * than the active index (or no post is active). Forward only: a lit post is
 * never replaced by an earlier one. If several qualify on one step, the
 * highest index wins. A post lit on the step the body dies is the one it
 * respawns at; an exit on that step still wins.
 *
 * TWO CLOCKS once a post is lit.
 * - Level clock = `SimState.step` (wonAtStep, best times, leaderboards). While
 *   `checkpoint` is present it advances on EVERY step except a restart press
 *   and won steps: playing, dead (freeze) and the respawn step. So the level
 *   time is every frame since the last full restart, deaths included.
 * - Kinetic clock k = step - checkpoint.kinBase (= step when absent), the `t`
 *   every mover, bolt and sweep function is evaluated at (sim lane
 *   `kineticStep`). Lighting a post keeps kinBase (0 for the first post, or the
 *   value set by the latest post respawn), so slabs and bolts never jump. On
 *   dead steps kinBase advances with step, so the freeze freezes kinetics as
 *   today.
 *
 * FULL RESTART: level load, a restart press (R or `!`), or a death while no
 * post is lit. Exactly today's respawn: `createSim` with `prevInput` kept, step
 * 0, `checkpoint` absent (every post unlit).
 *
 * POST RESPAWN: a death while post i is lit. After the usual deathFreezeSteps
 * freeze, the respawn step returns createSim's state with
 * - the runner at the post: feet x = col + 0.5, y = row + 1, standing, vx = vy
 *   = 0, gear startGear, band 0, facing right, every timer, buffer, grace and
 *   drag counter cleared, `home` false (identical to a spawn at that cell);
 * - prevInput = this step's input (held keys are not new presses), dirPriority
 *   0, status 'playing', wonAtStep null, respawnInSteps 0, events [];
 * - step = previous step + 1 (the level clock runs on);
 * - checkpoint = { index: i, kinBase: step - post.clock }, so k = post.clock
 *   on the respawn step: the room after a post replays in the same phase on
 *   every life, and with the default clock 0 every bolt lane is empty and
 *   every slab is at its origin, exactly as at the spawn.
 *
 * POST LIT SIGNAL. No new SimEvent (src/audio's event switch is exhaustive).
 * Render and audio derive it: a post was lit on this step iff
 * `next.checkpoint !== undefined && next.checkpoint.index !== prev.checkpoint?.index`.
 * A post respawn keeps the index (no cue); a full restart removes the field.
 *
 * RECORDINGS. A shipped solution for a level with posts is a deathless run
 * from load with no restart (wonAtStep === steps). Replay and verifySolution
 * are unchanged; a player's recording (every frame since load) replays through
 * post respawns because the sim is deterministic.
 */
import type { TilePos } from './level';

/** One `checkpoint:` header line (level-format.md §2 "Checkpoint headers"). */
export interface Checkpoint {
  /** The post's cell: `.` in the file, a safe `#` directly below. The body respawns standing in it. */
  readonly cell: TilePos;
  /**
   * Kinetic clock on the respawn step at this post, steps (the `clock=` key,
   * default 0). 0 <= clock <= MAX_CHECKPOINT_CLOCK.
   */
  readonly clock: number;
}

/** The lit post, present only once one has been lit since the last full restart. */
export interface CheckpointState {
  /** Index into `Level.checkpoints` (file order = left to right). */
  readonly index: number;
  /** Kinetic clock k = SimState.step - kinBase. */
  readonly kinBase: number;
}

/** At most this many `checkpoint:` lines per level. */
export const MAX_CHECKPOINTS = 4;
/** A post's column is at least this many columns right of the `@` column. */
export const CHECKPOINT_MIN_FROM_START = 20;
/** Consecutive posts are at least this many columns apart (strictly increasing columns). */
export const CHECKPOINT_MIN_SPACING = 40;
/** Upper bound of the `clock=` key, steps (10 minutes, as the backend's run cap). */
export const MAX_CHECKPOINT_CLOCK = 36_000;
