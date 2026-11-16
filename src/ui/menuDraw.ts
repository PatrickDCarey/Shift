/**
 * Draw plans for the title and level select scenes: pure lists of text and
 * rectangles with a colour *role* (the scene maps roles to `palette.ui`).
 * Focus is always shown by shape (frame and caret), never by colour alone
 * (menu-navigation.md). All coordinates are whole pixels inside the margin.
 *
 * Owner: ui-engineer.
 */
import { cellRect, CELL_H, CELL_W, levelSelectLayout } from './levelSelectModel';
import type { LevelSelectModel } from './levelSelectModel';
import { focusedId } from './menuFocus';
import { focusDecoration, textItem } from './menuLayout';
import type { LayoutItem, Rect } from './menuLayout';
import { titleLayout } from './titleModel';
import type { TitleModel } from './titleModel';

export type ColourRole = 'text' | 'muted' | 'focus' | 'border';

export interface DrawText {
  readonly id: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly role: ColourRole;
}

export interface DrawRect extends Rect {
  readonly role: ColourRole;
}

export interface DrawPlan {
  readonly texts: readonly DrawText[];
  /** Filled rectangles; outlines are already split into four bars. */
  readonly rects: readonly DrawRect[];
}

/** An outline of `t` px drawn outside `r`, as four bars. */
export function outlineBars(r: Rect, t: number, role: ColourRole): readonly DrawRect[] {
  const x = r.x - t;
  const y = r.y - t;
  const w = r.w + 2 * t;
  const h = r.h + 2 * t;
  return [
    { x, y, w, h: t, role },
    { x, y: y + h - t, w, h: t, role },
    { x, y: y + t, w: t, h: h - 2 * t, role },
    { x: x + w - t, y: y + t, w: t, h: h - 2 * t, role },
  ];
}

function asText(item: LayoutItem, role: ColourRole): DrawText {
  return { id: item.id, text: item.text ?? '', x: item.x, y: item.y, scale: item.scale, role };
}

export function titleDrawPlan(model: TitleModel): DrawPlan {
  const focus = focusedId(model.list);
  const texts: DrawText[] = [];
  const rects: DrawRect[] = [];
  for (const item of titleLayout(model)) {
    const focused = item.id === `item:${focus}`;
    const role: ColourRole = item.id === 'name' || focused ? 'text' : 'muted';
    texts.push(asText(item, role));
    if (focused) {
      const deco = focusDecoration(item, item.scale);
      rects.push(...outlineBars({ x: deco.frame.x + 1, y: deco.frame.y + 1, w: deco.frame.w - 2, h: deco.frame.h - 2 }, 1, 'focus'));
      texts.push(asText(textItem('caret', '>', deco.caret.x, deco.caret.y, item.scale), 'focus'));
    }
  }
  return { texts, rects };
}

export function levelSelectDrawPlan(model: LevelSelectModel): DrawPlan {
  const texts: DrawText[] = [];
  const rects: DrawRect[] = [];
  for (const item of levelSelectLayout(model)) {
    if (item.kind === 'box') continue;
    const m = /^(label|status):(\d+):(\d+)$/.exec(item.id);
    const state = m === null ? null : model.rows[Number(m[2])]?.cells[Number(m[3])]?.state;
    const strong = m === null ? item.id === 'heading' || item.id === 'detail:title' : state !== 'locked';
    texts.push(asText(item, strong ? 'text' : 'muted'));
  }
  model.rows.forEach((row, r) =>
    row.cells.forEach((c, col) => {
      const rect = cellRect(r, col);
      const focused = r === model.focus.row && col === model.focus.col;
      // Cleared cells get a second inner bar, so the three states differ by shape too.
      rects.push(...outlineBars({ x: rect.x + 1, y: rect.y + 1, w: CELL_W - 2, h: CELL_H - 2 }, 1, c.state === 'locked' ? 'border' : 'muted'));
      if (c.state === 'cleared') rects.push(...outlineBars({ x: rect.x + 2, y: rect.y + 2, w: CELL_W - 4, h: CELL_H - 4 }, 1, 'border'));
      if (focused) rects.push(...outlineBars(rect, 2, 'focus'));
    }),
  );
  return { texts, rects };
}
