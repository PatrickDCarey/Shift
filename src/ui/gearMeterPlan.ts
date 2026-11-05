/**
 * The HUD gear meter as a drawing plan: a pure function from a model, a layout
 * and the key-cap labels to plain rectangles and numbers. The Phaser view only
 * executes it, so every placement rule (bracket on the selected cell, needle
 * position, drag fill width, hint columns) is unit-tested without a canvas.
 *
 * Coordinates are relative to the meter's top-left corner. No Phaser, no DOM.
 * Body-agnostic: one plan per body, so a second strip for Tandem (T-06) is a
 * second call with its own model and layout.
 *
 * Owner: ui-engineer. Spec: docs/design/features/hud-gear-meter.md.
 */
import { BAND_COLORS, BANDS, GEARS, type Band, type BandColor, type Gear } from '../core/types';
import { palette } from '../fx/palette';
import type { GearKeyCaps } from './gearKeyCaps';
import type { GearMeterModel } from './gearMeter';
import type { GearMeterLayout } from './gearMeterLayout';

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
  readonly pattern: string;
  /** The band you are in: solid glyph. Others are ghost glyphs. */
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
  /** Centre x of the triangle. */
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

export interface GearMeterPlan {
  readonly panel: Rect;
  readonly cells: readonly PlanCell[];
  readonly digits: readonly PlanDigit[];
  /** Solid frame on the selected gear's cell. */
  readonly bracket: Rect;
  /** Dashed frame on the gear a buffered shift will apply. */
  readonly pending: Rect | null;
  readonly needle: PlanNeedle;
  readonly drag: { readonly frame: Rect; readonly fill: Rect } | null;
  /** Highlight over the cell that just lit after a drag drop. */
  readonly pulse: Rect | null;
  readonly hints: readonly PlanHint[];
}

const cellX = (l: GearMeterLayout, i: number): number => l.cellsX + i * l.pitch;
const cellRect = (l: GearMeterLayout, i: number): Rect => ({ x: cellX(l, i), y: l.cellY, w: l.cell, h: l.cell });

function bracketRect(l: GearMeterLayout, i: number): Rect {
  const size = l.cell + l.bracketOut * 2;
  return { x: cellX(l, i) - l.bracketOut, y: l.cellY - l.bracketOut, w: size, h: size };
}

function dragPlan(l: GearMeterLayout, fill: number | null): GearMeterPlan['drag'] {
  if (fill === null) return null;
  const rowW = l.cell + l.pitch * (BANDS.length - 1);
  const frame: Rect = { x: l.cellsX, y: l.dragY, w: rowW, h: l.dragH };
  const inner = { x: frame.x + 1, y: frame.y + 1, w: frame.w - 2, h: frame.h - 2 };
  return { frame, fill: { ...inner, w: Math.max(0, inner.w * fill) } };
}

function hintPlan(l: GearMeterLayout, side: 'down' | 'up', labels: readonly string[]): PlanHint {
  const colX = side === 'down' ? l.pad : l.panelW - l.pad - l.hintW;
  const capX = colX + (l.hintW - l.hintCapW) / 2;
  return {
    side,
    dir: side,
    caps: labels.map((label, i) => ({
      label,
      rect: { x: capX, y: l.cellY + i * (l.hintCapH + l.hintCapGap), w: l.hintCapW, h: l.hintCapH },
    })),
    arrow: { x: colX + (l.hintW - l.hintArrowW) / 2, y: l.hintArrowY, w: l.hintArrowW, h: l.hintArrowH },
  };
}

function hintsPlan(l: GearMeterLayout, caps: GearKeyCaps): readonly PlanHint[] {
  return [
    ...(caps.down.length > 0 ? [hintPlan(l, 'down', caps.down)] : []),
    ...(caps.up.length > 0 ? [hintPlan(l, 'up', caps.up)] : []),
  ];
}

/**
 * Everything the meter draws for one body in one frame. `pulseBand` is the cell
 * a drop pulse is lighting (from `updateDropPulse`), or null.
 */
export function gearMeterPlan(
  model: GearMeterModel,
  l: GearMeterLayout,
  caps: GearKeyCaps,
  pulseBand: Band | null,
): GearMeterPlan {
  return {
    panel: { x: 0, y: 0, w: l.panelW, h: l.panelH },
    cells: BANDS.map((band, i) => ({
      band,
      color: BAND_COLORS[band],
      pattern: palette.gears[BAND_COLORS[band]].pattern,
      lit: band === model.litBand,
      x: cellX(l, i),
      y: l.cellY,
      size: l.cell,
    })),
    digits: GEARS.map((gear) => ({
      gear,
      x: cellX(l, gear) + l.cell / 2,
      y: l.digitY,
      bright: gear === model.selectedGear,
    })),
    bracket: bracketRect(l, model.selectedGear),
    pending: model.pendingGear === null ? null : bracketRect(l, model.pendingGear),
    needle: {
      x: cellX(l, 0) + l.cell / 2 + model.needle * l.pitch,
      top: l.needleTop,
      h: l.needleH,
      halfW: l.needleHalfW,
    },
    drag: dragPlan(l, model.dragFill),
    pulse: pulseBand === null ? null : cellRect(l, pulseBand),
    hints: hintsPlan(l, caps),
  };
}
