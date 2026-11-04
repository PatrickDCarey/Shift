// Menus, HUD, settings. Owner: ui-engineer.
//
// Pure modules only here: safe to import from tests and from src/core-adjacent
// code. Phaser components are imported by file (e.g. './StickyKeysTipView',
// './GearMeterView').

export {
  ACTIONS,
  DEFAULT_BINDINGS,
  actionsForCode,
  boundCodes,
  heldActions,
  keyLabel,
  sanitizeBindings,
  toSimButtons,
  withBinding,
} from './bindings';
export type { Action, Bindings, HeldActions, SimButtons } from './bindings';
export {
  STICKY_TIP_AUTO_HIDE_MS,
  STICKY_TIP_DISMISS_CODES,
  isStickyTipDismissCode,
  isWindows,
  readPlatform,
  shouldShowStickyKeysTip,
} from './stickyKeysTip';
export type { PlatformInfo, StickyTipContext } from './stickyKeysTip';
export { INITIAL_GEAR_METER_MODEL, gearMeterModel } from './gearMeter';
export type { GearMeterModel, GearMeterParams } from './gearMeter';
export { isDragDrop, updateDropPulse } from './dropPulse';
export type { DropPulse, DropPulseOptions } from './dropPulse';
export { SHIFT_GLYPH, gearKeyCaps } from './gearKeyCaps';
export type { GearKeyCaps } from './gearKeyCaps';
export { GEAR_METER_LAYOUT } from './gearMeterLayout';
export type { GearMeterLayout } from './gearMeterLayout';
export { gearMeterPlan } from './gearMeterPlan';
export type { GearMeterPlan, PlanCell, PlanDigit, PlanHint, PlanKeyCap, PlanNeedle, Rect } from './gearMeterPlan';
