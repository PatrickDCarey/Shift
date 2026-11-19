import { describe, expect, it } from 'vitest';
import {
  bodyPocket,
  cardLayout,
  cardPlacement,
  HUD_BOTTOM,
  RestartCardModel,
  VIEW,
  type CardBody,
  type CardFrame,
} from './restartCard';
import { sealedPockets } from './sealedPockets';
import { gridLevel } from './testkit';

const AWAY = { x: 0, y: 0, w: 10, h: 24 };
const stuck = (over: Partial<CardBody> = {}): CardBody => ({ pocket: 0, home: false, rect: AWAY, ...over });
const frame = (step: number, bodies: readonly CardBody[], over: Partial<CardFrame> = {}): CardFrame => ({
  step,
  reset: false,
  bodies,
  tipTop: null,
  ...over,
});

describe('cardLayout', () => {
  it('is 64 x 19 with the default binding, with an 11 x 11 cap', () => {
    const l = cardLayout();
    expect([l.w, l.h]).toEqual([64, 19]);
    expect(l.cap).toEqual({ x: 4, y: 4, w: 11, h: 11 });
    expect(l.capLabel).toBe('R');
    expect(l.word.x).toBe(4 + 11 + 4);
  });

  it('follows the binding: a longer key label makes a wider card', () => {
    const wide = cardLayout({ restart: ['Space'] } as never);
    expect(wide.w).toBeGreaterThan(64);
    expect(wide.capLabel).toBe('SPACE');
  });
});

describe('cardPlacement', () => {
  const size = { w: 64, h: 19 };

  it('centres at the bottom, 8 px up, on whole pixels', () => {
    expect(cardPlacement(size, [], null)).toEqual({ x: 208, y: 243, w: 64, h: 19 });
  });

  it('keeps 8 px from every edge and clear of the HUD', () => {
    const p = cardPlacement(size, [], null);
    expect(p.x).toBeGreaterThanOrEqual(8);
    expect(p.x + p.w).toBeLessThanOrEqual(VIEW.w - 8);
    expect(p.y + p.h).toBeLessThanOrEqual(VIEW.h - 8);
    expect(p.y).toBeGreaterThanOrEqual(HUD_BOTTOM);
  });

  it('goes to y 42 when a body sits where the card would be', () => {
    expect(cardPlacement(size, [{ x: 230, y: 236, w: 10, h: 24 }], null).y).toBe(42);
  });

  it('ignores a body that is elsewhere', () => {
    expect(cardPlacement(size, [{ x: 20, y: 236, w: 10, h: 24 }], null).y).toBe(243);
  });

  it('sits 4 px above the Sticky Keys tip', () => {
    expect(cardPlacement(size, [], 212)).toEqual({ x: 208, y: 212 - 4 - 19, w: 64, h: 19 });
  });
});

describe('bodyPocket', () => {
  const pockets = sealedPockets(gridLevel(['.@...E', '######', '#....#', '#....#', '######', '......']));

  it('uses the cell of the body centre, 0.75 tiles above the feet', () => {
    expect(bodyPocket(pockets, { x: 2.5, y: 4 }, 1.5)).toBe(0); // centre row 3.25 -> row 3
    expect(bodyPocket(pockets, { x: 2.5, y: 2.5 }, 1.5)).toBe(-1); // centre row 1.75 -> row 1, a wall
    expect(bodyPocket(pockets, { x: 0.5, y: 4 }, 1.5)).toBe(-1);
    expect(bodyPocket(pockets, { x: 2.5, y: 4 }, 6)).toBe(-1); // a body 6 tiles tall: centre 3 above the feet, row 1, a wall
  });
});

