/**
 * M2-60 additions. Written against the board's acceptance lines before the Batch 3 scene work lands:
 *  - `/` opens the title screen (batch 6, B6-24; it used to open w1-01).
 *  - a standing jump at the w0-02 spawn pad is a full 3-tile arc (headroom since w0-02 v2).
 *  - meter / banner fields: skipped with a message when the hook does not expose them yet.
 * w1-03..w1-05 replays need no case here: replay.spec.ts loops over every `levels/*.solution.txt`.
 */
import { TEST_TIMEOUT_MS, activeScenes, expect, gotoTitle, pollState, snapshot, startTracker, stopTracker, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

test('plain URL "/" opens the title screen, not a level (B6-24)', async ({ page }) => {
  await gotoTitle(page);
  expect(await activeScenes(page)).toEqual(['Title']);
  expect(await page.evaluate(() => window.__redshift), 'no game scene, so no hook').toBeUndefined();
});

test('an explicit ?level=w0-02 still opens w0-02', async ({ page }) => {
  await page.goto('./?level=w0-02');
  expect((await waitForHook(page)).levelId).toBe('w0-02');
});

test('a standing jump at the w0-02 spawn is a full 3-tile arc and lands back on the spawn floor', async ({ page }) => {
  await page.goto('./?level=w0-02');
  await waitForHook(page);
  await page.locator('#game canvas').click();
  await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded && s.state.step > 5, 'standing at the spawn').toBe(true);
  const floorY = (await snapshot(page))?.state.player.y ?? 0;
  const before = (await snapshot(page))?.state.step ?? 0;
  await startTracker(page);
  await page.keyboard.press('Space');
  await pollState(page, (s) => s.state.step >= before + 70 && s.state.player.grounded, 'jumped and landed').toBe(true);
  const track = await stopTracker(page);
  expect(track.some((t) => !t.grounded), 'left the ground').toBe(true);
  expect(floorY - Math.min(...track.map((t) => t.y)), 'apex height in tiles (spec: 3.00; the old 0.5-tile ceiling would cap it)').toBeGreaterThan(2.5);
  expect((await snapshot(page))?.state.player.y).toBeCloseTo(floorY, 6);
});

test.describe('HUD meter and banner fields (the banner is always null since batch 6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./?level=w1-01');
    await waitForHook(page);
    await page.locator('#game canvas').click();
    const has = await page.evaluate(() => window.__redshift?.meter !== undefined && window.__redshift?.banner !== undefined);
    test.skip(!has, 'hook has no meter/banner fields yet (M1-57 / scene lane not landed)');
    await pollState(page, (s) => s.state.player.grounded, 'standing').toBe(true);
  });

  test('pendingGear is null while standing, with no shift buffered', async ({ page }) => {
    const s = await snapshot(page);
    expect(s?.meter?.pendingGear).toBeNull();
    expect(s?.banner).toBeNull();
  });

  test('every gear press on the ground updates selectedGear and never sets pendingGear', async ({ page }) => {
    await page.keyboard.press('KeyE');
    await pollState(page, (s) => s.meter?.selectedGear, 'gear 2').toBe(2);
    expect((await snapshot(page))?.meter?.pendingGear).toBeNull();
    await page.keyboard.press('KeyZ');
    await pollState(page, (s) => s.meter?.selectedGear, 'gear 1').toBe(1);
  });
});
