import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  bestTimeText,
  clearedCount,
  createSafeStorage,
  createSaveStore,
  formatTime,
  isPlayable,
  levelLabel,
  levelOrder,
  levelState,
  nextLevel,
  playTarget,
  playableIds,
  previousInWorld,
  recordRun,
} from './index';
import type { KeyValueStorage, LevelSource } from './index';

const src = (id: string, world: number): LevelSource => ({ meta: { id, title: `T ${id}`, world } });
const ids = (world: number, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `w${world}-${String(i + 1).padStart(2, '0')}`);

/** The planned set: 5 + 4 + 5 levels, plus world 0 test rooms, deliberately out of order. */
const SHIPPED = [...ids(3, 5), 'w0-01', ...ids(2, 4), 'w0-02', ...ids(1, 5)].map((id) => src(id, Number(id[1])));
const ORDER = levelOrder(SHIPPED);

interface FakeStorage extends KeyValueStorage {
  readonly data: Map<string, string>;
  sets: number;
}

function fakeStorage(initial: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries(initial));
  const fake: FakeStorage = {
    data,
    sets: 0,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      fake.sets += 1;
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
  return fake;
}

const blocked = (): KeyValueStorage => {
  const boom = (): never => {
    throw new Error('SecurityError');
  };
  return { getItem: boom, setItem: boom, removeItem: boom };
};

describe('levelOrder', () => {
  it('sorts by world then id and never lists world 0 (check 7)', () => {
    expect(ORDER.map((e) => e.id)).toEqual([...ids(1, 5), ...ids(2, 4), ...ids(3, 5)]);
    expect(ORDER.some((e) => e.world === 0)).toBe(false);
  });

  it('does not mutate its input and keeps titles', () => {
    const input = [src('w2-01', 2), src('w1-01', 1)];
    const out = levelOrder(input);
    expect(input[0]?.meta.id).toBe('w2-01');
    expect(out[0]).toEqual({ id: 'w1-01', title: 'T w1-01', world: 1 });
  });

  it('is empty when only world 0 is loaded', () => {
    expect(levelOrder([src('w0-01', 0)])).toEqual([]);
  });
});

describe('isPlayable and levelState (checks 1-6)', () => {
  it('1: a fresh save opens exactly the first level of each world', () => {
    expect(playableIds(ORDER, [])).toEqual(['w1-01', 'w2-01', 'w3-01']);
    expect(levelState('w1-02', ORDER, [])).toBe('locked');
    expect(levelState('w1-01', ORDER, [])).toBe('open');
  });

  it('1: world 4 only appears when loaded, and then its first level is open', () => {
    const withFour = levelOrder([...SHIPPED, src('w4-01', 4), src('w4-02', 4)]);
    expect(playableIds(withFour, [])).toEqual(['w1-01', 'w2-01', 'w3-01', 'w4-01']);
  });

  it('2: completing w1-01 opens w1-02 and nothing else', () => {
    expect(playableIds(ORDER, ['w1-01'])).toEqual(['w1-01', 'w1-02', 'w2-01', 'w3-01']);
  });

  it('3: w1-01..w1-05 cleared keeps w2-01 open and w2-02 locked', () => {
    const done = ids(1, 5);
    expect(done.map((id) => levelState(id, ORDER, done))).toEqual(Array(5).fill('cleared'));
    expect(levelState('w2-01', ORDER, done)).toBe('open');
    expect(levelState('w2-02', ORDER, done)).toBe('locked');
  });

  it('4: out-of-order completion shows exactly what the rule computes', () => {
    const done = ['w1-03'];
    expect(levelState('w1-03', ORDER, done)).toBe('cleared');
    expect(isPlayable('w1-03', ORDER, done)).toBe(true);
    expect(isPlayable('w1-04', ORDER, done)).toBe(true);
    expect(isPlayable('w1-02', ORDER, done)).toBe(false);
  });

  it('5: gaps in numbering use the previous loaded level', () => {
    const order = levelOrder([src('w1-01', 1), src('w1-03', 1)]);
    expect(isPlayable('w1-03', order, ['w1-01'])).toBe(true);
    expect(isPlayable('w1-03', order, [])).toBe(false);
    expect(previousInWorld('w1-03', order)).toBe('w1-01');
    expect(previousInWorld('w1-01', order)).toBeNull();
  });

  it('6: unknown ids are ignored by the model and never playable', () => {
    const done = ['w9-99', 'w1-01'];
    expect(() => playableIds(ORDER, done)).not.toThrow();
    expect(playableIds(ORDER, done)).toEqual(['w1-01', 'w1-02', 'w2-01', 'w3-01']);
    expect(isPlayable('w9-99', ORDER, done)).toBe(false);
    expect(levelState('w9-99', ORDER, done)).toBe('locked');
    expect(clearedCount(ORDER, done)).toBe(1);
  });

  it('a level inserted mid-world stays locked until its predecessor is cleared', () => {
    const order = levelOrder([src('w1-01', 1), src('w1-02', 1), src('w1-03', 1)]);
    expect(levelState('w1-03', order, ['w1-01', 'w1-03'])).toBe('cleared');
    expect(levelState('w1-02', order, ['w1-03'])).toBe('locked');
  });

  it('accepts a Set as well as an array', () => {
    expect(isPlayable('w1-02', ORDER, new Set(['w1-01']))).toBe(true);
  });
});

