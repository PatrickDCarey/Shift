import { describe, expect, it, vi } from 'vitest';
import { createSafeStorage, createSaveStore, levelOrder, recordRun } from '../save';
import type { KeyValueStorage, LevelSource, RunRecordResult } from '../save';
import { applyAudioSettings, toggleMuted, updateAudioSetting } from './audioSettings';
import { DEFAULT_BINDINGS, withBinding } from './bindings';
import { controlsLayout, controlsRows, controlsStep, createControlsModel } from './controlsModel';
import { decorationRects, layoutViolations } from './menuLayout';
import { createPauseModel, pauseLayout, pauseStep } from './pauseModel';
import { createResultsModel, resultsLayout, resultsStep } from './resultsModel';
import { createTitleModel, titleLayout, titleStep } from './titleModel';
import type { TitleModel } from './titleModel';
import type { Direction, MenuIntent } from './menuInput';

const src = (id: string, world: number): LevelSource => ({ meta: { id, title: `Run ${id}`, world } });
const ids = (world: number, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `w${world}-${String(i + 1).padStart(2, '0')}`);
const ORDER = levelOrder([...ids(1, 5), ...ids(2, 4), ...ids(3, 5)].map((id) => src(id, Number(id[1]))));
const move = (dir: Direction): MenuIntent => ({ kind: 'move', dir });
const CHOOSE: MenuIntent = { kind: 'choose' };

function title(completed: string[] = [], persistent = true, focusId?: 'play' | 'levels' | 'controls'): TitleModel {
  return createTitleModel({ order: ORDER, completed, persistent, focusId });
}

describe('title (title-screen.md checks)', () => {
  it('1: an empty save shows PLAY, LEVELS, CONTROLS with focus on PLAY', () => {
    const model = title();
    expect(model.list.items.map((i) => i.label)).toEqual(['PLAY', 'LEVELS', 'CONTROLS']);
    expect(model.list.focus).toBe(0);
    expect(titleLayout(model).find((i) => i.id === 'name')?.text).toBe('REDSHIFT');
  });

  it.each([
    [[], 'w1-01'],
    [['w1-01', 'w1-02'], 'w1-03'],
    [ids(1, 5), 'w2-01'],
    [['w1-01', 'w2-01'], 'w1-02'],
  ])('2-5: PLAY with %j starts %s', (completed, target) => {
    expect(titleStep(title(completed), CHOOSE).action).toEqual({ type: 'start', levelId: target });
  });

  it('6: with everything cleared PLAY opens level select and the target line is hidden', () => {
    const model = title(ORDER.map((e) => e.id));
    expect(titleStep(model, CHOOSE).action).toEqual({ type: 'levels' });
    expect(model.playTargetText).toBeNull();
    expect(titleLayout(model).some((i) => i.id === 'playTarget')).toBe(false);
  });

  it('shows the PLAY target line, uppercase', () => {
    expect(title(['w1-01', 'w1-02']).playTargetText).toBe('1-3 RUN W1-03');
  });

  it('7, 8: LEVELS and CONTROLS open their screens; coming back focuses them', () => {
    const down = titleStep(title(), move('down')).model;
    expect(titleStep(down, CHOOSE).action).toEqual({ type: 'levels' });
    expect(titleStep(titleStep(down, move('down')).model, CHOOSE).action).toEqual({ type: 'controls' });
    expect(titleStep(title([], true, 'levels'), CHOOSE).action).toEqual({ type: 'levels' });
    expect(titleStep(title([], true, 'controls'), CHOOSE).action).toEqual({ type: 'controls' });
  });

  it('with no levels PLAY and LEVELS both open level select', () => {
    const model = createTitleModel({ order: [], completed: [], persistent: true });
    expect(model.noLevels).toBe(true);
    expect(titleStep(model, CHOOSE).action).toEqual({ type: 'levels' });
  });

  it('9: the not-saved line shows only when storage is not persistent', () => {
    const lines = (m: TitleModel): string[] => titleLayout(m).map((i) => i.text ?? '');
    expect(lines(title([], false))).toContain('PROGRESS IS NOT SAVED IN THIS WINDOW');
    expect(lines(title([], true))).not.toContain('PROGRESS IS NOT SAVED IN THIS WINDOW');
  });

  it('11: Esc and Backspace leave the screen and focus unchanged', () => {
    const model = titleStep(title(), move('down')).model;
    const out = titleStep(model, { kind: 'back' });
    expect(out.action).toBeNull();
    expect(out.model).toBe(model);
  });

  it('does not wrap at either end', () => {
    expect(titleStep(title(), move('up')).model.list.focus).toBe(0);
    const last = [move('down'), move('down'), move('down')].reduce((m, i) => titleStep(m, i).model, title());
    expect(last.list.focus).toBe(2);
  });

  it('layout: integer positions, 8 px margins, 20 px item pitch, items at 2x', () => {
    for (const model of [title(), title([], false), title(ORDER.map((e) => e.id), false)]) {
      const layout = titleLayout(model);
      expect(layoutViolations([...layout, ...decorationRects(layout.filter((i) => i.id.startsWith('item:')))])).toEqual([]);
    }
    const items = titleLayout(title()).filter((i) => i.id.startsWith('item:'));
    expect(items.map((i) => i.y)).toEqual([140, 160, 180]);
    expect(items.every((i) => i.scale === 2)).toBe(true);
  });
});

