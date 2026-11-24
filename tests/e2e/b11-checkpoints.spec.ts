/**
 * B11-19, checkpoints in the real build (checkpoints.md acceptance 2, 3, 4, 6, 8; readability). Frame-locked through
 * `Clocked`: the solution recording is typed in as key events up to the post, then the test takes over and dies on
 * purpose. Evidence: docs/qa/evidence/b11-post-*.png.
 */
import type { Page } from '@playwright/test';
import { TEST_TIMEOUT_MS, cameraScroll, expect, seedSave, test } from './helpers';
import { Clocked, EVIDENCE_DIR, levelText, moverAt, near, parseMovers, parsePosts, postSprites, recordingFrames, type Obs } from './b11-helpers';

test.describe.configure({ timeout: 400_000 + TEST_TIMEOUT_MS });

/** A 2x close-up of the first post (canvas is 480x270 shown at 960x540), for evidence. */
async function cropPost(page: Page, path: string): Promise<void> {
  const [sprite] = await postSprites(page);
  const cam = await cameraScroll(page);
  if (!sprite) return;
  const sx = (sprite.x - cam.x) * 2;
  const sy = (sprite.y - cam.y) * 2;
  const x = Math.max(0, Math.min(960 - 160, Math.round(sx - 80)));
  const y = Math.max(0, Math.min(540 - 160, Math.round(sy - 130)));
  await page.screenshot({ path, clip: { x, y, width: 160, height: 160 } });
}

/** Drive the recording until post 0 is lit (returns that observation), taking idle and lit screenshots on the way when asked. */
async function toFirstPost(c: Clocked, id: string, shots?: { idle: string; lit: string }, frames?: string[]): Promise<Obs> {
  await c.script(recordingFrames(id));
  const post = parsePosts(levelText(id))[0]!;
  let idleDone = false;
  const lit = await c.run((o) => o.checkpoint === 0, 2500, async (o) => {
    frames?.push((await postSprites(c.page))[0]?.frame ?? 'none');
    if (shots && !idleDone && o.player.x > post.col - 9 && o.checkpoint === null) {
      idleDone = true;
      await c.page.screenshot({ path: shots.idle });
      await cropPost(c.page, shots.idle.replace('.png', '-crop.png'));
    }
  });
  if (shots) {
    await c.frames(40);
    await c.page.screenshot({ path: shots.lit });
    await cropPost(c.page, shots.lit.replace('.png', '-crop.png'));
  }
  return lit;
}

/** After the post: stop the script and die on purpose (gear 4 into a bridge or pit), releasing the keys at the death. */
async function dieOnPurpose(c: Clocked): Promise<Obs> {
  await c.script(null);
  for (let i = 0; i < 3; i += 1) await c.tap('ShiftRight');
  await c.hold('ArrowRight', true);
  const dead = await c.run((o) => o.status === 'dead', 900);
  await c.hold('ArrowRight', false);
  return dead;
}

test('item 4: w2-05 a death after post 0 respawns at the post; level time keeps running; R restarts with the post unlit', async ({ page }) => {
  const post = parsePosts(levelText('w2-05'))[0]!;
  const c = await Clocked.open(page, '?level=w2-05');
  const lit = await toFirstPost(c, 'w2-05');
  expect(lit.player.x, 'lit when the box reaches the post column').toBeGreaterThan(post.col - 1);
  const dead = await dieOnPurpose(c);
  expect(dead.checkpoint, 'still lit at the moment of death').toBe(0);
  const back = await c.run((o) => o.status === 'playing' && o.step > dead.step, 200);
  expect(back.checkpoint, 'post still lit after the respawn').toBe(0);
  near(back.player.x, post.col + 0.5, 'respawn x is the post cell centre');
  expect(back.player.gear, 'startGear').toBe(1);
  expect(back.player.band).toBe(0);
  expect(back.player.vx).toBe(0);
  expect(back.step, 'level time is not reset: death freeze included').toBeGreaterThanOrEqual(dead.step + 24);
  expect(back.k, 'kinetic clock restarts at the post (clock=0)').toBeLessThanOrEqual(2);
  // R: full restart.
  await c.hold('KeyR', true);
  await c.frame();
  await c.hold('KeyR', false);
  const fresh = await c.run((o) => o.status === 'playing' && o.step < 10, 60);
  expect(fresh.checkpoint, 'R clears the post').toBeNull();
  expect(fresh.player.x, 'spawn, not the post').toBeLessThan(3);
  expect(fresh.k).toBe(fresh.step);
});

test('item 4: w4-05 after a post respawn the slabs run on the post clock (kineticStep = clock=)', async ({ page }) => {
  const text = levelText('w4-05');
  const post = parsePosts(text)[0]!;
  const movers = parseMovers(text);
  const c = await Clocked.open(page, '?level=w4-05');
  const lit = await toFirstPost(c, 'w4-05');
  expect(lit.checkpoint).toBe(0);
  const dead = await dieOnPurpose(c);
  const back = await c.run((o) => o.status === 'playing' && o.step > dead.step, 200);
  expect(back.checkpoint).toBe(0);
  expect(back.k, 'the first observed step after the respawn is on the post clock').toBeGreaterThanOrEqual(post.clock);
  expect(back.k).toBeLessThanOrEqual(post.clock + 2);
  expect(back.step, 'level time kept running').toBeGreaterThan(dead.step);
  const after = [back];
  await c.frames(40, (o) => {
    after.push(o);
  });
  for (const o of after) {
    movers.forEach((m, i) => {
      const want = moverAt(m, o.k);
      near(o.kinetics!.movers[i]!.x, want.x, `slab ${i} x at k ${o.k}`);
      near(o.kinetics!.movers[i]!.y, want.y, `slab ${i} y at k ${o.k}`);
    });
  }
  // The clock advances one per step from the respawn.
  expect(after[after.length - 1]!.k - back.k).toBe(after[after.length - 1]!.step - back.step);
});

test('item 7: the idle post and the lit post, in the real build (evidence)', async ({ page }) => {
  await seedSave(page, {}); // marks the Sticky Keys tip shown so it does not cover the picture
  const frames: string[] = [];
  const c = await Clocked.open(page, '?level=w2-05');
  await toFirstPost(c, 'w2-05', { idle: `${EVIDENCE_DIR}b11-post-idle.png`, lit: `${EVIDENCE_DIR}b11-post-lit.png` }, frames);
  expect(frames[0], 'idle frame before the post is reached').toBe('checkpoint/idle');
  expect(frames.at(-1), 'lit at the end').toMatch(/^checkpoint\/(lit|rise\/\d)$/);
  const seq = frames.filter((f, i) => i === 0 || f !== frames[i - 1]);
  expect(seq[0]).toBe('checkpoint/idle');
  expect(seq.some((f) => f.startsWith('checkpoint/rise/')), `rise frames in normal motion: ${seq.join(' > ')}`).toBe(true);
});

test('item 6: reduced motion shows the post lit without the rise', async ({ page }) => {
  await seedSave(page, { settings: { reducedMotion: true } });
  const frames: string[] = [];
  const c = await Clocked.open(page, '?level=w2-05');
  await toFirstPost(c, 'w2-05', undefined, frames);
  await c.frames(30, async () => {
    frames.push((await postSprites(page))[0]?.frame ?? 'none');
  });
  const seq = frames.filter((f, i) => i === 0 || f !== frames[i - 1]);
  expect(seq, 'idle straight to lit').toEqual(['checkpoint/idle', 'checkpoint/lit']);
});
