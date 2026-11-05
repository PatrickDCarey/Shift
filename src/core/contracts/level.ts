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
  /** RESERVED (world 3, Should). Always solid; locks speed and gear while supported only by ice. */
  | { readonly kind: 'ice' }
  /** RESERVED (world 3). Speed gate: solid unless the player's band equals `band` (G-1 renames the kind). */
  | { readonly kind: 'camera'; readonly band: Band }
  /** Never solid. Overlapping it completes the level. */
  | { readonly kind: 'exit' };

export type TileKind = Tile['kind'];

export const TILE_KINDS: readonly TileKind[] = [
  'empty',
  'safe',
  'colored',
  'ice',
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
  '=': { kind: 'ice' },
  w: { kind: 'camera', band: 0 },
  b: { kind: 'camera', band: 1 },
  g: { kind: 'camera', band: 2 },
  y: { kind: 'camera', band: 3 },
  r: { kind: 'camera', band: 4 },
  E: { kind: 'exit' },
};

/** Player start marker. The cell parses as `empty`. Exactly one per level. */
export const PLAYER_START_CHAR = '@';

/**
 * Twin start marker (Tandem, features/tandem.md). The cell parses as `empty`.
 * At most one per level; spawn rule as `@`. Rejected when the cell directly
 * above or below it is an exit (level-format.md, Validation).
 */
export const TWIN_START_CHAR = '&';

/**
 * Parse errors with a "reserved" message: X = crate, M = moving platform (later
 * worlds); ~ mud, * boost pad, < > conveyors (cut 2026-11-04, T-02; boost pads
 * may return as a Could, gdd.md). Never reuse these characters for something else.
 */
export const RESERVED_CHARS: readonly string[] = ['X', 'M', '~', '*', '<', '>'];

/** Integer grid position. */
export interface TilePos {
  readonly col: number;
  readonly row: number;
}

/**
 * Onboarding hint glyph ids (GDD §3, docs/design/features/onboarding-hints.md):
 * key-cap icons for one logical action, never text. `move` = left/right,
 * `shiftUp`, `shiftDown`, `jump`; the ids match the `InputButton` names.
 */
export type HintGlyph = 'move' | 'shiftUp' | 'shiftDown' | 'jump';

/** Every hint glyph id, in the order level-format.md lists them. */
export const HINT_GLYPHS: readonly HintGlyph[] = ['move', 'shiftUp', 'shiftDown', 'jump'];

/** At most this many `hint:` lines per level (onboarding-hints.md). */
export const MAX_LEVEL_HINTS = 3;

/** One `hint:` header line (level-format.md §2, "Hint headers"). Render-only: the sim never reads it. */
export interface LevelHint {
  readonly glyph: HintGlyph;
  /**
   * Anchor cell: inside the grid, a `.` in the file. The glyph's box is centred
   * horizontally on the cell's centre (col + 0.5) and its bottom edge sits on
   * the cell's bottom edge (row + 1).
   */
  readonly anchor: TilePos;
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
  /**
   * Onboarding hints in file order. Absent when the file has no `hint:` line
   * (never an empty array), so hint-free levels compare equal to older parses.
   * Render-only: the sim never reads it, and changing hints needs no `version` bump.
   */
  readonly hints?: readonly LevelHint[];
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
  /** Cell marked `&` (the Tandem twin), same spawn rule as `start`; null when the level has none. */
  readonly twinStart: TilePos | null;
}
