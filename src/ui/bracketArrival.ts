/**
 * PT-5 (docs/design/features/clarity-fixes.md): the selected-gear bracket is thin
 * until the lit cell reaches it ("arrived"), then bold. Pure; derived from the
 * meter model so `gearMeterModel` and its tests stay as they are.
 *
 * `litBand` is always `state.band` (pinned in gearMeter.test.ts), so the model
 * cannot disagree with the sim; the rule only needs the two fields.
 *
 * Owner: ui-engineer.
 */
import type { GearMeterModel } from './gearMeter';

/** True when the lit band is the selected gear: standing in gear 1 is false (white lit), walking in gear 1 is true. */
export function bracketArrived(model: Pick<GearMeterModel, 'litBand' | 'selectedGear'>): boolean {
  return model.litBand === model.selectedGear;
}
