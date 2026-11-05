/**
 * Text plumbing shared by the level and solution parsers: line splitting
 * (LF, CRLF, BOM), header/body sections, `key: value` headers and error
 * formatting. Errors read `file:line:column: message` (1-based).
 */
import { MAX_REPORTED_ERRORS } from './limits';

export interface SourceLine {
  /** 1-based line number in the original file. */
  readonly no: number;
  readonly text: string;
}

export interface Sections {
  /** Lines before the first `---` line. */
  readonly header: readonly SourceLine[];
  /** Lines after it. */
  readonly body: readonly SourceLine[];
  /** Line number of the `---` line, or null when it is missing. */
  readonly separatorLine: number | null;
}

export interface HeaderEntry {
  readonly value: string;
  readonly line: number;
  /** 1-based column where the value starts. */
  readonly valueCol: number;
}

export interface HeaderResult {
  readonly entries: ReadonlyMap<string, HeaderEntry>;
  /** Every line of each repeatable key, in file order (empty list when the key never appears). */
  readonly repeated: ReadonlyMap<string, readonly HeaderEntry[]>;
  readonly errors: readonly string[];
}

const BOM = '\uFEFF';

export function atPos(file: string, line: number, col: number, message: string): string {
  return `${file}:${line}:${col}: ${message}`;
}

export function inFile(file: string, message: string): string {
  return `${file}: ${message}`;
}

/** Keeps the first MAX_REPORTED_ERRORS errors and says how many were left out. */
export function capErrors(errors: readonly string[]): readonly string[] {
  if (errors.length <= MAX_REPORTED_ERRORS) return errors;
  const hidden = errors.length - MAX_REPORTED_ERRORS;
  return [...errors.slice(0, MAX_REPORTED_ERRORS), `(${hidden} more error${hidden === 1 ? '' : 's'} not shown)`];
}

/** Splits on LF or CRLF after dropping one leading BOM; a final newline adds no extra line. */
export function splitLines(text: string): readonly SourceLine[] {
  const clean = text.startsWith(BOM) ? text.slice(1) : text;
  const raw = clean.split(/\r?\n/);
  if (raw.length > 0 && raw[raw.length - 1] === '') raw.pop();
  return raw.map((t, i) => ({ no: i + 1, text: t }));
}

export function isSeparator(line: SourceLine): boolean {
  return line.text.trimEnd() === '---';
}

export function splitSections(lines: readonly SourceLine[]): Sections {
  const at = lines.findIndex(isSeparator);
  if (at < 0) return { header: lines, body: [], separatorLine: null };
  return { header: lines.slice(0, at), body: lines.slice(at + 1), separatorLine: lines[at]?.no ?? null };
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row.push(Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost));
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
}

/** The allowed key closest to a mistyped one (case-insensitive, at most 2 edits), if any. */
function suggestKey(key: string, allowed: readonly string[]): string | null {
  const lower = key.toLowerCase();
  const scored = allowed.map((k) => ({ k, d: editDistance(lower, k.toLowerCase()) }));
  const best = scored.reduce((a, b) => (b.d < a.d ? b : a), { k: '', d: Number.POSITIVE_INFINITY });
  return best.d <= 2 ? best.k : null;
}

function unknownKeyMessage(key: string, allowed: readonly string[]): string {
  const hint = suggestKey(key, allowed);
  const did = hint ? ` (did you mean '${hint}'?)` : '';
  return `unknown header key '${key}'${did}; allowed keys: ${allowed.join(', ')}`;
}

function headerEntry(line: SourceLine, colon: number): HeaderEntry {
  const rest = line.text.slice(colon + 1);
  const lead = rest.length - rest.trimStart().length;
  return { value: rest.trim(), line: line.no, valueCol: colon + 1 + lead + 1 };
}

/**
 * Reads `key: value` lines. Blank lines and lines starting with `#` are
 * skipped. Reports lines that are not `key: value`, unknown keys and repeats.
 * Keys in `repeatable` (which must also be in `allowed`) may appear many times
 * and are collected in `repeated` instead of `entries`.
 */
export function readHeader(
  file: string,
  lines: readonly SourceLine[],
  allowed: readonly string[],
  repeatable: readonly string[] = [],
): HeaderResult {
  const entries = new Map<string, HeaderEntry>();
  const repeated = new Map<string, HeaderEntry[]>(repeatable.map((k) => [k, []]));
  const errors: string[] = [];
  for (const line of lines) {
    const trimmed = line.text.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const colon = line.text.indexOf(':');
    const key = colon < 0 ? '' : line.text.slice(0, colon).trim();
    if (key === '' || /\s/.test(key)) {
      errors.push(atPos(file, line.no, 1, `expected 'key: value' but found '${trimmed}'`));
    } else if (!allowed.includes(key)) {
      errors.push(atPos(file, line.no, 1, unknownKeyMessage(key, allowed)));
    } else if (repeated.has(key)) {
      repeated.get(key)?.push(headerEntry(line, colon));
    } else if (entries.has(key)) {
      const first = entries.get(key)?.line ?? 0;
      errors.push(atPos(file, line.no, 1, `header key '${key}' is repeated (first set on line ${first})`));
    } else {
      entries.set(key, headerEntry(line, colon));
    }
  }
  return { entries, repeated, errors };
}

/** One error per required key that the header does not contain, placed at `line`. */
export function missingKeyErrors(
  file: string,
  entries: ReadonlyMap<string, HeaderEntry>,
  required: readonly string[],
  line: number,
): readonly string[] {
  return required
    .filter((k) => !entries.has(k))
    .map((k) => atPos(file, line, 1, `missing required header key '${k}'`));
}

/** A plain non-negative decimal integer without leading zeros, or null. */
export function parseWholeNumber(value: string): number | null {
  return /^(0|[1-9][0-9]*)$/.test(value) ? Number(value) : null;
}
