// Local saves (progress, settings) via localStorage with in-memory fallback. Owner: ui-engineer.

export {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  SAVE_VERSION,
  defaultSave,
  isValidLevelId,
  isValidSteps,
  parseSave,
  sanitizeProgress,
  sanitizeSettings,
  serializeSave,
} from './schema';
export type { Progress, SaveData, Settings } from './schema';
export { createSafeStorage, probeLocalStorage } from './storage';
export type { KeyValueStorage, SafeStorage } from './storage';
export { SAVE_KEY, createSaveStore } from './store';
export type { LevelResult, SaveStore } from './store';
export {
  bestStepsOf,
  bestTimeText,
  clearedCount,
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
} from './progress';
export type {
  CompletedIds,
  LevelEntry,
  LevelSource,
  LevelState,
  RunRecordInput,
  RunRecordResult,
} from './progress';
