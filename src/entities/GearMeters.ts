/**
 * The gear meters of a level: one full meter, or in Tandem two compact strips
 * (runner on top, twin below). Each frame it feeds them the bodies' models, the
 * fall cue's frame, and the parked flag (a body that is home shows the home
 * glyph, tandem.md S6). Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { SimParams, SimState } from '../core/types';
import { COMPACT_STRIP_LAYOUT, gearMeterModel, type GearMeterModel } from '../ui';
import { GearMeterView } from '../ui/GearMeterView';
import type { FallCue } from './FallCue';
import { GEAR_METER_AREA } from './GameHud';
import { TANDEM_STRIPS } from './tandemView';

/** Which strips show the home glyph: the runner's, and the twin's (false when there is no twin). */
export function parkedFlags(state: Pick<SimState, 'player' | 'twin'>): { readonly runner: boolean; readonly twin: boolean } {
  return { runner: state.player.home, twin: state.twin?.home ?? false };
}

export class GearMeters {
  private readonly runner: GearMeterView;
  private readonly twin: GearMeterView | null;

  constructor(scene: Phaser.Scene, tandem: boolean, reduced: boolean) {
    if (tandem) {
      const { runner, twin } = TANDEM_STRIPS;
      this.runner = new GearMeterView(scene, runner.x, runner.y, { layout: COMPACT_STRIP_LAYOUT, body: 'runner' });
      this.twin = new GearMeterView(scene, twin.x, twin.y, { layout: COMPACT_STRIP_LAYOUT, body: 'twin' });
    } else {
      this.runner = new GearMeterView(scene, GEAR_METER_AREA.x, GEAR_METER_AREA.y);
      this.twin = null;
    }
    this.setReducedMotion(reduced);
  }

  setReducedMotion(reduced: boolean): void {
    this.runner.setReducedMotion(reduced);
    this.twin?.setReducedMotion(reduced);
  }

  /** Once per frame; returns the runner's model (the debug snapshot shows it). */
  update(state: SimState, params: SimParams, fall: FallCue): GearMeterModel {
    const model = gearMeterModel(state.player, params);
    if (this.twin !== null && state.twin !== null) {
      const parked = parkedFlags(state);
      this.runner.setParked(parked.runner);
      this.twin.setParked(parked.twin);
      this.twin.update(gearMeterModel(state.twin, params), fall.meterFrame(1));
    }
    this.runner.update(model, fall.meterFrame(0));
    return model;
  }

  destroy(): void {
    this.runner.destroy();
    this.twin?.destroy();
  }
}
