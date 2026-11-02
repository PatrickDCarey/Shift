/**
 * Turns physical key events into one `InputFrame` per sim step.
 *
 * Pure (no DOM, no Phaser): the DOM wiring lives in `keyboardInput.ts`.
 * Keys are tracked by `KeyboardEvent.code`, the only property that tells
 * ShiftLeft from ShiftRight. A key that went down since the previous sample
 * is LATCHED: it counts as held for at least one sample, so a tap shorter
 * than a step (16.7 ms) is never lost (docs/tech/architecture.md section 5).
 *
 * Owner: gameplay-engineer [scene].
 */
import type { InputFrame } from '../core/types';
import { DEFAULT_BINDINGS, heldActions, toSimButtons, type Bindings } from '../ui/bindings';

export class InputSampler {
  private readonly held = new Set<string>();
  private readonly latched = new Set<string>();

  constructor(private readonly bindings: Bindings = DEFAULT_BINDINGS) {}

  keyDown(code: string): void {
    this.held.add(code);
    this.latched.add(code);
  }

  keyUp(code: string): void {
    this.held.delete(code);
  }

  /** Forget everything: window blur, tab switch. Nothing stays stuck down. */
  clear(): void {
    this.held.clear();
    this.latched.clear();
  }

  /** True while the code is physically down (for tests and the debug overlay). */
  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  /** The frame for the next sim step; consumes the latches. */
  sample(): InputFrame {
    const codes = new Set<string>([...this.held, ...this.latched]);
    this.latched.clear();
    const actions = heldActions(codes, this.bindings);
    return { ...toSimButtons(actions), restart: actions.restart };
  }
}
