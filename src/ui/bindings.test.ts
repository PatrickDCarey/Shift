import { describe, expect, it } from 'vitest';
import {
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
import type { Action } from './bindings';

const only = (...actions: Action[]): Action[] => ACTIONS.filter((a) => actions.includes(a));

function heldList(codes: string[]): Action[] {
  const held = heldActions(codes);
  return ACTIONS.filter((a) => held[a]);
}

describe('heldActions (defaults)', () => {
  it('holds nothing when nothing is pressed', () => {
    expect(heldList([])).toEqual([]);
  });

  it.each([
    ['ArrowLeft', 'left'],
    ['KeyA', 'left'],
    ['ArrowRight', 'right'],
    ['KeyD', 'right'],
    ['Space', 'jump'],
    ['KeyW', 'jump'],
    ['ArrowUp', 'jump'],
    ['ShiftRight', 'shiftUp'],
    ['KeyE', 'shiftUp'],
    ['KeyX', 'shiftUp'],
    ['ShiftLeft', 'shiftDown'],
    ['KeyQ', 'shiftDown'],
    ['KeyZ', 'shiftDown'],
    ['KeyR', 'restart'],
    ['Escape', 'pause'],
    ['KeyP', 'pause'],
  ] as const)('%s triggers %s and nothing else', (code, action) => {
    expect(heldList([code])).toEqual([action]);
  });

  it('keeps the two Shift keys distinct (left = down, right = up)', () => {
    expect(heldList(['ShiftLeft'])).toEqual(['shiftDown']);
    expect(heldList(['ShiftRight'])).toEqual(['shiftUp']);
  });

  it('has all gear bindings active at once and ORs them together', () => {
    expect(heldList(['KeyQ', 'KeyZ', 'ShiftLeft'])).toEqual(['shiftDown']);
    expect(heldList(['KeyQ', 'KeyE'])).toEqual(only('shiftUp', 'shiftDown'));
  });

  it('reports several actions held together', () => {
    expect(heldList(['ArrowRight', 'Space', 'KeyE'])).toEqual(only('right', 'jump', 'shiftUp'));
  });

  it('ignores unbound codes', () => {
    expect(heldList(['KeyM', 'F5', 'Tab'])).toEqual([]);
  });

  it('accepts any iterable (Set, array, generator)', () => {
    function* gen(): Generator<string> {
      yield 'KeyD';
    }
    expect(heldActions(new Set(['KeyD'])).right).toBe(true);
    expect(heldActions(['KeyD']).right).toBe(true);
    expect(heldActions(gen()).right).toBe(true);
  });

  it('does not leak state between calls', () => {
    const first = heldActions(['KeyD']);
    heldActions(['KeyA']);
    expect(first.right).toBe(true);
    expect(first.left).toBe(false);
    expect(heldActions([]).right).toBe(false);
  });
});

describe('toSimButtons', () => {
  it('keeps exactly the five sim buttons', () => {
    const buttons = toSimButtons(heldActions(['KeyD', 'KeyR', 'Escape', 'KeyQ']));
    expect(buttons).toEqual({ left: false, right: true, jump: false, shiftUp: false, shiftDown: true });
  });
});

describe('actionsForCode / boundCodes', () => {
  it('maps a code back to its actions', () => {
    expect(actionsForCode('KeyQ')).toEqual(['shiftDown']);
    expect(actionsForCode('KeyM')).toEqual([]);
  });

  it('lists every bound code once, including all alternate gear keys', () => {
    const codes = boundCodes();
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of ['KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight', 'Space', 'ArrowUp']) {
      expect(codes).toContain(c);
    }
  });

  it('never binds one default code to two actions', () => {
    for (const code of boundCodes()) expect(actionsForCode(code)).toHaveLength(1);
  });
});

describe('remapping is data only', () => {
  it('heldActions follows a custom Bindings value', () => {
    const custom = withBinding(DEFAULT_BINDINGS, 'jump', ['KeyJ']);
    expect(heldActions(['KeyJ'], custom).jump).toBe(true);
    expect(heldActions(['Space'], custom).jump).toBe(false);
  });

  it('withBinding steals a code from its previous owner without mutating the input', () => {
    const before = JSON.stringify(DEFAULT_BINDINGS);
    const next = withBinding(DEFAULT_BINDINGS, 'jump', ['KeyQ']);
    expect(next.jump).toEqual(['KeyQ']);
    expect(next.shiftDown).toEqual(['ShiftLeft', 'KeyZ']);
    expect(JSON.stringify(DEFAULT_BINDINGS)).toBe(before);
  });
});

describe('sanitizeBindings', () => {
  it('round-trips valid bindings through JSON', () => {
    expect(sanitizeBindings(JSON.parse(JSON.stringify(DEFAULT_BINDINGS)) as unknown)).toEqual(DEFAULT_BINDINGS);
  });

  it.each([undefined, null, 42, 'x', [], true])('falls back to defaults for %j', (raw) => {
    expect(sanitizeBindings(raw)).toEqual(DEFAULT_BINDINGS);
  });

  it('repairs only the broken actions', () => {
    const result = sanitizeBindings({
      jump: ['KeyJ'],
      left: 'KeyA',
      right: [],
      shiftUp: [1, null, '../x', 'KeyE', 'KeyE'],
    });
    expect(result.jump).toEqual(['KeyJ']);
    expect(result.left).toEqual(DEFAULT_BINDINGS.left);
    expect(result.right).toEqual(DEFAULT_BINDINGS.right);
    expect(result.shiftUp).toEqual(['KeyE']);
    expect(result.restart).toEqual(DEFAULT_BINDINGS.restart);
  });

  it('ignores inherited properties such as __proto__', () => {
    const raw = JSON.parse('{"__proto__": {"jump": ["KeyJ"]}}') as unknown;
    expect(sanitizeBindings(raw).jump).toEqual(DEFAULT_BINDINGS.jump);
  });
});

describe('keyLabel', () => {
  it('shortens common codes for key caps', () => {
    expect(keyLabel('KeyQ')).toBe('Q');
    expect(keyLabel('Digit3')).toBe('3');
    expect(keyLabel('ShiftLeft')).toBe('L Shift');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('NumpadAdd')).toBe('NumpadAdd');
  });
});
