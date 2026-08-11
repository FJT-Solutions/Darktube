import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// GlitchOverlay — efeito de entrada de cena com glitch / distorção
// Não usa CSS animations — tudo via useCurrentFrame() + interpolate()
// ─────────────────────────────────────────────────────────────────────────────

// Glitch na entrada da cena — dura ~20 frames e some
export const GlitchOverlay: React.FC<{
  intensity?: number;       // 0.0–1.0
  durationFrames?: number;  // quantos frames o efeito dura (default: 20)
  primaryColor?: string;    // cor de destaque do glitch
}> = ({ intensity = 0.8, durationFrames = 20, primaryColor = '#EAB308' }) => {
  const frame = useCurrentFrame();

  // Envelope: máximo nos primeiros 5 frames, diminui até zero
  const envelope = interpolate(
    frame,
    [0, 5, durationFrames],
    [1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  const amt = envelope * intensity;
  if (amt < 0.01) return null;

  // Posições das listras de glitch (deterministico por frame, não aleatório)
  const stripes = [
    { y: 15 + Math.sin(frame * 1.1) * 10, h: 3 + Math.sin(frame * 2.3) * 2, x: Math.sin(frame * 3.7) * 30 * amt },
    { y: 35 + Math.sin(frame * 2.5) * 8,  h: 2 + Math.cos(frame * 1.7) * 1.5, x: Math.cos(frame * 2.1) * 20 * amt },
    { y: 60 + Math.sin(frame * 0.9) * 12, h: 4 + Math.sin(frame * 3.1) * 2, x: Math.sin(frame * 4.3) * 25 * amt },
    { y: 80 + Math.cos(frame * 1.8) * 6,  h: 2, x: Math.cos(frame * 1.3) * 15 * amt },
  ];

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }}>
      {/* Listras de glitch horizontal */}
      {stripes.map((stripe, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${stripe.y}%`,
            left: 0,
            right: 0,
            height: `${stripe.h}%`,
            transform: `translateX(${stripe.x}px)`,
            background: i % 2 === 0
              ? `rgba(255, 0, 80, ${0.25 * amt})`
              : `rgba(0, 200, 255, ${0.2 * amt})`,
            mixBlendMode: 'screen',
          }}
        />
      ))}

      {/* Scanlines finas */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,${0.15 * amt}) 2px,
            rgba(0,0,0,${0.15 * amt}) 4px
          )`,
        }}
      />

      {/* Flash inicial */}
      {frame < 3 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: primaryColor,
            opacity: interpolate(frame, [0, 3], [0.3 * intensity, 0], { extrapolateRight: 'clamp' }),
            mixBlendMode: 'screen',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// Overlay de light-leak cinematográfico — transição quente/nostálgica
export const LightLeakOverlay: React.FC<{
  intensity?: number;
  durationFrames?: number;
}> = ({ intensity = 0.6, durationFrames = 25 }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [0, durationFrames * 0.3, durationFrames],
    [0, intensity, 0],
    { extrapolateRight: 'clamp' }
  );

  const xOffset = interpolate(frame, [0, durationFrames], [-40, 60], { extrapolateRight: 'clamp' });

  if (progress < 0.02) return null;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 45,
        background: `radial-gradient(ellipse 60% 120% at ${50 + xOffset}% 50%,
          rgba(255, 200, 100, ${progress * 0.8}) 0%,
          rgba(255, 140, 50, ${progress * 0.4}) 40%,
          transparent 70%
        )`,
        mixBlendMode: 'screen',
      }}
    />
  );
};

// Flash branco de corte de câmera
export const FlashOverlay: React.FC<{
  intensity?: number;
  durationFrames?: number;
}> = ({ intensity = 1, durationFrames = 10 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 2, durationFrames],
    [intensity, intensity * 0.7, 0],
    { extrapolateRight: 'clamp' }
  );

  if (opacity < 0.01) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        opacity,
        pointerEvents: 'none',
        zIndex: 60,
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ParticlesOverlay — partículas flutuantes cinematográficas (poeira/bokeh)
// 100% via frame interpolation, sem CSS animations
// ─────────────────────────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7)  % 100,
  size: 3 + (i % 5) * 2,
  speed: 0.015 + (i % 4) * 0.008,
  phase: i * 0.7,
  opacity: 0.15 + (i % 3) * 0.1,
}));

