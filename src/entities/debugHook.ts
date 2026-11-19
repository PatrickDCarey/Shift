/**
 * `window.__redshift`, the read-only QA/replay hook, installed only when
 * `QA_HOOK` is true (dev and VITE_QA_HOOK=1 builds; the itch.io build has none).
 * Owner: gameplay-engineer [scene].
 */
import type { SimState } from '../core/types';
import type { RestartCardSnapshot } from './RestartCardController';
import type { GearMeterModel } from '../ui';
import { debugCues } from '../audio';
import type { CueLogEntry } from '../audio';
import { QA_HOOK } from './qaHook';

/** Read-only snapshot for QA and debugging in the browser console. */
export interface DebugHook {
  readonly levelId: string;
  readonly state: SimState;
  readonly replay: { readonly active: boolean; readonly done: boolean; readonly frames: number };
  /** The latest gear meter model (what the HUD meter is drawing). */
  readonly meter: GearMeterModel;
  /** Always null: the win banner is gone (the Results scene replaced it); kept so QA helpers compile. */
  readonly banner: null;
  /** The game's own pause flag; true from the moment Pause is launched until resume or restart. */
  readonly paused: boolean;
  /** The restart card while it shows: its screen rectangle in 480 x 270 px. Null while hidden. */
  readonly restartCard: RestartCardSnapshot | null;
  /** Audio QA state: `cues()` is the last 64 SFX cues requested, oldest first. */
  readonly audio: { readonly cues: () => CueLogEntry[] };
}

/** What the scene reads live each time QA touches the hook. */
export interface DebugSnapshot {
  readonly state: SimState;
  readonly replay: DebugHook['replay'];
  readonly meter: GearMeterModel;
  readonly paused: boolean;
  readonly restartCard: RestartCardSnapshot | null;
}

export interface DebugSource {
  readonly levelId: string;
  readonly read: () => DebugSnapshot;
}

export function installDebugHook(source: DebugSource): void {
  const { levelId, read } = source;
  const hook: DebugHook = {
    levelId,
    get state() {
      return read().state;
    },
    get replay() {
      return read().replay;
    },
    get meter() {
      return read().meter;
    },
    banner: null,
    get paused() {
      return read().paused;
    },
    get restartCard() {
      return read().restartCard;
    },
    audio: { cues: () => debugCues() },
  };
  if (QA_HOOK) Object.defineProperty(window, '__redshift', { value: hook, configurable: true });
}

export function removeDebugHook(): void {
  if (QA_HOOK) Reflect.deleteProperty(window, '__redshift');
}
