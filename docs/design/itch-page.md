# itch.io page copy

_Owner: design-lead. Written 2026-11-18 against the build as it stands (batch 6, 14 levels). Every claim was checked in the repo on that date; the checklist at the bottom lists what to re-check at submit. **Re-checked 2026-11-20 (B7-17)** against the batch 7 build: the settings screen, the wired sound effects, the restart card and the page art (`docs/art/itch/`) are now in the copy, §5 and §7. Spelling: **British ("colour", "coloured", "grey", "centre", "licence")**, owner's instruction 2026-11-25 (`decisions.md` 2026-11-25 "British spelling"). The only American spellings left are itch.io's own labels, quoted as itch shows them (the **Color-blind friendly** checkbox and the `colorful` tag), and file names._

> NOTE (2026-11-24, B12-A3): **re-counted for the expansion build** (HEAD 31ff26a): 23 levels in 5 worlds, all 23 approved (`decisions.md` 2026-11-24 late). Changed: the count line and world bullets, the "how it plays" paragraph (things that move), the long-level and checkpoint lines, Stuck?, accessibility (slabs, bolts, posts), the average session (§4), the jam form text (§6), the shot list and Delivered table (§5: three new shots wanted) and §7. **(Superseded 2026-11-24, sweep review: w4-04 and w5-04 are approved and counted; the page now says 25 levels, see the note in §3.)** w4-04 Outrun and w5-04 Chase were then in progress and NOT counted: the only mention is the marked "IF SHIPPED" block in §3, which the producer deletes unless both ship. If the build falls back to `rc-batch10` (14 levels), restore this file from git at commit 188c258 and re-apply British spelling. Trailer brief: `docs/design/trailer.md`.

> NOTE (2026-11-25): British spelling pass. Every line of copy, the jam form text and the captions now say "colour". No claim changed.

> NOTE (2026-11-26): **published and submitted.** Page https://patrickcarey.itch.io/redshift, jam entry https://itch.io/jam/game-off-2026/rate/5450812. The LEADERBOARDS block (§3) is **not** on the live page: the game does not call the leaderboard yet. Put it back only after the results-screen board works on the itch build. The jam form used the §2 short description as shortened for itch's 120-character limit and the §6 theme text. AI usage on the jam form, as the owner chose: Code, Music/sound, Writing, Testing; extent "Some".

Paste each section into the itch.io field named in its heading. Lines in `> NOTE` blocks are instructions, not copy: do not paste them.

---

## 1. Title and tagline

**Title:** Redshift

**Tagline (pick):** Your speed is your colour. Only your colour is solid.

Alternates:
- Shift gears. Change colour. Watch what holds you up.
- A puzzle-platformer where how fast you run decides what is solid.

---

## 2. Short description (itch "Short description or tagline" field, under 160 characters)

A puzzle-platformer where your speed sets your colour, and only platforms of your colour hold you. Shift gears to cross each room.

---

## 3. Page body (itch "Description" field)

> NOTE: insert `docs/art/itch/redshift-runway.gif` (480×270, 7.1 s loop, 0.25 MB) as the first thing in the description, above the first line. It shows the whole idea with no text. Leave it at its own size if the editor would blur it when scaled.

**Your pace is your colour.** Stand still and you are white. Walk and you are blue. Sprint and you are red. Coloured platforms and walls are only solid while your colour matches them, so every room is a question of where to speed up, where to slow down, and where to jump.

Speed takes distance to build and distance to lose, and nothing you press in the air changes your speed. Plan the run, then make it.

Later, the rule moves. Lifts and shuttles carry you, but a coloured slab only holds you while you are its colour. Emitters fire bolts on a fixed beat, and a coloured bolt only hits a runner of its colour. You dodge by being a different colour when it arrives. Everything that moves runs on a clock you can learn, and it plays out the same way on every try.

**Game Off theme, SHIFT:** you change gear with the Shift keys, and in world 3 you shift two runners out of step with each other.

> NOTE: paste the next line only after the owner has listened to the packaged build (USER check, 2026-11-20): the music changes with your pace, the clunk is heard on w2-02's long jump and sounds different from a shift down, and SOUND OFF silences everything. Otherwise delete it. No other line on the page claims audio.

