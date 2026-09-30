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

// ─── Winner Confetti Particles ──────────────────────────────────────────────
const WinnerConfetti: React.FC<{
  frame: number;
  triggerFrame: number;
  winnerSide: 'left' | 'right';
  winnerColor: string;
}> = ({ frame, triggerFrame, winnerSide, winnerColor }) => {
  const elapsed = frame - triggerFrame;
  if (elapsed < 0 || elapsed > 90) return null;

  const particles = React.useMemo(() => {
    const r = createRng(55219);
    return Array.from({ length: 42 }, (_, i) => ({
      angle: (r() - 0.5) * Math.PI + (winnerSide === 'left' ? -Math.PI / 4 : -3 * Math.PI / 4),
      speed: 150 + r() * 450,
      size: 5 + r() * 9,
      color: r() > 0.4 ? winnerColor : r() > 0.2 ? '#FACC15' : '#FFFFFF',
      rotSpeed: (r() - 0.5) * 16,
    }));
  }, [winnerSide, winnerColor]);

  const originX = winnerSide === 'left' ? '25%' : '75%';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p, idx) => {
        const t = elapsed / 60;
        const progress = closedFormSpring(t, 100, 18);
        const dist = p.speed * progress;
        const gravity = progress * progress * 160;
        const x = Math.cos(p.angle) * dist;
        const y = Math.sin(p.angle) * dist + gravity;
        const opacity = Math.max(0, 1 - progress * 1.1);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '50%',
              left: originX,
              width: `${p.size}px`,
              height: `${p.size * 1.6}px`,
              backgroundColor: p.color,
              borderRadius: '2px',
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

// ─── Dynamic VS Emblem Badge ────────────────────────────────────────────────
const VSBadge: React.FC<{ frame: number; isRevealed: boolean }> = ({ frame, isRevealed }) => {
  const pulse = Math.sin(frame * 0.16) * 0.08;
  const shake = isRevealed ? Math.sin(frame * 0.4) * 3 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${1 + pulse}) translate(${shake}px, 0)`,
        width: '84px',
        height: '84px',
        borderRadius: '50%',
        backgroundColor: '#0F172A',
        border: '3px solid #F59E0B',
        boxShadow: '0 0 35px rgba(245, 158, 11, 0.7), inset 0 0 15px rgba(245, 158, 11, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <span
        style={{
          fontFamily: 'Montserrat, Inter, sans-serif',
          fontWeight: 900,
          fontSize: '32px',
          color: '#FFFFFF',
          letterSpacing: '-1px',
          textShadow: '0 0 12px #F59E0B',
        }}
      >
        VS
      </span>
    </div>
  );
};

// ─── Main PollDebate Composition ────────────────────────────────────────────
export const PollDebateComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#06B6D4', // Left Option Color (e.g. Cyan)
  accentColor = '#F43F5E',  // Right Option Color (e.g. Rose/Crimson)
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'VOTE AGORA',
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
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      sceneStartFrame = Math.round(accumulatedTime * fps);
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;
  const isLandscape = format === 'horizontal' || width > height;

  // Question & Option Data
  const title = currentScene.captionText || 'QUAL É O MELHOR? ESCOLHA SEU LADO';
  const leftOption = currentScene.letteringLines?.[0]?.text || 'OPÇÃO A';
  const rightOption = currentScene.letteringLines?.[1]?.text || 'OPÇÃO B';

  // Vote Animation Dynamics
  const voteSpring = closedFormSpring(sceneLocalTime - 0.4, 90, 18);
  const targetLeftPercent = 68; // 68% vs 32%
  const currentLeftPercent = Math.round(50 + (targetLeftPercent - 50) * voteSpring);
  const currentRightPercent = 100 - currentLeftPercent;

  // Climax Winner state when scene is in last 40%
  const isClimax = sceneLocalTime > dur * 0.55;
  const winnerSide: 'left' | 'right' = targetLeftPercent >= 50 ? 'left' : 'right';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#080C14',
        overflow: 'hidden',
        fontFamily: 'Montserrat, Inter, sans-serif',
      }}
    >
      {/* ── 1. Color War Ambient Gradients ── */}
      <AbsoluteFill
        style={{
          background: isLandscape
            ? `linear-gradient(90deg, ${primaryColor}22 0%, #080C14 50%, ${accentColor}22 100%)`
            : `linear-gradient(180deg, ${primaryColor}22 0%, #080C14 50%, ${accentColor}22 100%)`,
        }}
      />

      {/* Cyber Grid Pattern */}
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
        }}
      />

      {/* Confetti on Climax */}
      {isClimax && (
        <WinnerConfetti
          frame={frame}
          triggerFrame={sceneStartFrame + Math.round(dur * 0.55 * fps)}
          winnerSide={winnerSide}
          winnerColor={primaryColor}
        />
      )}

      {/* ── 2. Top Header Question Bar ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '28px' : '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '920px',
          textAlign: 'center',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 18px',
            borderRadius: '999px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #F59E0B',
            color: '#F59E0B',
            fontWeight: 800,
            fontSize: '14px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          ENQUETE INTERATIVA
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: isLandscape ? '34px' : '40px',
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1.2,
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          }}
        >
          {title}
        </h1>
      </div>

      {/* ── 3. Split Arena Layout ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '140px 60px 80px' : '220px 24px 120px',
          gap: '24px',
          zIndex: 20,
        }}
      >
        {/* Left / Top Side: Option A */}
        <div
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            borderRadius: '28px',
            border: `2px solid ${winnerSide === 'left' && isClimax ? primaryColor : primaryColor + '44'}`,
            boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 ${winnerSide === 'left' && isClimax ? 40 : 15}px ${primaryColor}40`,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            transform: isClimax && winnerSide === 'left' ? 'scale(1.02)' : 'none',
            transition: 'transform 0.4s ease',
          }}
        >
          {/* Winner Crown */}
          {isClimax && winnerSide === 'left' && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: '#F59E0B',
                color: '#000000',
                padding: '4px 12px',
                borderRadius: '999px',
                fontWeight: 900,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              👑 VENCEDOR
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 900,
                color: '#000000',
              }}
            >
              A
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>
              {leftOption}
            </h2>
          </div>

          {/* Large Vote Percent Counter */}
          <div style={{ margin: 'auto 0' }}>
            <div
              style={{
                fontSize: isLandscape ? '64px' : '56px',
                fontWeight: 900,
                color: primaryColor,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 25px ${primaryColor}88`,
              }}
            >
              {currentLeftPercent}%
            </div>
            {/* Visual Bar Indicator */}
            <div
              style={{
                width: '100%',
                height: '14px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginTop: '10px',
              }}
            >
              <div
                style={{
                  width: `${currentLeftPercent}%`,
                  height: '100%',
                  backgroundColor: primaryColor,
                  borderRadius: '999px',
                  boxShadow: `0 0 14px ${primaryColor}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Center VS Emblem */}
        <VSBadge frame={frame} isRevealed={isClimax} />

        {/* Right / Bottom Side: Option B */}
        <div
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            borderRadius: '28px',
            border: `2px solid ${winnerSide === 'right' && isClimax ? accentColor : accentColor + '44'}`,
            boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 ${winnerSide === 'right' && isClimax ? 40 : 15}px ${accentColor}40`,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 900,
                color: '#FFFFFF',
              }}
            >
              B
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>
              {rightOption}
            </h2>
          </div>

          {/* Large Vote Percent Counter */}
          <div style={{ margin: 'auto 0' }}>
            <div
              style={{
                fontSize: isLandscape ? '64px' : '56px',
                fontWeight: 900,
                color: accentColor,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 25px ${accentColor}88`,
              }}
            >
              {currentRightPercent}%
            </div>
            {/* Visual Bar Indicator */}
            <div
              style={{
                width: '100%',
                height: '14px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginTop: '10px',
              }}
            >
              <div
                style={{
                  width: `${currentRightPercent}%`,
                  height: '100%',
                  backgroundColor: accentColor,
                  borderRadius: '999px',
                  boxShadow: `0 0 14px ${accentColor}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Live Participation Ticker ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '20px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 24px',
            borderRadius: '999px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            color: '#94A3B8',
            fontWeight: 700,
            fontSize: '14px',
            zIndex: 40,
          }}
        >
          <span style={{ color: '#22C55E' }}>● LIVE</span>
          <span>48.921 votos computados</span>
          <span>•</span>
          <span style={{ color: '#F59E0B' }}>COMENTE SEU VOTO</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
