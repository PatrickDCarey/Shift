/**
 * The settings screen, keys only (docs/design/features/settings.md checks 1-6, 8; test-plan 9.4, B7-14).
 * Rows SOUND, REDUCED MOTION, REDUCED EFFECTS, BACK. No mouse calls anywhere in this file.
 * Known deviation, not a failure (tech-lead wave 2 W7): changes made from the pause menu apply at the next level start.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, activeScenes, expect, gameObjects, gotoTitle, menuFocus, menuModel, nextFrames, pollScenes, pollState, seedSave, tap, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

interface SettingsView {
  readonly list: { readonly focus: number };
  readonly values: { readonly sound: boolean; readonly motion: boolean; readonly effects: boolean };
}
type SavedSettings = Record<string, unknown>;

/** Count writes to the save key from the first script on. */
async function countSaveWrites(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __saveWrites: number };
    w.__saveWrites = 0;
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string): void {
      if (k === 'redshift.save') w.__saveWrites += 1;
      orig.call(this, k, v);
    };
  });
}
const writes = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __saveWrites: number }).__saveWrites);
const saved = (page: Page): Promise<SavedSettings | null> =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem('redshift.save');
    return raw === null ? null : (JSON.parse(raw) as { settings: SavedSettings }).settings;
  });

async function focusTitleItem(page: Page, id: string): Promise<void> {
  for (let i = 0; i < 6 && (await menuFocus(page, 'Title')) !== id; i += 1) await tap(page, 'ArrowDown');
  expect(await menuFocus(page, 'Title'), `title focus on ${id}`).toBe(id);
}

async function openSettings(page: Page): Promise<void> {
  await focusTitleItem(page, 'settings');
  await tap(page, 'Enter');
  await pollScenes(page, ['Settings']);
  await expect.poll(() => menuFocus(page, 'Settings'), { message: 'settings model built' }).toBe('sound');
}

const view = (page: Page): Promise<SettingsView | null> => menuModel<SettingsView>(page, 'Settings');

test('S-8 reachable from the title: title item SETTINGS is the 4th, Esc returns with SETTINGS focused (S-4, title half)', async ({ page }) => {
  await gotoTitle(page);
  const items = await page.evaluate(() => {
    const g = (window as unknown as { __game: { scene: { getScene(k: string): { model: { list: { items: { id: string }[] } } } } } }).__game;
    return g.scene.getScene('Title').model.list.items.map((i) => i.id);
  });
  expect(items[3], '4th item').toBe('settings');
  await openSettings(page);
  await tap(page, 'Escape');
  await pollScenes(page, ['Title']);
  await expect.poll(() => menuFocus(page, 'Title')).toBe('settings');
});

test('S-1 SOUND OFF is saved as muted, and is still off after a reload', async ({ page }) => {
  await gotoTitle(page);
  expect((await saved(page))?.['muted'] ?? false, 'fresh: not muted').toBe(false);
  await openSettings(page);
  expect((await view(page))?.values.sound, 'SOUND starts ON').toBe(true);
  await tap(page, 'Enter');
  await expect.poll(async () => (await saved(page))?.['muted']).toBe(true);
  await page.reload();
  await pollScenes(page, ['Title'], 'title after reload', 45_000);
  await expect.poll(async () => (await menuFocus(page, 'Title')) !== null).toBe(true);
  expect((await saved(page))?.['muted'], 'still muted after reload').toBe(true);
  await openSettings(page);
  expect((await view(page))?.values.sound, 'row reads OFF after reload').toBe(false);
});

test.describe('S-2 OS flag', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no saved value: REDUCED MOTION reads ON from the OS; the first flip saves a choice (OFF)', async ({ page }) => {
    await gotoTitle(page);
    await openSettings(page);
    await tap(page, 'ArrowDown');
    expect(await menuFocus(page, 'Settings')).toBe('motion');
    expect((await view(page))?.values.motion, 'reads ON').toBe(true);
    await tap(page, 'Enter');
    expect((await view(page))?.values.motion, 'flipped OFF').toBe(false);
    await expect.poll(async () => (await saved(page))?.['reducedMotionChosen']).toBe(true);
    expect((await saved(page))?.['reducedMotion']).toBe(false);
  });
});

test('S-3 REDUCED EFFECTS ON from the screen: the next level draws no horizon and no stars', async ({ page }) => {
  await gotoTitle(page);
  await openSettings(page);
  await tap(page, 'ArrowDown');
  await tap(page, 'ArrowDown');
  expect(await menuFocus(page, 'Settings')).toBe('effects');
  await tap(page, 'Enter');
  await expect.poll(async () => (await saved(page))?.['reducedEffects']).toBe(true);
  await page.goto('./?level=w1-04');
  await waitForHook(page);
  await pollState(page, (s) => s.state.step > 3, 'running', 45_000).toBe(true);
  const bg = ((await gameObjects(page)) ?? []).filter((o) => o.frame === 'bg/horizon' || o.frame === 'bg/stars');
  expect(bg.length, 'bg objects exist').toBeGreaterThan(0);
  expect(
    bg.every((o) => !o.visible),
    'none visible',
  ).toBe(true);
});

