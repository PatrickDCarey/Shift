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
  /** Tiles/s, positive = falling. */
  readonly vy: number;
  readonly gear: number;
  readonly band: number;
  readonly grounded: boolean;
  /** Shift-buffer fields the HUD's pending-shift bracket reads (hud-gear-meter.md). */
  readonly shiftBufferSteps: number;
  readonly shiftBufferNet: number;
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

/** The HUD gear meter model (`gearMeterModel` in src/ui/gearMeter.ts): litBand 0 white .. 4 red, selectedGear 1..4. */
export interface HookMeter {
  readonly litBand: number;
  readonly selectedGear: number;
  readonly needle: number;
  readonly dragFill: number | null;
  readonly pendingGear: number | null;
}

export interface RedshiftHook {
  readonly levelId: string;
  readonly state: HookState;
  readonly replay?: HookReplay;
  /** Read-only, QA hook builds only. */
  readonly meter?: HookMeter;
  /** Always null since batch 6 (the win banner is gone; the Results scene replaced it). */
  readonly banner?: string | null;
  /** True from the moment Pause opens (Esc, P or focus loss) until resume or restart, also while Controls is open over it. */
  readonly paused?: boolean;
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
  readonly meter: HookMeter | null;
  readonly banner: string | null;
  readonly paused: boolean;
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
        vy: s.player.vy,
        gear: s.player.gear,
        band: s.player.band,
        grounded: s.player.grounded,
        shiftBufferSteps: s.player.shiftBufferSteps,
        shiftBufferNet: s.player.shiftBufferNet,
      },
    },
    replay: r ? { active: r.active, done: r.done, frames: r.frames } : null,
    meter: h.meter
      ? { litBand: h.meter.litBand, selectedGear: h.meter.selectedGear, needle: h.meter.needle, dragFill: h.meter.dragFill, pendingGear: h.meter.pendingGear }
      : null,
    banner: h.banner ?? null,
    paused: h.paused === true,
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

/** The itch.io embed size. `playwright.config.ts` sets it on the chromium project after the device spread, so specs need no `test.use`; `embed.spec.ts` asserts `page.viewportSize()` equals this. */
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
export const test = base.extend<{ errors: string[]; gameProbe: void }>({
  // Test-side only: keeps a handle on the Phaser.Game so specs can ask which scenes are active and read a menu
  // scene's model. The product exposes nothing for menus (the QA hook is the game scene's), and `Phaser.GAMES`
  // does not exist in 3.90. The setter wraps `Phaser.Game` the moment the bundle assigns `window.Phaser`.
  gameProbe: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        let phaser: { Game: new (config: unknown) => object } | undefined;
        Object.defineProperty(window, 'Phaser', {
          configurable: true,
          get: () => phaser,
          set: (p: { Game: new (config: unknown) => object }) => {
            phaser = p;
            const Original = p.Game;
            p.Game = class extends Original {
              constructor(config: unknown) {
                super(config);
                (window as unknown as { __game: object }).__game = this;
              }
            };
          },
        });
      });
      await use();
    },
    { auto: true },
  ],
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
 * Hold ArrowRight (synthetic key events on `window`, where the game listens) and let go inside the very frame
 * in which the player is first seen past `x`, or when the run is over (death) or after 40 s. A release decided
 * by a Playwright poll arrives a few hundred ms late, which on a loaded machine is a tile or more of extra
 * walking at gear 1; in the page it costs at most one frame.
 */
