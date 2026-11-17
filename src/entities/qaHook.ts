/**
 * The one build-time QA flag (B6-27, C1). `window.__redshift` and the bundled
 * solution recordings exist only when it is true: in dev and in builds made with
 * VITE_QA_HOOK=1 (Playwright's e2e build). Vite inlines both at build time, so
 * the itch.io build has no hook at all. tests/arch/qa-hook.test.ts requires every
 * `'__redshift'` use to sit on an `if (QA_HOOK)` line and every user to import it
 * from here. Owner: gameplay-engineer [scene].
 */
export const QA_HOOK = import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1';
