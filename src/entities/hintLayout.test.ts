import { describe, expect, it } from 'vitest';
import { HINT_GLYPHS } from '../core/types';
import { FONT_ICONS } from '../fx';
import { DEFAULT_BINDINGS } from '../ui';
import { hintCapLabel, hintDef, hintPlan, hintPlans, HINT_BOX_MAX_H, HINT_BOX_MAX_W } from './hintLayout';

const TS = 16;
const plan = (glyph: string, col: number, row: number) => {
  const def = hintDef(glyph);
  if (def === null) throw new Error(`no glyph ${glyph}`);
  return hintPlan(def, { col, row }, TS);
};
const labels = (glyph: string): string[] => plan(glyph, 0, 5).caps.map((c) => c.label.text);
const { arrowLeft, arrowRight, arrowUp, shift, triangleUp, triangleDown } = FONT_ICONS;

describe('hintDef', () => {
  it('knows the four glyphs and null for anything else', () => {
    for (const g of HINT_GLYPHS) expect(hintDef(g)).not.toBeNull();
    expect(hintDef('dance')).toBeNull();
    expect(hintDef('toString')).toBeNull();
  });
});

describe('hintPlan codes', () => {
  const codesOf = (glyph: string): string[] => plan(glyph, 0, 5).caps.map((c) => c.code).sort();
  it('shows exactly the codes bound to the glyph action', () => {
    const b = DEFAULT_BINDINGS;
    expect(codesOf('move')).toEqual([...b.left, ...b.right].sort());
    expect(codesOf('shiftUp')).toEqual([...b.shiftUp].sort());
    expect(codesOf('shiftDown')).toEqual([...b.shiftDown].sort());
    expect(codesOf('jump')).toEqual([...b.jump].sort());
  });
});

describe('hintPlan labels', () => {
  it('uses the short cap labels, never the long Shift names', () => {
    expect(labels('move')).toEqual([arrowLeft, arrowRight, 'A', 'D']);
    expect(labels('shiftUp')).toEqual([`R${shift}`, 'E', 'X']);
    expect(labels('shiftDown')).toEqual([`L${shift}`, 'Q', 'Z']);
    expect(labels('jump')).toEqual(['SPACE', 'W', arrowUp]);
    expect(hintCapLabel('ShiftLeft')).not.toContain('Shift');
  });

  it('puts a triangle on the shift glyphs only', () => {
    expect(plan('shiftUp', 0, 5).arrow?.text).toBe(triangleUp);
    expect(plan('shiftDown', 0, 5).arrow?.text).toBe(triangleDown);
    expect(plan('move', 0, 5).arrow).toBeNull();
    expect(plan('jump', 0, 5).arrow).toBeNull();
  });
});

describe('hintPlan geometry', () => {
  it('matches the spec for w1-01 move at (1, 3): left 12, top 40, 24 x 24', () => {
    expect(plan('move', 1, 3).box).toEqual({ x: 12, y: 40, w: 24, h: 24 });
  });

  it('every glyph fits in 48 x 24 on whole pixels, with its bottom on the anchor cell bottom', () => {
    for (const g of HINT_GLYPHS) {
      const p = plan(g, 7, 9);
      expect(p.box.w).toBeLessThanOrEqual(HINT_BOX_MAX_W);
      expect(p.box.h).toBe(HINT_BOX_MAX_H);
      expect(p.box.y + p.box.h).toBe(10 * TS);
      const nums = [p.box, ...p.caps.map((c) => c.rect)].flatMap((r) => [r.x, r.y, r.w, r.h]);
      for (const c of p.caps) nums.push(c.label.x, c.label.y);
      for (const n of nums) expect(Number.isInteger(n)).toBe(true);
      for (const c of p.caps) {
        expect(c.rect.x).toBeGreaterThanOrEqual(p.box.x);
        expect(c.rect.x + c.rect.w).toBeLessThanOrEqual(p.box.x + p.box.w);
        expect(c.rect.y).toBeGreaterThanOrEqual(p.box.y);
        expect(c.rect.y + c.rect.h).toBeLessThanOrEqual(p.box.y + p.box.h);
      }
    }
  });

  it('sizes caps 6 x characters + 5 wide and 11 tall; jump is the widest at 35', () => {
    const jump = plan('jump', 0, 5);
    expect(jump.caps[0]?.rect).toMatchObject({ w: 35, h: 11 });
    expect(jump.box.w).toBe(35);
    expect(plan('move', 0, 5).caps[0]?.rect).toMatchObject({ w: 11, h: 11 });
  });

  it('places labels 2 px in from the cap edge and 2 px down', () => {
    for (const c of plan('shiftUp', 3, 6).caps) {
      expect(c.label.x).toBe(c.rect.x + 2);
      expect(c.label.y).toBe(c.rect.y + 2);
    }
  });

  it('lays out two rows 2 px apart, caps left to right 2 px apart', () => {
    const [a, b, c, d] = plan('move', 1, 3).caps.map((x) => x.rect);
    expect(a).toEqual({ x: 12, y: 40, w: 11, h: 11 });
    expect(b).toEqual({ x: 25, y: 40, w: 11, h: 11 });
    expect(c).toEqual({ x: 12, y: 53, w: 11, h: 11 });
    expect(d).toEqual({ x: 25, y: 53, w: 11, h: 11 });
  });

  it('draws the triangle 5 px wide, 2 px left of its cap, centred on it', () => {
    const p = plan('shiftUp', 1, 6);
    const cap = p.caps[0];
    expect(p.arrow).not.toBeNull();
    if (p.arrow === null || cap === undefined) return;
    expect(p.arrow.x + 5 + 2).toBe(cap.rect.x);
    expect(p.arrow.y).toBe(cap.rect.y + 2);
    expect(p.box.x).toBe(p.arrow.x);
  });

  it('follows the bindings it is given', () => {
    const def = hintDef('jump');
    if (def === null) throw new Error('jump');
    const p = hintPlan(def, { col: 0, row: 5 }, TS, { ...DEFAULT_BINDINGS, jump: ['KeyJ'] });
    expect(p.caps.map((c) => c.label.text)).toEqual(['J']);
  });
});

describe('hintPlans', () => {
  it('plans every hint in file order and nothing for a level without hints', () => {
    const hints = [
      { glyph: 'shiftUp', anchor: { col: 2, row: 3 } },
      { glyph: 'jump', anchor: { col: 2, row: 6 } },
    ] as const;
    expect(hintPlans(hints, TS).map((p) => p.glyph)).toEqual(['shiftUp', 'jump']);
    expect(hintPlans(undefined, TS)).toEqual([]);
  });
});
