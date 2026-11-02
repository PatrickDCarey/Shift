import { describe, expect, it, vi } from 'vitest';
import { boundCodes } from '../ui/bindings';
import { InputSampler } from './inputSampler';
import { handleKeyDown, handleKeyUp, type KeyEventLike } from './keyboardInput';

const bound: ReadonlySet<string> = new Set(boundCodes());

function ev(code: string, mods: Partial<KeyEventLike> = {}): KeyEventLike & { prevented: () => number } {
  const preventDefault = vi.fn<() => void>();
  return { code, preventDefault, prevented: () => preventDefault.mock.calls.length, ...mods };
}

describe('keyboard handlers', () => {
  it('prevents default for bound codes (Space and arrows must not scroll the page)', () => {
    for (const code of ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ShiftLeft']) {
      const e = ev(code);
      handleKeyDown(new InputSampler(), bound, e);
      expect(e.prevented()).toBe(1);
    }
  });

  it('leaves unbound codes alone', () => {
    const s = new InputSampler();
    const e = ev('F5');
    handleKeyDown(s, bound, e);
    expect(e.prevented()).toBe(0);
    expect(s.isHeld('F5')).toBe(false);
  });

  it('does not steal Ctrl+R, Alt+Left or Cmd+R', () => {
    for (const mods of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      const s = new InputSampler();
      const e = ev('KeyR', mods);
      handleKeyDown(s, bound, e);
      expect(e.prevented()).toBe(0);
      expect(s.sample().restart).toBe(false);
    }
  });

  it('registers presses and releases, even a release with a modifier down', () => {
    const s = new InputSampler();
    handleKeyDown(s, bound, ev('ShiftRight'));
    expect(s.sample().shiftUp).toBe(true);
    handleKeyUp(s, bound, ev('ShiftRight', { ctrlKey: true }));
    expect(s.sample().shiftUp).toBe(false);
  });
});
