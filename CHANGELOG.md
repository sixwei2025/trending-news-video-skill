# 更新日志（CHANGELOG）

## v1.1.0 · 2026-11-13

- **核心升级**：
  - 默认启用本地 Voicebox 袁六伟本人克隆音色（`--voice yuanliuwei`），同时兼容 `--voice news_anchor` 新闻播报腔切换。
  - 新增顶部 8 段式进度条下的「深度商业调查档案 · 实时帧时间码 HUD（`TC 00:xx:xx:xx`）」。
  - 新增 Vox 风格实时跳动数据计数器（如股价盘中跳水百分比、单日蒸发市值动态跳动）与 72 小时闪电时间轴组件。
  - 优化 `SpotlightDoc` 聚光灯平滑推拉运镜（Connected Pan），针对宽幅高亮框增加自适应安全缩放上限，消除边缘文字裁剪。
  - 修复 FFmpeg `sidechaincompress` + `amix` 音轨分流（`asplit=2`），确保原声干声、16 处节拍音效与侧链闪避背景音乐稳定输出 `-15 LUFS`（实测 `mean_volume: -17.4 dB`）。
- **兼容说明**：保持 CLI 参数与 `story_config.json` 结构向后兼容。

## v1.0.0 · 2026-11-13

- 首次发布 `trending-news-video`（汇芯·热点新闻深扒视频总控），包含多源真实网页无弹窗截图、三层商业博弈分镜、Remotion 聚光灯灰化划重点渲染、节拍音效混音与四重自动质检。
