/**
 * What is solid for the player (GDD §4.7-4.8, color-gating.md).
 *
 * No-embed ruling (sim lane, see docs/production/requests.md): a colour the
 * player's box overlaps at the start of a move is not solid for that move,
 * for every tile of that colour, until the box is clear of it. Per-tile
 * no-embed would stop a player who turns yellow inside a 3-tile yellow wall
 * at the next yellow column, which color-gating check 13 rules out.
 */
import { BANDS, type Band, type ColoredBand, type Level, type SimParams, type Tile } from '../types';
import { boxAt, overlapsTile, type Box } from './geometry';

export interface Gate {
  /** Band at the start of the step (architecture.md §3.2). */
  readonly band: Band;
  /** Grace colour if grace is active, else null. Floors only. */
  readonly graceBand: ColoredBand | null;
  /** embedded[b]: the box overlaps a colour-b tile, so colour b is not solid (no-embed). */
  readonly embedded: readonly boolean[];
}

/** Per band: does the box overlap a colored tile of that band? */
export function embeddedBands(level: Level, box: Box): boolean[] {
  return BANDS.map((b) => b > 0 && overlapsTile(level, box, (t) => t.kind === 'colored' && t.band === b));
}

/** Gate for a move starting with the player's box at (x, y). */
export function gateFor(
  level: Level,
  params: SimParams,
  x: number,
  y: number,
  band: Band,
  graceBand: ColoredBand | null,
): Gate {
  return { band, graceBand, embedded: embeddedBands(level, boxAt(x, y, params)) };
}

/** Solid on every face: walls, ceilings and floors. Grace never counts here. */
export function solidAll(tile: Tile, gate: Gate): boolean {
  switch (tile.kind) {
    case 'empty':
    case 'exit':
      return false;
    case 'colored':
      return tile.band === gate.band && gate.embedded[tile.band] !== true;
    case 'camera':
      return tile.band !== gate.band;
    default:
      return true;
  }
}

/** Solid from above (floors): solidAll, or the grace colour while grace runs. */
export function solidFloor(tile: Tile, gate: Gate): boolean {
  if (solidAll(tile, gate)) return true;
  return tile.kind === 'colored' && tile.band === gate.graceBand && gate.embedded[tile.band] !== true;
}
