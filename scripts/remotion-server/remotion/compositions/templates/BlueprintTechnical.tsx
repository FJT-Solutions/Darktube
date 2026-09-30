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

// ─── Technical Dimension Line SVG ───────────────────────────────────────────
const TechnicalDimensionLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  progress: number;
}> = ({ x1, y1, x2, y2, label, progress }) => {
  if (progress <= 0) return null;

  return (
    <g opacity={Math.min(1, progress * 1.5)}>
      {/* Dimension Line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#93C5FD"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      {/* End Ticks */}
      <line x1={x1} y1={y1 - 6} x2={x1} y2={y1 + 6} stroke="#93C5FD" strokeWidth="2" />
      <line x1={x2} y1={y2 - 6} x2={x2} y2={y2 + 6} stroke="#93C5FD" strokeWidth="2" />
      {/* Label */}
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 8}
        fill="#93C5FD"
        fontSize="12"
        fontFamily="monospace"
        textAnchor="middle"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
};

// ─── Technical Cartouche (Title Block) ──────────────────────────────────────
const TechnicalTitleBlock: React.FC<{
  sceneIndex: number;
  systemName: string;
}> = ({ sceneIndex, systemName }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        width: '280px',
        border: '2px solid rgba(147, 197, 253, 0.7)',
        backgroundColor: 'rgba(10, 37, 64, 0.85)',
        backdropFilter: 'blur(8px)',
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#93C5FD',
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(147, 197, 253, 0.4)' }}>
        <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid rgba(147, 197, 253, 0.4)' }}>
          DWG NO: DT-2026-X{sceneIndex + 1}
        </div>
        <div style={{ width: '80px', padding: '4px 8px' }}>SCALE: 1:25</div>
      </div>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(147, 197, 253, 0.4)' }}>
        TITLE: {systemName}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px' }}>
        <span>REV: 04.B</span>
        <span style={{ color: '#6EE7B7' }}>STATUS: APPROVED</span>
      </div>
    </div>
  );
};

// ─── Main BlueprintTechnical Composition ────────────────────────────────────
export const BlueprintTechnicalComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#38BDF8', // Cyan Blueprint Line
  accentColor = '#FACC15',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'ENGINEERING BLUEPRINT SPEC',
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

  // Assembly Exploded View Mechanics
  const assembleSpring = closedFormSpring(sceneLocalTime, 140, 20);
  const explodeOffset = (1 - assembleSpring) * 60;

  const title = currentScene.letteringLines?.[0]?.text || 'SEÇÃO TRANSVERSAL ELETROMECÂNICA';
  const description = currentScene.captionText || 'Esquema detalhado dos componentes de transmissão e tolerâncias de pressão externa.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A2540', // Deep Cyanotype Blueprint Blue
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* ── 1. Authentic Blueprint Grid ── */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 197, 253, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 197, 253, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 197, 253, 0.25) 1.5px, transparent 1.5px),
            linear-gradient(90deg, rgba(147, 197, 253, 0.25) 1.5px, transparent 1.5px)
          `,
          backgroundSize: '120px 120px',
        }}
      />

      {/* Outer Technical Border Frame */}
      <div
        style={{
          position: 'absolute',
          inset: '16px',
          border: '2px solid rgba(147, 197, 253, 0.6)',
          pointerEvents: 'none',
          zIndex: 35,
        }}
      />

      {/* ── 2. Top Blueprint Header ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '28px' : '44px',
          left: '36px',
          right: '36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#93C5FD',
          zIndex: 40,
        }}
      >
        <div>
          <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#38BDF8' }}>
            // SPECIFICATION SHEET //
          </span>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: isLandscape ? '28px' : '24px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
            }}
          >
            {title}
          </h1>
        </div>
        <div
          style={{
            padding: '6px 12px',
            border: '1.5px solid #EF4444',
            color: '#EF4444',
            fontWeight: 900,
            fontSize: '12px',
            letterSpacing: '1px',
            transform: 'rotate(-4deg)',
          }}
        >
          CONFIDENCIAL
        </div>
      </div>

      {/* ── 3. Central Exploded Technical Diagram ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
        }}
      >
        <div style={{ position: 'relative', width: '420px', height: '420px' }}>
          <svg width="420" height="420" viewBox="0 0 420 420">
            {/* Center Core Rings */}
            <circle
              cx="210"
              cy="210"
              r="70"
              stroke="#38BDF8"
              strokeWidth="2.5"
              fill="rgba(56, 189, 248, 0.08)"
            />
            <circle
              cx="210"
              cy="210"
              r="110"
              stroke="#93C5FD"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              fill="none"
              transform={`rotate(${frame * 0.4} 210 210)`}
            />
            {/* Exploded Outer Ring Shells */}
            <circle
              cx="210"
              cy={210 - explodeOffset}
              r="140"
              stroke="#38BDF8"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="210"
              cy={210 + explodeOffset}
              r="165"
              stroke="#93C5FD"
              strokeWidth="1.5"
              strokeDasharray="8 6"
              fill="none"
            />

            {/* Dimension Lines */}
            <TechnicalDimensionLine
              x1={70}
              y1={210}
              x2={350}
              y2={210}
              label="Ø 280 mm ±0.02"
              progress={assembleSpring}
            />
            <TechnicalDimensionLine
              x1={210}
              y1={70}
              x2={210}
              y2={350}
              label="H 280 mm"
              progress={assembleSpring}
            />
          </svg>
        </div>
      </AbsoluteFill>

      {/* ── 4. Technical Title Block (Cartouche) ── */}
      <TechnicalTitleBlock sceneIndex={activeSceneIndex} systemName={title} />

      {/* ── 5. Bottom Description Bar ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '32px' : '90px',
          left: '36px',
          width: isLandscape ? '50%' : '80%',
          backgroundColor: 'rgba(10, 37, 64, 0.85)',
          padding: '16px 20px',
          borderLeft: '4px solid #38BDF8',
          borderTop: '1px solid rgba(147, 197, 253, 0.3)',
          borderRight: '1px solid rgba(147, 197, 253, 0.3)',
          borderBottom: '1px solid rgba(147, 197, 253, 0.3)',
          zIndex: 40,
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#E2E8F0', lineHeight: 1.45, fontWeight: 500 }}>
          {description}
        </p>
      </div>

      {/* ── 6. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '36px',
            color: 'rgba(147, 197, 253, 0.5)',
            fontSize: '11px',
            letterSpacing: '1px',
            zIndex: 40,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};
