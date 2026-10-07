import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneSegment } from '../types';

export interface WordTiming {
  word: string;
  startInSeconds: number;
  endInSeconds: number;
}

export interface CaptionChunk {
  words: WordTiming[];
  startInSeconds: number;
  endInSeconds: number;
}

export function chunkWords(words: WordTiming[], maxWordsPerChunk = 3, maxChars = 22): CaptionChunk[] {
  if (!words || words.length === 0) return [];
  const chunks: CaptionChunk[] = [];
  let currentWords: WordTiming[] = [];
  let currentChars = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isPunctuationEnd = /[.,!?:;]$/.test(w.word.trim());
    const nextW = words[i + 1];
    const bigPause = nextW ? (nextW.startInSeconds - w.endInSeconds > 0.35) : false;

    currentWords.push(w);
    currentChars += w.word.length + 1;

    if (
      currentWords.length >= maxWordsPerChunk ||
      currentChars >= maxChars ||
      isPunctuationEnd ||
      bigPause ||
      i === words.length - 1
    ) {
      chunks.push({
        words: currentWords,
        startInSeconds: currentWords[0].startInSeconds,
        endInSeconds: nextW ? nextW.startInSeconds : currentWords[currentWords.length - 1].endInSeconds + 0.3,
      });
      currentWords = [];
      currentChars = 0;
    }
  }
  return chunks;
}

export const CaptionLayer: React.FC<{
  scene: SceneSegment;
  captionStyle?: string;
  primaryColor?: string;
  accentColor?: string;
  durationFrames?: number;
  format?: string;
  localFrame?: number;
  customBottom?: string;
}> = ({
  scene,
  captionStyle = 'pop',
  primaryColor = '#FFE600',
  accentColor = '#FFFFFF',
  durationFrames,
  format = 'vertical',
  localFrame,
  customBottom,
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = localFrame !== undefined ? localFrame : currentFrame;
  const currentTimeInScene = frame / fps;

  const isVertical = format === 'vertical';
  const words = (scene.words || []) as WordTiming[];
  const highlightColor = primaryColor || '#FFE600';
  const effectiveDurationFrames = durationFrames || Math.round((scene.durationSeconds || 5) * fps);

  // 1. MODO SINCRONIZADO POR PHRASE-CHUNKS (Viral Grade 10 Standard)
  if (words.length > 0) {
    const chunks = chunkWords(words, 3, 20);
    if (chunks.length === 0) return null;

    let activeChunk = chunks.find(
      (c) => currentTimeInScene >= c.startInSeconds && currentTimeInScene < c.endInSeconds
    );

    if (!activeChunk && currentTimeInScene < chunks[0].startInSeconds) {
      activeChunk = chunks[0];
    }
    if (!activeChunk && currentTimeInScene >= chunks[chunks.length - 1].endInSeconds) {
      activeChunk = chunks[chunks.length - 1];
    }

    if (!activeChunk) return null;

    const fadeOut = interpolate(frame, [effectiveDurationFrames - 5, effectiveDurationFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <div
        style={{
          position: 'absolute',
          bottom: customBottom || (isVertical ? '18%' : '12%'),
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 60,
          pointerEvents: 'none',
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isVertical ? '12px 18px' : '10px 14px',
            padding: isVertical ? '16px 32px' : '12px 24px',
            borderRadius: '24px',
            backgroundColor: 'rgba(5, 8, 20, 0.85)',
            border: '1.5px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.85), 0 0 25px rgba(0,0,0,0.6)',
            maxWidth: '100%',
          }}
        >
          {activeChunk.words.map((w, idx) => {
            const nextWord = activeChunk!.words[idx + 1];
            const wordEnd = nextWord ? nextWord.startInSeconds : (w.endInSeconds + 0.25);
            const isActive = currentTimeInScene >= w.startInSeconds && currentTimeInScene < wordEnd;
            const isPast = currentTimeInScene >= wordEnd;

            const wordFrame = Math.max(0, frame - Math.round(w.startInSeconds * fps));
            const punchScale = isActive
              ? interpolate(wordFrame, [0, 4, 8], [1.18, 1.10, 1.08], { extrapolateRight: 'clamp' })
              : 1.0;

            return (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  fontFamily: "'Montserrat', 'Inter', Impact, sans-serif",
                  fontSize: isVertical ? 64 : 44,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  lineHeight: 1.1,
                  WebkitTextStroke: isVertical ? '4px #000000' : '3px #000000',
                  paintOrder: 'stroke fill',
                  color: isActive ? highlightColor : isPast ? 'rgba(255,255,255,0.75)' : '#FFFFFF',
                  transform: `scale(${punchScale})`,
                  transformOrigin: 'center center',
                  textShadow: isActive
                    ? `0 0 25px ${highlightColor}, 0 4px 14px #000000`
                    : '0 4px 14px rgba(0,0,0,0.95)',
                  willChange: 'transform, color',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '-4px',
                      right: '-4px',
                      height: '32%',
                      backgroundColor: `${highlightColor}40`,
                      zIndex: -1,
                      borderRadius: '6px',
                    }}
                  />
                )}
                {w.word}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. FALLBACK SEM TIMINGS FONÉTICOS
  if (!scene.captionText) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: customBottom || (isVertical ? '18%' : '12%'),
        left: '50%',
        transform: 'translateX(-50%)',
        width: '88%',
        textAlign: 'center',
        padding: '16px 28px',
        borderRadius: '20px',
        backgroundColor: 'rgba(5, 8, 20, 0.85)',
        border: '1.5px solid rgba(255, 255, 255, 0.16)',
        color: '#FFFFFF',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: isVertical ? 42 : 32,
        fontWeight: 800,
        lineHeight: 1.25,
        textShadow: '0 4px 16px rgba(0,0,0,0.9)',
        zIndex: 60,
      }}
    >
      {scene.captionText}
    </div>
  );
};
