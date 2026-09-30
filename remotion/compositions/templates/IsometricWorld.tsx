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

// ─── Isometric 3D Pillar (Top, Left, Right Faces) ───────────────────────────
const IsometricPillar: React.FC<{
  isoX: number;
  isoY: number;
  height: number;
  springProg: number;
  color: string;
  label: string;
}> = ({ isoX, isoY, height, springProg, color, label }) => {
  const currentH = height * springProg;
  const topY = isoY - currentH;

  return (
    <g>
      {/* Pillar Shadow */}
      <polygon
        points={`${isoX},${isoY} ${isoX + 45},${isoY + 25} ${isoX},${isoY + 50} ${isoX - 45},${isoY + 25}`}
        fill="rgba(0,0,0,0.4)"
      />

      {/* Left Face */}
      <polygon
        points={`${isoX - 45},${topY + 25} ${isoX},${topY + 50} ${isoX},${isoY + 50} ${isoX - 45},${isoY + 25}`}
        fill={color}
        opacity="0.75"
      />

      {/* Right Face */}
      <polygon
        points={`${isoX},${topY + 50} ${isoX + 45},${topY + 25} ${isoX + 45},${isoY + 25} ${isoX},${isoY + 50}`}
        fill={color}
        opacity="0.55"
      />

      {/* Top Face */}
      <polygon
        points={`${isoX},${topY} ${isoX + 45},${topY + 25} ${isoX},${topY + 50} ${isoX - 45},${topY + 25}`}
        fill={color}
        opacity="0.95"
      />

      {/* Label floating above top */}
      {springProg > 0.8 && (
        <text
          x={isoX}
          y={topY - 12}
          fill="#FFFFFF"
          fontSize="13"
          fontFamily="Montserrat, sans-serif"
          fontWeight="bold"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
};

// ─── Main IsometricWorld Composition ────────────────────────────────────────
export const IsometricWorldComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#6366F1', // Indigo Cyber City
  accentColor = '#06B6D4',  // Cyan Data stream
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'ISOMETRIC ECOSYSTEM',
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

  // Camera Pan & Tilt
  const panX = Math.sin(frame * 0.02) * 20;
  const panY = Math.cos(frame * 0.015) * 15;

  // Pillar Definitions
  const pillars = [
    { x: 300, y: 380, h: 140, color: '#3B82F6', label: 'IA NÓ' },
    { x: 420, y: 320, h: 220, color: '#6366F1', label: 'CLOUD' },
    { x: 540, y: 380, h: 180, color: '#06B6D4', label: 'DB' },
    { x: 420, y: 440, h: 110, color: '#10B981', label: 'FINTECH' },
  ];

  const title = currentScene.letteringLines?.[0]?.text || 'CRESCIMENTO EXPONENCIAL DO ECOSSISTEMA';
  const description = currentScene.captionText || 'Cada pilar representa uma camada independente com replicação assíncrona.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070913',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Sci-Fi Cyber Atmosphere ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 35%, ${primaryColor}26 0%, transparent 65%),
            radial-gradient(circle at 80% 80%, #0F172A 0%, #070913 100%)
          `,
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
          TOPOLOGIA 3D
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: isLandscape ? '34px' : '28px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
      </div>

      {/* ── 3. Isometric Vector Stage ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translate(${panX}px, ${panY}px)`,
          zIndex: 30,
        }}
      >
        <svg width="840" height="600" viewBox="0 0 840 600">
          {/* Isometric Base Grid */}
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={160 + i * 45}
              y1={240 + i * 25}
              x2={480 + i * 45}
              y2={420 + i * 25}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {/* Isometric Pillars with Cascaded Spring Growth */}
          {pillars.map((p, idx) => {
            const springProg = closedFormSpring(sceneLocalTime - idx * 0.15, 140, 18);
            return (
              <IsometricPillar
                key={idx}
                isoX={p.x}
                isoY={p.y}
                height={p.h}
                springProg={springProg}
                color={p.color}
                label={p.label}
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ── 4. Bottom Description Bar ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '24px' : '44px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: '18px 24px',
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <p style={{ margin: 0, fontSize: '15px', color: '#CBD5E1', lineHeight: 1.45, fontWeight: 600 }}>
          {description}
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
            fontSize: '12px',
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
