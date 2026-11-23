/**
 * Level rules for the expansion's kinetic pieces and long levels, as pure
 * checks (B11-15; design request 2026-11-23 in `docs/production/requests.md`;
 * level-format.md §2 "Kinetic headers", "Level rules, not parser rules").
 * The parser accepts every speed in {1, 2, 4, 8}; these are the narrower
 * values levels may ship. Owner: tech-lead.
 *
 * Geometry, in tiles (y down, right/bottom exclusive):
 * - **Swept area** of a slab: bounding box of its track corners
 *   (`moverCorners`, the same function the sim and renderer use) plus width x 1.
 * - **Lane** of an emitter: from its own cell up to, not including, the end
 *   cell (cell + range along `dir`). A shot's centre runs from the cell
 *   centre to just short of the end cell's centre, so the end cell is where
 *   the bolt sinks: it must be a wall (any non-empty tile but an exit).
 * - **Spawn box**: the spawn column, from the spawn row up `ceil(playerHeight)`
 *   rows (feet on the spawn cell's bottom), for `@` and `&`.
 * - **HUD**: like hint boxes (`hintHudReachProblems`), no camera position the
 *   level allows may put a swept area or lane under the HUD area, because the
 *   pieces move while the camera scrolls.
 */
import { moverCorners, type Emitter, type KinDir, type Level, type Mover, type TilePos } from '../../src/core';
import { reachesOnAxis } from './hintPlacement';
import { HUD_AREA, VIEW, hintBoxPx, type RuleConfig } from './levelRules';

/** Slab speeds a level may ship (32nds of a tile per step). */
export const SLAB_SPEEDS: readonly number[] = [1, 2];
/** Shot speeds a level may ship. */
export const SHOT_SPEEDS: readonly number[] = [2, 4];
export const SLAB_WIDTH = { min: 2, max: 8 } as const;
export const MIN_SHOT_PERIOD = 12;
/** Empty rows above every cell of a slab's swept area. */
export const MIN_HEADROOM_ROWS = 2;
/** Steps a slab rests where a horizontal leg ends. */
export const MIN_REST_STEPS = 30;
/** Longest shipped recording, steps (90 s). */
export const MAX_RECORDING_STEPS = 5400;

export interface CellRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const STEP: Readonly<Record<KinDir, { readonly x: number; readonly y: number }>> = {
  l: { x: -1, y: 0 },
  r: { x: 1, y: 0 },
  u: { x: 0, y: -1 },
  d: { x: 0, y: 1 },
};

const overlaps = (a: CellRect, b: CellRect): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function kindAt(level: Level, col: number, row: number): string {
  if (col < 0 || row < 0 || col >= level.width || row >= level.height) return 'outside';
  return level.tiles[row * level.width + col]?.kind ?? 'outside';
}

function cellsOf(r: CellRect): readonly TilePos[] {
  const cells: TilePos[] = [];
  for (let row = r.top; row < r.bottom; row += 1) for (let col = r.left; col < r.right; col += 1) cells.push({ col, row });
  return cells;
}

/** Bounding box of every cell the slab ever covers. */
export function sweptArea(m: Mover): CellRect {
  const corners = moverCorners(m);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    left: m.origin.col + Math.min(...xs),
    top: m.origin.row + Math.min(...ys),
    right: m.origin.col + Math.max(...xs) + m.width,
    bottom: m.origin.row + Math.max(...ys) + m.height,
  };
}

/** The emitter's cell through the last cell before the end cell. */
export function laneArea(e: Emitter): CellRect {
  const d = STEP[e.dir];
  const far = { col: e.cell.col + d.x * (e.range - 1), row: e.cell.row + d.y * (e.range - 1) };
  return {
    left: Math.min(e.cell.col, far.col),
    top: Math.min(e.cell.row, far.row),
    right: Math.max(e.cell.col, far.col) + 1,
    bottom: Math.max(e.cell.row, far.row) + 1,
  };
}

const movers = (level: Level): readonly Mover[] => level.movers ?? [];
const emitters = (level: Level): readonly Emitter[] => level.emitters ?? [];

/** Slab speed and width, shot speed and period. */
export function kineticValueProblems(level: Level): readonly string[] {
  const id = level.meta.id;
  const out: string[] = [];
  movers(level).forEach((m, i) => {
    if (!SLAB_SPEEDS.includes(m.speed)) out.push(`${id}: mover ${i} speed ${m.speed}; levels use ${SLAB_SPEEDS.join(' or ')}`);
    if (m.width < SLAB_WIDTH.min || m.width > SLAB_WIDTH.max) out.push(`${id}: mover ${i} width ${m.width}; levels use ${SLAB_WIDTH.min}-${SLAB_WIDTH.max}`);
  });
  emitters(level).forEach((e, i) => {
    if (!SHOT_SPEEDS.includes(e.speed)) out.push(`${id}: emitter ${i} speed ${e.speed}; levels use ${SHOT_SPEEDS.join(' or ')}`);
    if (e.period < MIN_SHOT_PERIOD) out.push(`${id}: emitter ${i} period ${e.period}; at least ${MIN_SHOT_PERIOD}`);
  });
  return out;
}

