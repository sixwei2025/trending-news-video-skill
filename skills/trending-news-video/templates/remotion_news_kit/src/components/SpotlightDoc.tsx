import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const BRAND_RED = '#C8102E';
const DARK_BG = '#0A0A0C';
const fontStack = '"PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif';

export interface HighlightBox {
  /** Percentage coordinates (0-100) relative to the 1920x1080 evidence frame */
  x: number;
  y: number;
  w: number;
  h: number;
  style?: 'red_box' | 'yellow_hl' | 'green_box';
  delayFrames?: number;
}

export interface SpotlightDocProps {
  src: string;
  highlights: HighlightBox[];
  badge?: string;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: [number, number];
  panY?: [number, number];
}

function quinticOut(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - c, 5);
}

function resolveImg(src: string): string {
  if (src.startsWith('assets/') || src.startsWith('real/')) {
    return staticFile(src);
  }
  return staticFile(`assets/${src}`);
}

/**
 * 全画幅 1920×1080 聚光灯公文/网页取证引擎（Vox / WSJ 调查新闻范式）
 * 1. 非核心区域在 0.25s 内自动去色灰化压暗（grayscale 0.88 + brightness 0.42）
 * 2. 高亮框采用「外框固定 1920×1080 像素反推法」，从左到右刷出 100% 清晰全彩原图文字，绝无重影
 * 3. 配合五次平滑曲线（quinticOut）推近与连贯平移（Connected Pan），手机小屏也能一眼看清 SEC 档案与外媒原文
 */
export const SpotlightDoc: React.FC<SpotlightDocProps> = ({
  src,
  highlights,
  badge,
  zoomFrom = 1.06,
  zoomTo = 1.32,
  panX = [0, 0],
  panY = [0, 0],
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const canvasW = 1920;
  const canvasH = 1080;

  // 五次平滑推拉与平移
  const rawT = frame / Math.max(1, durationInFrames - 1);
  const eased = quinticOut(Math.min(1, rawT * 1.18));
  const z = interpolate(eased, [0, 1], [zoomFrom, zoomTo]);
  const tx = interpolate(eased, [0, 1], panX);
  const ty = interpolate(eased, [0, 1], panY);

  // 非重点区域在 4~14 帧快速灰化压暗，凸显聚光灯窗口
  const dimProgress = interpolate(frame, [3, 13], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const imgUrl = resolveImg(src);

  return (
    <AbsoluteFill style={{backgroundColor: DARK_BG, overflow: 'hidden'}}>
      <div
        style={{
          position: 'relative',
          width: canvasW,
          height: canvasH,
          transform: `scale(${z}) translate(${tx}%, ${ty}%)`,
          transformOrigin: 'center center',
        }}
      >
        {/* 底层去色压暗全景图 */}
        <Img
          src={imgUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: `grayscale(${dimProgress * 0.88}) brightness(${1 - dimProgress * 0.56})`,
          }}
        />

        {/* 100% 像素级对齐的原彩透出窗口 + 红框/荧光笔刷出动效 */}
        {highlights.map((hl, idx) => {
          const delay = hl.delayFrames ?? 5 + idx * 10;
          const swipe = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: {damping: 18, stiffness: 170},
          });
          const pctWidth = `${interpolate(swipe, [0, 1], [0, 100])}%`;
          const boxOpacity = interpolate(swipe, [0, 0.2], [0, 1], {extrapolateRight: 'clamp'});
          const styleKind = hl.style || 'red_box';
          const isYellow = styleKind === 'yellow_hl';
          const borderCol =
            styleKind === 'green_box' ? '#10B981' : styleKind === 'yellow_hl' ? '#FFD166' : '#FF2A4B';

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${hl.x}%`,
                top: `${hl.y}%`,
                width: `${hl.w}%`,
                height: `${hl.h}%`,
                opacity: boxOpacity,
                overflow: 'hidden',
                borderRadius: 10,
                boxShadow: `0 12px 36px rgba(0,0,0,0.68), 0 0 28px ${borderCol}66`,
              }}
            >
              {/* 从左向右展开的原彩全清层（外框固定像素反推，严丝合缝防错位） */}
              <div
                style={{
                  position: 'relative',
                  width: pctWidth,
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: -(hl.x / 100) * canvasW,
                    top: -(hl.y / 100) * canvasH,
                    width: canvasW,
                    height: canvasH,
                  }}
                >
                  <Img
                    src={imgUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'contrast(1.08) brightness(1.05)',
                    }}
                  />
                </div>
                {isYellow && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(255, 214, 10, 0.22)',
                      mixBlendMode: 'multiply',
                    }}
                  />
                )}
              </div>

              {/* 锐利高亮外框 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: `4.5px solid ${borderCol}`,
                  borderRadius: 10,
                  boxShadow: `inset 0 0 14px ${borderCol}38`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 底部暗角遮罩，确保单行主字幕锐利清晰 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(10,10,12,0.88) 0%, rgba(10,10,12,0.16) 28%, rgba(10,10,12,0.04) 100%)',
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
