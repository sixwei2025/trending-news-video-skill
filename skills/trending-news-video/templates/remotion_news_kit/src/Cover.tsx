import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

const BRAND_RED = '#C8102E';
const DARK_BG = '#0A0A0C';

export interface CoverConfig {
  eyebrow: string;
  line1: string;
  line2: string;
  subtitle: string;
  bgAsset?: string;
  portraitAsset?: string;
  authorLeft?: string;
  badgeRight?: string;
  sideWatermarkLeft?: string;
  sideWatermarkRight?: string;
}

export interface CoverProps {
  mode: '3x4' | '16x9';
  cover?: CoverConfig;
}

export const DEFAULT_COVER: CoverConfig = {
  eyebrow: 'SEC底牌曝光 · 深度调查',
  line1: '黄仁勋亏惨出局？',
  line2: '万亿信托底牌太狠了',
  subtitle: '工牌一夜能收走，1995年锁死的资产谁也抢不走',
  portraitAsset: 'portrait.png',
  authorLeft: '袁六伟 · 台州汇芯',
  badgeRight: '商业认知深评',
  sideWatermarkLeft: 'DEEP · EVIDENCE',
  sideWatermarkRight: 'HUIXIN · INSIGHT',
};

function resolveAssetPath(asset?: string): string {
  if (!asset) return '';
  if (asset.startsWith('assets/') || asset === 'portrait.png') {
    return staticFile(asset);
  }
  return staticFile(`assets/${asset}`);
}

/**
 * 汇芯品牌红 · 简约细体大字报封面（适配 3:4 竖版封面与 16:9 第 0.01 帧中央 810×1080 安全区内嵌）
 * 严格遵循：背景去色灰化压暗防红字冲突、人像完整不压脸、简约高级留白
 */
export const CoverDesign: React.FC<CoverProps> = ({mode, cover}) => {
  const cfg = {...DEFAULT_COVER, ...(cover || {})};
  const isWide = mode === '16x9';
  const safeW = isWide ? 810 : 1080;
  const scale = safeW / 1080;
  const portraitSrc = cfg.portraitAsset ? resolveAssetPath(cfg.portraitAsset) : staticFile('portrait.png');

  return (
    <AbsoluteFill
      style={{
        backgroundColor: DARK_BG,
        overflow: 'hidden',
        fontFamily: '"PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif',
      }}
    >
      {/* 背景真实照片去色灰化压暗纹理 + 暗夜遮罩，确保品牌红大字锐利清晰 */}
      {cfg.bgAsset && (
        <Img
          src={resolveAssetPath(cfg.bgAsset)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(0.90) brightness(0.22)',
          }}
        />
      )}
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 60%, rgba(200,16,46,0.22) 0%, rgba(10,10,12,0.92) 64%, #0A0A0C 100%), ' +
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 72px)',
        }}
      />

      {isWide && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.06)',
              fontSize: 108,
              fontWeight: 200,
              letterSpacing: 16,
              writingMode: 'vertical-rl',
            }}
          >
            {cfg.sideWatermarkLeft || 'DEEP · EVIDENCE'}
          </div>
          <div
            style={{
              position: 'absolute',
              right: 60,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(200,16,46,0.10)',
              fontSize: 108,
              fontWeight: 200,
              letterSpacing: 16,
              writingMode: 'vertical-rl',
            }}
          >
            {cfg.sideWatermarkRight || 'HUIXIN · INSIGHT'}
          </div>
        </>
      )}

      {/* 中央 3:4 安全区（16:9 模式下自动收敛在中央 810×1080 内） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1080,
          height: 1440,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 顶部眉标胶囊 */}
        <div
          style={{
            marginTop: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 28px',
            borderRadius: 999,
            border: '1.5px solid rgba(200,16,46,0.8)',
            backgroundColor: 'rgba(200,16,46,0.16)',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: BRAND_RED,
              display: 'inline-block',
            }}
          />
          <span style={{color: '#F5F5F7', fontSize: 24, fontWeight: 400, letterSpacing: 4}}>
            {cfg.eyebrow}
          </span>
        </div>

        {/* 简约细体大字报主标题（严格位于人像头顶上方，绝不压脸） */}
        <div style={{marginTop: 42, textAlign: 'center', padding: '0 36px'}}>
          <div
            style={{
              fontSize: cfg.line1.length > 9 ? 94 : 108,
              fontWeight: 300,
              color: '#FFFFFF',
              letterSpacing: 3,
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
            }}
          >
            {cfg.line1}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: cfg.line2.length > 9 ? 90 : 100,
              fontWeight: 500,
              color: '#FF2A4B',
              letterSpacing: 2,
              lineHeight: 1.15,
              textShadow: '0 8px 36px rgba(200,16,46,0.50)',
              whiteSpace: 'nowrap',
            }}
          >
            {cfg.line2}
          </div>
        </div>

        {/* 副标题 */}
        <div style={{marginTop: 32, display: 'flex', alignItems: 'center', gap: 18}}>
          <div style={{width: 44, height: 2, backgroundColor: BRAND_RED}} />
          <div style={{fontSize: 29, fontWeight: 300, color: 'rgba(255,255,255,0.90)', letterSpacing: 2}}>
            {cfg.subtitle}
          </div>
          <div style={{width: 44, height: 2, backgroundColor: BRAND_RED}} />
        </div>

        {/* 袁六伟个人高清形象照（完整头部在安全区内，底部自然渐变收口） */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 745,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          <Img
            src={portraitSrc}
            style={{
              height: 735,
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 -12px 32px rgba(0,0,0,0.82))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 150,
              background: 'linear-gradient(to top, rgba(10,10,12,0.96) 0%, rgba(10,10,12,0) 100%)',
            }}
          />
        </div>

        {/* 底部品牌栏 */}
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            left: 72,
            right: 72,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.16)',
            paddingTop: 16,
          }}
        >
          <span style={{color: '#FFFFFF', fontSize: 24, fontWeight: 400, letterSpacing: 3}}>
            {cfg.authorLeft || '袁六伟 · 台州汇芯'}
          </span>
          <span
            style={{
              backgroundColor: BRAND_RED,
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 500,
              padding: '6px 16px',
              borderRadius: 6,
              letterSpacing: 2,
            }}
          >
            {cfg.badgeRight || '商业认知深评'}
          </span>
        </div>

        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, backgroundColor: BRAND_RED}} />
      </div>
    </AbsoluteFill>
  );
};
