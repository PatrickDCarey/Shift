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

## 2026-11-03 — Owner asks for bigger ideas; art direction C

- **Studio owner chose "push for bigger ideas" over adopting the v1.3 gates-and-walls plan (owner decision)** — gates and walls refine "be color X at place Y" and don't make the puzzles distinctive. v1.3 (`mechanics-review.md`, commit b432391) stays as the fallback; nothing is built from it until the owner picks.
- **Art direction C, Pixel Dither (480×270 logical, 2×), chosen by the owner** — every candidate mechanic must read at 16 px tiles by shape and pattern, never color alone.
- **Three core-twist candidates written up for the owner: Tandem, Wet Paint, Redshift Clock (`core-twists.md`); design recommends Tandem** — it is the only candidate whose puzzles are pure planning (no timing creep) and it keeps pace as the only verb. Not adopted until the owner picks; the GDD, specs, level plan and requests are unchanged.

## 2026-11-03 — GDD v1.4: Tandem is the core twist (owner decision)

### Plan
- **The studio owner picked Tandem (one throttle, two runners) from `core-twists.md` (owner decision)** — puzzles are pure planning and pace stays the only verb.
- **World 3 becomes five Tandem levels (Must, M3); worlds 1–2 stay single-runner (5 + 4, M2); Must stays 14** — the twist needs fluent single-runner skills first, and the M2 levels need no new engineering.
- **w2-04 Gate leaves M2; speed gates and ice become Should (world 4 Gates)** — Tandem takes the engineering slot gates had. Gates' best puzzle is now a Tandem combine (w4-03).
- _(gate date superseded 2026-11-13: Tue Nov 17)_ **Schedule: Tandem spec Nov 3, sim and scene Nov 9–13, decision gate Nov 12; if `tandem.md` checks 1–12 don't pass, world 3 reverts to the v1.3 Gates world** — the sim lane is on M1 until about Nov 8, and the fallback is fully specced, so the gamble is bounded.
- **Open: Tandem first appears at level 10; decide at M2-31 whether to move Two Colors after w3-01 or trim world 1** — jam voters play about 10 minutes.

