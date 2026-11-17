/**
 * Advances the sim for the game scene: from the keyboard, or from recorded
 * frames (`?replay=1`), one frame per step. Owns the driver, so a restart in
 * replay mode swaps in a fresh one. Phaser-free. Owner: gameplay-engineer [scene].
 */
import type { InputFrame, Level, SimEvent, SimParams } from '../core';
import type { InputSampler } from './inputSampler';
import type { ReplayFeed } from './replay';
import { RunDriver, type FrameSupplier } from './runDriver';

/** Set while `?replay=1` is playing a solution; keyboard play is off then. */
export interface ReplayPlay {
  readonly feed: ReplayFeed;
  readonly speed: number | null;
}

export class RunControl {
  driver: RunDriver;
  /** R pressed while paused: the next live frame carries a restart press. */
  private pendingRestart = false;

  constructor(
    level: Level,
    params: SimParams,
    private readonly sampler: InputSampler,
    readonly replay: ReplayPlay | null,
  ) {
    this.driver = new RunDriver(level, params);
  }

  /** All sim events of the steps run for `deltaMs` of render time (so `died` and `won` are never lost). */
  advance(deltaMs: number): readonly SimEvent[] {
    const { replay, driver } = this;
    if (replay === null) return driver.advance(deltaMs, () => this.liveFrame());
    if (replay.feed.restartPressed(this.sampler.sample().restart)) this.restartReplay(replay.feed);
    const supply: FrameSupplier = () => replay.feed.next(this.driver.state);
    const events =
      replay.speed === null ? this.driver.advance(deltaMs, supply) : this.driver.advanceFixed(replay.speed, supply);
    if (replay.feed.isDone(this.driver.state)) this.driver.alpha = 1;
    return events;
  }

  /** Restart from the pause menu: as R in play does (a replay rewinds instead). */
  restart(): void {
    if (this.replay === null) this.pendingRestart = true;
    else this.restartReplay(this.replay.feed);
  }

  /** The keyboard frame for one step, plus the restart press queued from the pause menu. */
  private liveFrame(): InputFrame {
    const frame = this.sampler.sample();
    if (!this.pendingRestart) return frame;
    this.pendingRestart = false;
    return { ...frame, restart: true };
  }

  /** R while replaying: a fresh sim and the first frame again. */
  private restartReplay(feed: ReplayFeed): void {
    feed.rewind();
    this.driver = new RunDriver(this.driver.level, this.driver.params);
  }
}
