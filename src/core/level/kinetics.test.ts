import { describe, expect, it } from 'vitest';
import { MAX_EMITTERS, MAX_MOVERS, type Level, type ParseResult } from '../types';
import { parseLevel } from './index';

const BASE = ['id: w1-01', 'title: Test', 'world: 1', 'teaches: nothing', 'version: 1'];
/** 40 wide, 20 tall: rows 0-17 empty, start and exit on row 18, floor on row 19. */
const GRID = [
  ...Array.from({ length: 18 }, () => '.'.repeat(40)),
  `.@${'.'.repeat(37)}E`,
  '#'.repeat(40),
];

function text(lines: readonly string[], grid: readonly string[] = GRID, eol = '\n'): string {
  return [...BASE, ...lines, '---', ...grid, ''].join(eol);
}

function ok(r: ParseResult<Level>): Level {
  if (!r.ok) throw new Error(`expected ok:\n${r.errors.join('\n')}`);
  return r.value;
}

function errs(lines: readonly string[], grid?: readonly string[]): readonly string[] {
  const r = parseLevel(text(lines, grid), 'w1-01');
  if (r.ok) throw new Error('expected errors');
  return r.errors;
}

const M = 'mover: 10 8 3x1 safe speed=2 path=w60,u6,w60,d6';
const E = 'emitter: 30 6 dir=l range=12 speed=4 period=90';

describe('kinetic headers: happy paths', () => {
  it('parses every example of the doc', () => {
    const level = ok(
      parseLevel(
        text([
          'mover: 10 8 3x1 safe speed=2 phase=0 path=w60,u6,w60,d6',
          'mover: 20 4 4x1 G speed=1 path=w30,r6,w30,l6',
          E,
          'emitter: 30 9 dir=l range=12 speed=4 period=90 phase=45 band=W',
          'sweep: x0=-6 speed=2 delay=90',
        ]),
        'w1-01',
      ),
    );
    expect(level.movers).toHaveLength(2);
    expect(level.movers?.[0]).toEqual({
      origin: { col: 10, row: 8 },
      width: 3,
      height: 1,
      solid: { kind: 'safe' },
      path: [
        { kind: 'wait', steps: 60 },
        { kind: 'move', dir: 'u', tiles: 6 },
        { kind: 'wait', steps: 60 },
        { kind: 'move', dir: 'd', tiles: 6 },
      ],
      speed: 2,
      phase: 0,
    });
    expect(level.movers?.[1]?.solid).toEqual({ kind: 'colored', band: 2 });
    expect(level.emitters?.[0]).toEqual({
      cell: { col: 30, row: 6 },
      dir: 'l',
      range: 12,
      speed: 4,
      period: 90,
      phase: 0,
      band: null,
    });
    expect(level.emitters?.[1]?.band).toBe(0);
    expect(level.emitters?.[1]?.phase).toBe(45);
    expect(level.sweep).toEqual({ x0: -6, speed: 2, delay: 90 });
  });

  it('maps colored kinds and emitter bands', () => {
    const kinds = ['B', 'G', 'Y', 'R'].map((k, i) => `mover: ${i * 5 + 1} 8 2x1 ${k} speed=1 path=r1,l1`);
    const level = ok(parseLevel(text([...kinds, `${E} band=R`]), 'w1-01'));
    expect(level.movers?.map((m) => m.solid)).toEqual([1, 2, 3, 4].map((band) => ({ kind: 'colored', band })));
    expect(level.emitters?.[0]?.band).toBe(4);
  });

  it('keeps file order and accepts keys in any order', () => {
    const level = ok(parseLevel(text(['mover: 10 8 3x1 safe path=r2,l2 phase=3 speed=4', 'mover: 20 8 2x1 B speed=1 path=d1,u1']), 'w1-01'));
    expect(level.movers?.map((m) => m.origin.col)).toEqual([10, 20]);
    expect(level.movers?.[0]?.phase).toBe(3);
  });

  it('leaves movers, emitters and sweep absent (not empty) when none', () => {
    const level = ok(parseLevel(text([]), 'w1-01'));
    expect('movers' in level).toBe(false);
    expect('emitters' in level).toBe(false);
    expect('sweep' in level).toBe(false);
  });

  it('reads CRLF files', () => {
    const level = ok(parseLevel(text([M, E, 'sweep: x0=0 speed=2 delay=0'], GRID, '\r\n'), 'w1-01'));
    expect(level.movers).toHaveLength(1);
    expect(level.emitters).toHaveLength(1);
    expect(level.sweep?.delay).toBe(0);
  });

  it('allows a sweep x0 at the level width and at -64', () => {
    expect(ok(parseLevel(text(['sweep: x0=40 speed=1 delay=0']), 'w1-01')).sweep?.x0).toBe(40);
    expect(ok(parseLevel(text(['sweep: x0=-64 speed=1 delay=36000']), 'w1-01')).sweep?.x0).toBe(-64);
  });

  it('accepts the largest phase (cycle - 1)', () => {
    // r1 at speed 2 = 16 steps each way; cycle 32.
    expect(ok(parseLevel(text(['mover: 5 8 2x1 safe speed=2 phase=31 path=r1,l1']), 'w1-01')).movers?.[0]?.phase).toBe(31);
  });
});

