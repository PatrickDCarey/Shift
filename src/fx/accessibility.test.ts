/**
 * Accessibility checks on src/data/palette.json: WCAG contrast, colour-vision
 * deficiency (CVD) separation, and solid-vs-ghost distinctness.
 * Method and numbers are written up in docs/art/accessibility.md.
 */
import { describe, expect, it } from 'vitest';
import type { BandColor } from '../core/types';
import {
  composite,
  contrastRatio,
  CVD_TYPES,
  deltaE76,
  hexToRgb,
  relativeLuminance,
  simulateCvd,
  type CvdType,
  type Rgb,
} from './color';
import { isPatternId } from './patterns';
import { palette } from './palette';

/** WCAG 2.x 1.4.11 (non-text contrast) for gameplay elements. */
const MIN_GAMEPLAY_CONTRAST = 3;
/** WCAG 2.x 1.4.3 (text contrast, AA, normal size). */
const MIN_TEXT_CONTRAST = 4.5;
/**
 * Minimum CIE76 distance between any two gear colours, for normal vision and
 * for each simulated CVD type. CIE76 JND is about 2.3; 25 is roughly ten JNDs,
 * which keeps colours identifiable one at a time (not just side by side) on a
 * moving screen. Patterns remain the backstop when this still isn't enough.
 */
const MIN_PAIR_DELTA_E = 25;
/** Solid fill vs ghost fill (as drawn over the background) must separate by at least this. */
const MIN_SOLID_GHOST_CONTRAST = 3;

const GEARS: readonly BandColor[] = ['white', 'blue', 'green', 'yellow', 'red'];
const bg = hexToRgb(palette.background);
const rgb = hexToRgb;

type Vision = CvdType | 'normal';
const VISIONS: readonly Vision[] = ['normal', ...CVD_TYPES];

function seen(c: Rgb, vision: Vision): Rgb {
  return vision === 'normal' ? c : simulateCvd(c, vision);
}

/** Smallest pairwise delta-E among labelled colours under one vision type. */
function minPair(colors: ReadonlyArray<readonly [string, string]>, vision: Vision): { d: number; pair: string } {
  let best = { d: Infinity, pair: '' };
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const a = colors[i];
      const b = colors[j];
      if (!a || !b) continue;
      const d = deltaE76(seen(rgb(a[1]), vision), seen(rgb(b[1]), vision));
      if (d < best.d) best = { d, pair: `${a[0]}-${b[0]}` };
    }
  }
  return best;
}

