/**
 * Solution recordings bundled at build time as raw text, for `?replay=1`.
 * A separate glob from `levelFiles.ts`, which excludes solutions on purpose.
 * Owner: gameplay-engineer [scene].
 */
export const SOLUTION_FILES: Readonly<Record<string, string>> = import.meta.glob('/levels/*.solution.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
