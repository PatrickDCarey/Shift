/**
 * Tandem scene checks S1-S4 (docs/design/features/tandem.md "Scene checks"; docs/qa/tandem-gate.md).
 *
 * - S4 and the second gear strip run on `w3-01` in the production-like e2e build.
 * - S1-S3 need two bodies far apart in x. `w3-01` keeps them at the same x and 28 tiles is under one screen, so the
 *   camera cannot scroll there. The dev-only room `w0-97` (`src/entities/devLevel.ts`, the twin is held by a wall at
 *   column 20) exists for this and is NOT in a production build: those tests skip with a message in `npm run test:e2e`
 *   and run against the dev server:
 *     npm run dev -- --port 5173 --strictPort, then run this file with a copy of playwright.config.ts whose `baseURL` is
 *     http://localhost:5173 and which has no `webServer` (QA did this on 2026-11-18: 5 of 5 pass; see docs/qa/tandem-gate.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_TIMEOUT_MS, expect, gameObjects, nextFrames, pollState, test, waitForHook } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const EVIDENCE = fileURLToPath(new URL('../../docs/qa/evidence/', import.meta.url));

interface Probe {
  readonly rx: number;
  readonly tx: number;
  readonly rhome: boolean;
  readonly cam: number;
  readonly twinScreenX: number | null;
  readonly runnerScreenX: number | null;
  readonly twinArrow: { readonly visible: boolean; readonly x: number } | null;
}

/** Bodies' x (tiles), camera scrollX (px), sprite screen x and the twin edge arrow, read from the live scene. */
const READ_PROBE = (): Probe | null => {
  {
    const w = window as unknown as {
      __redshift?: { state: { player: { x: number; home?: boolean }; twin?: { x: number } | null } };
      __game: { scene: { getScene(k: string): { cameras: { main: { scrollX: number } }; children: { list: { x: number; visible: boolean; frame?: { name: string } }[] } } } };
    };
    const st = w.__redshift?.state;
    if (!st?.twin) return null;
    const scene = w.__game.scene.getScene('Game');
    const cam = scene.cameras.main.scrollX;
    const find = (re: RegExp): { x: number; visible: boolean } | undefined => scene.children.list.find((o) => o.frame && re.test(o.frame.name));
    const twin = find(/^player\/twin\//);
    const runner = find(/^player\/runner\//);
    const arrow = find(/^hud\/edge\/twin\//);
    return {
      rx: st.player.x,
      tx: st.twin.x,
      rhome: st.player.home === true,
      cam,
      twinScreenX: twin ? twin.x - cam : null,
      runnerScreenX: runner ? runner.x - cam : null,
      twinArrow: arrow ? { visible: arrow.visible, x: arrow.x } : null,
    };
  }
};

test.describe('S4 and the HUD on w3-01 (production build)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./?level=w3-01');
    await waitForHook(page);
    await pollState(page, (s) => s.state.step > 5, 'running', 45_000).toBe(true);
  });

  test('both bodies and a second gear strip are drawn (tandem scene check 3)', async ({ page }) => {
    const names = ((await gameObjects(page)) ?? []).map((o) => o.frame ?? '');
    expect(names.some((f) => f.startsWith('player/runner/')), 'runner sprite').toBe(true);
    expect(names.some((f) => f.startsWith('player/twin/')), 'twin sprite').toBe(true);
    const strips = await page.evaluate(() => {
      // 5321e78 moved the strips into the GearMeters helper (`scene.meters`, private `runner` and `twin` views).
      const m = (window as unknown as { __game: { scene: { getScene(k: string): { meters?: { runner?: unknown; twin?: unknown } } } } }).__game.scene.getScene('Game').meters;
      return { runner: m?.runner !== null && m?.runner !== undefined, twin: m?.twin !== null && m?.twin !== undefined };
    });
    expect(strips, 'two gear strips (runner top, twin bottom)').toEqual({ runner: true, twin: true });
  });

  test('S4: in a greyscale capture at 1x (480x270) the twin and the runner differ in shape, not only in colour', async ({ page }) => {
    await nextFrames(page, 10);
    const shot = await page.evaluate(
      () =>
        new Promise<{ gray: string; crop: string; diff: number; area: number }>((resolve) => {
          type Obj = { x: number; y: number; width: number; height: number; displayWidth: number; displayHeight: number; originX: number; originY: number; frame?: { name: string } };
          const w = window as unknown as { __game: { canvas: HTMLCanvasElement; events: { once(e: string, f: () => void): void }; scene: { getScene(k: string): { cameras: { main: { scrollX: number; scrollY: number } }; children: { list: Obj[] } } } } };
          w.__game.events.once('postrender', () => {
            const src = w.__game.canvas;
            const c = document.createElement('canvas');
            c.width = src.width;
            c.height = src.height;
            const ctx = c.getContext('2d');
            if (!ctx) throw new Error('no 2d context');
            ctx.drawImage(src, 0, 0);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const luma = (i: number): number => Math.round(0.299 * (img.data[i] ?? 0) + 0.587 * (img.data[i + 1] ?? 0) + 0.114 * (img.data[i + 2] ?? 0));
            const grays = new Uint8ClampedArray(c.width * c.height);
            for (let p = 0; p < grays.length; p += 1) grays[p] = luma(p * 4);
            const scene = w.__game.scene.getScene('Game');
            const cam = scene.cameras.main;
            const rect = (re: RegExp): { x: number; y: number; w: number; h: number } => {
              const o = scene.children.list.find((q) => q.frame && re.test(q.frame.name));
              if (!o) throw new Error(`no sprite ${re}`);
              const wpx = Math.round(o.displayWidth);
              const hpx = Math.round(o.displayHeight);
              return { x: Math.round(o.x - cam.scrollX - o.originX * wpx), y: Math.round(o.y - cam.scrollY - o.originY * hpx), w: wpx, h: hpx };
            };
            const a = rect(/^player\/runner\//);
            const b = rect(/^player\/twin\//);
            const n = Math.min(a.w, b.w) * Math.min(a.h, b.h);
            let diff = 0;
            for (let yy = 0; yy < Math.min(a.h, b.h); yy += 1) {
              for (let xx = 0; xx < Math.min(a.w, b.w); xx += 1) {
                const ga = grays[(a.y + yy) * c.width + a.x + xx] ?? 0;
                const gb = grays[(b.y + yy) * c.width + b.x + xx] ?? 0;
                if (Math.abs(ga - gb) > 24) diff += 1;
              }
            }
            const out = document.createElement('canvas');
            out.width = c.width;
            out.height = c.height;
            const octx = out.getContext('2d');
            if (!octx) throw new Error('no 2d context');
            const o = octx.createImageData(c.width, c.height);
            for (let p = 0; p < grays.length; p += 1) {
              o.data[p * 4] = o.data[p * 4 + 1] = o.data[p * 4 + 2] = grays[p] ?? 0;
              o.data[p * 4 + 3] = 255;
            }
            octx.putImageData(o, 0, 0);
            // 4x side-by-side crop of the two greyscale sprites (runner left, twin right) for the evidence folder.
            const crop = document.createElement('canvas');
            crop.width = (a.w + b.w + 4) * 4;
            crop.height = Math.max(a.h, b.h) * 4;
            const cctx = crop.getContext('2d');
            if (!cctx) throw new Error('no 2d context');
            cctx.imageSmoothingEnabled = false;
            cctx.fillStyle = '#404040';
            cctx.fillRect(0, 0, crop.width, crop.height);
            cctx.drawImage(out, a.x, a.y, a.w, a.h, 0, 0, a.w * 4, a.h * 4);
            cctx.drawImage(out, b.x, b.y, b.w, b.h, (a.w + 4) * 4, 0, b.w * 4, b.h * 4);
            resolve({ gray: out.toDataURL('image/png'), crop: crop.toDataURL('image/png'), diff, area: n });
          });
        }),
    );
    fs.mkdirSync(EVIDENCE, { recursive: true });
    fs.writeFileSync(path.join(EVIDENCE, 'tandem-s4-w3-01-greyscale-1x.png'), Buffer.from(shot.gray.split(',')[1] ?? '', 'base64'));
    fs.writeFileSync(path.join(EVIDENCE, 'tandem-s4-sprites-grey-4x.png'), Buffer.from(shot.crop.split(',')[1] ?? '', 'base64'));
    test.info().annotations.push({ type: 'measured', description: `grey-level difference share ${(shot.diff / shot.area).toFixed(3)} of ${shot.area} px` });
    expect(shot.area, 'sprite rectangles measured').toBeGreaterThan(100);
    expect(shot.diff / shot.area, 'share of sprite pixels whose grey level differs by more than 24/255 between twin and runner').toBeGreaterThan(0.05);
  });
});

/**
 * S1-S3 on the dev-only room. Skips unless the loaded level is `w0-97` (a production build falls back to w0-02).
 * Hold gear 4 to the right: the twin is stopped by a wall at column 20, the runner runs on to its exit at column 57.
 * A probe row is recorded in the page on every animation frame, so the checks read the first frame at which a
 * condition held, not a late Playwright sample (the runner covers 12 tiles a second).
 */
test.describe('S1-S3 on the dev Tandem room w0-97 (dev server only)', () => {
  let rows: Probe[] = [];

  test.beforeEach(async ({ page }) => {
    await page.goto('./?level=w0-97');
    const first = await waitForHook(page);
    test.skip(first.levelId !== 'w0-97', 'w0-97 is a dev-server-only room (not in a production build): S1-S3 run against `npm run dev`; see the header of this file');
    await pollState(page, (s) => s.state.step > 5, 'running', 45_000).toBe(true);
    await page.evaluate((src: string) => {
      const w = window as unknown as { __rows: unknown[]; __probe: () => unknown };
      w.__probe = new Function(`return (${src})`)() as () => unknown;
      w.__rows = [];
      const tick = (): void => {
        const r = w.__probe();
        if (r) w.__rows.push(r);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, READ_PROBE.toString());
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('KeyE'); // gear 4
      await nextFrames(page, 4);
    }
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __rows: { rhome: boolean }[] }).__rows.some((r) => r.rhome))), { message: 'runner reached its exit', timeout: 90_000 }).toBe(true);
    await page.keyboard.up('ArrowRight');
    rows = await page.evaluate(() => (window as unknown as { __rows: Probe[] }).__rows);
  });

  test('S1: bodies 20 tiles apart are both fully on screen; no edge arrow', async ({ page }) => {
    const p = rows.find((r) => r.rx - r.tx >= 20);
    expect(p, 'a frame with the bodies 20 tiles apart').toBeDefined();
    expect(p?.twinScreenX, 'twin on screen (sprite is 16 px wide)').toBeGreaterThanOrEqual(8);
    expect(p?.runnerScreenX, 'runner on screen').toBeLessThanOrEqual(472);
    expect(p?.twinArrow?.visible ?? false, 'no twin arrow while both are framed').toBe(false);
    expect(rows.filter((r) => r.rx - r.tx < 28 && r.twinArrow?.visible).length, 'no twin arrow on any frame under 28 tiles apart').toBe(0);
    await page.screenshot({ path: path.join(EVIDENCE, 'tandem-s1-w0-97-run.png') });
  });

  test('S3: bodies 30 tiles apart: the camera follows the runner and the twin edge arrow points left at the twin', async () => {
    const p = rows.find((r) => r.rx - r.tx >= 30);
    expect(p, 'a frame with the bodies 30 tiles apart').toBeDefined();
    expect(p?.twinScreenX, 'twin is off screen to the left').toBeLessThan(0);
    expect(p?.runnerScreenX, 'runner is on screen').toBeGreaterThan(0);
    expect(p?.runnerScreenX).toBeLessThan(480);
    expect(rows.some((r) => r.rx - r.tx >= 30 && r.twinArrow?.visible && r.twinArrow.x < 60), 'twin edge arrow shown on the left edge').toBe(true);
  });

  test('S2: runner home, twin still moving: the camera frames the twin', async ({ page }) => {
    const last = rows[rows.length - 1];
    expect(last?.rhome).toBe(true);
    expect(Math.abs((last?.twinScreenX ?? 9999) - 240), 'twin centred once the camera has eased').toBeLessThan(40);
    expect(last?.runnerScreenX, 'the parked runner is off screen').toBeGreaterThan(480);
    await page.screenshot({ path: path.join(EVIDENCE, 'tandem-s2-camera-on-twin.png') });
  });
});
