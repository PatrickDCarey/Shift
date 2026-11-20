# itch.io page copy

_Owner: design-lead. Written 2026-11-18 against the build as it stands (batch 6, 14 levels). Every claim was checked in the repo on that date; the checklist at the bottom lists what to re-check at submit. **Re-checked 2026-11-20 (B7-17)** against the batch 7 build: the settings screen, the wired sound effects, the restart card and the page art (`docs/art/itch/`) are now in the copy, §5 and §7. Spelling: **American ("color")**. The game's on-screen text never uses the word, so this follows the GDD and the code, which both say "color"._

Paste each section into the itch.io field named in its heading. Lines in `> NOTE` blocks are instructions, not copy: do not paste them.

---

## 1. Title and tagline

**Title:** Redshift

**Tagline (pick):** Your speed is your color. Only your color is solid.

Alternates:
- Shift gears. Change color. Watch what holds you up.
- A puzzle-platformer where how fast you run decides what is solid.

---

## 2. Short description (itch "Short description or tagline" field, under 160 characters)

A puzzle-platformer where your speed sets your color, and only platforms of your color hold you. Shift gears to cross each room.

---

## 3. Page body (itch "Description" field)

> NOTE: insert `docs/art/itch/redshift-runway.gif` (480×270, 7.1 s loop, 0.25 MB) as the first thing in the description, above the first line. It shows the whole idea with no text. Leave it at its own size if the editor would blur it when scaled.

**Your pace is your color.** Stand still and you are white. Walk and you are blue. Sprint and you are red. Colored platforms and walls are only solid while your color matches them, so every room is a question of where to speed up, where to slow down, and where to jump.

Speed takes distance to build and distance to lose, and nothing you press in the air changes your speed. Plan the run, then make it.

**Game Off theme, SHIFT:** you change gear with the Shift keys, and in world 3 you shift two runners out of step with each other.

> NOTE: paste the next line only after the owner has listened to the packaged build (USER check, 2026-11-20): the music changes with your pace, the clunk is heard on w2-02's long jump and sounds different from a shift down, and SOUND OFF silences everything. Otherwise delete it. No other line on the page claims audio.

Listen for the music: it follows your pace. A heavy clunk means a long flight just cost you a gear.

### In this build

> NOTE: the next line is the only place the level and world count appears. Change it here if worlds are added or cut.

**14 levels in 3 worlds: Gears, Flight and Tandem.**

- **Gears** teaches the color rule with no text: shifting, building speed, braking, and walls that stop only their own color.
- **Flight** is about committing at takeoff. Long flights cost you speed, one color every 6 tiles.
- **Tandem** gives you a second runner on a second floor. Both obey the same keys. Put them out of step to bring both home.

The first level of every world is open from the start, so you can try Tandem right away.

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

- Color is never the only signal. Each color has its own pattern on you and on the tiles: white plain, blue stripes, green dots, yellow chevrons, red checker. Tiles you cannot stand on right now are drawn hollow with a dashed outline.
- In Tandem, the second runner has a different shape, not just a different color.
- No screen shake. Flashes are capped at 3 per second.
- **Settings** (from the title or the pause menu):
  - **Reduced motion** turns off flashes, screen wipes, parallax and pulsing. It starts on if your system is set to reduce motion.
  - **Reduced effects** removes decoration such as stars, speed lines and afterimages.
  - **Sound** turns all audio on or off.
  - Settings are saved in your browser.
- Keyboard only. No mouse needed. Jumps have generous coyote time and buffering, and there is no time limit.

### Stuck?

Press **R** to restart the room at any time. If a runner gets trapped, the game shows **[R] RESTART**. **Esc** or **P** pauses; the pause menu also shows the controls. Most rooms are solved by backing up, or by slowing down earlier than you think.

Progress is saved in your browser.

> NOTE: optional block. Include only if leaderboards are live at submit (Supabase project deployed, posting enabled, tested on the itch build). Otherwise delete it.

<!-- LEADERBOARDS: include only if live at submit -->
### Leaderboards

