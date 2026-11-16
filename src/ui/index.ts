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
export { COMPACT_STRIP_LAYOUT, GEAR_METER_LAYOUT } from './gearMeterLayout';
export type { GearMeterLayout, GlyphSlot } from './gearMeterLayout';
export { bracketArrived } from './bracketArrival';
export { dragBarSpan } from './dragBar';
export type { DragBarSpan } from './dragBar';
export { CUE_FRAMES, CUE_PULSE_FRAMES, cueView, startCue, updateCue } from './neededColourCue';
export type { CueInput, CueView, NeededColourCue, NeededColourEvent } from './neededColourCue';
export { gearMeterPlan } from './gearMeterPlan';
export type { GearMeterPlan, PlanCell, PlanDrag, PlanDigit, PlanHint, PlanKeyCap, PlanNeedle, Rect } from './gearMeterPlan';
export { applyAudioSettings, toggleMuted, updateAudioSetting } from './audioSettings';
export type { AudioSink } from './audioSettings';
export { levelCaption } from './levelCaption';
export {
  MENU_CAPTURE_CODES,
  NO_INTENT,
  createMenuInput,
  resolveIntent,
  stepMenuInput,
} from './menuInput';
export type { Direction, MenuInputState, MenuInputStep, MenuIntent, MenuKeyOptions } from './menuInput';
export { createList, focusedId, moveGridFocus, moveList, moveListFocus } from './menuFocus';
export type { GridFocus, ListItem, ListState, Transition } from './menuFocus';
export {
  MARGIN,
  SCREEN_H,
  SCREEN_W,
  centredText,
  decorationRects,
  focusDecoration,
  layoutViolations,
  textItem,
} from './menuLayout';
export type { FocusDecoration, LayoutItem, Rect as MenuRect } from './menuLayout';
export { TITLE_NAME, createTitleModel, titleLayout, titleStep } from './titleModel';
export type { TitleAction, TitleInput, TitleItemId, TitleModel } from './titleModel';
export {
  DEFAULT_WORLD_NAMES,
  cellRect,
  cellStatusText,
  createLevelSelectModel,
  detailLine,
  focusedCell,
  levelSelectLayout,
  levelSelectStep,
} from './levelSelectModel';
export type {
  DetailLine,
  LevelCell,
  LevelSelectAction,
  LevelSelectInput,
  LevelSelectModel,
  WorldRow,
} from './levelSelectModel';
export { PAUSE_MENU_KEYS, createPauseModel, pauseLayout, pauseStep } from './pauseModel';
export type { PauseAction, PauseInput, PauseItemId, PauseModel } from './pauseModel';
export { RESULTS_BEAT_MS, RESULTS_MENU_KEYS, createResultsModel, resultsLayout, resultsStep } from './resultsModel';
export type { ResultsAction, ResultsInput, ResultsItemId, ResultsModel } from './resultsModel';
export { CONTROL_ROWS, controlsLayout, controlsRows, controlsStep, createControlsModel } from './controlsModel';
export type { ControlsAction, ControlsInput, ControlsItemId, ControlsModel, ControlsRow } from './controlsModel';
