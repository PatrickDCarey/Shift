// Menus, HUD, settings. Owner: ui-engineer.
//
// Pure modules only here: safe to import from tests and from src/core-adjacent
// code. Phaser components are imported by file (e.g. './StickyKeysTipView').

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
