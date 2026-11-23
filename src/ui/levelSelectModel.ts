/**
 * Level select model (docs/design/features/level-select.md): one row per world
 * that has loaded levels, each cell locked / open / cleared, grid focus, the
 * detail line, and the layout. Pure; rebuilt on every open from the level
 * order and the save, so the playable set is always derived, never stored.
 *
 * Owner: ui-engineer.
 */
import { FONT_ICONS } from '../fx/pixel/font';
import { bestTimeText, clearedCount, levelLabel, levelState, previousInWorld } from '../save/progress';
import type { CompletedIds, LevelEntry, LevelState } from '../save/progress';
import type { Progress } from '../save/schema';
import { levelCaption } from './levelCaption';
import { moveGridFocus } from './menuFocus';
import type { GridFocus, Transition } from './menuFocus';
import type { MenuIntent } from './menuInput';
import { MARGIN, SCREEN_W, box, rightText, textItem, truncate } from './menuLayout';
import type { LayoutItem } from './menuLayout';

/** UI copy for world names. World 3 becomes GATES if the Tandem decision gate fails (pass `worldNames`). */
export const DEFAULT_WORLD_NAMES: Readonly<Record<number, string>> = {
  1: 'GEARS',
  2: 'FLIGHT',
  3: 'TANDEM',
  4: 'MOTION',
  5: 'SIGNALS',
};

export const NO_LEVELS_TEXT = 'NO LEVELS';
export const HEADING = 'LEVELS';
/** A world with more levels wraps onto a continuation row (same `world`), so a cell never leaves the 8 px margin. */
export const MAX_CELLS_PER_ROW = 5;
const DETAIL_MAX = 24;

export interface LevelCell {
  readonly id: string;
  /** `1-3`, from the id. */
  readonly label: string;
  readonly title: string;
  readonly state: LevelState;
  /** `0:12.91` when cleared and a best exists. */
  readonly bestText: string | null;
  /** Previous level in the world, for `LOCKED - CLEAR 1-2 FIRST`. */
  readonly lockedBy: string | null;
}

export interface WorldRow {
  readonly world: number;
  readonly name: string;
  readonly cells: readonly LevelCell[];
}

export interface LevelSelectModel {
  readonly rows: readonly WorldRow[];
  readonly focus: GridFocus;
  /** `CLEARED n/m`. */
  readonly clearedText: string;
  readonly empty: boolean;
}

export type LevelSelectAction =
  | { readonly type: 'start'; readonly levelId: string }
  /** Enter on a locked cell: nothing starts; the scene nudges the lock icon (not with reduced motion). */
  | { readonly type: 'locked'; readonly levelId: string }
  | { readonly type: 'back' };

export interface LevelSelectInput {
  readonly order: readonly LevelEntry[];
  readonly progress: Progress;
  readonly stepHz: number;
  /** Level to focus: the PLAY target from the title, or the level just played. Unknown or absent -> `fallbackId`. */
  readonly focusId?: string | null;
  /** Used when `focusId` is unusable; the spec says w1-01. Defaults to the first listed level. */
  readonly fallbackId?: string;
  readonly worldNames?: Readonly<Record<number, string>>;
}

function buildCell(entry: LevelEntry, input: LevelSelectInput, completed: CompletedIds): LevelCell {
  const state = levelState(entry.id, input.order, completed);
  return {
    id: entry.id,
    label: levelLabel(entry.id),
    title: entry.title,
    state,
    bestText: state === 'cleared' ? bestTimeText(input.progress, entry.id, input.stepHz) : null,
    lockedBy: state === 'locked' ? previousInWorld(entry.id, input.order) : null,
  };
}

function findCell(rows: readonly WorldRow[], id: string | null | undefined): GridFocus | null {
  if (id === null || id === undefined) return null;
  for (let row = 0; row < rows.length; row++) {
    const col = rows[row]?.cells.findIndex((cell) => cell.id === id) ?? -1;
    if (col >= 0) return { row, col };
  }
  return null;
}

export function createLevelSelectModel(input: LevelSelectInput): LevelSelectModel {
  const completed = input.progress.completedLevels;
  const names = input.worldNames ?? DEFAULT_WORLD_NAMES;
  const rows: WorldRow[] = [];
  for (const entry of input.order) {
    const cell = buildCell(entry, input, completed);
    const last = rows[rows.length - 1];
    if (last !== undefined && last.world === entry.world && last.cells.length < MAX_CELLS_PER_ROW) {
      rows[rows.length - 1] = { ...last, cells: [...last.cells, cell] };
    } else {
      rows.push({ world: entry.world, name: names[entry.world] ?? `WORLD ${entry.world}`, cells: [cell] });
    }
  }
  const focus = findCell(rows, input.focusId) ?? findCell(rows, input.fallbackId) ?? { row: 0, col: 0 };
  return {
    rows,
    focus,
    clearedText: `CLEARED ${clearedCount(input.order, completed)}/${input.order.length}`,
    empty: rows.length === 0,
  };
}

