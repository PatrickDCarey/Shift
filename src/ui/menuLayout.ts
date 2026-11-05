/**
 * Layout primitives for the 480x270 menu screens: text boxes in the 5x7 font,
 * centring, and the check that every element sits on integer pixels at least
 * 8 px inside the screen (menu-navigation.md, Layout conventions and check 7).
 * Pure: the scenes only draw what the screen layouts return.
 *
 * Owner: ui-engineer.
 */
import { ADVANCE, LINE_HEIGHT, textWidth } from '../fx/pixel/font';

export const SCREEN_W = 480;
export const SCREEN_H = 270;
/** Nothing is drawn closer than this to an edge. */
export const MARGIN = 8;
/** Gap between a menu caret and its item, and the frame padding around an item. */
export const CARET_GAP = 6;
export const FRAME_PAD = 2;
/** Vertical pitch of a menu list. */
export const ITEM_PITCH = 20;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** One drawable thing: its id (for tests and the scene) and its pixel box. */
export interface LayoutItem extends Rect {
  readonly id: string;
  /** 'text' and 'icon' are drawn with the bitmap font at `scale`; 'box' is a frame, cap or cell. */
  readonly kind: 'text' | 'box';
  readonly scale: number;
  readonly text?: string;
}

/** Pixel width of `text` at an integer font scale. */
export function scaledTextWidth(text: string, scale: number): number {
  return textWidth(text) * scale;
}

export function textHeight(scale: number): number {
  return LINE_HEIGHT * scale;
}

export function advance(scale: number): number {
  return ADVANCE * scale;
}

/** Text box at (x, y). */
export function textItem(id: string, text: string, x: number, y: number, scale = 1): LayoutItem {
  return { id, kind: 'text', text, scale, x, y, w: scaledTextWidth(text, scale), h: textHeight(scale) };
}

/** Text box centred on the screen (or on `centre`), x rounded down to an integer. */
export function centredText(id: string, text: string, y: number, scale = 1, centre = SCREEN_W / 2): LayoutItem {
  const w = scaledTextWidth(text, scale);
  return textItem(id, text, Math.floor(centre - w / 2), y, scale);
}

/** Text box whose right edge is at `right`. */
export function rightText(id: string, text: string, right: number, y: number, scale = 1): LayoutItem {
  return textItem(id, text, right - scaledTextWidth(text, scale), y, scale);
}

export function box(id: string, x: number, y: number, w: number, h: number): LayoutItem {
  return { id, kind: 'box', scale: 1, x, y, w, h };
}

export interface FocusDecoration {
  /** 1 px frame around the item, drawn in `palette.ui.focus`. */
  readonly frame: Rect;
  /** The `>` caret, 6 px left of the item. */
  readonly caret: Rect;
}

/** Caret and frame for a focused text item (focus is shown by shape, never by color alone). */
export function focusDecoration(item: Rect, scale: number): FocusDecoration {
  const caretW = scaledTextWidth('>', scale);
  return {
    frame: { x: item.x - FRAME_PAD, y: item.y - FRAME_PAD, w: item.w + 2 * FRAME_PAD, h: item.h + 2 * FRAME_PAD },
    caret: { x: item.x - CARET_GAP - caretW, y: item.y, w: caretW, h: item.h },
  };
}

/** Rects of every item's focus decoration, for the margin check. */
export function decorationRects(items: readonly LayoutItem[]): readonly LayoutItem[] {
  return items.flatMap((item) => {
    const deco = focusDecoration(item, item.scale);
    return [
      { ...deco.frame, id: `${item.id}:frame`, kind: 'box' as const, scale: 1 },
      { ...deco.caret, id: `${item.id}:caret`, kind: 'box' as const, scale: 1 },
    ];
  });
}

/** Ids of items that are off the integer grid or closer than 8 px to an edge. Empty means the layout is valid. */
export function layoutViolations(items: readonly (Rect & { readonly id?: string })[]): readonly string[] {
  const bad: string[] = [];
  items.forEach((item, index) => {
    const ints = [item.x, item.y, item.w, item.h].every(Number.isInteger);
    const inside =
      item.x >= MARGIN && item.y >= MARGIN && item.x + item.w <= SCREEN_W - MARGIN && item.y + item.h <= SCREEN_H - MARGIN;
    if (!ints || !inside) bad.push(item.id ?? `#${index}`);
  });
  return bad;
}

/** Truncate to `max` characters (no ellipsis, as the spec's "truncated at 24 characters"). */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}
