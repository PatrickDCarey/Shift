import Phaser from 'phaser';
import palette from '../data/palette.json';
import { PIXEL_KEYS } from '../fx/pixel';
import { HeldKeys } from './heldKeys';
import type { DrawPlan, ColourRole } from './menuDraw';
import { DITHER_CELLS } from './panelDraw';
import { SCREEN_H, SCREEN_W } from './menuLayout';
import { createMenuInput, shouldPreventDefault, stepMenuInput } from './menuInput';
import type { MenuIntent, MenuInputOptions, MenuInputState } from './menuInput';

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
  panel: toNumber(palette.ui.panel),
};

const DITHER_KEY = 'ui/dither';

/** A full-screen 50% Bayer checker of `palette.ui.panel` (a dither, not an alpha fade: pixel style). */
function addDither(scene: Phaser.Scene): void {
  if (!scene.textures.exists(DITHER_KEY)) {
    const tex = scene.textures.createCanvas(DITHER_KEY, 2, 2);
    const ctx = tex?.getContext();
    if (tex && ctx) {
      ctx.fillStyle = palette.ui.panel;
      for (const [x, y] of DITHER_CELLS) ctx.fillRect(x, y, 1, 1);
      tex.refresh();
    }
  }
  scene.add.tileSprite(0, 0, SCREEN_W, SCREEN_H, DITHER_KEY).setOrigin(0, 0);
}

/** Redraws a plan into one container (cleared each time; menus have a few dozen objects). */
export class MenuCanvas {
  private readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;

  /** `overlay`: draw over the scene below (no opaque background), with the 50% dither under the panel. */
  constructor(scene: Phaser.Scene, overlay = false) {
    this.scene = scene;
    if (overlay) {
      scene.scene.bringToTop();
      addDither(scene);
    } else {
      scene.cameras.main.setBackgroundColor(palette.ui.panel);
    }
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
    // Arrows and Space must not scroll the itch.io iframe: prevent them here,
    // as keyboardInput.ts does (Phaser's addCapture takes key names, not codes,
    // and removeCapture is global across scenes).
    this.down = (e) => {
      if (shouldPreventDefault(e)) e.preventDefault();
      this.held.keyDown(e.code, e.repeat);
    };
    this.up = (e) => this.held.keyUp(e.code);
    this.blur = () => this.held.clear();
    keyboard?.on('keydown', this.down);
    keyboard?.on('keyup', this.up);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.blur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
  }

  /** `blocked`: nothing acts, and keys held meanwhile stay masked after (the results beat). */
  poll(options: Omit<MenuInputOptions, 'pressed'> = {}): MenuIntent {
    const step = stepMenuInput(this.state, this.held.snapshot(), { ...options, pressed: this.held.takePressed() });
    this.state = step.state;
    return step.intent;
  }

  private dispose(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown', this.down);
    keyboard?.off('keyup', this.up);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.blur);
  }
}
