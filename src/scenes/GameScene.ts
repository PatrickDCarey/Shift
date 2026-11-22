import Phaser from 'phaser';
import type { SimEvent } from '../core/types';
import { effectModes } from '../fx';
import { audio, bodiesOf, music, musicFeed, playStepEvents } from '../audio';
import { snapFeet, type CameraBody } from '../entities/camera';
import { CameraRig } from '../entities/cameraRig';
import { installDebugHook, removeDebugHook, type DebugSnapshot } from '../entities/debugHook';
import { DEV_TANDEM_ID, devTandemLevel } from '../entities/devLevel';
import { TipLife } from '../entities/TipLife';
import { GearMeters } from '../entities/GearMeters';
import { debugText } from '../entities/debugText';
import { BackdropView } from '../entities/BackdropView';
import { FallCue } from '../entities/FallCue';
import { FeedbackFx } from '../entities/FeedbackFx';
import { GameHud } from '../entities/GameHud';
import { hintPlans } from '../entities/hintLayout';
import { HintView } from '../entities/HintView';
import { InputSampler } from '../entities/inputSampler';
import { embeddedMask } from '../entities/embedded';
import { focusPromptVisible } from '../entities/focusPrompt';
import { renderBodyPosition } from '../entities/interpolation';
import { attachKeyboard } from '../entities/keyboardInput';
import { pageLevelStarts } from '../entities/levelStart';
import { LEVEL_FILES } from '../entities/levelFiles';
import { LevelView } from '../entities/LevelView';
import { planLevel } from '../entities/levelTiles';
import { applyEffectPrefs, readEffectPrefs, type EffectPrefs, type PrefTargets } from '../entities/effectPrefs';
import { prefersReducedMotion } from '../entities/motionPrefs';
import { loadGameParams, type GameParams } from '../entities/params';
import { OverlayGate } from '../entities/overlayGate';
import { PauseState, pauseWanted, type PauseChange } from '../entities/pauseState';
import { PlayerView } from '../entities/PlayerView';
import { QA_HOOK } from '../entities/qaHook';
import { RestartCardController } from '../entities/RestartCardController';
import { chooseFrameSource, parseReplayRequest, type FrameSource } from '../entities/replay';
import { RunControl } from '../entities/runControl';
import type { RunDriver } from '../entities/runDriver';
import { REPLAY_AVAILABLE, SOLUTION_FILES } from '../entities/solutionFiles';
import { loadLevelSet, nextLevelId, requestedLevelId, selectLevel } from '../entities/levelSelect';
import { LEVEL_COMPLETE_EVENT, recordWin, type LevelCompleteEvent } from '../entities/winFlow';
import type { SaveStore } from '../save';
import {
  applyAudioSettings,
  INITIAL_GEAR_METER_MODEL,
  pauseLaunchData,
  PAUSE_RESULT_EVENT,
  resultsLaunchData,
  type GearMeterModel,
  type PauseResult,
} from '../ui';
import { showStickyKeysTipIfDue } from '../ui/StickyKeysTipView';
import { getSaveStore, SCENE_KEYS } from './keys';

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

/** One audio unlock listener for the whole page, however often the scene restarts. */
let audioUnlockInstalled = false;

/**
 * Drives the deterministic sim at a fixed step and draws it, interpolated.
 * Decides no game rules: it samples input, calls `step`, and renders state.
 * Progression, pause, results and camera logic are helpers in `src/entities`;
 * Pause and Results are overlay scenes launched on top (the game scene keeps
 * running its own pause state, key masking and clock underneath them).
 */
export class GameScene extends Phaser.Scene {
  private cfg!: GameParams;
  private run!: RunControl;
  private sampler = new InputSampler();
  private store!: SaveStore;
  private levelView!: LevelView;
  private playerView!: PlayerView;
  /** The twin's view, created on first sight of `state.twin` (one instance per body). */
  private twinView: PlayerView | null = null;
  private hintView: HintView | null = null;
  private restartCard!: RestartCardController;
  private rig!: CameraRig;
  private reduced = false;
  private prefs: EffectPrefs = { reducedMotion: false, reducedEffects: false };
  private fx!: FeedbackFx;
  private backdrop!: BackdropView;
  private fall!: FallCue;
  private hud!: GameHud;
  private meters!: GearMeters;
  /** B1: the Sticky Keys tip across pauses. */
  private tip: TipLife | null = null;
  private detachKeyboard: () => void = () => undefined;
  private debugOn = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
  private showDebug = false;
  private requestedLevelId: string | null = null;
  private pause = new PauseState();
  /** Pause or Results is open over this scene: Esc, P, R, Enter and Space belong to it (M1). */
  private gate = new OverlayGate();
  /** `?replay=1` was asked for (even if the solution failed to load): nothing is saved, no results panel. */
  private replayRequested = false;
  /** The level set, loaded once per `create()` (B2) instead of on every win. */
  private levelSet: ReturnType<typeof loadLevelSet> | null = null;
  private meter: GearMeterModel = INITIAL_GEAR_METER_MODEL;
  private readonly onPauseResult = (result: PauseResult): void => this.handlePauseResult(result);

