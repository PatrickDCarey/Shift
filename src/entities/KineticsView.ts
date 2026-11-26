/**
 * Draws the expansion's moving things from `kineticsPlan.ts`: slabs (solid or ghost for the body's
 * band, with direction chevrons), their dotted tracks, emitters with the tell glow, bolts (sprites
 * keyed by fire step, so they are reused) and the pass-through shimmer; it also owns the checkpoint
 * posts (`PostView`) and the sweep (`SweepView`). Everything is evaluated at the kinetic clock
 * (`kineticStep`). Built only for levels that have movers, emitters, posts or a sweep (`forLevel`
 * returns null otherwise: nothing created, nothing per frame).
 * Reduced effects or reduced motion replaces the glow with the static `tell` frame. Fires the shot
 * cue once per shot leaving an on-screen emitter. Render only; never writes sim state.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { kineticStep, nextShotIn } from '../core';
import type { Emitter, Level, SimState, Tuning } from '../core/types';
import { hexToNumber, palette, PIXEL_KEYS, SHIMMER_FRAMES } from '../fx';
import { playPost, playShot } from '../audio';
import type { EffectPrefs } from './effectPrefs';
import { PostView } from './PostView';
import { SweepView } from './SweepView';
import {
  kineticsSnapshot,
  planKinetics,
  boltKind,
  trackCells,
  type KineticsPlan,
  type KineticsSnapshot,
  type PlanOptions,
  type ShimmerPlan,
} from './kineticsPlan';

const DEPTH_TRACK = 0.5;
const DEPTH_SLAB = 2;
const DEPTH_EMITTER = 2;
const DEPTH_GLOW = 3;
const DEPTH_BOLT = 8; // below the bodies (9, 10)
const DEPTH_SHIMMER = 11;
const MAX_CATCH_UP = 5;

const SINK_STEP = { l: { x: -1, y: 0 }, r: { x: 1, y: 0 }, u: { x: 0, y: -1 }, d: { x: 0, y: 1 } } as const;

type Img = Phaser.GameObjects.Image;

export interface KineticsDeps {
  /** The shot cue; defaults to the audio module's rate-limited `playShot`. */
  readonly onShot?: (band: Emitter['band'], onScreen: boolean) => void;
  /** The post cue; defaults to the audio module's `playPost`. */
  readonly onPost?: () => void;
}

function tellStepsOf(tuning: Tuning, stepHz: number): number {
  return Math.round((tuning.emitterTellMs * stepHz) / 1000);
}

export class KineticsView {
  private readonly slabs: { readonly segs: Img[]; readonly left: Img; readonly right: Img }[] = [];
  private readonly emitters: { readonly body: Img; readonly glow: Img }[] = [];
  private readonly shots = new Map<string, Img>();
  private readonly free: Img[] = [];
  private readonly shimmers: Img[] = [];
  private readonly fixed: Img[] = [];
  private lastStep = -1;
  private readonly posts: PostView | null;
  private readonly sweep: SweepView | null;

  /** Null when the level has no movers and no emitters. */
  static forLevel(scene: Phaser.Scene, level: Level, tuning: Tuning, stepHz: number, deps: KineticsDeps = {}): KineticsView | null {
    if ((level.movers ?? []).length + (level.emitters ?? []).length + (level.checkpoints ?? []).length === 0 && level.sweep === undefined) return null;
    const opts: PlanOptions = {
      tileSize: tuning.tileSize,
      tellSteps: tellStepsOf(tuning, stepHz),
      bodyWidthTiles: tuning.playerWidthTiles,
      bodyHeightTiles: tuning.playerHeightTiles,
      shotSizeTiles: tuning.projectileSizeTiles,
    };
    return new KineticsView(scene, level, opts, deps.onShot ?? ((band, onScreen) => void playShot(band ?? undefined, onScreen)), deps.onPost ?? (() => void playPost()));
  }

