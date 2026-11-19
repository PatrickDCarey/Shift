/**
 * Draw plans for the panel screens (pause, results, controls): pure lists of
 * text and rectangles with a colour role. Focus is shown by a caret and a 1 px
 * frame as well as colour (menu-navigation.md); NEXT/RETRY/LEVELS differ in
 * size and wording, never in colour alone.
 *
 * Owner: ui-engineer.
 */
import type { ControlsModel } from './controlsModel';
import { controlsLayout } from './controlsModel';
import { asText, outlineBars } from './menuDraw';
import type { ColourRole, DrawPlan, DrawRect, DrawText } from './menuDraw';
import { focusedId } from './menuFocus';
import type { ListState } from './menuFocus';
import { focusDecoration, textItem } from './menuLayout';
import type { LayoutItem } from './menuLayout';
import type { PauseModel } from './pauseModel';
import { pauseLayout } from './pauseModel';
import type { ResultsModel } from './resultsModel';
import { resultsLayout } from './resultsModel';
import type { SettingsModel, SettingsValues } from './settingsModel';
import { settingsLayout } from './settingsModel';

/** The two lit pixels of the 2x2 dither tile (a checkerboard: 50%). */
export const DITHER_CELLS: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 1],
];

/** The results NEXT LEVEL line stays in the primary colour even when focus has moved off it. */
const PRIMARY_ITEM = 'item:next';

const MUTED_IDS = new Set(['best', 'notSaved', 'menuRow', 'time', 'caption']);

function roleOf(item: LayoutItem): ColourRole {
  if (item.id.startsWith('label:') || MUTED_IDS.has(item.id)) return 'muted';
  return 'text';
}

function panelRects(item: LayoutItem): readonly DrawRect[] {
  const r = { x: item.x, y: item.y, w: item.w, h: item.h };
  return [{ ...r, role: 'panel' }, ...outlineBars({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 }, 1, 'border')];
}

/** Turn a layout into a plan: the `panel` box is filled and framed, `cap:` boxes outlined, `item:<id>` focus decorated. */
export function layoutDrawPlan(layout: readonly LayoutItem[], list: ListState): DrawPlan {
  const focus = focusedId(list);
  const texts: DrawText[] = [];
  const rects: DrawRect[] = [];
  for (const item of layout) {
    if (item.kind === 'box') {
      rects.push(...(item.id === 'panel' ? panelRects(item) : outlineBars({ x: item.x + 1, y: item.y + 1, w: item.w - 2, h: item.h - 2 }, 1, 'muted')));
      continue;
    }
    const focused = item.id === `item:${focus}`;
    const primary = focused || item.id === PRIMARY_ITEM || item.id.startsWith('item:') === false;
    texts.push(asText(item, primary ? roleOf(item) : 'muted'));
    if (!focused) continue;
    const deco = focusDecoration(item, item.scale);
    rects.push(...outlineBars({ x: deco.frame.x + 1, y: deco.frame.y + 1, w: deco.frame.w - 2, h: deco.frame.h - 2 }, 1, 'focus'));
    texts.push(asText(textItem('caret', '>', deco.caret.x, deco.caret.y, item.scale), 'focus'));
  }
  return { texts, rects };
}

export const pauseDrawPlan = (model: PauseModel): DrawPlan => layoutDrawPlan(pauseLayout(model), model.list);
export const resultsDrawPlan = (model: ResultsModel): DrawPlan => layoutDrawPlan(resultsLayout(model), model.list);
export const controlsDrawPlan = (model: ControlsModel): DrawPlan => layoutDrawPlan(controlsLayout(model), model.list);

/**
 * Settings: the generic panel plan for text and focus, plus a 9x9 glyph per
 * toggle drawn by shape: a 1 px frame when OFF, frame and solid fill when ON.
 */
export function settingsDrawPlan(model: SettingsModel): DrawPlan {
  const layout = settingsLayout(model);
  const base = layoutDrawPlan(layout.filter((i) => i.kind !== 'box'), model.list);
  const glyphs: DrawRect[] = [];
  for (const item of layout) {
    if (item.kind !== 'box') continue;
    const on = model.values[item.id.slice('glyph:'.length) as keyof SettingsValues];
    glyphs.push(...outlineBars({ x: item.x + 1, y: item.y + 1, w: item.w - 2, h: item.h - 2 }, 1, 'text'));
    if (on) glyphs.push({ x: item.x + 1, y: item.y + 1, w: item.w - 2, h: item.h - 2, role: 'text' });
  }
  return { texts: base.texts, rects: [...base.rects, ...glyphs] };
}
