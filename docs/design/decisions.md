# Design decisions

_Owner: design-lead. One line per decision, newest at the bottom of each section. Format: decision — reason._

## 2026-11-02 — GDD v1.0 (M1 core rules)

### Controls and movement
- _(superseded in v1.1)_ **Auto-run control model:** gear sets speed, direction keys only set heading, nothing needs holding — keeps gears the only way to control pace (pillar 1) and stays keyboard-simple.
- _(superseded in v1.1)_ **Gear 0 = brake to stop; direction at gear 0 only turns** — one consistent meaning per gear; 1-1 shows a Right Shift glyph so new players find the gas.
- **Speed changes with constant acceleration per gear segment, sized so each segment takes exactly `tilesPerGearChange` of ground** — literal reading of the seed's "fixed distance per gear", and unlike dv/dx = const it can start from rest.
- **Braking uses the same distance as accelerating (1.25 tiles/gear), but its own key** — "speed takes distance, both ways" is one rule to learn; the separate key lets playtests tune braking alone.
- **Reversing is a skid: brake through lower bands, gear unchanged** — one velocity rule for everything; makes turning at speed a real cost.
- _(superseded in v1.1)_ **Instant pivot at blue or white (`pivotMaxBand` 1)** — walking-pace turns would otherwise take 1.7 s and feel broken; colors don't change in a pivot, so puzzles are unaffected.
- **Left and right are symmetric; only |vx| sets color** — no reason for asymmetry, and mirrored tests catch bugs.
- _(superseded in v1.1)_ **Wall contact: vx 0 and gear 0, on ground and in air** — matches the seed's "walls (instant stop)", avoids "running in place" against a wall, and gives levels an instant brake.

### Color
- **Band edges at midpoints between gear speeds [1.5, 4.5, 7.5, 10.5]** — cruising speeds sit 1.5 tiles/s from any edge, and upgrading color still costs runway (red at 4.45 tiles from rest).
- **No hysteresis** — all speed changes are monotonic and cruising speeds are mid-band, so flicker can't happen, and one set of edges is easier for designers and testers.
- **Colored tiles are solid on all faces when matched (colored walls and ceilings exist)** — the core rule applies uniformly; colored walls become a world 3 twist for free.
- **No-embed: a tile overlapping the player stays empty until left** — prevents the player getting trapped when their color changes inside geometry.
- **Grace only for a color change while standing; previous-color tiles hold from above for 6 steps** — that is the unfairness the seed wanted to fix; landing or walking onto a mismatched tile is just a hole.
- **Grace does not reset or accumulate; a new color change replaces it; leaving the ground ends it** — simplest deterministic rule with no exploits.
- **Grace never applies to walls or ceilings** — grace is about floors dropping you, not about blocking.
- **Coyote time starts when grace runs out** — gives a 12-step total window to jump on a color change (pillar 3).

### Air
- **No shifting in the air; presses within 100 ms of landing are buffered** — keeps "air commits you" while forgiving early presses like the jump buffer does.
- **In the air, gear = min(gear, band) every step** — you land in the gear of the color you show, so you never re-accelerate off a correct landing pad (no twitch downshift needed).
- **Air drag is stepwise: every 6 tiles of flight snaps speed down one gear** — countable on the tile grid by players and designers, exact for tests, and the "clunk" fits the SHIFT theme.
- **Drag never lowers the band below blue** — avoids stalling mid-air and keeps long falls readable.
- **`airDragTilesPerGear` 4 → 6** — with 4 every gear-2+ jump lost a color and gear-2 jumps did so 5 steps before landing (knife-edge); with 6, slow jumps keep color and a sprint jump loses exactly one.

### Jump
- **Jump height is the same in every gear** — speed changes distance, not height, so vertical puzzles stay independent of pace.
- **No variable jump height** — arcs are fully predictable, which suits a puzzle game and its solution recordings.
- **`jumpTimeToApexMs` 380 → 400** — air time exactly 48 steps, round gravity (37.5) and launch speed (15), flat-jump distances evenly spaced around the 6-tile drag point.
- **Exact-kinematics vertical integration** — sampled heights lie on the parabola so the sanity math is exact (apex 3.00 on step 24).
- **Max climb 2 tiles; 3-tile ledges forbidden** — a 3-tile ledge equals the apex exactly (knife-edge).

### Death, reset, levels
- **Only death in M1 is falling below the grid; 400 ms freeze then respawn; R restarts instantly** — fast retries keep puzzle iteration cheap.
- **No checkpoints; each attempt is a fresh run with its own timer** — levels are short rooms, and replays stay simple.
- **Grey and white tiles are physically identical** — white is a readability marker for "safe to stop/turn", not a separate rule.
- **Grid edges left/right/top are solid, bottom is open** — no invisible deaths, one way to fail.
- **Exit completes on overlap at any color** — the puzzle is getting there, not the final step.
- **Reference step order in GDD §4.13 is normative for M1** — acceptance numbers depend on it; tech-lead may propose changes.

