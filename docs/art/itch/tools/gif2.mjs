import { start, SP, tokens } from './lib.mjs';
import fs from 'node:fs';
const out = SP + '/gif2'; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const { browser, d, errs } = await start('w1-03');
let n = 0;
async function run(seq) { for (const b of seq) { await d.frame(b); if (d.step % 2 === 0) await d.shot(`${out}/f${String(n++).padStart(4, '0')}.png`); } }
const rep = (c, k) => Array(k).fill(c);
await run([...rep('', 10), '+', '', '+', '', '+', ...rep('R', 55), ...rep('', 45)]);
const sol = tokens(fs.readFileSync('C:/dev/itch gam/levels/w1-03.solution.txt', 'utf8'));
await run([...rep('', 6), ...sol.slice(20, -1)]);
console.log(d.step, n, errs);
await browser.close();
