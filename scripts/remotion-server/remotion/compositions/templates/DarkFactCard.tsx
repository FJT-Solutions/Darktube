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

// ─── Danger / Creepiness Meter SVG ──────────────────────────────────────────
const DangerMeter: React.FC<{ dangerLevel: number; springP: number }> = ({
  dangerLevel,
  springP,
}) => {
  const bars = 10;
  const activeBars = Math.round(dangerLevel * springP);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#94A3B8' }}>
        <span>NÍVEL DE PERIGO</span>
        <span style={{ color: activeBars > 7 ? '#EF4444' : '#F59E0B' }}>{activeBars}/10</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', height: '8px' }}>
        {Array.from({ length: bars }, (_, i) => {
          const isActive = i < activeBars;
          const color = i < 4 ? '#22C55E' : i < 7 ? '#F59E0B' : '#EF4444';
          return (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: '2px',
                backgroundColor: isActive ? color : 'rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 8px ${color}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Floating Spooky Fog Particles ──────────────────────────────────────────
const SpookyFogOverlay: React.FC<{ frame: number; primaryColor: string }> = ({
  frame,
  primaryColor,
}) => {
  const blobs = React.useMemo(() => {
    const r = createRng(66219);
    return Array.from({ length: 6 }, (_, i) => ({
      x: 10 + r() * 80,
      y: 20 + r() * 60,
      radius: 140 + r() * 180,
      speedX: (r() - 0.5) * 0.4,
      speedY: (r() - 0.5) * 0.3,
    }));
  }, []);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {blobs.map((b, idx) => {
        const curX = b.x + Math.sin(frame * 0.02 + idx) * 8;
        const curY = b.y + Math.cos(frame * 0.025 + idx) * 8;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${curX}%`,
              top: `${curY}%`,
              width: `${b.radius * 2}px`,
              height: `${b.radius * 2}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primaryColor}22 0%, transparent 70%)`,
              filter: 'blur(35px)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Main DarkFactCard Composition ──────────────────────────────────────────
export const DarkFactCardComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#DC2626', // Blood Crimson Red
  accentColor = '#FACC15',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'ARQUIVO CONFIDENCIAL',
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

  // Card Animation Dynamics
  const enterSpring = closedFormSpring(sceneLocalTime, 140, 20);
  const cardScale = 0.94 + enterSpring * 0.06;
  const cardTranslateY = (1 - enterSpring) * 60;

  // Fact Text & Metadata
  const factNumber = String(activeSceneIndex + 1).padStart(2, '0');
  const factText = currentScene.captionText || 'Mais de 80% dos oceanos continuam completamente inexplorados e habitados por espécies desconhecidas.';
  const words = currentScene.words || [];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#04060A',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Spooky Fog and Deep Gradient ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 35%, ${primaryColor}26 0%, transparent 65%),
            radial-gradient(circle at 20% 80%, #0B1120 0%, #04060A 100%)
          `,
        }}
      />

      <SpookyFogOverlay frame={frame} primaryColor={primaryColor} />

      {/* Screen Vignette Border */}
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.85)',
          pointerEvents: 'none',
        }}
      />

      {/* ── 2. Top Header Category Badge ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '54px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '840px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            backgroundColor: 'rgba(220, 38, 38, 0.15)',
            border: `1.5px solid ${primaryColor}`,
            color: '#F87171',
            fontWeight: 900,
            fontSize: '13px',
            letterSpacing: '2px',
          }}
        >
          <span>👁️</span>
          <span>FATO OBSCURO #{factNumber}</span>
        </div>

        <div style={{ color: '#64748B', fontSize: '13px', fontWeight: 700 }}>
          CLASSIFICADO // CONFIDENCIAL
        </div>
      </div>

      {/* ── 3. Central Fact Card Container ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 80px' : '0 24px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '70%' : '90%',
            maxWidth: '840px',
            borderRadius: '32px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '2px solid rgba(255,255,255,0.08)',
            boxShadow: `0 25px 70px rgba(0,0,0,0.9), 0 0 40px ${primaryColor}22`,
            padding: isLandscape ? '36px 40px' : '36px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            transform: `translateY(${cardTranslateY}px) scale(${cardScale})`,
            opacity: enterSpring,
            backdropFilter: 'blur(16px)',
            position: 'relative',
          }}
        >
          {/* Top of Card: Emoji Spotlight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: 'rgba(220, 38, 38, 0.2)',
                border: `1.5px solid ${primaryColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                boxShadow: `0 0 20px ${primaryColor}44`,
              }}
            >
              ⚠️
            </div>
            <div>
              <span style={{ fontSize: '14px', color: '#EF4444', fontWeight: 800, letterSpacing: '1px' }}>
                ALERTA DE SEGURANÇA
              </span>
              <h3 style={{ margin: 0, fontSize: '22px', color: '#FFFFFF', fontWeight: 800 }}>
                {currentScene.letteringLines?.[0]?.text || 'VOCÊ SABIA DISSO?'}
              </h3>
            </div>
          </div>

          {/* Main Fact Text with Word-by-word Highlight or Text */}
          <div style={{ minHeight: '120px' }}>
            {words.length > 0 ? (
              <p style={{ margin: 0, fontSize: isLandscape ? '28px' : '26px', lineHeight: 1.45, fontWeight: 700 }}>
                {words.map((w, wIdx) => {
                  const isWordActive = time >= w.startInSeconds && time <= w.endInSeconds;
                  const isPassed = time > w.endInSeconds;

                  return (
                    <span
                      key={wIdx}
                      style={{
                        color: isWordActive ? '#FACC15' : isPassed ? '#FFFFFF' : '#64748B',
                        backgroundColor: isWordActive ? 'rgba(250, 204, 21, 0.18)' : 'transparent',
                        padding: isWordActive ? '2px 4px' : '0',
                        borderRadius: '4px',
                        fontWeight: isWordActive ? 900 : 700,
                        marginRight: '6px',
                        display: 'inline-block',
                        transform: isWordActive ? 'scale(1.08)' : 'none',
                        transition: 'none',
                      }}
                    >
                      {w.word}
                    </span>
                  );
                })}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: isLandscape ? '28px' : '26px',
                  lineHeight: 1.45,
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {factText}
              </p>
            )}
          </div>

          {/* Danger Meter Indicator */}
          <DangerMeter dangerLevel={8} springP={enterSpring} />

          {/* Footer Citation */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: '#64748B',
            }}
          >
            <span>Fonte: Arquivos Desclassificados (Doc #492-B)</span>
            <span style={{ color: '#FACC15' }}>CONFIRMADO ✓</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── 4. Swipe for More CTA ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '20px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#94A3B8',
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '1px',
          }}
        >
          <span>ARRASTE PARA O PRÓXIMO FATO</span>
          <span style={{ animation: 'bounce 1s infinite' }}>▲</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