describe('formatTime (check 8)', () => {
  it.each([
    [775, '0:12.91'],
    [3600, '1:00.00'],
    [59, '0:00.98'],
    [1, '0:00.01'],
    [359_999, '99:59.98'],
    [360_000, '99:59.99'],
    [9_999_999, '99:59.99'],
    [0, '0:00.00'],
    [-5, '0:00.00'],
    [Number.NaN, '0:00.00'],
  ])('%d steps -> %s', (steps, text) => {
    expect(formatTime(steps, 60)).toBe(text);
  });

  it('uses stepHz and rejects a bad one', () => {
    expect(formatTime(120, 120)).toBe('0:01.00');
    expect(formatTime(120, 0)).toBe('0:00.00');
  });
});

describe('playTarget (check 9) and nextLevel (check 10)', () => {
  it('9: fresh save -> w1-01', () => {
    expect(playTarget(ORDER, [])).toBe('w1-01');
  });
  it('9: w1-01 and w2-01 done -> w1-02', () => {
    expect(playTarget(ORDER, ['w1-01', 'w2-01'])).toBe('w1-02');
  });
  it('9: w1-01, w1-02 done -> w1-03; w1 all done -> w2-01', () => {
    expect(playTarget(ORDER, ['w1-01', 'w1-02'])).toBe('w1-03');
    expect(playTarget(ORDER, ids(1, 5))).toBe('w2-01');
  });
  it('9: all completed -> null; no levels -> null', () => {
    expect(playTarget(ORDER, ORDER.map((e) => e.id))).toBeNull();
    expect(playTarget([], [])).toBeNull();
  });
  it('10: crosses worlds and ends with null', () => {
    expect(nextLevel('w1-05', ORDER)).toBe('w2-01');
    expect(nextLevel('w2-04', ORDER)).toBe('w3-01');
    expect(nextLevel('w3-05', ORDER)).toBeNull();
    expect(nextLevel('w0-02', ORDER)).toBeNull();
    expect(nextLevel('nope', ORDER)).toBeNull();
  });
});

describe('labels and best times', () => {
  it('builds labels from ids', () => {
    expect(levelLabel('w1-03')).toBe('1-3');
    expect(levelLabel('w2-12')).toBe('2-12');
    expect(levelLabel('custom')).toBe('custom');
  });

  it('bestTimeText reads own keys only', () => {
    const progress = { completedLevels: ['w1-01'], bestSteps: { 'w1-01': 775 } };
    expect(bestTimeText(progress, 'w1-01', 60)).toBe('0:12.91');
    expect(bestTimeText(progress, 'w1-02', 60)).toBeNull();
    expect(bestTimeText(progress, 'constructor', 60)).toBeNull();
  });
});

