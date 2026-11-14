#!/usr/bin/env python3
"""
Step 2: Voicebox / Broadcast Audio, Fast-Cut Sub-Shot Cues & Procedural SFX Engine
Synthesizes Yuan Liuwei Voicebox clone voice (default) or broadcast news anchor voice,
trims internal TTS pauses so 8 investigative segments stay crisp (<60s),
computes exact sub-shot cue timestamps (24-28 shots, ~2.1s/shot), and generates SFX.
"""
import argparse
import asyncio
import json
import math
import random
import struct
import subprocess
import time
import urllib.request
import wave
from pathlib import Path

FPS = 30
SR = 48000
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
            click = math.exp(-t * 90) * (random.random() * 2 - 1) * 0.35
            val = (math.sin(2 * math.pi * freq * t) * env * 0.72 + click) * 32767
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
            val = band * env * 0.26 * 32767
            w.writeframesraw(struct.pack("<h", max(-32767, min(32767, int(val)))))

    # 3. whoosh.wav: Smooth camera push-in transition
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
            val = (mod * 0.4 + noise * 0.6) * env * 0.24 * 32767
            w.writeframesraw(struct.pack("<h", max(-32767, min(32767, int(val)))))

    print(f"✅ Generated procedural SFX in {sfx_dir}")


async def synth_edge_tts_raw(text: str, raw_wav: Path, voice: str, rate: str, pitch: str):
    import edge_tts

    mp3_tmp = raw_wav.with_suffix(".mp3")
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
            await comm.save(str(mp3_tmp))
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(mp3_tmp), "-ar", str(SR), "-ac", "1", str(raw_wav)],
                check=True,
                capture_output=True,
            )
            mp3_tmp.unlink(missing_ok=True)
            return
        except Exception as e:
            if attempt == 3:
                raise RuntimeError(f"edge-tts failed after 4 attempts: {e}") from e
            await asyncio.sleep(1.5 * (attempt + 1))


def synth_voicebox_raw(text: str, raw_wav: Path, profile_id: str):
    if raw_wav.exists() and raw_wav.stat().st_size > 1000:
        return
    payload = json.dumps(
        {"profile_id": profile_id, "text": text, "language": "zh", "normalize": True, "seed": 42}
    ).encode("utf-8")

    # 1. Try streaming endpoint first for immediate binary return
    req_stream = urllib.request.Request(
        f"{VOICEBOX_URL}/generate/stream",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req_stream, timeout=300) as resp:
            if resp.status == 200:
                raw_wav.write_bytes(resp.read())
                return
    except Exception:
        pass

    # 2. Fallback to async job + /history/{id} polling
    req = urllib.request.Request(
        f"{VOICEBOX_URL}/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        job = json.loads(resp.read().decode("utf-8"))
    gid = job["id"]
    t0 = time.time()
    while time.time() - t0 < 300:
        with urllib.request.urlopen(f"{VOICEBOX_URL}/history/{gid}", timeout=30) as r:
            hist = json.loads(r.read().decode("utf-8"))
        if hist.get("status") in ("completed", "done"):
            with urllib.request.urlopen(f"{VOICEBOX_URL}/audio/{gid}", timeout=120) as ar:
                raw_wav.write_bytes(ar.read())
                return
        time.sleep(1.5)
    raise RuntimeError(f"Voicebox synthesis timed out for job {gid}")


def process_segment_wav(raw_wav: Path, proc_wav: Path, tempo: float):
    af = (
        "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.02"
        ":stop_periods=-1:stop_duration=0.14:stop_threshold=-40dB,"
        "areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03,areverse,"
        f"atempo={tempo:.3f},aresample={SR}"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(raw_wav), "-af", af, "-ac", "1", str(proc_wav)],
        check=True,
        capture_output=True,
    )