Listen for the music: it follows your pace. A heavy clunk means a long flight just cost you a gear.

### In this build

> NOTE: the next line is the only place the level and world count appears. Change it here if worlds are added or cut.

**25 levels in 5 worlds: Gears, Flight, Tandem, Motion and Signals.**

- **Gears (5 levels)** teaches the colour rule with no text: shifting, building speed, braking, and walls that stop only their own colour.
- **Flight (5)** is about committing at takeoff. Long flights cost you speed, one colour every 6 tiles. It ends with **Long Haul**, one long run through everything so far.
- **Tandem (5)** gives you a second runner on a second floor. Both obey the same keys. Put them out of step to bring both home. This is the hardest world.
- **Motion (5)** has lifts, shuttles and moving bridges. A grey slab carries anyone. A coloured one only holds you while you match it, so you cross it at its pace. It ends with **Commute**, a long level.
- **Signals (5)** has bolts. A coloured bolt hits only its own colour, a white bolt hits only a runner standing still, and a grey bolt hits everyone. It ends with **Full Spectrum**, the long finale.

The three long levels take about a minute once you know the way and several minutes the first time. Each has checkpoint posts: after you pass one, a death sends you back to it, not to the start. The rest are short rooms of 10 to 40 seconds.

> NOTE (2026-11-24, sweep review): w4-04 Outrun and w5-04 Chase are **APPROVED as built** (2e2e9cc, `decisions.md` "Sweep levels"), so the count line says 25 and Motion and Signals say (5); the line below is now copy. If either is pulled from the final build: one pulled → count 24, that world back to (4), rewrite the line for the other level; both pulled → count 23, both worlds (4), delete the marked block.

<!-- SWEEP: w4-04 Outrun and w5-04 Chase -->
**Outrun** and **Chase** add a front that sweeps in from the left. Stay ahead of it, and save your walking for where the floor makes you walk.
<!-- /SWEEP -->

Start with Gears, then Flight: every later world builds on them. Motion and Signals need nothing from Tandem, so if Tandem stalls you, go on to them. The first level of every world is open from the start.

### Controls (keyboard only)

| Action | Keys |
|---|---|
| Move (hold) | ← → or A D |
| Shift up | Right Shift, E or X |
| Shift down | Left Shift, Q or Z |
| Jump | Space, W or ↑ |
| Restart level | R |
| Pause | Esc or P |
| Menus | Arrows or WASD to move, Enter or Space to choose, Esc to go back |

All the keys work at once. Use whichever pair suits your hand: Q/E with WASD, Z/X with the arrows.

**Windows players:** tapping Shift five times opens Sticky Keys. Q/E and Z/X do the same job as the Shift keys and never trigger it. The game shows this tip once.

### Accessibility

- Colour is never the only signal. Each colour has its own pattern on you and on the tiles: white plain, blue stripes, green dots, yellow chevrons, red checker. Tiles you cannot stand on right now are drawn hollow with a dashed outline.
- In Tandem, the second runner has a different shape, not just a different colour.
- Moving slabs and bolts carry their colour's pattern too. Grey bolts, which hit everyone, have their own shape. Every slab's track is always drawn, and an emitter shows a warning frame before it fires.
- Checkpoint posts change shape when you pass them, not just colour.
- No screen shake. Flashes are capped at 3 per second.
- **Settings** (from the title or the pause menu):
  - **Reduced motion** turns off flashes, screen wipes, parallax and pulsing. It starts on if your system is set to reduce motion.
  - **Reduced effects** removes decoration such as stars, speed lines and afterimages.
  - **Sound** turns all audio on or off.
  - Settings are saved in your browser.
- Keyboard only. No mouse needed. Jumps have generous coyote time and buffering, and there is no time limit.

### Stuck?

Press **R** to restart the room at any time. In a long level, R takes you back to the very start; a death takes you back only to the last post you passed. If a runner gets trapped, the game shows **[R] RESTART**. **Esc** or **P** pauses; the pause menu also shows the controls. Most rooms are solved by backing up, by slowing down earlier than you think, or by waiting on safe ground for the next cycle.

