/// <reference lib="dom" />
/**
 * Helpers for the B11 expansion specs (movers, bolts, checkpoints): a frame-locked driver and level-file oracles.
 *
 * The driver freezes the page's clock (`page.clock`) and advances it one 60 Hz frame at a time, so the sim runs
 * about one step per rendered frame whatever the machine load, and a scripted run (a solution recording typed in
 * as key events) lands on the same steps every time. That makes screenshots exact (the page is not running while
 * it is captured) and deaths reproducible. Wall-clock never enters a check. About 25 ms of wall time per frame.
 *
 * The oracles below are written from the specs (moving-objects.md, projectiles.md, checkpoints.md) and the level
 * headers, not from the sim code, so a disagreement with `window.__redshift.kinetics` is a real finding.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect } from './helpers';

const LEVELS_DIR = fileURLToPath(new URL('../../levels/', import.meta.url));
export const EVIDENCE_DIR = fileURLToPath(new URL('../../docs/qa/evidence/', import.meta.url));

/**
 * One frame of fake time. Slightly under the 16.67 ms step, so the sim runs one step per frame and an occasional frame with
 * none, never two: a skipped step would swallow one press of a recording's `1+ 1. 1+` shift taps (observed with 1000 / 60).
 */
export const FRAME_MS = 16;

/** What the hook shows at one instant (all positions in tiles). */
export interface Obs {
  readonly step: number;
  readonly status: 'playing' | 'dead' | 'restarting' | 'won';
  readonly wonAtStep: number | null;
  /** The kinetic clock (`window.__redshift.kineticStep`). */
  readonly k: number;
  readonly checkpoint: number | null;
  readonly player: { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number; readonly gear: number; readonly band: number; readonly grounded: boolean };
  readonly kinetics: {
    readonly step: number;
    readonly movers: readonly { readonly x: number; readonly y: number; readonly holds: boolean }[];
    readonly emitters: readonly { readonly tell: boolean }[];
    readonly shots: readonly { readonly emitter: number; readonly firedAt: number; readonly x: number; readonly y: number }[];
  } | null;
}

/** Buttons of a recording frame: R L J + - (right, left, jump, shift up, shift down). */
const LETTER_KEYS: Readonly<Record<string, string>> = { R: 'ArrowRight', L: 'ArrowLeft', J: 'Space', '+': 'ShiftRight', '-': 'ShiftLeft' };

/** `levels/<id>.solution.txt` expanded to one string of held letters per step ('' = nothing). */
export function recordingFrames(id: string): string[] {
  const text = readFileSync(`${LEVELS_DIR}${id}.solution.txt`, 'utf8');
  const body = text.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#') && !/^[a-zA-Z]+:/.test(l) && l.trim() !== '---');
  const frames: string[] = [];
  for (const tok of body.join(' ').split(/\s+/).filter(Boolean)) {
    const m = /^(\d+)(.+)$/.exec(tok);
    if (!m) throw new Error(`${id}: bad run token ${tok}`);
    const letters = m[2] === '.' ? '' : (m[2] ?? '');
    for (let i = 0; i < Number(m[1]); i += 1) frames.push(letters);
  }
  // Keep the last frame held after the recording ends (the win comes a step or two later under frame jitter).
  for (let i = 0; i < 90; i += 1) frames.push(frames[frames.length - 1] ?? '');
  return frames;
}

/** The raw text of a level file. */
export function levelText(id: string): string {
  return readFileSync(`${LEVELS_DIR}${id}.txt`, 'utf8');
}

// --- the page-side half of the driver (installed once per page) -------------------------------------------------