export async function holdRightUntilPastX(page: Page, x: number): Promise<void> {
  await page.evaluate(
    (limit) =>
      new Promise<void>((resolve) => {
        const fire = (type: 'keydown' | 'keyup'): void => {
          window.dispatchEvent(new KeyboardEvent(type, { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
        };
        const t0 = performance.now();
        fire('keydown');
        const tick = (): void => {
          const s = window.__redshift?.state;
          if ((s && (s.player.x > limit || s.status !== 'playing')) || performance.now() - t0 > 40_000) {
            fire('keyup');
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    x,
  );
}

/**
 * w0-02 only: from the spawn, hold ArrowRight (gear 1) onto the blue bridge (columns 3-10), let go once
 * past x = 9 and drop through it (letting go of blue: grace runs out, then you fall), landing on the
 * safe floor four tiles down at row 12. The bridge sits 6 tiles under a safe ceiling and the player is
 * white while standing, so there are 6 open tiles overhead: room for a full 3-tile jump. (A jump at the spawn pad is a full jump too, since w0-02 v2;
 * `m2-additions.spec.ts` covers it. The pit is kept because the walk-in tests depend on it.) Resolves to the floor y, standing there.
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
    await holdRightUntilPastX(page, 9);
    await pollState(page, (s) => s.state.player.x > 9 || gone(s), 'walked onto the blue bridge', BOOT_TIMEOUT_MS).toBe(true);
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

/** When {@link armAirPress} presses: `afterSteps` sim steps after the first airborne sample, or once falling at `minVy` tiles/s. */
export type AirTrigger = { readonly afterSteps: number } | { readonly minVy: number };

/** What an armed air press did: the sim step it was dispatched (or the landing was seen) at, and whether it was dispatched. */
export interface AirPressResult {
  readonly step: number;
  readonly dispatched: boolean;
}

/**
 * Install the in-page watcher, then (after this resolves) press the jump key and await `result()`. When the
 * trigger fires while the player is airborne, a synthetic keydown+keyup of `code` is dispatched on `window`
 * (the game listens there), inside the same animation frame, so the press lands on that flight step whatever the
 * polling latency. Install it BEFORE pressing the jump key: the watcher must see the player on the ground first.
 *
 * `minVy` is the robust trigger for "close to landing": a standing jump leaves at vy -15 and gains 0.625 per step
 * (g 37.5, 60 Hz), so vy >= 11.5 means flight step 43 or later of 48, however late the first airborne sample was.
 * With headless frames of ~3 steps, a frame can still step from before the trigger straight to touchdown: then
 * nothing is pressed and `dispatched` is false (the caller jumps again). The callers prove the timing from samples.
 */
export async function armAirPress(page: Page, code: string, trigger: AirTrigger = { afterSteps: 0 }): Promise<{ readonly result: () => Promise<AirPressResult> }> {
  await page.evaluate(
    ([c, after, minVy]) => {
      const w = window as unknown as { __airPress: Promise<{ step: number; dispatched: boolean }> };
      w.__airPress = new Promise((resolve) => {
        const t0 = performance.now();
        let firstAir: number | null = null;
        const tick = (): void => {
          const s = window.__redshift?.state;
          if (s && !s.player.grounded) {
            firstAir ??= s.step;
            if ((after !== null && s.step - firstAir >= after) || (minVy !== null && s.player.vy >= minVy)) {
              window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c, bubbles: true }));
              window.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c, bubbles: true }));
              resolve({ step: s.step, dispatched: true });
              return;
            }
          } else if (s && firstAir !== null) {
            resolve({ step: s.step, dispatched: false }); // touched down before the trigger fired in a sampled frame
            return;
          }
          if (performance.now() - t0 > 10_000) {
            resolve({ step: s?.step ?? -1, dispatched: false }); // never left the ground
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    [code, 'afterSteps' in trigger ? trigger.afterSteps : null, 'minVy' in trigger ? trigger.minVy : null] as const,
  );
  return { result: () => page.evaluate(() => (window as unknown as { __airPress: Promise<{ step: number; dispatched: boolean }> }).__airPress) };
}

/** One per-frame sample recorded in the page by {@link startTracker}. */
export interface TrackSample {
  readonly step: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly gear: number;
  readonly paused: boolean;
  readonly grounded: boolean;
  readonly shiftBufferSteps: number;
  readonly shiftBufferNet: number;
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
          w.__track.push({
            step: s.step,
            x: s.player.x,
            y: s.player.y,
            vx: s.player.vx,
            gear: s.player.gear,
            paused: window.__redshift?.paused === true,
            grounded: s.player.grounded,
            shiftBufferSteps: s.player.shiftBufferSteps,
            shiftBufferNet: s.player.shiftBufferNet,
          });
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

/** Result of {@link jumpAndPressInAir}: the dispatch step and every per-frame sample of the jump. */
export interface AirPressRun {
  /** Sim step at which the key was dispatched (the player was airborne then; the press is applied from step + 1). */
  readonly pressStep: number;
  readonly track: readonly TrackSample[];
  /** Highest step sampled while airborne: touchdown is at least one step later. */
  readonly lastAirStep: number;
  /** First step sampled grounded after the press: touchdown happened at or before it. */
  readonly landedByStep: number;
}

/**
 * Jump from where the player stands (call it in the open pit, `walkIntoOpenPit`), press `code` in the air
 * at `trigger` (see {@link armAirPress}), and wait until the player is back on the ground. Everything is judged
 * from in-page samples, not Playwright round trips. Resolves to null when the frame rate was too low to
 * dispatch the press while still airborne (nothing was pressed): jump again.
 */
export async function jumpAndPressInAir(page: Page, code: string, trigger: AirTrigger): Promise<AirPressRun | null> {
  const s0 = (await snapshot(page))?.state.step ?? 0;
  await startTracker(page);
  const armed = await armAirPress(page, code, trigger);
  await page.keyboard.press('Space');
  const { step: pressStep, dispatched } = await armed.result();
  await pollState(page, (s) => s.state.step >= s0 + 70 && s.state.player.grounded, 'landed').toBe(true);
  const track = await stopTracker(page);
  if (!dispatched) return null;
  const lastAirStep = Math.max(...track.filter((t) => !t.grounded).map((t) => t.step));
  const landed = track.find((t) => t.grounded && t.step > pressStep);
  if (!landed) throw new Error('jumpAndPressInAir: no grounded sample after the press');
  return { pressStep, track, lastAirStep, landedByStep: landed.step };
}

// ---------------------------------------------------------------------------------------------------------------------
// Menu scenes (batch 6). Read through the test-side Phaser handle installed by the `gameProbe` fixture above.
// ---------------------------------------------------------------------------------------------------------------------

/** Scene keys as in `src/scenes/keys.ts`. */
export type SceneName = 'Boot' | 'Game' | 'Title' | 'LevelSelect' | 'Pause' | 'Results' | 'Controls';

interface ProbeScene {
  readonly sys: { readonly settings: { readonly key: string }; isActive(): boolean };
  readonly model?: unknown;
  readonly canvas?: unknown;
}
interface ProbeGame {
  readonly scene: { readonly scenes: readonly ProbeScene[] };
}

/** Keys of every active scene, in registration order. */
export function activeScenes(target: Page | Frame): Promise<string[]> {
  return target.evaluate(() => {
    const g = (window as unknown as { __game?: ProbeGame }).__game;
    return g ? g.scene.scenes.filter((s) => s.sys.isActive()).map((s) => s.sys.settings.key) : [];
  });
}

/** Poll until exactly this set of scenes is active (order-insensitive). */
export function pollScenes(target: Page | Frame, expected: readonly SceneName[], message?: string, timeout = POLL_TIMEOUT_MS) {
  const want = [...expected].sort().join(',');
  return expect.poll(async () => (await activeScenes(target)).sort().join(','), { message: message ?? `active scenes ${want}`, timeout }).toBe(want);
}

/** What a menu scene has focused: a list item id (Title, Pause, Results, Controls) or a level id (LevelSelect). Null when the scene has no model yet. */
export function menuFocus(target: Page | Frame, scene: SceneName): Promise<string | null> {
  return target.evaluate((key) => {
    const g = (window as unknown as { __game?: ProbeGame }).__game;
    const m = g?.scene.scenes.find((s) => s.sys.settings.key === key)?.model as
      | { list?: { items: { id: string }[]; focus: number }; rows?: { cells: { id: string }[] }[]; focus?: { row: number; col: number } }
      | undefined;
    if (!m) return null;
    if (m.list) return m.list.items[m.list.focus]?.id ?? null;
    if (m.rows && m.focus) return m.rows[m.focus.row]?.cells[m.focus.col]?.id ?? null;
    return null;
  }, scene);
}

/** A menu scene's model as plain data, or null. */
export function menuModel<T = unknown>(target: Page | Frame, scene: SceneName): Promise<T | null> {
  return target.evaluate((key) => {
    const g = (window as unknown as { __game?: ProbeGame }).__game;
    const m = g?.scene.scenes.find((s) => s.sys.settings.key === key)?.model;
    return m === undefined ? null : (JSON.parse(JSON.stringify(m)) as unknown);
  }, scene) as Promise<T | null>;
}

/** True once the Results scene has drawn its panel (the 0.6 s beat, during which every key is ignored, is over). */
export function resultsPanelUp(target: Page | Frame): Promise<boolean> {
  return target.evaluate(() => {
    const g = (window as unknown as { __game?: ProbeGame }).__game;
    const r = g?.scene.scenes.find((s) => s.sys.settings.key === 'Results');
    return !!r && r.sys.isActive() && r.canvas !== null && r.canvas !== undefined;
  });
}

/** Load a plain URL (no `?level=`) and wait for the title model. */
export async function gotoTitle(page: Page, search = ''): Promise<void> {
  await page.goto(`./${search}`);
  await pollScenes(page, ['Title'], 'title screen after a plain load', BOOT_TIMEOUT_MS);
  await expect.poll(async () => (await menuFocus(page, 'Title')) !== null, { message: 'title model built', timeout: POLL_TIMEOUT_MS }).toBe(true);
}

/** Completed levels and best steps from the save in localStorage (`redshift.save`), null without one. */
export function readSaveProgress(target: Page | Frame): Promise<{ completedLevels: string[]; bestSteps: Record<string, number> } | null> {
  return target.evaluate(() => {
    const raw = window.localStorage.getItem('redshift.save');
    if (raw === null) return null;
    const p = (JSON.parse(raw) as { progress?: { completedLevels?: string[]; bestSteps?: Record<string, number> } }).progress;
    return { completedLevels: p?.completedLevels ?? [], bestSteps: p?.bestSteps ?? {} };
  });
}

/**
 * Arm a live win of w1-01: hold ArrowRight the whole way (gear 1 is blue, walking holds the blue bridges, both pads
 * are safe). The key goes down inside the page, in the first animation frame in which the run is playing and at least
 * `standSteps` steps old, so the win step is 434 + standSteps (within one frame's steps) however slow the polling is.
 * Not a replay: Results opens. Resolves to the win step.
 */
export async function armLiveWin(page: Page, standSteps = 0): Promise<void> {
  await page.evaluate((stand) => {
    const fire = (type: 'keydown' | 'keyup'): void => {
      window.dispatchEvent(new KeyboardEvent(type, { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
    };
    let down = false;
    const tick = (): void => {
      const st = window.__redshift?.state;
      if (!down && st && st.status === 'playing' && st.wonAtStep === null && st.step >= stand) {
        down = true;
        fire('keydown');
      } else if (down && st && (st.status === 'won' || st.status === 'dead')) {
        fire('keyup');
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, standSteps);
}

/** Wait for the win armed by {@link armLiveWin}; resolves to the win step. */
export async function finishLiveWin(page: Page): Promise<number> {
  await pollState(page, (s) => s.state.status, 'won (or died)', 90_000).toBe('won');
  const won = (await snapshot(page))?.state.wonAtStep;
  if (won === null || won === undefined) throw new Error('won without wonAtStep');
  return won;
}

/** {@link armLiveWin} then {@link finishLiveWin}. The watcher starts when called, so arm BEFORE a restart if the stand time must be exact (win.spec does). */
export async function winLiveHoldingRight(page: Page, standSteps = 0): Promise<number> {
  await armLiveWin(page, standSteps);
  return finishLiveWin(page);
}

/** `levels/<id>.txt` ids for worlds 1-9, sorted: the levels level select lists. */
export function shippedLevelIds(): readonly string[] {
  return readdirSync(LEVELS_DIR)
    .filter((f) => /^w[1-9]-\d{2}\.txt$/.test(f))
    .map((f) => f.slice(0, -'.txt'.length))
    .sort();
}

/** Display-list rows of the Game scene (everything Phaser draws there), for hint, cue and effect checks. */
export interface DrawnObject {
  readonly type: string;
  readonly depth: number;
  readonly visible: boolean;
  readonly frame: string | null;
  readonly text: string | null;
  readonly x: number;
  readonly y: number;
}

/** Everything on the Game scene's display list; null when the scene is not up. */
export function gameObjects(target: Page | Frame): Promise<DrawnObject[] | null> {
  return target.evaluate(() => {
    const g = (window as unknown as { __game?: { scene: { getScene(k: string): unknown } } }).__game;
    const s = g?.scene.getScene('Game') as { children?: { list: { type: string; depth: number; visible: boolean; x: number; y: number; frame?: { name: string }; text?: string }[] } } | undefined;
    if (!s?.children) return null;
    return s.children.list.map((o) => ({ type: o.type, depth: o.depth, visible: o.visible, frame: o.frame?.name ?? null, text: o.type === 'BitmapText' ? (o.text ?? '') : null, x: o.x, y: o.y }));
  });
}

export interface SeedSave {
  readonly settings?: Readonly<Record<string, boolean | number>>;
  readonly completed?: readonly string[];
  readonly bestSteps?: Readonly<Record<string, number>>;
}

/**
 * Pre-seed `redshift.save` before the first script runs (only when no save exists yet, so a reload keeps what the
 * game wrote). The Sticky Keys tip is marked shown so it never covers a check.
 */
export async function seedSave(page: Page, seed: SeedSave): Promise<void> {
  const save = {
    version: 1,
    settings: { musicVolume: 0.7, sfxVolume: 1, reducedEffects: false, reducedMotion: false, muted: false, stickyKeysTipShown: true, ...seed.settings },
    progress: { completedLevels: seed.completed ?? [], bestSteps: seed.bestSteps ?? {} },
  };
  await page.addInitScript((json: string) => {
    try {
      if (window.localStorage.getItem('redshift.save') === null) window.localStorage.setItem('redshift.save', json);
    } catch {
      /* storage blocked: the game falls back to memory */
    }
  }, JSON.stringify(save));
}

/** Resolve after `n` rendered frames, counted in the page. Menu scenes turn the keys of one frame into one intent, so give each press its own frame. */
export function nextFrames(target: Page | Frame, n = 3): Promise<void> {
  return target.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const tick = (): void => {
          i += 1;
          if (i >= count) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    n,
  );
}

/**
 * Remember, in the page, the lowest sim step seen on any animation frame from now on. A restart shows as a low step for
 * only a frame or a few, which a Playwright poll (whose interval backs off to 1 s) can miss entirely; this cannot.
 * Survives scene restarts (it lives on `window`, not in a scene).
 */
export function watchSteps(page: Page): Promise<void> {
  return page.evaluate(() => {
    const w = window as unknown as { __minStep: number; __watchingSteps?: boolean };
    w.__minStep = Number.POSITIVE_INFINITY;
    if (w.__watchingSteps) return;
    w.__watchingSteps = true;
    const tick = (): void => {
      const st = window.__redshift?.state;
      if (st) w.__minStep = Math.min(w.__minStep, st.step);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Lowest sim step seen since {@link watchSteps}. */
export function minStepSeen(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __minStep: number }).__minStep);
}

/** Press a key, then let three frames pass: menu scenes turn the keys of one frame into one intent, so back-to-back taps would merge. */
export async function tap(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
  await nextFrames(page, 3);
}
