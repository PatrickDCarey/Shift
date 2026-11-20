/**
 * The Pause and Controls overlays opened from a level (docs/design/features/pause.md checks 1, 7, 8, 13 and
 * controls-screen.md check 4; batch 6 review M1). Which scenes are running comes from the test-side Phaser handle
 * (`activeScenes`); the sim and `paused` come from `window.__redshift`. Keys only: no mouse after the page loads.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, activeScenes, expect, menuFocus, minStepSeen, pollScenes, pollState, snapshot, tap, test, waitForHook, watchSteps } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w1-02';

test.beforeEach(async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded && s.state.step > 5, 'standing at the spawn').toBe(true);
  await pollScenes(page, ['Game']);
});

/** Resolve after `n` rendered frames, counted in the page. */
function frames(page: Page, n: number): Promise<void> {
  return page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const tick = (): void => {
          i += 1;
          if (i >= count) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    n,
  );
}

async function openPause(page: Page, key: 'Escape' | 'KeyP'): Promise<number> {
  await page.keyboard.press(key);
  await pollScenes(page, ['Game', 'Pause'], `Pause open after ${key}`);
  await pollState(page, (s) => s.paused, 'paused').toBe(true);
  return (await snapshot(page))?.state.step ?? 0;
}

for (const key of ['Escape', 'KeyP'] as const) {
  test(`${key}: one press opens Pause, one press closes it, and nothing toggles it again (batch 6 review M1)`, async ({ page }) => {
    const step = await openPause(page, key);
    expect(await menuFocus(page, 'Pause'), 'RESUME is focused').toBe('resume');
    await frames(page, 30);
    expect((await snapshot(page))?.paused, 'the key that opened it did not also close it').toBe(true);
    expect((await snapshot(page))?.state.step, 'sim frozen').toBe(step);

    await page.keyboard.press(key);
    await pollScenes(page, ['Game'], 'Pause closed by one press');
    await pollState(page, (s) => !s.paused && s.state.step > step + 5, 'resumed and stepping').toBe(true);
    await frames(page, 30);
    expect((await snapshot(page))?.paused, 'the closing key did not pause again').toBe(false);
    expect(await activeScenes(page), 'Pause stayed closed').toEqual(['Game']);
  });
}

test('ArrowUp/W/ArrowDown/S move the Pause focus; no wrap; Enter on RESUME resumes', async ({ page }) => {
  await openPause(page, 'Escape');
  await tap(page, 'ArrowUp');
  await frames(page, 5);
  expect(await menuFocus(page, 'Pause'), 'no wrap above the first item').toBe('resume');
  await tap(page, 'ArrowDown');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('restart');
  await tap(page, 'KeyS');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('controls');
  await tap(page, 'KeyW');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('restart');
  await tap(page, 'ArrowUp');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('resume');
  await tap(page, 'Enter');
  await pollScenes(page, ['Game']);
  await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
});

test('the sim does not step while Pause or Controls is open (120 rendered frames each)', async ({ page }) => {
  const step = await openPause(page, 'Escape');
  await frames(page, 120);
  expect((await snapshot(page))?.state.step, 'frozen under Pause').toBe(step);

  await page.keyboard.press('ArrowDown');
  await frames(page, 3);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('controls');
  await page.keyboard.press('Enter');
  await pollScenes(page, ['Game', 'Controls'], 'Controls open over the paused game');
  expect((await snapshot(page))?.paused, '`paused` stays true while Controls is open').toBe(true);
  await frames(page, 120);
  expect((await snapshot(page))?.state.step, 'frozen under Controls').toBe(step);

  await page.keyboard.press('Escape'); // back to Pause, not to the game
  await pollScenes(page, ['Game', 'Pause'], 'Esc on Controls returns to Pause (controls-screen check 4)');
  expect(await menuFocus(page, 'Pause'), 'focus is on CONTROLS').toBe('controls');
  expect((await snapshot(page))?.state.step, 'step unchanged by the round trip').toBe(step);
  expect((await snapshot(page))?.paused).toBe(true);

  await page.keyboard.press('Escape');
  await pollScenes(page, ['Game']);
  await pollState(page, (s) => !s.paused && s.state.step > step + 5, 'resumed').toBe(true);
});