describe('pause (pause.md)', () => {
  const model = createPauseModel({ levelId: 'w1-03', title: 'Runway', step: 440, stepHz: 60 });

  it('has RESUME (focused), RESTART, CONTROLS, LEVELS with the caption and run time', () => {
    expect(model.list.items.map((i) => i.label)).toEqual(['RESUME', 'RESTART', 'CONTROLS', 'LEVELS']);
    expect(model.list.focus).toBe(0);
    expect(model.caption).toBe('1-3 RUNWAY');
    expect(model.timeText).toBe('TIME 0:07.33');
  });

  it('Esc, Backspace and P resume; R restarts', () => {
    expect(pauseStep(model, { kind: 'back' }).action).toBe('resume');
    expect(pauseStep(model, { kind: 'retry' }).action).toBe('restart');
  });

  it('choosing each item returns its action, in order', () => {
    const actions = [0, 1, 2, 3].map((n) => {
      const m = Array.from({ length: n }, () => move('down')).reduce((acc, i) => pauseStep(acc, i).model, model);
      return pauseStep(m, CHOOSE).action;
    });
    expect(actions).toEqual(['resume', 'restart', 'controls', 'levels']);
  });

  it('returns from CONTROLS with focus on CONTROLS', () => {
    const back = createPauseModel({ levelId: 'w1-03', title: 'Runway', step: 440, stepHz: 60, focusId: 'controls' });
    expect(pauseStep(back, CHOOSE).action).toBe('controls');
  });

  it('truncates a long caption to fit the 160 px panel', () => {
    const long = createPauseModel({ levelId: 'w1-03', title: 'An extremely long level title', step: 1, stepHz: 60 });
    expect(long.caption.length).toBeLessThanOrEqual(24);
  });

  it('layout: everything is inside the panel (160x120 at most) and the screen margins', () => {
    const layout = pauseLayout(model);
    expect(layoutViolations([...layout, ...decorationRects(layout.filter((i) => i.id.startsWith('item:')))])).toEqual([]);
    const panel = layout.find((i) => i.id === 'panel')!;
    expect(panel.w).toBeLessThanOrEqual(160);
    expect(panel.h).toBeLessThanOrEqual(120);
    for (const item of layout.filter((i) => i.id !== 'panel')) {
      expect(item.x).toBeGreaterThanOrEqual(panel.x);
      expect(item.x + item.w).toBeLessThanOrEqual(panel.x + panel.w);
      expect(item.y + item.h).toBeLessThanOrEqual(panel.y + panel.h);
    }
  });
});

