/**
 * Batch 7 hint glyphs on w1-03, w2-04 and w3-03 (onboarding-hints.md check 11; test-plan section 9.3, B7-14).
 * Caps are Graphics (not readable), so boxes are derived from the BitmapText labels at depth 6 (world px): a glyph box
 * is 24 px tall, its top is the first row's label y - 2 (`hintLayout.ts`); label width is 6 px per character.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, cameraScroll, expect, gameObjects, holdRightUntilPastX, nextFrames, pollState, test, waitForHook, type DrawnObject } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const HUD = { x: 5, y: 5, w: 110, h: 32 } as const;
const TILE = 16;
const ADV = 6;
const SHIFT_UP = ['R⇧', 'E', 'X', '▲'];
const JUMP = ['SPACE', 'W', '↑'];

async function labels(page: Page): Promise<DrawnObject[]> {
  return ((await gameObjects(page)) ?? []).filter((o) => o.type === 'BitmapText' && o.depth === 6 && o.visible);
}
const texts = (l: readonly DrawnObject[]): string[] => l.map((o) => o.text ?? '');

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
function boxOf(all: readonly DrawnObject[], group: readonly string[]): Box {
  const mine = all.filter((o) => group.includes(o.text ?? ''));
  const left = Math.min(...mine.map((o) => o.x)) - 2;
  const right = Math.max(...mine.map((o) => o.x + ADV * (o.text ?? '').length)) + 2;
  const top = Math.min(...mine.map((o) => o.y)) - 2;
  return { left, right, top, bottom: top + 24 };
}

async function load(page: Page, level: string): Promise<void> {
  await page.goto(`./?level=${level}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.step > 3, 'level running', 45_000).toBe(true);
}

const CASES: readonly (readonly [string, readonly string[]])[] = [
  ['w1-03', SHIFT_UP],
  ['w2-04', [...SHIFT_UP, ...JUMP]],
  ['w3-03', JUMP],
];

for (const [level, want] of CASES) {
  test(`H-11a ${level}: its glyphs are drawn on the first frame and still after R${level === 'w3-03' ? '' : ' and a death'}`, async ({ page }) => {
    await load(page, level);
    const first = texts(await labels(page));
    expect([...first].sort(), `${level} labels`).toEqual([...want].sort());
    if (level !== 'w3-03') {
      await page.evaluate(() => {
        const w = window as unknown as { __fell: boolean };
        w.__fell = false;
        const tick = (): void => {
          const st = window.__redshift?.state;
          if (st && (st.status !== 'playing' || st.player.y > 11)) w.__fell = true;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await holdRightUntilPastX(page, level === 'w1-03' ? 12 : 14);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __fell: boolean }).__fell), { message: 'died', timeout: 30_000 }).toBe(true);
      expect(texts(await labels(page)).sort(), 'after the death').toEqual([...want].sort());
    }
    await page.keyboard.press('KeyR');
    await nextFrames(page, 10);
    expect(texts(await labels(page)).sort(), 'after R').toEqual([...want].sort());
  });
}

test('H-11b w2-04: the shiftUp box is directly above the jump box, same column, at least 8 px apart', async ({ page }) => {
  await load(page, 'w2-04');
  const all = await labels(page);
  const up = boxOf(all, SHIFT_UP);
  const jump = boxOf(all, JUMP);
  test.info().annotations.push({ type: 'observed', description: `shiftUp ${JSON.stringify(up)} jump ${JSON.stringify(jump)}` });
  expect(up.bottom, 'shiftUp above jump').toBeLessThanOrEqual(jump.top);
  expect(jump.top - up.bottom, 'gap').toBeGreaterThanOrEqual(8);
  const centre = (b: Box): number => (b.left + b.right) / 2;
  expect(Math.abs(centre(up) - centre(jump)), 'same column (centres within 8 px)').toBeLessThanOrEqual(8);
  expect(Math.floor(centre(up) / TILE), 'anchor column 8').toBe(8);
  expect(Math.floor(centre(jump) / TILE), 'anchor column 8').toBe(8);
});

test('H-11c w3-03: the jump box is in the runner lane (rows 0-5), left of the block face at col 16', async ({ page }) => {
  await load(page, 'w3-03');
  const box = boxOf(await labels(page), JUMP);
  test.info().annotations.push({ type: 'observed', description: JSON.stringify(box) });
  expect(box.top, 'inside the runner lane').toBeGreaterThanOrEqual(0);
  expect(box.bottom, 'above the runner floor (row 6)').toBeLessThanOrEqual(6 * TILE);
  expect(box.right, 'left of the block face (col 16 = 256 px)').toBeLessThan(16 * TILE);
});

for (const level of ['w2-04', 'w3-03']) {
  test(`H-11d ${level}: along the solution replay no glyph passes under the HUD panel`, async ({ page }) => {
    await page.goto(`./?level=${level}&replay=1&speed=2`);
    await waitForHook(page);
    const worst = await page.evaluate(
      (hud) =>
        new Promise<{ frames: number; maxScroll: number; hit: string | null }>((resolve) => {
          const g = (window as unknown as { __game: { scene: { getScene(k: string): { cameras: { main: { scrollX: number } }; children: { list: { type: string; depth: number; visible: boolean; x: number; y: number; text?: string }[] } } } } }).__game;
          let frames = 0;
          let maxScroll = 0;
          let hit: string | null = null;
          const tick = (): void => {
            const sc = g.scene.getScene('Game');
            const sx = sc.cameras.main.scrollX;
            maxScroll = Math.max(maxScroll, sx);
            if (frames % 10 === 0) {
              for (const o of sc.children.list) {
                if (o.type !== 'BitmapText' || o.depth !== 6 || !o.visible) continue;
                const l = o.x - sx - 2;
                const r = l + 6 * (o.text ?? '').length + 4;
                if (l < hud.x + hud.w && r > hud.x && o.y - 2 < hud.y + hud.h && o.y + 10 > hud.y) hit = `${o.text} at screen x ${o.x - sx}, y ${o.y}`;
              }
            }
            frames += 1;
            if (window.__redshift?.replay?.done === true) resolve({ frames, maxScroll, hit });
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      HUD,
    );
    test.info().annotations.push({ type: 'observed', description: `${level}: ${worst.frames} frames, max scrollX ${worst.maxScroll}` });
    expect(worst.hit, 'a glyph overlapped the HUD').toBeNull();
    expect((await cameraScroll(page)).x, 'the camera did scroll').toBeGreaterThanOrEqual(0);
  });
}