test('R in Pause restarts the run (step 0, gear 1, at the spawn) and closes Pause', async ({ page }) => {
  await page.keyboard.press('KeyE');
  await pollState(page, (s) => s.state.player.gear, 'gear 2').toBe(2);
  const before = await openPause(page, 'Escape');
  await watchSteps(page);
  await page.keyboard.press('KeyR');
  await pollScenes(page, ['Game'], 'Pause closed by R');
  await expect.poll(() => minStepSeen(page), { message: 'restarted: step back near 0', timeout: 20_000 }).toBeLessThan(Math.min(before, 20));
  await pollState(page, (s) => !s.paused && s.state.player.gear === 1, 'gear 1 again and running').toBe(true);
  expect((await snapshot(page))?.state.player.x, 'back at the spawn (column 1)').toBeCloseTo(1.5, 3);
  const a = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step > a + 30, 'the new run steps on').toBe(true);
  expect((await snapshot(page))?.state.status).toBe('playing');
});

test('RESTART (Enter on the item) behaves like R and does not leave Pause open', async ({ page }) => {
  const before = await openPause(page, 'Escape');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('restart');
  await watchSteps(page);
  await page.keyboard.press('Enter');
  await pollScenes(page, ['Game']);
  await expect.poll(() => minStepSeen(page), { message: 'restarted: step back near 0', timeout: 20_000 }).toBeLessThan(Math.min(before, 20));
  await pollState(page, (s) => !s.paused && s.state.status === 'playing', 'running again').toBe(true);
});

test('LEVELS leaves the level: level select opens focused on this level, the game is stopped, the save is unchanged (pause check 8)', async ({ page }) => {
  await openPause(page, 'Escape');
  for (let i = 0; i < 4; i += 1) { // RESUME, RESTART, CONTROLS, SETTINGS, LEVELS (batch 7 added SETTINGS)
    await page.keyboard.press('ArrowDown');
    await frames(page, 3); // taps inside one frame merge into one move
  }
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('levels');
  await page.keyboard.press('Enter');
  await pollScenes(page, ['LevelSelect'], 'level select only');
  await expect.poll(() => menuFocus(page, 'LevelSelect'), { message: 'focus on the level just left' }).toBe(LEVEL);
  expect(await page.evaluate(() => window.__redshift), 'the game scene is gone, so is the hook').toBeUndefined();
  const raw = await page.evaluate(() => window.localStorage.getItem('redshift.save'));
  const progress = raw === null ? null : (JSON.parse(raw) as { progress: { completedLevels: string[] } }).progress;
  expect(progress?.completedLevels ?? [], 'no level was completed').toEqual([]);
});

test('Esc and Space pressed together in play: Pause opens and after RESUME nothing jumped (pause check 13)', async ({ page }) => {
  const s0 = (await snapshot(page))?.state;
  await page.evaluate(() => {
    for (const code of ['Escape', 'Space']) window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
  });
  await pollScenes(page, ['Game', 'Pause'], 'Pause opened');
  await pollState(page, (s) => s.paused, 'paused').toBe(true);
  await page.evaluate(() => {
    for (const code of ['Escape', 'Space']) window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
  });
  await page.keyboard.press('Escape');
  await pollScenes(page, ['Game']);
  const at = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => !s.paused && s.state.step >= at + 30, 'resumed').toBe(true);
  const s1 = (await snapshot(page))?.state;
  expect(s1?.player.grounded, 'no jump from the Space of that frame').toBe(true);
  expect(s1?.player.y, 'still on the floor').toBeCloseTo(s0?.player.y ?? 0, 6);
});

test('ArrowUp and W still navigate Pause after an R restart (batch 6 review: navigation after a restart)', async ({ page }) => {
  await openPause(page, 'Escape');
  await page.keyboard.press('KeyR');
  await pollScenes(page, ['Game']);
  await pollState(page, (s) => !s.paused && s.state.status === 'playing', 'restarted').toBe(true);
  await openPause(page, 'Escape');
  expect(await menuFocus(page, 'Pause'), 'RESUME focused again on a fresh open').toBe('resume');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('restart');
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('resume');
  await page.keyboard.press('KeyS');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('restart');
  await page.keyboard.press('KeyW');
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('resume');
});
