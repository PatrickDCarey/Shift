/**
 * Where the title and level select actions lead, and what the scene hands
 * over. Pure: targets are `SCENE_KEYS` names, mapped by the scene, so this
 * module never imports the scene layer.
 *
 * Owner: ui-engineer.
 */
import type { LevelSelectAction } from './levelSelectModel';
import type { TitleAction, TitleItemId } from './titleModel';

export type SceneTarget = 'game' | 'title' | 'levelSelect' | 'controls' | 'settings';

export interface SceneJump {
  readonly target: SceneTarget;
  readonly data?: { readonly levelId?: string; readonly focusId?: string; readonly from?: 'title' };
}

/** Data the title and level select scenes accept in `init`. */
export interface TitleSceneData {
  readonly focusId?: TitleItemId;
}
export interface LevelSelectSceneData {
  readonly focusId?: string;
}

/** `playTargetId` is the level PLAY would start; LEVELS opens level select focused on it (level-select.md, Initial focus). */
export function titleJump(action: TitleAction, playTargetId: string | null = null): SceneJump {
  switch (action.type) {
    case 'start':
      return { target: 'game', data: { levelId: action.levelId } };
    case 'levels':
      return playTargetId === null ? { target: 'levelSelect' } : { target: 'levelSelect', data: { focusId: playTargetId } };
    case 'controls':
      return { target: 'controls', data: { from: 'title' } };
    case 'settings':
      return { target: 'settings', data: { from: 'title' } };
  }
}

/** A locked cell never leaves the scene (the scene nudges the lock); Back returns to the title with LEVELS focused. */
export function levelSelectJump(action: LevelSelectAction): SceneJump | null {
  switch (action.type) {
    case 'start':
      return { target: 'game', data: { levelId: action.levelId } };
    case 'back':
      return { target: 'title', data: { focusId: 'levels' } };
    case 'locked':
      return null;
  }
}

/** Keep only values of the right shape from scene data (it crosses a scene boundary). */
export function parseTitleData(data: unknown): TitleSceneData {
  const id = (data as { focusId?: unknown } | null | undefined)?.focusId;
  return id === 'play' || id === 'levels' || id === 'controls' || id === 'settings' ? { focusId: id } : {};
}

export function parseLevelSelectData(data: unknown): LevelSelectSceneData {
  const id = (data as { focusId?: unknown } | null | undefined)?.focusId;
  return typeof id === 'string' && id.length > 0 ? { focusId: id } : {};
}
