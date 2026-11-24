# Cold-play script: the expansion (B12-C2)

_Owner: design-lead. Written 2026-11-24 (B12-A3) for the playtester's B12-C2 sitting on the packaged 23-level build. Sources: the watch lists in `levels-w4.md` and `levels-w5.md` ("Cold-play checks", item 5), the w2-05 row of `level-plan.md` ("Cold play watch"), and the triggers recorded in `decisions.md` 2026-11-24. Output: `docs/playtests/2026-11-2x-batch12.md`. Design triages it in B12-C3._

## Setup

- **Build:** the packaged zip from B12-C1 (`npm run package`), unzipped and served, not the dev server. Note the zip name and sha256 at the top of the report.
- **Fresh save:** a new browser profile or cleared site storage. **No `localStorage` edits** at any point: every level is unlocked by play.
- **Keyboard only.** Use whichever keys feel natural, and say which (Shift keys, Q/E or Z/X).
- **Sound on.** Say whether you could hear the music change with pace, the bolt shot cue, and whether a hit death sounded different from a fall. If you cannot listen, put all sound under "Not verified".
- **No reading:** no README, level files, specs or recordings. The only exception is the stop rule below.
- Start from the title screen and use the level select. Breaks between parts are fine; say where you took them.

## Order

| Part | Levels | How | Time box |
|---|---|---|---|
| A. Learn (brief) | w1-01 → w1-05, then w2-01 → w2-04 | Play normally to learn the rules. Record only attempts and minutes per level and any moment of confusion. These are not under test. | about 20 min |
| B. World 4 | w4-01 Lift → w4-02 Ferry → w4-03 Moving Bridge | Full counts and questions. w4-04 is absent (a gap in the row); go straight on. | about 15 min |
| C. World 5 | w5-01 Spark → w5-02 Keep Moving → w5-03 Hurdles | Full counts and questions. | about 15 min |
| D. Long levels | w2-05 Long Haul → w4-05 Commute → w5-05 Full Spectrum | Full counts, per room. Take a short break before w5-05. | about 30 min |

World 3 (Tandem) is **not** part of this sitting: it has had four cold sittings already, and worlds 4–5 are meant to need only worlds 1–2. Record this in the report ("worlds cleared before w5-05: 1, 2, 4, 5 short levels").

Parts B and C unlock w4-05 and w5-05, and part A unlocks w2-05, so play every part in order. If time runs short, go faster in part A (it is not under test); never skip a level in B or C. A level you stop on (stop rules) leaves the levels after it locked: record them as "not reached".

## What to count, every level

- **Attempts:** deaths plus R presses, counted separately.
- **Minutes** from first entering the level to the win (or to the stop).
- **First death:** where and what, in your own words ("fell through the green thing", "hit by a red bolt").
- **"Got it" moment:** after which attempt you knew what the level wanted, and how you would say it in one sentence.
- **Fun** 1–5, and one line on why.
- Any death you would call **unfair**, with where and why.
- **Quit point:** if you stopped, where and why.

**Long levels, also:** deaths **per room** (number rooms 1, 2, 3 ... in the order you meet them; a room is the stretch between safe flat recovery areas), deaths per section (between posts), each post seen before you reached it (yes/no), and how long you waited at any moving thing.

## Questions per level (answer every one)

### Part B: World 4

**w4-01 Lift**
1. Did you step onto the slab without help? How long did it take?
2. Did you try to climb or jump the tall wall first?
3. Did you notice that you stayed white while riding?
4. Did you ever stand on the roof over the bridge? (It should be impossible; say so if you did.)

**w4-02 Ferry**
1. How many falls before you waited for the shuttle to dock?
2. Did you shift to gear 2 (green) before or after your first fall on the green bridge?
3. Did the roof read as "no jumping here", or did you feel boxed in?

**w4-03 Moving Bridge**
1. Did you try to stand on the green slab first? (Expected.)
2. Attempts to the first crossing.
3. If you stepped on while it was still rising: did that feel like luck or like a choice?

### Part C: World 5

**w5-01 Spark**
1. Within 10 s, did you notice a bolt pass through you?
2. Your first death at the second (dense) lane: did you understand why (you were red)?
3. Did the shift-up glyph after the lane say "turn red here" to you?

**w5-02 Keep Moving**
1. Did you try to stop on the first pad? How many deaths before you braked while moving?
2. Did you use room 2's dry floor to stop and think?

**w5-03 Hurdles**
1. Deaths per section: green hurdles, yellow floor, last stretch.
2. Did you ever jump on the yellow floor?
3. **Last stretch:** did you wait for a bolt to sink before going, or run straight in? Count deaths there exactly.
4. Any death you would call unfair?

### Part D: Long levels

**w2-05 Long Haul**
1. Deaths per room. Deaths at the Commit room (the green runway and gap) on their own.
2. When you died after the first post: how did replaying from it (about 27 s) feel? Too long, fine, or short?
3. Did you see each post coming before you reached it?
4. The last room (a long blue bridge, about 13 s): victory lap or chore?

