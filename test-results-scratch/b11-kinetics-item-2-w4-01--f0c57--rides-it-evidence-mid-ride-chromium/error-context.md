# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: b11-kinetics.spec.ts >> item 2: w4-01 lift follows its path at every step; the runner rides it; evidence mid-ride
- Location: tests\e2e\b11-kinetics.spec.ts:28:1

# Error details

```
Error: condition not reached within 900 frames; last: {"step":921,"status":"playing","wonAtStep":null,"k":921,"checkpoint":null,"player":{"x":26.600000000000257,"y":6,"vx":0,"vy":0,"gear":1,"band":0,"grounded":true},"kinetics":{"step":921,"movers":[{"x":9,"y":6.5625,"holds":true}],"emitters":[],"shots":[]}}
```

# Test source

```ts
  59  | export function levelText(id: string): string {
  60  |   return readFileSync(`${LEVELS_DIR}${id}.txt`, 'utf8');
  61  | }
  62  | 
  63  | // --- the page-side half of the driver (installed once per page) -------------------------------------------------
  64  | 
  65  | const PAGE_DRIVER = `(() => {
  66  |   const keys = ${JSON.stringify(LETTER_KEYS)};
  67  |   const heldLetters = 'RL';
  68  |   const q = { frames: null, last: -1, held: {} };
  69  |   window.__q = q;
  70  |   const set = (code, down) => {
  71  |     if (!!q.held[code] === down) return;
  72  |     q.held[code] = down;
  73  |     window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  74  |   };
  75  |   window.__qSet = set;
  76  |   window.__qObserve = () => {
  77  |     const h = window.__redshift;
  78  |     const s = h.state;
  79  |     if (q.frames && s.step !== q.last) {
  80  |       const lo = Math.max(0, q.last + 1);
  81  |       let presses = '';
  82  |       for (let i = lo; i <= s.step; i += 1) presses += (q.frames[i] ?? '');
  83  |       const now = q.frames[s.step] ?? '';
  84  |       for (const [letter, code] of Object.entries(keys)) set(code, heldLetters.includes(letter) ? now.includes(letter) : presses.includes(letter));
  85  |       q.last = s.step;
  86  |     }
  87  |     const p = s.player;
  88  |     const k = h.kinetics;
  89  |     return {
  90  |       step: s.step, status: s.status, wonAtStep: s.wonAtStep, k: h.kineticStep, checkpoint: h.checkpoint,
  91  |       player: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, gear: p.gear, band: p.band, grounded: p.grounded },
  92  |       kinetics: k ? JSON.parse(JSON.stringify(k)) : null,
  93  |     };
  94  |   };
  95  | })()`;
  96  | 
  97  | /** A page whose clock only moves when the test moves it. */
  98  | export class Clocked {
  99  |   private constructor(readonly page: Page) {}
  100 | 
  101 |   /** Freeze the clock, load `search` (for example `?level=w2-05`) and run frames until the QA hook is up. */
  102 |   static async open(page: Page, search: string): Promise<Clocked> {
  103 |     await page.clock.install({ time: 0 });
  104 |     await page.clock.pauseAt(1000);
  105 |     await page.goto(`./${search}`);
  106 |     for (let i = 0; i < 800; i += 1) {
  107 |       if (await page.evaluate(() => (window as unknown as { __redshift?: unknown }).__redshift !== undefined)) break;
  108 |       await page.clock.runFor(50);
  109 |       if (i === 799) throw new Error('window.__redshift never appeared within 40 s of fake time');
  110 |     }
  111 |     await page.evaluate(PAGE_DRIVER);
  112 |     return new Clocked(page);
  113 |   }
  114 | 
  115 |   /** What the hook shows now (and, while a script runs, applies the keys for the coming step). */
  116 |   observe(): Promise<Obs> {
  117 |     return this.page.evaluate(() => (window as unknown as { __qObserve: () => unknown }).__qObserve()) as Promise<Obs>;
  118 |   }
  119 | 
  120 |   /** Feed these per-step letters (from {@link recordingFrames}) as keys, or null to stop and release every key. */
  121 |   async script(frames: readonly string[] | null): Promise<void> {
  122 |     await this.page.evaluate((f) => {
  123 |       const w = window as unknown as { __q: { frames: string[] | null; last: number }; __qSet: (c: string, d: boolean) => void };
  124 |       w.__q.frames = f === null ? null : [...f];
  125 |       w.__q.last = -1;
  126 |       if (f === null) for (const c of ['ArrowRight', 'ArrowLeft', 'Space', 'ShiftRight', 'ShiftLeft', 'KeyR']) w.__qSet(c, false);
  127 |     }, frames);
  128 |   }
  129 | 
  130 |   /** Hold or release one key by `code` (not while a script is running). */
  131 |   async hold(code: string, down: boolean): Promise<void> {
  132 |     await this.page.evaluate(([c, d]) => (window as unknown as { __qSet: (c: string, d: boolean) => void }).__qSet(c as string, d as boolean), [code, down] as const);
  133 |   }
  134 | 
  135 |   /** A press that lasts exactly one frame (down, one frame, up). */
  136 |   async tap(code: string): Promise<void> {
  137 |     await this.hold(code, true);
  138 |     await this.frame();
  139 |     await this.hold(code, false);
  140 |     await this.frame();
  141 |   }
  142 | 
  143 |   /** One frame of fake time. */
  144 |   async frame(): Promise<void> {
  145 |     await this.page.clock.runFor(FRAME_MS);
  146 |   }
  147 | 
  148 |   /**
  149 |    * Observe, then run a frame, until `until(obs)` holds (returned) or `maxFrames` pass (throws). `each` sees every
  150 |    * observation, including the last.
  151 |    */
  152 |   async run(until: (o: Obs) => boolean, maxFrames: number, each?: (o: Obs) => void | Promise<void>): Promise<Obs> {
  153 |     for (let i = 0; i <= maxFrames; i += 1) {
  154 |       const o = await this.observe();
  155 |       if (each) await each(o);
  156 |       if (until(o)) return o;
  157 |       await this.frame();
  158 |     }
> 159 |     throw new Error(`condition not reached within ${maxFrames} frames; last: ${JSON.stringify(await this.observe())}`);
      |           ^ Error: condition not reached within 900 frames; last: {"step":921,"status":"playing","wonAtStep":null,"k":921,"checkpoint":null,"player":{"x":26.600000000000257,"y":6,"vx":0,"vy":0,"gear":1,"band":0,"grounded":true},"kinetics":{"step":921,"movers":[{"x":9,"y":6.5625,"holds":true}],"emitters":[],"shots":[]}}
  160 |   }
  161 | 
  162 |   /** `n` frames, observing each. */
  163 |   async frames(n: number, each?: (o: Obs) => void | Promise<void>): Promise<Obs> {
  164 |     let count = 0;
  165 |     return this.run(() => count++ >= n, n + 2, each);
  166 |   }
  167 | }
  168 | 
  169 | // --- oracles from the level headers ------------------------------------------------------------------------------
  170 | 
  171 | export interface MoverSpec {
  172 |   readonly col: number;
  173 |   readonly row: number;
  174 |   readonly width: number;
  175 |   readonly kind: string;
  176 |   readonly speed: number;
  177 |   readonly phase: number;
  178 |   readonly path: readonly (readonly [string, number])[];
  179 | }
  180 | 
  181 | export function parseMovers(text: string): MoverSpec[] {
  182 |   return [...text.matchAll(/^mover:\s*(\d+)\s+(\d+)\s+(\d+)x1\s+(\S+)\s+(.*)$/gm)].map((m) => {
  183 |     const kv = Object.fromEntries((m[5] ?? '').trim().split(/\s+/).map((p) => p.split('=') as [string, string]));
  184 |     return {
  185 |       col: Number(m[1]),
  186 |       row: Number(m[2]),
  187 |       width: Number(m[3]),
  188 |       kind: m[4] ?? '',
  189 |       speed: Number(kv['speed']),
  190 |       phase: Number(kv['phase'] ?? 0),
  191 |       path: (kv['path'] ?? '').split(',').map((t) => [t.charAt(0), Number(t.slice(1))] as const),
  192 |     };
  193 |   });
  194 | }
  195 | 
  196 | /** Top-left cell of the slab at kinetic step t: the path model of moving-objects.md (speed in 32nds of a tile per step). */
  197 | export function moverAt(m: MoverSpec, t: number): { x: number; y: number } {
  198 |   const legSteps = ([c, n]: readonly [string, number]): number => (c === 'w' ? n : (n * 32) / m.speed);
  199 |   const cycle = m.path.reduce((a, leg) => a + legSteps(leg), 0);
  200 |   let p = (t + m.phase) % cycle;
  201 |   let x = m.col;
  202 |   let y = m.row;
  203 |   const dir: Record<string, [number, number]> = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
  204 |   for (const leg of m.path) {
  205 |     const dur = legSteps(leg);
  206 |     const [c, n] = leg;
  207 |     if (c === 'w') {
  208 |       if (p < dur) return { x, y };
  209 |     } else {
  210 |       const [dx, dy] = dir[c] as [number, number];
  211 |       if (p < dur) return { x: x + dx * ((p * m.speed) / 32), y: y + dy * ((p * m.speed) / 32) };
  212 |       x += dx * n;
  213 |       y += dy * n;
  214 |     }
  215 |     p -= dur;
  216 |   }
  217 |   return { x, y };
  218 | }
  219 | 
  220 | export interface EmitterSpec {
  221 |   readonly col: number;
  222 |   readonly row: number;
  223 |   readonly dir: string;
  224 |   readonly range: number;
  225 |   readonly speed: number;
  226 |   readonly period: number;
  227 |   readonly phase: number;
  228 | }
  229 | 
  230 | export function parseEmitters(text: string): EmitterSpec[] {
  231 |   return [...text.matchAll(/^emitter:\s*(\d+)\s+(\d+)\s+(.*)$/gm)].map((m) => {
  232 |     const kv = Object.fromEntries((m[3] ?? '').trim().split(/\s+/).map((p) => p.split('=') as [string, string]));
  233 |     return { col: Number(m[1]), row: Number(m[2]), dir: kv['dir'] ?? '', range: Number(kv['range']), speed: Number(kv['speed']), period: Number(kv['period']), phase: Number(kv['phase'] ?? 0) };
  234 |   });
  235 | }
  236 | 
  237 | /** The glow is on for the last `min(18, period / 2)` steps before a shot leaves (projectiles.md: emitterTellMs 300 = 18 steps). */
  238 | export function tellExpected(e: EmitterSpec, t: number): boolean {
  239 |   const len = Math.min(18, Math.floor(e.period / 2));
  240 |   return (e.period - ((t + e.phase) % e.period)) % e.period < len;
  241 | }
  242 | 
  243 | /** Shots alive at kinetic step t: one leaves on every step s with (s + phase) mod period = 0, flies speed/32 tiles per step for range tiles. */
  244 | export function shotsExpected(e: EmitterSpec, t: number): { firedAt: number; x: number; y: number }[] {
  245 |   const life = (e.range * 32) / e.speed;
  246 |   const v = ({ l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] } as Record<string, [number, number]>)[e.dir] as [number, number];
  247 |   const out: { firedAt: number; x: number; y: number }[] = [];
  248 |   for (let s = Math.max(0, t - life + 1); s <= t; s += 1) {
  249 |     if ((s + e.phase) % e.period !== 0) continue;
  250 |     const d = ((t - s) * e.speed) / 32;
  251 |     out.push({ firedAt: s, x: e.col + 0.5 + v[0] * d, y: e.row + 0.5 + v[1] * d });
  252 |   }
  253 |   return out;
  254 | }
  255 | 
  256 | export interface PostSpec {
  257 |   readonly col: number;
  258 |   readonly row: number;
  259 |   readonly clock: number;
```