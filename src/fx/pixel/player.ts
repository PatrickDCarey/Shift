/**
 * Player frames for both Tandem bodies (runner and twin) at C's scale: frame list, poses, the
 * role-to-colour palette swap for each band, and the baker. Pure; no Phaser.
 * Owner: art-director.
 *
 * A band change swaps the palette and the torso pattern; the pose and
 * silhouette do not change. Every frame, death included, shows the pattern.
 */
import type { BandColor } from '../../core/types';
import { bayer, createRaster, rgba, setPixel, type Raster, type Rgba } from './raster';
import {
  ROLE,
  addKeyline,
  buildBody,
  composeChunks,
  cropRoles,
  type Leg,
  type Pose,
  type Role,
  type RoleGrid,
  type Variant,
  BODY_X,
  FRAME_H,
  FRAME_W,
} from './playerBody';
import { hexToRgb, mix } from '../color';
import { palette, patternOf } from '../palette';
import type { PatternId } from '../patterns';

export const BANDS: readonly BandColor[] = ['white', 'blue', 'green', 'yellow', 'red'];

/** How a frame is coloured: normal, the white flash of a band change or death, or a white outline halo. */
export type FrameMode = 'normal' | 'flash' | 'halo';

export interface FrameDef {
  readonly name: string;
  readonly mode: FrameMode;
  build(variant: Variant, pattern: PatternId): RoleGrid;
}

export interface AnimMeta {
  readonly name: string;
  readonly frames: number;
  /** Suggested playback rate; scale it with speed for run and sprint. */
  readonly fps: number;
  readonly loop: boolean;
}

const leg = (dx: number, up: number): Leg => ({ dx, up });
const pose = (p: Pose): ((v: Variant, pat: PatternId) => RoleGrid) => (v, pat) => addKeyline(buildBody(v, pat, p));

const RUN: readonly Pose[] = [
  { lean: 1, legL: leg(-2, 0), legR: leg(2, 1) },
  { lean: 1, squash: 1, legL: leg(-1, 0), legR: leg(1, 2) },
  { lean: 1, legL: leg(0, 2), legR: leg(0, 0) },
  { lean: 1, legL: leg(2, 1), legR: leg(-2, 0) },
  { lean: 1, squash: 1, legL: leg(1, 2), legR: leg(-1, 0) },
  { lean: 1, legL: leg(0, 0), legR: leg(0, 2) },
];
const SPRINT: readonly Pose[] = [
  { lean: 2, legL: leg(-3, 0), legR: leg(3, 2) },
  { lean: 2, squash: 1, legL: leg(-1, 0), legR: leg(2, 2) },
  { lean: 2, stretch: 1, legL: leg(0, 2), legR: leg(0, 0) },
  { lean: 2, legL: leg(3, 2), legR: leg(-3, 0) },
  { lean: 2, squash: 1, legL: leg(2, 2), legR: leg(-1, 0) },
  { lean: 2, stretch: 1, legL: leg(0, 0), legR: leg(0, 2) },
];

function sequence(anim: string, poses: readonly Pose[]): FrameDef[] {
  return poses.map((p, i) => ({ name: `${anim}_${i}`, mode: 'normal' as const, build: pose(p) }));
}

/** The home mark above a parked body: a 5 x 4 house in the HUD text colour, centred on the body. */
const HOME_MARK: readonly string[] = ['..#..', '.###.', '#####', '##.##'];

/**
 * Parked (home): the body crouches with its legs together and its eyes shut, and a small house
 * hangs above it. One frame, no animation; the band pattern stays on the torso.
 */
function parkedBody(v: Variant, pat: PatternId): RoleGrid {
  const g = addKeyline(buildBody(v, pat, { squash: 4, blink: true, legL: leg(2, 0), legR: leg(-2, 0) }));
  const cells = Uint8Array.from(g.cells);
  const x0 = BODY_X + 4;
  HOME_MARK.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') cells[(y + 1) * FRAME_W + x0 + x] = ROLE.mark;
  });
  return { width: g.width, height: g.height, cells };
}

/** Death: flash, crack, four chunks, scattered and dithered debris. Chunks keep their pattern pixels. */
function deathFrames(): FrameDef[] {
  const idle = (v: Variant, pat: PatternId): RoleGrid => buildBody(v, pat, {});
  const splitX = BODY_X + 6;
  const splitY = 14;
  const chunks = (g: RoleGrid, offs: readonly [number, number][]): RoleGrid =>
    composeChunks(
      [
        cropRoles(g, 0, 0, splitX, splitY),
        cropRoles(g, splitX, 0, FRAME_W, splitY),
        cropRoles(g, 0, splitY, splitX, FRAME_H),
        cropRoles(g, splitX, splitY, FRAME_W, FRAME_H),
      ].map((grid, i) => ({ grid, dx: offs[i]?.[0] ?? 0, dy: offs[i]?.[1] ?? 0 })),
    );
  return [
    { name: 'death_0', mode: 'flash', build: (v, pat) => addKeyline(idle(v, pat)) },
    {
      name: 'death_1',
      mode: 'normal',
      build: (v, pat) => {
        const g = buildBody(v, pat, { squash: 2 });
        const cells = Uint8Array.from(g.cells);
        for (let y = 8; y < 22; y++) {
          const i = y * FRAME_W + BODY_X + 5 + (y % 2);
          if (cells[i] !== ROLE.none) cells[i] = ROLE.key;
        }
        return addKeyline({ width: g.width, height: g.height, cells });
      },
    },
    {
      name: 'death_2',
      mode: 'normal',
      build: (v, pat) =>
        addKeyline(chunks(idle(v, pat), [[-2, -2], [2, -3], [-1, 1], [2, 1]])),
    },
    {
      name: 'death_3',
      mode: 'normal',
      build: (v, pat) => {
        const g = chunks(idle(v, pat), [[-4, -5], [4, -7], [-3, 1], [4, 0]]);
        const cells = Uint8Array.from(g.cells);
        for (let y = 0; y < FRAME_H; y++) {
          for (let x = 0; x < FRAME_W; x++) if (bayer(x, y) < 0.4) cells[y * FRAME_W + x] = ROLE.none;
        }
        return { width: g.width, height: g.height, cells };
      },
    },
  ];
}

