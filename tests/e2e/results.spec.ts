/**
 * The Results panel after a live win (docs/design/features/results.md checks 1, 6, 7, 8, 9, 13; pause.md check 12;
 * batch 6 review M1, "R in Results restarts exactly once"). w1-01 is won live by holding ArrowRight, so this is a real
 * win, not a replay (replays never open Results: win.spec.ts). Scenes come from the test-side Phaser handle.
 */
import type { Page } from '@playwright/test';
import {
  POLL_TIMEOUT_MS,
  expect,
  gotoTitle,
  menuFocus,
  menuModel,
  nextFrames,
  pollScenes,
  pollState,
  readSaveProgress,
  resultsPanelUp,
  snapshot,
  startTracker,
  stopTracker,
  test,
  waitForHook,
  winLiveHoldingRight,
} from './helpers';

test.describe.configure({ timeout: 240_000 });

const LEVEL = 'w1-01';

interface ResultsModel {
  readonly list: { readonly items: readonly { readonly id: string; readonly label: string }[]; readonly focus: number };
  readonly timeText: string;
  readonly bestText: string | null;
  readonly marker: string | null;
  readonly nextLevelId: string | null;
}

async function winAndWaitForPanel(page: Page): Promise<number> {
  const won = await winLiveHoldingRight(page);
  await pollScenes(page, ['Game', 'Results'], 'Results opened over the won game');
  await expect.poll(() => resultsPanelUp(page), { message: 'panel drawn after the 0.6 s beat', timeout: POLL_TIMEOUT_MS }).toBe(true);
  return won;
}

test.beforeEach(async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded, 'at the spawn', 45_000).toBe(true);
});

test('a live win opens Results after the beat: first clear, best = time, NEXT focused, save written once (results checks 1, 5, 13)', async ({ page }) => {
  const won = await winAndWaitForPanel(page);
  const model = await menuModel<ResultsModel>(page, 'Results');
  expect(model?.marker).toBe('FIRST CLEAR');
  expect(model?.timeText.startsWith('TIME ')).toBe(true);
  expect(model?.bestText, 'first clear: BEST equals this run').toBe(model?.timeText.replace('TIME', 'BEST'));
  expect(model?.list.items.map((i) => i.label), 'NEXT first, then RETRY, then LEVELS').toEqual(['ENTER: NEXT LEVEL', 'R: RETRY', 'ESC: LEVELS']);
  expect(model?.list.items[model.list.focus]?.id, 'focus starts on NEXT').toBe('next');
  expect(model?.nextLevelId).toBe('w1-02');
  expect(await readSaveProgress(page)).toEqual({ completedLevels: [LEVEL], bestSteps: { [LEVEL]: won } });
  expect((await snapshot(page))?.paused, 'a win is not a pause').toBe(false);
});

test('Enter on the fresh panel starts the next level (results check 13, 6)', async ({ page }) => {
  await winAndWaitForPanel(page);
  await page.keyboard.press('Enter');
  await pollScenes(page, ['Game']);
  await pollState(page, (s) => s.levelId, 'next level loaded').toBe('w1-02');
  await pollState(page, (s) => s.levelId === 'w1-02' && s.state.status === 'playing' && s.state.wonAtStep === null, 'fresh run on w1-02').toBe(true);
});

test('R on the panel retries exactly once: a fresh run at step 0 that keeps stepping (results check 7, review M1)', async ({ page }) => {
  await winAndWaitForPanel(page);
  await page.keyboard.press('KeyR');
  await pollScenes(page, ['Game'], 'Results closed');
  await pollState(page, (s) => s.levelId === LEVEL && s.state.status === 'playing' && s.state.wonAtStep === null, 'restarted').toBe(true);
  await startTracker(page);
  await pollState(page, (s) => s.state.step > 90, 'stepping on').toBe(true);
  const track = await stopTracker(page);
  const steps = track.map((t) => t.step);
  expect(steps.every((v, i) => i === 0 || v >= (steps[i - 1] ?? 0)), 'step never goes backwards: no second restart').toBe(true);
  expect((await snapshot(page))?.state.status).toBe('playing');
});

test('Esc on the panel opens level select focused on this level, its cell cleared with the best time (results check 8, level-select check 14)', async ({ page }) => {
  const won = await winAndWaitForPanel(page);
  await page.keyboard.press('Escape');
  await pollScenes(page, ['LevelSelect'], 'level select only (and Pause did not open, pause check 12)');
  await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe(LEVEL);
  const model = await menuModel<{ rows: { cells: { id: string; state: string; bestText: string | null }[] }[] }>(page, 'LevelSelect');
  const cell = model?.rows.flatMap((r) => r.cells).find((c) => c.id === LEVEL);
  expect(cell?.state).toBe('cleared');
  const seconds = won / 60;
  expect(cell?.bestText, 'best time shown').toMatch(/^\d+:\d\d\.\d\d$/);
  expect(cell?.bestText?.startsWith(`${Math.floor(seconds / 60)}:`)).toBe(true);
});

