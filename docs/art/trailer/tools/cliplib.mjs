// Frame-exact capture library for the trailer clips. Frozen page clock (page.clock), one 1000/60 ms frame at a time,
// real key events, a PNG per frame. Needs a dev server WITH the QA hook on port 5185 (VITE_QA_HOOK=1 npx vite --port 5185 --strictPort).
import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export const ROOT = 'C:/dev/itch gam';
export const OUT = `${ROOT}/release/trailer`;
export const URL = 'http://localhost:5185/';
export const FRAME = 16; // the page clock runs rAF on a 16 ms grid; 1000/60 drifts and skips steps
const KEYS = { L: 'ArrowLeft', R: 'ArrowRight', J: 'Space', '+': 'ShiftRight', '-': 'ShiftLeft', '!': 'KeyR' };

/** Expand levels/<id>.solution.txt into one string of held buttons per step. */
export function recording(level) {
  const text = fs.readFileSync(`${ROOT}/levels/${level}.solution.txt`, 'utf8');
  const body = text.split(/^---\s*$/m)[1];
  const out = [];
  for (const t of body.trim().split(/\s+/)) {
    const m = /^(\d+)(.*)$/.exec(t);
    for (let i = 0; i < +m[1]; i++) out.push(m[2] === '.' ? '' : m[2]);
  }
  return out;
}

export class Session {
  constructor(browser, page, errs) { this.browser = browser; this.page = page; this.errs = errs; this.held = new Set(); }
  static async open(level, { dpr = 2 } = {}) {
    const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: dpr, reducedMotion: 'no-preference' });
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto(`${URL}?level=${level}`, { waitUntil: 'commit', timeout: 60000 });
    const s = new Session(browser, page, errs);
    const t0 = Date.now();
    while (!(await page.evaluate(() => window.__redshift !== undefined).catch(() => false))) {
      if (Date.now() - t0 > 60000) throw new Error('hook never appeared');
      await page.clock.runFor(50); await page.waitForTimeout(20);
    }
    await s.idle(90);
    await page.mouse.click(480, 270);   // focus the canvas
    await s.idle(10);
    await page.keyboard.press('Enter'); // dismisses the one-time Sticky Keys tip if shown
    await s.idle(20);
    // R: restart so the kinetic clock starts at 0 and no "[replay]" label exists.
    await s.frame('!'); await s.frame('');
    await s.keys(new Set());
    return s;
  }
  async keys(set) {
    for (const k of [...this.held]) if (!set.has(k)) { await this.page.keyboard.up(k); this.held.delete(k); }
    for (const k of set) if (!this.held.has(k)) { await this.page.keyboard.down(k); this.held.add(k); }
  }
  async idle(n) { for (let i = 0; i < n; i++) await this.page.clock.runFor(FRAME); }
  /** Press the buttons in `btns` (letters R L J + - !) for one frame. */
  async frame(btns = '') {
    const s = new Set(); for (const c of btns) if (KEYS[c]) s.add(KEYS[c]);
    await this.keys(s);
    await this.page.clock.runFor(FRAME);
  }
  obs() {
    return this.page.evaluate(() => {
      const h = window.__redshift, s = h.state, p = s.player;
      const tw = s.twin, ks = h.kinetics; return { step: s.step, status: s.status, ev: (s.events ?? []).map((e) => (typeof e === 'string' ? e : (e.type ?? e.kind ?? JSON.stringify(e)))), tb: tw ? tw.band : null, shots: ks && ks.shots ? ks.shots.map((q) => [q.x, q.y]) : [], k: h.kineticStep, cp: h.checkpoint, x: p.x, y: p.y, vx: p.vx, vy: p.vy, gear: p.gear, band: p.band, grounded: p.grounded };
    });
  }
  async shot(path) { await this.page.screenshot({ path, clip: { x: 0, y: 0, width: 960, height: 540 } }); }
  async close() { await this.browser.close(); }
}

/**
 * Run a clip. `plan(step, obs)` returns the buttons for the next sim step (step = obs.step, the steps already run) or null
 * to stop. Steps >= `from` are captured, exactly one PNG per sim step while playing (the 16 ms page frames that run no
 * step are skipped, so the clip is a true 60 fps), and one per frame while not playing (death, restart card).
 */
export async function runClip(session, name, plan, { from = 0, maxFrames = 6000, log = [], noShot = false } = {}) {
  const dir = `${OUT}/frames/${name}`;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  let n = 0, last = -1;
  for (let i = 0; i < maxFrames; i++) {
    const o = await session.obs();
    const b = plan(o.step, o);
    if (b === null) break;
    const fresh = o.status !== 'playing' || o.step !== last;
    if (o.step >= from && fresh) { if (!noShot) await session.shot(`${dir}/${String(n++).padStart(5, '0')}.png`); log.push(o); }
    last = o.step;
    await session.frame(b);
  }
  return n;
}

export function encode(name) {
  const dir = `${OUT}/frames/${name}`;
  fs.mkdirSync(`${OUT}/clips`, { recursive: true });
  const out = `${OUT}/clips/${name}.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', `${dir}/%05d.png`, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '60', out]);
  return out;
}
