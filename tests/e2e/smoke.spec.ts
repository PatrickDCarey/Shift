/** Boot smoke: the game starts, draws a 480x270 canvas (pixel build, adr-pixel-rendering.md), and logs no console or page errors (shared auto fixture). */
import { TEST_TIMEOUT_MS, expect, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

test('boots the game and renders a 480x270 canvas', async ({ page }) => {
  await page.goto('./');
  await waitForHook(page);

  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width', '480');
  await expect(canvas).toHaveAttribute('height', '270');
});
