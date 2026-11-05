import { describe, expect, it } from 'vitest';
import { PauseState } from './pauseState';

describe('PauseState', () => {
  it('toggles on Esc/P and reports the change', () => {
    const p = new PauseState();
    expect(p.paused).toBe(false);
    expect(p.toggle(true)).toBe('paused');
    expect(p.paused).toBe(true);
    expect(p.toggle(true)).toBe('resumed');
    expect(p.paused).toBe(false);
  });

  it('does nothing when pausing is not allowed (after the win step)', () => {
    const p = new PauseState();
    expect(p.toggle(false)).toBeNull();
    expect(p.paused).toBe(false);
  });

  it('still lets a paused game resume when pausing is no longer allowed', () => {
    const p = new PauseState();
    p.toggle(true);
    expect(p.toggle(false)).toBe('resumed');
  });

  it('focus loss pauses, and is a no-op when already paused or not allowed', () => {
    const p = new PauseState();
    expect(p.pauseOnFocusLoss(true)).toBe(true);
    expect(p.pauseOnFocusLoss(true)).toBe(false);
    const q = new PauseState();
    expect(q.pauseOnFocusLoss(false)).toBe(false);
    expect(q.paused).toBe(false);
  });

  it('resume and reset clear the flag', () => {
    const p = new PauseState();
    p.toggle(true);
    expect(p.resume()).toBe(true);
    expect(p.resume()).toBe(false);
    p.toggle(true);
    p.reset();
    expect(p.paused).toBe(false);
  });
});