def normalize_segments_from_config(cfg: dict) -> list:
    """Supports v2.0 `segments` (with multi-shot `shots` array) and v1.x `scenes`."""
    if "segments" in cfg:
        return cfg["segments"]

    # Upgrade legacy v1.x `scenes` automatically
    upgraded = []
    for idx, sc in enumerate(cfg.get("scenes", [])):
        narration = sc.get("narration", "")
        # Split long narration into <=16 char clauses if no shots provided
        raw_clauses = [c.strip() for c in narration.replace("！", "！|").replace("？", "？|").replace("。", "。|").replace("，", "，|").replace("；", "；|").split("|") if c.strip()]
        merged = []
        for c in raw_clauses:
            clean = c.rstrip("，。；")
            if merged and len(merged[-1]) + 1 + len(clean) <= 15:
                merged[-1] = f"{merged[-1]}，{clean}"
            else:
                merged.append(clean[:17])
        if not merged:
            merged = [sc.get("headline", "深度调查取证")[:17]]
        ratio = round(1.0 / len(merged), 4)
        shots = []
        for s_i, line in enumerate(merged):
            has_hl = bool(sc.get("highlights")) and s_i == 0
            shots.append(
                {
                    "ratio": ratio,
                    "text": line,
                    "sceneType": "spotlight_doc" if has_hl else "real_media",
                    "asset": sc.get("asset", ""),
                    "highlights": sc.get("highlights") if has_hl else None,
                    "badge": sc.get("badge") if s_i == 0 else None,
                    "zoomFrom": 1.04 + (s_i % 2) * 0.08,
                    "zoomTo": 1.20 + (s_i % 2) * 0.12,
                }
            )
        upgraded.append(
            {
                "id": sc.get("id", f"seg_{idx+1:02d}"),
                "narration": narration,
                "tts": sc.get("tts", narration),
                "pause": 0.15 if idx < len(cfg.get("scenes", [])) - 1 else 0.0,
                "shots": shots,
            }
        )
    return upgraded


