/**
 * Sticky Keys tip mounting (sticky-keys-tip.md, M2-39 scene lane). The tip is a canvas panel, so the observable
 * effect is the save flag `settings.stickyKeysTipShown` (set when the tip is shown, once ever) and that play is
 * not blocked while it is up. The logic itself is unit-tested (`src/ui/stickyKeysTip.test.ts`).
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, expect, pollState, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const SAVE_KEY = 'redshift.save';
const WINDOWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function tipShown(page: Page): Promise<boolean | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return (JSON.parse(raw) as { settings?: { stickyKeysTipShown?: boolean } }).settings?.stickyKeysTipShown ?? null;
  }, SAVE_KEY);
}

test.describe('Windows user agent', () => {
  test.use({ userAgent: WINDOWS_UA });

  test('the tip is shown once on the first level start and never blocks input', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    });
    await page.goto('./?level=w1-01');
    await waitForHook(page);
    await page.locator('#game canvas').click();
    await expect.poll(() => tipShown(page), { message: 'stickyKeysTipShown after the first level start' }).toBe(true);
    // Keys still reach the game while the tip is up.
    await page.keyboard.down('ArrowRight');
    await pollState(page, (s) => s.state.player.vx > 0, 'moving with the tip up').toBe(true);
    await page.keyboard.up('ArrowRight');
    // The flag persists across a reload (the tip is once ever).
    await page.reload();
    await waitForHook(page);
    expect(await tipShown(page), 'flag persists').toBe(true);
  });

  test('replay mode never shows the tip', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    });
    await page.goto('./?level=w1-01&replay=1&speed=60');
    await waitForHook(page);
    await pollState(page, (s) => s.state.step > 5, 'replay running').toBe(true);
    expect(await tipShown(page), 'flag not set by a replay').not.toBe(true);
  });
});

test.describe('non-Windows user agent', () => {
  test.use({ userAgent: MAC_UA });

  test('no tip, flag stays unset', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    });
    await page.goto('./?level=w1-01');
    await waitForHook(page);
    await pollState(page, (s) => s.state.step > 10, 'running').toBe(true);
    expect(await tipShown(page)).not.toBe(true);
  });
});
