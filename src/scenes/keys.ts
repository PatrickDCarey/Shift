/** Scene keys, so scenes never reference each other by string literal. */
export const SCENE_KEYS = {
  boot: 'Boot',
  game: 'Game',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
