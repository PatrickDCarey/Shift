import type Phaser from 'phaser';
import type { FlowJump } from '../ui/menuFlow';
import { SCENE_KEYS } from './keys';

/**
 * Carry out a `FlowJump` from a menu scene: optionally stop the still-running
 * game scene first, then start the target (which also closes the calling scene).
 *
 * Owner: ui-engineer.
 */
export function runJump(scene: Phaser.Scene, jump: FlowJump): void {
  if (jump.stopGame === true) scene.scene.stop(SCENE_KEYS.game);
  scene.scene.start(SCENE_KEYS[jump.target], jump.data);
}
