import { describe, expect, it, vi } from 'vitest';
import type { Emitter, Level, Mover, SimState, Tuning } from '../core/types';
import { KineticsView } from './KineticsView';
import { gridLevel } from './testkit';
import atlas from '../../assets/art/pixel/pixel-kinetics.json';

class FakeImage {
  x = 0;
  y = 0;
  visible = true;
  destroyed = false;
  constructor(public frame: string) {}
  setOrigin = () => this;
  setDepth = () => this;
  setTint = () => this;
  setAlpha = () => this;
  setScale = () => this;
  setBlendMode = () => this;
  setVisible = (v: boolean) => {
    this.visible = v;
    return this;
  };
  setFrame = (f: string) => {
    this.frame = f;
    return this;
  };
  setPosition = (x: number, y: number) => {
    this.x = x;
    this.y = y;
    return this;
  };
  destroy = () => {
    this.destroyed = true;
  };
}

function fakeScene() {
  const images: FakeImage[] = [];
  const add = {
    image: (_x: number, _y: number, _k: string, frame: string) => {
      const img = new FakeImage(frame);
      images.push(img);
      return img;
    },
  };
  const scene = { add, cameras: { main: { worldView: { x: 0, y: 0, width: 480, height: 270 } } } };
  return { scene: scene as never, images };
}

const TUNING = { tileSize: 16, playerWidthTiles: 0.75, playerHeightTiles: 1.5, emitterTellMs: 300, projectileSizeTiles: 0.5 } as unknown as Tuning;
const PREFS = { reducedMotion: false, reducedEffects: false };
const EMITTER: Emitter = { cell: { col: 20, row: 5 }, dir: 'l', range: 12, speed: 4, period: 60, phase: 0, band: null };
const MOVER: Mover = {
  origin: { col: 2, row: 3 },
  width: 2,
  height: 1,
  solid: { kind: 'safe' },
  path: [{ kind: 'move', dir: 'r', tiles: 4 }, { kind: 'move', dir: 'l', tiles: 4 }],
  speed: 2,
  phase: 0,
};
const st = (step: number): SimState =>
  ({ step, status: 'playing', player: { x: 1, y: 9, band: 0, graceBand: null }, twin: null }) as unknown as SimState;
const level = (extra: Partial<Level>): Level => ({ ...gridLevel(['.@..E', '#####']), ...extra });
const drive = (prev: number, now: number, alpha = 1) => ({ prev: st(prev), state: st(now), alpha });
const quiet = { onShot: () => undefined };

