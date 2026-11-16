/**
 * Controls screen model (docs/design/features/controls-screen.md). The rows
 * are GENERATED from the `Bindings` value, so the screen cannot drift from
 * what the game reads; only the action order and labels are fixed here.
 *
 * Owner: ui-engineer.
 */
import { ADVANCE } from '../fx/pixel/font';
import { DEFAULT_BINDINGS, keyLabel } from './bindings';
import type { Action, Bindings } from './bindings';
import { createList, focusedId, moveList } from './menuFocus';
import type { ListItem, ListState, Transition } from './menuFocus';
import type { MenuIntent } from './menuInput';
import { MARGIN, SCREEN_H, SCREEN_W, box, scaledTextWidth, textItem } from './menuLayout';
import type { LayoutItem } from './menuLayout';

/** Fixed row order and labels; `actions` are the bound actions whose keys fill the row. */
export const CONTROL_ROWS: readonly { readonly id: string; readonly label: string; readonly actions: readonly Action[] }[] = [
  { id: 'move', label: 'MOVE (HOLD)', actions: ['left', 'right'] },
  { id: 'shiftUp', label: 'SHIFT UP', actions: ['shiftUp'] },
  { id: 'shiftDown', label: 'SHIFT DOWN', actions: ['shiftDown'] },
  { id: 'jump', label: 'JUMP', actions: ['jump'] },
  { id: 'restart', label: 'RESTART', actions: ['restart'] },
  { id: 'pause', label: 'PAUSE', actions: ['pause'] },
];

export const CONTROLS_HEADING = 'CONTROLS';
export const CONTROLS_MENU_ROW = 'MENUS: ARROWS/WASD MOVE  ENTER/SPACE CHOOSE  ESC BACK';

export interface ControlsRow {
  readonly id: string;
  readonly label: string;
  /** Bound key codes, each exactly once. */
  readonly codes: readonly string[];
  /** `keyLabel(code)` for each code, same order. */
  readonly caps: readonly string[];
}

export type ControlsItemId = 'tip' | 'back';

export interface ControlsModel {
  readonly rows: readonly ControlsRow[];
  readonly list: ListState<ControlsItemId>;
}

export type ControlsAction = 'back' | 'showTip';

export interface ControlsInput {
  readonly bindings?: Bindings;
  /** `isWindows(readPlatform())`: adds SHOW STICKY KEYS TIP. */
  readonly windows: boolean;
}

/** Keys of several actions interleaved by position (`← → A D`), unique, in binding order. */
function interleavedCodes(bindings: Bindings, actions: readonly Action[]): readonly string[] {
  const longest = Math.max(0, ...actions.map((action) => bindings[action].length));
  const codes: string[] = [];
  for (let i = 0; i < longest; i++) {
    for (const action of actions) {
      const code = bindings[action][i];
      if (code !== undefined && !codes.includes(code)) codes.push(code);
    }
  }
  return codes;
}

export function controlsRows(bindings: Bindings = DEFAULT_BINDINGS): readonly ControlsRow[] {
  return CONTROL_ROWS.map((row) => {
    const codes = interleavedCodes(bindings, row.actions);
    return { id: row.id, label: row.label, codes, caps: codes.map(keyLabel) };
  });
}

export function createControlsModel(input: ControlsInput): ControlsModel {
  const items: ListItem<ControlsItemId>[] = [
    ...(input.windows ? [{ id: 'tip' as const, label: 'SHOW STICKY KEYS TIP' }] : []),
    { id: 'back', label: 'BACK' },
  ];
  return { rows: controlsRows(input.bindings), list: createList(items, 'back') };
}

/** Back (Esc, Backspace, BACK) returns to where the screen was opened from; the scene knows where. */
export function controlsStep(model: ControlsModel, intent: MenuIntent): Transition<ControlsModel, ControlsAction> {
  if (intent.kind === 'move') return { model: { ...model, list: moveList(model.list, intent.dir) }, action: null };
  if (intent.kind === 'back') return { model, action: 'back' };
  if (intent.kind !== 'choose') return { model, action: null };
  const id = focusedId(model.list);
  return { model, action: id === 'tip' ? 'showTip' : id === 'back' ? 'back' : null };
}

const LABEL_X = 16;
const CAPS_X = 120;
const CAP_GAP = 6;
const CAP_H = 11;
const ROWS_Y = 36;
const ROW_PITCH = 20;
const WRAP_LINE = 12;

/** Padding added to a cap's text width (1 px border each side plus 3 px air). */
const CAP_PAD = 5;

/** Cap box width: one font advance per character plus `CAP_PAD`. */
export function capWidth(label: string): number {
  return ADVANCE * label.length + CAP_PAD;
}

/** Heading, rows (label + one cap per code, wrapping before x 472), the menu row and the items. */
export function controlsLayout(model: ControlsModel): readonly LayoutItem[] {
  const out: LayoutItem[] = [textItem('heading', CONTROLS_HEADING, MARGIN, MARGIN, 2)];
  let y = ROWS_Y;
  for (const row of model.rows) {
    out.push(textItem(`label:${row.id}`, row.label, LABEL_X, y + 2, 1));
    let x = CAPS_X;
    let line = 0;
    row.caps.forEach((cap, i) => {
      const w = capWidth(cap);
      if (x + w > SCREEN_W - MARGIN && x > CAPS_X) {
        x = CAPS_X;
        line += 1;
      }
      const capY = y + line * WRAP_LINE;
      out.push(box(`cap:${row.id}:${i}`, x, capY, w, CAP_H));
      out.push(textItem(`capText:${row.id}:${i}`, cap, x + 3, capY + 2, 1));
      x += w + CAP_GAP;
    });
    y += ROW_PITCH + line * WRAP_LINE;
  }
  out.push(textItem('menuRow', CONTROLS_MENU_ROW, LABEL_X, y + 4, 1));
  const count = model.list.items.length;
  const bottom = SCREEN_H - MARGIN - 16 - 2; // frame padding below the last item stays inside the margin
  model.list.items.forEach((item, index) => {
    const w = scaledTextWidth(item.label, 2);
    out.push(textItem(`item:${item.id}`, item.label, Math.floor((SCREEN_W - w) / 2), bottom - (count - 1 - index) * ROW_PITCH, 2));
  });
  return out;
}
