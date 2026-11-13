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

/** Exact durations matching generated news-anchor TTS segments + breathing gaps (30fps) */
export const SCENE_FRAMES = [176, 330, 254, 271, 321, 412, 255, 233]; // Total = 2252 frames = 75.07s

/** Top 8-segment broadcast news progress bar */
const NewsProgressBar: React.FC<{ starts: number[]; durations: number[] }> = ({ starts, durations }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        top: 42,
        left: 48,
        right: 48,
        height: 6,
        display: 'flex',
        gap: 8,
        zIndex: 80,
      }}
    >
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
  const drift = interpolate(frame, [0, 400], [0, -30]);
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
      {/* Subtle architectural grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 24%, ${accent}, transparent 62%), linear-gradient(180deg, rgba(9,11,16,0.3) 0%, rgba(9,11,16,0.92) 85%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** High-contrast glassmorphic subtitle with keyword highlight */
const SubtitleBar: React.FC<{ parts: Array<{ text: string; hl?: boolean }>; showFrames: number }> = ({
  parts,
  showFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame > showFrames) return null;

  const pop = spring({ frame, fps, config: { damping: 18, stiffness: 200 } });
  const ty = interpolate(pop, [0, 1], [20, 0]);
  const op = interpolate(pop, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        right: 56,
        bottom: 138,
        display: 'flex',
        justifyContent: 'center',
        opacity: op,
        transform: `translateY(${ty}px)`,
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(10, 12, 18, 0.78)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 18,
          padding: '18px 30px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 44,
          fontWeight: 800,
          lineHeight: 1.38,
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

/** Editorial header block with animated reveal */
const SceneHeader: React.FC<{ tag: string; title: string; subtitle: string; accent?: string }> = ({
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
    <div style={{ position: 'absolute', top: 108, left: 54, right: 54, zIndex: 20 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 20px',
          borderRadius: 8,
          backgroundColor: accent,
          color: '#fff',
          fontSize: 28,
          fontWeight: 800,
          fontFamily: FONT,
          letterSpacing: 1.5,
          transform: `translateX(${interpolate(s1, [0, 1], [-40, 0])}px)`,
          opacity: s1,
          boxShadow: `0 8px 24px ${accent}66`,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
        {tag}
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: FONT,
          fontSize: 58,
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.18,
          transform: `translateY(${interpolate(s2, [0, 1], [28, 0])}px)`,
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
          fontSize: 42,
          fontWeight: 800,
          color: '#ffd60a',
          lineHeight: 1.25,
          transform: `translateY(${interpolate(s2, [0, 1], [34, 0])}px)`,
          opacity: s2,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

/** Magazine-grade Cover & 0.01s Hook */
export const CoverDesign: React.FC<{ isStill?: boolean }> = ({ isStill = false }) => {
  const frame = useCurrentFrame();
  const zoom = isStill ? 1.03 : interpolate(frame, [0, 177], [1.0, 1.07]);
  const pulse = isStill ? 1 : 0.92 + 0.08 * Math.sin(frame * 0.25);

  return (
    <AbsoluteFill style={{ backgroundColor: '#07080d', fontFamily: FONT, overflow: 'hidden' }}>
      {/* Dramatic grayscale+contrast portrait with crimson rim light */}
      <Img
        src={staticFile('assets/01_jensen_portrait.jpg')}
        style={{
          position: 'absolute',
          top: -40,
          left: 0,
          width: '100%',
          height: 1220,
          objectFit: 'cover',
          objectPosition: '50% 18%',
          filter: 'grayscale(35%) contrast(1.22) brightness(0.76)',
          transform: `scale(${zoom})`,
        }}
      />
      {/* Crimson spotlight + deep vignette gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 75% 22%, rgba(230,25,46,0.34), transparent 52%), linear-gradient(180deg, rgba(7,8,13,0.45) 0%, rgba(7,8,13,0.18) 32%, rgba(7,8,13,0.94) 64%, #07080d 100%)',
        }}
      />

      {/* Top breaking ticker */}
      <div
        style={{
          position: 'absolute',
          top: 96,
          left: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          backgroundColor: 'rgba(220, 20, 40, 0.95)',
          padding: '10px 24px',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(220,20,40,0.45)',
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffd60a', opacity: pulse }} />
        <span style={{ color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: 1.5 }}>
          突发 · 掌舵33年突然辞职
        </span>
      </div>

      {/* Main Magazine Headline */}
      <div style={{ position: 'absolute', top: 730, left: 52, right: 52 }}>
        <div
          style={{
            fontSize: 88,
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
              fontSize: 74,
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
          top: 1020,
          left: 52,
          right: 52,
          borderRadius: 22,
          backgroundColor: 'rgba(18, 22, 32, 0.85)',
          border: '1px solid rgba(255,255,255,0.16)',
          padding: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ color: '#fff', fontSize: 38, fontWeight: 900 }}>NVDA</span>
            <span style={{ color: '#ff3b4e', fontSize: 44, fontWeight: 900 }}>盘中暴跌 &gt;13%</span>
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
            市值 4.01T (-14.5%)
          </div>
        </div>
        <div style={{ borderRadius: 14, overflow: 'hidden', height: 340, backgroundColor: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Img
            src={staticFile('assets/crop_05_stock.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%' }}
          />
        </div>
        {isStill && (
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            <span style={{ color: '#9ba3b5' }}>表面：私德风波</span>
            <span style={{ color: '#ff4757' }}>实质：中美AI算力精准切割 →</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Scene 1: Stock Crash + Onion Layer Breakdown */
const SceneStockAndCutting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1 (0..180): Stock evidence; Phase 2 (170..325): 3-force cutting overlay
  const phase2 = spring({ frame: Math.max(0, frame - 175), fps, config: { damping: 16, stiffness: 120 } });
  const cardScale = interpolate(phase2, [0, 1], [1, 0.9]);
  const cardFilter = interpolate(phase2, [0, 1], [0, 5]);

  const forces = [
    { label: '01 · 美国国会三委员会', sub: '外交 / 情报 / 战略竞争联名逼宫', color: '#e6192e' },
    { label: '02 · 华尔街顶级资本', sub: '股价震荡与股东诉讼火速止损', color: '#ff9f1a' },
    { label: '03 · 对华AI算力封锁', sub: '借安全合规缺口完成“去黄仁勋化”', color: '#3b82f6' },
  ];

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(230, 25, 46, 0.25)" />
      <SceneHeader
        tag="11月12日 · 真实行情取证"
        title="盘中跳水超 13%"
        subtitle="背后是围绕中美AI算力的精准切割"
      />

      <div
        style={{
          position: 'absolute',
          top: 410,
          left: 50,
          right: 50,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${cardScale})`,
          filter: `blur(${cardFilter}px) brightness(${1 - phase2 * 0.45})`,
        }}
      >
        <SpotlightDoc
          src="crop_05_stock.png"
          aspectRatio={2080 / 1160}
          sourceBadge="StockAnalysis · NASDAQ: NVDA"
          cardWidth={980}
          highlights={[
            { x: 1.5, y: 2.5, w: 36, h: 25, style: 'red_box', delayFrames: 12 },
            { x: 1.5, y: 38.5, w: 26, h: 8, style: 'yellow_hl', delayFrames: 28 },
            { x: 52.5, y: 38.5, w: 46, h: 58, style: 'red_box', delayFrames: 42 },
          ]}
          zoomTo={{ scale: 1.08, originX: '30%', originY: '35%' }}
        />
      </div>

      {/* Phase 2: 3-Force Cutting Cards pop over */}
      {frame > 170 && (
        <div
          style={{
            position: 'absolute',
            top: 480,
            left: 64,
            right: 64,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            zIndex: 30,
          }}
        >
          {forces.map((f, idx) => {
            const p = spring({
              frame: Math.max(0, frame - 180 - idx * 14),
              fps,
              config: { damping: 14, stiffness: 140 },
            });
            return (
              <div
                key={idx}
                style={{
                  transform: `translateX(${interpolate(p, [0, 1], [140, 0])}px)`,
                  opacity: p,
                  backgroundColor: 'rgba(15, 18, 28, 0.92)',
                  borderLeft: `10px solid ${f.color}`,
                  borderRadius: 16,
                  padding: '26px 32px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  borderRight: '1px solid rgba(255,255,255,0.12)',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 900, color: '#ffffff' }}>{f.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 600, color: '#cbd5e1', marginTop: 8 }}>
                  {f.sub}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

/** Scene 2: Nov 8 Internal Letter + Dynamic Highlighter Swipe */
const SceneInternalLetter: React.FC = () => {
  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(255, 195, 0, 0.16)" />
      <SceneHeader
        tag="11月8日 · 内部致歉信"
        title="承认对41年妻子不忠"
        subtitle="英伟达董事会随即启动独立调查"
        accent="#d97706"
      />
      <div style={{ position: 'absolute', top: 380, left: 60, right: 60, display: 'flex', justifyContent: 'center' }}>
        <SpotlightDoc
          src="crop_09_ifeng.png"
          aspectRatio={1295 / 1310}
          sourceBadge="公开报道 · 致公司全体的一封信"
          cardWidth={940}
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

/** Scene 3: CBS News + Floating Shareholder Suit Callout */
const SceneCBSMedia: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop2 = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 14, stiffness: 150 } });

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(59, 130, 246, 0.22)" />
      <SceneHeader
        tag="美媒连续深挖 · CBS News"
        title="牵扯直属高管与外部人物"
        subtitle="被美方指称涉“国家安全风险”"
        accent="#2563eb"
      />
      <div style={{ position: 'absolute', top: 410, left: 45, right: 45, display: 'flex', justifyContent: 'center' }}>
        <SpotlightDoc
          src="crop_06_cbs.png"
          aspectRatio={2360 / 1360}
          sourceBadge="CBS News · MoneyWatch"
          cardWidth={990}
          highlights={[
            { x: 1.2, y: 4.5, w: 55, h: 25, style: 'red_box', delayFrames: 12 },
            { x: 1.2, y: 38, w: 56, h: 11, style: 'yellow_hl', delayFrames: 30 },
            { x: 1.2, y: 86, w: 56, h: 12, style: 'yellow_hl', delayFrames: 50 },
          ]}
          zoomTo={{ scale: 1.07, originX: '30%', originY: '55%' }}
        />
      </div>

      {/* Floating investigative callout pill */}
      <div
        style={{
          position: 'absolute',
          top: 1120,
          right: 60,
          left: 60,
          opacity: pop2,
          transform: `translateY(${interpolate(pop2, [0, 1], [60, 0])}px)`,
          backgroundColor: 'rgba(20, 24, 36, 0.94)',
          border: '2px solid #ff3b4e',
          borderRadius: 18,
          padding: '22px 30px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontFamily: FONT, fontSize: 26, color: '#ff6b78', fontWeight: 800 }}>连锁反应引爆</div>
          <div style={{ fontFamily: FONT, fontSize: 36, color: '#ffffff', fontWeight: 900, marginTop: 4 }}>
            直属高管冲突 + 股东集体诉讼
          </div>
        </div>
        <div style={{ fontSize: 44, fontWeight: 900, color: '#ffd60a', fontFamily: FONT }}>!</div>
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

/** Scene 4: US Congress 3-Committee Letter + Capitol Backdrop */
const SceneCongressPressure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bills = ['《芯片安全法案》', '《AI看守法案》', '闭门宣誓作证'];

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(220, 38, 38, 0.28)" bgImage="03_us_capitol.jpg" bgOpacity={0.28} />
      <SceneHeader
        tag="美国国会 · 三大委员会联名发难"
        title="外交 · 情报 · 战略竞争"
        subtitle="联名发函要求黄仁勋闭门作证"
      />
      <div style={{ position: 'absolute', top: 410, left: 50, right: 50, display: 'flex', justifyContent: 'center' }}>
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

      {/* Staggered legislative pressure pills */}
      <div
        style={{
          position: 'absolute',
          top: 1060,
          left: 56,
          right: 56,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 18,
          justifyContent: 'center',
        }}
      >
        {bills.map((b, i) => {
          const p = spring({
            frame: Math.max(0, frame - 90 - i * 16),
            fps,
            config: { damping: 14, stiffness: 160 },
          });
          return (
            <div
              key={i}
              style={{
                opacity: p,
                transform: `scale(${interpolate(p, [0, 1], [0.75, 1])})`,
                backgroundColor: 'rgba(220, 25, 45, 0.22)',
                border: '2px solid #ff3b4e',
                borderRadius: 14,
                padding: '14px 26px',
                color: '#ffffff',
                fontFamily: FONT,
                fontSize: 32,
                fontWeight: 800,
                boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
              }}
            >
              {b}
            </div>
          );
        })}
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

/** Scene 5: Split Clash — Commercial Tightrope vs National Security Cut */
const SceneSplitClash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slash = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 18, stiffness: 110 } });
  const leftIn = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 15, stiffness: 120 } });
  const rightIn = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 15, stiffness: 120 } });

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(230, 25, 46, 0.22)" bgImage="02_jensen_sc18.jpg" bgOpacity={0.22} />
      <SceneHeader
        tag="底层博弈 · 商业 vs 政治"
        title="在华盛顿“走钢丝”的终点"
        subtitle="一旦露缝，鹰派与资本火速收网"
      />

      {/* Split comparison panels */}
      <div
        style={{
          position: 'absolute',
          top: 430,
          left: 50,
          right: 50,
          height: 820,
          display: 'flex',
          gap: 24,
        }}
      >
        {/* Left: Commercial balancing */}
        <div
          style={{
            flex: 1,
            opacity: leftIn,
            transform: `translateY(${interpolate(leftIn, [0, 1], [60, 0])}px)`,
            backgroundColor: 'rgba(18, 28, 48, 0.88)',
            border: '2px solid rgba(96, 165, 250, 0.5)',
            borderRadius: 24,
            padding: '38px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#60a5fa', fontSize: 30, fontWeight: 800, fontFamily: FONT }}>过去 · 商业平衡</div>
            <div style={{ color: '#ffffff', fontSize: 46, fontWeight: 900, fontFamily: FONT, marginTop: 12 }}>
              两头游说
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: FONT, fontSize: 33, color: '#dbeafe', fontWeight: 700 }}>
            <div>• 配合华盛顿合规底线</div>
            <div>• 游说争取特供芯片出口</div>
            <div>• 尽力保住庞大中国市场</div>
          </div>
          <div style={{ fontSize: 26, color: '#93c5fd', fontFamily: FONT, fontWeight: 700 }}>商业理性最大化</div>
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
            transform: `translateY(${interpolate(rightIn, [0, 1], [60, 0])}px)`,
            backgroundColor: 'rgba(46, 16, 24, 0.90)',
            border: '2px solid rgba(255, 59, 78, 0.75)',
            borderRadius: 24,
            padding: '38px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#ff6b78', fontSize: 30, fontWeight: 800, fontFamily: FONT }}>现在 · 彻底切割</div>
            <div style={{ color: '#ffd60a', fontSize: 46, fontWeight: 900, fontFamily: FONT, marginTop: 12 }}>
              政治收编
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: FONT, fontSize: 33, color: '#fee2e2', fontWeight: 700 }}>
            <div>• 私德丑闻暴露安全漏洞</div>
            <div>• 沦为地缘政治“负资产”</div>
            <div>• 鹰派与资本完成“去黄化”</div>
          </div>
          <div style={{ fontSize: 26, color: '#fca5a5', fontFamily: FONT, fontWeight: 700 }}>国家安全压倒一切</div>
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

/** Scene 6: Official NVIDIA Transition + Stamp Badge */
const SceneOfficialTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 12, stiffness: 180 } });

  return (
    <AbsoluteFill>
      <EditorialBackdrop accent="rgba(118, 185, 0, 0.22)" />
      <SceneHeader
        tag="11月12日 · 英伟达官方公告"
        title="掌舵33年创始人正式卸任"
        subtitle="CFO 科莱特·克雷斯暂任临时 CEO"
        accent="#5a8f00"
      />
      <div style={{ position: 'absolute', top: 410, left: 50, right: 50, display: 'flex', justifyContent: 'center' }}>
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
          top: 990,
          right: 72,
          opacity: stamp,
          transform: `scale(${interpolate(stamp, [0, 1], [1.6, 1])}) rotate(-10deg)`,
          border: '6px solid #ff2a3c',
          backgroundColor: 'rgba(15, 10, 14, 0.85)',
          color: '#ff2a3c',
          padding: '14px 28px',
          borderRadius: 12,
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 900,
          letterSpacing: 2,
          boxShadow: '0 12px 32px rgba(255,42,60,0.35)',
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

/** Scene 7: Black & White Cinema Ending */
const SceneEnding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = interpolate(frame, [0, 245], [1.08, 1.0]);
  const textIn = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18, stiffness: 100 } });

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
          top: 620,
          left: 68,
          right: 68,
          textAlign: 'center',
          opacity: textIn,
          transform: `translateY(${interpolate(textIn, [0, 1], [35, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 80,
            height: 6,
            backgroundColor: '#e6192e',
            margin: '0 auto 36px',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            fontFamily: FONT,
            fontSize: 54,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.4,
            textShadow: '0 8px 30px rgba(0,0,0,0.9)',
          }}
        >
          在AI算力成为大国博弈命脉的今天
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: FONT,
            fontSize: 58,
            fontWeight: 900,
            color: '#ffd60a',
            lineHeight: 1.35,
            textShadow: '0 8px 30px rgba(0,0,0,0.9)',
          }}
        >
          没有商业领袖，能大过国家意志
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
        <CoverDesign isStill={false} />
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
