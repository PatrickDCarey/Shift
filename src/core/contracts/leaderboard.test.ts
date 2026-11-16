import { describe, expect, it } from 'vitest';
import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH, DISPLAY_NAME_PATTERN, isDisplayName } from '../types';

describe('display-name rule (M3-04, SEC-2)', () => {
  it('is the ruled pattern and length', () => {
    expect(DISPLAY_NAME_PATTERN).toBe('^[A-Z0-9-]+( [A-Z0-9-]+)*$');
    expect([DISPLAY_NAME_MIN_LENGTH, DISPLAY_NAME_MAX_LENGTH]).toEqual([1, 12]);
  });

  it.each(['ACE', 'A', 'X-1', 'TOP GUN', 'A B C', '0', '-', 'ABCDEFGHIJKL', 'AB CD-EF 12'])('accepts %j', (name) => {
    expect(isDisplayName(name)).toBe(true);
  });

  // leaderboards.md acceptance 11: double space, leading space, 13 chars, lower case.
  it.each([
    '',
    'A  CE',
    ' ACE',
    'ACE ',
    'ABCDEFGHIJKLM',
    'ace',
    'Ace',
    'ACE_1',
    'ACE\tX',
    'ACE\n',
    'ÄCE',
    'ACE​',
    'A‮CE',
  ])('rejects %j', (name) => {
    expect(isDisplayName(name)).toBe(false);
  });

  it('counts length before the pattern, so 12 is the last valid length', () => {
    expect(isDisplayName('A'.repeat(DISPLAY_NAME_MAX_LENGTH))).toBe(true);
    expect(isDisplayName('A'.repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toBe(false);
  });
});
