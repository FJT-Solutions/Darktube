import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  Sequence,
  Audio,
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

// ─── Confetti Burst on Correct Answer ───────────────────────────────────────
const QuizConfetti: React.FC<{
  frame: number;
  triggerFrame: number;
  correctColor: string;
}> = ({ frame, triggerFrame, correctColor }) => {
  const elapsed = frame - triggerFrame;
  if (elapsed < 0 || elapsed > 75) return null;

  const particles = React.useMemo(() => {
    const r = createRng(33190);
    return Array.from({ length: 40 }, (_, i) => ({
      angle: (r() - 0.5) * Math.PI * 2,
      speed: 180 + r() * 450,
      size: 6 + r() * 10,
      color: r() > 0.3 ? correctColor : '#FACC15',
      rotSpeed: (r() - 0.5) * 22,
    }));
  }, [correctColor]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', zIndex: 60 }}>
      {particles.map((p, idx) => {
        const t = elapsed / 60;
        const progress = closedFormSpring(t, 110, 18);
        const dist = p.speed * progress;
        const gravity = progress * progress * 160;
        const x = Math.cos(p.angle) * dist;
        const y = Math.sin(p.angle) * dist + gravity;
        const opacity = Math.max(0, 1 - progress * 1.2);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '58%',
              left: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: idx % 2 === 0 ? '50%' : '3px',
              opacity,
              boxShadow: `0 0 12px ${p.color}`,
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${elapsed * p.rotSpeed}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Circular SVG Countdown Timer ───────────────────────────────────────────
const CircularQuizTimer: React.FC<{
  remainingRatio: number; // 1 down to 0
  primaryColor: string;
  secondsLeft: number;
}> = ({ remainingRatio, primaryColor, secondsLeft }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingRatio);
  const isUrgent = remainingRatio < 0.35;
  const ringColor = isUrgent ? '#FF0055' : primaryColor;

  return (
    <div style={{ position: 'relative', width: '92px', height: '92px' }}>
      <svg width="92" height="92" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="46"
          cy="46"
          r={radius}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="46"
          cy="46"
          r={radius}
          stroke={ringColor}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: isUrgent ? `drop-shadow(0 0 8px ${ringColor})` : 'none',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          fontWeight: 900,
          color: ringColor,
          fontFamily: 'Montserrat, Inter, sans-serif',
          textShadow: isUrgent ? `0 0 12px ${ringColor}` : 'none',
        }}
      >
        {Math.max(0, secondsLeft)}
      </div>
    </div>
  );
};

// ─── Single Quiz Scene View ─────────────────────────────────────────────────
export interface QuizTriviaSingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

export const QuizTriviaSceneSingle: React.FC<QuizTriviaSingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#00F0FF',
  accentColor = '#00FF66',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'DARK QUIZ',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const totalFrames = Math.max(30, Math.round(dur * fps));
  const sceneLocalTime = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // Reveal phase: occurs at 65% of the scene duration
  const revealProgressTime = dur * 0.65;
  const revealFrame = Math.round(revealProgressTime * fps);
  const isRevealed = frame >= revealFrame;
  const remainingCountdown = Math.max(0, Math.ceil(revealProgressTime - sceneLocalTime));
  const countdownRatio = Math.max(0, Math.min(1, 1 - sceneLocalTime / revealProgressTime));

  // Question & Options resolution
  const questionText = scene.headline || (scene as any).title || scene.captionText || 'QUAL É A RESPOSTA CORRETA?';
  const rawOptions = (scene as any).options || (scene.letteringLines && scene.letteringLines.length >= 2 ? scene.letteringLines.map((l) => l.text) : null);
  const options: string[] = rawOptions && rawOptions.length >= 2
    ? rawOptions
    : ['Opção Alfa', 'Opção Beta', 'Opção Gama', 'Opção Delta'];

  const correctIndex = typeof (scene as any).correctIndex === 'number' ? (scene as any).correctIndex : 1;

  // Question Card Entry Spring
  const questionSpring = closedFormSpring(sceneLocalTime, 140, 20);

  // Background subtle zoom
  const bgScale = interpolate(frame, [0, totalFrames], [1.02, 1.14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070A12',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── Background Image / Atmosphere ── */}
      {scene.imageUrl ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={scene.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${bgScale})`,
              filter: 'brightness(0.32) saturate(1.2) contrast(1.1)',
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* ── Ambient Gradient & Tech Grid ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 25%, ${primaryColor}22 0%, transparent 65%),
            radial-gradient(circle at 50% 85%, #050810 0%, #070A12 100%)
          `,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }}
      />


      {/* Confetti when answer is revealed */}
      {isRevealed && (
        <QuizConfetti
          frame={frame}
          triggerFrame={revealFrame}
          correctColor={accentColor}
        />
      )}

      {/* ── Top Header Quiz Bar ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '880px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              backgroundColor: '#0F172A',
              border: `1.5px solid ${primaryColor}66`,
              color: '#00F0FF',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1px',
            }}
          >
            PERGUNTA {sceneIndex + 1}/{totalScenes}
          </span>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 0, 85, 0.15)',
              border: '1.5px solid rgba(255, 0, 85, 0.6)',
              color: '#FF0055',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🔥 {scene.badgeText || (scene as any).badge || 'QUIZ TÁTICO'}
          </span>
        </div>

        {/* Circular Countdown Timer */}
        <CircularQuizTimer
          remainingRatio={countdownRatio}
          primaryColor={primaryColor}
          secondsLeft={remainingCountdown}
        />
      </div>

      {/* ── Question Card Banner ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '130px' : '160px',
          left: '50%',
          transform: `translateX(-50%) translateY(${(1 - questionSpring) * 35}px) scale(${0.96 + questionSpring * 0.04})`,
          width: '92%',
          maxWidth: '880px',
          padding: isLandscape ? '22px 28px' : '26px 22px',
          borderRadius: '24px',
          backgroundColor: 'rgba(10, 15, 30, 0.92)',
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 240, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          textAlign: 'center',
          zIndex: 30,
          opacity: questionSpring,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: isLandscape ? '30px' : '28px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.3,
            letterSpacing: '-0.5px',
          }}
        >
          {questionText}
        </h2>
      </div>

      {/* ── 4 Options List ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '290px' : '330px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '880px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 30,
        }}
      >
        {options.map((opt, idx) => {
          const isCorrect = idx === correctIndex;
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          const delayTime = 0.2 + idx * 0.08;
          const optSpring = closedFormSpring(sceneLocalTime - delayTime, 160, 22);

          // State styling
          let borderStyle = '1.5px solid rgba(255,255,255,0.1)';
          let bgStyle = 'rgba(15, 23, 42, 0.85)';
          let badgeBg = '#1E293B';
          let textColor = '#FFFFFF';
          let glow = 'none';

          if (isRevealed) {
            if (isCorrect) {
              borderStyle = `2.5px solid ${accentColor}`;
              bgStyle = 'rgba(0, 255, 102, 0.2)';
              badgeBg = accentColor;
              textColor = '#FFFFFF';
              glow = `0 0 30px ${accentColor}88`;
            } else {
              borderStyle = '1.5px solid rgba(239, 68, 68, 0.35)';
              bgStyle = 'rgba(239, 68, 68, 0.08)';
              badgeBg = '#334155';
              textColor = '#64748B';
            }
          }

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 18px',
                borderRadius: '16px',
                backgroundColor: bgStyle,
                border: borderStyle,
                boxShadow: glow,
                gap: '16px',
                transform: `translateY(${(1 - optSpring) * 30}px) scale(${0.96 + optSpring * 0.04})`,
                opacity: optSpring,
                backdropFilter: 'blur(10px)',
                transition: 'border 0.25s ease, background 0.25s ease, box-shadow 0.25s ease',
              }}
            >
              {/* Option Letter Indicator */}
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: badgeBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 900,
                  color: isRevealed && isCorrect ? '#000000' : '#FFFFFF',
                  boxShadow: isRevealed && isCorrect ? `0 0 14px ${accentColor}` : 'none',
                }}
              >
                {letter}
              </div>

              {/* Option Text */}
              <span
                style={{
                  fontSize: isLandscape ? '22px' : '20px',
                  fontWeight: 800,
                  color: textColor,
                  flex: 1,
                  lineHeight: 1.2,
                }}
              >
                {opt}
              </span>

              {/* Reveal Icon Status */}
              {isRevealed && (
                <div style={{ fontSize: '24px' }}>
                  {isCorrect ? '✅' : '❌'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Word-Level Synchronized Karaoke Subtitles ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '40px' : '65px', left: 0, right: 0, zIndex: 45 }}>
        <CaptionLayer
          scene={scene}
          captionStyle="box"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      </div>

      {/* ── Watermark Footer ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '12px' : '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '1px',
            zIndex: 50,
          }}
        >
          <span style={{ color: primaryColor }}>●</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Multi-Scene / Composition Wrapper ───────────────────────────────────────
export const QuizTriviaComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: (props as any).headline || 'QUAL É O MAIOR PLANETA DO SISTEMA SOLAR?',
      captionText: (props as any).subheadline || 'A gravidade extrema deste gigante gasoso captura asteroides.',
      durationSeconds: 10,
      options: ['Terra', 'Júpiter', 'Saturno', 'Marte'],
      correctIndex: 1,
    } as any;
    return (
      <QuizTriviaSceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#00F0FF'}
        accentColor={props.accentColor || '#00FF66'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'QUIZ TÁTICO'}
      />
    );
  }

  let accumulatedFrames = 0;
  const totalCount = scenes.length;

  return (
    <AbsoluteFill style={{ backgroundColor: '#070A12' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 10;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`quiz_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <QuizTriviaSceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#00F0FF'}
              accentColor={props.accentColor || '#00FF66'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'QUIZ TÁTICO'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const QuizTrivia = QuizTriviaComposition;
