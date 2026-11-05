/**
 * Keyboard bindings on the grey-box room (w0-02), read through the QA hook.
 * Spec: movement-and-gears.md check 17 (alternate bindings), GDD section 3.
 * Right Shift / E / X shift up; Left Shift / Q / Z shift down; all active at once.
 */
import { armAirPress, jumpAndPressInAir, TEST_TIMEOUT_MS, expect, pollState, snapshot, startTracker, stopTracker, test, waitForHook, walkIntoOpenPit } from './helpers';

test.describe.configure({ timeout: TEST_TIMEOUT_MS });

const LEVEL = 'w0-02';
const SHIFT_UP = ['ShiftRight', 'KeyE', 'KeyX'] as const;
const SHIFT_DOWN = ['ShiftLeft', 'KeyQ', 'KeyZ'] as const;

test.beforeEach(async ({ page }) => {
  await page.goto(`./?level=${LEVEL}`);
  await waitForHook(page);
  // Click the canvas so it has focus, as a player would in the itch.io embed.
  await page.locator('#game canvas').click();
  await pollState(page, (s) => s.state.player.grounded, 'player grounded at spawn').toBe(true);
});

test('spawns standing in gear 1', async ({ page }) => {
  const s = await snapshot(page);
  expect(s?.levelId).toBe(LEVEL);
  expect(s?.state.status).toBe('playing');
  expect(s?.state.player.gear).toBe(1);
  expect(s?.state.player.vx).toBe(0);
});

for (const key of SHIFT_UP) {
  test(`${key} raises the selected gear by one per press`, async ({ page }) => {
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after ${key}`).toBe(2);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after second ${key}`).toBe(3);
  });
}

