/**
 * DOM wiring for `InputSampler`: native keydown/keyup on the window.
 * The handlers are plain functions over a minimal event shape so they can be
 * unit-tested without a browser; `attachKeyboard` is the only DOM-touching part.
 *
 * Owner: gameplay-engineer [scene].
 */
import { boundCodes } from '../ui/bindings';
import type { InputSampler } from './inputSampler';

/** The slice of `KeyboardEvent` the handlers read. */
export interface KeyEventLike {
  readonly code: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  preventDefault(): void;
}

/** The debug overlay toggle. */
export const DEBUG_TOGGLE_CODE = 'Backquote';

/** Browser shortcuts (Ctrl+R reload, Alt+Left back, ...) are not ours to take. */
function hasShortcutModifier(e: KeyEventLike): boolean {
  return e.ctrlKey === true || e.metaKey === true || e.altKey === true;
}

/** Feed a keydown to the sampler. Bound codes never reach the page (no iframe scroll). */
export function handleKeyDown(sampler: InputSampler, bound: ReadonlySet<string>, e: KeyEventLike): void {
  if (hasShortcutModifier(e) || !bound.has(e.code)) return;
  e.preventDefault();
  sampler.keyDown(e.code);
}

/** Releases always go through, even with a modifier down, so no key sticks. */
export function handleKeyUp(sampler: InputSampler, bound: ReadonlySet<string>, e: KeyEventLike): void {
  if (!bound.has(e.code)) return;
  e.preventDefault();
  sampler.keyUp(e.code);
}

export interface KeyboardOptions {
  /** Called on each backtick press (not on key repeat). */
  readonly onToggleDebug?: () => void;
}

/** Listen on the window; returns a function that removes every listener. */
export function attachKeyboard(sampler: InputSampler, options: KeyboardOptions = {}): () => void {
  const bound: ReadonlySet<string> = new Set(boundCodes());
  const onDown = (e: KeyboardEvent): void => {
    if (e.code === DEBUG_TOGGLE_CODE && !e.repeat) options.onToggleDebug?.();
    handleKeyDown(sampler, bound, e);
  };
  const onUp = (e: KeyboardEvent): void => handleKeyUp(sampler, bound, e);
  const onBlur = (): void => sampler.clear();
  const onVisibility = (): void => {
    if (document.hidden) sampler.clear();
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
