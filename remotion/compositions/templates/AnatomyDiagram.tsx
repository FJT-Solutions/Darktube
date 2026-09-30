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

// ─── ECG Heartbeat Monitor Waveform ─────────────────────────────────────────
const HeartbeatECG: React.FC<{ frame: number; color: string }> = ({ frame, color }) => {
  const points = [
    [0, 20], [30, 20], [40, 5], [48, 35], [56, 10], [64, 25], [72, 20], [120, 20]
  ];
  const polylineStr = points.map(([x, y]) => `${x},${y}`).join(' ');
  const scrollOffset = (frame * 3) % 120;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width="120" height="40" viewBox="0 0 120 40">
        <polyline
          points={polylineStr}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(${-scrollOffset}, 0)`}
        />
        <polyline
          points={polylineStr}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(${120 - scrollOffset}, 0)`}
        />
      </svg>
      <span style={{ color, fontSize: '13px', fontWeight: 900, fontFamily: 'monospace' }}>
        74 BPM
      </span>
    </div>
  );
};

// ─── Main AnatomyDiagram Composition ────────────────────────────────────────
export const AnatomyDiagramComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#06B6D4', // Medical Cyan
  accentColor = '#EF4444',  // Affected Zone Red
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'BIOMEDICAL SCAN DIAGNOSTICS',
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
  const scanSpring = closedFormSpring(sceneLocalTime, 140, 20);

  // Pulse & Blood Flow oscillation
  const pulseScale = 1 + Math.sin(frame * 0.18) * 0.04;

  const title = currentScene.letteringLines?.[0]?.text || 'ANÁLISE DE IMPACTO FISIOLÓGICO';
  const subtitle = currentScene.captionText || 'Visualização do sistema vascular sob estresse extremo e vasodilatação súbita.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#030812',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Medical Grid & Scan Vignette ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 35%, ${primaryColor}18 0%, transparent 65%),
            radial-gradient(circle at 80% 80%, #081120 0%, #030812 100%)
          `,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── 2. Top Header & ECG Monitor ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40,
        }}
      >
        <div>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: `${primaryColor}22`,
              border: `1.5px solid ${primaryColor}`,
              color: primaryColor,
              fontWeight: 900,
              fontSize: '11px',
              letterSpacing: '2px',
            }}
          >
            VARREDURA BIOMÉDICA
          </span>
          <h1
            style={{
              margin: '6px 0 0',
              fontSize: isLandscape ? '28px' : '24px',
              fontWeight: 900,
              color: '#FFFFFF',
            }}
          >
            {title}
          </h1>
        </div>

        <HeartbeatECG frame={frame} color="#10B981" />
      </div>

      {/* ── 3. Central Anatomical Organ / Silhouette Stage ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '380px',
            height: '380px',
            transform: `scale(${pulseScale})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="380" height="380" viewBox="0 0 380 380">
            {/* Concentric scan target rings */}
            <circle
              cx="190"
              cy="190"
              r="160"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="8 6"
              fill="none"
              opacity="0.3"
            />
            <circle
              cx="190"
              cy="190"
              r="110"
              stroke={primaryColor}
              strokeWidth="2"
              fill="rgba(6, 182, 212, 0.05)"
            />

            {/* Stylized Heart / Organ Silhouette */}
            <path
              d="M190 280 C 130 220, 90 170, 90 120 C 90 80, 120 50, 160 50 C 175 50, 185 60, 190 70 C 195 60, 205 50, 220 50 C 260 50, 290 80, 290 120 C 290 170, 250 220, 190 280 Z"
              fill="rgba(239, 68, 68, 0.25)"
              stroke={accentColor}
              strokeWidth="3"
              style={{
                filter: `drop-shadow(0 0 16px ${accentColor}88)`,
              }}
            />

            {/* Flow Impulses Particles */}
            <circle
              cx="190"
              cy={120 + Math.sin(frame * 0.2) * 50}
              r="6"
              fill="#FFFFFF"
              style={{ filter: 'drop-shadow(0 0 12px #FFFFFF)' }}
            />

            {/* Technical Callout Annotations */}
            <line x1="260" y1="110" x2="330" y2="90" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="260" cy="110" r="4" fill="#FFFFFF" />
            <text x="335" y="94" fill="#FFFFFF" fontSize="12" fontWeight="bold">
              ZONA AFETADA
            </text>

            <line x1="120" y1="170" x2="50" y2="190" stroke={primaryColor} strokeWidth="1.5" />
            <circle cx="120" cy="170" r="4" fill={primaryColor} />
            <text x="45" y="206" fill={primaryColor} fontSize="12" fontWeight="bold" textAnchor="end">
              FLUXO VASCULAR
            </text>
          </svg>
        </div>
      </AbsoluteFill>

      {/* ── 4. Bottom Diagnosis Box ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '24px' : '44px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          padding: '18px 24px',
          borderRadius: '18px',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <p style={{ margin: 0, fontSize: '15px', color: '#CBD5E1', lineHeight: 1.45, fontWeight: 600 }}>
          {subtitle}
        </p>
      </div>

      {/* ── 5. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '24px',
            color: '#64748B',
            fontSize: '11px',
            letterSpacing: '1px',
            fontWeight: 800,
            zIndex: 50,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};