### Rules settled in `features/tandem.md`
- **Twin spawn glyph `&`, at most one per level; without it nothing changes** — every M1 check must pass untouched (regression safety for the gate).
- **Same input frame for both bodies; direction computed once (shared priority), everything else per body** — "same keys, separate bodies" is the whole rule, and one shared input stream keeps recordings unchanged.
- **Shifts apply per body (grounded shifts now, airborne buffers); the existing 1–4 clamp is the resync rule, with no new mechanic** — gear splits come from the air rule and buffers that already exist, and pressing past the top or bottom re-syncs them.
- **Jumps launch every body that can jump; the others buffer** — the same per-body rule as shifts.
- **Bodies never collide, push or support each other** — interaction would need a physics rule for body contact and a step-order dependency; lanes give the puzzles without it.
- **Runner (body 0) is stepped before twin (body 1); with no interaction, this only orders events** — deterministic event lists for audio and replays.
- **A body touching an exit is home: frozen, no events, never dies; won when both are home** — makes parking a puzzle tool and keeps single-body levels identical (one body home = all home).
- **Home is checked before death on the same step; if not all are home, any non-home body below the grid kills the run** — keeps "exit beats death" from v1.0 without letting a win hide a death.
- **Either body falling out kills the run; death and restart reset both, home flags included** — one run, one state, simple replays (pillar 3: fast retries).
- **No new tuning keys** — Tandem is structure, not numbers.
- **Camera frames the midpoint of non-home bodies; with one home it frames the other; beyond 28 tiles apart it follows the runner with an edge arrow; lanes + divider ≤ 15 rows (tech-lead's ADR: the HUD sits on top), each lane ≤ 7 rows, intended spread ≤ 26 tiles** — at 480×270 both bodies must be visible without vertical scrolling; the "not home" rule matches tech-lead's proposal.
- **The twin differs from the runner by shape at 12×24 px and both show their band pattern; the HUD shows two stacked strips, each marked with its body's silhouette** — color is never the only signal (CLAUDE.md), and which strip is whose must read at a glance.
- **Derived numbers in `tandem.md` (air-stop flight step 14, clamp ramp steps 31/35, Out of Step offsets) are pinned by tests, then the spec is updated to match** — same practice as GDD v1.2.

### Art
- **Art direction C (Pixel Dither, 480×270 logical, 16 px tiles, 12×24 px player) recorded in GDD §11** — owner decision; every gameplay element must read at that size by shape and pattern.

## 2026-11-04 — GDD v1.5: menus, progression and onboarding (M2-34, M2-01)

No `tuning.json` change. T-03 (deleting the four unused keys) waits for tech-lead's T-02 in Batch 2.

### Owner decisions
- **The first level of every world is unlocked from the start; Must stays 14 (owner decision)** — a 10-minute jam voter must be able to reach w3-01 Tandem (GDD §12.7).
- **The pixel cutover (PX-4..PX-10) runs after the Nov 8 M1 gate and the `m1` tag (owner-confirmed)** — M1 keeps a known-good build; the specs here are written for 480×270 only.

### Progression (`features/level-select.md`, `progress-save.md`)
- **Unlock rule: a level is playable if it is first in its world, if the level before it in the same world is completed, or if it is itself completed** — the owner's rule plus "teach in order inside a world" (pillar 4); the third clause keeps cleared levels open if the level list changes.
- **Unlocks are derived on every read, never stored** — no save migration when levels change, and the save cannot disagree with the rule.
- **Title PLAY starts the first playable level not yet cleared, in level order** — one button that always does the sensible thing, including for voters who skipped ahead.
- **Locked cells can be focused (the detail line says what to clear) but not started** — players can see what exists, which is the point of opening every world.
- **Best times are keyed by level id and survive level `version` bumps** — grids freeze at M4 and only developers' saves see changes before that; leaderboards (M3-02) key by version.
- **Replays and world 0 never write progress** — they are not the player's runs.
- **Reset progress is Could (settings, M3-15)** — playtesters use a private window.

### Menus (`features/menu-navigation.md`, `title-screen.md`, `pause.md`, `results.md`, `controls-screen.md`)
- **A key already held when a screen opens does nothing there until released** — otherwise the Space that won the level chooses NEXT by itself (pillar 3).
- **Menus never use Shift, Q, E, Z or X** — no menu can trigger Sticky Keys, and gear keys never surprise the player in a menu.
- **Pause freezes the sim with no catch-up; keys pressed while paused are ignored until released; keys held through the pause stay held** — the run and its recording are identical to an unpaused run, and choosing RESUME with Space never jumps.
- **Losing focus pauses the game and drops all held keys** — browsers lose key-up events while unfocused, so a stuck arrow would run the player off a ledge (pillar 3).
- **Results record the run exactly once, before the panel, and replace the M1 banner; NEXT crosses worlds** — one write per win, and the level order stays the single source.
- **The controls screen is generated from the binding table** — it can never list a key that doesn't work, and it survives a future remap screen unchanged.
- **A level that fails to load shows an error screen, never a broken menu; CI stops it shipping** — `loadLevels` is all-or-nothing, so a partial menu would hide the bug.

### Onboarding (`features/onboarding-hints.md`, `sticky-keys-tip.md`)
- **Hint glyphs are `move`, `shiftUp`, `shiftDown` and `jump`, generated from the bindings, at most 3 per level, never solid** — icons, not text (pillar 2); a hint can never show a dead key.
- **w1-02 also gets a shift-down glyph on its second pad** — the level asks you to shift down there and nothing else on screen says how (the HUD key caps are only Should).
- **w2-01 gets a jump glyph** — it is the first level that needs a jump, and jump was hinted nowhere.
- **w2-01 and w3-01 carry cold-start hints (Should)** — with every world's first level open, they may be the first levels a voter plays.
- **The Sticky Keys tip is saved as shown when displayed, hides on Enter, Q, E, Z, X, 12 s, pause or leaving the level, and never hides on Shift** — a player still tapping Shift is the one who needs it, and the alternate keys still shift (not swallowed).
- **The tip goes at the bottom unless it would cover the player, then just under the HUD** — at 480×270 a 240×44 panel can hide the spawn.
- **The controls screen's "show the tip" item is Windows only and does not touch the saved flag** — it is a re-read, not a reset.

### Art-director FYIs (requests 2026-11-03)
- **Red's pattern changed from crosshatch to checker: accepted** — the lattice read as a hazard in the 2026-11-02 playtest; a checker on a ledge with a lit top edge reads as a block. "Crosshatch" in older docs is history. M2-14b checks checker vs green's dots in greyscale at 16 px.
- **Palette deltas (safe fill `#5F6987`, ghost outlines blue `#4F86E8`, green `#40D88C`, red `#E11E3A`, HUD panel `#0F1220`, decor luminance cap 0.013): accepted** — by my estimate every ghost outline clears 3:1 even at the brightest background (red about 3.5:1); M2-14b must measure all five bands, yellow included, before it closes.
- **Yellow background tint 9.5–17.7 ΔE from standing: accepted** — the tint is ambient; the HUD lit cell and the player's pattern carry the band.
- **Twin silhouette (antenna, chamfered shoulders, wide stance, two square eyes): accepted; no extra marker above the head** — a different silhouette is what the rule asks for, and a filled body keeps the twin's band pattern readable (my hollow-outline proposal would have thinned it). The HUD strip glyph and the camera edge arrow use the same silhouette. The M3-34 playtest (GDD §12.8) is the trigger for a marker.
- **Mechanic tiles: nothing new for Must** — worlds 1–3 use safe, colored (floors and walls) and exit only; gates and ice (world 4, Should) wait for the Nov 12 Tandem gate, or become Must only in the fallback.

## 2026-11-04 (batch 2) — GDD v1.6: level verdicts, check 6, T-03, M3 specs

### Level verdicts (M1-25, M2-23)
- **M1-25 w0-02 Grey Box v2: APPROVED** — the spawn pad is open to the top (8 tiles), so the first jump shows the full 3.0 apex with no ceiling event (pillar 2, the 2026-11-03 ruling); route, solution (775 steps) and every cheese sweep are unchanged; the bridge ceiling starts exactly at the bridge's first column, so a jump into its face drops back on the pad.
- **w1-01 First Steps: APPROVED** — one idea (hold to walk; blue holds you only while you walk), taught on bridge 1 and tested on bridge 2 (pillar 4); fairness windows 20–30 steps each way (pillar 3); the removal test and 42,832-run cheese sweep show no line skips a bridge.
- **w1-02 Shift: APPROVED** — one idea (Shift sets the cruise gear and so the color), in a room the player already knows with one tile color changed (pillar 2); shift-up window about 28 steps and shift-down window 43 steps (pillar 3); with no shift press 0 of 3,208 lines win, so the idea can't be ignored (pillar 4).

### World 1 roofs (level-designer's call)
- **Low safe roofs over world-1 bridges: ACCEPTED with conditions** — they make "can't be solved by ignoring the idea" hold against jumps (pillar 4) and keep world 1 about pace, not jumps (pillar 1). Conditions, now in GDD §6 and level-plan v3.2: exactly 2 tiles of headroom; safe tiles only; end faces over safe ground or flush with the bridge ends (a jump into a face must drop you on safe ground, never on the bridge in the wrong color, pillar 3); every spawn and stop pad keeps ≥ 5 tiles clear so a standing jump shows the full apex (pillar 2); w1-05's red wall runs floor to roof; worlds 2 and 4 put no roof over the lesson.
- **Cost accepted: world 1 never asks for a jump** — w2-01 is the first jump level and carries the `jump` glyph (2026-11-04 ruling), and it is open from the start.

### Colored-walls check 6 (sim lane, M2-47)
- **Restated at 4 tiles: ceiling bottom 4 tiles above the floor (2.5 tiles head room), contact on flight step 15 (head 4.078; 3.979 on step 14)** — 3.5 was off the grid; 4 tiles has the wider margin either side of contact (0.021 / 0.078 vs 0.005 at 3 tiles, step 7 head 2.995) and bonks near the top of the arc, which is how a level would use it. The 3-tile assertion may stay as an extra regression test.

### T-03
- **`mudMaxGear`, `boostPadGear`, `ghostSpacingTiles`, `ghostLifetimeMs` deleted from `tuning.json`** — mechanics cut 2026-11-03; done in the same batch as tech-lead's T-02 schema change, as planned.

### Leaderboards (`features/leaderboards.md`, M3-02)
- **Rank by steps, show time** — steps are exact; at 60 Hz distinct steps never display the same hundredths, so the shown order never looks wrong.
- **Clock from spawn, idle included, winning attempt only** — confirms the 2026-11-03 ruling for boards: any "first input" rule must be reproducible by replay, and idling only costs the idler.
- **Post only after the player picks a name, and only first clears and new bests; no retry queue** — opt-in by action (privacy line in `progress-save.md`), low traffic, nothing to retry offline (offline first).
- **Names: 1–12 characters, A–Z 0–9 space hyphen, upper case, server blocklist with leetspeak normalising; not unique** — 12 fits a 1× row at 480×270; upper case means typing never needs Shift; no accounts in a jam.
- **Board shows the top 5 with each name once at its best, plus the player's row if outside** — the most a 160×140 panel can show readably.
- **Offline is quiet: no board when unconfigured, one muted `BOARD OFFLINE` line on errors, never a dialog or a retry button** — CLAUDE.md offline first.
- **Floor time = 85% of the level's fastest known steps (recorded by level-designer)** — the only cheat guard until server replay (v2); 15% leaves room for players to beat the sweeps.

### Audio (`features/adaptive-audio.md`, M3-02)
- **Music follows the band (discrete), with a 150 ms glide and a 30 ms snap on a drag drop** — bands are what the rules use; the snap sells the clunk.
- **Clunk vs shift down: an octave lower, one hard attack with grit, and it darkens the music** — the game taking a gear must not sound like the player choosing to.
- **No SFX on `bandChange` or `graceStart`** — the music already carries pace; a blip at every band edge is noise.
- _(superseded 2026-11-13 by the T-07 ruling: fall-through is the sim event `fallThrough { body, cells }`, `architecture.md` §3.2)_ **Fall-through has no sim event; it is a pure derived helper (grounded → airborne, no jump, colored tile under the footprint)** — no sim change for a render-only need; tech-lead places the helper.
- **Tandem: each body's event once; the twin's voice is a fourth lower and 3 dB softer; same event on the same step plays as one unison** — two voices make "out of step" audible without doubling volume.
- **`home` chime per body, suppressed on the win step** — one sting for the win, not three sounds.
- **Audio, effect and leaderboard constants are not `tuning.json` keys** — tuning is for gameplay numbers; these live with their owners.

### Effects (`features/pixel-effects.md`, M3-02)
- **Two independent settings: reduced effects (decoration off) and reduced motion (no flashes, wipes, parallax, pulses; defaults to the OS preference)** — they serve different players; board M3-18's "reduced mode" is reduced effects.
- **The drag-drop cue is never removed; under reduced motion it becomes a held outline frame plus the HUD snap** — it is gameplay information (GDD §12.1), not decoration.
- **The drop cue triggers on `airDrag` only, not on any airborne band drop** — an air wall stop also drops the band and must not look like drag.
- **No screen wipe in Tandem levels; the drop shows on the body and its HUD strip** — a wipe can't say which body dropped (pillar 2).
- **World tint and music follow the faster non-home body** — one ambient pace; each body's own color stays on the body and its strip.
- **No screen shake anywhere** — simplest accessible answer; nothing in the game needs it.
- **Flash cap: 3 per second for the whole screen** — photosensitivity guideline, both bodies counted together.

## 2026-11-05 — M1-52: verdicts from the M1 playtest (`docs/playtests/2026-11-07-m1-greybox.md`)

No `tuning.json` change: every issue was missing information or level geometry, not a wrong number. Checks per fix: `features/clarity-fixes.md`.

### Playtest fixes PT-1..PT-7
- **PT-1 `/` opens on w1-01: DO** — w0-02 asks six ideas at once and was the biggest quit risk; w1-01 reads in 8 s (pillar 2). An unknown `?level=` also falls back to w1-01 until the title exists.
- **PT-2 exit doorway and off-screen exit arrow: DO; opening camera pan and w0-02 pocket cue REJECTED** — the goal must be the most distinct object and a wide level must say it continues (pillar 2); a pan delays every retry (pillar 3); world 0 does not ship.
- **PT-3 show why you fell: DO (Must for fall-through; Should for airborne pass-through and colored wall stops)** — highlight the tile run and ring that color's HUD cell for 0.75 s, held, never blinking; the rule must be visible at the moment it acts (pillar 2).
- **PT-4 drag bar: CHANGE, labelled by shape (it runs from the needle to the next lower cell, ending in a chevron), no word; hidden if not built by M2-29** — one drop then explains it; an unexplained bar reads as a loading bar.
- **PT-4 one-time air-shift hint: REJECT** — you cannot shift in the air (presses are buffered only within 6 steps of landing), so the hint would teach a false rule; the pending bracket already shows a buffered press. No glyph id and no producer sign-off needed.
- **PT-5 "slot 4 lit while yellow": CHANGE, the bracket is thin until the lit cell reaches it, then bold; the lit cell is the only filled cell** — shows "selected but not reached yet" by shape without a runway hint (M1-29 ruling stands); any model bug found by ui-engineer is fixed separately.
- **PT-6 tight windows: CHANGE w1-02 and w1-01 (P2 3 → 4 tiles), w1-04 (pad 6 → 8 tiles); w1-05 geometry KEPT** — "did it right but too slowly" deaths in teach levels fail pillar 3; w1-05's window is capped by its lesson (wall-to-bridge 2 tiles + 0.75 must stay under red's 3.23), and its standing-start line needs no timing.
- **New level rule (level plan v3.3): every level has one winning line whose timed inputs each have ≥ 30 steps in world 1 (≥ 18 from world 2), or are a walking-pace position choice with ≥ 1 tile of spots; 12 steps stays the floor for other intended lines** — makes "never pixel-perfect" a number level-designer can measure.
- **PT-7 win card: DEFER to M2-12; NEXT is primary (focused, Enter/Space), R is RETRY; no interim banner change** — the results panel replaces the banner, and the M1 build is internal.
- **Scene spec gaps of 2026-11-04 (beat, replay banner, blur after win, R while paused, unknown `?level=`, tip in replay): answered in `clarity-fixes.md`, all accepted as built except unknown `?level=` → w1-01** — none affects a shipped run.
- **Four fast E taps registering as two: not a bug** — a press is a key-down edge; the playtest script held E across steps without a release, which a human tap does not do.
- **World-1 roofs read as hanging slabs (playtest Q5): KEEP the geometry; linking them visually across the top rows is an art Could** — the playtester never felt blocked, and pads must stay open for the full jump apex.

