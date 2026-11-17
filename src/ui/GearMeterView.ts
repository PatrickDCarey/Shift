import type Phaser from 'phaser';
import { hexToNumber, palette } from '../fx';
import { GLYPH_W, PIXEL_KEYS, hudFrameNames, textWidth } from '../fx/pixel';
import { BAND_COLORS, type Band } from '../core/types';
import { updateDropPulse, type DropPulse } from './dropPulse';
import { gearKeyCaps, type GearKeyCaps } from './gearKeyCaps';
import { INITIAL_GEAR_METER_MODEL, type GearMeterModel } from './gearMeter';
import { GEAR_METER_LAYOUT, type GearMeterLayout } from './gearMeterLayout';
import { gearMeterPlan, type GearMeterPlan, type PlanCell, type PlanHint, type Rect } from './gearMeterPlan';
import { arrowRects, chevronRects, dashedRingRects, needleRects, patternInk, patternRim, ringRects } from './meterPixels';
import { CUE_FRAMES, cueView, updateCue, type CueView, type NeededColourCue, type NeededColourEvent } from './neededColourCue';

/**
 * The HUD gear meter (docs/design/features/hud-gear-meter.md, clarity-fixes.md)
 * at 480 x 270: 110 x 32 with the bitmap font, or the 110 x 14 Tandem strip
 * (`COMPACT_STRIP_LAYOUT`). Five cells, white then gears 1 to 4, each with its
 * band colour AND pattern:
 *
 * - the lit cell is the only filled one; the others are ghosts (dashed rim, hollow pattern),
 * - a bracket frames the selected gear: thin and dim until the lit cell reaches it, then bold,
 * - a needle under the row slides with actual speed,
 * - in the air above the drag floor a bar runs from the needle to the next lower cell,
 * - a dashed bracket marks a gear shift buffered in the air,
 * - a 1 px ring marks the colour you needed after a fall-through (45 frames),
 * - key caps beside the strip name the shift keys.
 *
 * This class only executes a `GearMeterPlan` (src/ui/gearMeterPlan.ts); all
 * placement lives there and in `gearMeterLayout.ts`. Everything is drawn with
 * whole-pixel `fillRect`s. Mounting: the game scene creates one at (5, 5), calls
 * `update(model)` each rendered frame and `destroy()` on shutdown.
 *
 * Owner: ui-engineer.
 */

const DEPTH = 900;
const num = hexToNumber;
const CAP_TOP = 1;

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

export type StripBody = 'runner' | 'twin';

export interface GearMeterViewOptions {
  /** Drawing numbers. Default: the 110 x 32 meter. */
  readonly layout?: GearMeterLayout;
  /** Key-cap labels. Default: from the default bindings. */
  readonly caps?: GearKeyCaps;
  /** Tandem strips: which silhouette to show at the layout's glyph slot. */
  readonly body?: StripBody;
}

/** Per-frame inputs besides the model. */
export interface GearMeterFrame {
  /** The sim event of this frame that may start a needed-colour cue (`fallThrough`, or `{ band }`). */
  readonly event?: NeededColourEvent | null;
  /** Body id this meter belongs to (0 runner, 1 twin). */
  readonly body?: number;
  /** The body respawned or the level restarted: clears the cue. */
  readonly respawn?: boolean;
}

