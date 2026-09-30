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

// ─── Audio Waveform Visualizer Bars ─────────────────────────────────────────
const WaveformBars: React.FC<{ frame: number; color: string }> = ({ frame, color }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px' }}>
      {Array.from({ length: 8 }, (_, i) => {
        const height = Math.abs(Math.sin(frame * 0.25 + i * 0.7)) * 18 + 4;
        return (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${height}px`,
              backgroundColor: color,
              borderRadius: '999px',
            }}
          />
        );
      })}
    </div>
  );
};

// ─── Main SplitScreenReaction Composition ───────────────────────────────────
export const SplitScreenReactionComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#F43F5E', // Reaction Rose
  accentColor = '#3B82F6',  // Original Video Blue
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'SIDE-BY-SIDE REACTION',
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

  // Keyframe Springs
  const panel1Spring = closedFormSpring(sceneLocalTime, 140, 20);
  const panel2Spring = closedFormSpring(sceneLocalTime - 0.25, 140, 20);

  // Reaction active speaker: oscillates between panel 1 & 2
  const isPanel1Speaking = Math.sin(frame * 0.08) > 0;

  const title = currentScene.letteringLines?.[0]?.text || 'REAÇÃO AO VIVO: CLÍMAX INESPERADO';
  const subtitle = currentScene.captionText || 'Veja a diferença na reação exata no momento da revelação.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090B10',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Atmosphere ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 50%, #151A24 0%, #090B10 80%)',
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
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: '999px',
            backgroundColor: `${primaryColor}22`,
            border: `1.5px solid ${primaryColor}`,
            color: primaryColor,
            fontWeight: 900,
            fontSize: '12px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          DUAL ANGLE VIEW
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: isLandscape ? '32px' : '28px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
      </div>

      {/* ── 3. Split Arena Panels ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: isLandscape ? '110px 60px 80px' : '160px 24px 130px',
          zIndex: 30,
        }}
      >
        {/* Panel 1: Original Source */}
        <div
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            backgroundColor: '#111827',
            border: `2.5px solid ${isPanel1Speaking ? accentColor : 'rgba(255,255,255,0.1)'}`,
            boxShadow: isPanel1Speaking ? `0 0 30px ${accentColor}44` : 'none',
            overflow: 'hidden',
            position: 'relative',
            transform: `scale(${0.96 + panel1Spring * 0.04})`,
            opacity: panel1Spring,
          }}
        >
          {currentScene.imageUrl ? (
            <Img
              src={currentScene.imageUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}
            >
              🎬
            </div>
          )}

          {/* Panel 1 Badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: '6px 14px',
              borderRadius: '999px',
              border: `1px solid ${accentColor}`,
            }}
          >
            <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12px' }}>
              ORIGINAL
            </span>
            {isPanel1Speaking && <WaveformBars frame={frame} color={accentColor} />}
          </div>
        </div>

        {/* Panel 2: Reactor / Facecam */}
        <div
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            backgroundColor: '#111827',
            border: `2.5px solid ${!isPanel1Speaking ? primaryColor : 'rgba(255,255,255,0.1)'}`,
            boxShadow: !isPanel1Speaking ? `0 0 30px ${primaryColor}44` : 'none',
            overflow: 'hidden',
            position: 'relative',
            transform: `scale(${0.96 + panel2Spring * 0.04})`,
            opacity: panel2Spring,
          }}
        >
          {currentScene.subjectImageUrl || currentScene.foregroundUrl ? (
            <Img
              src={currentScene.subjectImageUrl || currentScene.foregroundUrl || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #881337 0%, #0F172A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}
            >
              😲
            </div>
          )}

          {/* Panel 2 Badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: '6px 14px',
              borderRadius: '999px',
              border: `1px solid ${primaryColor}`,
            }}
          >
            <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '12px' }}>
              REAÇÃO
            </span>
            {!isPanel1Speaking && <WaveformBars frame={frame} color={primaryColor} />}
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Caption ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '20px' : '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: '15px',
          fontWeight: 700,
          zIndex: 40,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
