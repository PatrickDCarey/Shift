/**
 * Contracts between the three src/core lanes (architecture.md §3.5).
 * Owner: tech-lead. Each lane's `index.ts` may export ONLY the names listed in
 * `LANE_EXPORTS`, with exactly these signatures; tests/arch/lane-contracts.test.ts
 * enforces both. Lanes reach each other only through these entries:
 *   sim   -> motion  (imports src/core/motion, i.e. its index.ts)
 *   level -> nobody  (gets the sim injected as a `SimApi` argument)
 *   motion -> nobody
 * Change a signature here first (tech-lead), then in the lane.
 */
import type { Band, BandEdges, PerBand, PerSegment } from './bands';
import type { InputFrame, InputRun, Solution } from './input';
import type { Level } from './level';
import type { SimState } from './state';
import type { SimParams, Tuning } from './tuning';

// --- motion lane: src/core/motion (pure speed maths, no state, no collisions) ---

/** Band of a speed: count of edges <= speed + SIM_EPSILON. Speed = |vx|, tiles/s. */
export type BandForSpeedFn = (speed: number, edges: BandEdges) => Band;

/** accel[n] or brake[n] for n = 0..3: (v[n+1]^2 - v[n]^2) / (2 * tilesPerSegment), tiles/s^2. */
export type SegmentRatesFn = (gearSpeeds: PerBand<number>, tilesPerSegment: number) => PerSegment<number>;

/**
 * One grounded speed update (GDD §4.4-4.5, phase 4). `vx` is the velocity at
 * the start of the step, `targetVx` = d * gearSpeeds[gear], both tiles/s.
 * Returns the new vx: instant within the walking range, otherwise accel/brake
 * by the segment of the start speed, clamped at the target, skid then instant turn.
 */
export type GroundSpeedFn = (vx: number, targetVx: number, params: SimParams) => number;

export interface AirDragResult {
  /** New velocity, tiles/s (sign kept). */
  readonly vx: number;
  /** Counter after the drop (minus airDragTilesPerGear if one happened), tiles. */
  readonly airDistance: number;
  readonly dropped: boolean;
}

/**
 * Air drag (GDD §4.9, phase 9). `airDistance` already includes this step's
 * |dx|. Drops at most one band, judged by bandForSpeed(|vx|), never below
 * airDragMinBand; snaps |vx| to gearSpeeds[band - 1].
 */
export type AirDragFn = (vx: number, airDistance: number, params: SimParams) => AirDragResult;

export interface MotionApi {
  readonly bandForSpeed: BandForSpeedFn;
  readonly segmentRates: SegmentRatesFn;
  readonly groundSpeed: GroundSpeedFn;
  readonly airDrag: AirDragFn;
}

// --- sim lane: src/core/sim (state, step order, jump, collision, gating, reset, tuning loader) ---

/** Tuning -> SimParams (ms -> steps, derived gravity/jump/accel/brake). Validate with isTuning first. */
export type DeriveParamsFn = (tuning: Tuning) => SimParams;
/** Fresh-load state: player at the spawn, standing, startGear, facing right, step 0, prevInput empty. */
export type CreateSimFn = (level: Level, params: SimParams) => SimState;
/** One fixed step in the order of architecture.md §3.1. Pure. */
export type StepFn = (state: SimState, input: InputFrame, level: Level, params: SimParams) => SimState;

/** What the level lane needs from the sim; injected so the level lane never imports the sim. */
export interface SimApi {
  readonly createSim: CreateSimFn;
  readonly step: StepFn;
}

export interface SimLaneApi extends SimApi {
  readonly deriveParams: DeriveParamsFn;
}

// --- level lane: src/core/level (parser, input-log codec, replay, loader) ---

/** Result of parsing or checking; errors name file, row and column where they apply. */
export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Parses a level file (LF or CRLF). `fileStem` is the name without `.txt`; must equal `id`. */
export type ParseLevelFn = (text: string, fileStem: string) => ParseResult<Level>;
/** Parses a solution file (LF or CRLF). `fileStem` like "w1-01.solution", for messages. */
export type ParseSolutionFn = (text: string, fileStem: string) => ParseResult<Solution>;
/** Canonical solution text (header, `---`, merged run tokens, LF endings). */
export type FormatSolutionFn = (solution: Solution) => string;
/** Frames -> canonical runs (adjacent identical frames merged). */
export type EncodeRunsFn = (frames: readonly InputFrame[]) => readonly InputRun[];
/** Runs -> one frame per step. */
export type ExpandRunsFn = (runs: readonly InputRun[]) => readonly InputFrame[];

export interface InputLogRun {
  /** State after the last frame (equals the fresh state when there are no frames). */
  readonly final: SimState;
  /** states[i] = state after frames[i]; same length as the frames. */
  readonly states: readonly SimState[];
}

/** Replays frames from createSim(level, params) with the injected sim. Pure. */
export type RunInputLogFn = (sim: SimApi, level: Level, params: SimParams, frames: readonly InputFrame[]) => InputLogRun;

/** Replay test for one level: [] when it passes (version matches, status won, wonAtStep <= steps). */
export type VerifySolutionFn = (sim: SimApi, level: Level, params: SimParams, solution: Solution) => readonly string[];

/**
 * Parses every level from a { path: text } map (paths ending `<id>.txt`,
 * `*.solution.txt` ignored) and returns them sorted by world, then id.
 * The Vite `import.meta.glob` call lives render-side and passes the map in.
 */
export type LoadLevelsFn = (files: Readonly<Record<string, string>>) => ParseResult<readonly Level[]>;

export interface LevelLaneApi {
  readonly parseLevel: ParseLevelFn;
  readonly parseSolution: ParseSolutionFn;
  readonly formatSolution: FormatSolutionFn;
  readonly encodeRuns: EncodeRunsFn;
  readonly expandRuns: ExpandRunsFn;
  readonly runInputLog: RunInputLogFn;
  readonly verifySolution: VerifySolutionFn;
  readonly loadLevels: LoadLevelsFn;
}

/** Everything `src/core/index.ts` publishes besides the types. */
export type CoreApi = MotionApi & SimLaneApi & LevelLaneApi;

export type LaneName = 'sim' | 'motion' | 'level';

/** Runtime list of each lane's allowed exports (checked against the interfaces above). */
export const LANE_EXPORTS: {
  readonly sim: readonly (keyof SimLaneApi)[];
  readonly motion: readonly (keyof MotionApi)[];
  readonly level: readonly (keyof LevelLaneApi)[];
} = {
  sim: ['createSim', 'step', 'deriveParams'],
  motion: ['bandForSpeed', 'segmentRates', 'groundSpeed', 'airDrag'],
  level: [
    'parseLevel',
    'parseSolution',
    'formatSolution',
    'encodeRuns',
    'expandRuns',
    'runInputLog',
    'verifySolution',
    'loadLevels',
  ],
};

/** Allowed lane-to-lane imports (via the target lane's index.ts only). */
export const LANE_IMPORTS: Readonly<Record<LaneName, readonly LaneName[]>> = {
  sim: ['motion'],
  motion: [],
  level: [],
};
