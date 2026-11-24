/**
 * B11-19, level select with five worlds (level-select.md checks 1, 13, 16; GDD v1.12 world names 4 MOTION, 5 SIGNALS).
 * Keyboard only. Evidence: docs/qa/evidence/b11-level-select-five-rows.png.
 */
import { TEST_TIMEOUT_MS, expect, gotoTitle, menuFocus, menuModel, nextFrames, pollScenes, seedSave, shippedLevelIds, tap, test } from './helpers';
import { EVIDENCE_DIR } from './b11-helpers';
import type { Page } from '@playwright/test';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

interface Cell {
  readonly id: string;
  readonly state: 'locked' | 'open' | 'cleared';
  readonly bestText: string | null;
}
interface Model {
  readonly rows: readonly { readonly world: number; readonly cells: readonly Cell[] }[];
  readonly clearedText: string;
}

const ids = shippedLevelIds();

async function openLevelSelect(page: Page): Promise<void> {
  await tap(page, 'ArrowDown');
  await expect.poll(() => menuFocus(page, 'Title')).toBe('levels');
  await tap(page, 'Enter');
  await pollScenes(page, ['LevelSelect']);
  await expect.poll(() => menuFocus(page, 'LevelSelect'), { message: 'level select model built' }).not.toBeNull();
}

/**
 * Menus draw into one canvas texture, so "fits" is judged on pixels: decode a screenshot in the page and report whether
 * anything but the background sits in the right or bottom `marginPx` of the 960x540 viewport (8 canvas px = 16 screen px).
 */
async function inkInMargin(page: Page, marginPx: number): Promise<{ right: number; bottom: number }> {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ([data, m]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      const at = (x: number, y: number): string => `${px[(y * c.width + x) * 4]},${px[(y * c.width + x) * 4 + 1]},${px[(y * c.width + x) * 4 + 2]}`;
      const bg = at(c.width - 1, c.height - 1);
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < c.height; y += 1) for (let x = c.width - (m as number); x < c.width; x += 1) if (at(x, y) !== bg) right += 1;
      for (let y = c.height - (m as number); y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) if (at(x, y) !== bg) bottom += 1;
      return { right, bottom };
    },
    [png, marginPx] as const,
  );
}

test('item 5: five world rows on a fresh save, the first level of each world open, the rest locked, CLEARED 0/m', async ({ page }) => {
  await gotoTitle(page);
  await openLevelSelect(page);
  const model = (await menuModel<Model>(page, 'LevelSelect'))!;
  expect(model.rows.map((r) => r.world), 'one row per world 1..5').toEqual([1, 2, 3, 4, 5]);
  for (const row of model.rows) {
    expect(row.cells.length, `world ${row.world} fits 5 cells`).toBeLessThanOrEqual(5);
    row.cells.forEach((c, i) => expect(c.state, c.id).toBe(i === 0 ? 'open' : 'locked'));
  }
  const cells = model.rows.flatMap((r) => r.cells);
  expect(cells.map((c) => c.id)).toEqual([...ids]);
  expect(model.clearedText).toBe(`CLEARED 0/${ids.length}`);
  expect(cells.find((c) => c.id === 'w4-01')?.state).toBe('open');
  expect(cells.find((c) => c.id === 'w5-01')?.state).toBe('open');
});

test('item 5: CLEARED n/m counts the shipped levels, across all five worlds', async ({ page }) => {
  const done = ['w1-01', 'w4-01', 'w4-02', 'w5-01'];
  await seedSave(page, { completed: done, bestSteps: Object.fromEntries(done.map((d) => [d, 700])) });
  await gotoTitle(page);
  await openLevelSelect(page);
  const model = (await menuModel<Model>(page, 'LevelSelect'))!;
  expect(model.clearedText).toBe(`CLEARED ${done.length}/${ids.length}`);
  const byId = new Map(model.rows.flatMap((r) => r.cells).map((c) => [c.id, c]));
  expect(byId.get('w4-03')?.state, 'next in world 4 opens').toBe('open');
  expect(byId.get('w4-04')?.state ?? 'absent').not.toBe('cleared');
  expect(byId.get('w5-02')?.state, 'next in world 5 opens').toBe('open');
  expect(byId.get('w4-01')?.bestText).toBe('0:11.66');
});

test('item 5: keyboard reaches row 5 and returns; Enter on an open world-5 cell starts w5-01; evidence screenshot', async ({ page }) => {
  await gotoTitle(page);
  await openLevelSelect(page);
  await nextFrames(page);
  const seen: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    await tap(page, 'ArrowDown');
    await nextFrames(page);
    seen.push((await menuFocus(page, 'LevelSelect')) ?? 'null');
  }
  expect(seen.map((s) => s.slice(0, 2)), 'one row per press, ending in world 5').toEqual(['w2', 'w3', 'w4', 'w5']);
  expect(seen[3]).toBe('w5-01');
  await tap(page, 'ArrowDown'); // last row: stays
  await nextFrames(page);
  expect(await menuFocus(page, 'LevelSelect')).toBe('w5-01');
  await page.screenshot({ path: `${EVIDENCE_DIR}b11-level-select-five-rows.png` });
  await tap(page, 'ArrowUp');
  await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w4-01');
  await tap(page, 'ArrowDown');
  await expect.poll(() => menuFocus(page, 'LevelSelect')).toBe('w5-01');
  await tap(page, 'Enter');
  await pollScenes(page, ['Game']);
  await expect.poll(() => page.evaluate(() => window.__redshift?.levelId)).toBe('w5-01');
});

test('item 5: five rows fit: nothing drawn in the right or bottom 8 canvas px, every row and the detail line visible (level-select check 16)', async ({ page }) => {
  await gotoTitle(page);
  await openLevelSelect(page);
  for (let i = 0; i < 4; i += 1) {
    await tap(page, 'ArrowDown'); // focus on the last row: the detail line is drawn under it
    await nextFrames(page);
  }
  expect(await menuFocus(page, 'LevelSelect')).toBe('w5-01');
  const ink = await inkInMargin(page, 16);
  expect(ink, 'pixels that are not background in the right / bottom 16 screen px (8 canvas px)').toEqual({ right: 0, bottom: 0 });
  const model = (await menuModel<Model>(page, 'LevelSelect'))!;
  expect(model.rows.length).toBe(5);
});
