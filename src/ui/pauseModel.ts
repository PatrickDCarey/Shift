/**
 * Pause menu model (docs/design/features/pause.md): RESUME, RESTART, CONTROLS,
 * LEVELS, plus the panel's level caption and run time. Pure. Freezing the sim,
 * masking keys and auto-pause on blur are the scene's job (gameplay-engineer).
 *
 * Esc, Backspace and P all close the pause (`menuKeys` below turns P on).
 * R is RESTART.
 *
 * Owner: ui-engineer.
 */
import { formatTime } from '../save/progress';
import { levelCaption } from './levelCaption';
import { createList, focusedId, moveList } from './menuFocus';
import type { ListItem, ListState, Transition } from './menuFocus';
import type { MenuIntent, MenuKeyOptions } from './menuInput';
import { ITEM_PITCH, SCREEN_H, SCREEN_W, box, centredText, scaledTextWidth, truncate } from './menuLayout';
import type { LayoutItem } from './menuLayout';

export type PauseItemId = 'resume' | 'restart' | 'controls' | 'settings' | 'levels';

export type PauseAction = 'resume' | 'restart' | 'controls' | 'settings' | 'levels';

/** Key switches for `stepMenuInput` on this screen: R restarts, P closes. */
export const PAUSE_MENU_KEYS: MenuKeyOptions = { retryKey: true, pauseKey: true };

const ITEMS: readonly ListItem<PauseItemId>[] = [
  { id: 'resume', label: 'RESUME' },
  { id: 'restart', label: 'RESTART' },
  { id: 'controls', label: 'CONTROLS' },
  { id: 'settings', label: 'SETTINGS' },
  { id: 'levels', label: 'LEVELS' },
];

export interface PauseModel {
  readonly list: ListState<PauseItemId>;
  /** `1-3 RUNWAY`, truncated to fit the panel. */
  readonly caption: string;
  /** `TIME 0:07.33` from `state.step / stepHz`. */
  readonly timeText: string;
}

export interface PauseInput {
  readonly levelId: string;
  readonly title: string;
  /** `state.step` at the moment of pausing. */
  readonly step: number;
  readonly stepHz: number;
  /** CONTROLS when returning from the controls screen. */
  readonly focusId?: PauseItemId;
  /** A checkpoint post is lit (`state.checkpoint` present). */
  readonly postLit?: boolean;
}

const CAPTION_MAX = 24;

/** Label only: R and the item are a full restart either way. */
export const RESTART_LABEL = 'RESTART';
export const RESTART_LABEL_POST_LIT = 'RESTART FROM START';

export function createPauseModel(input: PauseInput): PauseModel {
  const items = input.postLit === true
    ? ITEMS.map((i) => (i.id === 'restart' ? { ...i, label: RESTART_LABEL_POST_LIT } : i))
    : ITEMS;
  return {
    list: createList(items, input.focusId),
    caption: truncate(levelCaption(input.levelId, input.title), CAPTION_MAX),
    timeText: `TIME ${formatTime(input.step, input.stepHz)}`,
  };
}

export function pauseStep(model: PauseModel, intent: MenuIntent): Transition<PauseModel, PauseAction> {
  switch (intent.kind) {
    case 'move':
      return { model: { ...model, list: moveList(model.list, intent.dir) }, action: null };
    case 'choose':
      return { model, action: focusedId(model.list) };
    case 'back':
      return { model, action: 'resume' };
    case 'retry':
      return { model, action: 'restart' };
    default:
      return { model, action: null };
  }
}

const PANEL_W = 160;
const PANEL_H = 140;
const PAD = 8;
/** Side room between the longest label and the panel edge (caret and frame). */
const PANEL_PAD_X = 24;

/** Panel box (id `panel`), caption, time and the five items, all inside the 160x140 panel. */
export function pauseLayout(model: PauseModel): readonly LayoutItem[] {
  const longest = Math.max(...model.list.items.map((i) => scaledTextWidth(i.label, 2)));
  const panelW = Math.max(PANEL_W, longest + 2 * PANEL_PAD_X);
  const px = Math.floor((SCREEN_W - panelW) / 2);
  const py = (SCREEN_H - PANEL_H) / 2;
  const items = model.list.items.map((item, index) =>
    centredText(`item:${item.id}`, item.label, py + 40 + index * ITEM_PITCH, 2),
  );
  return [
    box('panel', px, py, panelW, PANEL_H),
    centredText('caption', model.caption, py + PAD, 1),
    centredText('time', model.timeText, py + PAD + 12, 1),
    ...items,
  ];
}
