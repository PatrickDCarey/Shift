import Phaser from 'phaser';
import { prefersReducedMotion } from '../entities/motionPrefs';
import { MenuCanvas, MenuKeys } from '../ui/MenuView';
import { parseSettingsData, settingsReturn } from '../ui/menuFlow';
import type { SettingsSceneData } from '../ui/menuFlow';
import { settingsDrawPlan } from '../ui/panelDraw';
import { applySettingsAction, createSettingsModel, settingsStep } from '../ui/settingsModel';
import type { SettingsModel } from '../ui/settingsModel';
import { SCENE_KEYS, getSaveStore } from './keys';
import { runJump } from './runJump';

/**
 * Settings screen (docs/design/features/settings.md): SOUND, REDUCED MOTION,
 * REDUCED EFFECTS, BACK. Keyboard only; every choice comes from
 * `settingsModel`. Each flip is saved at once; mute reaches the audio engine
 * at once. Back returns to whoever opened it with focus on SETTINGS.
 *
 * Owner: ui-engineer.
 */
export class SettingsScene extends Phaser.Scene {
  private model!: SettingsModel;
  private canvas!: MenuCanvas;
  private keys!: MenuKeys;
  private opener: SettingsSceneData = { from: 'title' };

  constructor() {
    super(SCENE_KEYS.settings);
  }

  init(data?: unknown): void {
    this.opener = parseSettingsData(data);
  }

  create(): void {
    const osReducedMotion = prefersReducedMotion(typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined);
    this.model = createSettingsModel({ settings: getSaveStore(this.registry).getSettings(), osReducedMotion });
    this.canvas = new MenuCanvas(this);
    this.keys = new MenuKeys(this);
    this.canvas.draw(settingsDrawPlan(this.model));
  }

  override update(): void {
    const intent = this.keys.poll();
    if (intent.kind === 'none') return;
    const next = settingsStep(this.model, intent);
    this.model = next.model;
    if (next.action?.type === 'back') {
      runJump(this, settingsReturn(this.opener));
      return;
    }
    if (next.action !== null) applySettingsAction(getSaveStore(this.registry), next.action);
    this.canvas.draw(settingsDrawPlan(this.model));
  }
}