  constructor() {
    super(SCENE_KEYS.game);
  }

  private get driver(): RunDriver {
    return this.run.driver;
  }

  init(data?: GameSceneData): void {
    this.requestedLevelId = data?.levelId ?? null;
  }

  create(): void {
    this.cfg = loadGameParams();
    this.store = getSaveStore(this.registry);
    applyAudioSettings(this.store.getSettings()); // saved mute and volumes, read afresh on every level start
    this.pause = new PauseState();
    this.gate = new OverlayGate();
    this.levelSet = null;
    this.meter = INITIAL_GEAR_METER_MODEL;
    const search = this.requestedLevelId === null ? window.location.search : `?level=${encodeURIComponent(this.requestedLevelId)}`;
    this.replayRequested = REPLAY_AVAILABLE && parseReplayRequest(search).active;
    const selection =
      import.meta.env.DEV && requestedLevelId(search) === DEV_TANDEM_ID
        ? { level: devTandemLevel(), messages: [] as readonly string[] }
        : selectLevel(LEVEL_FILES, search);
    const { level } = selection;
    const { tuning, params } = this.cfg;
    const source = chooseFrameSource(search, level, SOLUTION_FILES, REPLAY_AVAILABLE);
    this.sampler = new InputSampler();
    this.run = new RunControl(level, params, this.sampler, source.kind === 'replay' ? { feed: source.feed, speed: source.speed } : null);
    const osReduced = prefersReducedMotion(typeof window.matchMedia === 'function' ? (q) => window.matchMedia(q) : undefined);
    this.prefs = readEffectPrefs(this.store.getSettings(), osReduced);
    this.reduced = this.prefs.reducedMotion;
    this.twinView = null;
    this.levelView = new LevelView(this, level, tuning.tileSize, this.reduced);
    this.hintView = new HintView(this, hintPlans(level.meta.hints, tuning.tileSize));
    this.restartCard = new RestartCardController(this, level, { ...tuning, stepHz: params.stepHz });
    this.playerView = new PlayerView(this, 'runner', tuning, this.reduced);
    const modes = effectModes(this.prefs, level.twinStart !== null);
    this.backdrop = new BackdropView(this, modes, Math.max(...tuning.gearSpeeds));
    this.fall = new FallCue(this, tuning.tileSize, this.reduced);
    this.fx = new FeedbackFx(this, modes);
    const { id, title } = level.meta;
    this.hud = new GameHud(this, hudTitle(id, title, source), [...selection.messages, ...sourceMessages(source)]);
    this.meters = new GearMeters(this, level.twinStart !== null, this.reduced);
    this.rig = new CameraRig(this, tuning, planLevel(level).exits);
    this.rig.setReducedMotion(this.reduced);
    this.attachInput();
    this.installAudioUnlock();
    this.mountStickyKeysTip();
    if (QA_HOOK) installDebugHook({ levelId: id, read: () => this.debugSnapshot() });
    this.events.on(PAUSE_RESULT_EVENT, this.onPauseResult);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  override update(time: number, delta: number): void {
    this.takePauseRequest();
    const paused = this.pause.paused;
    const events = paused ? [] : this.run.advance(delta);
    if (events.some((e) => e.type === 'restart')) this.refreshPrefs();
    this.handleWins();
    this.drawBodies(time, delta, paused, events);
    this.drawHud();
    music.update(musicFeed(this.driver.state, events, paused));
    playStepEvents(events, { bands: bodiesOf(this.driver.state).map((b) => b.band) }); // [] while paused: silent
  }

  /** Esc/P (from the keydown queue, so two presses in one slow frame are not lost) opens the pause overlay. */
  private takePauseRequest(): void {
    const presses = this.sampler.takePresses();
    if (pauseWanted(presses, this.pause.paused, this.canPause())) this.applyPauseChange(this.pause.toggle(true));
  }

  /** Pausing is off after the win step: the results screen owns the screen. */
  private canPause(): boolean {
    return this.driver.state.status !== 'won';
  }

  private applyPauseChange(change: PauseChange): void {
    if (change === 'paused') {
      this.sampler.setPaused(true);
      this.gate.opened();
      this.tip?.pause();
      const { id, title } = this.driver.level.meta;
      this.scene.launch(SCENE_KEYS.pause, pauseLaunchData(id, title, this.driver.state.step, this.cfg.params.stepHz));
    } else if (change === 'resumed') {
      this.sampler.setPaused(false);
      this.gate.closed(performance.now());
      this.refreshPrefs(); // before the tip rebuilds, so it takes the new reduced-motion flag
      this.tip?.resume();
      this.driver.resetClock(); // no catch-up after a long pause
    }
  }

  /** Settings changed from pause apply on resume and on R, without a level reload (settings.md W7). */
  private refreshPrefs(): void {
    const os = prefersReducedMotion(typeof window.matchMedia === 'function' ? (q) => window.matchMedia(q) : undefined);
    this.prefs = applyEffectPrefs(this.prefs, readEffectPrefs(this.store.getSettings(), os), this.driver.level.twinStart !== null, this.prefTargets());
    this.reduced = this.prefs.reducedMotion;
  }

  private prefTargets(): PrefTargets {
    const motion = [this.levelView, this.playerView, this.twinView, this.fall, this.tip, this.meters, this.rig];
    return {
      setReducedMotion: (r) => motion.forEach((t) => t?.setReducedMotion(r)),
      setModes: (m) => [this.backdrop, this.fx].forEach((t) => t.setModes(m)),
    };
  }

  /** The Pause overlay closed into the game: RESUME, or RESTART (as R in play does). */
  private handlePauseResult(result: PauseResult): void {
    if (!this.pause.paused) return;
    this.applyPauseChange(this.pause.resume() ? 'resumed' : null);
    if (result.action === 'restart') this.run.restart();
  }

  /** Each win the driver saw (usually one): record it once, then hand the screen to Results. */
  private handleWins(): void {
    for (const result of this.driver.takeWins()) {
      const event = recordWin(this.store, this.driver.level, result, this.replayRequested);
      this.events.emit(LEVEL_COMPLETE_EVENT, event);
      this.tip?.hideOnWin();
      this.tip = null;
      if (!event.replay) this.launchResults(event);
    }
  }

  private launchResults(event: LevelCompleteEvent): void {
    const next = nextLevelId((this.levelSet ??= loadLevelSet(LEVEL_FILES)).levels, event.levelId);
    this.gate.opened();
    this.sampler.setPaused(true); // Results owns R, Enter, Esc and P from here
    this.scene.launch(SCENE_KEYS.results, resultsLaunchData(event, this.cfg.params.stepHz, next));
  }

  private attachInput(): void {
    this.detachKeyboard = attachKeyboard(this.sampler, {
      gate: this.gate,
      onToggleDebug: () => {
        if (this.debugOn) this.showDebug = !this.showDebug;
      },
      onFocusLost: () => this.applyPauseChange(this.pause.pauseOnFocusLoss(this.canPause()) ? 'paused' : null),
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => window.focus());
  }

  /** The audio context may only start on a user gesture (itch.io iframe autoplay rules). */
  private installAudioUnlock(): void {
    if (audioUnlockInstalled) return;
    audioUnlockInstalled = true;
    audio.installGestureUnlock();
  }

  /** First level start of the page session, live play only (sticky-keys-tip.md). */
  private mountStickyKeysTip(): void {
    if (this.replayRequested) return; // a replay load must not use up the page's first start (B3)
    const isFirstLevelStart = pageLevelStarts.consumeFirstStart();
    const shown = showStickyKeysTipIfDue({ scene: this, store: this.store, isFirstLevelStart });
    this.tip = shown === null ? null : new TipLife(this, shown, this.reduced);
  }

  /** Whole-pixel feet of one body at the interpolated position, or null when the level has no such body. */
  private snapBody(body: 0 | 1, ts: number): { readonly px: number; readonly py: number } | null {
    const { state, prev, alpha } = this.driver;
    const pos = renderBodyPosition(prev, state, alpha, body);
    return pos === null ? null : snapFeet(pos.x, pos.y, ts);
  }

  private viewFor(body: number): PlayerView | null {
    return body === 0 ? this.playerView : this.twinView;
  }

  /** Level, bodies, camera, tint and effects for this frame. */
  private drawBodies(time: number, delta: number, paused: boolean, events: readonly SimEvent[]): void {
    const { state, level } = this.driver;
    const { tuning } = this.cfg;
    const ts = tuning.tileSize;
    const bodyHeightPx = Math.round(tuning.playerHeightTiles * ts);
    const dead = state.status === 'dead' || state.status === 'restarting';
    // Snap each body's feet to whole pixels once (renderer only, never written back); the camera derives from these.
    const runner = this.snapBody(0, ts) ?? snapFeet(state.player.x, state.player.y, ts);
    const twin = this.snapBody(1, ts);
    this.fall.update(events, state.status, time);
    this.reactToEvents(events, runner.px, runner.py - bodyHeightPx / 2, twin === null ? null : { x: twin.px, y: twin.py - bodyHeightPx / 2 });
    const embedded = (p: { x: number; y: number }): ReturnType<typeof embeddedMask> =>
      embeddedMask(level, p.x, p.y, tuning.playerWidthTiles, tuning.playerHeightTiles);
    const twinTint =
      state.twin === null ? null : { band: state.twin.band, graceBand: state.twin.graceBand, embedded: embedded(state.twin) };
    this.levelView.update(state.player.band, state.player.graceBand, embedded(state.player), time, twinTint);
    this.playerView.draw(runner.px, runner.py, state.player, dead);
    if (state.twin !== null && twin !== null) {
      this.twinView ??= new PlayerView(this, 'twin', tuning, this.reduced);
      this.twinView.draw(twin.px, twin.py, state.twin, dead);
    }
    const bodies: CameraBody[] = [{ ...runner, home: state.player.home }];
    if (twin !== null && state.twin !== null) bodies.push({ ...twin, home: state.twin.home });
    this.rig.follow(level, bodies, twin, state.twin, bodyHeightPx, delta);
    this.rig.applyTint(Math.abs(state.player.vx), delta);
    const cam = this.cameras.main;
    this.restartCard.update(state, events, { x: cam.scrollX, y: cam.scrollY }, this.tip?.isShowing() ?? false);
    this.backdrop.update(this.rig.tintedSpeed, this.cameras.main.scrollX);
    if (!paused) this.fx.update(delta);
  }

  /** Gear meters and the text overlay. The win banner and pause menu are overlay scenes now. */
  private drawHud(): void {
    const { state } = this.driver;
    this.meter = this.meters.update(state, this.cfg.params, this.fall);
    this.hud.setFocusPrompt(focusPromptVisible(document.hasFocus()));
    this.hud.setDebug(this.debugOn && this.showDebug ? debugText(state, this.game.loop.actualFps) : null);
  }

  private reactToEvents(events: readonly SimEvent[], centerX: number, centerY: number, twinCentre: { readonly x: number; readonly y: number } | null): void {
    for (const e of events) {
      if (e.type === 'airDrag') {
        if (e.body === 0) this.fx.airDrag(centerX, centerY);
        else if (twinCentre !== null) this.fx.airDrag(twinCentre.x, twinCentre.y);
      } else if (e.type === 'died') this.fx.died();
      else if (e.type === 'land') this.viewFor(e.body)?.pulse('land');
      else if (e.type === 'jump') this.viewFor(e.body)?.pulse('jump');
      else if (e.type === 'bandChange') this.viewFor(e.body)?.pulse('shift');
    }
  }

  private debugSnapshot(): DebugSnapshot {
    const { replay } = this.run;
    const state = this.driver.state;
    return {
      state,
      replay: replay === null ? { active: false, done: false, frames: 0 } : { active: true, done: replay.feed.isDone(state), frames: replay.feed.frames.length },
      meter: this.meter,
      paused: this.pause.paused,
      restartCard: this.restartCard.snapshot(),
    };
  }

  private teardown(): void {
    this.events.off(PAUSE_RESULT_EVENT, this.onPauseResult);
    this.detachKeyboard();
    this.sampler.clear();
    this.tip?.destroy();
    this.tip = null;
    this.levelView.destroy();
    this.hintView?.destroy();
    this.hintView = null;
    this.restartCard.destroy();
    this.playerView.destroy();
    this.twinView?.destroy();
    this.twinView = null;
    this.fx.destroy();
    this.fall.destroy();
    this.backdrop.destroy();
    this.meters.destroy();
    this.rig.destroy();
    if (QA_HOOK) removeDebugHook();
  }
}
