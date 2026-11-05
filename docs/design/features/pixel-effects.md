# Feature: pixel effects, reduced effects and reduced motion

_Owner: design-lead. Milestone: **M2** (the drop cue and band swap, M2-15/PX-7) and **M3** (M3-18 effects, M3-15 settings, T-20 Tandem). Builders: art-director (`src/fx/**`, M2-15, M3-18), gameplay-engineer [scene] (PX-7, T-20: where effects are placed), ui-engineer (M3-15: the two settings). Look and assets: `docs/art/style.md` "Effects", `docs/art/accessibility.md`. GDD: §11._

## Rule

Effects are render-only: they read sim state and events and never feed back. They exist to make pace and its changes **visible**. One cue is gameplay information and is never removed: **the drag drop** (the game took a gear in mid-air). Everything else is decoration and can be turned down. There are two independent settings:

- **Reduced effects** (`settings.reducedEffects`): removes decoration (density, particles, background detail). For busy screens, low-end machines and players who want a clean view.
- **Reduced motion** (`settings.reducedMotion`, default on when the OS reports `prefers-reduced-motion`): removes flashes, screen-wide wipes, scrolling parallax and pulsing. For photosensitive and motion-sensitive players.

There is **no screen shake** anywhere in the game, in any mode.

## Effects and their modes

| Effect | Trigger | Full | Reduced effects | Reduced motion |
|---|---|---|---|---|
| Body band swap (palette and pattern, one frame) | `bandChange` | on | on | on |
| `shift` frames (1 white frame, 1 white-outlined frame) | any `bandChange` on the ground | on | on | off (swap only) |
| **Drop cue: body** | `airDrag` | `shift` frames + ring burst | `shift` frames + ring burst | the white-outlined frame held 2 frames; no white flash frame, no ring |
| **Drop cue: screen** (two-frame dither wipe, `palette.flash.alpha`) | `airDrag`, single-body levels only | on | on | off |
| **Drop cue: HUD** (needle snap, lit-cell pulse, `hud-gear-meter.md`) | `airDrag` | on | on | snap only |
| Afterimages (3 dithered copies in earlier band colors) | band ≥ 2 (green and up) | on | off | off |
| Speed lines (1 px, dithered) | band ≥ 3 | on | off | off |
| Dust (1–2 px specks) | skid, land, takeoff at band ≥ 2 | on | off | on (static specks, no drift) |
| World tint (field and horizon hue) | actual speed, eased 100 ms | on | on (field only) | on |
| Horizon dither and stars | always | on | off | on |
| Ridge parallax | camera x | on | on | off (ridges fixed to the screen) |
| Exit door sparkle pulse | always | on | on | off (hold `door_0`) |
| Death animation (flash, crack, chunks, scatter) | `died` | on | on | crack frame held through the freeze; no flash, no scatter |
| Home pose (`park_0`) | `home` | on | on | on |
| Sprite animations (run, sprint lean, land squash) | state | on | on | on (they are the character, not effects) |

- The **flash rate cap** applies to everything: at most 3 white flashes or wipes per second across the screen, both bodies included. A cue that would exceed it shows as the swap only.
- The **drag drop cue fires only on `airDrag`**, never on a generic airborne `bandChange`. An air wall stop also lowers the band (to 0), and that must not look like drag. (Changes `style.md`'s current trigger wording; request filed.)
- Ground `shift` frames fire on any `bandChange` while grounded, including the band changes caused by braking and ramping, so the body always "pulses" when its color changes.

## Tandem: effects per body (T-20, M3-18)

- **Every body effect belongs to the body in its event's `body` field:** its band swap, `shift` frames, ring burst, afterimages (from its own band history), speed lines, dust and death frames.
- **No screen wipe in a level with a twin.** A wipe cannot say which body dropped (pillar 2). The drop shows on the body (frames + ring) and on that body's HUD strip. Both dropping on the same step: both bodies show it; one flash counted for the rate cap.
- **The world tint and the music follow the faster non-home body** (on a tie, the runner; one home, the other). One ambient pace; each body's own color stays on the body and its strip.
- **Home body:** `park_0`, no afterimages, no speed lines, no dust; its existing afterimages vanish on the `home` frame.
- **Death:** the body named in `died` plays the death frames; the other body freezes in its current frame through the 400 ms freeze (the run dies, not just one body).
- **Draw order:** twin behind runner, effects of each body directly behind that body (the twin's afterimages never cover the runner).
- **Edge arrow** (bodies > 28 tiles apart): no effects on it; it swaps its band frame with the twin's band.

## Budget

60 fps on a mid-range laptop with both bodies at red (measured and noted in M3-18). Caps per body: 3 afterimages, 8 speed lines, 12 dust specks, 1 ring burst at a time. Over the cap, drop the oldest.

## Edge cases

- **Band changes on consecutive steps** (ramp through several bands): each swap shows; the flash cap limits the white frames.
- **Drag drop on the landing step:** the drop cue plays (the event fires before landing), then the land dust.
- **Pause:** effects freeze with the sim; particle timers do not run while paused.
- **Restart / respawn:** all particles, afterimages and rings are cleared on `restart` and on respawn.
- **Replay mode:** identical to normal play.
- **Settings changed mid-level:** applies from the next rendered frame; nothing is restarted.
- **Both settings on:** the stricter entry of each row applies (for dust: off).

## Tuning

No `tuning.json` keys (render only). The 100 ms tint ease, the 3/s flash cap, the per-body caps and the flash alpha are constants in `src/fx` / `palette.json`, owned by art-director. Uses sim events only; no sim number is duplicated.

## Acceptance

1. Single-body sprint jump (gear 4, flat): on the `airDrag` frame (flight step 30) the body shows the `shift` frames, a ring burst and the screen wipe, and the HUD needle snaps; the clunk plays on the same rendered frame (scene test with the event stream).
2. Air wall stop (air-drag check 15): band falls to 0 with **no** wipe, ring or clunk.
3. Reduced motion: the same jump shows the outlined frame for 2 frames and the HUD snap; no wipe, no ring, no white frame.
4. Reduced effects: no afterimages, speed lines, dust, horizon dither or stars at red; the drop cue is unchanged from check 1.
5. Both settings on: the union of 3 and 4.
6. OS `prefers-reduced-motion: reduce` with no saved setting starts with reduced motion on; a saved setting wins over the OS.
7. Flash cap: a scripted sequence producing 6 band-change flashes in 1 s shows at most 3 white frames.
8. Tandem, both sprint-jump in step: on flight step 30 both bodies show the drop frames and rings, no screen wipe, one clunk (unison).
9. Tandem, runner home: the runner shows `park_0` with no particles; the tint follows the twin's speed.
10. Tandem death: only the body in `died` plays death frames; the other is frozen.
11. Restart clears every particle, afterimage and ring (count 0 on the first frame after respawn).
12. No screen shake: the camera position equals the follow target every frame (no offsets from effects).
13. Performance: 60 fps (≥ 58 average over 10 s) with both bodies at red, full effects, on the reference laptop; noted in `docs/art/`.
14. Arch: `src/fx` imports only types from `src/core`; no effect writes sim state.

## Priority

- **Must:** the band swap, the drop cue in all three modes (single and Tandem), the flash cap, reduced motion (with the OS default), per-body placement in Tandem, no screen shake.
- **Should:** reduced effects as a setting, afterimages, speed lines, dust, ring burst, parallax.
- **Could:** extra death scatter variants, landing squash dust by fall height.
