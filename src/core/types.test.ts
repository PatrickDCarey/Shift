import { describe, expect, it } from 'vitest';
import {
  BAND_COLORS,
  BANDS,
  EMPTY_INPUT,
  GEARS,
  INPUT_BUTTONS,
  INPUT_LETTERS,
  INPUT_NONE_LETTER,
  MAX_GEAR,
  PLAYER_START_CHAR,
  RESERVED_CHARS,
  TILE_KINDS,
  TILE_LEGEND,
  TWIN,
} from './types';
import type { BodyEvent, FallThroughCell, SimEvent } from './types';

describe('gear and band constants', () => {
  it('maps every band to a distinct colour name', () => {
    const colors = BANDS.map((b) => BAND_COLORS[b]);
    expect(colors).toEqual(['white', 'blue', 'green', 'yellow', 'red']);
    expect(new Set(colors).size).toBe(BANDS.length);
  });

  it('selectable gears are 1..4 (standing is not a gear)', () => {
    expect(GEARS).toEqual([1, 2, 3, 4]);
    expect(MAX_GEAR).toBe(GEARS[GEARS.length - 1]);
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

  it('has one char per coloured band and one camera per band', () => {
    const tiles = Object.values(TILE_LEGEND);
    const colored = tiles.flatMap((t) => (t.kind === 'colored' ? [t.band] : []));
    const cameras = tiles.flatMap((t) => (t.kind === 'camera' ? [t.band] : []));
    expect(colored.sort()).toEqual([1, 2, 3, 4]);
    expect(cameras.sort()).toEqual([...BANDS]);
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

  it('EMPTY_INPUT holds nothing and has exactly the canonical buttons', () => {
    expect(INPUT_BUTTONS.every((b) => !EMPTY_INPUT[b])).toBe(true);
    expect(Object.keys(EMPTY_INPUT).sort()).toEqual([...INPUT_BUTTONS].sort());
  });
});

describe('fallThrough event contract (T-07)', () => {
  it('is a body event that carries its coloured cells', () => {
    const cells: readonly FallThroughCell[] = [
      { col: 3, row: 9, band: 2 },
      { col: 4, row: 9, band: 2 },
    ];
    const event: BodyEvent = { type: 'fallThrough', body: TWIN, cells };
    const events: readonly SimEvent[] = [event];
    const bodies = events.filter((e): e is BodyEvent => 'body' in e).map((e) => e.body);
    expect(bodies).toEqual([TWIN]);
    expect(event.type === 'fallThrough' && event.cells.map((c) => c.col)).toEqual([3, 4]);
  });
});
