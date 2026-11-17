/**
 * The pause flag and its rules (docs/design/features/pause.md). Pure.
 * The scene reads `paused` to skip the sim; the flag never changes the
 * sim's inputs or state.
 *
 * Owner: gameplay-engineer [scene].
 */

import type { PressKind } from './inputSampler';

export type PauseChange = 'paused' | 'resumed' | null;

export class PauseState {
  private on = false;

  get paused(): boolean {
    return this.on;
  }

  /**
   * Esc or P. `canPause` is false after the win step (the results screen owns
   * the screen); a paused game can always be resumed.
   */
  toggle(canPause: boolean): PauseChange {
    if (this.on) {
      this.on = false;
      return 'resumed';
    }
    if (!canPause) return null;
    this.on = true;
    return 'paused';
  }

  /** Focus loss (window blur, tab hidden). True when this call paused the game. */
  pauseOnFocusLoss(canPause: boolean): boolean {
    if (this.on || !canPause) return false;
    this.on = true;
    return true;
  }

  /** True when the game was paused. */
  resume(): boolean {
    const was = this.on;
    this.on = false;
    return was;
  }

  reset(): void {
    this.on = false;
  }
}

/**
 * Should this frame's queued presses open the pause? Any Esc/P press does, once,
 * however many arrived; nothing while paused (the overlay owns the keys) or when
 * pausing is off (after the win step). Pure.
 */
export function pauseWanted(presses: readonly PressKind[], paused: boolean, canPause: boolean): boolean {
  return !paused && canPause && presses.includes('pause');
}
