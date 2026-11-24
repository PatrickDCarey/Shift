import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Level, Mover, SimState, Tuning } from '../core/types';
import { installDebugHook, removeDebugHook, type DebugSnapshot } from './debugHook';
import { FocusPan } from './focusPan';
import { KineticsView } from './KineticsView';
import { planKinetics, type PlanOptions } from './kineticsPlan';
import { newlyLit, postFrame, PostView } from './PostView';
import { gridLevel } from './testkit';

class FakeImage {
  visible = true;
  destroyed = false;
  constructor(public frame: string) {}
  setOrigin = () => this;
  setDepth = () => this;
  setTint = () => this;
  setAlpha = () => this;
  setScale = () => this;
  setBlendMode = () => this;
  setVisible = (v: boolean) => ((this.visible = v), this);
  setFrame = (f: string) => ((this.frame = f), this);
  setPosition = () => this;
  destroy = () => void (this.destroyed = true);
}

function fakeScene() {
  const images: FakeImage[] = [];
  const add = { image: (_x: number, _y: number, _k: string, f: string) => (images.push(new FakeImage(f)), images[images.length - 1]) };
  return { scene: { add, cameras: { main: { worldView: { x: 0, y: 0, width: 480, height: 270 } } } } as never, images };
}

const POSTS = [{ cell: { col: 30, row: 4 }, clock: 0 }, { cell: { col: 80, row: 4 }, clock: 48 }];
const level = (extra: Partial<Level>): Level => ({ ...gridLevel(['.@..E', '#####']), ...extra });
const st = (step: number, checkpoint?: { index: number; kinBase: number }, status: 'playing' | 'dead' = 'playing'): SimState =>
  ({ step, status, player: { x: 1, y: 9, band: 0, graceBand: null }, twin: null, ...(checkpoint ? { checkpoint } : {}) }) as unknown as SimState;
const TUNING = { tileSize: 16, playerWidthTiles: 0.75, playerHeightTiles: 1.5, emitterTellMs: 300, projectileSizeTiles: 0.5 } as unknown as Tuning;

describe('postFrame', () => {
  it('is idle unlit, rises over three frames once lit, then holds lit', () => {
    expect(postFrame(false, null, false)).toBe('checkpoint/idle');
    expect([0, 60, 120].map((t) => postFrame(true, t, false))).toEqual(['checkpoint/rise/0', 'checkpoint/rise/1', 'checkpoint/rise/2']);
    expect(postFrame(true, 180, false)).toBe('checkpoint/lit');
  });
  it('skips the rise under reduced motion', () => {
    expect(postFrame(true, 0, true)).toBe('checkpoint/lit');
  });
});

describe('newlyLit', () => {
  it('reports a change of the lit index forward only', () => {
    expect(newlyLit(null, st(5))).toBeNull();
    expect(newlyLit(null, st(5, { index: 0, kinBase: 0 }))).toBe(0);
    expect(newlyLit(0, st(9, { index: 0, kinBase: 3 }))).toBeNull(); // a post respawn keeps the index
    expect(newlyLit(0, st(9, { index: 1, kinBase: 0 }))).toBe(1);
    expect(newlyLit(1, st(0))).toBeNull(); // full restart
  });
});

