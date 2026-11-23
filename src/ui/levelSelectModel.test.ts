import { describe, expect, it } from 'vitest';
import { levelOrder } from '../save';
import type { LevelSource, Progress } from '../save';
import {
  cellRect,
  cellStatusText,
  createLevelSelectModel,
  detailLine,
  focusedCell,
  levelSelectLayout,
  levelSelectStep,
} from './levelSelectModel';
import type { LevelSelectModel } from './levelSelectModel';
import { decorationRects, layoutViolations } from './menuLayout';
import type { MenuIntent } from './menuInput';

const src = (id: string, world: number, title = `Level ${id}`): LevelSource => ({ meta: { id, title, world } });
const ids = (world: number, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `w${world}-${String(i + 1).padStart(2, '0')}`);
const ALL = [...ids(1, 5), ...ids(2, 4), ...ids(3, 5)].map((id) => src(id, Number(id[1])));
const ORDER = levelOrder([...ALL, src('w0-02', 0)]);

const progress = (completed: string[] = [], best: Record<string, number> = {}): Progress => ({
  completedLevels: completed,
  bestSteps: best,
});
const build = (p: Progress, focusId?: string): LevelSelectModel =>
  createLevelSelectModel({ order: ORDER, progress: p, stepHz: 60, focusId });
const move = (dir: 'up' | 'down' | 'left' | 'right'): MenuIntent => ({ kind: 'move', dir });
const press = (model: LevelSelectModel, ...intents: MenuIntent[]): LevelSelectModel =>
  intents.reduce((m, i) => levelSelectStep(m, i).model, model);

describe('createLevelSelectModel', () => {
  it('has one row per world with levels, never world 0 (check 7)', () => {
    const model = build(progress());
    expect(model.rows.map((r) => [r.world, r.name, r.cells.length])).toEqual([
      [1, 'GEARS', 5],
      [2, 'FLIGHT', 4],
      [3, 'TANDEM', 5],
    ]);
  });

  it('shows states by the unlock rule on a fresh save', () => {
    const states = build(progress()).rows.map((r) => r.cells.map((c) => c.state[0]).join(''));
    expect(states).toEqual(['olll' + 'l', 'olll', 'olll' + 'l']);
  });

  it('cleared cells carry their best time and a tick, open cells a hollow dot, locked a lock', () => {
    const model = build(progress(['w1-01'], { 'w1-01': 775 }));
    const [a, b, c] = model.rows[0]?.cells ?? [];
    expect(a).toMatchObject({ state: 'cleared', bestText: '0:12.91' });
    expect(b?.state).toBe('open');
    expect(c?.state).toBe('locked');
    expect(cellStatusText(a!)).toContain('0:12.91');
    expect(new Set([cellStatusText(a!), cellStatusText(b!), cellStatusText(c!)]).size).toBe(3);
  });

  it('header counts cleared of listed levels, not unknown ids', () => {
    expect(build(progress(['w1-01', 'w9-99'])).clearedText).toBe('CLEARED 1/14');
  });

  it('a world with a custom name list (Tandem gate failed) uses it', () => {
    const model = createLevelSelectModel({
      order: ORDER,
      progress: progress(),
      stepHz: 60,
      worldNames: { 1: 'GEARS', 2: 'FLIGHT', 3: 'GATES' },
    });
    expect(model.rows[2]?.name).toBe('GATES');
  });

  it('is empty with no world >= 1 levels', () => {
    const model = createLevelSelectModel({ order: [], progress: progress(), stepHz: 60 });
    expect(model.empty).toBe(true);
    expect(levelSelectLayout(model).some((i) => i.text === 'NO LEVELS')).toBe(true);
    expect(levelSelectStep(model, { kind: 'back' }).action).toEqual({ type: 'back' });
    expect(levelSelectStep(model, { kind: 'choose' }).action).toBeNull();
  });
});

describe('initial focus', () => {
  it('uses focusId (PLAY target or the level just played), else the first level', () => {
    expect(focusedCell(build(progress(), 'w2-01'))?.id).toBe('w2-01');
    expect(focusedCell(build(progress()))?.id).toBe('w1-01');
    expect(focusedCell(build(progress(), 'nope'))?.id).toBe('w1-01');
  });

  it('check 14: after a win the focused cell shows the new best', () => {
    const model = build(progress(['w1-01', 'w1-02'], { 'w1-02': 600 }), 'w1-02');
    expect(focusedCell(model)).toMatchObject({ id: 'w1-02', state: 'cleared', bestText: '0:10.00' });
    expect(detailLine(model)?.status).toBe('BEST 0:10.00');
  });
});

