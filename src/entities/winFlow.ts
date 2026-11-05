/**
 * What happens on the win step (docs/design/features/results.md): record the
 * result once, then tell whoever shows the results. Pure; the scene calls this
 * with the shared SaveStore and emits the returned event.
 *
 * The record itself is `recordRun` (src/save, ui-engineer): it calls
 * `store.recordLevelComplete` once, except in world 0 and replay mode.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { Level, RunResult } from '../core';
import { recordRun, type RunRecordResult, type SaveStore } from '../save';

/**
 * Scene event (`scene.events`) emitted once per win. The results screen
 * (ui-engineer, M2-12) subscribes to it; the payload is a `LevelCompleteEvent`.
 */
export const LEVEL_COMPLETE_EVENT = 'redshift:levelComplete';

export interface LevelCompleteEvent {
  readonly levelId: string;
  readonly title: string;
  readonly world: number;
  readonly result: RunResult;
  /** What `recordRun` returned; `skipped` is true for world 0 and replay mode (nothing written). */
  readonly saved: RunRecordResult;
  /** `?replay=1`: nothing is saved and no results panel should appear. */
  readonly replay: boolean;
}

/** Record the win (once per call; nothing in world 0 or replay mode) and describe it. */
export function recordWin(store: SaveStore, level: Level, result: RunResult, replayMode: boolean): LevelCompleteEvent {
  const { id, title, world } = level.meta;
  const saved = recordRun(store, {
    levelId: result.solution.levelId,
    world,
    steps: result.wonAtStep,
    replay: replayMode,
  });
  return { levelId: id, title, world, result, saved, replay: replayMode };
}