export class GearMeterView {
  private readonly scene: Phaser.Scene;
  private readonly layout: GearMeterLayout;
  private readonly caps: GearKeyCaps;
  private readonly bodyKey: StripBody | null;
  private readonly container: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly digits: Phaser.GameObjects.BitmapText[] = [];
  private glyph: Phaser.GameObjects.Image | null = null;
  private last: GearMeterModel | null = null;
  private pulse: DropPulse | null = null;
  private drawnPulseBand: Band | null = null;
  private cue: NeededColourCue | null = null;
  private drawnCue: CueView | null = null;
  private reducedMotion = false;
  private parked = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: GearMeterViewOptions = {}) {
    this.scene = scene;
    this.layout = options.layout ?? GEAR_METER_LAYOUT;
    this.caps = options.caps ?? gearKeyCaps();
    this.bodyKey = options.body ?? null;
    this.graphics = scene.add.graphics();
    this.container = scene.add.container(Math.round(x), Math.round(y), [this.graphics]).setScrollFactor(0).setDepth(DEPTH);
    const plan = this.planFor(INITIAL_GEAR_METER_MODEL, null, null);
    this.addTexts(plan);
    this.draw(plan, INITIAL_GEAR_METER_MODEL);
  }

  /** Skip the drop pulse and the cue pulse (settings.reducedMotion). The ring stays: it is gameplay information. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** A parked (home) Tandem body: its glyph becomes the home glyph in the muted text colour. */
  setParked(parked: boolean): void {
    if (parked === this.parked) return;
    this.parked = parked;
    this.last = null;
  }

  /**
   * "Why you fell": ring the cell of the colour that was needed for 45 frames
   * (one ring at a time, a new call replaces it). `null` clears it (respawn).
   */
  setNeededCue(band: Band | null): void {
    this.cue = band === null ? null : { band, framesLeft: CUE_FRAMES };
    this.last = null; // force a redraw on the next update
  }

  update(model: GearMeterModel, frame: GearMeterFrame = {}): void {
    this.pulse = updateDropPulse(this.pulse, this.last, model, this.scene.time.now, {
      reducedMotion: this.reducedMotion,
      durationMs: palette.flash.durationMs,
    });
    this.cue = updateCue(this.cue, { event: frame.event, body: frame.body, respawn: frame.respawn });
    const pulseBand = this.pulse?.band ?? null;
    const cue = cueView(this.cue, this.reducedMotion);
    const sameCue = cue?.ringBand === this.drawnCue?.ringBand && cue?.pulse === this.drawnCue?.pulse;
    if (sameModel(this.last, model) && pulseBand === this.drawnPulseBand && sameCue) return;
    this.last = model;
    this.drawnPulseBand = pulseBand;
    this.drawnCue = cue;
    this.draw(this.planFor(model, pulseBand, cue), model);
  }

  destroy(): void {
    this.container.destroy();
  }

  private planFor(model: GearMeterModel, pulseBand: Band | null, cue: CueView | null): GearMeterPlan {
    return gearMeterPlan(model, this.layout, this.caps, pulseBand, cue);
  }

  private bitmap(x: number, y: number, text: string): Phaser.GameObjects.BitmapText {
    const t = this.scene.add.bitmapText(x, y, PIXEL_KEYS.font, text);
    this.container.add(t);
    return t;
  }

  /** Text objects are created once; `draw` only recolours the digits. */
  private addTexts(plan: GearMeterPlan): void {
    for (const d of plan.digits) this.digits.push(this.bitmap(Math.floor(d.x - GLYPH_W / 2), d.y, String(d.gear)));
    for (const hint of plan.hints) {
      for (const cap of hint.caps) {
        const x = cap.rect.x + Math.floor((cap.rect.w - textWidth(cap.label)) / 2);
        this.bitmap(x, cap.rect.y + CAP_TOP, cap.label).setTint(num(palette.ui.text));
      }
    }
    if (plan.glyph && this.bodyKey) {
      const names = hudFrameNames();
      this.glyph = this.scene.add.image(plan.glyph.x, plan.glyph.y, PIXEL_KEYS.hud, names.glyph(this.bodyKey)).setOrigin(0, 0);
      this.container.add(this.glyph);
    }
  }

  private fill(rects: readonly Rect[], color: string, alpha = 1, dx = 0, dy = 0): void {
    this.graphics.fillStyle(num(color), alpha);
    for (const r of rects) this.graphics.fillRect(r.x + dx, r.y + dy, r.w, r.h);
  }

  private draw(plan: GearMeterPlan, model: GearMeterModel): void {
    this.graphics.clear();
    this.drawPanel(plan.panel);
    plan.cells.forEach((c) => this.drawCell(c));
    this.drawDigits(plan);
    this.drawGlyph(model);
    if (plan.pending) this.fill(dashedRingRects(plan.pending, ...this.layout.pendingDash), palette.ui.focus);
    this.drawBracket(plan);
    if (plan.pulse) this.fill([plan.pulse], palette.flash.color, palette.flash.alpha);
    if (plan.ring) this.fill(ringRects(plan.ring, 1), palette.ui.text);
    const n = plan.needle;
    this.fill(needleRects(n.x, n.top, n.h), palette.ui.text);
    if (plan.drag) this.drawDrag(plan.drag);
    plan.hints.forEach((hint) => this.drawHint(hint));
  }

  private drawPanel(r: Rect): void {
    const h = this.layout.halo;
    this.graphics.fillStyle(num(palette.ui.panel), this.layout.panelAlpha);
    this.graphics.fillRect(r.x - h, r.y - h, r.w + 2 * h, r.h + 2 * h);
    this.graphics.fillStyle(num(palette.ui.panel), this.layout.panelAlpha);
    this.graphics.fillRect(r.x, r.y, r.w, r.h);
    this.fill(ringRects(r, this.layout.panelBorderWidth), palette.ui.panelBorder);
  }

  /** Lit: filled, solid outline, dark ink. Unlit: no fill, dashed rim, hollow pattern marks. */
  private drawCell(c: PlanCell): void {
    const style = palette.gears[c.color][c.lit ? 'solid' : 'ghost'];
    const box: Rect = { x: c.x, y: c.y, w: c.size, h: c.size };
    if (c.lit) {
      this.fill([box], style.fill);
      this.fill(patternInk(c.pattern, c.size), style.ink, 1, c.x, c.y);
      this.fill(ringRects(box, 1), style.outline);
      return;
    }
    this.fill(patternRim(c.pattern, c.size), style.ink, 1, c.x, c.y);
    this.fill(dashedRingRects(box, ...this.layout.ghostDash), style.outline);
  }

  private drawDigits(plan: GearMeterPlan): void {
    plan.digits.forEach((d, i) => this.digits[i]?.setTint(num(d.bright ? palette.ui.focus : palette.ui.textMuted)));
  }

  private drawGlyph(model: GearMeterModel): void {
    if (!this.glyph) return;
    const names = hudFrameNames();
    if (this.parked) {
      this.glyph.setFrame(names.home).setTint(num(palette.ui.textMuted));
      return;
    }
    const body = this.bodyKey ?? 'runner';
    const band = BAND_COLORS[model.litBand];
    this.glyph.setFrame(names.glyph(body)).setTint(num(palette.gears[band].solid.fill));
  }


  /** PT-5: bold white ring once arrived (shape and weight, so it reads in greyscale); thin and dim before. */
  private drawBracket(plan: GearMeterPlan): void {
    const l = this.layout;
    if (plan.bracketBold) this.fill(ringRects(plan.bracket, l.bracketWidth), palette.ui.focus);
    else this.fill(ringRects(plan.bracket, l.bracketThinWidth), palette.ui.textMuted);
  }

  /** PT-4: frame, fill growing from the needle, and the chevron over the next lower cell. */
  private drawDrag(drag: NonNullable<GearMeterPlan['drag']>): void {
    if (drag.frame.w > 0) {
      this.fill(ringRects(drag.frame, 1), palette.ui.panelBorder);
      this.fill([drag.fill], palette.ui.text);
    }
    const c = drag.chevron;
    this.fill(chevronRects(c.x, c.y, c.w, c.h), palette.ui.text);
  }

  /** Key-cap outlines and the small arrow (down for shift down, up for shift up). */
  private drawHint(hint: PlanHint): void {
    for (const cap of hint.caps) this.fill(ringRects(cap.rect, 1), palette.ui.panelBorder);
    this.fill(arrowRects(hint.arrow, hint.dir), palette.ui.textMuted);
  }
}

