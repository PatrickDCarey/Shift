/// <reference lib="dom" />
/**
 * Shared Playwright helpers for the Redshift e2e suite.
 *
 * Rules every test here follows (low headless frame rates make wall-clock
 * sleeps flaky): never sleep, always gate on `window.__redshift` state via
 * `expect.poll` / `waitForFunction`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test as base, type Frame, type Page } from '@playwright/test';

/** The slice of the sim state the e2e tests read (see src/core/contracts/state.ts). */
export interface HookPlayer {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly gear: number;
  readonly band: number;
  readonly grounded: boolean;
}

export interface HookState {
  readonly step: number;
  readonly status: 'playing' | 'dead' | 'restarting' | 'won';
  readonly wonAtStep: number | null;
  readonly player: HookPlayer;
}

/** Replay-mode block of the hook (contract from the scene lane; absent until it lands). */
export interface HookReplay {
  readonly active: boolean;
  readonly done: boolean;
  readonly frames: number;
}

export interface RedshiftHook {
  readonly levelId: string;
  readonly state: HookState;
  readonly replay?: HookReplay;
}

declare global {
  interface Window {
    __redshift?: RedshiftHook;
  }
}

/** Plain snapshot of the hook, or null while the scene is not up yet. */
export interface HookSnapshot {
  readonly levelId: string;
  readonly state: HookState;
  readonly replay: HookReplay | null;
}

function readHook(): HookSnapshot | null {
  const h = window.__redshift;
  if (!h) return null;
  const s = h.state;
  const r = h.replay;
  return {
    levelId: h.levelId,
    state: {
      step: s.step,
      status: s.status,
      wonAtStep: s.wonAtStep,
      player: {
        x: s.player.x,
        y: s.player.y,
        vx: s.player.vx,
        gear: s.player.gear,
        band: s.player.band,
        grounded: s.player.grounded,
      },
    },
    replay: r ? { active: r.active, done: r.done, frames: r.frames } : null,
  };
}

/** Current hook snapshot (null if the game has not created the scene yet). */
export function snapshot(target: Page | Frame): Promise<HookSnapshot | null> {
  return target.evaluate(readHook);
}

/** Generous: shared CI and busy dev machines can run the game at a few frames per second. */
export const POLL_TIMEOUT_MS = 20_000;

/** First boot (page load, Phaser, WebGL) is slower than any later poll, especially with parallel workers. */
export const BOOT_TIMEOUT_MS = 45_000;

/** Per-test timeout for spec files (each spec calls `test.describe.configure`). */
export const TEST_TIMEOUT_MS = 120_000;

/** The itch.io embed size. Every spec calls `test.use({ viewport: EMBED_VIEWPORT })`: the Chromium device preset overrides a config-level viewport. */
export const EMBED_VIEWPORT = { width: 960, height: 540 } as const;

/** Wait until the scene has installed `window.__redshift`, then return its first snapshot. */
export async function waitForHook(target: Page | Frame): Promise<HookSnapshot> {
  await expect.poll(async () => (await snapshot(target)) !== null, { message: 'window.__redshift never appeared', timeout: BOOT_TIMEOUT_MS }).toBe(true);
  const snap = await snapshot(target);
  if (!snap) throw new Error('window.__redshift disappeared');
  return snap;
}

/** Poll one numeric/string field of the hook state. */
export function pollState<T>(target: Page | Frame, pick: (s: HookSnapshot) => T, message?: string, timeout = POLL_TIMEOUT_MS) {
  return expect.poll(
    async () => {
      const s = await snapshot(target);
      return s ? pick(s) : null;
    },
    { message, timeout },
  );
}

