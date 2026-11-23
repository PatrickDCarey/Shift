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

### B1 Sticky Keys tip (2026-11-13)
- **CHANGE: a pause (Esc/P or focus loss) hides the tip only while paused; on resume it returns with the rest of its 12 s (counted in unpaused time). The flag is still saved when the tip first shows** — an accidental click outside the itch iframe in the first seconds burns a Must one-time tip that the players who need it never see (pillar 2); keeping it through a pause is cheaper and simpler than a delayed save, and acceptance checks 1, 2 and 8 stay as they are. `sticky-keys-tip.md` (edge case, check 11) and `pause.md` amended.

## 2026-11-16 (batch 5) — run cycle, Tandem gate, w2-03, pass-through cut, blocklist

### Run cycle (PX-7, [scene] request 2026-11-13)
- **Stride per animation, not one number: `run` (blue, green) 3 frames per tile, `sprint` (yellow, red) 2 frames per tile. Frame = `floor(x × framesPerTile) mod 6`, where 6 is the atlas frame count (`PLAYER_ANIMS`), not a tuning value. Facing left uses `(6 − k mod 6) mod 6` with `k = floor(x × framesPerTile)`, so the legs never play backwards. Each body uses its own x.** — leg rate then rises with pace (blue 9, green 18, yellow 18, red 24 frames/s, every rate ≤ 30 so no frame is shown for under two display frames) and the stride lengthens from 2 to 3 tiles when the sprint lean starts, which reads as speed at a glance (pillar 2); it brackets art's suggested 12/14 fps. One number (3) would give red 36 frames/s, a blur. A per-band stride would jump frames at every band change; per-anim it changes only where the anim already changes. The ADR's `mod 4` is stale (art has 6 frames). Keys `runFramesPerTile: 3` and `sprintFramesPerTile: 2` go into `tuning.json` in Batch 6 with tech-lead's `Tuning` change; until then the scene keeps its placeholder 3 for both.

### Tandem
- **`tandem.md` checks 5 and 6 reworded per [sim]: the block face is "about 3 tiles" past launch (first whole-column face at or beyond +3.0; tests use 3.103), the runner snaps to face − half width (0.375), and check 6 starts at the end of the step after landing** — a face at exactly 3.0 cannot be built on the tile grid; every other number matched the derivation, so only the wording was wrong.
- **Gate criteria for Tue Nov 17 written into `tandem.md` "Gate criteria": stay = sim checks 1–18 Pass, w3-01 recorded and green, twin drawn and told apart in a browser with two strips, camera S1/S2, owner wins w3-01 by hand; fall back = any of checks 1–12 failing, twin not drawn or not distinguishable, no w3-01 recording, or T-20 absent** — the owner needs a yes/no list, and "playable" must mean someone actually played it; the edge arrow and strip polish are not worth losing the core twist over, so they are a one-batch fix, not a fallback.

### Levels (M2-23)
- **w2-03 Step Down: APPROVED** — one new idea (walking off is a shorter flight than jumping); the plan's exact 4-tile drop is kept; the removal test holds (flat floor = no lesson, 5-tile drop = 0 of 1,120 win); 0 of 70 jump-offs and 0 jump-off wins in 3,872 structured and 20,000 random lines, so it cannot be solved by ignoring the idea; the fair line has no timed input (±3 green). The red-floor re-jump to the exit pad comes after the lesson and is slower (173+), so it stays.

