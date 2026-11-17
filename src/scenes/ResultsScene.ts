import Phaser from 'phaser';
import { MenuCanvas, MenuKeys } from '../ui/MenuView';
import { parseResultsData, resultsOutcome } from '../ui/menuFlow';
import { RESULTS_BEAT_MS, RESULTS_MENU_KEYS, createResultsModel, resultsStep } from '../ui/resultsModel';
import type { ResultsInput, ResultsModel } from '../ui/resultsModel';
import { resultsDrawPlan } from '../ui/panelDraw';
import { SCENE_KEYS } from './keys';
import { runJump } from './runJump';

/**
 * Results panel (docs/design/features/results.md), an overlay launched by the
 * game scene on the win step after it recorded the run. Shows nothing for the
 * 0.6 s beat (every key ignored), then the panel. NEXT LEVEL (Enter), RETRY (R)
 * and LEVELS (Esc) navigate themselves; nothing is emitted back.
 *
 * Owner: ui-engineer.
 */
export class ResultsScene extends Phaser.Scene {
  private launchInput: ResultsInput | null = null;
  private model!: ResultsModel;
  private canvas: MenuCanvas | null = null;
  private keys!: MenuKeys;
  private elapsedMs = 0;

  constructor() {
    super(SCENE_KEYS.results);
  }

  init(data?: unknown): void {
    this.launchInput = parseResultsData(data);
    this.elapsedMs = 0;
    this.canvas = null;
  }

  create(): void {
    if (this.launchInput === null) {
      this.scene.stop(); // bad launch data: leave the frozen win pose, do not crash
      return;
    }
    this.model = createResultsModel(this.launchInput);
    this.keys = new MenuKeys(this);
  }

  override update(_time: number, delta: number): void {
    if (this.launchInput === null) return;
    if (this.canvas === null) {
      this.elapsedMs += delta;
      this.keys.poll({ blocked: true });
      if (this.elapsedMs < RESULTS_BEAT_MS) return;
      this.canvas = new MenuCanvas(this, true);
      this.canvas.draw(resultsDrawPlan(this.model));
      return;
    }
    const intent = this.keys.poll(RESULTS_MENU_KEYS);
    if (intent.kind === 'none') return;
    const next = resultsStep(this.model, intent);
    this.model = next.model;
    if (next.action === null) this.canvas.draw(resultsDrawPlan(this.model));
    else runJump(this, resultsOutcome(next.action, this.launchInput.levelId));
  }
}