Progress is saved in your browser. Checkpoints are not: leaving a long level clears them.

> NOTE: optional block. Include only if leaderboards are live at submit (Supabase project deployed, posting enabled, tested on the itch build). Otherwise delete it.

<!-- LEADERBOARDS: include only if live at submit -->
### Leaderboards

Each level has an online leaderboard, ranked by time. Your run is only posted after you choose a name. If the leaderboard cannot be reached, the game plays exactly the same.
<!-- /LEADERBOARDS -->

### Credits and source

Made for GitHub Game Off 2026.

By Patrick Carey.

Code is MIT licensed. Third-party libraries and assets are listed in `CREDITS.md`, each with its licence.

Source: https://github.com/PatrickDCarey/Shift

> NOTE: the repo must be public before this link goes live (CLAUDE.md, jam rules).

---

## 4. itch.io metadata

| Field | Recommendation | Why |
|---|---|---|
| Kind of project | HTML | Browser build from `npm run package`. |
| Classification | Games | |
| Release status | Released (or Prototype) | Jam build. "Released" if the team is happy calling it finished. |
| Genre | Puzzle | The pillar is "pace is the puzzle"; platforming is the means. |
| Tags (10) | `puzzle-platformer`, `platformer`, `puzzle`, `pixel-art`, `2d`, `colorful`, `singleplayer`, `short`, `game-off`, `phaser` | Plain discovery tags. `colorful` is itch's own tag, spelt as itch spells it so voters find it. `game-off` because voters browse it. |
| Made with | Phaser (and TypeScript, Vite if itch offers them) | `package.json`, `CREDITS.md`. |
| Average session | About an hour | Estimate from the design targets (2026-11-24): 20 to 35 minutes for worlds 1–3 (14 levels, `levels/README.md`), 5 to 15 for the six short levels of worlds 4–5, and 12 to 24 for the three long levels (4 to 8 minutes each for a first clear): about 40 to 75 minutes in all. A voter can stop after any level. Re-check against the B12-C2 cold play's minutes. |
| Inputs | Keyboard | Only input the game reads. Do **not** tick Mouse, Gamepad or Touchscreen. |
| Accessibility | Tick itch's **Color-blind friendly** (a pattern per colour, twin silhouette) and **Interactive tutorial** (world 1 teaches by play and key glyphs, no text). | Both are true as built. Do **not** tick Configurable controls (no remap screen; the alternate keys are fixed), High-contrast (no separate mode), Textless (menus are text), Subtitles, One button, Blind friendly. |
| Languages | English | |
| Mobile friendly | No | Needs a keyboard. |

**Embed settings**

| Setting | Value | Why |
|---|---|---|
| Viewport | 960 × 540 | The game's 480×270 canvas at exactly 2×. Any other size letterboxes or blurs. |
| Fullscreen button | **Yes** | The game re-fits on resize at the largest whole-number zoom (4× on a 1920×1080 screen), so fullscreen stays sharp and the pixel art reads much better. |
| Launch | **Click to launch** (not "automatically start") | The click gives the game keyboard focus and unlocks audio in the iframe; without it the first key presses can scroll the itch page instead. |
| Scrollbars | Off | Nothing outside 960×540. |
| SharedArrayBuffer | Off | Not used. |

---

## 5. Shot list (request to art-director)

All shots from a real build in the 960×540 frame (2×), HUD visible, no debug overlays. Names are level id and moment.

**Cover image (630×500)**
- Idea: one runner mid-sprint, red with its checker pattern, crossing a red bridge, with a hollow dashed blue bridge and a solid red wall around it, and the world tint at its red end. Title "REDSHIFT" in the game's pixel font. It should say "colour and speed" before anyone reads a word.

