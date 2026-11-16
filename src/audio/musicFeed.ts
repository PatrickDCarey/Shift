// Pure bridge from sim state to `music.update` arguments. Owner: audio-designer.
// The scene calls `music.update(musicFeed(state, events, paused))` once per rendered frame.
// Reads only; nothing here changes simulation state.

import type { SimEvent, SimState } from '../core/types';
import type { MusicFrame } from './music';
import type { BodyBand } from './musicSpec';

type MusicEventType = 'airDrag' | 'died' | 'won' | 'restart';
const MUSIC_EVENTS: ReadonlySet<string> = new Set<MusicEventType>(['airDrag', 'died', 'won', 'restart']);

/** Bodies, runner first: the twin appears only on levels that have one. */
export function bodiesOf(state: Pick<SimState, 'player' | 'twin'>): readonly BodyBand[] {
  const bodies: BodyBand[] = [{ band: state.player.band, home: state.player.home }];
  if (state.twin) bodies.push({ band: state.twin.band, home: state.twin.home });
  return bodies;
}

/** Keep only the events the music reacts to, in order. */
export function musicEventsOf(events: readonly Pick<SimEvent, 'type'>[]): readonly Pick<SimEvent, 'type'>[] {
  return events.filter((e) => MUSIC_EVENTS.has(e.type)).map((e) => ({ type: e.type }));
}

/**
 * Build the `MusicFrame`. `events` is every sim event since the last rendered frame (a frame
 * can cover several fixed steps; pass them all or the death and win cues are lost). It
 * defaults to the state's own events (the latest step).
 */
export function musicFeed(
  state: Pick<SimState, 'player' | 'twin' | 'events'>,
  events: readonly Pick<SimEvent, 'type'>[] = state.events,
  paused = false,
): MusicFrame {
  return { bodies: bodiesOf(state), events: musicEventsOf(events), paused };
}