### Scope
- **World 3 has 5 levels (13 Must total), world 4 and 5 have 4 each (21 total)** — world 3 has five pieces and each level teaches one.
- **Colored walls are taught in world 3 (w3-1), not world 1** — world 1 stays about pace; colored walls need braking to be known first.

## 2026-11-02 — GDD v1.1: hold-to-move (user decision)

### Control model
- **Hold-to-move replaces auto-run (user decision)** — hold a direction to move toward the selected gear's speed; let go to brake; Shift picks the cruise gear. Supersedes "auto-run control model" and "gear 0 = brake to stop" above.
- **Selectable gears are 1–4 (`minGear` 1); standing (index 0) is not a gear** — letting go now does what gear 0 did, and a gear-0 cruise would make holding an arrow do nothing.
- **Runs start in gear 1 (`startGear`)** — pressing an arrow moves you on the first try (pillar 2: readable in 10 s).
- **Walking range 0–3 tiles/s is instant on the ground (`instantMaxGear` 1): start, stop and turn take no distance** — hold-to-move needs responsive fine control at walking pace; blue is still reached only by moving. Supersedes "instant pivot at blue" and the `pivotMaxBand` key.
- **Above walking pace, the per-gear distance rule is unchanged (1.25 tiles up, 1.25 down)** — "running takes distance" is still the core constraint; runway to red is now 3.2 tiles (was 4.45).
- **Letting go brakes at the same rate as shifting down (no separate release key)** — one braking rule to learn; a faster release brake would make "tap the arrow" a cheaper color tool than the gears.
- **The selected gear persists through letting go, landing (subject to the air rule) and wall stops** — it is a cruise setting; losing it on every release would make the Shift keys busywork.
- **The selected gear resets to `startGear` on death and restart** — every run starts from the same state (replays, leaderboards) and a bad gear can't carry into a retry.
- **Wall stops keep the gear** — holding into a wall is now normal play, and bumping a wall shouldn't erase the cruise setting. Supersedes "wall contact: gear 0".
- **Reversing at running speed is a skid down to walking pace, then an instant turn** — keeps "turning at speed costs distance" while walking turns stay snappy.
- **Both arrows held: the most recently pressed wins; pressed on the same step: neither** — common platformer feel, and the tie rule keeps it deterministic.
- **Facing is kept in the sim, starts right, follows the held direction** — needed only for a boost pad touched while standing; otherwise visual.

### Air and buffers
- **In the air, held directions and letting go never change velocity** — "air commits you" (user suggestion); the arc depends only on takeoff, which keeps drag math exact.
- **Gear in the air = max(minGear, min(gear, band))** — same reason as v1.0 (holding the arrow after landing must not re-accelerate you off a correct pad), with the new gear floor of 1.
- **After landing, the next step's held direction decides: cruise, brake or skid** — no special landing state to learn.
- **Jump fires after that step's ground update; a buffered jump fires the step after landing** — "J + arrow from standing" gives a walking jump, and buffered jumps include one ground update so the hold still matters.
- **Shift buffer unchanged (net presses within 100 ms of landing, applied on landing)** — independent of the hold.
- **Held buttons through a respawn act normally but don't count as new presses** — holding Right through a death walks you on immediately without phantom shifts or jumps.

### Scope and deliverables
- **Alternate gear bindings Q/E and Z/X are Must, all bindings active at once (down = left key, up = right key)** — avoids the Windows Sticky Keys popup (user decision).
- **Sticky Keys tip: one-time, on Windows, at the first level start, never blocks input** — simplest way to reach the players who need it.
- **A free key-remap screen is Could** — user decision.
- **design-lead owns `docs/design/itch-page.md`, due M4** — user decision; added to GDD deliverables.
- **Safe tiles are one kind (`#`), drawn white/grey** — matches the tech level format; v1.0's separate grey and white tiles were physically identical anyway.

### Levels
- **w1-01 teaches holding to move (fail by letting go on a blue bridge); w1-02 introduces the Shift keys** — the run starts in gear 1, so moving and shifting are now two separate first ideas.
- **w1-03 uses a red bridge 2 tiles out** — yellow now needs only 1.9 tiles of runway, so a yellow bridge 2 tiles out would no longer deny it.
- **w2-01 uses a green runway** — on a safe runway a yellow takeoff would land green on the pad via drag, teaching the wrong lesson.
