import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

// ─── Deterministic RNG ──────────────────────────────────────────────────────
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Closed-form spring (pure function of time) ─────────────────────────────
function closedFormSpring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// ─── Sparkle Burst for S-Tier ───────────────────────────────────────────────
const SparkleTierBurst: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const sparkles = React.useMemo(() => {
    const r = createRng(77218);
    return Array.from({ length: 18 }, (_, i) => ({
      x: 10 + r() * 80,
      y: 10 + r() * 80,
      delay: r() * 60,
      size: 4 + r() * 8,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {sparkles.map((s, idx) => {
        const localFrame = (frame + s.delay) % 50;
        const opacity = Math.sin((localFrame / 50) * Math.PI);
        const scale = 0.5 + opacity * 0.8;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: '#FDE047',
              borderRadius: '50%',
              boxShadow: `0 0 10px #FDE047, 0 0 20px ${primaryColor}`,
              opacity,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </div>
  );
};

interface TierDef {
  grade: string;
  name: string;
  color: string;
  bgGrad: string;
  items: string[];
}

// ─── Main TierList Composition ──────────────────────────────────────────────
export const TierListComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#EF4444', // S-tier Red
  accentColor = '#F59E0B',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'TIER LIST RANKING',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;

  // Scene timing resolution
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;
  let sceneStartFrame = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      sceneStartFrame = Math.round(accumulatedTime * fps);
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;
  const isLandscape = format === 'horizontal' || width > height;

  // Default tiers
  const tiers: TierDef[] = [
    { grade: 'S', name: 'GOD TIER', color: '#EF4444', bgGrad: 'rgba(239, 68, 68, 0.2)', items: ['Elite'] },
    { grade: 'A', name: 'EXCELENTE', color: '#F97316', bgGrad: 'rgba(249, 115, 22, 0.15)', items: ['Ótimo'] },
    { grade: 'B', name: 'BOM', color: '#FACC15', bgGrad: 'rgba(250, 204, 21, 0.12)', items: ['Decente'] },
    { grade: 'C', name: 'MEDÍOCRE', color: '#22C55E', bgGrad: 'rgba(34, 197, 94, 0.1)', items: ['Aceitável'] },
    { grade: 'D', name: 'LIXO', color: '#3B82F6', bgGrad: 'rgba(59, 130, 246, 0.1)', items: ['Horrível'] },
  ];

  // Incoming item placement dynamics
  const placementItem = currentScene.letteringLines?.[0]?.text || currentScene.captionText || 'NOVO ITEM';
  const targetTierIndex = 0; // S-tier placement by default
  const dropSpring = closedFormSpring(sceneLocalTime - 0.4, 150, 19);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090C15',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Atmosphere Background ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 20%, #172033 0%, #090C15 80%)',
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }}
      />

      {/* ── 2. Top Header ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '880px',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '999px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            color: '#FACC15',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          DEFINITIVE RANKING
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: isLandscape ? '34px' : '38px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.2,
          }}
        >
          {currentScene.captionText || 'ONDE ESTE ITEM SE ENCAIXA?'}
        </h1>
      </div>

      {/* ── 3. Tier Rows Board ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '130px' : '170px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '880px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 30,
        }}
      >
        {tiers.map((tier, idx) => {
          const isTargetTier = idx === targetTierIndex;
          const rowDelay = idx * 0.06;
          const rowSpring = closedFormSpring(sceneLocalTime - rowDelay, 160, 24);

          return (
            <div
              key={tier.grade}
              style={{
                display: 'flex',
                height: isLandscape ? '68px' : '62px',
                borderRadius: '16px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: `1.5px solid ${isTargetTier ? tier.color : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isTargetTier ? `0 0 25px ${tier.color}44` : 'none',
                overflow: 'hidden',
                transform: `translateX(${(1 - rowSpring) * -40}px)`,
                opacity: rowSpring,
                position: 'relative',
              }}
            >
              {/* Grade Header Column */}
              <div
                style={{
                  width: '74px',
                  backgroundColor: tier.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#000000',
                  boxShadow: `inset -2px 0 10px rgba(0,0,0,0.3)`,
                }}
              >
                {tier.grade}
              </div>

              {/* Items Area */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: '12px',
                  backgroundColor: tier.bgGrad,
                  position: 'relative',
                }}
              >
                {tier.grade === 'S' && <SparkleTierBurst frame={frame} primaryColor={tier.color} />}

                {/* Pre-existing items */}
                {tier.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#E2E8F0',
                      fontSize: '15px',
                      fontWeight: 700,
                    }}
                  >
                    {item}
                  </div>
                ))}

                {/* Placed Target Item with Gravity Recoil */}
                {isTargetTier && (
                  <div
                    style={{
                      padding: '6px 18px',
                      borderRadius: '10px',
                      backgroundColor: tier.color,
                      color: '#000000',
                      fontSize: '16px',
                      fontWeight: 900,
                      boxShadow: `0 0 16px ${tier.color}`,
                      transform: `scale(${dropSpring}) translateY(${(1 - dropSpring) * -30}px)`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>👑</span>
                    <span>{placementItem}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 4. Floating Flying Card Stage (Before Landing) ── */}
      {dropSpring < 0.8 && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '60px' : '140px',
            left: '50%',
            transform: `translateX(-50%) translateY(${dropSpring * -180}px) scale(${1 - dropSpring * 0.3})`,
            padding: '16px 36px',
            borderRadius: '20px',
            backgroundColor: '#1E293B',
            border: '2px solid #FACC15',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(250, 204, 21, 0.4)',
            color: '#FFFFFF',
            fontSize: '24px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 60,
          }}
        >
          <span>🎯</span>
          <span>{placementItem}</span>
        </div>
      )}

      {/* ── 5. Watermark Footer ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '16px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          <span style={{ color: primaryColor }}>●</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
