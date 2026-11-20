/**
 * Keys on the frame Pause opens or closes (pause.md checks 13 and 14, design ruling 2026-11-19; test-plan 9.5, B7-14).
 * Rule: a key that goes down on the frame Pause opens or closes is a pressed key and is ignored until it is released and
 * pressed again, even if still down at resume. "Held through the pause" means down BEFORE that frame.
 * Check 13 itself (Esc + Space together) is `pause-menu.spec.ts`; held-key check 4 is `pause.spec.ts`.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, expect, nextFrames, pollScenes, pollState, snapshot, startTracker, stopTracker, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

test.beforeEach(async ({ page }) => {
  await page.goto('./?level=w1-02');
  await waitForHook(page);
  await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded && s.state.step > 5, 'standing at the spawn', 45_000).toBe(true);
});

/** Dispatch these keys in one task (one frame): the technique of the Esc+Space test in pause-menu.spec.ts. */
const together = (page: Page, type: 'keydown' | 'keyup', codes: readonly string[]): Promise<void> =>
  page.evaluate(
    ([t, cs]) => {
      for (const code of cs) window.dispatchEvent(new KeyboardEvent(t as 'keydown' | 'keyup', { code, key: code, bubbles: true }));
    },
    [type, [...codes]] as const,
  );

test('P-13b closing frame: Space pressed with the closing Esc never reaches the sim, even when it stays down after resume', async ({ page }) => {
  await page.keyboard.press('Escape');
  await pollScenes(page, ['Game', 'Pause']);
  await pollState(page, (s) => s.paused, 'paused').toBe(true);
  const y0 = (await snapshot(page))?.state.player.y ?? 0;
  await together(page, 'keydown', ['Escape', 'Space']);
  await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
  await startTracker(page);
  await nextFrames(page, 20); // Space still down for 20 frames after the resume
  await together(page, 'keyup', ['Escape', 'Space']);
  await nextFrames(page, 20);
  const track = await stopTracker(page);
  expect(track.length, 'sim ran after the resume').toBeGreaterThan(5);
  expect(track.every((t) => t.grounded && Math.abs(t.y - y0) < 1e-6), 'never left the floor: no jump from the closing Space').toBe(true);
});

test('P-13d / pause 14: Right down on the opening frame and still held at resume does not move the runner until it is pressed again', async ({ page }) => {
  await together(page, 'keydown', ['Escape', 'ArrowRight']);
  await pollScenes(page, ['Game', 'Pause']);
  await pollState(page, (s) => s.paused, 'paused').toBe(true);
  await together(page, 'keyup', ['Escape']); // Right stays down
  await page.keyboard.press('Escape'); // RESUME
  await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
  const x0 = (await snapshot(page))?.state.player.x ?? 0;
  const at = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step >= at + 40, 'forty more steps').toBe(true);
  const held = (await snapshot(page))?.state.player;
  expect(held?.vx, 'vx 0 while Right is held from the opening frame').toBe(0);
  expect(held?.x, 'did not move').toBeCloseTo(x0, 6);
  await together(page, 'keyup', ['ArrowRight']);
  await nextFrames(page, 3);
  await together(page, 'keydown', ['ArrowRight']);
  await pollState(page, (s) => s.state.player.vx > 0, 'pressed again: runs').toBe(true);
  await together(page, 'keyup', ['ArrowRight']);
});
