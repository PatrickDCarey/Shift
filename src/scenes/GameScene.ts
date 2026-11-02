import Phaser from 'phaser';
import type { SimEvent } from '../core/types';
import { cameraScroll } from '../entities/camera';
import { debugText } from '../entities/debugText';
import { FeedbackFx } from '../entities/FeedbackFx';
import { GameHud } from '../entities/GameHud';
import { InputSampler } from '../entities/inputSampler';
import { easeToward, renderPosition } from '../entities/interpolation';
import { attachKeyboard } from '../entities/keyboardInput';
import { LEVEL_FILES } from '../entities/levelFiles';
import { LevelView } from '../entities/LevelView';
import { loadGameParams, type GameParams } from '../entities/params';
import { PlayerView } from '../entities/PlayerView';
import { RunDriver } from '../entities/runDriver';
import { selectLevel } from '../entities/levelSelect';
import { backgroundRgb, hexToNumber, mix, palette, rgbToHex, tintForSpeed } from '../fx';
import { SCENE_KEYS } from './keys';

/** The world tint follows actual speed, eased so it never flickers at a band edge (docs/art/style.md). */
const TINT_EASE_MS = 100;

/** Read-only snapshot for QA and debugging in the browser console. */
interface DebugHook {
  readonly levelId: string;
  readonly state: RunDriver['state'];
}

/**
 * Drives the deterministic sim at a fixed step and draws it, interpolated.
 * Decides no game rules: it samples input, calls `step`, and renders state.
 */
export class GameScene extends Phaser.Scene {
  private cfg!: GameParams;
  private driver!: RunDriver;
  private sampler = new InputSampler();
  private levelView!: LevelView;
  private playerView!: PlayerView;
  private fx!: FeedbackFx;
  private hud!: GameHud;
  private detachKeyboard: () => void = () => undefined;
  private debugOn = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
  private showDebug = false;
  private tintSpeed = 0;
  private lastBackground = -1;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    this.cfg = loadGameParams();
    const selection = selectLevel(LEVEL_FILES, window.location.search);
    const { tuning, params } = this.cfg;
    this.driver = new RunDriver(selection.level, params);
    this.sampler = new InputSampler();
    this.levelView = new LevelView(this, selection.level, tuning.tileSize);
    this.playerView = new PlayerView(this, tuning.tileSize, tuning.playerWidthTiles, tuning.playerHeightTiles);
    this.fx = new FeedbackFx(this);
    const { id, title } = selection.level.meta;
    this.hud = new GameHud(this, `${id}  ${title}`, selection.messages);
    this.detachKeyboard = attachKeyboard(this.sampler, {
      onToggleDebug: () => {
        if (this.debugOn) this.showDebug = !this.showDebug;
      },
    });
    this.installDebugHook(id);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  override update(time: number, delta: number): void {
    const events = this.driver.advance(delta, () => this.sampler.sample());
    const { state, prev, alpha } = this.driver;
    const ts = this.cfg.tuning.tileSize;
    const pos = renderPosition(prev, state, alpha);
    const feetX = pos.x * ts;
    const feetY = pos.y * ts;
    this.reactToEvents(events, feetX, feetY - (this.cfg.tuning.playerHeightTiles * ts) / 2);
    this.levelView.update(state.player.band, state.player.graceBand, time);
    this.playerView.draw(feetX, feetY, state.player.band, state.player.facing);
    this.followCamera(feetX, feetY - (this.cfg.tuning.playerHeightTiles * ts) / 2);
    this.applyTint(Math.abs(state.player.vx), delta);
    this.fx.update(delta);
    this.hud.setWon(state.wonAtStep, state.status === 'won');
    this.hud.setDebug(this.debugOn && this.showDebug ? debugText(state, this.game.loop.actualFps) : null);
  }

  private reactToEvents(events: readonly SimEvent[], centerX: number, centerY: number): void {
    for (const e of events) {
      if (e.type === 'airDrag') this.fx.airDrag(centerX, centerY);
      else if (e.type === 'died') this.fx.died();
    }
  }

  private followCamera(focusX: number, focusY: number): void {
    const { level } = this.driver;
    const ts = this.cfg.tuning.tileSize;
    const cam = this.cameras.main;
    const s = cameraScroll(focusX, focusY, cam.width, cam.height, level.width * ts, level.height * ts);
    cam.setScroll(s.x, s.y);
  }

  /** A low-strength wash of the speed tint over the background only, never over tiles. */
  private applyTint(speed: number, deltaMs: number): void {
    this.tintSpeed = easeToward(this.tintSpeed, speed, deltaMs, TINT_EASE_MS);
    const top = Math.max(...this.cfg.tuning.gearSpeeds);
    const wash = mix(backgroundRgb(), tintForSpeed(this.tintSpeed, top), palette.tint.strength);
    const color = hexToNumber(rgbToHex(wash));
    if (color === this.lastBackground) return;
    this.lastBackground = color;
    this.cameras.main.setBackgroundColor(color);
  }

  private installDebugHook(levelId: string): void {
    const read = (): RunDriver['state'] => this.driver.state;
    const hook: DebugHook = {
      levelId,
      get state() {
        return read();
      },
    };
    Object.defineProperty(window, '__redshift', { value: hook, configurable: true });
  }

  private teardown(): void {
    this.detachKeyboard();
    this.sampler.clear();
    this.levelView.destroy();
    this.playerView.destroy();
    this.fx.destroy();
    Reflect.deleteProperty(window, '__redshift');
  }
}
