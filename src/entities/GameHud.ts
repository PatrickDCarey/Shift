/**
 * Text overlay at 480 x 270 on the 5 x 7 bitmap font (`pixel-font`, tinted from
 * palette.ui): level title, load/parse messages, the focus prompt and the dev
 * debug overlay. The pause menu and the results panel are overlay scenes (ui-engineer). The gear meter (ui-engineer) sits in
 * GEAR_METER_AREA, top-left. All objects are fixed to the camera and sit on
 * whole pixels (layout in `hudText.ts`).
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { hexToNumber, palette, PIXEL_KEYS } from '../fx';
import { FOCUS_PROMPT_TEXT } from './focusPrompt';
import { blockHeight, blockWidth, centeredX, wrapText } from './hudText';
import { GEAR_METER_LAYOUT } from '../ui';

const DEPTH_HUD = 200;
const MARGIN = 5;
const MESSAGE_WRAP = 460;
const PAD_X = 3;
const PAD_Y = 2;

/** Top-left rectangle (screen px) kept free for ui-engineer's GearMeterView. */
export const GEAR_METER_AREA = {
  x: MARGIN,
  y: MARGIN,
  width: GEAR_METER_LAYOUT.panelW,
  height: GEAR_METER_LAYOUT.panelH,
} as const;

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

type Anchor = 'topCenter' | 'topLeft' | 'topRight' | 'bottomCenter';

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
    const { width } = this.scene.scale;
    let left = x;
    let top = y;
    if (anchor === 'topCenter') left = centeredX(width, boxW);
    else if (anchor === 'topRight') left = x - boxW;
    else if (anchor === 'bottomCenter') {
      left = centeredX(width, boxW);
      top = y - boxH;
    }
    this.panel.setPosition(left, top).setSize(boxW, boxH);
    this.text.setPosition(left + padX, top + padY);
  }
}

export class GameHud {
  private readonly debug: HudText;
  private readonly focusPrompt: HudText;

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
    this.debug = new HudText(scene, { anchor: 'topRight', x: width - MARGIN, y: MARGIN, color: text });
    // Plain text, no input handling: it never blocks a key or a click.
    this.focusPrompt = new HudText(scene, { anchor: 'bottomCenter', x: 0, y: height - MARGIN, color: text });
    this.focusPrompt.setText(FOCUS_PROMPT_TEXT);
    if (messages.length > 0) {
      shown(
        new HudText(scene, { anchor: 'topLeft', x: layout.messages.x, y: layout.messages.y, color: text }),
        wrapText(messages.join('\n'),MESSAGE_WRAP - 2 * PAD_X),
      );
    }
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
