/**
 * Batch 8 browser checks (B8-08), all against the e2e build (QA hook on):
 *  - tandem.md S5 / S6 and the park pan, from w3-04's recording (`?replay=1`, one sim step per rendered frame);
 *  - onboarding-hints.md checks 11 and 14 (browser half) for w3-03, w3-04 and w3-05;
 *  - settings.md check 2 (reduced motion changes the screen: the drag-drop wipe) and check 4 (W7: a toggle made from pause
 *    applies on RESUME and on R without a level reload);
 *  - PT-3 "why you fell" cue under reduced effects.
 * Restart-prompt checks 3-5 live in `restart-card.spec.ts` (updated to the 128 x 38 card).
 */
import type { Page } from '@playwright/test';
import { HUD_RECT, overlaps, recordReplay, wholeOnScreen, type FrameSample, type Rect } from './b8-replay';
import { TEST_TIMEOUT_MS, activeScenes, expect, gameObjects, holdRightUntilPastX, menuFocus, menuModel, nextFrames, pollScenes, pollState, seedSave, tap, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const TILE = 16;
const bodyArrows = (f: FrameSample): string[] => f.arrows.filter((a) => /^hud\/edge\/(runner|twin)\//.test(a));
const maxGapMs = (fs: readonly FrameSample[]): number => fs.reduce((m, f, i) => (i === 0 ? m : Math.max(m, f.t - (fs[i - 1]?.t ?? f.t))), 0);

test.describe('w3-04 by its recording (tandem.md S5, S6, park pan)', () => {
  test('S5 both bodies framed and clear of the HUD with no edge arrow while apart; S6 camera follows the twin after the runner parks, with a pan', async ({ page }) => {
    test.setTimeout(150_000);
    const all = await recordReplay(page, 'w3-04');
    const first = (s: number): FrameSample | undefined => all.find((f) => f.step === s);

    // S5: every frame in which neither body is home (the recording's let-go is step 262, runner x 21.48, twin x 40.1).
    const apart = all.filter((f) => !f.rhome && !f.thome && f.runner && f.twin && f.step >= 20);
    const letGo = first(262);
    expect(letGo, 'a frame at the let-go step 262').toBeDefined();
    const g = letGo as FrameSample;
    test.info().annotations.push({
      type: 'observed',
      description: `let-go: runner x ${g.rx.toFixed(2)}, twin x ${(g.tx ?? 0).toFixed(2)} (${((g.tx ?? 0) - g.rx).toFixed(1)} apart); runner ${JSON.stringify(g.runner)} twin ${JSON.stringify(g.twin)}; scrollX ${g.scrollX}; max apart in the run ${Math.max(...apart.map((f) => (f.tx ?? 0) - f.rx)).toFixed(1)} tiles`,
    });
    const bad: string[] = [];
    for (const f of apart) {
      const rs = f.runner as Rect;
      const ts = f.twin as Rect;
      if (!wholeOnScreen(rs)) bad.push(`step ${f.step} runner off screen ${JSON.stringify(rs)}`);
      if (!wholeOnScreen(ts)) bad.push(`step ${f.step} twin off screen ${JSON.stringify(ts)}`);
      if (overlaps(rs, HUD_RECT) || overlaps(ts, HUD_RECT)) bad.push(`step ${f.step} sprite overlaps the HUD`);
      if (bodyArrows(f).length > 0) bad.push(`step ${f.step} edge arrow ${bodyArrows(f).join(',')}`);
    }
    expect(bad.slice(0, 5), `S5: ${bad.length} bad frames of ${apart.length}`).toEqual([]);
    expect(apart.length, 'S5 sampled a real stretch').toBeGreaterThan(200);

    // S6: from the runner's home step (354) to the win (396).
    const park = first(354) as FrameSample;
    expect(park.rhome, 'runner home at step 354').toBe(true);
    const after = all.filter((f) => f.step >= 354 && f.step <= 396 && f.twin);
    const bad6: string[] = [];
    for (const f of after) {
      const ts = f.twin as Rect;
      if (!wholeOnScreen(ts)) bad6.push(`step ${f.step} twin off screen ${JSON.stringify(ts)}`);
      if (overlaps(ts, HUD_RECT)) bad6.push(`step ${f.step} twin under the HUD`);
      if (bodyArrows(f).length > 0) bad6.push(`step ${f.step} edge arrow ${bodyArrows(f).join(',')}`);
    }
    expect(bad6.slice(0, 5), 'S6: the twin stays framed, no arrow').toEqual([]);
    const runnerLeft = after.some((f) => f.runner === null || !wholeOnScreen(f.runner));
    test.info().annotations.push({ type: 'observed', description: `S6: runner leaves the screen after the park: ${runnerLeft} (intended)` });
    expect(runnerLeft, 'the parked runner is out of the framing').toBe(true);
    expect(all.filter((f) => f.step < 354).every((f) => f.homeGlyphs === 0), 'no home glyph before the park').toBe(true);

    // Pan: from the park the camera scrolls to the twin over several frames, never backwards, with no one-frame snap.
    const win = all.filter((f) => f.step >= 354);
    const end = Math.max(...win.slice(0, 40).map((f) => f.scrollX));
    const moving = win.slice(0, win.findIndex((f) => f.scrollX === end) + 1);
    const total = end - (moving[0]?.scrollX ?? end);
    const deltas = moving.slice(1).map((f, i) => f.scrollX - (moving[i]?.scrollX ?? f.scrollX));
    const settleMs = (moving[moving.length - 1]?.t ?? 0) - (moving[0]?.t ?? 0);
    test.info().annotations.push({
      type: 'observed',
      description: `pan: scrollX ${moving[0]?.scrollX} -> ${end} (${total}px) in ${moving.length} frames, ${settleMs.toFixed(0)} ms, per-frame ${deltas.join(',')}; slowest frame in the window ${maxGapMs(moving).toFixed(0)} ms`,
    });
    expect(total, 'the camera moved toward the twin').toBeGreaterThan(60);
    expect(deltas.every((d) => d >= 0), 'scrolls one way only').toBe(true);
    if (maxGapMs(moving) < 100) {
      expect(moving.length, 'spread over several frames').toBeGreaterThanOrEqual(5);
      expect(Math.max(...deltas), 'no single-frame snap of the whole move').toBeLessThan(total * 0.5);
    }
    expect(settleMs, 'done within about a quarter second plus a frame or two').toBeLessThanOrEqual(400);
  });

  test("S6 HUD: the parked runner's strip shows the home glyph (BUG-8, fixed in 5321e78)", async ({ page }) => {
    test.setTimeout(150_000);
    const all = await recordReplay(page, 'w3-04');
    const seenAfter = all.filter((f) => f.step >= 356 && f.step < 396).map((f) => f.homeGlyphs);
    test.info().annotations.push({ type: 'observed', description: `home glyphs on screen, steps 356-395: min ${Math.min(...seenAfter)} max ${Math.max(...seenAfter)}` });
    expect(Math.min(...seenAfter), "a home glyph (the runner strip) on every frame from step 356 to the twin's win").toBeGreaterThanOrEqual(1);
  });

  test('park pan under reduced motion: the camera cuts to the twin (no gradual pan)', async ({ page }) => {
    test.setTimeout(150_000);
    await seedSave(page, { settings: { reducedMotion: true } });
    const all = await recordReplay(page, 'w3-04');
    const win = all.filter((f) => f.step >= 353);
    const end = Math.max(...win.slice(0, 40).map((f) => f.scrollX));
    const idx = win.findIndex((f) => f.scrollX === end);
    const base = win[0]?.scrollX ?? 0; // step 353, the frame before the park (the cut may already show on step 354)
    const deltas = win.slice(1, idx + 1).map((f, i) => f.scrollX - (win[i]?.scrollX ?? f.scrollX));
    test.info().annotations.push({ type: 'observed', description: `reduced motion: scrollX ${win.map((f) => f.scrollX).slice(0, 10).join(',')}; per-frame ${deltas.join(',')}` });
    expect(end - base, 'the camera still ends on the twin').toBeGreaterThan(60);
    expect(Math.max(...deltas), 'the whole move happens in one frame').toBeGreaterThanOrEqual((end - base) * 0.9);
    expect(idx, 'at most 2 frames after the park').toBeLessThanOrEqual(3);
  });
});

// --- onboarding hints (check 11 and 14, browser half) ---------------------------------------------------------------

const ADV = 6;
const SHIFT_UP = ['R⇧', 'E', 'X', '▲'];
const JUMP = ['SPACE', 'W', '↑'];
interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}
interface Label {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}
function boxOf(all: readonly Label[], group: readonly string[]): Box {
  const mine = all.filter((o) => group.includes(o.text));
  const left = Math.min(...mine.map((o) => o.x)) - 2;
  const right = Math.max(...mine.map((o) => o.x + ADV * o.text.length)) + 2;
  const top = Math.min(...mine.map((o) => o.y)) - 2;
  return { left, right, top, bottom: top + 24 };
}
const hintLabels = async (page: Page): Promise<Label[]> =>
  ((await gameObjects(page)) ?? []).filter((o) => o.type === 'BitmapText' && o.depth === 6 && o.visible).map((o) => ({ text: o.text ?? '', x: o.x, y: o.y }));
const toRect = (b: Box, scrollX: number, scrollY: number): Rect => ({ x: b.left - scrollX, y: b.top - scrollY, w: b.right - b.left, h: b.bottom - b.top });

async function load(page: Page, level: string): Promise<void> {
  await page.goto(`./?level=${level}`);
  await waitForHook(page);
  await pollState(page, (s) => s.state.step > 3, 'level running', 45_000).toBe(true);
}

for (const level of ['w3-03', 'w3-04'] as const) {
  test(`hints 11/14 ${level}: shiftUp over the spawn and jump over the takeoff are on screen on the first frames, clear of the HUD`, async ({ page }) => {
    await load(page, level);
    const labels = await hintLabels(page);
    expect(labels.map((l) => l.text).sort(), 'exactly the two glyphs').toEqual([...SHIFT_UP, ...JUMP].sort());
    const up = boxOf(labels, SHIFT_UP);
    const jump = boxOf(labels, JUMP);
    const cam = await page.evaluate(() => {
      const g = (window as unknown as { __game: { scene: { getScene(k: string): { cameras: { main: { scrollX: number; scrollY: number } } } } } }).__game;
      const c = g.scene.getScene('Game').cameras.main;
      return { x: c.scrollX, y: c.scrollY };
    });
    test.info().annotations.push({ type: 'observed', description: `${level}: shiftUp ${JSON.stringify(up)} jump ${JSON.stringify(jump)} camera ${JSON.stringify(cam)}` });
    for (const [name, box] of [['shiftUp', up], ['jump', jump]] as const) {
      const r = toRect(box, cam.x, cam.y);
      expect(wholeOnScreen(r), `${name} box on screen ${JSON.stringify(r)}`).toBe(true);
      expect(overlaps(r, HUD_RECT), `${name} box clear of the HUD`).toBe(false);
    }
    expect(Math.floor((up.left + up.right) / 2 / TILE), 'shiftUp column 2').toBe(2);
    expect(Math.floor((jump.left + jump.right) / 2 / TILE), 'jump column 12').toBe(12);
    // spec box cols 1-3 (world px 16-64) over the spawn (the runner stands at x 1.50 tiles = 24 px); the drawn glyph is centred on col 2 (px 40)
    expect(up.left >= 1 * TILE && up.right <= 4 * TILE, 'shiftUp box inside cols 1-3').toBe(true);
    expect(1.5 * TILE >= 1 * TILE && 1.5 * TILE < 4 * TILE, 'the spawn is inside those columns').toBe(true);
    expect(up.bottom, 'above the runner floor (row 6 = 96 px)').toBeLessThanOrEqual(6 * TILE);
    expect(jump.right, 'jump box left of the block at col 16').toBeLessThan(16 * TILE);
  });
}

interface KerbSample {
  step: number;
  scrollX: number;
  scrollY: number;
  rx: number;
  tx: number;
  labels: { text: string; x: number; y: number }[];
  sprites: { x: number; y: number; w: number; h: number }[];
}

/** Replay w3-05 (one sim step per frame) and sample the Game scene on the first frame at or after `minStep`. */
async function sampleW305(page: Page, minStep: number): Promise<KerbSample> {
  await page.goto('./?level=w3-05&replay=1&speed=1');
  await waitForHook(page);
  return page.evaluate(
    (target) =>
      new Promise<KerbSample>((resolve) => {
        type Obj = { visible: boolean; type: string; depth: number; x: number; y: number; text?: string; frame?: { name: string }; getBounds(): { x: number; y: number; width: number; height: number } };
        const g = (window as unknown as { __game: { scene: { getScene(k: string): { cameras: { main: { scrollX: number; scrollY: number } }; children: { list: Obj[] } } } } }).__game;
        const tick = (): void => {
          const st = window.__redshift?.state as unknown as { step: number; player: { x: number }; twin: { x: number } } | undefined;
          if (st && st.step >= target) {
            const sc = g.scene.getScene('Game');
            const cam = sc.cameras.main;
            const list = sc.children.list.filter((o) => o.visible);
            const spr = list.filter((o) => /^player\/(runner|twin)\//.test(o.frame?.name ?? '')).map((o) => o.getBounds());
            resolve({
              step: st.step,
              scrollX: cam.scrollX,
              scrollY: cam.scrollY,
              rx: st.player.x,
              tx: st.twin.x,
              labels: list.filter((o) => o.type === 'BitmapText' && o.depth === 6).map((o) => ({ text: o.text ?? '', x: o.x, y: o.y })),
              sprites: spr.map((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height })),
            });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    minStep,
  );
}

function checkW305Boxes(at: KerbSample): { up: Box; kerbJump: Box; leftmostBody: number } {
  expect(at.labels.map((l) => l.text).sort(), 'all three glyphs drawn').toEqual([...SHIFT_UP, ...JUMP, ...JUMP].sort());
  // split the two jump glyphs by x: the opening one (col 12) and the second one (ahead of the step, left of the kerb)
  const kerbJump = boxOf(at.labels.filter((l) => JUMP.includes(l.text) && l.x > 30 * TILE), JUMP);
  const up = boxOf(at.labels, SHIFT_UP);
  for (const [name, box] of [['shiftUp', up], ['second jump', kerbJump]] as const) {
    const r = toRect(box, at.scrollX, at.scrollY);
    expect(wholeOnScreen(r), `${name} box on screen ${JSON.stringify(r)}`).toBe(true);
    expect(overlaps(r, HUD_RECT), `${name} clear of the HUD`).toBe(false);
  }
  expect(at.sprites.length, 'both bodies drawn').toBe(2);
  return { up, kerbJump, leftmostBody: Math.min(...at.sprites.map((s) => s.x)) };
}

test('hints 14 w3-05 v2: three glyphs on the first frame; at step 986 (both bodies held at the step, x 36.375) the shiftUp box spans the step face (576 px) over both bodies and the jump box is ahead, right edge left of the kerb (720 px)', async ({ page }) => {
  test.setTimeout(150_000);
  await load(page, 'w3-05');
  const start = await hintLabels(page);
  expect(start.map((l) => l.text).sort(), 'jump, shiftUp, jump').toEqual([...SHIFT_UP, ...JUMP, ...JUMP].sort());
  const at = await sampleW305(page, 986);
  await page.screenshot({ path: 'docs/qa/evidence/b9-w3-05-step-glyphs.png' });
  test.info().annotations.push({ type: 'observed', description: `step ${at.step}: runner x ${at.rx.toFixed(3)}, twin x ${at.tx.toFixed(3)}, scrollX ${at.scrollX}; labels ${at.labels.map((l) => `${l.text}@${l.x}`).join(' ')}` });
  expect(at.step, 'sampled at the step-hold step').toBeLessThanOrEqual(988);
  expect(at.rx, 'runner held at the step').toBeCloseTo(36.375, 1);
  expect(at.tx, 'twin held at the step').toBeCloseTo(36.375, 1);
  const { up, kerbJump } = checkW305Boxes(at);
  expect(up.left <= 36 * TILE && up.right >= 36 * TILE, `shiftUp box spans the step face (576 px): ${up.left}..${up.right}`).toBe(true);
  expect(up.left, 'shiftUp box over both bodies (left of their centre)').toBeLessThanOrEqual(at.rx * TILE);
  expect(up.right, 'shiftUp box over both bodies (right of their centre)').toBeGreaterThanOrEqual(at.rx * TILE);
  expect(kerbJump.left, 'jump box ahead of the bodies').toBeGreaterThan(at.rx * TILE);
  expect(kerbJump.right, 'jump right edge left of the kerb (col 45 = 720 px)').toBeLessThan(45 * TILE);
});

// --- settings (check 2 and W7 check 4) --------------------------------------------------------------------------------

/** Count frames in which a `fx/wipe/*` image was visible (the drag-drop screen wipe lives about 0.3 s). */
async function watchWipe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __wipe: number; __game: { scene: { getScene(k: string): { children: { list: { visible: boolean; frame?: { name: string } }[] } } } } };
    w.__wipe = 0;
    const tick = (): void => {
      for (const o of w.__game.scene.getScene('Game').children.list) if (o.visible && o.frame?.name.startsWith('fx/wipe')) w.__wipe += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const wipeFrames = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __wipe: number }).__wipe);

for (const [name, settings, expectWipe] of [
  ['defaults: the red takeoff of w2-02 draws the wipe', {}, true],
  ['reduced motion ON: no wipe on the same drop (settings check 2)', { reducedMotion: true }, false],
] as const) {
  test(`settings 2 w2-02 by its recording, ${name}`, async ({ page }) => {
    test.setTimeout(150_000);
    await seedSave(page, { settings });
    await page.goto('./?level=w2-02&replay=1&speed=1');
    await waitForHook(page);
    await watchWipe(page);
    await page.waitForFunction(() => window.__redshift?.replay?.done === true, undefined, { timeout: 100_000, polling: 250 });
    await nextFrames(page, 5);
    const n = await wipeFrames(page);
    test.info().annotations.push({ type: 'observed', description: `wipe visible on ${n} frames` });
    if (expectWipe) expect(n, 'wipe frames seen').toBeGreaterThan(0);
    else expect(n, 'no wipe frames').toBe(0);
  });
}

/** Pause, open SETTINGS from the pause menu, flip the row (sound, motion, effects), come back to pause. */
async function flipFromPause(page: Page, row: 'motion' | 'effects'): Promise<void> {
  await page.keyboard.press('Escape');
  await pollScenes(page, ['Game', 'Pause']);
  for (let i = 0; i < 6 && (await menuFocus(page, 'Pause')) !== 'settings'; i += 1) await tap(page, 'ArrowDown');
  await tap(page, 'Enter');
  await expect.poll(async () => (await activeScenes(page)).includes('Settings'), { message: 'settings over the game' }).toBe(true);
  await expect.poll(() => menuFocus(page, 'Settings')).toBe('sound');
  await tap(page, 'ArrowDown');
  if (row === 'effects') await tap(page, 'ArrowDown');
  await tap(page, 'Enter');
  await expect.poll(async () => (await menuModel<{ values: Record<string, boolean> }>(page, 'Settings'))?.values[row], { message: `${row} flipped` }).toBe(true);
  await tap(page, 'Escape');
  await expect
    .poll(async () => {
      const a = await activeScenes(page);
      return a.includes('Pause') && !a.includes('Settings');
    })
    .toBe(true);
}

const bgFlags = async (page: Page): Promise<Record<string, boolean>> => {
  const out: Record<string, boolean> = {};
  for (const o of (await gameObjects(page)) ?? []) if (o.frame === 'bg/horizon' || o.frame === 'bg/stars') out[o.frame] = o.visible;
  return out;
};
const doorFrames = (page: Page): Promise<string[]> =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const w = window as unknown as { __game: { scene: { getScene(k: string): { children: { list: { frame?: { name: string } }[] } } } } };
        const seen = new Set<string>();
        const t0 = performance.now();
        let frames = 0;
        const tick = (): void => {
          frames += 1;
          for (const o of w.__game.scene.getScene('Game').children.list) if (o.frame?.name.startsWith('tile/exit/door_')) seen.add(o.frame.name);
          if (frames >= 10 && performance.now() - t0 >= 1500) resolve([...seen]);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

test('settings 4 (W7): REDUCED EFFECTS flipped from pause applies on RESUME and still on R, with no level reload', async ({ page }) => {
  await seedSave(page, {});
  await load(page, 'w1-04');
  expect(await bgFlags(page), 'full effects to start with').toEqual({ 'bg/horizon': true, 'bg/stars': true });
  await flipFromPause(page, 'effects');
  const paused = (await page.evaluate(() => window.__redshift?.state.step)) ?? 0;
  await page.keyboard.press('Escape'); // resume
  await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
  await nextFrames(page, 3);
  const st = await page.evaluate(() => ({ step: window.__redshift?.state.step ?? 0, id: window.__redshift?.levelId }));
  expect(st.id, 'same level').toBe('w1-04');
  expect(st.step, 'the run continued (no level reload)').toBeGreaterThanOrEqual(paused);
  expect(await bgFlags(page), 'horizon and stars gone from the first frames after RESUME').toEqual({ 'bg/horizon': false, 'bg/stars': false });
  await page.keyboard.press('KeyR');
  await nextFrames(page, 10);
  expect((await page.evaluate(() => window.__redshift?.state.step)) ?? 99, 'R restarted the run').toBeLessThan(paused + 5);
  expect(await bgFlags(page), 'still off after R').toEqual({ 'bg/horizon': false, 'bg/stars': false });
});

test('settings 4 (W7): REDUCED MOTION flipped from pause holds the exit door on door_0 after RESUME and after R', async ({ page }) => {
  await seedSave(page, {});
  await load(page, 'w1-04');
  expect((await doorFrames(page)).length, 'the door pulses with full motion').toBeGreaterThan(1);
  await flipFromPause(page, 'motion');
  await page.keyboard.press('Escape');
  await pollState(page, (s) => !s.paused, 'resumed').toBe(true);
  expect(await doorFrames(page), 'door held after RESUME').toEqual(['tile/exit/door_0']);
  await page.keyboard.press('KeyR');
  await nextFrames(page, 5);
  expect(await doorFrames(page), 'door held after R').toEqual(['tile/exit/door_0']);
});

test('settings 4 (W7): REDUCED EFFECTS flipped from pause also applies when the pause menu RESTART is used', async ({ page }) => {
  await seedSave(page, {});
  await load(page, 'w1-04');
  await flipFromPause(page, 'effects');
  for (let i = 0; i < 6 && (await menuFocus(page, 'Pause')) !== 'restart'; i += 1) await tap(page, 'ArrowUp');
  expect(await menuFocus(page, 'Pause'), 'RESTART focused').toBe('restart');
  await tap(page, 'Enter');
  await pollScenes(page, ['Game']);
  await nextFrames(page, 10);
  expect(await bgFlags(page), 'effects off after the pause RESTART').toEqual({ 'bg/horizon': false, 'bg/stars': false });
});

// --- PT-3 "why you fell" cue under reduced effects ------------------------------------------------------------------

for (const [name, settings] of [
  ['defaults', {}],
  ['reduced effects', { reducedEffects: true }],
] as const) {
  test(`PT-3: the why-you-fell ring is the same three blue frames (bold, hold, fade) with ${name}`, async ({ page }) => {
    await seedSave(page, { settings });
    await load(page, 'w1-01');
    await page.evaluate(() => {
      const w = window as unknown as { __why: Set<string>; __game: { scene: { getScene(k: string): { children: { list: { visible: boolean; frame?: { name: string } }[] } } } } };
      w.__why = new Set();
      const tick = (): void => {
        for (const o of w.__game.scene.getScene('Game').children.list) if (o.visible && o.frame?.name.startsWith('fx/why/')) w.__why.add(o.frame.name);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await holdRightUntilPastX(page, 5.2);
    await expect.poll(async () => page.evaluate(() => (window as unknown as { __why: Set<string> }).__why.size), { timeout: 20_000 }).toBeGreaterThan(0);
    await nextFrames(page, 60);
    const seen = await page.evaluate(() => [...(window as unknown as { __why: Set<string> }).__why].sort());
    test.info().annotations.push({ type: 'observed', description: `${name}: ${seen.join(',')}` });
    expect(seen, 'ring frames, blue, whatever the settings').toEqual(['fx/why/blue/bold', 'fx/why/blue/fade', 'fx/why/blue/hold']);
  });
}
