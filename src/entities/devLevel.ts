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

export const DEV_TANDEM_ID = 'w0-97';
const TANDEM_WIDTH = 60;

function tandemRows(): readonly string[] {
  const open = '.'.repeat(TANDEM_WIDTH);
  const laneRow = (start: string, wall: string): string => {
    const cells = [...open];
    cells[1] = start;
    cells[20] = wall;
    cells[TANDEM_WIDTH - 3] = 'E';
    return cells.join('');
  };
  const floor = '#'.repeat(TANDEM_WIDTH);
  const wallOnly = (): string => `${'.'.repeat(20)}#${'.'.repeat(TANDEM_WIDTH - 21)}`;
  return [
    ...Array<string>(5).fill(open),
    laneRow('@', '.'),
    floor,
    floor,
    ...Array<string>(5).fill(wallOnly()),
    laneRow('&', '#'),
    floor,
  ];
}

/**
 * Dev-only Tandem room (`?level=w0-97` in `npm run dev`; never shipped, never in `levels/`):
 * two stacked lanes, a wall that holds the twin at column 20, and the runner's free run to its
 * exit. The bodies drift past the 28-tile limit, so the camera follows the runner and the edge arrow shows.
 */
export function devTandemLevel(): Level {
  const text = [`id: ${DEV_TANDEM_ID}`, 'title: Dev Tandem', 'world: 0', 'teaches: dev tandem scene', 'version: 1', '---', ...tandemRows()].join('\n');
  const parsed = parseLevel(text, DEV_TANDEM_ID);
  if (!parsed.ok) throw new Error(`built-in dev tandem level is invalid:\n${parsed.errors.join('\n')}`);
  return parsed.value;
}
