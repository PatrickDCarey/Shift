/**
 * Draws the player: a box (0.75 x 1.5 tiles) in the colour and pattern of its
 * current BAND (actual speed, not the selected gear), with a facing notch.
 * Pattern geometry and colours come from src/fx and palette.json; the pattern
 * is drawn on stacked squares because it is defined for squares.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { BAND_COLORS, type Band, type Facing } from '../core/types';
import { hexToNumber, palette, patternGeometry, patternOf } from '../fx';

const DEPTH_PLAYER = 10;
const HALO_ALPHA = 0.18;
const HALO_WIDTH = 6;
const NOTCH = 5;

export class PlayerView {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly width: number;
  private readonly height: number;

  constructor(scene: Phaser.Scene, tileSize: number, widthTiles: number, heightTiles: number) {
    this.gfx = scene.add.graphics().setDepth(DEPTH_PLAYER);
    this.width = Math.round(widthTiles * tileSize);
    this.height = Math.round(heightTiles * tileSize);
  }

  /** `feetX`/`feetY` in pixels: bottom centre of the box. */
  draw(feetX: number, feetY: number, band: Band, facing: Facing): void {
    const g = this.gfx;
    const color = BAND_COLORS[band];
    const style = palette.gears[color].solid;
    const left = Math.round(feetX - this.width / 2);
    const top = Math.round(feetY - this.height);
    const outlineWidth = palette.treatment.solid.outlineWidth;
    g.clear();
    g.lineStyle(HALO_WIDTH, hexToNumber(style.fill), HALO_ALPHA);
    g.strokeRect(left - HALO_WIDTH / 2, top - HALO_WIDTH / 2, this.width + HALO_WIDTH, this.height + HALO_WIDTH);
    g.fillStyle(hexToNumber(style.fill), 1);
    g.fillRect(left, top, this.width, this.height);
    this.drawPattern(left, top, hexToNumber(style.ink), patternOf(color));
    g.lineStyle(outlineWidth, hexToNumber(style.outline), 1);
    g.strokeRect(left + outlineWidth / 2, top + outlineWidth / 2, this.width - outlineWidth, this.height - outlineWidth);
    g.fillStyle(hexToNumber(style.ink), 1);
    const notchX = facing > 0 ? left + this.width - outlineWidth - NOTCH - 2 : left + outlineWidth + 2;
    g.fillRect(notchX, top + 8, NOTCH, NOTCH);
  }

  destroy(): void {
    this.gfx.destroy();
  }

  private drawPattern(left: number, top: number, ink: number, id: Parameters<typeof patternGeometry>[0]): void {
    const side = this.width;
    const squares = Math.max(1, Math.round(this.height / side));
    const geo = patternGeometry(id, side, palette.pattern.minStrokePx);
    const g = this.gfx;
    g.lineStyle(geo.strokeWidth, ink, palette.treatment.solid.inkAlpha);
    g.fillStyle(ink, palette.treatment.solid.inkAlpha);
    for (let i = 0; i < squares; i += 1) {
      const y = top + (squares === 1 ? 0 : (i * (this.height - side)) / (squares - 1));
      for (const s of geo.shapes) {
        if (s.kind === 'line') g.lineBetween(left + s.x1, y + s.y1, left + s.x2, y + s.y2);
        else g.fillCircle(left + s.cx, y + s.cy, s.r);
      }
    }
  }
}
