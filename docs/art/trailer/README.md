# Trailer raw clips (capture tools)

Output goes to `release/trailer/` (git-ignored). Clips are 1920x1080, 60 fps, H.264, from the dev build at 960x540 with `deviceScaleFactor: 2`.

To regenerate:

1. Dev server with the QA hook on port 5185: `VITE_QA_HOOK=1 npx vite --port 5185 --strictPort`.
2. `tools/clips.mjs` defines every clip (level, first captured step, input plan: the level's recording or scripted inputs).
3. `bash tools/batch.sh <clip> [<clip> ...]` (clips run one at a time; run two lanes at most, more makes `page.goto` time out). Each clip: `tools/shots.mjs` plays the plan with a frozen page clock (`page.clock`, one 16 ms frame per tick, the grid the page's rAF uses), takes one PNG per 60 Hz sim step, encodes with ffmpeg, and writes the per-frame state log to `release/trailer/logs/`. `node tools/shots.mjs <clip> log` re-runs the plan without screenshots (logs only).
4. `node tools/sidecar.mjs` writes `release/trailer/clips/clips.json` (band changes and key moments per clip frame); `node tools/clipsmd.mjs` writes `release/trailer/clips.md`; `bash tools/contact.sh` writes `release/trailer/contact-sheet.png`; `bash tools/review.sh <clip>` makes a 6-frame strip for checking.
5. Delete `release/trailer/frames/` once the clips are checked.

`trace.mjs <level> <every>` prints player state along a level's recording (use it to find step ranges); `probe.mjs` saves screenshots at chosen steps.
`render-audio.*` are the audio-designer's and not part of the capture.

Overlays and end card: `node tools/overlays.mjs` (no dev server needed) writes `release/trailer/overlays/` from `assets/art/pixel/*` and `src/data/palette.json`.
Known fragility: `page.goto` can time out or the page reload if more than two captures run at once, or while source files change; just re-run the failed clip.
