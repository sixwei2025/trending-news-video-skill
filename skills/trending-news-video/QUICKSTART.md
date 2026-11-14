# 3 分钟快速上手指南（QUICKSTART · v2.0）

## 1. 准备工程目录与 26 镜数据驱动配置
新建一个项目目录（例如 `~/热点视频_黄仁勋`），复制标准 26 镜快切模板：
```bash
mkdir -p ~/热点视频_黄仁勋/assets
cp ~/.agents/skills/trending-news-video/templates/story_config.example.json ~/热点视频_黄仁勋/story_config.json
```

## 2. 抓取真实视频、高清人物照与无弹窗新闻/SEC截图
使用 `harvest_evidence.py` 自动下载实拍视频片段并调用本机无头 Chrome 截取无弹窗高清网页证据（抓取后请打开图片检查像素，确保无遮挡弹窗）：
```bash
python3 ~/.agents/skills/trending-news-video/scripts/harvest_evidence.py \
  --config ~/热点视频_黄仁勋/story_config.json \
  --out-dir ~/热点视频_黄仁勋/assets
```

## 3. 一键合成袁六伟原声、节拍音效、3:4 封面与 16:9 快切成片
```bash
python3 ~/.agents/skills/trending-news-video/scripts/build_news_video.py \
  --project-dir ~/热点视频_黄仁勋 \
  --config ~/热点视频_黄仁勋/story_config.json \
  --voice yuanliuwei \
  --bgm ~/lab/bgm/DigitalLemonade.mp3
```
> 若需使用财经新闻播音腔，可将 `--voice yuanliuwei` 替换为 `--voice news_anchor`。

## 4. 六项自动质检与一键提交本地视频中心
`build_news_video.py` 末尾已自动调用 `audit_news_video.py` 完成画幅、时长、单行字幕、侧链闪避分贝与 `qa/` 关键帧抽检。肉眼确认 `qa/` 抽帧无误后，一键提交本地视频中心：
```bash
python3 ~/.agents/skills/trending-news-video/scripts/push_video_hub.py \
  --video ~/热点视频_黄仁勋/output_final.mp4 \
  --cover ~/热点视频_黄仁勋/cover_3x4.jpg \
  --title "黄仁勋亏惨出局万亿信托底牌太狠了" \
  --desc "表面看丢了CEO、近8亿期权作废；翻开SEC底层档案才发现1995年早就锁死万亿家族信托防火墙！" \
  --topics "黄仁勋,英伟达,商业认知,家族信托,AI自动化"
```
