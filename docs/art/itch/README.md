# itch.io page art (B7-16)

Made 2026-11-20 from the batch 7 release package (no QA hook), served with
`npx vite preview --outDir <unpacked package> --port 5185 --strictPort`. All shots are real game frames; nothing is repainted.
Shot list and placement: `docs/design/itch-page.md` section 5.

| File | Size | itch field | Shot |
|---|---|---|---|
| `cover-630x500.png` | 630x500 | Cover image (shown at 315x250) | **Current default = a copy of `cover-630x500-a.png`** (see "Page art v2" below). The old w1-05 cover is `cover-630x500-v1.png` |
| `shot-1-w1-02-shift.png` | 960x540 | Screenshot 1 | w1-02, green runner on the solid green bridge, blue bridge ahead hollow and dashed, gear 2 in the HUD |
| `shot-2-w1-05-red-wall.png` | 960x540 | Screenshot 2 | w1-05, yellow (chevrons) at the hollow red wall, red bridge hollow |
| `shot-3-w2-02-coast.png` | 960x540 | Screenshot 3 | w2-02, the drag drop: red to yellow at the 6-tile point, ring burst, yellow pad below |
| `shot-4-w3-03-gear-split.png` | 960x540 | Screenshot 4 | w3-03, blue runner and yellow twin, two HUD strips in different gears |
| `shot-5-w3-05-redshift.png` | 960x540 | Screenshot 5 | w3-05, runner white, twin yellow in flight with the ring, blue bridge hollow |
| `shot-greyscale-w1-05.png` | 960x540 | Optional screenshot 6 | shot 2 in greyscale: the patterns and the solid/hollow drawing carry the rule |
| `redshift-runway.gif` | 480x270, 7.1 s, 30 fps, 0.25 MB | GIF (page body) | w1-03: a failed yellow run falls through the red bridge; then walk back, shift up to gear 4, sprint across |

| `shot-6-w4-03-moving-bridge.png` | 960x540 | Screenshot 6 (B12-E1) | w4-03 Moving Bridge, green runner on the solid green slab at rest, its dotted track visible |
| `shot-7-w5-01-spark.png` | 960x540 | Screenshot 7 | w5-01 Spark, yellow runner with a red bolt passing through it (colour mismatch: no hit), launchers and pink lane markers |
| `shot-8-w2-05-checkpoint.png` | 960x540 | Screenshot 8 | w2-05 Long Haul, lit white post with the blue runner past it |
| `shot-9-w4-04-outrun.png` | 960x540 | Screenshot 9 (added after the request; sweep levels were approved later) | w4-04 Outrun, saw-toothed front and hatched swept zone close behind the blue runner by the lift |
| `shot-greyscale-w5-01.png` | 960x540 | Optional screenshot 10 | shot 7 in greyscale: the bolt, patterns and outlines still read |

