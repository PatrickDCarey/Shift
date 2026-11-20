/**
 * Boot's retry and failure message (BUG-6; test-plan 9.6 B6-1..B6-3; tech-lead wave 2 review, answer to A-3).
 * Asset pattern `**\/assets/pixel-<name>-*.png` (font also `**\/assets/pixel-font-*.xml`). Phaser retries network failures
 * itself (up to 6 requests per file) but not decode failures (3 requests: Boot's own retry, 1 XHR then 2 `<img src>`
 * attempts after 500 ms and 2 s), so the cases here use a DECODE failure:
 * `route.fulfill({ status: 200, contentType: 'image/png', body: 'not a png' })`.
 * B6-4 reproduces the real failure signature (XHR 200 with a 0-byte blob) with an init script.
 */
import type { Page } from '@playwright/test';
import { BOOT_TIMEOUT_MS, TEST_TIMEOUT_MS, activeScenes, expect, pollScenes, test } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const SHEET = '**/assets/pixel-player-*.png';
const MESSAGE = 'COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.';

async function corrupt(page: Page, times: number | 'always'): Promise<{ count: () => number }> {
  let n = 0;
  await page.route(SHEET, async (route) => {
    n += 1;
    if (times === 'always' || n <= times) await route.fulfill({ status: 200, contentType: 'image/png', body: 'not a png' });
    else await route.continue();
  });
  return { count: () => n };
}

test('B6-1: one decode failure of a sheet is retried: the Title opens and Boot logs one warning', async ({ page }) => {
  const warns: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warns.push(m.text());
  });
  const hits = await corrupt(page, 1);
  await page.goto('./');
  await pollScenes(page, ['Title'], 'Title after a recovered load', BOOT_TIMEOUT_MS);
  expect(hits.count(), 'the sheet was requested again by Boot').toBeGreaterThanOrEqual(2);
  expect(await page.locator('#boot-error').count(), 'no failure message').toBe(0);
  const boot = warns.filter((w) => w.startsWith('Boot:'));
  expect(boot, `exactly one Boot: warning (all warnings: ${JSON.stringify(warns)})`).toHaveLength(1);
  // not a black screen: the canvas has more than one colour
  const colours = await page.evaluate(() => {
    const c = document.querySelector('#game canvas') as HTMLCanvasElement | null;
    return c ? c.toDataURL().length : 0;
  });
  expect(colours, 'canvas has content').toBeGreaterThan(2000);
});

test('B6-2: an always-corrupt sheet shows the failure message in #boot-error, no game, a bounded number of requests', async ({ page, errors }) => {
  const hits = await corrupt(page, 'always');
  await page.goto('./');
  const el = page.locator('#boot-error');
  await expect(el).toHaveText(MESSAGE, { timeout: BOOT_TIMEOUT_MS });
  expect(await el.getAttribute('role'), 'role alert').toBe('alert');
  expect(await page.evaluate(() => window.__redshift), 'no hook').toBeUndefined();
  expect(await activeScenes(page), 'no menu scene started').not.toContain('Title');
  const settled = hits.count();
  expect(settled, 'a bounded number of requests (3 attempts)').toBeLessThanOrEqual(3);
  await page.waitForTimeout(2000);
  expect(hits.count(), 'no endless retry').toBe(settled);
  // Expected: Phaser logs the failed decodes as console errors, then Boot's own line.
  expect(errors.length, 'the expected console errors were logged').toBeGreaterThan(0);
  errors.length = 0;
});

test('B6-4: every pixel sheet XHR returns an empty blob (BUG-6 signature): attempt 2 over <img> recovers, one warning', async ({ page }) => {
  const pending: Promise<string>[] = [];
  page.on('console', (m) => {
    // The warning is printf-style (`%s ... %d`), so join the argument values rather than reading m.text().
    if (m.type() === 'warning') {
      pending.push(
        Promise.all(m.args().map((a) => a.jsonValue())).then(([fmt, ...vals]) => {
          let i = 0;
          return String(fmt).replace(/%[sd]/g, () => String(vals[i++]));
        }),
      );
    }
  });
  await page.addInitScript(() => {
    const open = XMLHttpRequest.prototype.open;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    XMLHttpRequest.prototype.open = function (this: any, m: string, url: string | URL, ...rest: any[]) {
      this.__url = String(url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (open as any).call(this, m, url, ...rest);
    };
    const res = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
    Object.defineProperty(XMLHttpRequest.prototype, 'response', {
      get() {
        return /pixel-.*\.png/.test(this.__url ?? '') && this.responseType === 'blob'
          ? new Blob([], { type: 'image/png' })
          : res?.get?.call(this);
      },
    });
  });
  await page.goto('./');
  await pollScenes(page, ['Title'], 'Title after empty-blob sheets', BOOT_TIMEOUT_MS);
  expect(await page.locator('#boot-error').count(), 'no failure message').toBe(0);
  const warns = await Promise.all(pending);
  const recovered = warns.filter((w) => w.startsWith('Boot:') && /loaded on attempt 2$/.test(w));
  expect(recovered, `exactly one "loaded on attempt 2" warning (all warnings: ${JSON.stringify(warns)})`).toHaveLength(1);
});

test('B6-3: a clean boot fetches no asset URL twice and logs no Boot: warning', async ({ page }) => {
  const urls: string[] = [];
  const warns: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/assets/')) urls.push(r.url());
  });
  page.on('console', (m) => {
    if (m.type() === 'warning') warns.push(m.text());
  });
  await page.goto('./');
  await pollScenes(page, ['Title'], 'Title', BOOT_TIMEOUT_MS);
  expect(urls.length, 'assets were fetched').toBeGreaterThan(0);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  expect(dupes, 'no asset fetched twice').toEqual([]);
  expect(warns.filter((w) => w.startsWith('Boot:')), 'no Boot warning').toEqual([]);
});
