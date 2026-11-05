/**
 * Embed basics: itch.io runs the game in a 960x540 iframe, keyboard only.
 * Covers canvas size, focus handling and the page not scrolling under the host.
 * Console and page errors fail every test through the shared auto fixture.
 */
import { EMBED_VIEWPORT, TEST_TIMEOUT_MS, expect, pollState, snapshot, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w0-02';

test('canvas is 960x540 logical and fills the 960x540 viewport', async ({ page }) => {
  // The project's default viewport is the itch.io embed size (BUG-2 regression guard: no per-spec test.use).
  expect(page.viewportSize()).toEqual(EMBED_VIEWPORT);
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

// pause.md: losing focus pauses the game and drops every held key (the browser loses the key-up events), so
// nothing sticks. The sim freezes; after resuming, Right counts as held only if it is pressed again.
// More pause checks are in pause.spec.ts.
test('losing window focus pauses the game and drops held keys (nothing sticks)', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await page.locator('#game canvas').click();
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0 && s.state.player.x > 1, 'moving').toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await pollState(page, (s) => s.paused, 'paused after blur').toBe(true);
  const frozen = (await snapshot(page))?.state.step ?? 0;
  await page.evaluate(() => new Promise<void>((done) => { let n = 0; const t = (): void => { n += 1; if (n >= 30) done(); else requestAnimationFrame(t); }; requestAnimationFrame(t); }));
  expect((await snapshot(page))?.state.step, 'step count frozen while paused').toBe(frozen);
  await page.keyboard.press('Escape'); // resume; Right is still physically down in the test keyboard
  await pollState(page, (s) => !s.paused && s.state.step >= frozen + 20, 'resumed and stepping').toBe(true);
  await pollState(page, (s) => s.state.player.vx, 'the dropped key is not held again').toBe(0);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0, 'pressed again: moving').toBe(true);
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

// Why this test once never found `window.__redshift`: the host page was `about:blank` + `setContent`,
// and Chrome's Local Network Access check refuses to let such a page frame http://localhost
// (`net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`), so the frame was `chrome-error://`. Not a game bug.
// The host is now a routed page on the preview server's own origin (a different loopback origin is blocked the same way;
// the cross-origin case is not covered here, only framing, focus, key capture and host scroll).
test('inside a 960x540 iframe: keys work and the host page does not scroll', async ({ page, baseURL }) => {
  const src = new URL(`./?level=${LEVEL}`, baseURL).toString();
  const hostUrl = new URL('./itch-host.html', baseURL).toString();
  await page.route(hostUrl, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><body style="margin:0"><div style="height:3000px"><iframe id="g" src="${src}" width="960" height="540" style="border:0"></iframe></div></body>`,
    }),
  );
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto(hostUrl);
  const frame = await (await page.waitForSelector('#g')).contentFrame();
  if (!frame) throw new Error('iframe has no content frame');
  expect(frame.url(), 'iframe loaded the game, not an error page').toContain(`level=${LEVEL}`);
  await waitForHook(frame);
  await frame.locator('#game canvas').click();
  await expect(frame.locator('#game canvas')).toHaveAttribute('width', '960');
  const step0 = (await snapshot(frame))?.state.step ?? 0;
  for (const key of ['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) await page.keyboard.press(key);
  // The spawn pad has headroom since w0-02 v2, so Space is a full 48-step jump; a shift pressed in the air is
  // dropped by design (shift buffer, 6 steps). Wait for the jump to be over (sim steps, not wall clock).
  await pollState(frame, (s) => s.state.step >= step0 + 100 && s.state.player.grounded, 'back on the ground after the jump keys').toBe(true);
  await page.keyboard.press('ShiftRight');
  await pollState(frame, (s) => s.state.player.gear, 'gear after Right Shift in the iframe').toBe(2);
  expect(await page.evaluate(() => window.scrollY), 'host page scrollY').toBe(0);
});
