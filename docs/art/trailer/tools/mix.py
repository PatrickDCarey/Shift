"""Mix the trailer's sound and mux it with the picture.

  python docs/art/trailer/tools/mix.py [version-label]

Inputs (from cut.py and render-audio.mjs): release/trailer/cut/picture.mp4,
cut/audio/_raw/bed.f32 (48 kHz stereo float, the game's music rendered from the
cut's gear timeline), cut/cues.json and the one-shots in release/trailer/audio/.
"""
import json
import logging
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TR = ROOT / "release" / "trailer"
CUT = TR / "cut"
SFX_DIR = TR / "audio"
TARGET_LUFS = -16.0
SFX_GAIN_DB = -11.0   # the game plays cues well under the music; one-shots are peak-normalised to -6 dBFS
FADE_S = 1.6

log = logging.getLogger("mix")


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def integrated_lufs(path: Path) -> float:
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"]).stderr
    return float(re.findall(r"I:\s+(-?\d+(?:\.\d+)?) LUFS", out)[-1])


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    label = sys.argv[1] if len(sys.argv) > 1 else "v1"
    total = json.loads((CUT / "timeline.json").read_text(encoding="utf-8"))["seconds"]
    cues: list[tuple[float, str]] = [tuple(c) for c in json.loads((CUT / "cues.json").read_text(encoding="utf-8"))]

    bed_wav = CUT / "audio" / "bed.wav"
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", "48000", "-ac", "2",
         "-i", str(CUT / "audio" / "_raw" / "bed.f32"), "-c:a", "pcm_s24le", str(bed_wav)])
    gain = TARGET_LUFS - integrated_lufs(bed_wav)
    log.info("bed gain %+.1f dB to reach %.0f LUFS", gain, TARGET_LUFS)

    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(CUT / "picture.mp4"), "-i", str(bed_wav)]
    for _, name in cues:
        cmd += ["-i", str(SFX_DIR / name)]
    parts = [f"[1:a]volume={gain:.2f}dB[bed]"]
    labels = ["[bed]"]
    for i, (at, _) in enumerate(cues):
        ms = int(round(at * 1000))
        parts.append(f"[{i + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={SFX_GAIN_DB}dB,adelay={ms}|{ms}[s{i}]")
        labels.append(f"[s{i}]")
    parts.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first,"
                 f"alimiter=limit=0.89,afade=t=out:st={total - FADE_S:.3f}:d={FADE_S},atrim=0:{total:.3f}[a]")
    out = TR / f"redshift-trailer-{label}.mp4"
    cmd += ["-filter_complex", ";".join(parts), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", f"{total:.3f}", str(out)]
    run(cmd)
    log.info("wrote %s (%.1f s, %d cues, %.1f LUFS)", out, total, len(cues), integrated_lufs(out))


if __name__ == "__main__":
    main()
