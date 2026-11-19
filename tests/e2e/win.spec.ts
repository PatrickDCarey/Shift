/**
 * Win recording and HUD through the real scene (docs/design/features/progress-save.md, results.md, hud-gear-meter.md).
 *
 * w1-01 is won live by holding ArrowRight the whole way: gear 1 is blue and walking holds the blue bridges, and
 * both pads are safe, so no shift or let-go is needed. The save lives in localStorage under `redshift.save`
 * (src/save/store.ts). World 0 and replay mode write nothing (`recordRun`).
 */
import type { Page } from '@playwright/test';
import { POLL_TIMEOUT_MS, armLiveWin, finishLiveWin, TEST_TIMEOUT_MS, expect, menuModel, minStepSeen, nextFrames, pollScenes, pollState, resultsPanelUp, snapshot, test, waitForHook, watchSteps, winLiveHoldingRight } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w1-01';
const SAVE_KEY = 'redshift.save';
const STEP_HZ = 60;

interface SaveShape {
  readonly progress?: { readonly completedLevels?: readonly string[]; readonly bestSteps?: Readonly<Record<string, number>> };
}

function readSave(page: Page): Promise<SaveShape | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as SaveShape);
  }, SAVE_KEY);
}

/** The panel time line for a win on `steps` (hundredths truncated; results.md check 12). */
function timeFor(steps: number): string {
  const minutes = Math.floor(steps / (STEP_HZ * 60));
  const seconds = Math.floor(steps / STEP_HZ) % 60;
  const hundredths = Math.floor(((steps % STEP_HZ) * 100) / STEP_HZ);
  return `TIME ${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

/** Wait for the Results panel (after its 0.6 s beat) and check its time line. */
async function expectResults(page: Page, steps: number): Promise<void> {
  await pollScenes(page, ['Game', 'Results'], 'Results opened over the won game');
  await expect.poll(() => resultsPanelUp(page), { message: 'results panel drawn (beat over)', timeout: POLL_TIMEOUT_MS }).toBe(true);
  expect((await menuModel<{ timeText: string }>(page, 'Results'))?.timeText).toBe(timeFor(steps));
}

/** Stand for `waitSteps` sim steps, then hold ArrowRight until the run is won (in-page, see helpers). Returns the win step. */
const winLive = winLiveHoldingRight;

test.describe('live win recording', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`./?level=${LEVEL}`);
    await waitForHook(page);
    await page.locator('#game canvas').click();
    await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded, 'at the spawn').toBe(true);
  });

  test('nothing is stored before the first win', async ({ page }) => {
    const save = await readSave(page);
    expect(save?.progress?.completedLevels ?? []).toEqual([]);
    expect(save?.progress?.bestSteps ?? {}).toEqual({});
  });

  test('a live w1-01 win stores completedLevels and bestSteps; slower wins keep the best, faster ones replace it', async ({ page }) => {
    const first = await winLive(page, 60); // deliberately slow: stand until step 60 first
    await expectResults(page, first);
    let save = await readSave(page);
    expect(save?.progress?.completedLevels, 'completed once').toEqual([LEVEL]);
    expect(save?.progress?.bestSteps, 'best = the win step count').toEqual({ [LEVEL]: first });

    // R restarts; a faster run improves the best.
    await armLiveWin(page, 0); // armed before R so the key goes down in the first frames of the new run
    await watchSteps(page);
    await page.keyboard.press('KeyR'); // R on the panel retries
    await expect.poll(() => minStepSeen(page), { message: 'restarted: the step counter went back to ~0', timeout: POLL_TIMEOUT_MS }).toBeLessThan(20);
    await pollState(page, (s) => s.state.status === 'playing' && s.state.wonAtStep === null, 'restarted and playing').toBe(true);
    const second = await finishLiveWin(page);
    expect(second, 'the straight run is faster than the stand-first run').toBeLessThan(first);
    await expectResults(page, second);
    save = await readSave(page);
    expect(save?.progress?.completedLevels, 'still listed once').toEqual([LEVEL]);
    expect(save?.progress?.bestSteps, 'faster win replaces the best').toEqual({ [LEVEL]: second });

    // A slower third win leaves the best alone.
    await armLiveWin(page, 90);
    await watchSteps(page);
    await page.keyboard.press('KeyR'); // R on the panel retries
    await expect.poll(() => minStepSeen(page), { message: 'restarted again', timeout: POLL_TIMEOUT_MS }).toBeLessThan(20);
    await pollState(page, (s) => s.state.status === 'playing' && s.state.wonAtStep === null, 'restarted again and playing').toBe(true);
    const third = await finishLiveWin(page);
    expect(third).toBeGreaterThan(second);
    save = await readSave(page);
    expect(save?.progress?.bestSteps, 'slower win does not replace the best').toEqual({ [LEVEL]: second });
    expect(save?.progress?.completedLevels).toEqual([LEVEL]);

    // The same save after a reload.
    await page.reload();
    await waitForHook(page);
    save = await readSave(page);
    expect(save?.progress?.bestSteps).toEqual({ [LEVEL]: second });
  });
});

test.describe('replay mode', () => {
  test('a replayed win writes nothing to localStorage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`./?level=${LEVEL}&replay=1&speed=60`);
    await waitForHook(page);
    await pollState(page, (s) => s.state.status, 'replay won', 90_000).toBe('won');
    await pollState(page, (s) => s.state.wonAtStep, 'win step').toBe(434);
    await nextFrames(page, 90); // more than the 0.6 s beat in rendered frames: Results must still not open
    await pollScenes(page, ['Game'], 'no Results scene in replay mode (results check 10)');
    // Give the scene a few more frames to (wrongly) write.
    await page.evaluate(() => new Promise<void>((done) => { let n = 0; const t = (): void => { n += 1; if (n >= 30) done(); else requestAnimationFrame(t); }; requestAnimationFrame(t); }));
    const save = await readSave(page);
    expect(save?.progress?.completedLevels ?? [], 'no completed level from a replay').toEqual([]);
    expect(save?.progress?.bestSteps ?? {}, 'no best time from a replay').toEqual({});
  });
});

// hud-gear-meter.md checks 1, 2, 9 through the scene (test-plan gap G12 closed by the hook's `meter`).
test.describe('gear meter in the scene', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`./?level=${LEVEL}`);
    await waitForHook(page);
    await page.locator('#game canvas').click();
    await pollState(page, (s) => s.meter !== null && s.state.player.grounded, 'meter model on the hook').toBe(true);
  });

  test('check 1: initial model', async ({ page }) => {
    const m = (await snapshot(page))?.meter;
    expect(m).toEqual({ litBand: 0, selectedGear: 1, needle: 0, dragFill: null, pendingGear: null });
  });

  test('check 2: three up-presses standing give gear 4, lit 0, needle 0; Q/Z come back down', async ({ page }) => {
    // One press per rendered frame at most: presses of different keys inside one frame merge into one shift-up action.
    let gear = 1;
    for (const key of ['KeyE', 'ShiftRight', 'KeyX']) {
      await page.keyboard.press(key);
      gear += 1;
      await pollState(page, (s) => s.meter?.selectedGear, 'meter gear ' + gear).toBe(gear);
    }
    const m = (await snapshot(page))?.meter;
    expect(m?.litBand).toBe(0);
    expect(m?.needle).toBe(0);
    expect(m?.dragFill).toBeNull();
    await page.keyboard.press('KeyQ');
    await pollState(page, (s) => s.meter?.selectedGear, 'meter gear 3').toBe(3);
  });

  test('the model follows the sim on every frame of a gear-4 run and returns to the initial model after R (checks 3, 9)', async ({ page }) => {
    for (const gear of [2, 3, 4]) {
      await page.keyboard.press('KeyE');
      await pollState(page, (s) => s.meter?.selectedGear, 'meter gear ' + gear).toBe(gear);
    }
    // Per-frame (state, meter) pairs recorded in the page.
    await page.evaluate(() => {
      const w = window as unknown as { __pairs: unknown[]; __pairsOn: boolean };
      w.__pairs = [];
      w.__pairsOn = true;
      const tick = (): void => {
        const h = window.__redshift;
        if (h?.meter) {
          w.__pairs.push({ step: h.state.step, vx: h.state.player.vx, band: h.state.player.band, gear: h.state.player.gear, lit: h.meter.litBand, sel: h.meter.selectedGear, needle: h.meter.needle });
        }
        if (w.__pairsOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.down('ArrowRight');
    await pollState(page, (s) => s.state.status !== 'playing' || s.state.player.x > 3.5 || s.state.step > 400, 'run ended or left the pad', 60_000).toBe(true);
    await page.keyboard.up('ArrowRight');
    const pairs = (await page.evaluate(() => {
      const w = window as unknown as { __pairs: { step: number; vx: number; band: number; gear: number; lit: number; sel: number; needle: number }[]; __pairsOn: boolean };
      w.__pairsOn = false;
      return w.__pairs;
    }));
    expect(pairs.length).toBeGreaterThan(1);
    for (const p of pairs) {
      expect(p.lit, `lit cell is the sim band at step ${p.step}`).toBe(p.band);
      expect(p.sel, `bracket is the selected gear at step ${p.step}`).toBe(p.gear);
      expect(p.needle, `needle is |vx| / 3 at step ${p.step}`).toBeCloseTo(Math.min(4, Math.abs(p.vx) / 3), 6);
    }
    expect(Math.max(...pairs.map((p) => p.lit)), 'the run left band 0 (the meter lit a cell)').toBeGreaterThan(0);

    await watchSteps(page);
    await page.keyboard.press('KeyR');
    await expect.poll(() => minStepSeen(page), { message: 'restarted', timeout: POLL_TIMEOUT_MS }).toBeLessThan(20);
    await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded, 'standing again').toBe(true);
    await pollState(page, (s) => s.meter, 'meter back to the initial model').toEqual({ litBand: 0, selectedGear: 1, needle: 0, dragFill: null, pendingGear: null });
  });

  test('no banner while playing', async ({ page }) => {
    expect((await snapshot(page))?.banner).toBeNull();
  });
});
