/**
 * Turns physical key events into one `InputFrame` per sim step.
 *
 * Pure (no DOM, no Phaser): the DOM wiring lives in `keyboardInput.ts`.
 * Keys are tracked by `KeyboardEvent.code`, the only property that tells
 * ShiftLeft from ShiftRight. A key that went down since the previous sample
 * is LATCHED: it counts as held for at least one sample, so a tap shorter
 * than a step (16.7 ms) is never lost (docs/tech/architecture.md section 5).
 *
 * Pause rules (docs/design/features/pause.md): keys held through a pause stay
 * held; a key that goes down WHILE paused is masked out of the sim frames
 * until it is released, so the Space that picks RESUME or the P that closes
 * pause never reaches the sim. A repeated keydown for a key that was already
 * held is not a new press.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { InputFrame } from '../core/types';
import { actionsForCode, DEFAULT_BINDINGS, heldActions, toSimButtons, type Action, type Bindings } from '../ui/bindings';

/** A press of a key the scene itself acts on (everything else goes to the sim as held actions). */
export type PressKind = 'pause' | 'restart';

export class InputSampler {
  private readonly held = new Set<string>();
  private readonly latched = new Set<string>();
  /** Codes pressed while paused; ignored by `sample()` until released. */
  private readonly masked = new Set<string>();
  private paused = false;
  private presses: PressKind[] = [];

  constructor(private readonly bindings: Bindings = DEFAULT_BINDINGS) {}

  keyDown(code: string): void {
    const isRepeat = this.held.has(code);
    this.held.add(code);
    if (!isRepeat && !this.paused) this.queuePresses(code);
    if (this.paused) {
      if (!isRepeat) this.masked.add(code);
      return;
    }
    this.latched.add(code);
  }

  keyUp(code: string): void {
    this.held.delete(code);
    this.masked.delete(code);
  }

  /** Forget everything: window blur, tab switch. Nothing stays stuck down. */
  clear(): void {
    this.held.clear();
    this.latched.clear();
    this.masked.clear();
    this.presses = [];
  }

  /** Enter or leave the pause. Latched taps never survive either change. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.latched.clear();
    this.presses = [];
  }

  /** True while the code is physically down (for tests and the debug overlay). */
  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  /** Every Esc/P/R press since the last call, in arrival order; consumes them. */
  takePresses(): readonly PressKind[] {
    const taken = this.presses;
    this.presses = [];
    return taken;
  }

  /** True once per Esc/P press (not on key repeat); consumes the pause presses. */
  takePausePress(): boolean {
    return this.takeEdge('pause');
  }

  /** True once per R press (not on key repeat); consumes it. Used for R while paused. */
  takeRestartPress(): boolean {
    return this.takeEdge('restart');
  }

  /** The frame for the next sim step; consumes the latches. Masked keys do not count. */
  sample(): InputFrame {
    const codes = new Set<string>();
    for (const code of this.held) if (!this.masked.has(code)) codes.add(code);
    for (const code of this.latched) if (!this.masked.has(code)) codes.add(code);
    this.latched.clear();
    const actions = heldActions(codes, this.bindings);
    return { ...toSimButtons(actions), restart: actions.restart };
  }

  private queuePresses(code: string): void {
    const actions: readonly Action[] = actionsForCode(code, this.bindings);
    if (actions.includes('pause')) this.presses.push('pause');
    if (actions.includes('restart')) this.presses.push('restart');
  }

  private takeEdge(kind: PressKind): boolean {
    const pressed = this.presses.includes(kind);
    this.presses = this.presses.filter((k) => k !== kind);
    return pressed;
  }
}
