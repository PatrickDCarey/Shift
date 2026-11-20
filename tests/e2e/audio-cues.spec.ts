/**
 * In-game sound effects through the cue log (`window.__redshift.audio.cues()`, the last 64 `{ cue, body?, atMs, audible }`;
 * adaptive-audio.md checks 13-15; test-plan 9.2, B7-14). Headless Chromium cannot be heard: this proves WHICH cue was
 * requested, in which order, and whether it was audible (false while the audio is locked or muted). By ear stays with the owner (A-15b).
 * `audio.state` and `activeVoices()` are not on the hook, so "never above 24 voices" (A-15c) is not asserted here.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, armLiveWin, expect, finishLiveWin, holdRightUntilPastX, nextFrames, pollState, readCues, seedSave, test, waitForHook, type CueEntry } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const names = (c: readonly CueEntry[]): string[] => c.map((e) => e.cue);

async function load(page: Page, search: string): Promise<void> {
  await page.goto(`./${search}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.step > 3, 'running', 45_000).toBe(true);
}

/** One gesture the page counts as the first user input; B is bound to nothing. */
async function unlock(page: Page): Promise<void> {
  await page.keyboard.press('KeyB');
  await nextFrames(page, 10);
}

test('A-15a w1-02: E then Q give shiftUp then shiftDown, audible', async ({ page }) => {
  await load(page, '?level=w1-02');
  await page.keyboard.press('KeyE'); // the first gesture is also a shift: it may be requested while still locked
  await nextFrames(page, 10);
  await unlock(page);
  await page.keyboard.press('KeyE');
  await nextFrames(page, 6);
  await page.keyboard.press('KeyQ');
  await nextFrames(page, 10);
  const cues = await readCues(page);
  const n = names(cues);
  expect(n, `cues ${JSON.stringify(n)}`).toEqual(['shiftUp', 'shiftUp', 'shiftDown']);
  expect(cues.every((c) => c.audible), 'every cue came after a key down, so all are audible').toBe(true);
});

test('A-15a w2-01: Space gives jump, and the landing gives land', async ({ page }) => {
  await load(page, '?level=w2-01');
  await unlock(page);
  await pollState(page, (s) => s.state.player.grounded, 'grounded').toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(async () => names(await readCues(page)), { message: 'jump then land' }).toEqual(['jump', 'land']);
  expect((await readCues(page)).every((c) => c.audible)).toBe(true);
});

test('A-15a w1-01: falling through a bridge gives fallThrough, then the respawn gives reset; R gives reset', async ({ page }) => {
  await load(page, '?level=w1-01');
  await unlock(page);
  await holdRightUntilPastX(page, 5.2); // onto bridge 1, then let go
  await expect.poll(async () => names(await readCues(page)), { message: 'fallThrough then reset', timeout: 30_000 }).toEqual(['fallThrough', 'reset']);
  await pollState(page, (s) => s.state.status, 'playing again').toBe('playing');
  await nextFrames(page, 10);
  await page.keyboard.press('KeyR');
  await expect.poll(async () => names(await readCues(page)).slice(2), { message: 'R gives reset' }).toEqual(['reset']);
});

test('A-15a w2-02 replay: shiftUp x3, jump, airDragClunk, land, levelComplete in that order; the first is inaudible before the first key', async ({ page }) => {
  await load(page, '?level=w2-02&replay=1&speed=1');
  const keyAt = await page.evaluate(() => performance.now());
  await unlock(page);
  await expect.poll(() => page.evaluate(() => window.__redshift?.replay?.done === true), { message: 'replay done', timeout: 90_000 }).toBe(true);
  await nextFrames(page, 10);
  const cues = await readCues(page);
  expect(names(cues), 'order').toEqual(['shiftUp', 'shiftUp', 'shiftUp', 'jump', 'airDragClunk', 'land', 'levelComplete']);
  expect(cues.at(-1)?.audible, 'the win sting is audible after the key').toBe(true);
  // A-15c: locked before the first key (nothing audible requested earlier), running after it
  expect(cues.filter((c) => c.atMs < keyAt).every((c) => !c.audible), 'cues before the first key are inaudible').toBe(true);
  expect(cues.filter((c) => c.atMs > keyAt + 500).every((c) => c.audible), 'cues after the first key are audible').toBe(true);
  test.info().annotations.push({ type: 'observed', description: cues.map((c) => `${c.cue}${c.audible ? '' : '(inaudible)'}`).join(', ') });
});

test('A-15a live win of w1-01: the win sting is requested once', async ({ page }) => {
  await load(page, '?level=w1-01');
  await unlock(page);
  await armLiveWin(page);
  await finishLiveWin(page);
  await nextFrames(page, 10);
  expect(names(await readCues(page)).filter((c) => c === 'levelComplete'), 'one levelComplete').toHaveLength(1);
});

test('S-1 muted: with SOUND OFF every cue is requested but none is audible, even after the first key', async ({ page }) => {
  await seedSave(page, { settings: { muted: true } });
  await load(page, '?level=w1-02');
  await unlock(page);
  await page.keyboard.press('KeyE');
  await nextFrames(page, 10);
  const cues = await readCues(page);
  expect(names(cues)).toEqual(['shiftUp']);
  expect(cues.every((c) => !c.audible), 'inaudible').toBe(true);
});
