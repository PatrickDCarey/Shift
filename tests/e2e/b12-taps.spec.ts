/// <reference lib="dom" />
/**
 * B12 QA line 1 (design-lead, 2026-11-24): short key taps on menus and in game, on the frozen stepped page clock
 * (b11-helpers `Clocked`). A tap of N frames = keydown, N rendered frames, keyup. Results go to
 * `docs/qa/evidence/b12-taps.json`. Run alone: `npx playwright test tests/e2e/b12-taps.spec.ts --workers=1`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Clocked, EVIDENCE_DIR } from './b11-helpers';
import { activeScenes, menuModel, test, type SceneName } from './helpers';

test.describe.configure({ timeout: 900_000 });

const HOLDS = [1, 2, 3, 4, 5, 6] as const;
const OUT = `${EVIDENCE_DIR}b12-taps.json`;
const MENUS: readonly SceneName[] = ['Title', 'LevelSelect', 'Pause', 'Settings', 'Controls'];

function record(key: string, value: unknown): void {
  let all: Record<string, unknown> = {};
  try {
    all = JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>;
  } catch {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
  all[key] = value;
  writeFileSync(OUT, `${JSON.stringify(all, null, 2)}\n`);
}

/** Scenes plus every menu scene's model: any change means a key did something. */
async function sig(c: Clocked): Promise<string> {
  const scenes = (await activeScenes(c.page)).sort();
  const models: string[] = [];
  for (const m of MENUS) if (scenes.includes(m)) models.push(JSON.stringify(await menuModel(c.page, m)));
  return `${scenes.join(',')}|${models.join('|')}`;
}

async function settle(c: Clocked, n = 45): Promise<void> {
  for (let i = 0; i < n; i += 1) await c.frame();
}

/** keydown, n frames, keyup, settle. */
async function tapN(c: Clocked, code: string, n: number): Promise<void> {
  await c.hold(code, true);
  for (let i = 0; i < n; i += 1) await c.frame();
  await c.hold(code, false);
  await settle(c);
}

/** Tap `code` for each hold length; before each, `ready` brings the screen to its start state; `reset` undoes a registered tap with 6-frame taps. */
async function table(c: Clocked, name: string, code: string, reset: () => Promise<void>, out: Record<string, Record<number, boolean>>): Promise<void> {
  const row: Record<number, boolean> = {};
  for (const n of HOLDS) {
    const before = await sig(c);
    await tapN(c, code, n);
    const after = await sig(c);
    row[n] = after !== before;
    if (row[n]) await reset();
  }
  out[name] = row;
}

test('B12-T1 menu taps of 1..6 frames on title, level select, pause, settings and controls', async ({ page }) => {
  const c = await Clocked.openMenus(page);
  const out: Record<string, Record<number, boolean>> = {};
  const t = (code: string) => tapN(c, code, 6);
  await settle(c, 120); // intro / fade

  // Title: ArrowDown / ArrowRight / Enter (focus on SETTINGS) / Escape
  await table(c, 'title ArrowDown', 'ArrowDown', () => t('ArrowUp'), out);
  await table(c, 'title ArrowRight', 'ArrowRight', () => t('ArrowLeft'), out);
  await t('ArrowDown'); await t('ArrowDown'); await t('ArrowDown'); // SETTINGS
  await table(c, 'title Enter (SETTINGS)', 'Enter', () => t('Escape'), out);
  // Settings: ArrowDown / ArrowRight / Enter / Escape
  await t('Enter');
  await table(c, 'settings ArrowDown', 'ArrowDown', () => t('ArrowUp'), out);
  await table(c, 'settings ArrowRight', 'ArrowRight', () => t('ArrowLeft'), out);
  await table(c, 'settings Enter', 'Enter', () => t('Enter'), out);
  await table(c, 'settings Escape', 'Escape', () => t('Enter'), out);
  await t('Escape'); // back to title if still in settings
  // Title Escape
  await table(c, 'title Escape', 'Escape', () => Promise.resolve(), out);
  // Level select via LEVELS: ArrowDown / ArrowRight / Escape; Enter on title LEVELS
  await t('ArrowUp'); // focus LEVELS (settings -> controls)
  await t('ArrowUp');
  const row: Record<number, boolean> = {};
  for (const n of HOLDS) {
    const b = await sig(c);
    await tapN(c, 'Enter', n);
    row[n] = (await sig(c)) !== b;
    if (row[n]) await t('Escape');
  }
  out['title Enter (LEVELS)'] = row;
  await t('Enter');
  await table(c, 'levelselect ArrowRight', 'ArrowRight', () => t('ArrowLeft'), out);
  await table(c, 'levelselect ArrowDown', 'ArrowDown', () => t('ArrowUp'), out);
  await table(c, 'levelselect Escape', 'Escape', () => t('Enter'), out);
  record('menus', out);
  console.log(JSON.stringify(out, null, 1));
});

