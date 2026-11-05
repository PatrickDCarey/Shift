/**
 * The pause flag and its rules (docs/design/features/pause.md). Pure.
 * The scene reads `paused` to skip the sim; the flag never changes the
 * sim's inputs or state.
 *
 * Owner: gameplay-engineer [scene].
 */

/** On-screen text of the M1 pause stand-in (the real overlay is ui-engineer's, M2-12). */
export const PAUSE_TEXT = 'PAUSED\nEsc / P: resume    R: restart';

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
