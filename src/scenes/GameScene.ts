import Phaser from 'phaser';
import type { InputFrame, SimEvent } from '../core/types';
import { audio } from '../audio';
import { cameraScroll } from '../entities/camera';
import { debugText } from '../entities/debugText';
import { FeedbackFx } from '../entities/FeedbackFx';
import { GameHud, GEAR_METER_AREA } from '../entities/GameHud';
import { InputSampler } from '../entities/inputSampler';
import { embeddedMask } from '../entities/embedded';
import { focusPromptVisible } from '../entities/focusPrompt';
import { easeToward, renderPosition } from '../entities/interpolation';
import { attachKeyboard } from '../entities/keyboardInput';
import { pageLevelStarts } from '../entities/levelStart';
import { LEVEL_FILES } from '../entities/levelFiles';
import { LevelView } from '../entities/LevelView';
import { prefersReducedMotion, reducedMotion } from '../entities/motionPrefs';
import { loadGameParams, type GameParams } from '../entities/params';
import { PauseState, type PauseChange } from '../entities/pauseState';
import { PlayerView } from '../entities/PlayerView';
import { chooseFrameSource, parseReplayRequest, type FrameSource, type ReplayFeed } from '../entities/replay';
import { RunDriver, type FrameSupplier } from '../entities/runDriver';
import { SOLUTION_FILES } from '../entities/solutionFiles';
import { loadLevelSet, nextLevelId, selectLevel } from '../entities/levelSelect';
import { LEVEL_COMPLETE_EVENT, recordWin, type LevelCompleteEvent } from '../entities/winFlow';
import { backgroundForSpeed, hexToNumber, rgbToHex } from '../fx';
import type { SaveStore } from '../save';
import { gearMeterModel, INITIAL_GEAR_METER_MODEL, type GearMeterModel } from '../ui';
import { GearMeterView } from '../ui/GearMeterView';
import { showStickyKeysTipIfDue, type StickyKeysTip } from '../ui/StickyKeysTipView';
import { getSaveStore, SCENE_KEYS } from './keys';

/** The world tint follows actual speed, eased so it never flickers at a band edge (docs/art/style.md). */
const TINT_EASE_MS = 100;

/** Data a caller (results NEXT, level select) hands to `scene.start`/`restart`. */
export interface GameSceneData {
  /** Level to load instead of the `?level=` parameter. */
  readonly levelId?: string;
}

function hudTitle(id: string, title: string, source: FrameSource): string {
  return source.kind === 'replay' ? `${id}  ${title}  [replay, R restarts]` : `${id}  ${title}`;
}

/** The replay error, if any, shown beside the level-load messages. */
function sourceMessages(source: FrameSource): readonly string[] {
  return source.kind === 'error' ? [source.message] : [];
}

/**
 * `window.__redshift` (the QA/replay hook) exists only in dev and in builds made with VITE_QA_HOOK=1
 * (Playwright's e2e build). Both are inlined at build time, so the itch.io build has no hook at all.
 * tests/arch/qa-hook.test.ts requires every `'__redshift'` use to sit on an `if (QA_HOOK)` line.
 */
const QA_HOOK = import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1';

/** Read-only snapshot for QA and debugging in the browser console. */
interface DebugHook {
  readonly levelId: string;
  readonly state: RunDriver['state'];
  readonly replay: { readonly active: boolean; readonly done: boolean; readonly frames: number };
  /** The latest gear meter model (what the HUD meter is drawing). */
  readonly meter: GearMeterModel;
  /** The win banner text while it is showing, else null. */
  readonly banner: string | null;
  readonly paused: boolean;
}

/** One audio unlock listener for the whole page, however often the scene restarts. */
let audioUnlockInstalled = false;

/**
 * Drives the deterministic sim at a fixed step and draws it, interpolated.
 * Decides no game rules: it samples input, calls `step`, and renders state.
 * Progression, pause and results logic are pure helpers in `src/entities`.
 */
