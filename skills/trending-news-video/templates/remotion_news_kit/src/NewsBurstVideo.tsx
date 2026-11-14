import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {CoverConfig, CoverDesign} from './Cover';
import {SpotlightDoc} from './components/SpotlightDoc';
import {CtaQuestionShot, CueItem, FirewallCardShot, RealMediaShot, RealVideoShot} from './Scenes';

const BRAND_RED = '#C8102E';

export interface NewsBurstVideoProps {
  totalDurationSec: number;
  cover?: CoverConfig;
  cues: CueItem[];
}

export const NewsBurstVideo: React.FC<NewsBurstVideoProps> = ({totalDurationSec, cover, cues}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const nowSec = frame / fps;
  const coverFrames = Math.max(3, Math.round(0.12 * fps));

  const activeCue =
    cues.find((c) => nowSec >= c.start && nowSec < c.end) ||
    (nowSec >= (cues[cues.length - 1]?.start ?? 999) ? cues[cues.length - 1] : undefined);
  const progressPct = Math.min(100, (frame / Math.max(1, durationInFrames - 1)) * 100);

  return (
    <AbsoluteFill style={{backgroundColor: '#0A0A0C', fontFamily: '"PingFang SC", "Noto Sans SC", sans-serif'}}>
      {/* 0.00s - 0.12s: 第 0.01 帧内嵌 3:4 安全区封面，分发平台自动抓取首帧 */}
      <Sequence from={0} durationInFrames={coverFrames}>
        <CoverDesign mode="16x9" cover={cover} />
      </Sequence>

      {/* 高频快切真实视频 / 聚光灯公文 / 新闻证据镜头流（约 2 秒一换） */}
      {cues.map((cue, i) => {
        const startFrame = i === 0 ? coverFrames : Math.round(cue.start * fps);
        const nextStartSec = i + 1 < cues.length ? cues[i + 1].start : totalDurationSec;
        const endFrame = Math.max(startFrame + 1, Math.round(nextStartSec * fps));

        let content: React.ReactNode = null;
        if (cue.sceneType === 'real_video' && cue.asset) {
          content = (
            <RealVideoShot
              src={cue.asset}
              zoomFrom={cue.zoomFrom ?? 1.02}
              zoomTo={cue.zoomTo ?? 1.12}
              badge={cue.badge}
            />
          );
        } else if (cue.sceneType === 'spotlight_doc' && cue.asset) {
          content = (
            <SpotlightDoc
              src={cue.asset}
              highlights={cue.highlights || []}
              badge={cue.badge}
              zoomFrom={cue.zoomFrom ?? 1.08}
              zoomTo={cue.zoomTo ?? 1.34}
              panX={cue.panX ?? [0, 0]}
              panY={cue.panY ?? [0, 0]}
            />
          );
        } else if (cue.sceneType === 'firewall_card') {
          content = <FirewallCardShot data={cue.firewallCard} />;
        } else if (cue.sceneType === 'cta_question') {
          content = <CtaQuestionShot data={cue.ctaCard} />;
        } else {
          content = (
            <RealMediaShot
              src={cue.asset || 'portrait.png'}
              zoomFrom={cue.zoomFrom ?? 1.06}
              zoomTo={cue.zoomTo ?? 1.22}
              panX={cue.panX ?? [0, 0]}
              panY={cue.panY ?? [0, 0]}
              highlightBox={cue.highlightBox}
              highlights={cue.highlights}
              badge={cue.badge}
            />
          );
        }

        return (
          <Sequence key={cue.id} from={startFrame} durationInFrames={endFrame - startFrame}>
            {content}
          </Sequence>
        );
      })}

      {/* 顶部汇芯品牌红进度条 */}
      {frame >= coverFrames && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <div style={{height: '100%', width: `${progressPct}%`, backgroundColor: BRAND_RED}} />
        </div>
      )}

      {/* 严格单行底部主字幕（绝不换行） */}
      {frame >= coverFrames && activeCue && (
        <div
          style={{
            position: 'absolute',
            bottom: 42,
            left: 60,
            right: 60,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(10, 10, 12, 0.90)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderBottom: `3.5px solid ${BRAND_RED}`,
              borderRadius: 12,
              padding: '12px 34px',
              color: '#FFFFFF',
              fontSize: 38,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 30px rgba(0,0,0,0.75)',
            }}
          >
            {activeCue.text}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
