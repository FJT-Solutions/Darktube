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
