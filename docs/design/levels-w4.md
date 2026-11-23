# World 4 — Motion (level specs)

_Owner: design-lead. Written 2026-11-23 (expansion, `decisions.md` 2026-11-23 "Expansion"), reconciled with tech-lead's `docs/tech/expansion-approach.md` the same day: no checkpoints, slab speeds 1 or 2 (1.875 or 3.75 tiles/s), recordings ≤ 5,400 steps. Built by level-designer in `levels/`. Rules: GDD v1.12 §4.16 (movers), §4.18 (sweep, Should); specs `features/moving-objects.md`, `sweep.md`. Long-level rules: `level-plan.md` "Long levels". World name in level select: **4 MOTION**._

World 4 teaches things that move under you. It needs only world 1–2 skills (never Tandem), so a player who opens it cold from level select can play it. Every level is single-runner.

**Fairness floor:** ≥ 18 steps per timed input (world-2+ floor) and the ±3-step robustness test, or a position choice at walking pace with ≥ 1 tile of valid spots. Horizontal slabs rest (`w` ≥ 30) where the intended line steps on or off.

| Id | Title | Kind | Long | Priority | Target first clear | Difficulty |
|---|---|---|---|---|---|---|
| w4-01 | Lift | puzzle (teach) | no | Must | 15–25 s | 1/5 |
| w4-02 | Ferry | puzzle (teach) | no | Must | 20–30 s | 2/5 |
| w4-03 | Moving Bridge | puzzle (twist) | no | Must | 25–40 s | 2/5 |
| w4-04 | Outrun | flow (sweep) | medium (≈ 90 tiles) | Should | 30–45 s | 3/5 |
| w4-05 | Commute | flow (combine) | **yes** (≈ 130 tiles, clean run ≤ 60 s) | Must | 2–3 min | 3/5 |

If w4-04 is not built the world has a numbering gap, which level select handles (`level-select.md` "Gaps in numbering").

## w4-01 Lift

**Teaches:** a grey lift carries you; standing on it you stay white.

**Intent.** World 4 opens on a wall too tall to climb (6 tiles, against the 2-tile limit) and a grey slab resting at its foot. Walk on, let go, and it lifts you; at the top it rests long enough to walk off, then a short **blue bridge** (world 1's first lesson, familiar to a cold player) leads to the exit. Standing still on a moving thing and seeing yourself stay white is the point: color comes from your legs, not the world.

- Slab: `safe`, 3x1, `speed=2`, `path=w90,u6,w90,d6` (96 steps per move).
- Missing it costs nothing: it comes back. Walking off the top before it arrives is a wall bump.
- Headroom ≥ 2 tiles over the swept area; no reachable pit in the first room.
- Hints (first level of a world, cold start): `move` over the spawn (Must).
- **Removal:** no slab → 0 wins.

## w4-02 Ferry

**Teaches:** a shuttle carries you sideways; leave when it docks, at the pace the far side asks.

**Intent.** A 14-tile pit (wider than any jump) and a grey shuttle that rests at each side. Ride it standing. At its far rest its front is flush with a **green bridge**: shift up once while riding (standing, so it costs nothing) and walk off green during the rest. Leaving early runs you off a slab that has not docked; gear 3 or 4 ramps you through green into yellow on the bridge.

- Slab: `safe`, 4x1, `speed=2`, `path=w90,r12,w90,l12`.
- Tension: when (90-step rest, minus about 20 steps to reach the bridge) and which gear.
- **Removal:** no shuttle → 0 wins; the green bridge is the pace test.
- No hints.
- **If horizontal legs are cut** (`moving-objects.md` Priority): a lift **down** into a shaft whose floor is a green bridge, left at the bottom rest in gear 2.

## w4-03 Moving Bridge

**Teaches:** a colored slab holds only its own color, so you cannot stand on it: cross it at its pace, while it is level.

**Intent.** Two safe ledges with a 6-tile gap; a **green** slab, 6 wide, rises from below and rests level with the ledges, then sinks. A safe roof exactly 2 tiles above the ledges spans the gap plus one column each side, so nothing jumps it. w4-01 taught that grey lifts carry you standing; this one is green, so standing (white) drops you through, and so does yellow. Wait on the safe ledge, leave in gear 2 as it arrives, cross while it rests.

- Slab: `G`, 6x1, `speed=2`, `path=w90,d6,w30,u6` (top rest 90 steps).
- Crossing 6.75 tiles at 6 tiles/s takes about 68 steps: a departure window of about 22 steps on the rest alone, widened by the scoop (walking off onto it as it rises, green).
- Cheap, readable fails: falling through as white or yellow; riding it down green when leaving late.
- **Removal:** static `G` tiles instead → no timing; a `safe` slab instead → a standing ride wins. Both shown in the README sweep.
- No hints.

## w4-04 Outrun (Should; needs `sweep.md`)

**Teaches:** a front chasing at 3.75 tiles/s (between blue and green): where can you afford to walk?

**Intent.** Known floors behind a sweep. Blue loses 0.75 tiles/s, green gains 2.25, red gains 8.25, a stop loses 3.75. Long blue bridges spend lead earned on red runways; a grey lift in the middle forces a wait and makes the budget visible.

- `sweep: x0=<spawn − 6> speed=2 delay=90`. About 90 tiles. The intended line keeps ≥ 3 tiles of lead at its closest.
- **Removal:** without the sweep, a gear-1 walk with long rests wins; with it, it must not.

## w4-05 Commute (long)

**Combines:** lift, shuttle, colored slab, with runway, drag and the red wall. No new idea; no sweep.

**Intent.** World 4's long level, a journey rather than a trick: three rooms read left to right as one route, no checkpoints, so it is built to the long-level rules (hardest room first, the last third easy).

1. **Across (hardest, first):** a shuttle over a long pit docking at a red wall with one safe tile and a red bridge after it (w1-05's answer, arrive yellow, shift up past the wall), timed against the dock.
2. **Up:** a safe runway, a red bridge into a Coast jump onto a yellow pad 2 lower (w2-02), then a grey lift 6 up.
3. **Down (easy):** a green moving bridge with a long rest (window ≥ 30), then a long brake pad and a blue bridge to the exit (w1-04).

- Clean run (recording) ≤ 3,600 steps (60 s); par expected 40–50 s. First clear 2–3 minutes.
- **COMBINE rule:** no win skips the lift, the shuttle or the colored slab.

## Cold-play checks (playtester, when built)

1. w4-01: stepped on the slab without help? Noticed you stayed white?
2. w4-02: falls before waiting for the dock; did gear 2 come before or after a fall on the green bridge?
3. w4-03: tried to stand on the green slab first (expected)? Tries to the crossing?
4. w4-05: minutes, deaths per room, and whether the restart felt too long (that is the checkpoint question; design rules on it with the answer).
