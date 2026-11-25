import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT } from '../core/types';
import { InputSampler } from './inputSampler';

describe('InputSampler', () => {
  it('samples an empty frame when nothing is pressed', () => {
    expect(new InputSampler().sample()).toEqual(EMPTY_INPUT);
  });

  it('reports held keys on every sample until released', () => {
    const s = new InputSampler();
    s.keyDown('ArrowRight');
    expect(s.sample().right).toBe(true);
    expect(s.sample().right).toBe(true);
    s.keyUp('ArrowRight');
    expect(s.sample().right).toBe(false);
  });

  it('latches a tap that was released before the next sample, for exactly one frame', () => {
    const s = new InputSampler();
    s.keyDown('Space');
    s.keyUp('Space');
    expect(s.sample().jump).toBe(true);
    expect(s.sample().jump).toBe(false);
  });

  it('tells Left Shift from Right Shift by code', () => {
    const s = new InputSampler();
    s.keyDown('ShiftLeft');
    expect(s.sample()).toMatchObject({ shiftDown: true, shiftUp: false });
    s.keyUp('ShiftLeft');
    s.keyDown('ShiftRight');
    expect(s.sample()).toMatchObject({ shiftDown: false, shiftUp: true });
  });

  it('maps the alternate gear keys', () => {
    const s = new InputSampler();
    s.keyDown('KeyE');
    s.keyDown('KeyZ');
    expect(s.sample()).toMatchObject({ shiftUp: true, shiftDown: true });
  });

  it('includes restart in the frame', () => {
    const s = new InputSampler();
    s.keyDown('KeyR');
    expect(s.sample().restart).toBe(true);
  });

  it('ORs every key bound to an action', () => {
    const s = new InputSampler();
    s.keyDown('KeyA');
    s.keyDown('ArrowLeft');
    s.keyUp('KeyA');
    expect(s.sample().left).toBe(true);
  });

  it('ignores unbound keys', () => {
    const s = new InputSampler();
    s.keyDown('KeyK');
    expect(s.sample()).toEqual(EMPTY_INPUT);
  });

  it('clear() drops held keys and pending latches', () => {
    const s = new InputSampler();
    s.keyDown('ArrowRight');
    s.keyDown('Space');
    s.keyUp('Space');
    s.clear();
    expect(s.isHeld('ArrowRight')).toBe(false);
    expect(s.sample()).toEqual(EMPTY_INPUT);
  });

  it('honours custom bindings', () => {
    const s = new InputSampler({
      left: ['KeyJ'],
      right: ['KeyL'],
      jump: ['KeyI'],
      shiftUp: ['KeyO'],
      shiftDown: ['KeyU'],
      restart: ['KeyP'],
      pause: [],
    });
    s.keyDown('KeyL');
    s.keyDown('ArrowRight');
    expect(s.sample()).toMatchObject({ right: true, left: false });
  });
});

describe('InputSampler while paused (pause.md)', () => {
  it('keeps a key held through the pause held after resume, with no new press', () => {
    const s = new InputSampler();
    s.keyDown('ArrowRight');
    s.sample();
    s.setPaused(true);
    s.keyDown('ArrowRight'); // browser key repeat during the pause
    s.setPaused(false);
    expect(s.sample().right).toBe(true);
    expect(s.sample().right).toBe(true);
  });

  it('ignores a key pressed while paused until it is released, even if still held at resume', () => {
    const s = new InputSampler();
    s.setPaused(true);
    s.keyDown('Space');
    s.setPaused(false);
    expect(s.sample().jump).toBe(false);
    expect(s.sample().jump).toBe(false);
    s.keyUp('Space');
    s.keyDown('Space');
    expect(s.sample().jump).toBe(true);
  });

  it('a key that went down on the opening frame (since the last sample) counts as pressed: ignored until released and pressed again (check 14)', () => {
    const s = new InputSampler();
    s.keyDown('Escape');
    s.keyDown('ArrowRight'); // same task as the opening Esc, before the scene saw the pause
    s.setPaused(true);
    s.setPaused(false);
    expect(s.sample().right).toBe(false);
    expect(s.sample().right).toBe(false);
    s.keyUp('ArrowRight');
    s.keyDown('ArrowRight');
    expect(s.sample().right).toBe(true);
  });

  it('a key held from before the opening frame still counts as held after resume (check 14 counterpart)', () => {
    const s = new InputSampler();
    s.keyDown('ArrowRight');
    s.sample(); // an earlier frame consumed the press
    s.keyDown('Escape');
    s.setPaused(true);
    s.setPaused(false);
    expect(s.sample().right).toBe(true);
  });

  it('masks a gear key tapped in the menu (no latch survives the resume)', () => {
    const s = new InputSampler();
    s.setPaused(true);
    s.keyDown('KeyQ');
    s.keyUp('KeyQ');
    s.setPaused(false);
    expect(s.sample().shiftDown).toBe(false);
  });

  it('drops latches made just before the pause so they do not fire on resume', () => {
    const s = new InputSampler();
    s.keyDown('Space');
    s.keyUp('Space');
    s.setPaused(true);
    s.setPaused(false);
    expect(s.sample().jump).toBe(false);
  });

  it('a key held through the pause that is released and pressed again during it is masked', () => {
    const s = new InputSampler();
    s.keyDown('ArrowRight');
    s.setPaused(true);
    s.keyUp('ArrowRight');
    s.keyDown('ArrowRight');
    s.setPaused(false);
    expect(s.sample().right).toBe(false);
  });

  it('clear() (focus loss) drops held keys and masks, so nothing sticks', () => {
    const s = new InputSampler();
    s.keyDown('ArrowRight');
    s.setPaused(true);
    s.keyDown('Space');
    s.clear();
    s.setPaused(false);
    expect(s.sample()).toEqual(EMPTY_INPUT);
    s.keyDown('Space');
    expect(s.sample().jump).toBe(true);
  });

  it('counts pause and restart presses as edges, once each, and not on key repeat', () => {
    const s = new InputSampler();
    s.keyDown('Escape');
    s.keyDown('Escape');
    expect(s.takePausePress()).toBe(true);
    expect(s.takePausePress()).toBe(false);
    s.keyUp('Escape');
    s.keyDown('KeyP');
    expect(s.takePausePress()).toBe(true);
    s.keyDown('KeyR');
    expect(s.takeRestartPress()).toBe(true);
    expect(s.takeRestartPress()).toBe(false);
  });

  it('never puts the pause key into the sim frame', () => {
    const s = new InputSampler();
    s.keyDown('Escape');
    expect(s.sample()).toEqual(EMPTY_INPUT);
  });

  it('keeps two presses that land inside one rendered frame, in order', () => {
    const s = new InputSampler();
    s.keyDown('KeyP');
    s.keyUp('KeyP');
    s.keyDown('Escape');
    s.keyUp('Escape');
    s.keyDown('KeyR');
    expect(s.takePresses()).toEqual(['pause', 'pause', 'restart']);
    expect(s.takePresses()).toEqual([]);
  });

  it('queues nothing while paused (the overlay owns Esc/P/R) and drops the queue on a pause change', () => {
    const s = new InputSampler();
    s.keyDown('KeyP');
    s.setPaused(true);
    expect(s.takePresses()).toEqual([]);
    s.keyDown('KeyR');
    s.keyDown('Escape');
    s.setPaused(false);
    expect(s.takePresses()).toEqual([]);
  });

  it('a gear tap whose keydown and keyup share one frame still reaches the next step', () => {
    const s = new InputSampler();
    s.keyDown('KeyE');
    s.keyUp('KeyE');
    expect(s.sample().shiftUp).toBe(true);
    expect(s.sample().shiftUp).toBe(false);
  });
});