/**
 * Test fixture that fails any test which produced a page error or a console
 * error (CLAUDE.md: no console errors). `errors` is also readable by the test.
 */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });
      await use(errors);
      expect(errors, 'page and console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

const LEVELS_DIR = fileURLToPath(new URL('../../levels/', import.meta.url));

export interface SolutionFile {
  readonly id: string;
  /** `steps:` header: the step the recording wins on. */
  readonly steps: number;
}

/** Every `levels/<id>.solution.txt`, with the id from the file stem and `steps` from the header (CRLF tolerant). */
export function listSolutions(): readonly SolutionFile[] {
  return readdirSync(LEVELS_DIR)
    .filter((f) => f.endsWith('.solution.txt'))
    .sort()
    .map((f) => {
      const text = readFileSync(`${LEVELS_DIR}${f}`, 'utf8');
      const m = /^steps:[ \t]*(\d+)[ \t]*\r?$/m.exec(text);
      if (!m?.[1]) throw new Error(`${f}: no "steps:" header`);
      return { id: f.slice(0, -'.solution.txt'.length), steps: Number(m[1]) };
    });
}

/**
 * w0-02 only: from the spawn, hold ArrowRight (gear 1) onto the blue bridge (columns 3-10), let go once
 * past x = 9 and drop through it (letting go of blue: grace runs out, then you fall), landing on the
 * safe floor four tiles down at row 12. The bridge sits 6 tiles under a safe ceiling and the player is
 * white while standing, so there are 6 open tiles overhead: room for a full 3-tile jump. (The spawn
 * itself has only 0.5 tiles of headroom.) Resolves to the floor y, standing there.
 *
 * The release is reactive, so on a loaded machine (a few frames per second) input lag can carry the
 * player past the drop zone: off the safe floor (death) or onto the 1.5-tile ceiling at column 13. Both
 * are detected and the walk is retried from the respawn (up to 6 times).
 */
export async function walkIntoOpenPit(page: Page): Promise<number> {
  // A death shows as status !== 'playing' for only ~0.4 s, which a poll can miss; being back at the spawn also counts.
  const died = (s: HookSnapshot): boolean => s.state.status !== 'playing' || (s.state.player.x < 2 && s.state.step > 20);
  const inRange = (s: HookSnapshot, max: number): boolean => s.state.player.x >= 8.5 && s.state.player.x <= max;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await pollState(page, (s) => s.state.status === 'playing' && s.state.player.x < 2 && s.state.player.grounded, 'at the spawn', BOOT_TIMEOUT_MS).toBe(true);
    const startStep = (await snapshot(page))?.state.step ?? 0;
    const gone = (s: HookSnapshot): boolean => s.state.status !== 'playing' || (s.state.player.x < 2 && s.state.step > startStep + 20);
    await page.keyboard.down('ArrowRight');
    await pollState(page, (s) => s.state.player.x > 9 || gone(s), 'walked onto the blue bridge', BOOT_TIMEOUT_MS).toBe(true);
    await page.keyboard.up('ArrowRight');
    await pollState(
      page,
      (s) =>
        gone(s) ||
        (s.state.player.y > 11.5 && s.state.player.grounded && s.state.player.vx === 0) ||
        // died and respawned while the key was still down, so the release found the player short of the drop zone
        (s.state.player.x < 8 && s.state.player.grounded && s.state.player.vx === 0) ||
        // came to rest on top of the divider wall at column 7 (y = 9) instead of dropping into the pit
        (s.state.player.y === 9 && s.state.player.grounded && s.state.player.vx === 0),
      'dropped through the bridge (or died)',
      BOOT_TIMEOUT_MS,
    ).toBe(true).catch(async (e: unknown) => {
      throw new Error(`${String(e)}
last state: ${JSON.stringify((await snapshot(page))?.state)}`);
    });
    let at = await snapshot(page);
    if (at && !died(at) && at.state.player.x > 12.2) {
      // Landed to the right of the safe stretch: walk back left. Overshoot is harmless (8.5..12.55 all work).
      await page.keyboard.down('ArrowLeft');
      await pollState(page, (s) => s.state.player.x < 11 || gone(s), 'walked back left', BOOT_TIMEOUT_MS).toBe(true);
      await page.keyboard.up('ArrowLeft');
      await pollState(page, (s) => gone(s) || s.state.player.vx === 0, 'standing still again', BOOT_TIMEOUT_MS).toBe(true);
      at = await snapshot(page);
    }
    if (at && !gone(at) && at.state.player.grounded && at.state.player.y > 11.5 && inRange(at, 12.55)) return at.state.player.y;
    await page.keyboard.press('KeyR'); // died or overshot the safe pad: start over
  }
  throw new Error('walkIntoOpenPit: could not reach the open pit in 6 attempts');
}

/**
 * Start in-page, then press the key. Resolves with the sim step at which the player was first seen in the
 * air and a synthetic keydown+keyup of `code` was dispatched on `window` (the game listens there), so the
 * press lands in the first airborne frame whatever the polling latency. Arm it BEFORE pressing the jump key.
 */
export function armAirPress(page: Page, code: string): Promise<{ readonly step: number }> {
  return page.evaluate(
    (c) =>
      new Promise<{ step: number }>((resolve, reject) => {
        const t0 = performance.now();
        const tick = (): void => {
          const s = window.__redshift?.state;
          if (s && !s.player.grounded) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c, bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c, bubbles: true }));
            resolve({ step: s.step });
            return;
          }
          if (performance.now() - t0 > 20_000) {
            reject(new Error('armAirPress: never airborne'));
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    code,
  );
}

/** One per-frame sample recorded in the page by {@link startTracker}. */
export interface TrackSample {
  readonly step: number;
  readonly y: number;
  readonly gear: number;
  readonly grounded: boolean;
}

/** Record (step, y, gear, grounded) on every animation frame into `window.__track`, so a test sees the whole jump however slow the frame rate. */
export function startTracker(page: Page): Promise<void> {
  return page.evaluate(() => {
    const w = window as unknown as { __track: TrackSample[]; __trackOn: boolean };
    w.__track = [];
    w.__trackOn = true;
    const tick = (): void => {
      const s = window.__redshift?.state;
      if (s) {
        const last = w.__track[w.__track.length - 1];
        if (!last || last.step !== s.step) {
          w.__track.push({ step: s.step, y: s.player.y, gear: s.player.gear, grounded: s.player.grounded });
        }
      }
      if (w.__trackOn) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Stop the tracker and return everything it recorded. */
export function stopTracker(page: Page): Promise<readonly TrackSample[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __track: TrackSample[]; __trackOn: boolean };
    w.__trackOn = false;
    return w.__track;
  });
}