Each level has an online leaderboard, ranked by time. Your run is only posted after you choose a name. If the leaderboard cannot be reached, the game plays exactly the same.
<!-- /LEADERBOARDS -->

### Credits and source

Made for GitHub Game Off 2026.

> NOTE: team names go here, matching `CREDITS.md` (still a placeholder on 2026-11-18).

Code is MIT licensed. Third-party libraries and assets are listed in `CREDITS.md`, each with its license.

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
| Tags (10) | `puzzle-platformer`, `platformer`, `puzzle`, `pixel-art`, `2d`, `colorful`, `singleplayer`, `short`, `game-off`, `phaser` | Plain discovery tags. `game-off` because voters browse it. |
| Made with | Phaser (and TypeScript, Vite if itch offers them) | `package.json`, `CREDITS.md`. |
| Average session | About a half-hour | Target first-time solves add up to roughly 20 to 35 minutes for 14 levels (`levels/README.md`); a voter can stop after any level. |
| Inputs | Keyboard | Only input the game reads. Do **not** tick Mouse, Gamepad or Touchscreen. |
| Accessibility | Tick **Color-blind friendly** (pattern per color, twin silhouette) and **Interactive tutorial** (world 1 teaches by play and key glyphs, no text). | Both are true as built. Do **not** tick Configurable controls (no remap screen; the alternate keys are fixed), High-contrast (no separate mode), Textless (menus are text), Subtitles, One button, Blind friendly. |
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
- Idea: one runner mid-sprint, red with its checker pattern, crossing a red bridge, with a hollow dashed blue bridge and a solid red wall around it, and the world tint at its red end. Title "REDSHIFT" in the game's pixel font. It should say "color and speed" before anyone reads a word.

**Screenshots (3 to 5, in this order)**
1. **w1-02 Shift, crossing the green bridge.** Player green with dots, the blue bridge ahead drawn hollow, HUD showing gear 2. Sells the core rule in one picture: same room, the floor you match is solid.
2. **w1-05 Red Wall, passing through the wall.** Player yellow (chevrons) inside or just past the red wall column, red bridge ahead. Sells "a wall stops only its own color".
3. **w2-02 Coast, the drag drop mid-flight.** The ring burst on the runner at the 6-tile point, red turning yellow, the yellow pad below. Sells "commit at takeoff" and shows the effects.
4. **w3-03 Gear Split, after the air stop.** Runner standing blue under the hanging block, twin flying yellow below, both HUD strips showing different colors. Sells Tandem: one set of keys, two colors.
5. **w3-05 Redshift, mid-solve.** Both bodies in different colors on a busy screen. Shows there is depth past the tutorial.

**GIF (one, 6 to 8 seconds, loops)**
- **w1-03 Runway, fail then solve.** Start running from the spawn, reach the red bridge yellow, fall; restart, walk back to the wall, shift up, sprint: the player goes white, blue, green, yellow, red and crosses. Sells the whole idea (pace is color, speed takes distance) with no text. Keep it under about 3 MB.

Nice to have: one screenshot in greyscale (any of the above) to show the patterns carry the rule without color.

### Delivered (B7-16, 2026-11-20; files in `docs/art/itch/`, how they were made in its `README.md`)

Design accepts the set as delivered. Upload in this order:

| itch field | File | Notes |
|---|---|---|
| Cover image | `cover-630x500.png` | w1-05: a red runner on the red bridge by the solid red wall, title in the game's font. It is not the shot-list scene (no hollow blue bridge), but it says "color and speed" just as well. |
| Screenshot 1 | `shot-1-w1-02-shift.png` | As listed. |
| Screenshot 2 | `shot-2-w1-05-red-wall.png` | As listed. |
| Screenshot 3 | `shot-3-w2-02-coast.png` | As listed. |
| Screenshot 4 | `shot-4-w3-03-gear-split.png` | As listed. |
| Screenshot 5 | `shot-5-w3-05-redshift.png` | Runner white, twin yellow in flight. |
| Screenshot 6 (optional) | `shot-greyscale-w1-05.png` | The greyscale nice-to-have. Upload it last so it never becomes the thumbnail. |
| Description (top) | `redshift-runway.gif` | See the note at the top of §3. |

