import Phaser from 'phaser';
import { asTileCanvas, dashedRectSegments, drawGearGlyph, drawGearTile, hexToNumber, palette } from '../fx';
import type { Band, BandColor } from '../core/types';
import type { GearMeterModel } from './gearMeter';

/**
 * The HUD gear meter (docs/design/features/hud-gear-meter.md). Five cells,
 * white then gears 1 to 4, each drawn with its band colour AND pattern:
 *
 * - the lit cell (solid glyph) is the band you are in now; the others are ghost glyphs,
 * - a bold white bracket frames the selected gear and its digit is drawn bright,
 * - a needle under the row slides with actual speed between the lit cell and the bracket,
 * - in the air above the drag floor a thin bar fills toward the next drag drop,
 * - a dashed bracket marks a gear shift buffered in the air.
 *
 * Fixed to the camera, top-left, 220 x 64 px. It reads a `GearMeterModel` and
 * keeps no state except the drop-pulse timer. Mounting: the game scene creates
 * one, calls `update(model)` each rendered frame and `destroy()` on shutdown.
 *
 * Owner: ui-engineer.
 */

const PANEL_W = 220;
const PANEL_H = 64;
const DEPTH = 900;
const FONT = 'monospace';

const CELL = 24;
const PITCH = 30;
const HINT_W = 30;
const PAD = 6;
const CELLS_X = PAD + HINT_W + 2;
const CELL_Y = 8;
const DIGIT_Y = 35;
const NEEDLE_TOP = 49;
const NEEDLE_H = 6;
const DRAG_Y = 57;
const DRAG_H = 4;
const ROW_W = CELL * 5 + (PITCH - CELL) * 4;
const BRACKET_OUT = 3;

const BAND_COLORS: readonly BandColor[] = ['white', 'blue', 'green', 'yellow', 'red'];
const DIGIT_STYLE = { fontFamily: FONT, fontSize: '12px' } as const;
const HINT_STYLE = { fontFamily: FONT, fontSize: '11px', color: palette.ui.textMuted } as const;

const num = hexToNumber;
const cellX = (i: number): number => CELLS_X + i * PITCH;

function sameModel(a: GearMeterModel | null, b: GearMeterModel): boolean {
  return (
    a !== null &&
    a.litBand === b.litBand &&
    a.selectedGear === b.selectedGear &&
    a.needle === b.needle &&
    a.dragFill === b.dragFill &&
    a.pendingGear === b.pendingGear
  );
}

