/**
 * TEST-ONLY helpers for the HUD tests: a hand-built player state, and the real
 * sim driven over scripted inputs so the gear meter checks read like the spec
 * (docs/design/features/hud-gear-meter.md). Never imported by game code.
 *
 * Core access goes through the barrel only (architecture rule for code outside
 * src/core), so there is no sim testkit here: levels are parsed from text.
 */
import {
  createSim,
  deriveParams,
  EMPTY_INPUT,
  INPUT_BUTTONS,
  INPUT_LETTERS,
  isTuning,
  parseLevel,
  step,
  tuningErrors,
  type Gear,
  type InputButton,
  type InputFrame,
  type Level,
  type PlayerState,
  type SimParams,
  type SimState,
} from '../core';
import tuningJson from '../data/tuning.json';
import type { GearMeterParams } from './gearMeter';

/** Hand-written params for pure-model tests (the shipped numbers, spelled out). */
export const PARAMS: GearMeterParams = {
  gearSpeeds: [0, 3, 6, 9, 12],
  minGear: 1,
  airDragTilesPerGear: 6,
  airDragMinBand: 1,
};

export const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  gear: 1,
  band: 0,
  facing: 1,
  moveDir: 0,
  home: false,
  grounded: true,
  coyoteSteps: 0,
  jumpBufferSteps: 0,
  shiftBufferSteps: 0,
  shiftBufferNet: 0,
  graceSteps: 0,
  graceBand: null,
  airDistance: 0,
  ...over,
});

export const airborne = (over: Partial<PlayerState> = {}): PlayerState => player({ grounded: false, ...over });

// ---- the real sim ----------------------------------------------------------

if (!isTuning(tuningJson)) throw new Error(tuningErrors(tuningJson).join('; '));

/** Params derived from the shipped tuning.json. */
export const SIM_PARAMS: SimParams = deriveParams(tuningJson);

const LETTER_BUTTON: Readonly<Record<string, InputButton>> = Object.fromEntries(
  INPUT_BUTTONS.map((b) => [INPUT_LETTERS[b], b]),
);

/** Frame from solution letters ('R+', 'RJ', '!' = restart); '' = nothing held. */
export const frame = (letters: string): InputFrame =>
  [...letters].reduce<InputFrame>((f, ch) => {
    const button = LETTER_BUTTON[ch];
    return button ? { ...f, [button]: true } : f;
  }, EMPTY_INPUT);

export const repeat = (count: number, letters: string): InputFrame[] =>
  Array.from({ length: count }, () => frame(letters));

const GRID_ROWS = 12;
const FLOOR_ROW = 10;

/** A 12-row room: floor on rows 10-11 for the first `floorCols` columns, spawn at (2, 9). */
export function flatRoom(width = 400, floorCols = width): Level {
  const rows = Array.from({ length: GRID_ROWS }, (_, r) => {
    if (r === 0) return `${'.'.repeat(width - 1)}E`;
    if (r === 9) return `..@${'.'.repeat(width - 3)}`;
    return r >= FLOOR_ROW ? '#'.repeat(floorCols) + '.'.repeat(width - floorCols) : '.'.repeat(width);
  });
  const text = `id: w0-99\ntitle: test\nworld: 0\nteaches: test\nversion: 1\n---\n${rows.join('\n')}\n`;
  const parsed = parseLevel(text, 'w0-99');
  if (!parsed.ok) throw new Error(parsed.errors.join('; '));
  return parsed.value;
}

/** The state after each frame (index i = action step i + 1). */
export function runFrames(level: Level, start: SimState, frames: readonly InputFrame[]): SimState[] {
  const out: SimState[] = [];
  frames.reduce((s, f) => {
    const next = step(s, f, level, SIM_PARAMS);
    out.push(next);
    return next;
  }, start);
  return out;
}

export const spawn = (level: Level): SimState => createSim(level, SIM_PARAMS);

/** Shift presses on odd steps while holding `dir`, then `settle` steps: cruising at `gear`. */
export function cruiseFrames(gear: Gear, settle = 60): InputFrame[] {
  const ramp = Array.from({ length: (gear - 1) * 2 }, (_, i) => frame(i % 2 === 0 ? 'R+' : 'R'));
  return [...ramp, ...repeat(settle, 'R')];
}

export function cruise(level: Level, gear: Gear): SimState {
  const states = runFrames(level, spawn(level), cruiseFrames(gear));
  return states[states.length - 1] ?? spawn(level);
}

/** 1-based state at action step n; throws on a bad index so mistakes fail loudly. */
export function at(states: readonly SimState[], n: number): SimState {
  const s = states[n - 1];
  if (!s) throw new Error(`no state at step ${n}`);
  return s;
}

/** 1-based index of the first state matching `pred`, or -1. */
export const firstStep = (states: readonly SimState[], pred: (s: SimState) => boolean): number =>
  states.findIndex(pred) + 1 || -1;

export const hasEvent =
  (type: string) =>
  (s: SimState): boolean =>
    s.events.some((e) => e.type === type);
