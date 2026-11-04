/**
 * The key-cap hints beside the gear meter: which keys shift down (left of the
 * strip) and up (right). Derived from the bindings, so a future remap screen
 * changes the hints for free. Pure; no Phaser.
 *
 * Spec: docs/design/features/hud-gear-meter.md, "Key hints": `Q` / Shift for
 * down, `E` / Shift for up.
 *
 * Owner: ui-engineer.
 */
import { DEFAULT_BINDINGS, keyLabel, type Bindings } from './bindings';

/** Stands for either Shift key on a cap (the bitmap font will draw its own glyph). */
export const SHIFT_GLYPH = '⇧';

export interface GearKeyCaps {
  /** Cap labels for shifting down, most memorable key first. */
  readonly down: readonly string[];
  /** Cap labels for shifting up. */
  readonly up: readonly string[];
}

const isShift = (code: string): boolean => code.startsWith('Shift');

function capsFor(codes: readonly string[]): readonly string[] {
  const letter = codes.find((c) => /^Key[A-Z]$/.test(c)) ?? codes.find((c) => !isShift(c));
  const shift = codes.some(isShift);
  return [...(letter === undefined ? [] : [keyLabel(letter)]), ...(shift ? [SHIFT_GLYPH] : [])];
}

export function gearKeyCaps(bindings: Bindings = DEFAULT_BINDINGS): GearKeyCaps {
  return { down: capsFor(bindings.shiftDown), up: capsFor(bindings.shiftUp) };
}
