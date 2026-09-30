import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

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

export interface CountdownTimerProps {
  totalCount?: number;       // e.g. 5 for "Top 5"
  currentNumber?: number;    // which number is currently showing
  label?: string;            // e.g. "5º LUGAR"
  headline?: string;
  subheadline?: string;
  primaryColor?: string;
  urgencyColor?: string;
  format?: 'vertical' | 'horizontal';
}

// ─── Flip Clock Digit ───────────────────────────────────────────────────────
const FlipDigit: React.FC<{
  digit: number;
  prevDigit: number;
  flipProgress: number;
  size: number;
  color: string;
}> = ({ digit, prevDigit, flipProgress, size, color }) => {
  const fontSize = size * 0.65;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size * 1.3}px`,
        position: 'relative',
        perspective: '400px',
        overflow: 'hidden',
      }}
    >
      {/* Static bottom half (new digit) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          backgroundColor: '#0F172A',
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: 'none',
        }}
      >
        <span style={{
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          color,
          marginTop: `${-size * 0.32}px`,
          fontFamily: "'Inter', sans-serif",
        }}>
          {digit}
        </span>
      </div>

      {/* Static top half (new digit, revealed when flip passes) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          backgroundColor: '#1E293B',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
        }}
      >
        <span style={{
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          color,
          marginBottom: `${-size * 0.32}px`,
          fontFamily: "'Inter', sans-serif",
        }}>
          {digit}
        </span>
      </div>

      {/* Flipping top panel (old digit folding down) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          backgroundColor: '#1E293B',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
          transformOrigin: 'bottom center',
          transform: `rotateX(${flipProgress * 90}deg)`,
          opacity: flipProgress < 0.95 ? 1 : 0,
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          backfaceVisibility: 'hidden',
        }}
      >
        <span style={{
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          color,
          marginBottom: `${-size * 0.32}px`,
          fontFamily: "'Inter', sans-serif",
        }}>
          {prevDigit}
        </span>
      </div>

      {/* Center line */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 5,
        }}
      />

      {/* Shine effect */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: '15%',
          right: '15%',
          height: '30%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          borderRadius: '10px 10px 0 0',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ─── Progress Ring SVG ──────────────────────────────────────────────────────
const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  trailColor: string;
}> = ({ progress, size, strokeWidth, color, trailColor }) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {/* Trail */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={trailColor} strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </svg>
  );
};

// ─── Explosion Particles ────────────────────────────────────────────────────
const ExplosionParticles: React.FC<{
  frame: number;
  startFrame: number;
  color: string;
}> = ({ frame, startFrame, color }) => {
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > 30) return null;

  const rng = createRng(3333);
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    const speed = 4 + rng() * 12;
    const size = 3 + rng() * 6;
    const t = elapsed / 30;
    const px = Math.cos(angle) * speed * elapsed;
    const py = Math.sin(angle) * speed * elapsed + elapsed * elapsed * 0.2;
    const opacity = Math.max(0, 1 - t * 1.5);
    const scale = Math.max(0, 1 - t);
    const particleColor = rng() > 0.5 ? color : '#FFE600';

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `calc(50% + ${px}px)`,
          top: `calc(50% + ${py}px)`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: rng() > 0.5 ? '50%' : '1px',
          backgroundColor: particleColor,
          opacity,
          transform: `scale(${scale}) rotate(${elapsed * 20 + i * 45}deg)`,
          boxShadow: `0 0 6px ${particleColor}`,
        }}
      />
    );
  });

  return <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 30 }}>{particles}</AbsoluteFill>;
};

// ─── Sound Wave Bars ────────────────────────────────────────────────────────
const SoundWaveBars: React.FC<{
  frame: number;
  barCount: number;
  color: string;
  height: number;
}> = ({ frame, barCount, color, height }) => {
  const rng = createRng(8888);
  const bars = Array.from({ length: barCount }, (_, i) => {
    const baseH = rng() * 0.6 + 0.2;
    const pulse = Math.sin(frame * 0.3 + i * 0.8) * 0.3;
    const h = (baseH + pulse) * height;
    return { h: Math.max(4, h) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: `${bar.h}px`,
            backgroundColor: color,
            borderRadius: '2px',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
};

/**
 * CountdownTimer — Motor de Contagem Regressiva
 *
 * Para: Listicles, hooks, "Top 5...", urgência.
 * Inclui: flip-clock estilo aeroporto, ring progress SVG,
 * shake crescente no zero, explosion de partículas,
 * labels de posição, barra lateral de progresso,
 * color shift frio→quente, sound wave bars, urgency pulse.
 */
export const CountdownTimerScene: React.FC<CountdownTimerProps> = ({
  totalCount = 5,
  currentNumber = 5,
  label = '',
  headline = 'OS SEGREDOS QUE NINGUÉM CONTA',
  subheadline = 'Número 5 vai te surpreender...',
  primaryColor = '#00F0FF',
  urgencyColor = '#FF0040',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';
  const displayLabel = label || `${currentNumber}º LUGAR`;

  // ── Color temperature shift (cool → warm as countdown approaches 1) ──
  const warmth = 1 - (currentNumber - 1) / Math.max(1, totalCount - 1);
  const activeColor = warmth > 0.7 ? urgencyColor : primaryColor;

  // ── Flip animation ──
  const flipProgress = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // ── Ring progress ──
  const ringProgress = interpolate(frame, [0, 45], [0, (totalCount - currentNumber + 1) / totalCount], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Urgency pulse (stronger as number decreases) ──
  const pulseIntensity = warmth * 0.3;
  const pulse = 1 + Math.sin(frame * (0.2 + warmth * 0.3)) * pulseIntensity;

  // ── Urgency shake ──
  const shakeIntensity = warmth > 0.8 ? Math.sin(frame * 3) * 3 * warmth : 0;

  // ── Border glow ──
  const borderGlowOpacity = 0.1 + warmth * 0.4 + Math.sin(frame * 0.2) * 0.1;

  // ── Entrance spring ──
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  // ── Headline entrance ──
  const headlineEnter = spring({
    frame: Math.max(0, frame - 25),
    fps,
    config: { damping: 16, stiffness: 90 },
  });

  // ── Explosion on number 1 ──
  const isFinale = currentNumber === 1;

  // ── Progress bar lateral ──
  const sideBarProgress = interpolate(frame, [0, 40], [0, (totalCount - currentNumber + 1) / totalCount], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050810',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        transform: `translateX(${shakeIntensity}px)`,
      }}
    >
      {/* ── Background gradient (shifts warm) ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${activeColor}12 0%, transparent 65%)`,
        }}
      />

      {/* ── Urgency border pulse ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `2px solid ${activeColor}`,
          opacity: borderGlowOpacity,
          boxShadow: `inset 0 0 60px ${activeColor}22`,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* ── LABEL BADGE ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '130px' : '60px',
          left: '50%',
          transform: `translateX(-50%) scale(${enterSpring})`,
          zIndex: 15,
        }}
      >
        <div
          style={{
            padding: '8px 24px',
            border: `1.5px solid ${activeColor}88`,
            borderRadius: '999px',
            color: activeColor,
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            boxShadow: `0 0 20px ${activeColor}22`,
          }}
        >
          {displayLabel}
        </div>
      </div>

      {/* ── CENTRAL COUNTDOWN DISPLAY ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 12,
        }}
      >
        {/* Progress Ring behind the number */}
        <div style={{ position: 'relative', marginBottom: '30px' }}>
          <div
            style={{
              transform: `scale(${enterSpring * pulse})`,
            }}
          >
            <ProgressRing
              progress={ringProgress}
              size={isVertical ? 240 : 200}
              strokeWidth={6}
              color={activeColor}
              trailColor="rgba(255,255,255,0.06)"
            />
          </div>

          {/* Flip Clock Digit centered inside ring */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <FlipDigit
              digit={currentNumber}
              prevDigit={currentNumber + 1}
              flipProgress={flipProgress}
              size={isVertical ? 120 : 100}
              color={activeColor}
            />
          </div>
        </div>

        {/* ── HEADLINE ── */}
        <div
          style={{
            textAlign: 'center',
            padding: '0 40px',
            maxWidth: '800px',
            transform: `translateY(${(1 - headlineEnter) * 30}px)`,
            opacity: headlineEnter,
          }}
        >
          <h2
            style={{
              fontSize: isVertical ? '36px' : '30px',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 12px 0',
              lineHeight: 1.2,
              textShadow: `0 0 30px ${activeColor}33`,
            }}
          >
            {headline}
          </h2>
          <p
            style={{
              fontSize: isVertical ? '18px' : '16px',
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {subheadline}
          </p>
        </div>
      </AbsoluteFill>

      {/* ── SIDE PROGRESS BAR ── */}
      <div
        style={{
          position: 'absolute',
          right: isVertical ? '20px' : '24px',
          top: '25%',
          bottom: '25%',
          width: '4px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: '2px',
          zIndex: 15,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${sideBarProgress * 100}%`,
            backgroundColor: activeColor,
            borderRadius: '2px',
            boxShadow: `0 0 8px ${activeColor}`,
          }}
        />
      </div>

      {/* ── Position dots ── */}
      <div
        style={{
          position: 'absolute',
          left: isVertical ? '20px' : '24px',
          top: '25%',
          bottom: '25%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 15,
        }}
      >
        {Array.from({ length: totalCount }, (_, i) => {
          const num = totalCount - i;
          const isActive = num === currentNumber;
          const isPast = num > currentNumber;
          return (
            <div
              key={i}
              style={{
                width: isActive ? '28px' : '8px',
                height: isActive ? '28px' : '8px',
                borderRadius: '50%',
                backgroundColor: isActive
                  ? activeColor
                  : isPast
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(255,255,255,0.08)',
                boxShadow: isActive ? `0 0 12px ${activeColor}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 900,
                color: '#FFFFFF',
                transition: 'all 0.2s',
              }}
            >
              {isActive ? num : ''}
            </div>
          );
        })}
      </div>

      {/* ── SOUND WAVE BARS (bottom) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: isVertical ? '80px' : '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: enterSpring * 0.5,
          zIndex: 12,
        }}
      >
        <SoundWaveBars frame={frame} barCount={32} color={activeColor} height={30} />
      </div>

      {/* ── EXPLOSION PARTICLES (on #1) ── */}
      {isFinale && <ExplosionParticles frame={frame} startFrame={10} color={activeColor} />}
    </AbsoluteFill>
  );
};
