// Display objects and scene-side helpers that draw and drive sim state. Owner: gameplay-engineer [scene].
//
// Only the Phaser-free modules are re-exported here, so tests can import this
// barrel in Node. Phaser views are imported by file (LevelView, PlayerView,
// FeedbackFx, GameHud).

export { axisScroll, cameraScroll } from './camera';
export { embeddedMask, isEmbedded, type EmbeddedMask } from './embedded';
export { FOCUS_PROMPT_TEXT, focusPromptVisible } from './focusPrompt';
export { devLevel, DEV_LEVEL_ID } from './devLevel';
export { InputSampler } from './inputSampler';
export { advanceClock, easeToward, lerp, MAX_STEPS_PER_FRAME, renderPosition } from './interpolation';
export { attachKeyboard, handleKeyDown, handleKeyUp } from './keyboardInput';
export { chooseLevel, DEFAULT_LEVEL_ID, loadLevelSet, requestedLevelId, selectLevel } from './levelSelect';
export { loadGameParams } from './params';
export {
  chooseFrameSource,
  clampReplaySpeed,
  findSolutionText,
  MAX_REPLAY_SPEED,
  MIN_REPLAY_SPEED,
  parseReplayRequest,
  ReplayFeed,
  type FrameSource,
  type ReplayRequest,
} from './replay';
export { RunDriver, type FrameSupplier } from './runDriver';
