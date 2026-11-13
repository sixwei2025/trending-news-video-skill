import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export interface HighlightBox {
  /** Percentage coordinates (0-100) relative to the document image */
  x: number;
  y: number;
  w: number;
  h: number;
  style: 'red_box' | 'yellow_hl' | 'green_box';
  delayFrames?: number;
}

interface SpotlightDocProps {
  src: string;
  aspectRatio: number; // width / height
  sourceBadge: string;
  highlights: HighlightBox[];
  /** Optional zoom target after highlights appear */
  zoomTo?: { scale: number; originX: string; originY: string };
  cardWidth?: number;
}

export const SpotlightDoc: React.FC<SpotlightDocProps> = ({
  src,
  aspectRatio,
  sourceBadge,
  highlights,
  zoomTo,
  cardWidth = 980,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardH = Math.round(cardWidth / aspectRatio);

  // 3D spring entrance
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const translateY = interpolate(enter, [0, 1], [110, 0]);
  const rotateX = interpolate(enter, [0, 1], [8, 0]);
  const cardOpacity = interpolate(enter, [0, 1], [0, 1]);

  // Progressive dimming of non-highlighted area (starts at frame 10)
  const dimProgress = interpolate(frame, [10, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gentle camera zoom towards key evidence
  const camZoom = zoomTo
    ? interpolate(frame, [20, 120], [1, zoomTo.scale], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, 150], [1, 1.03], { extrapolateRight: 'clamp' });

  const imgUrl = staticFile(`assets/${src}`);

  return (
    <div
      style={{
        width: cardWidth,
        opacity: cardOpacity,
        transform: `perspective(1200px) translateY(${translateY}px) rotateX(${rotateX}deg)`,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.14)',
        backgroundColor: '#12141c',
      }}
    >
      {/* Realistic browser / press window header */}
      <div
        style={{
          height: 46,
          backgroundColor: '#1b1e29',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#ff5f57' }} />
          <div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#febc2e' }} />
          <div style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#28c840' }} />
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.72)',
            fontFamily: 'PingFang SC, STHeiti, sans-serif',
            letterSpacing: 0.5,
          }}
        >
          {sourceBadge}
        </div>
        <div style={{ width: 45 }} />
      </div>

      {/* Document body with spotlight + animated highlighter */}
      <div
        style={{
          position: 'relative',
          width: cardWidth,
          height: cardH,
          overflow: 'hidden',
          backgroundColor: '#0e1017',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: `scale(${camZoom})`,
            transformOrigin: zoomTo ? `${zoomTo.originX} ${zoomTo.originY}` : '50% 45%',
          }}
        >
          {/* Base desaturated & darkened layer */}
          <Img
            src={imgUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `grayscale(${dimProgress * 0.92}) brightness(${1 - dimProgress * 0.62}) blur(${dimProgress * 1.2}px)`,
            }}
          />

          {/* Crisp full-color spotlight patches + animated marker strokes */}
          {highlights.map((hl, idx) => {
            const delay = hl.delayFrames ?? 14 + idx * 14;
            const swipe = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 20, stiffness: 150 },
            });
            const pctWidth = `${interpolate(swipe, [0, 1], [0, 100])}%`;
            const boxOpacity = interpolate(swipe, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

            const isYellow = hl.style === 'yellow_hl';
            const borderCol =
              hl.style === 'red_box'
                ? '#ff2a3c'
                : hl.style === 'green_box'
                ? '#76b900'
                : '#ffd60a';

            // Subtle 10fps editorial pulse on highlight frame
            const stepFrame = Math.floor(frame / 3) * 3;
            const pulseGlow = 0.55 + 0.45 * Math.sin(stepFrame * 0.35 + idx);
            const jitterX = Math.sin(stepFrame * 1.7 + idx) * 0.7;
            const jitterY = Math.cos(stepFrame * 2.1 + idx) * 0.7;

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
                  transform: `translate(${jitterX}px, ${jitterY}px)`,
                  overflow: 'hidden',
                  borderRadius: 6,
                  boxShadow: `0 10px 30px rgba(0,0,0,0.55), 0 0 ${Math.round(18 * pulseGlow)}px ${borderCol}55`,
                }}
              >
                {/* Animated reveal clip */}
                <div
                  style={{
                    position: 'relative',
                    width: pctWidth,
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {/* Full-color unblurred image aligned in exact pixels */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -(hl.x / 100) * cardWidth,
                      top: -(hl.y / 100) * cardH,
                      width: cardWidth,
                      height: cardH,
                    }}
                  >
                    <Img
                      src={imgUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'contrast(1.08) brightness(1.04)',
                      }}
                    />
                  </div>
                  {/* Highlighter tint */}
                  {isYellow && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(255, 222, 0, 0.24)',
                        mixBlendMode: 'multiply',
                      }}
                    />
                  )}
                </div>

                {/* Crisp outer frame */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: `4px solid ${borderCol}`,
                    borderRadius: 6,
                    boxShadow: `inset 0 0 12px ${borderCol}40`,
                    pointerEvents: 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
