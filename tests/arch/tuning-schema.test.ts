/**
 * Keeps src/data/tuning.json (design-lead) and the `Tuning` type (tech-lead)
 * in lockstep, both ways: a key added, removed or retyped on either side fails
 * CI. Compile-time half: the type assertions below (npm run typecheck).
 * Runtime half: `tuningErrors` against the real file. Owner: tech-lead.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import tuningJson from '../../src/data/tuning.json';
import { isTuning, TUNING_SCHEMA, tuningErrors, type Tuning } from '../../src/core/types';

// --- Compile-time: JSON keys == Tuning keys -------------------------------
type JsonKeys = keyof typeof tuningJson;
type MissingFromJson = Exclude<keyof Tuning, JsonKeys>;
type MissingFromType = Exclude<JsonKeys, keyof Tuning>;
const noKeyMissingFromJson: [MissingFromJson] extends [never] ? true : MissingFromJson = true;
const noKeyMissingFromType: [MissingFromType] extends [never] ? true : MissingFromType = true;

const TUNING_PATH = resolve(import.meta.dirname, '..', '..', 'src', 'data', 'tuning.json');
const raw: unknown = JSON.parse(readFileSync(TUNING_PATH, 'utf8'));
const valid = raw as Record<string, unknown>;

describe('src/data/tuning.json matches the Tuning type', () => {
  it('compile-time key checks hold', () => {
    expect(noKeyMissingFromJson && noKeyMissingFromType).toBe(true);
  });

  it('has exactly the schema keys and valid values', () => {
    expect(tuningErrors(raw)).toEqual([]);
    expect(isTuning(raw)).toBe(true);
    expect(Object.keys(valid).sort()).toEqual(Object.keys(TUNING_SCHEMA).sort());
  });

  it('keeps gear settings consistent with each other', () => {
    if (!isTuning(raw)) throw new Error('invalid tuning');
    expect(raw.startGear).toBeGreaterThanOrEqual(raw.minGear);
    expect(raw.gearSpeeds[raw.instantMaxGear]).toBeGreaterThan(0);
  });
});

describe('tuningErrors (self-check)', () => {
  const without = (key: string): Record<string, unknown> =>
    Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));

  it('rejects non-objects', () => {
    for (const bad of [null, 3, 'x', []]) expect(tuningErrors(bad)).toEqual(['tuning: expected a JSON object']);
  });

  it('reports missing and unknown keys', () => {
    expect(tuningErrors(without('minGear'))).toEqual(['tuning: missing key "minGear"']);
    expect(tuningErrors({ ...valid, pivotMaxBand: 1 })).toEqual(['tuning: unknown key "pivotMaxBand"']);
    expect(tuningErrors({ ...valid, toString: 1 })).toEqual(['tuning: unknown key "toString"']);
  });

  it.each<[string, unknown]>([
    ['stepHz', 60.5],
    ['stepHz', 0],
    ['tilesPerGearChange', -1],
    ['tilesPerGearChange', '1.25'],
    ['coyoteMs', -6],
    ['coyoteMs', Number.NaN],
    ['startGear', 0],
    ['startGear', 5],
    ['airDragMinBand', 1.5],
    ['gearSpeeds', [1, 3, 6, 9, 12]],
    ['gearSpeeds', [0, 3, 3, 9, 12]],
    ['gearSpeeds', [0, 3, 6, 9]],
    ['colorBandEdges', [0, 4.5, 7.5, 10.5]],
    ['colorBandEdges', [1.5, 4.5, 7.5, 7.5]],
    ['colorBandEdges', 'nope'],
  ])('rejects %s = %j', (key, value) => {
    const errors = tuningErrors({ ...valid, [key]: value });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(new RegExp(`^tuning\\.${key}: expected`));
    expect(isTuning({ ...valid, [key]: value })).toBe(false);
  });

  it('accepts zero ms (feature off) and band 0', () => {
    expect(tuningErrors({ ...valid, coyoteMs: 0, airDragMinBand: 0 })).toEqual([]);
  });
});
