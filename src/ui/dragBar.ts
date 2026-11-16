/**
 * PT-4: the drag bar runs on the needle's axis from the needle toward the centre
 * of the next lower cell (`litBand - 1`), filled by the model's `dragFill`, and
 * ends in a chevron pointing at that cell. Spans are in cell units (cell 0's
 * centre is 0), so the plan only multiplies by its pitch. Pure.
 *
 * Owner: ui-engineer.
 */
import type { GearMeterModel } from './gearMeter';

export interface DragBarSpan {
  /** Where the bar starts: the needle, in cell units. */
  readonly fromCell: number;
  /** Where it ends: the centre of cell `litBand - 1`. `fromCell >= toCell`. */
  readonly toCell: number;
  /** 0..1 of the span filled, growing from the needle. */
  readonly fill: number;
}

/** Null when the model hides the bar (ground, blue or white) or there is no lower cell. */
export function dragBarSpan(model: Pick<GearMeterModel, 'dragFill' | 'litBand' | 'needle'>): DragBarSpan | null {
  if (model.dragFill === null || model.litBand < 1) return null;
  const toCell = model.litBand - 1;
  return { fromCell: Math.max(model.needle, toCell), toCell, fill: Math.min(1, Math.max(0, model.dragFill)) };
}
