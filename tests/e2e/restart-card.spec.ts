/**
 * The restart card in a sealed pocket (docs/design/features/restart-prompt.md checks 2-7; test-plan section 9.1, B7-14).
 * Read through `window.__redshift.restartCard` (null, or `{ visible: true, x, y, w, h }` in 480x270 screen px).
 *
 * Timing is judged on SIM STEPS, not seconds (design ruling 2026-11-19): the card must be absent while fewer than 60
 * consecutive steps have run with the runner's centre (x, feet - 0.75) in a pocket cell, and visible within 2 rendered
 * frames of the 60th. Every rendered frame is sampled inside the page (`startCardTracker`), so polling latency does not matter.
 *
 * Deviation from the playtest repro (check 4): the runner is put into the w3-02 pocket by a position-driven script
 * (hold Right, jump at the kerb, so it lands on the green bridge in gear 1 and falls through), not the wall-clock key
 * script, which cannot be reproduced on a machine whose frame rate differs. The end state is the same: a runner in the pocket.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import {
  POLL_TIMEOUT_MS,
  TEST_TIMEOUT_MS,
  cardEverSeen,
  expect,
  minStepSeen,
  nextFrames,
  pollScenes,
  pollState,
  seedSave,
  snapshot,
  startCardTracker,
  stopCardTracker,
  test,
  waitForHook,
  watchCardFromBoot,
  watchSteps,
  type CardRect,
  type CardSample,
} from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const EVIDENCE = fileURLToPath(new URL('../../docs/qa/evidence/', import.meta.url));
const LEVELS = fileURLToPath(new URL('../../levels/', import.meta.url));

interface Pocket {
  readonly c0: number;
  readonly c1: number;
  readonly r0: number;
  readonly r1: number;
}
const W302: Pocket = { c0: 10, c1: 25, r0: 7, r1: 9 };
const W303: Pocket = { c0: 25, c1: 34, r0: 7, r1: 9 };
/** The gear meter panel, screen px (`GEAR_METER_AREA`: 5, 5, 110 x 32). */
const HUD = { x: 5, y: 5, w: 110, h: 32 } as const;

const inPocket = (s: { x: number; y: number }, p: Pocket): boolean => {
  const col = Math.floor(s.x);
  const row = Math.floor(s.y - 0.75);
  return col >= p.c0 && col <= p.c1 && row >= p.r0 && row <= p.r1;
};

/** Sanity: the pocket rectangles above are the ones in the level files (rows 7-9 are `.` between `#` walls). */
function pocketMatchesFile(id: string, p: Pocket): boolean {
  const text = readFileSync(`${LEVELS}${id}.txt`, 'utf8').split(/\r?\n/);
  const grid = text.slice(text.indexOf('---') + 1);
  for (let r = p.r0; r <= p.r1; r += 1) {
    for (let c = p.c0; c <= p.c1; c += 1) if (grid[r]?.[c] !== '.') return false;
    if (grid[r]?.[p.c0 - 1] !== '#' && grid[r]?.[p.c0 - 1] !== 'G') return false;
  }
  return true;
}

/** The 60-step rule against a frame trace. Returns a list of violations (empty = pass) and the facts it used. */
function judgeTiming(samples: readonly CardSample[], p: Pocket): { problems: string[]; entryMin: number; entryMax: number; firstCardIndex: number; firstCardStep: number } {
  const problems: string[] = [];
  const i0 = samples.findIndex((s) => s.status === 'playing' && inPocket(s, p));
  if (i0 < 0) return { problems: ['the runner never had its centre in the pocket'], entryMin: -1, entryMax: -1, firstCardIndex: -1, firstCardStep: -1 };
  const entryMax = samples[i0]?.step ?? 0;
  const entryMin = (samples[i0 - 1]?.step ?? entryMax - 1) + 1;
  samples.forEach((s, i) => {
    // count of consecutive pocket steps at step S is S - e + 1 for an entry step e in [entryMin, entryMax]
    if (s.card !== null && !s.paused && s.step - entryMin + 1 < 60) problems.push(`frame ${i}: card at step ${s.step}, at most ${s.step - entryMin + 1} pocket steps (entry step >= ${entryMin})`);
  });
  const firstCardIndex = samples.findIndex((s) => s.card !== null);
  const firstCardStep = samples[firstCardIndex]?.step ?? -1;
  const sixtieth = samples.findIndex((s) => s.step >= entryMax + 59);
  if (firstCardIndex < 0) problems.push('the card never showed');
  else if (sixtieth >= 0 && firstCardIndex > sixtieth + 2) problems.push(`card first seen ${firstCardIndex - sixtieth} frames after the 60th pocket step (limit 2; entry step <= ${entryMax})`);
  return { problems, entryMin, entryMax, firstCardIndex, firstCardStep };
}

