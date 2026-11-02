/**
 * Sticky Keys tip decision logic. Pure: no Phaser, no DOM access (the caller
 * passes platform strings; `readPlatform` is the one tiny browser reader).
 *
 * Why: on Windows, pressing Shift five times opens the Sticky Keys dialog, and
 * the Shift keys are core controls. The tip points players at Q/E and Z/X.
 * GDD section 3: shown once ever, on the first level start, on Windows.
 *
 * The Phaser panel that displays it is `StickyKeysTipView.ts`.
 *
 * Owner: ui-engineer.
 */

export interface PlatformInfo {
  /** `navigator.userAgent` */
  readonly userAgent: string;
  /** `navigator.platform` (deprecated but still widely filled in) */
  readonly platform?: string;
  /** `navigator.userAgentData?.platform` (Chromium) */
  readonly uaDataPlatform?: string;
}

/** Windows desktop detection. Windows Phone and other mobile Windows are excluded (no Shift key). */
export function isWindows(info: PlatformInfo): boolean {
  const ua = info.userAgent.toLowerCase();
  if (ua.includes('windows phone')) return false;
  if (info.uaDataPlatform !== undefined && info.uaDataPlatform !== '') {
    return info.uaDataPlatform.toLowerCase() === 'windows';
  }
  if ((info.platform ?? '').toLowerCase().startsWith('win')) return true;
  return ua.includes('windows nt') || ua.includes('win64') || ua.includes('win32');
}

export interface StickyTipContext {
  readonly platform: PlatformInfo;
  /** `settings.stickyKeysTipShown` from the save store. */
  readonly tipShown: boolean;
  /** True on the first level start of this session. */
  readonly isFirstLevelStart: boolean;
}

/** Should the one-time tip be displayed right now? */
export function shouldShowStickyKeysTip(ctx: StickyTipContext): boolean {
  return ctx.isFirstLevelStart && !ctx.tipShown && isWindows(ctx.platform);
}

/** Key codes that dismiss a visible tip: Enter, or using an alternate gear key (they got the message). */
export const STICKY_TIP_DISMISS_CODES: readonly string[] = ['Enter', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX'];

export function isStickyTipDismissCode(code: string): boolean {
  return STICKY_TIP_DISMISS_CODES.includes(code);
}

/** The tip auto-hides after this long if untouched. */
export const STICKY_TIP_AUTO_HIDE_MS = 12_000;

interface NavigatorLike {
  readonly userAgent?: string;
  readonly platform?: string;
  readonly userAgentData?: { readonly platform?: string };
}

/** Read platform strings from `navigator`, tolerating a missing or odd one. */
export function readPlatform(nav: NavigatorLike | undefined = globalThis.navigator): PlatformInfo {
  try {
    return {
      userAgent: nav?.userAgent ?? '',
      platform: nav?.platform ?? '',
      uaDataPlatform: nav?.userAgentData?.platform ?? '',
    };
  } catch {
    return { userAgent: '' };
  }
}
