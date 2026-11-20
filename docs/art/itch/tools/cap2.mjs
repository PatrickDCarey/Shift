import { start, SP, tokens } from './lib.mjs';
import fs from 'node:fs';
const [level, a, b] = [process.argv[2], +process.argv[3], +process.argv[4]];
const out = `${SP}/cap2-${level}`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const { browser, d } = await start(level);
const seq = tokens(fs.readFileSync(`C:/dev/itch gam/levels/${level}.solution.txt`, 'utf8'));
let i = 0;
for (const x of seq.slice(0, -1)) { await d.frame(x); i++; if (i >= a && i <= b) await d.shot(`${out}/s${String(i).padStart(5, '0')}.png`); if (i > b) break; }
await browser.close();
