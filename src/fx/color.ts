/**
 * Pure colour math for Redshift: WCAG contrast, CIE Lab distance, colour-vision
 * deficiency (CVD) simulation and the spectrum tint. No Phaser, no DOM.
 * Owner: art-director.
 */

export interface Rgb {
  /** Each channel 0..255 (may be fractional for blends). */
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface Lab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export type CvdType = 'protanopia' | 'deuteranopia' | 'tritanopia';

export const CVD_TYPES: readonly CvdType[] = ['protanopia', 'deuteranopia', 'tritanopia'];

const HEX_RE = /^#?([0-9a-f]{6})$/i;

export function hexToRgb(hex: string): Rgb {
  const m = HEX_RE.exec(hex.trim());
  if (!m || m[1] === undefined) throw new Error(`Invalid hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function hexToNumber(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (r << 16) | (g << 8) | b;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (v: number): string => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** sRGB channel 0..255 to linear light 0..1. */
export function srgbToLinear(c255: number): number {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear light 0..1 to sRGB channel 0..255 (clamped). */
export function linearToSrgb(lin: number): number {
  const v = clamp(lin, 0, 1);
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return c * 255;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Linear interpolation in sRGB space. t=0 gives `a`, t=1 gives `b`. */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp(t, 0, 1);
  return { r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k };
}

/** What a colour looks like at `alpha` drawn over an opaque backdrop. */
export function composite(fg: Rgb, backdrop: Rgb, alpha: number): Rgb {
  return mix(backdrop, fg, alpha);
}

// --- CIE Lab (D65) -----------------------------------------------------------

const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

function labF(t: number): number {
  const d = 6 / 29;
  return t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
}

export function rgbToLab(rgb: Rgb): Lab {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = labF(x / XN);
  const fy = labF(y / YN);
  const fz = labF(z / ZN);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIE76 colour difference (Euclidean distance in Lab). */
export function deltaE76(a: Rgb, b: Rgb): number {
  const la = rgbToLab(a);
  const lb = rgbToLab(b);
  return Math.hypot(la.l - lb.l, la.a - lb.a, la.b - lb.b);
}

// --- CVD simulation ----------------------------------------------------------

type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

/**
 * Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model for
 * Simulation of Color Vision Deficiency", severity 1.0 (complete dichromacy).
 * Applied to LINEAR RGB, then converted back to sRGB.
 */
export const MACHADO_2009: Readonly<Record<CvdType, Matrix3>> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function simulateCvd(rgb: Rgb, type: CvdType): Rgb {
  const m = MACHADO_2009[type];
  const lin = [srgbToLinear(rgb.r), srgbToLinear(rgb.g), srgbToLinear(rgb.b)] as const;
  const out = m.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
  return { r: linearToSrgb(out[0] ?? 0), g: linearToSrgb(out[1] ?? 0), b: linearToSrgb(out[2] ?? 0) };
}

// --- Spectrum tint -----------------------------------------------------------

export interface TintStop {
  /** Normalised speed 0..1 (0 = standing, 1 = top gear speed). */
  readonly t: number;
  readonly color: string;
}

/**
 * Colour of the world tint for a normalised speed. Stops must be sorted by t.
 * Interpolates in sRGB between the two surrounding stops; clamps outside.
 */
export function spectrumTint(stops: readonly TintStop[], t: number): Rgb {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) throw new Error('spectrumTint needs at least one stop');
  if (t <= first.t) return hexToRgb(first.color);
  if (t >= last.t) return hexToRgb(last.color);
  for (let i = 1; i < stops.length; i++) {
    const hi = stops[i];
    const lo = stops[i - 1];
    if (hi && lo && t <= hi.t) {
      const span = hi.t - lo.t;
      const k = span === 0 ? 1 : (t - lo.t) / span;
      return mix(hexToRgb(lo.color), hexToRgb(hi.color), k);
    }
  }
  return hexToRgb(last.color);
}
