/**
 * The 5 x 7 bitmap font: coverage (printable ASCII plus the HUD, menu and hint icons), glyph
 * rules (5 wide, descender row only where it belongs, no two glyphs alike), the BMFont XML that
 * Phaser reads, and the committed PNG + XML match what the code bakes.
 */
import { describe, expect, it } from 'vitest';
import fontXmlFile from '../../../assets/art/pixel/pixel-font.xml?raw';
import {
  ADVANCE,
  FONT_CHARS,
  FONT_ICONS,
  GLYPH_H,
  GLYPH_W,
  LINE_HEIGHT,
  bakeFontSheet,
  fontXml,
  glyphRect,
  glyphRows,
  textWidth,
} from './font';
import { readCommittedPng } from './pngFixture';
import { getPixel } from './raster';

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
const DESCENDERS = new Set(['g', 'j', 'p', 'q', 'y']);

describe('coverage', () => {
  it('has every printable ASCII character, space included', () => {
    for (const ch of ASCII) expect(FONT_CHARS, JSON.stringify(ch)).toContain(ch);
  });

  it('has every icon and non-ASCII character the studio asked for', () => {
    const asked = ['\u2190', '\u2192', '\u2191', '\u2193', '\u21E7', '\u25B2', '\u25BC', '\u2713', '\u25CB', '\u2605', '\u2014'];
    for (const ch of asked) expect(FONT_CHARS, `U+${ch.codePointAt(0)?.toString(16)}`).toContain(ch);
    for (const [name, ch] of Object.entries(FONT_ICONS)) expect(FONT_CHARS, name).toContain(ch);
  });

  it('keeps every code point in the 16-bit range Phaser reads with fromCharCode', () => {
    for (const ch of FONT_CHARS) expect(ch.codePointAt(0) ?? 0).toBeLessThan(0x10000);
  });
});

describe('glyphs', () => {
  it('are 5 columns by 8 rows', () => {
    for (const ch of FONT_CHARS) {
      const rows = glyphRows(ch) ?? [];
      expect(rows, ch).toHaveLength(GLYPH_H);
      for (const row of rows) expect(row, ch).toMatch(/^[.#]{5}$/);
    }
  });

  it('use the descender row (7) only for g j p q y', () => {
    for (const ch of FONT_CHARS) {
      const inkOnLast = (glyphRows(ch) ?? [])[7]?.includes('#') ?? false;
      expect(inkOnLast, ch).toBe(DESCENDERS.has(ch));
    }
  });

  it('have ink, except the space', () => {
    for (const ch of FONT_CHARS) expect((glyphRows(ch) ?? []).join('').includes('#'), JSON.stringify(ch)).toBe(ch !== ' ');
  });

  it('are all different from each other', () => {
    const seen = new Map<string, string>();
    for (const ch of FONT_CHARS) {
      const key = (glyphRows(ch) ?? []).join('/');
      expect(seen.get(key), `${ch} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, ch);
    }
  });

  it('keep look-alike pairs apart by at least 3 pixels', () => {
    const diff = (a: string, b: string): number => {
      const ra = glyphRows(a) ?? [];
      const rb = glyphRows(b) ?? [];
      let n = 0;
      for (let y = 0; y < GLYPH_H; y++) for (let x = 0; x < GLYPH_W; x++) if (ra[y]?.[x] !== rb[y]?.[x]) n++;
      return n;
    };
    for (const [a, b] of [['O', '0'], ['I', 'l'], ['I', '1'], ['l', '1'], ['S', '5'], ['Z', '2'], ['B', '8'], ['U', 'V'], ['\u25B2', '^'], ['\u25CB', 'o']] as const) {
      expect(diff(a, b), `${a} vs ${b}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('metrics', () => {
  it('advance is 6 and line height is 8', () => {
    expect([ADVANCE, LINE_HEIGHT]).toEqual([6, 8]);
    expect(textWidth('')).toBe(0);
    expect(textWidth('ABC')).toBe(17);
  });
});

describe('BMFont XML for Phaser', () => {
  const xml = fontXml();
  const sheet = bakeFontSheet();
  const attr = (tag: string, name: string): number => Number(new RegExp(`<${tag}[^>]* ${name}="(-?[0-9]+)"`).exec(xml)?.[1]);

  it('declares size, line height, base and the sheet size Phaser needs', () => {
    expect(xml).toMatch(/<info face="redshift-5x7" size="7"/);
    expect(attr('common', 'lineHeight')).toBe(8);
    expect(attr('common', 'base')).toBe(7);
    expect(attr('common', 'scaleW')).toBe(sheet.width);
    expect(attr('common', 'scaleH')).toBe(sheet.height);
  });

  it('has one char entry per character with every attribute Phaser reads', () => {
    const entries = [...xml.matchAll(/<char ([^/]*)\/>/g)].map((m) => m[1] ?? '');
    expect(entries).toHaveLength(FONT_CHARS.length);
    expect(attr('chars', 'count')).toBe(FONT_CHARS.length);
    for (const e of entries) for (const a of ['id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance']) expect(e, a).toMatch(new RegExp(`${a}="-?[0-9]+"`));
  });

  it('every glyph rectangle is inside the sheet, holds exactly its ink, and has a clear gutter', () => {
    for (const ch of FONT_CHARS) {
      const r = glyphRect(ch);
      expect(r.x + r.w).toBeLessThanOrEqual(sheet.width);
      expect(r.y + r.h).toBeLessThanOrEqual(sheet.height);
      const rows = glyphRows(ch) ?? [];
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) expect(getPixel(sheet, r.x + x, r.y + y)[3] > 0, `${ch} ${x},${y}`).toBe(rows[y]?.[x] === '#');
      for (let x = r.x - 1; x <= r.x + r.w; x++) expect(getPixel(sheet, x, r.y - 1)[3]).toBe(0);
    }
  });

  it('the glyphs are white, so they tint cleanly', () => {
    for (let i = 0; i < sheet.data.length; i += 4) if ((sheet.data[i + 3] ?? 0) > 0) expect([sheet.data[i], sheet.data[i + 1], sheet.data[i + 2], sheet.data[i + 3]]).toEqual([255, 255, 255, 255]);
  });
});

describe('committed files match the generator', () => {
  it('pixel-font.xml', () => {
    expect(fontXmlFile.replace(/\r\n/g, '\n')).toBe(fontXml());
  });

  it('pixel-font.png, pixel for pixel', async () => {
    const committed = await readCommittedPng('pixel-font.png');
    const built = bakeFontSheet();
    expect([committed.width, committed.height]).toEqual([built.width, built.height]);
    expect(Array.from(committed.data)).toEqual(Array.from(built.data));
  });
});