describe('InputSampler: every press makes its own edge (BUG-10)', () => {
  const shifts = (s: InputSampler, n: number): boolean[] => Array.from({ length: n }, () => s.sample().shiftUp);

  it('leaves a normal single tap unchanged, sample for sample', () => {
    const s = new InputSampler();
    s.keyDown('ShiftRight');
    s.keyUp('ShiftRight');
    expect(shifts(s, 3)).toEqual([true, false, false]);
    s.keyDown('ShiftRight');
    expect(shifts(s, 3)).toEqual([true, true, true]); // held: no extra edges
  });

  it('keeps a key held throughout as plain held', () => {
    const s = new InputSampler();
    s.keyDown('Space');
    expect([s.sample().jump, s.sample().jump, s.sample().jump]).toEqual([true, true, true]);
  });

  it('gives a release-and-press inside one interval its own edge (down, up, down)', () => {
    const s = new InputSampler();
    s.keyDown('ShiftRight');
    expect(shifts(s, 1)).toEqual([true]);
    s.keyUp('ShiftRight');
    s.keyDown('ShiftRight'); // before the next sample
    expect(shifts(s, 3)).toEqual([false, true, true]); // the key ends held
  });

  it('gives two taps inside one interval two edges, one step apart', () => {
    const s = new InputSampler();
    s.keyDown('ShiftRight');
    s.keyUp('ShiftRight');
    s.keyDown('ShiftRight');
    s.keyUp('ShiftRight');
    expect(shifts(s, 4)).toEqual([true, false, true, false]);
  });

  it('counts press-release-press that ends held', () => {
    const s = new InputSampler();
    s.keyDown('ShiftRight');
    s.keyUp('ShiftRight');
    s.keyDown('ShiftRight');
    expect(shifts(s, 4)).toEqual([true, false, true, true]);
  });

  it('counts Q then Right Shift as two presses of one action', () => {
    const s = new InputSampler();
    s.keyDown('KeyE');
    s.keyUp('KeyE');
    s.keyDown('ShiftRight');
    s.keyUp('ShiftRight');
    expect(shifts(s, 4)).toEqual([true, false, true, false]);
  });

  it('does the same for jump and R', () => {
    const s = new InputSampler();
    s.keyDown('Space');
    s.keyUp('Space');
    s.keyDown('Space');
    s.keyUp('Space');
    expect([s.sample().jump, s.sample().jump, s.sample().jump]).toEqual([true, false, true]);
    s.keyDown('KeyR');
    s.keyUp('KeyR');
    s.keyDown('KeyR');
    s.keyUp('KeyR');
    expect([s.sample().restart, s.sample().restart, s.sample().restart]).toEqual([true, false, true]);
  });

  it('never inserts a gap into held movement keys', () => {
    const s = new InputSampler();
    s.keyDown('KeyA');
    s.sample();
    s.keyDown('ArrowLeft');
    expect(s.sample().left).toBe(true);
  });

  it('does not count key auto-repeat as presses', () => {
    const s = new InputSampler();
    s.keyDown('Space');
    s.sample();
    s.keyDown('Space');
    s.keyDown('Space');
    expect([s.sample().jump, s.sample().jump]).toEqual([true, true]);
  });

  it('feeds the sim one rising edge per press', () => {
    const s = new InputSampler();
    let prev = false;
    let edges = 0;
    const read = (): void => {
      const now = s.sample().shiftUp;
      if (now && !prev) edges += 1;
      prev = now;
    };
    for (let i = 0; i < 3; i++) {
      s.keyDown('ShiftRight');
      s.keyUp('ShiftRight');
    }
    for (let i = 0; i < 8; i++) read();
    expect(edges).toBe(3);
  });
});
