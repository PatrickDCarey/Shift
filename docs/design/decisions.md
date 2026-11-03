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

## 2026-11-02 — GDD v1.2: matched to the implemented M1 sim

All items accepted; no tuning change. Every acceptance number in `features/` is now exact against the sim.

- **Accepted: a speed that sums to a band edge within `SIM_EPSILON` is the higher band (green→yellow upshift 0.56 tiles / 5 steps, not 0.69 / 6; let go from gear 3 turns green at 0.81 / step 6, not 0.69 / 5; one gear down 0.74–0.81)** — it is what §4.6 already says; one step either way is invisible.
- **Accepted: color-gating check 4 turns yellow on action step 5 (was 6)** — same edge cause; the grace window is measured from c, so nothing else moves.
- **Accepted: the launch step moves (vx_old + vx_new)/2 × dt, so a walking jump from standing lands 2.375 (not 2.4)** — 0.025 tiles, invisible, and the same trapezoid as every other step.
- **Accepted: gravity starts the step after a walk-off (detected in step 8), so walk-offs fly one step longer: 4-tile drop 29 steps, 5.8 tiles from the last grounded x, still red (2-tile 4.2, 7-tile 7.2 yellow)** — a 1/60 s float is invisible and matches architecture.md §3.1; a red walk-off off 4 tiles stays safe because 12 is the top speed (5.8 < 6).
- **Walk-off distances are measured from the last grounded x, not the ledge edge** — the edge-based number shifts by up to 0.2 with where in the step the box leaves, so it can't be exact.
- **Accepted: air-drag check 12 takes off at 10.32 (band 3), braked by the launch step's own ground update; band 4 is the state going into that step** — §4.10 already says takeoff speed is after the ground update; the check still proves a downshifted gear survives the flight.
- **Accepted: no-embed is per color (inside any color-k tile, every color-k tile is empty for that move), not per tile** — keeps check 13 (no stop inside a thick wall), and "inside a color, that color is a ghost" reads simply; its only side effect (falling through a same-color floor while inside a same-color tile) is ruled out by a level rule: no colored tile hangs < 1.5 tiles over a same-color floor.
- **Accepted: with `instantMaxGear` > 1, a downshift whose speed is already in the walking range snaps to the target** — it is the walking-range rule (§4.4); unreachable with shipped tuning.
- **Accepted: below the drag floor the air-drag counter keeps growing** — speed never rises in the air and the counter resets on landing, so no drop can ever come from it; the HUD hides the drag meter at band ≤ `airDragMinBand`.
- **GDD §5.4 −7 gear-4 row is 12.00 with the second drop on the landing step; marked knife-edge, not for levels** — a takeoff slightly under 12 lands yellow instead of green.
- **Acceptance numbers are exact (steps exact, distances to printed precision) instead of ±2 steps / ±0.15 tiles** — the sim exists now, and exact numbers catch regressions the tolerances would hide.
- **GDD §4.14 defers phase detail to architecture.md §3.1–3.2** — one source for implementation detail; the GDD keeps the player-facing order.

## 2026-11-03 — M1-29: verdicts from the w0-02 greybox playtest (`docs/playtests/2026-11-02-greybox.md`)

No `tuning.json` change in this pass: every issue found was missing information (HUD, art, room layout), not a wrong number. The formal M1-28 playtest (Nov 7) re-checks these with the HUD in.

### Provisional decisions D-1 to D-3 (verdicts for the Nov 8 gate)
- **D-1 no air control: KEEP** — the playtester called it fair and deliberate and blamed their own takeoff, never the game (pillar 1: the takeoff is the decision).
- **D-2 release brakes at the shift-down rate: KEEP** — "controllable, easy to learn after one fall"; stopping 1 tile early on a colored bridge is the lesson w1-01/w1-04 teach, and the HUD needle now shows the braking.
- **D-2 detail, gear remembered at rest: KEEP** — the HUD bracket shows the remembered gear, which removes the "stopped means reset" surprise without losing the cruise setting.
- **D-3 stepwise air drag: KEEP** — the drop read as intended thanks to the ring and flash; its only cost is first-contact surprise, which the HUD drag meter, the flash and clunk (M2-15/16/17) and w2-02 "Coast" (teaches drag on its own) address.

