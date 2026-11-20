/**
 * Title, level select and controls through the real scenes (docs/design/features/title-screen.md, level-select.md,
 * controls-screen.md, menu-navigation.md). Keyboard only: no spec here clicks or moves the mouse. Scene state comes
 * from the test-side Phaser handle in `helpers.ts` (`pollScenes`, `menuFocus`, `menuModel`).
 */
import { TEST_TIMEOUT_MS, expect, gotoTitle, menuFocus, menuModel, nextFrames, pollScenes, seedSave, shippedLevelIds, tap, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

interface Cell {
  readonly id: string;
  readonly state: 'locked' | 'open' | 'cleared';
  readonly bestText: string | null;
}
interface LevelSelectModel {
  readonly rows: readonly { readonly world: number; readonly cells: readonly Cell[] }[];
  readonly clearedText: string;
}
interface TitleModel {
  readonly playTargetId: string | null;
  readonly notSavedNotice: boolean;
}

const ids = shippedLevelIds();
const firstOfWorld = ids.filter((id, i) => i === 0 || id.slice(0, 2) !== (ids[i - 1] ?? '').slice(0, 2));

async function openLevelSelectFromTitle(page: import('@playwright/test').Page): Promise<void> {
  await tap(page, 'ArrowDown');
  await expect.poll(() => menuFocus(page, 'Title')).toBe('levels');
  await tap(page, 'Enter');
  await pollScenes(page, ['LevelSelect']);
  await expect.poll(() => menuFocus(page, 'LevelSelect'), { message: 'level select model built' }).not.toBeNull();
}

test.describe('title', () => {
  test('fresh save: PLAY starts w1-01 with Enter (title checks 1, 2, 10)', async ({ page }) => {
    await gotoTitle(page);
    expect((await menuModel<TitleModel>(page, 'Title'))?.playTargetId).toBe('w1-01');
    await tap(page, 'Enter');
    await pollScenes(page, ['Game']);
    expect((await waitForHook(page)).levelId).toBe('w1-01');
  });

  test('Space also chooses; Esc on the title changes nothing (title check 11)', async ({ page }) => {
    await gotoTitle(page);
    await tap(page, 'Escape');
    await tap(page, 'Backspace');
    await tap(page, 'ArrowDown');
    await expect.poll(() => menuFocus(page, 'Title')).toBe('levels');
    await tap(page, 'Escape');
    await expect.poll(() => menuFocus(page, 'Title'), { message: 'Esc did not move focus' }).toBe('levels');
    await pollScenes(page, ['Title']);
    await tap(page, 'ArrowUp');
    await expect.poll(() => menuFocus(page, 'Title')).toBe('play');
    await tap(page, 'Space');
    await pollScenes(page, ['Game']);
  });

  test('w1-01..w1-05 cleared: PLAY starts w2-01 (title check 4)', async ({ page }) => {
    await seedSave(page, { completed: ['w1-01', 'w1-02', 'w1-03', 'w1-04', 'w1-05'] });
    await gotoTitle(page);
    expect((await menuModel<TitleModel>(page, 'Title'))?.playTargetId).toBe('w2-01');
    await tap(page, 'Enter');
    expect((await waitForHook(page)).levelId).toBe('w2-01');
  });

  test('w1-01 and w2-01 cleared: PLAY starts w1-02 (title check 5)', async ({ page }) => {
    await seedSave(page, { completed: ['w1-01', 'w2-01'] });
    await gotoTitle(page);
    await tap(page, 'Enter');
    expect((await waitForHook(page)).levelId).toBe('w1-02');
  });

  test('every shipped level cleared: PLAY opens level select (title check 6)', async ({ page }) => {
    await seedSave(page, { completed: ids });
    await gotoTitle(page);
    expect((await menuModel<TitleModel>(page, 'Title'))?.playTargetId).toBeNull();
    await tap(page, 'Enter');
    await pollScenes(page, ['LevelSelect']);
  });

  test('LEVELS then Esc returns to the title with focus on LEVELS (title check 7)', async ({ page }) => {
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    await tap(page, 'Escape');
    await pollScenes(page, ['Title']);
    await expect.poll(() => menuFocus(page, 'Title')).toBe('levels');
  });

  test('CONTROLS then Esc returns to the title with focus on CONTROLS (title check 8, controls check 3)', async ({ page }) => {
    await gotoTitle(page);
    await tap(page, 'ArrowDown');
    await expect.poll(() => menuFocus(page, 'Title')).toBe('levels');
    await tap(page, 'ArrowDown'); // one press per frame: two taps inside one frame are one move
    await expect.poll(() => menuFocus(page, 'Title')).toBe('controls');
    await tap(page, 'Enter');
    await pollScenes(page, ['Controls']);
    const model = await menuModel<{ rows: { id: string; label: string; codes: string[] }[]; list: { items: { id: string }[] } }>(page, 'Controls');
    expect(model?.rows.length, 'one row per action').toBeGreaterThanOrEqual(6);
    const allCodes = (model?.rows ?? []).flatMap((r) => r.codes);
    expect(new Set(allCodes).size, 'every bound code listed once').toBe(allCodes.length);
    for (const code of ['ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'Space']) expect(allCodes, `${code} is listed`).toContain(code);
    expect(model?.list.items.at(-1)?.id, 'BACK is the last item').toBe('back');
    await tap(page, 'Escape');
    await pollScenes(page, ['Title']);
    await expect.poll(() => menuFocus(page, 'Title')).toBe('controls');
  });

  test('storage blocked: the not-saved notice shows and every item still works (title check 9)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await gotoTitle(page);
    expect((await menuModel<TitleModel>(page, 'Title'))?.notSavedNotice).toBe(true);
    await tap(page, 'Enter');
    expect((await waitForHook(page)).levelId, 'PLAY works without storage').toBe('w1-01');
  });

  test('with storage working the not-saved notice is absent', async ({ page }) => {
    await gotoTitle(page);
    expect((await menuModel<TitleModel>(page, 'Title'))?.notSavedNotice).toBe(false);
  });
});

test.describe('level select', () => {
  test('fresh save: the first level of every world is open, everything else locked; focus on w1-01 (level-select check 1)', async ({ page }) => {
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    expect(await menuFocus(page, 'LevelSelect')).toBe('w1-01');
    const model = await menuModel<LevelSelectModel>(page, 'LevelSelect');
    const cells = (model?.rows ?? []).flatMap((r) => r.cells);
    expect(cells.map((c) => c.id), 'lists every shipped world 1+ level, in order').toEqual([...ids]);
    for (const c of cells) expect(c.state, c.id).toBe(firstOfWorld.includes(c.id) ? 'open' : 'locked');
    expect(firstOfWorld, 'worlds 1, 2 and 3 each have an open first level').toEqual(expect.arrayContaining(['w1-01', 'w2-01', 'w3-01']));
    expect(model?.clearedText).toBe(`CLEARED 0/${ids.length}`);
  });

  test('arrows and WASD move focus; down from world 1 lands in world 2 then 3; Enter on a locked cell starts nothing (check 12)', async ({ page }) => {
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    await tap(page, 'ArrowRight');
    await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w1-02');
    await tap(page, 'Enter'); // locked on a fresh save
    await nextFrames(page);
    await tap(page, 'Space');
    await nextFrames(page);
    await tap(page, 'KeyA');
    await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w1-01');
    expect(await page.evaluate(() => window.__redshift), 'no game started').toBeUndefined();
    await pollScenes(page, ['LevelSelect']);
    await tap(page, 'ArrowLeft'); // edge: no wrap
    await nextFrames(page);
    expect(await menuFocus(page, 'LevelSelect')).toBe('w1-01');
    await tap(page, 'KeyS');
    await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w2-01');
    await nextFrames(page);
    await tap(page, 'ArrowDown');
    await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w3-01');
    await nextFrames(page);
    await tap(page, 'ArrowDown'); // last row: stays
    await nextFrames(page);
    expect(await menuFocus(page, 'LevelSelect')).toBe('w3-01');
    await tap(page, 'ArrowUp');
    await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w2-01');
    await tap(page, 'Enter');
    await pollScenes(page, ['Game']);
    expect((await waitForHook(page)).levelId).toBe('w2-01');
  });

  test('a level cleared in the save is open, shows its best time, and unlocks the next in its world (checks 2, 14)', async ({ page }) => {
    await seedSave(page, { completed: ['w1-01'], bestSteps: { 'w1-01': 775 } });
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    const model = await menuModel<LevelSelectModel>(page, 'LevelSelect');
    const cell = (id: string): Cell | undefined => model?.rows.flatMap((r) => r.cells).find((c) => c.id === id);
    expect(cell('w1-01')?.state).toBe('cleared');
    expect(cell('w1-01')?.bestText, '775 steps at 60 Hz').toBe('0:12.91');
    expect(cell('w1-02')?.state).toBe('open');
    expect(cell('w1-03')?.state).toBe('locked');
    expect(model?.clearedText).toBe(`CLEARED 1/${ids.length}`);
  });

  // BUG-5: title -> LEVELS opens level select on w1-01, not on the PLAY target (level-select.md, Initial focus).
  test('initial focus from the title is the PLAY target (level-select.md, Initial focus; BUG-5)', async ({ page }) => {
    await seedSave(page, { completed: ['w1-01'], bestSteps: { 'w1-01': 775 } });
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    expect(await menuFocus(page, 'LevelSelect'), 'focus starts on the PLAY target').toBe('w1-02');
  });

  // B5-2 (test-plan 9.6): other save shapes.
  test('fresh save: LEVELS from the title opens on w1-01', async ({ page }) => {
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    expect(await menuFocus(page, 'LevelSelect')).toBe('w1-01');
  });

  test('every shipped level cleared: LEVELS from the title opens on the PLAY target, or w1-01 when there is none', async ({ page }) => {
    await seedSave(page, { completed: [...ids], bestSteps: Object.fromEntries(ids.map((id) => [id, 600])) });
    await gotoTitle(page);
    const target = (await menuModel<TitleModel>(page, 'Title'))?.playTargetId ?? null;
    await openLevelSelectFromTitle(page);
    expect(await menuFocus(page, 'LevelSelect'), `playTargetId was ${String(target)}`).toBe(target ?? 'w1-01');
  });

  test('Esc from level select goes back to the title with focus on LEVELS; Backspace too', async ({ page }) => {
    await gotoTitle(page);
    await openLevelSelectFromTitle(page);
    await tap(page, 'Backspace');
    await pollScenes(page, ['Title']);
    await expect.poll(() => menuFocus(page, 'Title')).toBe('levels');
  });
});

test('save JSON never holds an unlock field (progress-save check 11)', async ({ page }) => {
  await gotoTitle(page);
  await tap(page, 'Enter');
  await waitForHook(page);
  const keys = await page.evaluate(() => Object.keys((JSON.parse(window.localStorage.getItem('redshift.save') ?? '{"progress":{}}') as { progress: object }).progress));
  expect(keys.filter((k) => !['completedLevels', 'bestSteps'].includes(k)), 'only completedLevels and bestSteps').toEqual([]);
});
