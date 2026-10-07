import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { CaptionLayer } from '../CaptionLayer';

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

// ─── Track helper for smooth morph keyframes ────────────────────────────────
function track(time: number, points: [number, number][]): number {
  if (points.length === 0) return 0;
  if (time <= points[0][0]) return points[0][1];
  if (time >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [t0, v0] = points[i];
    const [t1, v1] = points[i + 1];
    if (time >= t0 && time <= t1) {
      const p = (time - t0) / (t1 - t0);
      const eased = closedFormSpring(p, 180, 24);
      return v0 + (v1 - v0) * Math.min(1, Math.max(0, eased));
    }
  }
  return points[points.length - 1][1];
}

// ─── 1. Animated SVG Checkmark Draw-on ───────────────────────────────────────
const AnimatedCheckmark: React.FC<{ progress: number; color: string }> = ({
  progress,
  color,
}) => {
  const pathLength = 52;
  const strokeDashoffset = pathLength * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div
      style={{
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        backgroundColor: `${color}22`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 20px ${color}66`,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13L9.5 17.5L19 7"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
    </div>
  );
};

// ─── 2. Floating Toast Notification ─────────────────────────────────────────
const FloatingToast: React.FC<{
  show: boolean;
  sceneLocalTime: number;
  triggerTime: number;
  primaryColor: string;
}> = ({ show, sceneLocalTime, triggerTime, primaryColor }) => {
  const elapsed = sceneLocalTime - triggerTime;
  if (elapsed <= 0 || !show) return null;

  const springP = closedFormSpring(elapsed, 210, 22);

  return (
    <div
      style={{
        position: 'absolute',
        top: '110px',
        right: '40px',
        padding: '14px 22px',
        borderRadius: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: `1.5px solid ${primaryColor}66`,
        boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 25px rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transform: `translateX(${(1 - springP) * 120}px) scale(${0.9 + springP * 0.1})`,
        opacity: springP,
        backdropFilter: 'blur(16px)',
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#10B981',
          boxShadow: '0 0 8px #10B981',
        }}
      />
      <div>
        <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '14px' }}>
          Atualização Sincronizada
        </div>
        <div style={{ color: '#94A3B8', fontSize: '12px' }}>
          Deploy concluído em 140ms
        </div>
      </div>
    </div>
  );
};

// ─── 3. Stepped Progress Dots ───────────────────────────────────────────────
const ProgressDots: React.FC<{ activeStep: number; totalSteps?: number; color: string }> = ({
  activeStep,
  totalSteps = 3,
  color,
}) => {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const isActive = i <= activeStep;
        return (
          <div
            key={i}
            style={{
              width: i === activeStep ? '24px' : '8px',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: isActive ? color : 'rgba(255,255,255,0.15)',
              boxShadow: isActive ? `0 0 8px ${color}` : 'none',
              transition: 'all 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
};

// ─── Main UIMotionMorph Composition ─────────────────────────────────────────
export const UIMotionMorphComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#3B82F6', // Electric Indigo
  accentColor = '#10B981',  // Success Green
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'LINEAR MOTION OS',
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

  // ── Multi-stage Continuous Morphing (One Shape, Never Cut) ──
  // Stage 0 (0.0s -> 0.7s): Pill Action Button
  // Stage 1 (0.7s -> 2.0s): Command Bar Input
  // Stage 2 (2.0s -> 3.8s): Full Modal / Feature Card
  // Stage 3 (3.8s -> dur): Success Badge & Checkmark

  const currentStage =
    sceneLocalTime < 0.7 ? 0 : sceneLocalTime < 2.0 ? 1 : sceneLocalTime < 3.8 ? 2 : 3;

  const targetWidth = isLandscape
    ? track(sceneLocalTime, [
        [0.0, 280],
        [0.7, 620],
        [2.0, 780],
        [3.8, 480],
      ])
    : track(sceneLocalTime, [
        [0.0, 260],
        [0.7, 520],
        [2.0, 680],
        [3.8, 440],
      ]);

  const targetHeight = isLandscape
    ? track(sceneLocalTime, [
        [0.0, 64],
        [0.7, 72],
        [2.0, 480],
        [3.8, 110],
      ])
    : track(sceneLocalTime, [
        [0.0, 64],
        [0.7, 72],
        [2.0, 560],
        [3.8, 110],
      ]);

  const targetRadius = track(sceneLocalTime, [
    [0.0, 32],
    [0.7, 20],
    [2.0, 28],
    [3.8, 30],
  ]);

  // Dynamic Shadow Depth proportional to size
  const shadowDepth = interpolate(targetHeight, [64, 560], [20, 80]);

  // Linear / Vercel style rotating border angle
  const borderAngle = (frame * 3) % 360;

  // Checkmark progress in Stage 3
  const checkmarkProgress = (sceneLocalTime - 3.8) / 0.6;

  // Typing cursor blink
  const isCursorVisible = Math.floor(frame / 12) % 2 === 0;

  // Haptic shake on morph transitions
  const isTransitioning =
    (sceneLocalTime > 0.65 && sceneLocalTime < 0.8) ||
    (sceneLocalTime > 1.95 && sceneLocalTime < 2.1) ||
    (sceneLocalTime > 3.75 && sceneLocalTime < 3.9);
  const hapticShake = isTransitioning ? Math.sin(frame * 0.8) * 3 : 0;

  const caption = currentScene.captionText || 'SISTEMA DE ANIMAÇÃO UI PROCEDURAL REATIVO';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#030712',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── 1. Fluid Radial Atmosphere ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 35%, ${primaryColor}22 0%, transparent 65%),
            radial-gradient(circle at 80% 80%, #111827 0%, #030712 100%)
          `,
        }}
      />

      {/* Cyber Dot Grid */}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.6,
        }}
      />

      {/* ── 2. Floating Toast Notification ── */}
      <FloatingToast
        show={sceneLocalTime >= 2.5}
        sceneLocalTime={sceneLocalTime}
        triggerTime={2.5}
        primaryColor={primaryColor}
      />

      {/* ── 3. Top Navigation Bar ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '28px' : '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '820px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: primaryColor,
              boxShadow: `0 0 10px ${primaryColor}`,
            }}
          />
          <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>
            {watermarkText}
          </span>
        </div>

        <ProgressDots activeStep={currentStage} totalSteps={4} color={primaryColor} />
      </div>

      {/* ── 4. Main Morphing Shape (One Continuous Element) ── */}
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
            width: `${targetWidth}px`,
            height: `${targetHeight}px`,
            borderRadius: `${targetRadius}px`,
            position: 'relative',
            boxShadow: `0 ${shadowDepth * 0.4}px ${shadowDepth}px rgba(0, 0, 0, 0.85), 0 0 45px ${primaryColor}33`,
            transform: `translate(${hapticShake}px, 0)`,
            transition: 'none',
          }}
        >
          {/* Rotating Conic Border Accent */}
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: `${targetRadius + 2}px`,
              background: `conic-gradient(from ${borderAngle}deg, ${primaryColor}, ${accentColor}, transparent 55%, ${primaryColor})`,
              zIndex: 1,
            }}
          />

          {/* Morphing Inner Card Surface */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: `${targetRadius}px`,
              backgroundColor: '#0B0F19',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              padding: '20px',
            }}
          >
            {/* STAGE 0: Action Pill Button */}
            {currentStage === 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '16px',
                }}
              >
                <span>⚡</span>
                <span>INICIAR FLUXO</span>
              </div>
            )}

            {/* STAGE 1: Command Search Input with Cursor */}
            {currentStage === 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: '12px',
                  padding: '0 8px',
                }}
              >
                <span style={{ fontSize: '20px' }}>🔍</span>
                <span style={{ color: '#E2E8F0', fontWeight: 600, fontSize: '18px' }}>
                  Gerando pipeline de produção
                </span>
                {isCursorVisible && (
                  <div style={{ width: '2px', height: '22px', backgroundColor: primaryColor }} />
                )}
                <span
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: '#1E293B',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ESC
                </span>
              </div>
            )}

            {/* STAGE 2: Full Feature Modal with Skeleton Shimmers */}
            {currentStage === 2 && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: primaryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}
                    >
                      🚀
                    </div>
                    <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '18px' }}>
                      Feature Card Modular
                    </span>
                  </div>
                  <span style={{ color: '#10B981', fontSize: '13px', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                </div>

                {/* Skeleton shimmer bars */}
                <div
                  style={{
                    width: '100%',
                    height: '120px',
                    borderRadius: '14px',
                    backgroundColor: '#131B2E',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                      transform: `translateX(${(frame * 4) % 300 - 150}%)`,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '85%', height: '14px', borderRadius: '4px', backgroundColor: '#1E293B' }} />
                  <div style={{ width: '60%', height: '14px', borderRadius: '4px', backgroundColor: '#1E293B' }} />
                </div>
              </div>
            )}

            {/* STAGE 3: Success Badge & Checkmark */}
            {currentStage === 3 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <AnimatedCheckmark progress={checkmarkProgress} color={accentColor} />
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '18px' }}>
                    OPERAÇÃO COMPLETA
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Sem inconsistências no estado
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>

      {/* ── 5. Bottom Caption ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isLandscape ? '24px' : '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '88%',
          maxWidth: '820px',
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '1px',
          zIndex: 40,
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
};
