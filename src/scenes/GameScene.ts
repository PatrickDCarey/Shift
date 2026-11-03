import Phaser from 'phaser';
import type { SimEvent } from '../core/types';
import { cameraScroll } from '../entities/camera';
import { debugText } from '../entities/debugText';
import { FeedbackFx } from '../entities/FeedbackFx';
import { GameHud, GEAR_METER_AREA } from '../entities/GameHud';
import { InputSampler } from '../entities/inputSampler';
import { embeddedMask } from '../entities/embedded';
import { focusPromptVisible } from '../entities/focusPrompt';
import { easeToward, renderPosition } from '../entities/interpolation';
import { attachKeyboard } from '../entities/keyboardInput';
import { LEVEL_FILES } from '../entities/levelFiles';
import { LevelView } from '../entities/LevelView';
import { loadGameParams, type GameParams } from '../entities/params';
import { PlayerView } from '../entities/PlayerView';
import { chooseFrameSource, type FrameSource, type ReplayFeed } from '../entities/replay';
import { RunDriver, type FrameSupplier } from '../entities/runDriver';
import { SOLUTION_FILES } from '../entities/solutionFiles';
import { selectLevel } from '../entities/levelSelect';
import { backgroundForSpeed, hexToNumber, rgbToHex } from '../fx';
import { gearMeterModel } from '../ui';
import { GearMeterView } from '../ui/GearMeterView';
import { SCENE_KEYS } from './keys';

/** The world tint follows actual speed, eased so it never flickers at a band edge (docs/art/style.md). */
const TINT_EASE_MS = 100;

function hudTitle(id: string, title: string, source: FrameSource): string {
  return source.kind === 'replay' ? `${id}  ${title}  [replay, R restarts]` : `${id}  ${title}`;
}

/** The replay error, if any, shown beside the level-load messages. */
function sourceMessages(source: FrameSource): readonly string[] {
  return source.kind === 'error' ? [source.message] : [];
}

/** Read-only snapshot for QA and debugging in the browser console. */
interface DebugHook {
  readonly levelId: string;
  readonly state: RunDriver['state'];
  readonly replay: { readonly active: boolean; readonly done: boolean; readonly frames: number };
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
  private gearMeter!: GearMeterView;
  private detachKeyboard: () => void = () => undefined;
  private debugOn = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
  private showDebug = false;
  private tintSpeed = 0;
  private lastBackground = -1;
  /** Set while `?replay=1` is playing a solution; keyboard play is off then. */
  private replay: { readonly feed: ReplayFeed; readonly speed: number | null } | null = null;

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
    const source = chooseFrameSource(window.location.search, selection.level, SOLUTION_FILES);
    this.replay = source.kind === 'replay' ? { feed: source.feed, speed: source.speed } : null;
    this.hud = new GameHud(this, hudTitle(id, title, source), [...selection.messages, ...sourceMessages(source)]);
    this.gearMeter = new GearMeterView(this, GEAR_METER_AREA.x, GEAR_METER_AREA.y);
    this.gearMeter.setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.detachKeyboard = attachKeyboard(this.sampler, {
      onToggleDebug: () => {
        if (this.debugOn) this.showDebug = !this.showDebug;
      },
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => window.focus());
    this.installDebugHook(id);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  override update(time: number, delta: number): void {
    const events = this.runSim(delta);
    const { state, prev, alpha } = this.driver;
    const ts = this.cfg.tuning.tileSize;
    const pos = renderPosition(prev, state, alpha);
    const feetX = pos.x * ts;
    const feetY = pos.y * ts;
    this.reactToEvents(events, feetX, feetY - (this.cfg.tuning.playerHeightTiles * ts) / 2);
    const embedded = embeddedMask(
      this.driver.level,
      state.player.x,
      state.player.y,
      this.cfg.tuning.playerWidthTiles,
      this.cfg.tuning.playerHeightTiles,
    );
    this.levelView.update(state.player.band, state.player.graceBand, embedded, time);
    this.playerView.draw(feetX, feetY, state.player.band, state.player.facing);
    this.followCamera(feetX, feetY - (this.cfg.tuning.playerHeightTiles * ts) / 2);
    this.applyTint(Math.abs(state.player.vx), delta);
    this.fx.update(delta);
    this.gearMeter.update(gearMeterModel(state.player, this.cfg.params));
    this.hud.setWon(state.wonAtStep, state.status === 'won', this.cfg.params.stepHz);
    this.hud.setFocusPrompt(focusPromptVisible(document.hasFocus()));
    this.hud.setDebug(this.debugOn && this.showDebug ? debugText(state, this.game.loop.actualFps) : null);
  }

  /** Advance the sim: from the keyboard, or from the recorded frames, one per step. */
  private runSim(delta: number): readonly SimEvent[] {
    const replay = this.replay;
    if (replay === null) return this.driver.advance(delta, () => this.sampler.sample());
    if (replay.feed.restartPressed(this.sampler.sample().restart)) this.restartReplay(replay.feed);
    const supply: FrameSupplier = () => replay.feed.next(this.driver.state);
    const events =
      replay.speed === null ? this.driver.advance(delta, supply) : this.driver.advanceFixed(replay.speed, supply);
    if (replay.feed.isDone(this.driver.state)) this.driver.alpha = 1;
    return events;
  }

  /** R while replaying: a fresh sim and the first frame again. */
  private restartReplay(feed: ReplayFeed): void {
    feed.rewind();
    this.driver = new RunDriver(this.driver.level, this.driver.params);
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

  /** Near-black standing, a dark hue of the band when moving; background only, never over tiles. */
  private applyTint(speed: number, deltaMs: number): void {
    this.tintSpeed = easeToward(this.tintSpeed, speed, deltaMs, TINT_EASE_MS);
    const top = Math.max(...this.cfg.tuning.gearSpeeds);
    const color = hexToNumber(rgbToHex(backgroundForSpeed(this.tintSpeed, top)));
    if (color === this.lastBackground) return;
    this.lastBackground = color;
    this.cameras.main.setBackgroundColor(color);
  }

  private installDebugHook(levelId: string): void {
    const read = (): RunDriver['state'] => this.driver.state;
    const replay = this.replay;
    const hook: DebugHook = {
      levelId,
      get state() {
        return read();
      },
      get replay() {
        if (replay === null) return { active: false, done: false, frames: 0 };
        return { active: true, done: replay.feed.isDone(read()), frames: replay.feed.frames.length };
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
    this.gearMeter.destroy();
    Reflect.deleteProperty(window, '__redshift');
  }
}