The screenshots come from the batch 7 package, before the 2026-11-20 hint glyphs and the 2× restart card. Shot 4 is unaffected: w3-03's new spawn glyph is off its left edge. Shot 5 is near w3-05's block and was taken before that level's `jump 12 3` glyph existed, so a reshoot would add one key cap. **No reshoot needed**: a missing hint misrepresents nothing about the game. Reshoot only if a later art or level change alters what a shot shows (`docs/art/itch/README.md` "Remaking").

---

## 6. Jam submission form (free text on the theme)

In Redshift, your pace is your color, and colored platforms are only solid while your color matches them. You shift gears with the Shift keys, and each gear is a color: white, blue, green, yellow, red. Speed takes distance to build and to lose, so every room asks where to shift up, where to shift down, and when to jump. In the third world, one set of keys drives two runners, and the puzzle is shifting them out of step and back in step.

---

## 7. Facts to re-check at submit

- [ ] **Level and world count:** still 14 levels in 3 worlds (Gears, Flight, Tandem)? If a world 4 ships or anything is cut, change the one "In this build" line, the Tandem bullet if needed, and the average session.
- [ ] **First level of every world open from the start** (`src/save/progress.ts` unlock rule).
- [ ] **Controls table** matches the controls screen (`src/ui/bindings.ts` `DEFAULT_BINDINGS`, `src/ui/controlsModel.ts`).
- [ ] **Sticky Keys tip** still shows once on Windows.
- [ ] **Leaderboards:** live and tested on the itch build? If not, delete the optional block. If yes, check the wording against what the results screen actually shows (rank and name prompt).
- [ ] **Settings (copy updated 2026-11-20):** SETTINGS is on the title and in the pause menu, with SOUND, REDUCED MOTION and REDUCED EFFECTS (`src/ui/titleModel.ts`, `src/ui/pauseModel.ts`, `features/settings.md`). The copy names exactly those three; there are no volume sliders, so don't mention volume. Reduced motion starts on with the OS setting, and all three survive a reload (`settings.md` checks 1–2, QA).
- [ ] **Audio (copy written 2026-11-20, held):** the one audio line under the theme paragraph goes in **only** after the owner has heard the packaged build: music changes with pace, the w2-02 clunk is distinct from a shift down, and SOUND OFF silences all of it. If any of that fails, delete the line; the page then makes no audio claim.
- [ ] **Restart card:** the "Stuck?" line names `[R] RESTART`. It still shows in w3-02's pocket, and the cap still reads R (`DEFAULT_BINDINGS`).
- [ ] **Page art (delivered 2026-11-20, `docs/art/itch/`):** cover `cover-630x500.png`; screenshots `shot-1-w1-02-shift.png`, `shot-2-w1-05-red-wall.png`, `shot-3-w2-02-coast.png`, `shot-4-w3-03-gear-split.png`, `shot-5-w3-05-redshift.png`, optional `shot-greyscale-w1-05.png` last; `redshift-runway.gif` at the top of the description. Re-check that no shot shows something the final build has changed: a level geometry change, a palette change, or the HUD.
- [ ] **Pattern list** (white plain, blue stripes, green dots, yellow chevrons, red checker) still matches `src/data/palette.json`.
- [ ] **Flash cap and no screen shake** still true (`src/fx/effectsPolicy.ts`).
- [ ] **Progress saves in the browser** (and the title's "not saved" notice covers browsers that block storage).
- [ ] **Team names** in the credits section match `CREDITS.md`, and `CREDITS.md` lists every third-party asset.
- [ ] **Repo public** at https://github.com/PatrickDCarey/Shift and the link works logged out.
- [ ] **Embed:** 960×540, fullscreen button on, click to launch; keyboard works after one click in Chrome and Firefox.
