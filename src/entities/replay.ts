/**
 * Deterministic replay: pick where input frames come from (the keyboard or a
 * bundled solution), and feed recorded frames to the sim one per step,
 * whatever the render frame rate. Pure (no Phaser, no DOM); the Vite glob that
 * bundles the solution text lives in `solutionFiles.ts`.
 *
 * URL contract: `?level=<id>&replay=1` plays `levels/<id>.solution.txt`;
 * `&speed=<n>` runs exactly n sim steps per rendered frame (clamped 1..60).
 *
 * Owner: gameplay-engineer [scene].
 */
import { expandRuns, parseSolution, type InputFrame, type Level, type SimState } from '../core';

export const MIN_REPLAY_SPEED = 1;
export const MAX_REPLAY_SPEED = 60;

export interface ReplayRequest {
  readonly active: boolean;
  /** Sim steps per rendered frame, or null for the normal accumulator. */
  readonly speed: number | null;
}

/** `speed` as a whole number in 1..60; null when absent or not a number. */
export function clampReplaySpeed(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_REPLAY_SPEED, Math.max(MIN_REPLAY_SPEED, Math.floor(n)));
}

/** Reads `replay` and `speed` from a URL search string. `speed` is ignored unless replaying. */
export function parseReplayRequest(search: string): ReplayRequest {
  const q = new URLSearchParams(search);
  const flag = q.get('replay')?.trim().toLowerCase();
  const active = flag === '1' || flag === 'true';
  return { active, speed: active ? clampReplaySpeed(q.get('speed')) : null };
}

/** Where the sim's input frames come from. */
export type FrameSource =
  | { readonly kind: 'live' }
  | { readonly kind: 'replay'; readonly feed: ReplayFeed; readonly speed: number | null }
  | { readonly kind: 'error'; readonly message: string };

/** The bundled text of `<id>.solution.txt`, whatever directory prefix the glob used. */
export function findSolutionText(files: Readonly<Record<string, string>>, levelId: string): string | null {
  const name = `${levelId}.solution.txt`;
  for (const [path, text] of Object.entries(files)) {
    if (path === name || path.endsWith(`/${name}`)) return text;
  }
  return null;
}

/** Live play unless the URL asks for a replay; a missing or bad solution is an error message, never a throw. */
export function chooseFrameSource(
  search: string,
  level: Level,
  solutionFiles: Readonly<Record<string, string>>,
  replayAvailable = true,
): FrameSource {
  const request = parseReplayRequest(search);
  if (!replayAvailable || !request.active) return { kind: 'live' };
  const id = level.meta.id;
  const text = findSolutionText(solutionFiles, id);
  if (text === null) return { kind: 'error', message: `Replay: no solution file levels/${id}.solution.txt.` };
  const parsed = parseSolution(text, `${id}.solution`);
  if (!parsed.ok) return { kind: 'error', message: `Replay: ${id}.solution.txt failed to parse:\n${parsed.errors.join('\n')}` };
  const { levelVersion } = parsed.value;
  if (levelVersion !== level.meta.version) {
    return { kind: 'error', message: `Replay: solution is for ${id} version ${levelVersion}, level is version ${level.meta.version}.` };
  }
  return { kind: 'replay', feed: new ReplayFeed(expandRuns(parsed.value.runs)), speed: request.speed };
}

/**
 * Hands out recorded frames in order, one per sim step. Done once the frames
 * run out or the sim has won. A death is not the end: recordings include the
 * deaths and restarts before the winning run (level-format.md section 4).
 */
export class ReplayFeed {
  private index = 0;
  private restartHeld = false;

  constructor(readonly frames: readonly InputFrame[]) {}

  /** Frames handed to the sim so far. */
  get consumed(): number {
    return this.index;
  }

  isDone(state: SimState): boolean {
    return this.index >= this.frames.length || state.status === 'won';
  }

  /** The frame for the next step, or null when the replay is done. */
  next(state: SimState): InputFrame | null {
    if (this.isDone(state)) return null;
    const frame = this.frames[this.index];
    this.index += 1;
    return frame ?? null;
  }

  /** Start over from frame 0 (the caller also creates a fresh sim). */
  rewind(): void {
    this.index = 0;
  }

  /** True on the sample where restart goes from released to held. */
  restartPressed(held: boolean): boolean {
    const pressed = held && !this.restartHeld;
    this.restartHeld = held;
    return pressed;
  }
}
