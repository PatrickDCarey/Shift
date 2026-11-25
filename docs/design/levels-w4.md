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
| w4-05 | Commute | flow (combine) | **yes** (as built: 300 tiles, 9 rooms, 2 posts, 66.8 s clean) | Must | 4–8 min | 3/5 |

If w4-04 is not built the world has a numbering gap, which level select handles (`level-select.md` "Gaps in numbering").

## w4-01 Lift

**Teaches:** a grey lift carries you; standing on it you stay white.

**Intent.** World 4 opens on a wall too tall to climb (6 tiles, against the 2-tile limit) and a grey slab resting at its foot. Walk on, let go, and it lifts you; at the top it rests long enough to walk off, then a short **blue bridge** (world 1's first lesson, familiar to a cold player) leads to the exit. Standing still on a moving thing and seeing yourself stay white is the point: colour comes from your legs, not the world.

- Slab: `safe`, 3x1, `speed=2`, `path=w90,u6,w90,d6` (96 steps per move).
- Missing it costs nothing: it comes back. Walking off the top before it arrives is a wall bump.
- Headroom ≥ 2 tiles over the swept area; no reachable pit in the first room.
- Hints (first level of a world, cold start): `move` over the spawn (Must).
- **Removal:** no slab → 0 wins.
- **APPROVED v1 as built (2026-11-24).** 30 × 15; the bridge roof is **2 rows** (a 1-row roof's top is exactly jump height: a green jump stood on it and skipped the bridge). Board window 47 steps (then every 6.2 s), walk-off 62. Recording 519 steps, fastest known 432.

## w4-02 Ferry

**Teaches:** a shuttle carries you sideways; leave when it docks, at the pace the far side asks.

**Intent.** A 14-tile pit (wider than any jump) and a grey shuttle that rests at each side. Ride it standing. At its far rest its front is flush with a **green bridge**: shift up once while riding (standing, so it costs nothing) and walk off green during the rest. Leaving early runs you off a slab that has not docked; gear 3 or 4 ramps you through green into yellow on the bridge.

- Slab: `safe`, 4x1, `speed=2`, `path=w90,r12,w90,l12`.
- Tension: when (90-step rest, minus about 20 steps to reach the bridge) and which gear.
- **Removal:** no shuttle → 0 wins; the green bridge is the pace test.
- No hints.
- **If horizontal legs are cut** (`moving-objects.md` Priority): a lift **down** into a shaft whose floor is a green bridge, left at the bottom rest in gear 2.
- **APPROVED v1 as built (2026-11-24).** The pit is **16 columns** (a 4-wide slab moving 12 sweeps 16; the 14 above was wrong). A **2-row roof covers the whole track and the bridge** (a bridge-only roof let a yellow jump off the moving shuttle drag to green and win without the dock). Board 118 steps, depart 119; gears 1 and 3 fall. Recording 404, fastest known 330 (a coyote hop over the closing gap, still dock-bound).

## w4-03 Moving Bridge

**Teaches:** a coloured slab holds only its own colour, so you cannot stand on it: cross it at its pace, while it is level.

**Intent.** Two safe ledges with a 6-tile gap; a **green** slab, 6 wide, rises from below and rests level with the ledges, then sinks. A safe roof exactly 2 tiles above the ledges spans the gap plus one column each side, so nothing jumps it. w4-01 taught that grey lifts carry you standing; this one is green, so standing (white) drops you through, and so does yellow. Wait on the safe ledge, leave in gear 2 as it arrives, cross while it rests.

- Slab: `G`, 6x1, `speed=2`, `path=w90,d6,w30,u6` (top rest 90 steps).
- Crossing 6.75 tiles at 6 tiles/s takes about 68 steps: a departure window of about 22 steps on the rest alone, widened by the scoop (walking off onto it as it rises, green).
- Cheap, readable fails: falling through as white or yellow; riding it down green when leaving late.
- **Removal:** static `G` tiles instead → no timing; a `safe` slab instead → a standing ride wins. Both shown in the README sweep.
- No hints.
- **APPROVED v1 as built (2026-11-24).** The slab starts at the bottom (`phase=186`) and rises into its level rest. Depart window **97 steps**, not ~22: 39 with the slab level the whole way, 58 more where you step off onto the rising slab and its swept landing catches you green. More forgiving than planned, and accepted: the catch is still green-only (gears 1, 3, 4 and standing: 0 wins). 2-row roof. Recording 268, fastest known 200.

## w4-04 Outrun (Should; needs `sweep.md`)

**Teaches:** a front chasing at 3.75 tiles/s (between blue and green): where can you afford to walk?

**Intent.** Known floors behind a sweep. Blue loses 0.75 tiles/s, green gains 2.25, red gains 8.25, a stop loses 3.75. Long blue bridges spend lead earned on red runways; a grey lift in the middle forces a wait and makes the budget visible.

- `sweep: x0=<spawn − 6> speed=2 delay=90`. About 90 tiles. The intended line keeps ≥ 3 tiles of lead at its closest.
- **Removal:** without the sweep, a gear-1 walk with long rests wins; with it, it must not.
- **APPROVED v1 as built (2026-11-24).** 102 × 15, `sweep: x0=-2 speed=2 delay=90`, spawn col 4; a slow grey lift (`speed=1`, leaves step 720, top 912) up a 6-tile wall. Windows 37, 111, 153, 113; closest gap 5.65 tiles (90 steps), ≥ 3 as specified; a stop still wins for 90–128 steps anywhere. Recording 1,454 (24.2 s), fastest known 1,430. No hints.
- **Missing the lift is a sweep death about 6 s later, with no second chance: ACCEPTED.** The boarding slack is 113 steps (1.9 s) plus a 180-step rest, so missing it means a long dawdle, not a mistimed input (pillar 3); the lift leaving without you is visible, and the gap bar shrinking says the rest. The lift is the level's deadline, which is exactly the budget lesson; a lift that came back before the front would erase it. R is always available. **Trigger:** 2+ cold deaths waiting for a second lift, or one called unfair → design asks level-designer for a measured change (a longer bottom rest, or a later `delay`), not a cue glyph.
- Deviation accepted: 24.2 s clean, under the 30–45 s first-clear target only because that target includes deaths; inside the medium-level rule (40–120 tiles, under about 25 s).

## w4-05 Commute (long)

**Combines:** lift, shuttle, coloured slab, with runway, drag and the red wall. No new idea; no sweep.

**v4.1 (2026-11-24): a long level is 8–12 rooms, 300–450 tiles, 45–75 s clean, with posts (`level-plan.md` "Long levels").** Commute becomes **9 rooms, ≈ 350 tiles, 2 posts**: section 1 is the three rooms below in the order given; **post 1**; section 2: Ferry (shuttle docking at a green bridge), Moving Bridge (green slab), a Brake onto a blue bridge; **post 2**; section 3 (easiest): a lift **down** a shaft, a Runway with a back wall, and a slow blue walk home. The paragraph below (v4.0, three rooms) is now section 1.

**Intent.** World 4's long level, a journey rather than a trick: three rooms read left to right as one route, no checkpoints, so it is built to the long-level rules (hardest room first, the last third easy).

1. **Across (hardest, first):** a shuttle over a long pit docking at a red wall with one safe tile and a red bridge after it (w1-05's answer, arrive yellow, shift up past the wall), timed against the dock.
   - **v2 (2026-11-24, B12-C3), APPROVED:** the shuttle rests at the near dock from step 0 (`phase=0 path=w260,r10,w160,l10`, cycle 740), the far dock rest is 160, the door is at col 30 with 4 safe tiles before the red bridge (35–40), the run window is ≥ 185 and the press window ≥ 39 from every standing spot. **A red arrival is stopped by the door, then wins by holding on (it re-ramps below red through the door and is red by the bridge): accepted.** The stop is the red-wall lesson itself, and passing the door not red is the answer, so the idea is used, not skipped. The trade-off for a press window of 39 instead of about 23 is accepted (pillar 3).
2. **Up:** a safe runway, a red bridge into a Coast jump onto a yellow pad 2 lower (w2-02), then a grey lift 6 up.
3. **Down (easy):** a green moving bridge with a long rest (window ≥ 30), then a long brake pad and a blue bridge to the exit (w1-04).

- **v3 (2026-11-25), APPROVED as built:** headers only. Post A at col 88 (`clock=993`, 48-step departure window) makes 3 posts. The Ferry's post-side rest is 190 (`phase=202 path=w190,r12,w90,l12`, cycle 664), **extended later, not earlier** as I asked: a respawned walker reaches it at a fixed point of its rest, so only a later departure adds slack. Boarding slack after a post-B respawn is 0–155 steps (was 0–55). Later phases and post C were re-derived. Run 4,164 steps (69.4 s). (`decisions.md` 2026-11-25 world-5 triage, item 11.)
- Clean run (recording) ≤ 3,600 steps (60 s); par expected 40–50 s. First clear 2–3 minutes.
- **COMBINE rule:** no win skips the lift, the shuttle or the coloured slab.

**APPROVED v1 as built (2026-11-24; replaces the room list above where they differ).** 300 × 15, six slabs, posts at cols 132 and 215 with `clock=` set to the recording's step as a gear-1 walker passes each respawn x (a respawned walker meets every slab at the recording's phase). Recording 4,006 steps (66.8 s), fastest known 3,946. Rooms: (1) Across: shuttle to a red door and red bridge; (2) Up: short Coast (5-tile gap, pad 2 lower) and a 6-tile lift; (3) **Level** (not a descent): a green slab with a 150-step rest, brake pad, blue bridge; post 1; (4) Ferry; (5) Moving Bridge; (6) Brake; post 2; (7) a lift **down an open shaft with no floor** (a floor would let you skip the lift; walking in while the lift is away is a death, 12 tiles from post 2); (8) Runway from a **standing start** at the shaft wall (10 tiles under a ceiling); (9) Home: 3 presses down, a 26-tile blue bridge. Windows: run 94, jump 33, Ferry leave 70, Brake 44, section 3 ≥ 97. Fair-line waits ≤ 1.2 s; a late arrival waits up to one shuttle cycle (9.4 s) on safe ground, accepted (`level-plan.md` v4.2).

**v3 (2026-11-25, batch 12b triage, Must):** a third post on the upper ground before room 3's slab (a room-3 death no longer replays rooms 1–2), and the Ferry's post-side rest goes from 90 to about 180–200 steps, extended earlier so every later timing stays the same. Room 1 is unchanged (head start 157 steps, accepted). w4-04: no change (trigger not fired; 6 deaths read as spread). Numbers are in `requests.md`; the reasons are in `decisions.md` 2026-11-25.

## Cold-play checks (playtester, when built)

1. w4-01: stepped on the slab without help? Noticed you stayed white?
2. w4-02: falls before waiting for the dock; did gear 2 come before or after a fall on the green bridge?
3. w4-03: tried to stand on the green slab first (expected)? Tries to the crossing?
4. w4-05: minutes, deaths per room, and whether the restart felt too long (that is the checkpoint question; design rules on it with the answer).
5. **Watch list for the cold play (2026-11-24, as built):**
   - w4-01: did you try to climb or jump the wall first? Did you ever stand on the roof over the bridge (should be impossible)?
   - w4-02: how many falls before you waited for the dock; did you read the roof as "no jumping here" or feel boxed in?
   - w4-03: tries to the crossing; did the scoop (stepping on while it rises) feel like luck or like a choice?
   - w4-04 (added 2026-11-24 after the sweep review): did the left-edge marker and its bar say "something is coming" before the front came on screen? Deaths by the front, and where (before the lift, waiting for a second lift, on the upper blue bridge). Did a death by the front feel fair?
   - w4-05: did you see each post coming before you reached it (the idle-post fix)? Deaths in the open shaft, and whether the lift being away read as "wait"; longest wait at a shuttle and whether it felt like dead time; whether a post respawn put you in a room that felt the same as the first time.