  private constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: Level,
    private readonly opts: PlanOptions,
    private readonly onShot: (band: Emitter['band'], onScreen: boolean) => void,
    onPost: () => void,
  ) {
    this.posts = PostView.forLevel(scene, level, opts.tileSize, onPost);
    this.sweep = SweepView.forLevel(scene, level);
    this.buildStatic();
    (level.movers ?? []).forEach((m) => this.slabs.push(this.buildSlab(m.width)));
    (level.emitters ?? []).forEach((e) => this.emitters.push(this.buildEmitter(e)));
  }

  private image(x: number, y: number, frame: string, depth: number, centred = false): Img {
    const img = this.scene.add.image(x, y, PIXEL_KEYS.kinetics, frame);
    return img.setOrigin(centred ? 0.5 : 0, centred ? 0.5 : 0).setDepth(depth);
  }

  private boltTint(kind: string): number {
    const gear = kind === 'grey' ? null : palette.gears[kind as 'white'];
    return hexToNumber(gear === null ? palette.ui.text : gear.solid.outline);
  }

  /** Tracks and catcher marks never change: build once. */
  private buildStatic(): void {
    const ts = this.opts.tileSize;
    const track = hexToNumber(palette.ui.textMuted);
    for (const m of this.level.movers ?? []) {
      for (const cell of trackCells(m)) {
        for (const f of cell.frames) this.fixed.push(this.image(cell.col * ts, cell.row * ts, f, DEPTH_TRACK).setTint(track));
      }
    }
    for (const e of this.level.emitters ?? []) {
      const d = SINK_STEP[e.dir];
      const sink = this.image((e.cell.col + d.x * e.range) * ts, (e.cell.row + d.y * e.range) * ts, `bolt/sink/${e.dir}`, DEPTH_TRACK);
      this.fixed.push(sink.setTint(this.boltTint(boltKind(e.band))));
    }
  }

  private buildSlab(width: number): KineticsView['slabs'][number] {
    const text = hexToNumber(palette.ui.text);
    const segs = Array.from({ length: width }, () => this.image(0, 0, 'slab/safe/solid/S', DEPTH_SLAB));
    const chev = (): Img => this.image(0, 0, 'slab/chevron/r', DEPTH_SLAB, true).setTint(text).setVisible(false);
    return { segs, left: chev(), right: chev() };
  }

  private buildEmitter(e: Emitter): KineticsView['emitters'][number] {
    const ts = this.opts.tileSize;
    const body = this.image(e.cell.col * ts, e.cell.row * ts, `emitter/${e.dir}/grey/idle`, DEPTH_EMITTER);
    const glow = this.image((e.cell.col + 0.5) * ts, (e.cell.row + 0.5) * ts, 'bolt/shimmer/1', DEPTH_GLOW, true);
    glow.setBlendMode('ADD').setScale(1.5).setVisible(false);
    return { body, glow };
  }

  /** Once per rendered frame. `prefs` are read live, so a settings change applies at once. */
  update(driver: { readonly prev: SimState; readonly state: SimState; readonly alpha: number }, prefs: EffectPrefs, timeMs = 0): void {
    const { prev, state, alpha } = driver;
    const plan = planKinetics(this.level, prev, state, alpha, this.opts);
    const glow = !prefs.reducedEffects && !prefs.reducedMotion;
    this.drawSlabs(plan);
    this.drawEmitters(plan, glow);
    this.drawShots(plan);
    this.drawShimmers(plan.shimmers, prefs.reducedMotion, kineticStep(state));
    this.posts?.update(state, timeMs, prefs.reducedMotion);
    const view = this.scene.cameras.main.worldView;
    this.sweep?.update(prev, state, alpha, { x: view.x, y: view.y, w: view.width, h: view.height }, timeMs, prefs.reducedMotion);
    this.fireCues(state);
  }

  private drawSlabs(plan: KineticsPlan): void {
    for (const s of plan.slabs) {
      const view = this.slabs[s.id] as KineticsView['slabs'][number];
      const ts = this.opts.tileSize;
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      view.segs.forEach((img, i) => img.setFrame(s.frames[i] as string).setPosition(x + i * ts, y));
      const width = view.segs.length * ts;
      for (const [img, px, dir] of [[view.left, x - 4, s.chevron], [view.right, x + width + 4, s.chevron]] as const) {
        img.setVisible(dir !== null);
        if (dir !== null) img.setFrame(`slab/chevron/${dir}`).setPosition(px, y + ts / 2);
      }
    }
  }

  private drawEmitters(plan: KineticsPlan, glow: boolean): void {
    for (const e of plan.emitters) {
      const view = this.emitters[e.id] as KineticsView['emitters'][number];
      view.body.setFrame(e.frame);
      view.glow.setVisible(glow && e.tell).setTint(this.boltTint(e.kind)).setAlpha(0.6 * e.glow);
    }
  }

  private drawShots(plan: KineticsPlan): void {
    const live = new Set(plan.shots.map((s) => s.key));
    for (const [key, img] of this.shots) {
      if (live.has(key)) continue;
      this.shots.delete(key);
      this.free.push(img.setVisible(false));
    }
    for (const s of plan.shots) {
      let img = this.shots.get(s.key);
      const frame = `bolt/${s.kind}/${s.dir}`; // the tail trails behind the flight direction
      if (img === undefined) {
        img = this.free.pop() ?? this.image(0, 0, frame, DEPTH_BOLT, true);
        img.setFrame(frame).setVisible(true);
        this.shots.set(s.key, img);
      }
      img.setPosition(Math.round(s.x), Math.round(s.y));
    }
  }

  private drawShimmers(list: readonly ShimmerPlan[], reducedMotion: boolean, step: number): void {
    while (this.shimmers.length < list.length) this.shimmers.push(this.image(0, 0, 'bolt/shimmer/1', DEPTH_SHIMMER, true));
    const frame = reducedMotion ? 1 : Math.floor(step / 4) % SHIMMER_FRAMES;
    this.shimmers.forEach((img, i) => {
      const s = list[i];
      img.setVisible(s !== undefined);
      if (s !== undefined) img.setFrame(`bolt/shimmer/${frame}`).setTint(this.boltTint(s.kind)).setPosition(Math.round(s.x), Math.round(s.y));
    });
  }

  /** One cue per shot leaving an emitter, for every step since the last frame (live play only). */
  private fireCues(state: SimState): void {
    const k = kineticStep(state);
    const from = k > this.lastStep && k - this.lastStep <= MAX_CATCH_UP ? this.lastStep + 1 : k;
    const moved = k !== this.lastStep;
    this.lastStep = k;
    if (!moved || state.status !== 'playing') return;
    const view = this.scene.cameras.main.worldView;
    for (let t = from; t <= k; t++) {
      for (const e of this.level.emitters ?? []) {
        if (nextShotIn(e, t) !== 0) continue;
        const ts = this.opts.tileSize;
        const cx = (e.cell.col + 0.5) * ts;
        const cy = (e.cell.row + 0.5) * ts;
        const onScreen = cx >= view.x && cx <= view.x + view.width && cy >= view.y && cy <= view.y + view.height;
        this.onShot(e.band, onScreen);
      }
    }
  }

  /** Exact movers, emitters and shots at `state.step`, for `window.__redshift`. */
  snapshot(state: SimState): KineticsSnapshot {
    return kineticsSnapshot(this.level, state, this.opts.tellSteps);
  }

  destroy(): void {
    const all = [...this.fixed, ...this.shots.values(), ...this.free, ...this.shimmers];
    for (const s of this.slabs) all.push(...s.segs, s.left, s.right);
    for (const e of this.emitters) all.push(e.body, e.glow);
    all.forEach((i) => i.destroy());
    this.shots.clear();
    this.posts?.destroy();
    this.sweep?.destroy();
  }
}