### PT-3 airborne pass-through
- **CUT (no `passThrough` event)** — the Must triggers (walk-off and grace fall-through, the M1 playtest's actual deaths) are covered by `fallThrough`; in flight the dashed ghost tile the body passes, plus the drop pulse and drag bar, already show the color change; a new event with a per-flight latch is new sim, contract, scene and audio work for a Should. `clarity-fixes.md` PT-3 trigger and check 5 amended.

### Leaderboard names (M3-11, SEC-2)
- **Blocklist sent to backend-engineer as a request line, with a two-part matching rule after the spec's normalisation: "contains" terms anywhere, "whole" terms only as the entire name** — substring matching on short words blocks `CLASS`, `GRAPE` and `COCKPIT`; a whole-name list for those keeps false rejections near zero while the long slurs and swears are still caught inside longer names. `leaderboards.md` Names and check 11 amended.

## 2026-11-16 (batch 6, B6-05..B6-07) — GDD v1.8, level plan v3.5

### Owner decisions (recorded)
- **Tandem stays as world 3; the gate is closed and the gates-world fallback is dropped; dates no longer drive the plan (owner decision, `requests.md` "Owner decisions (2026-11-16)")** — `tandem.md` (header, Priority, the gate list is now a completion checklist with no fallback triggers), GDD §7.1/§8/§10/§12, level plan, `level-select.md`, `speed-gates.md` and `mechanics-review.md` updated.

### B6-05 tuning
- **`runFramesPerTile` 3, `sprintFramesPerTile` 2, `cameraMaxApartTiles` 28 added to `tuning.json`; no other value changed** — the run-cycle numbers ruled earlier today and the Tandem camera limit already in `tandem.md`; CLAUDE.md puts every gameplay number in tuning, and tech-lead adds the same names to `Tuning` in this wave. GDD §9 lists them.

### B6-06 rulings
- **Shared-room Tandem tile colouring (lane by nearer start row; start rows under 3 apart = the runner's band colours every tile): ACCEPT as built, plus a level rule: spawn rows ≥ 3 apart and every colored tile strictly nearer its own body's start row (with spawns on rows 5 and 12, no colored tile in twin-lane rows 7–8)** — stacked lanes always satisfy the row gap, and the only way the rule can lie is a colored tile in the top rows of the twin lane, which a level rule forbids for free; a divider-based rule would fail on w3-01, whose divider has holes under the runner's bridges.
- **w3-01 Two Lanes v1: APPROVED without roofs; no v2** — the lesson is the twin and "both home", and every one of 10,348 sweep wins ends on the twin's home step with both bodies in step, so the bridge skips (168 yellow/red jumps, the 195 coyote line) skip a world-1 bridge, not the idea; it is open from the start, so a world-2 skill is a bonus, not a misteach; fair window 131 steps. Fastest known 195 stands.
- **w2-03 Step Down: CHANGE to v2: open a 3-tile pit at the foot of the ledge (red floor starts 3 columns later, about col 14), nothing else** — the playtester (a script) held right and won without ever being tempted to jump, so the level read as w1-03 with a drop; a visible gap below the edge invites the world-2 jump that the level punishes, which is the lesson. The red walk-off still lands about 3 tiles past the pit (x ≈ 17.1), the drop stays exactly 4, and every slower walk-off already died. Not reordered: it still follows Coast, whose habit it breaks.
- **w2-02 Coast: ACCEPT the geometry; the fix is the drop cue** — every win does drag to yellow and land on the yellow pad (a red landing would fall), so the pad does matter; what failed is that the playtest build drew no drop wipe or flash, so the change was invisible. The scene wires the single-body `airDrag` wipe first within B6-39, and the B6-44 playtest asks about w2-02's drop.
- **Win card: CONFIRM (as ruled in M1-52 PT-7): NEXT focused, key line `ENTER: NEXT LEVEL` first and `R: RETRY` muted after it; the Sticky Keys card hides on the win step and does not return** — Enter is what a player wants after a win (pillar 3), and the card over the banner hid the result. `results.md` and `sticky-keys-tip.md` amended (B6-16, B6-19, B6-29).
- **w1-04 exit off screen at the start: ACCEPT, no level change** — a wide level that says it continues is exactly what the PT-2 exit cue (B6-38) must handle, and w1-04 is its test level; the camera reaches the exit long before the player needs it.
- **HUD over the w1-04 pillar and the w1-01 roof: HUD fix (ui-engineer B6-20: panel fill under the meter, plus the 2 px inset), not a level fix; new level rule: no colored tile, exit or hint box under the HUD area (screen x 0–120, y 0–40)** — only safe tiles pass under it today, and a filled panel reads as "HUD in front" instead of a meter touching geometry; moving tiles in approved levels for a cosmetic overlap would cost recordings and leaderboard rows.
- **Hint glyphs: the spec is fixed for the pixel build, no rule change: key caps on a `ui.panel` fill with a `ui.focus` outline and `redshift-5x7` labels, 11 px tall caps in two rows, at most 48 × 24 px, bottom on the anchor cell's bottom, integer positions; `L⇧`/`R⇧`/`SPACE` labels; shown from the first frame and never removed during a visit (death and R included); drawn by [scene] B6-31 from a pure layout in `src/entities/`** — the old text named a ui renderer (M2-36) that was never built and `keyLabel`'s long Shift names would not fit; the rule (static key caps from the bindings) is unchanged.

### B6-07 world 3 specs
- **w3-02..w3-05 specced in `levels-w3.md`; level plan rows point there** — the plan rows did not give grid rules, and level-designer builds from the text alone.
- **w3-02 Out of Step revised: a full-height blue wall pins the walking runner while the twin walks on to a far safe pad; the player chooses the offset, then backs up and shifts to green to pass** — the v3.0 sketch needed a 1.25-tile green bridge starting a quarter tile into the wall column (not buildable on the grid) and its split lasted under 1.3 tiles; a pin is a lasting, position-chosen split at walking pace (pillars 1 and 3) and uses only colored walls (w1-05). GDD §8 example updated.
- **w3-03 Gear Split keeps the plan (runner's hanging block, twin's Coast), with the twin's lane yellow to its exit so it cannot park before the runner needs blue; w3-04 Clamp opens with a short w3-03 and makes the twin's red bridge long, so "press once, park the twin, press twice more" fails; w3-05 combines split, bridges, down-clamp, blue-wall pins to re-align, up-clamp, one shared drag jump, park and the twin braking alone** — each level's removal test must survive the park line, because a home body lets the other be played alone.

## 2026-11-17 (batch 6 closing rulings) — GDD v1.9, level plan v3.6

### Levels (M2-23, B6-22, B6-32..B6-36)
- **w2-04 Two Colors v1: APPROVED; its 13-step jump window is a stated exception to the world-2 fairness floor (18), for this level only** — the window is the color grace itself (grace 6 + coyote 6 + the turn-yellow step), so it is exactly what the lesson teaches and the plan (12) and GDD §5.7 always named it; it is timed from the player's own shift press on a 41-step / 4-tile choice of spots, not from an outside event; widening it means a jump from safe ground, which removes grace from the lesson; changing `colorGraceMs`/`coyoteMs` would re-time every level and recording for one room. The B6-44-or-next playtest checks it; if a fresh player fails the jump more than five times, the fix is a tuning look, not a layout change.
- **w2-03 Step Down v2: APPROVED** — the pit adds the pull to jump that v1 lacked, nothing else moved (drop 4, red walk-off lands at 17.10), and 0 of 25,280 structured and random lines win with a jump off the ledge.
- **Pins use a 1-tile safe kerb, not a colored wall: ACCEPT the kerb as the mechanic; no sim change** — after a wall stop the body is band 0 and restarts at walking pace, which passes every colored wall (blue included, via no-embed); that is the existing, tested rule (`colored-walls.md` check 1, `tandem.md` check 4), and my B6-07 spec was wrong about it. A safe kerb holds a body for as long as you hold, keeps the taught idea (one lane's wall holds one body while the other walks on) and is cleared with a jump, a world-2 skill. A sim change would alter a shipped rule, the Tandem golden hash and every recording's validity for a feature the kerb already gives. `levels-w3.md`, `tandem.md` and `colored-walls.md` amended.
- **w3-02 Out of Step v1: APPROVED as built (kerb at col 8, twin-lane roof, 8-tile Q, divider pocket)** — kerb removal 0 of 98,280 wins and 0 cheese wins without the pin; every timed input ≥ 18 steps (jump 30) or a walking-pace position choice; the roof keeps twin jumps from skipping its bridges; Q at 8 tiles lets the twin stay on it through the back-up. The closed pocket (a fallen runner waits for R) is accepted because without it the runner could finish in the twin's lane; the playtest asks whether players find R.
- **w3-03 Gear Split v1: APPROVED as built (flat Coast pad, 18-step window, 10-tile blue bridge with a 3-row pocket, 2-column block in rows 1–3)** — the flat pad removes an untaught second way to split (a late shift buffered for only the runner) at the cost of 5 window steps, and 18 is the floor; the long bridge and pocket stop a block-less yellow runner from jumping it or finishing in the twin's lane; block removal 0 of 71,568 wins, 0 wins without the air stop.
- **w3-04 Clamp v1: APPROVED as built (flat Coast pad, 6-tile runner pad)** — every one of 808 wins uses a clamped press and the air stop; the park line fails; let-go window 73 and moving window 86 steps; the larger pad only widens the let-go window.
- **w3-05 Redshift v1: APPROVED as built (kerbs at col 45 in both lanes, a 3-tile blue strip in the twin lane, flat pads, shared jump window 22)** — kerb removal 0 of 56,700 wins, 0 wins without the air stop, the blue strip makes the down presses the forgotten-step failure the spec wanted, every timed input ≥ 18 steps.
- **w3-05 block removal: ACCEPT that it does not fail; the block need not be load-bearing in a COMBINE level** — in the level as built the split cannot be avoided (0 wins without the air stop), so every player meets it and must undo it (the down presses are clamped for the runner); a combine level is judged by "no win skips an idea" in the level as built, and each idea has its own removal-tested level (w3-03 for the block). Lengthening the runner's bridge would put a falling runner on the twin's brake pad, a worse fault. Level plan rule amended for COMBINE levels.

### Menus and scene (B6-16, B6-29, B6-40)
- **Results key line at 1×: ACCEPT, no wider panel** — 1× is what `results.md` specifies (the 2× text is the items, where NEXT is first and focused); the line is first, framed and in `ui.text`, which answers the playtest; a 216 px panel would change a layout ui and QA have already pinned for a line that already reads.
- **A key pressed on the frame an overlay (Pause, Results) opens or closes belongs to the overlay and is dropped, not queued: ACCEPT** — it matches the existing rule that presses made while paused never reach the game (`pause.md`), and a queued Space or R landing in the sim after the menu closes would be a surprise jump or restart (pillar 3); held keys still follow the held-through-pause rule (pause check 4). `pause.md` and `menu-navigation.md` amended.
- **Backdrop parallax far 0.15, near 0.3: ACCEPT the values; art-director owns them from now on** — they are visual constants, not gameplay numbers (tech-lead's ruling), reduced motion turns parallax off, and the far layer moving half as fast as the near one reads as depth without pulling the eye from the lanes. Tech-lead's request line of 2026-11-17 (S4) already moves them into `RIDGES` in `src/fx/pixel`; no new line.

### Status
- **All 14 Must levels are built and approved: w1-01..05, w2-01..04, w3-01..05** — GDD §10, level plan v3.6 and `levels-w3.md` updated; what is left on the Must list is in GDD §10 "Must: what is left".

## 2026-11-19 — batch 6 cold playtest triage (`docs/playtests/2026-11-18-batch6.md`), GDD v1.10, level plan v3.7

No `tuning.json` change and no geometry change to any level. The playtester is a script with no platformer habits, read the README on five levels, and did not finish w3-04 or play w3-05; every ruling below weighs that. Past content complete, so hints and cues come before geometry, and nothing adds a mechanic.

### Top five
- **1. Pocket (w3-02, w3-03): CHANGE, a render-only restart card, Must ([scene], `features/restart-prompt.md`)** — a body in a sealed pocket has lost the run and nothing says so (pillar 2); the card `[R] RESTART` shows 1 s after a non-home body is in a pocket found by a pure grid helper, at the bottom centre with the Sticky Keys tip's placement, static, cleared by restart, respawn or leaving. **Auto-reset REJECTED**: a scene-made restart puts an input in the recording the player never pressed, acts on a heuristic, and does not teach R, which every level needs. **Level change REJECTED**: the pocket keeps the runner out of the twin's lane (2026-11-17), and in w3-02 its floor is the twin's roof. No sim, contract or format change, so no tech-lead approval beyond review.
- **2. Hanging block (w3-03..w3-05): CHANGE w3-03 only, a `jump` glyph at the takeoff (`jump 12 3`, runner lane)** — the block was not read as the tool, and a glyph at the right x makes the player jump into it and see the gear drop (the playtester's own suggestion); w3-03 is the teach level, and w3-04/w3-05 open with the same section, so hints stop there as they do after w2-01. **Pre-approved:** the same glyph in w3-04 and w3-05 if the next cold play fails w3-04's opening more than 3 times.
- **3. w2-04 window: CHANGE, hint, not tuning or geometry: `shiftUp 8 4` stacked over `jump 8 6`** — the 2026-11-17 trigger (more than five failed jumps) fired, so I took the tuning look: the failures were understanding (the script shifted twice and was already yellow; "the mechanism is not guessable"), not window length; grace is taught by no other level, so it is the one combine level that needs a hint. Stacked at one x the pair reads "shift up, then jump, here", and a deliberate two-key sequence (6–15 steps) lands in the window (steps 4–16 after the press); side by side they would read as two places 2 tiles apart, about 18 steps late. Raising `colorGraceMs`/`coyoteMs` would re-time all 14 recordings and sweeps for one room; widening by geometry means a jump from safe ground, which removes grace (2026-11-17).
- **4. w2-03: NO CHANGE, keep v2; world 2 stays 4 levels, Must stays 14** — its lesson is the counter-habit to w2-01/w2-02's edge jump, which a habit-free script cannot feel; at 4 s it is a breather before the world's hardest level and costs a voter nothing. Cutting it means a "2-4" gap in level select (or renaming w2-04, which touches saves, recordings and leaderboard rows), a `LEVELS` row in `backend/functions/submit-run/rules.ts`, and the itch page's count line, for one weak level. Nothing changes in those files.
- **5. w1-03 run-up: CHANGE, a `shiftUp` glyph over the back wall (`shiftUp 2 6`)** — the room behind the spawn did not read as a run-up (about 5 tries, the first drop-off point); the glyph says where to shift, which here is the lesson, in w1-02's grammar; it sits away from the spawn, so the cheap first fall still teaches. Moving the spawn REJECTED (a spawn with a full runway removes the lesson).
- **Hint headers never bump `version`, re-record or change `LEVELS`** — hints are a pure overlay and the run is identical (`onboarding-hints.md` placement rules); leaderboards and saves stay valid.

### Gaps found outside the playtest
- **Sound effects not wired in the game scene: Must, wire the eight in-game sounds (shift up/down, jump, land, fall-through, clunk, reset, level complete) ([scene] with audio-designer, `adaptive-audio.md` "Wiring")** — the clunk is how air drag reads (GDD §11), and the spec has always called the SFX Must; GDD §10 now names them. Menu move/select sounds become Should (menus show focus by shape).
- **Settings screen: Should, needs producer sign-off (`features/settings.md`): SOUND, REDUCED MOTION and REDUCED EFFECTS toggles plus BACK, from the title; from pause is Should** — the smallest version that makes the three existing flags reachable; GDD §10's Must list has no settings screen, and the Must part (reduced motion from the OS) already holds. Volume sliders move from Must to Could and mute from Must to Should (`adaptive-audio.md`): the browser's tab mute covers today, and the itch page claims no setting until one ships.

### Other findings
- **w3-04 and w3-05 need a cold play before submit (Must)** — no player has finished either; checks and the limited-spoiler rule in `levels-w3.md` "Cold-play checks".
- **w1-04 "presses in one frame merge": NO CHANGE** — a script artefact already logged by QA (2026-11-04); a human never taps that fast, and the playtester said so.
- **w3-04/w3-05 blue strip readability: TEST AGAIN** — not reached; it is a question in the cold play.
- **QA A-4 (B7-09), pause opening frame: a key that goes down on the frame pause opens is a pressed key, ignored until released and pressed again even if still down at resume; "held through the pause" means down before that frame** — it matches the Space example and "pressed while paused is ignored", and a key the player pressed with Esc was meant for the menu, not the run (`pause.md` edge case, check 14).
- **QA A-4, restart-prompt checks: check 4 passes on sim steps (card absent before 60 consecutive steps with the runner's centre in the pocket, visible within 2 rendered frames of the 60th); check 5's "x ≥ 26" is the runner's centre x in tiles; check 8 is a hand check (a losing recording cannot be a `levels/` solution), automatable by QA only if replay can load a fixture without a code change; onboarding check 11's reference is the block face at col 16** — each is the reading QA already assumed, now written down.
- **BUG-6 boot failure: design supports tech-lead's retry plus an on-screen message; copy `COULD NOT LOAD THE GAME. RELOAD THE PAGE TO TRY AGAIN.`** — a black canvas on itch is the worst first impression; R means nothing before a level exists, so the copy names reload only.

## 2026-11-20 — batch 7 playtest triage (`docs/playtests/2026-11-20-batch7.md`), GDD v1.11, B7-17

No `tuning.json` change, and no geometry, `version`, recording or `LEVELS` change to any level. The playtester is a script (50–150 ms jitter, no sound). It cleared w3-04 cold in about 16 tries, did not finish w3-05 in about 14, and solved w3-03 using what it had learned in w3-04. Hints and cues still come before geometry. Nothing below adds a mechanic or a GDD Must item, so nothing needs producer sign-off unless it says **needs producer**.

### Top five
- **1. Teach the instant shift-up and the block jump before w3-04: ACCEPT, hints only (owner: level-designer).** The pre-approved trigger from 2026-11-19 fired: about 8 failed w3-04 openings against a limit of 3. So `jump 12 3` goes into w3-04 and w3-05. Also add **`shiftUp 2 3` over the runner's spawn in w3-03 and w3-04**. The player has to be in gear 4 before the twin's red runway at col 8, in the lane they are not watching, and w3-03, which teaches this opening, has no shift glyph. w3-05 does not get the start glyph: its third hint slot goes to the kerb (item 3), and by then the opening has been shown twice. Headers only (`onboarding-hints.md` "2026-11-20 placements"); the run is identical.
- **2. Keep both bodies on screen, or add an off-screen marker: REJECT the new feature; verify the existing rule (owner: qa-tester; [scene] if it fails).** The camera already frames the midpoint of both bodies up to `cameraMaxApartTiles` 28, so both fit on the 30-tile screen. Beyond 28 it follows the runner and puts an edge arrow on the twin, and once a body is home it follows the other one. What the playtester saw matches w3-04's runner parking at col 34 (README: runner home on step 354, twin on 396): the camera on the twin, the runner leaving to the left, the twin's exit arrow at the edge. A home body may leave the screen; its HUD strip dims and shows the home glyph. On the intended line w3-04's spread is at most 20.7 tiles. New scene checks S5 and S6 in `tandem.md` confirm this in a browser, and any failure is a [scene] bug. **Could:** a short pan when a park switches the framing (today the camera snaps about 9 tiles).
- **3. w3-05: FIX with hints. No checkpoint, no geometry change, and the level is not moved (owner: level-designer).** Exactly three runner-lane headers, the maximum: `jump 12 3` (the opening, as in w3-04), **`shiftUp 36 3`** over the walk-back stop (fair x about 34.7–38.2; the recording stops at 36.13) and **`jump 41 3`** over the kerb takeoff (about 39.6–43.7 from that stop; the recording jumps at 41.72). Read left to right they follow w1-03 and w2-01: "back up to here, shift up, run, jump here". The white twin pinned at its kerb is the correct state, since the kerbs re-align the bodies at x 44.625. The glyph behind it is the signal for what to do next, so there is **no pinned-body cue**: that would be new render work and a second signal for a state that is not an error. **Checkpoint REJECTED (needs producer if ever raised again):** the game has no checkpoints. One would be new sim, replay and validation work days before freeze, and it changes what a run is. **Shorter geometry REJECTED:** the length is the walk to the kerbs, which the pin needs; trimming would save under 2 s and cost a v2, a re-record, the sweeps and a `LEVELS` row. A retry stays about 20 s. With the opening and the kerb both readable there should be far fewer retries, and the next playtest judges that (`levels-w3.md` "Cold-play checks").
- **4. Restart card bigger or coloured: ACCEPT bigger, with a stronger edge but no band color (owner: [scene]).** Draw it at 2× (128 × 38 px with the shipped binding) with a 2 px `ui.focus` (white) outline instead of the 1 px `ui.panelBorder`. Band colors mean gears (a red card would read "be red"), and white is already the menu's "this is for you" color. It stays static, and the placement rule is unchanged. `restart-prompt.md` "Look" and check 3 amended.
- **5. Timing in the w2-04 hint: DEFER (owner: playtester).** This sitting only looked at the glyph (0 attempts), so the trigger from 2026-11-19 (more than 5 failed jumps with the hint) has not been tested. An arrow between the two boxes is **REJECTED** whatever happens, because `▲` and `▼` already mean shift up and shift down in the glyph set. If the trigger fires, design rules on a single frame drawn around the stacked pair.

### Other findings
- **The w1-03 hint does not say "back up for a run-up": ACCEPT as built.** The playtester said the glyph over the back wall prompts "I should go left first", and that is its job. A "go back" glyph would be a new id and new art. Its check 12 (solved within 3 falls) still needs a real attempt in the next playtest.
- **w3-03's jump glyph: KEEP.** It was read as "jump here", which is the solution.
- **Held keys carry through a respawn (art-director's note): INTENDED, no change.** This was ruled on 2026-11-02 (GDD reset rules, `safe-tiles-and-reset.md` edge case and check 9). A held direction walks on at once, and held Shift or Jump are not new presses, so there is no phantom shift or jump. Holding Right through a death is the fastest retry (pillar 3), and recordings depend on it (`level-format.md` §4).
- **w3-04 cleared with the shift-ups on the pad while moving: not cheese.** That is the README's moving line (an 86-step window).
- **Settings screen: ACCEPT as built** (it reads clearly). qa-tester still has to confirm: reduced motion visibly (`settings.md` check 2), the setting surviving a reload (check 1), and that the PT-3 "why you fell" cue is unchanged under reduced effects. The playtester saw "the red-brown fall tint" disappear and could not say what it was.
- **The restart card in w3-03 is not verified (owner: qa-tester):** `restart-prompt.md` check 5.
- **Sound was not judged, because the script cannot hear (needs the owner):** the clunk against a shift down on w2-02, SOUND OFF in settings, and music following pace, all by ear on the packaged build. The itch page's audio line waits on this.
- **The playtester's E/Q key slip:** a script mistake, not a game issue; E works.

### Batch 7 design questions closed
- **W7: settings changed from pause apply from the next level load. ACCEPT this as the floor; Should: [scene] re-reads both flags when the run resumes from pause (and on R).** The flash cap (3 per second), no screen shake and the OS preference hold from the first frame in every mode, so no player goes below the floor. Live re-reading under the frozen pause frame is not worth the work, but applying on resume is one read at a moment the scene already handles. `settings.md` "Edge cases" and check 4 amended.
- **Menu move/select sounds: Should → Could.** No playtest asked for them, menus show focus by shape, and `src/audio` has no menu call. Batch 8 is about world-3 clarity.
- **QA A-4 (B7-09):** answered on 2026-11-19 ("Other findings" above); the request line is now marked.
- **Request lines to design-lead still marked OPEN from 2026-11-03..17:** each was already answered in this file, on the date its ANSWERED note in `requests.md` cites. They are marked so the producer can close them. One exception stays OPEN: tech-lead's 2026-11-04 M2-03 line, which asks whether the 3 × 2 box and 3-rows-above-floor hint rules should be enforced by `tests/levels`. This file has no ruling on it, and tech-lead should say whether `tests/levels` already checks them before design rules.

### Itch page (`itch-page.md`)
- **§3, §5 and §7 brought up to date with the build:** the settings screen (title and pause, three toggles) replaces the OS-only reduced-motion line; "Stuck?" names the restart card; a one-line audio claim is written but **held for the owner's listening check**; §5 now names the delivered files in `docs/art/itch/`; the §7 checklist covers the settings, the audio check and the art. The count line is unchanged (14 levels, 3 worlds).

### Design's order for batch 8
1. Hint headers: w3-03 `shiftUp 2 3`; w3-04 `shiftUp 2 3`, `jump 12 3`; w3-05 `jump 12 3`, `shiftUp 36 3`, `jump 41 3` (level-designer).
2. Restart card at 2× with the white outline ([scene]).
3. QA checks: `tandem.md` S5–S6, `restart-prompt.md` 3 and 5, `onboarding-hints.md` 13–14, `settings.md` 1–3 and the PT-3 cue under reduced effects.
4. A playtest of w3-04 and w3-05 with the hints. A fresh sitting if possible, because this playtester now knows w3-04; w2-04 must be attempted, not just looked at. Ideally the owner also plays w3-05 once by hand.
5. Should: the W7 re-read on resume ([scene]).
6. Release items as before: CREDITS names, the itch draft, repo public.

## 2026-11-23 — batch 8 playtest triage (`docs/playtests/2026-11-20-batch8.md`), B8-12

No `tuning.json`, sim, contract or format change. One level changes: **w3-05 v2**, a local rework of the run-up behind the kerbs (Must-fix for release). Everything else is accepted as built or rejected. The playtester is a fresh script with about ±100 ms of jitter on every press, so a window of 13–22 steps costs it far more tries than a human; every count below is read with that in mind. BUG-8 (the runner's strip lacked the home glyph) is fixed in 5321e78 and is QA's to close; it is not re-triaged here. Nothing below adds a mechanic or a GDD Must item, so nothing needs producer sign-off except where it says so.

### Per level
- **w1-03 Runway: ACCEPT, no change.** Cleared on try 2 (one fall), so `onboarding-hints.md` check 12 passes; the glyph over the back wall read as "go back there and shift up", which is the lesson.
- **w2-04 Two Colors: ACCEPT as built; the trigger fired and every fix offered is REJECTED.** About 6–7 failed jumps with the hint (more than 5), so I re-took the frame question and the tuning look.
  - The stacked pair was read correctly ("shift up, then jump"), so a frame around it would fix reading, not timing: REJECT.
  - An `E` glyph over the yellow ledge "to shift in the air": REJECT. It teaches a false rule. Presses in the air never change your color, and an air press more than 6 steps before landing is dropped. The recording (`levels/w2-04.solution.txt`) has no air press. The tester's third E did nothing, and the clear came from the take-off timing (same ruling as PT-4, 2026-11-05).
  - A take-off marker: REJECT. The window is timed from the player's own shift press, which can be anywhere on a 4-tile spot, so a fixed mark would be wrong for most players.
  - Coyote at the floor's end: REJECT, it already exists (the window is grace 6 + coyote 6 + 1).
  - A longer ledge: REJECT, landing is not what fails.
  - Raising `colorGraceMs`/`coyoteMs`: REJECT again; it re-times every recording and sweep for one room.
  - With ±100 ms jitter on each of two presses against a 217 ms window, a script misses about half of its correct attempts. A human pressing E then Space as one roll does not. **Tie-breaker, not a fix:** the owner plays w2-04 by hand with the w3-05 hand play (owner list item 4). If the owner fails the jump more than 5 times, design rules again.
- **w3-03 Gear Split: ACCEPT, no change.** Solved in 5 tries (target ≤ 6). Jumping under the block to slow the top runner is the lesson, and the `jump 12 3` glyph points at it. A Q pressed before the bottom runner is home kills it on the yellow floor, and that is the puzzle; the home glyph in the strip says when it is safe.
- **w3-03 restart card covering part of the bottom lane: ACCEPT.** The card shows only after the run is already lost, and the placement rule moves it whenever it would cover a body. Covering tiles of a lost run costs nothing. The 2–3 s "delay" was by eye: QA measured exactly 60 pocket steps (`docs/qa/test-plan.md` §10, restart-prompt 4 and 5 Pass), counted from the step the runner's centre enters the pocket, mid-fall.
- **w3-04 Clamp: ACCEPT, no change, no fourth glyph.** Cleared in about 8 tries, half of batch 7's 16, and the opening now reads. "Three E marks near the blue bridge" would hint the clamp, which is the level's new idea and stays the puzzle (2026-11-20). 8 tries on the 13th level is inside "teach, test" for a 4/5.
- **w3-05 Redshift: FIX, Must for release: v2 reworks the run-up (owner: level-designer).** It was not finished in two cold sittings (about 14 lives each). The report pins the fault. The kerbs re-align positions as designed (both held at x 44.625; both kerbs are at col 45). But the walk-back then starts from wherever the player holds Left and lets go, so it only works if both gears already match. A player who jumps the twin's blue strip (the tester did, a world-2 skill) arrives with gears 1 and 2. They back up 120 px against 45 px, and nothing on screen says why. The level only works for a player who has already worked out the hidden "equalise first" step. That fails pillar 3, and a combine level must not need a step that no level taught. The tester did work out Q×3, then lost every later attempt to the opening.
  - **v2:** put a **step-up face at the back of the run-up, in both lanes at the same column** (the floor behind it one tile higher, about col 35). Walking Left then stops both bodies at the same x whatever their gears, as w1-03's back wall does. Then the `shiftUp` glyph over that step reads "back up to the step, shift up". Three presses clamp both bodies to gear 4 from any split (w3-04's idea), so they run in step. Going right, the bodies just walk off the 1-tile step. The run-up between the step and the kerbs is all safe, so the twin's blue strip is no longer in it.
  - The opening, the split, the strip and everything left of col 30 stay unchanged, so the opening and itch shot 5 stay valid.
  - Details and acceptance: `levels-w3.md` "w3-05 v2 (2026-11-23)".
- **w3-05 mid-level checkpoint (tester's #2, for w3-04 too): REJECT; needs producer if raised again.** A checkpoint is a new mechanic: it needs a new sim state, it changes what a run and a recording are, and it needs new validation and leaderboard rules, 7 days before submit. v2 removes the part that made each retry expensive (the dead end found only after two jumps). A w3-05 retry stays about 20 s with R.
- **Shorten w3-05's opening: REJECT.** The opening is the split the combine is built on. Its window is 18 steps, and a human misses it far less often than a jittered script.

### Cross-level findings
- **Teach per-runner gears early in w3 (tester's #1): REJECT for batch 9; Could post-jam (ring both HUD strips the first time their gears differ).** A caption is text, which is against pillar 2's grammar, and there is no glyph for "each". The strips already show it (the outlined square differs per lane). After v2 the player never has to reason about it beyond "press until both match", which w3-04 teaches. New render work days before freeze is not worth it.
- **Respawn with a key held (tester's #5): REJECT, as ruled 2026-11-02 and 2026-11-20.** It is the fastest retry, and held Shift or Jump never count as new presses. Recordings depend on it (`level-format.md` §4). Respawns already freeze for 400 ms.
- **w2-02 "cleared by E×3 at the spawn and a jump at gear 3": NOT cheese, no change.** That is the intended line: gear 4 makes you red, so the red runway holds you, and the drag lands you in gear 3 on the yellow pad. The sweep shows 0 of 722 wins without a red take-off from the runway (cols 8–12), and a take-off from safe ground falls short (the window starts at x 10.10). The tester did not notice it was standing on the red runway.
- **Timer "runs through falls and idle", 7:55 cards: REJECT.** The clock is per life: a respawn is a fresh `createSim` (`src/core/sim/status.ts` `respawnState`, step 0), and the card shows `wonAtStep`. Idle time on the winning life counts, as ruled 2026-11-03 and 2026-11-04. The long times are the script reading screenshots while the game ran.
- **E presses within about 1.5 s after a death "ignored" (unverified): INTENDED.** Presses while falling are airborne, so they are dropped unless they come within 6 steps of a landing. Presses during the 400 ms death freeze are ignored, and the gear resets to 1 on respawn. Together that is about 1–1.5 s.
- **Level header comments spell out the solutions in prose, and the level files ship in the zip (QA B8-09 side note): ACCEPT, no change.** The repo must be public for the jam, and its `levels/README.md` gives every fair line in full. The comments sit inside the minified bundle, and only someone unpacking it would read them. The recordings, the actual concern of BUG-4, are gone (CLOSED). Stripping the comments would mean a build or parser change for no gain.

- **w3-05 v2 as built (level-designer, batch 9 line 1): APPROVED, no change. The acceptance item "kerbs removed: 0 wins" is replaced by "kerbs and step removed: 0 wins" (holds: 0 of 56,700).** The 56 kerbless wins (19 of 2,367 targeted wins in the real level skip the kerb hold) still re-align with a pin. The step holds the runner at x 36.375 while the twin walks back onto it, which is w3-02's idea (a face in one lane holds that body while the other moves on). Only the wall doing the holding differs. The COMBINE rule (2026-11-17) asks that no win skip an idea, not that a given tile be load-bearing. Every win still uses the air stop, a pin and the clamp. Moving the step drops the kerb-jump window below 18 (17 at x 37, 12 at x 38) and the kerbless wins stay anyway. Kept as built: the 20-step kerb window (≥ 18), the take-off x 39.98–43.77, and the unchanged hint columns (`shiftUp 36` box cols 35–37 sits over the step face at x 36).

### Must or nice-to-have
- **Must for release (batch 9):** w3-05 v2 with its re-record, sweeps, `LEVELS` row and pinned hint test. Then a fresh cold playtest of w3-05 v2, and the owner's hand play of w3-05 and w2-04.
- **Nice-to-have, not scheduled:** the per-runner HUD ring (Could), the pause-panel `STUCK? R RESTARTS` line (Could, unchanged).
- **Not changing:** tuning, sim, contracts, the level count (14), every other level's version.

### Itch page §7 (re-checked against HEAD 65ae833)
- **Pass:** the count line (14 levels; `levelSelect.ts` and `progress.ts` drop world 0; world names GEARS, FLIGHT, TANDEM; w3-05 v2 keeps 14), the first level of each world open (`isPlayable`), the controls table (equals `DEFAULT_BINDINGS`; menu keys equal `menuInput.ts`), the Sticky Keys tip (`tests/e2e/sticky-keys.spec.ts`), settings (title and pause items, three toggles plus BACK; QA settings 1–3 Pass), the restart card (`[R]` from `DEFAULT_BINDINGS`; QA restart-prompt 3–5 Pass), page art (no shot shows a changed area: w3-05 v2 stays right of col 30 and shot 5 shows the opening), the pattern list (equals `palette.json`), the flash cap (`MAX_FLASHES_PER_SECOND` 3) and no shake (no `shake` call in `src/`), and saves (`TITLE_NOT_SAVED` notice).
- **Owner-pending:** leaderboards, the audio line, team names, repo public, embed. No §7 item failed, so it needs no request line.

## 2026-11-23 (later) — batch 9 cold playtest triage (`docs/playtests/2026-11-23-batch9.md`), B9-07

**What the sitting measured:** a jittered script (±100 ms, about 55 fps, the harness crashed twice) that started at w3-01 with worlds 1–2 never played, failed w3-03, skipped w3-04, and unlocked w3-05 by editing `localStorage`. It never got past w3-05's opening (cols < 30, unchanged since v1), so it says **nothing about v2**: not the step, the run-up or the glyphs. I agree with the orchestrator's read: this measures world 3 for a player who skipped the lessons, and earlier sittings that played in order cleared w3-03 in 5 tries and w3-04 in 8. No tuning, sim, contract or level change.

### The v2 cold-play check
- **The owner's hand play (owner list item 4) is now the deciding check for w3-05 v2, and for w2-04. No further scripted sitting is required.** Two scripted sittings have spent their tries on 18–20-step windows under ±100 ms jitter, which is not what a human meets. The owner plays w3-01 → w3-05 in order, unlocked by play. Pass: w3-05 cleared within 10 lives and 15 minutes, and the player backs up to the step without help. A miss comes back to design. **Fallback only if the owner cannot play by Nov 26:** one more playtester sitting that plays w3-01..w3-05 in order with no `localStorage` edits, and stops at 10 tries per level to read only that level's "The idea:" line.

### Per finding
- **w3-05 / w3-03 "three up presses never got past blue before the red runway": REJECT as a design issue; QA reproduces it as a possible input bug.** In the sim, gear 4 from the spawn is red at x 4.73, more than 3 tiles before the red runway at col 8. Both recordings and the ±3 tests do exactly this. A body that stays blue after three presses means the presses were not registered. The likely causes are presses made during the fall or death freeze, which are dropped by rule, or a harness fault. One engineering check settles it (QA line).
- **Widen the shift windows in w3-02 and w3-05 (top 1): REJECT.** w3-02's fair line shifts **standing**, with no time limit (`levels-w3.md`). The tester's 150 ms window is a moving shift it chose for itself. w3-05's opening window is 18 steps, at the world-2 floor.
- **HUD gear versus band, and what white means (top 2): REJECT.** World 1 teaches both: w1-01 white and blue, w1-02 the shift and the bracket, w1-03 "speed takes distance", plus the PT-5 thin-then-bold bracket. The tester skipped worlds 1–2. **Copy change instead (mine):** the itch page now tells players to start with Gears and that Tandem builds on it (`itch-page.md` §3).
- **A "back up" verb on screen (top 3): REJECT.** w1-03's glyph over the back wall teaches it (that check passed in batch 8), and w3-05 v2's `shiftUp` sits over the step. A new glyph id would be new art and a new contract.
- **Feedback for a standing jump against a block, and for being held at a kerb (top 4): REJECT.** A standing jump is a visible straight-up hop: nothing pressed in the air changes speed (w2-01, "air commits you"). The held-at-kerb cue was already rejected on 2026-11-20 (a held body is the intended state, not an error).
- **Death loop of about 3 s, and R in that window losing the next held key (top 5 and "possibly broken"): DEFER to a QA measurement.** By the rules a fall plus the 400 ms freeze is about 1.2 s from w3-05's runner lane. Held keys through a restart act normally (ruled 2026-11-02); only held Shift and Jump are not new presses. QA measures both. If control returns more than 1.5 s after a body leaves its floor, or a held direction is lost after R, it is a [scene] bug and design rules on it.
- **"Restart card appears on death" (w3-01): REJECT, already verified.** QA R-6 passed: the card was never shown in w3-01 when both bodies fell. The tester most likely saw the PT-3 "why you fell" cue.
- **The glyph does not say which key is up: REJECT.** The `shiftUp` glyph leads with ▲ and `shiftDown` with ▼.
- **w3-01 in about 9 lives, cold from world 3: ACCEPT.** It is open from the start and works cold with its glyphs.
- **w3-02 in about 20 lives, w3-03 not solved: ACCEPT for this sitting.** The player skipped the worlds they build on. They get no change unless the owner's hand play disagrees.
- **Unlocking w3-05 by editing the save: noted.** It is outside the brief, and the w3-05 result is void as a v2 measure.

### Itch §7 (B9-07)
- **Count and art re-ticked against 50eb482.** It has 14 levels. w3-05 v2's diff is cols 36–45 only (checked in `levels/w3-05.txt`), so shot 5 (the opening) is still accurate. §3 gains "start with Gears".

## 2026-11-23 (evening) — batch 9b fallback sitting (`docs/playtests/2026-11-23-batch9b.md`), w3-05 v2 check

**What it measured:** a script with 5–36 ms of hold jitter that played w3-01..w3-05 in order, with no save edits, and read the idea line after 10 tries on w3-02, w3-03 and w3-04. It reached w3-05's kerbs after about 7 minutes and found the step by walking left. It then failed 9+ kerb jumps, every one "pinned at the kerb", and stopped at about 11 minutes. **The v2 cold-play check fails on this sitting, but the failure is located:** the step works (it found it and both bodies self-aligned). What fails is the take-off timing, together with a "walk back" step that is not cued.

### The kerb jump
- **"The window is 1–2 frames": REJECT; the tester jumped late.** From the step, the jump wins after 33–52 steps of running (0.55–0.87 s), take-off x 39.98–43.77: **20 steps and 3.8 tiles of take-off** (README, checked against the orchestrator's arithmetic). The tester jumped 0.8–2.0 s into the run. "Pinned at the kerb" is a late jump: an air wall stop on the kerb face, the same cheap failure as w3-02's "jump from the kerb face". No window or geometry change: the late edge is the kerb face, which the pin needs.
- **The `jump` glyph is too late for a reacting player: CHANGE `jump 41 3` to `jump 40 3` in w3-05 (header only, batch 10).** At 12 tiles/s a 150–200 ms reaction is 1.8–2.4 tiles. A player who jumps "when I pass under the glyph" at col 41 (centre 41.5) takes off around 43.3–43.9, at or past the late edge. At col 40 (centre 40.5) a reacting player takes off around 42.3–42.9 and an anticipating one around 40.5, both inside 39.98–43.77. The box (cols 39–41) stays clear of the `shiftUp` box (cols 35–37) and of the kerb. The one-column move is already allowed by `onboarding-hints.md`.
- **A cue for a failed jump (too late or too slow): REJECT now; post-jam Could.** That would be a new render cue for air wall stops at code freeze (Nov 28). The PT-3 airborne cue was cut on 2026-11-16 for the same cost.

### Walking back
- **A left-arrow "back up" glyph: REJECT.** The format has four glyph ids: `move` (`←→`/`AD`), `shiftUp`, `shiftDown` and `jump`. There is no left-only glyph, and a new id means a contract, parser, art and test change at freeze. **Pre-approved fallback, header only:** if the owner, held at the kerbs, does not walk back to the step within about a minute, w3-05 swaps `jump 12 3` for a `move` glyph stacked above `shiftUp` over the step (the w2-04 grammar: "move, then shift up, here"). The opening has been shown twice by then (w3-03, w3-04).
- **Teach the kerb sequence where it starts: CHANGE w3-02 gets two hints (header only, batch 10).** w3-02 teaches "the kerb holds the runner, back up, shift up, run, jump the kerb". It is the source of w3-05's sequence, and it has no hints. Two sittings in a row needed 20+ tries there (the 9b tester read the kerb as "a pure timing check"). Add `shiftUp` over the measured walk-back stop and `jump` over the middle of the measured kerb take-off range, in the runner lane, in w3-05's grammar (w1-03 plus w2-01). The pin itself, the new idea, stays unhinted. Level-designer measures the columns (expected around cols 3 and 6). No `version` bump.

### Other findings
- **Shift up standing at the start of w3-05 (top 3): ACCEPT as is.** w3-03 and w3-04 show `shiftUp 2 3` at the spawn, and w3-05 has no fourth slot. The tester did carry the move over.
- **Explain the pin with a banner in w3-02 (top 4): REJECT.** It would be text, and the game has no banner system. The new w3-02 hints show what to do after the pin.
- **25 s retry loop and a checkpoint after the twin parks (top 5): REJECT**, as on 2026-11-20 and 2026-11-23. R is instant. The QA line of B9-07 measures death-to-control.
- **Respawn at x 160–230 instead of the start, and a pink frozen frame: most likely intended.** A held Right walks the bodies on from the respawn step, and the pink frame is the death freeze. QA adds "x on the first respawn step equals the spawn" to its B9-07 line.
- **w3-02: the runner's meter keeps gear 1 after the twin parks: INTENDED.** Shifts apply per body, and a home body is frozen (`tandem.md`).
- **w3-01 in 3 tries, w3-04 in 13 runs and then first try after the idea line: ACCEPT.** w3-03 took 28 runs. The driver found only a 1.1–1.2 s band inside an 18-step (300 ms) window, which says more about the driver than the level, and the batch 8 tester did it in 5.

### The owner's hand play (deciding check, on the batch 10 build)
Play w3-01 → w3-05 in order, unlocked by play. Note:
1. Tries on w3-02 with the new hints (≤ 10 expected).
2. In w3-05: whether you walk back to the step unprompted after both are held at the kerbs (≤ 1 minute, else the stacked `move` fallback above applies).
3. Each failed kerb jump: was it a pin at the kerb (late) or a fall short of the pads (early)? Did you take off under the `jump` glyph or at the kerb?
4. Cleared within 10 lives and 15 minutes.
5. w2-04: more than 5 failed jumps or not.

A miss on 4 with mostly late pins after the batch 10 glyph move comes back to design.

### Batch 10 w3-02 placement ruling (level-designer's measurements)
- **w3-02 gets only `hint: jump 5 3`; no `shiftUp`.** The take-off is x 4.22–7.03. A reacting player under col 6 is pinned from every stop, and under col 5 wins from every stop, so `jump 5 3` stays. That forces `shiftUp` to col 2, over the spawn. There it reads "shift up now" (w3-03 and w3-04 use exactly that spot to mean that), and shifting at the spawn is w3-02's first cheap failure. A hint that sends players into a failure loses their trust. A stacked pair would say "here, in this order", which is false for a back-up and a later take-off, and the boxes would have no room for the 8 px gap. The jump glyph alone does the work: it sits about 2.6 tiles **behind** the runner held at the kerb (x 7.625), so "jump from back there" implies the walk back. The shift to green follows from the green bridge, as w1-02 and w3-01 teach. w3-05 keeps `jump 40 3`.

## 2026-11-23 (night) — Expansion: GDD v1.12, level plan v4.0

**Input:** the owner's request (verbatim): "Add more levels. Make some longer levels too, maybe add stuff like projectiles which you need to dodge, or moving objects etc? Take inspiration from major big platformer games." That is the owner's scope sign-off beyond the v1.11 Must list. Tech-lead's options note `docs/tech/expansion-approach.md` arrived mid-sitting; every ruling below reconciles with it. Nothing here changes a shipped level, recording, tuning value or golden hash. `rc-batch10` stays the fallback build.

### Rulings
1. **Mechanics: movers (Must), bolts (Must), the sweep (Should). Nothing else.** Each makes the gear choice matter through one sentence: "colored things only exist for their color". Generic genre vocabulary only (lifts, shuttles, launchers, a chasing front); no named game's layouts, characters or names.
2. **Checkpoints: NO for the jam; `features/checkpoints.md` is kept as Could.** I drafted them as Must because the owner's request changes the calculus; tech-lead sizes them M-L and the only item that changes `SimState`'s shape (every fixture and golden hash) five days before freeze. Long levels are built not to need them instead: one run, clean run 40–80 s and ≤ 5,400 steps (tech-lead's robustness cap), hardest room first, last third easy, no forced waits over 3 s (`level-plan.md` "Long levels"). If two cold plays of a long level say the retry is too long, design rules again (split the level, or checkpoints post-jam). Reason: same player value at a fraction of the risk.
3. **Movers are top-only (design's ruling; tech-lead proposed all faces solid with push and crush).** Top-only means no push, no crush, no side faces and no no-embed for slabs: smaller [sim] work, no new death and no "slab slides into a body" color case. All-faces slabs and crushers are Could. Reason: keep Must small; crushing is a reflex hazard pillar 1 does not need.
4. **Accepted from tech-lead as written:** positions as a pure function of the run step (respawn rewinds slabs and lanes, freezes freeze them); whole-tile path loops at 1/32-tile speeds (levels use slab speeds 1–2 and shot speeds 2–4 only, a `tests/levels` rule); `mover:` / `emitter:` header lines; carry in phase 6b after jump (a jump cancels that step's carry); a body on a tile and a slab is still carried; no platform speed kept on a jump; riding never changes the band; shots ignore tiles; **lanes empty at t 0** (I had a pre-filled stream; an empty start is as fair and simpler); hit test with the band at the start of the step (consistent with tile gating; I had end of step).
5. **Bolt polarity: a colored bolt hits only its own band** (tech-lead's default, confirmed). Plus **white shots** (hit only band 0), which tech-lead's contract lacks: asked for as one extra band value. Reason: white bolts make "stop on safe tiles" a decision (w5-02), the cheapest strong twist in the plan.
6. **Sweep is stateless now** (no checkpoints): front = x0 + speed/32 × max(0, t − delay). Not in tech-lead's note: sizing asked for; Should only.
7. **Content: 9 Must levels (w2-05, w4-01, w4-02, w4-03, w4-05, w5-01, w5-02, w5-03, w5-05) and 2 Should (w4-04, w5-04).** World 4 Motion and world 5 Signals need only world 1–2 skills, never Tandem: playtests keep finding world 3 hard for cold players, and the new worlds give them somewhere to go. Three long levels (w2-05, w4-05, w5-05). w2-05 needs no new engineering and can start now.
8. **Gates world: Should → Could (post-jam).** Its slot went to Motion; a sixth world would need `MAX_WORLD` 6 and a sixth level-select row.
9. **Camera: no change.** Long levels stay ≤ 15 rows and scroll horizontally as today. Look-ahead is Could; the sweep marker is Should with the sweep.
10. **Pillar wording (GDD §2):** pillar 1 adds "where, when and how fast" and "everything that moves runs on a fixed clock you can read"; pillar 2 adds the one-rule sentence. Pillars 3 and 4 unchanged.
11. **Tuning:** `projectileSizeTiles` 0.5 and `emitterTellMs` 300 go into `tuning.json` in the same batch as tech-lead's schema change, never before. No mover or sweep key (speeds are a format constant).
12. **Itch page:** not rewritten; a note lists what to re-count when the expansion lands (`itch-page.md` top).
