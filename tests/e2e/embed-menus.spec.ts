/**
 * Batch 5 review U1 and menu-navigation.md: while a menu is open, arrow keys and Space (and Esc, Enter, WASD) never
 * scroll the page that embeds the game. The host is a tall scrollable page with the game in a 960x540 iframe, the way
 * itch.io embeds it. Every key is also shown to have done its menu job, so the test cannot pass because the keys went
 * nowhere. Keyboard only after the initial focus click (the game has no mouse input; the click is what a player does
 * on itch.io's "Run game" button).
 */
import type { Frame, Page } from '@playwright/test';
import { EMBED_VIEWPORT, POLL_TIMEOUT_MS, TEST_TIMEOUT_MS, expect, menuFocus, nextFrames, pollScenes, pollState, resultsPanelUp, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const HOST_PATH = './itch-host-menus.html';

async function openHost(page: Page, baseURL: string | undefined, query = ''): Promise<Frame> {
  const src = new URL(`./${query}`, baseURL).toString();
  const hostUrl = new URL(HOST_PATH, baseURL).toString();
  await page.route(hostUrl, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><body style="margin:0"><div style="height:3000px"><iframe id="g" src="${src}" width="${EMBED_VIEWPORT.width}" height="${EMBED_VIEWPORT.height}" style="border:0"></iframe></div></body>`,
    }),
  );
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto(hostUrl);
  const frame = await (await page.waitForSelector('#g')).contentFrame();
  if (!frame) throw new Error('iframe has no content frame');
  return frame;
}

/** Press `key` and assert neither the host page nor the frame scrolled. */
async function pressNoScroll(page: Page, frame: Frame, key: string): Promise<void> {
  await page.keyboard.press(key);
  await nextFrames(frame, 3);
  expect(await page.evaluate(() => window.scrollY), `host page scrollY after ${key}`).toBe(0);
  expect(await frame.evaluate(() => window.scrollY), `frame scrollY after ${key}`).toBe(0);
}

test('menus in a 960x540 iframe in a tall host page: arrows, Space, Enter, Esc and WASD never scroll it', async ({ page, baseURL }) => {
  const frame = await openHost(page, baseURL);
  await pollScenes(frame, ['Title'], 'title in the iframe', 45_000);
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('play');
  await frame.locator('#game canvas').click();
  expect((await frame.locator('#game canvas').boundingBox())?.width, '2x canvas').toBeCloseTo(960, 0);

  // Title: the keys do their job (focus moves) and the page stays put.
  await pressNoScroll(page, frame, 'ArrowDown');
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('levels');
  await pressNoScroll(page, frame, 'ArrowUp');
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('play');
  await pressNoScroll(page, frame, 'ArrowDown');
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('levels');
  await pressNoScroll(page, frame, 'Space');
  await pollScenes(frame, ['LevelSelect']);

  // Level select: every move key, Space and Enter on a locked cell, then back.
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'KeyD', 'KeyS', 'KeyA', 'KeyW']) await pressNoScroll(page, frame, key);
  await expect.poll(() => menuFocus(frame, 'LevelSelect')).toBe('w1-01');
  await pressNoScroll(page, frame, 'ArrowRight');
  await expect.poll(() => menuFocus(frame, 'LevelSelect')).toBe('w1-02');
  await pressNoScroll(page, frame, 'Space'); // locked: nothing starts
  await pressNoScroll(page, frame, 'Enter');
  await pollScenes(frame, ['LevelSelect']);
  await pressNoScroll(page, frame, 'Escape');
  await pollScenes(frame, ['Title']);

  // Controls.
  // (batch 7: SETTINGS is the 4th title item, so from LEVELS two Downs land on it and one Up on CONTROLS)
  await pressNoScroll(page, frame, 'ArrowDown');
  await pressNoScroll(page, frame, 'ArrowDown');
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('settings');
  await pressNoScroll(page, frame, 'ArrowUp');
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('controls');
  await pressNoScroll(page, frame, 'Enter');
  await pollScenes(frame, ['Controls']);
  for (const key of ['ArrowDown', 'ArrowUp', 'Space']) await pressNoScroll(page, frame, key);
  await pressNoScroll(page, frame, 'Escape');
  await pollScenes(frame, ['Title']);

  // PLAY, then Pause over the game.
  await pressNoScroll(page, frame, 'ArrowUp');
  await pressNoScroll(page, frame, 'ArrowUp');
  await expect.poll(() => menuFocus(frame, 'Title')).toBe('play');
  await pressNoScroll(page, frame, 'Enter');
  await waitForHook(frame);
  await pollState(frame, (s) => s.state.status === 'playing' && s.state.player.grounded, 'in the level', 45_000).toBe(true);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Space', 'ArrowUp']) await pressNoScroll(page, frame, key); // play keys scroll nothing either
  await pressNoScroll(page, frame, 'Escape');
  await pollScenes(frame, ['Game', 'Pause']);
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'KeyS', 'KeyW']) await pressNoScroll(page, frame, key);
  await expect.poll(() => menuFocus(frame, 'Pause')).toBe('restart');
  await pressNoScroll(page, frame, 'Space'); // RESTART
  await pollScenes(frame, ['Game']);
  await pressNoScroll(page, frame, 'KeyP');
  await pollScenes(frame, ['Game', 'Pause']);
  await pressNoScroll(page, frame, 'KeyP');
  await pollScenes(frame, ['Game']);
});

test('Results in the iframe: arrows, Space and Enter do not scroll the host page', async ({ page, baseURL }) => {
  const frame = await openHost(page, baseURL, '?level=w1-01');
  await waitForHook(frame);
  await frame.locator('#game canvas').click();
  // Open the real Results scene directly (the live win is covered in results.spec.ts).
  await frame.evaluate(() => {
    const g = (window as unknown as { __game: { scene: { start(k: string, d: object): void } } }).__game;
    g.scene.start('Results', { levelId: 'w1-01', title: 'First Steps', steps: 434, stepHz: 60, record: { recorded: true, newBest: true, firstClear: true, skipped: false, best: 434 }, nextLevelId: 'w1-02' });
  });
  await pollScenes(frame, ['Game', 'Results']);
  await expect.poll(() => resultsPanelUp(frame), { timeout: POLL_TIMEOUT_MS }).toBe(true);
  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft']) await pressNoScroll(page, frame, key);
  await expect.poll(() => menuFocus(frame, 'Results')).toBe('next');
  await pressNoScroll(page, frame, 'Space');
  await pollScenes(frame, ['Game']);
});
