import { ControlsScene } from './ControlsScene';
import { LevelSelectScene } from './LevelSelectScene';
import { PauseScene } from './PauseScene';
import { ResultsScene } from './ResultsScene';
import { TitleScene } from './TitleScene';

/**
 * Every menu scene class, for one registration in `src/main.ts`. Register them
 * AFTER `GameScene`: Pause and Results are overlays and must draw on top.
 *
 * Owner: ui-engineer.
 */
export const MENU_SCENES = [TitleScene, LevelSelectScene, PauseScene, ResultsScene, ControlsScene] as const;