describe('RestartCardModel', () => {
  const run = (m: RestartCardModel, from: number, to: number, bodies: readonly CardBody[]) => {
    let last: ReturnType<RestartCardModel['update']> = null;
    for (let s = from; s <= to; s++) last = m.update(frame(s, bodies));
    return last;
  };

  it('shows nothing at 59 steps and the card at 60', () => {
    const m = new RestartCardModel(60);
    expect(run(m, 1, 59, [stuck()])).toBeNull();
    expect(m.update(frame(60, [stuck()]))).not.toBeNull();
  });

  it('counts steps, not rendered frames (a frame may run several steps)', () => {
    const m = new RestartCardModel(60);
    expect(m.update(frame(30, [stuck()]))).toBeNull(); // new stay: 1 step
    expect(m.update(frame(88, [stuck()]))).toBeNull(); // 59 counted
    expect(m.update(frame(89, [stuck()]))).not.toBeNull(); // 60
  });

  it('credits only one step to the frame a body enters the pocket on (5 steps per frame)', () => {
    const m = new RestartCardModel(60);
    expect(m.update(frame(100, [stuck({ pocket: -1 })]))).toBeNull();
    expect(m.update(frame(105, [stuck()]))).toBeNull(); // entered on the last of 5 steps: 1 counted, not 5
    expect(m.update(frame(163, [stuck()]))).toBeNull(); // 59
    expect(m.update(frame(164, [stuck()]))).not.toBeNull(); // 60
  });

  it('does not count steps that do not run (pause, death freeze)', () => {
    const m = new RestartCardModel(60);
    run(m, 1, 40, [stuck()]);
    for (let i = 0; i < 500; i++) expect(m.update(frame(40, [stuck()]))).toBeNull();
    expect(m.update(frame(59, [stuck()]))).toBeNull();
    expect(m.update(frame(60, [stuck()]))).not.toBeNull();
  });

  it('never counts a home body or a body outside a pocket', () => {
    const m = new RestartCardModel(60);
    expect(run(m, 1, 300, [stuck({ home: true })])).toBeNull();
    expect(run(m, 301, 600, [stuck({ pocket: -1 })])).toBeNull();
  });

  it('counts the stuck body even when the other one is free', () => {
    const m = new RestartCardModel(60);
    expect(run(m, 1, 60, [stuck({ pocket: -1 }), stuck()])).not.toBeNull();
  });

  it('clears on a respawn or restart and starts again from 0', () => {
    const m = new RestartCardModel(60);
    expect(run(m, 1, 70, [stuck()])).not.toBeNull();
    expect(m.update(frame(0, [stuck()], { reset: true }))).toBeNull();
    expect(run(m, 1, 59, [stuck()])).toBeNull();
    expect(m.update(frame(60, [stuck()]))).not.toBeNull();
  });

  it('clears when the step counter goes backwards without a reset flag', () => {
    const m = new RestartCardModel(60);
    run(m, 1, 70, [stuck()]);
    expect(m.update(frame(2, [stuck()]))).toBeNull();
  });

  it('clears when no body is in a pocket any more', () => {
    const m = new RestartCardModel(60);
    run(m, 1, 70, [stuck()]);
    expect(m.update(frame(71, [stuck({ pocket: -1 })]))).toBeNull();
  });

  it('restarts the count when the body moves to another pocket', () => {
    const m = new RestartCardModel(60);
    run(m, 1, 50, [stuck({ pocket: 0 })]);
    expect(run(m, 51, 70, [stuck({ pocket: 1 })])).toBeNull();
  });

  it('decides the placement once, when the card appears', () => {
    const m = new RestartCardModel(60);
    const first = run(m, 1, 60, [stuck()]);
    expect(first?.y).toBe(243);
    const later = m.update(frame(61, [stuck({ rect: { x: 220, y: 240, w: 10, h: 24 } })], { tipTop: 212 }));
    expect(later).toEqual(first);
  });

  it('moves to y 42 when a body is at the bottom at the moment it appears', () => {
    const m = new RestartCardModel(60);
    expect(run(m, 1, 60, [stuck({ rect: { x: 230, y: 240, w: 10, h: 24 } })])?.y).toBe(42);
  });
});
