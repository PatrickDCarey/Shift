/**
 * Draws the `[R] RESTART` card (layout from `restartCard.ts`): a `ui.panel` plate
 * with a 2 px `ui.focus` (white) outline, a key cap (`ui.panel` fill, 2 px `ui.focus`
 * outline, label in `ui.text`) and the word in `ui.text`. Screen space, whole
 * pixels, above tiles, bodies and effects and below the HUD (200) and the Sticky
 * Keys tip (1000). Static: no blink, no pulse, no fade, in every motion setting.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, palette, PIXEL_KEYS } from '../fx';
import { CARD_WORD, cardLayout, type CardLayout, type Rect } from './restartCard';

const DEPTH_CARD = 150;

export class RestartCardView {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly capLabel: Phaser.GameObjects.BitmapText;
  private readonly word: Phaser.GameObjects.BitmapText;
  private readonly layout: CardLayout = cardLayout();
  private at: Rect | null = null;

  constructor(scene: Phaser.Scene) {
    const ink = hexToNumber(palette.ui.text);
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH_CARD).setVisible(false);
    const text = (value: string): Phaser.GameObjects.BitmapText =>
      scene.add.bitmapText(0, 0, PIXEL_KEYS.font, value).setOrigin(0, 0).setScale(cardLayout().scale).setTint(ink).setScrollFactor(0).setDepth(DEPTH_CARD + 1).setVisible(false);
    this.capLabel = text(this.layout.capLabel);
    this.word = text(CARD_WORD);
  }

  /** Show the card at `rect`, or hide it with null. Redraws only when the rectangle changes. */
  update(rect: Rect | null): void {
    const visible = rect !== null;
    this.gfx.setVisible(visible);
    this.capLabel.setVisible(visible);
    this.word.setVisible(visible);
    if (rect === null || (this.at !== null && this.at.x === rect.x && this.at.y === rect.y)) {
      this.at = rect === null ? null : this.at;
      return;
    }
    this.at = rect;
    this.draw(rect);
  }

  destroy(): void {
    this.gfx.destroy();
    this.capLabel.destroy();
    this.word.destroy();
  }

  private draw({ x, y, w, h }: Rect): void {
    const { cap, word, border: b, scale } = this.layout;
    const white = hexToNumber(palette.ui.focus);
    const panel = hexToNumber(palette.ui.panel);
    const g = this.gfx.clear();
    g.fillStyle(white, 1).fillRect(x, y, w, h);
    g.fillStyle(panel, 1).fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
    g.fillStyle(white, 1).fillRect(x + cap.x, y + cap.y, cap.w, cap.h);
    g.fillStyle(panel, 1).fillRect(x + cap.x + b, y + cap.y + b, cap.w - 2 * b, cap.h - 2 * b);
    this.capLabel.setPosition(x + cap.x + 2 * scale, y + cap.y + 2 * scale);
    this.word.setPosition(x + word.x, y + word.y);
  }
}
