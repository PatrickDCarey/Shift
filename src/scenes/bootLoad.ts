/**
 * Boot load policy (B7-03, BUG-6). Pure: no Phaser, no DOM, so it is unit
 * tested; `BootScene` wires it to the loader. Owner: tech-lead.
 *
 * Two layers of retry, each for a different failure (Phaser 3.90 source,
 * `node_modules/phaser/src/loader`):
 *
 * 1. A network error on a request (`File.onError`) is retried by Phaser itself,
 *    `LoaderPlugin.maxRetries` times, silently. Only when those run out does it
 *    emit `loaderror` and count the file in `complete`'s `totalFailed`.
 * 2. A file that downloaded but failed to decode (`File.onProcessError`, the
 *    "Failed to process file" in BUG-6's evidence) is never retried by Phaser,
 *    emits no `loaderror`, is not counted in `totalFailed`, and logs
 *    `console.error`. So the scene cannot trust the events; it checks the
 *    texture and font caches after `complete` instead, and this policy decides
 *    (`BOOT_LOAD_PLAN`: when to retry, after what wait, and over which path).
 */

/** How Phaser 3.90's loader fetches an image (`LoaderPlugin.imageLoadType`). */
export type ImageLoadType = 'XHR' | 'HTMLImageElement';

/** One boot load attempt: how long to wait before it, and how images are fetched. */
export interface BootAttempt {
  readonly delayMs: number;
  readonly imageLoadType: ImageLoadType;
}

/**
 * The first load, then up to two retries of whatever is still missing
 * (BUG-6, tech-lead notes in `docs/tech/reviews/2026-11-bug6-boot-load.md`).
 * The reproduced failure: the XHR answered 200 `image/png` but its response
 * blob was 0 bytes, for every sheet, on the first load and on an immediate
 * retry in the same page. So the retries wait a moment and skip XHR + blob
 * entirely: `HTMLImageElement` loads each sheet with a plain `<img src=url>`.
 * Worst case before the failure message: 2.5 s of waiting plus the loads.
 */
export const BOOT_LOAD_PLAN: readonly BootAttempt[] = [
  { delayMs: 0, imageLoadType: 'XHR' },
  { delayMs: 500, imageLoadType: 'HTMLImageElement' },
  { delayMs: 2000, imageLoadType: 'HTMLImageElement' },
];

export const BOOT_LOAD_ATTEMPTS = BOOT_LOAD_PLAN.length;

/** Phaser's own per-request retries on a network error, within each attempt (its default, made explicit). */
export const LOADER_REQUEST_RETRIES = 2;

/** Design-lead copy, `docs/design/decisions.md` 2026-11-19. */
export const BOOT_FAILURE_MESSAGE = 'COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.';

/** DOM id of the failure message, so the page and Playwright can find it without the QA hook. */
export const BOOT_ERROR_ELEMENT_ID = 'boot-error';

export type BootStep =
  | { readonly kind: 'start' }
  | { readonly kind: 'retry'; readonly keys: readonly string[]; readonly delayMs: number; readonly imageLoadType: ImageLoadType }
  | { readonly kind: 'fail'; readonly keys: readonly string[] };

/**
 * What Boot does after load attempt `attempt` (1-based) finished with the asset
 * keys in `missing` still absent from the caches.
 */
export function nextBootStep(attempt: number, missing: readonly string[]): BootStep {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > BOOT_LOAD_ATTEMPTS) {
    throw new RangeError(`attempt must be an integer in 1..${BOOT_LOAD_ATTEMPTS}, got ${attempt}`);
  }
  if (missing.length === 0) return { kind: 'start' };
  const keys = [...missing];
  // `attempt` is 1-based, so BOOT_LOAD_PLAN[attempt] is the next attempt.
  const next = BOOT_LOAD_PLAN[attempt];
  return next ? { kind: 'retry', keys, ...next } : { kind: 'fail', keys };
}

/** The format strings Phaser 3.90's loader passes to `console.error` (File.js, MultiFile.js). */
const LOADER_ERROR_FORMATS: ReadonlySet<string> = new Set([
  'Failed to process file: %s "%s"',
  'File failed: %s "%s" (via %s "%s")',
]);

/** True for a `console.error` call made by Phaser's loader on a failed file. */
export function isLoaderFailureLog(args: readonly unknown[]): boolean {
  const first = args[0];
  return typeof first === 'string' && LOADER_ERROR_FORMATS.has(first);
}

/** The part of `console` the capture touches; a fake in tests. */
export interface ErrorSink {
  error: (...args: unknown[]) => void;
}

export interface LoaderErrorCapture {
  /** Loader error calls held back so far, arguments as logged. */
  readonly captured: ReadonlyArray<readonly unknown[]>;
  /** Puts the original `error` back (once; a later replacement is left alone). */
  release(): void;
}

/**
 * Holds Phaser's loader errors back while Boot loads, so a failure the retry
 * then fixes does not end up as a console error; every other error passes
 * straight through. If the retry recovers, Boot drops the held calls and logs
 * one summary `console.warn` naming the keys that needed it; if it does not,
 * Boot logs the held calls as errors, then its own error line.
 */
export function captureLoaderErrors(sink: ErrorSink): LoaderErrorCapture {
  const original = sink.error;
  const captured: unknown[][] = [];
  const filter = (...args: unknown[]): void => {
    if (isLoaderFailureLog(args)) captured.push(args);
    else original.apply(sink, args);
  };
  sink.error = filter;
  return {
    captured,
    release: () => {
      if (sink.error === filter) sink.error = original;
    },
  };
}

/** The part of `console` a side job's failure goes to; a fake in tests. */
export interface WarnSink {
  warn: (...args: unknown[]) => void;
}

/**
 * Runs a boot side job (B7-13: pushing the saved audio settings into the
 * engine) so it can never stop the boot. Boot must always reach its load check
 * and either start a scene or show `BOOT_FAILURE_MESSAGE` (BUG-6); a side job
 * that throws is logged as one `console.warn` and skipped. Returns whether the
 * job ran cleanly.
 */
export function runBootSideJob(label: string, job: () => void, log: WarnSink = console): boolean {
  try {
    job();
    return true;
  } catch (error) {
    log.warn('Boot: %s failed; continuing without it', label, error);
    return false;
  }
}