const PAGE_DRIVER = `(() => {
  const keys = ${JSON.stringify(LETTER_KEYS)};
  const heldLetters = 'RL';
  const q = { frames: null, last: -1, held: {} };
  window.__q = q;
  const set = (code, down) => {
    if (!!q.held[code] === down) return;
    q.held[code] = down;
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  };
  window.__qSet = set;
  window.__qObserve = () => {
    const h = window.__redshift;
    const s = h.state;
    if (q.frames && s.step !== q.last) {
      const lo = Math.max(0, q.last + 1);
      let presses = '';
      for (let i = lo; i <= s.step; i += 1) presses += (q.frames[i] ?? '');
      const now = q.frames[s.step] ?? '';
      for (const [letter, code] of Object.entries(keys)) set(code, heldLetters.includes(letter) ? now.includes(letter) : presses.includes(letter));
      q.last = s.step;
    }
    const p = s.player;
    const k = h.kinetics;
    return {
      step: s.step, status: s.status, wonAtStep: s.wonAtStep, k: h.kineticStep, checkpoint: h.checkpoint,
      player: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, gear: p.gear, band: p.band, grounded: p.grounded },
      kinetics: k ? JSON.parse(JSON.stringify(k)) : null,
    };
  };
})()`;

/** A page whose clock only moves when the test moves it. */
export class Clocked {
  private constructor(readonly page: Page) {}

  /** Freeze the clock, load `search` (for example `?level=w2-05`) and run frames until the QA hook is up. */
  static async open(page: Page, search: string): Promise<Clocked> {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto(`./${search}`);
    // Assets load in real time while the page clock only moves when told to: poll the hook, nudge fake time, give real time a beat.
    const t0 = Date.now();
    while (!(await page.evaluate(() => (window as unknown as { __redshift?: unknown }).__redshift !== undefined))) {
      if (Date.now() - t0 > 60_000) throw new Error('window.__redshift never appeared within 60 s');
      await page.clock.runFor(50);
      await page.waitForTimeout(20);
    }
    await page.evaluate(PAGE_DRIVER);
    return new Clocked(page);
  }

  /**
   * Like {@link open} for a menu page (no `?level=`): ready when a Title or Game scene is active, since the QA hook only
   * exists once a Game scene does. `observe()` is not usable until a level is running; `hold`, `tap`, `frame` are.
   */
  static async openMenus(page: Page, search = ''): Promise<Clocked> {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto(`./${search}`);
    const t0 = Date.now();
    const up = (): Promise<boolean> =>
      page.evaluate(() => {
        const g = (window as unknown as { __game?: { scene: { scenes: { sys: { isActive(): boolean; settings: { key: string } } }[] } } }).__game;
        return !!g && g.scene.scenes.some((s) => s.sys.isActive() && (s.sys.settings.key === 'Title' || s.sys.settings.key === 'Game'));
      });
    while (!(await up())) {
      if (Date.now() - t0 > 60_000) throw new Error('no Title or Game scene within 60 s');
      await page.clock.runFor(50);
      await page.waitForTimeout(20);
    }
    await page.evaluate(PAGE_DRIVER);
    return new Clocked(page);
  }

  /** What the hook shows now (and, while a script runs, applies the keys for the coming step). */
  observe(): Promise<Obs> {
    return this.page.evaluate(() => (window as unknown as { __qObserve: () => unknown }).__qObserve()) as Promise<Obs>;
  }

  /** Feed these per-step letters (from {@link recordingFrames}) as keys, or null to stop and release every key. */
  async script(frames: readonly string[] | null): Promise<void> {
    await this.page.evaluate((f) => {
      const w = window as unknown as { __q: { frames: string[] | null; last: number }; __qSet: (c: string, d: boolean) => void };
      w.__q.frames = f === null ? null : [...f];
      w.__q.last = -1;
      if (f === null) for (const c of ['ArrowRight', 'ArrowLeft', 'Space', 'ShiftRight', 'ShiftLeft', 'KeyR']) w.__qSet(c, false);
    }, frames);
  }

  /** Hold or release one key by `code` (not while a script is running). */
  async hold(code: string, down: boolean): Promise<void> {
    await this.page.evaluate(([c, d]) => (window as unknown as { __qSet: (c: string, d: boolean) => void }).__qSet(c as string, d as boolean), [code, down] as const);
  }

