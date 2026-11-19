import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, createSaveStore } from '../save';
import type { Settings } from '../save';
import { createSafeStorage } from '../save/storage';
import { focusedId } from './menuFocus';
import { decorationRects, layoutViolations } from './menuLayout';
import { resolveIntent } from './menuInput';
import type { MenuIntent } from './menuInput';
import { settingsDrawPlan } from './panelDraw';
import { applySettingsAction, createSettingsModel, settingsLayout, settingsStep } from './settingsModel';
import type { SettingsModel } from './settingsModel';

const move = (dir: 'up' | 'down' | 'left' | 'right'): MenuIntent => ({ kind: 'move', dir });
const CHOOSE: MenuIntent = { kind: 'choose' };
const BACK: MenuIntent = { kind: 'back' };

function model(settings: Partial<Settings> = {}, osReduced = false): SettingsModel {
  return createSettingsModel({ settings: { ...DEFAULT_SETTINGS, ...settings }, osReducedMotion: osReduced });
}

describe('settings model (settings.md checks 5 and 6)', () => {
  it('opens with SOUND focused and shows sound ON when not muted', () => {
    const m = model();
    expect(focusedId(m.list)).toBe('sound');
    expect(m.values).toEqual({ sound: true, motion: false, effects: false });
    expect(model({ muted: true }).values.sound).toBe(false);
  });

  it('reduced motion with no saved value reads the OS flag; a saved value wins', () => {
    expect(model({}, true).values.motion).toBe(true);
    expect(model({}, false).values.motion).toBe(false);
    expect(model({ reducedMotion: false, reducedMotionChosen: true }, true).values.motion).toBe(false);
    expect(model({ reducedMotion: true, reducedMotionChosen: true }, false).values.motion).toBe(true);
  });

  it.each([
    ['choose', CHOOSE],
    ['left', move('left')],
    ['right', move('right')],
  ] as const)('%s flips the focused row and asks for one save', (_name, intent) => {
    const first = settingsStep(model(), intent);
    expect(first.action).toEqual({ type: 'change', patch: { muted: true } });
    expect(first.model.values.sound).toBe(false);
    expect(settingsStep(first.model, intent).action).toEqual({ type: 'change', patch: { muted: false } });
  });

  it('each row flips its own value; motion saves a chosen value', () => {
    const down = settingsStep(model(), move('down')).model;
    expect(settingsStep(down, CHOOSE).action).toEqual({
      type: 'change',
      patch: { reducedMotion: true, reducedMotionChosen: true },
    });
    const down2 = settingsStep(down, move('down')).model;
    expect(settingsStep(down2, CHOOSE).action).toEqual({ type: 'change', patch: { reducedEffects: true } });
  });

  it('flipping motion off while the OS says on saves an explicit false', () => {
    const down = settingsStep(model({}, true), move('down')).model;
    const next = settingsStep(down, CHOOSE);
    expect(next.action).toEqual({ type: 'change', patch: { reducedMotion: false, reducedMotionChosen: true } });
    expect(next.model.values.motion).toBe(false);
  });

  it('up and down move without wrapping and change nothing', () => {
    const m = model();
    expect(settingsStep(m, move('up')).model.list.focus).toBe(0);
    let cur = m;
    for (let i = 0; i < 6; i++) cur = settingsStep(cur, move('down')).model;
    expect(focusedId(cur.list)).toBe('back');
    expect(settingsStep(cur, move('down')).action).toBeNull();
    expect(cur.values).toEqual(m.values);
  });

  it('BACK row and Esc go back; left and right on BACK do nothing', () => {
    let cur = model();
    for (let i = 0; i < 3; i++) cur = settingsStep(cur, move('down')).model;
    expect(settingsStep(cur, CHOOSE).action).toEqual({ type: 'back' });
    expect(settingsStep(cur, move('left')).action).toBeNull();
    expect(settingsStep(model(), BACK).action).toEqual({ type: 'back' });
  });

  it('gear keys and Q E Z X produce no intent, so nothing changes (check 5)', () => {
    for (const code of ['ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX']) {
      expect(resolveIntent(new Set([code]), {}).kind).toBe('none');
    }
    const m = model();
    expect(settingsStep(m, { kind: 'none' })).toEqual({ model: m, action: null });
    expect(settingsStep(m, { kind: 'retry' }).action).toBeNull();
  });
});

describe('applySettingsAction', () => {
  it('writes the save once per change and pushes the audio settings to the engine', () => {
    const writes: string[] = [];
    const backing = {
      getItem: () => null,
      setItem: (_k: string, v: string) => void writes.push(v),
      removeItem: () => undefined,
    };
    const store = createSaveStore(createSafeStorage(backing));
    const calls: unknown[] = [];
    const engine = { applySettings: (x: unknown) => void calls.push(x) };
    const before = writes.length;
    applySettingsAction(store, { type: 'change', patch: { muted: true } }, engine);
    expect(writes.length - before).toBe(1);
    expect(store.getSettings().muted).toBe(true);
    expect(calls[0]).toMatchObject({ muted: true });
    applySettingsAction(store, { type: 'change', patch: { reducedMotion: true, reducedMotionChosen: true } }, engine);
    expect(writes.length - before).toBe(2);
    expect(store.getSettings()).toMatchObject({ reducedMotion: true, reducedMotionChosen: true });
  });

  it('works for the session when storage is blocked', () => {
    const fail = (): never => {
      throw new Error('blocked');
    };
    const store = createSaveStore(createSafeStorage({ getItem: fail, setItem: fail, removeItem: fail }));
    applySettingsAction(store, { type: 'change', patch: { reducedEffects: true } }, { applySettings: () => undefined });
    expect(store.getSettings().reducedEffects).toBe(true);
  });
});

describe('settings layout (check 7: shape plus word)', () => {
  it('is on integer pixels inside the margin, with a glyph box and word per row', () => {
    const layout = settingsLayout(model({ muted: true }));
    const items = layout.filter((i) => i.id.startsWith('item:'));
    expect(layoutViolations([...layout, ...decorationRects(items)])).toEqual([]);
    expect(layout.find((i) => i.id === 'heading')).toMatchObject({ x: 8, y: 8, scale: 2 });
    expect(layout.find((i) => i.id === 'value:sound')?.text).toBe('OFF');
    expect(layout.find((i) => i.id === 'value:motion')?.text).toBe('OFF');
    expect(layout.find((i) => i.id === 'item:sound')).toMatchObject({ x: 40, y: 60 });
    expect(layout.find((i) => i.id === 'item:effects')).toMatchObject({ y: 100 });
    expect(layout.find((i) => i.id === 'glyph:sound')).toMatchObject({ x: 320, w: 9, h: 9 });
  });

  it('fills the glyph when ON and leaves it hollow when OFF', () => {
    const on = settingsDrawPlan(model());
    const off = settingsDrawPlan(model({ muted: true }));
    expect(on.rects.length).toBeGreaterThan(off.rects.length);
    expect(on.texts.find((t) => t.id === 'value:sound')?.text).toBe('ON');
  });
});
