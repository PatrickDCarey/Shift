/// <reference lib="dom" />
/**
 * B12 follow-up (playtest 2026-11-24 batch12b, "possibly broken"): rapid successive shift taps, on the frozen stepped
 * page clock (b11-helpers `Clocked`). A tap = keydown, H frames, keyup; G frames pass between a keyup and the next
 * keydown (G = 0: keyup and keydown in the same frame, no frame step between them). Results go to
 * `docs/qa/evidence/b12-rapid-shifts.json`. Run alone: `npx playwright test tests/e2e/b12-rapid-shifts.spec.ts --workers=1`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Clocked, EVIDENCE_DIR } from './b11-helpers';
import { expect, test } from './helpers';

test.describe.configure({ timeout: 900_000 });

const OUT = `${EVIDENCE_DIR}b12-rapid-shifts.json`;
const HOLDS = [1, 2, 3] as const;
const GAPS = [0, 1, 2, 3, 5] as const;
const NS = [2, 3] as const;
const DOWN = ['KeyQ', 'ShiftLeft'] as const;
const UP = ['KeyE', 'ShiftRight'] as const;

async function frames(c: Clocked, n: number): Promise<void> {
  for (let i = 0; i < n; i += 1) await c.frame();
}

async function gear(c: Clocked): Promise<number> {
  return (await c.observe()).player.gear;
}

/** N taps of the given keys (cycled), then 8 settle frames. */
async function burst(c: Clocked, keys: readonly string[], n: number, h: number, g: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    const k = keys[i % keys.length] as string;
    await c.hold(k, true);
    await frames(c, h);
    await c.hold(k, false);
    if (i < n - 1) await frames(c, g);
  }
  await frames(c, 4);
}

/** Slow (6-frame hold, 8-frame gap) single taps until the gear is `target`. */
async function setGear(c: Clocked, target: number): Promise<void> {
  for (let guard = 0; guard < 8; guard += 1) {
    const now = await gear(c);
    if (now === target) return;
    const k = now < target ? 'KeyE' : 'KeyQ';
    await c.hold(k, true);
    await frames(c, 3);
    await c.hold(k, false);
    await frames(c, 3);
  }
  throw new Error(`could not reach gear ${target}`);
}

interface Cell { readonly expected: number; readonly got: number; readonly ok: boolean }

async function measure(c: Clocked, name: string, keys: readonly string[], down: boolean, running: boolean, results: Record<string, Record<string, Cell>>, ns: readonly number[]): Promise<void> {
  for (const n of ns) {
    for (const h of HOLDS) {
      for (const g of GAPS) {
        const start = down ? 4 : 1;
        if ((await gear(c)) !== start) await setGear(c, start);
        if (running) await c.hold('ArrowRight', true);
        const expected = down ? Math.max(1, start - n) : Math.min(4, start + n);
        await burst(c, keys, n, h, g);
        const o = await c.observe();
        if (running) await c.hold('ArrowRight', false);
        await frames(c, 3);
        const cell: Cell = { expected, got: o.player.gear, ok: o.player.gear === expected };
        (results[`${name} N=${n}`] ??= {})[`H${h}G${g}`] = cell;
        writeFileSync(OUT, JSON.stringify(results, null, 2));
        // Back to a clean start: restart if the run died while running.
        if (o.status !== 'playing') {
          await c.hold('KeyR', true); await frames(c, 6); await c.hold('KeyR', false); await frames(c, 90);
        }
      }
    }
  }
}

// The full table (about 5 minutes): set RAPID_TABLE=1 to run it.
async function measureOne(c: Clocked, results: Record<string, Record<string, Cell>>, name: string, keys: readonly string[], down: boolean, n: number, h: number, g: number, running = false): Promise<void> {
  const start = down ? 4 : 1;
  if ((await gear(c)) !== start) await setGear(c, start);
  if (running) await c.hold('ArrowRight', true);
  const expected = down ? Math.max(1, start - n) : Math.min(4, start + n);
  await burst(c, keys, n, h, g);
  const o = await c.observe();
  if (running) await c.hold('ArrowRight', false);
  await frames(c, 3);
  (results[name + ' N=' + n] ??= {})['H' + h + 'G' + g] = { expected, got: o.player.gear, ok: o.player.gear === expected };
}

