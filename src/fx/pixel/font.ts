/**
 * The 5 x 7 bitmap font for direction C: glyph bitmaps, the sheet baker and the BMFont XML
 * that Phaser's `load.bitmapFont` reads. Pure; no Phaser. Own drawing (CC0 / MIT, nothing
 * third-party). Owner: art-director.
 *
 * Metrics: glyph box 5 x 8 (cap height 7, rows 0..6; rows 2..6 are the lowercase x-height;
 * row 7 is the descender row of g j p q y , ;), advance 6, line height 8. White glyphs on
 * transparency: tint them from `palette.ui`.
 */
import { createRaster, fillRect, type Raster } from './raster';

export const FONT_FACE = 'redshift-5x7';
export const FONT_IMAGE = 'pixel-font.png';
export const GLYPH_W = 5;
export const GLYPH_H = 8;
export const CAP_HEIGHT = 7;
export const ADVANCE = 6;
export const LINE_HEIGHT = 8;

/** Characters with a private-use or non-ASCII code point that HUD, menus and hints use by name. */
export const FONT_ICONS = {
  arrowLeft: '←',
  arrowUp: '↑',
  arrowRight: '→',
  arrowDown: '↓',
  shift: '⇧',
  triangleUp: '▲',
  triangleDown: '▼',
  triangleRight: '▶',
  triangleLeft: '◀',
  tick: '✓',
  hollowDot: '○',
  dot: '●',
  star: '★',
  /** Private-use code point: there is no lock in the Basic Multilingual Plane (Phaser reads 16-bit characters). */
  lock: '',
  emDash: '—',
  ellipsis: '…',
  middot: '·',
  times: '×',
} as const;

/** Rows are `/`-separated, 5 columns each; 7 rows, or 8 when the glyph reaches into the descender row. */
const G: Readonly<Record<string, string>> = {
  ' ': '...../...../...../...../...../...../.....',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '"': '.#.#./.#.#./.#.#./...../...../...../.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
  $: '..#../.####/#.#../.###./..#.#/####./..#..',
  '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  "'": '..#../..#../.#.../...../...../...../.....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  ',': '...../...../...../...../..#../..#../.#...',
  '-': '...../...../...../.###./...../...../.....',
  '.': '...../...../...../...../...../..#../..#..',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../#####',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  ':': '...../..#../..#../...../..#../..#../.....',
  ';': '...../..#../..#../...../..#../..#../.#...',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '=': '...../...../#####/...../#####/...../.....',
  '>': '#..../.#.../..#../...#./..#../.#.../#....',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '@': '.###./#...#/#.###/#.#.#/#.###/#..../.###.',
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.####/#..../#..../#..../#..../#..../.####',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.####/#..../#..../#..##/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '#####/..#../..#../..#../..#../..#../#####',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.',
  '\\': '#..../#..../.#.../..#../...#./....#/....#',
  ']': '.###./...#./...#./...#./...#./...#./.###.',
  '^': '..#../.#.#./#...#/...../...../...../.....',
  _: '...../...../...../...../...../...../#####',
  '`': '.#.../..#../...../...../...../...../.....',
  a: '...../...../.###./....#/.####/#...#/.####',
  b: '#..../#..../####./#...#/#...#/#...#/####.',
  c: '...../...../.####/#..../#..../#..../.####',
  d: '....#/....#/.####/#...#/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.###.',
  f: '..##./.#.../####./.#.../.#.../.#.../.#...',
  g: '...../...../.####/#...#/#...#/.####/....#/.###.',
  h: '#..../#..../####./#...#/#...#/#...#/#...#',
  i: '..#../...../.##../..#../..#../..#../.###.',
  j: '...#./...../..##./...#./...#./...#./...#./.##..',
  k: '#..../#..../#..#./#.#../##.../#.#../#..#.',
  l: '.##../..#../..#../..#../..#../..#../.###.',
  m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
  n: '...../...../####./#...#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.',
  p: '...../...../####./#...#/#...#/####./#..../#....',
  q: '...../...../.####/#...#/#...#/.####/....#/....#',
  r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.####/#..../.###./....#/####.',
  t: '.#.../.#.../####./.#.../.#.../.#..#/..##.',
  u: '...../...../#...#/#...#/#...#/#...#/.####',
  v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../...../#...#/#...#/#...#/.####/....#/.###.',
  z: '...../...../#####/...#./..#../.#.../#####',
  '{': '..##./..#../..#../.#.../..#../..#../..##.',
  '|': '..#../..#../..#../..#../..#../..#../..#..',
  '}': '.##../..#../..#../...#./..#../..#../.##..',
  '~': '...../...../.##.#/#.##./...../...../.....',
  [FONT_ICONS.middot]: '...../...../...../..#../...../...../.....',
  [FONT_ICONS.times]: '...../#...#/.#.#./..#../.#.#./#...#/.....',
  [FONT_ICONS.emDash]: '...../...../...../#####/...../...../.....',
  [FONT_ICONS.ellipsis]: '...../...../...../...../...../...../#.#.#',
  [FONT_ICONS.arrowLeft]: '...../..#../.#.../#####/.#.../..#../.....',
  [FONT_ICONS.arrowRight]: '...../..#../...#./#####/...#./..#../.....',
  [FONT_ICONS.arrowUp]: '..#../.###./#.#.#/..#../..#../..#../..#..',
  [FONT_ICONS.arrowDown]: '..#../..#../..#../..#../#.#.#/.###./..#..',
  [FONT_ICONS.shift]: '..#../.#.#./#...#/##.##/.#.#./.#.#./.###.',
  [FONT_ICONS.triangleUp]: '...../...../..#../.###./#####/...../.....',
  [FONT_ICONS.triangleDown]: '...../...../#####/.###./..#../...../.....',
  [FONT_ICONS.triangleRight]: '#..../##.../###../####./###../##.../#....',
  [FONT_ICONS.triangleLeft]: '....#/...##/..###/.####/..###/...##/....#',
  [FONT_ICONS.tick]: '...../....#/...#./#.#../.#.../...../.....',
  [FONT_ICONS.hollowDot]: '...../.###./#...#/#...#/#...#/.###./.....',
  [FONT_ICONS.dot]: '...../.###./#####/#####/#####/.###./.....',
  [FONT_ICONS.star]: '...../..#../#####/.###./.#.#./#...#/.....',
  [FONT_ICONS.lock]: '.###./#...#/#...#/#####/##.##/##.##/#####',
};