**w4-05 Commute**
1. Deaths per room and minutes.
2. Did you see each post coming before you reached it?
3. The open shaft (the lift going down): any deaths there? When the lift was away, did that read as "wait"?
4. Your longest wait at a shuttle: how long, and did it feel like dead time?
5. After a death at a post: did the next room feel the same as the first time you saw it?
6. Did a restart ever feel too long?

**w5-05 Full Spectrum**
1. Which worlds had you cleared before it? (Expected: 1, 2, 4 and 5's short levels; world 3 not played.)
2. Deaths per room, grouped by section, and total minutes.
3. **Room 2, the jump through the rising yellow bolts:** deaths there; did you take off yellow?
4. **Room 4, the lift under the white bolt:** deaths standing on the lift vs. stopped at the far wall; when late, did you wait on the floor or jump in?
5. **Room 7, the hurdles after post 2:** did you go when a bolt sank at the ledge?
6. **Room 8, the yellow floor under the grey stream:** any jump there?
7. **Room 9, the brake onto the blue bridge:** any stops on the pad?
8. Any death in the last section (rooms 10–12)? Report each one on its own.
9. Did you see each post coming? Did any death make you want to quit? Say where.

### Added after the sitting began: w4-04 and w5-04 (for triage, not new instructions)

_2026-11-24, design-lead. The packaged build has 25 levels, so w4-04 Outrun and w5-04 Chase sit in the rows that part B calls gaps. The playtester has already read this script and is not asked to change the sitting. Design uses these points when triaging whatever the report says about them (including "not played")._

- **w4-04 Outrun:** attempts and minutes; deaths by the front and where (before the lift, waiting for a second lift, on the upper blue bridge); did the left-edge marker read as "something is coming"; any front death called unfair. Trigger: 2+ deaths waiting for a second lift, or one called unfair → measured lift/delay change.
- **w5-04 Chase:** attempts and minutes; hit vs. front deaths; gauntlet (cols 38–44) deaths and colour; the player's own words for what the gauntlet wanted. Trigger: 3+ gauntlet deaths without naming green → `shiftDown` hint.
- **Both:** did the front make a sound (none is expected; a hit-death sound on catch is)?

## Pass marks (findings for design-lead, not engineering pass/fail)

| Level | Pass |
|---|---|
| w4-01, w5-01 (teach) | Cleared within 3 attempts and 3 minutes; the rule stated correctly in your own words. |
| w4-02, w4-03, w5-02 | Cleared within 6 attempts and 5 minutes. |
| w5-03 | Cleared within 10 attempts; **fewer than 3 deaths in the last stretch** and no death called unfair. |
| w2-05, w4-05 | Cleared within 10 minutes; **no room with 5 or more deaths**; each post seen before it was reached; no quit. |
| w5-05 | Cleared within 15 minutes; **no room with 5 or more deaths**; no room called unfair; no quit; no death in the last section. |
| Part A | Not marked. Report only levels that took more than 10 attempts. |

## Triggers already set by design (report the facts; design rules in B12-C3)

- **w5-03 last stretch:** 3+ deaths, or one death called unfair → design asks level-designer for a measured period or range change.
- **w5-05:** 5+ deaths in one room, a room called unfair, or a quit → a measured change to that room only. Any death in section 4 is a finding on its own.
- **w2-05 last room** called a chore → design shortens the bridge.
- **Any long level:** a restart (from a post or the start) called too long → design rules on post spacing.
- **Any post not seen coming** → art follow-up on the idle post.

## Stop rules

- **Short level, 10 attempts** without a clear: you may read that level's one-line idea and nothing else. That is the "The idea:" line for the level in `levels/README.md`, or if it has none, the level's **Teaches:** line in `docs/design/levels-w4.md` / `levels-w5.md`. Say in the report that you read it, and after which attempt.
- **Short level, 10 more attempts** after reading (20 in all): stop. Mark it "not cleared". Go to the next part (each world's first level is open). Levels locked behind it are "not reached".
- **Long level:** the count is **deaths in one room**, not attempts. At 10 deaths in one room, you may read that level's **Combines:** line and the one sentence for that room in the "APPROVED v1 as built" paragraph (`level-plan.md` for w2-05, `levels-w4.md` for w4-05, `levels-w5.md` for w5-05). Say so. At 10 more deaths in the same room, or 20 minutes in the level, stop. Record the furthest lit post and the room you stopped in.
- **Never** use R to skip a room, read the recordings, or edit the save.
- **Session cap:** 100 minutes of play. Anything not reached goes under "Not reached".

## Report shape

1. Build (zip name, sha256), browser, keys used, sound on or off.
2. A table: level, attempts (deaths / R), minutes, cleared (yes / no / not reached), fun, idea line read (yes / no).
3. The answers per level, in the order above, with numbers.
4. Long levels: deaths per room table, posts seen (yes / no), longest wait.
5. Pass marks met or missed, and which triggers fired.
6. Top five findings, worst first.
7. **Not verified:** sound (if not listened to), and anything not reached.
