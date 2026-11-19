// Ring buffer of the last sound cues requested, for QA's by-ear checks. Owner: audio-designer.
// Read-only debug aid: nothing here affects sound or simulation.

import type { SfxCue, SfxId } from './sfxSpec';

export interface CueLogEntry {
  readonly cue: SfxId;
  readonly body?: number | 'both';
  /** `performance.now()` when the cue was requested. */
  readonly atMs: number;
  /** False when nothing was scheduled: muted, locked (no gesture yet) or at the voice cap. */
  readonly audible: boolean;
}

export interface CueLog {
  record(cue: SfxCue, audible: boolean): void;
  /** The last (up to) 64 entries, oldest first. Returns a fresh array. */
  recent(): CueLogEntry[];
  clear(): void;
}

export const CUE_LOG_SIZE = 64;

const defaultNow = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

export function createCueLog(now: () => number = defaultNow): CueLog {
  const slots: (CueLogEntry | undefined)[] = new Array<CueLogEntry | undefined>(CUE_LOG_SIZE);
  let next = 0;
  let count = 0;
  return {
    record(cue, audible) {
      const entry: CueLogEntry =
        cue.body === undefined
          ? { cue: cue.id, atMs: now(), audible }
          : { cue: cue.id, body: cue.body, atMs: now(), audible };
      slots[next] = entry;
      next = (next + 1) % CUE_LOG_SIZE;
      count = Math.min(count + 1, CUE_LOG_SIZE);
    },
    recent() {
      const out: CueLogEntry[] = [];
      for (let i = 0; i < count; i++) out.push(slots[(next - count + i + CUE_LOG_SIZE * 2) % CUE_LOG_SIZE]!);
      return out;
    },
    clear() {
      next = 0;
      count = 0;
    },
  };
}
