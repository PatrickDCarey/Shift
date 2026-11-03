/**
 * Replay win (M1 board: replay of every shipped solution in the real browser
 * build). Needs the scene lane's replay mode:
 *   ?level=<id>&replay=1[&speed=<n>]  drives the sim from levels/<id>.solution.txt
 *   window.__redshift.replay = { active, done, frames }
 * `done` turns true when the frames run out or the status is `won`. It does NOT turn true on `dead`:
 * recordings include the deaths and restarts before the winning run (level-format.md section 4).
 * `speed=n` runs exactly n sim steps per rendered frame (clamped 1-60); R restarts the replay from frame 0.
 */
import { EMBED_VIEWPORT, TEST_TIMEOUT_MS, expect, listSolutions, pollState, snapshot, test, waitForHook } from './helpers';

// The itch.io embed size. (A project's device preset would otherwise override the config-level viewport.)
test.use({ viewport: EMBED_VIEWPORT });
test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const REPLAY_TIMEOUT_MS = 90_000; // wall clock for the replay to finish; speed=60 needs ~13 frames, slow machines far more
const solutions = listSolutions();

test('at least one level ships a solution recording', () => {
  expect(solutions.length).toBeGreaterThan(0);
});

for (const { id, steps } of solutions) {
  test(`replay of ${id} wins on step ${steps}`, async ({ page }) => {
    test.setTimeout(REPLAY_TIMEOUT_MS + 15_000);
    await page.goto(`./?level=${id}&replay=1&speed=60`);
    const first = await waitForHook(page);
    expect(first.levelId).toBe(id);
    expect(first.replay, 'replay mode not implemented: window.__redshift.replay is missing').not.toBeNull();
    expect(first.replay?.active, 'replay=1 must set replay.active').toBe(true);
    expect(first.replay?.frames, 'replay.frames is the recording length').toBeGreaterThan(0);

    await expect
      .poll(async () => (await page.evaluate(() => window.__redshift?.replay?.done)) === true, {
        timeout: REPLAY_TIMEOUT_MS,
        intervals: [250],
        message: 'replay never reported done',
      })
      .toBe(true);

    await pollState(page, (s) => s.state.status, 'status after replay').toBe('won');
    await pollState(page, (s) => s.state.wonAtStep, 'wonAtStep after replay').toBe(steps);
    // `done` came from the win (the recording's frames are not exhausted before it), and stays true.
    const end = await snapshot(page);
    expect(end?.replay?.done, 'replay stays done after the win').toBe(true);
    expect(end?.replay?.frames ?? 0, 'recording is at least as long as the winning step').toBeGreaterThanOrEqual(steps);
  });
}

test('keyboard is ignored while a replay runs (w0-02 opens with 226 steps of R)', async ({ page }) => {
  await page.goto('./?level=w0-02&replay=1&speed=1');
  const start = await waitForHook(page);
  expect(start.replay, 'replay mode not implemented').not.toBeNull();
  await page.keyboard.down('ArrowLeft');
  await pollState(page, (s) => s.state.step >= 30, 'replay reaches step 30').toBe(true);
  const now = await snapshot(page);
  await page.keyboard.up('ArrowLeft');
  // The recording holds R; a held ArrowLeft that reached the sim would cancel or reverse it.
  expect(now?.state.player.x ?? 0).toBeGreaterThan(start.state.player.x);
  expect(now?.state.player.vx ?? 0).toBeGreaterThan(0);
});
