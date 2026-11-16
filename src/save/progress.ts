/**
 * Progress model: which levels exist in play order, which are playable, what
 * PLAY and NEXT start, and how times are shown. Pure: no DOM, no Phaser, no
 * storage. The unlocked set is DERIVED here on every read from the loaded level
 * list and `progress.completedLevels`; it is never stored (progress-save.md).
 *
 * Spec: docs/design/features/level-select.md (Rule, Model), progress-save.md.
 * The scene lane and the menu scenes import these names; keep them stable.
 *
 * Owner: ui-engineer.
 */
import type { Progress } from './schema';
import type { LevelResult, SaveStore } from './store';

/** The part of a loaded `Level` this model reads (`Level` satisfies it). */
export interface LevelSource {
  readonly meta: { readonly id: string; readonly title: string; readonly world: number };
}

/** One level in play order. */
export interface LevelEntry {
  readonly id: string;
  readonly title: string;
  readonly world: number;
}

/** Completed level ids, as the save stores them or as a set. */
export type CompletedIds = readonly string[] | ReadonlySet<string>;

export type LevelState = 'locked' | 'open' | 'cleared';

/** Arrays are copied into a set; anything else is already set-like (a `ReadonlySet`, not necessarily a `Set` instance). */
const toSet = (completed: CompletedIds): ReadonlySet<string> =>
  Array.isArray(completed) ? new Set(completed as readonly string[]) : (completed as ReadonlySet<string>);

/**
 * World >= 1 levels in play order: world, then id (the loader's order). Ids compare as strings, which is the play order only because ids are zero-padded `w<d>-<dd>` (the save parser enforces that shape). World 0
 * (test rooms) is never listed. Does not mutate `levels`.
 */
export function levelOrder(levels: readonly LevelSource[]): readonly LevelEntry[] {
  return levels
    .filter((level) => level.meta.world >= 1)
    .map((level) => ({ id: level.meta.id, title: level.meta.title, world: level.meta.world }))
    .sort((a, b) => a.world - b.world || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function indexOfId(order: readonly { readonly id: string }[], id: string): number {
  return order.findIndex((entry) => entry.id === id);
}

/** The level before `id` in the same world, or null when `id` is first in its world or unknown. */
export function previousInWorld(id: string, order: readonly LevelEntry[]): string | null {
  const index = indexOfId(order, id);
  const prev = index > 0 ? order[index - 1] : undefined;
  return prev !== undefined && prev.world === order[index]?.world ? prev.id : null;
}

/**
 * The unlock rule (owner decision 2026-11-04). A level is playable when it is
 * the first of its world, or the level before it in its world is completed, or
 * it is itself completed. An id that is not in `order` is never playable.
 */
export function isPlayable(id: string, order: readonly LevelEntry[], completed: CompletedIds): boolean {
  if (indexOfId(order, id) < 0) return false;
  const done = toSet(completed);
  if (done.has(id)) return true;
  const prev = previousInWorld(id, order);
  return prev === null || done.has(prev);
}

export function levelState(id: string, order: readonly LevelEntry[], completed: CompletedIds): LevelState {
  if (indexOfId(order, id) >= 0 && toSet(completed).has(id)) return 'cleared';
  return isPlayable(id, order, completed) ? 'open' : 'locked';
}

/** Ids of every playable level, in order. */
export function playableIds(order: readonly LevelEntry[], completed: CompletedIds): readonly string[] {
  return order.filter((entry) => isPlayable(entry.id, order, completed)).map((entry) => entry.id);
}

/** The first playable level in order that is not completed, or null (title PLAY). */
export function playTarget(order: readonly LevelEntry[], completed: CompletedIds): string | null {
  const done = toSet(completed);
  const found = order.find((entry) => !done.has(entry.id) && isPlayable(entry.id, order, done));
  return found?.id ?? null;
}

/** The level after `id` in order, crossing worlds, or null (results NEXT). */
export function nextLevel(id: string, order: readonly LevelEntry[]): string | null {
  const index = indexOfId(order, id);
  return index < 0 ? null : (order[index + 1]?.id ?? null);
}

/** How many listed levels are completed (the `n` in `CLEARED n/m`). Unknown ids in the save are not counted. */
export function clearedCount(order: readonly LevelEntry[], completed: CompletedIds): number {
  const done = toSet(completed);
  return order.filter((entry) => done.has(entry.id)).length;
}

/** Display label from an id: `w1-03` -> `1-3`. Ids of another shape are returned as they are. */
export function levelLabel(id: string): string {
  const match = /^w(\d+)-(\d+)$/i.exec(id);
  return match ? `${Number(match[1])}-${Number(match[2])}` : id;
}

/** Highest time the display shows, in hundredths of a second: 99:59.99. */
const MAX_HUNDREDTHS = 99 * 6000 + 59 * 100 + 99;

/**
 * `M:SS.ss` from sim steps, hundredths truncated (GDD section 11), minutes not
 * padded. Capped at `99:59.99` for display only. Bad input gives `0:00.00`.
 */
export function formatTime(steps: number, stepHz: number): string {
  if (!Number.isFinite(steps) || !Number.isFinite(stepHz) || steps <= 0 || stepHz <= 0) return '0:00.00';
  const hundredths = Math.min(MAX_HUNDREDTHS, Math.floor((Math.floor(steps) * 100) / stepHz));
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const rest = hundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(rest).padStart(2, '0')}`;
}

/** Best step count for a level, or null. Reads own keys only. */
export function bestStepsOf(progress: Progress, id: string): number | null {
  return Object.prototype.hasOwnProperty.call(progress.bestSteps, id) ? (progress.bestSteps[id] ?? null) : null;
}

/** Best time as display text, or null when the level has no best. */
export function bestTimeText(progress: Progress, id: string, stepHz: number): string | null {
  const best = bestStepsOf(progress, id);
  return best === null ? null : formatTime(best, stepHz);
}

export interface RunRecordInput {
  readonly levelId: string;
  /** `level.meta.world`; world 0 (test rooms) records nothing. */
  readonly world: number;
  /** `wonAtStep`. */
  readonly steps: number;
  /** True in replay mode (`?replay=1`): replays are not the player's runs. */
  readonly replay: boolean;
}

export interface RunRecordResult extends LevelResult {
  /** True when the level was not completed before this win (results marker FIRST CLEAR). */
  readonly firstClear: boolean;
  /** True when nothing was written on purpose (replay or world 0), as opposed to a rejected record. */
  readonly skipped: boolean;
}

/**
 * The one call a scene makes per win, before the results panel. Replay mode
 * and world 0 leave storage untouched. Anything else goes to
 * `store.recordLevelComplete`.
 */
export function recordRun(store: SaveStore, run: RunRecordInput): RunRecordResult {
  if (run.replay || run.world < 1) {
    return { recorded: false, newBest: false, firstClear: false, best: store.getBestSteps(run.levelId), skipped: true };
  }
  const wasCleared = store.isLevelCompleted(run.levelId);
  const result = store.recordLevelComplete(run.levelId, run.steps);
  return { ...result, firstClear: result.recorded && !wasCleared, skipped: false };
}