describe('navigation (checks 12, 13)', () => {
  it('Enter on a locked cell starts nothing, on open and cleared cells starts the level', () => {
    const model = build(progress(['w1-01']));
    expect(levelSelectStep(press(model, move('right'), move('right')), { kind: 'choose' }).action).toEqual({
      type: 'locked',
      levelId: 'w1-03',
    });
    expect(levelSelectStep(model, { kind: 'choose' }).action).toEqual({ type: 'start', levelId: 'w1-01' });
    expect(levelSelectStep(press(model, move('right')), { kind: 'choose' }).action).toEqual({
      type: 'start',
      levelId: 'w1-02',
    });
  });

  it('Esc and Backspace go back to the title', () => {
    expect(levelSelectStep(build(progress()), { kind: 'back' }).action).toEqual({ type: 'back' });
  });

  it('Down from column 5 of world 1 lands on w2-04, the last cell of world 2', () => {
    const model = press(build(progress()), ...Array(4).fill(move('right')), move('down'));
    expect(focusedCell(model)?.id).toBe('w2-04');
  });

  it('left/right stop at the row ends, up/down stop at the first and last world', () => {
    const model = build(progress());
    expect(focusedCell(press(model, move('left'), move('up')))?.id).toBe('w1-01');
    expect(focusedCell(press(model, move('down'), move('down'), move('down')))?.id).toBe('w3-01');
  });

  it('retry and none do nothing', () => {
    const model = build(progress());
    expect(levelSelectStep(model, { kind: 'retry' })).toEqual({ model, action: null });
    expect(levelSelectStep(model, { kind: 'none' })).toEqual({ model, action: null });
  });
});

describe('detailLine', () => {
  it('names the level and its state', () => {
    const model = build(progress(['w1-01'], { 'w1-01': 775 }));
    expect(detailLine(model)).toEqual({ title: '1-1 LEVEL W1-01', status: 'BEST 0:12.91' });
    expect(detailLine(press(model, move('right')))?.status).toBe('NOT CLEARED');
    expect(detailLine(press(model, move('right'), move('right')))?.status).toBe('LOCKED - CLEAR 1-2 FIRST');
  });

  it('truncates the caption at 24 characters', () => {
    const long = levelOrder([src('w1-01', 1, 'An extremely long level title indeed')]);
    const model = createLevelSelectModel({ order: long, progress: progress(), stepHz: 60 });
    expect(detailLine(model)?.title).toHaveLength(24);
  });
});

describe('layout (check 16)', () => {
  it('every element is on an integer pixel and 8 px inside 480x270, even with all rows and best times', () => {
    const done = ids(1, 5);
    const best = Object.fromEntries(done.map((id) => [id, 359_999]));
    for (const model of [build(progress()), build(progress(done, best), 'w1-05'), build(progress(done, best), 'w3-05')]) {
      const layout = levelSelectLayout(model);
      expect(layoutViolations(layout)).toEqual([]);
      expect(layoutViolations(decorationRects(layout.filter((i) => i.id.startsWith('cell:'))))).toEqual([]);
    }
  });

  it('rows are 40 px apart starting at y 40, cells 64x32 with a 6 px gap', () => {
    expect(cellRect(0, 0)).toMatchObject({ y: 40, w: 64, h: 32 });
    expect(cellRect(2, 0).y).toBe(120);
    expect(cellRect(0, 1).x - cellRect(0, 0).x).toBe(70);
  });

  it('no layout item overlaps the detail line', () => {
    const layout = levelSelectLayout(build(progress()));
    const cellsBottom = Math.max(...layout.filter((i) => i.id.startsWith('cell:')).map((i) => i.y + i.h));
    expect(cellsBottom).toBeLessThan(216);
  });
});

