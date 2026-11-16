import Phaser from 'phaser';
import { levelOrder } from '../save/progress';
import { loadGameParams } from '../entities/params';
import { loadLevelSet } from '../entities/levelSelect';
import { LEVEL_FILES } from '../entities/levelFiles';
import { reducedMotion, prefersReducedMotion } from '../entities/motionPrefs';
import { createLevelSelectModel, levelSelectStep } from '../ui/levelSelectModel';
import type { LevelSelectModel } from '../ui/levelSelectModel';
import { levelSelectDrawPlan } from '../ui/menuDraw';
import { levelSelectJump, parseLevelSelectData } from '../ui/menuNav';
import { MenuCanvas, MenuKeys } from '../ui/MenuView';
import { SCENE_KEYS, getSaveStore } from './keys';

/** The first level of world 1; the spec's fallback focus. */
const FALLBACK_ID = 'w1-01';
const NUDGE_FRAMES = 6;

/**
 * Level select (docs/design/features/level-select.md). Rebuilt from the save
 * on every open; Enter on a locked cell nudges the grid 1 px (skipped with
 * reduced motion) and starts nothing.
 *
 * Owner: ui-engineer.
 */
export class LevelSelectScene extends Phaser.Scene {
  private model!: LevelSelectModel;
  private canvas!: MenuCanvas;
  private keys!: MenuKeys;
  private focusId: string | undefined;
  private nudge = 0;
  private still = false;

  constructor() {
    super(SCENE_KEYS.levelSelect);
  }

  init(data?: unknown): void {
    this.focusId = parseLevelSelectData(data).focusId;
    this.nudge = 0;
  }

  create(): void {
    const store = getSaveStore(this.registry);
    const order = levelOrder(loadLevelSet(LEVEL_FILES).levels);
    this.model = createLevelSelectModel({
      order,
      progress: store.getProgress(),
      stepHz: loadGameParams().params.stepHz,
      focusId: this.focusId,
      fallbackId: FALLBACK_ID,
    });
    this.still = reducedMotion(store.getSettings(), prefersReducedMotion(window.matchMedia?.bind(window)));
    this.canvas = new MenuCanvas(this);
    this.keys = new MenuKeys(this);
    this.canvas.draw(levelSelectDrawPlan(this.model));
  }

  override update(): void {
    if (this.nudge > 0) {
      this.nudge -= 1;
      this.canvas.offset(this.nudge % 2 === 1 ? 1 : 0, 0);
    }
    const intent = this.keys.poll();
    if (intent.kind === 'none') return;
    const next = levelSelectStep(this.model, intent);
    this.model = next.model;
    if (next.action === null) {
      this.canvas.draw(levelSelectDrawPlan(this.model));
      return;
    }
    const jump = levelSelectJump(next.action);
    if (jump === null) {
      if (!this.still) this.nudge = NUDGE_FRAMES;
      return;
    }
    this.scene.start(SCENE_KEYS[jump.target], jump.data);
  }
}
