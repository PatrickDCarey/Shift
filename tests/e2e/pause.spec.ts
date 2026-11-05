/**
 * Pause through the real scene (docs/design/features/pause.md, M2-06 scene lane; the M1 stand-in label is
 * the only overlay, the menu is M2-12). Read through `window.__redshift`: `paused`, `state`, plus per-frame
 * samples recorded in the page (`startTracker`), so a low headless frame rate cannot hide a step.
 *
 * Spec checks covered: 1 (Esc/P freeze, resume), 2 (no catch-up), 3 (partly: no frames reach the sim while
 * paused; recording equality is a unit test), 4 (keys held through the pause), 5 and 6 (keys pressed while
 * paused are ignored), 7 (R while paused), 10 (blur pauses and drops held keys). Checks 8, 9 and 12 need the
 * menus and results screen (M2-12); 11 (death freeze) is timing-bound and unit-tested.
 */
import { TEST_TIMEOUT_MS, expect, holdRightUntilPastX, pollState, snapshot, startTracker, stopTracker, test, waitForHook, type HookSnapshot } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w0-02';
/** `MAX_STEPS_PER_FRAME` in src/entities/interpolation.ts. */
const MAX_STEPS_PER_FRAME = 5;

test.beforeEach(async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  await page.locator('#game canvas').click();
  await pollState(page, (s) => s.state.player.grounded, 'player grounded at spawn').toBe(true);
});

/** Resolve after `frames` animation frames AND at least `ms` of wall clock, both counted in the page. */
function idleFor(page: import('@playwright/test').Page, frames: number, ms: number): Promise<void> {
  return page.evaluate(
    ([f, t]) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now();
        let n = 0;
        const tick = (): void => {
          n += 1;
          if (n >= f && performance.now() - t0 >= t) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [frames, ms] as const,
  );
}

async function pause(page: import('@playwright/test').Page, key: string): Promise<HookSnapshot> {
  await page.keyboard.press(key);
  await pollState(page, (s) => s.paused, `paused after ${key}`).toBe(true);
  const s = await snapshot(page);
  if (!s) throw new Error('no hook');
  return s;
}

for (const key of ['Escape', 'KeyP'] as const) {
  test(`${key} pauses: no sim steps over 120 rendered frames; pressing it again resumes (pause check 1)`, async ({ page }) => {
    await page.keyboard.down('ArrowRight');
    await pollState(page, (s) => s.state.player.vx > 0 && s.state.player.x > 1, 'running').toBe(true);
    const before = await pause(page, key);
    await idleFor(page, 120, 0);
    const during = await snapshot(page);
    expect(during?.paused, 'still paused').toBe(true);
    expect(during?.state.step, 'step frozen while paused').toBe(before.state.step);
    expect(during?.state.player, 'player state frozen while paused').toEqual(before.state.player);

    await startTracker(page);
    await page.keyboard.press(key);
    await pollState(page, (s) => !s.paused && s.state.step > before.state.step + 10, `resumed after ${key}`).toBe(true);
    const track = await stopTracker(page);
    await page.keyboard.up('ArrowRight');
    const firstLive = track.find((t) => !t.paused && t.step > before.state.step);
    expect(firstLive, 'a live frame after resume').toBeDefined();
    // Stepping continues from where it stopped: no jump in x beyond what a few steps at 3 tiles/s allow.
    expect((firstLive?.step ?? 0) - before.state.step, 'first live frame steps at most one frame worth').toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    expect((firstLive?.x ?? 0) - before.state.player.x, 'continues from the paused position').toBeLessThanOrEqual(MAX_STEPS_PER_FRAME * (3 / 60) + 1e-6);
  });
}

test('no catch-up: 3 s paused, then the first live frame runs a normal frame of steps (pause check 2)', async ({ page }) => {
  const before = await pause(page, 'Escape');
  await idleFor(page, 60, 3000);
  expect((await snapshot(page))?.state.step, 'no steps while paused').toBe(before.state.step);
  await startTracker(page);
  await page.keyboard.press('Escape');
  await pollState(page, (s) => !s.paused && s.state.step >= before.state.step + 30, 'resumed and running').toBe(true);
  const track = await stopTracker(page);
  const steps = [before.state.step, ...track.filter((t) => !t.paused).map((t) => t.step)];
  const biggest = Math.max(...steps.slice(1).map((s, i) => s - (steps[i] ?? 0)));
  // 3 s at 60 Hz is 180 steps; a catch-up would show as a frame far above the per-frame cap.
  expect(biggest, 'largest step jump in one rendered frame after resume').toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
});

test('a key held through the pause keeps counting as held: no stop, no skid (pause check 4)', async ({ page }) => {
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0 && s.state.player.x > 1, 'running').toBe(true);
  const before = await pause(page, 'Escape');
  await idleFor(page, 30, 0);
  await startTracker(page);
  await page.keyboard.press('Escape');
  await pollState(page, (s) => !s.paused && s.state.step >= before.state.step + 15, 'running again after resume').toBe(true);
  const track = await stopTracker(page);
  await page.keyboard.up('ArrowRight');
  const live = track.filter((t) => !t.paused && t.step > before.state.step);
  expect(live.length, 'live samples after the resume').toBeGreaterThan(0);
  expect(Math.min(...live.map((t) => t.vx)), 'vx never drops to 0 after resume').toBeGreaterThan(0);
});

