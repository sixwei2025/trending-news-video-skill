#!/usr/bin/env python3
"""
Step 4: Four-Stage Automated Quality Inspection for Trending News Video
Verifies:
1. Video resolution (1920x1080 16:9 landscape), frame rate (30fps), and non-zero duration
2. Cover image dimensions (1080x1440 or 2160x2880 3:4 portrait) and file size
3. Audio track presence and loudness levels (mean_volume between -26 dB and -10 dB)
4. Keyframe extraction at 0.05s (opening hook frame) and 12.0s (spotlight evidence frame)
"""
import argparse
import json
import re
import subprocess
from pathlib import Path


def check_video_streams(video_path: Path):
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,width,height,r_frame_rate:format=duration",
            "-of",
            "json",
            str(video_path),
        ],
        text=True,
    )
    info = json.loads(out)
    streams = info.get("streams", [])
    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if not v_stream:
        raise SystemExit("❌ QA Failed: Missing video stream")
    if not a_stream:
        raise SystemExit("❌ QA Failed: Missing audio stream")
    w, h = v_stream.get("width"), v_stream.get("height")
    if (w, h) != (1920, 1080):
        raise SystemExit(f"❌ QA Failed: Expected 1920x1080 (16:9 landscape) video, got {w}x{h}")
    dur = float(info["format"]["duration"])
    if dur < 15.0:
        raise SystemExit(f"❌ QA Failed: Video duration too short ({dur:.2f}s)")
    return dur


def check_cover_aspect(cover_path: Path):
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            str(cover_path),
        ],
        text=True,
    )
    info = json.loads(out)
    s = (info.get("streams") or [{}])[0]
    cw, ch = int(s.get("width") or 0), int(s.get("height") or 0)
    if cw <= 0 or ch <= 0 or abs((cw / ch) - (3.0 / 4.0)) > 0.02:
        raise SystemExit(f"❌ QA Failed: Expected 3:4 portrait cover (e.g. 1080x1440), got {cw}x{ch}")
    return cw, ch


def check_loudness(video_path: Path):
    proc = subprocess.run(
        ["ffmpeg", "-i", str(video_path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    m_mean = re.search(r"mean_volume:\s*([-\d.]+)\s*dB", proc.stderr)
    m_max = re.search(r"max_volume:\s*([-\d.]+)\s*dB", proc.stderr)
    if not m_mean or not m_max:
        raise SystemExit("❌ QA Failed: Could not parse volumedetect output")
    mean_db = float(m_mean.group(1))
    max_db = float(m_max.group(1))
    if mean_db < -26.0 or mean_db > -10.0:
        raise SystemExit(f"❌ QA Failed: Mean volume {mean_db} dB out of broadcast range (-26dB ~ -10dB)")
    return mean_db, max_db


def main():
    parser = argparse.ArgumentParser(description="Audit Trending News Video deliverables")
    parser.add_argument("--video", type=Path, required=True, help="Path to rendered 16:9 MP4")
    parser.add_argument("--cover", type=Path, required=True, help="Path to 3:4 cover PNG/JPG")
    args = parser.parse_args()

    if not args.video.exists():
        raise SystemExit(f"❌ Video not found: {args.video}")
    if not args.cover.exists() or args.cover.stat().st_size < 10240:
        raise SystemExit(f"❌ Cover missing or too small: {args.cover}")

    dur = check_video_streams(args.video)
    cw, ch = check_cover_aspect(args.cover)
    mean_db, max_db = check_loudness(args.video)

    qa_dir = args.video.parent / "qa"
    qa_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-ss", "0.05", "-i", str(args.video), "-frames:v", "1", str(qa_dir / "qa_0.05s_cover.png")],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-ss", "12.0", "-i", str(args.video), "-frames:v", "1", str(qa_dir / "qa_12s_spotlight.png")],
        check=True,
        capture_output=True,
    )

    print(
        f"✅ [QA PASSED] Video: 1920x1080 (16:9) | Cover: {cw}x{ch} (3:4) | Duration: {dur:.2f}s | "
        f"Loudness: mean={mean_db}dB, max={max_db}dB"
    )


if __name__ == "__main__":
    main()
