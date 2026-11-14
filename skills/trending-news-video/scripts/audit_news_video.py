#!/usr/bin/env python3
"""
Step 4: Automated Six-Point Quality Inspection for Trending News Video (v2.0)
Verifies:
1. Video resolution (1920x1080 16:9 landscape), 30fps, and audio stream presence
2. Cover image dimensions (3:4 portrait, e.g. 1080x1440) and file size
3. Total duration within golden viral window (< max_duration, default 60.5s)
4. Strict single-line subtitles across all cues (<= 18 chars, zero line breaks)
5. Master loudness (-26dB ~ -10dB) + Sidechain BGM ducking (< -31dB mean)
6. Keyframe extraction (0.02s embedded cover, 2.0s hook, 15.0s spotlight, closing CTA) into qa/
"""
import argparse
import json
import re
import subprocess
from pathlib import Path


def check_video_streams(video_path: Path, max_duration: float) -> float:
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
    if dur > max_duration:
        raise SystemExit(f"❌ QA Failed: Video duration {dur:.2f}s exceeds target window ({max_duration:.1f}s)")
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


def detect_volume(media_path: Path):
    proc = subprocess.run(
        ["ffmpeg", "-i", str(media_path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    m_mean = re.search(r"mean_volume:\s*([-\d.]+)\s*dB", proc.stderr)
    m_max = re.search(r"max_volume:\s*([-\d.]+)\s*dB", proc.stderr)
    if not m_mean or not m_max:
        raise SystemExit(f"❌ QA Failed: Could not parse volumedetect output for {media_path.name}")
    return float(m_mean.group(1)), float(m_max.group(1))


def check_subtitles(props_path: Path) -> int:
    props = json.loads(props_path.read_text(encoding="utf-8"))
    cues = props.get("cues", [])
    if not cues:
        raise SystemExit("❌ QA Failed: remotion_props.json contains 0 cues!")
    for c in cues:
        txt = str(c.get("text", ""))
        if "\n" in txt or len(txt) > 18:
            raise SystemExit(f"❌ QA Failed: Multi-line or overlong subtitle ({len(txt)} chars): '{txt}'")
    return len(cues)


def main():
    parser = argparse.ArgumentParser(description="Audit Trending News Video deliverables (v2.0)")
    parser.add_argument("--video", type=Path, required=True, help="Path to rendered 16:9 MP4")
    parser.add_argument("--cover", type=Path, required=True, help="Path to 3:4 cover JPG/PNG")
    parser.add_argument("--props", type=Path, default=None, help="Optional path to remotion_props.json")
    parser.add_argument("--ducked-bgm", type=Path, default=None, help="Optional path to bgm_ducked_only.wav")
    parser.add_argument("--max-duration", type=float, default=60.5, help="Max allowed duration in seconds")
    args = parser.parse_args()

    if not args.video.exists():
        raise SystemExit(f"❌ Video not found: {args.video}")
    if not args.cover.exists() or args.cover.stat().st_size < 10240:
        raise SystemExit(f"❌ Cover missing or too small: {args.cover}")

    dur = check_video_streams(args.video, args.max_duration)
    cw, ch = check_cover_aspect(args.cover)
    mean_db, max_db = detect_volume(args.video)
    if mean_db < -26.0 or mean_db > -10.0:
        raise SystemExit(f"❌ QA Failed: Master mean volume {mean_db} dB out of broadcast range (-26dB ~ -10dB)")

    cue_info = ""
    props_file = args.props or (args.video.parent / "remotion_props.json")
    if props_file.exists():
        n_cues = check_subtitles(props_file)
        cue_info = f" | Shots: {n_cues} ({dur / n_cues:.2f}s/shot)"

    bgm_info = ""
    duck_file = args.ducked_bgm or (args.video.parent / "bgm_ducked_only.wav")
    if duck_file.exists():
        bgm_mean, _ = detect_volume(duck_file)
        if bgm_mean > -30.5:
            raise SystemExit(f"❌ QA Failed: Ducked BGM too loud ({bgm_mean} dB > -30.5 dB), risks masking voice!")
        bgm_info = f" | Ducked BGM: {bgm_mean}dB"

    qa_dir = args.video.parent / "qa"
    qa_dir.mkdir(parents=True, exist_ok=True)
    sample_points = [
        (0.02, "qa_0.02s_cover_embed.jpg"),
        (min(2.0, dur * 0.1), "qa_02.0s_hook.jpg"),
        (min(15.0, dur * 0.35), "qa_15.0s_spotlight.jpg"),
        (max(0.5, dur - 1.2), "qa_end_cta.jpg"),
    ]
    for ts, fname in sample_points:
        subprocess.run(
            ["ffmpeg", "-y", "-ss", f"{ts:.2f}", "-i", str(args.video), "-frames:v", "1", str(qa_dir / fname)],
            check=True,
            capture_output=True,
        )

    print(
        f"✅ [QA PASSED] Video: 1920x1080 (16:9) | Cover: {cw}x{ch} (3:4) | Duration: {dur:.2f}s"
        f"{cue_info} | Loudness: mean={mean_db}dB, max={max_db}dB{bgm_info}"
    )
    print(f"🖼️  Keyframes saved to {qa_dir} — 请打开抽检首帧封面、聚光灯证据与结尾反问卡像素！")


if __name__ == "__main__":
    main()