const record = (over: Partial<RunRecordResult>): RunRecordResult => ({
  recorded: true,
  newBest: true,
  firstClear: true,
  best: 775,
  skipped: false,
  ...over,
});
const results = (rec: RunRecordResult, next: string | null = 'w1-02', steps = 775) =>
  createResultsModel({ levelId: 'w1-01', title: 'First', steps, stepHz: 60, record: rec, nextLevelId: next });

describe('results (results.md)', () => {
  it('1: first clear shows TIME and BEST equal, FIRST CLEAR, focus on NEXT', () => {
    const model = results(record({}));
    expect(model).toMatchObject({ timeText: 'TIME 0:12.91', bestText: 'BEST 0:12.91', marker: 'FIRST CLEAR' });
    expect(model.list.items.map((i) => i.label)).toEqual(['ENTER: NEXT LEVEL', 'R: RETRY', 'ESC: LEVELS']);
    expect(model.list.focus).toBe(0);
  });

  it('2, 4: a slower or equal run shows no marker and the old best', () => {
    expect(results(record({ firstClear: false, newBest: false, best: 700 }), 'w1-02', 900)).toMatchObject({
      marker: null,
      bestText: 'BEST 0:11.66',
      timeText: 'TIME 0:15.00',
    });
  });

  it('3: a new best shows the star marker', () => {
    const model = results(record({ firstClear: false, newBest: true, best: 650 }), 'w1-02', 650);
    expect(model.marker).toMatch(/NEW BEST$/);
    expect(model.marker?.length).toBeGreaterThan('NEW BEST'.length);
  });

  it('6: NEXT starts the next level; on the last level NEXT is absent and focus is on LEVELS', () => {
    expect(resultsStep(results(record({})), CHOOSE).action).toEqual({ type: 'next', levelId: 'w1-02' });
    const last = results(record({}), null);
    expect(last.list.items.map((i) => i.label)).toEqual(['R: RETRY', 'ESC: LEVELS']);
    expect(resultsStep(last, CHOOSE).action).toEqual({ type: 'levels' });
  });

  it('7, 8: R and RETRY retry; Esc and LEVELS open level select', () => {
    const model = results(record({}));
    expect(resultsStep(model, { kind: 'retry' }).action).toEqual({ type: 'retry' });
    expect(resultsStep(model, { kind: 'back' }).action).toEqual({ type: 'levels' });
    const retry = resultsStep(model, move('down')).model;
    expect(resultsStep(retry, CHOOSE).action).toEqual({ type: 'retry' });
    expect(resultsStep(resultsStep(retry, move('down')).model, CHOOSE).action).toEqual({ type: 'levels' });
  });

  it('11: world 0 shows the panel without NEXT or NOT SAVED', () => {
    const skipped = results(record({ recorded: false, skipped: true, newBest: false, firstClear: false, best: null }), null);
    expect(skipped.notSaved).toBe(false);
    expect(skipped.marker).toBeNull();
    expect(skipped.bestText).toBeNull();
    expect(skipped.list.items.map((i) => i.id)).not.toContain('next');
  });

  it('a rejected record shows the muted NOT SAVED line', () => {
    const rejected = results(record({ recorded: false, newBest: false, firstClear: false, best: null }));
    expect(rejected.notSaved).toBe(true);
    expect(resultsLayout(rejected).some((i) => i.text === 'NOT SAVED')).toBe(true);
  });

  it('12: time format on the panel', () => {
    expect(results(record({}), null, 3600).timeText).toBe('TIME 1:00.00');
  });

  it('layout: inside the 200x140 panel and the screen margins for every variant', () => {
    const variants = [
      results(record({})),
      results(record({ firstClear: false, newBest: true }), null),
      results(record({ recorded: false, newBest: false, firstClear: false, best: null })),
      results(record({}), 'w1-02', 359_999),
    ];
    for (const model of variants) {
      const layout = resultsLayout(model);
      expect(layoutViolations([...layout, ...decorationRects(layout.filter((i) => i.id.startsWith('item:')))])).toEqual([]);
      const panel = layout.find((i) => i.id === 'panel')!;
      expect(panel.w).toBeLessThanOrEqual(200);
      expect(panel.h).toBeLessThanOrEqual(140);
      for (const item of layout.filter((i) => i.id !== 'panel')) {
        expect(item.x).toBeGreaterThanOrEqual(panel.x);
        expect(item.x + item.w).toBeLessThanOrEqual(panel.x + panel.w);
        expect(item.y + item.h).toBeLessThanOrEqual(panel.y + panel.h);
      }
    }
  });

  it('end to end with the store: first win then a faster win give FIRST CLEAR then NEW BEST', () => {
    const store = createSaveStore(createSafeStorage(null));
    const first = recordRun(store, { levelId: 'w1-01', world: 1, steps: 800, replay: false });
    expect(results(first, 'w1-02', 800).marker).toBe('FIRST CLEAR');
    const faster = recordRun(store, { levelId: 'w1-01', world: 1, steps: 700, replay: false });
    expect(results(faster, 'w1-02', 700).marker).toMatch(/NEW BEST/);
    const slower = recordRun(store, { levelId: 'w1-01', world: 1, steps: 900, replay: false });
    expect(results(slower, 'w1-02', 900)).toMatchObject({ marker: null, bestText: 'BEST 0:11.66' });
  });
});

