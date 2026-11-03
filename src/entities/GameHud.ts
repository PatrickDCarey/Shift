/**
 * Minimal text overlay for the grey-box scene: level title, the win banner,
 * load/parse messages and the dev debug overlay. The real gear meter belongs
 * to ui-engineer and goes in GEAR_METER_AREA (top-left). All objects are fixed to the camera.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { palette } from '../fx';
import { FOCUS_PROMPT_TEXT } from './focusPrompt';

const DEPTH_HUD = 200;
const MARGIN = 10;
const MESSAGE_WRAP = 920;

/** Top-left rectangle (screen px) kept free for ui-engineer's GearMeterView. */
export const GEAR_METER_AREA = { x: MARGIN, y: MARGIN, width: 220, height: 64 } as const;

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

export class GameHud {
  private readonly banner: Phaser.GameObjects.Text;
  private readonly debug: Phaser.GameObjects.Text;
  private readonly focusPrompt: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, title: string, messages: readonly string[]) {
    const { width, height } = scene.scale;
    const base = { fontFamily: 'monospace', color: palette.ui.text };
    const panel = { backgroundColor: palette.ui.panel, padding: { x: 8, y: 4 } };
    const fixed = <T extends Phaser.GameObjects.Text>(t: T): T => t.setScrollFactor(0).setDepth(DEPTH_HUD);
    const layout = hudLayout(width);
    fixed(
      scene.add
        .text(layout.title.x, layout.title.y, title, { ...base, ...panel, fontSize: '14px', color: palette.ui.textMuted })
        .setOrigin(0.5, 0),
    );
    this.banner = fixed(
      scene.add
        .text(width / 2, height / 2, '', { ...base, ...panel, fontSize: '28px', padding: { x: 20, y: 12 } })
        .setOrigin(0.5)
        .setVisible(false),
    );
    this.debug = fixed(
      scene.add
        .text(width - MARGIN, MARGIN, '', { ...base, ...panel, fontSize: '13px', align: 'right' })
        .setOrigin(1, 0)
        .setVisible(false),
    );
    // Plain text, no input handling: it never blocks a key or a click.
    this.focusPrompt = fixed(
      scene.add
        .text(width / 2, height - MARGIN, FOCUS_PROMPT_TEXT, { ...base, ...panel, fontSize: '16px' })
        .setOrigin(0.5, 1)
        .setVisible(false),
    );
    if (messages.length > 0) {
      fixed(
        scene.add.text(layout.messages.x, layout.messages.y, messages.join('\n'), {
          ...base,
          ...panel,
          fontSize: '13px',
          wordWrap: { width: MESSAGE_WRAP },
        }),
      );
    }
  }

  /** `steps` is the winning run's step count, or null while playing. */
  setWon(steps: number | null, won: boolean, stepHz: number): void {
    if (won) this.banner.setText(winText(steps, stepHz));
    this.banner.setVisible(won);
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
