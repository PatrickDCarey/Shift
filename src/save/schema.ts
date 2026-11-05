/**
 * Save data shape, defaults, validation and migration. Pure: no DOM, no
 * storage access. Everything read back from storage goes through
 * `parseSave`, which never throws and always returns a complete `SaveData`.
 *
 * Owner: ui-engineer.
 */

/** Bump when the stored shape changes, and add a step to `MIGRATIONS`. */
export const SAVE_VERSION = 1;

export interface Settings {
  /** 0..1 */
  readonly musicVolume: number;
  /** 0..1 */
  readonly sfxVolume: number;
  /** Fewer flashes, particles and shader effects. */
  readonly reducedEffects: boolean;
  /** No screen shake, tweens and similar motion. */
  readonly reducedMotion: boolean;
  /** Audio mute. Added after v1 shipped: saves without it read as false (field-by-field defaults). */
  readonly muted: boolean;
  /** The one-time Windows Sticky Keys tip has been displayed. */
  readonly stickyKeysTipShown: boolean;
}

export interface Progress {
  /** Ids of completed levels, unique, in first-completion order. */
  readonly completedLevels: readonly string[];
  /** Best (lowest) step count per level id. */
  readonly bestSteps: Readonly<Record<string, number>>;
}

export interface SaveData {
  readonly version: number;
  readonly settings: Settings;
  readonly progress: Progress;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  musicVolume: 0.7,
  sfxVolume: 0.8,
  reducedEffects: false,
  reducedMotion: false,
  muted: false,
  stickyKeysTipShown: false,
});

export const DEFAULT_PROGRESS: Progress = Object.freeze({
  completedLevels: Object.freeze([]) as readonly string[],
  bestSteps: Object.freeze({}) as Readonly<Record<string, number>>,
});

/** Starts with a letter or digit (so `__proto__` can never be an id). */
const LEVEL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/i;
/** Sanity caps so corrupt data cannot grow without bound. */
const MAX_LEVELS = 256;
const MAX_STEPS = 10_000_000;

export function isValidLevelId(value: unknown): value is string {
  return typeof value === 'string' && LEVEL_ID_PATTERN.test(value);
}

/** A valid step count: a positive integer within sane bounds. */
export function isValidSteps(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_STEPS;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function volume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Validate settings field by field; invalid fields fall back to `fallback`. */
export function sanitizeSettings(raw: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const r = asRecord(raw);
  const pick = (key: keyof Settings): unknown => (hasOwn(r, key) ? r[key] : undefined);
  return {
    musicVolume: volume(pick('musicVolume'), fallback.musicVolume),
    sfxVolume: volume(pick('sfxVolume'), fallback.sfxVolume),
    reducedEffects: flag(pick('reducedEffects'), fallback.reducedEffects),
    reducedMotion: flag(pick('reducedMotion'), fallback.reducedMotion),
    muted: flag(pick('muted'), fallback.muted),
    stickyKeysTipShown: flag(pick('stickyKeysTipShown'), fallback.stickyKeysTipShown),
  };
}

/** Validate progress: drops bad ids and bad step counts, dedupes, caps size. */
export function sanitizeProgress(raw: unknown): Progress {
  const r = asRecord(raw);
  const completed = hasOwn(r, 'completedLevels') && Array.isArray(r.completedLevels) ? r.completedLevels : [];
  const completedLevels = [...new Set(completed.filter(isValidLevelId))].slice(0, MAX_LEVELS);

  const best = asRecord(hasOwn(r, 'bestSteps') ? r.bestSteps : undefined);
  const bestSteps: Record<string, number> = {};
  for (const id of Object.keys(best).slice(0, MAX_LEVELS)) {
    const steps = best[id];
    if (isValidLevelId(id) && isValidSteps(steps)) bestSteps[id] = steps;
  }
  return { completedLevels, bestSteps };
}

/** Build a complete `SaveData` at the current version from loosely-trusted parts. */
export function buildSave(settings: unknown, progress: unknown): SaveData {
  return { version: SAVE_VERSION, settings: sanitizeSettings(settings), progress: sanitizeProgress(progress) };
}

export function defaultSave(): SaveData {
  return buildSave(DEFAULT_SETTINGS, DEFAULT_PROGRESS);
}

/**
 * Migration steps, keyed by the version they upgrade FROM. Each takes the raw
 * record of that version and returns the raw record of the next. Empty while
 * the schema is at version 1.
 */
const MIGRATIONS: Readonly<Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>> = {};

function migrate(raw: Record<string, unknown>, from: number): Record<string, unknown> | null {
  let current = raw;
  for (let v = from; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return null; // gap in the chain: cannot upgrade safely
    current = step(current);
  }
  return current;
}

/**
 * Parse the stored string into a valid `SaveData`. Never throws.
 * - null / not JSON / not an object / missing or non-integer version -> defaults
 * - older version -> migrated (defaults if the chain is broken)
 * - newer version (written by a future build) -> read field by field, so
 *   additive changes survive; anything unrecognised is dropped
 * Every field is validated either way.
 */
export function parseSave(text: string | null): SaveData {
  if (text === null) return defaultSave();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return defaultSave();
  }
  const root = asRecord(parsed);
  const version = hasOwn(root, 'version') ? root.version : undefined;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return defaultSave();

  const upgraded = version < SAVE_VERSION ? migrate(root, version) : root;
  if (upgraded === null) return defaultSave();
  return buildSave(upgraded.settings, upgraded.progress);
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data);
}