const cardNow = (page: Page): Promise<CardRect | null> => page.evaluate(() => (window.__redshift as unknown as { restartCard: CardRect | null }).restartCard);

/**
 * w3-02: hold Right, jump whenever grounded at x >= 6 until past the kerb (col 8): the runner lands on the green bridge in
 * gear 1, falls through and ends in the pocket. Releases Right on entering. Resolves to a message when it ends.
 */
async function runIntoW302Pocket(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const fire = (type: 'keydown' | 'keyup', code: string): void => {
          window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
        };
        const t0 = performance.now();
        let airborneSinceJump = true;
        let released = false;
        fire('keydown', 'ArrowRight');
        const tick = (): void => {
          const s = window.__redshift?.state as unknown as { step: number; player: { x: number; y: number; grounded: boolean }; twin: { x: number } | null } | undefined;
          if (s) {
            const p = s.player;
            // The twin keeps walking its lane while Right is held; let go once it is on its safe pad Q (cols 14-21), or it would fall and respawn both.
            if (!released && s.twin !== null && s.twin.x >= 15) {
              released = true;
              fire('keyup', 'ArrowRight');
            }
            if (p.y - 0.75 >= 7.2 && p.x >= 10 && p.x < 26 && released) {
              resolve(`in pocket at x ${p.x.toFixed(2)}, y ${p.y.toFixed(2)}, step ${s.step}, twin x ${s.twin?.x.toFixed(2)}`);
              return;
            }
            if (p.grounded && p.x >= 6 && p.x < 10.5 && airborneSinceJump && !released) {
              airborneSinceJump = false;
              fire('keydown', 'Space');
              fire('keyup', 'Space');
            }
            if (!p.grounded) airborneSinceJump = true;
          }
          if (performance.now() - t0 > 45_000) {
            fire('keyup', 'ArrowRight');
            resolve(`timeout; state ${JSON.stringify(s?.player)}`);
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

async function waitForCard(page: Page, message = 'restart card shows'): Promise<CardRect> {
  try {
    await expect.poll(async () => (await cardNow(page)) !== null, { message, timeout: POLL_TIMEOUT_MS }).toBe(true);
  } catch (e) {
    const st = await page.evaluate(() => JSON.stringify(window.__redshift?.state));
    throw new Error(`${String(e)}
last state: ${st}`);
  }
  const card = await cardNow(page);
  if (!card) throw new Error('card vanished');
  return card;
}

async function loadW302(page: Page): Promise<void> {
  await page.goto('./?level=w3-02');
  await waitForHook(page);
  await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded && s.state.step > 5, 'standing at the w3-02 spawn', 45_000).toBe(true);
}

test('the pocket rectangles in the QA read match the level files (restart-prompt acceptance 1, cross-check)', () => {
  expect(pocketMatchesFile('w3-02', W302), 'w3-02 rows 7-9, cols 10-25').toBe(true);
  expect(pocketMatchesFile('w3-03', W303), 'w3-03 rows 7-9, cols 25-34').toBe(true);
});

test.describe('w3-02 (checks 2, 3, 4)', () => {
  test('59 pocket steps no card, 60 shows it within 2 frames; 128x38, centred at the bottom, clear of the HUD; R clears it on the first frame', async ({ page }) => {
    await seedSave(page, {}); // defaults, with the Sticky Keys tip marked shown so the evidence screenshot is clean
    await loadW302(page);
    await startCardTracker(page);
    const how = await runIntoW302Pocket(page);
    expect(how, 'the runner ends in the pocket').toMatch(/^in pocket/);
    await waitForCard(page);
    await nextFrames(page, 4);
    const card = await cardNow(page);
    await page.screenshot({ path: `${EVIDENCE}b8-restart-card-2x.png` });
    const samples = await stopCardTracker(page);

    const j = judgeTiming(samples, W302);
    test.info().annotations.push({ type: 'observed', description: `${how}; entry step ${j.entryMin}..${j.entryMax}, card first seen at step ${j.firstCardStep} (frame ${j.firstCardIndex}); card ${JSON.stringify(card)}` });
    expect(j.problems, 'timing against the 60-step rule').toEqual([]);

    // check 3 on screen (2x, 2026-11-20): 128 x 38, integer px, centred (x + w/2 = 240), 8 px above the bottom edge (y + h = 262), clear of the HUD
    expect(card).not.toBeNull();
    const c = card as CardRect;
    expect([c.w, c.h], 'size').toEqual([128, 38]);
    expect(Number.isInteger(c.x) && Number.isInteger(c.y), 'integer px').toBe(true);
    expect(c.x + c.w / 2, 'centred').toBe(240);
    // Placement is decided when the card appears: 8 px above the bottom edge, or y = 42 when a body's sprite is in that spot (the twin, on its pad, can be).
    expect([262, 42 + c.h], `bottom (y + h = 262) or under the HUD (y = 42); observed y ${c.y}`).toContain(c.y + c.h);
    const overlapsHud = c.x < HUD.x + HUD.w && c.x + c.w > HUD.x && c.y < HUD.y + HUD.h && c.y + c.h > HUD.y;
    expect(overlapsHud, 'clear of the gear meter').toBe(false);

    // R: the card is gone on the first frame of the new run, and the step is near 0
    const before = (await snapshot(page))?.state.step ?? 0;
    await startCardTracker(page);
    await watchSteps(page);
    await page.keyboard.press('KeyR');
    await expect.poll(() => minStepSeen(page), { message: 'restarted (lowest step seen on any frame since R)', timeout: POLL_TIMEOUT_MS }).toBeLessThan(30);
    await nextFrames(page, 3);
    const after = await stopCardTracker(page);
    const firstNew = after.findIndex((s) => s.step < before);
    expect(firstNew, 'a frame of the new run was sampled').toBeGreaterThanOrEqual(0);
    expect(after[firstNew]?.card, 'no card on the first frame of the new run').toBeNull();
    expect(after[firstNew]?.step ?? 99, 'step back near 0 on that frame').toBeLessThanOrEqual(30);
    expect(after.slice(firstNew).every((s) => s.card === null), 'no card for the rest of the new run').toBe(true);
  });

  for (const [name, settings] of [
    ['reduced motion', { reducedMotion: true }],
    ['reduced effects', { reducedEffects: true }],
  ] as const) {
    test(`check 7: ${name} on, the card has the same rectangle and the same pixels as with defaults`, async ({ page, browser }) => {
      test.setTimeout(2 * TEST_TIMEOUT_MS);
      const shotOf = async (p: Page): Promise<{ card: CardRect; png: Buffer }> => {
        await loadW302(p);
        expect(await runIntoW302Pocket(p)).toMatch(/^in pocket/);
        const card = await waitForCard(p);
        await nextFrames(p, 4);
        // the 480x270 game is shown at 2x in the 960x540 embed viewport
        const png = await p.screenshot({ clip: { x: card.x * 2, y: card.y * 2, width: card.w * 2, height: card.h * 2 } });
        return { card, png };
      };
      const base = await shotOf(page);
      const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, baseURL: 'http://localhost:4173' });
      const other = await ctx.newPage();
      await seedSave(other, { settings });
      const alt = await shotOf(other);
      await ctx.close();
      // y may differ between two runs (bottom, or 42 when the twin's sprite is under the bottom spot); size and x may not.
      expect({ x: alt.card.x, w: alt.card.w, h: alt.card.h }, `${name}: same x and size`).toEqual({ x: base.card.x, w: base.card.w, h: base.card.h });
      test.info().annotations.push({ type: 'observed', description: `card y: default ${base.card.y}, ${name} ${alt.card.y}` });
      expect(alt.png.equals(base.png), `${name}: clipped pixels of the card rectangle are equal`).toBe(true);
    });
  }
});