**Screenshots (3 to 5, in this order)**
1. **w1-02 Shift, crossing the green bridge.** Player green with dots, the blue bridge ahead drawn hollow, HUD showing gear 2. Sells the core rule in one picture: same room, the floor you match is solid.
2. **w1-05 Red Wall, passing through the wall.** Player yellow (chevrons) inside or just past the red wall column, red bridge ahead. Sells "a wall stops only its own colour".
3. **w2-02 Coast, the drag drop mid-flight.** The ring burst on the runner at the 6-tile point, red turning yellow, the yellow pad below. Sells "commit at takeoff" and shows the effects.
4. **w3-03 Gear Split, after the air stop.** Runner standing blue under the hanging block, twin flying yellow below, both HUD strips showing different colours. Sells Tandem: one set of keys, two colours.
5. **w3-05 Redshift, mid-solve.** Both bodies in different colours on a busy screen. Shows there is depth past the tutorial.

**GIF (one, 6 to 8 seconds, loops)**
- **w1-03 Runway, fail then solve.** Start running from the spawn, reach the red bridge yellow, fall; restart, walk back to the wall, shift up, sprint: the player goes white, blue, green, yellow, red and crosses. Sells the whole idea (pace is colour, speed takes distance) with no text. Keep it under about 3 MB.

Nice to have: one screenshot in greyscale (any of the above) to show the patterns carry the rule without colour.

**Added for the expansion (2026-11-24, B12-A3; shoot from the final build, task B12-E1).** Final order: 1, 2, 3, **6, 7**, 4, **8**, 5, then the greyscale shot last. If itch's limit or the thumbnail argues for fewer, drop 5 first, then 4.
6. **w4-03 Moving Bridge, mid-crossing.** Runner green (dots) on the green slab while it rests level between the two safe ledges, the slab's dotted track visible below, the 2-row roof above. Sells "a coloured platform holds only its colour, and it moves".
7. **w5-01 Spark, a red bolt passing through a blue runner.** The runner blue (stripes) inside the col-4 red rain lane with a red diamond overlapping the body, the emitter at the ceiling. Sells "a bolt only hits its own colour" in one frame. If the shimmer reads badly in a still, use w5-03 instead: a green runner mid-jump over a grey foot-height bolt. (2026-11-25: shoot shot 7 after the bolt-visibility art lands, `decisions.md` 2026-11-25 world-5 triage.)
8. **w5-05 Full Spectrum (or w4-05 Commute), a lit checkpoint post** with the runner just past it and the next room's slab or lane ahead. Sells "long levels, and you won't lose your progress". Take it after the idle-post art fix is in.

