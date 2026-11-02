/**
 * Tiles and levels (GDD §4.7, §7.1). Owner: tech-lead. Import via `src/core/types`.
 */
import type { Band, ColoredBand } from './bands';

/**
 * One grid cell. Pieces marked RESERVED parse and render as placeholders;
 * their rules get a design-lead spec before gameplay-engineer implements them.
 */
export type Tile =
  /** Nothing. */
  | { readonly kind: 'empty' }
  /** White/grey geometry. Solid on all faces at every band. */
  | { readonly kind: 'safe' }
  /** Solid on all faces only while the player's band equals `band` (no-embed, grace). */
  | { readonly kind: 'colored'; readonly band: ColoredBand }
  /** RESERVED (world 3). Always solid; caps the gear at mudMaxGear while supported only by mud. */
  | { readonly kind: 'mud' }
  /** RESERVED (world 3). Always solid; locks speed and gear while supported only by ice. */
  | { readonly kind: 'ice' }
  /** RESERVED (world 4). Always solid; carries what stands on it. dir -1 = left, 1 = right. */
  | { readonly kind: 'conveyor'; readonly dir: -1 | 1 }
  /** RESERVED (world 3). Always solid; touching its top sets boostPadGear and its speed. */
  | { readonly kind: 'boost' }
  /** RESERVED (world 3). Speed camera gate: solid unless the player's band equals `band`. */
  | { readonly kind: 'camera'; readonly band: Band }
  /** Never solid. Overlapping it completes the level. */
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
 * Level-file legend: one ASCII character per tile. Source of truth for
 * docs/tech/level-format.md; the level parser must use this table.
 */
export const TILE_LEGEND: Readonly<Record<string, Tile>> = {
  '.': { kind: 'empty' },
  '#': { kind: 'safe' },
  B: { kind: 'colored', band: 1 },
  G: { kind: 'colored', band: 2 },
  Y: { kind: 'colored', band: 3 },
  R: { kind: 'colored', band: 4 },
  '~': { kind: 'mud' },
  '=': { kind: 'ice' },
  '<': { kind: 'conveyor', dir: -1 },
  '>': { kind: 'conveyor', dir: 1 },
  '*': { kind: 'boost' },
  w: { kind: 'camera', band: 0 },
  b: { kind: 'camera', band: 1 },
  g: { kind: 'camera', band: 2 },
  y: { kind: 'camera', band: 3 },
  r: { kind: 'camera', band: 4 },
  E: { kind: 'exit' },
};

/** Player start marker. The cell parses as `empty`. Exactly one per level. */
export const PLAYER_START_CHAR = '@';

/** Reserved for later worlds (parse error for now): X = crate, M = moving platform. */
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
  /** World number 1..5; 0 = test/example levels. */
  readonly world: number;
  /** Short free text: what this level teaches. */
  readonly teaches: string;
  /** Bumped on every grid change; solutions record the version they solve. */
  readonly version: number;
}

/** A parsed, validated level. Immutable; shared by sim and renderer. */
export interface Level {
  readonly meta: LevelMeta;
  /** Columns. */
  readonly width: number;
  /** Rows. */
  readonly height: number;
  /** Row-major: index = row * width + col. Length = width * height. */
  readonly tiles: readonly Tile[];
  /** Cell marked `@`. Spawn: x = col + 0.5, feet y = row + 1, facing right. */
  readonly start: TilePos;
}
