/**
 * Title screen model (docs/design/features/title-screen.md): three items,
 * PLAY / LEVELS / CONTROLS, the PLAY target, and the not-saved notice. Pure;
 * the scene draws `titleLayout(model)` and applies the returned action.
 *
 * Owner: ui-engineer.
 */
import { playTarget } from '../save/progress';
import type { CompletedIds, LevelEntry } from '../save/progress';
import { levelCaption } from './levelCaption';
import { createList, focusedId, moveList } from './menuFocus';
import type { ListItem, ListState, Transition } from './menuFocus';
import type { MenuIntent } from './menuInput';
import { FRAME_PAD, ITEM_PITCH, MARGIN, SCREEN_H, centredText, textItem } from './menuLayout';
import type { LayoutItem } from './menuLayout';

export type TitleItemId = 'play' | 'levels' | 'controls';

export const TITLE_NAME = 'REDSHIFT';
export const TITLE_FOOTER = 'GAME OFF 2026';
export const TITLE_NOT_SAVED = 'PROGRESS IS NOT SAVED IN THIS WINDOW';

const ITEMS: readonly ListItem<TitleItemId>[] = [
  { id: 'play', label: 'PLAY' },
  { id: 'levels', label: 'LEVELS' },
  { id: 'controls', label: 'CONTROLS' },
];

export interface TitleModel {
  readonly list: ListState<TitleItemId>;
  /** Id PLAY starts, or null (everything cleared, or no levels). */
  readonly playTargetId: string | null;
  /** `1-3 RUNWAY` under PLAY, or null when `playTargetId` is null. */
  readonly playTargetText: string | null;
  /** True when no world >= 1 level is loaded (dev only): PLAY opens level select. */
  readonly noLevels: boolean;
  /** `store.isPersistent()` is false: show the not-saved line. */
  readonly notSavedNotice: boolean;
}

export type TitleAction =
  | { readonly type: 'start'; readonly levelId: string }
  | { readonly type: 'levels' }
  | { readonly type: 'controls' };

export interface TitleInput {
  readonly order: readonly LevelEntry[];
  readonly completed: CompletedIds;
  readonly persistent: boolean;
  /** Which item starts focused: PLAY at boot, LEVELS or CONTROLS when coming back. */
  readonly focusId?: TitleItemId;
}

export function createTitleModel(input: TitleInput): TitleModel {
  const targetId = playTarget(input.order, input.completed);
  const entry = input.order.find((level) => level.id === targetId);
  return {
    list: createList(ITEMS, input.focusId),
    playTargetId: targetId,
    playTargetText: entry === undefined ? null : levelCaption(entry.id, entry.title),
    noLevels: input.order.length === 0,
    notSavedNotice: !input.persistent,
  };
}

function chosen(model: TitleModel): TitleAction | null {
  switch (focusedId(model.list)) {
    case 'play':
      return model.playTargetId === null ? { type: 'levels' } : { type: 'start', levelId: model.playTargetId };
    case 'levels':
      return { type: 'levels' };
    case 'controls':
      return { type: 'controls' };
    default:
      return null;
  }
}

/** Esc and Backspace do nothing here: a browser game has nothing to quit to. */
export function titleStep(model: TitleModel, intent: MenuIntent): Transition<TitleModel, TitleAction> {
  if (intent.kind === 'move') return { model: { ...model, list: moveList(model.list, intent.dir) }, action: null };
  if (intent.kind === 'choose') return { model, action: chosen(model) };
  return { model, action: null };
}

const NAME_Y = 40;
const NAME_SCALE = 4;
const ITEMS_Y = 140;
const FOOTER_Y = SCREEN_H - MARGIN - 8;

/** Boxes for the scene to draw. Item ids are `item:<id>`; the focused one also needs `focusDecoration`. */
export function titleLayout(model: TitleModel): readonly LayoutItem[] {
  const items = model.list.items.map((item, index) =>
    centredText(`item:${item.id}`, item.label, ITEMS_Y + index * ITEM_PITCH, 2),
  );
  const out: LayoutItem[] = [centredText('name', TITLE_NAME, NAME_Y, NAME_SCALE), ...items];
  const play = items[0];
  // The list pitch (20 px) leaves no room for a line under PLAY, so the target sits beside it.
  if (model.playTargetText !== null && play !== undefined) {
    out.push(textItem('playTarget', model.playTargetText, play.x + play.w + 2 * FRAME_PAD + 8, play.y + 4, 1));
  }
  out.push(textItem('footer:left', TITLE_FOOTER, MARGIN, FOOTER_Y, 1));
  if (model.notSavedNotice) out.push(centredText('footer:notSaved', TITLE_NOT_SAVED, FOOTER_Y, 1));
  return out;
}
