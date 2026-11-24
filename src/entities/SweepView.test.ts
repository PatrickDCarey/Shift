import { describe, expect, it } from 'vitest';
import type { Level, SimState, Sweep, Tuning } from '../core/types';
import { kineticsSnapshot } from './kineticsPlan';
import { KineticsView } from './KineticsView';
import { SweepView } from './SweepView';
import { edgeFrame, fillFrame, MAX_GAP_TILES, sweepFrontTiles, sweepLayout } from './sweepPlan';
import { gridLevel } from './testkit';

const SWEEP: Sweep = { x0: 0, speed: 2, delay: 90 };
const VIEW = { x: 100, y: 0, w: 480, h: 270 };
const st = (step: number): SimState =>
  ({ step, status: 'playing', player: { x: 1, y: 9, band: 0, graceBand: null }, twin: null }) as unknown as SimState;
const level = (extra: Partial<Level> = {}): Level => ({ ...gridLevel([`.@${'.'.repeat(60)}E`, '#'.repeat(63)]), ...extra });

describe('sweepFrontTiles', () => {
  it('is exact at whole and half steps (sweep.md check 1)', () => {
    expect(sweepFrontTiles(SWEEP, st(90), st(91), 1, 100)).toBe(0.0625);
    expect(sweepFrontTiles(SWEEP, st(189), st(190), 1, 100)).toBe(6.25);
    expect(sweepFrontTiles(SWEEP, st(190), st(191), 0.5, 100)).toBe(6.25 + 0.03125);
    expect(sweepFrontTiles(SWEEP, st(10), st(11), 0.5, 100)).toBe(0);
  });
  it('snaps across a respawn instead of sliding back', () => {
    expect(sweepFrontTiles(SWEEP, st(300), st(0), 0.5, 100)).toBe(0);
  });
});

describe('sweepLayout', () => {
  it('tiles the edge column at frontPx - 16 and the fill from the view left to it', () => {
    const l = sweepLayout(20, VIEW); // front at 320 px
    expect(l.edge).toMatchObject({ x: 304, w: 16 });
    expect(l.fill).toMatchObject({ x: 80, w: 304 - 80 }); // one tile of margin left of the view
    expect(l.markerGapTiles).toBeNull();
    expect(l.edge!.h % 16).toBe(0);
    expect(l.edge!.y + l.edge!.h).toBeGreaterThanOrEqual(270);
  });
  it('shows the marker only when the front is off screen to the left, with the gap capped', () => {
    expect(sweepLayout(6.5, VIEW).markerGapTiles).toBeNull(); // front at 104 px: on screen
    const off = sweepLayout(3, VIEW); // 48 px, view starts at 100: gap 52 px
    expect(off.markerGapTiles).toBe(52 / 16);
    expect(off.edge).toBeNull();
    expect(off.fill).toBeNull();
    expect(sweepLayout(-20, VIEW).markerGapTiles).toBe(MAX_GAP_TILES);
  });
  it('hides the edge while the front is past the right side of the view', () => {
    expect(sweepLayout(60, VIEW).edge).toBeNull();
  });
});

describe('reduced motion', () => {
  it('holds frame 0; otherwise the frames cycle', () => {
    expect([0, 125, 250, 375].map((t) => edgeFrame(t, false))).toEqual([0, 1, 2, 0]);
    expect([0, 166, 332, 498, 664].map((t) => fillFrame(t, false))).toEqual([0, 1, 2, 3, 0]);
    expect([0, 500, 900].map((t) => edgeFrame(t, true) + fillFrame(t, true))).toEqual([0, 0, 0]);
  });
});

class Fake {
  visible = true;
  destroyed = false;
  frame = '';
  size = { w: 0, h: 0 };
  setOrigin = () => this;
  setDepth = () => this;
  setTint = () => this;
  setAlpha = () => this;
  setScrollFactor = () => this;
  setVisible = (v: boolean) => ((this.visible = v), this);
  setFrame = (f: string) => ((this.frame = f), this);
  setPosition = () => this;
  setSize = (w: number, h: number) => ((this.size = { w, h }), this);
  destroy = () => void (this.destroyed = true);
}

function fakeScene() {
  const made: Fake[] = [];
  const mk = () => (made.push(new Fake()), made[made.length - 1]);
  const add = { tileSprite: mk, image: mk, rectangle: mk };
  return { scene: { add, scale: { height: 270 }, cameras: { main: { worldView: { x: 0, y: 0, width: 480, height: 270 } } } } as never, made };
}

describe('SweepView', () => {
  it('creates nothing for a level without a sweep', () => {
    const { scene, made } = fakeScene();
    expect(SweepView.forLevel(scene, level())).toBeNull();
    expect(KineticsView.forLevel(scene, level(), { tileSize: 16, emitterTellMs: 300, projectileSizeTiles: 0.5 } as unknown as Tuning, 60)).toBeNull();
    expect(made).toHaveLength(0);
  });

  it('draws fill and edge on screen, the marker only off screen left, and picks the reduced frame', () => {
    const { scene, made } = fakeScene();
    const view = SweepView.forLevel(scene, level({ sweep: { x0: 20, speed: 2, delay: 0 } }))!;
    const [fill, edge, marker] = made;
    view.update(st(0), st(0), 0, VIEW, 300, true);
    expect([fill!.visible, edge!.visible, marker!.visible]).toEqual([true, true, false]);
    expect([fill!.frame, edge!.frame]).toEqual(['sweep/fill/0', 'sweep/edge/0']);
    view.update(st(0), st(0), 0, VIEW, 300, false);
    expect(edge!.frame).toBe('sweep/edge/2');
    view.update(st(0), st(0), 0, { ...VIEW, x: 1000 }, 0, false);
    expect([fill!.visible, edge!.visible, marker!.visible]).toEqual([false, false, true]);
    view.destroy();
    expect(made.every((m) => m.destroyed)).toBe(true);
  });
});

describe('QA hook snapshot', () => {
  it('reports the sweep front in tiles at the kinetic clock, null without a sweep', () => {
    expect(kineticsSnapshot(level({ sweep: SWEEP }), st(190), 18).sweepFront).toBe(6.25);
    expect(kineticsSnapshot(level(), st(190), 18).sweepFront).toBeNull();
  });
});
