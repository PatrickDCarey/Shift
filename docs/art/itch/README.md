# itch.io page art (B7-16)

Made 2026-11-20 from the batch 7 release package (no QA hook), served with
`npx vite preview --outDir <unpacked package> --port 5185 --strictPort`. All shots are real game frames; nothing is repainted.
Shot list and placement: `docs/design/itch-page.md` section 5.

| File | Size | itch field | Shot |
|---|---|---|---|
| `cover-630x500.png` | 630x500 | Cover image (shown at 315x250) | w1-05 red runner on the red bridge, solid red wall, title "REDSHIFT" in the game's 5x7 font |
| `shot-1-w1-02-shift.png` | 960x540 | Screenshot 1 | w1-02, green runner on the solid green bridge, blue bridge ahead hollow and dashed, gear 2 in the HUD |
| `shot-2-w1-05-red-wall.png` | 960x540 | Screenshot 2 | w1-05, yellow (chevrons) at the hollow red wall, red bridge hollow |
| `shot-3-w2-02-coast.png` | 960x540 | Screenshot 3 | w2-02, the drag drop: red to yellow at the 6-tile point, ring burst, yellow pad below |
| `shot-4-w3-03-gear-split.png` | 960x540 | Screenshot 4 | w3-03, blue runner and yellow twin, two HUD strips in different gears |
| `shot-5-w3-05-redshift.png` | 960x540 | Screenshot 5 | w3-05, runner white, twin yellow in flight with the ring, blue bridge hollow |
| `shot-greyscale-w1-05.png` | 960x540 | Optional screenshot 6 | shot 2 in greyscale: the patterns and the solid/hollow drawing carry the rule |
| `redshift-runway.gif` | 480x270, 7.1 s, 30 fps, 0.25 MB | GIF (page body) | w1-03: a failed yellow run falls through the red bridge; then walk back, shift up to gear 4, sprint across |

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