describe('KineticsView', () => {
  it('creates nothing for a level without movers or emitters', () => {
    const { scene, images } = fakeScene();
    expect(KineticsView.forLevel(scene, level({}), TUNING, 60)).toBeNull();
    expect(images).toHaveLength(0);
  });

  it('reuses the sprite of a shot from frame to frame, keyed by its fire step', () => {
    const { scene, images } = fakeScene();
    const slow = { ...EMITTER, period: 200 }; // one shot lives 96 steps, so never two at once
    const view = KineticsView.forLevel(scene, level({ emitters: [slow] }), TUNING, 60, quiet)!;
    view.update(drive(0, 0), PREFS);
    const bolts = () => images.filter((i) => i.frame === 'bolt/grey/l');
    expect(bolts()).toHaveLength(1);
    const first = bolts()[0]!;
    view.update(drive(0, 1), PREFS);
    view.update(drive(1, 2), PREFS);
    expect(bolts()).toHaveLength(1);
    expect(bolts()[0]).toBe(first);
    expect(first.x).toBe(Math.round((20.5 - 2 * 0.125) * 16));
    // the shot expires after 96 steps; its sprite returns to the pool and serves the next shot
    view.update(drive(95, 96), PREFS);
    expect(first.visible).toBe(false);
    view.update(drive(199, 200), PREFS);
    expect(first.visible).toBe(true);
    expect(bolts()).toHaveLength(1);
  });

  it('swaps the emitter to its static tell frame before a shot, with or without the glow', () => {
    const { scene, images } = fakeScene();
    const view = KineticsView.forLevel(scene, level({ emitters: [EMITTER] }), TUNING, 60, quiet)!;
    const body = () => images.find((i) => i.frame.startsWith('emitter/'))!;
    const glow = () => images.find((i) => i.frame === 'bolt/shimmer/1')!;
    view.update(drive(49, 50), PREFS);
    expect(body().frame).toBe('emitter/l/grey/tell');
    expect(glow().visible).toBe(true);
    view.update(drive(49, 50), { reducedMotion: false, reducedEffects: true });
    expect(body().frame).toBe('emitter/l/grey/tell');
    expect(glow().visible).toBe(false);
    view.update(drive(19, 20), PREFS);
    expect(body().frame).toBe('emitter/l/grey/idle');
  });

  it('plays one shot cue per shot leaving an on-screen emitter', () => {
    const { scene } = fakeScene();
    const onShot = vi.fn();
    const view = KineticsView.forLevel(scene, level({ emitters: [EMITTER] }), TUNING, 60, { onShot })!;
    view.update(drive(0, 0), PREFS); // step 0: the s = 0 shot leaves
    view.update(drive(0, 0), PREFS); // same step again: no second cue
    expect(onShot).toHaveBeenCalledTimes(1);
    view.update(drive(59, 60), PREFS);
    expect(onShot).toHaveBeenCalledTimes(2);
    view.update(drive(61, 63), PREFS); // a frame that ran steps 61-63: none is a fire step
    expect(onShot).toHaveBeenCalledTimes(2);
    view.update(drive(118, 120), PREFS); // catches the fire step at 120
    expect(onShot).toHaveBeenCalledTimes(3);
  });

  it('passes onScreen false for an emitter outside the camera', () => {
    const { scene } = fakeScene();
    const onShot = vi.fn();
    const far = { ...EMITTER, cell: { col: 100, row: 5 } };
    KineticsView.forLevel(scene, level({ emitters: [far] }), TUNING, 60, { onShot })!.update(drive(0, 0), PREFS);
    expect(onShot).toHaveBeenCalledWith(null, false);
  });

  it('places slab segments at interpolated whole pixels and shows chevrons while moving', () => {
    const { scene, images } = fakeScene();
    const view = KineticsView.forLevel(scene, level({ movers: [MOVER] }), TUNING, 60)!;
    view.update(drive(10, 11, 0.5), PREFS);
    const segs = images.filter((i) => i.frame.startsWith('slab/safe'));
    const x = Math.round((2 + 10.5 / 16) * 16);
    expect(segs.map((s) => s.x)).toEqual([x, x + 16]);
    expect(images.filter((i) => i.frame === 'slab/chevron/r' && i.visible)).toHaveLength(2);
  });

  it('exposes mover and shot state for the QA hook and destroys every sprite', () => {
    const { scene, images } = fakeScene();
    const view = KineticsView.forLevel(scene, level({ movers: [MOVER], emitters: [EMITTER] }), TUNING, 60, quiet)!;
    view.update(drive(59, 60), PREFS);
    const snap = view.snapshot(st(60));
    expect(snap.movers[0]).toMatchObject({ y: 3, holds: true });
    expect(snap.shots).toHaveLength(2);
    view.destroy();
    expect(images.every((i) => i.destroyed)).toBe(true);
  });
});

describe('bolt frames', () => {
  it('uses the tail frame of the emitter direction, in every direction, when created and reused', () => {
    for (const dir of ['l', 'r', 'u', 'd'] as const) {
      const { scene, images } = fakeScene();
      const e = { ...EMITTER, dir, band: 4 as const, period: 200 };
      const view = KineticsView.forLevel(scene, level({ emitters: [e] }), TUNING, 60, quiet)!;
      view.update(drive(0, 0), PREFS);
      expect(images.some((i) => i.frame === `bolt/red/${dir}`)).toBe(true);
    }
  });

  it('keeps the drawn 8 x 8 core on the shot centre: the pivot sits on the core centre for all four directions', () => {
    const frames = (atlas as unknown as { frames: Record<string, { frame: { w: number; h: number }; pivot: { x: number; y: number } }> }).frames;
    const TAIL = 4;
    const OUTLINE_CORE = 5; // 1 px outline + half of the 8 px core
    const at = (dir: string) => frames[`bolt/red/${dir}`]!;
    const px = (dir: string) => [at(dir).pivot.x * at(dir).frame.w, at(dir).pivot.y * at(dir).frame.h];
    // the tail is behind the flight direction: moving left, the core is at the left end of a 14 px frame
    expect(px('l')[0]).toBeCloseTo(OUTLINE_CORE);
    expect(px('r')[0]).toBeCloseTo(OUTLINE_CORE + TAIL);
    expect(px('u')[1]).toBeCloseTo(OUTLINE_CORE);
    expect(px('d')[1]).toBeCloseTo(OUTLINE_CORE + TAIL);
    expect(px('l')[1]).toBeCloseTo(OUTLINE_CORE);
    expect(px('u')[0]).toBeCloseTo(OUTLINE_CORE);
  });
});
