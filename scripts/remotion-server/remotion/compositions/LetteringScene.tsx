import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { LetteringLine } from '../types';

interface LetteringSceneProps {
  lines?: LetteringLine[];
  fallbackText?: string;
  primaryColor?: string;
  accentColor?: string;
  exitDirection?: 'left' | 'right' | 'up' | 'down';
}

export const LetteringScene: React.FC<LetteringSceneProps> = ({
  lines,
  fallbackText,
  primaryColor = '#EAB308',
  accentColor = '#FFFFFF',
  exitDirection = 'left',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fallback se não vierem linhas estruturadas
  const resolvedLines: LetteringLine[] = lines && lines.length > 0 ? lines : [
    { text: fallbackText?.split(' ').slice(0, 3).join(' ') || 'DESCUBRA O', size: 80, weight: 900, color: '#E2E8F0' },
    { text: fallbackText?.split(' ').slice(3).join(' ') || 'SEGREDO', size: 125, weight: 900, color: primaryColor, isHighlight: true },
  ];

  // Quadruple Exit nos últimos 12 frames
  const exitStartFrame = Math.max(0, durationInFrames - 12);
  const isExiting = frame >= exitStartFrame;
  const exitProgress = isExiting
    ? interpolate(frame, [exitStartFrame, durationInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const exitBlur = exitProgress * 20;
  const exitOpacity = 1 - exitProgress;
  const exitScale = 1 - exitProgress * 0.08;

  let exitX = 0;
  let exitY = 0;
  if (exitDirection === 'left') exitX = -exitProgress * 1200;
  else if (exitDirection === 'right') exitX = exitProgress * 1200;
  else if (exitDirection === 'up') exitY = -exitProgress * 900;
  else if (exitDirection === 'down') exitY = exitProgress * 900;

  // Micro-animação global de idle float
  const idleFloatY = Math.sin(frame * 0.04) * 4;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        zIndex: 5,
        transform: `translate(${exitX}px, ${exitY + idleFloatY}px) scale(${exitScale})`,
        filter: `blur(${exitBlur}px)`,
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '920px',
          textAlign: 'center',
        }}
      >
        {resolvedLines.map((line, lineIdx) => {
          const words = line.text.split(' ');
          const lineFontSize = line.size || (line.isHighlight ? 120 : 80);
          const lineColor = line.color || (line.isHighlight ? primaryColor : accentColor);
          const isHero = line.isHighlight;

          return (
            <div
              key={lineIdx}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {words.map((word, wordIdx) => {
                const globalWordIndex = lineIdx * 3 + wordIdx;
                const delay = globalWordIndex * 3.5; // Stagger é Lei (3-4f)

                // Spring Validado (damping: 14, mass: 0.8)
                const enterProgress = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 14, mass: 0.8 },
                });

                const enterY = interpolate(enterProgress, [0, 1], [60, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const enterBlur = interpolate(enterProgress, [0, 1], [14, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const enterScale = isHero
                  ? interpolate(enterProgress, [0, 0.7, 1], [0.4, 1.14, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    })
                  : enterProgress;

                // Micro-animação para pontuação (?, !, %)
                const isPunctuation = word.includes('?') || word.includes('!') || word.includes('%');
                const punctRotate = isPunctuation ? Math.sin((frame + wordIdx * 10) * 0.08) * 4 : 0;

                return (
                  <span
                    key={wordIdx}
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Nunito', 'Fredoka', 'Montserrat', 'Inter', sans-serif",
                      fontSize: `${lineFontSize}px`,
                      fontWeight: line.weight || 900,
                      letterSpacing: isHero ? '-3px' : '-1px',
                      textTransform: 'uppercase',
                      color: lineColor,
                      lineHeight: 1.05,
                      transform: `translateY(${enterY}px) scale(${enterScale}) rotate(${punctRotate}deg)`,
                      filter: `blur(${enterBlur}px)`,
                      opacity: enterProgress > 0.05 ? 1 : 0,
                      // Sombra Cartoon Sólida SEM blur (Padrão VERBO Motion)
                      textShadow: isHero
                        ? `0 8px 0 rgba(0, 0, 0, 0.35)`
                        : `0 6px 0 rgba(0, 0, 0, 0.25)`,
                      position: 'relative',
                    }}
                  >
                    {/* Marca-texto / Caixa de Destaque Cartoon para palavras Hero */}
                    {isHero && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '-8px',
                          right: '-8px',
                          height: '38%',
                          backgroundColor: `${primaryColor}40`,
                          zIndex: -1,
                          borderRadius: '8px',
                          transform: `scaleX(${interpolate(enterProgress, [0, 1], [0, 1], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                          })})`,
                          transformOrigin: 'left center',
                        }}
                      />
                    )}
                    {word}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
