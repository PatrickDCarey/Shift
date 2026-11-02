import { describe, expect, it } from 'vitest';
import { parseLevel } from '../level';
import { frame, gridLevel, room } from './testkit';

describe('sim testkit', () => {
  it('gridLevel builds the same Level as the level lane parser', () => {
    const grid = ['....................', '.@................E.', '#####BBBBBBBBB######'];
    const text = ['id: w0-99', 'title: test', 'world: 0', 'teaches: test', 'version: 1', '---', ...grid].join('\n');
    const parsed = parseLevel(text, 'w0-99');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(gridLevel(grid)).toEqual(parsed.value);
  });

  it('room levels parse too', () => {
    const lvl = room(30, 2, [{ row: 10, col: 5, chars: 'GG' }], '.');
    const rows = Array.from({ length: lvl.height }, (_, r) =>
      lvl.tiles.slice(r * lvl.width, (r + 1) * lvl.width).map((t, c) => {
        if (r === lvl.start.row && c === lvl.start.col) return '@';
        return t.kind === 'colored' ? 'BGYR'[t.band - 1] : t.kind === 'exit' ? 'E' : '.';
      }).join(''),
    );
    const text = ['id: w0-99', 'title: test', 'world: 0', 'teaches: test', 'version: 1', '---', ...rows].join('\n');
    const parsed = parseLevel(text, 'w0-99');
    expect(parsed.ok && parsed.value).toEqual(lvl);
  });

  it('frame reads solution letters', () => {
    expect(frame('LRJ+-!')).toEqual({ left: true, right: true, jump: true, shiftUp: true, shiftDown: true, restart: true });
    expect(frame('.')).toEqual(frame(''));
  });
});
