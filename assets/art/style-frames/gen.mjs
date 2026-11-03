/*
 * Generates the style-frame PNGs into docs/art/style-frames/ using headless
 * Chromium (Playwright) and render.html. Run from the repo root:
 *   node assets/art/style-frames/gen.mjs            (all directions)
 *   node assets/art/style-frames/gen.mjs neon       (one direction)
 * Also writes docs/art/style-frames/measurements.json.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const outDir = path.join(root, 'docs', 'art', 'style-frames');
mkdirSync(outDir, { recursive: true });
const palette = readFileSync(path.join(root, 'src', 'data', 'palette.json'), 'utf8');
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['neon', 'poster', 'pixel'];
const KEYS = ['white', 'blue', 'green', 'yellow', 'red'];
const save = (name, url) => writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(`window.PAL = ${palette};`);
await page.goto(pathToFileURL(path.join(here, 'render.html')).href);
await page.waitForFunction('window.ready === true', null, { timeout: 15000 }).catch(() => {
  throw new Error('render.html failed to load: ' + errors.join(' | '));
});

const measurements = {};
for (const dk of dirs) {
  const m = (measurements[dk] = { frames: {} });
  for (const key of KEYS) {
    const r = await page.evaluate(([d, k]) => window.renderFrame(d, k), [dk, key]);
    m.frames[key] = { probes: r.probes, tint: r.tint.map((v) => Math.round(v)) };
    if (key === 'yellow') save(`${dk}-main-yellow.png`, r.url);
    if (key === 'red') save(`${dk}-pace-red.png`, r.url);
    if (key === 'white') save(`${dk}-pace-white.png`, r.url);
  }
  save(`${dk}-pace-sheet.png`, await page.evaluate((d) => window.paceSheet(d), dk));
  save(`${dk}-cvd.png`, await page.evaluate((d) => window.cvdSheet(d, 'yellow'), dk));
  if (dk === 'neon') {
    try {
      save('mechanics-strip.png', await page.evaluate((d) => window.mechanics(d), dk));
    } catch (e) {
      errors.push('mechanics: ' + e);
    }
  }
}
// ---- derived numbers ------------------------------------------------------
if (dirs.length === 3) {
  globalThis.window = { PAL: JSON.parse(palette) };
  (0, eval)(readFileSync(path.join(here, 'lib.js'), 'utf8'));
  const L = globalThis.window.L;
  const MAX_BG_LUM = { neon: 0.0135, poster: 0.031, pixel: 0.0135 }; // brightest background decor behind gameplay
  for (const dk of dirs) {
    const m = measurements[dk];
    const white = m.frames.white.tint;
    m.tintDeltaEvsStanding = Object.fromEntries(KEYS.map((k) => [k, +L.dE(white, m.frames[k].tint).toFixed(1)]));
    m.tintDeltaEYellowVsWhite = m.tintDeltaEvsStanding.yellow;
    const ghostLum = (band) => {
      const g = L.G[band];
      return L.lum(dk === 'poster' && band !== 4 ? g.solid.fill : g.ghost.outline);
    };
    m.worstCaseVsBrightestBackground = {
      maxBackgroundLuminance: MAX_BG_LUM[dk],
      ghostOutline: Object.fromEntries([1, 2, 3, 4].map((b) => [L.BANDS[b], +((ghostLum(b) + 0.05) / (MAX_BG_LUM[dk] + 0.05)).toFixed(2)])),
      solidFill: Object.fromEntries([1, 2, 3, 4].map((b) => [L.BANDS[b], +((L.lum(L.G[b].solid.fill) + 0.05) / (MAX_BG_LUM[dk] + 0.05)).toFixed(2)])),
      safeFill: +((L.lum(L.SAFE.fill) + 0.05) / (MAX_BG_LUM[dk] + 0.05)).toFixed(2),
    };
    const minProbe = {};
    for (const key of KEYS) for (const p of m.frames[key].probes) {
      const cur = (minProbe[p.name] ??= { min: 99, minCvd: 99 });
      cur.min = Math.min(cur.min, p.ratio);
      cur.minCvd = Math.min(cur.minCvd, ...Object.values(p.cvd));
    }
    m.minProbeAcrossFrames = minProbe;
  }
  measurements.pixelPatternStats = await page.evaluate(() => window.pixelPatternStats());
}
writeFileSync(path.join(outDir, 'measurements.json'), JSON.stringify(measurements, null, 2));
await browser.close();
if (errors.length) {
  process.stderr.write('page errors:\n' + errors.join('\n') + '\n');
  process.exitCode = 1;
}
