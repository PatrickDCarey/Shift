// node docs/art/trailer/tools/render-audio.mjs  (needs: npx vite --port 5188 --strictPort running)
// Renders the trailer bed and one-shots from the game's own audio modules, offline.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] ?? 'release/trailer/audio';
const RAW = path.join(OUT, '_raw');
fs.mkdirSync(RAW, { recursive: true });

// [seconds, band] with band 0 white, 1 blue, 2 green, 3 yellow, 4 red. Mirrors docs/design/trailer.md shots.
export const TIMELINE = [
  [0, 1], [2.5, 0], [4, 1], [5.5, 2], [7, 3], [8.5, 4], [11, 4], [13, 4], [15, 3], [17, 1], [19, 3],
  [20.5, 0], [22.5, 2], [25, 1], [27, 4], [28.5, 2], [31, 3], [34, 1], [35, 0], [36, 4], [42, 3], [44, 1], [45, 0],
];
// Optional: node render-audio.mjs <outDir> <timeline.json>  renders only the bed, from the cut's own
// gear timeline ({ seconds, bands: [[seconds, band], ...] } as written by cut.py), so music and picture match.
const CUT = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
const CUES = ['shiftUp', 'shiftDown', 'jump', 'land', 'fallThrough', 'reset', 'shot', 'hitDeath', 'post', 'levelComplete'];

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto('http://localhost:5188/docs/art/trailer/tools/render-audio.html');
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });

const save = (name, b64) => fs.writeFileSync(path.join(RAW, name + '.f32'), Buffer.from(b64, 'base64'));
save('bed', await page.evaluate(([t, s]) => window.renderBed(t, s), CUT ? [CUT.bands, CUT.seconds] : [TIMELINE, 60]));
for (const c of CUT ? [] : CUES) save('sfx-' + c, await page.evaluate(([n, s]) => window.renderCue(n, s), [c, 2]));
await browser.close();
console.log('rendered', fs.readdirSync(RAW).join(' '));
