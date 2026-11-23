/**
 * Kinetic level pieces (expansion, GDD v1.12 §4.16-4.18): movers (slabs),
 * emitters (bolts) and the sweep. Owner: tech-lead. Import via `src/core/types`.
 * Specs: docs/design/features/moving-objects.md, projectiles.md, sweep.md;
 * format: docs/tech/level-format.md §2 "Kinetic headers"; step order:
 * docs/tech/architecture.md §3.1 and §3.6.
 *
 * THE CLOCK. Every position here is a pure function of the run step
 * `t = SimState.step` (0 at spawn and again on every respawn step, frozen on
 * dead, restarting and won steps). Nothing kinetic is stored in `SimState`.
 * Inside `step()` the sim evaluates pieces at `t` (start of step) and at
 * `t + 1` (end of step = the returned state's `step`). The renderer evaluates
 * the same functions at `prev.step` and `state.step` and blends with alpha.
 *
 * EXACT ARITHMETIC. Speeds are `KinSpeed / KIN_SPEED_UNIT` tiles per step, so
 * a whole-tile leg takes `tiles * KIN_SPEED_UNIT / speed` steps (an integer)
 * and every offset is a multiple of 1/32 tile (exact in binary). Lanes use
 * integer modulo on the clock and multiply once; no trig, no easing, no
 * accumulated floats.
 */
import type { Band, ColoredBand } from './bands';
import type { TilePos } from './level';

/** A kinetic speed n moves n / KIN_SPEED_UNIT tiles per step. */
export const KIN_SPEED_UNIT = 32;

/** 32nds of a tile per step: 1.875, 3.75, 7.5 or 15 tiles/s. Each divides KIN_SPEED_UNIT. */
export type KinSpeed = 1 | 2 | 4 | 8;
export const KIN_SPEEDS: readonly KinSpeed[] = [1, 2, 4, 8];

/** Direction letter as written in the level file. l = -x, r = +x, u = -y, d = +y (y grows down). */
export type KinDir = 'l' | 'r' | 'u' | 'd';
export const KIN_DIRS: readonly KinDir[] = ['l', 'r', 'u', 'd'];

/** Tile offset (dx, dy) or tile position, y down. Exact multiples of 1/32 for kinetic results. */
export interface TileVec {
  readonly x: number;
  readonly y: number;
}

// --- movers ---------------------------------------------------------------

/**
 * One token of a mover path. `move`: `tiles` whole tiles along `dir` at the
 * mover's speed, taking `tiles * KIN_SPEED_UNIT / speed` steps. `wait`: hold
 * still for `steps` steps.
 */
export type PathStep =
  | { readonly kind: 'move'; readonly dir: KinDir; readonly tiles: number }
  | { readonly kind: 'wait'; readonly steps: number };

/** `safe` holds every band (grey). `colored` holds a body exactly like a coloured floor tile of that band. */
export type MoverSolid = { readonly kind: 'safe' } | { readonly kind: 'colored'; readonly band: ColoredBand };

/**
 * A slab looping on the run clock. TOP-ONLY (design ruling 2026-11-23): its top
 * face is a floor; it has no side or bottom faces, never pushes, never crushes,
 * never kills and takes no part in no-embed. Solid-for-a-body follows the floor
 * rules of coloured tiles: safe always; coloured when the body's band at the
 * start of the step equals `band`, or `band` is the body's active grace colour.
 */
export interface Mover {
  /** Top-left cell at path time 0 (u = 0). Its cells are `.` in the grid. */
  readonly origin: TilePos;
  /** Whole tiles, 1..MAX_MOVER_WIDTH (levels use 2-8). */
  readonly width: number;
  /** Always 1 in this format version (top-only slab). */
  readonly height: 1;
  readonly solid: MoverSolid;
  /**
   * Closed loop, 1..MAX_PATH_STEPS tokens, at least one `move`, net
   * displacement 0. Path time u runs 0..cycle-1 through the tokens in order.
   */
  readonly path: readonly PathStep[];
  readonly speed: KinSpeed;
  /** 0 <= phase < cycle. Path time u = (t + phase) mod cycle. */
  readonly phase: number;
}

export const MAX_MOVERS = 16;
export const MAX_MOVER_WIDTH = 16;
export const MAX_PATH_STEPS = 32;
/** Largest n in a move token (`r256`). */
export const MAX_MOVE_TILES = 256;
/** Largest n in a wait token (`w3600`, 60 s). */
export const MAX_WAIT_STEPS = 3600;

// --- emitters -------------------------------------------------------------

/**
 * An emitter firing bolts in a straight line. A shot leaves on every run step
 * s >= 0 with (s + phase) mod period = 0, centred on the cell's centre
 * (col + 0.5, row + 0.5), and moves speed / KIN_SPEED_UNIT tiles per step along
 * `dir`. It is alive at run step t while 0 <= t - s < life, where
 * life = range * KIN_SPEED_UNIT / speed (an integer). No shot with s < 0 ever
 * exists, so every run (and every respawn) starts with no bolt past the muzzle;
 * with phase 0 the s = 0 shot sits at the muzzle at t = 0.
 * Shots ignore tiles, slabs, exits, other shots and bodies they cannot hit.
 */
export interface Emitter {
  /** The emitter's cell, `.` in the grid. */
  readonly cell: TilePos;
  readonly dir: KinDir;
  /** Whole tiles from the cell's centre to the end of the lane, 1..MAX_EMITTER_RANGE. */
  readonly range: number;
  readonly speed: KinSpeed;
  /** Steps between shots, 1..MAX_EMITTER_PERIOD (levels use >= 12). */
  readonly period: number;
  /** 0 <= phase < period. */
  readonly phase: number;
  /**
   * Which bodies a shot can hit, judged on the body's band at the START of the
   * step: null = grey, hits every band; 0 = white (`W`), hits band 0 only;
   * 1..4 = that band only. Rule: `band === null || band === bodyBandAtStart`.
   */
  readonly band: Band | null;
}

/** One live shot. `firedAt` (= s) identifies it across steps for sprite pooling and interpolation. */
export interface Shot {
  /** Centre, tiles. */
  readonly x: number;
  readonly y: number;
  /** Run step the shot left the muzzle. */
  readonly firedAt: number;
}

export const MAX_EMITTERS = 16;
export const MAX_EMITTER_RANGE = 256;
export const MAX_EMITTER_PERIOD = 3600;

// --- sweep (Should) -------------------------------------------------------

/**
 * A full-height front moving right (features/sweep.md). Front x at run step t:
 * min(width, x0 + speed / KIN_SPEED_UNIT * max(0, t - delay)). A non-home body
 * is caught when front >= its x (feet centre) at t + 1.
 */
export interface Sweep {
  /** Integer tiles, MIN_SWEEP_X0..level width (may start off-grid left). */
  readonly x0: number;
  readonly speed: KinSpeed;
  /** Steps before it moves, 0..MAX_SWEEP_DELAY. */
  readonly delay: number;
}

export const MIN_SWEEP_X0 = -64;
export const MAX_SWEEP_DELAY = 36000;