test('Space held while paused does not jump until it is released and pressed again (pause check 5)', async ({ page }) => {
  await pause(page, 'Escape');
  await page.keyboard.down('Space'); // as if Space picked RESUME
  await page.keyboard.press('KeyP'); // the P that closes the pause is masked too
  await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
  const at = (await snapshot(page))?.state.step ?? 0;
  await startTracker(page);
  await pollState(page, (s) => s.state.step >= at + 40, '40 steps with Space still held').toBe(true);
  const held = await stopTracker(page);
  expect(held.every((t) => t.grounded), 'no jump while Space is still held from the pause').toBe(true);
  await page.keyboard.up('Space');
  await page.keyboard.down('Space');
  await pollState(page, (s) => !s.state.player.grounded, 'a fresh Space press jumps').toBe(true);
  await page.keyboard.up('Space');
});

test('keys tapped while paused never reach the sim: gear and position unchanged (pause check 6)', async ({ page }) => {
  await page.keyboard.press('KeyE');
  await page.keyboard.press('KeyE');
  await pollState(page, (s) => s.state.player.gear, 'gear 3').toBe(3);
  const before = await pause(page, 'Escape');
  for (const key of ['KeyQ', 'ShiftLeft', 'ShiftRight', 'ArrowRight', 'Space']) await page.keyboard.press(key);
  await page.keyboard.press('Escape');
  await pollState(page, (s) => !s.paused && s.state.step >= before.state.step + 30, 'resumed, 30 steps').toBe(true);
  const after = await snapshot(page);
  expect(after?.state.player.gear, 'gear unchanged by Q / Shift tapped while paused').toBe(3);
  expect(after?.state.player.x, 'a tapped ArrowRight did not move the player').toBe(before.state.player.x);
  expect(after?.state.player.grounded, 'a tapped Space did not jump').toBe(true);
});

test('R while paused restarts the run and closes the pause (pause check 7)', async ({ page }) => {
  const spawn = (await snapshot(page))?.state.player;
  await holdRightUntilPastX(page, (spawn?.x ?? 0) + 0.4); // released inside the page, so the walk stops on the pad
  await pollState(page, (s) => s.state.player.vx === 0 && s.state.player.x > (spawn?.x ?? 0) + 0.3, 'standing off the spawn').toBe(true);
  await page.keyboard.press('KeyE');
  await pollState(page, (s) => s.state.player.gear, 'gear 2').toBe(2);
  const at = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step >= at + 30, 'some steps pass').toBe(true);
  const before = await pause(page, 'Escape');
  await page.keyboard.press('KeyR');
  await pollState(page, (s) => !s.paused, 'pause closed by R').toBe(true);
  const after = await snapshot(page);
  expect(after?.state.status).toBe('playing');
  expect(after?.state.player.gear, 'gear reset to 1').toBe(1);
  expect(after?.state.step, 'step counter restarted').toBeLessThan(before.state.step);
  expect(after?.state.player.x, 'back at the spawn').toBeCloseTo(spawn?.x ?? 0, 6);
});

test('input works normally after a restart from the pause', async ({ page }) => {
  await pause(page, 'KeyP');
  await page.keyboard.press('KeyR');
  await pollState(page, (s) => !s.paused && s.state.step > 5, 'restarted run is stepping').toBe(true);
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0, 'input works after restart from pause').toBe(true);
  await page.keyboard.up('ArrowRight');
});

test('window blur pauses and drops held keys; Right must be pressed again after resume (pause check 10)', async ({ page }) => {
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0 && s.state.player.x > 1, 'moving').toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await pollState(page, (s) => s.paused, 'blur paused the game').toBe(true);
  const frozen = await snapshot(page);
  await idleFor(page, 60, 0);
  expect((await snapshot(page))?.state.step, 'sim frozen while paused by blur').toBe(frozen?.state.step);
  // The key is still physically down in Playwright's keyboard, but the game dropped it.
  await page.keyboard.press('Escape');
  await pollState(page, (s) => !s.paused && s.state.step >= (frozen?.state.step ?? 0) + 20, 'resumed, 20 steps').toBe(true);
  const after = await snapshot(page);
  expect(after?.state.player.vx, 'Right is not held until pressed again').toBe(0);
  // At most the one release step (half a step of travel) between the pause and the first live step.
  expect(Math.abs((after?.state.player.x ?? 0) - (frozen?.state.player.x ?? 0)), 'the runner did not keep running').toBeLessThan(0.06);
  const rest = after?.state.player.x ?? 0;
  await pollState(page, (s) => s.state.step >= (after?.state.step ?? 0) + 20, '20 more steps').toBe(true);
  expect((await snapshot(page))?.state.player.x, 'stays put with the key not held').toBe(rest);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.vx > 0, 'pressed again: moving').toBe(true);
  await page.keyboard.up('ArrowRight');
});

test('tab hidden (visibilitychange) pauses like blur', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pollState(page, (s) => s.paused, 'hidden tab paused the game').toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
});