test.describe('w3-03 (check 5)', () => {
  test('solution until the twin is home, hold Right to x >= 26, release: card after 60 pocket steps; pause and resume keeps it; R clears it', async ({ page }) => {
    await page.goto('./?level=w3-03');
    await waitForHook(page);
    await pollState(page, (s) => s.state.status === 'playing' && s.state.player.grounded && s.state.step > 5, 'standing at the w3-03 spawn', 45_000).toBe(true);
    await startCardTracker(page);
    // The solution's shape (levels/w3-03.solution.txt): stand, three shifts up to gear 4, sprint, jump at x ~12.7, hold Right.
    const how = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const fire = (type: 'keydown' | 'keyup', code: string): void => {
            window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
          };
          const t0 = performance.now();
          let phase: 'stand' | 'shift' | 'run' | 'tail' = 'stand';
          let jumped = false;
          let shiftDown = false;
          let twinHomeStep = -1;
          const tick = (): void => {
            const s = window.__redshift?.state as unknown as { step: number; status: string; player: { x: number; y: number; gear: number; grounded: boolean }; twin: { home?: boolean } | null } | undefined;
            if (s) {
              if (s.twin?.home === true && twinHomeStep < 0) twinHomeStep = s.step;
              if (phase === 'stand' && s.step >= 20) phase = 'shift';
              if (phase === 'shift') {
                if (shiftDown) {
                  fire('keyup', 'KeyE');
                  shiftDown = false;
                } else if (s.player.gear < 4) {
                  fire('keydown', 'KeyE');
                  shiftDown = true;
                } else {
                  phase = 'run';
                  fire('keydown', 'ArrowRight');
                }
              } else if (phase === 'run') {
                if (!jumped && s.player.x >= 12.2) {
                  jumped = true;
                  fire('keydown', 'Space');
                  fire('keyup', 'Space');
                }
                if (jumped && s.player.grounded && s.player.x > 14) phase = 'tail';
              }
              if (phase === 'tail' && s.player.x >= 26) {
                fire('keyup', 'ArrowRight');
                resolve(`released at x ${s.player.x.toFixed(2)}, step ${s.step}, twin home at step ${twinHomeStep}`);
                return;
              }
              if (s.status !== 'playing') {
                fire('keyup', 'ArrowRight');
                resolve(`run ended early: ${s.status} at x ${s.player.x.toFixed(2)}, step ${s.step}, phase ${phase}`);
                return;
              }
            }
            if (performance.now() - t0 > 60_000) {
              fire('keyup', 'ArrowRight');
              resolve(`timeout in phase ${phase}`);
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    test.info().annotations.push({ type: 'observed', description: how });
    expect(how, 'the scripted run reached the blue bridge').toMatch(/^released/);

    await waitForCard(page, 'card shows after the runner drops into the w3-03 pocket');
    const samples = await stopCardTracker(page);
    const j = judgeTiming(samples, W303);
    expect(j.problems, 'timing against the 60-step rule').toEqual([]);

    // pause and resume: still there, step frozen while paused
    const card = await cardNow(page);
    await page.keyboard.press('Escape');
    await pollState(page, (s) => s.paused, 'paused').toBe(true);
    const frozen = (await snapshot(page))?.state.step ?? 0;
    await nextFrames(page, 30);
    expect((await snapshot(page))?.state.step, 'sim frozen while paused').toBe(frozen);
    await page.keyboard.press('Escape');
    await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
    await nextFrames(page, 5);
    expect(await cardNow(page), 'card still showing after resume, same place').toEqual(card);

    await watchSteps(page);
    await page.keyboard.press('KeyR');
    await expect.poll(() => minStepSeen(page), { message: 'restarted (lowest step seen on any frame since R)', timeout: POLL_TIMEOUT_MS }).toBeLessThan(30);
    await nextFrames(page, 3);
    expect(await cardNow(page), 'R clears it').toBeNull();
  });
});

test.describe('no false card (check 6)', () => {
  test('w1-01: let go on a bridge (death, respawn): no card on any frame', async ({ page }) => {
    await watchCardFromBoot(page);
    await page.goto('./?level=w1-01');
    await waitForHook(page);
    await pollState(page, (s) => s.state.step > 5, 'running', 45_000).toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const fire = (type: 'keydown' | 'keyup'): void => void window.dispatchEvent(new KeyboardEvent(type, { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
          let died = false;
          fire('keydown');
          const tick = (): void => {
            const s = window.__redshift?.state;
            if (s && s.player.x > 5.2) fire('keyup');
            if (s && s.status !== 'playing') died = true;
            if (died && s && s.status === 'playing') resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    await nextFrames(page, 10);
    expect(await cardEverSeen(page), 'card never showed').toBe(false);
  });

  test('w3-01: both bodies fall (let go on the lanes, then sit): no card on any frame', async ({ page }) => {
    await watchCardFromBoot(page);
    await page.goto('./?level=w3-01');
    await waitForHook(page);
    await pollState(page, (s) => s.state.step > 5, 'running', 45_000).toBe(true);
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
    });
    await pollState(page, (s) => s.state.player.x > 6 || s.state.status !== 'playing', 'ran a few tiles', 45_000).toBe(true);
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
    });
    await pollState(page, (s) => s.state.step > 0, 'still stepping').toBe(true);
    const at = (await snapshot(page))?.state.step ?? 0;
    await pollState(page, (s) => s.state.step > at + 240 || s.state.step < at, 'four more seconds of sim (or a restart)', 45_000).toBe(true);
    expect(await cardEverSeen(page), 'card never showed').toBe(false);
  });

  test('w3-02 won by its solution (replay): no card on any frame', async ({ page }) => {
    await watchCardFromBoot(page);
    await page.goto('./?level=w3-02&replay=1&speed=4');
    await waitForHook(page);
    await expect.poll(() => page.evaluate(() => window.__redshift?.replay?.done === true), { message: 'replay done', timeout: 90_000 }).toBe(true);
    await pollState(page, (s) => s.state.status, 'won').toBe('won');
    expect(await cardEverSeen(page), 'card never showed').toBe(false);
  });
});

test('check 8 (replay with a losing recording) is a hand check: no shipped fixture, replay loads only levels/<id>.solution.txt', async ({ page }) => {
  test.info().annotations.push({ type: 'hand', description: 'restart-prompt check 8 stays a hand check (ruled 2026-11-19)' });
  await page.goto('./?level=w3-02&replay=1&speed=1');
  await waitForHook(page);
  await pollScenes(page, ['Game']);
});