test('B12-T2 pause and controls taps, and in-game keys (pause, jump, shift up/down, R), 1..6 frames', async ({ page }) => {
  const c = await Clocked.open(page, '?level=w1-02');
  const out: Record<string, Record<number, boolean>> = {};
  const t = (code: string) => tapN(c, code, 6);
  await c.run((o) => o.status === 'playing' && o.player.grounded && o.step > 5, 600);
  // Esc opens pause (in-game key)
  await table(c, 'game Escape (open pause)', 'Escape', () => t('Escape'), out);
  await t('Escape'); // open
  await table(c, 'pause ArrowDown', 'ArrowDown', () => t('ArrowUp'), out);
  await table(c, 'pause ArrowRight', 'ArrowRight', () => t('ArrowLeft'), out);
  await t('ArrowDown'); await t('ArrowDown'); // CONTROLS
  await table(c, 'pause Enter (CONTROLS)', 'Enter', () => t('Escape'), out);
  await t('Enter');
  await table(c, 'controls Escape', 'Escape', () => t('Enter'), out);
  await t('Escape'); await t('ArrowUp'); await t('ArrowUp'); // back in pause, focus RESUME
  await table(c, 'pause Escape (close)', 'Escape', () => t('Escape'), out);
  await t('Escape'); // now closed? ensure
  const scenes = await activeScenes(page);
  if (scenes.includes('Pause')) await t('Escape');
  await c.run((o) => o.status === 'playing' && o.player.grounded, 300);

  // In-game keys
  const game: Record<string, Record<number, boolean>> = {};
  const jump: Record<number, boolean> = {};
  for (const n of HOLDS) {
    await c.run((o) => o.player.grounded && o.status === 'playing', 300);
    let top = 0;
    await c.hold('Space', true);
    for (let i = 0; i < n; i += 1) await c.frame();
    await c.hold('Space', false);
    await c.frames(40, (o) => { top = Math.max(top, 0 - o.player.vy); });
    jump[n] = top > 0;
  }
  game['jump (Space)'] = jump;
  const up: Record<number, boolean> = {};
  const down: Record<number, boolean> = {};
  for (const n of HOLDS) {
    await c.run((o) => o.player.grounded && o.status === 'playing', 300);
    const g0 = (await c.observe()).player.gear;
    await tapN(c, 'ShiftRight', n);
    const g1 = (await c.observe()).player.gear;
    up[n] = g1 === g0 + 1;
    await tapN(c, 'ShiftLeft', n);
    const g2 = (await c.observe()).player.gear;
    down[n] = g2 === g1 - 1;
    // restore with 6-frame taps whichever way it ended
    while ((await c.observe()).player.gear > g0) await t('ShiftLeft');
    while ((await c.observe()).player.gear < g0) await t('ShiftRight');
  }
  game['shift up (ShiftRight)'] = up;
  game['shift down (ShiftLeft)'] = down;
  const rr: Record<number, boolean> = {};
  for (const n of HOLDS) {
    await c.run((o) => o.player.grounded && o.status === 'playing', 300);
    await c.frames(40);
    const s0 = (await c.observe()).step;
    let min = s0;
    await c.hold('KeyR', true);
    for (let i = 0; i < n; i += 1) await c.frame();
    await c.hold('KeyR', false);
    await c.frames(20, (o) => { min = Math.min(min, o.step); });
    rr[n] = min < s0;
  }
  game['R (restart)'] = rr;
  record('pause', out);
  record('game', game);
  console.log(JSON.stringify({ out, game }, null, 1));
});