export class GearMeterView {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly digits: Phaser.GameObjects.Text[] = [];
  private last: GearMeterModel | null = null;
  private pulseUntil = 0;
  private pulseBand: Band = 0;
  private reducedMotion = false;
  private wasPulsing = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.container = scene.add.container(x, y, [this.graphics]).setScrollFactor(0).setDepth(DEPTH);
    for (let gear = 1; gear <= 4; gear += 1) {
      const digit = scene.add
        .text(cellX(gear) + CELL / 2, DIGIT_Y, String(gear), DIGIT_STYLE)
        .setOrigin(0.5, 0);
      this.digits.push(digit);
      this.container.add(digit);
    }
    this.addHint(PAD + HINT_W / 2, 'Q/⇧', '▼');
    this.addHint(PANEL_W - PAD - HINT_W / 2, 'E/⇧', '▲');
    this.drawFrame();
  }

  /** Skip the drag-drop pulse (settings.reducedMotion). The meter itself never animates. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  update(model: GearMeterModel): void {
    const prev = this.last;
    if (prev !== null && prev.dragFill !== null && model.litBand < prev.litBand && !this.reducedMotion) {
      this.pulseUntil = this.scene.time.now + palette.flash.durationMs;
      this.pulseBand = model.litBand;
    }
    const pulsing = this.scene.time.now < this.pulseUntil;
    if (sameModel(prev, model) && !pulsing && !this.wasPulsing) return;
    this.wasPulsing = pulsing;
    this.last = model;
    this.drawFrame(model, pulsing);
  }

  destroy(): void {
    this.container.destroy();
  }

  private addHint(cx: number, keys: string, arrow: string): void {
    const style = { ...HINT_STYLE };
    this.container.add([
      this.scene.add.text(cx, CELL_Y + 2, keys, style).setOrigin(0.5, 0),
      this.scene.add.text(cx, CELL_Y + 16, arrow, style).setOrigin(0.5, 0),
    ]);
  }

  private drawFrame(model?: GearMeterModel, pulsing = false): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(num(palette.ui.panel), 0.92);
    g.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 6);
    g.lineStyle(2, num(palette.ui.panelBorder), 1);
    g.strokeRoundedRect(1, 1, PANEL_W - 2, PANEL_H - 2, 6);
    const lit = model?.litBand ?? 0;
    this.drawCells(lit);
    this.drawDigits(model?.selectedGear ?? 1);
    if (model) {
      this.drawPending(model.pendingGear);
      this.drawBracket(model.selectedGear);
      if (pulsing) this.drawPulse(this.pulseBand);
    } else {
      this.drawBracket(1);
    }
    this.drawNeedle(model?.needle ?? 0);
    this.drawDrag(model?.dragFill ?? null);
  }

  private drawCells(lit: number): void {
    const canvas = asTileCanvas(this.graphics);
    BAND_COLORS.forEach((color, i) => {
      if (i === lit) drawGearGlyph(canvas, color, cellX(i), CELL_Y, CELL);
      else drawGearTile(canvas, color, 'ghost', cellX(i), CELL_Y, CELL);
    });
  }

  private drawDigits(selected: number): void {
    this.digits.forEach((digit, i) => {
      const isSelected = i + 1 === selected;
      digit.setColor(isSelected ? palette.ui.focus : palette.ui.textMuted);
      digit.setFontStyle(isSelected ? 'bold' : 'normal');
    });
  }

  /** Bold white frame around the selected gear's cell. Shape, so it reads in greyscale. */
  private drawBracket(gear: number): void {
    const x = cellX(gear) - BRACKET_OUT;
    const size = CELL + BRACKET_OUT * 2;
    this.graphics.lineStyle(2.5, num(palette.ui.focus), 1);
    this.graphics.strokeRect(x, CELL_Y - BRACKET_OUT, size, size);
  }

  /** Dashed frame for a shift buffered in the air. */
  private drawPending(gear: number | null): void {
    if (gear === null) return;
    const x = cellX(gear) - BRACKET_OUT;
    const size = CELL + BRACKET_OUT * 2;
    this.graphics.lineStyle(2, num(palette.ui.focus), 1);
    for (const s of dashedRectSegments(x, CELL_Y - BRACKET_OUT, size, size, 4, 3)) {
      this.graphics.lineBetween(s.x1, s.y1, s.x2, s.y2);
    }
  }

  private drawPulse(band: Band): void {
    this.graphics.fillStyle(num(palette.flash.color), palette.flash.alpha);
    this.graphics.fillRect(cellX(band), CELL_Y, CELL, CELL);
  }

  /** Upward triangle under the row at `needle` cell widths from the centre of cell 0. */
  private drawNeedle(needle: number): void {
    const x = cellX(0) + CELL / 2 + needle * PITCH;
    this.graphics.fillStyle(num(palette.ui.text), 1);
    this.graphics.fillTriangle(x, NEEDLE_TOP, x - 4, NEEDLE_TOP + NEEDLE_H, x + 4, NEEDLE_TOP + NEEDLE_H);
  }

  private drawDrag(fill: number | null): void {
    if (fill === null) return;
    const g = this.graphics;
    g.lineStyle(1, num(palette.ui.panelBorder), 1);
    g.strokeRect(CELLS_X + 0.5, DRAG_Y + 0.5, ROW_W - 1, DRAG_H - 1);
    g.fillStyle(num(palette.ui.text), 1);
    g.fillRect(CELLS_X + 1, DRAG_Y + 1, Math.max(0, (ROW_W - 2) * fill), DRAG_H - 2);
  }
}
