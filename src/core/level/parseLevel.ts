/**
 * Level file parser (docs/tech/level-format.md section 2). Pure; returns
 * ok/errors values, never throws. Errors read `w1-01.txt:7:3: message` with
 * 1-based file line and column, so level-designer can jump straight to them.
 */
import {
  PLAYER_START_CHAR,
  RESERVED_CHARS,
  TILE_LEGEND,
  TWIN_START_CHAR,
  type Level,
  type LevelMeta,
  type ParseLevelFn,
  type Tile,
  type TilePos,
} from '../types';
import { checkHintAnchors, HINT_KEY, parseHintLines, type ParsedHint } from './hints';
import { MAX_WORLD } from './limits';
import {
  atPos,
  capErrors,
  inFile,
  isSeparator,
  missingKeyErrors,
  parseWholeNumber,
  readHeader,
  splitLines,
  splitSections,
  type HeaderEntry,
  type SourceLine,
} from './text';

const REQUIRED_KEYS = ['id', 'title', 'world', 'teaches', 'version'] as const;
const ALLOWED_KEYS = [...REQUIRED_KEYS, HINT_KEY];
const LEGEND_HINT = 'see the legend in docs/tech/level-format.md';
const RESERVED_NAMES: Readonly<Record<string, string>> = { X: 'crate', M: 'moving platform' };

/** How a character reads in an error message: 'Q', space, or U+00E9. */
function describeChar(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  if (ch === ' ') return 'space';
  if (code > 0x20 && code < 0x7f) return `'${ch}'`;
  return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
}

// --- header ---

interface MetaResult {
  readonly meta: LevelMeta | null;
  /** The hint lines that read cleanly; their anchors are checked against the grid later. */
  readonly hints: readonly ParsedHint[];
  readonly errors: readonly string[];
}

function readText(file: string, key: string, e: HeaderEntry | undefined, errors: string[]): string {
  if (!e) return '';
  if (e.value === '') errors.push(atPos(file, e.line, e.valueCol, `${key} must not be empty`));
  return e.value;
}

function readInteger(file: string, e: HeaderEntry | undefined, errors: string[], min: number, max: number, what: string): number {
  if (!e) return min;
  const n = parseWholeNumber(e.value);
  if (n === null || n < min || n > max) {
    errors.push(atPos(file, e.line, e.valueCol, `${what}, found '${e.value}'`));
    return min;
  }
  return n;
}

function parseHeader(file: string, stem: string, header: readonly SourceLine[], separatorLine: number): MetaResult {
  const { entries, repeated, errors: lineErrors } = readHeader(file, header, ALLOWED_KEYS, [HINT_KEY]);
  const errors: string[] = [...lineErrors, ...missingKeyErrors(file, entries, REQUIRED_KEYS, separatorLine)];
  const hintLines = parseHintLines(file, repeated.get(HINT_KEY) ?? []);
  errors.push(...hintLines.errors);
  const idEntry = entries.get('id');
  if (idEntry && idEntry.value !== stem) {
    errors.push(atPos(file, idEntry.line, idEntry.valueCol, `id '${idEntry.value}' must equal the file name '${stem}'`));
  }
  const meta: LevelMeta = {
    id: idEntry?.value ?? '',
    title: readText(file, 'title', entries.get('title'), errors),
    world: readInteger(file, entries.get('world'), errors, 0, MAX_WORLD, `world must be an integer from 0 to ${MAX_WORLD}`),
    teaches: readText(file, 'teaches', entries.get('teaches'), errors),
    version: readInteger(file, entries.get('version'), errors, 1, Number.MAX_SAFE_INTEGER, 'version must be an integer of at least 1'),
    ...(hintLines.hints.length > 0 ? { hints: hintLines.hints.map((h) => h.hint) } : {}),
  };
  return { meta: errors.length === 0 ? meta : null, hints: hintLines.hints, errors };
}

// --- grid ---

/** A `@` cell with the file line it was found on (for "the first is at ..." messages). */
interface StartMark extends TilePos {
  readonly line: number;
}

/** Accumulator for one pass over the grid rows (local to this file). */
interface GridScan {
  readonly tiles: Tile[];
  /** The raw file character of each cell, row-major (what a hint anchor is checked against). */
  readonly chars: string[];
  readonly errors: string[];
  readonly starts: StartMark[];
  readonly twins: StartMark[];
  readonly width: number;
  rows: number;
  /** True once a row has the wrong width; cell indexes are then unreliable. */
  ragged: boolean;
}

function classify(ch: string): { tile: Tile } | { start: true } | { twin: true } | { error: string } {
  if (ch === PLAYER_START_CHAR) return { start: true };
  if (ch === TWIN_START_CHAR) return { twin: true };
  if (Object.hasOwn(TILE_LEGEND, ch)) return { tile: TILE_LEGEND[ch] as Tile };
  if (RESERVED_CHARS.includes(ch)) {
    return { error: `reserved character '${ch}' (${RESERVED_NAMES[ch] ?? 'later world'}) is not supported yet` };
  }
  return { error: `unknown tile character ${describeChar(ch)} (${LEGEND_HINT})` };
}

function checkStart(file: string, line: SourceLine, col: number, scan: GridScan): void {
  const first = scan.starts[0];
  if (first) {
    const where = `the first is at line ${first.line}, column ${first.col + 1}; exactly one is allowed`;
    scan.errors.push(atPos(file, line.no, col, `second player start '${PLAYER_START_CHAR}' (${where})`));
  }
  scan.starts.push({ col: col - 1, row: scan.rows, line: line.no });
}

