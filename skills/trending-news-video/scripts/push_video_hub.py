#!/usr/bin/env python3
"""
Step 5: Submit verified Trending News Video to Local Video Hub (http://127.0.0.1:8765/#lib)
Creates a work item under bot="谷歌" and submits the video + cover into "confirm" (待确认) state.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

VIDEO_HUB_DIR = Path.home() / "video-hub"
HUB_PY = VIDEO_HUB_DIR / ".venv/bin/python"


def main():
    parser = argparse.ArgumentParser(description="Submit trending news video to local video-hub")
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--cover", type=Path, required=True)
    parser.add_argument("--title", required=True, help="Title <= 30 chars")
    parser.add_argument("--desc", required=True, help="Video description")
    parser.add_argument("--topics", default="热点深扒,科技商业,AI算力", help="Comma-separated topics")
    parser.add_argument("--line", default="koubo", help="Production line in video-hub")
    args = parser.parse_args()

    new_out = subprocess.check_output(
        [
            str(HUB_PY),
            "hub.py",
            "new",
            "--bot",
            "谷歌",
            "--line",
            args.line,
            "--title",
            args.title[:30],
        ],
        cwd=str(VIDEO_HUB_DIR),
        text=True,
    ).strip()
    meta = json.loads(new_out.splitlines()[-1])
    work_id = meta["work_id"]
    out_dir = Path(meta["output_dir"]).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)

    safe_name = args.title[:24].replace("/", "_").replace(" ", "_")
    dest_video = out_dir / f"{safe_name}.mp4"
    dest_cover = out_dir / f"{safe_name}{args.cover.suffix}"
    shutil.copy2(args.video, dest_video)
    shutil.copy2(args.cover, dest_cover)

    sub_out = subprocess.check_output(
        [
            str(HUB_PY),
            "hub.py",
            "submit",
            work_id,
            "--video",
            str(dest_video),
            "--cover",
            str(dest_cover),
            "--title",
            args.title[:30],
            "--desc",
            args.desc,
            "--topics",
            args.topics,
        ],
        cwd=str(VIDEO_HUB_DIR),
        text=True,
    ).strip()
    print(sub_out)


if __name__ == "__main__":
    main()