for (const key of SHIFT_DOWN) {
  test(`${key} lowers the selected gear by one per press`, async ({ page }) => {
    // Climb to gear 3 with Right Shift, then come down with the key under test.
    await page.keyboard.press('ShiftRight');
    await pollState(page, (s) => s.state.player.gear).toBe(2);
    await page.keyboard.press('ShiftRight');
    await pollState(page, (s) => s.state.player.gear).toBe(3);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after ${key}`).toBe(2);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.player.gear, `gear after second ${key}`).toBe(1);
  });
}

test('gear clamps at 1 and 4 and extra presses are not stored', async ({ page }) => {
  await page.keyboard.press('ShiftLeft');
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyZ');
  // A later press proves the clamped ones were dropped rather than stored.
  await page.keyboard.press('KeyE');
  await pollState(page, (s) => s.state.player.gear, 'clamped low, then one up').toBe(2);
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ShiftRight');
  await pollState(page, (s) => s.state.player.gear, 'clamped high').toBe(4);
  await page.keyboard.press('KeyX');
  await page.keyboard.press('KeyZ');
  await pollState(page, (s) => s.state.player.gear, 'one up at the cap, one down').toBe(3);
});

test('holding a shift key does not auto-repeat the gear change', async ({ page }) => {
  await page.keyboard.down('ShiftRight');
  await pollState(page, (s) => s.state.player.gear).toBe(2);
  // Browser key-repeat events while the key stays down.
  for (let i = 0; i < 5; i += 1) await page.keyboard.down('ShiftRight');
  const at = (await snapshot(page))?.state.step ?? 0;
  await pollState(page, (s) => s.state.step >= at + 30, 'sim advances 30 steps').toBe(true);
  await pollState(page, (s) => s.state.player.gear).toBe(2);
  await page.keyboard.up('ShiftRight');
});

test('holding ArrowRight moves the player right; letting go stops it and keeps the gear', async ({ page }) => {
  const start = (await snapshot(page))?.state.player.x ?? 0;
  await page.keyboard.down('ArrowRight');
  await pollState(page, (s) => s.state.player.x > start + 1, 'player moved right').toBe(true);
  await pollState(page, (s) => s.state.player.vx > 0, 'positive speed while held').toBe(true);
  await page.keyboard.up('ArrowRight');
  await pollState(page, (s) => s.state.player.vx === 0, 'speed returns to 0 after release').toBe(true);
  await pollState(page, (s) => s.state.player.gear).toBe(1);
});

test('D and A move the player like the arrows', async ({ page }) => {
  const start = (await snapshot(page))?.state.player.x ?? 0;
  await page.keyboard.down('KeyD');
  await pollState(page, (s) => s.state.player.x > start + 0.5, 'D moves right').toBe(true);
  await page.keyboard.up('KeyD');
  await pollState(page, (s) => s.state.player.vx === 0).toBe(true);
  const mid = (await snapshot(page))?.state.player.x ?? 0;
  await page.keyboard.down('KeyA');
  await pollState(page, (s) => s.state.player.x < mid - 0.5, 'A moves left').toBe(true);
  await page.keyboard.up('KeyA');
});

// Jumps happen in the open pit (see walkIntoOpenPit); a jump at the spawn pad is a full arc too since w0-02 v2 (m2-additions.spec.ts).
test('Space, W and ArrowUp each jump a full 3-tile arc and land on the floor', async ({ page }) => {
  const floorY = await walkIntoOpenPit(page);
  for (const key of ['Space', 'KeyW', 'ArrowUp']) {
    const before = (await snapshot(page))?.state.step ?? 0;
    await startTracker(page);
    await page.keyboard.press(key);
    await pollState(page, (s) => s.state.step >= before + 60 && s.state.player.grounded, `${key} jumped and landed`).toBe(true);
    const track = await stopTracker(page);
    const apex = floorY - Math.min(...track.map((t) => t.y));
    expect(track.some((t) => !t.grounded), `${key} left the ground`).toBe(true);
    expect(apex, `${key} apex height in tiles (spec: 3.00)`).toBeGreaterThan(2);
    expect((await snapshot(page))?.state.player.y, `${key} landed back on the floor`).toBeCloseTo(floorY, 6);
  }
});

// GDD 4.x / air-drag.md checks 13-14: gear is committed at takeoff. A shift pressed in the air only
// applies if it falls in the shift buffer (4 steps = 100 ms before landing). Playtest 2026-11-02 said
// shifts in the air still changed the gear. The press goes in on the first airborne frame, at least 10 steps
// before touchdown (checked from the recorded frames), and the gear must stay.
for (const key of ['KeyE', 'ShiftRight', 'KeyX'] as const) {
  test(`${key} pressed early in a jump does not change the gear (shift buffer is 100 ms)`, async ({ page }) => {
    const floorY = await walkIntoOpenPit(page);
    // Standing is band 0, so the gear drops to 1 at takeoff anyway (air-drag.md check 11); stay at 1.
    let proven = false;
    for (let attempt = 0; attempt < 6 && !proven; attempt += 1) {
      const s0 = (await snapshot(page))?.state.step ?? 0;
      await startTracker(page);
      const armed = await armAirPress(page, key);
      await page.keyboard.press('Space');
      const { step: pressStep } = await armed.result();
      await pollState(page, (s) => s.state.step >= s0 + 70 && s.state.player.grounded, 'landed').toBe(true);
      const track = await stopTracker(page);
      // The player was still airborne in a sample at lastAir, so landing is at least lastAir + 1: the press was
      // at least 10 steps (twice the 4-step buffer, plus margin) before touchdown only if lastAir >= pressStep + 9.
      const lastAir = Math.max(...track.filter((t) => !t.grounded).map((t) => t.step));
      if (lastAir < pressStep + 9) continue; // frame rate too low for this attempt to prove anything: jump again
      proven = true;
      const gears = track.filter((t) => t.step >= pressStep).map((t) => t.gear);
      expect(gears.length, 'tracker saw frames after the press').toBeGreaterThan(0);
      expect(Math.max(...gears), `${key} in the air: selected gear never went up`).toBe(1);
      expect((await snapshot(page))?.state.player.y).toBeCloseTo(floorY, 6);
    }
    expect(proven, 'got a press at least 10 steps before landing within 6 attempts').toBe(true);
    const landed = (await snapshot(page))?.state.step ?? 0;
    await pollState(page, (s) => s.state.step >= landed + 30, '30 steps after landing').toBe(true);
    await pollState(page, (s) => s.state.player.gear, 'gear still 1 after landing (the early press was dropped, not stored)').toBe(1);
  });
}

// Shift buffer through the scene (air-drag.md checks 13-14, hud-gear-meter.md check 7; design ruling 2026-11-03).
// A standing jump in the pit is a 48-step flight at gear 1. The buffer is 6 steps (100 ms): a press on flight
// step 10 is long expired at touchdown and is dropped; a press within 6 steps of touchdown is applied on landing.
// Press steps are exact in the page (armAirPress); whether an attempt proves anything is judged from the
// per-frame samples, and an attempt a slow frame rate spoiled is repeated.
const SHIFT_BUFFER_STEPS = 6;
const AIR_PRESS_ATTEMPTS = 14;

test('KeyE pressed on flight step 10 of a 48-step jump is dropped: gear 1 in the air and after landing', async ({ page }) => {
  await walkIntoOpenPit(page);
  let proven = false;
  for (let attempt = 0; attempt < AIR_PRESS_ATTEMPTS && !proven; attempt += 1) {
    const run = await jumpAndPressInAir(page, 'KeyE', { afterSteps: 10 });
    if (!run) continue;
    // Applied from pressStep + 1, expired after 6 steps; touchdown is at least lastAirStep + 1. A margin of 3 steps.
    if (run.lastAirStep < run.pressStep + SHIFT_BUFFER_STEPS + 3) continue;
    proven = true;
    const after = run.track.filter((t) => t.step >= run.pressStep);
    expect(Math.max(...after.map((t) => t.gear)), 'selected gear never rises in the air or on landing').toBe(1);
    const landed = (await snapshot(page))?.state.step ?? 0;
    await pollState(page, (s) => s.state.step >= landed + 30, '30 steps after landing').toBe(true);
    await pollState(page, (s) => s.state.player.gear, 'gear 1 after landing: the early press was dropped, not stored').toBe(1);
  }
  expect(proven, 'got a press at least 9 steps before landing').toBe(true);
});

test('KeyE pressed within 6 steps of landing is buffered in the air (gear 1) and applied on landing (gear 2)', async ({ page }) => {
  await walkIntoOpenPit(page);
  let proven = false;
  for (let attempt = 0; attempt < AIR_PRESS_ATTEMPTS && !proven; attempt += 1) {
    // Only the last five steps of the 48-step flight qualify and headless frames carry ~3 steps each: press on the
    // first frame falling at 11.5 tiles/s or more (flight step 43+) and let the samples decide (more attempts).
    const run = await jumpAndPressInAir(page, 'KeyE', { minVy: 11.5 });
    if (!run) continue;
    // Press applied on pressStep + 1 at the earliest; landing happened at or before landedByStep. Within the
    // window (touchdown no later than pressStep + 5) the buffered shift must apply, whatever the frame rate.
    if (run.landedByStep - run.pressStep > SHIFT_BUFFER_STEPS - 1) continue;
    proven = true;
    const air = run.track.filter((t) => !t.grounded && t.step >= run.pressStep);
    expect(Math.max(...air.map((t) => t.gear)), 'gear is not shifted while still in the air').toBe(1);
    // The HUD pending-shift bracket reads these two fields (hud-gear-meter.md): when sampled in the air after the press, net is +1.
    const buffered = air.filter((t) => t.shiftBufferSteps > 0);
    for (const t of buffered) expect(t.shiftBufferNet, `buffered press at step ${t.step}`).toBe(1);
    await pollState(page, (s) => s.state.player.gear, 'gear 2 after landing: the late press was applied').toBe(2);
    expect((await snapshot(page))?.state.player.grounded).toBe(true);
  }
  expect(proven, 'got a press within 5 steps of landing').toBe(true);
});

test('bound keys are captured: default prevented and the page does not scroll', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as unknown as { __prevented: Record<string, boolean> };
    w.__prevented = {};
    // Registered after the game's own listener on the same target, so it runs after it.
    window.addEventListener('keydown', (e) => {
      w.__prevented[e.code] = e.defaultPrevented;
    });
    const spacer = document.createElement('div');
    spacer.style.cssText = 'height:5000px;width:1px';
    document.body.appendChild(spacer);
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  });
  const codes = ['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX'];
  for (const code of codes) await page.keyboard.press(code);
  await pollState(page, (s) => s.state.step > 5).toBe(true);
  const result = await page.evaluate(() => ({
    prevented: (window as unknown as { __prevented: Record<string, boolean> }).__prevented,
    scrollY: window.scrollY,
  }));
  for (const code of codes) expect(result.prevented[code], `${code} defaultPrevented`).toBe(true);
  expect(result.scrollY, 'page scrollY').toBe(0);
});