  /** A press that lasts exactly one frame (down, one frame, up). */
  async tap(code: string): Promise<void> {
    await this.hold(code, true);
    await this.frame();
    await this.hold(code, false);
    await this.frame();
  }

  /** One frame of fake time. */
  async frame(): Promise<void> {
    await this.page.clock.runFor(FRAME_MS);
  }

  /**
   * Observe, then run a frame, until `until(obs)` holds (returned) or `maxFrames` pass (throws). `each` sees every
   * observation, including the last.
   */
  async run(until: (o: Obs) => boolean, maxFrames: number, each?: (o: Obs) => void | Promise<void>): Promise<Obs> {
    for (let i = 0; i <= maxFrames; i += 1) {
      const o = await this.observe();
      if (each) await each(o);
      if (until(o)) return o;
      await this.frame();
    }
    throw new Error(`condition not reached within ${maxFrames} frames; last: ${JSON.stringify(await this.observe())}`);
  }

  /** `n` frames, observing each. */
  async frames(n: number, each?: (o: Obs) => void | Promise<void>): Promise<Obs> {
    let count = 0;
    return this.run(() => count++ >= n, n + 2, each);
  }
}

// --- oracles from the level headers ------------------------------------------------------------------------------

export interface MoverSpec {
  readonly col: number;
  readonly row: number;
  readonly width: number;
  readonly kind: string;
  readonly speed: number;
  readonly phase: number;
  readonly path: readonly (readonly [string, number])[];
}

export function parseMovers(text: string): MoverSpec[] {
  return [...text.matchAll(/^mover:\s*(\d+)\s+(\d+)\s+(\d+)x1\s+(\S+)\s+(.*)$/gm)].map((m) => {
    const kv = Object.fromEntries((m[5] ?? '').trim().split(/\s+/).map((p) => p.split('=') as [string, string]));
    return {
      col: Number(m[1]),
      row: Number(m[2]),
      width: Number(m[3]),
      kind: m[4] ?? '',
      speed: Number(kv['speed']),
      phase: Number(kv['phase'] ?? 0),
      path: (kv['path'] ?? '').split(',').map((t) => [t.charAt(0), Number(t.slice(1))] as const),
    };
  });
}

/** Top-left cell of the slab at kinetic step t: the path model of moving-objects.md (speed in 32nds of a tile per step). */
export function moverAt(m: MoverSpec, t: number): { x: number; y: number } {
  const legSteps = ([c, n]: readonly [string, number]): number => (c === 'w' ? n : (n * 32) / m.speed);
  const cycle = m.path.reduce((a, leg) => a + legSteps(leg), 0);
  let p = (t + m.phase) % cycle;
  let x = m.col;
  let y = m.row;
  const dir: Record<string, [number, number]> = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
  for (const leg of m.path) {
    const dur = legSteps(leg);
    const [c, n] = leg;
    if (c === 'w') {
      if (p < dur) return { x, y };
    } else {
      const [dx, dy] = dir[c] as [number, number];
      if (p < dur) return { x: x + dx * ((p * m.speed) / 32), y: y + dy * ((p * m.speed) / 32) };
      x += dx * n;
      y += dy * n;
    }
    p -= dur;
  }
  return { x, y };
}

export interface EmitterSpec {
  readonly col: number;
  readonly row: number;
  readonly dir: string;
  readonly range: number;
  readonly speed: number;
  readonly period: number;
  readonly phase: number;
}

export function parseEmitters(text: string): EmitterSpec[] {
  return [...text.matchAll(/^emitter:\s*(\d+)\s+(\d+)\s+(.*)$/gm)].map((m) => {
    const kv = Object.fromEntries((m[3] ?? '').trim().split(/\s+/).map((p) => p.split('=') as [string, string]));
    return { col: Number(m[1]), row: Number(m[2]), dir: kv['dir'] ?? '', range: Number(kv['range']), speed: Number(kv['speed']), period: Number(kv['period']), phase: Number(kv['phase'] ?? 0) };
  });
}

