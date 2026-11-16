import Phaser from 'phaser';
import { BAND_COLORS, type InputFrame, type SimEvent, type SimState } from '../core/types';
import { audio } from '../audio';
import { cameraScroll, snapFeet, type CameraBody } from '../entities/camera';
import { DEV_TANDEM_ID, devTandemLevel } from '../entities/devLevel';
import { EdgeArrowView } from '../entities/EdgeArrowView';
import { TipLife } from '../entities/TipLife';
import { edgeArrowPlacement, TANDEM_STRIPS, tandemCamera } from '../entities/tandemView';
import { debugText } from '../entities/debugText';
import { FeedbackFx } from '../entities/FeedbackFx';
import { GameHud, GEAR_METER_AREA } from '../entities/GameHud';
import { InputSampler } from '../entities/inputSampler';
import { embeddedMask } from '../entities/embedded';
import { focusPromptVisible } from '../entities/focusPrompt';
import { easeToward, renderBodyPosition } from '../entities/interpolation';
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
import { REPLAY_AVAILABLE, SOLUTION_FILES } from '../entities/solutionFiles';
import { loadLevelSet, nextLevelId, requestedLevelId, selectLevel } from '../entities/levelSelect';
import { LEVEL_COMPLETE_EVENT, recordWin, type LevelCompleteEvent } from '../entities/winFlow';
import { backgroundForSpeed, hexToNumber, rgbToHex } from '../fx';
import type { SaveStore } from '../save';
import { COMPACT_STRIP_LAYOUT, gearMeterModel, INITIAL_GEAR_METER_MODEL, type GearMeterModel } from '../ui';
import { GearMeterView } from '../ui/GearMeterView';
import { showStickyKeysTipIfDue } from '../ui/StickyKeysTipView';
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
  /** The twin's view, created on first sight of `state.twin` (one instance per body). */
  private twinView: PlayerView | null = null;
  private reduced = false;
  /** Last whole-pixel camera focus; kept when every body is home. */
  private lastFocus: { readonly x: number; readonly y: number } | null = null;
  private fx!: FeedbackFx;
  private hud!: GameHud;
  private gearMeter!: GearMeterView;
  /** Tandem only: the twin's compact strip (the runner's `gearMeter` is compact too then). */
  private twinMeter: GearMeterView | null = null;
  private edgeArrow!: EdgeArrowView;
  /** B1: the Sticky Keys tip across pauses. */
  private tip: TipLife | null = null;
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
  /** The level set, loaded once per `create()` (B2) instead of on every win. */
  private levelSet: ReturnType<typeof loadLevelSet> | null = null;
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
    this.levelSet = null;
    this.meter = INITIAL_GEAR_METER_MODEL;
    const search = this.requestedLevelId === null ? window.location.search : `?level=${encodeURIComponent(this.requestedLevelId)}`;
    this.replayRequested = REPLAY_AVAILABLE && parseReplayRequest(search).active;
    const selection =
      import.meta.env.DEV && requestedLevelId(search) === DEV_TANDEM_ID
        ? { level: devTandemLevel(), messages: [] as readonly string[] }
        : selectLevel(LEVEL_FILES, search);
    const { tuning, params } = this.cfg;
    this.driver = new RunDriver(selection.level, params);
    this.sampler = new InputSampler();
    const osReduced = prefersReducedMotion(typeof window.matchMedia === 'function' ? (q) => window.matchMedia(q) : undefined);
    this.reduced = reducedMotion(this.store.getSettings(), osReduced);
    this.lastFocus = null;
    this.twinView = null;
    this.levelView = new LevelView(this, selection.level, tuning.tileSize, this.reduced);
    this.playerView = new PlayerView(this, 'runner', this.reduced);
    this.fx = new FeedbackFx(this);
    const { id, title } = selection.level.meta;
    const source = chooseFrameSource(search, selection.level, SOLUTION_FILES, REPLAY_AVAILABLE);
    this.replay = source.kind === 'replay' ? { feed: source.feed, speed: source.speed } : null;
    this.hud = new GameHud(this, hudTitle(id, title, source), [...selection.messages, ...sourceMessages(source)]);
    this.mountGearMeters(selection.level.twinStart !== null);
    this.edgeArrow = new EdgeArrowView(this);
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
    const { state } = this.driver;
    if (state.status !== 'won') this.lastWin = null;
    const ts = this.cfg.tuning.tileSize;
    const bodyHeightPx = Math.round(this.cfg.tuning.playerHeightTiles * ts);
    const dead = state.status === 'dead' || state.status === 'restarting';
    // Snap each body's feet to whole pixels once (renderer only, never written back); the camera derives from these.
    const runner = this.snapBody(0, ts) ?? snapFeet(state.player.x, state.player.y, ts);
    const twin = this.snapBody(1, ts);
    this.reactToEvents(events, runner.px, runner.py - bodyHeightPx / 2, twin === null ? null : { x: twin.px, y: twin.py - bodyHeightPx / 2 });
    const embedded = embeddedMask(
      this.driver.level,
      state.player.x,
      state.player.y,
      this.cfg.tuning.playerWidthTiles,
      this.cfg.tuning.playerHeightTiles,
    );
    const twinTint =
      state.twin === null
        ? null
        : {
            band: state.twin.band,
            graceBand: state.twin.graceBand,
            embedded: embeddedMask(this.driver.level, state.twin.x, state.twin.y, this.cfg.tuning.playerWidthTiles, this.cfg.tuning.playerHeightTiles),
          };
    this.levelView.update(state.player.band, state.player.graceBand, embedded, time, twinTint);
    this.playerView.draw(runner.px, runner.py, state.player, dead);
    if (state.twin !== null && twin !== null) {
      this.twinView ??= new PlayerView(this, 'twin', this.reduced);
      this.twinView.draw(twin.px, twin.py, state.twin, dead);
    }
    const bodies: CameraBody[] = [{ ...runner, home: state.player.home }];
    if (twin !== null && state.twin !== null) bodies.push({ ...twin, home: state.twin.home });
    const edgeBody = this.followCamera(bodies, bodyHeightPx);
    this.updateEdgeArrow(edgeBody, twin, state.twin, bodyHeightPx);
    this.applyTint(Math.abs(state.player.vx), delta);
    if (!paused) this.fx.update(delta);
    this.meter = gearMeterModel(state.player, this.cfg.params);
    this.gearMeter.update(this.meter);
    if (this.twinMeter !== null && state.twin !== null) {
      this.twinMeter.setParked(state.twin.home);
      this.twinMeter.update(gearMeterModel(state.twin, this.cfg.params), { body: 1 });
    }
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
      this.tip?.pause();
    } else if (change === 'resumed') {
      this.sampler.setPaused(false);
      this.tip?.resume();
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
      this.nextId = event.replay ? null : nextLevelId((this.levelSet ??= loadLevelSet(LEVEL_FILES)).levels, event.levelId);
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

  private reactToEvents(events: readonly SimEvent[], centerX: number, centerY: number, twinCentre: { readonly x: number; readonly y: number } | null): void {
    for (const e of events) {
      if (e.type === 'airDrag') {
        if (e.body === 0) this.fx.airDrag(centerX, centerY);
        else if (twinCentre !== null) this.fx.airDrag(twinCentre.x, twinCentre.y);
      }
      else if (e.type === 'died') this.fx.died();
      else if (e.type === 'land') this.viewFor(e.body)?.pulse('land');
      else if (e.type === 'jump') this.viewFor(e.body)?.pulse('jump');
      else if (e.type === 'bandChange') this.viewFor(e.body)?.pulse('shift');
    }
  }

  /** Scroll from the snapped integer bodies (see `cameraFocus`); keeps the last scroll when every body is home. */
  private followCamera(bodies: readonly CameraBody[], bodyHeightPx: number): number | null {
    const { level } = this.driver;
    const ts = this.cfg.tuning.tileSize;
    const cam = this.cameras.main;
    const framed = tandemCamera(bodies, bodyHeightPx, ts);
    const focus = framed ?? this.lastFocus;
    if (focus === null) return null;
    this.lastFocus = { x: focus.x, y: focus.y };
    const s = cameraScroll(focus.x, focus.y, cam.width, cam.height, level.width * ts, level.height * ts);
    cam.setScroll(s.x, s.y);
    return framed?.edgeBody ?? null;
  }

  /** Tandem: an arrow at the screen edge for the body the camera left behind (beyond 28 tiles), band by pattern. */
  private updateEdgeArrow(
    edgeBody: number | null,
    twin: { readonly px: number; readonly py: number } | null,
    twinState: SimState['twin'],
    bodyHeightPx: number,
  ): void {
    const cam = this.cameras.main;
    const target = edgeBody === 1 && twin !== null && twinState !== null ? twin : null;
    const arrow = target === null ? null : edgeArrowPlacement(target, bodyHeightPx, { x: cam.scrollX, y: cam.scrollY }, { w: cam.width, h: cam.height });
    this.edgeArrow.update(arrow, 'twin', BAND_COLORS[twinState?.band ?? 0]);
  }

  /** One full meter, or in a Tandem level two compact strips (runner on top, twin below). */
  private mountGearMeters(tandem: boolean): void {
    if (!tandem) {
      this.gearMeter = new GearMeterView(this, GEAR_METER_AREA.x, GEAR_METER_AREA.y);
      this.twinMeter = null;
    } else {
      const { runner, twin } = TANDEM_STRIPS;
      this.gearMeter = new GearMeterView(this, runner.x, runner.y, { layout: COMPACT_STRIP_LAYOUT, body: 'runner' });
      this.twinMeter = new GearMeterView(this, twin.x, twin.y, { layout: COMPACT_STRIP_LAYOUT, body: 'twin' });
      this.twinMeter.setReducedMotion(this.reduced);
    }
    this.gearMeter.setReducedMotion(this.reduced);
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
    this.tip?.destroy();
    this.tip = null;
    this.levelView.destroy();
    this.playerView.destroy();
    this.twinView?.destroy();
    this.twinView = null;
    this.fx.destroy();
    this.gearMeter.destroy();
    this.twinMeter?.destroy();
    this.twinMeter = null;
    this.edgeArrow.destroy();
    if (QA_HOOK) Reflect.deleteProperty(window, '__redshift');
  }
}
