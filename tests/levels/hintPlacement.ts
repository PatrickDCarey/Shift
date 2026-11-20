/**
 * Hint placement rules the parser leaves to level review
 * (docs/design/features/onboarding-hints.md "Placement rules";
 * level-format.md §2 "Hint headers"). Pure, so the test can prove each rule
 * on an in-memory fixture. Owner: tech-lead.
 *
 * - Box: the glyph is 3 tiles wide and 1.5 tall, centred on the anchor
 *   column, bottom edge on the anchor row's bottom edge. The cells it touches
 *   are columns col-1..col+1 of rows row-1..row, and every one must be inside
 *   the grid and `empty` (the `@` and `&` cells parse as empty and are fine).
 * - Floor: the first non-empty, non-exit tile below the anchor in its column
 *   must be at least `MIN_ROWS_ABOVE_FLOOR` rows below the anchor row, so the
 *   glyph clears the player's 1.5-tile head. No tile below (a pit) passes.
 * - Overlap: two hints' boxes never share a cell (the parser allows two
 *   different glyphs on one anchor; this catches it and near misses).
 * - HUD at any camera (onboarding-hints.md checks 11 and 14): no scroll the
 *   camera can take (clamped to the level, or centred when the level is
 *   smaller than the view) puts the widest glyph box under the HUD area.
 *   Conservative: each axis takes its whole range, even pairs no body reaches.
 */
import type { Level, LevelHint, Tile } from '../../src/core';
import { axisScroll } from '../../src/entities/camera';
import { HUD_AREA, VIEW, hintBoxPx, type RuleConfig } from './levelRules';

/** Cells covered by a glyph, around its anchor (onboarding-hints.md "Drawing"). */
export const HINT_BOX = { colsLeft: 1, colsRight: 1, rowsAbove: 1 } as const;
/** Anchor row is at least this many rows above the floor row under it. */
export const MIN_ROWS_ABOVE_FLOOR = 3;

function tileAt(level: Level, col: number, row: number): Tile | undefined {
  if (col < 0 || row < 0 || col >= level.width || row >= level.height) return undefined;
  return level.tiles[row * level.width + col];
}

function boxProblems(level: Level, hint: LevelHint): readonly string[] {
  const { col, row } = hint.anchor;
  const problems: string[] = [];
  for (let r = row - HINT_BOX.rowsAbove; r <= row; r += 1) {
    for (let c = col - HINT_BOX.colsLeft; c <= col + HINT_BOX.colsRight; c += 1) {
      const tile = tileAt(level, c, r);
      if (tile?.kind !== 'empty') problems.push(`cell (${c}, ${r}) is ${tile === undefined ? 'outside the grid' : tile.kind}`);
    }
  }
  return problems;
}

/** Row of the first floor tile below one cell, or null over a pit. */
function floorRowUnder(level: Level, col: number, fromRow: number): number | null {
  for (let r = fromRow + 1; r < level.height; r += 1) {
    const kind = tileAt(level, col, r)?.kind;
    if (kind !== undefined && kind !== 'empty' && kind !== 'exit') return r;
  }
  return null;
}

/** Highest floor row under any of the glyph box's columns, or null if all are pits. */
function floorRowBelow(level: Level, hint: LevelHint): number | null {
  const { col, row } = hint.anchor;
  const rows: number[] = [];
  for (let c = col - HINT_BOX.colsLeft; c <= col + HINT_BOX.colsRight; c += 1) {
    const r = floorRowUnder(level, c, row);
    if (r !== null) rows.push(r);
  }
  return rows.length === 0 ? null : Math.min(...rows);
}

const BOX_COLS = HINT_BOX.colsLeft + HINT_BOX.colsRight + 1;
const BOX_ROWS = HINT_BOX.rowsAbove + 1;

function boxesOverlap(a: LevelHint, b: LevelHint): boolean {
  return Math.abs(a.anchor.col - b.anchor.col) < BOX_COLS && Math.abs(a.anchor.row - b.anchor.row) < BOX_ROWS;
}

function overlapProblems(level: Level, hints: readonly LevelHint[]): readonly string[] {
  return hints.flatMap((a, i) =>
    hints
      .slice(i + 1)
      .filter((b) => boxesOverlap(a, b))
      .map((b) => `${level.meta.id}: hints ${a.glyph} (${a.anchor.col}, ${a.anchor.row}) and ${b.glyph} (${b.anchor.col}, ${b.anchor.row}) overlap`),
  );
}

/** Every placement problem of one level's hints; [] when they all pass. */
export function hintPlacementProblems(level: Level): readonly string[] {
  const hints = level.meta.hints ?? [];
  return [...hints.flatMap((hint) => singleHintProblems(level, hint)), ...overlapProblems(level, hints)];
}

function singleHintProblems(level: Level, hint: LevelHint): readonly string[] {
  const where = `${level.meta.id}: hint ${hint.glyph} at col ${hint.anchor.col}, row ${hint.anchor.row}`;
  const box = boxProblems(level, hint).map((p) => `${where}: its 3 x 2 box must cover only empty cells; ${p}`);
  const floor = floorRowBelow(level, hint);
  const gap = floor === null ? null : floor - hint.anchor.row;
  const head =
    gap !== null && gap < MIN_ROWS_ABOVE_FLOOR
      ? [`${where}: anchor is ${gap} row(s) above the floor (row ${floor}); needs at least ${MIN_ROWS_ABOVE_FLOOR}`]
      : [];
  return [...box, ...head];
}

/** Some scroll in the axis' reachable range puts world span [lo, hi) over screen span [from, to). */
function reachesOnAxis(lo: number, hi: number, from: number, to: number, view: number, world: number): boolean {
  const min = axisScroll(Number.NEGATIVE_INFINITY, view, world);
  const max = axisScroll(Number.POSITIVE_INFINITY, view, world);
  return max > lo - to && min < hi - from;
}

/** Hints whose box can pass under the HUD area at some camera position; [] when none can. */
export function hintHudReachProblems(level: Level, cfg: RuleConfig): readonly string[] {
  const ts = cfg.tileSize;
  const [worldW, worldH] = [level.width * ts, level.height * ts];
  return (level.meta.hints ?? [])
    .filter((hint) => {
      const b = hintBoxPx(hint, ts);
      return (
        reachesOnAxis(b.left, b.right, HUD_AREA.left, HUD_AREA.right, VIEW.width, worldW) &&
        reachesOnAxis(b.top, b.bottom, HUD_AREA.top, HUD_AREA.bottom, VIEW.height, worldH)
      );
    })
    .map((h) => `${level.meta.id}: hint ${h.glyph} at (${h.anchor.col}, ${h.anchor.row}) can pass under the HUD area at some camera position`);
}
