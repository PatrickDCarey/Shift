"""Assemble the Redshift trailer picture from the captured clips (frame-exact), and
derive the music's gear timeline and the sound-effect cue list from the same edit.

  python docs/art/trailer/tools/cut.py            # writes release/trailer/cut/*

The music is adaptive: it follows the runner's gear. So the edit is the source of
truth: `timeline.json` (seconds, band) is read off the clips' logged band changes
and handed to render-audio.mjs, which renders the bed from the game's own engine.
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

CAPTION_SCALE = 2
ROOT = Path(__file__).resolve().parents[4]
TR = ROOT / "release" / "trailer"
CLIPS = TR / "clips"
OV = TR / "overlays"
OUT = TR / "cut"
FPS = 60

# (clip, first frame, last frame exclusive, label)
EDL = [
    ("shot-01-w1-01-fall-through", 61, 232, "rule"),
    ("shot-02-w1-03-runway", 236, 385, "sprint"),
    ("shot-03-w1-05-red-wall", 100, 241, "redwall"),
    ("shot-04-w2-02-coast", 140, 284, "coast"),
    ("shot-05-w3-03-gear-split", 150, 262, "tandem"),
    ("shot-06a-w4-03-slab-fail", 100, 209, "slabfail"),
    ("shot-06b-w4-03-slab-cross", 104, 230, "slabcross"),
    ("shot-07a-w5-01-bolt", 96, 200, "bolt"),
    ("shot-07b-w5-03-hurdle", 20, 180, "hurdle"),
    ("shot-08-w2-05-checkpoint", 95, 170, "post"),
    ("shot-08-w2-05-checkpoint", 268, 400, "respawn"),
    ("shot-09a-w5-05-red-coast", 40, 165, "finale1"),
    ("shot-10-w4-04-outrun-sweep", 20, 140, "sweep"),
    ("shot-09b-w5-05-lift", 60, 170, "finale2"),
    ("shot-09c-w5-05-walk-home", 120, 215, "home"),
]
END_ANIM_S = 3.0   # end-card.mp4
END_HOLD_S = 1.5   # its last frame held
# Shift presses in shot 2 (w1-03 recording: steps 170, 172, 174; the clip has 90 idle frames in front).
SHIFT_PRESS_FRAMES = [260, 262, 264]

# sound-effect file per logged event type
SFX = {
    "jump": "sfx-jump.wav",
    "land": "sfx-land.wav",
    "fallThrough": "sfx-fall-through.wav",
    "death": "sfx-reset-death.wav",
    "postLit": "sfx-checkpoint-ping.wav",
    "win": "sfx-win.wav",
}


def load_events():
    data = json.loads((CLIPS / "clips.json").read_text(encoding="utf-8"))
    clips = data if isinstance(data, list) else data["clips"]
    return {c["file"].replace(".mp4", ""): c["events"] for c in clips}


def plan():
    events = load_events()
    t = 0.0
    segs, bands, cues = [], [], []
    for clip, a, b, label in EDL:
        ev = events[clip]
        start_band = [e["value"] for e in ev if e["type"] == "band" and e["frame"] <= a][-1]
        bands.append([round(t, 4), start_band])
        for e in ev:
            if not (a < e["frame"] < b):
                continue
            at = round(t + (e["frame"] - a) / FPS, 4)
            if e["type"] == "band":
                bands.append([at, e["value"]])
            elif e["type"] in SFX:
                cues.append([at, SFX[e["type"]]])
        if label == "sprint":
            for f in SHIFT_PRESS_FRAMES:
                cues.append([round(t + (f - a) / FPS, 4), "sfx-shift-up.wav"])
        segs.append({"clip": clip, "in": a, "out": b, "label": label, "t": round(t, 4), "dur": round((b - a) / FPS, 4)})
        t += (b - a) / FPS
    end_t = t
    # End card: the title's lit gear steps white to red twice a second; the music does the same.
    for i, band in enumerate([0, 1, 2, 3, 4]):
        bands.append([round(end_t + 0.5 * i, 4), band])
    total = end_t + END_ANIM_S + END_HOLD_S
    # drop repeats
    slim = []
    for at, band in bands:
        if slim and slim[-1][1] == band:
            continue
        slim.append([at, band])
    return segs, slim, sorted(cues), end_t, total


def overlays(segs, end_t):
    """(png, start, end) in seconds."""
    by = {s["label"]: s for s in segs}
    out = []
    rule = by["rule"]
    out.append(("caption-your-speed-is-your-color.png", rule["t"] + 0.25, rule["t"] + 1.85))
    out.append(("caption-only-your-color-is-solid.png", rule["t"] + 2.0, rule["t"] + rule["dur"]))
    sp = by["sprint"]
    f0 = sp["in"]
    def tt(frame):
        return sp["t"] + (frame - f0) / FPS
    pressed = [(259, 261), (262, 264), (265, 267)]
    out.append(("key-shift-up.png", sp["t"], tt(259)))
    for i, (a, b) in enumerate(pressed):
        out.append(("key-shift-pressed.png", tt(a), tt(b)))
        nxt = pressed[i + 1][0] if i + 1 < len(pressed) else 300
        out.append(("key-shift-up.png", tt(b), tt(nxt)))
    out.append(("caption-platforms-move.png", by["slabfail"]["t"] + 0.1, by["slabfail"]["t"] + 1.6))
    out.append(("caption-bolts-hit-their-own-color.png", by["bolt"]["t"] + 0.1, by["bolt"]["t"] + 1.65))
    post = by["post"]
    out.append(("caption-checkpoints.png", post["t"] + 0.5, post["t"] + post["dur"] + 0.6))
    return out


def build(segs, ovs, end_t, total, dest):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for s in segs:
        cmd += ["-i", str(CLIPS / (s["clip"] + ".mp4"))]
    cmd += ["-i", str(OV / "end-card.mp4")]
    end_idx = len(segs)
    pngs = sorted({o[0] for o in ovs})
    png_idx = {}
    for p in pngs:
        png_idx[p] = len(segs) + 1 + len(png_idx)
        cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{total:.3f}", "-i", str(OV / p)]
    fc = []
    for i, s in enumerate(segs):
        fc.append(f"[{i}:v]trim=start_frame={s['in']}:end_frame={s['out']},setpts=PTS-STARTPTS,fps={FPS},format=yuv420p[v{i}]")
    fc.append(f"[{end_idx}:v]fps={FPS},tpad=stop_mode=clone:stop_duration={END_HOLD_S},format=yuv420p[vend]")
    fc.append("".join(f"[v{i}]" for i in range(len(segs))) + f"[vend]concat=n={len(segs) + 1}:v=1:a=0[base]")
    last = "base"
    for n, (png, a, b) in enumerate(ovs):
        src, pos = f"[{png_idx[png]}:v]", "0:0"
        if png.startswith("caption-"):
            # Caption plates are drawn at 1x near the bottom edge: crop the plate and show it at 2x
            # (nearest neighbour, so the pixel font stays sharp), centred in the lower third.
            x0, y0, x1, y1 = Image.open(OV / png).getbbox()
            w, h = x1 - x0, y1 - y0
            fc.append(f"{src}crop={w}:{h}:{x0}:{y0},scale={w * CAPTION_SCALE}:{h * CAPTION_SCALE}:flags=neighbor[c{n}]")
            src = f"[c{n}]"
            pos = f"{(1920 - w * CAPTION_SCALE) // 2}:{1080 - h * CAPTION_SCALE - 72}"
        fc.append(f"[{last}]{src}overlay={pos}:enable='between(t,{a:.4f},{b:.4f})'[o{n}]")
        last = f"o{n}"
    cmd += ["-filter_complex", ";".join(fc), "-map", f"[{last}]", "-t", f"{total:.3f}",
            "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an", str(dest)]
    subprocess.run(cmd, check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    segs, bands, cues, end_t, total = plan()
    ovs = overlays(segs, end_t)
    (OUT / "timeline.json").write_text(json.dumps({"seconds": round(total, 3), "bands": bands}, indent=1), encoding="utf-8")
    (OUT / "cues.json").write_text(json.dumps(cues, indent=1), encoding="utf-8")
    (OUT / "edl.json").write_text(json.dumps({"segments": segs, "endCardAt": round(end_t, 4), "total": round(total, 4),
                                              "overlays": ovs}, indent=1), encoding="utf-8")
    print(f"picture {end_t:.2f} s + end card = {total:.2f} s; {len(bands)} gear changes; {len(cues)} cues")
    for s in segs:
        print(f"  {s['t']:6.2f}  {s['dur']:5.2f}  {s['label']:10s} {s['clip']}")
    if "--plan" not in sys.argv:
        build(segs, ovs, end_t, total, OUT / "picture.mp4")
        print("wrote", OUT / "picture.mp4")


if __name__ == "__main__":
    main()