export const ParticlesOverlay: React.FC<{
  intensity?: number;
  durationFrames?: number;
  color?: string;
}> = ({ intensity = 0.7, durationFrames = 90, color = '#ffffff' }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationFrames - 20, durationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const envelope = Math.min(fadeIn, fadeOut) * intensity;

  if (envelope < 0.01) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 42, overflow: 'hidden' }}>
      {PARTICLES.map((p, i) => {
        // Float upward + slight horizontal drift — deterministic per frame
        const yOffset = ((frame * p.speed * 100) % 120) - 10;
        const xDrift  = Math.sin(frame * 0.03 + p.phase) * 3;
        const yPos    = (p.y - yOffset + 100) % 110;
        const scale   = 0.6 + Math.sin(frame * 0.04 + p.phase) * 0.4;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x + xDrift}%`,
              top: `${yPos}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: p.opacity * envelope,
              transform: `scale(${scale})`,
              filter: `blur(${p.size * 0.4}px)`,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ColorGradingLayer — aplica perfis de color grading via CSS filter
// Posicionado sobre a imagem, sob os overlays
// ─────────────────────────────────────────────────────────────────────────────
const GRADING_FILTERS: Record<string, string> = {
  cinematic:   'contrast(1.22) saturate(0.78) brightness(0.88)',
  warm:        'sepia(0.28) saturate(1.35) brightness(1.04)',
  cold:        'saturate(0.72) hue-rotate(195deg) brightness(0.94)',
  vintage:     'sepia(0.55) contrast(1.12) saturate(0.75) brightness(0.85)',
  hdr:         'contrast(1.38) saturate(1.45) brightness(1.06)',
  'dark-academia': 'sepia(0.45) contrast(1.18) saturate(0.65) brightness(0.82)',
  cyberpunk:   'hue-rotate(260deg) saturate(1.6) contrast(1.25) brightness(0.92)',
  'warm-cinema':   'sepia(0.22) saturate(1.28) brightness(1.02) contrast(1.1)',
  'dramatic-bw':   'saturate(0) contrast(1.4) brightness(0.85)',
  'vibrant-gold':  'sepia(0.18) saturate(1.55) brightness(1.08) hue-rotate(-10deg)',
};

// Overlay de cor emocional tonal (vinheta colorida)
export const ColorGradingLayer: React.FC<{
  colorGrading?: string;
  emotionColor?: string | null;
  intensity?: number;
}> = ({ colorGrading, emotionColor, intensity = 0.8 }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  const filter = (colorGrading && colorGrading !== 'none')
    ? GRADING_FILTERS[colorGrading] || ''
    : '';

  const hasEmotion = emotionColor && emotionColor !== 'null';

  if (!filter && !hasEmotion) return null;

  return (
    <>
      {/* Filtro de color grading — camada de tint sobre toda a cena */}
      {filter && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            zIndex: 30,
            opacity: fadeIn * intensity,
            backdropFilter: filter,
            // Workaround: usa um div transparente com mix-blend para tint
          }}
        >
          {/* Aplica o filtro via uma div com background semi-transparente + mix-blend */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: getGradingTint(colorGrading || 'none'),
              mixBlendMode: 'multiply',
              opacity: 0.35 * intensity * fadeIn,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Overlay emocional — vinheta colorida baseada em emotionColor */}
      {hasEmotion && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            zIndex: 31,
            background: `radial-gradient(ellipse at center, transparent 40%, ${emotionColor}18 80%, ${emotionColor}30 100%)`,
            opacity: fadeIn * intensity * 0.6,
          }}
        />
      )}
    </>
  );
};

function getGradingTint(grading: string): string {
  switch (grading) {
    case 'cinematic':     return 'linear-gradient(135deg, #0a0a2a 0%, #1a0e3a 100%)';
    case 'warm':          return 'linear-gradient(135deg, #3d1a00 0%, #6b2e00 100%)';
    case 'cold':          return 'linear-gradient(135deg, #001a3d 0%, #002b5e 100%)';
    case 'vintage':       return 'linear-gradient(135deg, #3d2b00 0%, #5e3a00 100%)';
    case 'hdr':           return 'linear-gradient(135deg, #1a001a 0%, #0a1a0a 100%)';
    case 'dark-academia': return 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)';
    case 'cyberpunk':     return 'linear-gradient(135deg, #0d001a 0%, #00001a 100%)';
    case 'warm-cinema':   return 'linear-gradient(135deg, #2d1500 0%, #4a2000 100%)';
    case 'dramatic-bw':   return 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)';
    case 'vibrant-gold':  return 'linear-gradient(135deg, #2d2000 0%, #4a3500 100%)';
    default:              return 'transparent';
  }
}
