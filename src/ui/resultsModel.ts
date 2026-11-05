/**
 * Results panel model (docs/design/features/results.md): level caption, this
 * run's time, the best time, the FIRST CLEAR / NEW BEST marker, and the items
 * NEXT / RETRY / LEVELS. Pure. The scene calls `recordRun` (src/save) exactly
 * once per win, then builds this model from its result.
 *
 * Owner: ui-engineer.
 */
import { formatTime } from '../save/progress';
import type { RunRecordResult } from '../save/progress';
import { FONT_ICONS } from '../fx/pixel/font';
import { levelCaption } from './levelCaption';
import { createList, focusedId, moveList } from './menuFocus';
import type { ListItem, ListState, Transition } from './menuFocus';
import type { MenuIntent, MenuKeyOptions } from './menuInput';
import { ITEM_PITCH, SCREEN_H, SCREEN_W, box, centredText, truncate } from './menuLayout';
import type { LayoutItem } from './menuLayout';

export type ResultsItemId = 'next' | 'retry' | 'levels';

export type ResultsAction =
  | { readonly type: 'next'; readonly levelId: string }
  | { readonly type: 'retry' }
  | { readonly type: 'levels' };

/** The beat between the win step and the panel (0.6 s, a UI constant). Every key is ignored during it. */
export const RESULTS_BEAT_MS = 600;

/** Key switches for `stepMenuInput` on this screen: R retries, P is not a key here. */
export const RESULTS_MENU_KEYS: MenuKeyOptions = { retryKey: true };

export const MARKER_FIRST_CLEAR = 'FIRST CLEAR';
export const MARKER_NEW_BEST = `${FONT_ICONS.star} NEW BEST`;
export const NOT_SAVED = 'NOT SAVED';

export interface ResultsModel {
  readonly list: ListState<ResultsItemId>;
  readonly caption: string;
  readonly clearText: 'CLEAR';
  /** `TIME 0:12.91`: this run. */
  readonly timeText: string;
  /** `BEST 0:11.40` after this run, or null when nothing is stored for the level. */
  readonly bestText: string | null;
  /** FIRST CLEAR, star + NEW BEST, or null (slower, equal, or not recorded). */
  readonly marker: string | null;
  /** Muted `NOT SAVED` line: the record was rejected (not for replay or world 0). */
  readonly notSaved: boolean;
  /** Level NEXT starts, or null when NEXT is not shown. */
  readonly nextLevelId: string | null;
}

export interface ResultsInput {
  readonly levelId: string;
  readonly title: string;
  /** `wonAtStep`. */
  readonly steps: number;
  readonly stepHz: number;
  /** What `recordRun` returned for this win. */
  readonly record: RunRecordResult;
  /** `nextLevel(levelId, order)`: null on the last level and for world 0. */
  readonly nextLevelId: string | null;
}

function markerFor(record: RunRecordResult): string | null {
  if (!record.recorded) return null;
  if (record.firstClear) return MARKER_FIRST_CLEAR;
  return record.newBest ? MARKER_NEW_BEST : null;
}

export function createResultsModel(input: ResultsInput): ResultsModel {
  const items: ListItem<ResultsItemId>[] = [
    ...(input.nextLevelId === null ? [] : [{ id: 'next' as const, label: 'NEXT' }]),
    { id: 'retry', label: 'RETRY' },
    { id: 'levels', label: 'LEVELS' },
  ];
  const { record } = input;
  return {
    // Focus starts on NEXT; without it, on LEVELS.
    list: createList(items, input.nextLevelId === null ? 'levels' : 'next'),
    caption: truncate(levelCaption(input.levelId, input.title), 32),
    clearText: 'CLEAR',
    timeText: `TIME ${formatTime(input.steps, input.stepHz)}`,
    bestText: record.best === null ? null : `BEST ${formatTime(record.best, input.stepHz)}`,
    marker: markerFor(record),
    notSaved: !record.recorded && !record.skipped,
    nextLevelId: input.nextLevelId,
  };
}

/** R and RETRY restart; Esc, Backspace and LEVELS open level select focused on this level. */
export function resultsStep(
  model: ResultsModel,
  intent: MenuIntent,
): Transition<ResultsModel, ResultsAction> {
  switch (intent.kind) {
    case 'move':
      return { model: { ...model, list: moveList(model.list, intent.dir) }, action: null };
    case 'choose':
      return { model, action: chosenAction(model) };
    case 'back':
      return { model, action: { type: 'levels' } };
    case 'retry':
      return { model, action: { type: 'retry' } };
    default:
      return { model, action: null };
  }
}

function chosenAction(model: ResultsModel): ResultsAction | null {
  const id = focusedId(model.list);
  if (id === 'next') return model.nextLevelId === null ? null : { type: 'next', levelId: model.nextLevelId };
  if (id === 'retry') return { type: 'retry' };
  return id === 'levels' ? { type: 'levels' } : null;
}

const PANEL_W = 200;
const PANEL_H = 140;

/** Panel (`panel`), then text lines top to bottom, then the items, all inside the 200x140 panel. */
export function resultsLayout(model: ResultsModel): readonly LayoutItem[] {
  const px = (SCREEN_W - PANEL_W) / 2;
  const py = (SCREEN_H - PANEL_H) / 2;
  const out: LayoutItem[] = [
    box('panel', px, py, PANEL_W, PANEL_H),
    centredText('caption', model.caption, py + 8, 1),
    centredText('clear', model.clearText, py + 20, 2),
    centredText('time', model.timeText, py + 40, 2),
  ];
  if (model.bestText !== null) out.push(centredText('best', model.bestText, py + 58, 1));
  const note = model.marker ?? (model.notSaved ? NOT_SAVED : null);
  if (note !== null) out.push(centredText(model.marker === null ? 'notSaved' : 'marker', note, py + 68, 1));
  model.list.items.forEach((item, index) => {
    out.push(centredText(`item:${item.id}`, item.label, py + 82 + index * ITEM_PITCH, 2));
  });
  return out;
}
