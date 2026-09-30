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

// ─── Draw-on Animated Arrow SVG ─────────────────────────────────────────────
const DrawOnArrow: React.FC<{ progress: number; color?: string }> = ({
  progress,
  color = '#2563EB',
}) => {
  const pathLength = 160;
  const currentLength = pathLength * Math.min(1, Math.max(0, progress));

  return (
    <svg width="180" height="40" viewBox="0 0 180 40" fill="none">
      <path
        d="M10 20 Q 80 8, 160 20"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength - currentLength}
      />
      {progress > 0.85 && (
        <path
          d="M145 10 L 165 20 L 145 30"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

// ─── Hand-Drawn Emphasis Circle SVG ─────────────────────────────────────────
const DrawOnCircle: React.FC<{ progress: number; color?: string }> = ({
  progress,
  color = '#DC2626',
}) => {
  const pathLength = 320;
  const currentLength = pathLength * Math.min(1, Math.max(0, progress));

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ellipse
        cx="50%"
        cy="50%"
        rx="46%"
        ry="42%"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength - currentLength}
        transform="rotate(-2)"
      />
    </svg>
  );
};

// ─── Main WhiteboardExplainer Composition ───────────────────────────────────
export const WhiteboardExplainerComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#2563EB', // Blue Marker
  accentColor = '#DC2626',  // Red Marker Emphasis
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'WHITEBOARD EXPLAINER',
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

  // Dynamic Drawing Sequence Timing
  const box1Prog = closedFormSpring(sceneLocalTime - 0.2, 160, 22);
  const arrowProg = (sceneLocalTime - 0.9) / 0.6;
  const box2Prog = closedFormSpring(sceneLocalTime - 1.5, 160, 22);
  const circleProg = (sceneLocalTime - 2.2) / 0.5;

  const title = currentScene.letteringLines?.[0]?.text || 'COMO FUNCIONA O SISTEMA';
  const explanation = currentScene.captionText || 'Ao conectar o nó de entrada diretamente ao processador neural, os dados são processados instantaneamente.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#F8FAFC', // Crisp clean whiteboard surface
        overflow: 'hidden',
        fontFamily: "'Comic Neue', 'Caveat', 'Patrick Hand', sans-serif, system-ui",
      }}
    >
      {/* ── 1. Subtle Whiteboard Grid ── */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Top Dry-Erase Border Marker */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '14px',
          backgroundColor: '#E2E8F0',
          borderBottom: '2px solid #CBD5E1',
          zIndex: 40,
        }}
      />

      {/* ── 2. Top Header Title ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '28px' : '56px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: isLandscape ? '42px' : '36px',
            fontWeight: 900,
            color: '#0F172A',
            letterSpacing: '-0.5px',
          }}
        >
          {title}
        </h1>
        {/* Underline drawn */}
        <div
          style={{
            width: `${Math.min(320, box1Prog * 320)}px`,
            height: '4px',
            backgroundColor: primaryColor,
            borderRadius: '2px',
            margin: '8px auto 0',
          }}
        />
      </div>

      {/* ── 3. Interactive Whiteboard Diagram Arena ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: isLandscape ? '120px 60px 80px' : '170px 24px 140px',
          zIndex: 30,
        }}
      >
        {/* Node A (Source Box) */}
        <div
          style={{
            width: isLandscape ? '280px' : '90%',
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '3px solid #0F172A',
            boxShadow: '6px 6px 0px #0F172A',
            transform: `scale(${box1Prog}) rotate(-1.5deg)`,
            opacity: box1Prog,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
            ENTRADA
          </div>
          <div style={{ fontSize: '15px', color: '#64748B', fontWeight: 700 }}>
            Dados Brutos
          </div>
        </div>

        {/* Drawn Connector Arrow */}
        <div
          style={{
            transform: isLandscape ? 'none' : 'rotate(90deg)',
            margin: isLandscape ? '0 -10px' : '10px 0',
          }}
        >
          <DrawOnArrow progress={arrowProg} color={primaryColor} />
        </div>

        {/* Node B (Target Highlight Box with Hand Circle) */}
        <div
          style={{
            width: isLandscape ? '300px' : '90%',
            padding: '24px',
            backgroundColor: '#FEF08A', // Yellow sticky note style
            borderRadius: '16px',
            border: '3px solid #0F172A',
            boxShadow: '6px 6px 0px #0F172A',
            transform: `scale(${box2Prog}) rotate(1.5deg)`,
            opacity: box2Prog,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <DrawOnCircle progress={circleProg} color={accentColor} />
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
            RESULTADO
          </div>
          <div style={{ fontSize: '15px', color: '#854D0E', fontWeight: 700 }}>
            Impacto Imediato
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Narration Card ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '24px' : '44px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          backgroundColor: '#FFFFFF',
          padding: '18px 24px',
          borderRadius: '16px',
          border: '2px solid #CBD5E1',
          boxShadow: '0 8px 25px rgba(0,0,0,0.06)',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <p style={{ margin: 0, fontSize: isLandscape ? '20px' : '18px', fontWeight: 700, color: '#334155', lineHeight: 1.4 }}>
          {explanation}
        </p>
      </div>

      {/* ── 5. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            color: '#94A3B8',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '1px',
            zIndex: 50,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};