export class GameScene extends Phaser.Scene {
  private cfg!: GameParams;
  private driver!: RunDriver;
  private sampler = new InputSampler();
  private store!: SaveStore;
  private levelView!: LevelView;
  private playerView!: PlayerView;
  private fx!: FeedbackFx;
  private hud!: GameHud;
  private gearMeter!: GearMeterView;
  private tip: StickyKeysTip | null = null;
  private detachKeyboard: () => void = () => undefined;
  private debugOn = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
  private showDebug = false;
  private tintSpeed = 0;
  private lastBackground = -1;
  private requestedLevelId: string | null = null;
  private pause = new PauseState();
  /** R pressed while paused: the next live frame carries a restart press. */
  private pendingRestart = false;
  /** `?replay=1` was asked for (even if the solution failed to load): nothing is saved. */
  private replayRequested = false;
  /** The win of the current run, from the same event the results screen gets; null while playing. */
  private lastWin: LevelCompleteEvent | null = null;
  private nextId: string | null = null;
  private meter: GearMeterModel = INITIAL_GEAR_METER_MODEL;
  /** Set while `?replay=1` is playing a solution; keyboard play is off then. */
  private replay: { readonly feed: ReplayFeed; readonly speed: number | null } | null = null;

  constructor() {
    super(SCENE_KEYS.game);
  }

  init(data?: GameSceneData): void {
    this.requestedLevelId = data?.levelId ?? null;
  }