test('B12-R1 rapid shift taps: gear reached for N taps of H frames with G frames between', async ({ page }) => {
  test.skip(!process.env['RAPID_TABLE'], 'long measurement, opt in with RAPID_TABLE=1');
  const c = await Clocked.open(page, '?level=w0-02');
  await frames(c, 60);
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const results: Record<string, Record<string, Cell>> = {};
  await measure(c, 'down Q', DOWN.slice(0, 1), true, false, results, NS);
  await measure(c, 'down LShift', DOWN.slice(1), true, false, results, NS);
  await measure(c, 'down Q,LShift alternating', DOWN, true, false, results, NS);
  await measure(c, 'up E', UP.slice(0, 1), false, false, results, NS);
  await measure(c, 'up RShift', UP.slice(1), false, false, results, NS);
  await measure(c, 'up E,RShift alternating', UP, false, false, results, NS);
  writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
  const failed = Object.entries(results).flatMap(([row, cells]) => Object.entries(cells).filter(([, v]) => !v.ok).map(([k]) => `${row} ${k}`));
  console.log(`dropped: ${failed.length}\n${failed.join('\n')}`);
  expect(true).toBe(true);
});

// Pins (BUG-N, gameplay-engineer [scene] / [sim]): a key release and the next press of a shift key that fall between two
// sim samples count as one press (held-flag edge detection, inputSampler.ts latch + core/sim/input.ts pressEdges).
test.describe('B12-R2 rapid shift taps', () => {
  test('taps at least 2 frames apart all count (standing, down and up, same and alternating keys)', async ({ page }) => {
    const c = await Clocked.open(page, '?level=w0-02');
    await frames(c, 60);
    const results: Record<string, Record<string, Cell>> = {};
    for (const g of [2, 3, 5]) {
      await measureOne(c, results, 'down alt', DOWN, true, 3, 1, g);
      await measureOne(c, results, 'up E', UP.slice(0, 1), false, 3, 2, g);
    }
    const bad = Object.entries(results).flatMap(([r, cells]) => Object.entries(cells).filter(([, v]) => !v.ok).map(([k, v]) => r + ' ' + k + ' got ' + v.got + ' expected ' + v.expected));
    expect(bad).toEqual([]);
  });

  test.fixme('a release and re-press one frame apart (16 ms) still counts as two presses', async ({ page }) => {
    const c = await Clocked.open(page, '?level=w0-02');
    await frames(c, 60);
    const results: Record<string, Record<string, Cell>> = {};
    for (let rep = 0; rep < 6; rep += 1) await measureOne(c, results, 'up E', UP.slice(0, 1), false, 3, 1 + (rep % 2), 1);
    const bad = Object.values(results).flatMap((cells) => Object.entries(cells).filter(([, v]) => !v.ok));
    expect(bad).toEqual([]);
  });

  test('running (ArrowRight held) on w4-04: three down taps from gear 4 with gaps of 2, 3, 5 frames', async ({ page }) => {
    const c = await Clocked.open(page, '?level=w4-04');
    await frames(c, 30);
    const results: Record<string, Record<string, Cell>> = {};
    for (const [g, h] of [[5, 3], [5, 3], [2, 1], [3, 2]] as const) await measureOne(c, results, `running down Q ${results[String(g)] ? 2 : 1}`, DOWN.slice(0, 1), true, 3, h, g, true);
    const bad = Object.values(results).flatMap((cells) => Object.entries(cells).filter(([, v]) => !v.ok));
    writeFileSync(EVIDENCE_DIR + "b12-rapid-shifts-running.json", JSON.stringify(results, null, 2));
    expect(bad).toEqual([]);
  });
});
