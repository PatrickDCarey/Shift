/**
 * Scene keys and game-wide registry keys, so scenes never reference each other
 * or shared services by string literal. Owner: tech-lead.
 */
import type { SaveStore } from '../save';
import { requestedLevelId } from '../entities/levelSelect';
import { parseReplayRequest } from '../entities/replay';

/** Scene keys, so scenes never reference each other by string literal. */
export const SCENE_KEYS = {
  boot: 'Boot',
  game: 'Game',
  title: 'Title',
  levelSelect: 'LevelSelect',
  pause: 'Pause',
  results: 'Results',
  controls: 'Controls',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];

/**
 * The scene Boot starts (B6-24). A deep link, `?level=<id>` or `?replay=1`,
 * opens the game scene directly, exactly as before the menus existed: the QA
 * hook, every Playwright spec and the replay tool rely on it, and GameScene
 * still reads the level, `replay` and `speed` from the URL itself. Whether a
 * replay is allowed stays GameScene's call (`REPLAY_AVAILABLE`). Anything else
 * (a plain load, the itch.io page) opens the title.
 */
export function bootTarget(search: string): SceneKey {
  const deepLink = requestedLevelId(search) !== null || parseReplayRequest(search).active;
  return deepLink ? SCENE_KEYS.game : SCENE_KEYS.title;
}

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
