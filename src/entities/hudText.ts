/**
 * Pure text layout for the bitmap-font HUD (5 x 7 font, advance 6, line height 8).
 * Everything is whole pixels: positions are computed here from `textWidth`
 * rather than from Phaser's measured bounds, so centred text never lands on a
 * half pixel. Owner: gameplay-engineer [scene].
 */
import { LINE_HEIGHT, textWidth } from '../fx';

const ADVANCE = 6;
const GLYPH_W = 5;

/** Width in px of the widest line of `text`, at integer `scale`. */
export function blockWidth(text: string, scale = 1): number {
  return Math.max(0, ...text.split('\n').map((line) => textWidth(line))) * scale;
}

export function blockHeight(text: string, scale = 1): number {
  return text.split('\n').length * LINE_HEIGHT * scale;
}

/** Left edge that centres a block of `width` px in `span` px, on a whole pixel. */
export function centeredX(span: number, width: number): number {
  return Math.floor((span - width) / 2);
}

/** Greedy word wrap to `maxWidthPx` (a word longer than a line is cut). Existing newlines are kept. */
export function wrapText(text: string, maxWidthPx: number): string {
  const perLine = Math.max(1, Math.floor((maxWidthPx + (ADVANCE - GLYPH_W)) / ADVANCE));
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      let rest = word;
      while (rest.length > perLine) {
        if (line !== '') {
          lines.push(line);
          line = '';
        }
        lines.push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
      const joined = line === '' ? rest : `${line} ${rest}`;
      if (joined.length <= perLine) line = joined;
      else {
        lines.push(line);
        line = rest;
      }
    }
    lines.push(line);
  }
  return lines.join('\n');
}

/** Free space beside the gear meter: where a title may start and the right margin it keeps. */
export interface TitleBounds {
  readonly minLeft: number;
  readonly rightMargin: number;
}

/**
 * Left edge of the title's box: centred, but never left of `minLeft` (the gear panel's right edge
 * plus a margin) and never past the right margin.
 */
export function titleLeft(span: number, boxW: number, bounds: TitleBounds): number {
  const centred = centeredX(span, boxW);
  return Math.max(bounds.minLeft, Math.min(centred, span - bounds.rightMargin - boxW));
}

/** The title that fits beside the gear meter: drops a trailing `[...]` suffix (the replay note) first. */
export function fitTitle(full: string, span: number, padX: number, bounds: TitleBounds): string {
  const room = span - bounds.rightMargin - bounds.minLeft - 2 * padX;
  if (blockWidth(full) <= room) return full;
  const short = full.replace(/\s+\[[^\]]*\]$/, '');
  return blockWidth(short) <= room ? short : short.slice(0, Math.max(1, Math.floor((room + 1) / ADVANCE)));
}
