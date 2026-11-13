#!/usr/bin/env python3
"""
Step 1: Live Evidence Harvester (Playwright + Wikimedia Commons)
Automatically captures clean, popup-free high-DPI news/stock screenshots and real documentary photos.
"""
import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

CLEANUP_CSS = """
  #onetrust-consent-sdk, .onetrust-pc-dark-filter, [id*="cookie"], [class*="cookie"],
  [id*="consent"], [class*="consent"], [class*="popup"], [class*="modal"],
  header, footer, nav, aside, .ad, [class*="banner"] {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
"""


def download_file(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = resp.read()
    if len(data) < 1024:
        raise ValueError(f"Downloaded file too small ({len(data)} bytes): {url}")
    dest.write_bytes(data)
    print(f"✅ Downloaded image: {dest.name} ({len(data) // 1024} KB)")


def capture_web_screenshots(sources: list, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    mjs_code = f"""
import {{ chromium }} from 'playwright';
const sources = {json.dumps(sources, ensure_ascii=False)};
const cleanCss = {json.dumps(CLEANUP_CSS)};

(async () => {{
  const browser = await chromium.launch({{ headless: true }});
  const context = await browser.newContext({{
    viewport: {{ width: 1280, height: 900 }},
    deviceScaleFactor: 2,
    locale: 'zh-CN',
  }});
  for (const item of sources) {{
    if (item.type !== 'web_screenshot') continue;
    const page = await context.newPage();
    try {{
      await page.goto(item.url, {{ waitUntil: 'domcontentloaded', timeout: 25000 }});
      await page.addStyleTag({{ content: cleanCss }});
      await page.waitForTimeout(item.wait_ms || 1800);
      if (item.scroll_y) {{
        await page.evaluate((y) => window.scrollTo(0, y), item.scroll_y);
        await page.waitForTimeout(400);
      }}
      await page.screenshot({{ path: item.out_path, fullPage: false }});
      console.log('✅ Captured screenshot:', item.out_path);
    }} catch (err) {{
      console.error('⚠️ Failed screenshot:', item.url, err.message);
    }} finally {{
      await page.close();
    }}
  }}
  await browser.close();
}})();
"""
    tmp_mjs = out_dir / "_capture_runner.mjs"
    tmp_mjs.write_text(mjs_code, encoding="utf-8")
    try:
        subprocess.run(["node", str(tmp_mjs)], check=True)
    finally:
        if tmp_mjs.exists():
            tmp_mjs.unlink()


def main():
    parser = argparse.ArgumentParser(description="Harvest clean news screenshots and documentary photos")
    parser.add_argument("--config", type=Path, required=True, help="Path to story_config.json")
    parser.add_argument("--out-dir", type=Path, required=True, help="Output assets directory")
    args = parser.parse_args()

    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    evidence_list = cfg.get("evidence_sources", [])
    if not evidence_list:
        print("ℹ️ No evidence_sources specified in config; skipping download.")
        return

    web_items = []
    for item in evidence_list:
        out_path = args.out_dir / item["filename"]
        if item.get("type") == "direct_image":
            download_file(item["url"], out_path)
        elif item.get("type") == "web_screenshot":
            item_copy = dict(item)
            item_copy["out_path"] = str(out_path.resolve())
            web_items.append(item_copy)

    if web_items:
        capture_web_screenshots(web_items, args.out_dir)


if __name__ == "__main__":
    main()
