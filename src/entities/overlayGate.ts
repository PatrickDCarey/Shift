/**
 * While Pause or Results is open the game scene must ignore the keys those
 * overlays own (Esc, P, R, Enter, Space). Pure; time is passed in.
 *
 * Two hazards it removes (batch 6 review M1):
 *  - Esc in Pause closes Pause; if the game then saw the same keydown it would
 *    pause again. A key event stamped at or before the close is still the
 *    overlay's, whichever listener runs first.
 *  - The game's key handler calls `preventDefault`, and Phaser drops events that
 *    are already `defaultPrevented`. Under an overlay nothing is prevented here (S1), so
 *    the overlay sees every key however the listeners are ordered.
 *
 * Owner: gameplay-engineer [scene].
 */

/** Codes the overlays own. Enter is not a game binding but is listed so the rule is stated once. */
export const OVERLAY_CODES: ReadonlySet<string> = new Set(['Escape', 'KeyP', 'KeyR', 'Enter', 'NumpadEnter', 'Space']);

export class OverlayGate {
  private open = false;
  private closedAtMs = Number.NEGATIVE_INFINITY;

  /** An overlay was launched over the game. */
  opened(): void {
    this.open = true;
  }

  /** The overlay is gone (resume, restart); `nowMs` is `performance.now()` on the same clock as `KeyboardEvent.timeStamp`. */
  closed(nowMs: number): void {
    if (!this.open) return;
    this.open = false;
    this.closedAtMs = nowMs;
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** True while an overlay is open, or for an event stamped at or before it closed: the game calls `preventDefault` on nothing. */
  quiet(eventMs: number): boolean {
    return this.open || eventMs <= this.closedAtMs;
  }

  /** True when the game must not act on (or prevent) this keydown. `eventMs` is `event.timeStamp`. */
  blocksKeyDown(code: string, eventMs: number): boolean {
    return OVERLAY_CODES.has(code) && this.quiet(eventMs);
  }
}

/** What the game does with one bound key event: feed the sampler, and prevent the page default. */
export interface KeyPlan {
  readonly feed: boolean;
  readonly prevent: boolean;
}

/**
 * The whole decision for a keydown (`down` true) or keyup. Under an overlay (and for the event that
 * closed it) the game prevents nothing, so Phaser, which drops `defaultPrevented` events, and `MenuKeys`
 * always see the key whatever the listener order. Overlay keys are not fed on a keydown; every other key,
 * and every keyup, still reaches the sampler so held-key state stays right.
 */
export function planKey(gate: OverlayGate | undefined, code: string, eventMs: number, down: boolean): KeyPlan {
  if (gate === undefined) return { feed: true, prevent: true };
  if (down && gate.blocksKeyDown(code, eventMs)) return { feed: false, prevent: false };
  return { feed: true, prevent: !gate.quiet(eventMs) };
}
