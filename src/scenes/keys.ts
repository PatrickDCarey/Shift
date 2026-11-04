/**
 * Scene keys and game-wide registry keys, so scenes never reference each other
 * or shared services by string literal. Owner: tech-lead.
 */
import type { SaveStore } from '../save';

/** Scene keys, so scenes never reference each other by string literal. */
export const SCENE_KEYS = {
  boot: 'Boot',
  game: 'Game',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];

/**
 * Keys of game-wide services in the Phaser registry (`game.registry`, the same
 * object as `scene.registry` in every scene). `src/main.ts` fills them in its
 * `preBoot` callback, before any scene runs (architecture.md §9).
 */
export const REGISTRY_KEYS = {
  /** The one `SaveStore` for the page session. */
  saveStore: 'redshift.saveStore',
} as const;

/** The registry surface used here; `Phaser.Data.DataManager` satisfies it, a `Map` does in tests. */
export interface RegistryLike {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

/** Called once, by `src/main.ts`. */
export function setSaveStore(registry: RegistryLike, store: SaveStore): void {
  registry.set(REGISTRY_KEYS.saveStore, store);
}

/**
 * The shared store, for scenes: `getSaveStore(this.registry)`. Throws if
 * main.ts did not install one: a wiring bug, never a storage problem (blocked
 * storage still yields an in-memory store).
 */
export function getSaveStore(registry: RegistryLike): SaveStore {
  const store = registry.get(REGISTRY_KEYS.saveStore) as SaveStore | undefined;
  if (store === undefined) {
    throw new Error(`No SaveStore in the registry under "${REGISTRY_KEYS.saveStore}"; src/main.ts installs it in preBoot.`);
  }
  return store;
}