describe('PostView', () => {
  it('creates nothing without posts', () => {
    const { scene, images } = fakeScene();
    expect(PostView.forLevel(scene, level({}), 16, () => undefined)).toBeNull();
    expect(KineticsView.forLevel(scene, level({}), TUNING, 60)).toBeNull();
    expect(images).toHaveLength(0);
  });

  it('lights a post when the index changes, cues once, and unlights on a full restart', () => {
    const { scene, images } = fakeScene();
    const onLit = vi.fn();
    const view = PostView.forLevel(scene, level({ checkpoints: POSTS }), 16, onLit)!;
    const frames = () => images.map((i) => i.frame);
    view.update(st(1), 0, false);
    expect(frames()).toEqual(['checkpoint/idle', 'checkpoint/idle']);
    view.update(st(2, { index: 0, kinBase: 0 }), 1000, false);
    expect(frames()).toEqual(['checkpoint/rise/0', 'checkpoint/idle']);
    view.update(st(3, { index: 0, kinBase: 0 }), 1070, false);
    expect(frames()[0]).toBe('checkpoint/rise/1');
    view.update(st(4, { index: 0, kinBase: 0 }), 1400, false);
    expect(frames()[0]).toBe('checkpoint/lit');
    view.update(st(30, { index: 0, kinBase: 20 }), 1500, false); // post respawn: still lit, no new cue
    expect(onLit).toHaveBeenCalledTimes(1);
    view.update(st(0), 1600, false);
    expect(frames()).toEqual(['checkpoint/idle', 'checkpoint/idle']);
    view.destroy();
    expect(images.every((i) => i.destroyed)).toBe(true);
  });

  it('shows the lit frame at once under reduced motion', () => {
    const { scene, images } = fakeScene();
    const view = PostView.forLevel(scene, level({ checkpoints: POSTS }), 16, () => undefined)!;
    view.update(st(2, { index: 0, kinBase: 0 }), 1000, true);
    expect(images[0]?.frame).toBe('checkpoint/lit');
  });
});

describe('kinetics after a post respawn', () => {
  const lift: Mover = {
    origin: { col: 5, row: 4 }, width: 3, height: 1, solid: { kind: 'safe' },
    path: [{ kind: 'wait', steps: 60 }, { kind: 'move', dir: 'u', tiles: 6 }, { kind: 'wait', steps: 60 }, { kind: 'move', dir: 'd', tiles: 6 }],
    speed: 2, phase: 0,
  };
  const OPTS: PlanOptions = { tileSize: 16, tellSteps: 18, bodyWidthTiles: 0.75, bodyHeightTiles: 1.5, shotSizeTiles: 0.5 };
  const lv = level({ movers: [lift], checkpoints: POSTS });

  it('draws slabs at the kinetic clock, not the run step', () => {
    // run step 500, kinBase 440 + 48 - ... : k = 500 - 440 = 60 -> the rise has not begun
    const s = st(500, { index: 0, kinBase: 440 });
    expect(planKinetics(lv, s, s, 0, OPTS).slabs[0]?.y).toBe(4 * 16);
    const later = st(510, { index: 0, kinBase: 440 }); // k = 70: 10 steps into the rise
    expect(planKinetics(lv, later, later, 0, OPTS).slabs[0]?.y).toBe((4 - 10 / 16) * 16);
  });

  it('snaps on the respawn step instead of blending back', () => {
    const dead = st(499, { index: 0, kinBase: 400 }, 'dead');
    const respawn = st(500, { index: 0, kinBase: 452 });
    const y = planKinetics(lv, dead, respawn, 0.5, OPTS).slabs[0]?.y;
    expect(y).toBe(4 * 16 - 0); // k = 48 -> still waiting at the origin
  });
});

describe('camera on a post respawn', () => {
  it('does not pan: a single runner keeps one active body, so the focus is the target at once', () => {
    const pan = new FocusPan();
    pan.apply({ x: 900, y: 50 }, 1, 16, false);
    expect(pan.apply({ x: 480, y: 50 }, 1, 16, false)).toEqual({ x: 480, y: 50 }); // far jump back to the post
  });
});

describe('QA hook', () => {
  afterEach(() => {
    removeDebugHook();
    vi.unstubAllGlobals();
  });

  it('exposes the lit post and the kinetic clock', () => {
    const win: Record<string, unknown> = {};
    vi.stubGlobal('window', win);
    let state = st(10);
    const read = (): DebugSnapshot => ({ state, kinetics: null }) as unknown as DebugSnapshot;
    installDebugHook({ levelId: 'x', read });
    const hook = (win as { __redshift?: { checkpoint: number | null; kineticStep: number } }).__redshift;
    expect(hook?.checkpoint).toBeNull();
    expect(hook?.kineticStep).toBe(10);
    state = st(500, { index: 1, kinBase: 440 });
    expect(hook?.checkpoint).toBe(1);
    expect(hook?.kineticStep).toBe(60);
  });
});
