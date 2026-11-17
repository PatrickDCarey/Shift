/**
 * DOM wiring for `InputSampler`: native keydown/keyup on the window.
 * The handlers are plain functions over a minimal event shape so they can be
 * unit-tested without a browser; `attachKeyboard` is the only DOM-touching part.
 *
 * Owner: gameplay-engineer [scene].
 */
import { boundCodes } from '../ui/bindings';
import type { InputSampler } from './inputSampler';
import { planKey, type OverlayGate } from './overlayGate';

/** The slice of `KeyboardEvent` the handlers read. */
export interface KeyEventLike {
  readonly code: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  /** `KeyboardEvent.timeStamp` (ms); only the overlay gate reads it. */
  readonly timeStamp?: number;
  preventDefault(): void;
}

/** The debug overlay toggle. */
export const DEBUG_TOGGLE_CODE = 'Backquote';

/** Browser shortcuts (Ctrl+R reload, Alt+Left back, ...) are not ours to take. */
function hasShortcutModifier(e: KeyEventLike): boolean {
  return e.ctrlKey === true || e.metaKey === true || e.altKey === true;
}

const eventMs = (e: KeyEventLike): number => e.timeStamp ?? Number.POSITIVE_INFINITY;

/** Feed a keydown to the sampler. Bound codes never reach the page (no iframe scroll), except under an overlay (see `planKey`). */
export function handleKeyDown(sampler: InputSampler, bound: ReadonlySet<string>, e: KeyEventLike, gate?: OverlayGate): void {
  if (hasShortcutModifier(e) || !bound.has(e.code)) return;
  const plan = planKey(gate, e.code, eventMs(e), true);
  if (plan.prevent) e.preventDefault();
  if (plan.feed) sampler.keyDown(e.code);
}

/** Releases always go through, even with a modifier down, so no key sticks. */
export function handleKeyUp(sampler: InputSampler, bound: ReadonlySet<string>, e: KeyEventLike, gate?: OverlayGate): void {
  if (!bound.has(e.code)) return;
  if (planKey(gate, e.code, eventMs(e), false).prevent) e.preventDefault();
  sampler.keyUp(e.code);
}

export interface KeyboardOptions {
  /** Called on each backtick press (not on key repeat). */
  readonly onToggleDebug?: () => void;
  /** Called when the page loses focus (window blur, tab hidden), after held keys were dropped. */
  readonly onFocusLost?: () => void;
  /** Keys an open Pause or Results overlay owns; they are ignored (and not prevented) while it is open. */
  readonly gate?: OverlayGate;
}

/**
 * Listen on the window; returns a function that removes every listener.
 * Order does not matter for the overlays: the gate keeps overlay keys un-prevented
 * (Phaser drops `defaultPrevented` events), so Pause and Results see them even if
 * this listener runs before Phaser's or `MenuKeys`'.
 */
export function attachKeyboard(sampler: InputSampler, options: KeyboardOptions = {}): () => void {
  const bound: ReadonlySet<string> = new Set(boundCodes());
  const onDown = (e: KeyboardEvent): void => {
    if (e.code === DEBUG_TOGGLE_CODE && !e.repeat) options.onToggleDebug?.();
    handleKeyDown(sampler, bound, e, options.gate);
  };
  const onUp = (e: KeyboardEvent): void => handleKeyUp(sampler, bound, e, options.gate);
  const onFocusLost = (): void => {
    sampler.clear();
    options.onFocusLost?.();
  };
  const onBlur = (): void => onFocusLost();
  const onVisibility = (): void => {
    if (document.hidden) onFocusLost();
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