// --- B12 QA line 2: w1-04 clear ---------------------------------------------------------------------------------------
import { recordingFrames } from './b11-helpers';
import { readSaveProgress } from './helpers';

/** The recording with its shift-down cluster replaced: let go on the pad, stop, then three spaced shift-downs, then walk on. */
function letGoVariant(): string[] {
  const f = recordingFrames('w1-04').slice(0, 20 + 5 * 2 + 5 + 81); // up to the end of the sprint
  const out = [...f];
  for (let i = 0; i < 70; i += 1) out.push(''); // let go on the pad and stop
  for (let k = 0; k < 3; k += 1) {
    out.push('-', '-', '-', '', '', '', '', '', '', '', '');
  }
  for (let i = 0; i < 400; i += 1) out.push('R');
  return out;
}

for (const [name, frames] of [['recording', () => recordingFrames('w1-04')], ['let go on the pad, stop, shift down 3x, walk', letGoVariant]] as const) {
  test(`B12-T3 w1-04 clear: ${name}`, async ({ page }) => {
    const c = await Clocked.open(page, '?level=w1-04');
    await c.script(frames());
    const won = await c.run((o) => o.status === 'won' || o.status === 'dead', 1500);
    let scenes: string[] = [];
    for (let i = 0; i < 200 && !scenes.includes('Results'); i += 1) {
      await c.frame();
      scenes = await activeScenes(page);
    }
    await settle(c, 40);
    const obs = await c.observe().catch(() => null);
    const save = await readSaveProgress(page);
    const ls = await menuModel(page, 'Results');
    record(`w1-04 clear: ${name}`, { status: won.status, wonAtStep: won.wonAtStep, scenes: await activeScenes(page), save, resultsModel: ls, finalStatus: obs?.status });
    console.log(JSON.stringify({ name, status: won.status, wonAtStep: won.wonAtStep, scenes: await activeScenes(page), save }));
  });
}

// --- B12 QA line 3: death-to-control ------------------------------------------------------------------------------------
import { levelText } from './b11-helpers';

interface DeathCycle { kind: string; deathStep: number; respawnFrames: number; controlFrames: number; controlSteps: number; stepAtControl: number }

/** From the first non-playing observation, hold Right and count frames and steps until the runner moves (x changes with status playing). */
async function measureAfterDeath(c: Clocked, first: Awaited<ReturnType<Clocked['observe']>>, kind: string): Promise<DeathCycle> {
  await c.script(null);
  await c.hold('ArrowRight', true);
  const deathStep = first.step;
  let respawnFrames = -1;
  let spawnX: number | null = null;
  let frames = 0;
  let stepAtStart = first.step;
  let prevStep = first.step;
  let steps = 0;
  let o = first;
  for (; frames < 400; frames += 1) {
    await c.frame();
    o = await c.observe();
    if (o.step > prevStep) steps += o.step - prevStep; else if (o.step < prevStep) { steps += o.step; stepAtStart = 0; }
    prevStep = o.step;
    if (o.status === 'playing' && respawnFrames < 0) { respawnFrames = frames + 1; spawnX = o.player.x; }
    if (spawnX !== null && o.status === 'playing' && Math.abs(o.player.x - spawnX) > 1e-6) break;
  }
  void stepAtStart;
  return { kind, deathStep, respawnFrames, controlFrames: frames + 1, controlSteps: steps, stepAtControl: o.step };
}

