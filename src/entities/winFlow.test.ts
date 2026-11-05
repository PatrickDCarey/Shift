import { describe, expect, it, vi } from 'vitest';
import type { RunResult } from '../core';
import { createSafeStorage, createSaveStore, type SaveStore } from '../save';
import { gridLevel } from './testkit';
import { recordWin } from './winFlow';

const world1 = gridLevel(['.....', '.@.E.', '#####'], 'w1-98');
const world0 = gridLevel(['.....', '.@.E.', '#####'], 'w0-98');

function result(levelId: string, wonAtStep: number): RunResult {
  return { wonAtStep, solution: { levelId, levelVersion: 1, steps: wonAtStep + 3, runs: [] } };
}

function memoryStore(): SaveStore {
  return createSaveStore(createSafeStorage(null));
}

describe('recordWin', () => {
  it('records once with the level id and wonAtStep (not the recording length)', () => {
    const store = memoryStore();
    const spy = vi.spyOn(store, 'recordLevelComplete');
    const event = recordWin(store, world1, result('w1-98', 775), false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('w1-98', 775);
    expect(store.getBestSteps('w1-98')).toBe(775);
    expect(event).toMatchObject({ levelId: 'w1-98', world: 1, replay: false });
    expect(event.saved).toMatchObject({ recorded: true, newBest: true, firstClear: true, best: 775, skipped: false });
    expect(event.result.wonAtStep).toBe(775);
  });

  it('reports a slower repeat as neither a new best nor a first clear', () => {
    const store = memoryStore();
    recordWin(store, world1, result('w1-98', 700), false);
    const again = recordWin(store, world1, result('w1-98', 800), false);
    expect(again.saved).toMatchObject({ newBest: false, firstClear: false, best: 700 });
  });

  it('never writes in world 0 or in replay mode', () => {
    const store = memoryStore();
    const spy = vi.spyOn(store, 'recordLevelComplete');
    expect(recordWin(store, world0, result('w0-98', 100), false).saved.skipped).toBe(true);
    expect(recordWin(store, world1, result('w1-98', 100), true).saved.skipped).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    expect(store.getProgress().completedLevels).toEqual([]);
  });

  it('flags replay mode on the event so a results UI can skip its panel', () => {
    expect(recordWin(memoryStore(), world1, result('w1-98', 9), true).replay).toBe(true);
    expect(recordWin(memoryStore(), world1, result('w1-98', 9), false).replay).toBe(false);
  });

  it('reports a rejected record (not skipped, not recorded) and keeps going', () => {
    const event = recordWin(memoryStore(), world1, result('w1-98', 0), false);
    expect(event.saved).toMatchObject({ recorded: false, skipped: false });
  });
});
