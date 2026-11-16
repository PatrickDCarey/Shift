/**
 * Pixel cutover (PX-10, docs/tech/adr-pixel-rendering.md): the canvas is 480x270 logical pixels, shown at the
 * largest whole multiple that fits (Scale.NONE + MAX_ZOOM, re-zoomed on window resize), letterboxed and centred.
 * Assumptions that depend on the cutover lanes' output are listed in docs/qa/test-plan.md ("Pixel cutover").
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, expect, pollState, snapshot, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w0-02';
const W = 480;
const H = 270;

/** Viewport and the expected CSS width of the canvas (ADR table; zoom = floor(min(vw / 480, vh / 270)), at least 1). */
const CASES = [
  { vw: 960, vh: 540, css: 960 },
  { vw: 1366, vh: 768, css: 960 },
  { vw: 1920, vh: 1080, css: 1920 },
  { vw: 2560, vh: 1440, css: 2400 },
] as const;

async function cssBox(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas box');
  return box;
}

for (const c of CASES) {
  test(`canvas is 480x270 and ${c.css} CSS px wide (whole multiple) at ${c.vw}x${c.vh}`, async ({ page }) => {
    await page.setViewportSize({ width: c.vw, height: c.vh });
    await page.goto(`./?level=${LEVEL}`);
    await waitForHook(page);
    const canvas = page.locator('#game canvas');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute('width', String(W));
    await expect(canvas).toHaveAttribute('height', String(H));
    await expect.poll(async () => (await cssBox(page)).width, { message: 'CSS width after boot zoom' }).toBeCloseTo(c.css, 0);
    const box = await cssBox(page);
    expect(box.width % W, 'CSS width is a whole multiple of 480').toBeCloseTo(0, 5);
    expect(box.height).toBeCloseTo((box.width * H) / W, 0);
    // centred (letterbox): equal margins within a pixel
    expect(box.x + box.width / 2).toBeCloseTo(c.vw / 2, 0);
    expect(box.y + box.height / 2).toBeCloseTo(c.vh / 2, 0);
    // image-rendering must stay pixelated, or a whole-multiple zoom still blurs the dither
    const rendering = await canvas.evaluate((el) => getComputedStyle(el).imageRendering);
    expect(['pixelated', 'crisp-edges']).toContain(rendering);
  });
}

test('live resize 960x540 to 1920x1080 and back re-zooms the canvas (attributes stay 480x270)', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await expect.poll(async () => (await cssBox(page)).width).toBeCloseTo(960, 0);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => (await cssBox(page)).width, { message: 'zoom 4 after growing' }).toBeCloseTo(1920, 0);
  await expect(page.locator('#game canvas')).toHaveAttribute('width', String(W));
  await expect(page.locator('#game canvas')).toHaveAttribute('height', String(H));
  await page.setViewportSize({ width: 960, height: 540 });
  await expect.poll(async () => (await cssBox(page)).width, { message: 'zoom 2 after shrinking' }).toBeCloseTo(960, 0);
  // the sim kept running through both resizes
  const before = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step, 'sim steps after resizes').toBeGreaterThan(before);
});

test('non-multiple viewports never give a fractional scale', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 600 });
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await expect.poll(async () => (await cssBox(page)).width).toBeCloseTo(960, 0); // zoom 2, not 2.08
  await page.setViewportSize({ width: 1500, height: 1000 });
  await expect.poll(async () => (await cssBox(page)).width).toBeCloseTo(1440, 0); // zoom 3
});

// Every art pixel must be exactly 2x2 screen pixels at the embed size: the screenshot is 960x540 and made of
// uniform 2x2 blocks (no blur, no half-pixel offsets). The tolerance is tiny; the count shows in the message.
test('2x screenshot at 960x540 is made of uniform 2x2 blocks', async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.step, 'a few frames drawn').toBeGreaterThan(30);
  const png = await page.locator('#game canvas').screenshot();
  mkdirSync(fileURLToPath(new URL('../../docs/qa/evidence/', import.meta.url)), { recursive: true });
  writeFileSync(fileURLToPath(new URL('../../docs/qa/evidence/px-10-embed-2x.png', import.meta.url)), png);
  const result = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const cv = document.createElement('canvas');
    cv.width = bmp.width;
    cv.height = bmp.height;
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    let bad = 0;
    let total = 0;
    const at = (x: number, y: number): number => (y * bmp.width + x) * 4;
    for (let y = 0; y + 1 < bmp.height; y += 2) {
      for (let x = 0; x + 1 < bmp.width; x += 2) {
        total += 1;
        const o = at(x, y);
        for (const p of [at(x + 1, y), at(x, y + 1), at(x + 1, y + 1)]) {
          if (d[p] !== d[o] || d[p + 1] !== d[o + 1] || d[p + 2] !== d[o + 2]) {
            bad += 1;
            break;
          }
        }
      }
    }
    // a pixel-art frame is a handful of palette colours; a blurred one has hundreds
    const colours = new Set<number>();
    for (let i = 0; i < d.length; i += 4) colours.add(((d[i] ?? 0) << 16) | ((d[i + 1] ?? 0) << 8) | (d[i + 2] ?? 0));
    return { w: bmp.width, h: bmp.height, bad, total, colours: colours.size };
  }, png.toString('base64'));
  expect({ w: result.w, h: result.h }).toEqual({ w: 960, h: 540 });
  expect(result.bad / result.total, `non-uniform 2x2 blocks: ${result.bad}/${result.total}`).toBeLessThan(0.001);
  expect(result.colours, 'distinct colours (blur check)').toBeLessThan(200);
});
