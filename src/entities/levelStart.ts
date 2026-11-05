/**
 * "First level start of the page session" for the Sticky Keys tip
 * (docs/design/features/sticky-keys-tip.md). A level start is a scene load from
 * the title, level select, NEXT, RETRY or a deep link; R and respawns are not.
 * The page session is the lifetime of this module.
 *
 * Owner: gameplay-engineer [scene].
 */
export interface LevelStartTracker {
  /** True on the first call only. */
  consumeFirstStart(): boolean;
}

export function createLevelStartTracker(): LevelStartTracker {
  let used = false;
  return {
    consumeFirstStart(): boolean {
      const first = !used;
      used = true;
      return first;
    },
  };
}

/** The one tracker for this page session. */
export const pageLevelStarts: LevelStartTracker = createLevelStartTracker();
