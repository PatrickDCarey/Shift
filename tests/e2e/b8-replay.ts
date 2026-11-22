/// <reference lib="dom" />
/**
 * Batch 8 helper: play a level's recording in the browser (`?replay=1`) and sample every rendered frame
 * (sim step, body x, camera scroll, sprite rectangles in screen px, edge arrows, HUD home glyphs).
 * Used by `batch8.spec.ts`. Pure read-side; no game code is touched.
 */
import type { Page } from '@playwright/test';
import { waitForHook } from './helpers';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface FrameSample {
  readonly t: number;
  readonly step: number;
  readonly rx: number;
  readonly tx: number | null;
  readonly rhome: boolean;
  readonly thome: boolean;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly runner: Rect | null;
  readonly twin: Rect | null;
  /** Visible `hud/edge/*` arrows by frame name. */
  readonly arrows: readonly string[];
  /** Visible `glyph/home` frames (HUD strips of parked bodies). */
  readonly homeGlyphs: number;
}

export const SCREEN = { w: 480, h: 270 } as const;
export const HUD_RECT: Rect = { x: 5, y: 5, w: 110, h: 32 };

/** Install a per-frame sampler into `window.__frames`; stop with {@link stopSampler}. */
export function startSampler(page: Page): Promise<void> {
  return page.evaluate(() => {
    type Obj = { visible: boolean; frame?: { name: string }; list?: Obj[]; getBounds(): { x: number; y: number; width: number; height: number } };
    type Scene = { cameras: { main: { scrollX: number; scrollY: number } }; children: { list: Obj[] } };
    const w = window as unknown as { __frames: unknown[]; __framesOn: boolean; __game: { scene: { getScene(k: string): Scene } } };
    w.__frames = [];
    w.__framesOn = true;
    const tick = (): void => {
      const h = window.__redshift as unknown as { state: { step: number; player: { x: number; home?: boolean }; twin?: { x: number; home?: boolean } | null } } | undefined;
      if (h) {
        const sc = w.__game.scene.getScene('Game');
        const cam = sc.cameras.main;
        const flat = (list: Obj[]): Obj[] => list.filter((o) => o.visible).flatMap((o) => [o, ...(o.list ? flat(o.list) : [])]);
        const vis = flat(sc.children.list).filter((o) => o.frame);
        const rect = (re: RegExp): { x: number; y: number; w: number; h: number } | null => {
          const o = vis.find((q) => re.test(q.frame?.name ?? ''));
          if (!o) return null;
          const b = o.getBounds();
          return { x: b.x - cam.scrollX, y: b.y - cam.scrollY, w: b.width, h: b.height };
        };
        w.__frames.push({
          t: performance.now(),
          step: h.state.step,
          rx: h.state.player.x,
          tx: h.state.twin ? h.state.twin.x : null,
          rhome: h.state.player.home === true,
          thome: h.state.twin?.home === true,
          scrollX: cam.scrollX,
          scrollY: cam.scrollY,
          runner: rect(/^player\/runner\//),
          twin: rect(/^player\/twin\//),
          arrows: vis.filter((o) => /^hud\/edge\//.test(o.frame?.name ?? '')).map((o) => o.frame?.name ?? ''),
          homeGlyphs: vis.filter((o) => /glyph\/home/.test(o.frame?.name ?? '')).length,
        });
      }
      if (w.__framesOn) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function stopSampler(page: Page): Promise<FrameSample[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: FrameSample[]; __framesOn: boolean };
    w.__framesOn = false;
    return w.__frames;
  });
}

/** Load `level` in replay mode and sample every frame until the replay reports done. */
export async function recordReplay(page: Page, level: string, speed = 1): Promise<FrameSample[]> {
  await page.goto(`./?level=${level}&replay=1&speed=${speed}`);
  await waitForHook(page);
  await startSampler(page);
  await page.waitForFunction(() => window.__redshift?.replay?.done === true, undefined, { timeout: 100_000, polling: 250 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  return stopSampler(page);
}

export const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const wholeOnScreen = (r: Rect): boolean => r.x >= 0 && r.y >= 0 && r.x + r.w <= SCREEN.w && r.y + r.h <= SCREEN.h;
