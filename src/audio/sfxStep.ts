// The one SFX entry point for the game scene. Owner: audio-designer.
// `playStepEvents(events)` plays the in-game sounds for the sim events of one rendered frame.
// Reads events only; safe before the first gesture (the engine ignores tones until unlocked
// and while muted, so nothing throws and nothing sounds).

import type { AudioEngine } from './engine';
import type { CueLog } from './cueLog';
import { createSfx } from './sfx';
import type { SfxContext, SfxSourceEvent } from './sfxEvents';

/**
 * Bind the entry point to an engine (a fake one in tests). Returns how many tone layers were
 * scheduled. Event order is kept; `won` plays only the sting; a Tandem unison plays once;
 * an empty list (no steps ran, or paused) plays nothing.
 */
export function createStepEventPlayer(
  engine: Pick<AudioEngine, 'tone'>,
  log?: CueLog,
): (events: readonly SfxSourceEvent[], ctx?: SfxContext) => number {
  const sfx = createSfx(engine, log);
  return (events, ctx) => (events.length === 0 ? 0 : sfx.playEvents(events, ctx));
}