Screenshots are the game canvas at 2x (960x540, the embed size), taken by Playwright Chromium. The GIF is 2:1 nearest-neighbour
of the same frames (480x270 is the game's own pixel grid, so it is lossless), 64-colour palette, no dither, loops forever.
The win overlay is not shown: the last frame is held for 0.7 s, then it loops.

## Remaking (after a late art or level change)

Scripts are in `tools/` (copy next to a scratch folder; they `import` Playwright from the repo's `node_modules`, and `lib.mjs`
expects the build on port 5185). Requires `ffmpeg` on PATH.

1. Serve a release package (not the dev server) on 5185.
2. `lib.mjs` replaces `requestAnimationFrame` so the page advances exactly one 60 Hz step per tick, and presses real keys
   (Right Shift = `+`, Left Shift = `-`, arrows, Space) from a `levels/<id>.solution.txt` recording (`tokens()` expands it).
   The game starts with `?level=<id>`; the Windows tip is dismissed with Enter.
3. `node cap.mjs <level> 6` saves a 960x540 PNG every 6 steps into `cap-<level>/`; `node cap2.mjs <level> <from> <to>` saves every step in a range. Pick frames by eye.
4. `node cover.mjs <frame.png> cover.png`: crops the w1-05 frame (step 108) and draws the title from `assets/art/pixel/pixel-font.*`.
5. GIF: `node gif2.mjs` (frames every 2nd step), number the PNGs `%04d.png`, then
   `ffmpeg -framerate 30 -i %04d.png -vf "scale=480:270:flags=neighbor,tpad=stop_mode=clone:stop_duration=0.7,split[a][b];[a]palettegen=max_colors=64:stats_mode=full[p];[b][p]paletteuse=dither=none" -loop 0 out.gif`
6. Greyscale: `ffmpeg -i shot-2...png -vf format=gray,format=rgb24 out.png`.

Steps used: shot 1 step 72, shot 2 step 66, shot 3 step 131, shot 4 step 150, shot 5 step 132, cover step 108 (counted from the solution's first frame).

## Expansion shots (B12-E1, 2026-11-24)

Shots 6-9 come from `tools/exp2.mjs <level> <out-prefix> <steps,...>`: it drives the level's `.solution.txt` with real keys, one 60 Hz
step per tick, after pressing R so the kinetic clock starts at 0 (so kinetic step = solution step). Needs a **dev server with the QA hook**
on 5185: `VITE_QA_HOOK=1 npx vite --port 5185 --strictPort` (no `[replay]` label in the HUD, unlike `?replay=1`; `tools/exp.mjs` is that
variant, kept for reference). Steps: shot 6 w4-03 step 140, shot 7 w5-01 step 110, shot 8 w2-05 step 520, shot 9 w4-04 step 1000.
Greyscale as before (`ffmpeg ... format=gray,format=rgb24`).
Dated: the cover, `shot-1..5` and the GIF show worlds 1-3 only and the old HUD; the owner's new cover and trailer replace them.

## Page art v2 (cover, banner, background; 2026-11-25)

Composed only from `assets/art/pixel/*` (sprites, tiles, font), `src/data/palette.json` and code: no AI imagery, no screenshots, no dev server.
Generator: `node docs/art/itch/tools/pagearts.mjs [a,b,c,banner,bg]` (default: all; needs the repo's Playwright Chromium). Integer scales only, smoothing off.
After a sprite, palette or font change, re-run it and re-check. `cover-630x500.png` is a plain copy of the chosen composition (`cp cover-630x500-a.png cover-630x500.png`).

| File | Size | Use |
|---|---|---|
| `cover-630x500-a.png` | 630x500 | **Default cover.** "Trail": a sprint line white > blue > green > yellow > red, each runner on its matching patterned block (plain, stripes, dots, chevrons, checker); a green moving slab with its dotted track and a yellow bolt above. |
| `cover-630x500-b.png` | 630x500 | "Arc": one jump across a moving green slab, the runner changing colour along the arc, red bolt and emitter overhead, exit door at the end. |
| `cover-630x500-c.png` | 630x500 | "Chase": the sweep's saw-toothed front behind a yellow runner, solid green and yellow blocks under it, hollow red and blue blocks ahead, a lit checkpoint post. |
| `cover-630x500.png` | 630x500 | Copy of A (the file to upload). |
| `cover-630x500-v1.png` | 630x500 | The first cover (world 1 only), kept for reference. |
| `banner-960x240.png` | 960x240 | Page header banner: title, tagline, five runners on their blocks. itch-page.md gives no banner size; 960x240 as briefed. |
| `background-tile.png` | 256x256 | Seamless page background, **repeat both ways**. Stars are whole 2x2/2x4 squares kept clear of the edges, so it cannot show a seam. Brightest star is #38456E: text contrast is unaffected. |

A is the owner's choice (2026-11-25); runners at full opacity. Why A is the default: at 158x125 the title and five distinct runner silhouettes on five distinct block patterns still read, it states the theme (pace sets colour) in one glance, and it carries a moving platform and a bolt. B loses the small elements at 158 wide; C's idea (sweep, hollow blocks) is strong but the left third is a dim hatch and the runner is one small figure.

Pattern check: every gear colour keeps its pattern in all four images (white plain, blue stripes, green dots, yellow chevrons, red checker; ghost blocks keep the pattern and a dashed outline).

### itch.io page theme (all from palette.json)

| Field | Hex | Contrast on background #070A18 |
|---|---|---|
| Background | `#070A18` (page background image: `background-tile.png`) | n/a |
| Text | `#E8ECF8` (ui.text) | 16.7:1 (AAA) |
| Secondary text | `#A3AECB` (ui.textMuted) | 8.9:1 (AAA) |
| Link | `#FFD60A` (yellow gear) | 14.0:1 (AAA) |
| Button | `#F5283C` (red gear) with button text `#0B0D14` | button text on button 4.85:1 (AA); button against background 4.9:1 |
| Border | `#5A6590` (ui.panelBorder) | 3.5:1 (graphic, 3:1 needed) |

## Re-shoot 2026-11-26 (bolt art, pace track)

`shot-1..9` and both greyscale shots were re-taken with `tools/exp2.mjs` (dev server with the QA hook on 5185) at the same steps as before (shot 1 w1-02 step 72, 2 w1-05 66, 3 w2-02 131, 4 w3-03 150, 5 w3-05 132, 6 w4-03 140, 7 w5-01 110, 8 w2-05 520, 9 w4-04 1000), so the scenes are unchanged and the page shows the current game: new bolts with tails (shot 7 and its greyscale twin), flat slab undersides (shots 6 and 9), the current exit door and hint glyphs (shots 1-5). The gear meter's dotted pace track is not visible in these frames (standing or already at the selected gear), so the HUD matches the game. The GIF `redshift-runway.gif` was not re-shot: it shows no bolts or slabs (old HUD, w1-03).