export const PLAYER_FRAMES: readonly FrameDef[] = [
  ...sequence('idle', [{}, { squash: 1, blink: true }]),
  ...sequence('run', RUN),
  ...sequence('sprint', SPRINT),
  ...sequence('jump', [
    { squash: 2, legL: leg(-1, 0), legR: leg(1, 0) },
    { stretch: 1, lean: 1, legL: leg(-1, 2), legR: leg(1, 2) },
  ]),
  ...sequence('fall', [
    { stretch: 1, legL: leg(-2, 1), legR: leg(2, 1) },
    { stretch: 1, legL: leg(-3, 2), legR: leg(3, 2) },
  ]),
  ...sequence('land', [
    { squash: 3, legL: leg(-2, 0), legR: leg(2, 0) },
    { squash: 1, legL: leg(-1, 0), legR: leg(1, 0) },
  ]),
  ...sequence('skid', [
    { lean: -2, squash: 1, legL: leg(2, 0), legR: leg(3, 0) },
    { lean: -3, squash: 2, legL: leg(3, 0), legR: leg(3, 1) },
  ]),
  ...deathFrames(),
  { name: 'park_0', mode: 'normal', build: parkedBody },
  { name: 'shift_0', mode: 'flash', build: pose({}) },
  { name: 'shift_1', mode: 'halo', build: pose({}) },
];

export const PLAYER_ANIMS: readonly AnimMeta[] = [
  { name: 'idle', frames: 2, fps: 2, loop: true },
  { name: 'run', frames: 6, fps: 12, loop: true },
  { name: 'sprint', frames: 6, fps: 14, loop: true },
  { name: 'jump', frames: 2, fps: 8, loop: false },
  { name: 'fall', frames: 2, fps: 8, loop: false },
  { name: 'land', frames: 2, fps: 12, loop: false },
  { name: 'skid', frames: 2, fps: 10, loop: false },
  { name: 'death', frames: 4, fps: 8, loop: false },
  { name: 'park', frames: 1, fps: 1, loop: false },
  { name: 'shift', frames: 2, fps: 20, loop: false },
];

/** Role to colour for one band and mode. The pattern ink is the palette's dark ink (full strength, so it stays 3:1 under protanopia), or the band fill when the body is flashed white. */
export function roleColors(band: BandColor, mode: FrameMode): Record<Role, Rgba> {
  const s = palette.gears[band].solid;
  const fill = hexToRgb(s.fill);
  const white = hexToRgb('#FFFFFF');
  const bg = hexToRgb(palette.pixel.keyline);
  const flash = mode === 'flash';
  const dark = hexToRgb(s.ink);
  const standing = band === 'white';
  return {
    [ROLE.none]: [0, 0, 0, 0],
    [ROLE.key]: rgba(mode === 'halo' ? white : bg),
    [ROLE.outline]: rgba(flash || mode === 'halo' ? white : hexToRgb(s.outline)),
    [ROLE.fill]: rgba(flash ? white : fill),
    [ROLE.ink]: rgba(flash ? fill : dark),
    [ROLE.visor]: rgba(standing && !flash ? bg : white),
    [ROLE.pupil]: rgba(standing && !flash ? white : bg),
    [ROLE.shade]: rgba(flash ? mix(white, fill, 0.35) : mix(fill, bg, palette.pixel.shadeMix)),
    [ROLE.light]: rgba(flash ? white : mix(fill, white, palette.pixel.lipMix)),
    [ROLE.mark]: rgba(hexToRgb(palette.ui.text)),
  };
}

/** Bake a role grid with a band's palette into an RGBA frame. */
export function bakeRoles(g: RoleGrid, band: BandColor, mode: FrameMode): Raster {
  const colors = roleColors(band, mode);
  const out = createRaster(g.width, g.height);
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const role = (g.cells[y * g.width + x] ?? ROLE.none) as Role;
      if (role !== ROLE.none) setPixel(out, x, y, colors[role]);
    }
  }
  return out;
}

/** One finished player frame for a runner and band. */
export function bakePlayerFrame(variant: Variant, band: BandColor, def: FrameDef): Raster {
  return bakeRoles(def.build(variant, patternOf(band)), band, def.mode);
}
