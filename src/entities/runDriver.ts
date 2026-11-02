/**
 * Drives the deterministic sim from render frames: the fixed-step accumulator
 * of architecture.md section 4, plus the scene-level rules the sim leaves to
 * us (a new run after `won`) and the input recording. Phaser-free.
 *
 * Owner: gameplay-engineer [scene].
 */
import {
  createSim,
  step,
  type InputFrame,
  type Level,
  type SimEvent,
  type SimParams,
  type SimState,
} from '../core';
import { advanceClock } from './interpolation';

export class RunDriver {
  /** State after the latest step. */
  state: SimState;
  /** State before the latest step, for render interpolation. */
  prev: SimState;
  /** Blend between `prev` and `state` for drawing, 0..1. */
  alpha = 0;
  /** Every frame played since the level loaded (or since the last win), deaths and restarts included. */
  private frames: InputFrame[] = [];
  private acc = 0;
  private readonly stepMs: number;

  constructor(
    readonly level: Level,
    readonly params: SimParams,
  ) {
    this.state = createSim(level, params);
    this.prev = this.state;
    this.stepMs = 1000 / params.stepHz;
  }

  /** A copy of the recorded input frames (encode with `encodeRuns` to save a solution). */
  get recording(): readonly InputFrame[] {
    return [...this.frames];
  }

  /**
   * Run the steps due for `deltaMs` of render time. `sample` is called once
   * per step. Returns the events of every step run, in order.
   */
  advance(deltaMs: number, sample: () => InputFrame): readonly SimEvent[] {
    const clock = advanceClock(this.acc, deltaMs, this.stepMs);
    this.acc = clock.acc;
    this.alpha = clock.alpha;
    const events: SimEvent[] = [];
    for (let i = 0; i < clock.steps; i += 1) events.push(...this.stepOnce(sample()));
    return events;
  }

  private stepOnce(frame: InputFrame): readonly SimEvent[] {
    this.prev = this.state;
    if (this.state.status === 'won' && frame.restart && !this.state.prevInput.restart) {
      this.startNewRun(frame);
      return [];
    }
    this.frames.push(frame);
    this.state = step(this.state, frame, this.level, this.params);
    return this.state.events;
  }

  /** After a win the sim is terminal; the scene starts a fresh run (architecture.md section 3.4). */
  private startNewRun(frame: InputFrame): void {
    this.frames = [];
    // Like the sim's own respawn: buttons held through the restart are not new presses.
    this.state = { ...createSim(this.level, this.params), prevInput: frame };
  }
}
