// node trace.mjs <level> <every>  : state along the recorded solution (no screenshots)
import { Session, recording } from './cliplib.mjs';
const [level, every = '20'] = process.argv.slice(2);
const s = await Session.open(level, { dpr: 1 });
const rec = recording(level);
let last = -1;
for (let i = 0; i < 6000; i++) {
  const o = await s.obs();
  if (o.step !== last) { if (o.step % +every === 0 || o.status !== 'playing') console.log(o.step, o.status, 'x', o.x.toFixed(1), 'y', o.y.toFixed(1), 'g', o.gear, 'b', o.band, 'gr', +o.grounded, 'cp', o.cp); }
  last = o.step;
  if (o.step >= rec.length || o.status === 'won') { console.log('end', o.step, o.status); break; }
  await s.frame(rec[Math.min(o.step, rec.length - 1)]);
}
await s.close();
