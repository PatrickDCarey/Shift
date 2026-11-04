import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSaveStore } from '../save';
import { REGISTRY_KEYS, SCENE_KEYS, getSaveStore, setSaveStore } from './keys';

describe('scene and registry keys', () => {
  it('scene keys are unique', () => {
    const values = Object.values(SCENE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('registry keys are unique and namespaced', () => {
    const values = Object.values(REGISTRY_KEYS);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(v.startsWith('redshift.')).toBe(true);
  });
});

describe('shared SaveStore (M2-40)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('every reader gets the one instance main.ts installed', () => {
    const registry = new Map<string, unknown>();
    const store = createSaveStore();
    setSaveStore(registry, store);
    expect(getSaveStore(registry)).toBe(store);
    expect(getSaveStore(registry)).toBe(getSaveStore(registry));
  });

  it('a missing store is a wiring error that names the key', () => {
    expect(() => getSaveStore(new Map())).toThrow(REGISTRY_KEYS.saveStore);
  });

  it('boots with storage blocked: the store falls back to memory and still records', () => {
    const blocked = {
      getItem: (): never => {
        throw new Error('SecurityError');
      },
      setItem: (): never => {
        throw new Error('SecurityError');
      },
      removeItem: (): never => {
        throw new Error('SecurityError');
      },
    };
    vi.stubGlobal('localStorage', blocked);
    const registry = new Map<string, unknown>();
    // Same calls as src/main.ts.
    expect(() => setSaveStore(registry, createSaveStore())).not.toThrow();
    const store = getSaveStore(registry);
    expect(store.isPersistent()).toBe(false);
    expect(store.recordLevelComplete('w1-01', 300).recorded).toBe(true);
    expect(getSaveStore(registry).getBestSteps('w1-01')).toBe(300);
  });
});
