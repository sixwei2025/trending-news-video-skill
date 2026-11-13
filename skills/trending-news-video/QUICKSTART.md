# 3 分钟快速上手指南（QUICKSTART）

## 1. 准备工程目录与分镜配置
新建一个项目目录（例如 `~/热点视频_黄仁勋`），复制标准分镜模板：
```bash
mkdir -p ~/热点视频_黄仁勋/assets
cp ~/.agents/skills/trending-news-video/templates/story_config.example.json ~/热点视频_黄仁勋/story_config.json
```

## 2. 抓取真实新闻与股价截图
使用 `harvest_evidence.py` 自动打开无头浏览器截取无弹窗高清网页截图：
```bash
python3 ~/.agents/skills/trending-news-video/scripts/harvest_evidence.py \
  --config ~/热点视频_黄仁勋/story_config.json \
  --out-dir ~/热点视频_黄仁勋/assets
```

## 3. 一键生成新闻腔配音、节拍音效、Remotion 画面与最终成片
```bash
python3 ~/.agents/skills/trending-news-video/scripts/build_news_video.py \
  --project-dir ~/热点视频_黄仁勋 \
  --config ~/热点视频_黄仁勋/story_config.json \
  --voice news_anchor \
  --bgm ~/lab/bgm/DigitalLemonade.mp3
```

## 4. 自动质检与提交本地视频中心
```bash
python3 ~/.agents/skills/trending-news-video/scripts/audit_news_video.py \
  --video ~/热点视频_黄仁勋/output_final.mp4 \
  --cover ~/热点视频_黄仁勋/cover.png

python3 ~/.agents/skills/trending-news-video/scripts/push_video_hub.py \
  --video ~/热点视频_黄仁勋/output_final.mp4 \
  --cover ~/热点视频_黄仁勋/cover.png \
  --title "黄仁勋辞职背后中美AI算力切割" \
  --desc "深度拆解表面风波背后的大国算力博弈与商业真相" \
  --topics "黄仁勋,英伟达,AI算力,芯片,科技商业"
```
