// Pure mapping from sim events to SFX cues. Owner: audio-designer.
// Audio only reads events; nothing here (or in the player) touches simulation state.
// Spec: docs/design/features/adaptive-audio.md.

import type { Band, BodyId, SimEvent } from '../core/types';
import type { SfxCue } from './sfxSpec';

/** Events the SFX mapper reads: the sim's own events, including `fallThrough` (contract in core/types). */
export type SfxSourceEvent = SimEvent;

/** Optional read-only context from the scene: each body's current band, indexed by body id. */
export interface SfxContext {
  readonly bands?: readonly (Band | undefined)[];
}

function bandOf(ctx: SfxContext | undefined, body: BodyId): Band | undefined {
  return ctx?.bands?.[body];
}

/**
 * The cue for one event, or null when the event is silent.
 *
 *   shift (to > from)  -> shiftUp         shift (to < from)  -> shiftDown
 *   shiftBuffered      -> soft shift up (net > 0) or soft shift down (net < 0)
 *   jump               -> jump            land               -> land
 *   airDrag            -> airDragClunk    fallThrough        -> fallThrough
 *   died, restart      -> reset           won                -> levelComplete
 *   home               -> homeChime (dropped by `sfxForEvents` on the win step)
 *
 * Silent on purpose: bandChange, graceStart (spec). Not sounded yet: wallStop, ceiling
 * (Should: a land thump a fifth down; left out until the playtest asks).
 */
export function sfxForEvent(event: SfxSourceEvent, ctx?: SfxContext): SfxCue | null {
  switch (event.type) {
    case 'shift':
      if (event.to === event.from) return null;
      return { id: event.to > event.from ? 'shiftUp' : 'shiftDown', body: event.body, from: event.from, to: event.to };
    case 'shiftBuffered':
      if (event.net === 0) return null;
      return { id: event.net > 0 ? 'shiftUp' : 'shiftDown', body: event.body, soft: true };
    case 'jump':
      return { id: 'jump', body: event.body, band: bandOf(ctx, event.body) };
    case 'land':
      return { id: 'land', body: event.body, band: bandOf(ctx, event.body) };
    case 'airDrag':
      return { id: 'airDragClunk', body: event.body };
    case 'fallThrough':
      return { id: 'fallThrough', body: event.body, band: bandOf(ctx, event.body) };
    case 'home':
      return { id: 'homeChime', body: event.body };
    case 'died':
    case 'restart':
      return { id: 'reset' };
    case 'won':
      return { id: 'levelComplete' };
    // Silent on purpose (spec: no SFX on bandChange or graceStart; wallStop and ceiling are not
    // sounded yet). Listed explicitly so a new event type fails the typecheck below.
    case 'bandChange':
    case 'graceStart':
    case 'wallStop':
    case 'ceiling':
      return null;
    default: {
      const unhandled: never = event;
      return unhandled;
    }
  }
}

function sameSound(a: SfxCue, b: SfxCue): boolean {
  return a.id === b.id && a.from === b.from && a.to === b.to && a.soft === b.soft;
}

function mergeUnison(cues: readonly SfxCue[]): SfxCue[] {
  const out: SfxCue[] = [];
  for (const cue of cues) {
    const i = cue.body === 1 && cue.id !== 'homeChime' ? out.findIndex((c) => c.body === 0 && sameSound(c, cue)) : -1;
    const runner = out[i];
    if (runner) out[i] = { ...runner, body: 'both', twinBand: cue.band };
    else out.push(cue);
  }
  return out;
}

/**
 * Cues for one step's events, in event order (body 0 before body 1, as the sim emits them).
 *  - The same sound from both bodies on one step becomes one unison cue (`body: 'both'`).
 *  - On the win step the `home` chimes are dropped: only the level-complete sting plays.
 *  - A run that dies and restarts in one list plays reset once.
 */
export function sfxForEvents(events: readonly SfxSourceEvent[], ctx?: SfxContext): readonly SfxCue[] {
  const won = events.some((e) => e.type === 'won');
  const cues: SfxCue[] = [];
  for (const event of events) {
    if (won && event.type === 'home') continue;
    const cue = sfxForEvent(event, ctx);
    if (!cue || (cue.id === 'reset' && cues.some((c) => c.id === 'reset'))) continue;
    cues.push(cue);
  }
  return mergeUnison(cues);
}
