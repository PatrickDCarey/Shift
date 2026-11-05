/**
 * Focus movement shared by the menu models: lists (title, pause, results,
 * controls) and the level-select grid. No wrap anywhere: moving past an edge
 * leaves the focus where it is (menu-navigation.md). Pure.
 *
 * Owner: ui-engineer.
 */
import type { Direction } from './menuInput';

/** The result of feeding one intent to a screen model: the new model and what the scene should do. */
export interface Transition<M, A> {
  readonly model: M;
  readonly action: A | null;
}

/** Vertical lists move on up/down only; left/right do nothing. */
export function moveListFocus(index: number, count: number, dir: Direction): number {
  if (count <= 0) return 0;
  if (dir === 'up') return Math.max(0, index - 1);
  if (dir === 'down') return Math.min(count - 1, index + 1);
  return Math.min(Math.max(0, index), count - 1);
}

export interface GridFocus {
  readonly row: number;
  readonly col: number;
}

/**
 * Grid movement: left/right stay inside the row; up/down keep the column and
 * land on the last cell when the target row is shorter. `rowLengths[i]` is the
 * number of cells in row i.
 */
export function moveGridFocus(rowLengths: readonly number[], focus: GridFocus, dir: Direction): GridFocus {
  const rows = rowLengths.length;
  if (rows === 0) return { row: 0, col: 0 };
  const row = Math.min(Math.max(0, focus.row), rows - 1);
  const len = rowLengths[row] ?? 0;
  const col = Math.min(Math.max(0, focus.col), Math.max(0, len - 1));
  if (dir === 'left') return { row, col: Math.max(0, col - 1) };
  if (dir === 'right') return { row, col: Math.min(Math.max(0, len - 1), col + 1) };
  const target = dir === 'up' ? Math.max(0, row - 1) : Math.min(rows - 1, row + 1);
  const targetLen = rowLengths[target] ?? 0;
  return { row: target, col: Math.min(col, Math.max(0, targetLen - 1)) };
}

export interface ListItem<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
}

export interface ListState<Id extends string = string> {
  readonly items: readonly ListItem<Id>[];
  readonly focus: number;
}

/** A list with focus on `focusId` (the first item when it is absent or unknown). */
export function createList<Id extends string>(items: readonly ListItem<Id>[], focusId?: Id): ListState<Id> {
  const index = focusId === undefined ? 0 : items.findIndex((item) => item.id === focusId);
  return { items, focus: Math.max(0, index) };
}

export function focusedId<Id extends string>(list: ListState<Id>): Id | null {
  return list.items[list.focus]?.id ?? null;
}

export function moveList<Id extends string>(list: ListState<Id>, dir: Direction): ListState<Id> {
  const focus = moveListFocus(list.focus, list.items.length, dir);
  return focus === list.focus ? list : { ...list, focus };
}
