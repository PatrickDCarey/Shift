/**
 * The world background behind the tiles at every speed: it must stay near-black
 * (the tint is a hue shift, not a lightening) and every gameplay colour, text
 * and pattern mark must keep its contrast against the *tinted* background.
 * Numbers are written up in docs/art/accessibility.md section 7.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../core/types';
import { composite, contrastRatio, hexToRgb, mix, relativeLuminance, type Rgb } from './color';
import { backgroundForSpeed, palette, tintForSpeed } from './palette';

const MIN_GAMEPLAY_CONTRAST = 3;
const MIN_TEXT_CONTRAST = 4.5;
const TOP = 12;
const GEARS: readonly BandColor[] = ['white', 'blue', 'green', 'yellow', 'red'];
const rgb = hexToRgb;
const bg0 = rgb(palette.background);

const speeds = Array.from({ length: 101 }, (_, i) => (i / 100) * TOP);

/** Both ways the scene may colour the background: the helper, and the old `mix(bg, tint, strength)` wash. */
const washes: ReadonlyArray<readonly [string, (speed: number) => Rgb]> = [
  ['backgroundForSpeed', (s) => backgroundForSpeed(s, TOP)],
  ['mix(bg, tintForSpeed, strength)', (s) => mix(bg0, tintForSpeed(s, TOP), palette.tint.strength)],
];

function worst(check: (bg: Rgb) => number, wash: (s: number) => Rgb): { min: number; at: number } {
  let min = Infinity;
  let at = 0;
  for (const s of speeds) {
    const v = check(wash(s));
    if (v < min) {
      min = v;
      at = s;
    }
  }
  return { min, at };
}

describe('backgroundForSpeed', () => {
  it('is the palette background (within one 8-bit step) when standing: the white band adds no hue', () => {
    const b = backgroundForSpeed(0, TOP);
    expect(Math.abs(b.r - bg0.r)).toBeLessThan(1);
    expect(Math.abs(b.g - bg0.g)).toBeLessThan(1);
    expect(Math.abs(b.b - bg0.b)).toBeLessThan(1);
  });

  it('is a cool blue-leaning dark at gear 1 and a warm red-leaning dark at top speed', () => {
    const blue = backgroundForSpeed(3, TOP);
    const red = backgroundForSpeed(12, TOP);
    expect(blue.b).toBeGreaterThan(blue.r + 15);
    expect(red.r).toBeGreaterThan(red.b + 8);
  });

  it('never exceeds the luminance cap, and the cap is near-black', () => {
    expect(palette.tint.maxBackgroundLuminance).toBeLessThanOrEqual(0.015);
    for (const s of speeds) {
      expect(relativeLuminance(backgroundForSpeed(s, TOP)), `speed ${s}`).toBeLessThanOrEqual(
        palette.tint.maxBackgroundLuminance + 1e-9,
      );
    }
  });

  it('actually shifts hue between bands (a visible but subtle cue)', () => {
    const spread = (c: Rgb): number => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    for (const s of [3, 6, 9, 12]) {
      const v = spread(backgroundForSpeed(s, TOP));
      expect(v, `speed ${s}`).toBeGreaterThanOrEqual(10);
      expect(v, `speed ${s}`).toBeLessThanOrEqual(70);
    }
  });

  it('is continuous in speed (no jumps between neighbouring samples)', () => {
    for (let i = 1; i < speeds.length; i++) {
      const a = backgroundForSpeed(speeds[i - 1] ?? 0, TOP);
      const b = backgroundForSpeed(speeds[i] ?? 0, TOP);
      expect(Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))).toBeLessThan(3);
    }
  });

  it('handles speeds beyond top speed and a zero top speed', () => {
    expect(backgroundForSpeed(99, TOP)).toEqual(backgroundForSpeed(TOP, TOP));
    expect(backgroundForSpeed(5, 0)).toEqual(backgroundForSpeed(0, TOP));
  });
});

describe.each(washes)('contrast against the tinted background: %s', (_name, wash) => {
  it('stays near-black at every speed (the bug rendered a medium grey, luminance 0.03, at speed 0; the cap is 0.013)', () => {
    expect(worst((b) => -relativeLuminance(b), wash).min).toBeGreaterThan(-0.0145);
  });

  const gameplay: Array<[string, string]> = [
    ['safe fill', palette.safeTile.fill],
    ['safe outline', palette.safeTile.outline],
    ['UI focus ring', palette.ui.focus],
    ['UI panel border', palette.ui.panelBorder],
    ...GEARS.flatMap((g): Array<[string, string]> => [
      [`${g} solid fill`, palette.gears[g].solid.fill],
      [`${g} solid outline`, palette.gears[g].solid.outline],
      [`${g} ghost outline`, palette.gears[g].ghost.outline],
    ]),
  ];

  it.each(gameplay)('%s is at least 3:1 at every speed', (_label, hex) => {
    const { min, at } = worst((b) => contrastRatio(rgb(hex), b), wash);
    expect(min, `worst at speed ${at}`).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
  });

  it('pattern marks keep 3:1 on the ghost tile they sit on (the translucent fill follows the background)', () => {
    for (const g of GEARS) {
      const s = palette.gears[g];
      const { min, at } = worst((b) => {
        const fill = composite(rgb(s.ghost.fill), b, palette.treatment.ghost.fillAlpha);
        return contrastRatio(composite(rgb(s.ghost.ink), fill, palette.treatment.ghost.inkAlpha), fill);
      }, wash);
      expect(min, `${g} ghost ink, worst at speed ${at}`).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
    }
  });

  it('solid and ghost fills stay at least 3:1 apart', () => {
    for (const g of GEARS) {
      const s = palette.gears[g];
      const { min, at } = worst((b) => {
        const solid = composite(rgb(s.solid.fill), b, palette.treatment.solid.fillAlpha);
        const ghost = composite(rgb(s.ghost.fill), b, palette.treatment.ghost.fillAlpha);
        return contrastRatio(solid, ghost);
      }, wash);
      expect(min, `${g}, worst at speed ${at}`).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
    }
  });

  const texts: Array<[string, string]> = [
    ['ui text', palette.ui.text],
    ['ui muted text', palette.ui.textMuted],
    // Band colours as text on the bare background use the light outline tint; the fill colour is text only on a panel.
    ...GEARS.map((g): [string, string] => [`${g} band outline tint as text`, palette.gears[g].solid.outline]),
  ];

  it.each(texts)('%s is at least 4.5:1 at every speed', (_label, hex) => {
    const { min, at } = worst((b) => contrastRatio(rgb(hex), b), wash);
    expect(min, `worst at speed ${at}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
