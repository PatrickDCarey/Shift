import Phaser from 'phaser';
import palette from '../data/palette.json';
import { PIXEL_KEYS, textWidth } from '../fx/pixel';
import type { SaveStore } from '../save';
import { keyLabel } from './bindings';
import { PANEL_BOTTOM_MARGIN, PANEL_HEIGHT } from './stickyKeysTip';
import {
  STICKY_TIP_AUTO_HIDE_MS,
  isStickyTipDismissCode,
  readPlatform,
  shouldShowStickyKeysTip,
} from './stickyKeysTip';

/**
 * One-time Windows Sticky Keys tip (GDD section 3). A small panel near the
 * bottom of the 480x270 canvas, drawn in whole pixels with the bitmap font. Non-blocking by design: it takes no pointer
 * input, never swallows or captures keys (it only listens), and the game keeps
 * running underneath. It hides itself after a while, on Enter, or as soon as
 * the player uses one of the alternate gear keys.
 *
 * Colors come from `src/data/palette.json` (`ui.*`).
 *
 * Owner: ui-engineer.
 */

const PANEL_WIDTH = 340;


const DEPTH = 1000;
const FADE_MS = 250;
const CAP_SIZE = 14;
const CAP_GAP = 3;
const ROW_Y = 22;

const toNumber = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

export interface StickyKeysTipOptions {
  /** Skip the fade tween (reduced motion). */
  readonly reducedMotion?: boolean;
  /** Called once, when the tip is hidden for any reason. */
  readonly onHidden?: () => void;
}

/** Scenes whose current visit already hid the tip by winning: it never comes back in that visit (sticky-keys-tip.md 7a). */
const wonScenes = new WeakSet<Phaser.Scene>();

export class StickyKeysTip {
  private readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly options: StickyKeysTipOptions;
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  private readonly autoHide: Phaser.Time.TimerEvent;
  private hidden: boolean;

  constructor(scene: Phaser.Scene, options: StickyKeysTipOptions = {}) {
    this.scene = scene;
    this.options = options;
    this.hidden = wonScenes.has(scene);
    this.onKeyDown = (event) => {
      if (isStickyTipDismissCode(event.code)) this.hide();
    };

    const cx = scene.scale.width / 2;
    const top = scene.scale.height - PANEL_HEIGHT - PANEL_BOTTOM_MARGIN;
    this.container = scene.add.container(cx, top).setDepth(DEPTH).setScrollFactor(0);
    this.autoHide = scene.time.delayedCall(STICKY_TIP_AUTO_HIDE_MS, () => this.hide());
    if (this.hidden) {
      // Won earlier in this visit (a pause/resume rebuilt the tip): stay gone.
      this.autoHide.remove(false);
      this.container.destroy();
      return;
    }
    this.container.add(this.buildPanel());
    this.container.add(this.buildTexts());
    this.container.add(this.buildKeyCaps());

    scene.input.keyboard?.on('keydown', this.onKeyDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      wonScenes.delete(scene); // the next visit may show it again
      this.hide();
    });
  }

  isVisible(): boolean {
    return !this.hidden;
  }

  /** The win moment: gone at once, no fade, so it is not on screen behind the results panel. */
  hideOnWin(): void {
    wonScenes.add(this.scene);
    if (this.hidden) return;
    this.hidden = true;
    this.scene.input.keyboard?.off('keydown', this.onKeyDown);
    this.autoHide.remove(false);
    this.container.destroy();
    this.options.onHidden?.();
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
    g.fillRect(-PANEL_WIDTH / 2, 0, PANEL_WIDTH, PANEL_HEIGHT);
    g.fillStyle(toNumber(palette.ui.panelBorder), 1);
    this.frame(g, -PANEL_WIDTH / 2, 0, PANEL_WIDTH, PANEL_HEIGHT);
    return g;
  }

  /** 1 px outline as four rectangles (no strokes: they land on half pixels). */
  private frame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y + 1, 1, h - 2);
    g.fillRect(x + w - 1, y + 1, 1, h - 2);
  }

  private text(x: number, y: number, value: string, color: string, rightAligned = false): Phaser.GameObjects.BitmapText {
    const left = rightAligned ? x - textWidth(value) : x;
    return this.scene.add.bitmapText(Math.round(left), y, PIXEL_KEYS.font, value).setTint(toNumber(color));
  }

  private buildTexts(): Phaser.GameObjects.BitmapText[] {
    const headline = 'Windows tip: tapping Shift 5 times opens Sticky Keys.';
    return [
      this.text(-textWidth(headline) / 2, 6, headline, palette.ui.text),
      this.text(-PANEL_WIDTH / 2 + 12, ROW_Y + 3, 'Shift gears with', palette.ui.textMuted),
      this.text(PANEL_WIDTH / 2 - 8, PANEL_HEIGHT - 11, 'Enter to dismiss', palette.ui.textMuted, true),
    ];
  }

  /** Q E   or   Z X, drawn as key caps with letters (icons, not just words). */
  private buildKeyCaps(): Phaser.GameObjects.GameObject[] {
    const groups: readonly (readonly string[])[] = [['KeyQ', 'KeyE'], ['KeyZ', 'KeyX']];
    const items: Phaser.GameObjects.GameObject[] = [];
    let x = -PANEL_WIDTH / 2 + 12 + textWidth('Shift gears with') + 8;
    groups.forEach((codes, groupIndex) => {
      if (groupIndex > 0) {
        items.push(this.text(x + 2, ROW_Y + 3, 'or', palette.ui.textMuted));
        x += textWidth('or') + 8;
      }
      codes.forEach((code) => {
        items.push(...this.keyCap(x, ROW_Y - 1, keyLabel(code)));
        x += CAP_SIZE + CAP_GAP;
      });
    });
    return items;
  }

  private keyCap(x: number, y: number, label: string): Phaser.GameObjects.GameObject[] {
    const g = this.scene.add.graphics();
    g.fillStyle(toNumber(palette.ui.panelBorder), 0.35);
    g.fillRect(x, y, CAP_SIZE, CAP_SIZE);
    g.fillStyle(toNumber(palette.ui.focus), 1);
    this.frame(g, x, y, CAP_SIZE, CAP_SIZE);
    const text = this.text(x + Math.floor((CAP_SIZE - textWidth(label)) / 2), y + 3, label, palette.ui.focus);
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
