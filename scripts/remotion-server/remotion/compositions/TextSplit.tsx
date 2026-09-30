import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SpringPreset } from '../types';
import { closedFormSpring } from '../../lib/motion';

// ─────────────────────────────────────────────────────────────────────────────
// TextSplit — anima cada letra/palavra individualmente com spring physics
// Usa closedFormSpring determinístico analítico da lib/motion
// ─────────────────────────────────────────────────────────────────────────────

const SPRING_PHYSICS: Record<SpringPreset, { k: number; d: number }> = {
  bouncy:   { k: 280, d: 18 },
  smooth:   { k: 120, d: 24 },
  dramatic: { k: 450, d: 14 },
  gentle:   { k: 80,  d: 28 },
};

// ─── Split-bounce: cada letra/palavra entra com spring staggered ─────────────────────
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
  const config = SPRING_PHYSICS[springPreset] ?? SPRING_PHYSICS.bouncy;

  // Se o texto for longo (frase inteira), divide por palavras. Se for palavra curta, por letras.
  const isSingleWord = text.length <= 16;
  const items = isSingleWord ? text.split('') : text.split(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: isSingleWord ? '0px' : '14px',
        maxWidth: '92%',
      }}
    >
      {items.map((item, i) => {
        const tSeconds = Math.max(0, (frame - i * staggerFrames) / fps);
        const progress = closedFormSpring(tSeconds, config.k, config.d);

        const translateY = interpolate(progress, [0, 1], [60, 0]);
        const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        const scale = interpolate(progress, [0, 0.6, 1], [0.5, 1.12, 1.0], { extrapolateRight: 'clamp' });

        const isHighlight = i % 2 === 0;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize,
              fontWeight,
              fontFamily: 'Montserrat, Inter, Impact, sans-serif',
              textTransform: 'uppercase',
              color: isHighlight ? primaryColor : color,
              WebkitTextStroke: '4px #000000',
              paintOrder: 'stroke fill',
              textShadow: '0 6px 18px rgba(0,0,0,0.9)',
              transform: `translateY(${translateY}px) scale(${scale})`,
              opacity,
              willChange: 'transform, opacity',
              transformOrigin: 'bottom center',
              whiteSpace: isSingleWord && item === ' ' ? 'pre' : 'normal',
              minWidth: isSingleWord && item === ' ' ? '0.3em' : undefined,
            }}
          >
            {item}
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

// ─── Glitch text: texto com aberração cromática nativa (sem duplicação de DOM) ─────
export const GlitchText: React.FC<{
  text: string;
  fontSize: number;
  color?: string;
  fontWeight?: number;
  intensity?: number;
}> = ({ text, fontSize, color = '#ffffff', fontWeight = 900, intensity = 0.7 }) => {
  const frame = useCurrentFrame();

  // Glitch nos primeiros 18 frames
  const glitchProgress = interpolate(frame, [0, 18], [1, 0], { extrapolateRight: 'clamp' });
  const glitchAmt = glitchProgress * intensity;

  const redX = Math.sin(frame * 2.1) * 5 * glitchAmt;
  const blueX = Math.sin(frame * 3.7) * -5 * glitchAmt;
  const opacity = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize,
        fontWeight,
        fontFamily: 'Montserrat, Inter, Impact, sans-serif',
        textTransform: 'uppercase',
        color,
        WebkitTextStroke: '4px #000000',
        paintOrder: 'stroke fill',
        textShadow: `${redX}px 0 rgba(255, 30, 80, 0.9), ${blueX}px 0 rgba(0, 230, 255, 0.9), 0 8px 24px rgba(0,0,0,0.95)`,
        opacity,
        letterSpacing: '1px',
        lineHeight: 1.1,
      }}
    >
      {text}
    </span>
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
  const scaleVal = closedFormSpring(Math.max(0, frame / fps), 380, 16);

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
