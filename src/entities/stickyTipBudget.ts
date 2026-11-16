/**
 * B1 (sticky-keys-tip.md, pause.md): the Sticky Keys tip's 12 s count only
 * unpaused time. A pause hides the tip; resume brings it back for what is left.
 * Pure bookkeeping, times in ms from any monotonic clock.
 *
 * Owner: gameplay-engineer [scene].
 */
export interface TipBudget {
  /** Unpaused time left. */
  readonly remainingMs: number;
  /** Clock reading when the tip last became visible, or null while hidden for a pause. */
  readonly shownAt: number | null;
}

export function startTipBudget(totalMs: number, now: number): TipBudget {
  return { remainingMs: totalMs, shownAt: now };
}

/** The game paused: bank the time spent visible. */
export function pauseTipBudget(budget: TipBudget, now: number): TipBudget {
  if (budget.shownAt === null) return budget;
  return { remainingMs: Math.max(0, budget.remainingMs - (now - budget.shownAt)), shownAt: null };
}

/** The game resumed: the clock starts again from what is left. */
export function resumeTipBudget(budget: TipBudget, now: number): TipBudget {
  return budget.shownAt === null ? { ...budget, shownAt: now } : budget;
}