describe('progress on the SaveStore (progress-save.md checks)', () => {
  it('1, 7: wins and settings survive a reload', () => {
    const backing = fakeStorage();
    const first = createSaveStore(createSafeStorage(backing));
    first.recordLevelComplete('w1-01', 775);
    first.updateSettings({ musicVolume: 0.3, muted: true });
    const second = createSaveStore(createSafeStorage(backing));
    expect(second.isLevelCompleted('w1-01')).toBe(true);
    expect(second.getBestSteps('w1-01')).toBe(775);
    expect(second.getSettings().musicVolume).toBe(0.3);
    expect(second.getSettings().muted).toBe(true);
    expect(isPlayable('w1-02', ORDER, second.getProgress().completedLevels)).toBe(true);
  });

  it('2: blocked storage falls back to memory, play and session best still work', () => {
    const store = createSaveStore(createSafeStorage(blocked()));
    expect(store.isPersistent()).toBe(false);
    const result = recordRun(store, { levelId: 'w1-01', world: 1, steps: 900, replay: false });
    expect(result).toMatchObject({ recorded: true, firstClear: true, newBest: true, best: 900 });
    expect(recordRun(store, { levelId: 'w1-01', world: 1, steps: 800, replay: false }).best).toBe(800);
    expect(playTarget(ORDER, store.getProgress().completedLevels)).toBe('w1-02');
  });

  it('2: a write that throws later keeps the value in memory', () => {
    const backing = fakeStorage();
    const store = createSaveStore(createSafeStorage(backing));
    backing.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    store.recordLevelComplete('w1-01', 700);
    expect(store.isPersistent()).toBe(false);
    expect(store.getBestSteps('w1-01')).toBe(700);
  });

  it('3: corrupt JSON loads defaults without throwing', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage({ [SAVE_KEY]: '{"version":1,"progress":' })));
    expect(store.getProgress().completedLevels).toEqual([]);
    expect(store.getSettings().muted).toBe(false);
  });

  it('4, 11: the stored JSON never holds an unlock field', () => {
    const backing = fakeStorage();
    const store = createSaveStore(createSafeStorage(backing));
    for (const [id, steps] of [
      ['w1-01', 700],
      ['w1-02', 650],
      ['w1-01', 600],
      ['w2-01', 5000],
    ] as const) {
      store.recordLevelComplete(id, steps);
    }
    const saved = JSON.parse(backing.data.get(SAVE_KEY) ?? '{}') as { progress: Record<string, unknown> };
    expect(Object.keys(saved.progress).sort()).toEqual(['bestSteps', 'completedLevels']);
    expect(backing.data.get(SAVE_KEY)).not.toMatch(/unlock|playable|locked/i);
  });

  it('5: a slower run keeps the best, a faster run replaces it', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    store.recordLevelComplete('w1-01', 700);
    expect(store.recordLevelComplete('w1-01', 900)).toMatchObject({ newBest: false, best: 700 });
    expect(store.recordLevelComplete('w1-01', 650)).toMatchObject({ newBest: true, best: 650 });
  });

  it('6: an unknown id loads and is still in the save after the next write', () => {
    const text = JSON.stringify({ version: 1, progress: { completedLevels: ['w9-99'], bestSteps: { 'w9-99': 10 } } });
    const backing = fakeStorage({ [SAVE_KEY]: text });
    const store = createSaveStore(createSafeStorage(backing));
    store.recordLevelComplete('w1-01', 500);
    const saved = JSON.parse(backing.data.get(SAVE_KEY) ?? '{}') as {
      progress: { completedLevels: string[]; bestSteps: Record<string, number> };
    };
    expect(saved.progress.completedLevels).toEqual(['w9-99', 'w1-01']);
    expect(saved.progress.bestSteps['w9-99']).toBe(10);
  });

  it('8: building a store and reading progress writes nothing (no per-frame writes)', () => {
    const backing = fakeStorage();
    const store = createSaveStore(createSafeStorage(backing));
    for (let i = 0; i < 600; i++) {
      store.getProgress();
      store.getSettings();
      store.isLevelCompleted('w1-01');
      store.getBestSteps('w1-01');
      isPlayable('w1-02', ORDER, store.getProgress().completedLevels);
    }
    expect(backing.sets).toBe(0);
    expect(backing.data.size).toBe(0);
  });

  it('9: replay mode and world 0 leave storage byte-identical', () => {
    const backing = fakeStorage();
    const store = createSaveStore(createSafeStorage(backing));
    store.recordLevelComplete('w1-01', 700);
    const before = JSON.stringify([...backing.data]);
    const setsBefore = backing.sets;
    const replay = recordRun(store, { levelId: 'w1-02', world: 1, steps: 100, replay: true });
    const testRoom = recordRun(store, { levelId: 'w0-02', world: 0, steps: 100, replay: false });
    expect(replay).toMatchObject({ recorded: false, skipped: true });
    expect(testRoom).toMatchObject({ recorded: false, skipped: true });
    expect(JSON.stringify([...backing.data])).toBe(before);
    expect(backing.sets).toBe(setsBefore);
  });

  it('a rejected record (over the step cap) is not "skipped"', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    expect(recordRun(store, { levelId: 'w1-01', world: 1, steps: 20_000_000, replay: false })).toMatchObject({
      recorded: false,
      skipped: false,
    });
  });
});

describe('muted setting', () => {
  it('a v1 save without it loads as false and keeps the other fields', () => {
    const text = JSON.stringify({ version: 1, settings: { musicVolume: 0.2 }, progress: {} });
    const store = createSaveStore(createSafeStorage(fakeStorage({ [SAVE_KEY]: text })));
    expect(store.getSettings().muted).toBe(false);
    expect(store.getSettings().musicVolume).toBe(0.2);
  });

  it('ignores a non-boolean muted', () => {
    const text = JSON.stringify({ version: 1, settings: { muted: 'yes' } });
    expect(createSaveStore(createSafeStorage(fakeStorage({ [SAVE_KEY]: text }))).getSettings().muted).toBe(false);
  });

  it('is kept by updateSettings and survives a reload', () => {
    const backing = fakeStorage();
    createSaveStore(createSafeStorage(backing)).updateSettings({ muted: true });
    expect(createSaveStore(createSafeStorage(backing)).getSettings().muted).toBe(true);
  });
});
