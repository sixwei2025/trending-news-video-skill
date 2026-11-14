#!/usr/bin/env python3
"""
Step 3: Master Build Pipeline for Trending News Video (v2.0)
Orchestrates:
1. Voicebox / Broadcast TTS + Fast-Cut Sub-Shot Cues + Procedural SFX
2. Remotion 4.0 Data-Driven Rendering (`CoverStill` 3:4 1080x1440 + `NewsBurstVideo` 16:9 1920x1080)
3. Frame-Accurate Beat SFX (`marker` / `impact` / `whoosh`) + Calibrated Sidechain BGM (`<-34dB` speech, `-15 LUFS`)
4. Automated Six-Point Quality Inspection (`audit_news_video.py`)
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
FPS = 30

SHARED_NODE_MODULES_CANDIDATES = [
    Path.home() / ".agents/skills/talking-head-video/subskills/电影感口播视频/runtime/node_modules",
    Path.home() / ".gemini/skills/talking-head-video/subskills/电影感口播视频/runtime/node_modules",
    Path.home() / ".gemini/antigravity/scratch/huang-ai-video-2/remotion_app/node_modules",
]


def ensure_remotion_app(project_dir: Path) -> Path:
    rem_dir = project_dir / "remotion_app"
    kit_dir = SKILL_DIR / "templates/remotion_news_kit"
    rem_dir.mkdir(parents=True, exist_ok=True)

    # Always sync latest template source files & package config (preserving node_modules and public/assets)
    for fname in ("package.json", "tsconfig.json"):
        src_f = kit_dir / fname
        if src_f.exists():
            shutil.copy2(src_f, rem_dir / fname)

    if (rem_dir / "src").exists():
        shutil.rmtree(rem_dir / "src")
    shutil.copytree(kit_dir / "src", rem_dir / "src")

    pub_dir = rem_dir / "public"
    pub_dir.mkdir(parents=True, exist_ok=True)
    kit_portrait = kit_dir / "public/portrait.png"
    if kit_portrait.exists() and not (pub_dir / "portrait.png").exists():
        shutil.copy2(kit_portrait, pub_dir / "portrait.png")

    # Sync project assets into remotion_app/public/assets
    pub_assets = pub_dir / "assets"
    pub_assets.mkdir(parents=True, exist_ok=True)
    src_assets = project_dir / "assets"
    if src_assets.exists():
        for item in src_assets.iterdir():
            if item.name.startswith("_"):
                continue
            dest = pub_assets / item.name
            if item.is_file():
                shutil.copy2(item, dest)
            elif item.is_dir():
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(item, dest)

    # Symlink shared node_modules if available, otherwise run npm install
    nm_path = rem_dir / "node_modules"
    if not nm_path.exists():
        linked = False
        for cand in SHARED_NODE_MODULES_CANDIDATES:
            if cand.exists():
                nm_path.symlink_to(cand)
                linked = True
                break
        if not linked:
            print("📦 Installing Remotion dependencies via npm install...")
            subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=str(rem_dir), check=True)

    return rem_dir


def build_sfx_events_from_cues(cues: list) -> list:
    """Fires subtle editorial SFX synchronized to highlight reveals, twists, and fast zooms."""
    events = []
    for idx, cue in enumerate(cues):
        st = float(cue["start"])
        stype = cue.get("sceneType", "real_media")
        if idx == 0 or stype in ("firewall_card", "cta_question"):
            events.append((st, "impact", 0.24))
        elif float(cue.get("zoomTo", 1.15)) - float(cue.get("zoomFrom", 1.05)) >= 0.24:
            events.append((st, "whoosh", 0.20))

        hls = cue.get("highlights") or []
        if hls:
            for h_i, hl in enumerate(hls[:2]):
                delay_s = float(hl.get("delayFrames", 5 + h_i * 10)) / FPS
                if st + delay_s < float(cue["end"]):
                    events.append((st + delay_s, "marker", 0.24))
        elif cue.get("highlightBox"):
            if st + (4.0 / FPS) < float(cue["end"]):
                events.append((st + (4.0 / FPS), "marker", 0.22))
    return events


def mix_final_audio_and_video(
    remotion_mp4: Path,
    voice_wav: Path,
    sfx_dir: Path,
    bgm_mp3: Path,
    total_dur: float,
    cues: list,
    out_mp4: Path,
    ducked_bgm_out: Path,
):
    sfx_events = build_sfx_events_from_cues(cues)
    sfx_map = {
        "impact": sfx_dir / "impact.wav",
        "marker": sfx_dir / "marker.wav",
        "whoosh": sfx_dir / "whoosh.wav",
    }

    # 1. Export ducked-BGM-only stem for QA verification (speech ducked < -32dB, breath gap -30 ~ -24dB)
    fc_duck_only = (
        f"[1:a]atrim=start=8.2,asetpts=PTS-STARTPTS,aloop=loop=-1:size=2e+09,atrim=0:{total_dur:.3f},"
        f"afade=t=in:st=0:d=0.35,afade=t=out:st={max(0, total_dur-0.8):.3f}:d=0.8,"
        f"volume=0.30[bgm];"
        f"[bgm][0:a]sidechaincompress=threshold=0.04:ratio=5.5:attack=8:release=120:level_sc=1.1[bgmd]"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(voice_wav),
            "-i",
            str(bgm_mp3),
            "-filter_complex",
            fc_duck_only,
            "-map",
            "[bgmd]",
            "-ar",
            "48000",
            "-ac",
            "2",
            str(ducked_bgm_out),
        ],
        check=True,
        capture_output=True,
    )

    # 2. Mix Voice + Ducked BGM + Beat-Synced Editorial SFX -> -15 LUFS master
    inputs = ["-i", str(voice_wav), "-i", str(bgm_mp3)]
    chains = [
        "[0:a]asplit=2[v_sc][v_mix]",
        (
            f"[1:a]atrim=start=8.2,asetpts=PTS-STARTPTS,aloop=loop=-1:size=2e+09,atrim=0:{total_dur:.3f},"
            f"afade=t=in:st=0:d=0.35,afade=t=out:st={max(0, total_dur-0.8):.3f}:d=0.8,"
            "volume=0.30[bgm]"
        ),
        "[bgm][v_sc]sidechaincompress=threshold=0.04:ratio=5.5:attack=8:release=120:level_sc=1.1[bgmd]",
    ]

    sfx_labels = []
    for i, (ts, kind, vol) in enumerate(sfx_events):
        in_idx = 2 + i
        inputs.extend(["-i", str(sfx_map[kind])])
        delay_ms = max(0, int(ts * 1000))
        lbl = f"sfx{i}"
        chains.append(f"[{in_idx}:a]volume={vol},adelay={delay_ms}|{delay_ms}[{lbl}]")
        sfx_labels.append(f"[{lbl}]")

    all_mix = "[v_mix][bgmd]" + "".join(sfx_labels)
    num_mix = 2 + len(sfx_labels)
    chains.append(
        f"{all_mix}amix=inputs={num_mix}:duration=first:dropout_transition=0:normalize=0,"
        "loudnorm=I=-15:TP=-1.5:LRA=11[final_a]"
    )

    mixed_wav = out_mp4.parent / "mixed_master.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(chains),
            "-map",
            "[final_a]",
            "-ar",
            "48000",
            "-ac",
            "2",
            str(mixed_wav),
        ],
        check=True,
        capture_output=True,
    )

    # 3. Mux lossless video stream + 192k AAC master audio
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(remotion_mp4),
            "-i",
            str(mixed_wav),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out_mp4),
        ],
        check=True,
        capture_output=True,
    )
    print(f"✅ Final mixed video rendered: {out_mp4} ({len(sfx_events)} beat SFX points)")


def main():
    parser = argparse.ArgumentParser(description="Build complete Trending News investigative video (v2.0)")
    parser.add_argument("--project-dir", type=Path, required=True, help="Project working directory")
    parser.add_argument("--config", type=Path, required=True, help="Path to story_config.json")
    parser.add_argument("--voice", default="yuanliuwei", choices=["yuanliuwei", "news_anchor"])
    parser.add_argument("--tempo", type=float, default=None, help="Optional tempo override")
    parser.add_argument("--bgm", type=Path, default=Path.home() / "lab/bgm/DigitalLemonade.mp3")
    parser.add_argument("--max-duration", type=float, default=60.5, help="Max allowed duration in seconds (default 60.5s)")
    parser.add_argument("--harvest", action="store_true", help="Run harvest_evidence.py before building")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    project_dir.mkdir(parents=True, exist_ok=True)
    cfg_path = args.config.resolve()

    if args.harvest:
        subprocess.run(
            [
                sys.executable,
                str(SKILL_DIR / "scripts/harvest_evidence.py"),
                "--config",
                str(cfg_path),
                "--out-dir",
                str(project_dir / "assets"),
            ],
            check=True,
        )

    # 1. Run TTS + Cues + SFX synthesis
    tts_cmd = [
        sys.executable,
        str(SKILL_DIR / "scripts/generate_tts_and_sfx.py"),
        "--config",
        str(cfg_path),
        "--project-dir",
        str(project_dir),
        "--voice",
        args.voice,
    ]
    if args.tempo is not None:
        tts_cmd.extend(["--tempo", str(args.tempo)])
    subprocess.run(tts_cmd, check=True)

    props_path = project_dir / "remotion_props.json"
    props = json.loads(props_path.read_text(encoding="utf-8"))
    total_dur = float(props["totalDurationSec"])
    cues = props["cues"]

    # 2. Prepare Remotion app & copy assets
    rem_dir = ensure_remotion_app(project_dir)

    # 3. Render 3:4 CoverStill (1080x1440) & 16:9 NewsBurstVideo (1920x1080)
    cover_jpg = project_dir / "cover_3x4.jpg"
    cover_props_path = project_dir / "_cover_props.json"
    cover_props_path.write_text(
        json.dumps({"mode": "3x4", "cover": props.get("cover", {})}, ensure_ascii=False), encoding="utf-8"
    )
    subprocess.run(
        [
            "npx",
            "remotion",
            "still",
            "src/index.ts",
            "CoverStill",
            str(cover_jpg),
            "--image-format=jpeg",
            "--jpeg-quality=94",
            f"--props={cover_props_path}",
        ],
        cwd=str(rem_dir),
        check=True,
    )
    cover_props_path.unlink(missing_ok=True)

    remotion_mp4 = project_dir / "remotion_raw.mp4"
    subprocess.run(
        [
            "npx",
            "remotion",
            "render",
            "src/index.ts",
            "NewsBurstVideo",
            str(remotion_mp4),
            f"--props={props_path}",
            "--concurrency=4",
        ],
        cwd=str(rem_dir),
        check=True,
    )

    # 4. Mix Voice + Beat SFX + Sidechain BGM
    out_mp4 = project_dir / "output_final.mp4"
    ducked_bgm_wav = project_dir / "bgm_ducked_only.wav"
    mix_final_audio_and_video(
        remotion_mp4=remotion_mp4,
        voice_wav=project_dir / "voice_full.wav",
        sfx_dir=project_dir / "sfx",
        bgm_mp3=args.bgm,
        total_dur=total_dur,
        cues=cues,
        out_mp4=out_mp4,
        ducked_bgm_out=ducked_bgm_wav,
    )

    # 5. Run automated QA inspection
    subprocess.run(
        [
            sys.executable,
            str(SKILL_DIR / "scripts/audit_news_video.py"),
            "--video",
            str(out_mp4),
            "--cover",
            str(cover_jpg),
            "--props",
            str(props_path),
            "--ducked-bgm",
            str(ducked_bgm_wav),
            "--max-duration",
            str(args.max_duration),
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
