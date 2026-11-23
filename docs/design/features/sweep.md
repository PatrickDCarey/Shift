# Feature: The sweep (a chasing front)

_Owner: design-lead. Written 2026-11-23; revised the same day after tech-lead's `docs/tech/expansion-approach.md` (no checkpoints, so the sweep is a pure function of the run clock with no state). GDD v1.12 §4.18. **Priority: Should.** Two Should levels use it (w4-04, w5-04); no Must level depends on it. Tech-lead's note does not cover it: sizing requested (`requests.md`)._

## Rule

In a level with a sweep, a full-height front enters from the left after a delay and moves right at a fixed speed. If it reaches your centre, you die. Its speed sits **between two gear speeds**, so it sets a minimum average pace: the level becomes a budget of where you can afford to be slow.

## Why it fits

Pace is the puzzle in its purest form: a blue bridge costs lead, a red runway earns it, a stop costs the most. It turns known floors into a flow level with no new tile.

## Definition (one header line at most; proposal `sweep: x0=<tiles> speed=<n> delay=<steps>`)

| Field | Meaning | Constraint |
|---|---|---|
| `x0` | front x at t 0, tiles | ≤ spawn x − 6 |
| `speed` | 32nds of a tile per step (same exact scale as movers) | 2 (3.75 tiles/s, between blue and green) or 4 (7.5, between green and yellow) |
| `delay` | steps before it moves | ≥ 60 |

Front at run step t: `x0 + speed/32 × max(0, t − delay)`, stopping at the grid's right edge. The clock rewinds on respawn, so the front does too.

## Hits

Phase 14, after shots: a non-home body dies (`cause: 'sweep'`, or `'hit'` if tech-lead prefers one cause) on the first step where front ≥ the body's x (its centre). Air does not save you. Exit wins on the same step. With a twin, either body caught kills the run (no Tandem sweep levels planned).

## Readability

- A full-height band with a hard edge and a scrolling hatch behind it (static under reduced motion), under the bodies.
- While the front is off-screen left, a left-edge marker with a bar for the gap (up to 15 tiles). The camera never pans back.
- Audio (Could): a hum whose volume follows the gap.

## Tuning

None. Per level: `x0`, `speed`, `delay`.

## Acceptance

1. **Formula.** `x0` 0, `speed` 2, `delay` 90: front 0 for t 0–90, 0.0625 at t 91, 6.25 at t 190.
2. **Standing body.** Same sweep, a body standing at x 8.5: caught on step 226 (front 8.5); not on 225 (8.4375).
3. **Blue loses, green escapes.** Same sweep, a body holding R from step 1 at gear 1 is caught eventually; at gear 2 on a long enough floor, never.
4. **Exit wins** on a same-step catch.
5. **Respawn rewinds** the front to `x0`.
6. **Determinism** and no regression in shipped recordings.

## Priority

Should: the sweep, its marker and its two levels. Could: a sweep that stops at a given x, the hum.