### HUD and readability
- **HUD gear meter pulled into M1 (core: five-cell strip, lit band, selected-gear bracket, speed needle)** — the playtester's #1 fix and likely rage point ("which pace is red?"); without it pillar 2 fails. Spec: `features/hud-gear-meter.md`.
- **Drag meter and pending-shift bracket are Should for M1, else M2** — they hint the two air surprises (drop, buffered shift) but the strip alone fixes the rage point.
- **No runway hint in the HUD** — telling the player the distance still needed solves the runway puzzle for them (pillar 1).
- **Air shift presses as observed are intended, not a bug** — `src/core/sim/input.ts`/`air.ts` buffer them and apply only within 6 steps of landing; the bonked start-area hops last about 12 steps, so a mid-air press there usually is within 6 steps of landing. qa-tester should confirm that a press 10 steps into a 48-step flight is dropped.
- **Shift buffer stays (6 steps, applied on landing)** — forgiving early presses is pillar 3; the HUD pending bracket makes it visible.
- **On-screen controls in w0-02: accept as is** — internal room; onboarding glyphs (w1-01, w1-02), the controls screen and the HUD key-cap hints cover shipped levels.

### w0-02 and art
- **Spawn under a 0.5-tile ceiling: change the room** — the first jump a new player makes bonks and misteaches the jump as "half a tile"; the first jump anywhere must show the full 3-tile apex (pillar 2). The ceiling over the bridge stays.
- **Red crosshatch reads as a hazard: art tweak, no rule change** — the HUD answers "what is red"; colored tiles still need to read as ledges (flat lit top edge) and never as spikes or lava.
- **Exit low contrast: art change** — the goal must be the most distinct object on screen; a grey box among grey-blue tiles fails pillar 2.
- **Faint yellow ghosts: art change (ghost outlines ≥ 3:1 against the background for every color)** — a ghost must look "not solid", not "absent"; players plan routes over ghosts.
- **Falling off the bridge end into the runway room, and the grey drop into the exit pocket, are unsignposted: accept for w0-02** — internal room; the playtester called the pocket a designed "aha", and w1-01 teaches let-go-to-drop on its own.

### Results and the level
- **Win banner shows time, not steps: `M:SS.ss` from `wonAtStep / stepHz`, truncated to hundredths** — a step count means nothing to players; steps stay the stored and compared value, so replays and leaderboards stay exact.
- **The timer still runs from spawn, including idle time** — a deterministic run time needs no "first input" rule; revisit only for leaderboards (M3-02). The 76,900 was a real 21-minute run.
- **Reported "red jump flies over the whole yellow pad": not a cheese** — from P3 (edge x = 26) a gear-4 jump flies 8.7 tiles and even the latest coyote takeoff (x ≈ 27.6) lands at x ≈ 36.3, on the pad (cols 33–36), short of P4; the playtester most likely landed on the pad's far end and rolled onto P4 between screenshots. A yellow takeoff still lands green and falls (level README sweep). Even if it were a cheese it would not matter in an internal room.

## 2026-11-03 — GDD v1.3: puzzle depth review (`docs/design/mechanics-review.md`)

Trigger: the studio owner played the build and judged the puzzles thin. No `tuning.json` change.

### Diagnosis
- **Worlds 1–2 were thin because every level asked one thing at one place ("be color X on this floor")** — with red 3.23 tiles from standing and safe pads between sections, one constraint at a time always has an obvious answer; good levels need two decisions in tension nearby (pillar 1).
- **Collapse test adopted: a mechanic is cut if its paper puzzles reduce to "go fast" or "go slow" with no choice of where** — that is reflex or patience, not pace (pillar 1).
- **New level rule: each level must fail when its new piece is removed** — it is the practical form of "can't be solved by ignoring the intended idea" (pillar 4).