describe('controls (controls-screen.md)', () => {
  it('1: rows are generated from DEFAULT_BINDINGS, each bound code exactly once, in the specified order', () => {
    const rows = controlsRows(DEFAULT_BINDINGS);
    expect(rows.map((r) => r.label)).toEqual(['MOVE (HOLD)', 'SHIFT UP', 'SHIFT DOWN', 'JUMP', 'RESTART', 'PAUSE']);
    expect(rows.map((r) => r.caps)).toEqual([
      ['←', '→', 'A', 'D'],
      ['R Shift', 'E', 'X'],
      ['L Shift', 'Q', 'Z'],
      ['Space', 'W', '↑'],
      ['R'],
      ['Esc', 'P'],
    ]);
    const all = rows.flatMap((r) => r.codes);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual([...new Set(Object.values(DEFAULT_BINDINGS).flat())].sort());
  });

  it('2: an extra jump key shows up in the JUMP row (rows are not hand-written)', () => {
    const doctored = withBinding(DEFAULT_BINDINGS, 'jump', ['Space', 'KeyW', 'ArrowUp', 'KeyJ']);
    const jump = controlsRows(doctored).find((r) => r.id === 'jump');
    expect(jump?.caps).toEqual(['Space', 'W', '↑', 'J']);
  });

  it('5: the sticky keys tip item exists on Windows only, never auto-focused, and does not touch the flag', () => {
    const win = createControlsModel({ windows: true });
    expect(win.list.items.map((i) => i.label)).toEqual(['SHOW STICKY KEYS TIP', 'BACK']);
    expect(win.list.focus).toBe(1);
    const tipFocused = controlsStep(win, move('up')).model;
    expect(controlsStep(tipFocused, CHOOSE).action).toBe('showTip');
    const other = createControlsModel({ windows: false });
    expect(other.list.items.map((i) => i.label)).toEqual(['BACK']);
    expect(controlsStep(other, CHOOSE).action).toBe('back');
  });

  it('Esc and Backspace go back; other intents do nothing', () => {
    const model = createControlsModel({ windows: true });
    expect(controlsStep(model, { kind: 'back' }).action).toBe('back');
    expect(controlsStep(model, { kind: 'retry' }).action).toBeNull();
  });

  it('7: every element is on an integer position inside 8 px margins, with and without the tip item', () => {
    for (const windows of [true, false]) {
      const layout = controlsLayout(createControlsModel({ windows }));
      expect(layoutViolations([...layout, ...decorationRects(layout.filter((i) => i.id.startsWith('item:')))])).toEqual([]);
    }
  });

  it('caps are 11 px tall, 6 x characters + 5 wide, 6 px apart, starting at x 120', () => {
    const layout = controlsLayout(createControlsModel({ windows: false }));
    const first = layout.filter((i) => i.id.startsWith('cap:move:'));
    expect(first.map((c) => [c.x, c.w, c.h])).toEqual([[120, 11, 11], [137, 11, 11], [154, 11, 11], [171, 11, 11]]);
    expect(layout.find((i) => i.id === 'label:move')?.x).toBe(16);
    expect(layout.find((i) => i.id === 'cap:move:0')?.y).toBe(36);
    expect(layout.find((i) => i.id === 'cap:shiftUp:0')?.y).toBe(56);
    expect(layout.find((i) => i.id === 'menuRow')?.text).toHaveLength(53);
  });

  it('a row that would pass x 472 wraps to a second line (dev guard)', () => {
    const crowded = withBinding(
      DEFAULT_BINDINGS,
      'jump',
      Array.from({ length: 10 }, (_, i) => `Numpad${i}`),
    );
    const layout = controlsLayout(createControlsModel({ windows: false, bindings: crowded }));
    expect(layoutViolations(layout)).toEqual([]);
    const ys = new Set(layout.filter((i) => i.id.startsWith('cap:jump:')).map((i) => i.y));
    expect(ys.size).toBeGreaterThan(1);
  });
});

