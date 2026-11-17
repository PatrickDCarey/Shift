/**
 * Onboarding hint glyphs as a draw plan (docs/design/features/onboarding-hints.md,
 * "Drawing"): key caps on a panel with a focus outline, 5 x 7 font labels, an
 * optional triangle. Pure: (glyph, anchor cell, bindings) in, integer world-pixel
 * rectangles and labels out; `HintView` only draws the plan. Caps are generated
 * from the bindings, so a glyph never shows a key that does not work.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { HintGlyph, LevelHint, TilePos } from '../core/types';
import { ADVANCE, FONT_ICONS } from '../fx';
import { DEFAULT_BINDINGS, keyLabel, type Action, type Bindings } from '../ui';

export const HINT_CAP_H = 11;
const CAP_ROW_GAP = 2;
const CAP_COL_GAP = 2;
const ARROW_W = 5;
const ARROW_GAP = 2;
const LABEL_INSET = 2;
export const HINT_BOX_MAX_W = 48;
export const HINT_BOX_MAX_H = 2 * HINT_CAP_H + CAP_ROW_GAP;

export interface HintDef {
  readonly glyph: HintGlyph;
  /** Actions whose bound codes become caps, in display order. */
  readonly actions: readonly Action[];
  /** Triangle left of the top row, or null. */
  readonly arrow: string | null;
  /** True for jump: Space is the top row and the arrows fall to the bottom row. */
  readonly spaceOnTop: boolean;
}

const DEFS: Readonly<Record<HintGlyph, HintDef>> = {
  move: { glyph: 'move', actions: ['left', 'right'], arrow: null, spaceOnTop: false },
  shiftUp: { glyph: 'shiftUp', actions: ['shiftUp'], arrow: FONT_ICONS.triangleUp, spaceOnTop: false },
  shiftDown: { glyph: 'shiftDown', actions: ['shiftDown'], arrow: FONT_ICONS.triangleDown, spaceOnTop: false },
  jump: { glyph: 'jump', actions: ['jump'], arrow: null, spaceOnTop: true },
};

/** The glyph definition for an id, or null for an unknown id. */
export function hintDef(id: string): HintDef | null {
  return Object.hasOwn(DEFS, id) ? DEFS[id as HintGlyph] : null;
}

export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface HintLabel {
  readonly text: string;
  /** Top-left of the label's 5 x 8 glyph cells, world px. */
  readonly x: number;
  readonly y: number;
}

export interface HintCapPlan {
  readonly code: string;
  readonly rect: PixelRect;
  readonly label: HintLabel;
}

export interface HintPlan {
  readonly glyph: HintGlyph;
  /** The whole glyph, world px (at most 48 x 24). */
  readonly box: PixelRect;
  readonly caps: readonly HintCapPlan[];
  readonly arrow: HintLabel | null;
}

/** Short cap label: the font has these (L and R shift, SPACE, arrows); never the long `L Shift`. */
export function hintCapLabel(code: string): string {
  switch (code) {
    case 'ShiftLeft':
      return `L${FONT_ICONS.shift}`;
    case 'ShiftRight':
      return `R${FONT_ICONS.shift}`;
    case 'Space':
      return 'SPACE';
    case 'ArrowLeft':
      return FONT_ICONS.arrowLeft;
    case 'ArrowRight':
      return FONT_ICONS.arrowRight;
    case 'ArrowUp':
      return FONT_ICONS.arrowUp;
    case 'ArrowDown':
      return FONT_ICONS.arrowDown;
    default:
      return keyLabel(code).toUpperCase();
  }
}

const isArrow = (c: string): boolean => c.startsWith('Arrow');
const isShift = (c: string): boolean => c.startsWith('Shift');
const isLetter = (c: string): boolean => /^Key[A-Z]$/.test(c);

/** Top row, then bottom row of key codes. */
function rowsFor(def: HintDef, bindings: Bindings): readonly [readonly string[], readonly string[]] {
  const codes = [...new Set(def.actions.flatMap((a) => bindings[a]))];
  const onTop = (c: string): boolean => (def.spaceOnTop ? c === 'Space' : isArrow(c) || isShift(c));
  const top = codes.filter(onTop);
  const rest = codes.filter((c) => !onTop(c));
  return [top, [...rest.filter(isLetter), ...rest.filter((c) => !isLetter(c))]];
}

const capWidth = (label: string): number => ADVANCE * label.length + 5;

interface RowItem {
  readonly code: string;
  readonly w: number;
}

function rowWidth(items: readonly RowItem[], leadW: number): number {
  const caps = items.reduce((sum, i) => sum + i.w, 0) + CAP_COL_GAP * Math.max(0, items.length - 1);
  return caps + leadW;
}

/** The draw plan for one hint at its anchor cell. `tileSize` is `tuning.tileSize`. */
export function hintPlan(def: HintDef, anchor: TilePos, tileSize: number, bindings: Bindings = DEFAULT_BINDINGS): HintPlan {
  const rows = rowsFor(def, bindings).map((codes) => codes.map((code) => ({ code, w: capWidth(hintCapLabel(code)) })));
  const arrowSpan = def.arrow === null ? 0 : ARROW_W + ARROW_GAP;
  const widths = rows.map((items, i) => rowWidth(items, i === 0 ? arrowSpan : 0));
  const boxW = Math.max(0, ...widths);
  const left = anchor.col * tileSize + Math.floor(tileSize / 2) - Math.floor(boxW / 2);
  const top = (anchor.row + 1) * tileSize - HINT_BOX_MAX_H;
  const caps: HintCapPlan[] = [];
  let arrow: HintLabel | null = null;
  rows.forEach((items, r) => {
    const y = top + r * (HINT_CAP_H + CAP_ROW_GAP);
    let x = left + Math.floor((boxW - (widths[r] ?? 0)) / 2);
    if (r === 0 && def.arrow !== null) {
      arrow = { text: def.arrow, x, y: y + LABEL_INSET };
      x += arrowSpan;
    }
    for (const item of items) {
      caps.push({
        code: item.code,
        rect: { x, y, w: item.w, h: HINT_CAP_H },
        label: { text: hintCapLabel(item.code), x: x + LABEL_INSET, y: y + LABEL_INSET },
      });
      x += item.w + CAP_COL_GAP;
    }
  });
  return { glyph: def.glyph, box: { x: left, y: top, w: boxW, h: HINT_BOX_MAX_H }, caps, arrow };
}

/** Plans for every hint of a level, in file order; an unknown glyph id (the parser rejects them) is skipped. */
export function hintPlans(
  hints: readonly LevelHint[] | undefined,
  tileSize: number,
  bindings: Bindings = DEFAULT_BINDINGS,
): readonly HintPlan[] {
  return (hints ?? []).flatMap((h) => {
    const def = hintDef(h.glyph);
    return def === null ? [] : [hintPlan(def, h.anchor, tileSize, bindings)];
  });
}
