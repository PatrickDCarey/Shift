import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS } from './bindings';
import { STICKY_TIP_DISMISS_CODES, isStickyTipDismissCode, isWindows, readPlatform, shouldShowStickyKeysTip } from './stickyKeysTip';
import type { PlatformInfo } from './stickyKeysTip';

const WIN_CHROME: PlatformInfo = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  platform: 'Win32',
  uaDataPlatform: 'Windows',
};
const WIN_FIREFOX: PlatformInfo = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  platform: 'Win32',
};
const MAC: PlatformInfo = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  platform: 'MacIntel',
};
const LINUX: PlatformInfo = { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0', platform: 'Linux x86_64', uaDataPlatform: 'Linux' };
const WIN_PHONE: PlatformInfo = { userAgent: 'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1) Edge/15', platform: 'Win32' };

describe('dismiss codes derive from the default bindings', () => {
  it('are Enter plus every non-Shift gear key', () => {
    const gear = [...DEFAULT_BINDINGS.shiftUp, ...DEFAULT_BINDINGS.shiftDown].filter((c) => !c.startsWith('Shift'));
    expect([...STICKY_TIP_DISMISS_CODES].sort()).toEqual(['Enter', ...gear].sort());
    expect([...STICKY_TIP_DISMISS_CODES].sort()).toEqual(['Enter', 'KeyE', 'KeyQ', 'KeyX', 'KeyZ']);
  });
});

describe('isWindows', () => {
  it.each([
    ['Chrome on Windows', WIN_CHROME, true],
    ['Firefox on Windows (no userAgentData)', WIN_FIREFOX, true],
    ['UA string only', { userAgent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64)' }, true],
    ['platform only', { userAgent: '', platform: 'Win32' }, true],
    ['macOS', MAC, false],
    ['Linux', LINUX, false],
    ['Windows Phone', WIN_PHONE, false],
    ['empty', { userAgent: '' }, false],
  ] as const)('%s -> %s', (_name, info, expected) => {
    expect(isWindows(info)).toBe(expected);
  });

  it('trusts userAgentData over a spoofed UA string', () => {
    expect(isWindows({ userAgent: 'Windows NT 10.0', uaDataPlatform: 'macOS' })).toBe(false);
  });
});

describe('shouldShowStickyKeysTip', () => {
  const base = { platform: WIN_CHROME, tipShown: false, isFirstLevelStart: true };

  it('shows on Windows, first level start, never shown before', () => {
    expect(shouldShowStickyKeysTip(base)).toBe(true);
  });

  it('does not show when it was shown before', () => {
    expect(shouldShowStickyKeysTip({ ...base, tipShown: true })).toBe(false);
  });

  it('does not show on later level starts', () => {
    expect(shouldShowStickyKeysTip({ ...base, isFirstLevelStart: false })).toBe(false);
  });

  it('does not show on non-Windows platforms', () => {
    expect(shouldShowStickyKeysTip({ ...base, platform: MAC })).toBe(false);
    expect(shouldShowStickyKeysTip({ ...base, platform: LINUX })).toBe(false);
  });
});

describe('dismiss keys and platform reading', () => {
  it('dismisses on Enter and alternate gear keys only', () => {
    for (const c of ['Enter', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX']) expect(isStickyTipDismissCode(c)).toBe(true);
    for (const c of ['ShiftLeft', 'ShiftRight', 'Space', 'ArrowRight', 'KeyR']) expect(isStickyTipDismissCode(c)).toBe(false);
  });

  it('readPlatform reads navigator-like objects and tolerates missing ones', () => {
    expect(readPlatform({ userAgent: 'ua', platform: 'Win32', userAgentData: { platform: 'Windows' } })).toEqual({
      userAgent: 'ua',
      platform: 'Win32',
      uaDataPlatform: 'Windows',
    });
    expect(readPlatform(undefined as unknown as undefined)).toEqual(expect.objectContaining({ userAgent: expect.any(String) }));
    const hostile = {
      get userAgent(): string {
        throw new Error('nope');
      },
    };
    expect(readPlatform(hostile)).toEqual({ userAgent: '' });
  });
});
