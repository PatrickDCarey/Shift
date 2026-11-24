// node exp2.mjs <level> <out-prefix> step1,step2,...   (steps are sim steps from the solution's first frame)
import { start, tokens } from './lib.mjs';
import fs from 'node:fs';
const [level, prefix, list] = process.argv.slice(2);
const want = list.split(',').map(Number);
const { browser, d, page, errs } = await start(level);
const seq = tokens(fs.readFileSync(`C:/dev/itch gam/levels/${level}.solution.txt`, 'utf8'));
await d.frame('!'); await d.frame(''); await d.keys(new Set());
console.log('k0', await page.evaluate(() => window.__redshift?.kineticStep));
let i = 0;
for (const b of seq) { await d.frame(b); i++; if (want.includes(i)) { await d.shot(`${prefix}-${i}.png`); console.log(level, i, await page.evaluate(() => window.__redshift?.kineticStep)); } if (i >= Math.max(...want)) break; }
console.log(errs);
await browser.close();
