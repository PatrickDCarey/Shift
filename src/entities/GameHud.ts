/**
 * Text overlay at 480 x 270 on the 5 x 7 bitmap font (`pixel-font`, tinted from
 * palette.ui): level title, the win banner (2x), load/parse messages, pause and
 * focus prompts, and the dev debug overlay. The gear meter (ui-engineer) sits in
 * GEAR_METER_AREA, top-left. All objects are fixed to the camera and sit on
 * whole pixels (layout in `hudText.ts`).
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, palette, PIXEL_KEYS } from '../fx';
import { FOCUS_PROMPT_TEXT } from './focusPrompt';
import { blockHeight, blockWidth, centeredX, wrapText } from './hudText';
import { PAUSE_TEXT } from './pauseState';

const DEPTH_HUD = 200;
const MARGIN = 5;
const MESSAGE_WRAP = 460;
const PAD_X = 3;
const PAD_Y = 2;
const BIG_PAD_X = 8;
const BIG_PAD_Y = 5;
const NEXT_HINT_GAP = 20;

/** Top-left rectangle (screen px) kept free for ui-engineer's GearMeterView. */
export const GEAR_METER_AREA = { x: MARGIN, y: MARGIN, width: 110, height: 32 } as const;

export interface HudLayout {
  /** Level title: top centre, so it never sits under the gear meter. */
  readonly title: { readonly x: number; readonly y: number };
  /** Load/parse/replay messages: left, below the gear meter. */
  readonly messages: { readonly x: number; readonly y: number };
}

export function hudLayout(screenWidth: number): HudLayout {
  return {
    title: { x: screenWidth / 2, y: MARGIN },
    messages: { x: MARGIN, y: GEAR_METER_AREA.y + GEAR_METER_AREA.height + MARGIN },
  };
}

/** `M:SS.ss` from a step count, hundredths truncated (not rounded); `?` while unknown. */
export function formatRunTime(steps: number | null, stepHz: number): string {
  if (steps === null) return '?';
  const hundredths = Math.floor((steps * 100) / stepHz);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const cs = hundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function winText(steps: number | null, stepHz: number): string {
  return `Level complete — ${formatRunTime(steps, stepHz)} — press R`;
}

type Anchor = 'topCenter' | 'topLeft' | 'topRight' | 'center' | 'bottomCenter';

interface TextOptions {
  readonly anchor: Anchor;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly scale?: number;
  readonly padX?: number;
  readonly padY?: number;
  readonly panel?: boolean;
}

/** One bitmap-text block on a panel, re-laid-out on whole pixels whenever its text changes. */
class HudText {
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly scale: number;
  private shown = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: TextOptions,
  ) {
    this.scale = opts.scale ?? 1;
    this.panel = scene.add
      .rectangle(0, 0, 1, 1, hexToNumber(palette.ui.panel), 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD)
      .setVisible(false);
    this.text = scene.add
      .bitmapText(0, 0, PIXEL_KEYS.font, '')
      .setOrigin(0, 0)
      .setScale(this.scale)
      .setTint(hexToNumber(opts.color))
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1)
      .setVisible(false);
  }

  get visible(): boolean {
    return this.text.visible;
  }

  get content(): string {
    return this.shown;
  }

  setVisible(visible: boolean): void {
    this.text.setVisible(visible);
    this.panel.setVisible(visible && this.opts.panel !== false);
  }

  setText(value: string): void {
    if (value === this.shown) return;
    this.shown = value;
    this.text.setText(value);
    this.layout();
  }

  private layout(): void {
    const { anchor, x, y } = this.opts;
    const padX = this.opts.padX ?? PAD_X;
    const padY = this.opts.padY ?? PAD_Y;
    const w = blockWidth(this.shown, this.scale);
    const h = blockHeight(this.shown, this.scale);
    const boxW = w + 2 * padX;
    const boxH = h + 2 * padY;
    const { width, height } = this.scene.scale;
    let left = x;
    let top = y;
    if (anchor === 'topCenter') left = centeredX(width, boxW);
    else if (anchor === 'topRight') left = x - boxW;
    else if (anchor === 'center') {
      left = centeredX(width, boxW);
      top = y === 0 ? centeredX(height, boxH) : y;
    } else if (anchor === 'bottomCenter') {
      left = centeredX(width, boxW);
      top = y - boxH;
    }
    this.panel.setPosition(left, top).setSize(boxW, boxH);
    this.text.setPosition(left + padX, top + padY);
  }
}

export class GameHud {
  private readonly banner: HudText;
  private readonly debug: HudText;
  private readonly focusPrompt: HudText;
  private readonly pauseLabel: HudText;
  private readonly nextHint: HudText;

  constructor(scene: Phaser.Scene, title: string, messages: readonly string[]) {
    const { width, height } = scene.scale;
    const layout = hudLayout(width);
    const { text, textMuted } = palette.ui;
    const shown = (t: HudText, value: string): HudText => {
      t.setText(value);
      t.setVisible(true);
      return t;
    };
    shown(new HudText(scene, { anchor: 'topCenter', x: layout.title.x, y: layout.title.y, color: textMuted }), title);
    this.banner = new HudText(scene, { anchor: 'center', x: 0, y: 0, color: text, scale: 2, padX: BIG_PAD_X, padY: BIG_PAD_Y });
    this.debug = new HudText(scene, { anchor: 'topRight', x: width - MARGIN, y: MARGIN, color: text });
    // Plain text, no input handling: it never blocks a key or a click.
    this.focusPrompt = new HudText(scene, { anchor: 'bottomCenter', x: 0, y: height - MARGIN, color: text });
    // M1 stand-in for the results NEXT item (ui-engineer, M2-12).
    this.nextHint = new HudText(scene, { anchor: 'center', x: 0, y: Math.floor(height / 2) + NEXT_HINT_GAP, color: textMuted });
    this.nextHint.setText('Enter: next level');
    // M1 stand-in for the pause overlay (ui-engineer, M2-12); plain text, no input handling.
    this.pauseLabel = new HudText(scene, { anchor: 'center', x: 0, y: 0, color: text, scale: 2, padX: BIG_PAD_X, padY: BIG_PAD_Y });
    this.pauseLabel.setText(PAUSE_TEXT);
    this.focusPrompt.setText(FOCUS_PROMPT_TEXT);
    if (messages.length > 0) {
      shown(
        new HudText(scene, { anchor: 'topLeft', x: layout.messages.x, y: layout.messages.y, color: text }),
        wrapText(messages.join('\n'),MESSAGE_WRAP - 2 * PAD_X),
      );
    }
  }

  /** `steps` is the winning run's step count, or null while playing. */
  setWon(steps: number | null, won: boolean, stepHz: number): void {
    if (won) this.banner.setText(winText(steps, stepHz));
    this.banner.setVisible(won);
  }

  /** The win banner text while it is showing, else null (read by the QA hook). */
  get bannerText(): string | null {
    return this.banner.visible ? this.banner.content : null;
  }

  /** Show the "Enter: next level" hint under the win banner. */
  setNextHint(visible: boolean): void {
    this.nextHint.setVisible(visible);
  }

  /** Show or hide the pause stand-in. */
  setPaused(paused: boolean): void {
    this.pauseLabel.setVisible(paused);
  }

  /** Show the "click to focus" prompt (the page has no keyboard focus yet) or hide it. */
  setFocusPrompt(visible: boolean): void {
    this.focusPrompt.setVisible(visible);
  }

  /** Show the debug overlay with `text`, or hide it with null. */
  setDebug(text: string | null): void {
    this.debug.setVisible(text !== null);
    if (text !== null) this.debug.setText(text);
  }
}