### Mechanics
- **Speed gates (`w b g y r`) move from world 3 (M3) into M2, Must** — the strongest constraint reviewed (checks your color where you pass, in flight with drag and in the floor as an aimed trapdoor), for one solidity rule and no tuning.
- **Gates read the band of the player's own speed, not a "world speed"** — conveyors are cut, so there is no world speed; one speed to read keeps pillar 2.
- **Gates are their own no-embed group per band** — being inside a green gate must not empty green floors (and vice versa), or a gate standing on a green floor would drop green players.
- **Gates never get grace; a trapdoor opens the step after you turn its color, coyote applies** — grace protects you from losing your own color's floor; turning a gate's color is entering it, and a 6-step lag would make trapdoor aim unreadable.
- **White gates only as floors and ceilings** — the slowest ground speed is blue, so a white gate wall could never be passed.
- **Player-facing name "gate" (was "speed camera")** — "a gate that opens only for its color" reads at a glance; "camera" needed explaining.
- **Colored walls move from w3-01 into world 1 (w1-05), Must, no engineering** — built in M1, and "not this color here" is the natural partner of colored floors; world 1 gets its first conflict (yellow at the wall, red behind it).
- **Colored ceilings taught in world 4 (Should)** — a twist on walls; not needed for the Must path.
- **Ice moves from M3 Must to M3 Should (world 4)** — half its paper puzzles collapse into "enter at color X", and the speed-0 case still needs a ruling.
- **Mud cut** — its puzzles collapse into "the mud slows you here"; the player only holds.
- **Boost pads cut** — they remove the runway decision instead of creating one ("go fast").
- **Conveyors and moving platforms cut** — each needs a second velocity and moving geometry; "legs vs world speed" fails the 10-second read.
- **Crates cut** — push rules undecided and a physics subsystem for puzzles no stronger than gate puzzles.
- **Afterimage ghosts cut (post-jam candidate)** — good puzzles but a runtime-geometry subsystem whose rule still needed a spike; not affordable with one engineer.
- **New ideas (tint gates, springs, crumble floors, speed limits, one-way floors) cut** — four collapse into go fast/go slow or duplicate colored floors; tint gates change world colors at runtime (pillar 2) and need new state.
- **Provisional keys `mudMaxGear`, `boostPadGear`, `ghostSpacingTiles`, `ghostLifetimeMs` unused; kept in `tuning.json` until tech-lead removes them from the schema, then deleted in the same batch** — removing them first would break `tests/arch` (tuning schema).

### Levels and scope
- **Worlds become 1 Gears (5), 2 Commit (5), 3 Gates (4) Must, 4 Remix (4) Should: 14 Must + 4 Should = 18 (was 13 + 8 = 21)** — M2 gains two levels that need little or no new engineering, M3 Must needs no new sim work, and the cut Should worlds were the most expensive content in the plan.
- **w1-05 Red Wall and w2-04 Gate added to M2; Two Colors moves to w2-05** — one new idea per level; gates are met after floors, walls and flight are fluent.
- **w3-01 No Green, w3-02 Trapdoor, w3-03 Gate Window, w3-04 Redshift replace the old world 3** — test, twist and combine gates; each answer is a place-and-pace pair.
- **Fallback if gates slip past Nov 12: w2-04 moves to the top of world 3 and M2 ships 9 levels** — world 3 still fits M3 because it needs nothing else from the sim.
- **Fallback if the M2 playtest confuses gates with blocks: fewer gate colors and stronger art, not a rule change** — the inverse rule is the point of the piece.

### w0-02
- **w0-02 rework is held except the spawn-headroom fix already requested (M1-21)** — the room is the M1 playtest room; it keeps M1 pieces only, and the headroom fix unblocks the M1-28 playtest and qa's spawn-jump e2e.
