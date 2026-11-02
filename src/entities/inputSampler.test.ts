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