describe('palette structure', () => {
  it('defines all five gears with a pattern, solid and ghost colours', () => {
    for (const g of GEARS) {
      const style = palette.gears[g];
      expect(style, g).toBeDefined();
      expect(isPatternId(style.pattern), `${g} pattern`).toBe(true);
      for (const mode of ['solid', 'ghost'] as const) {
        for (const key of ['fill', 'outline', 'ink'] as const) {
          expect(style[mode][key], `${g}.${mode}.${key}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      }
    }
  });

  it('gives every gear a different pattern (colour is never the only signal)', () => {
    const ids = GEARS.map((g) => palette.gears[g].pattern);
    expect(new Set(ids).size).toBe(GEARS.length);
  });

  it('keeps the safe tile pattern-free and distinct from every gear pattern', () => {
    expect(palette.safeTile.pattern).toBe('plain');
    const coloredPatterns = (['blue', 'green', 'yellow', 'red'] as const).map((g) => palette.gears[g].pattern);
    expect(coloredPatterns).not.toContain('plain');
  });

  it('has a near-black background', () => {
    expect(relativeLuminance(bg)).toBeLessThan(0.01);
  });
});

describe('contrast against the background', () => {
  const gameplay: Array<[string, string]> = [
    ['safe fill', palette.safeTile.fill],
    ['safe outline', palette.safeTile.outline],
    ...GEARS.flatMap((g): Array<[string, string]> => [
      [`${g} solid fill`, palette.gears[g].solid.fill],
      [`${g} solid outline`, palette.gears[g].solid.outline],
      [`${g} ghost outline`, palette.gears[g].ghost.outline],
    ]),
  ];

  it.each(gameplay)('%s is at least 3:1 against the background', (_label, hex) => {
    expect(contrastRatio(rgb(hex), bg)).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
  });

  it('UI focus ring and panel border are at least 3:1 against the background', () => {
    expect(contrastRatio(rgb(palette.ui.focus), bg)).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
    expect(contrastRatio(rgb(palette.ui.panelBorder), bg)).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
  });

  it('pattern marks are at least 3:1 against the tile they sit on', () => {
    for (const g of GEARS) {
      const s = palette.gears[g];
      const solidFill = rgb(s.solid.fill);
      const solidInk = composite(rgb(s.solid.ink), solidFill, palette.treatment.solid.inkAlpha);
      expect(contrastRatio(solidInk, solidFill), `${g} solid`).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);

      const ghostFill = composite(rgb(s.ghost.fill), bg, palette.treatment.ghost.fillAlpha);
      const ghostInk = composite(rgb(s.ghost.ink), ghostFill, palette.treatment.ghost.inkAlpha);
      expect(contrastRatio(ghostInk, ghostFill), `${g} ghost`).toBeGreaterThanOrEqual(MIN_GAMEPLAY_CONTRAST);
    }
  });
});

describe('text contrast', () => {
  const panel = rgb(palette.ui.panel);
  const texts: Array<[string, string]> = [
    ['text', palette.ui.text],
    ['textMuted', palette.ui.textMuted],
  ];

  it.each(texts)('%s is at least 4.5:1 on the background and on panels', (_label, hex) => {
    expect(contrastRatio(rgb(hex), bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(rgb(hex), panel)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('gear colours used as text or HUD labels are at least 4.5:1 on the background', () => {
    for (const g of GEARS) {
      expect(contrastRatio(rgb(palette.gears[g].solid.fill), bg), g).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

describe('gear colours under colour-vision deficiency', () => {
  const solids = GEARS.map((g): [string, string] => [g, palette.gears[g].solid.fill]);
  const ghosts = GEARS.map((g): [string, string] => [g, palette.gears[g].ghost.outline]);
  const solidsAndSafe: Array<[string, string]> = [...solids, ['safe', palette.safeTile.fill]];

  it.each(VISIONS)('five solid gear colours stay at least 25 delta-E apart (%s)', (vision) => {
    const { d, pair } = minPair(solids, vision);
    expect(d, `closest pair ${pair}`).toBeGreaterThanOrEqual(MIN_PAIR_DELTA_E);
  });

  it.each(VISIONS)('five ghost outline colours stay at least 25 delta-E apart (%s)', (vision) => {
    const { d, pair } = minPair(ghosts, vision);
    expect(d, `closest pair ${pair}`).toBeGreaterThanOrEqual(MIN_PAIR_DELTA_E);
  });

  it.each(VISIONS)('the grey safe tile is at least 25 delta-E from every solid gear colour (%s)', (vision) => {
    const safe = seen(rgb(palette.safeTile.fill), vision);
    for (const [name, hex] of solids) {
      expect(deltaE76(safe, seen(rgb(hex), vision)), `safe vs ${name}`).toBeGreaterThanOrEqual(MIN_PAIR_DELTA_E);
    }
    expect(solidsAndSafe).toHaveLength(6);
  });
});

describe('solid vs ghost treatment differs in more than hue', () => {
  it('ghost fill is much fainter than solid fill', () => {
    expect(palette.treatment.ghost.fillAlpha).toBeLessThan(palette.treatment.solid.fillAlpha / 4);
    for (const g of GEARS) {
      const solid = composite(rgb(palette.gears[g].solid.fill), bg, palette.treatment.solid.fillAlpha);
      const ghost = composite(rgb(palette.gears[g].ghost.fill), bg, palette.treatment.ghost.fillAlpha);
      expect(contrastRatio(solid, ghost), g).toBeGreaterThanOrEqual(MIN_SOLID_GHOST_CONTRAST);
    }
  });

  it('ghost outline is dashed and thinner, solid outline is continuous', () => {
    expect(palette.treatment.solid.dash).toBeNull();
    expect(palette.treatment.ghost.dash).not.toBeNull();
    expect(palette.treatment.ghost.outlineWidth).toBeLessThan(palette.treatment.solid.outlineWidth);
  });

  it('ghost outline is dimmer than solid outline for every gear', () => {
    for (const g of GEARS) {
      const solidL = relativeLuminance(rgb(palette.gears[g].solid.outline));
      const ghostL = relativeLuminance(rgb(palette.gears[g].ghost.outline));
      expect(ghostL, g).toBeLessThan(solidL);
    }
  });
});
