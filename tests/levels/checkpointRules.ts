/**
 * Level rules for checkpoint posts and long levels, as pure checks
 * (level-format.md §2 "Checkpoint headers", expansion-approach.md §8.2,
 * contracts/checkpoints.ts). The parser owns the cell, floor, count, spacing
 * and exclusion rules; these are the ones that need geometry, the camera or
 * the real sim. Owner: tech-lead.
 *
 * - **Respawn box** of a post: the post column, `ceil(playerHeight)` rows up
 *   from the post row (the body stands in it after a post respawn, as at `@`).
 *   It holds only empty cells (so no exit) and overlaps no slab swept area, no
 *   shot lane, no hint box, and nothing the HUD can cover at any camera.
 * - **Recovery stretch**: the floor row under a post is safe for at least
 *   `RECOVERY_COLS` columns from the post column rightwards (or to the grid edge).
 * - **Size**: every level is at most `MAX_LEVEL_WIDTH` columns; a level with
 *   posts is at most `MAX_POST_LEVEL_ROWS` rows.
 * - **Recording**: the shipped recording of a level with posts is deathless
 *   from load, never restarts (`wonAtStep === steps`) and lights every post in
 *   order 0, 1, 2, ...
 */
import type { InputFrame, Level, SimApi, SimParams, Solution, SimState } from '../../src/core';
import { expandRuns } from '../../src/core';
import { keepOutAreas, overlapsCells, underHud, type CellRect } from './kineticRules';
import { hintBoxPx, type RuleConfig } from './levelRules';

/** Widest level the camera, HUD sweep and robustness budget are sized for (expansion-approach.md §8.2). */
export const MAX_LEVEL_WIDTH = 480;
/** Long levels keep to one screen of rows (checkpoints.md, §8.2). */
export const MAX_POST_LEVEL_ROWS = 15;
/** Safe floor columns from the post column rightwards. */
export const RECOVERY_COLS = 4;

const posts = (level: Level) => level.checkpoints ?? [];

function kindAt(level: Level, col: number, row: number): string {
  if (col < 0 || row < 0 || col >= level.width || row >= level.height) return 'outside';
  return level.tiles[row * level.width + col]?.kind ?? 'outside';
}

/** The cells the body fills after a respawn at `post`. */
export function respawnBox(col: number, row: number, playerHeightTiles: number): CellRect {
  return { left: col, top: row + 1 - Math.ceil(playerHeightTiles), right: col + 1, bottom: row + 1 };
}

/** Respawn box: empty cells, clear of slabs, lanes, hints and the HUD. */
export function respawnBoxProblems(level: Level, cfg: RuleConfig): readonly string[] {
  const id = level.meta.id;
  const ts = cfg.tileSize;
  const out: string[] = [];
  posts(level).forEach((post, i) => {
    const box = respawnBox(post.cell.col, post.cell.row, cfg.playerHeightTiles);
    for (let row = box.top; row < box.bottom; row += 1) {
      const kind = kindAt(level, post.cell.col, row);
      if (kind !== 'empty') out.push(`${id}: post ${i} respawn box cell (${post.cell.col}, ${row}) is ${kind}; it must be empty`);
    }
    for (const { name, area } of keepOutAreas(level)) {
      if (overlapsCells(box, area)) out.push(`${id}: post ${i} respawn box overlaps ${name}`);
    }
    for (const h of level.meta.hints ?? []) {
      const b = hintBoxPx(h, ts);
      if (overlapsCells(box, { left: b.left / ts, top: b.top / ts, right: b.right / ts, bottom: b.bottom / ts })) {
        out.push(`${id}: post ${i} respawn box overlaps hint ${h.glyph} at (${h.anchor.col}, ${h.anchor.row})`);
      }
    }
    if (underHud(box, level, ts)) out.push(`${id}: post ${i} respawn box can pass under the HUD area at some camera position`);
  });
  return out;
}

/** The floor under a post stays safe for RECOVERY_COLS columns (grid edge counts as safe). */
export function recoveryProblems(level: Level): readonly string[] {
  const id = level.meta.id;
  const out: string[] = [];
  posts(level).forEach((post, i) => {
    const floor = post.cell.row + 1;
    for (let col = post.cell.col; col < Math.min(post.cell.col + RECOVERY_COLS, level.width); col += 1) {
      const kind = kindAt(level, col, floor);
      if (kind !== 'safe') {
        out.push(`${id}: post ${i} floor cell (${col}, ${floor}) is ${kind}; ${RECOVERY_COLS} safe floor columns from the post`);
        break;
      }
    }
  });
  return out;
}

/** Width for every level; rows for levels with posts. */
export function sizeProblems(level: Level): readonly string[] {
  const id = level.meta.id;
  const out: string[] = [];
  if (level.width > MAX_LEVEL_WIDTH) out.push(`${id}: ${level.width} columns; at most ${MAX_LEVEL_WIDTH}`);
  if (posts(level).length > 0 && level.height > MAX_POST_LEVEL_ROWS) {
    out.push(`${id}: ${level.height} rows in a level with posts; at most ${MAX_POST_LEVEL_ROWS}`);
  }
  return out;
}

/** Deathless from load, no restart, wonAtStep === steps, every post lit in order. [] for a level without posts. */
export function postRecordingProblems(api: SimApi, level: Level, p: SimParams, solution: Solution): readonly string[] {
  const n = posts(level).length;
  if (n === 0) return [];
  const id = level.meta.id;
  const out: string[] = [];
  const lit: number[] = [];
  let state: SimState = api.createSim(level, p);
  expandRuns(solution.runs).forEach((frame: InputFrame, i) => {
    if (state.status === 'won') return;
    state = api.step(state, frame, level, p);
    if (state.events.some((e) => e.type === 'died')) out.push(`${id}: recording dies at step ${i + 1}; a level with posts ships a deathless recording`);
    if (state.status === 'restarting') out.push(`${id}: recording restarts at step ${i + 1}`);
    const idx = state.checkpoint?.index;
    if (idx !== undefined && idx !== lit[lit.length - 1]) lit.push(idx);
  });
  if (state.wonAtStep !== solution.steps) out.push(`${id}: wonAtStep ${String(state.wonAtStep)} !== steps ${solution.steps}`);
  const order = Array.from({ length: n }, (_, i) => i);
  if (lit.join() !== order.join()) out.push(`${id}: recording lights posts [${lit.join(', ')}]; it must light [${order.join(', ')}] in order`);
  return out;
}
