import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { SpotlightDoc } from './components/SpotlightDoc';

const FONT = '"PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif';

/** Exact durations matching Voicebox 袁六伟 original voice segments + breathing gaps (30fps) */
export const SCENE_FRAMES = [175, 323, 251, 260, 347, 432, 307, 216]; // Total = 2311 frames = 77.03s

/** Top 8-segment broadcast news progress bar + Live Investigative Dossier HUD (16:9 1920x1080) */
const NewsProgressBar: React.FC<{ starts: number[]; durations: number[] }> = ({ starts, durations }) => {
  const frame = useCurrentFrame();
  const sec = Math.floor(frame / 30);
  const ff = frame % 30;
  const tc = `00:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: 64,
        right: 64,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ height: 5, display: 'flex', gap: 8 }}>
        {durations.map((dur, i) => {
          const st = starts[i];
          const progress = interpolate(frame, [st, st + dur], [0, 100], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const isDone = frame >= st + dur;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: isDone ? 'rgba(255,255,255,0.85)' : '#ff2a3c',
                  boxShadow: !isDone && progress > 0 ? '0 0 10px #ff2a3c' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: FONT,
          fontSize: 18,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.72)',
          letterSpacing: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#ff2a3c',
              boxShadow: '0 0 8px #ff2a3c',
            }}
          />
          <span>深度商业调查档案 · 袁六伟</span>
        </div>
        <div style={{ fontFamily: 'monospace', color: '#ffd60a', fontWeight: 800 }}>TC {tc}</div>
      </div>
    </div>
  );
};

/** Subtle film vignette & scanline texture overlay */
const CinemaTextureOverlay: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 70,
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px)',
      boxShadow: 'inset 0 0 140px rgba(0,0,0,0.55)',
    }}
  />
);

/** Dynamic subtle grid + radial ambient background */
const EditorialBackdrop: React.FC<{ accent?: string; bgImage?: string; bgOpacity?: number }> = ({
  accent = 'rgba(220, 30, 50, 0.22)',
  bgImage,
  bgOpacity = 0.16,
}) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 400], [0, -24]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#090b10', overflow: 'hidden' }}>
      {bgImage && (
        <Img
          src={staticFile(`assets/${bgImage}`)}
          style={{
            position: 'absolute',
            inset: -40,
            width: 'calc(100% + 80px)',
            height: 'calc(100% + 80px)',
            objectFit: 'cover',
            opacity: bgOpacity,
            filter: 'grayscale(100%) contrast(1.2) blur(6px)',
            transform: `translateY(${drift}px) scale(1.06)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 28% 35%, ${accent}, transparent 58%), linear-gradient(180deg, rgba(9,11,16,0.3) 0%, rgba(9,11,16,0.92) 85%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** High-contrast glassmorphic bottom subtitle bar (16:9 widescreen) */
const SubtitleBar: React.FC<{ parts: Array<{ text: string; hl?: boolean }>; showFrames: number }> = ({
  parts,
  showFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > showFrames) return null;

  const pop = spring({ frame, fps, config: { damping: 18, stiffness: 200 } });
  const ty = interpolate(pop, [0, 1], [16, 0]);
  const op = interpolate(pop, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom: 34,
        display: 'flex',
        justifyContent: 'center',
        opacity: op,
        transform: `translateY(${ty}px)`,
        zIndex: 60,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(10, 12, 18, 0.85)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 16,
          padding: '14px 36px',
          boxShadow: '0 14px 36px rgba(0,0,0,0.75)',
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.32,
          letterSpacing: 0.5,
          textShadow: '0 2px 10px rgba(0,0,0,0.85)',
        }}
      >
        {parts.map((p, i) => (
          <span key={i} style={{ color: p.hl ? '#ffd60a' : '#ffffff' }}>
            {p.text}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Left-column Editorial Header for 16:9 Widescreen */
const WidescreenHeader: React.FC<{ tag: string; title: string; subtitle: string; accent?: string }> = ({
  tag,
  title,
  subtitle,
  accent = '#e6192e',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const s2 = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 16, stiffness: 130 } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 18px',
          borderRadius: 8,
          backgroundColor: accent,
          color: '#fff',
          fontSize: 22,
          fontWeight: 800,
          fontFamily: FONT,
          letterSpacing: 1.2,
          transform: `translateX(${interpolate(s1, [0, 1], [-30, 0])}px)`,
          opacity: s1,
          boxShadow: `0 8px 24px ${accent}66`,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' }} />
        {tag}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: FONT,
          fontSize: 50,
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.16,
          transform: `translateY(${interpolate(s2, [0, 1], [24, 0])}px)`,
          opacity: s2,
          textShadow: '0 6px 24px rgba(0,0,0,0.6)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 800,
          color: '#ffd60a',
          lineHeight: 1.28,
          transform: `translateY(${interpolate(s2, [0, 1], [28, 0])}px)`,
          opacity: s2,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

/**
 * 3:4 Vertical Magazine Cover (1080×1440) — Specifically designed for video-hub & WeChat Channels 3:4 Cover Grid
 */
export const CoverDesign3x4: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#07080d', fontFamily: FONT, overflow: 'hidden' }}>
      {/* Portrait hero image */}
      <Img
        src={staticFile('assets/01_jensen_portrait.jpg')}
        style={{
          position: 'absolute',
          top: -20,
          left: 0,
          width: '100%',
          height: 920,
          objectFit: 'cover',
          objectPosition: '50% 15%',
          filter: 'grayscale(30%) contrast(1.22) brightness(0.78)',
          transform: 'scale(1.03)',
        }}
      />
      {/* Crimson spotlight + deep vignette gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 75% 20%, rgba(230,25,46,0.36), transparent 52%), linear-gradient(180deg, rgba(7,8,13,0.42) 0%, rgba(7,8,13,0.12) 28%, rgba(7,8,13,0.94) 58%, #07080d 100%)',
        }}
      />

      {/* Top breaking ticker */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'rgba(220, 20, 40, 0.95)',
          padding: '10px 22px',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(220,20,40,0.45)',
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffd60a' }} />
        <span style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: 1.5 }}>
          突发深扒 · 掌舵33年突然辞职
        </span>
      </div>

      {/* Main Magazine Headline */}
      <div style={{ position: 'absolute', top: 530, left: 48, right: 48 }}>
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.06,
            letterSpacing: -1,
            textShadow: '0 10px 36px rgba(0,0,0,0.92)',
          }}
        >
          4万亿AI教父
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'inline-block',
            backgroundColor: '#e6192e',
            padding: '8px 24px',
            borderRadius: 12,
            transform: 'skewX(-6deg)',
            boxShadow: '0 14px 36px rgba(230,25,46,0.5)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: 'skewX(6deg)',
              fontSize: 70,
              fontWeight: 900,
              color: '#ffd60a',
              lineHeight: 1.1,
            }}
          >
            72小时被迫辞职！
          </span>
        </div>
      </div>

      {/* Frosted glass stock evidence card */}
      <div
        style={{
          position: 'absolute',
          top: 795,
          left: 48,
          right: 48,
          borderRadius: 22,
          backgroundColor: 'rgba(18, 22, 32, 0.88)',
          border: '1.5px solid rgba(255,255,255,0.18)',
          padding: 22,
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ color: '#fff', fontSize: 36, fontWeight: 900 }}>NVDA</span>
            <span style={{ color: '#ff3b4e', fontSize: 42, fontWeight: 900 }}>盘中暴跌 &gt;13%</span>
          </div>
          <div
            style={{
              backgroundColor: 'rgba(255,59,78,0.18)',
              border: '1px solid #ff3b4e',
              color: '#ff6b78',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            蒸发 $5400亿
          </div>
        </div>
        <div style={{ borderRadius: 14, overflow: 'hidden', height: 390, backgroundColor: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Img
            src={staticFile('assets/crop_05_stock.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }}
          />
        </div>
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 32,
            fontWeight: 900,
          }}
        >
          <span style={{ color: '#cbd5e1' }}>表面：私德风波</span>
          <span style={{ color: '#ffd60a' }}>实质：中美AI算力精准切割 →</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 0: 16:9 Widescreen 0.01s Hook (1920×1080)
 */
const SceneHook16x9: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 175], [1.0, 1.07]);
  const pulse = 0.92 + 0.08 * Math.sin(frame * 0.25);

  return (
    <AbsoluteFill style={{ backgroundColor: '#07080d', fontFamily: FONT, overflow: 'hidden' }}>
      {/* Right-aligned dramatic portrait */}
      <Img
        src={staticFile('assets/01_jensen_portrait.jpg')}
        style={{
          position: 'absolute',
          top: -30,
          right: -40,
          width: 1180,
          height: 1140,
          objectFit: 'cover',
          objectPosition: '50% 18%',
          filter: 'grayscale(30%) contrast(1.22) brightness(0.76)',
          transform: `scale(${zoom})`,
        }}
      />
      {/* Widescreen gradient mask */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 72% 30%, rgba(230,25,46,0.32), transparent 55%), linear-gradient(90deg, #07080d 0%, rgba(7,8,13,0.96) 44%, rgba(7,8,13,0.52) 72%, rgba(7,8,13,0.85) 100%)',
        }}
      />

      {/* Left-side Hook Headline */}
      <div style={{ position: 'absolute', top: 108, left: 68, width: 920, zIndex: 20 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(220, 20, 40, 0.95)',
            padding: '9px 22px',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(220,20,40,0.45)',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffd60a', opacity: pulse }} />
          <span style={{ color: '#fff', fontSize: 24, fontWeight: 900, letterSpacing: 1.5 }}>
            突发深扒 · 掌舵33年突然辞职
          </span>
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 82,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.08,
            letterSpacing: -1,
            textShadow: '0 10px 36px rgba(0,0,0,0.9)',
          }}
        >
          4万亿AI教父
        </div>
        <div
          style={{
            marginTop: 14,
            display: 'inline-block',
            backgroundColor: '#e6192e',
            padding: '10px 26px',
            borderRadius: 12,
            transform: 'skewX(-6deg)',
            boxShadow: '0 14px 36px rgba(230,25,46,0.5)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: 'skewX(6deg)',
              fontSize: 66,
              fontWeight: 900,
              color: '#ffd60a',
              lineHeight: 1.1,
            }}
          >
            72小时被迫辞职！
          </span>
        </div>

        {/* Contrast summary cards */}
        <div style={{ marginTop: 34, display: 'flex', gap: 18 }}>
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(18, 22, 34, 0.9)',
              border: '1.5px solid rgba(255,255,255,0.16)',
              borderLeft: '6px solid #94a3b8',
              borderRadius: 14,
              padding: '18px 22px',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 20, fontWeight: 700 }}>表面导火索</div>
            <div style={{ color: '#f8fafc', fontSize: 30, fontWeight: 900, marginTop: 6 }}>私德风波与内部致歉</div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(38, 14, 22, 0.92)',
              border: '1.5px solid rgba(255,59,78,0.55)',
              borderLeft: '6px solid #ff2a3c',
              borderRadius: 14,
              padding: '18px 22px',
            }}
          >
            <div style={{ color: '#fca5a5', fontSize: 20, fontWeight: 700 }}>底层真逻辑</div>
            <div style={{ color: '#ffd60a', fontSize: 30, fontWeight: 900, marginTop: 6 }}>中美AI算力精准切割</div>
          </div>
        </div>
      </div>

      {/* Right-side floating live stock crash card */}
      <div
        style={{
          position: 'absolute',
          top: 210,
          right: 68,
          width: 780,
          borderRadius: 20,
          backgroundColor: 'rgba(14, 18, 28, 0.9)',
          border: '1.5px solid rgba(255,255,255,0.18)',
          padding: 22,
          boxShadow: '0 28px 70px rgba(0,0,0,0.85)',
          zIndex: 25,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 900, whiteSpace: 'nowrap' }}>NVDA</span>
            <span style={{ color: '#ff3b4e', fontSize: 36, fontWeight: 900, whiteSpace: 'nowrap' }}>盘中暴跌 &gt;13%</span>
          </div>
          <div
            style={{
              backgroundColor: 'rgba(255,59,78,0.18)',
              border: '1px solid #ff3b4e',
              color: '#ff6b78',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 22,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            市值 4.01T (-14.5%)
          </div>
        </div>
        <div style={{ borderRadius: 12, overflow: 'hidden', height: 420, backgroundColor: '#fff' }}>
          <Img
            src={staticFile('assets/crop_05_stock.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 1: 16:9 Stock Crash + Onion Layer Breakdown */
const SceneStockAndCutting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const forces = [
    { label: '01 · 美国国会三委员会', sub: '外交 / 情报 / 战略竞争联名逼宫', color: '#e6192e' },
    { label: '02 · 华尔街顶级资本', sub: '股价震荡与股东诉讼火速止损', color: '#ff9f1a' },
    { label: '03 · 对华AI算力封锁', sub: '借安全合规缺口完成“去黄仁勋化”', color: '#3b82f6' },
  ];

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(230, 25, 46, 0.25)" />
      {/* Left Column: Header + Live Stats / 3-Force Cards */}
      <div style={{ position: 'absolute', top: 100, left: 64, width: 730, zIndex: 25 }}>
        <WidescreenHeader
          tag="11月12日 · 真实行情取证"
          title="盘中跳水超 13%"
          subtitle="背后是围绕中美AI算力的精准切割"
        />

        {/* Live Stat Counter Bar */}
        <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(22, 14, 20, 0.92)',
              border: '2px solid rgba(255, 42, 60, 0.65)',
              borderRadius: 16,
              padding: '16px 20px',
              boxShadow: '0 14px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 20, color: '#fca5a5', fontWeight: 700 }}>NVDA 盘中最大跳水</div>
            <div style={{ fontFamily: FONT, fontSize: 44, color: '#ff2a3c', fontWeight: 900, marginTop: 4 }}>
              -{interpolate(frame, [12, 60], [0, 13.48], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }).toFixed(2)}%
            </div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(20, 22, 30, 0.92)',
              border: '2px solid rgba(255, 214, 10, 0.55)',
              borderRadius: 16,
              padding: '16px 20px',
              boxShadow: '0 14px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 20, color: '#fde047', fontWeight: 700 }}>单日市值瞬间蒸发</div>
            <div style={{ fontFamily: FONT, fontSize: 44, color: '#ffd60a', fontWeight: 900, marginTop: 4 }}>
              -${Math.round(interpolate(frame, [12, 60], [0, 5400], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))}亿
            </div>
          </div>
        </div>

        {/* 3-Force Cutting Cards */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {forces.map((f, idx) => {
            const p = spring({
              frame: Math.max(0, frame - 90 - idx * 14),
              fps,
              config: { damping: 14, stiffness: 140 },
            });
            return (
              <div
                key={idx}
                style={{
                  transform: `translateX(${interpolate(p, [0, 1], [-50, 0])}px)`,
                  opacity: p,
                  backgroundColor: 'rgba(15, 18, 28, 0.92)',
                  borderLeft: `8px solid ${f.color}`,
                  borderRadius: 14,
                  padding: '14px 22px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.65)',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  borderRight: '1px solid rgba(255,255,255,0.12)',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 900, color: '#ffffff' }}>{f.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 21, fontWeight: 600, color: '#cbd5e1', marginTop: 4 }}>
                  {f.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Large 3D Browser Evidence Window */}
      <div
        style={{
          position: 'absolute',
          top: 108,
          right: 64,
          width: 1010,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        <SpotlightDoc
          src="crop_05_stock.png"
          aspectRatio={2080 / 1160}
          sourceBadge="StockAnalysis · NASDAQ: NVDA"
          cardWidth={990}
          highlights={[
            { x: 1.5, y: 2.5, w: 36, h: 25, style: 'red_box', delayFrames: 12 },
            { x: 1.5, y: 38.5, w: 26, h: 8, style: 'yellow_hl', delayFrames: 28 },
            { x: 52.5, y: 38.5, w: 46, h: 58, style: 'red_box', delayFrames: 42 },
          ]}
          zoomTo={{ scale: 1.15, originX: '30%', originY: '35%' }}
        />
      </div>

      <SubtitleBar
        showFrames={318}
        parts={[
          { text: '盘中跳水超' },
          { text: '13%', hl: true },
          { text: '！这不是普通八卦，而是围绕' },
          { text: '中美AI算力', hl: true },
          { text: '的精准切割' },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Scene 2: 16:9 Nov 8 Internal Letter + 72h Blitz Timeline */
const SceneInternalLetter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steps = [
    { d: '11月08日', t: '黄仁勋向全员发内部致歉信，承认私德过失' },
    { d: '11月10日', t: '英伟达董事会聘请外部律所启动独立调查' },
    { d: '11月12日', t: '国会与资本双重施压，闪电宣布卸任CEO' },
  ];
  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(255, 195, 0, 0.16)" />
      {/* Left Column: Header + 72h Blitz Vertical Timeline */}
      <div style={{ position: 'absolute', top: 100, left: 64, width: 820, zIndex: 25 }}>
        <WidescreenHeader
          tag="11月8日 · 内部致歉信"
          title="承认对41年妻子不忠"
          subtitle="英伟达董事会随即启动独立调查"
          accent="#d97706"
        />

        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {steps.map((s, idx) => {
            const p = spring({
              frame: Math.max(0, frame - 24 - idx * 16),
              fps,
              config: { damping: 15, stiffness: 140 },
            });
            return (
              <div
                key={idx}
                style={{
                  opacity: p,
                  transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
                  backgroundColor: 'rgba(15, 18, 28, 0.94)',
                  border: idx === 2 ? '1.5px solid #ff2a3c' : '1.5px solid rgba(255,214,10,0.45)',
                  borderRadius: 16,
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                }}
              >
                <div
                  style={{
                    backgroundColor: idx === 2 ? '#ff2a3c' : '#ffd60a',
                    color: idx === 2 ? '#fff' : '#090b10',
                    fontFamily: FONT,
                    fontSize: 22,
                    fontWeight: 900,
                    padding: '8px 16px',
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                >
                  {s.d}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 25, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                  {s.t}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Internal Letter Evidence */}
      <div
        style={{
          position: 'absolute',
          top: 92,
          right: 76,
          width: 840,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        <SpotlightDoc
          src="crop_09_ifeng.png"
          aspectRatio={1295 / 1310}
          sourceBadge="公开报道 · 致公司全体的一封信"
          cardWidth={720}
          highlights={[
            { x: 0.5, y: 0.5, w: 96, h: 9.5, style: 'red_box', delayFrames: 12 },
            { x: 0.5, y: 24, w: 96, h: 17, style: 'yellow_hl', delayFrames: 30 },
            { x: 19, y: 58.5, w: 58, h: 22.5, style: 'red_box', delayFrames: 54 },
          ]}
          zoomTo={{ scale: 1.12, originX: '48%', originY: '68%' }}
        />
      </div>

      <SubtitleBar
        showFrames={246}
        parts={[
          { text: '11月8日发内部信承认' },
          { text: '对妻子不忠', hl: true },
          { text: '，董事会随即聘请外部律所' },
          { text: '独立调查', hl: true },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Scene 3: 16:9 CBS News + Shareholder Lawsuit Callout */
const SceneCBSMedia: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop2 = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 14, stiffness: 150 } });

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(59, 130, 246, 0.22)" />
      {/* Left Column */}
      <div style={{ position: 'absolute', top: 100, left: 64, width: 740, zIndex: 25 }}>
        <WidescreenHeader
          tag="美媒连续深挖 · CBS News"
          title="牵扯直属高管与外部人物"
          subtitle="被美方指称涉“国家安全风险”"
          accent="#2563eb"
        />

        <div
          style={{
            marginTop: 38,
            opacity: pop2,
            transform: `translateY(${interpolate(pop2, [0, 1], [40, 0])}px)`,
            backgroundColor: 'rgba(20, 24, 36, 0.94)',
            border: '2px solid #ff3b4e',
            borderRadius: 18,
            padding: '26px 30px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: 24, color: '#ff6b78', fontWeight: 800 }}>
              连锁反应瞬间引爆
            </span>
            <span
              style={{
                backgroundColor: '#ff2a3c',
                color: '#fff',
                fontSize: 20,
                fontWeight: 900,
                padding: '4px 12px',
                borderRadius: 6,
              }}
            >
              合规红线
            </span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 34, color: '#ffffff', fontWeight: 900 }}>
            直属高管利益冲突 + 股东集体诉讼
          </div>
          <div style={{ fontFamily: FONT, fontSize: 24, color: '#cbd5e1', fontWeight: 600, lineHeight: 1.45 }}>
            私人问题被迅速上升为企业内控失灵与国家安全敞口，成为政客发难的最佳抓手。
          </div>
        </div>
      </div>

      {/* Right Column: CBS News Evidence */}
      <div
        style={{
          position: 'absolute',
          top: 112,
          right: 64,
          width: 1000,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        <SpotlightDoc
          src="crop_06_cbs.png"
          aspectRatio={2360 / 1360}
          sourceBadge="CBS News · MoneyWatch"
          cardWidth={980}
          highlights={[
            { x: 1.2, y: 4.5, w: 55, h: 25, style: 'red_box', delayFrames: 12 },
            { x: 1.2, y: 38, w: 56, h: 11, style: 'yellow_hl', delayFrames: 30 },
            { x: 1.2, y: 86, w: 56, h: 12, style: 'yellow_hl', delayFrames: 50 },
          ]}
          zoomTo={{ scale: 1.07, originX: '30%', originY: '55%' }}
        />
      </div>

      <SubtitleBar
        showFrames={254}
        parts={[
          { text: '美媒深挖直属高管关系，更将所谓' },
          { text: '“国家安全风险”', hl: true },
          { text: '摆上台面' },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Scene 4: 16:9 US Congress 3-Committee Letter */
const SceneCongressPressure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bills = [
    { name: '《芯片安全法案》', desc: '强制算力芯片植入硬件级位置验证与远程锁死机制' },
    { name: '《AI看守法案》', desc: '严查对华算力租赁与第三方云端绕道训练' },
    { name: '国会闭门宣誓作证', desc: '外交、情报、战略竞争三大委员会联名传唤' },
  ];

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(220, 38, 38, 0.28)" bgImage="03_us_capitol.jpg" bgOpacity={0.28} />
      {/* Left Column */}
      <div style={{ position: 'absolute', top: 100, left: 64, width: 740, zIndex: 25 }}>
        <WidescreenHeader
          tag="美国国会 · 三大委员会联名发难"
          title="外交 · 情报 · 战略竞争"
          subtitle="联名发函要求黄仁勋闭门作证"
        />

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bills.map((b, i) => {
            const p = spring({
              frame: Math.max(0, frame - 35 - i * 16),
              fps,
              config: { damping: 14, stiffness: 160 },
            });
            return (
              <div
                key={i}
                style={{
                  opacity: p,
                  transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
                  backgroundColor: 'rgba(32, 14, 22, 0.90)',
                  border: '1.5px solid #ff3b4e',
                  borderLeft: '8px solid #ff2a3c',
                  borderRadius: 14,
                  padding: '16px 22px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ color: '#ffd60a', fontFamily: FONT, fontSize: 26, fontWeight: 900 }}>{b.name}</div>
                <div style={{ color: '#f1f5f9', fontFamily: FONT, fontSize: 21, fontWeight: 600, marginTop: 4 }}>
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Official House Letter Evidence */}
      <div
        style={{
          position: 'absolute',
          top: 118,
          right: 64,
          width: 1000,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        <SpotlightDoc
          src="crop_07_congress.png"
          aspectRatio={1710 / 920}
          sourceBadge="foreignaffairs.house.gov · Official Press Release"
          cardWidth={980}
          highlights={[
            { x: 0.6, y: 2, w: 96, h: 42, style: 'red_box', delayFrames: 10 },
            { x: 0.6, y: 53, w: 96, h: 27, style: 'yellow_hl', delayFrames: 34 },
          ]}
          zoomTo={{ scale: 1.07, originX: '48%', originY: '45%' }}
        />
      </div>

      <SubtitleBar
        showFrames={342}
        parts={[
          { text: '美国国会三大委员会联名逼宫，要求' },
          { text: '闭门作证', hl: true },
          { text: '并强推芯片法案' },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Scene 5: 16:9 Split Clash — Commercial Tightrope vs National Security Cut */
const SceneSplitClash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slash = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 18, stiffness: 110 } });
  const leftIn = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 15, stiffness: 120 } });
  const rightIn = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 15, stiffness: 120 } });

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(230, 25, 46, 0.22)" bgImage="02_jensen_sc18.jpg" bgOpacity={0.22} />
      <div style={{ position: 'absolute', top: 96, left: 64, right: 64, zIndex: 25 }}>
        <WidescreenHeader
          tag="底层博弈 · 商业 vs 政治"
          title="在华盛顿“走钢丝”的终点：一旦露缝，火速收网"
          subtitle="从商业平衡者到地缘博弈弃子"
        />
      </div>

      {/* 16:9 Split comparison panels */}
      <div
        style={{
          position: 'absolute',
          top: 320,
          left: 64,
          right: 64,
          height: 580,
          display: 'flex',
          gap: 36,
        }}
      >
        {/* Left: Commercial balancing */}
        <div
          style={{
            flex: 1,
            opacity: leftIn,
            transform: `translateY(${interpolate(leftIn, [0, 1], [50, 0])}px)`,
            backgroundColor: 'rgba(18, 28, 48, 0.88)',
            border: '2px solid rgba(96, 165, 250, 0.5)',
            borderRadius: 24,
            padding: '36px 42px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#60a5fa', fontSize: 28, fontWeight: 800, fontFamily: FONT }}>过去 · 商业平衡</div>
            <div style={{ color: '#ffffff', fontSize: 48, fontWeight: 900, fontFamily: FONT, marginTop: 10 }}>
              两头游说 · 保住市场
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: FONT, fontSize: 32, color: '#dbeafe', fontWeight: 700 }}>
            <div>• 表面配合华盛顿合规底线</div>
            <div>• 密集游说争取特供芯片出口许可</div>
            <div>• 尽力维系中国区每年数百亿营收</div>
          </div>
          <div style={{ fontSize: 24, color: '#93c5fd', fontFamily: FONT, fontWeight: 700 }}>逻辑：商业利益与股东回报最大化</div>
        </div>

        {/* Center crimson laser divider */}
        <div
          style={{
            width: 6,
            height: `${interpolate(slash, [0, 1], [0, 100])}%`,
            backgroundColor: '#ff2a3c',
            boxShadow: '0 0 24px #ff2a3c',
            borderRadius: 3,
            alignSelf: 'center',
          }}
        />

        {/* Right: Security cut */}
        <div
          style={{
            flex: 1,
            opacity: rightIn,
            transform: `translateY(${interpolate(rightIn, [0, 1], [50, 0])}px)`,
            backgroundColor: 'rgba(46, 16, 24, 0.90)',
            border: '2px solid rgba(255, 59, 78, 0.75)',
            borderRadius: 24,
            padding: '36px 42px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#ff6b78', fontSize: 28, fontWeight: 800, fontFamily: FONT }}>现在 · 彻底切割</div>
            <div style={{ color: '#ffd60a', fontSize: 48, fontWeight: 900, fontFamily: FONT, marginTop: 10 }}>
              政治收编 · 去黄仁勋化
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: FONT, fontSize: 32, color: '#fee2e2', fontWeight: 700 }}>
            <div>• 私德丑闻撕开内控与安全缺口</div>
            <div>• 鹰派顺势将其定性为地缘“负资产”</div>
            <div>• 换上听命于合规框架的职业经理人</div>
          </div>
          <div style={{ fontSize: 24, color: '#fca5a5', fontFamily: FONT, fontWeight: 700 }}>逻辑：大国算力铁幕压倒一切</div>
        </div>
      </div>

      <SubtitleBar
        showFrames={425}
        parts={[
          { text: '过去一直在华盛顿' },
          { text: '走钢丝', hl: true },
          { text: '，一朝露出裂缝，鹰派与资本火速' },
          { text: '完成切割', hl: true },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Scene 6: 16:9 Official NVIDIA Transition + Stamp Badge */
const SceneOfficialTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 12, stiffness: 180 } });

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(118, 185, 0, 0.22)" />
      {/* Left Column */}
      <div style={{ position: 'absolute', top: 100, left: 64, width: 740, zIndex: 25 }}>
        <WidescreenHeader
          tag="11月12日 · 英伟达官方公告"
          title="掌舵33年创始人正式卸任"
          subtitle="CFO 科莱特·克雷斯暂任临时 CEO"
          accent="#5a8f00"
        />

        <div
          style={{
            marginTop: 36,
            backgroundColor: 'rgba(15, 22, 18, 0.92)',
            border: '1.5px solid rgba(132, 204, 22, 0.5)',
            borderRadius: 18,
            padding: '26px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ color: '#a3e635', fontSize: 24, fontWeight: 800, fontFamily: FONT }}>权力交接关键信号</div>
          <div style={{ color: '#ffffff', fontSize: 32, fontWeight: 900, fontFamily: FONT }}>
            创始人时代终结 → 财务与合规官接管
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 23, fontWeight: 600, fontFamily: FONT, lineHeight: 1.45 }}>
            不再有创始人凭个人威望在太平洋两岸折冲樽俎，只剩冰冷严密的出口管制清单。
          </div>
        </div>
      </div>

      {/* Right Column: Official Press Release */}
      <div
        style={{
          position: 'absolute',
          top: 108,
          right: 64,
          width: 1000,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}
      >
        <SpotlightDoc
          src="crop_04_press.png"
          aspectRatio={1680 / 1010}
          sourceBadge="NVIDIA Newsroom · Official Press Release"
          cardWidth={980}
          highlights={[
            { x: 0.6, y: 2, w: 68, h: 9, style: 'red_box', delayFrames: 10 },
            { x: 0.6, y: 21, w: 86, h: 17, style: 'yellow_hl', delayFrames: 26 },
            { x: 0.6, y: 40.5, w: 98, h: 26, style: 'green_box', delayFrames: 42 },
          ]}
          zoomTo={{ scale: 1.07, originX: '40%', originY: '42%' }}
        />
      </div>

      {/* Stamp overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 155,
          right: 96,
          opacity: stamp,
          transform: `scale(${interpolate(stamp, [0, 1], [1.6, 1])}) rotate(-8deg)`,
          border: '6px solid #ff2a3c',
          backgroundColor: 'rgba(15, 10, 14, 0.9)',
          color: '#ff2a3c',
          padding: '12px 26px',
          borderRadius: 12,
          fontFamily: FONT,
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: 2,
          boxShadow: '0 12px 32px rgba(255,42,60,0.4)',
          zIndex: 45,
        }}
      >
        33年时代落幕
      </div>

      <SubtitleBar
        showFrames={300}
        parts={[
          { text: '11月12日正式公告：创始人卸任，由' },
          { text: 'CFO科莱特·克雷斯', hl: true },
          { text: '暂任CEO' },
        ]}
      />
    </AbsoluteFill>
  );
};

/** Scene 7: 16:9 Black & White Cinema Ending */
const SceneEnding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = interpolate(frame, [0, 216], [1.08, 1.0]);
  const textIn = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 18, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050609', overflow: 'hidden' }}>
      <Img
        src={staticFile('assets/02_jensen_sc18.jpg')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 25%',
          filter: 'grayscale(100%) contrast(1.28) brightness(0.42)',
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,6,9,0.5) 0%, rgba(5,6,9,0.25) 45%, rgba(5,6,9,0.92) 90%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 135,
          left: 160,
          right: 160,
          textAlign: 'center',
          opacity: textIn,
          transform: `translateY(${interpolate(textIn, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#C8102E',
            color: '#ffffff',
            fontFamily: FONT,
            fontSize: 24,
            fontWeight: 800,
            padding: '9px 26px',
            borderRadius: 999,
            marginBottom: 22,
            letterSpacing: 1.5,
            boxShadow: '0 8px 24px rgba(200,16,46,0.5)',
          }}
        >
          袁六伟 · 台州汇芯 ｜ 深度商业拆解
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.32,
            textShadow: '0 8px 30px rgba(0,0,0,0.9)',
          }}
        >
          在AI算力成为大国博弈命脉的今天
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 900,
            color: '#ffd60a',
            lineHeight: 1.28,
            textShadow: '0 8px 30px rgba(0,0,0,0.9)',
          }}
        >
          没有商业领袖，能大过国家意志
        </div>

        {/* 3 Core Takeaways Summary Box (Horizontal 3-card layout in 16:9) */}
        <div
          style={{
            marginTop: 38,
            display: 'flex',
            gap: 24,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(12, 15, 24, 0.9)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderTop: '6px solid #ff2a3c',
              borderRadius: 18,
              padding: '24px 28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ color: '#ff2a3c', fontFamily: FONT, fontSize: 28, fontWeight: 900 }}>01 · 导火索与本质</div>
            <div style={{ color: '#f8fafc', fontFamily: FONT, fontSize: 26, fontWeight: 800, marginTop: 10, lineHeight: 1.4 }}>
              私德只是表面导火索，中美算力彻底切割才是本质
            </div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(12, 15, 24, 0.9)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderTop: '6px solid #ffd60a',
              borderRadius: 18,
              padding: '24px 28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ color: '#ffd60a', fontFamily: FONT, fontSize: 28, fontWeight: 900 }}>02 · 走钢丝终结</div>
            <div style={{ color: '#f8fafc', fontFamily: FONT, fontSize: 26, fontWeight: 800, marginTop: 10, lineHeight: 1.4 }}>
              左右逢源时代终结，硅谷科技巨头全面政治站队
            </div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(12, 15, 24, 0.9)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderTop: '6px solid #38bdf8',
              borderRadius: 18,
              padding: '24px 28px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ color: '#38bdf8', fontFamily: FONT, fontSize: 28, fontWeight: 900 }}>03 · 唯一出路</div>
            <div style={{ color: '#f8fafc', fontFamily: FONT, fontSize: 26, fontWeight: 800, marginTop: 10, lineHeight: 1.4 }}>
              放弃侥幸幻想，国产全栈自主算力是唯一破局之路
            </div>
          </div>
        </div>
      </div>

      <SubtitleBar
        showFrames={210}
        parts={[
          { text: '在AI算力成为大国博弈命脉的今天，没有商业领袖能大过' },
          { text: '国家意志', hl: true },
        ]}
      />
    </AbsoluteFill>
  );
};

export const JensenHotVideo: React.FC = () => {
  let offset = 0;
  const starts = SCENE_FRAMES.map((dur) => {
    const s = offset;
    offset += dur;
    return s;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#07080d' }}>
      <Sequence from={starts[0]} durationInFrames={SCENE_FRAMES[0]}>
        <SceneHook16x9 />
        <SubtitleBar
          showFrames={170}
          parts={[
            { text: '硅谷大佬犯错不少，为何只有黄仁勋' },
            { text: '72小时被迫辞职', hl: true },
            { text: '？' },
          ]}
        />
      </Sequence>
      <Sequence from={starts[1]} durationInFrames={SCENE_FRAMES[1]}>
        <SceneStockAndCutting />
      </Sequence>
      <Sequence from={starts[2]} durationInFrames={SCENE_FRAMES[2]}>
        <SceneInternalLetter />
      </Sequence>
      <Sequence from={starts[3]} durationInFrames={SCENE_FRAMES[3]}>
        <SceneCBSMedia />
      </Sequence>
      <Sequence from={starts[4]} durationInFrames={SCENE_FRAMES[4]}>
        <SceneCongressPressure />
      </Sequence>
      <Sequence from={starts[5]} durationInFrames={SCENE_FRAMES[5]}>
        <SceneSplitClash />
      </Sequence>
      <Sequence from={starts[6]} durationInFrames={SCENE_FRAMES[6]}>
        <SceneOfficialTransition />
      </Sequence>
      <Sequence from={starts[7]} durationInFrames={SCENE_FRAMES[7]}>
        <SceneEnding />
      </Sequence>
      <CinemaTextureOverlay />
      <NewsProgressBar starts={starts} durations={SCENE_FRAMES} />
    </AbsoluteFill>
  );
};