/** The glow is on for the last `min(18, period / 2)` steps before a shot leaves (projectiles.md: emitterTellMs 300 = 18 steps). */
export function tellExpected(e: EmitterSpec, t: number): boolean {
  const len = Math.min(18, Math.floor(e.period / 2));
  return (e.period - ((t + e.phase) % e.period)) % e.period < len;
}

/** Shots alive at kinetic step t: one leaves on every step s with (s + phase) mod period = 0, flies speed/32 tiles per step for range tiles. */
export function shotsExpected(e: EmitterSpec, t: number): { firedAt: number; x: number; y: number }[] {
  const life = (e.range * 32) / e.speed;
  const v = ({ l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] } as Record<string, [number, number]>)[e.dir] as [number, number];
  const out: { firedAt: number; x: number; y: number }[] = [];
  for (let s = Math.max(0, t - life + 1); s <= t; s += 1) {
    if ((s + e.phase) % e.period !== 0) continue;
    const d = ((t - s) * e.speed) / 32;
    out.push({ firedAt: s, x: e.col + 0.5 + v[0] * d, y: e.row + 0.5 + v[1] * d });
  }
  return out;
}

export interface PostSpec {
  readonly col: number;
  readonly row: number;
  readonly clock: number;
}

export function parsePosts(text: string): PostSpec[] {
  return [...text.matchAll(/^checkpoint:\s*(\d+)\s+(\d+)(?:\s+clock=(\d+))?/gm)].map((m) => ({ col: Number(m[1]), row: Number(m[2]), clock: Number(m[3] ?? 0) }));
}

/** Everything the Game scene draws that is a checkpoint post sprite: its frame name, position and visibility. */
export function postSprites(page: Page): Promise<{ frame: string; x: number; y: number; visible: boolean }[]> {
  return page.evaluate(() => {
    const g = (window as unknown as { __game?: { scene: { getScene(k: string): unknown } } }).__game;
    const s = g?.scene.getScene('Game') as { children?: { list: { frame?: { name: string }; x: number; y: number; visible: boolean }[] } } | undefined;
    return (s?.children?.list ?? []).filter((o) => o.frame?.name.startsWith('checkpoint/')).map((o) => ({ frame: o.frame?.name ?? '', x: o.x, y: o.y, visible: o.visible }));
  });
}

/** The drawn pieces of one emitter: its body frame and the additive glow image over it (null when not drawn). */
export function emitterDrawn(page: Page, col: number, row: number): Promise<{ body: string | null; glowVisible: boolean | null; glowAlpha: number | null }> {
  return page.evaluate(
    ([c, r]) => {
      const g = (window as unknown as { __game?: { scene: { getScene(k: string): unknown } } }).__game;
      const s = g?.scene.getScene('Game') as { children?: { list: { frame?: { name: string }; x: number; y: number; visible: boolean; alpha: number }[] } } | undefined;
      const list = s?.children?.list ?? [];
      const ts = 16;
      const body = list.find((o) => o.frame?.name.startsWith('emitter/') && o.x === (c as number) * ts && o.y === (r as number) * ts);
      const glow = list.find((o) => o.frame?.name.startsWith('bolt/shimmer/') && o.x === ((c as number) + 0.5) * ts && o.y === ((r as number) + 0.5) * ts);
      return { body: body?.frame?.name ?? null, glowVisible: glow ? glow.visible : null, glowAlpha: glow ? glow.alpha : null };
    },
    [col, row] as const,
  );
}

/** Expect a number to equal another within float noise (positions are multiples of 1/32). */
export function near(actual: number, expected: number, message: string): void {
  expect(Math.abs(actual - expected), `${message}: ${actual} vs ${expected}`).toBeLessThan(1e-6);
}
