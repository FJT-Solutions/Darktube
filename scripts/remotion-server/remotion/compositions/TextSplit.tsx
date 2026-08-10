import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SpringPreset } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// TextSplit — anima cada letra/palavra individualmente com spring physics
// Nunca usa CSS transitions/animations (proibido no Remotion headless render)
// ─────────────────────────────────────────────────────────────────────────────

const SPRING_PRESETS: Record<SpringPreset, { damping: number; stiffness: number; mass: number }> = {
  bouncy:   { damping: 8,  stiffness: 320, mass: 0.5 },
  smooth:   { damping: 20, stiffness: 100, mass: 1.0 },
  dramatic: { damping: 5,  stiffness: 500, mass: 0.3 },
  gentle:   { damping: 30, stiffness: 80,  mass: 1.5 },
};

// ─── Split-bounce: cada letra entra com spring staggered ─────────────────────
export const SplitBounceText: React.FC<{
  text: string;
  primaryColor: string;
  fontSize: number;
  fontWeight?: number;
  springPreset?: SpringPreset;
  staggerFrames?: number;
  color?: string;
}> = ({
  text,
  primaryColor,
  fontSize,
  fontWeight = 900,
  springPreset = 'bouncy',
  staggerFrames = 2,
  color = '#ffffff',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const config = SPRING_PRESETS[springPreset] ?? SPRING_PRESETS.bouncy;

  const letters = text.split('');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '0px',
      }}
    >
      {letters.map((letter, i) => {
        const letterFrame = Math.max(0, frame - i * staggerFrames);

        const progress = spring({
          frame: letterFrame,
          fps,
          config,
        });

        const translateY = interpolate(progress, [0, 1], [80, 0]);
        const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        const scaleY = interpolate(progress, [0, 0.6, 1], [0.3, 1.15, 1.0], { extrapolateRight: 'clamp' });

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize,
              fontWeight,
              fontFamily: 'Montserrat, Inter, sans-serif',
              color: letter === ' ' ? 'transparent' : color,
              WebkitTextStroke: letter === ' ' ? 'none' : '2px rgba(0,0,0,0.6)',
              textShadow: letter === ' ' ? 'none' : `0 4px 16px rgba(0,0,0,0.7), 0 0 40px ${primaryColor}44`,
              transform: `translateY(${translateY}px) scaleY(${scaleY})`,
              opacity,
              willChange: 'transform, opacity',
              transformOrigin: 'bottom center',
              whiteSpace: letter === ' ' ? 'pre' : 'normal',
              minWidth: letter === ' ' ? '0.3em' : undefined,
            }}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
};

// ─── Typewriter: caracteres aparecem um por um ────────────────────────────────
export const TypewriterText: React.FC<{
  text: string;
  fontSize: number;
  color?: string;
  fontWeight?: number;
  charsPerSecond?: number;
}> = ({ text, fontSize, color = '#ffffff', fontWeight = 700, charsPerSecond = 12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const charsVisible = Math.floor((frame / fps) * charsPerSecond);
  const visible = text.slice(0, charsVisible);
  const cursor = charsVisible < text.length;

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily: 'Inter, Montserrat, monospace',
        color,
        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
        lineHeight: 1.3,
      }}
    >
      {visible}
      {cursor && (
        <span
          style={{
            display: 'inline-block',
            width: '3px',
            height: '1em',
            backgroundColor: color,
            marginLeft: '4px',
            opacity: frame % 20 < 10 ? 1 : 0,
            verticalAlign: 'text-bottom',
          }}
        />
      )}
    </div>
  );
};

// ─── Glitch text: texto com aberração cromática ────────────────────────────────
export const GlitchText: React.FC<{
  text: string;
  fontSize: number;
  color?: string;
  fontWeight?: number;
  intensity?: number;
}> = ({ text, fontSize, color = '#ffffff', fontWeight = 900, intensity = 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glitch presente só nos primeiros 18 frames, depois some
  const glitchProgress = interpolate(frame, [0, 18], [1, 0], { extrapolateRight: 'clamp' });
  const glitchAmt = glitchProgress * intensity;

  const redX   = Math.sin(frame * 2.1) * 8  * glitchAmt;
  const blueX  = Math.sin(frame * 3.7) * -6 * glitchAmt;
  const skewX  = Math.sin(frame * 1.3) * 4  * glitchAmt;

  const opacity = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    fontSize,
    fontWeight,
    fontFamily: 'Montserrat, Inter, sans-serif',
    textTransform: 'uppercase',
    lineHeight: 1.1,
    userSelect: 'none',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', opacity }}>
      {/* Camada vermelha (aberração) */}
      <span
        style={{
          ...baseStyle,
          color: 'rgba(255, 0, 60, 0.75)',
          transform: `translateX(${redX}px) skewX(${skewX}deg)`,
          mixBlendMode: 'screen',
        }}
      >
        {text}
      </span>
      {/* Texto principal */}
      <span
        style={{
          ...baseStyle,
          color,
          textShadow: `0 0 20px ${color}66, 0 2px 8px rgba(0,0,0,0.9)`,
          position: 'relative',
        }}
      >
        {text}
      </span>
      {/* Camada azul (aberração) */}
      <span
        style={{
          ...baseStyle,
          color: 'rgba(0, 180, 255, 0.75)',
          transform: `translateX(${blueX}px)`,
          mixBlendMode: 'screen',
        }}
      >
        {text}
      </span>
    </div>
  );
};
