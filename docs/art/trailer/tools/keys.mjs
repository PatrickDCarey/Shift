import { Session } from './cliplib.mjs';
const s = await Session.open('w3-03', { dpr: 1 });
for (let i = 0; i < 125; i++) await s.frame(i < 25 ? '' : i < 30 ? '+' : 'R');
console.log(await s.page.evaluate(() => { const h = window.__redshift; const st = h.state; return JSON.stringify({ hk: Object.keys(h), sk: Object.keys(st), p: Object.keys(st.player), twin: st.twin ?? st.bodies ?? null, ev: st.events ?? null }).slice(0, 1500); }));
await s.close();