function checkTwin(file: string, line: SourceLine, col: number, scan: GridScan): void {
  const first = scan.twins[0];
  if (first) {
    const where = `the first is at line ${first.line}, column ${first.col + 1}; at most one is allowed`;
    scan.errors.push(atPos(file, line.no, col, `second twin start '${TWIN_START_CHAR}' (${where})`));
  }
  scan.twins.push({ col: col - 1, row: scan.rows, line: line.no });
}

function scanRow(file: string, line: SourceLine, scan: GridScan): void {
  const chars = Array.from(line.text);
  if (chars.length !== scan.width) {
    const col = Math.min(chars.length, scan.width) + 1;
    const found = `row has ${chars.length} tiles but the first row has ${scan.width}`;
    scan.errors.push(atPos(file, line.no, col, `${found} (all rows must have the same width)`));
    scan.ragged = true;
  }
  chars.forEach((ch, i) => {
    const kind = classify(ch);
    if ('error' in kind) {
      scan.errors.push(atPos(file, line.no, i + 1, kind.error));
      return;
    }
    if ('start' in kind) checkStart(file, line, i + 1, scan);
    if ('twin' in kind) checkTwin(file, line, i + 1, scan);
    scan.chars.push(ch);
    scan.tiles.push('tile' in kind ? kind.tile : { kind: 'empty' });
  });
  scan.rows += 1;
}

/** Rows up to the last non-blank line; blank lines after that are ignored. */
function trimTrailingBlank(body: readonly SourceLine[]): readonly SourceLine[] {
  let end = body.length;
  while (end > 0 && (body[end - 1]?.text.trim() ?? 'x') === '') end -= 1;
  return body.slice(0, end);
}

function scanGrid(file: string, body: readonly SourceLine[]): GridScan {
  const firstRow = body.find((l) => l.text.trim() !== '' && !isSeparator(l));
  const width = Array.from(firstRow?.text ?? '').length;
  const scan: GridScan = { tiles: [], chars: [], errors: [], starts: [], twins: [], width, rows: 0, ragged: false };
  for (const line of body) {
    if (line.text.trim() === '') {
      scan.errors.push(atPos(file, line.no, 1, 'blank line inside the grid (rows must be contiguous)'));
    } else if (isSeparator(line)) {
      scan.errors.push(atPos(file, line.no, 1, "a second '---' section is not supported yet"));
    } else {
      scanRow(file, line, scan);
    }
  }
  return scan;
}

/** The twin spawns in a box overlapping its own cell: an exit right above or below it would be reached at once. */
function twinExitErrors(file: string, scan: GridScan): readonly string[] {
  const twin = scan.twins[0];
  if (!twin || scan.ragged) return [];
  const exitAt = (row: number): boolean => scan.tiles[row * scan.width + twin.col]?.kind === 'exit';
  const where = (side: string, why: string): string =>
    atPos(file, twin.line, twin.col + 1, `twin start '${TWIN_START_CHAR}' has an exit 'E' directly ${side} it (${why})`);
  const errors: string[] = [];
  if (twin.row > 0 && exitAt(twin.row - 1)) errors.push(where('above', 'the twin would finish on step 1'));
  if (twin.row + 1 < scan.rows && exitAt(twin.row + 1)) errors.push(where('below', 'the twin would fall into it'));
  return errors;
}

function gridChecks(file: string, scan: GridScan, firstLine: number): readonly string[] {
  const errors = [...scan.errors];
  if (scan.starts.length === 0) {
    errors.push(atPos(file, firstLine, 1, `no player start '${PLAYER_START_CHAR}' in the grid (exactly one is required)`));
  }
  if (!scan.tiles.some((t) => t.kind === 'exit')) {
    errors.push(atPos(file, firstLine, 1, "no exit 'E' in the grid (at least one is required)"));
  }
  return [...errors, ...twinExitErrors(file, scan)];
}

function buildLevel(meta: LevelMeta, scan: GridScan): Level {
  const start = scan.starts[0];
  const twin = scan.twins[0];
  return {
    meta,
    width: scan.width,
    height: scan.rows,
    tiles: scan.tiles,
    start: { col: start?.col ?? 0, row: start?.row ?? 0 },
    twinStart: twin ? { col: twin.col, row: twin.row } : null,
  };
}

function hintErrors(file: string, hints: readonly ParsedHint[], scan: GridScan): readonly string[] {
  if (scan.ragged) return [];
  return checkHintAnchors(file, hints, { width: scan.width, rows: scan.rows, chars: scan.chars });
}

export const parseLevel: ParseLevelFn = (text, fileStem) => {
  const file = `${fileStem}.txt`;
  const sections = splitSections(splitLines(text));
  if (sections.separatorLine === null) {
    return { ok: false, errors: [inFile(file, "missing the '---' line that ends the header and starts the grid")] };
  }
  const head = parseHeader(file, fileStem, sections.header, sections.separatorLine);
  const body = trimTrailingBlank(sections.body);
  if (body.length === 0) {
    const empty = atPos(file, sections.separatorLine, 1, 'the grid is empty (nothing after the --- line)');
    return { ok: false, errors: capErrors([...head.errors, empty]) };
  }
  const scan = scanGrid(file, body);
  const errors = [
    ...head.errors,
    ...hintErrors(file, head.hints, scan),
    ...gridChecks(file, scan, body[0]?.no ?? sections.separatorLine),
  ];
  if (errors.length > 0 || head.meta === null) return { ok: false, errors: capErrors(errors) };
  return { ok: true, value: buildLevel(head.meta, scan) };
};
