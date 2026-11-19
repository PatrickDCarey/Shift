import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SAVE_KEY,
  SAVE_VERSION,
  createSafeStorage,
  createSaveStore,
  defaultSave,
  parseSave,
  probeLocalStorage,
  serializeSave,
} from './index';
import type { KeyValueStorage } from './index';
import { MAX_SAVE_CHARS } from './schema';

/** A working fake of Web Storage. */
function fakeStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** Storage whose every method throws, like a blocked iframe or private mode. */
function blockedStorage(): KeyValueStorage {
  const boom = (): never => {
    throw new Error('SecurityError');
  };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

describe('parseSave', () => {
  it('returns defaults for null', () => {
    expect(parseSave(null)).toEqual(defaultSave());
  });

  it.each(['', '{', 'not json', 'null', '42', '"x"', '[]', '{}', '{"version":"1"}', '{"version":1.5}', '{"version":0}'])(
    'returns defaults for bad data %j',
    (text) => {
      expect(parseSave(text)).toEqual(defaultSave());
    },
  );

  it('round-trips a valid save', () => {
    const save = {
      version: SAVE_VERSION,
      settings: { musicVolume: 0.2, sfxVolume: 1, reducedEffects: true, reducedMotion: true, reducedMotionChosen: true, muted: true, stickyKeysTipShown: true },
      progress: { completedLevels: ['w1-01', 'w1-02'], bestSteps: { 'w1-01': 612, 'w1-02': 1200 } },
    };
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it('validates field by field and keeps the good fields', () => {
    const text = JSON.stringify({
      version: 1,
      settings: { musicVolume: 'loud', sfxVolume: 7, reducedEffects: 'yes', reducedMotion: true, extra: 1 },
      progress: {
        completedLevels: ['w1-01', 'w1-01', 5, '../etc', '__proto__', null],
        bestSteps: { 'w1-01': 600, 'w1-02': -3, 'w1-03': 1.5, 'w1-04': '9', '__proto__': 5, 'bad id': 4 },
      },
    });
    const save = parseSave(text);
    expect(save.settings.musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
    expect(save.settings.sfxVolume).toBe(1);
    expect(save.settings.reducedEffects).toBe(false);
    expect(save.settings.reducedMotion).toBe(true);
    expect(save.settings).not.toHaveProperty('extra');
    expect(save.progress.completedLevels).toEqual(['w1-01']);
    expect(save.progress.bestSteps).toEqual({ 'w1-01': 600 });
  });

  it('clamps volumes and rejects NaN or Infinity', () => {
    const save = parseSave('{"version":1,"settings":{"musicVolume":-4,"sfxVolume":1e999}}');
    expect(save.settings.musicVolume).toBe(0);
    expect(save.settings.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
  });

  it('survives wrong container types', () => {
    const save = parseSave('{"version":1,"settings":[1],"progress":{"completedLevels":"w1-01","bestSteps":[]}}');
    expect(save).toEqual(defaultSave());
  });

  it('reads a newer-version save field by field and stamps the current version', () => {
    const save = parseSave('{"version":99,"settings":{"sfxVolume":0.1,"newThing":true},"progress":{}}');
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.settings.sfxVolume).toBe(0.1);
  });

  it('does not pollute Object.prototype from a __proto__ key', () => {
    parseSave('{"version":1,"progress":{"bestSteps":{"__proto__":{"polluted":3}}},"__proto__":{"polluted":true}}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('caps the number of stored levels', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `l${i}`);
    expect(parseSave(JSON.stringify({ version: 1, progress: { completedLevels: ids } })).progress.completedLevels).toHaveLength(256);
  });
});

describe('createSafeStorage', () => {
  it('reads and writes through a working backing store', () => {
    const backing = fakeStorage();
    const s = createSafeStorage(backing);
    s.set('a', '1');
    expect(backing.data.get('a')).toBe('1');
    expect(s.get('a')).toBe('1');
    s.remove('a');
    expect(s.get('a')).toBeNull();
    expect(s.isPersistent()).toBe(true);
  });

  it('works in memory with no backing store', () => {
    const s = createSafeStorage(null);
    s.set('a', '1');
    expect(s.get('a')).toBe('1');
    s.remove('a');
    expect(s.get('a')).toBeNull();
    expect(s.isPersistent()).toBe(false);
  });

  it('falls back to memory when every call throws, without throwing itself', () => {
    const s = createSafeStorage(blockedStorage());
    expect(() => s.set('a', '1')).not.toThrow();
    expect(s.get('a')).toBe('1');
    expect(() => s.remove('a')).not.toThrow();
    expect(s.get('a')).toBeNull();
    expect(s.isPersistent()).toBe(false);
  });

  it('keeps the value in memory when only writes fail (quota exceeded)', () => {
    const backing = { ...fakeStorage(), setItem: (): never => { throw new Error('QuotaExceededError'); } };
    const s = createSafeStorage(backing);
    s.set('a', '1');
    expect(s.get('a')).toBe('1');
    expect(s.isPersistent()).toBe(false);
  });

  it('survives reads that throw after a good start', () => {
    const backing = { ...fakeStorage({ a: '1' }), getItem: (): never => { throw new Error('boom'); } };
    const s = createSafeStorage(backing);
    expect(s.get('a')).toBeNull();
    expect(s.isPersistent()).toBe(false);
  });

  it('probeLocalStorage returns null when there is no usable localStorage (node)', () => {
    expect(probeLocalStorage()).toBeNull();
  });

  it('probeLocalStorage handles a throwing localStorage getter', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(probeLocalStorage()).toBeNull();
      expect(() => createSafeStorage()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  it('probeLocalStorage uses a working localStorage and cleans its probe key', () => {
    const backing = fakeStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: backing });
    try {
      expect(probeLocalStorage()).toBe(backing);
      expect(backing.data.size).toBe(0);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe('createSaveStore', () => {
  it('starts from defaults on empty storage', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    expect(store.getSnapshot()).toEqual(defaultSave());
    expect(store.isPersistent()).toBe(true);
  });

  it('recovers from corrupt stored JSON and overwrites it on the next change', () => {
    const backing = fakeStorage({ [SAVE_KEY]: '{corrupt' });
    const store = createSaveStore(createSafeStorage(backing));
    expect(store.getSnapshot()).toEqual(defaultSave());
    store.updateSettings({ reducedMotion: true });
    expect(JSON.parse(backing.data.get(SAVE_KEY) ?? '') as unknown).toMatchObject({ version: SAVE_VERSION });
  });

  it('persists settings and loads them in a new store', () => {
    const backing = fakeStorage();
    createSaveStore(createSafeStorage(backing)).updateSettings({ musicVolume: 0.25, reducedEffects: true });
    const reloaded = createSaveStore(createSafeStorage(backing));
    expect(reloaded.getSettings().musicVolume).toBe(0.25);
    expect(reloaded.getSettings().reducedEffects).toBe(true);
  });

  it('ignores invalid settings patches field by field', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    const next = store.updateSettings({ musicVolume: Number.NaN, sfxVolume: 3, reducedMotion: 'x' as unknown as boolean });
    expect(next.musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
    expect(next.sfxVolume).toBe(1);
    expect(next.reducedMotion).toBe(false);
  });

  it('never mutates previously returned snapshots', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    const before = store.getSnapshot();
    const frozen = JSON.stringify(before);
    store.updateSettings({ sfxVolume: 0.1 });
    store.recordLevelComplete('w1-01', 100);
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it('records completion and keeps the lowest step count', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    expect(store.recordLevelComplete('w1-01', 700)).toEqual({ recorded: true, newBest: true, best: 700 });
    expect(store.recordLevelComplete('w1-01', 900)).toEqual({ recorded: true, newBest: false, best: 700 });
    expect(store.recordLevelComplete('w1-01', 650)).toEqual({ recorded: true, newBest: true, best: 650 });
    expect(store.recordLevelComplete('w1-01', 650)).toEqual({ recorded: true, newBest: false, best: 650 });
    expect(store.getProgress().completedLevels).toEqual(['w1-01']);
    expect(store.getBestSteps('w1-01')).toBe(650);
    expect(store.isLevelCompleted('w1-01')).toBe(true);
    expect(store.isLevelCompleted('w1-02')).toBe(false);
    expect(store.getBestSteps('w1-02')).toBeNull();
  });

  it('rejects bad level ids and step counts without changing anything', () => {
    const store = createSaveStore(createSafeStorage(fakeStorage()));
    const before = store.getSnapshot();
    expect(store.recordLevelComplete('', 10).recorded).toBe(false);
    expect(store.recordLevelComplete('__proto__', 10).recorded).toBe(false);
    expect(store.recordLevelComplete('w1-01', 0).recorded).toBe(false);
    expect(store.recordLevelComplete('w1-01', 1.5).recorded).toBe(false);
    expect(store.recordLevelComplete('w1-01', Number.NaN).recorded).toBe(false);
    expect(store.getSnapshot()).toBe(before);
    expect(store.getBestSteps('toString')).toBeNull();
  });

  it('marks the Sticky Keys tip shown and remembers it', () => {
    const backing = fakeStorage();
    const store = createSaveStore(createSafeStorage(backing));
    expect(store.getSettings().stickyKeysTipShown).toBe(false);
    store.markStickyKeysTipShown();
    store.markStickyKeysTipShown();
    expect(createSaveStore(createSafeStorage(backing)).getSettings().stickyKeysTipShown).toBe(true);
  });

  it('reset wipes everything, including storage', () => {
    const backing = fakeStorage();
    const store = createSaveStore(createSafeStorage(backing));
    store.recordLevelComplete('w1-01', 100);
    store.updateSettings({ reducedMotion: true });
    store.reset();
    expect(store.getSnapshot()).toEqual(defaultSave());
    expect(backing.data.has(SAVE_KEY)).toBe(false);
  });

  describe('with storage blocked', () => {
    it('loads defaults, keeps working in memory and reports non-persistent', () => {
      const store = createSaveStore(createSafeStorage(blockedStorage()));
      expect(store.getSnapshot()).toEqual(defaultSave());
      expect(() => store.updateSettings({ musicVolume: 0.1 })).not.toThrow();
      expect(() => store.recordLevelComplete('w1-01', 500)).not.toThrow();
      expect(store.getSettings().musicVolume).toBe(0.1);
      expect(store.getBestSteps('w1-01')).toBe(500);
      store.markStickyKeysTipShown();
      expect(store.getSettings().stickyKeysTipShown).toBe(true);
      store.reset();
      expect(store.getSnapshot()).toEqual(defaultSave());
      expect(store.isPersistent()).toBe(false);
    });

    it('works with the pure in-memory fallback too', () => {
      const store = createSaveStore(createSafeStorage(null));
      store.recordLevelComplete('w2-01', 321);
      expect(store.getBestSteps('w2-01')).toBe(321);
      expect(store.isPersistent()).toBe(false);
    });
  });
});

describe('parseSave hardening (M1-58)', () => {
  it('stored text above 64 KiB gets defaults without parsing', () => {
    const big = JSON.stringify({ version: 1, settings: { muted: true }, progress: { completedLevels: ['a'] }, pad: 'x'.repeat(70_000) });
    expect(big.length).toBeGreaterThan(MAX_SAVE_CHARS);
    expect(parseSave(big)).toEqual(defaultSave());
  });

  it('text just under the limit still parses', () => {
    const text = JSON.stringify({ version: 1, settings: { muted: true }, progress: {}, pad: 'x'.repeat(60_000) });
    expect(text.length).toBeLessThan(MAX_SAVE_CHARS);
    expect(parseSave(text).settings.muted).toBe(true);
  });

  it('bestSteps has no prototype and survives hostile ids', () => {
    const text = JSON.stringify({ version: 1, progress: { bestSteps: { 'w1-01': 100 } } }).replace('"w1-01"', '"__proto__":7,"w1-01"');
    const { bestSteps } = parseSave(text).progress;
    expect(Object.getPrototypeOf(bestSteps)).toBeNull();
    expect(Object.keys(bestSteps)).toEqual(['w1-01']);
    expect(Object.keys(bestSteps)).not.toContain('__proto__');
    expect((bestSteps as Record<string, number>)['toString']).toBeUndefined();
  });

  it('completedLevels is cut before filtering (junk past the cap is never looked at)', () => {
    const junk = Array.from({ length: 300 }, () => '!!bad');
    const text = JSON.stringify({ version: 1, progress: { completedLevels: [...junk, 'w1-01'] } });
    expect(parseSave(text).progress.completedLevels).toEqual([]);
  });
});
