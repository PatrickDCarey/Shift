import Phaser from 'phaser';
import palette from '../data/palette.json';
import { PIXEL_KEYS } from '../fx/pixel';
import { HeldKeys } from './heldKeys';
import type { DrawPlan, ColourRole } from './menuDraw';
import { MENU_CAPTURE_CODES, createMenuInput, stepMenuInput } from './menuInput';
import type { MenuIntent, MenuInputState } from './menuInput';

/**
 * Shared Phaser plumbing for the keyboard-only menu scenes: draws a `DrawPlan`
 * with the bitmap font and whole-pixel rectangles, and turns key events into
 * one `MenuIntent` per frame. Rendering only; every decision is in the models.
 *
 * Owner: ui-engineer.
 */

const toNumber = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

const ROLE_COLOURS: Readonly<Record<ColourRole, number>> = {
  text: toNumber(palette.ui.text),
  muted: toNumber(palette.ui.textMuted),
  focus: toNumber(palette.ui.focus),
  border: toNumber(palette.ui.panelBorder),
};

/** Redraws a plan into one container (cleared each time; menus have a few dozen objects). */
export class MenuCanvas {
  private readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.cameras.main.setBackgroundColor(palette.ui.panel);
    this.container = scene.add.container(0, 0);
  }

  draw(plan: DrawPlan): void {
    this.container.removeAll(true);
    const g = this.scene.add.graphics();
    for (const r of plan.rects) {
      g.fillStyle(ROLE_COLOURS[r.role], 1);
      g.fillRect(r.x, r.y, r.w, r.h);
    }
    this.container.add(g);
    for (const t of plan.texts) {
      const text = this.scene.add
        .bitmapText(t.x, t.y, PIXEL_KEYS.font, t.text)
        .setScale(t.scale)
        .setTint(ROLE_COLOURS[t.role]);
      this.container.add(text);
    }
  }

  /** Move the whole drawing by whole pixels (the locked-cell nudge). */
  offset(dx: number, dy: number): void {
    this.container.setPosition(dx, dy);
  }
}

/** Keyboard source for a menu scene: capture keys, track held codes, one intent per `poll`. */
export class MenuKeys {
  private readonly held = new HeldKeys();
  private state: MenuInputState = createMenuInput();
  private readonly down: (e: KeyboardEvent) => void;
  private readonly up: (e: KeyboardEvent) => void;
  private readonly blur: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    // Arrows and Space must not scroll the itch.io iframe.
    keyboard?.addCapture([...MENU_CAPTURE_CODES]);
    this.down = (e) => this.held.keyDown(e.code, e.repeat);
    this.up = (e) => this.held.keyUp(e.code);
    this.blur = () => this.held.clear();
    keyboard?.on('keydown', this.down);
    keyboard?.on('keyup', this.up);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.blur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
  }

  poll(): MenuIntent {
    const step = stepMenuInput(this.state, this.held.snapshot());
    this.state = step.state;
    return step.intent;
  }

  private dispose(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown', this.down);
    keyboard?.off('keyup', this.up);
    keyboard?.removeCapture([...MENU_CAPTURE_CODES]);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.blur);
  }
}
