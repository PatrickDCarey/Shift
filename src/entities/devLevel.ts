/**
 * Built-in fallback room, used only when no level file can be loaded, so the
 * scene always has something to run. Not part of `levels/`, so it needs no
 * solution recording. Owner: gameplay-engineer [scene].
 */
import { parseLevel, type Level } from '../core';

export const DEV_LEVEL_ID = 'w0-00';

const WIDTH = 40;
const OPEN_ROW = '.'.repeat(WIDTH);
// Safe run-up, a blue strip, a safe landing, a green strip, then safe floor to the exit.
const FLOOR_ROW = '#'.repeat(7) + 'B'.repeat(8) + '#'.repeat(5) + 'G'.repeat(8) + '#'.repeat(12);
const START_ROW = `.@${'.'.repeat(WIDTH - 4)}E.`;

const GRID: readonly string[] = [...Array<string>(8).fill(OPEN_ROW), START_ROW, FLOOR_ROW];

export const DEV_LEVEL_TEXT = [
  `id: ${DEV_LEVEL_ID}`,
  'title: Dev Room',
  'world: 0',
  'teaches: built-in fallback room',
  'version: 1',
  '---',
  ...GRID,
].join('\n');

/** The fallback level. Parsing a constant cannot fail unless the format changes, so fail loudly. */
export function devLevel(): Level {
  const parsed = parseLevel(DEV_LEVEL_TEXT, DEV_LEVEL_ID);
  if (!parsed.ok) throw new Error(`built-in dev level is invalid:\n${parsed.errors.join('\n')}`);
  return parsed.value;
}
