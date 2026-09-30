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

interface TimelineMilestone {
  year: string;
  title: string;
  description: string;
}

// ─── Main TimelineHistory Composition ───────────────────────────────────────
export const TimelineHistoryComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#F59E0B', // Historic Amber Gold
  accentColor = '#3B82F6',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'CRONOLOGIA HISTÓRICA',
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

  // Default timeline milestones
  const milestones: TimelineMilestone[] = [
    { year: '1945', title: 'O Ponto de Inflexão', description: 'Início da era atômica e redefinição geopolítica.' },
    { year: '1969', title: 'A Conquista Lunar', description: 'O ser humano pisa em outro corpo celeste pela primeira vez.' },
    { year: '1991', title: 'O Colapso do Bloco', description: 'Fim da Guerra Fria e expansão da rede global.' },
    { year: '2026', title: 'A Singularidade Sintética', description: 'Inteligência artificial autônoma acelera o desenvolvimento global.' },
  ];

  const activeMilestoneIndex = activeSceneIndex % milestones.length;
  const activeMilestone = milestones[activeMilestoneIndex];

  // Continuous Timeline Track Scroll
  const scrollProg = Math.min(1, sceneLocalTime / dur);
  const trackOffset = activeMilestoneIndex * -220 - scrollProg * 40;

  // Active Milestone Card Spring
  const cardSpring = closedFormSpring(sceneLocalTime, 140, 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090B10',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Warm Historical Atmosphere ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 25%, ${primaryColor}22 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, #151A24 0%, #090B10 100%)
          `,
        }}
      />

      {/* Grid Pattern */}
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
          top: isLandscape ? '24px' : '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: `${primaryColor}22`,
              border: `1.5px solid ${primaryColor}`,
              color: primaryColor,
              fontWeight: 900,
              fontSize: '12px',
              letterSpacing: '2px',
            }}
          >
            ERA HISTÓRICA #{activeMilestoneIndex + 1}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 700 }}>
            {watermarkText}
          </span>
        </div>
      </div>

      {/* ── 3. Central Scrolling Timeline Rail ── */}
      <div
        style={{
          position: 'absolute',
          left: isLandscape ? '140px' : '50px',
          top: isLandscape ? '120px' : '160px',
          bottom: '120px',
          width: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          zIndex: 20,
        }}
      >
        {/* Animated Progress Laser Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${Math.min(100, (activeMilestoneIndex + scrollProg) * 28)}%`,
            backgroundColor: primaryColor,
            boxShadow: `0 0 12px ${primaryColor}`,
          }}
        />
      </div>

      {/* ── 4. Active Milestone Hero Card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 80px 0 220px' : '0 24px 0 80px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '760px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: `2px solid ${primaryColor}88`,
            borderRadius: '28px',
            boxShadow: `0 25px 70px rgba(0,0,0,0.9), 0 0 35px ${primaryColor}22`,
            padding: isLandscape ? '36px 40px' : '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            transform: `translateY(${(1 - cardSpring) * 45}px) scale(${0.96 + cardSpring * 0.04})`,
            opacity: cardSpring,
            backdropFilter: 'blur(16px)',
            position: 'relative',
          }}
        >
          {/* Milestone Year Badge with Pulse */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: isLandscape ? '56px' : '46px',
                fontWeight: 900,
                color: primaryColor,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 25px ${primaryColor}66`,
              }}
            >
              {activeMilestone.year}
            </div>

            <div
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#10B981',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              MARCO CONFIRMADO
            </div>
          </div>

          {/* Title */}
          <h2
            style={{
              margin: 0,
              fontSize: isLandscape ? '36px' : '30px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.25,
            }}
          >
            {activeMilestone.title}
          </h2>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: isLandscape ? '22px' : '18px',
              color: '#CBD5E1',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {currentScene.captionText || activeMilestone.description}
          </p>

          {/* Connecting Branch Marker */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: isLandscape ? '-84px' : '-34px',
              width: isLandscape ? '80px' : '30px',
              height: '2px',
              backgroundColor: primaryColor,
              boxShadow: `0 0 8px ${primaryColor}`,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* ── 5. Brand Watermark ── */}
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
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px',
          }}
        >
          <span style={{ color: primaryColor }}>●</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
