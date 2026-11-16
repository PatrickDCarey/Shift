/**
 * Leaderboard rules shared by the client and the server (M3-04). Owner:
 * tech-lead. Import via `src/core/types`. Spec: docs/design/features/leaderboards.md
 * "Names" (SEC-2 ruling, 2026-11-05).
 *
 * The SQL check (`backend/migrations/0002_submit_run.sql`) and the edge function
 * (`backend/functions/submit-run/rules.ts`) cannot import this file, so they keep
 * copies; `scripts/submit-run.test.ts` fails if a copy differs from this one.
 */

/**
 * The display-name allow-list as source text: upper-case letters, digits and
 * `-`, in words separated by single spaces (no leading, trailing or double
 * space). Kept as a string so the SQL and function copies can be compared
 * character for character.
 */
export const DISPLAY_NAME_PATTERN = '^[A-Z0-9-]+( [A-Z0-9-]+)*$';

/** Shortest and longest display name, in characters (12 keeps a board row inside the panel at 1x). */
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 12;

const DISPLAY_NAME_RE = new RegExp(DISPLAY_NAME_PATTERN);

/**
 * True if `name` passes the shared name rule exactly as given. Nobody trims or
 * upper-cases on the caller's behalf: the server rejects anything that does not
 * match (code `name`), so the client checks the same string it will send. The
 * server's normalised blocklist is separate and never ships to the client.
 */
export function isDisplayName(name: string): boolean {
  return name.length >= DISPLAY_NAME_MIN_LENGTH && name.length <= DISPLAY_NAME_MAX_LENGTH && DISPLAY_NAME_RE.test(name);
}
