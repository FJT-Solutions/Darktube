import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';

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
    return Array.from({ length: 36 }, (_, i) => ({
      angle: (r() - 0.5) * Math.PI * 2,
      speed: 160 + r() * 400,
      size: 6 + r() * 8,
      color: r() > 0.3 ? correctColor : '#FACC15',
      rotSpeed: (r() - 0.5) * 18,
    }));
  }, [correctColor]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p, idx) => {
        const t = elapsed / 60;
        const progress = closedFormSpring(t, 110, 18);
        const dist = p.speed * progress;
        const gravity = progress * progress * 140;
        const x = Math.cos(p.angle) * dist;
        const y = Math.sin(p.angle) * dist + gravity;
        const opacity = Math.max(0, 1 - progress * 1.2);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '60%',
              left: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: idx % 2 === 0 ? '50%' : '2px',
              opacity,
              boxShadow: `0 0 10px ${p.color}`,
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
  const isUrgent = remainingRatio < 0.3;
  const ringColor = isUrgent ? '#EF4444' : primaryColor;

  return (
    <div style={{ position: 'relative', width: '92px', height: '92px' }}>
      <svg width="92" height="92" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="46"
          cy="46"
          r={radius}
          stroke="rgba(255,255,255,0.1)"
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
          style={{ transition: 'none' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 900,
          color: ringColor,
          fontFamily: 'Montserrat, Inter, sans-serif',
        }}
      >
        {Math.max(0, secondsLeft)}
      </div>
    </div>
  );
};

// ─── Main QuizTrivia Composition ────────────────────────────────────────────
export const QuizTriviaComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#3B82F6', // Vibrant Blue
  accentColor = '#10B981',  // Correct Answer Neon Green
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'QUIZ TIME',
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
    const dur = scenes[i].durationSeconds || 6;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      sceneStartFrame = Math.round(accumulatedTime * fps);
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 6;
  const isLandscape = format === 'horizontal' || width > height;

  // Answer Revelation Phase: happens at 65% of the scene duration
  const revealProgressTime = dur * 0.65;
  const isRevealed = sceneLocalTime >= revealProgressTime;
  const remainingCountdown = Math.max(0, Math.ceil(revealProgressTime - sceneLocalTime));
  const countdownRatio = Math.max(0, Math.min(1, 1 - sceneLocalTime / revealProgressTime));

  // Question & Options data
  const questionText = currentScene.captionText || 'Qual é o maior planeta do sistema solar?';
  const options = currentScene.letteringLines && currentScene.letteringLines.length >= 4
    ? currentScene.letteringLines.map((l) => l.text)
    : ['Terra', 'Júpiter', 'Saturno', 'Marte'];

  // Default correct option index is 1 (B)
  const correctIndex = 1;

  // Question Card Entry Spring
  const questionSpring = closedFormSpring(sceneLocalTime, 140, 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070A12',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Dynamic Background & Grid ── */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at 50% 30%, ${primaryColor}26 0%, transparent 60%),
            radial-gradient(circle at 50% 85%, #0B1120 0%, #070A12 100%)
          `,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          opacity: 0.7,
        }}
      />

      {/* Confetti when answer is revealed */}
      {isRevealed && (
        <QuizConfetti
          frame={frame}
          triggerFrame={sceneStartFrame + Math.round(revealProgressTime * fps)}
          correctColor={accentColor}
        />
      )}

      {/* ── 2. Top Quiz Bar (Progress, Streak, Difficulty) ── */}
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
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              color: '#94A3B8',
              fontWeight: 800,
              fontSize: '13px',
            }}
          >
            PERGUNTA {activeSceneIndex + 1}/{scenes.length || 5}
          </span>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🔥 STREAK x3
          </span>
        </div>

        {/* Circular Timer in Top Bar */}
        <CircularQuizTimer
          remainingRatio={countdownRatio}
          primaryColor={primaryColor}
          secondsLeft={remainingCountdown}
        />
      </div>

      {/* ── 3. Question Banner ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '130px' : '170px',
          left: '50%',
          transform: `translateX(-50%) translateY(${(1 - questionSpring) * 35}px) scale(${0.96 + questionSpring * 0.04})`,
          width: '90%',
          maxWidth: '880px',
          padding: isLandscape ? '24px 32px' : '28px 24px',
          borderRadius: '24px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          border: '2px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(59, 130, 246, 0.15)',
          backdropFilter: 'blur(12px)',
          textAlign: 'center',
          zIndex: 30,
          opacity: questionSpring,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: isLandscape ? '32px' : '30px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.3,
          }}
        >
          {questionText}
        </h2>
      </div>

      {/* ── 4. Options List / Grid ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '310px' : '390px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '880px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          zIndex: 30,
        }}
      >
        {options.map((opt, idx) => {
          const isCorrect = idx === correctIndex;
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          const delayTime = 0.2 + idx * 0.08;
          const optSpring = closedFormSpring(sceneLocalTime - delayTime, 160, 22);

          // State styling
          let borderStyle = '1.5px solid rgba(255,255,255,0.08)';
          let bgStyle = 'rgba(15, 23, 42, 0.75)';
          let badgeBg = '#1E293B';
          let textColor = '#FFFFFF';
          let glow = 'none';

          if (isRevealed) {
            if (isCorrect) {
              borderStyle = `2.5px solid ${accentColor}`;
              bgStyle = 'rgba(16, 185, 129, 0.15)';
              badgeBg = accentColor;
              textColor = '#FFFFFF';
              glow = `0 0 25px ${accentColor}66`;
            } else {
              borderStyle = '1.5px solid rgba(239, 68, 68, 0.3)';
              bgStyle = 'rgba(239, 68, 68, 0.05)';
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
                padding: '16px 20px',
                borderRadius: '18px',
                backgroundColor: bgStyle,
                border: borderStyle,
                boxShadow: glow,
                gap: '16px',
                transform: `translateY(${(1 - optSpring) * 30}px) scale(${0.96 + optSpring * 0.04})`,
                opacity: optSpring,
                transition: 'border 0.3s ease, background 0.3s ease',
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
                }}
              >
                {letter}
              </div>

              {/* Option Text */}
              <span
                style={{
                  fontSize: isLandscape ? '22px' : '20px',
                  fontWeight: 700,
                  color: textColor,
                  flex: 1,
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

      {/* ── 5. Watermark Footer ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '20px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          <span style={{ color: primaryColor }}>●</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
