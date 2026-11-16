# Feature: adaptive audio (music per band, SFX, Tandem voices)

_Owner: design-lead. Milestone: **M2** (the ten SFX, M2-17) and **M3** (M3-16 adaptive music, M3-17 wiring, M3-15 settings). Priority: SFX **Must**, adaptive music **Should** (GDD §10). Builder: audio-designer (`src/audio/**`); event wiring calls come from the scene lane (M2-16/M3-17). GDD: §11. Events: `SimEvent` in `src/core/contracts/state.ts`._

## Rule

Sound reports what the simulation already did; it never decides anything. Each SFX is one function in `src/audio`, fired by a sim event (or a menu action) on the frame the event is rendered. Music is one loop whose pitch and brightness follow the player's band: low and muffled when standing, bright and high at red. **No sound is ever the only signal:** every SFX has a visual partner (`pixel-effects.md`), so a muted player loses nothing they need.

## Music per band (M3-16, Should)

One loop, always playing during a level once audio is unlocked. Targets per band:

| Band | Pace | Pitch offset | Low-pass cutoff | Layers playing |
|---|---|---|---|---|
| 0 white | standing | 0 semitones | 400 Hz | pad |
| 1 blue | walk | +2 | 800 Hz | pad, bass |
| 2 green | jog | +4 | 1.6 kHz | pad, bass, pulse |
| 3 yellow | run | +5 | 3.2 kHz | pad, bass, pulse, hats |
| 4 red | sprint | +7 | open (≥ 12 kHz) | all, plus lead |

- Offsets stay inside one major scale (root, 2nd, 3rd, 4th, 5th), so every band sounds "in tune" with the last. Exact numbers are audio-designer's to adjust by ear; the **ordering** (each band higher and brighter than the one below, white the lowest and darkest) is the requirement.
- **Glide:** pitch and cutoff move to a new band's target over **150 ms**. Layers fade in or out over the same 150 ms.
- **Drag drop (`airDrag`):** snap to the lower band's targets within **30 ms**, on the clunk's frame. The sudden darkening is part of the "clunk".
- **Driving body:** the band of the body the camera follows. Without a twin: the player. With a twin: the **faster non-home body** (higher band; on a tie, the runner). One body home: the other. This matches the world tint (`pixel-effects.md`).
- **Death** (`died`): during the 400 ms freeze, glide to band 0 targets. **Restart** and respawn: band 0 targets (the player stands at spawn).
- **Win** (`won`): the music holds its current pitch and fades to band 0 cutoff over the 0.6 s beat, under the level-complete sting.
- **Pause** (Should, `pause.md`): music ducks 12 dB and takes the band 0 cutoff; resume restores in 150 ms.
- **Menus:** no music required (title-screen.md). If audio-designer adds menu music it uses the band 0 settings.
- **Before the first gesture:** silent; nothing throws (engine already does this). The loop starts on the first gesture in a level, already at the current band's targets.

## The ten SFX (M2-17, Must)

| # | Sound | Fires on | Character (what it must say) |
|---|---|---|---|
| 1 | shift up | `shift` with `to > from` | the player chose more: short, bright, rising two-note click |
| 2 | shift down | `shift` with `to < from` | the player chose less: short, crisp, falling two-note click, same timbre family as shift up |
| 3 | jump | `jump` | light upward blip; same for coyote and buffered jumps |
| 4 | land | `land` | soft low thump, under 80 ms |
| 5 | fall-through | a body drops through a colored floor (trigger below) | a hollow "whoosh-down" or glassy pass-through: the floor let you go, not you jumped |
| 6 | reset | `died`, and `restart` (R or RETRY) | a quick rewind/descending sweep; respawn itself is silent |
| 7 | level complete | `won` | a resolved sting in the music's key, up to 1.2 s, on the sfx bus |
| 8 | UI move | menu focus moves | tiny tick |
| 9 | UI select | menu item chosen (and Back) | firmer tick, lower than UI move |
| 10 | air-drag clunk | `airDrag` | the game took a gear: heavy and mechanical |

**Clunk vs shift down (required, M2-17 accept "clunk differs from shift down"):**
- Different **register**: the clunk sits at least an octave below the shift-down click.
- Different **shape**: shift down is two clean notes; the clunk is one hard attack with a short pitch drop (a gear grinding into place), with some square/noise grit, 100–150 ms.
- Different **context in the mix**: the clunk lands with the music's 30 ms snap darker; shift down never touches the music.
- Test: with eyes closed, a listener tells them apart 10 times out of 10 (audio-designer self-check, recorded in the M2-27 review notes).

**Fall-through trigger.** _(Amended 2026-11-13: T-07 ruling.)_ The fall-through sound plays on the sim event `fallThrough { body, cells }` (`docs/tech/architecture.md` §3.2), once per event, with the twin voice for `body: 1`. The condition is unchanged from the original spec and is computed by the sim, so audio, effects and the HUD cannot disagree: a body was grounded at the start of the step, is airborne after it, did not jump, and at least one colored tile (`B G Y R`, or a gate tile later) lay under its footprint. A walk-off from a safe ledge plays nothing (the land thump comes later). Until the sim emits the event (Batch 5), audio keeps its local `FallThroughEvent` stand-in; then it maps the sim event and deletes the stand-in.

