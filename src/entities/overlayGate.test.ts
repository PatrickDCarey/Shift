import { describe, expect, it, vi } from 'vitest';
import { boundCodes } from '../ui/bindings';
import { InputSampler } from './inputSampler';
import { handleKeyDown, handleKeyUp, type KeyEventLike } from './keyboardInput';
import { OverlayGate, OVERLAY_CODES, planKey } from './overlayGate';

const bound: ReadonlySet<string> = new Set(boundCodes());

function ev(code: string, timeStamp: number): KeyEventLike & { prevented: () => number } {
  const preventDefault = vi.fn<() => void>();
  return { code, timeStamp, preventDefault, prevented: () => preventDefault.mock.calls.length };
}

describe('OverlayGate', () => {
  it('blocks every overlay key while open, and nothing else', () => {
    const gate = new OverlayGate();
    gate.opened();
    for (const code of ['Escape', 'KeyP', 'KeyR', 'Enter', 'Space']) expect(gate.blocksKeyDown(code, 10)).toBe(true);
    for (const code of ['ArrowLeft', 'ShiftLeft', 'KeyE']) expect(gate.blocksKeyDown(code, 10)).toBe(false);
  });

  it('blocks nothing while no overlay was ever open', () => {
    const gate = new OverlayGate();
    for (const code of OVERLAY_CODES) expect(gate.blocksKeyDown(code, 5)).toBe(false);
  });

  it('still blocks the keydown that closed the overlay, but not a later press', () => {
    const gate = new OverlayGate();
    gate.opened();
    gate.closed(100); // Pause resumed inside the Esc keydown stamped 99.5
    expect(gate.blocksKeyDown('Escape', 99.5)).toBe(true);
    expect(gate.blocksKeyDown('Escape', 100)).toBe(true);
    expect(gate.blocksKeyDown('Escape', 100.5)).toBe(false);
  });

  it('closing a gate that is not open changes nothing', () => {
    const gate = new OverlayGate();
    gate.closed(1000);
    expect(gate.blocksKeyDown('Escape', 500)).toBe(false);
  });
});

describe('handleKeyDown with the gate (M1)', () => {
  it('feeds nothing to the sampler and never calls preventDefault on a blocked key', () => {
    const gate = new OverlayGate();
    gate.opened();
    for (const code of ['Escape', 'KeyP', 'KeyR', 'Space']) {
      const s = new InputSampler();
      const e = ev(code, 10);
      handleKeyDown(s, bound, e, gate);
      expect(e.prevented()).toBe(0);
      expect(s.isHeld(code)).toBe(false);
      expect(s.takePresses()).toEqual([]);
    }
  });

  it('feeds move keys under an overlay but prevents nothing (S1)', () => {
    const gate = new OverlayGate();
    gate.opened();
    for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'ShiftLeft']) {
      const s = new InputSampler();
      const e = ev(code, 10);
      handleKeyDown(s, bound, e, gate);
      expect(e.prevented()).toBe(0);
      expect(s.isHeld(code)).toBe(true);
    }
  });

  it('keyups reach the sampler under an overlay without being prevented', () => {
    const gate = new OverlayGate();
    const s = new InputSampler();
    handleKeyDown(s, bound, ev('ArrowRight', 1), gate);
    gate.opened();
    const up = ev('ArrowRight', 10);
    handleKeyUp(s, bound, up, gate);
    expect(up.prevented()).toBe(0);
    expect(s.isHeld('ArrowRight')).toBe(false);
  });

  it('prevents normally with no overlay, and with no gate at all', () => {
    const e1 = ev('ArrowLeft', 10);
    handleKeyDown(new InputSampler(), bound, e1, new OverlayGate());
    expect(e1.prevented()).toBe(1);
    const e2 = ev('ArrowLeft', 10);
    handleKeyUp(new InputSampler(), bound, e2);
    expect(e2.prevented()).toBe(1);
  });

  it('planKey: quiet for the closing event, normal after', () => {
    const gate = new OverlayGate();
    gate.opened();
    gate.closed(100);
    expect(planKey(gate, 'ArrowLeft', 90, true)).toEqual({ feed: true, prevent: false });
    expect(planKey(gate, 'Escape', 90, true)).toEqual({ feed: false, prevent: false });
    expect(planKey(gate, 'Escape', 90, false)).toEqual({ feed: true, prevent: false });
    expect(planKey(gate, 'ArrowLeft', 150, true)).toEqual({ feed: true, prevent: true });
  });

  it('handles Esc normally once the overlay is long closed', () => {
    const gate = new OverlayGate();
    gate.opened();
    gate.closed(100);
    const s = new InputSampler();
    handleKeyDown(s, bound, ev('Escape', 200), gate);
    expect(s.takePresses()).toEqual(['pause']);
  });
});
