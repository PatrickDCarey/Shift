/**
 * `hint: <glyph> <col> <row>` header lines (docs/tech/level-format.md, "Hint
 * headers"). Two passes: `parseHintLines` checks each line on its own (token
 * count, glyph id, whole numbers, limit, duplicates) and runs while the header
 * is read; `checkHintAnchors` needs the grid (inside it, on a `.`) and runs
 * after it. Errors name the file, the header line and the bad token's column.
 */
import { HINT_GLYPHS, MAX_LEVEL_HINTS, type HintGlyph, type LevelHint } from '../types';
import { atPos, parseWholeNumber, type HeaderEntry } from './text';

/** The header key that may repeat. */
export const HINT_KEY = 'hint';

/** A syntactically valid hint with the file position of each token, for the grid check. */
export interface ParsedHint {
  readonly hint: LevelHint;
  /** 1-based header line number. */
  readonly line: number;
  /** 1-based columns where the column and row tokens start. */
  readonly colCol: number;
  readonly rowCol: number;
}

export interface HintLinesResult {
  readonly hints: readonly ParsedHint[];
  readonly errors: readonly string[];
}

/** What the anchor check needs to know about the grid: size and the raw character of each cell (row-major). */
export interface GridView {
  readonly width: number;
  readonly rows: number;
  readonly chars: readonly string[];
}

interface Token {
  readonly text: string;
  /** 1-based column in the file. */
  readonly col: number;
}

function tokenize(entry: HeaderEntry): readonly Token[] {
  return Array.from(entry.value.matchAll(/\S+/g), (m) => ({ text: m[0], col: entry.valueCol + (m.index ?? 0) }));
}

function isGlyph(id: string): id is HintGlyph {
  return (HINT_GLYPHS as readonly string[]).includes(id);
}

function readCoordinate(file: string, line: number, token: Token, what: 'column' | 'row', errors: string[]): number | null {
  const n = parseWholeNumber(token.text);
  if (n === null) {
    errors.push(atPos(file, line, token.col, `hint ${what} must be a whole number of 0 or more, found '${token.text}'`));
  }
  return n;
}

function parseOne(file: string, entry: HeaderEntry, errors: string[]): ParsedHint | null {
  const tokens = tokenize(entry);
  const [glyph, colTok, rowTok] = tokens;
  if (tokens.length !== 3 || !glyph || !colTok || !rowTok) {
    errors.push(atPos(file, entry.line, entry.valueCol, `hint needs '<glyph> <col> <row>' but found '${entry.value}'`));
    return null;
  }
  const before = errors.length;
  if (!isGlyph(glyph.text)) {
    const ids = HINT_GLYPHS.slice(0, -1).join(', ');
    const last = HINT_GLYPHS[HINT_GLYPHS.length - 1];
    errors.push(atPos(file, entry.line, glyph.col, `unknown hint glyph '${glyph.text}' (use ${ids} or ${last})`));
  }
  const col = readCoordinate(file, entry.line, colTok, 'column', errors);
  const row = readCoordinate(file, entry.line, rowTok, 'row', errors);
  if (errors.length > before || !isGlyph(glyph.text) || col === null || row === null) return null;
  return { hint: { glyph: glyph.text, anchor: { col, row } }, line: entry.line, colCol: colTok.col, rowCol: rowTok.col };
}

/** Checks each `hint:` line by itself, in file order. */
export function parseHintLines(file: string, entries: readonly HeaderEntry[]): HintLinesResult {
  const errors: string[] = [];
  const hints: ParsedHint[] = [];
  const seen = new Map<string, number>();
  entries.forEach((entry, i) => {
    if (i >= MAX_LEVEL_HINTS) {
      errors.push(atPos(file, entry.line, 1, `too many hint lines (at most ${MAX_LEVEL_HINTS} per level)`));
      return;
    }
    const parsed = parseOne(file, entry, errors);
    if (!parsed) return;
    const key = `${parsed.hint.glyph} ${parsed.hint.anchor.col} ${parsed.hint.anchor.row}`;
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push(atPos(file, entry.line, 1, `duplicate hint (the same glyph and anchor as line ${first})`));
      return;
    }
    seen.set(key, entry.line);
    hints.push(parsed);
  });
  return { hints, errors };
}

/** Each anchor must lie inside the grid and sit on a `.` (so not on `@`, `&`, `E` or any tile). */
export function checkHintAnchors(file: string, hints: readonly ParsedHint[], grid: GridView): readonly string[] {
  const errors: string[] = [];
  for (const { hint, line, colCol, rowCol } of hints) {
    const { col, row } = hint.anchor;
    if (col >= grid.width) {
      errors.push(atPos(file, line, colCol, `hint column ${col} is outside the grid (columns 0 to ${grid.width - 1})`));
    } else if (row >= grid.rows) {
      errors.push(atPos(file, line, rowCol, `hint row ${row} is outside the grid (rows 0 to ${grid.rows - 1})`));
    } else {
      const ch = grid.chars[row * grid.width + col];
      if (ch !== '.') {
        errors.push(atPos(file, line, colCol, `hint anchor (column ${col}, row ${row}) is '${ch}', not '.'`));
      }
    }
  }
  return errors;
}