test('S-5 gear keys (both Shifts, Q, E, Z, X) change no row and no focus', async ({ page }) => {
  await gotoTitle(page);
  await openSettings(page);
  await tap(page, 'ArrowDown');
  const before = JSON.stringify(await view(page));
  const savedBefore = await saved(page);
  for (const k of ['ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX']) {
    await tap(page, k);
    expect(JSON.stringify(await view(page)), `after ${k}`).toBe(before);
    expect(await menuFocus(page, 'Settings'), `focus after ${k}`).toBe('motion');
  }
  expect(await saved(page), 'nothing saved').toEqual(savedBefore);
});

test('S-6 Enter, Space, Left and Right each flip the row, with exactly one save write and one changed field', async ({ page }) => {
  await countSaveWrites(page);
  await seedSave(page, {}); // a full save exists, so a diff shows only what the flip changed
  await gotoTitle(page);
  await openSettings(page);
  await tap(page, 'ArrowDown');
  await tap(page, 'ArrowDown');
  expect(await menuFocus(page, 'Settings')).toBe('effects');
  let expected = false;
  for (const key of ['Enter', 'Space', 'ArrowLeft', 'ArrowRight']) {
    const w0 = await writes(page);
    const s0 = (await saved(page)) ?? {};
    await tap(page, key);
    expected = !expected;
    expect((await view(page))?.values.effects, `${key} flips the row`).toBe(expected);
    const s1 = (await saved(page)) ?? {};
    expect((await writes(page)) - w0, `${key}: one write`).toBe(1);
    const changed = Object.keys(s1).filter((k) => JSON.stringify(s1[k]) !== JSON.stringify(s0[k]));
    expect(changed, `${key}: one field changed`).toEqual(['reducedEffects']);
  }
});

test('S-8 keys only: every toggle flipped twice with WASD/Enter, Esc back; with storage blocked the toggles still work', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await gotoTitle(page);
  await openSettings(page);
  const rows = ['sound', 'motion', 'effects'] as const;
  const start = (await view(page))?.values;
  for (const [i, row] of rows.entries()) {
    expect(await menuFocus(page, 'Settings')).toBe(row);
    const v0 = (await view(page))?.values[row];
    await tap(page, 'KeyD');
    expect((await view(page))?.values[row], `${row} flips with D`).toBe(!v0);
    await tap(page, 'Enter');
    expect((await view(page))?.values[row], `${row} flips back with Enter`).toBe(v0);
    if (i < rows.length - 1) await tap(page, 'KeyS');
  }
  expect((await view(page))?.values, 'values back where they started').toEqual(start);
  await tap(page, 'ArrowDown');
  expect(await menuFocus(page, 'Settings')).toBe('back');
  await tap(page, 'Escape');
  await pollScenes(page, ['Title']);
  await expect.poll(() => menuFocus(page, 'Title')).toBe('settings');
});

test('S-4 from pause: SETTINGS (before LEVELS) opens the screen, Esc returns to pause with SETTINGS focused, state.step unchanged', async ({ page }) => {
  await page.goto('./?level=w1-02');
  await waitForHook(page);
  await pollState(page, (s) => s.state.status === 'playing' && s.state.step > 5, 'running', 45_000).toBe(true);
  await page.keyboard.press('Escape');
  await pollScenes(page, ['Game', 'Pause']);
  const ids = await page.evaluate(() => {
    const g = (window as unknown as { __game: { scene: { getScene(k: string): { model: { list: { items: { id: string }[] } } } } } }).__game;
    return g.scene.getScene('Pause').model.list.items.map((i) => i.id);
  });
  expect(ids.indexOf('settings'), 'SETTINGS is listed').toBeGreaterThan(-1);
  expect(ids.indexOf('settings'), 'SETTINGS sits before LEVELS').toBeLessThan(ids.indexOf('levels'));
  const step = (await page.evaluate(() => window.__redshift?.state.step)) ?? 0;
  for (let i = 0; i < 6 && (await menuFocus(page, 'Pause')) !== 'settings'; i += 1) await tap(page, 'ArrowDown');
  await tap(page, 'Enter');
  await expect.poll(async () => (await activeScenes(page)).includes('Settings'), { message: 'settings open over the game' }).toBe(true);
  await tap(page, 'Escape');
  await expect
    .poll(async () => {
      const a = await activeScenes(page);
      return a.includes('Pause') && !a.includes('Settings');
    }, { message: 'back on pause' })
    .toBe(true);
  await expect.poll(() => menuFocus(page, 'Pause')).toBe('settings');
  await nextFrames(page, 20);
  expect(await page.evaluate(() => window.__redshift?.state.step), 'sim did not move').toBe(step);
});