const rowsOf = (art: string): string[] => art.split('/').map((r) => r.padEnd(GLYPH_W, '.'));

/** Every character the font draws, in code point order. */
export const FONT_CHARS: readonly string[] = Object.keys(G).sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0));

/** Glyph bitmap rows (8 strings of 5 chars, '#' = ink), or undefined for a character the font lacks. */
export function glyphRows(ch: string): readonly string[] | undefined {
  const art = G[ch];
  if (art === undefined) return undefined;
  const rows = rowsOf(art);
  while (rows.length < GLYPH_H) rows.push('.'.repeat(GLYPH_W));
  return rows;
}

/** Width in art pixels of `text` on one line (advance 6, no trailing gap). */
export function textWidth(text: string): number {
  return text.length === 0 ? 0 : text.length * ADVANCE - (ADVANCE - GLYPH_W);
}

const COLUMNS = 16;
const GAP = 1;
const PITCH_X = GLYPH_W + GAP;
const PITCH_Y = GLYPH_H + GAP;

/** Where a character sits on the sheet (top-left of its 5 x 8 box). */
export function glyphRect(ch: string): { x: number; y: number; w: number; h: number } {
  const i = FONT_CHARS.indexOf(ch);
  if (i < 0) throw new Error(`font has no glyph for U+${(ch.codePointAt(0) ?? 0).toString(16)}`);
  return { x: GAP + (i % COLUMNS) * PITCH_X, y: GAP + Math.floor(i / COLUMNS) * PITCH_Y, w: GLYPH_W, h: GLYPH_H };
}

/** The font sheet: white glyphs on transparency. */
export function bakeFontSheet(): Raster {
  const rows = Math.ceil(FONT_CHARS.length / COLUMNS);
  const sheet = createRaster(GAP + COLUMNS * PITCH_X, GAP + rows * PITCH_Y);
  for (const ch of FONT_CHARS) {
    const r = glyphRect(ch);
    (glyphRows(ch) ?? []).forEach((row, j) => {
      for (let i = 0; i < GLYPH_W; i++) if (row[i] === '#') fillRect(sheet, r.x + i, r.y + j, 1, 1, [255, 255, 255, 255]);
    });
  }
  return sheet;
}

/** The BMFont XML for Phaser (`load.bitmapFont(key, 'pixel-font.png', 'pixel-font.xml')`). Space has an empty box. */
export function fontXml(): string {
  const sheet = bakeFontSheet();
  const chars = FONT_CHARS.map((ch) => {
    const r = glyphRect(ch);
    const blank = ch === ' ';
    const box = blank ? { x: 0, y: 0, w: 0, h: 0 } : r;
    return ` <char id="${ch.codePointAt(0)}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" xoffset="0" yoffset="0" xadvance="${ADVANCE}" page="0" chnl="15"/>`;
  });
  return [
    '<?xml version="1.0"?>',
    '<font>',
    ` <info face="${FONT_FACE}" size="${CAP_HEIGHT}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="0,0" outline="0"/>`,
    ` <common lineHeight="${LINE_HEIGHT}" base="${CAP_HEIGHT}" scaleW="${sheet.width}" scaleH="${sheet.height}" pages="1" packed="0"/>`,
    ` <pages><page id="0" file="${FONT_IMAGE}"/></pages>`,
    ` <chars count="${FONT_CHARS.length}">`,
    ...chars,
    ' </chars>',
    '</font>',
    '',
  ].join('\n');
}
