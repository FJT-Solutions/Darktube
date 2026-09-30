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

// ─── Animated Pulse Flow Line SVG ───────────────────────────────────────────
const PulseFlowConnector: React.FC<{
  frame: number;
  progress: number;
  color: string;
}> = ({ frame, progress, color }) => {
  if (progress <= 0) return null;
  const dashOffset = -(frame * 4) % 24;

  return (
    <svg width="40" height="70" viewBox="0 0 40 70" fill="none">
      <line
        x1="20"
        y1="0"
        x2="20"
        y2="70"
        stroke={color}
        strokeWidth="3"
        strokeDasharray="6 6"
        strokeDashoffset={dashOffset}
      />
      <polygon points="12,60 28,60 20,70" fill={color} />
    </svg>
  );
};

// ─── Main ProcessFlowchart Composition ──────────────────────────────────────
export const ProcessFlowchartComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#10B981', // Flow Success Green
  accentColor = '#6366F1',  // Process Indigo
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'PIPELINE FLOWCHART OS',
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

  // Process Steps
  const steps = [
    { title: '1. CAPTAÇÃO DE SINAL', desc: 'Ingestão de dados em streaming', icon: '📡' },
    { title: '2. FILTRAGEM NEURAL', desc: 'Eliminação de ruídos e anomalias', icon: '🧠' },
    { title: '3. DEPLOY AUTOMÁTICO', desc: 'Distribuição multi-região segura', icon: '🚀' },
  ];

  // Progressive Stage Activation
  const activeStep = sceneLocalTime < 1.4 ? 0 : sceneLocalTime < 2.8 ? 1 : 2;

  const title = currentScene.letteringLines?.[0]?.text || 'FLUXO DE EXECUÇÃO EM 3 ETAPAS';
  const subtitle = currentScene.captionText || 'Cada fase é validada criptograficamente antes de avançar para a próxima camada.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050811',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Futuristic Circuit Grid ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 30%, ${accentColor}22 0%, transparent 65%),
            radial-gradient(circle at 80% 80%, #0D1527 0%, #050811 100%)
          `,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          opacity: 0.7,
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
          SISTEMA AUTOMATIZADO
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

      {/* ── 3. Flowchart Steps Vertical Rail ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '110px 40px 80px' : '150px 24px 120px',
          zIndex: 30,
        }}
      >
        {steps.map((st, idx) => {
          const isActive = idx === activeStep;
          const isPassed = idx < activeStep;
          const stepSpring = closedFormSpring(sceneLocalTime - idx * 0.4, 160, 22);

          let borderColor = 'rgba(255,255,255,0.1)';
          let glow = 'none';
          if (isActive) {
            borderColor = primaryColor;
            glow = `0 0 25px ${primaryColor}55`;
          } else if (isPassed) {
            borderColor = 'rgba(16, 185, 129, 0.4)';
          }

          return (
            <React.Fragment key={idx}>
              <div
                style={{
                  width: isLandscape ? '580px' : '90%',
                  padding: '18px 24px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: `2px solid ${borderColor}`,
                  boxShadow: `0 12px 35px rgba(0,0,0,0.6), ${glow}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transform: `scale(${0.95 + stepSpring * 0.05})`,
                  opacity: stepSpring,
                  backdropFilter: 'blur(12px)',
                  position: 'relative',
                }}
              >
                {/* Node Icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: isActive ? `${primaryColor}33` : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  {st.icon}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ color: isActive ? primaryColor : '#FFFFFF', fontWeight: 800, fontSize: '18px' }}>
                    {st.title}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                    {st.desc}
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {isPassed ? (
                    <span style={{ color: '#10B981', fontSize: '20px' }}>✓</span>
                  ) : isActive ? (
                    <span style={{ color: primaryColor, fontSize: '12px', fontWeight: 900 }}>EXECUTANDO</span>
                  ) : (
                    <span style={{ color: '#64748B', fontSize: '12px' }}>AGUARDANDO</span>
                  )}
                </div>
              </div>

              {/* Connecting Flow Arrow between nodes */}
              {idx < steps.length - 1 && (
                <PulseFlowConnector
                  frame={frame}
                  progress={stepSpring}
                  color={isActive ? primaryColor : 'rgba(255,255,255,0.2)'}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── 4. Bottom Description Bar ── */}
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
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 40,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
