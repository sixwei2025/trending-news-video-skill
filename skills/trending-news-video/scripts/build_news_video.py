#!/usr/bin/env python3
"""
Step 3: Master Build Pipeline for Trending News Video
Orchestrates TTS & SFX synthesis -> Remotion cover & video rendering ->
Beat-synced SFX & Sidechain BGM mixing (-15 LUFS) -> QA verification.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
FPS = 30


def mix_final_audio_and_video(
    remotion_mp4: Path,
    voice_wav: Path,
    sfx_dir: Path,
    bgm_mp3: Path,
    scene_frames: list,
    out_mp4: Path,
):
    total_dur = sum(scene_frames) / FPS

    # Build SFX cue list (impact on scene start, marker at +14f and +28f)
    sfx_events = []
    cur_f = 0
    for idx, f_count in enumerate(scene_frames):
        sfx_events.append((cur_f / FPS, "impact" if idx in (0, 1, 5, 7) else "whoosh", 0.35))
        if f_count > 45:
            sfx_events.append(((cur_f + 14) / FPS, "marker", 0.28))
        if f_count > 90:
            sfx_events.append(((cur_f + 28) / FPS, "marker", 0.24))
        cur_f += f_count

    inputs = ["-i", str(remotion_mp4), "-i", str(voice_wav), "-stream_loop", "-1", "-i", str(bgm_mp3)]
    sfx_map = {
        "impact": sfx_dir / "impact.wav",
        "marker": sfx_dir / "marker.wav",
        "whoosh": sfx_dir / "whoosh.wav",
    }

    filter_chains = [
        # Voice normalization & crisp EQ, split for sidechain + mix
        "[1:a]highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=60,volume=1.35,asplit=2[v_sc][v_mix]",
        # BGM trimmed & faded
        f"[2:a]atrim=0:{total_dur:.3f},afade=t=in:st=0:d=1.2,afade=t=out:st={max(0, total_dur-2.0):.3f}:d=2.0,volume=0.35[bgm_raw]",
        # Sidechain ducking BGM under voice
        "[bgm_raw][v_sc]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=350[bgm_ducked]",
    ]

    sfx_labels = []
    for i, (ts, kind, vol) in enumerate(sfx_events):
        in_idx = 3 + i
        inputs.extend(["-i", str(sfx_map[kind])])
        delay_ms = int(ts * 1000)
        lbl = f"sfx{i}"
        filter_chains.append(f"[{in_idx}:a]volume={vol},adelay={delay_ms}|{delay_ms}[{lbl}]")
        sfx_labels.append(f"[{lbl}]")

    all_mix = "[v_mix][bgm_ducked]" + "".join(sfx_labels)
    num_mix = 2 + len(sfx_labels)
    filter_chains.append(
        f"{all_mix}amix=inputs={num_mix}:duration=first:dropout_transition=0:normalize=0,"
        "loudnorm=I=-15:TP=-1.5:LRA=9[final_a]"
    )

    cmd = [
        "ffmpeg",
        "-y",
        *inputs,
        "-filter_complex",
        ";".join(filter_chains),
        "-map",
        "0:v:0",
        "-map",
        "[final_a]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True)
    print(f"✅ Final mixed video rendered: {out_mp4}")


def main():
    parser = argparse.ArgumentParser(description="Build complete Trending News investigative video")
    parser.add_argument("--project-dir", type=Path, required=True, help="Project working directory")
    parser.add_argument("--config", type=Path, required=True, help="Path to story_config.json")
    parser.add_argument("--voice", default="yuanliuwei", choices=["yuanliuwei", "news_anchor"])
    parser.add_argument("--bgm", type=Path, default=Path.home() / "lab/bgm/DigitalLemonade.mp3")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    project_dir.mkdir(parents=True, exist_ok=True)

    # 1. Run TTS + SFX synthesis
    subprocess.run(
        [
            sys.executable,
            str(SKILL_DIR / "scripts/generate_tts_and_sfx.py"),
            "--config",
            str(args.config.resolve()),
            "--project-dir",
            str(project_dir),
            "--voice",
            args.voice,
        ],
        check=True,
    )

    timings = json.loads((project_dir / "timings.json").read_text(encoding="utf-8"))
    scene_frames = timings["scene_frames"]

    # 2. Ensure Remotion app is prepared in project_dir/remotion_app
    rem_dir = project_dir / "remotion_app"
    if not rem_dir.exists():
        shutil.copytree(SKILL_DIR / "templates/remotion_news_kit", rem_dir)
    # Symlink shared node_modules if not present
    nm_target = Path.home() / ".gemini/skills/talking-head-video/subskills/电影感口播视频/runtime/node_modules"
    if not (rem_dir / "node_modules").exists() and nm_target.exists():
        (rem_dir / "node_modules").symlink_to(nm_target)

    # Copy assets to remotion_app/public/assets
    pub_assets = rem_dir / "public/assets"
    pub_assets.mkdir(parents=True, exist_ok=True)
    src_assets = project_dir / "assets"
    if src_assets.exists():
        for f in src_assets.iterdir():
            if f.is_file():
                shutil.copy2(f, pub_assets / f.name)

    # 3. Render CoverStill & Video via Remotion
    cover_png = project_dir / "cover.png"
    remotion_mp4 = project_dir / "remotion_raw.mp4"
    subprocess.run(
        ["npx", "remotion", "still", "src/index.ts", "CoverStill", str(cover_png)],
        cwd=str(rem_dir),
        check=True,
    )
    subprocess.run(
        ["npx", "remotion", "render", "src/index.ts", "JensenNews", str(remotion_mp4), "--concurrency=4"],
        cwd=str(rem_dir),
        check=True,
    )

    # 4. Mix Voice + SFX + Sidechain BGM
    out_mp4 = project_dir / "output_final.mp4"
    mix_final_audio_and_video(
        remotion_mp4=remotion_mp4,
        voice_wav=project_dir / "voice_full.wav",
        sfx_dir=project_dir / "sfx",
        bgm_mp3=args.bgm,
        scene_frames=scene_frames,
        out_mp4=out_mp4,
    )

    # 5. Run automated QA audit
    subprocess.run(
        [
            sys.executable,
            str(SKILL_DIR / "scripts/audit_news_video.py"),
            "--video",
            str(out_mp4),
            "--cover",
            str(cover_png),
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
