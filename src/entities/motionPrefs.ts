/**
 * Reduced motion: the player's saved setting OR the OS preference.
 * Owner: gameplay-engineer [scene].
 */
export interface MediaQueryLike {
  readonly matches: boolean;
}

export type MatchMediaLike = (query: string) => MediaQueryLike;

/** `prefers-reduced-motion: reduce`; false when matchMedia is missing or throws. */
export function prefersReducedMotion(matchMedia: MatchMediaLike | undefined): boolean {
  if (matchMedia === undefined) return false;
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function reducedMotion(settings: { readonly reducedMotion: boolean }, osPrefers: boolean): boolean {
  return settings.reducedMotion || osPrefers;
}
