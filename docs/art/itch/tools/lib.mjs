import { chromium } from 'file:///C:/dev/itch gam/node_modules/playwright/index.mjs';
import fs from 'node:fs';
export const SP = process.cwd().split(String.fromCharCode(92)).join('/');
export const URL = 'http://localhost:5185/';
const KEYS = { L: 'ArrowLeft', R: 'ArrowRight', J: 'Space', '+': 'ShiftRight', '-': 'ShiftLeft', '!': 'KeyR' };
export async function open(query, opts = {}) {
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, reducedMotion: opts.reducedMotion ?? 'no-preference' });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => {
    const real = window.requestAnimationFrame.bind(window);
    let manual = false, q = [], t = 0;
    window.requestAnimationFrame = (cb) => { if (!manual) return real((ts) => { t = ts; cb(ts); }); q.push(cb); return q.length; };
    window.__manual = () => { manual = true; };
    window.__tick = (n, dt) => { for (let i = 0; i < n; i++) { t += dt; const c = q; q = []; for (const f of c) f(t); } };
  });
  await page.goto(URL + (query ? '?' + query : ''));
  return { browser, page, errs };
}
export function tokens(text) {
  const body = text.split(/^---\s*$/m)[1];
  const out = [];
  for (const t of body.trim().split(/\s+/)) { const m = /^(\d+)(.*)$/.exec(t); const n = +m[1]; for (let i = 0; i < n; i++) out.push(m[2] === '.' ? '' : m[2]); }
  return out;
}
export class Driver {
  constructor(page) { this.page = page; this.held = new Set(); this.step = 0; }
  async manual() { await this.page.evaluate(() => window.__manual()); }
  async tick(n = 1) { await this.page.evaluate(([n]) => window.__tick(n, 1000 / 60), [n]); this.step += n; }
  async keys(set) { // set of key names (code) that should be down
    for (const k of [...this.held]) if (!set.has(k)) { await this.page.keyboard.up(k); this.held.delete(k); }
    for (const k of set) if (!this.held.has(k)) { await this.page.keyboard.down(k); this.held.add(k); }
  }
  async frame(btns) { // btns string like "R+"
    const s = new Set(); for (const c of btns) if (KEYS[c]) s.add(KEYS[c]);
    await this.keys(s); await this.tick(1);
  }
  async shot(path) { await this.page.screenshot({ path, clip: { x: 0, y: 0, width: 960, height: 540 } }); }
}
export async function start(level, opts = {}) {
  const o = await open('level=' + level, opts);
  await o.page.waitForTimeout(2500);
  await o.page.mouse.click(480, 270);
  await o.page.waitForTimeout(300);
  await o.page.keyboard.press('Enter');
  await o.page.waitForTimeout(300);
  const d = new Driver(o.page);
  await d.manual();
  await d.tick(2);
  return { ...o, d };
}
