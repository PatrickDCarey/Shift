/**
 * Solution recordings bundled at build time as raw text, for `?replay=1`.
 * A separate glob from `levelFiles.ts`, which excludes solutions on purpose.
 *
 * Only dev and VITE_QA_HOOK=1 builds carry them. Vite inlines the flag, so in a
 * release build the ternary folds to `{}` and the eager raw imports are
 * tree-shaken: no recording text reaches dist/ (BUG-4, review F1).
 * Owner: gameplay-engineer [scene].
 */
const QA_HOOK = import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1';

export const SOLUTION_FILES: Readonly<Record<string, string>> = QA_HOOK
  ? (import.meta.glob('/levels/*.solution.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  : {};

/** Whether `?replay=1` does anything in this build. */
export const REPLAY_AVAILABLE: boolean = QA_HOOK;
