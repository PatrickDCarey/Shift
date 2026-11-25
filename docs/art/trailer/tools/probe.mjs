// node probe.mjs <level> <steps comma list>  : drive the recording, print state at steps and save PNGs to a scratch dir
import { Session, recording } from './cliplib.mjs';
import fs from 'node:fs';
const [level, list, dir] = process.argv.slice(2);
const want = new Set(list.split(',').map(Number));
const s = await Session.open(level);
const rec = recording(level);
fs.mkdirSync(dir, { recursive: true });
let last = -1, dup = 0, skip = 0;
for (let i = 0; i < rec.length; i++) {
  const o = await s.obs();
  if (o.step === last) dup++; else if (last >= 0 && o.step - last > 1) skip++;
  last = o.step;
  if (want.has(i)) { await s.shot(`${dir}/${level}-${i}.png`); console.log(i, JSON.stringify(o)); }
  await s.frame(rec[i]);
}
console.log('dup', dup, 'skip', skip, s.errs);
await s.close();
