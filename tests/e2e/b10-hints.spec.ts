/**
 * Batch 10 hint headers (design 2026-11-23): w3-02 gains `jump 5 3` (box cols 4-6, px 71-106, left of the kerb face at
 * px 128). Checks: the glyph is on the first frame, behind the player (depth), on screen, clear of the HUD; and at the
 * recording state where the runner is held at the kerb (x 7.625) the glyph is on screen, left of the runner and the kerb.
 * The w3-05 col-40 move is covered by `batch8.spec.ts` "hints 14 w3-05 v2".
 */
import { HUD_RECT, overlaps, wholeOnScreen, type Rect } from './b8-replay';
import { TEST_TIMEOUT_MS, expect, pollState, test, waitForHook } from './helpers';
import type { Page } from '@playwright/test';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const TILE = 16;
const ADV = 6;
const JUMP = ['SPACE', 'W', '↑'];

interface Snap {
  step: number;
  scrollX: number;
  scrollY: number;
  rx: number;
  labels: { text: string; x: number; y: number; depth: number }[];
  sprites: { x: number; y: number; w: number; h: number; depth: number }[];
}

/** Sample the Game scene on the first frame at or after `minStep` (immediately when 0). */
function sample(page: Page, minStep: number): Promise<Snap> {
  return page.evaluate(
    (target) =>
      new Promise<Snap>((resolve) => {
        type Obj = { visible: boolean; type: string; depth: number; x: number; y: number; text?: string; frame?: { name: string }; getBounds(): { x: number; y: number; width: number; height: number } };
        const g = (window as unknown as { __game: { scene: { getScene(k: string): { cameras: { main: { scrollX: number; scrollY: number } }; children: { list: Obj[] } } } } }).__game;
        const tick = (): void => {
          const st = window.__redshift?.state as unknown as { step: number; player: { x: number } } | undefined;
          if (st && st.step >= target) {
            const sc = g.scene.getScene('Game');
            const list = sc.children.list.filter((o) => o.visible);
            resolve({
              step: st.step,
              scrollX: sc.cameras.main.scrollX,
              scrollY: sc.cameras.main.scrollY,
              rx: st.player.x,
              labels: list.filter((o) => o.type === 'BitmapText' && o.depth === 6).map((o) => ({ text: o.text ?? '', x: o.x, y: o.y, depth: o.depth })),
              sprites: list
                .filter((o) => /^player\/runner\//.test(o.frame?.name ?? ''))
                .map((o) => ({ ...o.getBounds(), w: o.getBounds().width, h: o.getBounds().height, depth: o.depth })),
            });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    minStep,
  );
}

function jumpBox(s: Snap): { box: Rect; world: { left: number; right: number } } {
  const mine = s.labels.filter((l) => JUMP.includes(l.text));
  expect(mine.map((l) => l.text).sort(), 'one jump glyph (its three key labels)').toEqual([...JUMP].sort());
  expect(s.labels.length, 'w3-02 has only the jump hint').toBe(JUMP.length);
  const left = Math.min(...mine.map((o) => o.x)) - 2;
  const right = Math.max(...mine.map((o) => o.x + ADV * o.text.length)) + 2;
  const top = Math.min(...mine.map((o) => o.y)) - 2;
  return { box: { x: left - s.scrollX, y: top - s.scrollY, w: right - left, h: 24 }, world: { left, right } };
}

test('hints b10 w3-02: the jump glyph is on the first frame (behind the player, on screen, clear of the HUD); with the runner held at the kerb (x 7.625) it is on screen, left of the runner and left of the kerb face', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('./?level=w3-02');
  await waitForHook(page);
  await pollState(page, (s) => s.state.step > 3, 'level running', 45_000).toBe(true);
  const first = await sample(page, 0);
  const a = jumpBox(first);
  test.info().annotations.push({ type: 'observed', description: `first frame (step ${first.step}): box ${JSON.stringify(a.box)} world ${a.world.left}..${a.world.right}, depth ${first.labels[0]?.depth}, runner sprite ${JSON.stringify(first.sprites)}` });
  expect(wholeOnScreen(a.box), `box on screen ${JSON.stringify(a.box)}`).toBe(true);
  expect(overlaps(a.box, HUD_RECT), 'box clear of the HUD').toBe(false);
  expect(first.sprites.length, 'runner sprite drawn').toBe(1);
  expect(first.labels[0]?.depth, 'glyph drawn behind the player (depth)').toBeLessThan(first.sprites[0]?.depth ?? 0);
  expect(Math.floor((a.world.left + a.world.right) / 2 / TILE), 'glyph column 5').toBe(5);
  expect(a.world.left >= 4 * TILE - 1 && a.world.right <= 7 * TILE + 1, `box cols 4-6 (px 64-112): ${a.world.left}..${a.world.right}`).toBe(true);
  expect(a.world.right, 'box ends left of the kerb face (px 128)').toBeLessThan(8 * TILE);

  // the recording state: hold Right in gear 1 and the runner stops at the kerb face (x 7.625)
  await page.keyboard.down('ArrowRight');
  try {
    await pollState(page, (s) => s.state.step > 0 && (s.state.player?.x ?? 0) >= 7.6, 'runner at the kerb', 30_000).toBe(true);
    await expect.poll(async () => (await page.evaluate(() => (window.__redshift?.state as unknown as { player: { x: number } }).player.x)) >= 7.6, { timeout: 5_000 }).toBe(true);
    const at = await sample(page, 0);
    const b = jumpBox(at);
    await page.screenshot({ path: 'docs/qa/evidence/b10-w3-02-jump-glyph.png' });
    const sprite = at.sprites[0] as Snap['sprites'][number];
    test.info().annotations.push({ type: 'observed', description: `kerb (step ${at.step}): runner x ${at.rx.toFixed(3)}, box ${JSON.stringify(b.box)}, runner sprite x ${sprite.x}..${sprite.x + sprite.w}` });
    expect(at.rx, 'runner held at the kerb').toBeCloseTo(7.625, 1);
    expect(wholeOnScreen(b.box), `box on screen ${JSON.stringify(b.box)}`).toBe(true);
    expect(overlaps(b.box, HUD_RECT), 'box clear of the HUD').toBe(false);
    expect(b.world.right, 'box right edge left of the runner sprite').toBeLessThanOrEqual(sprite.x + sprite.w / 2);
    expect((b.world.left + b.world.right) / 2, 'glyph centre behind the runner (left of its x)').toBeLessThan(at.rx * TILE);
    expect(b.world.right, 'box left of the kerb face (px 128)').toBeLessThan(8 * TILE);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
});
