#!/usr/bin/env python3
"""
Step 1: Live Evidence Harvester (Playwright + Wikimedia Commons + Video/GIF 1080p Converter)
Automatically captures popup-free 1920x1080 news/SEC/stock screenshots, high-res photos,
and converts real documentary video/GIF clips into 1920x1080 30fps MP4 clips.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

CLEANUP_CSS = """
  #onetrust-consent-sdk, .onetrust-pc-dark-filter, [id*="cookie"], [class*="cookie"],
  [id*="consent"], [class*="consent"], [class*="popup"], [class*="modal"], [class*="dialog"],
  [class*="qrcode"], [id*="qrcode"], [class*="app-open"], [class*="login-pop"],
  .ad, .ads, [class*="banner"] {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
"""

CLEANUP_JS = """
() => {
  const all = Array.from(document.querySelectorAll('div, section, aside, iframe'));
  for (const el of all) {
    const st = window.getComputedStyle(el);
    const z = parseInt(st.zIndex || '0', 10);
    const rect = el.getBoundingClientRect();
    if ((st.position === 'fixed' || st.position === 'sticky') && (z >= 50 || rect.width < 420 || rect.height < 260)) {
      el.remove();
    }
  }
}
"""

UA_CHROME = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)
UA_WIKI = "HuixinMediaBot/2.0 (https://github.com/sixwei2025; contact@huixin.ai)"


def wiki_file_url(title: str, width: int = 1920) -> str:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": width,
            "format": "json",
        }
    )
    req = urllib.request.Request(f"https://commons.wikimedia.org/w/api.php?{q}", headers={"User-Agent": UA_WIKI})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode("utf-8"))
    for _, page in data.get("query", {}).get("pages", {}).items():
        ii = (page.get("imageinfo") or [{}])[0]
        if title.lower().endswith((".webm", ".ogv", ".mp4")):
            return ii.get("url", "")
        return ii.get("thumburl") or ii.get("url", "")
    return ""


def download_file(url: str, dest: Path, max_mb: int = 45):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 2048:
        print(f"♻️  Cached: {dest.name} ({dest.stat().st_size // 1024} KB)")
        return
    ua = UA_WIKI if "wikimedia.org" in url else UA_CHROME
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    max_bytes = max_mb * 1024 * 1024
    total = 0
    chunks = []
    with urllib.request.urlopen(req, timeout=35) as resp:
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > max_bytes:
                raise ValueError(f"File exceeds {max_mb}MB safety cap: {url}")
    data = b"".join(chunks)
    if len(data) < 1024:
        raise ValueError(f"Downloaded file too small ({len(data)} bytes): {url}")
    dest.write_bytes(data)
    print(f"✅ Downloaded: {dest.name} ({len(data) // 1024} KB)")


def convert_to_1080p_mp4(src: Path, dst: Path, start_sec: float = 0.0, duration_sec: float = 4.5):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.stat().st_size > 20000:
        print(f"♻️  Cached 1080p clip: {dst.name}")
        return
    vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p"
    cmd = ["ffmpeg", "-y"]
    if start_sec > 0:
        cmd += ["-ss", str(start_sec)]
    cmd += [
        "-i",
        str(src),
        "-t",
        str(duration_sec),
        "-an",
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        str(dst),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"🎬 Converted 1080p MP4 clip: {dst.name} ({dst.stat().st_size // 1024} KB)")


def capture_web_screenshots_python(sources: list):
    from playwright.sync_api import sync_playwright

    chrome_mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    launch_kwargs = {"headless": True}
    if os.path.exists(chrome_mac):
        launch_kwargs["executable_path"] = chrome_mac

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(**launch_kwargs)
        except Exception:
            browser = p.chromium.launch(headless=True)

        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.5,
            locale="zh-CN",
            user_agent=UA_CHROME,
        )
        for item in sources:
            page = ctx.new_page()
            try:
                page.goto(item["url"], wait_until="domcontentloaded", timeout=25000)
                page.add_style_tag(content=CLEANUP_CSS)
                if item.get("zoom"):
                    page.add_style_tag(content=f"body {{ zoom: {item['zoom']}; }}")
                page.wait_for_timeout(item.get("wait_ms", 1800))
                page.evaluate(CLEANUP_JS)
                if item.get("scroll_y"):
                    page.evaluate("(y) => window.scrollTo(0, y)", item["scroll_y"])
                    page.wait_for_timeout(400)
                if item.get("scroll_to_text"):
                    page.evaluate(
                        """(kw) => {
                            const els = Array.from(document.querySelectorAll('td, p, h1, h2, h3, span, div'));
                            const hit = els.find(el => el.innerText && el.innerText.includes(kw));
                            if (hit) hit.scrollIntoView({block: 'center'});
                        }""",
                        item["scroll_to_text"],
                    )
                    page.wait_for_timeout(400)
                Path(item["out_path"]).parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=item["out_path"], full_page=False)
                print(f"✅ Captured clean screenshot: {Path(item['out_path']).name}")
            except Exception as err:
                print(f"⚠️  Failed screenshot ({item['url']}): {err}")
            finally:
                page.close()
        browser.close()


def capture_web_screenshots(sources: list, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        import playwright  # noqa: F401

        capture_web_screenshots_python(sources)
        return
    except ImportError:
        pass

    # Fallback to local video-hub venv python if present
    vh_py = Path.home() / "video-hub/.venv/bin/python"
    if vh_py.exists() and Path(sys.executable).resolve() != vh_py.resolve():
        tmp_manifest = out_dir / "_web_sources.json"
        tmp_manifest.write_text(json.dumps({"evidence_sources": sources}, ensure_ascii=False), encoding="utf-8")
        try:
            subprocess.run(
                [str(vh_py), str(Path(__file__).resolve()), "--config", str(tmp_manifest), "--out-dir", str(out_dir)],
                check=True,
            )
            return
        finally:
            tmp_manifest.unlink(missing_ok=True)

    raise RuntimeError(
        "Playwright is not installed in the active Python environment. "
        "Run `pip install playwright` (uses local Google Chrome automatically on macOS)."
    )


def main():
    parser = argparse.ArgumentParser(description="Harvest clean 1080p news screenshots, photos, and real video clips")
    parser.add_argument("--config", type=Path, required=True, help="Path to story_config.json or manifest.json")
    parser.add_argument("--out-dir", type=Path, required=True, help="Output assets directory")
    args = parser.parse_args()

    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    evidence_list = cfg.get("evidence_sources", [])
    if not evidence_list:
        print("ℹ️  No evidence_sources specified in config; skipping harvest.")
        return

    args.out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = args.out_dir / "_tmp_raw"
    web_items = []

    for item in evidence_list:
        out_path = Path(item.get("out_path") or (args.out_dir / item["filename"]))
        kind = item.get("type", "direct_image")

        if kind == "direct_image":
            url = item.get("url") or (wiki_file_url(item["wiki_title"]) if item.get("wiki_title") else "")
            if url:
                download_file(url, out_path)
        elif kind == "video_or_gif":
            local_src = Path(item["local_path"]).expanduser() if item.get("local_path") else None
            if local_src and local_src.exists():
                raw_src = local_src
            else:
                url = item.get("url") or (wiki_file_url(item["wiki_title"]) if item.get("wiki_title") else "")
                if not url:
                    continue
                ext = Path(urllib.parse.urlparse(url).path).suffix or ".webm"
                raw_src = tmp_dir / f"raw_{out_path.stem}{ext}"
                download_file(url, raw_src)
            convert_to_1080p_mp4(
                raw_src,
                out_path,
                start_sec=float(item.get("start_sec", 0.0)),
                duration_sec=float(item.get("duration_sec", 4.5)),
            )
        elif kind == "web_screenshot":
            item_copy = dict(item)
            item_copy["out_path"] = str(out_path.resolve())
            web_items.append(item_copy)

    if web_items:
        capture_web_screenshots(web_items, args.out_dir)

    print("🔎 [像素核验提醒] 素材抓取完成，渲染前请逐张查看截图画面，确认无空白页、403拦截或残留弹窗遮挡正文！")


if __name__ == "__main__":
    main()
