/**
 * Shared types for the Redshift deterministic simulation.
 *
 * Owner: tech-lead. Other teams import from here; request changes via
 * docs/production/requests.md. Spec: docs/tech/architecture.md and
 * docs/tech/level-format.md.
 *
 * UNITS (apply everywhere in src/core unless a name says otherwise)
 * - Distance: tiles. 1 tile = `tileSize` pixels, but pixels exist only in the
 *   renderer. The sim never sees pixels.
 * - Time: steps. 1 step = 1 / `stepHz` seconds (60 Hz => ~16.67 ms). Timers are
 *   integer step counts. Milliseconds only appear in `Tuning`, which is
 *   converted to steps once, when `SimParams` is derived.
 * - Speed: tiles per step inside the sim (`SimParams`, `PlayerState`);
 *   tiles per second only in `Tuning`.
 * - Coordinates: x grows right, y grows DOWN (matches the level grid rows and
 *   Phaser's screen space). Tile (col, row) covers [col, col+1) x [row, row+1).
 *
 * This file must stay free of Phaser, DOM, Math.random and Date.
 */

// ---------------------------------------------------------------------------
// Gears and colour bands
// ---------------------------------------------------------------------------

/** Gear index. 0 = stopped (white) ... 4 = sprint (red). */
export type Gear = 0 | 1 | 2 | 3 | 4;

/** Gears that have coloured geometry. Gear 0 (white) is the always-solid safe colour. */
export type ColoredGear = Exclude<Gear, 0>;

export const GEARS: readonly Gear[] = [0, 1, 2, 3, 4];
export const MIN_GEAR: Gear = 0;
export const MAX_GEAR: Gear = 4;

/**
 * Semantic colour name of a gear band. These are identifiers, not render
 * colours: hex values and colour-blind patterns live in src/data/palette.json
 * keyed by these names.
 */
export type GearColor = 'white' | 'blue' | 'green' | 'yellow' | 'red';

export const GEAR_COLORS: Readonly<Record<Gear, GearColor>> = {
  0: 'white',
  1: 'blue',
  2: 'green',
  3: 'yellow',
  4: 'red',
};

// ---------------------------------------------------------------------------
// Tuning (raw JSON) and SimParams (derived, per-step)
// ---------------------------------------------------------------------------

/** Five values, one per gear, indexed by `Gear`. */
export type PerGear<T> = readonly [T, T, T, T, T];

/**
 * Shape of src/data/tuning.json (owned by design-lead). Units as authored.
 * Any key added to tuning.json must be added here too (ask tech-lead).
 */
export interface Tuning {
  /** Simulation steps per second. */
  readonly stepHz: number;
  /** Pixels per tile. Render only; the sim never reads it. */
  readonly tileSize: number;
  /** Target horizontal speed per gear, tiles/second. Index = gear. */
  readonly gearSpeeds: PerGear<number>;
  /** Ground distance (tiles) needed to change actual speed by one gear. */
  readonly tilesPerGearChange: number;
  /** Horizontal flight distance (tiles) that costs one gear of speed. */
  readonly airDragTilesPerGear: number;
  /** Jump apex height, tiles. */
  readonly jumpHeightTiles: number;
  /** Time from takeoff to apex, ms. Together with height this sets gravity. */
  readonly jumpTimeToApexMs: number;
  /** Jump still allowed this long after walking off a ledge, ms. */
  readonly coyoteMs: number;
  /** Jump pressed this long before landing still fires on landing, ms. */
  readonly jumpBufferMs: number;
  /** Time on a mismatched coloured floor before falling through, ms. */
  readonly colorGraceMs: number;
}

/**
 * Per-step constants derived from `Tuning` once per level load by a pure
 * function in src/core (gameplay-engineer). All times in steps (integers,
 * rounded), all speeds in tiles/step, accelerations in tiles/step^2.
 *
 * Suggested derivation (h = jumpHeightTiles, t = jumpTimeToApexMs / 1000 s):
 *   gravity      = (2h / t^2) / stepHz^2
 *   jumpVelocity = (2h / t)   / stepHz        (applied upward, i.e. negative vy)
 *   xxxSteps     = round(xxxMs * stepHz / 1000)
 */
