/**
 * Level text bundled at build time (no fetch, so the itch.io zip works).
 * The only place that calls `import.meta.glob`. Solutions are excluded.
 * Owner: gameplay-engineer [scene].
 */
export const LEVEL_FILES: Readonly<Record<string, string>> = import.meta.glob(
  ['/levels/*.txt', '!/levels/*.solution.txt'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
