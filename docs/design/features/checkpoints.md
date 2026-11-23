# Feature: Checkpoints (long levels only)

> **Status (2026-11-23, later the same day): COULD, not for the jam.** Tech-lead's `docs/tech/expansion-approach.md` §5.2 sizes checkpoints at M-L and the only item that changes `SimState`'s shape (every fixture and golden hash), five days before freeze. Design rules (`decisions.md` 2026-11-23 "Expansion", ruling 2): **no checkpoints**; long levels are single runs whose recording is ≤ 5,400 steps, built so they do not need one (`level-plan.md` "Long levels"). This spec is kept as the agreed design if the producer ever schedules them post-jam; its semantics match tech-lead's §5.2 (clock keeps running after a checkpoint death, R is a full restart, non-Tandem only, `checkpoint:` header line instead of a `K` tile). The sweep paragraph below no longer applies (`sweep.md` has no state).

_Owner: design-lead. Written 2026-11-23. Originally drafted as Must. Checkpoints were rejected on 2026-11-20 and twice on 2026-11-23 as a late fix for w3-05; the owner's request for longer levels changes the calculus (`decisions.md` 2026-11-23 "Expansion", ruling 2). They are for long levels only: **no existing level gets one**, and Tandem levels never have them._

## Rule

A **checkpoint post** in a long level lights when you touch it. After that, a death sends you back to the post instead of the level start, and **the clock keeps running**. R always restarts the whole level from the start with the clock at zero.

## Definitions

- **Run clock τ** (used by movers, bolts, the sweep and the level time): the number of steps since the last **full restart**. A full restart is: loading the level, pressing R, or a death while no checkpoint is active. This is exactly today's behaviour for every level without checkpoints (a death respawns at step 0), so the 14 shipped recordings replay unchanged.
- **Level time** (`wonAtStep`, best times, leaderboards) is τ on the winning step. Deaths after a checkpoint, including their 24 freeze steps, count toward it. A best time is a full run from the start.
- **Solution recording:** unchanged format and meaning (`level-format.md` §4): every frame since load, deaths and `!` included, ending on the winning step. `wonAtStep` ≤ `steps` as before. The replay test and `verifySolution` work as they do now, since the sim is deterministic through checkpoint respawns.

## Behaviour

- **Tile:** a new non-solid grid character for the post (proposal `K`; tech-lead decides). Validation: the cell directly below is a safe tile `#`; the level has no `&`; at most 4 per level; none in the first 20 columns; outside every mover path, every grey and white bolt lane, and the sweep's start.
- **Activation:** on the first step a body's box strictly overlaps a post's cell (any band, ground or air), that post becomes **active** (it replaces any earlier one: "last touched wins"). One `checkpoint` event. Touching the already active post does nothing.
- **Respawn at a post:** after the usual `deathFreezeMs` freeze, the body respawns standing on the floor under the post (feet x = col + 0.5, as `@`), with the full respawn reset of GDD §4.12 (gear `startGear`, band 0, facing right, buffers, grace, drag and direction state cleared). τ is **not** reset. Movers and bolts carry on from τ. The sweep, if any, resets relative to the post (`sweep.md`).
- **R:** a full restart: spawn at `@`, τ 0, every post unlit.
- **Step order:** phase 14 is exit, then checkpoint activation, then hazards, then falling (GDD v1.12 §4.14). So a post touched on the step you die is the one you respawn at; an exit touched on that step wins.
- **Held keys** through a checkpoint respawn act normally from the first step, as through any respawn (ruled 2026-11-02).

## Edge cases

- **Death before any post:** a full restart (τ 0), identical to today.
- **Walking back to an earlier post** makes it active again. Harmless; long levels are built left to right so it rarely happens.
- **Respawning into a hazard:** prevented by the level rules (respawn box outside grey/white lanes and slab paths; no forced hazard crossing in the first 60 steps after a post).
- **Results and pause:** results show the level time as now. Pause > Restart is a full restart (as R). No "restart from checkpoint" menu item (Could).
- **Leaderboards:** rank by `wonAtStep` as now; the backend's `verifySolution` replay already measures it. Fastest-known floors are per level, as now.
- **Progress save:** a checkpoint is never saved. Leaving the level forgets it.
- **Restart card:** unaffected (no Tandem levels have posts).

## Readability

- The post is a short safe-tile pole with a flag or lamp: unlit (outline) and lit (filled, with a short rise animation; static under reduced motion). Shape changes, not only color.
- On respawn at a post, the respawn wipe or flash plays at the post as it does at the spawn.
- Audio: a single bright cue on activation (audio-designer).

## Tuning

No new key. Uses `deathFreezeMs`, `startGear`. The post's position is level data.

## Acceptance

Test room "Room K": spawn at col 2; a safe floor; a post at col 30; a 1-tile pit at col 40; exit at col 60.

1. **Regression.** Every shipped level replays to its current `wonAtStep` (no level has a post).
2. **Activation.** Walking right at gear 1 from the spawn: one `checkpoint` event on the first step the box overlaps col 30; none on later overlap steps.
3. **Respawn at the post, clock runs on.** Walk into the pit at col 40 after activating: the body respawns after 24 frozen steps standing at x 30.5, gear 1, band 0; τ on the first respawn step = τ on the last frozen step + 1 (no reset).
4. **Level time includes the death.** Win after step 3's death: `wonAtStep` = steps since load (no R), and equals the recording's `steps`.
5. **Death before the post.** Fall into a pit at col 10 (variant room): respawn at the spawn with τ = 0, exactly as today.
6. **R clears.** After activating, press R: next step the body is at the spawn, τ 0 then 1, post unlit; dying then respawns at the spawn.
7. **Same-step order.** A body that touches the post and is hit by a bolt on the same step respawns at the post.
8. **Movers and bolts don't reset.** In a room with Lift L (`moving-objects.md`), after a checkpoint respawn the slab's position equals the formula at the running τ.
9. **Replay.** A recording that dies twice after a post and then wins replays to the same `wonAtStep` (`tests/levels` style, plus the ±3 shift test).
10. **Validation.** A post with no safe tile under it, a post in a level with `&`, five posts, or a post in a grey lane: the level is rejected by the parser or `tests/levels` with a message naming the cell.

## Priority

Must for long levels. Could: a "restart from checkpoint" pause item; a per-section split time on results.
