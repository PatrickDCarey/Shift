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
import { GEAR_METER_LAYOUT, type GearMeterLayout } from './gearMeterLayout';
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
  it('fits the spec box: at most 220 x 64, cells at least 24 px', () => {
    expect(GEAR_METER_LAYOUT.panelW).toBeLessThanOrEqual(220);
    expect(GEAR_METER_LAYOUT.panelH).toBeLessThanOrEqual(64);
    expect(GEAR_METER_LAYOUT.cell).toBeGreaterThanOrEqual(24);
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

  it('a layout is data: halving it halves the plan (PX-9 will pass a 110 x 32 layout)', () => {
    const half: GearMeterLayout = Object.fromEntries(
      Object.entries(GEAR_METER_LAYOUT).map(([k, v]) => [k, typeof v === 'number' ? v / 2 : v]),
    ) as unknown as GearMeterLayout;
    expect(plan(model({ needle: 2 }), null, half).needle.x).toBeCloseTo(plan(model({ needle: 2 })).needle.x / 2, 9);
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
      expect(cell && p.needle.x).toBeCloseTo((cell?.x ?? 0) + GEAR_METER_LAYOUT.cell / 2, 9);
    }
  });

  it('band edges fall on cell boundaries (needle 0.5 is half way between cell centres)', () => {
    const p = plan(model({ needle: 1.5 }));
    const [c1, c2] = [p.cells[1], p.cells[2]];
    expect(p.needle.x).toBeCloseTo(((c1?.x ?? 0) + (c2?.x ?? 0)) / 2 + GEAR_METER_LAYOUT.cell / 2, 9);
  });
});

describe('drag meter', () => {
  it('absent when the model says hidden', () => {
    expect(plan(model({ dragFill: null })).drag).toBeNull();
  });

  it('fill is the model fraction of the inner bar width, from empty to full', () => {
    const empty = plan(model({ dragFill: 0, airborne: true })).drag;
    const half = plan(model({ dragFill: 0.5, airborne: true })).drag;
    const full = plan(model({ dragFill: 1, airborne: true })).drag;
    expect(empty?.fill.w).toBe(0);
    expect(half?.fill.w).toBeCloseTo((full?.fill.w ?? 0) / 2, 9);
    expect(full && contains(full.frame, full.fill)).toBe(true);
  });

  it('sits under the needle row, within the cell row width', () => {
    const p = plan(model({ dragFill: 0.3, airborne: true }));
    expect(p.drag && p.drag.frame.y).toBeGreaterThanOrEqual(p.needle.top + p.needle.h);
    expect(p.drag?.frame.x).toBe(p.cells[0]?.x);
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