export function focusedCell(model: LevelSelectModel): LevelCell | null {
  return model.rows[model.focus.row]?.cells[model.focus.col] ?? null;
}

/** Arrows and WASD move; Enter/Space starts an open or cleared level; Esc/Backspace goes back to the title. */
export function levelSelectStep(
  model: LevelSelectModel,
  intent: MenuIntent,
): Transition<LevelSelectModel, LevelSelectAction> {
  if (intent.kind === 'back') return { model, action: { type: 'back' } };
  if (intent.kind === 'move') {
    const focus = moveGridFocus(
      model.rows.map((row) => row.cells.length),
      model.focus,
      intent.dir,
    );
    return { model: { ...model, focus }, action: null };
  }
  const cell = focusedCell(model);
  if (intent.kind !== 'choose' || cell === null) return { model, action: null };
  return { model, action: { type: cell.state === 'locked' ? 'locked' : 'start', levelId: cell.id } };
}

export interface DetailLine {
  /** `1-3 RUNWAY`, truncated to 24 characters, drawn at 2x. */
  readonly title: string;
  /** `BEST 0:12.91`, `NOT CLEARED` or `LOCKED - CLEAR 1-2 FIRST`, drawn at 1x. */
  readonly status: string;
}

export function detailLine(model: LevelSelectModel): DetailLine | null {
  const cell = focusedCell(model);
  if (cell === null) return null;
  const title = truncate(levelCaption(cell.id, cell.title), DETAIL_MAX);
  if (cell.state === 'cleared') {
    return { title, status: cell.bestText === null ? 'CLEARED' : `BEST ${cell.bestText}` };
  }
  if (cell.state === 'open') return { title, status: 'NOT CLEARED' };
  const first = cell.lockedBy === null ? '' : ` - CLEAR ${levelLabel(cell.lockedBy)} FIRST`;
  return { title, status: `LOCKED${first}` };
}

/** Bottom line of a cell, drawn at 1x: lock icon, hollow dot, or tick + best time (shape, never color alone). */
export function cellStatusText(cell: LevelCell): string {
  if (cell.state === 'locked') return FONT_ICONS.lock;
  if (cell.state === 'open') return FONT_ICONS.hollowDot;
  return cell.bestText === null ? FONT_ICONS.tick : `${FONT_ICONS.tick} ${cell.bestText}`;
}

export const CELL_W = 64;
export const CELL_H = 32;
export const CELL_GAP = 6;
export const ROW_PITCH = 40;
export const ROWS_Y = 40;
export const LABEL_COL_W = 80;
export const DETAIL_Y = 216;
/** Gap under the last grid row before the detail line (five rows end at y 232). */
const DETAIL_GAP = 4;
/** Status line sits this far under the detail title (2x title is 14 px tall). */
const DETAIL_STATUS_DY = 16;

/** The detail line moves down only as far as the rows need: 216 for up to four rows, 236 for five. */
export function detailY(rowCount: number): number {
  if (rowCount <= 0) return DETAIL_Y;
  return Math.max(DETAIL_Y, ROWS_Y + (rowCount - 1) * ROW_PITCH + CELL_H + DETAIL_GAP);
}

/** Cell rect for a grid position: the world label column is 80 px wide, cells follow with a 6 px gap. */
export function cellRect(row: number, col: number): LayoutItem {
  return box(`cell:${row}:${col}`, MARGIN + LABEL_COL_W + col * (CELL_W + CELL_GAP), ROWS_Y + row * ROW_PITCH, CELL_W, CELL_H);
}

/** Everything the scene draws, as boxes. Cell ids are `cell:<row>:<col>`; texts are `label:...`, `status:...`. */
export function levelSelectLayout(model: LevelSelectModel): readonly LayoutItem[] {
  const out: LayoutItem[] = [
    textItem('heading', HEADING, MARGIN, MARGIN, 2),
    rightText('cleared', model.clearedText, SCREEN_W - MARGIN, MARGIN, 1),
  ];
  if (model.empty) {
    out.push(textItem('empty', NO_LEVELS_TEXT, MARGIN, ROWS_Y, 2));
    return out;
  }
  model.rows.forEach((row, r) => {
    const y = ROWS_Y + r * ROW_PITCH;
    if (model.rows[r - 1]?.world !== row.world) {
      out.push(textItem(`world:${r}`, String(row.world), MARGIN, y, 2), textItem(`worldName:${r}`, row.name, MARGIN, y + 16, 1));
    }
    row.cells.forEach((cell, c) => {
      const rect = cellRect(r, c);
      out.push(rect, textItem(`label:${r}:${c}`, cell.label, rect.x + 4, rect.y + 2, 2));
      out.push(textItem(`status:${r}:${c}`, cellStatusText(cell), rect.x + 4, rect.y + 22, 1));
    });
  });
  const detail = detailLine(model);
  if (detail !== null) {
    const y = detailY(model.rows.length);
    out.push(textItem('detail:title', detail.title, MARGIN, y, 2), textItem('detail:status', detail.status, MARGIN, y + DETAIL_STATUS_DY, 1));
  }
  return out;
}
