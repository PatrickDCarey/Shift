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

/** Wait until the scene has installed `window.__redshift`, then return its first snapshot. */
/** Generous: shared CI and busy dev machines can run the game at a few frames per second. */
export const POLL_TIMEOUT_MS = 20_000;

/** Per-test timeout for spec files (each spec calls `test.describe.configure`). */
export const TEST_TIMEOUT_MS = 90_000;

export async function waitForHook(target: Page | Frame): Promise<HookSnapshot> {
  await expect.poll(async () => (await snapshot(target)) !== null, { message: 'window.__redshift never appeared', timeout: POLL_TIMEOUT_MS }).toBe(true);
  const snap = await snapshot(target);
  if (!snap) throw new Error('window.__redshift disappeared');
  return snap;
}

/** Poll one numeric/string field of the hook state. */
export function pollState<T>(target: Page | Frame, pick: (s: HookSnapshot) => T, message?: string) {
  return expect.poll(
    async () => {
      const s = await snapshot(target);
      return s ? pick(s) : null;
    },
    { message, timeout: POLL_TIMEOUT_MS },
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
