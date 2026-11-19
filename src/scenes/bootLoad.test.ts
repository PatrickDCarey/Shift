import { describe, expect, it, vi } from 'vitest';
import {
  BOOT_FAILURE_MESSAGE,
  BOOT_LOAD_ATTEMPTS,
  captureLoaderErrors,
  isLoaderFailureLog,
  nextBootStep,
  runBootSideJob,
} from './bootLoad';

/** Runs the boot policy over a scripted list of "missing after attempt n" results. */
function simulateBoot(missingPerAttempt: ReadonlyArray<readonly string[]>): string[] {
  const steps: string[] = [];
  for (let attempt = 1; attempt <= missingPerAttempt.length; attempt += 1) {
    const step = nextBootStep(attempt, missingPerAttempt[attempt - 1] ?? []);
    steps.push(step.kind === 'start' ? 'start' : `${step.kind}:${step.keys.join(',')}`);
    if (step.kind !== 'retry') break;
  }
  return steps;
}

describe('boot load policy (BUG-6)', () => {
  it('everything loads first time: start, no retry', () => {
    expect(simulateBoot([[]])).toEqual(['start']);
  });

  it('fail once, then ok: retries only the missing files, then starts', () => {
    expect(simulateBoot([['pixel-player', 'pixel-font'], []])).toEqual(['retry:pixel-player,pixel-font', 'start']);
  });

  it('fail twice: shows the message after exactly one retry, never a third attempt', () => {
    const steps = simulateBoot([['pixel-tileset'], ['pixel-tileset'], ['pixel-tileset']]);
    expect(steps).toEqual(['retry:pixel-tileset', 'fail:pixel-tileset']);
    expect(BOOT_LOAD_ATTEMPTS).toBe(2);
  });

  it('a retry that fixes some files but not all still fails, naming what is left', () => {
    expect(simulateBoot([['pixel-player', 'pixel-hud'], ['pixel-hud']])).toEqual(['retry:pixel-player,pixel-hud', 'fail:pixel-hud']);
  });

  it('the message is the design-lead copy (decisions.md 2026-11-19)', () => {
    expect(BOOT_FAILURE_MESSAGE).toBe('COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.');
  });

  it('rejects an attempt number below 1', () => {
    expect(() => nextBootStep(0, [])).toThrow(RangeError);
  });
});

describe('Phaser loader console errors', () => {
  it('recognises the two Phaser 3.90 loader formats and nothing else', () => {
    expect(isLoaderFailureLog(['Failed to process file: %s "%s"', 'image', 'pixel-player'])).toBe(true);
    expect(isLoaderFailureLog(['File failed: %s "%s" (via %s "%s")', 'atlasjson', 'pixel-player', 'image', 'pixel-player'])).toBe(true);
    expect(isLoaderFailureLog(['texture "pixel-tileset" is not loaded'])).toBe(false);
    expect(isLoaderFailureLog([new Error('Failed to process file: %s "%s"')])).toBe(false);
    expect(isLoaderFailureLog([])).toBe(false);
  });

  it('holds loader errors back, passes every other error through, and restores the sink', () => {
    const original = vi.fn();
    const sink = { error: original };
    const capture = captureLoaderErrors(sink);
    sink.error('Failed to process file: %s "%s"', 'image', 'pixel-hud');
    sink.error('something else broke', 42);
    expect(original).toHaveBeenCalledTimes(1);
    expect(original).toHaveBeenCalledWith('something else broke', 42);
    expect(capture.captured).toEqual([['Failed to process file: %s "%s"', 'image', 'pixel-hud']]);

    capture.release();
    expect(sink.error).toBe(original);
    sink.error('Failed to process file: %s "%s"', 'image', 'pixel-fx');
    expect(original).toHaveBeenCalledTimes(2);
    expect(capture.captured).toHaveLength(1);
  });

  it('release is safe to call twice and does not clobber a later replacement', () => {
    const sink = { error: vi.fn() };
    const capture = captureLoaderErrors(sink);
    capture.release();
    const later = vi.fn();
    sink.error = later;
    capture.release();
    expect(sink.error).toBe(later);
  });
});

describe('boot side jobs (B7-13: saved audio settings at boot)', () => {
  it('runs the job and reports success without logging', () => {
    const job = vi.fn();
    const log = { warn: vi.fn() };
    expect(runBootSideJob('audio settings', job, log)).toBe(true);
    expect(job).toHaveBeenCalledTimes(1);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('a job that throws cannot stop the boot: one warning, no rethrow, and the code after it still runs', () => {
    const log = { warn: vi.fn() };
    const failure = new Error('engine not ready');
    let reachedAfterLoad = false;
    const create = (): void => {
      runBootSideJob(
        'audio settings',
        () => {
          throw failure;
        },
        log,
      );
      reachedAfterLoad = true;
    };
    expect(create).not.toThrow();
    expect(reachedAfterLoad).toBe(true);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0]).toContain('audio settings');
    expect(log.warn.mock.calls[0]).toContain(failure);
  });

  it('also survives a non-Error throw', () => {
    const log = { warn: vi.fn() };
    expect(
      runBootSideJob(
        'x',
        () => {
          throw 'plain string';
        },
        log,
      ),
    ).toBe(false);
    expect(log.warn).toHaveBeenCalledTimes(1);
  });
});
