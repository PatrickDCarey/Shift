/**
 * Key bindings: physical `KeyboardEvent.code` values -> logical actions.
 *
 * Pure and data-driven (no Phaser, no DOM). A future remap screen only has to
 * produce a different `Bindings` value (see `withBinding` and
 * `sanitizeBindings`); nothing else in this file changes.
 *
 * Why `code` and not `key`/keyCode: only `code` tells ShiftLeft from
 * ShiftRight, and it is independent of keyboard layout (WASD stays WASD on
 * AZERTY).
 *
 * Owner: ui-engineer. Spec: docs/design/gdd.md section 3.
 */

/** Logical actions the game understands. */
export type Action = 'left' | 'right' | 'jump' | 'shiftUp' | 'shiftDown' | 'restart' | 'pause';

/** Canonical order; also the order used when resolving remap conflicts. */
export const ACTIONS: readonly Action[] = ['left', 'right', 'jump', 'shiftUp', 'shiftDown', 'restart', 'pause'];

/**
 * Held (level) state per action. A superset of the sim's `InputFrame`
 * (`left | right | jump | shiftUp | shiftDown`), so it can be passed wherever an
 * `InputFrame` is expected; `restart` and `pause` are for scene code only.
 */
export type HeldActions = Readonly<Record<Action, boolean>>;

/** The sim's five buttons, structurally identical to `InputFrame` in src/core/types.ts. */
export interface SimButtons {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly shiftUp: boolean;
  readonly shiftDown: boolean;
}

/** Physical key codes bound to each action. Any one of them triggers the action. */
export type Bindings = Readonly<Record<Action, readonly string[]>>;

/**
 * Default set (GDD section 3). All bindings are active at once.
 * Gear keys: Right Shift / E / X shift up, Left Shift / Q / Z shift down, so
 * the Windows Sticky Keys shortcut (Shift x5) is never required.
 */
export const DEFAULT_BINDINGS: Bindings = Object.freeze({
  left: Object.freeze(['ArrowLeft', 'KeyA']),
  right: Object.freeze(['ArrowRight', 'KeyD']),
  jump: Object.freeze(['Space', 'KeyW', 'ArrowUp']),
  shiftUp: Object.freeze(['ShiftRight', 'KeyE', 'KeyX']),
  shiftDown: Object.freeze(['ShiftLeft', 'KeyQ', 'KeyZ']),
  restart: Object.freeze(['KeyR']),
  pause: Object.freeze(['Escape', 'KeyP']),
});

const NONE_HELD: HeldActions = Object.freeze({
  left: false,
  right: false,
  jump: false,
  shiftUp: false,
  shiftDown: false,
  restart: false,
  pause: false,
});

/**
 * Turn the set of currently held physical codes into held logical actions.
 * An action is held when ANY of its bound codes is held.
 */
export function heldActions(heldCodes: Iterable<string>, bindings: Bindings = DEFAULT_BINDINGS): HeldActions {
  const held: ReadonlySet<string> = heldCodes instanceof Set ? heldCodes : new Set(heldCodes);
  if (held.size === 0) return NONE_HELD;
  const result = { ...NONE_HELD };
  for (const action of ACTIONS) {
    result[action] = bindings[action].some((code) => held.has(code));
  }
  return result;
}

/** The sim buttons of a held-actions value (drops `restart` and `pause`). */
export function toSimButtons(held: HeldActions): SimButtons {
  return {
    left: held.left,
    right: held.right,
    jump: held.jump,
    shiftUp: held.shiftUp,
    shiftDown: held.shiftDown,
  };
}

/** Every action a single physical code triggers (usually zero or one). */
export function actionsForCode(code: string, bindings: Bindings = DEFAULT_BINDINGS): readonly Action[] {
  return ACTIONS.filter((action) => bindings[action].includes(code));
}

/**
 * Every code the game uses. Feed this to Phaser's `keyboard.addCapture` /
 * `preventDefault` so Space and the arrows never scroll the itch.io page.
 */
export function boundCodes(bindings: Bindings = DEFAULT_BINDINGS): readonly string[] {
  return [...new Set(ACTIONS.flatMap((action) => bindings[action]))];
}

/**
 * Immutable remap: give `action` exactly `codes`, taking those codes away from
 * every other action so one key never does two things. Returns a new object.
 */
export function withBinding(bindings: Bindings, action: Action, codes: readonly string[]): Bindings {
  const claimed = new Set(codes);
  const next = {} as Record<Action, readonly string[]>;
  for (const other of ACTIONS) {
    next[other] = other === action ? [...claimed] : bindings[other].filter((code) => !claimed.has(code));
  }
  return next;
}

/** `KeyboardEvent.code` values look like "KeyQ", "ShiftLeft", "Digit1", "NumpadEnter". */
/** More codes than this for one action is corrupt data; the rest is never looked at. */
const MAX_CODES_PER_ACTION = 16;
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

/**
 * Validate bindings read from storage or a remap screen. Anything malformed
 * (wrong type, bad code strings, an action left with no keys) falls back to
 * `fallback` for that action only. Always returns a complete `Bindings`.
 */
export function sanitizeBindings(raw: unknown, fallback: Bindings = DEFAULT_BINDINGS): Bindings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const result = {} as Record<Action, readonly string[]>;
  for (const action of ACTIONS) {
    const value = Object.prototype.hasOwnProperty.call(source, action) ? source[action] : undefined;
    const codes = Array.isArray(value)
      ? [...new Set(value.slice(0, MAX_CODES_PER_ACTION).filter((c): c is string => typeof c === 'string' && CODE_PATTERN.test(c)))]
      : [];
    result[action] = codes.length > 0 ? codes : fallback[action];
  }
  return result;
}

const NAMED_LABELS: Readonly<Record<string, string>> = {
  ShiftLeft: 'L Shift',
  ShiftRight: 'R Shift',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: 'Space',
  Escape: 'Esc',
  Enter: 'Enter',
};

/** Short human label for a key code, for on-screen key caps ("KeyQ" -> "Q"). */
export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return NAMED_LABELS[code] ?? code;
}
