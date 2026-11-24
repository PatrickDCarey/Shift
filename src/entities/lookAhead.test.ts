import { describe, expect, it } from 'vitest';
import type { SimState, Tuning } from '../core/types';
import tuningJson from '../data/tuning.json';
import { CameraRig } from './cameraRig';
import { LookAhead, leadTargetPx } from './lookAhead';
import { gridLevel } from './testkit';

const T = tuningJson as unknown as Tuning;
const FRAME = 1000 / 60;
const RED = T.colorBandEdges[3];
const LEAD_PX = T.cameraLookAheadTiles * T.tileSize; // 96

describe('leadTargetPx', () => {
  it('is 0 standing, full at red speed and above, linear below, signed with vx', () => {
    expect(leadTargetPx(0, T)).toBe(0);
    expect(leadTargetPx(RED, T)).toBe(LEAD_PX);
    expect(leadTargetPx(RED + 5, T)).toBe(LEAD_PX);
    expect(leadTargetPx(-RED, T)).toBe(-LEAD_PX);
    expect(leadTargetPx(RED / 2, T)).toBe(LEAD_PX / 2);
  });
  it('is 0 everywhere when the tuning says 0 tiles', () => {
    expect(leadTargetPx(RED, { ...T, cameraLookAheadTiles: 0 })).toBe(0);
  });
});

describe('LookAhead', () => {
  const run = (look: LookAhead, vx: number, frames: number, step0 = 10) => {
    let lead = 0;
    for (let i = 0; i < frames; i++) lead = look.update(vx, 'playing', step0 + i, FRAME);
    return lead;
  };

  it('after 1 s at red the next-bridge tile 19 columns ahead is on screen (check 1)', () => {
    const lead = run(new LookAhead(T), RED, 60);
    expect(lead / T.tileSize).toBeGreaterThanOrEqual(4.5); // view right edge = body + 15 + lead >= body + 19.5
    expect(run(new LookAhead(T), -RED, 60) / T.tileSize).toBeLessThanOrEqual(-4.5);
  });

  it('eases back to centre when standing: not 0 within 6 frames, within 1 px after 60 (check 2)', () => {
    const look = new LookAhead(T);
    run(look, RED, 120);
    for (let i = 0; i < 6; i++) expect(look.update(0, 'playing', 200 + i, FRAME)).not.toBe(0);
    let lead = 0;
    for (let i = 0; i < 60; i++) lead = look.update(0, 'playing', 300 + i, FRAME);
    expect(Math.abs(lead)).toBeLessThanOrEqual(1);
  });

  it('arrives in the ease time: full lead from rest by 21 steps, full left to full right by 42', () => {
    const look = new LookAhead(T);
    expect(Math.abs(run(look, RED, 21) - LEAD_PX)).toBeLessThanOrEqual(1);
    const flip = new LookAhead(T);
    run(flip, -RED, 60);
    let lead = 0;
    for (let i = 0; i < 42; i++) lead = flip.update(RED, 'playing', 100 + i, FRAME);
    expect(Math.abs(lead - LEAD_PX)).toBeLessThanOrEqual(1);
  });

  it('never moves more than 10 px a frame through a flip at red speed, reduced motion or not (check 3)', () => {
    const look = new LookAhead(T);
    run(look, RED, 300);
    let last = look.update(RED, 'playing', 400, FRAME);
    for (let i = 0; i < 120; i++) {
      const lead = look.update(-RED, 'playing', 401 + i, FRAME);
      expect(Math.abs(lead - last)).toBeLessThanOrEqual(10);
      last = lead;
    }
    expect(last).toBeLessThan(-90);
  });

  it('is frame-rate independent: 2 x 8.33 ms matches 1 x 16.67 ms', () => {
    const a = new LookAhead(T);
    const b = new LookAhead(T);
    let la = 0;
    let lb = 0;
    for (let i = 0; i < 30; i++) {
      la = a.update(RED, 'playing', i, FRAME);
      b.update(RED, 'playing', i, FRAME / 2);
      lb = b.update(RED, 'playing', i, FRAME / 2);
    }
    expect(Math.abs(la - lb)).toBeLessThanOrEqual(1);
  });

  it('resets to 0 on reset(), after a death, post respawn (dead to playing) and R (step goes back)', () => {
    const look = new LookAhead(T);
    run(look, RED, 120, 100);
    look.reset();
    expect(look.update(0, 'playing', 220, FRAME)).toBe(0);
    run(look, RED, 120, 300);
    look.update(RED, 'dead', 420, FRAME);
    expect(look.update(0, 'playing', 421, FRAME)).toBe(0); // post respawn: step kept counting
    run(look, RED, 120, 500);
    expect(look.update(0, 'playing', 0, FRAME)).toBe(0); // R: step back to 0
  });
});

