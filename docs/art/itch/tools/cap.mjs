import { start, SP, tokens } from './lib.mjs';
import fs from 'node:fs';
const [level, every] = [process.argv[2], +process.argv[3] || 5];
const out = `${SP}/cap-${level}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const { browser, d, errs } = await start(level);
const seq = tokens(fs.readFileSync(`C:/dev/itch gam/levels/${level}.solution.txt`, 'utf8'));
let i = 0;
for (const b of seq.slice(0, -1)) { await d.frame(b); i++; if (i % every === 0) await d.shot(`${out}/s${String(i).padStart(5, '0')}.png`); }
console.log(level, seq.length, errs);
await browser.close();
