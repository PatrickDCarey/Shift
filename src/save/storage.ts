/**
 * Safe key-value storage: `localStorage` when it works, in-memory otherwise.
 *
 * Every access to `localStorage` (including merely reading the global, which
 * throws SecurityError when site data is blocked, e.g. in some sandboxed
 * itch.io iframes) is inside try/catch. If a write fails later (quota, storage
 * turned off mid-session) the value is kept in memory so the session still
 * behaves, and `isPersistent()` turns false.
 *
 * Owner: ui-engineer.
 */

/** The subset of the Web Storage API the game uses. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SafeStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** True while reads and writes actually reach the backing storage. */
  isPersistent(): boolean;
}

const PROBE_KEY = '__redshift_probe__';

/** Look up `localStorage` and verify it accepts a write. Returns null if unusable. */
export function probeLocalStorage(): KeyValueStorage | null {
  try {
    const storage = globalThis.localStorage as KeyValueStorage | undefined;
    if (!storage) return null;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

/**
 * @param backing storage to use; defaults to a probed `localStorage`.
 *   Pass `null` to force the in-memory fallback.
 */
export function createSafeStorage(backing: KeyValueStorage | null = probeLocalStorage()): SafeStorage {
  const memory = new Map<string, string>();
  let usable = backing !== null;

  return {
    get(key) {
      if (usable && backing) {
        try {
          return backing.getItem(key);
        } catch {
          usable = false;
        }
      }
      return memory.get(key) ?? null;
    },
    set(key, value) {
      memory.set(key, value);
      if (usable && backing) {
        try {
          backing.setItem(key, value);
        } catch {
          usable = false;
        }
      }
    },
    remove(key) {
      memory.delete(key);
      if (usable && backing) {
        try {
          backing.removeItem(key);
        } catch {
          usable = false;
        }
      }
    },
    isPersistent: () => usable,
  };
}
