#!/usr/bin/env python3
"""
Step 2: Broadcast Audio & Procedural SFX Engine
Generates news-anchor TTS (edge-tts zh-CN-YunjianNeural or local Voicebox),
computes exact 30fps frame counts per scene, and synthesizes procedural editorial SFX.
"""
import argparse
import asyncio
import json
import math
import random
import struct
import subprocess
import urllib.request
import wave
from pathlib import Path

FPS = 30
VOICEBOX_URL = "http://127.0.0.1:17493"
YUAN_PROFILE_ID = "4fcdbe0e-b07c-422b-838d-b81f53bbb383"


def get_audio_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def generate_sfx(sfx_dir: Path):
    sfx_dir.mkdir(parents=True, exist_ok=True)
    sr = 44100

    # 1. impact.wav: Low-end investigative boom + crisp transient
    impact_path = sfx_dir / "impact.wav"
    with wave.open(str(impact_path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        n = int(sr * 0.45)
        for i in range(n):
            t = i / sr
            freq = 110 * math.exp(-t * 8) + 38
            env = math.exp(-t * 7.5)
            click = math.exp(-t * 90) * (random.random() * 2 - 1) * 0.4
            val = (math.sin(2 * math.pi * freq * t) * env * 0.75 + click) * 32767
            w.writeframesraw(struct.pack("<h", max(-32767, min(32767, int(val)))))

    # 2. marker.wav: Felt-tip highlighter swipe texture
    marker_path = sfx_dir / "marker.wav"
    with wave.open(str(marker_path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        n = int(sr * 0.24)
        prev = 0.0
        for i in range(n):
            t = i / sr
            env = math.sin(math.pi * (t / 0.24)) ** 1.4
            noise = random.random() * 2 - 1
            band = 0.65 * noise - 0.35 * prev
            prev = noise
            val = band * env * 0.28 * 32767
            w.writeframesraw(struct.pack("<h", max(-32767, min(32767, int(val)))))

    # 3. whoosh.wav: Smooth camera zoom transition
    whoosh_path = sfx_dir / "whoosh.wav"
    with wave.open(str(whoosh_path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        n = int(sr * 0.32)
        for i in range(n):
            t = i / sr
            env = math.sin(math.pi * (t / 0.32)) ** 2
            mod = math.sin(2 * math.pi * (180 + 420 * (t / 0.32)) * t)
            noise = (random.random() * 2 - 1) * 0.5
            val = (mod * 0.4 + noise * 0.6) * env * 0.25 * 32767
            w.writeframesraw(struct.pack("<h", max(-32767, min(32767, int(val)))))

    print(f"✅ Generated procedural SFX in {sfx_dir}")


async def synth_edge_tts_segment(text: str, out_wav: Path, voice: str, rate: str, pitch: str):
    import edge_tts

    mp3_tmp = out_wav.with_suffix(".mp3")
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
            await comm.save(str(mp3_tmp))
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(mp3_tmp),
                    "-af",
                    "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,apad=pad_dur=0.18",
                    "-ar",
                    "44100",
                    "-ac",
                    "1",
                    str(out_wav),
                ],
                check=True,
                capture_output=True,
            )
            mp3_tmp.unlink(missing_ok=True)
            return
        except Exception as e:
            if attempt == 3:
                raise RuntimeError(f"edge-tts failed after 4 attempts: {e}") from e
            await asyncio.sleep(1.5 * (attempt + 1))


def synth_voicebox_segment(text: str, out_wav: Path, profile_id: str):
    payload = json.dumps({"profile_id": profile_id, "text": text, "language": "zh"}).encode("utf-8")
    req = urllib.request.Request(
        f"{VOICEBOX_URL}/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
    audio_id = res_data["id"]
    raw_wav = out_wav.with_suffix(".raw.wav")
    urllib.request.urlretrieve(f"{VOICEBOX_URL}/audio/{audio_id}", str(raw_wav))
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw_wav),
            "-af",
            "atempo=1.35,apad=pad_dur=0.18",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(out_wav),
        ],
        check=True,
        capture_output=True,
    )
    raw_wav.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Synthesize broadcast TTS and compute 30fps timings")
    parser.add_argument("--config", type=Path, required=True, help="Path to story_config.json")
    parser.add_argument("--project-dir", type=Path, required=True, help="Project directory")
    parser.add_argument(
        "--voice",
        default="yuanliuwei",
        choices=["yuanliuwei", "news_anchor"],
        help="yuanliuwei (Voicebox clone, default) or news_anchor (zh-CN-YunjianNeural)",
    )
    args = parser.parse_args()

    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    scenes = cfg["scenes"]
    audio_dir = args.project_dir / "audio_segments"
    sfx_dir = args.project_dir / "sfx"
    audio_dir.mkdir(parents=True, exist_ok=True)

    generate_sfx(sfx_dir)

    scene_frames = []
    seg_files = []

    for idx, sc in enumerate(scenes):
        out_wav = audio_dir / f"seg_{idx:02d}.wav"
        text = sc["narration"]
        if args.voice == "yuanliuwei":
            synth_voicebox_segment(text, out_wav, YUAN_PROFILE_ID)
        else:
            asyncio.run(
                synth_edge_tts_segment(
                    text=text,
                    out_wav=out_wav,
                    voice=cfg.get("tts_voice", "zh-CN-YunjianNeural"),
                    rate=cfg.get("tts_rate", "+12%"),
                    pitch=cfg.get("tts_pitch", "-2Hz"),
                )
            )
        dur = get_audio_duration(out_wav)
        frames = max(90, math.ceil(dur * FPS) + 6)
        scene_frames.append(frames)
        seg_files.append(str(out_wav))
        print(f"🎙️ Scene {idx:02d}: {dur:.2f}s -> {frames} frames ({out_wav.name})")

    # Concatenate into full narration track aligned to exact scene frame boundaries
    filter_parts = []
    inputs = []
    cur_frame = 0
    for idx, wav_path in enumerate(seg_files):
        inputs.extend(["-i", wav_path])
        delay_ms = int((cur_frame / FPS) * 1000)
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")
        cur_frame += scene_frames[idx]

    mix_inputs = "".join(f"[a{i}]" for i in range(len(seg_files)))
    total_dur = cur_frame / FPS
    filter_complex = (
        ";".join(filter_parts)
        + f";{mix_inputs}amix=inputs={len(seg_files)}:normalize=0,apad=whole_dur={total_dur:.3f}[outa]"
    )
    full_voice = args.project_dir / "voice_full.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            filter_complex,
            "-map",
            "[outa]",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(full_voice),
        ],
        check=True,
        capture_output=True,
    )

    timings = {
        "fps": FPS,
        "scene_frames": scene_frames,
        "total_frames": sum(scene_frames),
        "total_duration_sec": round(sum(scene_frames) / FPS, 2),
        "voice_mode": args.voice,
    }
    timings_path = args.project_dir / "timings.json"
    timings_path.write_text(json.dumps(timings, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Saved frame-accurate timings to {timings_path} (total {timings['total_frames']} frames)")


if __name__ == "__main__":
    main()