**Not sounded (on purpose):**
- `bandChange`: the music carries pace; a blip on every band change would be constant noise at the band edges.
- `graceStart`: Could (a faint crackle under the feet). Grace is 6 steps; a warning sound that late helps little.
- `shiftBuffered`: **Should**, the shift up/down sound at half gain and with the high end rolled off, so the press is acknowledged as "waiting". The real shift sound plays on landing with the `shift` event.
- A press that changes nothing (up at gear 4, down at gear 1, no `shift` event): silent. Could: a dull "blocked" tick.
- `wallStop`, `ceiling`: **Should**, the land thump pitched down a fifth; Could otherwise. Not part of the ten.

## Tandem: per-body sounds (M3-17)

- **Each body's event plays once.** The twin's version of any body sound (shift up/down, jump, land, fall-through, clunk) is the same sound **pitched down a perfect fourth (5 semitones) and 3 dB softer**. The ear hears two voices, which is exactly the "out of step" idea.
- **Same event, same step, both bodies** (the common in-step case): play it **once as a unison**: runner and twin voices together, each 3 dB down, so the total is no louder than one body. Out of step, the two voices separate in time and pitch.
- **`home`** (new, M3): a short two-note "park" chime per body (twin version pitched down a fourth). On the win step, `home` is followed by `won` in the same event list; play only the level-complete sting then (no chime).
- **`died`** with a twin: one reset sound (the run dies, not a body).
- **Voices:** a burst of events on one step (two bodies × shift + land + clunk) stays under the engine's 24-voice cap; drop the oldest SFX voice, never the music.

## Settings (M3-15)

Music volume, SFX volume and mute (`settings.muted`, requested by audio-designer 2026-11-04). Defaults: music 0.6, SFX 0.8, not muted. Mute silences both buses and works before the first gesture. Reduced effects and reduced motion do **not** change audio.

## Edge cases

- **Events while paused:** none (the sim is frozen).
- **Replay mode:** sounds play as in a normal run (it is how qa listens to a level).
- **Restart mid-sting:** `restart` stops the sting and plays reset.
- **Tab hidden:** the game pauses on blur (`pause.md`); music ducks as in pause.
- **Rapid presses:** each press that produces a `shift` event plays; two presses on consecutive steps both sound.
- **Death on the same step as a clunk:** both play (clunk first in event order).

## Tuning

No `tuning.json` keys (not gameplay). Audio constants (glide 150 ms, drop snap 30 ms, pitch table, cutoffs, twin offset −5 semitones and −3 dB, default volumes) are named constants in `src/audio`, owned by audio-designer.

## Acceptance

1. Each of the ten SFX is a separate exported function and is audible at SFX volume 0.2 (M2-17).
2. Event mapping (unit, with a fake engine): a step whose events are `[shift 1→2]` calls shift up once; `[shift 3→2]` shift down; `[jump]` jump; `[land]` land; `[airDrag]` clunk; `[died]` reset; `[restart]` reset; `[won]` level complete.
3. `bandChange` and `graceStart` alone call no SFX.
4. Clunk vs shift down: the clunk's fundamental is at least one octave below the shift-down's lowest note and its envelope is a single attack (inspect the tone parameters in a unit test).
5. Fall-through event (unit, [sim] emits, audio maps): letting go on a blue bridge emits `fallThrough` on the step the body leaves the floor; walking off a safe ledge does not; a jump off a colored floor does not; grace expiry on a mismatched floor does. Audio: one `fallThrough` event calls the fall-through SFX once (twin voice for `body: 1`).
6. Music targets (unit): band 0..4 give strictly increasing pitch and cutoff; a band change sets a 150 ms glide; an `airDrag` sets a ≤ 30 ms change.
7. With a twin, music follows the faster non-home body; with the runner home, it follows the twin.
8. Tandem: both bodies jump on one step → one unison call; runner alone jumps → the runner voice; twin alone → the twin voice (−5 semitones, −3 dB).
9. Win step with `[home 0, home 1, won]` (or `[home 1, won]`) plays only the level-complete sting.
10. Mute on before any gesture: no error, no sound after the first gesture until unmuted; volumes and mute survive a reload.
11. No audio call ever changes sim state (arch test: `src/audio` imports only types from `src/core`).
12. Voice cap: 30 SFX requested in one frame never exceed 24 voices and never stop the music.

## Priority

- **Must:** the ten SFX, the event mapping, clunk ≠ shift down, mute and volumes, no sound before a gesture, Tandem events once per body.
- **Should:** adaptive music per band (M3-16), the twin voice, unison merging, the `home` chime, pause duck, `shiftBuffered` soft click, wall/ceiling thump.
- **Could:** grace crackle, blocked-press tick, menu music.
