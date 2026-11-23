/**
 * Tuning (raw JSON, owned by design-lead), its runtime schema, and SimParams
 * (derived). Owner: tech-lead. Import via `src/core/types`.
 */
import { BANDS, GEARS, type Band, type BandEdges, type Gear, type PerBand, type PerSegment } from './bands';

/**
 * Exact shape of src/data/tuning.json. Units as authored (tiles, tiles/s, ms).
 * Every key must exist in both places: `TUNING_SCHEMA` below is type-checked
 * against this interface and tests/arch/tuning-schema.test.ts checks the JSON.
 */
export interface Tuning {
  /** Simulation steps per second (integer). */
  readonly stepHz: number;
  /** Pixels per tile. Render only. */
  readonly tileSize: number;
  /** Cruise speed per band/gear, tiles/s. [0] = 0 (standing), strictly increasing. */
  readonly gearSpeeds: PerBand<number>;
  /** Lowest selectable gear. */
  readonly minGear: Gear;
  /** Gear at spawn, respawn and restart. */
  readonly startGear: Gear;
  /** On the ground, speeds 0..gearSpeeds[instantMaxGear] change instantly. */
  readonly instantMaxGear: Gear;
  /** Ground distance to accelerate across one segment above walking pace, tiles. */
  readonly tilesPerGearChange: number;
  /** Ground distance to brake across one segment (let go, downshift, skid), tiles. */
  readonly brakeTilesPerGearChange: number;
  /** Speeds where the band changes, tiles/s; band = number of edges <= speed. */
  readonly colorBandEdges: BandEdges;
  /** Horizontal flight distance that costs one band, tiles. */
  readonly airDragTilesPerGear: number;
  /** Air drag never lowers the band below this. */
  readonly airDragMinBand: Band;
  /** Jump apex height (feet), tiles. */
  readonly jumpHeightTiles: number;
  /** Takeoff to apex, ms. Sets gravity (2h/t^2) and launch speed (2h/t). */
  readonly jumpTimeToApexMs: number;
  /** Terminal falling speed, tiles/s. */
  readonly maxFallSpeed: number;
  /** Jump still allowed after leaving the ground without jumping, ms. */
  readonly coyoteMs: number;
  /** A jump pressed this long before landing still fires, ms. */
  readonly jumpBufferMs: number;
  /** A shift pressed in the air this long before landing applies on landing, ms. */
  readonly shiftBufferMs: number;
  /** Previous-colour floor holds the player this long after a band change, ms. */
  readonly colorGraceMs: number;
  /** Collision box width, tiles. */
  readonly playerWidthTiles: number;
  /** Collision box height, tiles. */
  readonly playerHeightTiles: number;
  /** Freeze between falling out and respawning, ms. */
  readonly deathFreezeMs: number;
  /** Render only: run animation advances one frame per 1/this tile at run pace (integer 1..12). */
  readonly runFramesPerTile: number;
  /** Render only: same at sprint pace (integer 1..12). */
  readonly sprintFramesPerTile: number;
  /** Render only: Tandem camera keeps both bodies on screen up to this many tiles apart (integer 1..256). */
  readonly cameraMaxApartTiles: number;
  /**
   * Side of a bolt's square hit box, tiles (0.5 = 8 x 8 px, the bolt sprite's
   * size). Sim: centred on the shot (contracts/kinetics.ts `Shot`). projectiles.md.
   */
  readonly projectileSizeTiles: number;
  /**
   * Render only: an emitter glows this long before each shot, ms (300 = 18
   * steps). The sim never reads it; shot timing is the `Emitter` header alone.
   */
  readonly emitterTellMs: number;
}

/** Runtime check applied to one tuning value. */
export type TuningFieldKind =
  | 'positiveInteger' // integer > 0
  | 'positiveNumber' // finite > 0
  | 'framesPerTile' // integer in 1..12 (render animation rate)
  | 'tileCount' // integer in 1..256 (render distance in whole tiles)
  | 'ms' // finite >= 0, converted with round(ms * stepHz / 1000)
  | 'gear' // integer in GEARS
  | 'band' // integer in BANDS
  | 'gearSpeeds' // 5 finite numbers, [0] = 0, strictly increasing
  | 'bandEdges'; // 4 finite numbers > 0, strictly increasing

/** The kinds allowed for a field of TS type T (keeps the schema honest at compile time). */
type KindFor<T> = [T] extends [PerBand<number>]
  ? 'gearSpeeds'
  : [T] extends [readonly number[]]
    ? 'bandEdges'
    : [T] extends [Gear]
      ? 'gear'
      : [T] extends [Band]
        ? 'band'
        : 'positiveInteger' | 'positiveNumber' | 'ms' | 'framesPerTile' | 'tileCount';

