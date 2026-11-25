// node sidecar.mjs -> release/trailer/clips/clips.json from release/trailer/logs/*.json (per-frame state logged while capturing)
import fs from 'node:fs';
import { OUT } from './cliplib.mjs';
const names = fs.readdirSync(`${OUT}/logs`).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const clips = [];
for (const name of names) {
  if (!fs.existsSync(`${OUT}/clips/${name}.mp4`)) continue;
  const { level, log } = JSON.parse(fs.readFileSync(`${OUT}/logs/${name}.json`, 'utf8'));
  const events = [];
  const add = (frame, type, value) => events.push(value === undefined ? { frame, type } : { frame, type, value });
  let pass = false;
  log.forEach((o, i) => {
    const p = log[i - 1];
    if (!p || o.band !== p.band) add(i, 'band', o.band);
    if (o.tb !== null && (!p || o.tb !== p.tb)) add(i, 'twinBand', o.tb);
    if (p && p.status === 'playing' && o.status === 'playing') {
      if (p.grounded && !o.grounded) add(i, o.vy < 0 ? 'jump' : 'fallThrough');
      if (!p.grounded && o.grounded) add(i, 'land');
    }
    if (p && p.status === 'playing' && o.status !== 'playing' && o.status !== 'won') add(i, 'death');
    if (p && p.status !== 'playing' && p.status !== 'won' && o.status === 'playing') add(i, 'respawn');
    if (p && o.cp !== null && o.cp !== p.cp) add(i, 'postLit', o.cp);
    if (o.status === 'won' && (!p || p.status !== 'won')) add(i, 'win');
    const near = o.shots.some(([x, y]) => Math.abs(x - o.x) < 0.7 && Math.abs(y - o.y) < 1.3);
    if (near && !pass) add(i, 'boltPass');
    pass = near;
  });
  clips.push({ file: `${name}.mp4`, level, fps: 60, frames: log.length, steps: [log[0].step, log.at(-1).step], events });
}
fs.writeFileSync(`${OUT}/clips/clips.json`, JSON.stringify(clips, null, 1));
for (const c of clips) console.log(c.file, c.frames, (c.frames / 60).toFixed(1) + 's', c.events.map((e) => `${e.frame}:${e.type}${e.value ?? ''}`).join(' '));
