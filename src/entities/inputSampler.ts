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
 * Every press counts (BUG-10): the sim sees a button press as a false-to-true change between steps,
 * so two presses of jump, shift or R that land inside one sample interval would merge into one. For
 * those buttons the sampler counts key-downs per sample interval and spreads them over consecutive
 * samples as down, up, down. A lone tap and a held key sample exactly as before; a second press costs
 * one extra step of latency (it is shown one sample after the release step). Movement keys are never
 * split. The sim's input contract and the recording format are unchanged.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { InputFrame } from '../core/types';
import { actionsForCode, DEFAULT_BINDINGS, heldActions, toSimButtons, type Action, type Bindings } from '../ui/bindings';

/** A press of a key the scene itself acts on (everything else goes to the sim as held actions). */
export type PressKind = 'pause' | 'restart';

/** Buttons the sim reads as presses (rising edges); each key-down must make its own edge. */
const EDGE_ACTIONS = ['jump', 'shiftUp', 'shiftDown', 'restart'] as const;
type EdgeAction = (typeof EDGE_ACTIONS)[number];

export class InputSampler {
  private readonly held = new Set<string>();
  private readonly latched = new Set<string>();
  /** Codes pressed while paused; ignored by `sample()` until released. */
  private readonly masked = new Set<string>();
  private paused = false;
  private presses: PressKind[] = [];
  /** Key-downs per edge button not yet shown as their own rising edge. */
  private readonly owed: Record<EdgeAction, number> = { jump: 0, shiftUp: 0, shiftDown: 0, restart: 0 };
  /** What the last sample reported for each edge button. */
  private readonly shown: Record<EdgeAction, boolean> = { jump: false, shiftUp: false, shiftDown: false, restart: false };

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
    if (!isRepeat) this.countPress(code);
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
    this.resetEdges();
  }

  /**
   * Enter or leave the pause. Latched taps never survive either change. Opening: a key still down that
   * went down since the last sample (the opening frame, pause.md check 14) is a press, so it is masked
   * until released; keys held from earlier frames stay held.
   */
  setPaused(paused: boolean): void {
    if (paused && !this.paused) for (const code of this.latched) if (this.held.has(code)) this.masked.add(code);
    this.paused = paused;
    this.latched.clear();
    this.presses = [];
    this.resetEdges();
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
    const actions = { ...heldActions(codes, this.bindings) };
    for (const a of EDGE_ACTIONS) actions[a] = this.edgeState(a, actions[a]);
    return { ...toSimButtons(actions), restart: actions.restart };
  }

  /** The state to report for an edge button: a press still owed needs a released sample first. */
  private edgeState(action: EdgeAction, down: boolean): boolean {
    let out = down;
    if (this.owed[action] > 0) {
      if (this.shown[action]) out = false;
      else {
        out = true;
        this.owed[action] -= 1;
      }
    }
    this.shown[action] = out;
    return out;
  }

  private countPress(code: string): void {
    for (const a of actionsForCode(code, this.bindings)) if ((EDGE_ACTIONS as readonly Action[]).includes(a)) this.owed[a as EdgeAction] += 1;
  }

  private resetEdges(): void {
    for (const a of EDGE_ACTIONS) {
      this.owed[a] = 0;
      this.shown[a] = false;
    }
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
