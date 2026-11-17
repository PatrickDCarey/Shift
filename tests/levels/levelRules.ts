/**
 * Level rules the parser leaves to review, as pure checks (Batch 6 wave 2,
 * B6-24 sitting). Owner: tech-lead.
 *
 * - **Tandem fits the camera** (batch 5 review G4; `tandem.md` "Camera", "Level
 *   rules"): from the top body's head to the bottom body's feet at spawn,
 *   `|start.row - twinStart.row| + playerHeight` is at most 15 rows, so the
 *   camera never needs to scroll vertically to keep both bodies on screen.
 * - **Tandem lane colouring** (`decisions.md` 2026-11-16, `tandem.md` "Level
 *   rules"): spawn rows at least 3 apart, and every colored tile strictly
 *   nearer its own body's start row. A tile's lane is fixed by geometry: the
 *   upper body's lane runs down to its floor (the first non-empty cell under
 *   its spawn, the divider), the lower body's lane is everything below that.
 * - **HUD area** (`decisions.md` 2026-11-16): at the level's starting camera
 *   position, no colored tile, exit or hint box overlaps screen x 0-120,
 *   y 0-40 (480 x 270 logical px). Safe tiles may. The camera is the scene's
 *   own pure maths (`src/entities/camera.ts`), so the check frames the level
 *   exactly as the game does. A hint box is the widest cap pair the spec
 *   allows (`onboarding-hints.md` "Drawing": at most 48 x 24 px, centred on
 *   the anchor column, bottom on the anchor row's bottom).
 */
import type { Level, TilePos } from '../../src/core';
import { cameraFocus, cameraScroll, snapFeet, type CameraBody } from '../../src/entities/camera';

/** Two lanes plus the divider take at most this many rows (`tandem.md`). */
export const TANDEM_MAX_ROWS = 15;
/** Spawn rows at least this far apart (`tandem.md` "Lane colouring"). */
export const TANDEM_MIN_SPAWN_GAP = 3;
/** Logical canvas (`src/main.ts`, adr-pixel-rendering.md). */
export const VIEW = { width: 480, height: 270 } as const;
/** HUD area at 480 x 270: screen x 0-120, y 0-40 (`decisions.md` 2026-11-16). */
export const HUD_AREA = { left: 0, top: 0, right: 120, bottom: 40 } as const;
/** Widest and tallest hint cap pair (`onboarding-hints.md` "Drawing"). */
export const HINT_PX = { maxWidth: 48, height: 24 } as const;

export interface RuleConfig {
  readonly tileSize: number;
  readonly playerHeightTiles: number;
  readonly cameraMaxApartTiles: number;
}

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const overlaps = (a: Rect, b: Rect): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function kindAt(level: Level, col: number, row: number): string {
  return level.tiles[row * level.width + col]?.kind ?? 'outside';
}

/** G4: both bodies fit in 15 rows at spawn. [] for a level without a twin. */
export function tandemHeightProblems(level: Level, playerHeightTiles: number): readonly string[] {
  if (level.twinStart === null) return [];
  const span = Math.abs(level.start.row - level.twinStart.row) + playerHeightTiles;
  return span <= TANDEM_MAX_ROWS
    ? []
    : [`${level.meta.id}: the bodies span ${span} rows at spawn (start rows ${level.start.row} and ${level.twinStart.row} plus ${playerHeightTiles}); at most ${TANDEM_MAX_ROWS}`];
}

/** Row of the first non-empty cell under `pos` in its column (exits count as empty), or null over a pit. */
function floorRow(level: Level, pos: TilePos): number | null {
  for (let r = pos.row + 1; r < level.height; r += 1) {
    const kind = kindAt(level, pos.col, r);
    if (kind !== 'empty' && kind !== 'exit') return r;
  }
  return null;
}

/** Lane colouring: spawn rows >= 3 apart and every colored tile strictly nearer its own lane's start row. */
export function tandemLaneProblems(level: Level): readonly string[] {
  const twin = level.twinStart;
  if (twin === null) return [];
  const id = level.meta.id;
  const gap = Math.abs(level.start.row - twin.row);
  if (gap < TANDEM_MIN_SPAWN_GAP) return [`${id}: spawn rows ${level.start.row} and ${twin.row} are ${gap} apart; at least ${TANDEM_MIN_SPAWN_GAP}`];
  const [upper, lower] = level.start.row < twin.row ? [level.start, twin] : [twin, level.start];
  const divider = floorRow(level, upper);
  if (divider === null) return [`${id}: no floor under the upper spawn (col ${upper.col}, row ${upper.row}), so the lanes cannot be told apart`];
  const problems: string[] = [];
  for (let row = 0; row < level.height; row += 1) {
    const [own, other] = row <= divider ? [upper.row, lower.row] : [lower.row, upper.row];
    if (Math.abs(row - own) < Math.abs(row - other)) continue;
    for (let col = 0; col < level.width; col += 1) {
      if (kindAt(level, col, row) === 'colored') {
        problems.push(`${id}: colored tile (${col}, ${row}) is in the lane of start row ${own} but not strictly nearer it than start row ${other}`);
      }
    }
  }
  return problems;
}

/** Camera scroll on the first frame, from the spawns, exactly as the scene computes it. */
export function startScroll(level: Level, cfg: RuleConfig): { readonly x: number; readonly y: number } {
  const ts = cfg.tileSize;
  const body = (p: TilePos): CameraBody => ({ ...snapFeet(p.col + 0.5, p.row + 1, ts), home: false });
  const bodies = level.twinStart === null ? [body(level.start)] : [body(level.start), body(level.twinStart)];
  const focus = cameraFocus(bodies, Math.round(cfg.playerHeightTiles * ts), cfg.cameraMaxApartTiles * ts);
  const f = focus ?? { x: 0, y: 0 };
  return cameraScroll(f.x, f.y, VIEW.width, VIEW.height, level.width * ts, level.height * ts);
}

/** HUD rule: no colored tile, exit or hint box under the HUD area at the starting camera. */
export function hudAreaProblems(level: Level, cfg: RuleConfig): readonly string[] {
  const ts = cfg.tileSize;
  const s = startScroll(level, cfg);
  const id = level.meta.id;
  const problems: string[] = [];
  for (let row = 0; row < level.height; row += 1) {
    for (let col = 0; col < level.width; col += 1) {
      const kind = kindAt(level, col, row);
      if (kind !== 'colored' && kind !== 'exit') continue;
      const rect = { left: col * ts - s.x, top: row * ts - s.y, right: (col + 1) * ts - s.x, bottom: (row + 1) * ts - s.y };
      if (overlaps(rect, HUD_AREA)) problems.push(`${id}: ${kind} tile (${col}, ${row}) is under the HUD area at the starting camera`);
    }
  }
  for (const hint of level.meta.hints ?? []) {
    const centre = hint.anchor.col * ts + ts / 2 - s.x;
    const bottom = (hint.anchor.row + 1) * ts - s.y;
    const rect = { left: centre - HINT_PX.maxWidth / 2, top: bottom - HINT_PX.height, right: centre + HINT_PX.maxWidth / 2, bottom };
    if (overlaps(rect, HUD_AREA)) problems.push(`${id}: hint ${hint.glyph} at (${hint.anchor.col}, ${hint.anchor.row}) is under the HUD area at the starting camera`);
  }
  return problems;
}