### Other rulings
- **Red ghost outline under protanopia, 2.20:1 (2.31 without star pixels): ACCEPT as the single documented exception, floor 2.15 pinned by test** — art proved no red outline meets 3:1 there without collapsing onto another band; the checker rim, dashed outline with solid corners and missing fill/lip carry the ghost, so color is not the only signal (the hard rule holds; 3:1 is our own bar). M2-29 includes a protanopia screenshot of a red ghost bridge.
- **w1-04 blue bridge with no roof: ACCEPT; roof rule amended: a world-1 bridge may go roofless when a roof face would let a jump wall-stop past the lesson and the bridge is long enough that no takeoff clears it (sweep: 0 skips)** — 156 of 486 no-brake lines win under a roof, 0 of 486 on the open 12-tile bridge; the roof exists to protect the lesson, and here it would break it.
- **Edge arrow carries the band: YES, by pattern ink (white = plain), with the body's silhouette as today; art builds it in M1-59** — in Tandem the off-screen body's color is the question the player is asking ("is the twin red on its red bridge?"), and color is never the only signal. The PT-2 exit arrow is neutral (no band) and differs by shape.
- **w1-03 Runway: APPROVED (M2-23)** — one idea (back up to build speed); any standing start at x ≤ 8.3 works, so it is a lesson, not a test (pillar 3); no line that never backs up wins (0 of 5,680), and the roof stops 518 jump skips (pillar 4).
- **w1-04 Brake: APPROVED subject to PT-6 v2 meeting its numbers (≥ 35 / ≥ 32 steps)** — one idea (slowing takes distance), the brake can't be skipped (0 air brakes in 25,728 runs); only the window was short.
- **w1-05 Red Wall: APPROVED; README must record the timing-free standing-start line (≥ 30 steps)** — one new idea (a colored wall stops only its color), real tension (not red at the wall, red 2 tiles later); the playtester called it the best puzzle and fair.
- **SEC-2 leaderboard name allow-list: `^[A-Z0-9-]+( [A-Z0-9-]+)*$`, 1–12 characters; the client types upper case, the server rejects anything that does not match (lower case included, check 11)** — the charset already in `leaderboards.md`, written as one pattern client and server can share (tech-lead's structure, our narrower charset; no `_` or `.`).

## 2026-11-13 (batch 4A) — GDD v1.7: pixel cutover, level rulings, T-07, B1

### Owner decisions
- **M1 signed off; the pixel cutover (PX-4..PX-10) starts in Batch 4A; the M1-55 hand checks move to the M2 gate on the pixel build (owner decision)** — recorded from `requests.md` "Owner decisions (2026-11-13)".
- **Tandem decision gate moved from Nov 12 to Tue Nov 17 (owner decision); Tandem stays world 3 until then** — the gate is qa-tester's T-13 run of `tandem.md` checks 1–12; noted in `tandem.md` Priority, GDD §10 and the level plan.

### PX-5
- **`tileSize` 32 → 16; GDD notes the 480×270 base with whole-number zoom (§4.1, §9, §11)** — the ADR's option (a); the sim works in tiles, so no rule, level, solution or `src/core` test changes, and 16 px at 2× is the same on-screen size as 32 px today. No other tuning value changes.

### Levels (M2-23)
- **w2-01 Commit: APPROVED; the grace-and-coyote yellow line (73 of 708 random wins, fastest known 157) ACCEPTED as an expert line, no geometry change** — it needs a shift press on the runway and a jump within about 12 steps of turning yellow, which every other line punishes, so a first-timer meets it only by luck; nothing pressed in the air helps it, so the lesson holds; the drop it shows is w2-02's idea with its full cue, a preview rather than a misteach; and one gap cannot separate the green (4.8) and dragged-yellow (6.0–7.3) landings. Intended window 21 steps (≥ 18), 0 of 80 no-jump lines win. Level-plan drag-rescue constraint amended to name this exception.
- **w2-02 Coast: APPROVED with the yellow pad 2 tiles lower (keep, do not revert)** — it is the plan's own fix ("lower landing pads, not shorter gaps"): the window grows 18 → 23 steps (≥ 18, pillar 3) with the gap still 7 tiles; the drop comes on flight step 30 and the landing on step 55, a second drop would need 12 tiles, and every one of 722 sweep wins takes off red while 0 yellow takeoffs win.
- **World 1, still pending: w1-01 v2, w1-02 v2 and w1-04 v2 are APPROVED in advance if PT-6 lands with the 2026-11-05 numbers** (w1-02: shift-down ≥ 50 steps, let-go ≥ 45; w1-01: the same room as w1-02, every timed input ≥ 30 steps; w1-04: running ≥ 35, let-go ≥ 32, else a 9-tile pad), replay and ±3 green, `hints.test.ts` green and 0 bridge skips in the rerun sweeps; any miss comes back to design-lead — the ideas and rooms were approved on 2026-11-04/05; only the windows changed, and those are measurable. w1-05's README fair line (≥ 30 steps) closes its condition the same way. w1-03 and w1-05 stay APPROVED (2026-11-05).

### T-07 amendment
- **Fall-through is the sim event `fallThrough { body, cells }` (tech-lead's T-07 ruling, `architecture.md` §3.2); the 2026-11-04 "no sim event" line is superseded, and `adaptive-audio.md` (trigger, check 5) and `clarity-fixes.md` (PT-3 triggers and checks 1–2) now point at it** — the trigger condition is unchanged, and the sim computes it once so audio, effects and HUD cannot disagree; render code may not call core helpers anyway.
- **Airborne pass-through (PT-3 Should) stays out of `fallThrough`; tech-lead decides in the contract change whether the sim reports it. Design asks only for at most one cue per body per flight, with the crossed cells and band** — `fallThrough` needs a grounded start, and a Should must not hold up the Must event.

### B1 Sticky Keys tip
- **CHANGE: a pause (Esc/P or focus loss) hides the tip only while paused; on resume it returns with the rest of its 12 s (counted in unpaused time). The flag is still saved when the tip first shows** — an accidental click outside the itch iframe in the first seconds burns a Must one-time tip that the players who need it never see (pillar 2); keeping it through a pause is cheaper and simpler than a delayed save, and acceptance checks 1, 2 and 8 stay as they are. `sticky-keys-tip.md` (edge case, check 11) and `pause.md` amended.
