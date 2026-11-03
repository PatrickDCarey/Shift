/** Boot smoke: the game starts, draws a 960x540 canvas, and logs no console or page errors (shared auto fixture). */
import { EMBED_VIEWPORT, TEST_TIMEOUT_MS, expect, test, waitForHook } from './helpers';

test.use({ viewport: EMBED_VIEWPORT });
test.describe.configure({ timeout: TEST_TIMEOUT_MS });

test('boots the game and renders a 960x540 canvas', async ({ page }) => {
  await page.goto('./');
  await waitForHook(page);

  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width', '960');
  await expect(canvas).toHaveAttribute('height', '540');
});
