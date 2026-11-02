import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  deltaE76,
  hexToNumber,
  hexToRgb,
  linearToSrgb,
  mix,
  relativeLuminance,
  rgbToHex,
  rgbToLab,
  simulateCvd,
  spectrumTint,
  srgbToLinear,
  CVD_TYPES,
  MACHADO_2009,
} from './color';

const BLACK = hexToRgb('#000000');
const WHITE = hexToRgb('#FFFFFF');

describe('hex parsing', () => {
  it('round-trips and accepts a missing #', () => {
    expect(hexToRgb('#4C8DFF')).toEqual({ r: 76, g: 141, b: 255 });
    expect(hexToRgb('4c8dff')).toEqual({ r: 76, g: 141, b: 255 });
    expect(rgbToHex({ r: 76, g: 141, b: 255 })).toBe('#4C8DFF');
    expect(hexToNumber('#102030')).toBe(0x102030);
  });

  it('rejects malformed colours', () => {
    expect(() => hexToRgb('#12345')).toThrow();
    expect(() => hexToRgb('blue')).toThrow();
  });

  it('clamps when writing hex', () => {
    expect(rgbToHex({ r: -20, g: 300, b: 127.6 })).toBe('#00FF80');
  });
});

describe('WCAG contrast', () => {
  it('matches the reference values for black and white', () => {
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 6);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 10);
  });

  it('is symmetric', () => {
    const a = hexToRgb('#4C8DFF');
    const b = hexToRgb('#0B0D14');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 12);
  });

  it('matches a known mid-grey value (#767676 on white is about 4.54:1)', () => {
    expect(contrastRatio(hexToRgb('#767676'), WHITE)).toBeCloseTo(4.54, 2);
  });

  it('sRGB transfer functions invert each other', () => {
    for (const c of [0, 12, 64, 128, 200, 255]) {
      expect(linearToSrgb(srgbToLinear(c))).toBeCloseTo(c, 6);
    }
  });
});

describe('mix and composite', () => {
  it('interpolates and clamps t', () => {
    expect(mix(BLACK, WHITE, 0.5)).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
    expect(mix(BLACK, WHITE, 2)).toEqual(WHITE);
    expect(mix(BLACK, WHITE, -1)).toEqual(BLACK);
  });

  it('composite at alpha 0 is the backdrop, at alpha 1 the foreground', () => {
    expect(composite(WHITE, BLACK, 0)).toEqual(BLACK);
    expect(composite(WHITE, BLACK, 1)).toEqual(WHITE);
  });
});

describe('CIE Lab', () => {
  it('has L*=0 for black and L*=100 for white, with near-zero chroma', () => {
    const k = rgbToLab(BLACK);
    const w = rgbToLab(WHITE);
    expect(k.l).toBeCloseTo(0, 3);
    expect(w.l).toBeCloseTo(100, 1);
    expect(Math.abs(w.a)).toBeLessThan(0.1);
    expect(Math.abs(w.b)).toBeLessThan(0.1);
  });

  it('deltaE76 is zero for identical colours and about 100 for black vs white', () => {
    expect(deltaE76(WHITE, WHITE)).toBe(0);
    expect(deltaE76(BLACK, WHITE)).toBeCloseTo(100, 0);
  });

  it('pure red is near the published Lab value (53.2, 80.1, 67.2)', () => {
    const lab = rgbToLab(hexToRgb('#FF0000'));
    expect(lab.l).toBeCloseTo(53.24, 0);
    expect(lab.a).toBeCloseTo(80.09, 0);
    expect(lab.b).toBeCloseTo(67.2, 0);
  });
});

describe('CVD simulation (Machado 2009, severity 1.0)', () => {
  it('every matrix row sums to about 1, so greys and white are preserved', () => {
    for (const type of CVD_TYPES) {
      for (const row of MACHADO_2009[type]) {
        expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 2);
      }
    }
  });

  it('leaves neutral greys alone', () => {
    for (const type of CVD_TYPES) {
      const grey = simulateCvd(hexToRgb('#808080'), type);
      expect(Math.abs(grey.r - 128)).toBeLessThan(1.5);
      expect(Math.abs(grey.g - 128)).toBeLessThan(1.5);
      expect(Math.abs(grey.b - 128)).toBeLessThan(1.5);
    }
  });

  it('maps pure red to a dark yellow-brown for deuteranopia (known behaviour)', () => {
    const out = simulateCvd(hexToRgb('#FF0000'), 'deuteranopia');
    expect(out.r).toBeGreaterThan(out.g);
    expect(out.g).toBeGreaterThan(out.b);
    expect(out.b).toBe(0);
  });

  it('keeps output channels inside 0..255', () => {
    for (const type of CVD_TYPES) {
      for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF']) {
        const out = simulateCvd(hexToRgb(hex), type);
        for (const v of [out.r, out.g, out.b]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(255);
        }
      }
    }
  });
});

describe('spectrumTint', () => {
  const stops = [
    { t: 0, color: '#000000' },
    { t: 0.5, color: '#FF0000' },
    { t: 1, color: '#FFFFFF' },
  ];

  it('returns the stop colours at the stops and clamps outside', () => {
    expect(spectrumTint(stops, -1)).toEqual(hexToRgb('#000000'));
    expect(spectrumTint(stops, 0.5)).toEqual(hexToRgb('#FF0000'));
    expect(spectrumTint(stops, 2)).toEqual(hexToRgb('#FFFFFF'));
  });

  it('interpolates between stops', () => {
    expect(spectrumTint(stops, 0.25)).toEqual({ r: 127.5, g: 0, b: 0 });
    const upper = spectrumTint(stops, 0.75);
    expect(upper.r).toBe(255);
    expect(upper.g).toBeCloseTo(127.5, 6);
  });

  it('throws without stops', () => {
    expect(() => spectrumTint([], 0.5)).toThrow();
  });
});
