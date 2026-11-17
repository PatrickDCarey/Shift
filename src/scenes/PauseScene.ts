import Phaser from 'phaser';
import { MenuCanvas, MenuKeys } from '../ui/MenuView';
import { PAUSE_RESULT_EVENT, parsePauseData, pauseOutcome } from '../ui/menuFlow';
import type { PauseSceneData } from '../ui/menuFlow';
import { PAUSE_MENU_KEYS, createPauseModel, pauseStep } from '../ui/pauseModel';
import type { PauseModel } from '../ui/pauseModel';
import { pauseDrawPlan } from '../ui/panelDraw';
import { SCENE_KEYS } from './keys';
import { runJump } from './runJump';

/**
 * Pause menu (docs/design/features/pause.md), an overlay launched by the game
 * scene, which keeps running and owns the freeze. Keyboard only; every choice
 * comes from `pauseModel`. RESUME and RESTART are reported on the game scene's
 * event emitter (`PAUSE_RESULT_EVENT`); CONTROLS and LEVELS leave.
 *
 * Owner: ui-engineer.
 */
export class PauseScene extends Phaser.Scene {
  private model!: PauseModel;
  private canvas!: MenuCanvas;
  private keys!: MenuKeys;
  private launchData: PauseSceneData | null = null;

  constructor() {
    super(SCENE_KEYS.pause);
  }

  init(data?: unknown): void {
    this.launchData = parsePauseData(data);
  }

  create(): void {
    if (this.launchData === null) {
      this.close('resume'); // bad launch data must never leave the game stuck paused
      return;
    }
    this.model = createPauseModel(this.launchData);
    this.canvas = new MenuCanvas(this, true);
    this.keys = new MenuKeys(this);
    this.canvas.draw(pauseDrawPlan(this.model));
  }

  override update(): void {
    if (this.launchData === null) return;
    const intent = this.keys.poll(PAUSE_MENU_KEYS);
    if (intent.kind === 'none') return;
    const next = pauseStep(this.model, intent);
    this.model = next.model;
    if (next.action === null) {
      this.canvas.draw(pauseDrawPlan(this.model));
      return;
    }
    const outcome = pauseOutcome(next.action, this.launchData);
    if (outcome.kind === 'report') this.close(outcome.result.action);
    else runJump(this, outcome.jump);
  }

  private close(action: 'resume' | 'restart'): void {
    this.scene.get(SCENE_KEYS.game).events.emit(PAUSE_RESULT_EVENT, { action });
    this.scene.stop();
  }
}