test('LEVELS (arrow down twice, Enter) does the same as Esc', async ({ page }) => {
  await winAndWaitForPanel(page);
  await page.keyboard.press('ArrowDown');
  await nextFrames(page);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => menuFocus(page, 'Results')).toBe('levels');
  await page.keyboard.press('Enter');
  await pollScenes(page, ['LevelSelect']);
  await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe(LEVEL);
});

test('Space held through the win chooses nothing until it is released and pressed again (results check 9)', async ({ page }) => {
  await page.keyboard.down('Space');
  await winAndWaitForPanel(page);
  await nextFrames(page, 30);
  await pollScenes(page, ['Game', 'Results'], 'a held Space did not pick NEXT');
  expect((await snapshot(page))?.levelId).toBe(LEVEL);
  await page.keyboard.up('Space');
  await page.keyboard.down('Space');
  await pollScenes(page, ['Game']);
  await pollState(page, (s) => s.levelId, 'next level').toBe('w1-02');
  await page.keyboard.up('Space');
});

test('Pause stays shut on the panel: Esc leaves to level select, P does nothing (pause check 12)', async ({ page }) => {
  await winAndWaitForPanel(page);
  await page.keyboard.press('KeyP');
  await nextFrames(page, 20);
  await pollScenes(page, ['Game', 'Results'], 'P did nothing');
  expect((await snapshot(page))?.paused).toBe(false);
});

test('keys during the 0.6 s beat are ignored: nothing starts before the panel is up', async ({ page }) => {
  await winLiveHoldingRight(page);
  // Read the panel state and dispatch R in one in-page call, so `early` is the state at the keydown, not after a round trip.
  const early = await page.evaluate(() => {
    const g = (window as unknown as { __game: { scene: { scenes: { sys: { settings: { key: string }; isActive(): boolean }; canvas?: unknown }[] } } }).__game;
    const r = g.scene.scenes.find((x) => x.sys.settings.key === 'Results');
    const up = !!r && r.sys.isActive() && r.canvas !== null && r.canvas !== undefined;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }));
    return up;
  });
  await nextFrames(page, 10);
  if (!early) {
    // The panel was not up when R was pressed, so the press must have been dropped: still on the won level with Results open.
    await pollScenes(page, ['Game', 'Results'], 'an early R was ignored, the panel still opens');
    expect((await snapshot(page))?.state.status, 'not restarted').toBe('won');
  } else {
    test.info().annotations.push({ type: 'note', description: 'machine too fast to land a key inside the beat' });
  }
});

test('the last level has no NEXT, and focus starts on LEVELS (results check 6)', async ({ page }) => {
  // Winning w3-05 by hand is a 1364-step run; this opens the real Results scene with launch data shaped like the
  // game scene's (`resultsLaunchData`) for the last level (`nextLevelId` null), which is what the scene computes there.
  await gotoTitle(page);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { scene: { start(k: string, d: object): void; stop(k: string): void } } }).__game;
    g.scene.stop('Title');
    g.scene.start('Results', { levelId: 'w3-05', title: 'Redshift', steps: 1364, stepHz: 60, record: { recorded: true, newBest: true, firstClear: true, skipped: false, best: 1364 }, nextLevelId: null });
  });
  await pollScenes(page, ['Results']);
  await expect.poll(() => resultsPanelUp(page), { timeout: POLL_TIMEOUT_MS }).toBe(true);
  const model = await menuModel<ResultsModel>(page, 'Results');
  expect(model?.list.items.map((i) => i.id)).toEqual(['retry', 'levels']);
  expect(await menuFocus(page, 'Results')).toBe('levels');
  await page.keyboard.press('Enter');
  await pollScenes(page, ['LevelSelect']);
  await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w3-05');
});

test('ArrowUp and W navigate the panel, also on the second panel after an R retry (batch 6 review)', async ({ page }) => {
  await winAndWaitForPanel(page);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => menuFocus(page, 'Results')).toBe('retry');
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => menuFocus(page, 'Results')).toBe('next');
  await page.keyboard.press('KeyR');
  await pollScenes(page, ['Game']);
  await pollState(page, (s) => s.state.status === 'playing' && s.state.wonAtStep === null, 'retry running').toBe(true);
  await winAndWaitForPanel(page);
  expect(await menuFocus(page, 'Results'), 'fresh panel starts on NEXT').toBe('next');
  await page.keyboard.press('KeyS');
  await expect.poll(() => menuFocus(page, 'Results')).toBe('retry');
  await page.keyboard.press('KeyW');
  await expect.poll(() => menuFocus(page, 'Results')).toBe('next');
});
