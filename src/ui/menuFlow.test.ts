import { describe, expect, it } from 'vitest';
import type { RunRecordResult } from '../save/progress';
import { createControlsModel, controlsStep } from './controlsModel';
import {
  controlsReturn,
  parseControlsData,
  parsePauseData,
  parseResultsData,
  pauseLaunchData,
  pauseOutcome,
  resultsLaunchData,
  resultsOutcome,
} from './menuFlow';
import { createMenuInput, stepMenuInput } from './menuInput';
import type { Direction, MenuIntent } from './menuInput';
import { controlsDrawPlan, layoutDrawPlan, pauseDrawPlan, resultsDrawPlan } from './panelDraw';
import { createPauseModel, PAUSE_MENU_KEYS, pauseStep } from './pauseModel';
import { createResultsModel, RESULTS_MENU_KEYS, resultsLayout, resultsStep } from './resultsModel';
import { pauseLayout } from './pauseModel';
import { controlsLayout } from './controlsModel';
import { layoutViolations } from './menuLayout';
import type { LayoutItem } from './menuLayout';

const pause = pauseLaunchData('w1-03', 'Runway', 440, 60);
const record: RunRecordResult = { recorded: true, newBest: true, firstClear: true, skipped: false, best: 775 };
const win = { levelId: 'w1-01', title: 'First', result: { wonAtStep: 775 }, saved: record };
const down: MenuIntent = { kind: 'move', dir: 'down' as Direction };

/** Feed key codes (one frame each) through the real menu input, then the model. */
function keysToIntent(held: string[], options = PAUSE_MENU_KEYS): MenuIntent {
  return stepMenuInput(createMenuInput(), held, options).intent;
}

describe('pause flow', () => {
  it('validates launch data and drops bad shapes', () => {
    expect(parsePauseData(pause)).toEqual(pause);
    expect(parsePauseData({ ...pause, focusId: 'controls' })).toMatchObject({ focusId: 'controls' });
    expect(parsePauseData({ ...pause, focusId: 'nope' })).toEqual(pause);
    expect(parsePauseData({ ...pause, stepHz: 0 })).toBeNull();
    expect(parsePauseData({ ...pause, levelId: '' })).toBeNull();
    expect(parsePauseData(undefined)).toBeNull();
  });

  it('keyboard only: Esc and P resume, R restarts, arrows plus Enter choose', () => {
    const model = createPauseModel(pause);
    expect(pauseStep(model, keysToIntent(['Escape'])).action).toBe('resume');
    expect(pauseStep(model, { kind: 'back' }).action).toBe('resume');
    const p = stepMenuInput(createMenuInput(), ['KeyP'], PAUSE_MENU_KEYS).intent;
    expect(pauseStep(model, p).action).toBe('resume');
    expect(pauseStep(model, keysToIntent(['KeyR'])).action).toBe('restart');
    const two = pauseStep(pauseStep(model, down).model, down).model;
    expect(pauseStep(two, { kind: 'choose' }).action).toBe('controls');
  });

  it('does not wrap past the ends', () => {
    let m = createPauseModel(pause);
    for (let i = 0; i < 6; i++) m = pauseStep(m, down).model;
    expect(m.list.focus).toBe(3);
    expect(pauseStep(m, { kind: 'move', dir: 'up' }).model.list.focus).toBe(2);
  });

  it('routes each item', () => {
    expect(pauseOutcome('resume', pause)).toEqual({ kind: 'report', result: { action: 'resume' } });
    expect(pauseOutcome('restart', pause)).toEqual({ kind: 'report', result: { action: 'restart' } });
    expect(pauseOutcome('controls', pause)).toEqual({ kind: 'goto', jump: { target: 'controls', data: { from: 'pause', pause } } });
    expect(pauseOutcome('levels', pause)).toEqual({
      kind: 'goto',
      jump: { target: 'levelSelect', data: { focusId: 'w1-03' }, stopGame: true },
    });
  });
});

