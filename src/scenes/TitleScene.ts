import Phaser from 'phaser';
import { levelOrder } from '../save/progress';
import { loadLevelSet } from '../entities/levelSelect';
import { LEVEL_FILES } from '../entities/levelFiles';
import { MenuCanvas, MenuKeys } from '../ui/MenuView';
import { titleDrawPlan } from '../ui/menuDraw';
import { parseTitleData, titleJump } from '../ui/menuNav';
import type { TitleSceneData } from '../ui/menuNav';
import { createTitleModel, titleStep } from '../ui/titleModel';
import type { TitleModel } from '../ui/titleModel';
import { SCENE_KEYS, getSaveStore } from './keys';

/**
 * Title screen (docs/design/features/title-screen.md). Keyboard only; all
 * choices come from `titleModel`. Rebuilt from the save on every open.
 *
 * Owner: ui-engineer.
 */
export class TitleScene extends Phaser.Scene {
  private model!: TitleModel;
  private canvas!: MenuCanvas;
  private keys!: MenuKeys;
  private focusId: TitleSceneData['focusId'];

  constructor() {
    super(SCENE_KEYS.title);
  }

  init(data?: unknown): void {
    this.focusId = parseTitleData(data).focusId;
  }

  create(): void {
    const store = getSaveStore(this.registry);
    const order = levelOrder(loadLevelSet(LEVEL_FILES).levels);
    this.model = createTitleModel({
      order,
      completed: store.getProgress().completedLevels,
      persistent: store.isPersistent(),
      focusId: this.focusId,
    });
    this.canvas = new MenuCanvas(this);
    this.keys = new MenuKeys(this);
    this.canvas.draw(titleDrawPlan(this.model));
  }

  override update(): void {
    const intent = this.keys.poll();
    if (intent.kind === 'none') return;
    const next = titleStep(this.model, intent);
    this.model = next.model;
    if (next.action !== null) {
      const jump = titleJump(next.action);
      this.scene.start(SCENE_KEYS[jump.target], jump.data);
      return;
    }
    this.canvas.draw(titleDrawPlan(this.model));
  }
}
