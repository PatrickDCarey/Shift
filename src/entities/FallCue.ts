/**
 * PT-3 in the scene: owns the tile rings (`WhyFellTracker` + `WhyFellView`) and
 * hands each gear meter its per-frame cue input (the `fallThrough` event, or
 * `respawn`), so the meter's `setNeededCue` logic (ui `updateCue`) runs from the
 * same event. One call per rendered frame.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { SimEvent, SimStatus } from '../core/types';
import type { GearMeterFrame } from '../ui/GearMeterView';
import { isRespawn, WhyFellTracker } from './whyFell';
import { WhyFellView } from './WhyFellView';

export class FallCue {
  private readonly tracker = new WhyFellTracker();
  private readonly view: WhyFellView;
  private prevStatus: SimStatus = 'playing';
  private events: readonly SimEvent[] = [];
  private respawn = false;

  constructor(
    scene: Phaser.Scene,
    private readonly tileSize: number,
    private reducedMotion: boolean,
  ) {
    this.view = new WhyFellView(scene);
  }

  /** This frame's sim events and status, and the render clock in ms. Draws the rings. */
  update(events: readonly SimEvent[], status: SimStatus, nowMs: number): void {
    this.events = events;
    this.respawn = isRespawn(this.prevStatus, status, events);
    this.prevStatus = status;
    if (this.respawn) this.tracker.clear();
    this.tracker.start(events, nowMs, this.tileSize);
    this.view.update(this.tracker.draw(nowMs, this.reducedMotion));
  }

  /** What `GearMeterView.update` takes for `body` this frame. */
  meterFrame(body: 0 | 1): GearMeterFrame {
    const event = this.events.find((e) => e.type === 'fallThrough' && e.body === body) ?? null;
    return { event, body, respawn: this.respawn };
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  destroy(): void {
    this.view.destroy();
  }
}
