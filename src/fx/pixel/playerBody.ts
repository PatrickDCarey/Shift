/**
 * Role-coded pixel bodies for the two Tandem bodies (runner and twin) at 12 x 24 px. A body is
 * a grid of roles (outline, fill, ink, visor, ...), not colours: a band change
 * is a palette swap (roles to colours) plus the band's pattern in the torso,
 * and nothing else about the frame changes. Pure; no Phaser. Owner: art-director.
 *
 * Silhouettes differ so the two runners never rely on colour alone:
 * - runner (body 0): flat head, one wide visor, legs under the torso.
 * - twin (body 1): antenna on top, chamfered shoulders, two square eyes, wide stance.
 */
import { PIXEL_CELLS, pixelPatternOn, type PatternId } from '../patterns';

export const FRAME_W = 20;
export const FRAME_H = 28;
/** Feet baseline: the bottom edge of the lowest body row sits here, so sprite origin y = 26 / 28. */
export const FEET_Y = 26;
/** Left edge of the 12 px wide body box inside a frame. */
export const BODY_X = 4;

export const ROLE = { none: 0, key: 1, outline: 2, fill: 3, ink: 4, visor: 5, pupil: 6, shade: 7, light: 8 } as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

/** The two Tandem bodies: the runner (body 0) and the twin (body 1). */
export type Variant = 'runner' | 'twin';
export const VARIANTS: readonly Variant[] = ['runner', 'twin'];

export interface RoleGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
}

export interface Leg {
  /** Sideways shift in pixels (positive = forward, to the right). */
  readonly dx: number;
  /** Rows the foot is raised (the leg is that much shorter). */
  readonly up: number;
}

export interface Pose {
  /** Top of the body leans forward by this many pixels (negative = back). */
  readonly lean?: number;
  /** Rows removed from the torso (crouch, landing). */
  readonly squash?: number;
  /** Rows added to the torso (jump, fall). */
  readonly stretch?: number;
  readonly legL?: Leg;
  readonly legR?: Leg;
  /** Eyes closed to a slit. */
  readonly blink?: boolean;
}

const TORSO_ROWS = 20;
const LEG_ROWS = 4;
const PATTERN_TOP = 8;
const PATTERN_COL = 1;

interface VariantSpec {
  readonly spans: ReadonlyArray<readonly [number, number]>;
  readonly lightRow: number;
  readonly legCols: readonly [number, number];
  readonly squashRows: readonly number[];
}

const full = (n: number): ReadonlyArray<readonly [number, number]> => Array.from({ length: n }, () => [0, 11] as const);

const SPEC: Record<Variant, VariantSpec> = {
  runner: {
    spans: [[2, 9], [1, 10], ...full(TORSO_ROWS - 2)],
    lightRow: 1,
    legCols: [1, 7],
    squashRows: [7, 6, 13, 10],
  },
  twin: {
    spans: [[5, 6], [5, 6], [5, 6], [2, 9], [1, 10], ...full(TORSO_ROWS - 5)],
    lightRow: 4,
    legCols: [0, 8],
    squashRows: [7, 13, 10, 12],
  },
};

const idx = (x: number, y: number): number => y * FRAME_W + x;

/** Logical torso rows after squash and stretch: indices into 0..TORSO_ROWS-1. */
function torsoRowOrder(variant: Variant, squash: number, stretch: number): number[] {
  const drop = new Set(SPEC[variant].squashRows.slice(0, squash));
  const out: number[] = [];
  for (let r = 0; r < TORSO_ROWS; r++) {
    if (drop.has(r)) continue;
    out.push(r);
    if (r === 7) for (let k = 0; k < stretch; k++) out.push(7);
  }
  return out;
}

/** Detail role of an interior cell of logical torso row `r`, column `c` (0..11). */
function detailRole(variant: Variant, r: number, c: number, pattern: PatternId, blink: boolean): Role {
  if (r === SPEC[variant].lightRow) return ROLE.light;
  if (r === TORSO_ROWS - 1) return ROLE.shade;
  if (variant === 'runner') {
    const rows = blink ? [4] : [3, 4, 5];
    if (rows.includes(r) && c >= 5 && c <= 10) return !blink && r === 4 && c >= 9 ? ROLE.pupil : ROLE.visor;
  } else {
    const rows = blink ? [6] : [5, 6];
    if (rows.includes(r) && ((c >= 4 && c <= 5) || (c >= 8 && c <= 9))) return ROLE.visor;
  }
  const j = r - PATTERN_TOP;
  const w = PIXEL_CELLS.body.width;
  const i = c - PATTERN_COL;
  if (j >= 0 && j < PIXEL_CELLS.body.height && i >= 0 && i < w && pixelPatternOn(pattern, i, j, w)) return ROLE.ink;
  return ROLE.fill;
}

