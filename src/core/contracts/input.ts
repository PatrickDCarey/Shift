/**
 * Input frames and solution recordings. Owner: tech-lead. Import via `src/core/types`.
 */

/**
 * LOGICAL actions sampled once per step, as HELD state. Physical keys never
 * reach the sim: the bindings module (ui-engineer) ORs every key bound to an
 * action (shiftUp = Right Shift | E | X, shiftDown = Left Shift | Q | Z, ...).
 *
 * The sim derives press edges itself: pressed = held now && !held in
 * `SimState.prevInput`. Shifts, jump and restart act on the press edge only,
 * so holding never repeats; left/right are used as held state plus their
 * press edges (direction priority). The sampler LATCHES taps: a key that went
 * down since the previous step counts as held for at least that step.
 * Recordings store exactly these frames, so replays reproduce runs bit for bit.
 */
export interface InputFrame {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly shiftUp: boolean;
  readonly shiftDown: boolean;
  /** Restart the run (R key). Press edge; see architecture.md §3.4. */
  readonly restart: boolean;
}

export type InputButton = keyof InputFrame;

/** Canonical button order, and the letter each uses in solution files. */
export const INPUT_BUTTONS: readonly InputButton[] = ['left', 'right', 'jump', 'shiftUp', 'shiftDown', 'restart'];

export const INPUT_LETTERS: Readonly<Record<InputButton, string>> = {
  left: 'L',
  right: 'R',
  jump: 'J',
  shiftUp: '+',
  shiftDown: '-',
  restart: '!',
};

/** Letter used in solution files for a frame with no buttons held. */
export const INPUT_NONE_LETTER = '.';

export const EMPTY_INPUT: InputFrame = {
  left: false,
  right: false,
  jump: false,
  shiftUp: false,
  shiftDown: false,
  restart: false,
};

/** A run of identical input frames: the unit of a solution recording. */
export interface InputRun {
  /** Number of consecutive steps, >= 1. */
  readonly count: number;
  readonly frame: InputFrame;
}

/** A parsed solution file (format: docs/tech/level-format.md). */
export interface Solution {
  readonly levelId: string;
  /** Must equal the level's `version`; a mismatch fails the replay test. */
  readonly levelVersion: number;
  /** Total frames since level load, equal to the sum of all run counts. */
  readonly steps: number;
  readonly runs: readonly InputRun[];
}
