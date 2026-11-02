/**
 * Input-log codec: frames <-> canonical runs (adjacent identical frames merged).
 * Pure; the text form lives in solutionFile.ts.
 */
import type { EncodeRunsFn, ExpandRunsFn, InputFrame, InputRun } from '../types';
import { normalizeFrame } from './tokens';

function sameButtons(a: InputFrame, b: InputFrame): boolean {
  return (
    a.left === b.left &&
    a.right === b.right &&
    a.jump === b.jump &&
    a.shiftUp === b.shiftUp &&
    a.shiftDown === b.shiftDown &&
    a.restart === b.restart
  );
}

/** Merges neighbouring runs whose buttons are identical; drops nothing else. */
export function mergeRuns(runs: readonly InputRun[]): readonly InputRun[] {
  const merged: InputRun[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && sameButtons(last.frame, run.frame)) {
      merged[merged.length - 1] = { count: last.count + run.count, frame: last.frame };
    } else {
      merged.push({ count: run.count, frame: normalizeFrame(run.frame) });
    }
  }
  return merged;
}

export const encodeRuns: EncodeRunsFn = (frames) =>
  mergeRuns(frames.map((frame) => ({ count: 1, frame })));

/** One frame per step. Frames of a run share one immutable object. Throws RangeError on a count that is not a positive integer. */
export const expandRuns: ExpandRunsFn = (runs) => {
  const frames: InputFrame[] = [];
  runs.forEach((run, i) => {
    if (!Number.isSafeInteger(run.count) || run.count < 1) {
      throw new RangeError(`run ${i + 1} has an invalid count (${run.count}); counts are positive integers`);
    }
    const frame = normalizeFrame(run.frame);
    for (let k = 0; k < run.count; k++) frames.push(frame);
  });
  return frames;
};