function outline(sil: Uint8Array, detail: Uint8Array): RoleGrid {
  const cells = new Uint8Array(FRAME_W * FRAME_H);
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < FRAME_W && y < FRAME_H && sil[idx(x, y)] === 1;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (!solid(x, y)) continue;
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      cells[idx(x, y)] = edge ? ROLE.outline : (detail[idx(x, y)] ?? ROLE.fill);
    }
  }
  return { width: FRAME_W, height: FRAME_H, cells };
}

/**
 * Build the role grid of one body pose, feet on `FEET_Y`, without the keyline
 * (add it with `addKeyline` once any chunk moves are done).
 */
export function buildBody(variant: Variant, pattern: PatternId, pose: Pose = {}): RoleGrid {
  const spec = SPEC[variant];
  const order = torsoRowOrder(variant, pose.squash ?? 0, pose.stretch ?? 0);
  const top = FEET_Y - (order.length + LEG_ROWS);
  const sil = new Uint8Array(FRAME_W * FRAME_H);
  const detail = new Uint8Array(FRAME_W * FRAME_H);
  const lean = pose.lean ?? 0;
  order.forEach((r, fy) => {
    const span = spec.spans[r] ?? [0, 11];
    const shift = Math.round((lean * (order.length - fy)) / order.length);
    for (let c = span[0]; c <= span[1]; c++) {
      const i = idx(BODY_X + c + shift, top + fy);
      sil[i] = 1;
      detail[i] = detailRole(variant, r, c, pattern, pose.blink ?? false);
    }
  });
  const legs: ReadonlyArray<readonly [number, Leg | undefined]> = [
    [spec.legCols[0], pose.legL],
    [spec.legCols[1], pose.legR],
  ];
  for (const [col, leg] of legs) {
    const len = LEG_ROWS - (leg?.up ?? 0);
    for (let k = 0; k < len; k++) {
      for (let c = 0; c < 4; c++) {
        const i = idx(BODY_X + col + c + (leg?.dx ?? 0), top + order.length + k);
        sil[i] = 1;
        detail[i] = k === len - 1 ? ROLE.shade : ROLE.fill;
      }
    }
  }
  return outline(sil, detail);
}

/** One-pixel keyline around every non-empty pixel (separates the body from a same-coloured floor). */
export function addKeyline(g: RoleGrid): RoleGrid {
  const cells = Uint8Array.from(g.cells);
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      if (g.cells[y * g.width + x] !== ROLE.none) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < g.width && ny < g.height && g.cells[ny * g.width + nx] !== ROLE.none) {
            cells[y * g.width + x] = ROLE.key;
          }
        }
      }
    }
  }
  return { width: g.width, height: g.height, cells };
}

/** Keep only the cells of `g` inside the pixel rectangle [x0, x1) x [y0, y1). */
export function cropRoles(g: RoleGrid, x0: number, y0: number, x1: number, y1: number): RoleGrid {
  const cells = new Uint8Array(g.cells.length);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cells[y * g.width + x] = g.cells[y * g.width + x] ?? ROLE.none;
  return { width: g.width, height: g.height, cells };
}

/** Lay `chunks` over each other, each moved by its own (dx, dy); later chunks win. */
export function composeChunks(chunks: ReadonlyArray<{ grid: RoleGrid; dx: number; dy: number }>): RoleGrid {
  const cells = new Uint8Array(FRAME_W * FRAME_H);
  for (const { grid, dx, dy } of chunks) {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const role = grid.cells[y * grid.width + x] ?? ROLE.none;
        const nx = x + dx;
        const ny = y + dy;
        if (role !== ROLE.none && nx >= 0 && ny >= 0 && nx < FRAME_W && ny < FRAME_H) cells[ny * FRAME_W + nx] = role;
      }
    }
  }
  return { width: FRAME_W, height: FRAME_H, cells };
}
