/**
 * The `pixel-kinetics` atlas for the expansion: slab segments, direction chevrons, track cells,
 * emitters, bolts, shimmer and catcher frames. Frame-name helpers and the sheet item list.
 * Pure; render-only. Owner: art-director. See docs/art/kinetics.md for the scene-facing API.
 *
 * Names (all in atlas `pixel-kinetics`):
 *  slab/<safe|blue|green|yellow|red>/<solid|ghost>/<L|M|R|S>   16x16, origin (0, 0)
 *  slab/chevron/<l|r|u|d>                                      8x8 white mask, origin (0.5, 0.5)
 *  track/<h|v|ne|nw|se|sw|stop/l|stop/r|stop/u|stop/d>         16x16 white mask, origin (0, 0)
 *  emitter/<l|r|u|d>/<grey|white|blue|green|yellow|red>/<idle|tell>  16x16, origin (0, 0)
 *  bolt/<grey|white|blue|green|yellow|red>                     8x8, origin (0.5, 0.5)
 *  bolt/shimmer/<0-3>                                          16x16 white mask, origin (0.5, 0.5)
 *  bolt/sink/<l|r|u|d>                                         16x16 white mask, origin (0, 0)
 *  checkpoint/<idle|lit>, checkpoint/rise/<0-2>               16x24, origin (0.5, 1)  (see posts.ts)
 */
import type { PackItem } from './atlas';
import {
  BOLT_KINDS, EMITTER_STATES, SHIMMER_FRAMES, bakeBolt, bakeEmitter, bakeShimmer, bakeSink, boltFrameNames,
} from './bolts';
import {
  DIRS, SLAB_KINDS, SLAB_SEGMENTS, SLAB_STATES, TRACK_CELLS, bakeChevron, bakeSlabSegment, bakeTrackCell,
} from './movers';
import { POST_ORIGIN, POST_RISE_FRAMES, bakePost, bakePostRise, postFrameNames } from './posts';
import type { SlabKind, SlabSegment, SlabState, TrackCell, Dir } from './movers';

export function kineticFrameNames(): {
  slab: (kind: SlabKind, state: SlabState, seg: SlabSegment) => string;
  chevron: (dir: Dir) => string;
  track: (cell: TrackCell) => string;
} & ReturnType<typeof boltFrameNames> & { post: ReturnType<typeof postFrameNames> } {
  return {
    slab: (kind, state, seg) => `slab/${kind}/${state}/${seg}`,
    chevron: (dir) => `slab/chevron/${dir}`,
    track: (cell) => `track/${cell}`,
    ...boltFrameNames(),
    post: postFrameNames(),
  };
}

export function kineticItems(): PackItem[] {
  const n = kineticFrameNames();
  const items: PackItem[] = [];
  for (const kind of SLAB_KINDS) {
    for (const state of SLAB_STATES) {
      for (const seg of SLAB_SEGMENTS) items.push({ name: n.slab(kind, state, seg), raster: bakeSlabSegment(kind, seg, state), pivot: { x: 0, y: 0 } });
    }
  }
  for (const d of DIRS) items.push({ name: n.chevron(d), raster: bakeChevron(d), pivot: { x: 0.5, y: 0.5 } });
  for (const c of TRACK_CELLS) items.push({ name: n.track(c), raster: bakeTrackCell(c), pivot: { x: 0, y: 0 } });
  for (const d of DIRS) {
    for (const k of BOLT_KINDS) {
      for (const s of EMITTER_STATES) items.push({ name: n.emitter(d, k, s), raster: bakeEmitter(d, k, s), pivot: { x: 0, y: 0 } });
    }
  }
  for (const k of BOLT_KINDS) items.push({ name: n.bolt(k), raster: bakeBolt(k), pivot: { x: 0.5, y: 0.5 } });
  for (let f = 0; f < SHIMMER_FRAMES; f++) items.push({ name: n.shimmer(f), raster: bakeShimmer(f), pivot: { x: 0.5, y: 0.5 } });
  for (const d of DIRS) items.push({ name: n.sink(d), raster: bakeSink(d), pivot: { x: 0, y: 0 } });
  items.push({ name: n.post.idle, raster: bakePost('idle'), pivot: POST_ORIGIN });
  items.push({ name: n.post.lit, raster: bakePost('lit'), pivot: POST_ORIGIN });
  for (let f = 0; f < POST_RISE_FRAMES; f++) items.push({ name: n.post.rise(f), raster: bakePostRise(f), pivot: POST_ORIGIN });
  return items;
}