describe('kinetic headers: mover validation', () => {
  it('rejects fewer than 5 tokens, with the line number', () => {
    const e = errs(['mover: 10 8 3x1 safe']);
    expect(e[0]).toMatch(/^w1-01\.txt:6:\d+: mover needs/);
  });

  it('rejects a missing speed or path', () => {
    expect(errs(['mover: 10 8 3x1 safe path=r1,l1 phase=0']).join('\n')).toMatch(/missing required key 'speed='/);
    expect(errs(['mover: 10 8 3x1 safe speed=1 phase=0']).join('\n')).toMatch(/missing required key 'path='/);
  });

  it('rejects unknown and repeated keys', () => {
    expect(errs([`${M} colour=red`]).join('\n')).toMatch(/unknown or malformed token 'colour=red'/);
    expect(errs([`${M} speed=1`]).join('\n')).toMatch(/key 'speed' is repeated/);
  });

  it('rejects non-integer cell numbers', () => {
    expect(errs(['mover: a 8 3x1 safe speed=2 path=r1,l1'])[0]).toMatch(/cell column and row/);
    expect(errs(['mover: 10 -1 3x1 safe speed=2 path=r1,l1'])[0]).toMatch(/cell column and row/);
  });

  it('rejects a size that is not <w>x1 or has width 0 or over 16', () => {
    for (const size of ['3x2', '3', '0x1', '17x1', 'x1', '3X1']) {
      expect(errs([`mover: 1 8 ${size} safe speed=2 path=r1,l1`])[0]).toMatch(/mover size must be/);
    }
  });

  it('rejects a kind outside safe B G Y R', () => {
    for (const kind of ['W', 'g', 'grey', 'E']) {
      expect(errs([`mover: 1 8 3x1 ${kind} speed=2 path=r1,l1`])[0]).toMatch(/mover kind must be/);
    }
  });

  it('rejects speeds outside 1, 2, 4, 8', () => {
    for (const speed of ['0', '3', '16', 'fast', '-1']) {
      expect(errs([`mover: 1 8 3x1 safe speed=${speed} path=r1,l1`])[0]).toMatch(/speed must be one of 1, 2, 4, 8/);
    }
  });

  it('rejects bad path tokens', () => {
    for (const path of ['x3,r3', 'r0,l0', 'r,l', 'r03,l03', 'w0,r1,l1', 'r1;l1', 'r1,,l1', 'R1,L1']) {
      expect(errs([`mover: 1 8 2x1 safe speed=2 path=${path}`]).join('\n')).toMatch(/path token/);
    }
  });

  it('rejects a move over 256 tiles and a wait over 3600 steps', () => {
    expect(errs(['mover: 1 8 2x1 safe speed=2 path=r257,l257']).join('\n')).toMatch(/over 256 tiles/);
    expect(errs(['mover: 1 8 2x1 safe speed=2 path=w3601,r1,l1']).join('\n')).toMatch(/over 3600 steps/);
  });

  it('accepts a wait of 3600 steps', () => {
    expect(ok(parseLevel(text(['mover: 1 8 2x1 safe speed=2 path=w3600,r1,l1']), 'w1-01')).movers).toHaveLength(1);
  });

  it('rejects more than 32 path tokens, accepts 32', () => {
    const many = (n: number): string => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'r1' : 'l1')).join(',');
    expect(errs([`mover: 1 8 2x1 safe speed=2 path=${many(34)}`])[0]).toMatch(/at most 32/);
    expect(ok(parseLevel(text([`mover: 1 8 2x1 safe speed=2 path=${many(32)}`]), 'w1-01')).movers).toHaveLength(1);
  });

  it('rejects a path with no move', () => {
    expect(errs(['mover: 1 8 2x1 safe speed=2 path=w10'])[0]).toMatch(/at least one move/);
  });

  it('rejects a path that does not close', () => {
    expect(errs(['mover: 1 8 2x1 safe speed=2 path=r3,l2'])[0]).toMatch(/net displacement is 1 right, 0 down/);
    expect(errs(['mover: 1 8 2x1 safe speed=2 path=u3,d1'])[0]).toMatch(/must return to its start/);
  });

  it('rejects phase at or past the cycle, naming the cycle', () => {
    // u6 at speed 2 = 96 steps each way, plus waits 60 + 60: cycle 312.
    expect(errs([`${M} phase=312`])[0]).toMatch(/phase must be less than the cycle \(312\)/);
    expect(ok(parseLevel(text([`${M} phase=311`]), 'w1-01')).movers?.[0]?.phase).toBe(311);
  });

  it('rejects a non-integer phase', () => {
    expect(errs([`${M} phase=-1`])[0]).toMatch(/phase must be a whole number/);
    expect(errs([`${M} phase=1.5`])[0]).toMatch(/phase must be a whole number/);
  });

  it('rejects an origin outside the grid, on a non-empty cell, or with width past the edge', () => {
    expect(errs(['mover: 10 25 3x1 safe speed=2 path=r1,l1'])[0]).toMatch(/outside the grid/);
    expect(errs(['mover: 39 8 3x1 safe speed=2 path=l1,r1'])[0]).toMatch(/outside the grid/);
    expect(errs(['mover: 5 19 2x1 safe speed=2 path=u1,d1'])[0]).toMatch(/is '#', not '\.'/);
    expect(errs(['mover: 0 18 3x1 safe speed=2 path=u1,d1'])[0]).toMatch(/is '@', not '\.'/);
  });

  it('rejects a track corner outside the grid', () => {
    expect(errs(['mover: 10 8 3x1 safe speed=2 path=r40,l40'])[0]).toMatch(/path leaves the grid/);
    expect(errs(['mover: 10 8 3x1 safe speed=2 path=u9,d9'])[0]).toMatch(/path leaves the grid/);
    expect(errs(['mover: 10 8 3x1 safe speed=2 path=d12,u12'])[0]).toMatch(/path leaves the grid/);
    expect(errs(['mover: 2 8 3x1 safe speed=2 path=l3,r3'])[0]).toMatch(/path leaves the grid/);
  });

  it('rejects more than 16 movers, accepts 16', () => {
    const lines = (n: number): string[] => Array.from({ length: n }, (_, i) => `mover: ${i} ${i} 1x1 safe speed=1 path=r1,l1`);
    expect(errs(lines(MAX_MOVERS + 1)).join('\n')).toMatch(/too many mover: lines \(at most 16/);
    expect(ok(parseLevel(text(lines(MAX_MOVERS)), 'w1-01')).movers).toHaveLength(MAX_MOVERS);
  });

  it('names file, line and the bad token column', () => {
    const e = errs(['mover: 10 8 3x1 safe speed=3 path=r1,l1']);
    // 'mover: ' is 7 columns; the value 3 sits after '10 8 3x1 safe speed=' (20 chars).
    expect(e).toEqual(["w1-01.txt:6:28: speed must be one of 1, 2, 4, 8, found '3'"]);
  });
});

