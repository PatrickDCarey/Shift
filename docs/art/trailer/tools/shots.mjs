// node shots.mjs <clip>  -> captures one clip (see CLIPS), encodes it to release/trailer/clips/<name>.mp4
import { Session, runClip, encode, recording, OUT } from './cliplib.mjs';
import fs from 'node:fs';
import { CLIPS } from './clips.mjs';
const name = process.argv[2];
const c = CLIPS[name];
if (!c) { console.error('unknown clip', name, Object.keys(CLIPS).join(' ')); process.exit(1); }
const LOGONLY = process.argv[3] === 'log';
const s = await Session.open(c.level, { dpr: LOGONLY ? 1 : 2 });
const log = [];
const n = await runClip(s, name, c.plan(recording(c.level)), { from: c.from, log, noShot: LOGONLY });
const mid = log[Math.floor(log.length / 2)];
console.log(name, 'frames', n, 'steps', log[0]?.step, '-', log.at(-1)?.step, 'errors', s.errs.length);
fs.writeFileSync(`${OUT}/frames/${name}.json`, JSON.stringify({ level: c.level, n, from: log[0]?.step, to: log.at(-1)?.step, first: log[0], last: log.at(-1), mid }));
await s.close();
if (LOGONLY) { fs.mkdirSync(`${OUT}/logs`, { recursive: true }); fs.writeFileSync(`${OUT}/logs/${name}.json`, JSON.stringify({ level: c.level, log })); process.exit(0); }
fs.mkdirSync(`${OUT}/logs`, { recursive: true });
fs.writeFileSync(`${OUT}/logs/${name}.json`, JSON.stringify({ level: c.level, log }));
if (!LOGONLY) console.log(encode(name));