def main():
    parser = argparse.ArgumentParser(description="Synthesize Voicebox/broadcast TTS, sub-shot cues, and SFX")
    parser.add_argument("--config", type=Path, required=True, help="Path to story_config.json")
    parser.add_argument("--project-dir", type=Path, required=True, help="Project working directory")
    parser.add_argument(
        "--voice",
        default="yuanliuwei",
        choices=["yuanliuwei", "news_anchor"],
        help="yuanliuwei (Voicebox clone, default) or news_anchor (zh-CN-YunjianNeural)",
    )
    parser.add_argument("--tempo", type=float, default=None, help="Speech tempo multiplier (default 1.44 for Voicebox)")
    args = parser.parse_args()

    random.seed(42)
    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    segments = normalize_segments_from_config(cfg)

    audio_dir = args.project_dir / "audio_segments"
    raw_dir = audio_dir / "raw"
    proc_dir = audio_dir / "proc"
    sfx_dir = args.project_dir / "sfx"
    raw_dir.mkdir(parents=True, exist_ok=True)
    proc_dir.mkdir(parents=True, exist_ok=True)

    generate_sfx(sfx_dir)

    tempo = args.tempo or float(cfg.get("tempo", 1.50 if args.voice == "yuanliuwei" else 1.12))
    lead_sec = float(cfg.get("lead_in_sec", 0.16))
    tail_pad = float(cfg.get("tail_pad_sec", 0.30))
    target_max_sec = float(cfg.get("target_max_sec", 59.0))

    # First ensure all raw WAVs exist
    for idx, seg in enumerate(segments):
        seg_id = seg.get("id", f"{idx+1:02d}")
        narration = seg["narration"]
        tts_text = seg.get("tts", narration)
        raw_wav = raw_dir / f"{seg_id}.wav"
        if args.voice == "yuanliuwei":
            synth_voicebox_raw(tts_text, raw_wav, cfg.get("voicebox_profile_id", YUAN_PROFILE_ID))
        else:
            if not raw_wav.exists() or raw_wav.stat().st_size < 1000:
                asyncio.run(
                    synth_edge_tts_raw(
                        text=tts_text,
                        raw_wav=raw_wav,
                        voice=cfg.get("tts_voice", "zh-CN-YunjianNeural"),
                        rate=cfg.get("tts_rate", "+8%"),
                        pitch=cfg.get("tts_pitch", "-2Hz"),
                    )
                )

    def build_timeline_at_tempo(use_tempo: float):
        loc_parts = []
        lead_wav = proc_dir / "lead.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{lead_sec:.3f}", str(lead_wav)],
            check=True,
            capture_output=True,
        )
        loc_parts.append(lead_wav)
        t_cursor = lead_sec
        loc_tl = []
        loc_frames = []
        for idx, seg in enumerate(segments):
            seg_id = seg.get("id", f"{idx+1:02d}")
            narration = seg["narration"]
            pause = float(seg.get("pause", 0.14 if idx < len(segments) - 1 else 0.0))
            raw_wav = raw_dir / f"{seg_id}.wav"
            proc_wav = proc_dir / f"{seg_id}.wav"
            process_segment_wav(raw_wav, proc_wav, tempo=use_tempo)
            dur = get_audio_duration(proc_wav)
            loc_tl.append(
                {
                    "id": seg_id,
                    "start": round(t_cursor, 3),
                    "end": round(t_cursor + dur, 3),
                    "dur": round(dur, 3),
                    "narration": narration,
                }
            )
            loc_parts.append(proc_wav)
            t_cursor += dur
            loc_frames.append(max(30, round((dur + pause) * FPS)))
            if pause > 0:
                gap_wav = proc_dir / f"gap_{seg_id}.wav"
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-f",
                        "lavfi",
                        "-i",
                        f"anullsrc=r={SR}:cl=mono",
                        "-t",
                        f"{pause:.3f}",
                        str(gap_wav),
                    ],
                    check=True,
                    capture_output=True,
                )
                loc_parts.append(gap_wav)
                t_cursor += pause
        return loc_parts, loc_tl, loc_frames, t_cursor

    eff_tempo = tempo if args.voice == "yuanliuwei" else 1.06
    parts, timeline, scene_frames, est_voice_dur = build_timeline_at_tempo(eff_tempo)
    if args.tempo is None and (est_voice_dur + tail_pad) > target_max_sec:
        speech_only = sum(x["dur"] for x in timeline)
        non_speech = est_voice_dur - speech_only + tail_pad
        needed_speech = max(10.0, target_max_sec - 1.2 - non_speech)
        boosted = min(1.62, eff_tempo * (speech_only / needed_speech))
        if boosted > eff_tempo + 0.01:
            print(
                f"⚡ Auto-calibrating tempo {eff_tempo:.2f}x -> {boosted:.2f}x so total stays inside {target_max_sec:.0f}s golden window"
            )
            eff_tempo = boosted
            parts, timeline, scene_frames, est_voice_dur = build_timeline_at_tempo(eff_tempo)

    for x in timeline:
        print(f"🎙️ Segment {x['id']}: {x['dur']:.2f}s ({x['start']:.2f}s -> {x['end']:.2f}s)")

    list_txt = proc_dir / "concat_list.txt"
    list_txt.write_text("".join(f"file '{p.resolve()}'\n" for p in parts), encoding="utf-8")

    concat_wav = proc_dir / "concat_raw.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_txt), "-c", "copy", str(concat_wav)],
        check=True,
        capture_output=True,
    )

    full_voice = args.project_dir / "voice_full.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(concat_wav),
            "-af",
            f"loudnorm=I=-15:TP=-1.5:LRA=11,aresample={SR}",
            "-ac",
            "1",
            str(full_voice),
        ],
        check=True,
        capture_output=True,
    )
    voice_dur = get_audio_duration(full_voice)
    total_video_dur = round(voice_dur + tail_pad, 3)

    # Build sub-shot cues from segments
    cues = []
    for idx, seg in enumerate(segments):
        seg_tl = timeline[idx]
        seg_start = 0.12 if idx == 0 else seg_tl["start"]
        seg_end = timeline[idx + 1]["start"] if idx + 1 < len(segments) else total_video_dur
        span = max(0.2, seg_end - seg_start)
        shots = seg.get("shots") or []
        ratio_sum = sum(float(s.get("ratio", 1.0)) for s in shots) or 1.0
        cur_s = seg_start
        for s_i, shot in enumerate(shots):
            norm_r = float(shot.get("ratio", 1.0)) / ratio_sum
            nxt_s = seg_end if s_i == len(shots) - 1 else round(cur_s + span * norm_r, 3)
            line_text = str(shot["text"]).strip()
            if "\n" in line_text or len(line_text) > 18:
                raise ValueError(
                    f"Subtitle must be single-line and <=18 chars (got {len(line_text)} chars): '{line_text}'"
                )
            cue = {
                "id": f"{seg_tl['id']}_{s_i+1}",
                "segmentIndex": idx,
                "start": round(cur_s, 3),
                "end": nxt_s,
                "text": line_text,
                "sceneType": shot.get("sceneType", "real_media"),
            }
            for k in (
                "asset",
                "zoomFrom",
                "zoomTo",
                "panX",
                "panY",
                "highlights",
                "highlightBox",
                "badge",
                "firewallCard",
                "ctaCard",
            ):
                if shot.get(k) is not None:
                    cue[k] = shot[k]
            cues.append(cue)
            cur_s = nxt_s

    timings = {
        "fps": FPS,
        "voice_mode": args.voice,
        "tempo": tempo,
        "voice_duration_sec": round(voice_dur, 3),
        "total_duration_sec": total_video_dur,
        "total_frames": round(total_video_dur * FPS),
        "scene_frames": scene_frames,
        "segments": timeline,
        "shot_count": len(cues),
    }
    (args.project_dir / "timings.json").write_text(json.dumps(timings, indent=2, ensure_ascii=False), encoding="utf-8")

    remotion_props = {
        "totalDurationSec": total_video_dur,
        "cover": cfg.get("cover", {}),
        "cues": cues,
    }
    (args.project_dir / "remotion_props.json").write_text(
        json.dumps(remotion_props, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(
        f"✅ Voice & Cues ready: {total_video_dur:.2f}s total | {len(cues)} fast-cut shots "
        f"(avg {total_video_dur / max(1, len(cues)):.2f}s/shot)"
    )


if __name__ == "__main__":
    main()
