/**
 * PT-3 "why you fell": which tiles to ring, and for how long. Pure. A `fallThrough`
 * sim event starts one cue per body (a new one replaces it); the cue runs on render
 * time, so it survives the death freeze, and respawn or restart clears it. The
 * frame to draw comes from `whyFellFrame` (src/fx), which also knows reduced motion.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { ColoredBand, SimEvent, SimStatus } from '../core/types';
import { effectFrameNames, whyFellFrame, type WhyBand } from '../fx';

export interface WhyRing {
  /** The tile's top-left in world px. */
  readonly x: number;
  readonly y: number;
  readonly band: ColoredBand;
}

/** One ring to draw this frame: the tile's top-left and its atlas frame in `pixel-fx`. */
export interface WhyDraw {
  readonly x: number;
  readonly y: number;
  readonly frame: string;
}

interface Cue {
  readonly startedMs: number;
  readonly rings: readonly WhyRing[];
}

/** `BAND_COLORS` names for the four coloured bands (1 blue .. 4 red); white has no tile and no frame. */
const WHY_BAND_BY_BAND: Readonly<Record<ColoredBand, WhyBand>> = { 1: 'blue', 2: 'green', 3: 'yellow', 4: 'red' };

/** The rings a `fallThrough` event asks for. Other events give none. */
export function ringsFor(event: SimEvent, tileSize: number): readonly WhyRing[] {
  if (event.type !== 'fallThrough') return [];
  return event.cells.map((c) => ({ x: c.col * tileSize, y: c.row * tileSize, band: c.band }));
}

/** True on the frame a body respawned or the level restarted: the old cue is stale. */
export function isRespawn(prev: SimStatus, now: SimStatus, events: readonly SimEvent[]): boolean {
  const wasDown = prev === 'dead' || prev === 'restarting';
  return (wasDown && now === 'playing') || events.some((e) => e.type === 'restart');
}

export class WhyFellTracker {
  private readonly cues = new Map<number, Cue>();

  /** Start (or replace) the cue of each `fallThrough` in `events`, at render time `nowMs`. */
  start(events: readonly SimEvent[], nowMs: number, tileSize: number): void {
    for (const e of events) {
      if (e.type !== 'fallThrough') continue;
      const rings = ringsFor(e, tileSize);
      if (rings.length > 0) this.cues.set(e.body, { startedMs: nowMs, rings });
    }
  }

  clear(): void {
    this.cues.clear();
  }

  /** Every ring to draw at `nowMs`; finished cues are dropped. */
  draw(nowMs: number, reducedMotion: boolean): readonly WhyDraw[] {
    const out: WhyDraw[] = [];
    for (const [body, cue] of this.cues) {
      const step = whyFellFrame(nowMs - cue.startedMs, reducedMotion);
      if (step === null) {
        this.cues.delete(body);
        continue;
      }
      for (const r of cue.rings) out.push({ x: r.x, y: r.y, frame: effectFrameNames().why(WHY_BAND_BY_BAND[r.band], step) });
    }
    return out;
  }
}
