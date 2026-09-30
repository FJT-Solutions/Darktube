import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { LetteringLine } from '../types';
import { closedFormSpring } from '../../lib/motion';

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
        filter: exitBlur > 0.5 ? `blur(${exitBlur}px)` : 'none',
        opacity: exitOpacity,
      }}
    >
      {/* Decorative Documentary HUD Kicker */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255, 230, 0, 0.12)',
          border: `1.5px solid ${primaryColor}`,
          borderRadius: '100px',
          padding: '8px 22px',
          color: primaryColor,
          fontFamily: "'Montserrat', 'Inter', sans-serif",
          fontSize: '22px',
          fontWeight: 900,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '24px',
          boxShadow: `0 0 25px ${primaryColor}44`,
          opacity: interpolate(frame, [0, 4], [0.8, 1], { extrapolateRight: 'clamp' }),
          transform: `scale(${interpolate(frame, [0, 8], [1.15, 1.0], { extrapolateRight: 'clamp' })})`,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: primaryColor,
            boxShadow: `0 0 10px ${primaryColor}`,
          }}
        />
        DOSSIÊ REVELADO
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          maxWidth: '920px',
          textAlign: 'center',
          position: 'relative',
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
                // Linha 0 visível imediatamente desde o frame 0 (zero tela preta)
                const isLineZero = lineIdx === 0;
                const delay = isLineZero ? wordIdx * 2.0 : 4 + (lineIdx * 3) + (wordIdx * 2.5);

                const tSec = Math.max(0, (frame - delay) / fps);
                const springVal = closedFormSpring(tSec, 180, 22);

                // No frame 0, line 0 começa já visível com punch slam
                const enterProgress = isLineZero ? Math.max(0.7, springVal) : springVal;

                const enterY = isLineZero
                  ? interpolate(frame, [0, 8], [15, 0], { extrapolateRight: 'clamp' })
                  : interpolate(enterProgress, [0, 1], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

                const enterScale = isLineZero
                  ? interpolate(frame, [0, 8], [1.18, 1.0], { extrapolateRight: 'clamp' })
                  : isHero
                  ? interpolate(enterProgress, [0, 0.7, 1], [0.6, 1.12, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  : Math.max(0.8, enterProgress);

                const opacity = isLineZero ? 1 : (enterProgress > 0.05 ? 1 : 0);

                // Micro-animação para pontuação (?, !, %)
                const isPunctuation = word.includes('?') || word.includes('!') || word.includes('%');
                const punctRotate = isPunctuation ? Math.sin((frame + wordIdx * 10) * 0.08) * 4 : 0;

                return (
                  <span
                    key={wordIdx}
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Montserrat', 'Inter', Impact, sans-serif",
                      fontSize: `${lineFontSize}px`,
                      fontWeight: line.weight || 900,
                      letterSpacing: isHero ? '-1px' : '0px',
                      textTransform: 'uppercase',
                      color: lineColor,
                      lineHeight: 1.05,
                      WebkitTextStroke: '4px #000000',
                      paintOrder: 'stroke fill',
                      transform: `translateY(${enterY}px) scale(${enterScale}) rotate(${punctRotate}deg)`,
                      opacity,
                      textShadow: `0 8px 25px rgba(0, 0, 0, 0.95), 0 0 35px ${lineColor}66`,
                      position: 'relative',
                    }}
                  >
                    {/* Marca-texto / Glow de Destaque para palavras Hero */}
                    {isHero && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '-6px',
                          right: '-6px',
                          height: '35%',
                          backgroundColor: `${lineColor}33`,
                          zIndex: -1,
                          borderRadius: '6px',
                          transform: `scaleX(${interpolate(enterProgress, [0, 1], [0.5, 1], {
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
