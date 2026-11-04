import Phaser from 'phaser';
import { asTileCanvas, dashedRectSegments, drawGearGlyph, drawGearTile, hexToNumber, palette } from '../fx';
import type { Band } from '../core/types';
import { updateDropPulse, type DropPulse } from './dropPulse';
import { gearKeyCaps, type GearKeyCaps } from './gearKeyCaps';
import { INITIAL_GEAR_METER_MODEL, type GearMeterModel } from './gearMeter';
import { GEAR_METER_LAYOUT, type GearMeterLayout } from './gearMeterLayout';
import { gearMeterPlan, type GearMeterPlan, type PlanCell, type PlanHint, type Rect } from './gearMeterPlan';

/**
 * The HUD gear meter (docs/design/features/hud-gear-meter.md). Five cells,
 * white then gears 1 to 4, each drawn with its band colour AND pattern:
 *
 * - the lit cell (solid glyph) is the band you are in now; the others are ghost glyphs,
 * - a bold white bracket frames the selected gear and its digit is drawn bright,
 * - a needle under the row slides with actual speed between the lit cell and the bracket,
 * - in the air above the drag floor a thin bar fills toward the next drag drop,
 * - a dashed bracket marks a gear shift buffered in the air,
 * - key caps beside the strip name the shift keys.
 *
 * This class only executes a `GearMeterPlan` (src/ui/gearMeterPlan.ts); all
 * placement lives there and in `gearMeterLayout.ts`. It keeps no state except
 * the last model and the drop-pulse. Mounting: the game scene creates one,
 * calls `update(model)` each rendered frame and `destroy()` on shutdown.
 *
 * Owner: ui-engineer.
 */

const DEPTH = 900;
const FONT = 'monospace';

const num = hexToNumber;

function sameModel(a: GearMeterModel | null, b: GearMeterModel): boolean {
  return (
    a !== null &&
    a.litBand === b.litBand &&
    a.selectedGear === b.selectedGear &&
    a.needle === b.needle &&
    a.dragFill === b.dragFill &&
    a.pendingGear === b.pendingGear &&
    a.airborne === b.airborne
  );
}

export interface GearMeterViewOptions {
  /** Drawing numbers. Default: today's 960 x 540 layout. */
  readonly layout?: GearMeterLayout;
  /** Key-cap labels. Default: from the default bindings. */
  readonly caps?: GearKeyCaps;
}

