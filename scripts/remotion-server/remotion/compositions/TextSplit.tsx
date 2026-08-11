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

// ─── Editorial text: título bold com barra neon lateral animada ───────────────
export const EditorialText: React.FC<{
  text: string;
  primaryColor: string;
  fontSize: number;
  frame: number;
  fontWeight?: number;
}> = ({ text, primaryColor, fontSize, frame, fontWeight = 900 }) => {
  const { fps } = useVideoConfig();

  const slideIn = interpolate(frame, [0, 14], [-60, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 8],  [0,   1], { extrapolateRight: 'clamp' });
  const barScale = interpolate(frame, [0, 18], [0, 1],  { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        opacity,
        transform: `translateX(${slideIn}px)`,
        willChange: 'transform, opacity',
      }}
    >
      {/* Barra neon lateral */}
      <div
        style={{
          width: '6px',
          height: `${fontSize * 1.2}px`,
          backgroundColor: primaryColor,
          boxShadow: `0 0 16px ${primaryColor}, 0 0 32px ${primaryColor}88`,
          borderRadius: '3px',
          transform: `scaleY(${barScale})`,
          transformOrigin: 'bottom center',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize,
          fontWeight,
          fontFamily: 'Montserrat, Inter, sans-serif',
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          lineHeight: 1.15,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ─── Kinetic Pop text: snap elástico ultra-dramático (spring stiff) ────────────
export const KineticPopText: React.FC<{
  text: string;
  primaryColor: string;
  fps: number;
  isVertical: boolean;
  springConfig: { damping: number; stiffness: number; mass: number };
  frame: number;
}> = ({ text, primaryColor, fps, isVertical, springConfig, frame }) => {
  const scaleVal = spring({ frame: Math.max(0, frame), fps, config: springConfig });

  const scaleX = interpolate(scaleVal, [0, 1], [0.2, 1], { extrapolateRight: 'clamp' });
  const scaleY = interpolate(scaleVal, [0, 0.5, 1], [2.2, 0.85, 1.0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(scaleVal, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
        transformOrigin: 'center bottom',
        color: '#ffffff',
        fontSize: isVertical ? 120 : 95,
        fontWeight: 900,
        fontFamily: 'Montserrat, sans-serif',
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: '10px 28px',
        backgroundColor: primaryColor,
        borderRadius: '12px',
        boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 60px ${primaryColor}66`,
        border: '4px solid rgba(255,255,255,0.2)',
        opacity,
        willChange: 'transform, opacity',
        WebkitTextStroke: '2px rgba(0,0,0,0.4)',
      }}
    >
      {text}
    </div>
  );
};
