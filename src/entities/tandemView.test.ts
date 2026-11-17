import { describe, expect, it } from 'vitest';
import { cameraScroll, snapFeet, type CameraBody } from './camera';
import { devTandemLevel } from './devLevel';
import { loadGameParams } from './params';
import { pauseTipBudget, resumeTipBudget, startTipBudget } from './stickyTipBudget';
import { edgeArrowPlacement, TANDEM_STRIPS, tandemCamera, twinLaneTest } from './tandemView';
import { gridLevel } from './testkit';
import { hudFrameNames } from '../fx/pixel';

const TS = 16;
const VIEW = { w: 480, h: 270 };
const BODY_H = 24;
const MAX_APART = loadGameParams().tuning.cameraMaxApartTiles;

function frame(a: CameraBody, b: CameraBody | null) {
  const bodies = b === null ? [a] : [a, b];
  const focus = tandemCamera(bodies, BODY_H, TS, MAX_APART);
  if (focus === null) throw new Error('no focus');
  const scroll = cameraScroll(focus.x, focus.y, VIEW.w, VIEW.h, 120 * TS, 15 * TS);
  return { focus, scroll };
}

const at = (tiles: number, home = false): CameraBody => ({ ...snapFeet(tiles, 10, TS), home });

describe('S1 bodies 20 tiles apart', () => {
  it('both are fully on screen and no arrow is shown', () => {
    const { focus, scroll } = frame(at(40), at(60));
    expect(focus.edgeBody).toBeNull();
    for (const t of [40, 60]) {
      const sx = t * TS - scroll.x;
      expect(sx - 6).toBeGreaterThanOrEqual(0);
      expect(sx + 6).toBeLessThanOrEqual(VIEW.w);
      expect(edgeArrowPlacement(snapFeet(t, 10, TS), BODY_H, scroll, VIEW)).toBeNull();
    }
  });
});

describe('S2 runner home, twin moving', () => {
  it('follows the twin', () => {
    const { focus, scroll } = frame(at(100, true), at(40));
    expect(focus.x).toBe(40 * TS);
    expect(focus.edgeBody).toBeNull();
    expect(40 * TS - scroll.x).toBe(VIEW.w / 2);
  });
});

describe('S3 bodies 30 tiles apart', () => {
  it('follows the runner and points an arrow at the twin', () => {
    const { focus, scroll } = frame(at(40), at(70));
    expect(focus.x).toBe(40 * TS);
    expect(focus.edgeBody).toBe(1);
    const arrow = edgeArrowPlacement(snapFeet(70, 10, TS), BODY_H, scroll, VIEW);
    expect(arrow).not.toBeNull();
    expect(arrow?.flipX).toBe(false);
    expect((arrow?.x ?? 0) + 22).toBeLessThanOrEqual(VIEW.w);
  });

  it('mirrors the arrow at the left edge and keeps it under the HUD strips', () => {
    const scroll = { x: 500, y: 0 };
    const arrow = edgeArrowPlacement({ px: 100, py: 2 * TS }, BODY_H, scroll, VIEW);
    expect(arrow?.flipX).toBe(true);
    expect(arrow?.x).toBe(5);
    expect(arrow?.y ?? 0).toBeGreaterThanOrEqual(TANDEM_STRIPS.twin.y + 14 + 5);
  });
});

describe('S4 twin and runner differ by shape', () => {
  it('uses distinct frame families for the two bodies and their arrows/glyphs', () => {
    const names = hudFrameNames();
    expect(names.glyph('runner')).not.toBe(names.glyph('twin'));
    expect(names.edge('twin', 'white')).toBe('hud/edge/twin/white');
    expect(names.edge('twin', 'blue')).not.toBe(names.edge('twin', 'white'));
  });
});

describe('twinLaneTest', () => {
  it('is null without a twin and for a shared room', () => {
    expect(twinLaneTest(gridLevel(['.@.E', '####']))).toBeNull();
    expect(twinLaneTest(gridLevel(['@&.E', '####']))).toBeNull();
  });

  it('splits stacked lanes by the nearer start row', () => {
    const lane = twinLaneTest(devTandemLevel());
    expect(lane).not.toBeNull();
    expect(lane?.(2)).toBe(false);
    expect(lane?.(13)).toBe(true);
  });
});

describe('dev Tandem level', () => {
  it('has both bodies and the two strips stack without overlap', () => {
    const level = devTandemLevel();
    expect(level.twinStart).not.toBeNull();
    expect(TANDEM_STRIPS.twin.y).toBeGreaterThanOrEqual(TANDEM_STRIPS.runner.y + 14);
  });
});

describe('B1 sticky tip budget', () => {
  it('a 5 s pause at 2 s leaves 10 s on resume', () => {
    const shown = startTipBudget(12_000, 0);
    const paused = pauseTipBudget(shown, 2_000);
    expect(paused.remainingMs).toBe(10_000);
    expect(paused.shownAt).toBeNull();
    const resumed = resumeTipBudget(paused, 7_000);
    expect(resumed).toEqual({ remainingMs: 10_000, shownAt: 7_000 });
    expect(pauseTipBudget(resumed, 9_000).remainingMs).toBe(8_000);
  });

  it('ignores a second pause and a resume without a pause', () => {
    const paused = pauseTipBudget(startTipBudget(12_000, 0), 1_000);
    expect(pauseTipBudget(paused, 5_000)).toBe(paused);
    const live = startTipBudget(12_000, 0);
    expect(resumeTipBudget(live, 500)).toBe(live);
  });

  it('never goes below zero', () => {
    expect(pauseTipBudget(startTipBudget(100, 0), 5_000).remainingMs).toBe(0);
  });
});
