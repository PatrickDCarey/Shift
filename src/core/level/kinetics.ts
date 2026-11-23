/**
 * `mover:`, `emitter:` and `sweep:` header lines (docs/tech/level-format.md,
 * section 2 "Kinetic headers"). `parseKineticLines` checks each line on its
 * own while the header is read; `checkKineticGrid` needs the grid (cells inside
 * it, on a `.`, lanes in bounds) and runs after it. Errors name the file, the
 * header line and the column where the bad token starts. Cycle maths is
 * integer only and local to this lane (no import from src/core/motion). The
 * per-piece code is in kineticMovers.ts and kineticShots.ts, the shared
 * readers in kineticRead.ts.
 */
import { MAX_EMITTERS, MAX_MOVERS, type Emitter, type Mover, type Sweep } from '../types';
import type { GridView } from './hints';
import { moverErrors, parseMover } from './kineticMovers';
import { emitterErrors, parseEmitter, parseSweep } from './kineticShots';
import { atPos, type HeaderEntry } from './text';

import type { Placed } from './kineticRead';

export type { Placed };

export const MOVER_KEY = 'mover';
export const EMITTER_KEY = 'emitter';
export const SWEEP_KEY = 'sweep';
export const KINETIC_KEYS = [MOVER_KEY, EMITTER_KEY, SWEEP_KEY] as const;

export interface KineticLines {
  readonly movers: readonly Placed<Mover>[];
  readonly emitters: readonly Placed<Emitter>[];
  readonly sweep: Sweep | null;
  readonly errors: readonly string[];
}

type Repeated = ReadonlyMap<string, readonly HeaderEntry[]>;

function parseAll<T>(
  entries: readonly HeaderEntry[],
  max: number,
  name: string,
  file: string,
  errors: string[],
  one: (e: HeaderEntry) => T | null,
): T[] {
  const out: T[] = [];
  entries.forEach((entry, i) => {
    if (i >= max) {
      errors.push(atPos(file, entry.line, 1, `too many ${name} lines (at most ${max} per level)`));
      return;
    }
    const parsed = one(entry);
    if (parsed) out.push(parsed);
  });
  return out;
}

/** Checks each kinetic line by itself, in file order. */
export function parseKineticLines(file: string, repeated: Repeated): KineticLines {
  const errors: string[] = [];
  const movers = parseAll(repeated.get(MOVER_KEY) ?? [], MAX_MOVERS, 'mover:', file, errors, (e) => parseMover(file, e, errors));
  const emitters = parseAll(repeated.get(EMITTER_KEY) ?? [], MAX_EMITTERS, 'emitter:', file, errors, (e) => parseEmitter(file, e, errors));
  const sweeps = repeated.get(SWEEP_KEY) ?? [];
  for (const e of sweeps.slice(1)) {
    errors.push(atPos(file, e.line, 1, `only one sweep: line is allowed (the first is on line ${sweeps[0]?.line})`));
  }
  const first = sweeps[0];
  const sweep = first ? parseSweep(file, first, errors) : null;
  return { movers, emitters, sweep, errors };
}


/** Cells in the grid on a `.`, tracks and lanes in bounds, sweep x0 not past the right edge. */
export function checkKineticGrid(file: string, lines: KineticLines, grid: GridView, sweepLine: HeaderEntry | undefined): readonly string[] {
  const errors = [...lines.movers.flatMap((m) => moverErrors(file, m, grid)), ...lines.emitters.flatMap((e) => emitterErrors(file, e, grid))];
  if (lines.sweep && sweepLine && lines.sweep.x0 > grid.width) {
    errors.push(atPos(file, sweepLine.line, sweepLine.valueCol, `sweep x0 ${lines.sweep.x0} is past the right edge (level width ${grid.width})`));
  }
  return errors;
}
