/**
 * The runner's and twin's views and the per-frame glue around them: snap feet to whole
 * pixels, turn sim events into body pulses and fx, draw both views, hand the camera its bodies.
 * Renderer only; never writes back to the sim.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { SimEvent, SimState, Tuning } from '../core/types';
import { snapFeet, type CameraBody } from './camera';
import type { FeedbackFx } from './FeedbackFx';
import { renderBodyPosition } from './interpolation';
import { PlayerView } from './PlayerView';

export interface Feet {
  readonly px: number;
  readonly py: number;
}

/** Each body's snapped feet; `twin` is null when the level has no such body. */
export interface SnappedBodies {
  readonly runner: Feet;
  readonly twin: Feet | null;
}

type Centre = { readonly x: number; readonly y: number };

function snapBody(prev: SimState, state: SimState, alpha: number, body: 0 | 1, ts: number): Feet | null {
  const pos = renderBodyPosition(prev, state, alpha, body);
  return pos === null ? null : snapFeet(pos.x, pos.y, ts);
}

/** Snap each body's feet to whole pixels once; the camera derives from these. */
export function snapBodies(prev: SimState, state: SimState, alpha: number, ts: number): SnappedBodies {
  return {
    runner: snapBody(prev, state, alpha, 0, ts) ?? snapFeet(state.player.x, state.player.y, ts),
    twin: snapBody(prev, state, alpha, 1, ts),
  };
}

/** The bodies the camera follows (the twin only when both the snap and the state have one). */
export function cameraBodies(snapped: SnappedBodies, state: SimState): CameraBody[] {
  const bodies: CameraBody[] = [{ ...snapped.runner, home: state.player.home }];
  if (snapped.twin !== null && state.twin !== null) bodies.push({ ...snapped.twin, home: state.twin.home });
  return bodies;
}

/** Body centres (half a body above the feet) for effects. */
export function bodyCentres(snapped: SnappedBodies, bodyHeightPx: number): { readonly runner: Centre; readonly twin: Centre | null } {
  const half = bodyHeightPx / 2;
  const { runner, twin } = snapped;
  return { runner: { x: runner.px, y: runner.py - half }, twin: twin === null ? null : { x: twin.px, y: twin.py - half } };
}

export class BodyViews {
  private readonly runnerView: PlayerView;
  /** Created on first sight of `state.twin` (one instance per body). */
  private twinView: PlayerView | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tuning: Tuning,
    private readonly fx: FeedbackFx,
    private reduced: boolean,
  ) {
    this.runnerView = new PlayerView(scene, 'runner', tuning, reduced);
  }

  get bodyHeightPx(): number {
    return Math.round(this.tuning.playerHeightTiles * this.tuning.tileSize);
  }

  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
    this.runnerView.setReducedMotion(reduced);
    this.twinView?.setReducedMotion(reduced);
  }

  /** Pulses and fx for this frame's sim events. */
  react(events: readonly SimEvent[], snapped: SnappedBodies): void {
    const { runner, twin } = bodyCentres(snapped, this.bodyHeightPx);
    for (const e of events) {
      if (e.type === 'airDrag') {
        const at = e.body === 0 ? runner : twin;
        if (at !== null) this.fx.airDrag(at.x, at.y);
      } else if (e.type === 'died') this.fx.died();
      else if (e.type === 'land') this.viewFor(e.body)?.pulse('land');
      else if (e.type === 'jump') this.viewFor(e.body)?.pulse('jump');
      else if (e.type === 'bandChange') this.viewFor(e.body)?.pulse('shift');
    }
  }

  draw(snapped: SnappedBodies, state: SimState): void {
    const dead = state.status === 'dead' || state.status === 'restarting';
    this.runnerView.draw(snapped.runner.px, snapped.runner.py, state.player, dead);
    if (state.twin !== null && snapped.twin !== null) {
      this.twinView ??= new PlayerView(this.scene, 'twin', this.tuning, this.reduced);
      this.twinView.draw(snapped.twin.px, snapped.twin.py, state.twin, dead);
    }
  }

  destroy(): void {
    this.runnerView.destroy();
    this.twinView?.destroy();
    this.twinView = null;
  }

  private viewFor(body: number): PlayerView | null {
    return body === 0 ? this.runnerView : this.twinView;
  }
}
