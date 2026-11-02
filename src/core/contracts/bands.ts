/**
 * Gears, colour bands and directions. Owner: tech-lead. Import via `src/core/types`.
 */

/**
 * Colour band of the player's actual speed: 0 white (standing), 1 blue,
 * 2 green, 3 yellow, 4 red. Also the index into `gearSpeeds` (index 0 = 0 tiles/s).
 */
export type Band = 0 | 1 | 2 | 3 | 4;

/** Bands that have coloured geometry (white has none). */
export type ColoredBand = Exclude<Band, 0>;

/** Selectable cruise gear, picked with the shift actions. Standing is not a gear. */
export type Gear = 1 | 2 | 3 | 4;

export const BANDS: readonly Band[] = [0, 1, 2, 3, 4];
export const GEARS: readonly Gear[] = [1, 2, 3, 4];
/** Highest gear; also the last index of `gearSpeeds`. `minGear` comes from tuning. */
export const MAX_GEAR: Gear = 4;

/**
 * Semantic colour name of a band. Identifiers, not render colours: hex values
 * and colour-blind patterns live in src/data/palette.json keyed by these names.
 */
export type BandColor = 'white' | 'blue' | 'green' | 'yellow' | 'red';

export const BAND_COLORS: Readonly<Record<Band, BandColor>> = {
  0: 'white',
  1: 'blue',
  2: 'green',
  3: 'yellow',
  4: 'red',
};

/** @deprecated v1.0 name; use `BandColor`. */
export type GearColor = BandColor;
/** @deprecated v1.0 name; use `BAND_COLORS`. */
export const GEAR_COLORS = BAND_COLORS;

/** Which way the player looks. Starts at +1 (right). */
export type Facing = -1 | 1;

/** Move direction d from held left/right (GDD §4.3), or a priority winner. 0 = none. */
export type MoveDir = -1 | 0 | 1;

/** Tolerance for "reached" / "overlaps" tests on accumulated floats (architecture.md §3.3). */
export const SIM_EPSILON = 1e-9;

/** One value per band, indexed by `Band` (index 0 = standing). */
export type PerBand<T> = readonly [T, T, T, T, T];

/** One value per speed segment n = 0..3, spanning gearSpeeds[n]..gearSpeeds[n+1]. */
export type PerSegment<T> = readonly [T, T, T, T];

/** The four colour band edges, tiles/s, strictly increasing. */
export type BandEdges = readonly [number, number, number, number];