/** One entry per `Tuning` key, no more, no fewer (enforced by the mapped type). */
export const TUNING_SCHEMA: { readonly [K in keyof Tuning]-?: KindFor<Tuning[K]> } = {
  stepHz: 'positiveInteger',
  tileSize: 'positiveInteger',
  gearSpeeds: 'gearSpeeds',
  minGear: 'gear',
  startGear: 'gear',
  instantMaxGear: 'gear',
  tilesPerGearChange: 'positiveNumber',
  brakeTilesPerGearChange: 'positiveNumber',
  colorBandEdges: 'bandEdges',
  airDragTilesPerGear: 'positiveNumber',
  airDragMinBand: 'band',
  jumpHeightTiles: 'positiveNumber',
  jumpTimeToApexMs: 'ms',
  maxFallSpeed: 'positiveNumber',
  coyoteMs: 'ms',
  jumpBufferMs: 'ms',
  shiftBufferMs: 'ms',
  colorGraceMs: 'ms',
  playerWidthTiles: 'positiveNumber',
  playerHeightTiles: 'positiveNumber',
  deathFreezeMs: 'ms',
  runFramesPerTile: 'framesPerTile',
  sprintFramesPerTile: 'framesPerTile',
  cameraMaxApartTiles: 'tileCount',
  projectileSizeTiles: 'positiveNumber',
  emitterTellMs: 'ms',
};

const MAX_FRAMES_PER_TILE = 12;
const MAX_TILE_COUNT = 256;

const isIntegerIn = (v: unknown, min: number, max: number): boolean =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isIncreasingList = (v: unknown, length: number): v is number[] =>
  Array.isArray(v) &&
  v.length === length &&
  v.every(isFiniteNumber) &&
  v.every((x: number, i: number) => i === 0 || x > (v[i - 1] as number));

const FIELD_CHECKS: Readonly<Record<TuningFieldKind, (v: unknown) => boolean>> = {
  positiveInteger: (v) => Number.isInteger(v) && (v as number) > 0,
  positiveNumber: (v) => isFiniteNumber(v) && v > 0,
  framesPerTile: (v) => isIntegerIn(v, 1, MAX_FRAMES_PER_TILE),
  tileCount: (v) => isIntegerIn(v, 1, MAX_TILE_COUNT),
  ms: (v) => isFiniteNumber(v) && v >= 0,
  gear: (v) => GEARS.includes(v as Gear),
  band: (v) => BANDS.includes(v as Band),
  gearSpeeds: (v) => isIncreasingList(v, 5) && v[0] === 0,
  bandEdges: (v) => isIncreasingList(v, 4) && (v[0] as number) > 0,
};

/**
 * Validates raw tuning JSON against `TUNING_SCHEMA`. Returns one message per
 * problem (missing key, unknown key, bad value); empty means valid.
 */
export function tuningErrors(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return ['tuning: expected a JSON object'];
  }
  const record = raw as Record<string, unknown>;
  const schema = TUNING_SCHEMA as Readonly<Record<string, TuningFieldKind>>;
  const expected = Object.keys(schema);
  const missing = expected.filter((k) => !Object.hasOwn(record, k)).map((k) => `tuning: missing key "${k}"`);
  const unknown = Object.keys(record)
    .filter((k) => !Object.hasOwn(schema, k))
    .map((k) => `tuning: unknown key "${k}"`);
  const invalid = expected
    .filter((k) => Object.hasOwn(record, k) && !FIELD_CHECKS[schema[k] as TuningFieldKind](record[k]))
    .map((k) => `tuning.${k}: expected ${schema[k]}, got ${JSON.stringify(record[k])}`);
  return [...missing, ...unknown, ...invalid];
}

/** Type guard over `tuningErrors`. Loaders should report the errors when it fails. */
export function isTuning(raw: unknown): raw is Tuning {
  return tuningErrors(raw).length === 0;
}

/**
 * Constants derived from `Tuning` once per load by `deriveParams` (sim lane).
 * Speeds tiles/s, accelerations tiles/s^2, times in whole steps
 * (`round(ms * stepHz / 1000)`), distances tiles.
 */
export interface SimParams {
  readonly stepHz: number;
  /** Seconds per step, 1 / stepHz. */
  readonly dt: number;
  readonly gearSpeeds: PerBand<number>;
  readonly minGear: Gear;
  readonly startGear: Gear;
  readonly instantMaxGear: Gear;
  /**
   * accel[n] = (v[n+1]^2 - v[n]^2) / (2 * tilesPerGearChange), tiles/s^2.
   * Segments below instantMaxGear are computed but unused (instant range).
   */
  readonly accel: PerSegment<number>;
  /** brake[n], same formula with brakeTilesPerGearChange, tiles/s^2. */
  readonly brake: PerSegment<number>;
  readonly colorBandEdges: BandEdges;
  readonly airDragTilesPerGear: number;
  readonly airDragMinBand: Band;
  /** Downward acceleration 2h/t^2, tiles/s^2 (positive = down). */
  readonly gravity: number;
  /** Launch speed 2h/t, tiles/s (positive magnitude; applied as vy = -jumpSpeed). */
  readonly jumpSpeed: number;
  readonly maxFallSpeed: number;
  readonly coyoteSteps: number;
  readonly jumpBufferSteps: number;
  readonly shiftBufferSteps: number;
  readonly colorGraceSteps: number;
  readonly deathFreezeSteps: number;
  readonly playerWidth: number;
  readonly playerHeight: number;
  /**
   * Bolt hit box side, tiles = tuning.projectileSizeTiles (square, centred on
   * the shot). `deriveParams` and `paramsForTests` both map it; required since
   * the batch 11 checkpoint review. (`emitterTellMs` is render only: not here.)
   */
  readonly projectileSize: number;
}
