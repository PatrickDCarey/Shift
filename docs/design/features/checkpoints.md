# Feature: Checkpoints (long levels only)

> **Status 2026-11-24 (later): MUST for long levels, rules aligned with tech-lead's contracts** (`src/core/contracts/checkpoints.ts`, `docs/tech/level-format.md` "Checkpoint headers", `expansion-approach.md` §8). Design accepted the kinetic clock reset at a post and forward-only activation (`decisions.md` 2026-11-24 "Checkpoint contracts"). Where this spec and the contracts differ in a detail of format or arithmetic, the contracts win; design intent is below.
>
> **History.** 2026-11-24: Must for long levels (`decisions.md` 2026-11-24 "Long levels"). 2026-11-23 (later): Could, not for the jam. Rejected on 2026-11-20 and twice on 2026-11-23 as a late fix for w3-05.

_Owner: design-lead. Written 2026-11-23, revised 2026-11-24. For long levels only: **no existing level gets one**, Tandem levels never have them, and levels with posts have no sweep._

## Rule

A **checkpoint post** in a long level lights when you pass it. After that, a death sends you back to the furthest lit post, and the room after it plays exactly as it did the first time (moving things restart from the post's clock), while **the level time keeps running**. R always restarts the whole level from the start.

## Definitions

- **Level time** (`wonAtStep`, best times, leaderboards): frames since the last **full restart** (loading the level, R, or a death while no post is lit). Once a post is lit it counts every frame, death freezes included. A best time is therefore a full run from the start.
- **Kinetic clock** (drives slabs and bolts): equals the level time until the first post respawn. On the first step after a respawn at a post it is the post's `clock=` value (default 0: every bolt lane empty, every slab at its origin, as at the spawn), then advances one per step and freezes during death and win freezes, as today. Without posts it is exactly today's run step, so every shipped recording replays unchanged.
- **Solution recording:** unchanged format (`level-format.md` §4): every frame since load. The **shipped** recording is a deathless run from the start. Player recordings may contain post deaths; the sim is deterministic through them, so `verifySolution` replays them as now.

## Behaviour

- **Format:** a header line `checkpoint: <col> <row> [clock=<n>]` (no grid glyph). Placement rules (parser and `tests/levels`): the cell is empty with a safe tile `#` directly below; at most 4 per level; columns increasing; the first at least 20 columns after the spawn, each at least 40 after the previous; never in a level with `&` or `sweep:`; the respawn box clear of every slab path, grey or white shot lane, exit, hint and the HUD area.
- **Activation:** a post lights when the runner's box overlaps the post's **column at any height** (any band, ground or air), so it cannot be jumped over. **Forward only:** it lights only if it is further along than the currently lit post; passing an earlier post again does nothing. One `checkpoint` event per lighting.
- **Respawn at a post:** after the normal 24-step death freeze, a **fresh spawn** standing in the post's cell (feet x = col + 0.5): gear `startGear`, white, band 0, speed 0, facing right, buffers, grace, drag and direction state cleared (GDD §4.12). Held keys carry over and act from the first step, as through any respawn (ruled 2026-11-02). The kinetic clock is set to the post's `clock=`; the level time is not reset.
- **R:** a full restart: spawn at `@`, level time and kinetic clock 0, every post unlit. Pause > Restart is the same.
- **Step order:** win check, then checkpoint activation, then death. An exit touched on the step you die wins; a post lit on the step you die is the one you respawn at.

## Edge cases

- **Death before any post:** a full restart, identical to today.
- **Walking back past an earlier post:** nothing changes; the furthest lit post stays.
- **`clock=` other than 0:** for a room that should be mid-cycle when you arrive (for example a slab already at the near end). Level-designer picks it so the respawn box is safe and the first 60 steps after respawn need no forced hazard crossing; `tests/levels` checks the box.
- **Respawning into a hazard:** prevented by the placement rules (box clear of slab paths and shot lanes) plus the empty-lanes default.
- **Results and pause:** results show the level time. No "restart from checkpoint" menu item (Could).
- **Leaderboards:** rank by `wonAtStep` as now; post deaths cost their freezes and the walk back, so a deathless run is always fastest.
- **Progress save:** a lit post is never saved. Leaving the level forgets it.
- **Restart card:** unaffected (no Tandem levels have posts).

## Readability

- The post is a short safe-tile pole with a flag or lamp: unlit (outline) and lit (filled, with a short rise animation; static under reduced motion). Shape changes, not only color.
- On respawn at a post, the respawn wipe or flash plays at the post as it does at the spawn.
- Audio: a single bright cue on activation (audio-designer).

## Tuning

No new key. Uses `deathFreezeMs`, `startGear`. Post position and `clock=` are level data.

## Acceptance

Test room "Room K": spawn at col 2; a safe floor; a post at col 30; a 1-tile pit at col 40; exit at col 60. Variant K2 adds a second post at col 80 and moves the exit to col 120.

1. **Regression.** Every shipped level replays to its current `wonAtStep` and golden hash (no level has a post).
2. **Activation.** Walking right at gear 1 from the spawn: one `checkpoint` event on the first step the box overlaps col 30; none on later overlap steps. A full jump over col 30 also lights it.
3. **Respawn at the post.** Walk into the pit at col 40 after activating: after 24 frozen steps the body stands at x 30.5, gear `startGear`, white, band 0, speed 0, facing right.
4. **Level time includes the death.** Win after check 3's death: `wonAtStep` = frames since load (no R), death freeze included.
5. **Death before the post.** Fall into a pit at col 10 (variant room): respawn at the spawn with level time and kinetic clock 0, exactly as today.
6. **R clears.** After activating, press R: next step the body is at the spawn, level time 0, post unlit; dying then respawns at the spawn.
7. **Same-step order.** A body that reaches the post's column and is hit by a bolt on the same step respawns at the post.
8. **Kinetic clock restarts at the post.** In Room K with Lift L (`moving-objects.md`) and a post with `clock=0`: after a post respawn, on the k-th step after the respawn the slab position equals the formula at kinetic clock k − 1 (k = 1 is clock 0, the origin) and every bolt lane is empty on the first step. With `clock=48`, the formula at 48 + k − 1. Two deaths at the post give identical slab and bolt positions for the same k.
9. **Forward only.** In K2, light col 80, walk back past col 30, die: respawn at col 80; one `checkpoint` event in total for col 30.
10. **Replay.** A recording that dies twice after a post and then wins replays to the same `wonAtStep` (`tests/levels` style, plus the ±3 shift test).
11. **Validation.** Each is rejected with a message naming the post: no safe tile under it; a level with `&` or `sweep:`; five posts; columns not increasing; a post fewer than 20 columns after the spawn or fewer than 40 after the previous; a respawn box in a slab path or grey/white lane.

## Priority

Must for long levels. Could: a "restart from checkpoint" pause item; a per-section split time on results.
