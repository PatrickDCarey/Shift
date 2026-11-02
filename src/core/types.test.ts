import { describe, expect, it } from 'vitest';
import {
  EMPTY_INPUT,
  GEAR_COLORS,
  GEARS,
  INPUT_BUTTONS,
  INPUT_LETTERS,
  INPUT_NONE_LETTER,
  PLAYER_START_CHAR,
  RESERVED_CHARS,
  TILE_KINDS,
  TILE_LEGEND,
} from './types';

describe('gear constants', () => {
  it('maps every gear to a distinct colour name', () => {
    const colors = GEARS.map((g) => GEAR_COLORS[g]);
    expect(colors).toEqual(['white', 'blue', 'green', 'yellow', 'red']);
    expect(new Set(colors).size).toBe(GEARS.length);
  });
});

describe('TILE_LEGEND', () => {
  const chars = Object.keys(TILE_LEGEND);

  it('uses single printable ASCII characters', () => {
    for (const c of chars) {
      expect(c).toMatch(/^[\x21-\x7e]$/);
    }
  });

  it('covers every tile kind', () => {
    const kinds = new Set(Object.values(TILE_LEGEND).map((t) => t.kind));
    expect([...kinds].sort()).toEqual([...TILE_KINDS].sort());
  });

  it('has one char per coloured gear and one camera per gear', () => {
    const tiles = Object.values(TILE_LEGEND);
    const colored = tiles.flatMap((t) => (t.kind === 'colored' ? [t.gear] : []));
    const cameras = tiles.flatMap((t) => (t.kind === 'camera' ? [t.gear] : []));
    expect(colored.sort()).toEqual([1, 2, 3, 4]);
    expect(cameras.sort()).toEqual([...GEARS]);
  });

  it('does not collide with the start marker or reserved chars', () => {
    expect(chars).not.toContain(PLAYER_START_CHAR);
    for (const c of RESERVED_CHARS) {
      expect(chars).not.toContain(c);
    }
  });
});

describe('input constants', () => {
  it('has a unique solution-file letter per button', () => {
    const letters = INPUT_BUTTONS.map((b) => INPUT_LETTERS[b]);
    expect(new Set(letters).size).toBe(INPUT_BUTTONS.length);
    expect(letters).not.toContain(INPUT_NONE_LETTER);
    expect(Object.keys(INPUT_LETTERS).sort()).toEqual([...INPUT_BUTTONS].sort());
  });

  it('EMPTY_INPUT holds nothing', () => {
    expect(INPUT_BUTTONS.every((b) => !EMPTY_INPUT[b])).toBe(true);
  });
});
