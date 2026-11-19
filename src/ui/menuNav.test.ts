import { describe, expect, it } from 'vitest';
import { HeldKeys } from './heldKeys';
import { levelSelectJump, parseLevelSelectData, parseTitleData, titleJump } from './menuNav';
import { createMenuInput, stepMenuInput } from './menuInput';

describe('titleJump', () => {
  it('maps every action', () => {
    expect(titleJump({ type: 'start', levelId: 'w1-03' })).toEqual({ target: 'game', data: { levelId: 'w1-03' } });
    expect(titleJump({ type: 'levels' }, null)).toEqual({ target: 'levelSelect' });
    expect(titleJump({ type: 'controls' }, 'w1-02')).toEqual({ target: 'controls', data: { from: 'title' } });
  });

  it('LEVELS opens level select focused on the PLAY target (BUG-5)', () => {
    expect(titleJump({ type: 'levels' }, 'w1-02')).toEqual({ target: 'levelSelect', data: { focusId: 'w1-02' } });
    expect(titleJump({ type: 'levels' })).toEqual({ target: 'levelSelect' });
  });
});

describe('levelSelectJump', () => {
  it('starts, goes back to the title on LEVELS, and stays put on a locked cell', () => {
    expect(levelSelectJump({ type: 'start', levelId: 'w2-01' })).toEqual({ target: 'game', data: { levelId: 'w2-01' } });
    expect(levelSelectJump({ type: 'back' })).toEqual({ target: 'title', data: { focusId: 'levels' } });
    expect(levelSelectJump({ type: 'locked', levelId: 'w1-02' })).toBeNull();
  });
});

describe('scene data parsing', () => {
  it('keeps only valid focus ids', () => {
    expect(parseTitleData({ focusId: 'levels' })).toEqual({ focusId: 'levels' });
    expect(parseTitleData({ focusId: 'nope' })).toEqual({});
    expect(parseTitleData(undefined)).toEqual({});
    expect(parseTitleData(null)).toEqual({});
    expect(parseLevelSelectData({ focusId: 'w1-02' })).toEqual({ focusId: 'w1-02' });
    expect(parseLevelSelectData({ focusId: 7 })).toEqual({});
    expect(parseLevelSelectData('x')).toEqual({});
  });
});

describe('HeldKeys', () => {
  it('tracks down and up, ignores repeats and clears on blur', () => {
    const keys = new HeldKeys();
    keys.keyDown('Enter', true);
    expect([...keys.snapshot()]).toEqual([]);
    keys.keyDown('ArrowDown');
    keys.keyDown('KeyW');
    keys.keyUp('KeyW');
    expect([...keys.snapshot()]).toEqual(['ArrowDown']);
    keys.clear();
    expect(keys.snapshot().size).toBe(0);
  });

  it('a key held across a scene change does not choose by itself', () => {
    const keys = new HeldKeys();
    keys.keyDown('Enter', true); // auto-repeat of the press that opened this scene
    const step = stepMenuInput(createMenuInput(), keys.snapshot());
    expect(step.intent.kind).toBe('none');
  });
});