describe('kinetic headers: emitter validation', () => {
  it('rejects missing required keys', () => {
    for (const key of ['dir', 'range', 'speed', 'period']) {
      const line = E.split(' ').filter((t) => !t.startsWith(`${key}=`)).join(' ');
      expect(errs([line]).join('\n')).toMatch(new RegExp(`missing required key '${key}='`));
    }
  });

  it('rejects unknown and repeated keys', () => {
    expect(errs([`${E} colour=red`]).join('\n')).toMatch(/unknown or malformed token/);
    expect(errs([`${E} range=3`]).join('\n')).toMatch(/key 'range' is repeated/);
  });

  it('rejects fewer than two positional tokens', () => {
    expect(errs(['emitter: 30'])[0]).toMatch(/emitter needs/);
  });

  it('rejects dir outside l r u d', () => {
    expect(errs([E.replace('dir=l', 'dir=x')])[0]).toMatch(/dir must be one of l, r, u, d/);
  });

  it('rejects range, speed and period out of range', () => {
    expect(errs([E.replace('range=12', 'range=0')])[0]).toMatch(/range must be a whole number from 1 to 256/);
    expect(errs([E.replace('range=12', 'range=257')])[0]).toMatch(/range must be/);
    expect(errs([E.replace('speed=4', 'speed=5')])[0]).toMatch(/speed must be one of/);
    expect(errs([E.replace('period=90', 'period=0')])[0]).toMatch(/period must be a whole number from 1 to 3600/);
    expect(errs([E.replace('period=90', 'period=3601')])[0]).toMatch(/period must be/);
  });

  it('rejects band outside W B G Y R', () => {
    expect(errs([`${E} band=w`])[0]).toMatch(/band must be W, B, G, Y or R/);
    expect(errs([`${E} band=grey`])[0]).toMatch(/band must be/);
  });

  it('rejects phase at or past the period', () => {
    expect(errs([`${E} phase=90`])[0]).toMatch(/phase must be less than the period \(90\)/);
    expect(ok(parseLevel(text([`${E} phase=89`]), 'w1-01')).emitters?.[0]?.phase).toBe(89);
  });

  it('rejects a cell outside the grid or not on a `.`', () => {
    expect(errs(['emitter: 50 6 dir=u range=1 speed=4 period=90'])[0]).toMatch(/outside the grid/);
    expect(errs(['emitter: 5 19 dir=u range=1 speed=4 period=90'])[0]).toMatch(/is '#', not '\.'/);
  });

  it('rejects a lane end outside the grid for each direction, accepts the exact edge', () => {
    // Centre x 30.5: l range 31 ends at -0.5 (out), 30 ends at 0.5 (in).
    expect(errs(['emitter: 30 6 dir=l range=31 speed=4 period=90'])[0]).toMatch(/lane ends outside the grid/);
    expect(errs(['emitter: 30 6 dir=r range=10 speed=4 period=90'])[0]).toMatch(/lane ends outside the grid/);
    expect(errs(['emitter: 30 6 dir=u range=7 speed=4 period=90'])[0]).toMatch(/lane ends outside the grid/);
    expect(errs(['emitter: 30 6 dir=d range=15 speed=4 period=90'])[0]).toMatch(/lane ends outside the grid/);
    expect(ok(parseLevel(text(['emitter: 30 6 dir=l range=30 speed=4 period=90']), 'w1-01')).emitters).toHaveLength(1);
    expect(ok(parseLevel(text(['emitter: 30 6 dir=r range=9 speed=4 period=90']), 'w1-01')).emitters).toHaveLength(1);
    expect(ok(parseLevel(text(['emitter: 30 6 dir=u range=6 speed=4 period=90']), 'w1-01')).emitters).toHaveLength(1);
    expect(ok(parseLevel(text(['emitter: 30 6 dir=d range=13 speed=4 period=90']), 'w1-01')).emitters).toHaveLength(1);
  });

  it('rejects more than 16 emitters, accepts 16', () => {
    const lines = (n: number): string[] => Array.from({ length: n }, (_, i) => `emitter: ${i + 1} 0 dir=d range=1 speed=1 period=1`);
    expect(errs(lines(MAX_EMITTERS + 1)).join('\n')).toMatch(/too many emitter: lines \(at most 16/);
    expect(ok(parseLevel(text(lines(MAX_EMITTERS)), 'w1-01')).emitters).toHaveLength(MAX_EMITTERS);
  });

  it('names file, line and column of the bad token', () => {
    expect(errs([E.replace('speed=4', 'speed=5')])).toEqual(["w1-01.txt:6:36: speed must be one of 1, 2, 4, 8, found '5'"]);
  });
});

describe('kinetic headers: sweep validation', () => {
  it('rejects a second sweep line, naming the first', () => {
    const e = errs(['sweep: x0=0 speed=2 delay=60', 'sweep: x0=1 speed=2 delay=60']);
    expect(e).toEqual(['w1-01.txt:7:1: only one sweep: line is allowed (the first is on line 6)']);
  });

  it('rejects missing keys', () => {
    for (const key of ['x0', 'speed', 'delay']) {
      const line = ['x0=0', 'speed=2', 'delay=60'].filter((t) => !t.startsWith(key)).join(' ');
      expect(errs([`sweep: ${line}`]).join('\n')).toMatch(new RegExp(`missing required key '${key}='`));
    }
  });

  it('rejects unknown and repeated keys', () => {
    expect(errs(['sweep: x0=0 speed=2 delay=60 foo=1']).join('\n')).toMatch(/unknown or malformed token/);
    expect(errs(['sweep: x0=0 x0=1 speed=2 delay=60']).join('\n')).toMatch(/key 'x0' is repeated/);
  });

  it('rejects x0 below -64 or above the width, and non-integers', () => {
    expect(errs(['sweep: x0=-65 speed=2 delay=60'])[0]).toMatch(/x0 must be a whole number of -64 or more/);
    expect(errs(['sweep: x0=1.5 speed=2 delay=60'])[0]).toMatch(/x0 must be/);
    expect(errs(['sweep: x0=41 speed=2 delay=60'])[0]).toMatch(/past the right edge \(level width 40\)/);
  });

  it('rejects an illegal speed and an out-of-range delay', () => {
    expect(errs(['sweep: x0=0 speed=3 delay=60'])[0]).toMatch(/speed must be one of/);
    expect(errs(['sweep: x0=0 speed=2 delay=36001'])[0]).toMatch(/delay must be a whole number from 0 to 36000/);
    expect(errs(['sweep: x0=0 speed=2 delay=-1'])[0]).toMatch(/delay must be/);
  });
});

describe('kinetic headers: interaction with the rest of the file', () => {
  it('does not disturb hints, and hints stay absent for a kinetic-only file', () => {
    const level = ok(parseLevel(text([M, 'hint: move 1 0']), 'w1-01'));
    expect(level.meta.hints).toHaveLength(1);
    expect(ok(parseLevel(text([M]), 'w1-01')).meta.hints).toBeUndefined();
  });

  it('skips the grid check on ragged grids instead of throwing', () => {
    const r = parseLevel(text([M], ['..', '.@E', '###']), 'w1-01');
    expect(r.ok).toBe(false);
  });
});