export interface SimParams {
  readonly stepHz: number;
  /** Target speed per gear, tiles/step. */
  readonly gearSpeeds: PerGear<number>;
  readonly tilesPerGearChange: number;
  readonly airDragTilesPerGear: number;
  /** Downward acceleration, tiles/step^2 (positive = down). */
  readonly gravity: number;
  /** Initial upward speed of a jump, tiles/step (positive magnitude). */
  readonly jumpVelocity: number;
  readonly coyoteSteps: number;
  readonly jumpBufferSteps: number;
  readonly colorGraceSteps: number;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * Buttons sampled once per sim step.
 *
 * EDGE SEMANTICS: every field is the HELD (level) state of that button for
 * this step. The sim derives presses itself: a button is "pressed" on a step
 * when it is held now and was not held in `SimState.prevInput`. So:
 * - shiftUp / shiftDown change the target gear once per press; holding does
 *   not repeat.
 * - jump starts on the press edge (subject to coyote / jump buffer); holding
 *   vs releasing jump is available for variable jump height if design wants it.
 * - left / right are pure held state.
 * The input sampler (render side) LATCHES taps: a key that went down at any
 * time since the previous step counts as held for at least that step, so a
 * tap shorter than one step is never lost. Recordings store exactly these
 * held frames, which is why replays reproduce runs bit for bit.
 */
export interface InputFrame {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly shiftUp: boolean;
  readonly shiftDown: boolean;
}

export type InputButton = keyof InputFrame;

/** Canonical button order, and the letter each uses in solution files. */
export const INPUT_BUTTONS: readonly InputButton[] = ['left', 'right', 'jump', 'shiftUp', 'shiftDown'];

export const INPUT_LETTERS: Readonly<Record<InputButton, string>> = {
  left: 'L',
  right: 'R',
  jump: 'J',
  shiftUp: '+',
  shiftDown: '-',
};

/** Letter used in solution files for a frame with no buttons held. */
export const INPUT_NONE_LETTER = '.';

export const EMPTY_INPUT: InputFrame = {
  left: false,
  right: false,
  jump: false,
  shiftUp: false,
  shiftDown: false,
};

/** A run of identical input frames: the unit of a solution recording. */
export interface InputRun {
  /** Number of consecutive steps, >= 1. */
  readonly count: number;
  readonly frame: InputFrame;
}

/** A parsed solution file (format: docs/tech/level-format.md). */
export interface Solution {
  readonly levelId: string;
  /** Must equal the level's `version`; a mismatch fails the replay test. */
  readonly levelVersion: number;
  /** Total steps, equal to the sum of all run counts. */
  readonly steps: number;
  readonly runs: readonly InputRun[];
}

// ---------------------------------------------------------------------------
// Tiles and levels
// ---------------------------------------------------------------------------

/**
 * One grid cell. Solid tiles block from every side. Non-solid tiles
 * (`camera`, `exit`) are trigger volumes the player overlaps.
 * Pieces marked RESERVED parse and render as placeholders; their rules are
 * specified per world by design-lead before gameplay-engineer implements them.
 */
export type Tile =
  /** Nothing. */
  | { readonly kind: 'empty' }
  /** White/grey geometry. Always solid. Also acts as a wall (instant stop). */
  | { readonly kind: 'safe' }
  /** Solid only while the player's colour band equals `gear`. */
  | { readonly kind: 'colored'; readonly gear: ColoredGear }
  /** RESERVED (world 3). Solid; caps the player's gear while standing on it. */
  | { readonly kind: 'mud' }
  /** RESERVED (world 3). Solid; locks the player's current gear. */
  | { readonly kind: 'ice' }
  /** RESERVED (world 4). Solid; moves what stands on it. dir -1 = left, 1 = right. */
  | { readonly kind: 'conveyor'; readonly dir: -1 | 1 }
  /** RESERVED (world 3). Solid; sets the player instantly to gear 4. */
  | { readonly kind: 'boost' }
  /** RESERVED (world 3). Non-solid gate volume that checks the player's band against `gear`. */
  | { readonly kind: 'camera'; readonly gear: Gear }
  /** Non-solid. Touching it completes the level. */
  | { readonly kind: 'exit' };

export type TileKind = Tile['kind'];

export const TILE_KINDS: readonly TileKind[] = [
  'empty',
  'safe',
  'colored',
  'mud',
  'ice',
  'conveyor',
  'boost',
  'camera',
  'exit',
];

/**
 * Level-file legend: one ASCII character per tile. The single source of truth
 * for docs/tech/level-format.md; the level parser must use this table.
 */
export const TILE_LEGEND: Readonly<Record<string, Tile>> = {
  '.': { kind: 'empty' },
  '#': { kind: 'safe' },
  B: { kind: 'colored', gear: 1 },
  G: { kind: 'colored', gear: 2 },
  Y: { kind: 'colored', gear: 3 },
  R: { kind: 'colored', gear: 4 },
  '~': { kind: 'mud' },
  '=': { kind: 'ice' },
  '<': { kind: 'conveyor', dir: -1 },
  '>': { kind: 'conveyor', dir: 1 },
  '*': { kind: 'boost' },
  w: { kind: 'camera', gear: 0 },
  b: { kind: 'camera', gear: 1 },
  g: { kind: 'camera', gear: 2 },
  y: { kind: 'camera', gear: 3 },
  r: { kind: 'camera', gear: 4 },
  E: { kind: 'exit' },
};

/** Player start marker. The cell itself parses as `empty`. Exactly one per level. */
export const PLAYER_START_CHAR = '@';

/**
 * Characters reserved for later worlds (not yet valid in level files):
 * X = crate (world 4), M = moving platform (world 4, path data TBD).
 */
export const RESERVED_CHARS: readonly string[] = ['X', 'M'];

/** Integer grid position. */
export interface TilePos {
  readonly col: number;
  readonly row: number;
}

/** Header block of a level file. */
export interface LevelMeta {
  /** Stable id, also the file name stem, e.g. "w1-01". */
  readonly id: string;
  readonly title: string;
  /** World number from the GDD toolbox, 1..5. 0 = test/example levels. */
  readonly world: number;
  /** Short free text: what this level teaches. */
  readonly teaches: string;
  /** Bumped on every grid change; solutions record the version they solve. */
  readonly version: number;
}

/** A parsed, validated level. Immutable; shared by sim and renderer. */
export interface Level {
  readonly meta: LevelMeta;
  /** Grid width in tiles (columns). */
  readonly width: number;
  /** Grid height in tiles (rows). */
  readonly height: number;
  /** Row-major: index = row * width + col. Length = width * height. */
  readonly tiles: readonly Tile[];
  /** Cell marked `@`. The player spawns standing on the bottom of this cell. */
  readonly start: TilePos;
}

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------

export type Facing = -1 | 1;

/**
 * Player state. Position is the BOTTOM-CENTRE of the hitbox (the feet), in
 * tiles. Hitbox size comes from tuning (keys to be added by design-lead).
 */
export interface PlayerState {
  readonly x: number;
  readonly y: number;
  /** Horizontal world velocity, tiles/step (includes conveyor/platform motion). */
  readonly vx: number;
  /** Vertical velocity, tiles/step, positive = falling. */
  readonly vy: number;
  readonly facing: Facing;
  /** Gear selected with the Shift keys. Speed ramps toward gearSpeeds[targetGear]. */
  readonly targetGear: Gear;
  /** Band of the player's ACTUAL horizontal speed. This is the player's colour. */
  readonly band: Gear;
  readonly grounded: boolean;
  /** Steps of coyote time left (0 = none). */
  readonly coyoteSteps: number;
  /** Steps a buffered jump stays valid (0 = none buffered). */
  readonly jumpBufferSteps: number;
  /** Steps spent on a floor whose colour does not match `band`. */
  readonly mismatchSteps: number;
  /** Horizontal distance flown since takeoff, tiles (drives air drag). */
  readonly airDistance: number;
}

export type SimStatus = 'playing' | 'won' | 'dead';

/**
 * Things that happened during one step, for audio/fx/HUD to react to without
 * diffing state. Purely informational: never read back by the sim.
 */
export type SimEvent =
  | { readonly type: 'shift'; readonly targetGear: Gear }
  | { readonly type: 'bandChange'; readonly from: Gear; readonly to: Gear }
  | { readonly type: 'jump' }
  | { readonly type: 'land' }
  | { readonly type: 'fallThrough'; readonly gear: ColoredGear }
  | { readonly type: 'won' }
  | { readonly type: 'died' };

/**
 * Whole simulation state. Treat as immutable: `step()` returns a new object.
 * Same Level + SimParams + input frames => identical SimState, always.
 */
export interface SimState {
  /** Steps simulated so far. Also the run time for leaderboards. */
  readonly step: number;
  readonly status: SimStatus;
  /** Step at which `status` became 'won' (null while not won). */
  readonly wonAtStep: number | null;
  readonly player: PlayerState;
  /** Input of the previous step, used to derive press edges. */
  readonly prevInput: InputFrame;
  /** Events produced by the most recent step only. */
  readonly events: readonly SimEvent[];
}

/** Signature of the pure step function implemented in src/core. */
export type StepFn = (state: SimState, input: InputFrame, level: Level, params: SimParams) => SimState;
