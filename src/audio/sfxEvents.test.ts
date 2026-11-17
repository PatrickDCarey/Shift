import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../core/types';
import { sfxForEvent, sfxForEvents, type SfxSourceEvent } from './sfxEvents';

const ids = (events: readonly SfxSourceEvent[]): string[] => sfxForEvents(events).map((c) => c.id);

describe('sim event to SFX mapping (adaptive-audio.md acceptance 2, 3)', () => {
  it('maps shift by direction', () => {
    expect(ids([{ type: 'shift', body: 0, from: 1, to: 2 }])).toEqual(['shiftUp']);
    expect(ids([{ type: 'shift', body: 0, from: 3, to: 2 }])).toEqual(['shiftDown']);
    expect(sfxForEvent({ type: 'shift', body: 1, from: 3, to: 2 })).toEqual({ id: 'shiftDown', body: 1, from: 3, to: 2 });
    expect(ids([{ type: 'shift', body: 0, from: 2, to: 2 }])).toEqual([]);
  });

  it('maps jump, land, airDrag, died, restart, won', () => {
    expect(ids([{ type: 'jump', body: 0, coyote: true, buffered: true }])).toEqual(['jump']);
    expect(ids([{ type: 'land', body: 0 }])).toEqual(['land']);
    expect(ids([{ type: 'airDrag', body: 0, from: 4, to: 3 }])).toEqual(['airDragClunk']);
    expect(ids([{ type: 'died', body: 0 }])).toEqual(['reset']);
    expect(ids([{ type: 'restart' }])).toEqual(['reset']);
    expect(ids([{ type: 'won' }])).toEqual(['levelComplete']);
    expect(ids([{ type: 'fallThrough', body: 0, cells: [{ col: 3, row: 5, band: 2 }] }])).toEqual(['fallThrough']);
  });

  it('passes the body band from the context to jump and land', () => {
    expect(sfxForEvent({ type: 'jump', body: 0, coyote: false, buffered: false }, { bands: [3, 1] })).toEqual({
      id: 'jump',
      body: 0,
      band: 3,
    });
    expect(sfxForEvent({ type: 'land', body: 1 }, { bands: [3, 1] })).toEqual({ id: 'land', body: 1, band: 1 });
  });

  it('bandChange and graceStart alone play nothing', () => {
    expect(ids([{ type: 'bandChange', body: 0, from: 0, to: 1 }])).toEqual([]);
    expect(ids([{ type: 'graceStart', body: 0, band: 2 }])).toEqual([]);
  });

  it('wallStop and ceiling are not sounded yet', () => {
    const silent: SimEvent[] = [
      { type: 'wallStop', body: 0, speed: 3 },
      { type: 'ceiling', body: 0 },
    ];
    expect(ids(silent)).toEqual([]);
  });

  it('a buffered press plays the shift click softly; a zero net press is silent', () => {
    expect(sfxForEvent({ type: 'shiftBuffered', body: 0, net: 1 })).toEqual({ id: 'shiftUp', body: 0, soft: true });
    expect(sfxForEvent({ type: 'shiftBuffered', body: 0, net: -2 })).toEqual({ id: 'shiftDown', body: 0, soft: true });
    expect(sfxForEvent({ type: 'shiftBuffered', body: 0, net: 0 })).toBeNull();
  });

  it('keeps event order', () => {
    const events: SfxSourceEvent[] = [
      { type: 'airDrag', body: 0, from: 3, to: 2 },
      { type: 'died', body: 0 },
    ];
    expect(ids(events)).toEqual(['airDragClunk', 'reset']);
  });

  it('plays reset once when died and restart share a list', () => {
    expect(ids([{ type: 'died', body: 0 }, { type: 'restart' }])).toEqual(['reset']);
  });
});

describe('Tandem mapping (acceptance 8, 9)', () => {
  it('the runner alone plays the runner voice, the twin alone the twin voice', () => {
    expect(sfxForEvents([{ type: 'jump', body: 0, coyote: false, buffered: false }])[0]?.body).toBe(0);
    expect(sfxForEvents([{ type: 'jump', body: 1, coyote: false, buffered: false }])[0]?.body).toBe(1);
  });

  it('both bodies jumping on one step is one unison cue with each body band', () => {
    const cues = sfxForEvents(
      [
        { type: 'jump', body: 0, coyote: false, buffered: true },
        { type: 'jump', body: 1, coyote: true, buffered: false },
      ],
      { bands: [4, 1] },
    );
    expect(cues).toEqual([{ id: 'jump', body: 'both', band: 4, twinBand: 1 }]);
  });

  it('merges clunks and landings the same way, but not shifts to different gears', () => {
    expect(
      sfxForEvents([
        { type: 'airDrag', body: 0, from: 4, to: 3 },
        { type: 'airDrag', body: 1, from: 4, to: 3 },
      ]),
    ).toEqual([{ id: 'airDragClunk', body: 'both', twinBand: undefined }]);
    const shifts = sfxForEvents([
      { type: 'shift', body: 0, from: 1, to: 2 },
      { type: 'shift', body: 1, from: 2, to: 3 },
    ]);
    expect(shifts).toHaveLength(2);
    const same = sfxForEvents([
      { type: 'shift', body: 0, from: 1, to: 2 },
      { type: 'shift', body: 1, from: 1, to: 2 },
    ]);
    expect(same).toHaveLength(1);
    expect(same[0]?.body).toBe('both');
  });

  it('different events from the two bodies stay separate voices', () => {
    expect(
      ids([
        { type: 'jump', body: 0, coyote: false, buffered: false },
        { type: 'land', body: 1 },
      ]),
    ).toEqual(['jump', 'land']);
  });

  it('home plays a chime per body, but only the sting on the win step', () => {
    expect(sfxForEvents([{ type: 'home', body: 1 }])).toEqual([{ id: 'homeChime', body: 1 }]);
    expect(ids([{ type: 'home', body: 0 }, { type: 'home', body: 1 }, { type: 'won' }])).toEqual(['levelComplete']);
    expect(ids([{ type: 'home', body: 1 }, { type: 'won' }])).toEqual(['levelComplete']);
  });

  it('died with a twin plays one reset', () => {
    expect(ids([{ type: 'died', body: 1 }])).toEqual(['reset']);
  });
});
