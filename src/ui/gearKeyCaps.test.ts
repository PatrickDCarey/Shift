import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, withBinding } from './bindings';
import { gearKeyCaps, SHIFT_GLYPH } from './gearKeyCaps';

describe('gearKeyCaps', () => {
  it('defaults: Q and Shift to shift down, E and Shift to shift up', () => {
    expect(gearKeyCaps()).toEqual({ down: ['Q', SHIFT_GLYPH], up: ['E', SHIFT_GLYPH] });
  });

  it('follows a remap: the first letter key bound, Shift only if one is still bound', () => {
    const remapped = withBinding(withBinding(DEFAULT_BINDINGS, 'shiftUp', ['KeyK']), 'shiftDown', ['ShiftLeft']);
    expect(gearKeyCaps(remapped)).toEqual({ down: [SHIFT_GLYPH], up: ['K'] });
  });

  it('falls back to the first key label when no letter is bound', () => {
    const odd = withBinding(DEFAULT_BINDINGS, 'shiftUp', ['ArrowUp']);
    expect(gearKeyCaps(odd).up).toEqual(['↑']);
  });
});
