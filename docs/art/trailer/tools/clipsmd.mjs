// node clipsmd.mjs -> release/trailer/clips.md from clips.json + the notes below
import fs from 'node:fs';
import { OUT } from './cliplib.mjs';
const NOTE = {
  'shot-01': ['Walk blue onto the first bridge, let go mid-bridge, turn white, drop through, death.', 'Scripted inputs (not the recording). Stops on the respawn.'],
  'shot-02': ['Standing start at the right, walk back to the wall, three shift taps, sprint white-blue-green-yellow-red, cross the red bridge, exit.', 'Recording. The "CLEAR" results card fades in during the post-win tail: cut at the win event plus ~20 frames. No SHIFT key cap (add in the edit).'],
  'shot-03': ['Arrive yellow at the red wall (it is passable), shift up, cross the red bridge red.', 'Recording; results card in the post-win tail as above.'],
  'shot-04': ['Red takeoff, drag drops red to yellow mid-air (jump event, band 4 to 3), land on the yellow pad.', 'Recording; the drag ring is small at this scale. Results card in the tail.'],
  'shot-05': ['Tandem: both bodies shown (HUD has two strips). One body is stopped blue under the block while the twin flies yellow; both start white, run red then split.', 'Recording; sidecar has band and twinBand events. No post-win tail (clip ends on the last step).'],
  'shot-06a': ['Green runner stops on the level green slab, turns blue then white, falls through the slab.', 'Scripted inputs. The slab is level for the whole drop.'],
  'shot-06b': ['Green runner crosses the green slab while it rests level, onto the exit side.', 'Recording; results card in the tail.'],
  'shot-07a': ['Walk-through of red bolts: yellow runner under the two red launchers, bolts pass through (boltPass events), then red across the bridge.', 'Recording with 64 idle steps in front (two emitter periods, so bolt timing is unchanged). Bolts are small: check at 1080p.'],
  'shot-07b': ['Green runner jumps over grey bolts on the long bridge (v2 level), camera scrolling with look-ahead.', 'Recording. The grey bolt is a small sparkle; first jump at about step 152, the second near 242.'],
  'shot-08': ['Red then slowing to blue past the post (it lights: flag raised, postLit event), walks the blue bridge, lets go, falls, dies, respawns at the post.', 'Scripted tail (stop on the bridge). Respawn lands at the lit post.'],
  'shot-09a': ['w5-05 red coast: red jump over the yellow fountain (red passes harmlessly), lands.', 'Recording, steps 170-345.'],
  'shot-09b': ['w5-05 walking blue up the rising lift under white bolts (boltPass events).', 'Recording, steps 1080-1259. White bolts are hard to see against the dark sky.'],
  'shot-09c': ['w5-05 blue walk home to the exit; ends on the CLEAR card.', 'Recording, steps 3550-3739. Cut before the card (win event).'],
  'shot-10': ['BONUS w4-04 Outrun: runner with the saw-toothed sweep front close behind.', 'Recording; see the notes on exact frames in this file.'],
};
const clips = JSON.parse(fs.readFileSync(`${OUT}/clips/clips.json`, 'utf8'));
let md = '# Trailer raw clips\n\nAll 1920x1080, 60 fps, H.264 (crf 14, slow, yuv420p), no audio. Captured from the dev build (QA hook on, no [replay] label) at 960x540 with deviceScaleFactor 2: the canvas renders crisp at 2x, so no upscaling was used. Frame-exact: frozen page clock, one PNG per 60 Hz sim step. `clips/clips.json` has the per-frame band and key-moment events (frame numbers are clip frames; the music table is in `audio/README.md`).\n\n| File | Level | Steps | Frames | Length | Shows | Caveat |\n|---|---|---|---|---|---|---|\n';
for (const c of clips) {
  const k = c.file.split('-').slice(0, 2).join('-');
  const [a, b] = NOTE[k] ?? ['', ''];
  md += `| ${c.file} | ${c.level} | ${c.steps[0]}-${c.steps[1]} | ${c.frames} | ${(c.frames / 60).toFixed(1)} s | ${a} | ${b} |\n`;
}
fs.writeFileSync(`${OUT}/clips.md`, md);
console.log(md.length);
