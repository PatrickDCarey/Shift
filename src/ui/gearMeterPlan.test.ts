/**
 * Layout checks and spec checks 11-12: the plan (everything the view draws,
 * as plain numbers) is identifiable without colour and has the contrast the
 * spec asks for. Check 13 is a playtest question.
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb } from '../fx/color';
import { palette } from '../fx/palette';
import type { BandColor } from '../core/types';
import { gearKeyCaps } from './gearKeyCaps';
import type { GearMeterModel } from './gearMeter';
import { COMPACT_STRIP_LAYOUT, GEAR_METER_LAYOUT, type GearMeterLayout } from './gearMeterLayout';
import { gearMeterPlan, type Rect } from './gearMeterPlan';

const model = (over: Partial<GearMeterModel> = {}): GearMeterModel => ({
  litBand: 0,
  selectedGear: 1,
  needle: 0,
  dragFill: null,
  pendingGear: null,
  airborne: false,
  ...over,
});

const caps = gearKeyCaps();
const plan = (m: GearMeterModel = model(), pulse: 0 | 1 | 2 | 3 | 4 | null = null, layout: GearMeterLayout = GEAR_METER_LAYOUT) =>
  gearMeterPlan(m, layout, caps, pulse);
const BANDS: readonly BandColor[] = ['white', 'blue', 'green', 'yellow', 'red'];
const inside = (r: Rect, outer: Rect): boolean =>
  r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
const contains = (outer: Rect, inner: Rect): boolean => inside(inner, outer);
const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const cellRect = (c: { x: number; y: number; size: number }): Rect => ({ x: c.x, y: c.y, w: c.size, h: c.size });

describe('layout', () => {
  it('fits the pixel box: 110 x 32, whole-pixel numbers, cells at least 8 px', () => {
    expect(GEAR_METER_LAYOUT.panelW).toBeLessThanOrEqual(110);
    expect(GEAR_METER_LAYOUT.panelH).toBeLessThanOrEqual(32);
    expect(GEAR_METER_LAYOUT.cell).toBeGreaterThanOrEqual(8);
    for (const l of [GEAR_METER_LAYOUT, COMPACT_STRIP_LAYOUT]) {
      for (const [k, v] of Object.entries(l)) if (typeof v === 'number' && k !== 'panelAlpha') expect(Number.isInteger(v), k).toBe(true);
    }
  });

  it('keeps every element inside the panel, in the busiest state', () => {
    const p = plan(model({ litBand: 4, selectedGear: 4, needle: 4, dragFill: 1, pendingGear: 4, airborne: true }), 4);
    const panel = p.panel;
    expect(p.cells.every((c) => inside(cellRect(c), panel))).toBe(true);
    expect(inside(p.bracket, panel)).toBe(true);
    expect(p.pending && inside(p.pending, panel)).toBe(true);
    expect(p.drag && inside(p.drag.frame, panel)).toBe(true);
    expect(p.digits.every((d) => d.x > 0 && d.y >= 0 && d.y < panel.h)).toBe(true);
    expect(p.hints.every((h) => h.caps.every((c) => inside(c.rect, panel)))).toBe(true);
    expect(p.hints.every((h) => inside(h.arrow, panel))).toBe(true);
    expect(p.needle.x - p.needle.halfW).toBeGreaterThanOrEqual(0);
    expect(p.needle.x + p.needle.halfW).toBeLessThanOrEqual(panel.w);
  });

  it('key caps do not overlap the cells or each other', () => {
    const p = plan();
    const capRects = p.hints.flatMap((h) => h.caps.map((c) => c.rect));
    for (const r of capRects) {
      expect(p.cells.some((c) => overlaps(r, cellRect(c)))).toBe(false);
      expect(overlaps(r, p.bracket)).toBe(false);
    }
    capRects.forEach((a, i) => capRects.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
  });

  it('a layout is data: the compact strip is 110 x 14, one cell row, no digits, needle, drag bar or caps', () => {
    const p = plan(model({ litBand: 3, selectedGear: 3, needle: 3, dragFill: 0.5, airborne: true }), null, COMPACT_STRIP_LAYOUT);
    expect(p.panel).toEqual({ x: 0, y: 0, w: 110, h: 14 });
    expect(p.cells).toHaveLength(5);
    expect(p.digits).toEqual([]);
    expect(p.drag).toBeNull();
    expect(p.hints).toEqual([]);
    expect(p.needle.h).toBe(0);
    expect(p.glyph && inside(p.glyph, p.panel)).toBe(true);
    expect(p.cells.every((c) => inside(cellRect(c), p.panel))).toBe(true);
    expect(inside(p.bracket, p.panel)).toBe(true);
  });
});

describe('cells', () => {
  it('five cells, white then gears 1 to 4, left to right', () => {
    const p = plan();
    expect(p.cells.map((c) => c.color)).toEqual(BANDS);
    expect(p.cells.map((c) => c.band)).toEqual([0, 1, 2, 3, 4]);
    expect(p.cells.every((c, i) => i === 0 || c.x > (p.cells[i - 1]?.x ?? 0))).toBe(true);
  });

  it('exactly one cell is lit: the band', () => {
    for (const band of [0, 1, 2, 3, 4] as const) {
      const lit = plan(model({ litBand: band })).cells.filter((c) => c.lit);
      expect(lit.map((c) => c.band)).toEqual([band]);
    }
  });

  it('digits 1 to 4 sit under cells 1 to 4; only the selected gear is bright', () => {
    for (const gear of [1, 2, 3, 4] as const) {
      const p = plan(model({ selectedGear: gear }));
      expect(p.digits.map((d) => d.gear)).toEqual([1, 2, 3, 4]);
      expect(p.digits.filter((d) => d.bright).map((d) => d.gear)).toEqual([gear]);
      p.digits.forEach((d) => expect(d.x).toBe((p.cells[d.gear]?.x ?? 0) + GEAR_METER_LAYOUT.cell / 2));
    }
  });
});

describe('check 11: identifiable in greyscale', () => {
  it('each cell has its own pattern (five distinct, white plain)', () => {
    const patterns = plan().cells.map((c) => c.pattern);
    expect(new Set(patterns).size).toBe(5);
    expect(patterns[0]).toBe('plain');
    expect(patterns.slice(1).every((p) => p !== 'plain')).toBe(true);
  });

  it('lit and dim differ by shape and weight, not only hue: ghost is faint and dashed, solid is full', () => {
    expect(palette.treatment.ghost.fillAlpha).toBeLessThan(palette.treatment.solid.fillAlpha / 2);
    expect(palette.treatment.ghost.dash).not.toBeNull();
    expect(palette.treatment.solid.dash).toBeNull();
  });

  it('the bracket frames the selected cell only, a bold outline wider than the cell', () => {
    for (const gear of [1, 2, 3, 4] as const) {
      const p = plan(model({ selectedGear: gear }));
      const own = p.cells[gear];
      expect(own && contains(p.bracket, cellRect(own))).toBe(true);
      expect(p.bracket.w).toBeGreaterThan(own?.size ?? Infinity);
      p.cells.filter((c) => c.band !== gear).forEach((c) => expect(overlaps(p.bracket, cellRect(c))).toBe(false));
    }
    expect(GEAR_METER_LAYOUT.bracketWidth).toBeGreaterThanOrEqual(2);
  });

  it('the pending bracket is dashed (a different shape from the solid one) on the pending cell', () => {
    const p = plan(model({ pendingGear: 3, airborne: true }));
    const own = p.cells[3];
    expect(p.pending).not.toBeNull();
    expect(own && p.pending && contains(p.pending, cellRect(own))).toBe(true);
    expect(GEAR_METER_LAYOUT.pendingDash.length).toBeGreaterThanOrEqual(2);
    expect(plan().pending).toBeNull();
  });
});

describe('check 12: contrast against the panel', () => {
  const panel = hexToRgb(palette.ui.panel);
  const ratio = (hex: string): number => contrastRatio(hexToRgb(hex), panel);

  it.each(BANDS)('lit %s glyph is at least 3:1', (band) => {
    expect(ratio(palette.gears[band].solid.fill)).toBeGreaterThanOrEqual(3);
  });

  it('the bracket and the pending bracket (focus colour) are at least 3:1', () => {
    expect(ratio(palette.ui.focus)).toBeGreaterThanOrEqual(3);
  });

  it('the needle, the drag bar and the key-cap text are at least 3:1', () => {
    expect(ratio(palette.ui.text)).toBeGreaterThanOrEqual(3);
    expect(ratio(palette.ui.textMuted)).toBeGreaterThanOrEqual(3);
    expect(ratio(palette.ui.panelBorder)).toBeGreaterThanOrEqual(3);
  });
});

describe('needle', () => {
  it('sits at the centre of cell n when the needle value is n (cruise speeds on cell centres)', () => {
    for (const n of [0, 1, 2, 3, 4]) {
      const p = plan(model({ needle: n }));
      const cell = p.cells[n];
      expect(cell && p.needle.x).toBe(Math.floor((cell?.x ?? 0) + GEAR_METER_LAYOUT.cell / 2));
    }
  });

  it('band edges fall on cell boundaries (needle 0.5 is half way between cell centres)', () => {
    const p = plan(model({ needle: 1.5 }));
    const [c1, c2] = [p.cells[1], p.cells[2]];
    expect(p.needle.x).toBe(Math.floor(((c1?.x ?? 0) + (c2?.x ?? 0)) / 2 + GEAR_METER_LAYOUT.cell / 2));
  });
});

describe('drag bar (PT-4)', () => {
  const air = (over: Partial<GearMeterModel>): GearMeterModel => model({ litBand: 3, needle: 3, airborne: true, dragFill: 0.5, ...over });

  it('absent when the model says hidden', () => {
    expect(plan(model({ dragFill: null })).drag).toBeNull();
  });

  it('runs from the needle to the centre of the next lower cell, chevron at that end', () => {
    const p = plan(air({ needle: 3.2 }));
    const lower = p.cells[2];
    expect(p.drag?.chevron.x).toBe(Math.floor((lower?.x ?? 0) + GEAR_METER_LAYOUT.cell / 2));
    expect(p.drag?.chevron.w).toBe(3);
    expect(p.drag?.chevron.h).toBe(5);
    expect((p.drag?.frame.x ?? 0) + (p.drag?.frame.w ?? 0) - 1).toBe(p.needle.x);
  });

  it('fill is a whole number of pixels (B5): the floor of the inner width, growing from the needle', () => {
    const empty = plan(air({ dragFill: 0 })).drag;
    const half = plan(air({ dragFill: 0.5 })).drag;
    const full = plan(air({ dragFill: 1 })).drag;
    expect(empty?.fill.w).toBe(0);
    const inner = (full?.frame.w ?? 0) - 2;
    expect(full?.fill.w).toBe(inner);
    expect(half?.fill.w).toBe(Math.floor(inner / 2));
    for (const f of [0.1, 0.33, 0.77]) expect(Number.isInteger(plan(air({ dragFill: f })).drag?.fill.w)).toBe(true);
    expect(full && contains(full.frame, full.fill)).toBe(true);
    expect(half && half.fill.x + half.fill.w).toBe((half?.frame.x ?? 0) + (half?.frame.w ?? 0) - 1);
  });

  it('sits in the row under the needle, inside the panel', () => {
    const p = plan(air({}));
    expect(p.drag && p.drag.chevron.y).toBeGreaterThanOrEqual(p.needle.top + p.needle.h);
    expect(p.drag && inside(p.drag.chevron, p.panel)).toBe(true);
    expect(p.drag && inside(p.drag.frame, p.panel)).toBe(true);
  });

  it('a span too short for a frame shows only the chevron', () => {
    const p = plan(air({ needle: 2.1 }));
    expect(p.drag?.frame.w).toBe(0);
    expect(p.drag?.fill.w).toBe(0);
  });
});

describe('bracket weight (PT-5)', () => {
  it('is bold only when the lit cell is the selected gear', () => {
    expect(plan(model({ selectedGear: 4, litBand: 3 })).bracketBold).toBe(false);
    expect(plan(model({ selectedGear: 4, litBand: 4 })).bracketBold).toBe(true);
    expect(plan(model({ selectedGear: 1, litBand: 0 })).bracketBold).toBe(false);
    expect(plan(model({ selectedGear: 1, litBand: 1 })).bracketBold).toBe(true);
  });

  it('thin is thinner than bold', () => {
    expect(GEAR_METER_LAYOUT.bracketThinWidth).toBeLessThan(GEAR_METER_LAYOUT.bracketWidth);
  });
});

describe('cue ring (PT-3)', () => {
  it('rings exactly the cue cell; the pulse covers it only while the cue pulses', () => {
    const on = plan(model(), null, GEAR_METER_LAYOUT);
    expect(on.ring).toBeNull();
    const ringed = gearMeterPlan(model(), GEAR_METER_LAYOUT, caps, null, { ringBand: 2, pulse: false });
    expect(ringed.ring).toEqual(cellRect(ringed.cells[2] as never));
    expect(ringed.pulse).toBeNull();
    const pulsed = gearMeterPlan(model(), GEAR_METER_LAYOUT, caps, null, { ringBand: 2, pulse: true });
    expect(pulsed.pulse).toEqual(pulsed.ring);
  });
});

describe('drop pulse', () => {
  it('no pulse by default; a pulse covers exactly the pulsing cell', () => {
    expect(plan().pulse).toBeNull();
    const p = plan(model({ litBand: 3 }), 3);
    const cell = p.cells[3];
    expect(cell && p.pulse).toEqual(cell && cellRect(cell));
  });
});

describe('key caps', () => {
  it('Q and Shift left of the strip (down arrow), E and Shift right (up arrow)', () => {
    const p = plan();
    const first = p.cells[0];
    const last = p.cells[4];
    const [down, up] = [p.hints.find((h) => h.side === 'down'), p.hints.find((h) => h.side === 'up')];
    expect(down?.caps.map((c) => c.label)).toEqual(['Q', '⇧']);
    expect(up?.caps.map((c) => c.label)).toEqual(['E', '⇧']);
    expect(down?.caps.every((c) => first && c.rect.x + c.rect.w <= first.x)).toBe(true);
    expect(up?.caps.every((c) => last && c.rect.x >= last.x + last.size)).toBe(true);
    expect(down?.dir).toBe('down');
    expect(up?.dir).toBe('up');
  });

  it('a side with no caps is omitted', () => {
    const p = gearMeterPlan(model(), GEAR_METER_LAYOUT, { down: [], up: ['E'] }, null);
    expect(p.hints.map((h) => h.side)).toEqual(['up']);
  });
});