describe('B6: a world with more than MAX_CELLS_PER_ROW levels wraps', () => {
  const six = Array.from({ length: 6 }, (_, i) => ({ meta: { id: `w1-0${i + 1}`, title: `T${i + 1}`, world: 1 } }));
  const model = createLevelSelectModel({
    order: levelOrder(six as unknown as LevelSource[]),
    progress: { completedLevels: [], bestSteps: {} } as unknown as Progress,
    stepHz: 60,
  });

  it('splits into rows of at most 5 with the same world number', () => {
    expect(model.rows.map((r) => r.cells.length)).toEqual([5, 1]);
    expect(model.rows.map((r) => r.world)).toEqual([1, 1]);
  });

  it('no layout item leaves the screen, and the world label is drawn once', () => {
    const layout = levelSelectLayout(model);
    expect(layoutViolations(layout)).toEqual([]);
    expect(layout.filter((i) => i.id.startsWith('world:'))).toHaveLength(1);
  });
});

describe('B11-10: five world rows (expansion)', () => {
  const FIVE = levelOrder(
    [...ids(1, 5), ...ids(2, 5), ...ids(3, 5), ...ids(4, 5), ...ids(5, 5)].map((id) => src(id, Number(id[1]))),
  );
  const five = (p: Progress, focusId?: string): LevelSelectModel =>
    createLevelSelectModel({ order: FIVE, progress: p, stepHz: 60, focusId });

  it('names worlds 4 and 5 MOTION and SIGNALS; five rows of five', () => {
    const model = five(progress());
    expect(model.rows.map((r) => [r.world, r.name, r.cells.length])).toEqual([
      [1, 'GEARS', 5],
      [2, 'FLIGHT', 5],
      [3, 'TANDEM', 5],
      [4, 'MOTION', 5],
      [5, 'SIGNALS', 5],
    ]);
    expect(model.clearedText).toBe('CLEARED 0/25');
  });

  it('opens the first level of every world on a fresh save, the rest locked', () => {
    const open = five(progress()).rows.flatMap((r) => r.cells).filter((c) => c.state === 'open');
    expect(open.map((c) => c.id)).toEqual(['w1-01', 'w2-01', 'w3-01', 'w4-01', 'w5-01']);
  });

  it('every row fits at 480x270 including the detail line, for any focused row', () => {
    const done = [...ids(1, 5), ...ids(5, 5)];
    const best = Object.fromEntries(done.map((id) => [id, 359_999]));
    for (const focus of ['w1-01', 'w3-03', 'w5-05']) {
      const layout = levelSelectLayout(five(progress(done, best), focus));
      expect(layoutViolations(layout)).toEqual([]);
      expect(layoutViolations(decorationRects(layout.filter((i) => i.id.startsWith('cell:'))))).toEqual([]);
      const cellsBottom = Math.max(...layout.filter((i) => i.id.startsWith('cell:')).map((i) => i.y + i.h));
      const detailTop = layout.find((i) => i.id === 'detail:title')!.y;
      expect(cellsBottom).toBeLessThan(detailTop);
    }
  });

  it('keyboard reaches the fifth row and down stops there', () => {
    const model = press(five(progress()), ...Array(8).fill(move('down')));
    expect(focusedCell(model)?.id).toBe('w5-01');
  });

  it('gaps (w4-04, w5-04 absent): counts follow what ships, unlock skips the gap, label from id', () => {
    const gapped = levelOrder(
      [...ids(1, 5), ...ids(4, 5).filter((i) => i !== 'w4-04'), ...ids(5, 5).filter((i) => i !== 'w5-04')].map((id) =>
        src(id, Number(id[1])),
      ),
    );
    const model = createLevelSelectModel({
      order: gapped,
      progress: progress(['w4-01', 'w4-02', 'w4-03']),
      stepHz: 60,
    });
    expect(model.clearedText).toBe('CLEARED 3/13');
    const w4 = model.rows[1]?.cells ?? [];
    expect(w4.map((c) => c.label)).toEqual(['4-1', '4-2', '4-3', '4-5']);
    expect(w4[3]?.state).toBe('open'); // previous loaded level (4-3) is cleared
    expect(model.rows[2]?.cells.map((c) => c.label)).toEqual(['5-1', '5-2', '5-3', '5-5']);
    expect(model.rows[2]?.cells[3]?.lockedBy).toBe('w5-03');
  });

  it('a 14-level save (worlds 1-3) loads with five rows: nothing unlocked by it changes', () => {
    const old = progress(['w1-01', 'w2-01', 'w2-02'], { 'w2-02': 900 });
    const model = five(old);
    expect(model.rows[1]?.cells.map((c) => c.state[0]).join('')).toBe('ccoll');
    expect(model.rows[3]?.cells[0]?.state).toBe('open');
  });
});
