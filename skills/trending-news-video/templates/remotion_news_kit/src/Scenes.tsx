import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {HighlightBox, SpotlightDoc} from './components/SpotlightDoc';

const BRAND_RED = '#C8102E';
const BRIGHT_RED = '#FF2A4B';
const GOLD = '#FFD166';
const GREEN = '#10B981';
const DARK_BG = '#0A0A0C';
const fontStack = '"PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif';

export interface FirewallCardData {
  bgAsset?: string;
  leftTitle: string;
  leftValue: string;
  dividerLabel?: string;
  rightTitle: string;
  rightValue: string;
  rightAccent?: 'gold' | 'green';
}

export interface CtaCardData {
  bgAsset?: string;
  eyebrow: string;
  question: string;
}

export interface CueItem {
  id: string;
  segmentIndex?: number;
  start: number;
  end: number;
  /** 严格单行短句（≤17字，绝不换行） */
  text: string;
  sceneType: 'real_video' | 'spotlight_doc' | 'real_media' | 'firewall_card' | 'cta_question';
  asset?: string;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: [number, number];
  panY?: [number, number];
  highlights?: HighlightBox[];
  highlightBox?: {left: string; top: string; width: string; height: string};
  badge?: string;
  firewallCard?: FirewallCardData;
  ctaCard?: CtaCardData;
}

function quinticOut(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - c, 5);
}

function resolveMedia(src?: string): string {
  if (!src) return staticFile('portrait.png');
  if (src.startsWith('assets/') || src.startsWith('real/')) {
    return staticFile(src);
  }
  return staticFile(`assets/${src}`);
}

/**
 * 1. 真实视频 / 动图 / 录屏镜头（最高优先级素材）
 */
export const RealVideoShot: React.FC<{
  src: string;
  zoomFrom?: number;
  zoomTo?: number;
  badge?: string;
}> = ({src, zoomFrom = 1.02, zoomTo = 1.12, badge}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = quinticOut(frame / Math.max(1, durationInFrames - 1));
  const z = interpolate(progress, [0, 1], [zoomFrom, zoomTo]);

  return (
    <AbsoluteFill style={{backgroundColor: DARK_BG, overflow: 'hidden'}}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${z})`,
          transformOrigin: 'center center',
        }}
      >
        <OffthreadVideo
          src={resolveMedia(src)}
          muted
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(10,10,12,0.88) 0%, rgba(10,10,12,0.16) 28%, rgba(10,10,12,0.05) 100%)',
          pointerEvents: 'none',
        }}
      />

      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: 48,
            backgroundColor: 'rgba(10,10,12,0.86)',
            borderLeft: `5px solid ${BRAND_RED}`,
            padding: '8px 20px',
            borderRadius: 8,
            color: '#FFF',
            fontSize: 22,
            fontWeight: 600,
            fontFamily: fontStack,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * 2. 真实高清照片 / K线行情 / 新闻镜头（五次平滑曲线推拉平移 + 可选红框聚焦）
 */
export const RealMediaShot: React.FC<{
  src: string;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: [number, number];
  panY?: [number, number];
  highlightBox?: {left: string; top: string; width: string; height: string};
  highlights?: HighlightBox[];
  badge?: string;
}> = ({
  src,
  zoomFrom = 1.06,
  zoomTo = 1.22,
  panX = [0, 0],
  panY = [0, 0],
  highlightBox,
  highlights,
  badge,
}) => {
  // 若传入了 highlights 数组，自动升级为聚光灯灰化 + 原彩透出组件
  if (highlights && highlights.length > 0) {
    return (
      <SpotlightDoc
        src={src}
        highlights={highlights}
        badge={badge}
        zoomFrom={zoomFrom}
        zoomTo={zoomTo}
        panX={panX}
        panY={panY}
      />
    );
  }

  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const rawT = frame / Math.max(1, durationInFrames - 1);
  const eased = quinticOut(Math.min(1, rawT * 1.18));
  const z = interpolate(eased, [0, 1], [zoomFrom, zoomTo]);
  const x = interpolate(eased, [0, 1], panX);
  const y = interpolate(eased, [0, 1], panY);
  const boxPop = spring({frame: Math.max(0, frame - 4), fps: 30, config: {damping: 13}});

  return (
    <AbsoluteFill style={{backgroundColor: DARK_BG, overflow: 'hidden'}}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${z}) translate(${x}%, ${y}%)`,
          transformOrigin: 'center center',
          position: 'relative',
        }}
      >
        <Img
          src={resolveMedia(src)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {highlightBox && (
          <div
            style={{
              position: 'absolute',
              left: highlightBox.left,
              top: highlightBox.top,
              width: highlightBox.width,
              height: highlightBox.height,
              border: `5px solid ${BRIGHT_RED}`,
              borderRadius: 12,
              backgroundColor: 'rgba(200,16,46,0.14)',
              boxShadow: '0 0 36px rgba(255,42,75,0.75)',
              opacity: boxPop,
              transform: `scale(${interpolate(boxPop, [0, 1], [1.08, 1])})`,
            }}
          />
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(10,10,12,0.88) 0%, rgba(10,10,12,0.18) 28%, rgba(10,10,12,0.06) 100%)',
          pointerEvents: 'none',
        }}
      />

      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: 48,
            backgroundColor: 'rgba(10,10,12,0.86)',
            borderLeft: `5px solid ${BRAND_RED}`,
            padding: '8px 20px',
            borderRadius: 8,
            color: '#FFF',
            fontSize: 22,
            fontWeight: 600,
            fontFamily: fontStack,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * 3. 极简点睛对比/隔离卡（全片不超过 2 处，真实照片灰化压暗打底，每侧 ≤12 字）
 */
