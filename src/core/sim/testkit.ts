/**
 * TEST-ONLY helpers for the sim lane. Not exported from index.ts and never
 * used by game code. They build ASCII test levels, input frames from solution
 * letters, and run the real `step` over scripted inputs so the acceptance
 * checks in docs/design/features/ read like the spec text.
 *
 * Levels are built straight from TILE_LEGEND (same table as the level lane's
 * parser; `testkit.test.ts` checks both agree) so this file stays inside the
 * sim lane's allowed imports.
 */
import tuningJson from '../../data/tuning.json';
import {
  EMPTY_INPUT,
  INPUT_BUTTONS,
  INPUT_LETTERS,
  isTuning,
  PLAYER_START_CHAR,
  TWIN_START_CHAR,
  TILE_LEGEND,
  type Gear,
  type InputButton,
  type InputFrame,
  type Level,
  type SimParams,
  type SimState,
  type Tile,
  type Tuning,
  tuningErrors,
} from '../types';
import { createSim } from './create';
import { deriveParams } from './params';
import { step } from './step';

/** The shipped tuning, narrowed with the schema guard (fails loudly if it drifts). */
function shippedTuning(raw: unknown): Tuning {
  if (!isTuning(raw)) throw new Error(tuningErrors(raw).join('; '));
  return raw;
}

export const tuning: Tuning = shippedTuning(tuningJson);
export const params: SimParams = deriveParams(tuning);

/** A level from grid rows (legend chars plus one `@`). Meta is a fixed test header. */
export function gridLevel(rows: readonly string[], id = 'w0-99'): Level {
  const width = rows[0]?.length ?? 0;
  const startRow = rows.findIndex((r) => r.includes(PLAYER_START_CHAR));
  const isMarker = (ch: string): boolean => ch === PLAYER_START_CHAR || ch === TWIN_START_CHAR;
  const tiles = rows.flatMap((r) =>
    [...r].map((ch): Tile => (isMarker(ch) ? { kind: 'empty' } : (TILE_LEGEND[ch] ?? { kind: 'empty' }))),
  );
  const twinRow = rows.findIndex((r) => r.includes(TWIN_START_CHAR));
  return {
    meta: { id, title: 'test', world: 0, teaches: 'test', version: 1 },
    width,
    height: rows.length,
    tiles,
    start: { col: rows[startRow]?.indexOf(PLAYER_START_CHAR) ?? 0, row: startRow },
    twinStart: twinRow < 0 ? null : { col: rows[twinRow]?.indexOf(TWIN_START_CHAR) ?? 0, row: twinRow },
  };
}

/** `width` columns of `fill`, with `marks` (col -> chars) written over it. */
export function row(width: number, fill: string, marks: Readonly<Record<number, string>> = {}): string {
  return Object.entries(marks).reduce(
    (line, [col, chars]) => line.slice(0, Number(col)) + chars + line.slice(Number(col) + chars.length),
    fill.repeat(width),
  );
}

/** Chars written into a grid row at a column. */
export interface Placement {
  readonly row: number;
  readonly col: number;
  readonly chars: string;
}

/** Floor row of `room` levels: feet rest at y = FLOOR_ROW. */
export const FLOOR_ROW = 10;

/**
 * A 12-row test room: rows 0-9 open, `@` at (startCol, 9), floor rows 10-11
 * filled with `floor`, the exit tucked in the top-right corner (out of reach),
 * then `places` written over it.
 */
export function room(width: number, startCol: number, places: readonly Placement[] = [], floor = '#'): Level {
  const base = Array.from({ length: 12 }, (_, r) => {
    if (r === 0) return row(width, '.', { [width - 1]: 'E' });
    if (r === 9) return row(width, '.', { [startCol]: '@' });
    return row(width, r >= FLOOR_ROW ? floor : '.');
  });
  const rows = places.reduce(
    (acc, p) => acc.map((line, r) => (r === p.row ? line.slice(0, p.col) + p.chars + line.slice(p.col + p.chars.length) : line)),
    base,
  );
  return gridLevel(rows);
}

/** The same `chars` at `col` on each of `rows`. */
export const block = (rows: readonly number[], col: number, chars: string): Placement[] =>
  rows.map((r) => ({ row: r, col, chars }));

const LETTER_BUTTON: Readonly<Record<string, InputButton>> = Object.fromEntries(
  INPUT_BUTTONS.map((b) => [INPUT_LETTERS[b], b]),
);

/** Frame from solution letters, e.g. 'R+' or 'LJ'; '' or '.' = nothing held. */
export function frame(letters: string): InputFrame {
  return [...letters].reduce<InputFrame>((f, ch) => {
    const button = LETTER_BUTTON[ch];
    return button ? { ...f, [button]: true } : f;
  }, EMPTY_INPUT);
}

/** `count` copies of one frame. */
export const repeat = (count: number, letters: string): InputFrame[] =>
  Array.from({ length: count }, () => frame(letters));

/** Runs `frames` from `start`; returns the state after each frame (index i = action step i + 1). */
export function runFrames(level: Level, start: SimState, frames: readonly InputFrame[]): SimState[] {
  const out: SimState[] = [];
  frames.reduce((s, f) => {
    const next = step(s, f, level, params);
    out.push(next);
    return next;
  }, start);
  return out;
}

/** Runs `frames` from a fresh load. */
export const runFromSpawn = (level: Level, frames: readonly InputFrame[]): SimState[] =>
  runFrames(level, createSim(level, params), frames);

/** Final state after `frames` from `start`. */
export function advance(level: Level, start: SimState, frames: readonly InputFrame[]): SimState {
  return frames.reduce((s, f) => step(s, f, level, params), start);
}

/**
 * Frames that make the player cruise at `gear` holding `dir` (spawn in gear 1):
 * shift presses on odd steps 1, 3, 5 while holding, then `settle` more steps.
 */
export function cruiseFrames(gear: Gear, dir: 'L' | 'R' = 'R', settle = 60): InputFrame[] {
  const presses = gear - 1;
  const ramp = Array.from({ length: presses * 2 }, (_, i) => frame(i % 2 === 0 ? `${dir}+` : dir));
  return [...ramp, ...repeat(settle, dir)];
}

/** State cruising at `gear` (|vx| = gearSpeeds[gear]) after a fresh load. */
export function cruise(level: Level, gear: Gear, dir: 'L' | 'R' = 'R', settle = 60): SimState {
  return advance(level, createSim(level, params), cruiseFrames(gear, dir, settle));
}

/** 1-based index of the first state matching `pred`, or -1. */
export function firstStep(states: readonly SimState[], pred: (s: SimState) => boolean): number {
  return states.findIndex(pred) + 1 || -1;
}

/** State at 1-based action step n (throws if out of range so mistakes fail loudly). */
export function at(states: readonly SimState[], n: number): SimState {
  const s = states[n - 1];
  if (!s) throw new Error(`no state at step ${n}`);
  return s;
}

/** Event types emitted by a state's step. */
export const eventTypes = (s: SimState): string[] => s.events.map((e) => e.type);
