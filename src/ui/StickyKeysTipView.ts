import Phaser from 'phaser';
import palette from '../data/palette.json';
import type { SaveStore } from '../save';
import { keyLabel } from './bindings';
import {
  STICKY_TIP_AUTO_HIDE_MS,
  isStickyTipDismissCode,
  readPlatform,
  shouldShowStickyKeysTip,
} from './stickyKeysTip';

/**
 * One-time Windows Sticky Keys tip (GDD section 3). A small panel near the
 * bottom of the 960x540 canvas. Non-blocking by design: it takes no pointer
 * input, never swallows or captures keys (it only listens), and the game keeps
 * running underneath. It hides itself after a while, on Enter, or as soon as
 * the player uses one of the alternate gear keys.
 *
 * Colors come from `src/data/palette.json` (`ui.*`).
 *
 * Owner: ui-engineer.
 */

const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 92;
const PANEL_BOTTOM_MARGIN = 24;
const DEPTH = 1000;
const FADE_MS = 250;
const FONT = 'monospace';

const toNumber = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

export interface StickyKeysTipOptions {
  /** Skip the fade tween (reduced motion). */
  readonly reducedMotion?: boolean;
  /** Called once, when the tip is hidden for any reason. */
  readonly onHidden?: () => void;
}

export class StickyKeysTip {
  private readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly options: StickyKeysTipOptions;
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private readonly autoHide: Phaser.Time.TimerEvent;
  private hidden = false;

  constructor(scene: Phaser.Scene, options: StickyKeysTipOptions = {}) {
    this.scene = scene;
    this.options = options;

    const cx = scene.scale.width / 2;
    const top = scene.scale.height - PANEL_HEIGHT - PANEL_BOTTOM_MARGIN;
    this.container = scene.add.container(cx, top).setDepth(DEPTH).setScrollFactor(0);
    this.container.add(this.buildPanel());
    this.container.add(this.buildTexts());
    this.container.add(this.buildKeyCaps());

    this.onKeyDown = (event) => {
      if (isStickyTipDismissCode(event.code)) this.hide();
    };
    scene.input.keyboard?.on('keydown', this.onKeyDown);
    this.autoHide = scene.time.delayedCall(STICKY_TIP_AUTO_HIDE_MS, () => this.hide());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hide());
  }

  isVisible(): boolean {
    return !this.hidden;
  }

  /** Hide and clean up. Safe to call more than once. */
  hide(): void {
    if (this.hidden) return;
    this.hidden = true;
    this.scene.input.keyboard?.off('keydown', this.onKeyDown);
    this.autoHide.remove(false);
    const destroy = (): void => {
      this.container.destroy();
      this.options.onHidden?.();
    };
    if (this.options.reducedMotion === true || !this.scene.sys.isActive()) {
      destroy();
      return;
    }
    this.scene.tweens.add({ targets: this.container, alpha: 0, duration: FADE_MS, onComplete: destroy });
  }

  private buildPanel(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(toNumber(palette.ui.panel), 0.92);
    g.fillRoundedRect(-PANEL_WIDTH / 2, 0, PANEL_WIDTH, PANEL_HEIGHT, 8);
    g.lineStyle(2, toNumber(palette.ui.panelBorder), 1);
    g.strokeRoundedRect(-PANEL_WIDTH / 2, 0, PANEL_WIDTH, PANEL_HEIGHT, 8);
    return g;
  }

  private buildTexts(): Phaser.GameObjects.Text[] {
    const headline = this.scene.add
      .text(0, 14, 'Windows tip: tapping Shift 5 times opens Sticky Keys.', {
        fontFamily: FONT,
        fontSize: '16px',
        color: palette.ui.text,
      })
      .setOrigin(0.5, 0);
    const hint = this.scene.add
      .text(PANEL_WIDTH / 2 - 14, PANEL_HEIGHT - 10, 'Enter to dismiss', {
        fontFamily: FONT,
        fontSize: '12px',
        color: palette.ui.textMuted,
      })
      .setOrigin(1, 1);
    const lead = this.scene.add
      .text(-PANEL_WIDTH / 2 + 24, 56, 'Shift gears with', {
        fontFamily: FONT,
        fontSize: '14px',
        color: palette.ui.textMuted,
      })
      .setOrigin(0, 0.5);
    return [headline, hint, lead];
  }

  /** Q E   or   Z X, drawn as key caps with letters (icons, not just words). */
  private buildKeyCaps(): Phaser.GameObjects.GameObject[] {
    const groups: readonly (readonly string[])[] = [['KeyQ', 'KeyE'], ['KeyZ', 'KeyX']];
    const items: Phaser.GameObjects.GameObject[] = [];
    const capSize = 28;
    const gap = 6;
    let x = -PANEL_WIDTH / 2 + 24 + 140;
    groups.forEach((codes, groupIndex) => {
      if (groupIndex > 0) {
        items.push(
          this.scene.add
            .text(x + 6, 56, 'or', { fontFamily: FONT, fontSize: '14px', color: palette.ui.textMuted })
            .setOrigin(0, 0.5),
        );
        x += 40;
      }
      codes.forEach((code) => {
        items.push(...this.keyCap(x, 56, capSize, keyLabel(code)));
        x += capSize + gap;
      });
    });
    return items;
  }

  private keyCap(x: number, y: number, size: number, label: string): Phaser.GameObjects.GameObject[] {
    const g = this.scene.add.graphics();
    g.fillStyle(toNumber(palette.ui.panelBorder), 0.35);
    g.fillRoundedRect(x, y - size / 2, size, size, 5);
    g.lineStyle(2, toNumber(palette.ui.focus), 1);
    g.strokeRoundedRect(x, y - size / 2, size, size, 5);
    const text = this.scene.add
      .text(x + size / 2, y, label, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: palette.ui.focus })
      .setOrigin(0.5);
    return [g, text];
  }
}

export interface ShowTipArgs {
  readonly scene: Phaser.Scene;
  readonly store: SaveStore;
  /** True on the first level start of this session. */
  readonly isFirstLevelStart: boolean;
}

/**
 * Call when a level starts. Shows the tip if it is due (Windows, never shown,
 * first level start) and records it as shown so it never appears again.
 * Returns the tip, or null when nothing was shown.
 */
export function showStickyKeysTipIfDue({ scene, store, isFirstLevelStart }: ShowTipArgs): StickyKeysTip | null {
  const settings = store.getSettings();
  const due = shouldShowStickyKeysTip({
    platform: readPlatform(),
    tipShown: settings.stickyKeysTipShown,
    isFirstLevelStart,
  });
  if (!due) return null;
  store.markStickyKeysTipShown();
  return new StickyKeysTip(scene, { reducedMotion: settings.reducedMotion });
}