export const FirewallCardShot: React.FC<{data?: FirewallCardData}> = ({data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 13}});
  const shieldGlow = interpolate(Math.sin(frame * 0.25), [-1, 1], [0.55, 1]);

  const d: FirewallCardData = data || {
    leftTitle: '表面头衔 / 工牌',
    leftValue: '一夜剥离',
    dividerLabel: '底层防火墙',
    rightTitle: '结构化核心资产',
    rightValue: '稳坐钓鱼台',
    rightAccent: 'gold',
  };
  const accentColor = d.rightAccent === 'green' ? GREEN : GOLD;

  return (
    <AbsoluteFill style={{backgroundColor: DARK_BG, fontFamily: fontStack}}>
      {d.bgAsset && (
        <Img
          src={resolveMedia(d.bgAsset)}
          style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.90) brightness(0.22)'}}
        />
      )}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 90,
          opacity: pop,
          transform: `scale(${interpolate(pop, [0, 1], [0.88, 1])})`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
          <div
            style={{
              width: 480,
              height: 320,
              backgroundColor: 'rgba(24,24,28,0.92)',
              border: '2px solid rgba(255,255,255,0.22)',
              borderRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
            }}
          >
            <div style={{fontSize: 34, color: 'rgba(255,255,255,0.65)', fontWeight: 500}}>{d.leftTitle}</div>
            <div style={{fontSize: 58, color: BRIGHT_RED, fontWeight: 900, marginTop: 18}}>{d.leftValue}</div>
          </div>

          {d.dividerLabel && (
            <div
              style={{
                padding: '28px 26px',
                borderRadius: 20,
                backgroundColor: BRAND_RED,
                boxShadow: `0 0 48px rgba(200,16,46,${shieldGlow})`,
                color: '#FFF',
                fontSize: 32,
                fontWeight: 900,
                writingMode: 'vertical-rl',
                letterSpacing: 6,
              }}
            >
              {d.dividerLabel}
            </div>
          )}

          <div
            style={{
              width: 520,
              height: 320,
              backgroundColor: 'rgba(18,34,28,0.94)',
              border: `3px solid ${accentColor}`,
              borderRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
            }}
          >
            <div style={{fontSize: 34, color: accentColor, fontWeight: 600}}>{d.rightTitle}</div>
            <div style={{fontSize: 58, color: '#FFF', fontWeight: 900, marginTop: 18}}>{d.rightValue}</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * 4. 结尾灵魂反问卡（引发评论区站队与老板转发）
 */
export const CtaQuestionShot: React.FC<{data?: CtaCardData}> = ({data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 14}});

  const d: CtaCardData = data || {
    eyebrow: '留给每位创业者的灵魂拷问',
    question: '离开工位 7 天，你的系统还能自己转吗？',
  };

  return (
    <AbsoluteFill style={{backgroundColor: DARK_BG, fontFamily: fontStack}}>
      {d.bgAsset && (
        <Img
          src={resolveMedia(d.bgAsset)}
          style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.88) brightness(0.24)'}}
        />
      )}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 90,
          transform: `scale(${interpolate(pop, [0, 1], [0.88, 1])})`,
          opacity: pop,
        }}
      >
        <div
          style={{
            padding: '12px 32px',
            borderRadius: 999,
            backgroundColor: 'rgba(200,16,46,0.28)',
            border: `2px solid ${BRIGHT_RED}`,
            color: '#FFF',
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: 3,
            marginBottom: 28,
          }}
        >
          {d.eyebrow}
        </div>
        <div
          style={{
            fontSize: d.question.length > 18 ? 68 : 76,
            fontWeight: 900,
            color: GOLD,
            textShadow: '0 8px 32px rgba(0,0,0,0.88)',
            padding: '0 48px',
            textAlign: 'center',
          }}
        >
          {d.question}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
