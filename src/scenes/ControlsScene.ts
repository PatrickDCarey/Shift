import Phaser from 'phaser';
import { isWindows, readPlatform } from '../ui/stickyKeysTip';
import { MenuCanvas, MenuKeys } from '../ui/MenuView';
import { controlsReturn, parseControlsData } from '../ui/menuFlow';
import type { ControlsSceneData } from '../ui/menuFlow';
import { controlsStep, createControlsModel } from '../ui/controlsModel';
import type { ControlsModel } from '../ui/controlsModel';
import { controlsDrawPlan } from '../ui/panelDraw';
import { StickyKeysTip } from '../ui/StickyKeysTipView';
import { SCENE_KEYS, getSaveStore } from './keys';
import { runJump } from './runJump';

/**
 * Controls screen (docs/design/features/controls-screen.md): every action and
 * every bound key, generated from the bindings. Back returns to whoever opened
 * it (title or pause) with focus on CONTROLS. SHOW STICKY KEYS TIP (Windows)
 * shows the tip without touching `settings.stickyKeysTipShown`.
 *
 * Owner: ui-engineer.
 */
export class ControlsScene extends Phaser.Scene {
  private model!: ControlsModel;
  private canvas!: MenuCanvas;
  private keys!: MenuKeys;
  private opener: ControlsSceneData = { from: 'title' };
  private tip: StickyKeysTip | null = null;

  constructor() {
    super(SCENE_KEYS.controls);
  }

  init(data?: unknown): void {
    this.opener = parseControlsData(data);
    this.tip = null;
  }

  create(): void {
    this.model = createControlsModel({ windows: isWindows(readPlatform()) });
    this.canvas = new MenuCanvas(this);
    this.keys = new MenuKeys(this);
    this.canvas.draw(controlsDrawPlan(this.model));
  }

  override update(): void {
    const intent = this.keys.poll();
    if (intent.kind === 'none') return;
    const next = controlsStep(this.model, intent);
    this.model = next.model;
    if (next.action === 'back') runJump(this, controlsReturn(this.opener));
    else if (next.action === 'showTip') this.showTip();
    else this.canvas.draw(controlsDrawPlan(this.model));
  }

  private showTip(): void {
    if (this.tip?.isVisible() === true) return;
    const reducedMotion = getSaveStore(this.registry).getSettings().reducedMotion;
    this.tip = new StickyKeysTip(this, { reducedMotion });
  }
}