describe('results flow', () => {
  const input = resultsLaunchData(win, 60, 'w1-02');

  it('builds the launch data from a win and validates it', () => {
    expect(input).toEqual({ levelId: 'w1-01', title: 'First', steps: 775, stepHz: 60, record, nextLevelId: 'w1-02' });
    expect(parseResultsData(input)).toEqual(input);
    expect(parseResultsData({ ...input, record: { ...record, best: 'x' } })).toBeNull();
    expect(parseResultsData({ ...input, nextLevelId: undefined })).toBeNull();
    expect(parseResultsData({ ...input, nextLevelId: null })).toMatchObject({ nextLevelId: null });
    expect(parseResultsData(null)).toBeNull();
  });

  it('Enter is NEXT LEVEL (primary), R retries, Esc opens level select on this level', () => {
    const model = createResultsModel(input);
    expect(model.list.items[0]?.label).toBe('ENTER: NEXT LEVEL');
    const enter = stepMenuInput(createMenuInput(), ['Enter'], RESULTS_MENU_KEYS).intent;
    const action = resultsStep(model, enter).action;
    expect(action).toEqual({ type: 'next', levelId: 'w1-02' });
    expect(resultsOutcome(action!, 'w1-01')).toEqual({ target: 'game', data: { levelId: 'w1-02' } });
    const r = stepMenuInput(createMenuInput(), ['KeyR'], RESULTS_MENU_KEYS).intent;
    expect(resultsOutcome(resultsStep(model, r).action!, 'w1-01')).toEqual({ target: 'game', data: { levelId: 'w1-01' } });
    const esc = stepMenuInput(createMenuInput(), ['Escape'], RESULTS_MENU_KEYS).intent;
    expect(resultsOutcome(resultsStep(model, esc).action!, 'w1-01')).toEqual({
      target: 'levelSelect',
      data: { focusId: 'w1-01' },
      stopGame: true,
    });
  });

  it('the last level has no next: Enter goes to level select', () => {
    const model = createResultsModel({ ...input, nextLevelId: null });
    expect(model.list.items.map((i) => i.id)).toEqual(['retry', 'levels']);
    expect(resultsStep(model, { kind: 'choose' }).action).toEqual({ type: 'levels' });
  });

  it('a key held through the win does nothing until released and pressed again', () => {
    const held = createMenuInput(['Enter']);
    expect(stepMenuInput(held, ['Enter'], RESULTS_MENU_KEYS).intent.kind).toBe('none');
    const blocked = stepMenuInput(createMenuInput(), ['Enter'], { ...RESULTS_MENU_KEYS, blocked: true });
    expect(stepMenuInput(blocked.state, ['Enter'], RESULTS_MENU_KEYS).intent.kind).toBe('none');
  });
});

describe('controls flow', () => {
  it('Back returns to the opener with focus on CONTROLS', () => {
    expect(controlsReturn(parseControlsData({ from: 'title' }))).toEqual({ target: 'title', data: { focusId: 'controls' } });
    expect(controlsReturn(parseControlsData({ from: 'pause', pause }))).toEqual({
      target: 'pause',
      data: { ...pause, focusId: 'controls' },
    });
    expect(parseControlsData({ from: 'pause', pause: { levelId: '' } })).toEqual({ from: 'title' });
    expect(parseControlsData(undefined)).toEqual({ from: 'title' });
  });

  it('keyboard: Esc and Enter on BACK both go back; the Windows tip is reachable by Up', () => {
    const model = createControlsModel({ windows: true });
    expect(controlsStep(model, keysToIntent(['Escape'], {})).action).toBe('back');
    expect(controlsStep(model, { kind: 'choose' }).action).toBe('back');
    const up = controlsStep(model, { kind: 'move', dir: 'up' }).model;
    expect(controlsStep(up, { kind: 'choose' }).action).toBe('showTip');
  });
});

/** No two text lines touch: at least 2 px between the boxes of any two texts that overlap in x. */
function touching(items: readonly LayoutItem[]): string[] {
  const texts = items.filter((i) => i.kind === 'text');
  const bad: string[] = [];
  texts.forEach((a, i) =>
    texts.slice(i + 1).forEach((b) => {
      const xOverlap = a.x < b.x + b.w && b.x < a.x + a.w;
      const gap = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
      if (xOverlap && gap < 2) bad.push(`${a.id}/${b.id}`);
    }),
  );
  return bad;
}

describe('layouts', () => {
  it('pause lines do not touch (playtest 2026-11-16)', () => {
    expect(touching(pauseLayout(createPauseModel(pause)))).toEqual([]);
  });

  it('results lines do not touch and stay on the grid, with and without NEXT', () => {
    for (const next of ['w1-02', null]) {
      const layout = resultsLayout(createResultsModel(resultsLaunchData(win, 60, next)));
      expect(touching(layout)).toEqual([]);
      expect(layoutViolations(layout)).toEqual([]);
    }
  });

  it('controls lines do not touch', () => {
    expect(touching(controlsLayout(createControlsModel({ windows: true })))).toEqual([]);
  });

  it('every focused item is decorated by shape (caret and frame), not colour alone', () => {
    const plan = pauseDrawPlan(createPauseModel(pause));
    expect(plan.texts.some((t) => t.id === 'caret')).toBe(true);
    expect(plan.rects.some((r) => r.role === 'focus')).toBe(true);
    expect(resultsDrawPlan(createResultsModel(resultsLaunchData(win, 60, 'w1-02'))).texts.some((t) => t.id === 'caret')).toBe(true);
    expect(controlsDrawPlan(createControlsModel({ windows: false })).texts.some((t) => t.id === 'caret')).toBe(true);
    expect(layoutDrawPlan([], createPauseModel(pause).list)).toEqual({ texts: [], rects: [] });
  });

  it('draw plans use whole pixels', () => {
    const plans = [pauseDrawPlan(createPauseModel(pause)), resultsDrawPlan(createResultsModel(resultsLaunchData(win, 60, 'w1-02')))];
    for (const plan of plans) {
      for (const r of plan.rects) expect([r.x, r.y, r.w, r.h].every(Number.isInteger)).toBe(true);
      for (const t of plan.texts) expect([t.x, t.y].every(Number.isInteger)).toBe(true);
    }
  });
});
