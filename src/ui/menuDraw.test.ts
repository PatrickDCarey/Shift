import { describe, expect, it } from 'vitest';
import { levelSelectDrawPlan, outlineBars, titleDrawPlan } from './menuDraw';
import { createLevelSelectModel } from './levelSelectModel';
import { layoutViolations } from './menuLayout';
import { createTitleModel } from './titleModel';
import type { LevelEntry } from '../save/progress';
import type { Progress } from '../save/schema';

const ORDER: readonly LevelEntry[] = [
  { id: 'w1-01', title: 'FIRST', world: 1 },
  { id: 'w1-02', title: 'SECOND', world: 1 },
  { id: 'w2-01', title: 'THIRD', world: 2 },
];

const progress = (done: string[]): Progress =>
  ({ completedLevels: done, bestSteps: Object.fromEntries(done.map((d) => [d, 600])) }) as unknown as Progress;

describe('outlineBars', () => {
  it('is four bars outside the rect', () => {
    const bars = outlineBars({ x: 10, y: 10, w: 20, h: 10 }, 2, 'focus');
    expect(bars).toHaveLength(4);
    expect(bars[0]).toMatchObject({ x: 8, y: 8, w: 24, h: 2 });
    expect(bars[3]).toMatchObject({ x: 30, y: 10, w: 2, h: 10 });
  });
});

describe('titleDrawPlan', () => {
  it('draws a caret and a frame only on the focused item', () => {
    const plan = titleDrawPlan(createTitleModel({ order: ORDER, completed: [], persistent: true }));
    expect(plan.texts.filter((t) => t.id === 'caret')).toHaveLength(1);
    expect(plan.rects).toHaveLength(4);
    expect(plan.texts.find((t) => t.id === 'item:play')?.role).toBe('text');
    expect(plan.texts.find((t) => t.id === 'item:levels')?.role).toBe('muted');
  });

  it('keeps everything inside the margin, with the focus decoration', () => {
    for (const focusId of ['play', 'levels', 'controls'] as const) {
      const plan = titleDrawPlan(createTitleModel({ order: ORDER, completed: [], persistent: false, focusId }));
      expect(layoutViolations(plan.rects)).toEqual([]);
    }
  });
});

describe('levelSelectDrawPlan', () => {
  const model = createLevelSelectModel({ order: ORDER, progress: progress(['w1-01']), stepHz: 60 });
  const plan = levelSelectDrawPlan(model);

  it('differs by shape per state: cleared has an inner bar', () => {
    // cleared (8 bars) + open (4) + open (4) + focus on cell 0 (4)
    expect(plan.rects).toHaveLength(8 + 4 + 4 + 4);
    expect(plan.texts.find((t) => t.id === 'label:0:1')?.role).toBe('text');
  });

  it('mutes locked cells', () => {
    const locked = levelSelectDrawPlan(createLevelSelectModel({ order: ORDER, progress: progress([]), stepHz: 60 }));
    expect(locked.texts.find((t) => t.id === 'label:0:1')?.role).toBe('muted');
  });

  it('stays inside the screen', () => {
    expect(layoutViolations(plan.rects)).toEqual([]);
  });
});
