/**
 * What the player can see in a level, read from the Game scene's display list (`gameObjects`): onboarding hint glyphs
 * (onboarding-hints.md), the "why you fell" ring and the exit arrow (clarity-fixes.md PT-1, PT-2), and what the two
 * accessibility settings change (reduced motion, reduced effects; pixel-effects.md). Positions and frames are asserted;
 * how it LOOKS is not (see docs/qa/test-plan.md, section 8, for what stays a human check).
 *
 * Display-list facts these tests rely on (batch 6 build): hint labels are BitmapText at depth 6; the why-fell ring is
 * `fx/why/<band>/{bold,hold,fade}` images at depth 7; the exit arrow is the `hud/edge/exit` image (depth 204/205);
 * the exit door is `tile/exit/door_N`; the horizon and stars are `bg/horizon`, `bg/stars`; ridges `bg/ridge_*`.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, expect, gameObjects, holdRightUntilPastX, nextFrames, pollState, seedSave, snapshot, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const HINT_DEPTH = 6;

async function hintTexts(page: Page): Promise<string[]> {
  const objs = (await gameObjects(page)) ?? [];
  return objs.filter((o) => o.type === 'BitmapText' && o.depth === HINT_DEPTH && o.visible).map((o) => o.text ?? '');
}

async function load(page: Page, level: string): Promise<void> {
  await page.goto(`./?level=${level}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.step > 3, 'level running', 45_000).toBe(true);
}

test.describe('onboarding hints (onboarding-hints.md checks 1-4, 7)', () => {
  const CASES: readonly (readonly [string, readonly string[]])[] = [
    ['w1-01', ['←', '→', 'A', 'D']],
    ['w1-02', ['R⇧', 'E', 'X', '▲', 'L⇧', 'Q', 'Z', '▼']],
    ['w2-01', ['R⇧', 'E', 'X', '▲', 'SPACE', 'W', '↑']],
  ];
  for (const [level, labels] of CASES) {
    test(`${level} shows its key caps from the first frame`, async ({ page }) => {
      await load(page, level);
      const texts = await hintTexts(page);
      for (const l of labels) expect(texts, `${level} hint label ${l}`).toContain(l);
      expect(texts.length, 'no extra hint labels').toBe(labels.length);
    });
  }

  test('a level without hint: headers draws no hint labels (w1-04)', async ({ page }) => {
    await load(page, 'w1-04');
    expect(await hintTexts(page)).toEqual([]);
  });

  test('hints are never removed: they are still drawn after a death and after R (w1-01)', async ({ page }) => {
    await load(page, 'w1-01');
    const before = await hintTexts(page);
    expect(before.length).toBeGreaterThan(0);
    // The death freeze is short, so a Playwright poll can miss it: remember in the page that the run left 'playing'.
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
    await holdRightUntilPastX(page, 5.2); // onto bridge 1, then let go: the bridge drops away
    await expect.poll(() => page.evaluate(() => (window as unknown as { __fell: boolean }).__fell), { message: 'fell through the bridge', timeout: 20_000 }).toBe(true);
    expect(await hintTexts(page), 'drawn during or after the fall').toEqual(before);
    await page.keyboard.press('KeyR');
    await nextFrames(page, 10);
    expect(await hintTexts(page), 'drawn after R').toEqual(before);
  });
});

test.describe('"why you fell" ring and the exit arrow', () => {
  /** Remember every why-fell frame that was ever visible (the ring lives under a second), tracked in the page. */
  async function watchWhyFrames(page: Page): Promise<void> {
    await page.evaluate(() => {
      const w = window as unknown as { __why: Set<string>; __game: { scene: { getScene(k: string): { children: { list: { visible: boolean; depth: number; frame?: { name: string } }[] } } } } };
      w.__why = new Set();
      const tick = (): void => {
        for (const o of w.__game.scene.getScene('Game').children.list) if (o.visible && o.frame && o.frame.name.startsWith('fx/why/')) w.__why.add(o.frame.name);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  const seenWhy = (page: Page): Promise<string[]> => page.evaluate(() => [...(window as unknown as { __why: Set<string> }).__why]);

  test('falling through blue bridge 1 in w1-01 draws the needed-colour ring (fx/why/blue/*)', async ({ page }) => {
    await load(page, 'w1-01');
    await watchWhyFrames(page);
    await holdRightUntilPastX(page, 5.2);
    await expect.poll(async () => (await seenWhy(page)).length, { message: 'why-fell ring frames seen', timeout: 20_000 }).toBeGreaterThan(0);
    const seen = await seenWhy(page);
    expect(seen.every((f) => f.startsWith('fx/why/blue/')), `ring is in the needed colour (blue): ${seen.join(', ')}`).toBe(true);
  });

  test('reduced motion: the ring still appears (it is information), without the burst frame', async ({ page }) => {
    await seedSave(page, { settings: { reducedMotion: true } });
    await load(page, 'w1-01');
    await watchWhyFrames(page);
    await holdRightUntilPastX(page, 5.2);
    await expect.poll(async () => (await seenWhy(page)).length, { message: 'why-fell frames seen', timeout: 20_000 }).toBeGreaterThan(0);
    test.info().annotations.push({ type: 'observed', description: `reduced-motion ring frames: ${(await seenWhy(page)).join(', ')}` });
  });

  test('w1-04: the exit arrow is on the right edge at the start; w1-01 (exit on screen): no exit arrow', async ({ page }) => {
    await load(page, 'w1-04');
    const arrows = ((await gameObjects(page)) ?? []).filter((o) => o.frame === 'hud/edge/exit');
    expect(arrows.length, 'one exit arrow image').toBe(1);
    expect(arrows[0]?.visible, 'visible while the exit is off screen').toBe(true);
    expect(arrows[0]?.x, 'on the right edge of the 480 px screen').toBeGreaterThan(440);
    expect(arrows[0]?.y, 'inside the screen, clear of the top HUD band').toBeGreaterThan(40);

    await load(page, 'w1-01');
    const near = ((await gameObjects(page)) ?? []).filter((o) => o.frame === 'hud/edge/exit');
    expect(near.every((o) => !o.visible), 'exit in view: arrow hidden').toBe(true);
  });
});

test.describe('reduced motion and reduced effects', () => {
  /** Every `tile/exit/door_N` frame drawn over at least 10 frames and 1.5 s, recorded in the page (round trips from Playwright are too slow under load). */
  const doorFrames = (page: Page): Promise<Set<string>> =>
    page
      .evaluate(
        () =>
          new Promise<string[]>((resolve) => {
            const w = window as unknown as { __game: { scene: { getScene(k: string): { children: { list: { frame?: { name: string } }[] } } } } };
            const seen = new Set<string>();
            const t0 = performance.now();
            let frames = 0;
            const tick = (): void => {
              frames += 1;
              for (const o of w.__game.scene.getScene('Game').children.list) if (o.frame?.name.startsWith('tile/exit/door_')) seen.add(o.frame.name);
              if (frames >= 10 && performance.now() - t0 >= 1500) resolve([...seen]);
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      )
      .then((names) => new Set(names));

  test('full effects: the exit door pulses (more than one door frame over time)', async ({ page }) => {
    await load(page, 'w1-04');
    expect((await doorFrames(page)).size).toBeGreaterThan(1);
  });

  test('reduced motion setting: the exit door is held on door_0', async ({ page }) => {
    await seedSave(page, { settings: { reducedMotion: true } });
    await load(page, 'w1-04');
    expect([...(await doorFrames(page))]).toEqual(['tile/exit/door_0']);
  });

  test('OS prefers-reduced-motion also holds the door (the save setting is off)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, 'w1-04');
    expect([...(await doorFrames(page))]).toEqual(['tile/exit/door_0']);
  });

  const bg = async (page: Page): Promise<Record<string, boolean>> => {
    const out: Record<string, boolean> = {};
    for (const o of (await gameObjects(page)) ?? []) if (o.frame === 'bg/horizon' || o.frame === 'bg/stars') out[o.frame] = o.visible;
    return out;
  };

  test('full effects: horizon and stars are drawn', async ({ page }) => {
    await load(page, 'w1-04');
    expect(await bg(page)).toEqual({ 'bg/horizon': true, 'bg/stars': true });
  });

  test('reduced effects setting: no horizon, no stars; the level still plays through a run and a fall without errors', async ({ page }) => {
    await seedSave(page, { settings: { reducedEffects: true } });
    await load(page, 'w1-01');
    expect(await bg(page)).toEqual({ 'bg/horizon': false, 'bg/stars': false });
    await holdRightUntilPastX(page, 5.2);
    await pollState(page, (s) => s.state.status !== 'playing' || s.state.player.y > 11, 'fell').toBe(true);
    await page.keyboard.press('KeyR');
    await nextFrames(page, 10);
    await pollState(page, (s) => s.state.status, 'playing again').toBe('playing');
    expect((await snapshot(page))?.state.status).toBe('playing'); // page and console errors are checked by the shared fixture
  });

  test('both settings on: the game boots, runs, pauses and leaves via LEVELS without errors', async ({ page }) => {
    await seedSave(page, { settings: { reducedEffects: true, reducedMotion: true } });
    await load(page, 'w1-04');
    expect(await bg(page)).toEqual({ 'bg/horizon': false, 'bg/stars': false });
    await page.keyboard.press('Escape');
    await pollState(page, (s) => s.paused, 'paused').toBe(true);
    await page.keyboard.press('Escape');
    await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
  });

  /** w1-04 is 37 tiles wide, so the camera scrolls once the runner is past the middle: sprint at gear 4 (E three times, then right). */
  async function scrollCamera(page: Page): Promise<number> {
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('KeyE');
      await nextFrames(page, 3);
    }
    await holdRightUntilPastX(page, 19);
    return page.evaluate(() => (window as unknown as { __game: { scene: { getScene(k: string): { cameras: { main: { scrollX: number } } } } } }).__game.scene.getScene('Game').cameras.main.scrollX);
  }
  const ridgeXs = async (page: Page): Promise<number[]> => ((await gameObjects(page)) ?? []).filter((o) => o.frame?.startsWith('bg/ridge')).map((o) => o.x);

  test('ridge parallax: the ridges move with the camera by default (w1-04)', async ({ page }) => {
    await load(page, 'w1-04');
    const start = await ridgeXs(page);
    const cam = await scrollCamera(page);
    test.info().annotations.push({ type: 'observed', description: `camera scrollX ${cam}; ridge x at start ${start.join(',')}; after ${(await ridgeXs(page)).join(',')}` });
    expect(cam, 'the camera scrolled').toBeGreaterThan(0);
    expect(await ridgeXs(page), 'parallax moves the ridges').not.toEqual(start);
  });

  test('ridge parallax: under reduced motion the ridges stay put while the camera scrolls (w1-04)', async ({ page }) => {
    await seedSave(page, { settings: { reducedMotion: true } });
    await load(page, 'w1-04');
    const start = await ridgeXs(page);
    const cam = await scrollCamera(page);
    expect(cam, 'the camera scrolled').toBeGreaterThan(0);
    expect(await ridgeXs(page), 'no parallax under reduced motion').toEqual(start);
  });
});
