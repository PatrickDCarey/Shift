import { describe, expect, it } from 'vitest';
import { createList, moveGridFocus, moveList, moveListFocus } from './menuFocus';
import { MENU_CAPTURE_CODES, createMenuInput, resolveIntent, stepMenuInput } from './menuInput';
import type { MenuInputState, MenuIntent, MenuKeyOptions } from './menuInput';

/** Run a script of frames (each a list of held codes) and return the intents. */
function run(frames: readonly (readonly string[])[], opts: MenuKeyOptions = {}, open: readonly string[] = []): MenuIntent[] {
  let state: MenuInputState = createMenuInput(open);
  return frames.map((held) => {
    const step = stepMenuInput(state, held, opts);
    state = step.state;
    return step.intent;
  });
}

const kinds = (intents: readonly MenuIntent[]): string[] =>
  intents.map((i) => (i.kind === 'move' ? `move:${i.dir}` : i.kind));

describe('stepMenuInput', () => {
  it('one press, one move: holding does not repeat', () => {
    expect(kinds(run([['ArrowDown'], ['ArrowDown'], ['ArrowDown'], [], ['ArrowDown']]))).toEqual([
      'move:down',
      'none',
      'none',
      'none',
      'move:down',
    ]);
  });

  it('WASD moves like the arrows; Enter and Space choose; Esc and Backspace go back', () => {
    expect(kinds(run([['KeyW'], [], ['KeyA'], [], ['KeyS'], [], ['KeyD']]))).toEqual([
      'move:up', 'none', 'move:left', 'none', 'move:down', 'none', 'move:right',
    ]);
    expect(kinds(run([['Enter'], [], ['Space'], [], ['Escape'], [], ['Backspace']]))).toEqual([
      'choose', 'none', 'choose', 'none', 'back', 'none', 'back',
    ]);
  });

  it('fresh-press rule: a key held when the screen opens does nothing until released (check 2)', () => {
    const out = run([['Space'], ['Space'], [], ['Space']], {}, ['Space']);
    expect(kinds(out)).toEqual(['none', 'none', 'none', 'choose']);
  });

  it('a masked key released and pressed again counts; other keys are unaffected', () => {
    const out = run([['Space', 'ArrowDown'], ['ArrowDown'], ['Space']], {}, ['Space']);
    expect(kinds(out)).toEqual(['move:down', 'none', 'choose']);
  });

  it('R held through a restart and Esc held from closing pause are ignored until released', () => {
    expect(kinds(run([['KeyR'], [], ['KeyR']], { retryKey: true }, ['KeyR']))).toEqual(['none', 'none', 'retry']);
    expect(kinds(run([['Escape'], [], ['Escape']], {}, ['Escape']))).toEqual(['none', 'none', 'back']);
  });

  it('Shift, Q, E, Z and X do nothing on any menu (check 5)', () => {
    const codes = ['ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX'];
    for (const opts of [{}, { retryKey: true }, { retryKey: true, pauseKey: true }]) {
      expect(kinds(run(codes.flatMap((c) => [[c], []]), opts))).toEqual(Array(12).fill('none'));
    }
  });

  it('R is retry only where enabled, P is back only on pause', () => {
    expect(kinds(run([['KeyR']]))).toEqual(['none']);
    expect(kinds(run([['KeyR']], { retryKey: true }))).toEqual(['retry']);
    expect(kinds(run([['KeyP']]))).toEqual(['none']);
    expect(kinds(run([['KeyP']], { pauseKey: true }))).toEqual(['back']);
  });

  it('same frame: Back beats Choose beats Move (check 8)', () => {
    expect(resolveIntent(new Set(['Enter', 'Escape'])).kind).toBe('back');
    expect(resolveIntent(new Set(['Enter', 'ArrowDown'])).kind).toBe('choose');
    expect(resolveIntent(new Set(['Escape', 'ArrowDown', 'Space'])).kind).toBe('back');
  });

  it('two moves on the same axis cancel; vertical wins across axes', () => {
    expect(resolveIntent(new Set(['ArrowLeft', 'ArrowRight'])).kind).toBe('none');
    expect(resolveIntent(new Set(['ArrowUp', 'KeyS'])).kind).toBe('none');
    expect(resolveIntent(new Set(['ArrowLeft', 'ArrowDown']))).toEqual({ kind: 'move', dir: 'down' });
    expect(resolveIntent(new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown']))).toEqual({ kind: 'move', dir: 'down' });
  });

  it('blocked frames drop input and mask the keys held meanwhile', () => {
    let state = createMenuInput();
    state = stepMenuInput(state, ['Space'], { blocked: true }).state;
    expect(stepMenuInput(state, ['Space']).intent.kind).toBe('none');
    const released = stepMenuInput(stepMenuInput(state, ['Space']).state, []);
    expect(stepMenuInput(released.state, ['Space']).intent.kind).toBe('choose');
  });

  it('does not mutate the state it is given', () => {
    const state = createMenuInput(['Space']);
    stepMenuInput(state, []);
    expect([...state.masked]).toEqual(['Space']);
  });

  it('captures every menu key for the iframe (arrows and Space must not scroll)', () => {
    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape', 'Backspace']) {
      expect(MENU_CAPTURE_CODES).toContain(code);
    }
  });
});

describe('list focus', () => {
  it('does not wrap (check 3)', () => {
    expect(moveListFocus(0, 3, 'up')).toBe(0);
    expect(moveListFocus(2, 3, 'down')).toBe(2);
    expect(moveListFocus(1, 3, 'down')).toBe(2);
    expect(moveListFocus(1, 3, 'left')).toBe(1);
    expect(moveListFocus(0, 0, 'down')).toBe(0);
  });

  it('createList focuses the id, or the first item', () => {
    const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    expect(createList(items, 'b').focus).toBe(1);
    expect(createList(items, 'zzz' as 'a').focus).toBe(0);
    const list = createList(items);
    expect(moveList(list, 'up')).toBe(list);
  });
});

describe('grid focus (checks 13)', () => {
  const rows = [5, 4, 5];
  it('left and right stop at the row ends', () => {
    expect(moveGridFocus(rows, { row: 0, col: 0 }, 'left')).toEqual({ row: 0, col: 0 });
    expect(moveGridFocus(rows, { row: 0, col: 4 }, 'right')).toEqual({ row: 0, col: 4 });
    expect(moveGridFocus(rows, { row: 0, col: 1 }, 'right')).toEqual({ row: 0, col: 2 });
  });
  it('down from column 5 of a 5-cell row lands on the last cell of a 4-cell row', () => {
    expect(moveGridFocus(rows, { row: 0, col: 4 }, 'down')).toEqual({ row: 1, col: 3 });
  });
  it('up and down stop at the first and last row', () => {
    expect(moveGridFocus(rows, { row: 0, col: 2 }, 'up')).toEqual({ row: 0, col: 2 });
    expect(moveGridFocus(rows, { row: 2, col: 2 }, 'down')).toEqual({ row: 2, col: 2 });
  });
  it('an empty grid stays at the origin', () => {
    expect(moveGridFocus([], { row: 3, col: 3 }, 'down')).toEqual({ row: 0, col: 0 });
  });
});
