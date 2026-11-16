/**
 * Tandem smoke (T-21 stubs, docs/qa/tandem-gate.md). Runs once `levels/w3-01.txt` and its recording exist and the
 * scene's hook state carries the twin (`state.twin`, tandem.md "New sim state"). Until then every test skips with a
 * message, so CI stays green and the skip shows what is missing.
 */
import { TEST_TIMEOUT_MS, expect, listSolutions, pollState, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w3-01';
const REPLAY_TIMEOUT_MS = 90_000;
const recording = listSolutions().find((s) => s.id === LEVEL);

interface Body {
  readonly x: number;
  readonly y: number;
  readonly home?: boolean | undefined;
}

/**
 * Changed checks of 2026-11-13 (requests.md, design-lead to qa-tester). None is observable through the hook yet,
 * so they are stubs that skip with the reason; the logic is covered by unit tests (docs/qa/test-plan.md 2.15).
 */
test.describe('changed checks (stubs)', () => {
  test('sticky-keys-tip check 11: the tip returns after resume, 12 s of unpaused time', () => {
    test.skip(true, 'needs the tip visible in the hook (B1 lands with T-20, scene lane); hand check until then');
  });
  test('adaptive-audio check 5 / PT-3 checks 1-2: fallThrough event, not a helper', () => {
    test.skip(true, 'needs state.events or an audio/cue field in the hook after the sim fallThrough event (Batch 5 line 2) and PT-3 mounting (Batch 6); unit-only until then');
  });
});

/** The two bodies as the hook shows them; `twin` is null when the level has no `&` or the hook lacks the field. */
async function bodies(page: import('@playwright/test').Page): Promise<{ levelId: string; runner: Body; twin: Body | null; won: boolean; wonAtStep: number | null } | null> {
  return page.evaluate(() => {
    const h = window.__redshift as unknown as
      | { levelId: string; state: { status: string; wonAtStep: number | null; player: Body; twin?: Body | null } }
      | undefined;
    if (!h) return null;
    const t = h.state.twin;
    const pick = (b: Body): Body => ({ x: b.x, y: b.y, home: b.home });
    return { levelId: h.levelId, runner: pick(h.state.player), twin: t ? pick(t) : null, won: h.state.status === 'won', wonAtStep: h.state.wonAtStep };
  });
}

test.describe('Tandem smoke on w3-01', () => {
  test.beforeEach(() => {
    test.skip(!recording, `levels/${LEVEL}.solution.txt does not exist yet (level-designer, Batch 5 line 4): Tandem smoke skipped`);
  });

  test('both bodies are present in the hook state', async ({ page }) => {
    await page.goto(`./?level=${LEVEL}`);
    await waitForHook(page);
    const b = await bodies(page);
    test.skip(b?.levelId !== LEVEL, `?level=${LEVEL} did not load ${LEVEL} (got ${b?.levelId ?? 'nothing'}): the loader does not know it yet`);
    test.skip(b?.twin == null, 'window.__redshift.state.twin is missing or null: the scene lane has not exposed the twin yet (T-20)');
    expect(b?.runner.home, 'runner starts not home').not.toBe(true);
    expect(b?.twin?.home, 'twin starts not home').not.toBe(true);
    // Two distinct bodies: the twin spawns at `&`, not on the runner.
    expect(b?.twin?.y !== b?.runner.y || b?.twin?.x !== b?.runner.x, 'twin and runner share a position').toBe(true);
  });

  test(`replay of ${LEVEL} wins with both bodies home`, async ({ page }) => {
    test.setTimeout(REPLAY_TIMEOUT_MS + 15_000);
    await page.goto(`./?level=${LEVEL}&replay=1&speed=60`);
    await waitForHook(page);
    const start = await bodies(page);
    test.skip(start?.levelId !== LEVEL, `?level=${LEVEL} did not load ${LEVEL}: the loader does not know it yet`);
    test.skip(start?.twin == null, 'window.__redshift.state.twin is missing or null: the scene lane has not exposed the twin yet (T-20)');

    await expect
      .poll(async () => (await page.evaluate(() => window.__redshift?.replay?.done)) === true, { timeout: REPLAY_TIMEOUT_MS, intervals: [250], message: 'replay never reported done' })
      .toBe(true);
    await pollState(page, (s) => s.state.status, 'status after replay').toBe('won');
    await pollState(page, (s) => s.state.wonAtStep, 'wonAtStep after replay').toBe(recording?.steps);
    const end = await bodies(page);
    expect(end?.runner.home, 'runner is home at the win').toBe(true);
    expect(end?.twin?.home, 'twin is home at the win').toBe(true);
  });
});
