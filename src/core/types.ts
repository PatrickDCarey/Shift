/**
 * Shared types and contracts for the Redshift deterministic simulation
 * (GDD v1.1, hold-to-move). The single import point for every team:
 * `import type { SimState } from '../core/types'`. Definitions live in
 * src/core/contracts/*.ts, split only to keep files small.
 *
 * Owner: tech-lead (this file and src/core/contracts/**). Request changes via
 * docs/production/requests.md. Spec: docs/tech/architecture.md (step order,
 * timer conventions, lanes) and docs/tech/level-format.md.
 *
 * UNITS (apply everywhere in src/core unless a name says otherwise)
 * - Distance: tiles. Pixels (`tileSize`) exist only in the renderer.
 * - Time: steps. 1 step = 1 / `stepHz` s (60 Hz). Timers are integer step
 *   counts. Milliseconds appear only in `Tuning` and become steps once, in
 *   `SimParams`.
 * - Speed: tiles/second, in `Tuning`, `SimParams` AND `PlayerState`, so snapped
 *   speeds are exact (vx is exactly 3 or 12, as the acceptance tests demand).
 *   Movement per step is `speed * dt` with `dt = 1 / stepHz`.
 * - Coordinates: x grows right, y grows DOWN (grid rows, Phaser screen space).
 *   Tile (col, row) covers [col, col+1) x [row, row+1). "Up" in the GDD is -y.
 *
 * Everything here stays free of Phaser, DOM, randomness and wall-clock time.
 */
export * from './contracts/bands';
export * from './contracts/tuning';
export * from './contracts/input';
export * from './contracts/level';
export * from './contracts/kinetics';
export * from './contracts/checkpoints';
export * from './contracts/state';
export * from './contracts/lanes';
export * from './contracts/leaderboard';
