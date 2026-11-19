/**
 * Boot smoke: a plain load opens the title screen (B6-24), draws a 480x270 canvas (pixel build, adr-pixel-rendering.md),
 * and logs no console or page errors (shared auto fixture). A `?level=` deep link still opens the game directly.
 */
import { TEST_TIMEOUT_MS, activeScenes, expect, gotoTitle, menuFocus, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

test('a plain load opens the title screen: only Title is active, PLAY is focused, no game scene hook', async ({ page }) => {
  await gotoTitle(page);
  expect(await activeScenes(page), 'only the title is running').toEqual(['Title']);
  expect(await menuFocus(page, 'Title'), 'initial focus').toBe('play');
  expect(await page.evaluate(() => window.__redshift), 'the game scene (and its hook) has not started').toBeUndefined();

  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width', '480');
  await expect(canvas).toHaveAttribute('height', '270');
});

test('a ?level= deep link boots the game directly, not the title', async ({ page }) => {
  await page.goto('./?level=w1-01');
  const first = await waitForHook(page);
  expect(first.levelId).toBe('w1-01');
  expect(await activeScenes(page)).toEqual(['Game']);
});

test('?replay=1 alone also boots the game directly', async ({ page }) => {
  await page.goto('./?replay=1&speed=60');
  const first = await waitForHook(page);
  expect(first.replay?.active, 'replay mode').toBe(true);
  expect(await activeScenes(page)).toEqual(['Game']);
});