**Re-shoot list for the expansion:**
- **Cover:** finalised 2026-11-25 (cover A, the owner's choice, `docs/art/itch/`).
- **Screenshots 1–5 and the greyscale shot:** keep; nothing they show has changed (re-check in §7).
- **New screenshots 6–8:** must be shot (above).
- **GIF:** keep `redshift-runway.gif` at the top of the description (it is the rule). Optional: a second GIF lower in the description, 6–8 s, w5-01: the red bolt passing through the walking blue runner, then the runner shifting up at the dense lane so it turns red only after it, and crossing the red bridge. Under 3 MB.

**Captions** (if itch or the trailer needs any text on an image): "Your speed is your colour." / "Only your colour is solid." Nothing else; the pictures carry the rest.

### Delivered (B7-16, 2026-11-20; files in `docs/art/itch/`, how they were made in its `README.md`)

Design accepts the set as delivered. Upload in this order:

| itch field | File | Notes |
|---|---|---|
| Cover image | `cover-630x500.png` | Cover A, finalised 2026-11-25 (`docs/art/itch/README.md`). The earlier w1-05 cover said "colour and speed" just as well. |
| Screenshot 1 | `shot-1-w1-02-shift.png` | As listed. |
| Screenshot 2 | `shot-2-w1-05-red-wall.png` | As listed. |
| Screenshot 3 | `shot-3-w2-02-coast.png` | As listed. |
| Screenshot 4 | `shot-4-w3-03-gear-split.png` | As listed. |
| Screenshot 5 | `shot-5-w3-05-redshift.png` | Runner white, twin yellow in flight. |
| Screenshot 6 (optional) | `shot-greyscale-w1-05.png` | The greyscale nice-to-have. Upload it last so it never becomes the thumbnail. |
| Description (top) | `redshift-runway.gif` | See the note at the top of §3. |
| Screenshot (new, after 3) | *to shoot (B12-E1)*: w4-03 slab | Shot 6 above. Not delivered yet: do not upload a placeholder. |
| Screenshot (new, after 6) | *to shoot (B12-E1)*: w5-01 bolt lane | Shot 7 above. |
| Screenshot (new, after 4) | *to shoot (B12-E1)*: lit post in w5-05 or w4-05 | Shot 8 above. |

**Stale until the new shots land:** the delivered set shows only worlds 1–3, so the page's pictures undersell worlds 4–5 but promise nothing the build lacks. Uploading the delivered set alone is honest; the three new shots are wanted, not required.

The screenshots come from the batch 7 package, before the 2026-11-20 hint glyphs and the 2× restart card. Shot 4 is unaffected: w3-03's new spawn glyph is off its left edge. Shot 5 is near w3-05's block and was taken before that level's `jump 12 3` glyph existed, so a reshoot would add one key cap. **No reshoot needed**: a missing hint misrepresents nothing about the game. Reshoot only if a later art or level change alters what a shot shows (`docs/art/itch/README.md` "Remaking"). The 2026-11-25 bolt-visibility change touches no delivered shot (none shows a bolt).

---

## 6. Jam submission form (free text on the theme)

In Redshift, your pace is your colour, and coloured platforms are only solid while your colour matches them. You shift gears with the Shift keys, and each gear is a colour: white, blue, green, yellow, red. Speed takes distance to build and to lose, so every room asks where to shift up, where to shift down, and when to jump. In the third world, one set of keys drives two runners, and the puzzle is shifting them out of step and back in step. In the last two worlds the rule reaches things that move: a coloured moving platform holds you only in its colour, and a coloured bolt hits you only in its colour, so you dodge by shifting gear, not only by jumping.

---

## 7. Facts to re-check at submit

> NOTE: re-checked 2026-11-23 (B8-12) against HEAD 65ae833. Ticked items pass; the unticked ones need the owner. The art and count lines were re-ticked on 2026-11-23 (B9-07) against 50eb482, after w3-05 v2 landed.

> NOTE (2026-11-24, B12-A3, against 31ff26a): the count, world, long-level and accessibility items below were rewritten for the expansion and are **unticked until re-checked against the final package** (B12-E3). The other ticks stand from 2026-11-23; re-tick them on the same package.

- [ ] **Level and world count:** 25 levels in 5 worlds (GEARS 5, FLIGHT 5, TANDEM 5, MOTION 5, SIGNALS 5) on the level select's `CLEARED n/25`, with no gaps? (2026-11-24: w4-04 and w5-04 approved as built; the SWEEP block is copy. If either is pulled, follow the note above that block.) If anything is cut, change the count line, that world's bullet and the average session. *(Design's count 2026-11-24 from `decisions.md` "all Must levels (23) are now approved" and QA B11-19 item 5: five rows, `CLEARED n/23`. Earlier: 14 in worlds 1–3, world 0 filtered out in `levelSelect.ts` and `progress.ts`.)*
- [ ] **Spelling:** every pasted line says "colour", "coloured", "grey"; the only American spellings are itch's own **Color-blind friendly** label and `colorful` tag. The in-game level name of w2-04 reads **Two Colours** (level-designer's change).
- [ ] **Long levels:** exactly Long Haul (w2-05), Commute (w4-05) and Full Spectrum (w5-05) have checkpoint posts; a death after a lit post respawns there; R restarts from the start; a lit post is forgotten on leaving the level (`checkpoints.md`, QA B11-19 item 4). "About a minute once you know the way": the recordings are 63.4 s, 69.4 s (w4-05 v3) and 62.3 s.
- [ ] **Things that move:** grey slabs carry anyone, coloured slabs hold only their colour, bolts follow the white/grey/coloured rule (`moving-objects.md`, `projectiles.md`); the copy promises nothing else (no crushers, no aiming bolts; the sweep only as the SWEEP block's one line).
- [ ] **Accessibility for the new objects:** slabs and bolts carry their band's pattern, grey bolts have a different silhouette, the track is always drawn, the emitter tell is a still frame under reduced motion, and the post changes shape when lit (art sheets, QA B11-19 item 6). If any of these is not as built, cut that clause, not the bullet.
- [ ] **Difficulty line:** "Tandem is the hardest world" and "Motion and Signals need only Gears and Flight" still true after the B12-C2 cold play (`decisions.md` triage).
- [x] **First level of every world open from the start** (`src/save/progress.ts` unlock rule). *(2026-11-23: `isPlayable`. 2026-11-24: QA B11-19 item 5, first level of each of the five rows open on a fresh save.)*
- [x] **Controls table** matches the controls screen (`src/ui/bindings.ts` `DEFAULT_BINDINGS`, `src/ui/controlsModel.ts`). *(2026-11-23: every row matches; the menu row matches `menuInput.ts`.)*
- [x] **Sticky Keys tip** still shows once on Windows. *(2026-11-23: `tests/e2e/sticky-keys.spec.ts`; also seen once by the batch 8 playtester.)*
- [ ] **Leaderboards:** live and tested on the itch build? If not, delete the optional block. If yes, check the wording against what the results screen actually shows (rank and name prompt).
- [x] **Settings (copy updated 2026-11-20):** SETTINGS is on the title and in the pause menu, with SOUND, REDUCED MOTION and REDUCED EFFECTS (`src/ui/titleModel.ts`, `src/ui/pauseModel.ts`, `features/settings.md`). The copy names exactly those three; there are no volume sliders, so don't mention volume. Reduced motion starts on with the OS setting, and all three survive a reload (`settings.md` checks 1–2, QA). *(2026-11-23: models checked; QA settings 1–4 Pass, `docs/qa/test-plan.md` §10.)*
- [ ] **Audio (copy written 2026-11-20, held):** the one audio line under the theme paragraph goes in **only** after the owner has heard the packaged build: music changes with pace, the w2-02 clunk is distinct from a shift down, and SOUND OFF silences all of it. If any of that fails, delete the line; the page then makes no audio claim.
- [x] **Restart card:** the "Stuck?" line names `[R] RESTART`. It still shows in w3-02's pocket, and the cap still reads R (`DEFAULT_BINDINGS`). *(2026-11-23: `restart: ['KeyR']`; QA restart-prompt 3–5 Pass.)*
- [x] **Page art (delivered 2026-11-20, `docs/art/itch/`):** cover `cover-630x500.png`; screenshots `shot-1-w1-02-shift.png`, `shot-2-w1-05-red-wall.png`, `shot-3-w2-02-coast.png`, `shot-4-w3-03-gear-split.png`, `shot-5-w3-05-redshift.png`, optional `shot-greyscale-w1-05.png` last; `redshift-runway.gif` at the top of the description. Re-check that no shot shows something the final build has changed: a level geometry change, a palette change, or the HUD. *(2026-11-23: no shot shows a changed area. w3-05 v2 is limited to cols ≥ 30, and shot 5 shows the opening near the block. Re-ticked after v2 on 2026-11-23 (B9-07): v2 at 50eb482 changes cols 36–45 only, so shot 5 is still accurate.)*
- [ ] **Expansion shots (B12-E1):** shots 6–8 delivered from the final build and placed in the Delivered table, or the three "to shoot" rows deleted before upload.
- [x] **Pattern list** (white plain, blue stripes, green dots, yellow chevrons, red checker) still matches `src/data/palette.json`. *(2026-11-23: matches.)*
- [x] **Flash cap and no screen shake** still true (`src/fx/effectsPolicy.ts`). *(2026-11-23: `MAX_FLASHES_PER_SECOND` 3; no `shake` call anywhere in `src/`.)*
- [x] **Progress saves in the browser** (and the title's "not saved" notice covers browsers that block storage). *(2026-11-23: `TITLE_NOT_SAVED` in `titleModel.ts`.)*
- [x] **Team names** in the credits section match `CREDITS.md` (Patrick Carey, owner's answer 2026-11-26), and `CREDITS.md` lists every third-party asset.
- [ ] **Repo public** at https://github.com/PatrickDCarey/Shift and the link works logged out.
- [ ] **Embed:** 960×540, fullscreen button on, click to launch; keyboard works after one click in Chrome and Firefox.