  create(): void {
    this.cfg = loadGameParams();
    this.store = getSaveStore(this.registry);
    this.pause = new PauseState();
    this.pendingRestart = false;
    this.lastWin = null;
    this.nextId = null;
    this.meter = INITIAL_GEAR_METER_MODEL;
    const search = this.requestedLevelId === null ? window.location.search : `?level=${encodeURIComponent(this.requestedLevelId)}`;
    this.replayRequested = parseReplayRequest(search).active;
    const selection = selectLevel(LEVEL_FILES, search);
    const { tuning, params } = this.cfg;
    this.driver = new RunDriver(selection.level, params);
    this.sampler = new InputSampler();
    this.levelView = new LevelView(this, selection.level, tuning.tileSize);
    this.playerView = new PlayerView(this, tuning.tileSize, tuning.playerWidthTiles, tuning.playerHeightTiles);
    this.fx = new FeedbackFx(this);
    const { id, title } = selection.level.meta;
    const source = chooseFrameSource(search, selection.level, SOLUTION_FILES);
    this.replay = source.kind === 'replay' ? { feed: source.feed, speed: source.speed } : null;
    this.hud = new GameHud(this, hudTitle(id, title, source), [...selection.messages, ...sourceMessages(source)]);
    this.gearMeter = new GearMeterView(this, GEAR_METER_AREA.x, GEAR_METER_AREA.y);
    const osReduced = prefersReducedMotion(typeof window.matchMedia === 'function' ? (q) => window.matchMedia(q) : undefined);
    this.gearMeter.setReducedMotion(reducedMotion(this.store.getSettings(), osReduced));
    this.detachKeyboard = attachKeyboard(this.sampler, {
      onToggleDebug: () => {
        if (this.debugOn) this.showDebug = !this.showDebug;
      },
      onFocusLost: () => this.applyPauseChange(this.pause.pauseOnFocusLoss(this.canPause()) ? 'paused' : null),
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => window.focus());
    this.input.keyboard?.on('keydown-ENTER', () => this.goToNextLevel());
    this.installAudioUnlock();
    this.mountStickyKeysTip();
    this.installDebugHook(id);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  override update(time: number, delta: number): void {
    this.handlePauseKeys();
    const paused = this.pause.paused;
    const events = paused ? [] : this.runSim(delta);
    this.handleWins();
    const { state, prev, alpha } = this.driver;
    if (state.status !== 'won') this.lastWin = null;
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
    if (!paused) this.fx.update(delta);
    this.meter = gearMeterModel(state.player, this.cfg.params);
    this.gearMeter.update(this.meter);
    this.hud.setWon(this.lastWin?.result.wonAtStep ?? null, this.lastWin !== null, this.cfg.params.stepHz);
    this.hud.setNextHint(this.lastWin !== null && this.nextId !== null);
    this.hud.setPaused(paused);
    this.hud.setFocusPrompt(focusPromptVisible(document.hasFocus()));
    this.hud.setDebug(this.debugOn && this.showDebug ? debugText(state, this.game.loop.actualFps) : null);
  }

  /** Esc/P toggles the pause; R while paused restarts and closes it. Edges are consumed every frame. */
  private handlePauseKeys(): void {
    const pausePressed = this.sampler.takePausePress();
    const restartPressed = this.sampler.takeRestartPress();
    if (pausePressed) this.applyPauseChange(this.pause.toggle(this.canPause()));
    else if (restartPressed && this.pause.paused) this.restartFromPause();
  }

  /** Pausing is off after the win step: the results screen owns the screen. */
  private canPause(): boolean {
    return this.driver.state.status !== 'won';
  }

  private applyPauseChange(change: PauseChange): void {
    if (change === 'paused') {
      this.sampler.setPaused(true);
      this.tip?.hide(); // pausing hides the Sticky Keys tip for good
      this.tip = null;
    } else if (change === 'resumed') {
      this.sampler.setPaused(false);
      this.driver.resetClock(); // no catch-up after a long pause
    }
  }

  /** R while paused: the run restarts as R in play does, and the pause closes. */
  private restartFromPause(): void {
    this.applyPauseChange(this.pause.resume() ? 'resumed' : null);
    if (this.replay === null) this.pendingRestart = true;
    else this.restartReplay(this.replay.feed);
  }

  /** Advance the sim: from the keyboard, or from the recorded frames, one per step. */
  private runSim(delta: number): readonly SimEvent[] {
    const replay = this.replay;
    if (replay === null) return this.driver.advance(delta, () => this.liveFrame());
    if (replay.feed.restartPressed(this.sampler.sample().restart)) this.restartReplay(replay.feed);
    const supply: FrameSupplier = () => replay.feed.next(this.driver.state);
    const events =
      replay.speed === null ? this.driver.advance(delta, supply) : this.driver.advanceFixed(replay.speed, supply);
    if (replay.feed.isDone(this.driver.state)) this.driver.alpha = 1;
    return events;
  }

  /** The keyboard frame for one step, plus the restart press queued by R while paused. */
  private liveFrame(): InputFrame {
    const frame = this.sampler.sample();
    if (!this.pendingRestart) return frame;
    this.pendingRestart = false;
    return { ...frame, restart: true };
  }

  /** R while replaying: a fresh sim and the first frame again. */
  private restartReplay(feed: ReplayFeed): void {
    feed.rewind();
    this.driver = new RunDriver(this.driver.level, this.driver.params);
  }

  /** Each win the driver saw (usually one): record it once and tell the results seam. */
  private handleWins(): void {
    for (const result of this.driver.takeWins()) {
      const event = recordWin(this.store, this.driver.level, result, this.replayRequested);
      this.lastWin = event;
      this.nextId = event.replay ? null : nextLevelId(loadLevelSet(LEVEL_FILES).levels, event.levelId);
      this.events.emit(LEVEL_COMPLETE_EVENT, event);
    }
  }

  /** Stand-in for the results NEXT item (ui-engineer, M2-12): Enter on the win banner. */
  private goToNextLevel(): void {
    if (this.lastWin === null || this.nextId === null) return;
    this.scene.restart({ levelId: this.nextId } satisfies GameSceneData);
  }

  /** The audio context may only start on a user gesture (itch.io iframe autoplay rules). */
  private installAudioUnlock(): void {
    if (audioUnlockInstalled) return;
    audioUnlockInstalled = true;
    audio.installGestureUnlock();
  }

  /** First level start of the page session, live play only (sticky-keys-tip.md). */
  private mountStickyKeysTip(): void {
    const isFirstLevelStart = pageLevelStarts.consumeFirstStart();
    if (this.replayRequested) return;
    this.tip = showStickyKeysTipIfDue({ scene: this, store: this.store, isFirstLevelStart });
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
    const readMeter = (): GearMeterModel => this.meter;
    const readBanner = (): string | null => this.hud.bannerText;
    const readPaused = (): boolean => this.pause.paused;
    const hook: DebugHook = {
      levelId,
      get state() {
        return read();
      },
      get replay() {
        if (replay === null) return { active: false, done: false, frames: 0 };
        return { active: true, done: replay.feed.isDone(read()), frames: replay.feed.frames.length };
      },
      get meter() {
        return readMeter();
      },
      get banner() {
        return readBanner();
      },
      get paused() {
        return readPaused();
      },
    };
    if (QA_HOOK) Object.defineProperty(window, '__redshift', { value: hook, configurable: true });
  }

  private teardown(): void {
    this.detachKeyboard();
    this.sampler.clear();
    this.tip?.hide();
    this.tip = null;
    this.levelView.destroy();
    this.playerView.destroy();
    this.fx.destroy();
    this.gearMeter.destroy();
    if (QA_HOOK) Reflect.deleteProperty(window, '__redshift');
  }
}
