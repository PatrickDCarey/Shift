import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type InputFrame } from '../core';
import { loadGameParams } from './params';
import { RunDriver } from './runDriver';
import { gridLevel } from './testkit';

const STEP_MS = 1000 / 60;
const { params } = loadGameParams();
const level = gridLevel(['.....', '.@.E.', '#####']);
const right: InputFrame = { ...EMPTY_INPUT, right: true };
const restart: InputFrame = { ...EMPTY_INPUT, restart: true };

function constant(frame: InputFrame): () => InputFrame {
  return () => frame;
}

function playUntilWon(driver: RunDriver): void {
  for (let i = 0; i < 600 && driver.state.status !== 'won'; i += 1) driver.advance(STEP_MS, constant(right));
}

describe('loadGameParams', () => {
  it('loads the shipped tuning', () => {
    expect(params.stepHz).toBe(60);
  });

  it('rejects a malformed tuning with the schema messages', () => {
    expect(() => loadGameParams({ stepHz: 60 })).toThrow(/invalid tuning/);
  });
});

describe('RunDriver', () => {
  it('runs one sim step per 60 Hz frame and samples input once per step', () => {
    const driver = new RunDriver(level, params);
    let samples = 0;
    for (let i = 0; i < 10; i += 1) {
      driver.advance(STEP_MS, () => {
        samples += 1;
        return right;
      });
    }
    expect(driver.state.step).toBe(10);
    expect(samples).toBe(10);
    expect(driver.recording).toHaveLength(10);
  });

  it('keeps the previous state one step behind for interpolation', () => {
    const driver = new RunDriver(level, params);
    driver.advance(STEP_MS * 2, constant(right));
    expect(driver.prev.step).toBe(1);
    expect(driver.state.step).toBe(2);
  });

  it('exposes the leftover time as alpha', () => {
    const driver = new RunDriver(level, params);
    driver.advance(STEP_MS * 1.5, constant(right));
    expect(driver.state.step).toBe(1);
    expect(driver.alpha).toBeCloseTo(0.5);
  });

  it('caps a stalled frame at five steps', () => {
    const driver = new RunDriver(level, params);
    driver.advance(10_000, constant(EMPTY_INPUT));
    expect(driver.state.step).toBe(5);
  });

  it('produces the same final state as stepping the sim directly (deterministic drive)', () => {
    const a = new RunDriver(level, params);
    const b = new RunDriver(level, params);
    for (let i = 0; i < 40; i += 1) a.advance(STEP_MS, constant(right));
    b.advance(STEP_MS * 5, constant(right)); // a 12 Hz frame rate must not change the result
    for (let i = 0; i < 7; i += 1) b.advance(STEP_MS * 5, constant(right));
    expect(b.state).toEqual(a.state);
  });

  it('reaches the exit and reports the won event once', () => {
    const driver = new RunDriver(level, params);
    const events: string[] = [];
    for (let i = 0; i < 600 && driver.state.status !== 'won'; i += 1) {
      events.push(...driver.advance(STEP_MS, constant(right)).map((e) => e.type));
    }
    expect(driver.state.status).toBe('won');
    expect(driver.state.wonAtStep).not.toBeNull();
    expect(events.filter((t) => t === 'won')).toHaveLength(1);
  });

  it('starts a new run on a restart press after winning, and records from zero', () => {
    const driver = new RunDriver(level, params);
    playUntilWon(driver);
    driver.advance(STEP_MS, constant(EMPTY_INPUT));
    driver.advance(STEP_MS, constant(restart));
    expect(driver.state.status).toBe('playing');
    expect(driver.state.step).toBe(0);
    expect(driver.recording).toHaveLength(0);
    expect(driver.state.player.x).toBe(level.start.col + 0.5);
  });

  it('does not restart again while R stays held', () => {
    const driver = new RunDriver(level, params);
    playUntilWon(driver);
    for (let i = 0; i < 5; i += 1) driver.advance(STEP_MS, constant(restart));
    expect(driver.state.status).toBe('playing');
    expect(driver.state.step).toBe(4);
  });

  it('does not let buttons held through the restart count as new presses', () => {
    const driver = new RunDriver(level, params);
    playUntilWon(driver);
    driver.advance(STEP_MS, constant({ ...EMPTY_INPUT, jump: true, restart: true }));
    expect(driver.state.prevInput.jump).toBe(true);
    driver.advance(STEP_MS, constant({ ...EMPTY_INPUT, jump: true }));
    expect(driver.state.player.vy).toBe(0);
  });

  it('lets the sim handle a mid-run restart', () => {
    const driver = new RunDriver(level, params);
    for (let i = 0; i < 20; i += 1) driver.advance(STEP_MS, constant(right));
    driver.advance(STEP_MS, constant(restart));
    expect(driver.state.status).toBe('restarting');
    driver.advance(STEP_MS, constant(EMPTY_INPUT));
    expect(driver.state.status).toBe('playing');
    expect(driver.state.step).toBe(0);
  });
});