export class GearMeterView {
  private readonly scene: Phaser.Scene;
  private readonly layout: GearMeterLayout;
  private readonly caps: GearKeyCaps;
  private readonly container: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly digits: Phaser.GameObjects.Text[] = [];
  private last: GearMeterModel | null = null;
  private pulse: DropPulse | null = null;
  private drawnPulseBand: Band | null = null;
  private reducedMotion = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: GearMeterViewOptions = {}) {
    this.scene = scene;
    this.layout = options.layout ?? GEAR_METER_LAYOUT;
    this.caps = options.caps ?? gearKeyCaps();
    this.graphics = scene.add.graphics();
    this.container = scene.add.container(x, y, [this.graphics]).setScrollFactor(0).setDepth(DEPTH);
    const plan = this.planFor(INITIAL_GEAR_METER_MODEL, null);
    this.addTexts(plan);
    this.draw(plan);
  }

  /** Skip the drag-drop pulse (settings.reducedMotion). The meter itself never animates. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  update(model: GearMeterModel): void {
    this.pulse = updateDropPulse(this.pulse, this.last, model, this.scene.time.now, {
      reducedMotion: this.reducedMotion,
      durationMs: palette.flash.durationMs,
    });
    const pulseBand = this.pulse?.band ?? null;
    if (sameModel(this.last, model) && pulseBand === this.drawnPulseBand) return;
    this.last = model;
    this.drawnPulseBand = pulseBand;
    this.draw(this.planFor(model, pulseBand));
  }

  destroy(): void {
    this.container.destroy();
  }

  private planFor(model: GearMeterModel, pulseBand: Band | null): GearMeterPlan {
    return gearMeterPlan(model, this.layout, this.caps, pulseBand);
  }

  /** Text objects are created once; `draw` only recolours the digits. */
  private addTexts(plan: GearMeterPlan): void {
    const l = this.layout;
    for (const d of plan.digits) {
      const text = this.scene.add
        .text(d.x, d.y, String(d.gear), { fontFamily: FONT, fontSize: `${l.digitFontPx}px` })
        .setOrigin(0.5, 0);
      this.digits.push(text);
      this.container.add(text);
    }
    const style = { fontFamily: FONT, fontSize: `${l.hintFontPx}px`, color: palette.ui.text } as const;
    for (const hint of plan.hints) {
      for (const cap of hint.caps) {
        const cx = cap.rect.x + cap.rect.w / 2;
        const cy = cap.rect.y + cap.rect.h / 2;
        this.container.add(this.scene.add.text(cx, cy, cap.label, style).setOrigin(0.5, 0.5));
      }
    }
  }

  private draw(plan: GearMeterPlan): void {
    const g = this.graphics;
    g.clear();
    this.drawPanel(plan.panel);
    this.drawCells(plan.cells);
    this.drawDigits(plan);
    if (plan.pending) this.drawPending(plan.pending);
    this.drawBracket(plan.bracket);
    if (plan.pulse) this.drawPulse(plan.pulse);
    this.drawNeedle(plan.needle);
    this.drawDrag(plan.drag);
    plan.hints.forEach((hint) => this.drawHint(hint));
  }

  private drawPanel(r: Rect): void {
    const l = this.layout;
    this.graphics.fillStyle(num(palette.ui.panel), l.panelAlpha);
    this.graphics.fillRoundedRect(r.x, r.y, r.w, r.h, l.panelRadius);
    this.graphics.lineStyle(l.panelBorderWidth, num(palette.ui.panelBorder), 1);
    const inset = l.panelBorderWidth / 2;
    this.graphics.strokeRoundedRect(r.x + inset, r.y + inset, r.w - l.panelBorderWidth, r.h - l.panelBorderWidth, l.panelRadius);
  }

  private drawCells(cells: readonly PlanCell[]): void {
    const canvas = asTileCanvas(this.graphics);
    for (const c of cells) {
      if (c.lit) drawGearGlyph(canvas, c.color, c.x, c.y, c.size);
      else drawGearTile(canvas, c.color, 'ghost', c.x, c.y, c.size);
    }
  }

  private drawDigits(plan: GearMeterPlan): void {
    plan.digits.forEach((d, i) => {
      const text = this.digits[i];
      if (!text) return;
      text.setColor(d.bright ? palette.ui.focus : palette.ui.textMuted);
      text.setFontStyle(d.bright ? 'bold' : 'normal');
    });
  }

  /** Bold frame around the selected gear's cell. Shape, so it reads in greyscale. */
  private drawBracket(r: Rect): void {
    this.graphics.lineStyle(this.layout.bracketWidth, num(palette.ui.focus), 1);
    this.graphics.strokeRect(r.x, r.y, r.w, r.h);
  }

  /** Dashed frame for a shift buffered in the air. */
  private drawPending(r: Rect): void {
    const [dash, gap] = this.layout.pendingDash;
    this.graphics.lineStyle(this.layout.pendingWidth, num(palette.ui.focus), 1);
    for (const s of dashedRectSegments(r.x, r.y, r.w, r.h, dash, gap)) {
      this.graphics.lineBetween(s.x1, s.y1, s.x2, s.y2);
    }
  }

  private drawPulse(r: Rect): void {
    this.graphics.fillStyle(num(palette.flash.color), palette.flash.alpha);
    this.graphics.fillRect(r.x, r.y, r.w, r.h);
  }

  /** Upward triangle under the row. */
  private drawNeedle(n: GearMeterPlan['needle']): void {
    this.graphics.fillStyle(num(palette.ui.text), 1);
    this.graphics.fillTriangle(n.x, n.top, n.x - n.halfW, n.top + n.h, n.x + n.halfW, n.top + n.h);
  }

  private drawDrag(drag: GearMeterPlan['drag']): void {
    if (!drag) return;
    const g = this.graphics;
    g.lineStyle(1, num(palette.ui.panelBorder), 1);
    g.strokeRect(drag.frame.x + 0.5, drag.frame.y + 0.5, drag.frame.w - 1, drag.frame.h - 1);
    g.fillStyle(num(palette.ui.text), 1);
    g.fillRect(drag.fill.x, drag.fill.y, drag.fill.w, drag.fill.h);
  }

  /** Key-cap outlines and the small arrow (down for shift down, up for shift up). */
  private drawHint(hint: PlanHint): void {
    const g = this.graphics;
    g.lineStyle(1, num(palette.ui.panelBorder), 1);
    for (const cap of hint.caps) g.strokeRoundedRect(cap.rect.x + 0.5, cap.rect.y + 0.5, cap.rect.w - 1, cap.rect.h - 1, 3);
    const a = hint.arrow;
    g.fillStyle(num(palette.ui.textMuted), 1);
    if (hint.dir === 'down') g.fillTriangle(a.x, a.y, a.x + a.w, a.y, a.x + a.w / 2, a.y + a.h);
    else g.fillTriangle(a.x, a.y + a.h, a.x + a.w, a.y + a.h, a.x + a.w / 2, a.y);
  }
}