/** Swept area holds only empty cells or exits (exits: `keepOutProblems`), with 2 empty in-grid rows above. */
export function slabRoomProblems(level: Level): readonly string[] {
  const id = level.meta.id;
  const out: string[] = [];
  movers(level).forEach((m, i) => {
    const area = sweptArea(m);
    for (const c of cellsOf(area)) {
      const kind = kindAt(level, c.col, c.row);
      if (kind !== 'empty' && kind !== 'exit') out.push(`${id}: mover ${i} sweeps over ${kind} tile (${c.col}, ${c.row})`);
    }
    const head = { ...area, top: area.top - MIN_HEADROOM_ROWS, bottom: area.top };
    for (const c of cellsOf(head)) {
      const kind = kindAt(level, c.col, c.row);
      if (kind !== 'empty') out.push(`${id}: mover ${i} headroom cell (${c.col}, ${c.row}) is ${kind}; ${MIN_HEADROOM_ROWS} empty rows above the swept area`);
    }
  });
  return out;
}

/**
 * Every end of a horizontal leg rests at least 30 steps: for each pair of
 * consecutive move tokens (cyclic) where either is `l`/`r`, the waits between
 * them sum to >= 30, unless both move the same way (one leg split in two).
 * `exempt` holds `<id>:mover<i>:<token index of the leg's last move>` keys for
 * ends no line uses, each with its `levels/README.md` line (design's "or a
 * README line per level").
 */
export function slabRestProblems(level: Level, exempt: ReadonlySet<string> = new Set()): readonly string[] {
  const id = level.meta.id;
  const out: string[] = [];
  movers(level).forEach((m, i) => {
    const moves = m.path.flatMap((t, k) => (t.kind === 'move' ? [k] : []));
    moves.forEach((a, n) => {
      const b = moves[(n + 1) % moves.length] ?? a;
      const ta = m.path[a];
      const tb = m.path[b];
      if (ta?.kind !== 'move' || tb?.kind !== 'move') return;
      const horizontal = 'lr'.includes(ta.dir) || 'lr'.includes(tb.dir);
      if (!horizontal || ta.dir === tb.dir || exempt.has(`${id}:mover${i}:${a}`)) return;
      let rest = 0;
      for (let k = (a + 1) % m.path.length; k !== b; k = (k + 1) % m.path.length) {
        const t = m.path[k];
        if (t?.kind === 'wait') rest += t.steps;
      }
      if (rest < MIN_REST_STEPS) out.push(`${id}: mover ${i} rests ${rest} steps after path token ${a} (${ta.dir}${ta.tiles}); at least ${MIN_REST_STEPS} where a horizontal leg ends`);
    });
  });
  return out;
}

/** Lane cells past the muzzle are empty; the end cell is a wall. */
export function laneProblems(level: Level): readonly string[] {
  const id = level.meta.id;
  const out: string[] = [];
  emitters(level).forEach((e, i) => {
    for (const c of cellsOf(laneArea(e))) {
      const kind = kindAt(level, c.col, c.row);
      if (kind !== 'empty' && kind !== 'exit') out.push(`${id}: emitter ${i} lane crosses ${kind} tile (${c.col}, ${c.row})`);
    }
    const d = STEP[e.dir];
    const end = { col: e.cell.col + d.x * e.range, row: e.cell.row + d.y * e.range };
    const kind = kindAt(level, end.col, end.row);
    if (kind === 'empty' || kind === 'exit') out.push(`${id}: emitter ${i} lane ends in ${kind} cell (${end.col}, ${end.row}); it must end at a wall`);
  });
  return out;
}

function spawnBox(p: TilePos, playerHeightTiles: number): CellRect {
  return { left: p.col, top: p.row + 1 - Math.ceil(playerHeightTiles), right: p.col + 1, bottom: p.row + 1 };
}

function underHud(area: CellRect, level: Level, ts: number): boolean {
  return (
    reachesOnAxis(area.left * ts, area.right * ts, HUD_AREA.left, HUD_AREA.right, VIEW.width, level.width * ts) &&
    reachesOnAxis(area.top * ts, area.bottom * ts, HUD_AREA.top, HUD_AREA.bottom, VIEW.height, level.height * ts)
  );
}

/** Swept areas and lanes stay clear of spawn boxes, exits, hint boxes and the HUD at any camera. */
export function keepOutProblems(level: Level, cfg: RuleConfig): readonly string[] {
  const id = level.meta.id;
  const ts = cfg.tileSize;
  const spawns = level.twinStart === null ? [level.start] : [level.start, level.twinStart];
  const pieces = [
    ...movers(level).map((m, i) => ({ name: `mover ${i} swept area`, area: sweptArea(m) })),
    ...emitters(level).map((e, i) => ({ name: `emitter ${i} lane`, area: laneArea(e) })),
  ];
  const out: string[] = [];
  for (const { name, area } of pieces) {
    for (const s of spawns) {
      if (overlaps(area, spawnBox(s, cfg.playerHeightTiles))) out.push(`${id}: ${name} overlaps the spawn box at (${s.col}, ${s.row})`);
    }
    for (const c of cellsOf(area)) {
      if (kindAt(level, c.col, c.row) === 'exit') out.push(`${id}: ${name} overlaps the exit at (${c.col}, ${c.row})`);
    }
    for (const h of level.meta.hints ?? []) {
      const b = hintBoxPx(h, ts);
      const box = { left: b.left / ts, top: b.top / ts, right: b.right / ts, bottom: b.bottom / ts };
      if (overlaps(area, box)) out.push(`${id}: ${name} overlaps hint ${h.glyph} at (${h.anchor.col}, ${h.anchor.row})`);
    }
    if (underHud(area, level, ts)) out.push(`${id}: ${name} can pass under the HUD area at some camera position`);
  }
  return out;
}

/** Long levels: a recording is at most 5,400 steps. */
export function recordingLengthProblems(id: string, steps: number): readonly string[] {
  return steps <= MAX_RECORDING_STEPS ? [] : [`${id}: recording is ${steps} steps; at most ${MAX_RECORDING_STEPS}`];
}
