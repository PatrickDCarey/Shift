/**
 * Menu input: turns the set of held key codes into at most one intent per
 * frame, following docs/design/features/menu-navigation.md. Pure, immutable:
 * `stepMenuInput` returns a new state and the intent.
 *
 * Rules implemented here:
 * - One press, one move: only a fresh key-down (edge) acts, no auto-repeat.
 * - A key already held when the screen opens does nothing until released
 *   (the fresh-press rule that stops results choosing NEXT by itself).
 * - Several keys on one frame: Back > Choose > Retry > Move. Two moves on the
 *   same axis cancel; if both axes remain, vertical wins.
 * - Shift, Q, E, Z and X are not menu keys and never produce an intent.
 * - While `blocked` (a fade, the results beat) nothing acts and every key held
 *   meanwhile is masked afterwards: inputs are dropped, not queued.
 *
 * Owner: ui-engineer.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export type MenuIntent =
  | { readonly kind: 'none' }
  | { readonly kind: 'move'; readonly dir: Direction }
  | { readonly kind: 'choose' }
  | { readonly kind: 'back' }
  | { readonly kind: 'retry' };

export const NO_INTENT: MenuIntent = Object.freeze({ kind: 'none' });

const MOVE_CODES: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const CHOOSE_CODES: readonly string[] = ['Enter', 'NumpadEnter', 'Space'];
const BACK_CODES: readonly string[] = ['Escape', 'Backspace'];
const RETRY_CODE = 'KeyR';
/** Closes pause, so it counts as Back on the pause screen only. */
const PAUSE_CODE = 'KeyP';

/** Per-screen switches for the keys that only some screens use. */
export interface MenuKeyOptions {
  /** R means retry (pause and results). */
  readonly retryKey?: boolean;
  /** P means back (pause closes). */
  readonly pauseKey?: boolean;
}

export interface MenuInputState {
  /** Codes held on the previous frame. */
  readonly prev: ReadonlySet<string>;
  /** Codes that must be released before they count again. */
  readonly masked: ReadonlySet<string>;
}

/** Start state for a screen that opens while `heldAtOpen` keys are down. */
export function createMenuInput(heldAtOpen: Iterable<string> = []): MenuInputState {
  const held = new Set(heldAtOpen);
  return { prev: held, masked: held };
}

/** Every code any menu reads, for `keyboard.addCapture` (arrows and Space must not scroll the iframe). */
export const MENU_CAPTURE_CODES: readonly string[] = [
  ...Object.keys(MOVE_CODES),
  ...CHOOSE_CODES,
  ...BACK_CODES,
  RETRY_CODE,
  PAUSE_CODE,
];

function pressedWith(fresh: ReadonlySet<string>, codes: readonly string[]): boolean {
  return codes.some((code) => fresh.has(code));
}

function resolveMove(fresh: ReadonlySet<string>): Direction | null {
  const count = { up: 0, down: 0, left: 0, right: 0 };
  for (const code of fresh) {
    const dir = MOVE_CODES[code];
    if (dir !== undefined) count[dir] += 1;
  }
  const dy = Math.sign(count.down - count.up);
  const dx = Math.sign(count.right - count.left);
  if (dy !== 0) return dy > 0 ? 'down' : 'up';
  if (dx !== 0) return dx > 0 ? 'right' : 'left';
  return null;
}

/** Pick the one intent for the fresh key-downs of this frame. */
export function resolveIntent(fresh: ReadonlySet<string>, options: MenuKeyOptions = {}): MenuIntent {
  const backCodes = options.pauseKey === true ? [...BACK_CODES, PAUSE_CODE] : BACK_CODES;
  if (pressedWith(fresh, backCodes)) return { kind: 'back' };
  if (pressedWith(fresh, CHOOSE_CODES)) return { kind: 'choose' };
  if (options.retryKey === true && fresh.has(RETRY_CODE)) return { kind: 'retry' };
  const dir = resolveMove(fresh);
  return dir === null ? NO_INTENT : { kind: 'move', dir };
}

export interface MenuInputStep {
  readonly state: MenuInputState;
  readonly intent: MenuIntent;
}

/**
 * One frame of menu input.
 * @param held every `KeyboardEvent.code` physically down now
 * @param blocked true during a fade or the results beat
 */
export function stepMenuInput(
  state: MenuInputState,
  held: Iterable<string>,
  options: MenuKeyOptions & { readonly blocked?: boolean } = {},
): MenuInputStep {
  const now = new Set(held);
  // A masked code stays masked only while it stays down.
  const masked = new Set([...state.masked].filter((code) => now.has(code)));
  if (options.blocked === true) {
    return { state: { prev: now, masked: new Set([...masked, ...now]) }, intent: NO_INTENT };
  }
  const fresh = new Set([...now].filter((code) => !state.prev.has(code) && !masked.has(code)));
  return { state: { prev: now, masked }, intent: resolveIntent(fresh, options) };
}
