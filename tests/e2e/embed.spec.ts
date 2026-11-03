/**
 * Embed basics: itch.io runs the game in a 960x540 iframe, keyboard only.
 * Covers canvas size, focus handling and the page not scrolling under the host.
 * Console and page errors fail every test through the shared auto fixture.
 */
import { TEST_TIMEOUT_MS, expect, pollState, snapshot, test, waitForHook } from './helpers';

// The itch.io embed size. (A project's device preset would otherwise override the config-level viewport.)
test.use({ viewport: { width: 960, height: 540 } });
test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w0-02';

test('canvas is 960x540 logical and fills the 960x540 viewport', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  const canvas = page.locator('#game canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('width', '960');
  await expect(canvas).toHaveAttribute('height', '540');
  const box = await canvas.boundingBox();
  expect(box?.width).toBeCloseTo(960, 0);
  expect(box?.height).toBeCloseTo(540, 0);
});

test('no scrollbars at 960x540', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow).toEqual({ x: 0, y: 0 });
});

test('canvas scales down in a smaller viewport and keeps 16:9', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await expect(page.locator('#game canvas')).toHaveAttribute('width', '960');
  const box = await page.locator('#game canvas').boundingBox();
  expect(box?.width).toBeLessThanOrEqual(640.5);
  expect(box ? box.width / box.height : 0).toBeCloseTo(16 / 9, 1);
});

test('keys work after clicking the canvas', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await page.locator('#game canvas').click();
  await page.keyboard.press('KeyE');
  await pollState(page, (s) => s.state.player.gear, 'gear after E').toBe(2);
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0, 'moving').toBe(true);
  await page.keyboard.up('ArrowRight');
});

test('losing window focus releases held keys (nothing sticks)', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await page.locator('#game canvas').click();
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0, 'moving').toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await pollState(page, (s) => s.state.player.vx === 0, 'stopped after blur with the key still down').toBe(true);
  await page.keyboard.up('ArrowRight');
});

test('browser shortcuts are left alone (Ctrl+E is not a gear shift)', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await page.locator('#game canvas').click();
  await page.keyboard.press('Control+KeyE');
  const at = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step >= at + 20, 'sim runs past the press').toBe(true);
  await pollState(page, (s) => s.state.player.gear).toBe(1);
});

// FIXME(qa-tester): never finds window.__redshift inside the iframe; a manual iframe check does. See requests.md 2026-11-03.
test.fixme('inside a 960x540 iframe: keys work and the host page does not scroll', async ({ page, baseURL }) => {
  const src = new URL(`./?level=${LEVEL}`, baseURL).toString();
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto('about:blank');
  await page.setContent(
    `<body style="margin:0"><div style="height:3000px"><iframe id="g" src="${src}" width="960" height="540" style="border:0"></iframe></div></body>`,
  );
  const handle = await page.waitForSelector('#g');
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('iframe has no content frame');
  await waitForHook(frame);
  await frame.locator('#game canvas').click();
  await expect(frame.locator('#game canvas')).toHaveAttribute('width', '960');
  for (const key of ['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) await page.keyboard.press(key);
  await page.keyboard.press('ShiftRight');
  await pollState(frame, (s) => s.state.player.gear, 'gear after Right Shift in the iframe').toBe(2);
  expect(await page.evaluate(() => window.scrollY), 'host page scrollY').toBe(0);
});
