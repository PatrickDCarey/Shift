/**
 * The HUD gear meter as a drawing plan: a pure function from a model, a layout
 * and the key-cap labels to plain rectangles and numbers. The Phaser view only
 * executes it, so every placement rule (bracket on the selected cell, needle
 * position, drag bar span, hint columns) is unit-tested without a canvas.
 *
 * Coordinates are whole pixels relative to the meter's top-left corner. No
 * Phaser, no DOM. Body-agnostic: one plan per body, so a second strip for
 * Tandem is a second call with its own model and layout.
 *
 * Owner: ui-engineer. Spec: docs/design/features/hud-gear-meter.md, clarity-fixes.md.
 */
import { BAND_COLORS, BANDS, GEARS, type Band, type BandColor, type Gear } from '../core/types';
import { palette } from '../fx/palette';
import type { PatternId } from '../fx/patterns';
import { bracketArrived } from './bracketArrival';
import { dragBarSpan, type DragBarSpan } from './dragBar';
import type { GearKeyCaps } from './gearKeyCaps';
import type { GearMeterModel } from './gearMeter';
import type { GearMeterLayout } from './gearMeterLayout';
import type { CueView } from './neededColourCue';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PlanCell {
  readonly band: Band;
  readonly color: BandColor;
  /** Pattern id from palette.json: the non-colour signal. */
  readonly pattern: PatternId;
  /** The band you are in: the only filled cell. Others are ghosts. */
  readonly lit: boolean;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface PlanDigit {
  readonly gear: Gear;
  /** Centre x. */
  readonly x: number;
  /** Top y. */
  readonly y: number;
  readonly bright: boolean;
}

export interface PlanNeedle {
  /** Column of the triangle's apex (a whole pixel). */
  readonly x: number;
  readonly top: number;
  readonly h: number;
  readonly halfW: number;
}

export interface PlanKeyCap {
  readonly label: string;
  readonly rect: Rect;
}

export interface PlanHint {
  readonly side: 'down' | 'up';
  /** Direction of the little arrow under the caps. */
  readonly dir: 'down' | 'up';
  readonly caps: readonly PlanKeyCap[];
  readonly arrow: Rect;
}

export interface PlanDrag {
  readonly span: DragBarSpan;
  /** Outline of the bar; width 0 when the span is too short to hold one (only the chevron shows). */
  readonly frame: Rect;
  readonly fill: Rect;
  /** Left-pointing chevron at the end of the bar, over the next lower cell. */
  readonly chevron: Rect;
}

/** PT-6: dotted track from the needle to the selected gear's bracket, with a chevron at that end. */
export interface PlanTrack {
  /** Needle column. */
  readonly from: number;
  /** Centre column of the selected gear's cell (the chevron's tip). */
  readonly to: number;
  readonly y: number;
  /** Right-pointing chevron whose tip sits at `to`. */
  readonly chevron: Rect;
}

export interface GearMeterPlan {
  readonly panel: Rect;
  readonly cells: readonly PlanCell[];
  readonly digits: readonly PlanDigit[];
  /** Frame on the selected gear's cell. */
  readonly bracket: Rect;
  /** PT-5: bold once the lit cell has reached the selected gear, thin and dim before. */
  readonly bracketBold: boolean;
  /** Dashed frame on the gear a buffered shift will apply. */
  readonly pending: Rect | null;
  readonly needle: PlanNeedle;
  /** PT-4: bar from the needle to the next lower cell. */
  readonly drag: PlanDrag | null;
  /** PT-6: grounded and the selected gear is above the lit band; else null. */
  readonly track: PlanTrack | null;
  /** Highlight over the cell that just lit after a drag drop, or that a cue pulses. */
  readonly pulse: Rect | null;
  /** PT-3: 1 px ring on the cell of the colour you needed. */
  readonly ring: Rect | null;
  readonly hints: readonly PlanHint[];
  /** Where a Tandem strip draws its body glyph; null when the layout has none. */
  readonly glyph: Rect | null;
}

const cellX = (l: GearMeterLayout, i: number): number => l.cellsX + i * l.pitch;
const cellRect = (l: GearMeterLayout, i: number): Rect => ({ x: cellX(l, i), y: l.cellY, w: l.cell, h: l.cell });
/** Pixel column of a cell's centre; the needle and the drag bar share it. */
const centreCol = (l: GearMeterLayout, i: number): number => cellX(l, i) + Math.floor(l.cell / 2);

function bracketRect(l: GearMeterLayout, i: number): Rect {
  const size = l.cell + l.bracketOut * 2;
  return { x: cellX(l, i) - l.bracketOut, y: l.cellY - l.bracketOut, w: size, h: size };
}

/** B5: every width is floored, so the bar is pixel-snapped like the rest of the HUD. */
function dragPlan(l: GearMeterLayout, model: GearMeterModel): PlanDrag | null {
  const span = l.showDrag ? dragBarSpan(model) : null;
  if (span === null) return null;
  const from = centreCol(l, 0) + Math.round(span.fromCell * l.pitch);
  const to = centreCol(l, 0) + Math.round(span.toCell * l.pitch);
  const chevron: Rect = { x: to, y: l.dragY, w: l.chevronW, h: l.dragH };
  const frameX = to + l.chevronW + 1;
  const frameW = from - frameX + 1;
  const frame: Rect = { x: frameX, y: l.dragY + 1, w: frameW >= 3 ? frameW : 0, h: l.dragH - 2 };
  const innerW = Math.max(0, frame.w - 2);
  const fillW = Math.floor(innerW * span.fill);
  const fill: Rect = { x: frame.x + 1 + innerW - fillW, y: frame.y + 1, w: fillW, h: Math.max(0, frame.h - 2) };
  return { span, frame, fill, chevron };
}

/** PT-6: "you are here, you are heading there". Grounded, not arrived, and the needle behind the bracket. */
export function trackPlan(l: GearMeterLayout, model: GearMeterModel): PlanTrack | null {
  if (!l.showTrack || model.airborne || model.selectedGear <= model.litBand) return null;
  const from = centreCol(l, 0) + Math.round(model.needle * l.pitch);
  const to = centreCol(l, model.selectedGear);
  if (to <= from) return null;
  const { trackChevronW: w, trackChevronH: h } = l;
  return { from, to, y: l.trackY, chevron: { x: to - (w - 1), y: l.trackY - (h - 1) / 2, w, h } };
}

function hintPlan(l: GearMeterLayout, side: 'down' | 'up', labels: readonly string[]): PlanHint {
  const colX = side === 'down' ? l.pad : l.panelW - l.pad - l.hintW;
  const capX = colX + Math.floor((l.hintW - l.hintCapW) / 2);
  return {
    side,
    dir: side,
    caps: labels.map((label, i) => ({
      label,
      rect: { x: capX, y: l.cellY + i * (l.hintCapH + l.hintCapGap), w: l.hintCapW, h: l.hintCapH },
    })),
    arrow: { x: colX + Math.floor((l.hintW - l.hintArrowW) / 2), y: l.hintArrowY, w: l.hintArrowW, h: l.hintArrowH },
  };
}

function hintsPlan(l: GearMeterLayout, caps: GearKeyCaps): readonly PlanHint[] {
  if (!l.showHints) return [];
  return [
    ...(caps.down.length > 0 ? [hintPlan(l, 'down', caps.down)] : []),
    ...(caps.up.length > 0 ? [hintPlan(l, 'up', caps.up)] : []),
  ];
}

/**
 * Everything the meter draws for one body in one frame. `pulseBand` is the cell
 * a drop pulse is lighting (from `updateDropPulse`), or null. `cue` is the PT-3
 * needed-colour cue (from `cueView`): its cell is ringed, and pulsed while
 * `cue.pulse` is set (a drop pulse wins when both are on).
 */
export function gearMeterPlan(
  model: GearMeterModel,
  l: GearMeterLayout,
  caps: GearKeyCaps,
  pulseBand: Band | null,
  cue: CueView | null = null,
): GearMeterPlan {
  const pulse = pulseBand ?? (cue?.pulse === true ? cue.ringBand : null);
  return {
    panel: { x: 0, y: 0, w: l.panelW, h: l.panelH },
    cells: BANDS.map((band, i) => ({
      band,
      color: BAND_COLORS[band],
      pattern: palette.gears[BAND_COLORS[band]].pattern as PatternId,
      lit: band === model.litBand,
      x: cellX(l, i),
      y: l.cellY,
      size: l.cell,
    })),
    digits: l.showDigits
      ? GEARS.map((gear) => ({
          gear,
          x: cellX(l, gear) + l.cell / 2,
          y: l.digitY,
          bright: gear === model.selectedGear,
        }))
      : [],
    bracket: bracketRect(l, model.selectedGear),
    bracketBold: bracketArrived(model),
    pending: model.pendingGear === null ? null : bracketRect(l, model.pendingGear),
    needle: {
      x: centreCol(l, 0) + Math.round(model.needle * l.pitch),
      top: l.needleTop,
      h: l.needleH,
      halfW: l.needleHalfW,
    },
    drag: dragPlan(l, model),
    track: trackPlan(l, model),
    pulse: pulse === null ? null : cellRect(l, pulse),
    ring: cue === null ? null : cellRect(l, cue.ringBand),
    hints: hintsPlan(l, caps),
    glyph: l.glyph,
  };
}