describe('audio settings helper', () => {
  const stubEngine = () => ({ applySettings: vi.fn() });
  const memoryStore = () => createSaveStore(createSafeStorage(null));

  it('passes volumes and mute to audio.applySettings', () => {
    const engine = stubEngine();
    applyAudioSettings({ ...memoryStore().getSettings(), musicVolume: 0.3, sfxVolume: 0.6, muted: true }, engine);
    expect(engine.applySettings).toHaveBeenCalledWith({ musicVolume: 0.3, sfxVolume: 0.6, muted: true });
  });

  it('updateAudioSetting saves the change, then applies the saved result', () => {
    const engine = stubEngine();
    const store = memoryStore();
    updateAudioSetting(store, { sfxVolume: 9 }, engine); // out of range: the store clamps it
    expect(store.getSettings().sfxVolume).toBe(1);
    expect(engine.applySettings).toHaveBeenCalledWith({ musicVolume: 0.7, sfxVolume: 1, muted: false });
  });

  it('toggleMuted flips, persists and applies', () => {
    const engine = stubEngine();
    const backing = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (k) => backing.get(k) ?? null,
      setItem: (k, v) => void backing.set(k, v),
      removeItem: (k) => void backing.delete(k),
    };
    const store = createSaveStore(createSafeStorage(storage));
    expect(toggleMuted(store, engine)).toBe(true);
    expect(toggleMuted(store, engine)).toBe(false);
    expect(engine.applySettings).toHaveBeenLastCalledWith(expect.objectContaining({ muted: false }));
    toggleMuted(store, engine);
    expect(createSaveStore(createSafeStorage(storage)).getSettings().muted).toBe(true);
  });
});

describe('B6-16 results key line', () => {
  it('ENTER: NEXT LEVEL stays in the primary colour, R and ESC are muted, even with focus elsewhere', async () => {
    const { resultsDrawPlan } = await import('./panelDraw');
    const model = resultsStep(results(record({})), move('down')).model;
    const roles = Object.fromEntries(resultsDrawPlan(model).texts.map((t) => [t.id, t.role]));
    expect(roles['item:next']).toBe('text');
    expect(roles['item:levels']).toBe('muted');
    expect(roles['item:retry']).toBe('text'); // focused
  });
});
