/**
 * B11-19, movers and bolts in the real build (moving-objects.md, projectiles.md; GDD v1.12 4.16, 4.17).
 * Frame-locked through `Clocked` (b11-helpers.ts): the page clock is frozen and advanced one 60 Hz frame at a time,
 * so results do not depend on machine load. Expected positions come from the level headers via the oracles in
 * b11-helpers.ts, not from the sim. Evidence: docs/qa/evidence/b11-*.png.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, expect, listSolutions, pollState, readCues, seedSave, test, waitForHook } from './helpers';
import { Clocked, EVIDENCE_DIR, emitterDrawn, levelText, moverAt, near, parseEmitters, parseMovers, recordingFrames, shotsExpected, tellExpected, type Obs } from './b11-helpers';

test.describe.configure({ timeout: 300_000 + TEST_TIMEOUT_MS });

const NEW_LEVELS = ['w4-01', 'w4-02', 'w4-03', 'w4-05', 'w2-05', 'w5-01', 'w5-02', 'w5-03'] as const;
const steps = new Map(listSolutions().map((s) => [s.id, s.steps]));

for (const id of NEW_LEVELS) {
  test(`item 1: ${id} replays to a win in the browser (no console or page error)`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`./?level=${id}&replay=1&speed=60`);
    const first = await waitForHook(page);
    expect(first.levelId).toBe(id);
    await expect.poll(async () => (await page.evaluate(() => window.__redshift?.replay?.done)) === true, { timeout: 150_000, intervals: [250] }).toBe(true);
    await pollState(page, (s) => s.state.status).toBe('won');
    await pollState(page, (s) => s.state.wonAtStep).toBe(steps.get(id));
  });
}

test('item 2: w4-01 lift follows its path at every step; the runner rides it; evidence mid-ride', async ({ page }) => {
  const [lift] = parseMovers(levelText('w4-01'));
  expect(lift).toBeDefined();
  const all: Obs[] = [];
  let shot = false;
  const c = await Clocked.open(page, '?level=w4-01');
  await c.script(recordingFrames('w4-01'));
  const last = await c.run((o) => o.status === 'won' || o.status === 'dead', 900, async (o) => {
    all.push(o);
    const m = o.kinetics?.movers[0];
    const riding = !!m && o.player.grounded && o.player.x > 9 && o.player.x < 12 && Math.abs(o.player.y - m.y) < 1e-9;
    if (!shot && riding && m && m.y > 8.5 && m.y < 9.5) {
      shot = true;
      await page.screenshot({ path: `${EVIDENCE_DIR}b11-lift-mid-ride.png` });
    }
  });
  expect(last.status, 'the w4-01 recording wins when typed in live').toBe('won');
  expect(shot, 'rider seen mid-ride').toBe(true);
  for (const o of all) {
    const m = o.kinetics!.movers[0]!;
    const want = moverAt(lift!, o.kinetics!.step);
    near(m.x, want.x, `x at k ${o.kinetics!.step}`);
    near(m.y, want.y, `y at k ${o.kinetics!.step}`);
    expect(o.k, 'no post: kinetic clock equals the run step').toBe(o.step);
    if (o.k < 90) near(m.y, 12, `rest at k ${o.k}`);
    if (o.k >= 186 && o.k <= 276) near(m.y, 6, `top at k ${o.k}`);
  }
  const riders = all.filter((o) => o.player.grounded && o.player.x > 9 && o.player.x < 12 && Math.abs(o.player.y - o.kinetics!.movers[0]!.y) < 1e-9);
  expect(riders.length, 'frames spent standing on the lift').toBeGreaterThan(30);
  expect(Math.min(...riders.map((o) => o.player.y)), 'carried to the top').toBeLessThanOrEqual(6.0001);
  // Standing on it (no key held) the runner is white and keeps vy 0 (moving-objects check 2).
  const standing = riders.filter((o) => o.player.vx === 0);
  expect(standing.length).toBeGreaterThan(10);
  expect(standing.every((o) => o.player.band === 0 && o.player.vy === 0)).toBe(true);
});

test('item 2: w4-03 green slab is a ghost until the runner is green; evidence of both', async ({ page }) => {
  const [slab] = parseMovers(levelText('w4-03'));
  const all: Obs[] = [];
  let ghost = false;
  let solid = false;
  const c = await Clocked.open(page, '?level=w4-03');
  await c.script(recordingFrames('w4-03'));
  const last = await c.run((o) => o.status === 'won' || o.status === 'dead', 600, async (o) => {
    all.push(o);
    const m = o.kinetics?.movers[0];
    if (!ghost && o.step >= 20 && m && !m.holds) {
      ghost = true;
      await page.screenshot({ path: `${EVIDENCE_DIR}b11-slab-green-ghost.png` });
    }
    if (!solid && m?.holds && o.player.band === 2 && o.player.x > 12 && o.player.x < 16) {
      solid = true;
      await page.screenshot({ path: `${EVIDENCE_DIR}b11-slab-green-solid.png` });
    }
  });
  expect(last.status).toBe('won');
  for (const o of all) {
    const m = o.kinetics!.movers[0]!;
    const want = moverAt(slab!, o.kinetics!.step);
    near(m.x, want.x, `x at k ${o.k}`);
    near(m.y, want.y, `y at k ${o.k}`);
  }
  expect(all[0]?.kinetics?.movers[0]?.holds, 'white runner at the start: ghost').toBe(false);
  expect(all.some((o) => o.kinetics!.movers[0]!.holds), '`holds` flips to true while the runner is green').toBe(true);
  expect(all.some((o) => !o.kinetics!.movers[0]!.holds), '`holds` is false at other times').toBe(true);
  // A coloured slab never holds a white runner (you cannot stand on it).
  const standingOn = all.filter((o) => o.kinetics!.movers[0]!.holds && o.player.band === 0 && o.player.grounded && Math.abs(o.player.y - o.kinetics!.movers[0]!.y) < 1e-9 && o.player.x > 11 && o.player.x < 17);
  expect(standingOn).toEqual([]);
  expect(ghost && solid, `screenshots taken (ghost ${ghost}, solid ${solid})`).toBe(true);
});

test('item 3: w5-01 emitters tell before each shot, shots leave on the period and fly at the set speed (every step)', async ({ page }) => {
  const emitters = parseEmitters(levelText('w5-01'));
  expect(emitters.length).toBe(2);
  const c = await Clocked.open(page, '?level=w5-01'); // standing white at the spawn: red bolts pass through
  const seen = new Set<string>();
  let shotShot = false;
  let tellShot = false;
  const tellSteps: number[][] = emitters.map(() => []);
  await c.frames(260, async (o) => {
    const k = o.kinetics!;
    emitters.forEach((e, i) => {
      expect(k.emitters[i]?.tell, `emitter ${i} tell at k ${k.step}`).toBe(tellExpected(e, k.step));
      if (k.emitters[i]?.tell) tellSteps[i]!.push(k.step);
      const got = k.shots.filter((s) => s.emitter === i).sort((a, b) => a.firedAt - b.firedAt);
      const want = shotsExpected(e, k.step);
      expect(got.map((s) => s.firedAt), `shots of emitter ${i} at k ${k.step}`).toEqual(want.map((s) => s.firedAt));
      got.forEach((s, j) => {
        near(s.x, want[j]!.x, 'shot x');
        near(s.y, want[j]!.y, 'shot y');
        expect(s.firedAt % e.period, 'a shot leaves on the period').toBe(0);
        seen.add(`${i}:${s.firedAt}`);
      });
    });
    if (!tellShot && k.emitters[0]?.tell && k.step % 32 >= 24) {
      tellShot = true;
      await page.screenshot({ path: `${EVIDENCE_DIR}b11-bolt-lane-tell.png` });
    }
    if (!shotShot && k.shots.filter((s) => s.emitter === 0).length >= 2 && k.step > 70) shotShot = true;
  });
  expect(tellShot, 'tell screenshot').toBe(true);
  expect(shotShot, 'two bolts in flight in one lane').toBe(true);
  for (const [i, e] of emitters.entries()) {
    const fired = [...seen].filter((s) => s.startsWith(`${i}:`)).map((s) => Number(s.split(':')[1])).sort((a, b) => a - b);
    fired.forEach((f, j) => {
      if (j > 0) expect(f - fired[j - 1]!).toBe(e.period);
    });
    for (const f of fired.filter((x) => x >= e.period)) {
      const before = tellSteps[i]!.filter((t) => t > f - 18 && t <= f);
      expect(before.length, `tell run before the shot at ${f} (emitter ${i})`).toBeGreaterThanOrEqual(15);
    }
  }
});

test('item 3: w5-01 a red sprint through the red lane dies with the hit death, then the level restarts', async ({ page }) => {
  const c = await Clocked.open(page, '?level=w5-01');
  for (let i = 0; i < 3; i += 1) await c.tap('ShiftRight'); // gear 4
  await c.hold('ArrowRight', true);
  let peakX = 0;
  let lastAlive: Obs | null = null;
  const died = await c.run((o) => o.status === 'dead', 400, (o) => {
    if (o.status === 'playing') lastAlive = o;
    peakX = Math.max(peakX, o.player.x);
  });
  await c.hold('ArrowRight', false);
  expect(died.status).toBe('dead');
  expect(peakX, 'died in the test lane (col 12), before the bridge').toBeLessThan(16);
  expect(peakX).toBeGreaterThan(11);
  expect((lastAlive as Obs | null)?.player.band, 'red when hit').toBe(4);
  const cues = (await readCues(page)).map((q) => q.cue);
  expect(cues, 'the hit death cue, not the fall cue').toContain('hitDeath');
  expect(cues).not.toContain('reset');
  const back = await c.run((o) => o.status === 'playing' && o.step < 30, 120);
  expect(back.player.x).toBeLessThan(2);
  expect(back.k).toBe(back.step);
  expect(back.kinetics!.shots.every((s) => s.firedAt === 0), 'lane holds only the s = 0 shots').toBe(true);
});

test('item 3: w5-02 stopping on the white-rain pad is a hit death; running through it is not', async ({ page }) => {
  const c = await Clocked.open(page, '?level=w5-02');
  await c.script(recordingFrames('w5-02'));
  let hitWhileMoving = false;
  await c.run((o) => o.player.x > 13.6 && o.player.grounded, 600, (o) => {
    if (o.status === 'dead') hitWhileMoving = true;
  });
  expect(hitWhileMoving, 'the recorded run is not hit up to the pad').toBe(false);
  await c.script(null); // let go on the pad: from sprint the runner stops inside the white rain
  let lastAlive: Obs | null = null;
  const dead = await c.run((o) => o.status === 'dead' || o.status === 'won', 400, (o) => {
    if (o.status === 'playing') lastAlive = o;
  });
  expect(dead.status).toBe('dead');
  expect((lastAlive as Obs | null)?.player.band, 'hit only once standing still (band 0)').toBe(0);
  expect((await readCues(page)).map((q) => q.cue)).toContain('hitDeath');
});

interface TellRun {
  readonly glowVisible: (boolean | null)[];
  readonly alphas: number[];
  readonly bodies: string[];
}

async function tellRun(p: Page): Promise<TellRun> {
  const e = parseEmitters(levelText('w5-01'))[0]!;
  const c = await Clocked.open(p, '?level=w5-01');
  const out = { glowVisible: [] as (boolean | null)[], alphas: [] as number[], bodies: [] as string[] };
  let prevTell = false;
  await c.frames(70, async (o) => {
    const tell = o.kinetics?.emitters[0]?.tell === true;
    const first = tell && !prevTell; // the drawn frame trails the hook by one render frame at the start of a tell
    prevTell = tell;
    if (!tell || first) return;
    const d = await emitterDrawn(p, e.col, e.row);
    out.glowVisible.push(d.glowVisible);
    if (d.glowAlpha !== null) out.alphas.push(Math.round(d.glowAlpha * 1000) / 1000);
    out.bodies.push(d.body ?? 'none');
  });
  return out;
}

test('item 6: normal effects animate the tell glow (contrast for the reduced cases)', async ({ page }) => {
  const normal = await tellRun(page);
  expect(normal.bodies.length).toBeGreaterThan(10);
  expect(normal.bodies.every((b) => b.endsWith('/tell')), 'tell frame on the body').toBe(true);
  expect(normal.glowVisible.every((v) => v === true), 'glow visible in normal mode').toBe(true);
  expect(new Set(normal.alphas).size, 'glow rises (animated) in normal mode').toBeGreaterThan(3);
});

for (const setting of ['reducedEffects', 'reducedMotion'] as const) {
  test(`item 6: ${setting} replaces the tell glow with the static tell frame`, async ({ page }) => {
    await seedSave(page, { settings: { [setting]: true } });
    const r = await tellRun(page);
    expect(r.bodies.length).toBeGreaterThan(10);
    expect(r.bodies.every((b) => b.endsWith('/tell')), `static tell frame on the body (saw ${[...new Set(r.bodies)].join(', ')})`).toBe(true);
    expect(r.glowVisible.every((v) => v !== true), 'no animated glow').toBe(true);
  });
}