// --- the rig ---------------------------------------------------------------

function fakeScene(w = 480, h = 270) {
  const img = { setOrigin: () => img, setScrollFactor: () => img, setDepth: () => img, setVisible: () => img, setFrame: () => img, setFlipX: () => img, setAngle: () => img, setPosition: () => img, destroy: () => undefined };
  const cam = {
    width: w, height: h, scrollX: 0, scrollY: 0,
    setScroll(x: number, y: number) { cam.scrollX = x; cam.scrollY = y; },
    setBackgroundColor: () => undefined,
  };
  return { scene: { add: { image: () => img }, cameras: { main: cam } } as never, cam };
}
const wide = gridLevel([`.@${'.'.repeat(80)}E`, '#'.repeat(83)]);
const narrow = gridLevel(['.@..........E', '#############']);
const state = (vx: number, x = 40, status: SimState['status'] = 'playing', step = 10): SimState =>
  ({ step, status, player: { x, y: 9, vx, band: 4, home: false }, twin: null }) as unknown as SimState;
const bodyAt = (s: SimState) => ({ px: Math.round(s.player.x * 16), py: 9 * 16, home: false });

function follow(rig: CameraRig, level: typeof wide, s: SimState, delta = FRAME) {
  rig.follow(level, [bodyAt(s)], null, null, 24, delta, s);
}

describe('CameraRig look-ahead', () => {
  it('leads a runner at red: the camera right edge reaches body + 19.5 tiles after 1 s', () => {
    const { scene, cam } = fakeScene();
    const rig = new CameraRig(scene, T);
    for (let i = 0; i < 60; i++) follow(rig, wide, state(RED, 40, 'playing', 10 + i));
    const right = cam.scrollX + cam.width;
    expect(right).toBeGreaterThanOrEqual(40 * 16 + 19.5 * 16);
  });

  it('is exactly today for a Tandem pair (no state lead): same scroll with and without the argument', () => {
    const a = fakeScene();
    const b = fakeScene();
    const ra = new CameraRig(a.scene, T);
    const rb = new CameraRig(b.scene, T);
    const s = { ...state(RED), twin: { x: 42, y: 9, band: 0, home: false } } as unknown as SimState;
    const bodies = [bodyAt(s), { px: 42 * 16, py: 9 * 16, home: false }];
    for (let i = 0; i < 30; i++) {
      ra.follow(wide, bodies, null, s.twin, 24, FRAME, s);
      rb.follow(wide, bodies, null, s.twin, 24, FRAME);
      expect(a.cam.scrollX).toBe(b.cam.scrollX);
    }
  });

  it('keeps the lead when the runner goes home (no jump on the win)', () => {
    const { scene, cam } = fakeScene();
    const rig = new CameraRig(scene, T);
    for (let i = 0; i < 60; i++) follow(rig, wide, state(RED, 40, 'playing', 10 + i));
    const before = cam.scrollX;
    const s = state(0, 40);
    rig.follow(wide, [{ ...bodyAt(s), home: true }], null, null, 24, FRAME, s);
    expect(cam.scrollX).toBe(before);
  });

  it('never scrolls a level 30 tiles wide or less, and clamps at the world edge', () => {
    const n = fakeScene();
    const rn = new CameraRig(n.scene, T);
    for (let i = 0; i < 60; i++) follow(rn, narrow, state(RED, 6, 'playing', 10 + i));
    expect(n.cam.scrollX).toBe(Math.round((narrow.width * 16 - 480) / 2));
    const w = fakeScene();
    const rw = new CameraRig(w.scene, T);
    for (let i = 0; i < 90; i++) follow(rw, wide, state(RED, 82, 'playing', 10 + i));
    expect(w.cam.scrollX).toBe(wide.width * 16 - 480);
    const left = fakeScene();
    const rl = new CameraRig(left.scene, T);
    for (let i = 0; i < 90; i++) follow(rl, wide, state(-RED, 2, 'playing', 10 + i));
    expect(left.cam.scrollX).toBe(0);
  });

  it('centres on the body on the first frame after a respawn', () => {
    const { scene, cam } = fakeScene();
    const rig = new CameraRig(scene, T);
    for (let i = 0; i < 60; i++) follow(rig, wide, state(RED, 40, 'playing', 10 + i));
    follow(rig, wide, state(RED, 40, 'dead', 70));
    follow(rig, wide, state(0, 20, 'playing', 71));
    expect(cam.scrollX).toBe(20 * 16 - 240);
  });
});