for (const [id, scenarios] of [['w4-05', ['fall']], ['w5-03', ['fall', 'hit']]] as const) {
  test(`B12-T4 ${id} death-to-control`, async ({ page }) => {
    const header = levelText(id).match(/^version:\s*(\d+)/m)?.[1];
    const results: DeathCycle[] = [];
    for (const kind of scenarios) {
      for (let rep = 0; rep < (kind === 'fall' ? 2 : 1); rep += 1) {
        const c = await Clocked.open(page, `?level=${id}`);
        let first: Awaited<ReturnType<Clocked['observe']>> | null = null;
        if (kind === 'fall') {
          await c.run((o) => o.status === 'playing' && o.step > 3, 300);
          await c.hold('ArrowRight', true);
          let lastGrounded = 0;
          first = await c.run((o) => o.status !== 'playing', 600, (o) => { if (o.player.grounded && o.status === 'playing') lastGrounded = o.step; });
          record(`${id} fall: last grounded step vs death step`, { header, lastGrounded, deathStep: first.step, fallSteps: first.step - lastGrounded });
        } else {
          // hit: the recording delayed by d steps (shots come at other phases) until a death while still on the floor
          for (const d of [3, 9, 17, 31, 47, 61, 83, 101, 127, 150]) {
            const c2 = await Clocked.open(page, `?level=${id}`);
            const f = [...Array.from({ length: d }, () => ''), ...recordingFrames(id)];
            await c2.script(f);
            let last = await c2.observe();
            let prev = last;
            for (let i = 0; i < 1500 && last.status === 'playing'; i += 1) { prev = last; await c2.frame(); last = await c2.observe(); }
            if (last.status === 'dead' || last.status === 'restarting') {
              const grounded = prev.player.grounded || prev.player.vy <= 0.1;
              record(`${id} delayed ${d}`, { deathStep: last.step, prev: prev.player });
              if (grounded) { first = last; results.push(await measureAfterDeath(c2, first, `hit (delay ${d}, last live y ${prev.player.y.toFixed(2)})`)); break; }
            }
          }
          first = null;
        }
        if (first) results.push(await measureAfterDeath(c, first, kind));
      }
    }
    record(`death-to-control ${id}`, { levelFileVersion: header, results });
    console.log(JSON.stringify({ id, header, results }));
  });
}

// --- B12 QA line 4: w4-01 lift, white at the top, then the blue bridge ---------------------------------------------------
test('B12-T5 w4-01: ride the lift, stand white at the top, walk onto the blue bridge at gears 1..4', async ({ page }) => {
  const rows: unknown[] = [];
  for (const gear of [1, 2, 3, 4]) {
    for (const wait of [0, 40, 80]) {
      const c = await Clocked.open(page, '?level=w4-01');
      await c.script(recordingFrames('w4-01').slice(0, 75)); // walk onto the lift while it rests at the bottom
      await c.run((o) => o.step >= 76, 400);
      await c.script(null);
      for (let g = 1; g < gear; g += 1) { await c.hold('ShiftRight', true); await c.frame(); await c.frame(); await c.hold('ShiftRight', false); await c.frame(); await c.frame(); }
      // wait for the lift to arrive at the top (mover y <= 6 + tiny) and be resting there
      await c.run((o) => (o.kinetics?.movers[0]?.y ?? 99) <= 6.0001 && o.player.grounded && o.player.y < 7, 800);
      await c.frames(wait);
      const start = await c.observe();
      await c.hold('ArrowRight', true);
      let end = start;
      let whiteOnBridge = 0;
      let firstBridgeBand = -1;
      let bridgeX = -1;
      for (let i = 0; i < 300; i += 1) {
        await c.frame();
        end = await c.observe();
        if (end.player.x >= 18 && end.player.x < 24 && end.player.grounded) {
          if (firstBridgeBand < 0) { firstBridgeBand = end.player.band; bridgeX = end.player.x; }
          if (end.player.band === 0) whiteOnBridge += 1;
        }
        if (end.status !== 'playing') break;
      }
      rows.push({ gear, waitAtTop: wait, startKinY: start.kinetics?.movers[0]?.y, startBand: start.player.band, endStatus: end.status, endX: +end.player.x.toFixed(2), endY: +end.player.y.toFixed(2), bandOnFirstBridgeContact: firstBridgeBand, bridgeX, whiteFramesOnBridge: whiteOnBridge, wonAtStep: end.wonAtStep });
    }
  }
  record('w4-01 lift-to-bridge', rows);
  console.log(JSON.stringify(rows, null, 1));
});
