/**
 * Draws the level's onboarding hint glyphs from a pure plan (`hintLayout.ts`):
 * world-space caps (focus outline, panel fill) and 5 x 7 labels, above the tiles
 * and below both bodies. Created once per visit and never removed or redrawn
 * until the scene shuts down, so death, respawn and restart leave them alone.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, palette, PIXEL_KEYS } from '../fx';
import type { HintLabel, HintPlan } from './hintLayout';

/** Above the tiles (0) and the exit (1), below the bodies (9, 10). */
const DEPTH_HINT = 5;

export class HintView {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly texts: Phaser.GameObjects.BitmapText[] = [];

  constructor(scene: Phaser.Scene, plans: readonly HintPlan[]) {
    this.gfx = scene.add.graphics().setDepth(DEPTH_HINT);
    const outline = hexToNumber(palette.ui.focus);
    const panel = hexToNumber(palette.ui.panel);
    const ink = hexToNumber(palette.ui.text);
    const label = (l: HintLabel): void => {
      this.texts.push(scene.add.bitmapText(l.x, l.y, PIXEL_KEYS.font, l.text).setOrigin(0, 0).setTint(ink).setDepth(DEPTH_HINT + 1));
    };
    for (const plan of plans) {
      for (const { rect, label: l } of plan.caps) {
        this.gfx.fillStyle(outline, 1).fillRect(rect.x, rect.y, rect.w, rect.h);
        this.gfx.fillStyle(panel, 1).fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
        label(l);
      }
      if (plan.arrow !== null) label(plan.arrow);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    for (const t of this.texts) t.destroy();
    this.texts.length = 0;
  }
}
