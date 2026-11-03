/**
 * Keyboard bindings on the grey-box room (w0-02), read through the QA hook.
 * Spec: movement-and-gears.md check 17 (alternate bindings), GDD section 3.
 * Right Shift / E / X shift up; Left Shift / Q / Z shift down; all active at once.
 */
import { TEST_TIMEOUT_MS, expect, pollState, snapshot, test, waitForHook } from './helpers';

// The itch.io embed size. (A project's device preset would otherwise override the config-level viewport.)
test.use({ viewport: { width: 960, height: 540 } });
test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w0-02';
const SHIFT_UP = ['ShiftRight', 'KeyE', 'KeyX'] as const;
const SHIFT_DOWN = ['ShiftLeft', 'KeyQ', 'KeyZ'] as const;

test.beforeEach(async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  // Click the canvas so it has focus, as a player would in the itch.io embed.
  await page.locator('#game canvas').click();
  await pollState(page, (s) => s.state.player.grounded, 'player grounded at spawn').toBe(true);
});

test('spawns standing in gear 1', async ({ page }) => {
  const s = await snapshot(page);
  expect(s?.levelId).toBe(LEVEL);
  expect(s?.state.status).toBe('playing');
  expect(s?.state.player.gear).toBe(1);
  expect(s?.state.player.vx).toBe(0);
});

for (const key of SHIFT_UP) {
  test(`${key} raises the selected gear by one per press`, async ({ page }) => {
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after ${key}`).toBe(2);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after second ${key}`).toBe(3);
  });
}

for (const key of SHIFT_DOWN) {
  test(`${key} lowers the selected gear by one per press`, async ({ page }) => {
    // Climb to gear 3 with Right Shift, then come down with the key under test.
    await page.keyboard.press('ShiftRight');
    await pollState(page, (s) => s.state.player.gear).toBe(2);
    await page.keyboard.press('ShiftRight');
    await pollState(page, (s) => s.state.player.gear).toBe(3);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after ${key}`).toBe(2);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after second ${key}`).toBe(1);
  });
}

test('gear clamps at 1 and 4 and extra presses are not stored', async ({ page }) => {
  await page.keyboard.press('ShiftLeft');
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyZ');
  // A later press proves the clamped ones were dropped rather than stored.
  await page.keyboard.press('KeyE');
  await pollState(page, (s) => s.state.player.gear, 'clamped low, then one up').toBe(2);
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ShiftRight');
  await pollState(page, (s) => s.state.player.gear, 'clamped high').toBe(4);
  await page.keyboard.press('KeyX');
  await page.keyboard.press('KeyZ');
  await pollState(page, (s) => s.state.player.gear, 'one up at the cap, one down').toBe(3);
});

test('holding a shift key does not auto-repeat the gear change', async ({ page }) => {
  await page.keyboard.down('ShiftRight');
  await pollState(page, (s) => s.state.player.gear).toBe(2);
  // Browser key-repeat events while the key stays down.
  for (let i = 0; i < 5; i += 1) await page.keyboard.down('ShiftRight');
  const at = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step >= at + 30, 'sim advances 30 steps').toBe(true);
  await pollState(page, (s) => s.state.player.gear).toBe(2);
  await page.keyboard.up('ShiftRight');
});

test('holding ArrowRight moves the player right; letting go stops it and keeps the gear', async ({ page }) => {
  const start = (await snapshot(page))?.state.player.x ?? 0;
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.x > start + 1, 'player moved right').toBe(true);
  await pollState(page, (s) => s.state.player.vx > 0, 'positive speed while held').toBe(true);
  await page.keyboard.up('ArrowRight');
  await pollState(page, (s) => s.state.player.vx === 0, 'speed returns to 0 after release').toBe(true);
  await pollState(page, (s) => s.state.player.gear).toBe(1);
});

test('D and A move the player like the arrows', async ({ page }) => {
  const start = (await snapshot(page))?.state.player.x ?? 0;
  await page.keyboard.down('KeyD');
  await pollState(page, (s) => s.state.player.x > start + 0.5, 'D moves right').toBe(true);
  await page.keyboard.up('KeyD');
  await pollState(page, (s) => s.state.player.vx === 0).toBe(true);
  const mid = (await snapshot(page))?.state.player.x ?? 0;
  await page.keyboard.down('KeyA');
  await pollState(page, (s) => s.state.player.x < mid - 0.5, 'A moves left').toBe(true);
  await page.keyboard.up('KeyA');
});

// FIXME(qa-tester): w0-02's spawn has a low ceiling (0.5 tiles of headroom); jump somewhere open. See requests.md 2026-11-03.
test.fixme('Space, W and ArrowUp each jump', async ({ page }) => {
  for (const key of ['Space', 'KeyW', 'ArrowUp']) {
    await pollState(page, (s) => s.state.player.grounded, `grounded before ${key}`).toBe(true);
    const floorY = (await snapshot(page))?.state.player.y ?? 0;
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.y < floorY - 0.5, `${key} lifted the player`).toBe(true);
    await pollState(
      page,
      (s) => s.state.player.grounded && Math.abs(s.state.player.y - floorY) < 1e-6,
      `landed after ${key}`,
    ).toBe(true);
  }
});

test('bound keys are captured: default prevented and the page does not scroll', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as unknown as { __prevented: Record<string, boolean> };
    w.__prevented = {};
    // Registered after the game's own listener on the same target, so it runs after it.
    window.addEventListener('keydown', (e) => {
      w.__prevented[e.code] = e.defaultPrevented;
    });
    const spacer = document.createElement('div');
    spacer.style.cssText = 'height:5000px;width:1px';
    document.body.appendChild(spacer);
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  });
  const codes = ['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX'];
  for (const code of codes) await page.keyboard.press(code);
  await pollState(page, (s) => s.state.step > 5).toBe(true);
  const result = await page.evaluate(() => ({
    prevented: (window as unknown as { __prevented: Record<string, boolean> }).__prevented,
    scrollY: window.scrollY,
  }));
  for (const code of codes) expect(result.prevented[code], `${code} defaultPrevented`).toBe(true);
  expect(result.scrollY, 'page scrollY').toBe(0);
});
