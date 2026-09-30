import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  spring,
  Easing,
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

// ─── Slot Machine Counter (Odometer) ────────────────────────────────────────
const SlotMachineCounter: React.FC<{
  value: string;
  frame: number;
  startFrame: number;
  color: string;
  fontSize: number;
}> = ({ value, frame, startFrame, color, fontSize }) => {
  const elapsed = Math.max(0, frame - startFrame);
  const rollProgress = closedFormSpring(elapsed / 30, 140, 22);

  return (
    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', overflow: 'hidden', height: `${fontSize * 1.2}px` }}>
      {value.split('').map((char, i) => {
        const isDigit = /\d/.test(char);
        if (!isDigit) {
          return (
            <span key={i} style={{ fontSize: `${fontSize}px`, fontWeight: 900, color, lineHeight: 1.2 }}>
              {char}
            </span>
          );
        }

        const digit = parseInt(char, 10);
        const delay = i * 0.08;
        const localProgress = closedFormSpring(Math.max(0, elapsed / 30 - delay), 160, 24);
        // Roll through digits: 0 → target digit
        const rollOffset = (1 - localProgress) * 10 * fontSize * 1.2;

        return (
          <div key={i} style={{ overflow: 'hidden', height: `${fontSize * 1.2}px`, width: `${fontSize * 0.65}px` }}>
            <div style={{ transform: `translateY(${-rollOffset}px)`, transition: 'none' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, digit].map((d, di) => (
                <div
                  key={di}
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: 900,
                    color: di === 10 ? color : 'rgba(255,255,255,0.15)',
                    lineHeight: 1.2,
                    textAlign: 'center',
                    height: `${fontSize * 1.2}px`,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Pulse Ring ─────────────────────────────────────────────────────────────
const PulseRings: React.FC<{
  frame: number;
  color: string;
  size: number;
}> = ({ frame, color, size }) => {
  const rings = [0, 20, 40].map((delay) => {
    const t = ((frame - delay) % 60) / 60;
    if (t < 0) return null;
    const scale = 1 + t * 2;
    const opacity = Math.max(0, 0.6 - t * 0.8);
    return { scale, opacity };
  });

  return (
    <>
      {rings.map((r, i) => r && (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            transform: `scale(${r.scale})`,
            opacity: r.opacity,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};

// ─── Mini Bar Chart ─────────────────────────────────────────────────────────
const MiniBarChart: React.FC<{
  data: number[];
  frame: number;
  startFrame: number;
  color: string;
  height: number;
}> = ({ data, frame, startFrame, color, height }) => {
  const maxVal = Math.max(...data, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${height}px`, padding: '0 8px' }}>
      {data.map((val, i) => {
        const barEnter = spring({
          frame: Math.max(0, frame - startFrame - i * 3),
          fps: 30,
          config: { damping: 14, stiffness: 120 },
        });
        const barH = (val / maxVal) * height * barEnter;
        const isHighest = val === maxVal;

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${barH}px`,
              backgroundColor: isHighest ? color : `${color}66`,
              borderRadius: '3px 3px 0 0',
              boxShadow: isHighest ? `0 0 10px ${color}44` : 'none',
              position: 'relative',
            }}
          >
            {isHighest && barEnter > 0.8 && (
              <div style={{
                position: 'absolute',
                top: '-16px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}>
                ▲ MAX
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Sparkline ──────────────────────────────────────────────────────────────
const Sparkline: React.FC<{
  frame: number;
  width: number;
  height: number;
  color: string;
}> = ({ frame, width, height, color }) => {
  const rng = createRng(6666);
  const points = 20;
  const data = Array.from({ length: points }, (_, i) => {
    const base = rng() * 0.5 + 0.25;
    const trend = i / points * 0.4;
    return (base + trend) * height;
  });

  const drawProgress = interpolate(frame, [10, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const visiblePoints = Math.floor(drawProgress * points);
  const pathD = data.slice(0, visiblePoints).map((y, i) => {
    const x = (i / (points - 1)) * width;
    return i === 0 ? `M ${x},${height - y}` : `L ${x},${height - y}`;
  }).join(' ');

  // Area fill
  const lastX = ((visiblePoints - 1) / (points - 1)) * width;
  const areaD = visiblePoints > 1
    ? `${pathD} L ${lastX},${height} L 0,${height} Z`
    : '';

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Area gradient */}
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaD && <path d={areaD} fill="url(#spark-grad)" />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Glow dot at end */}
      {visiblePoints > 0 && (
        <circle
          cx={(visiblePoints - 1) / (points - 1) * width}
          cy={height - data[visiblePoints - 1]}
          r="4"
          fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      )}
    </svg>
  );
};

// ─── Progress Ring SVG ──────────────────────────────────────────────────────
const ProgressRingSmall: React.FC<{
  progress: number;
  size: number;
  color: string;
  label: string;
}> = ({ progress, size, color, label }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color, fontFamily: "'Inter', sans-serif",
      }}>
        {label}
      </div>
    </div>
  );
};

// ─── Confetti with Gravity ──────────────────────────────────────────────────
const GravityConfetti: React.FC<{
  frame: number;
  startFrame: number;
  sceneIndex: number;
}> = ({ frame, startFrame, sceneIndex }) => {
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > 80) return null;

  const rng = createRng(42 + sceneIndex);
  const pieces = Array.from({ length: 30 }, (_, i) => {
    const x = rng() * 100;
    const launchAngle = -90 + (rng() - 0.5) * 60;
    const speed = 3 + rng() * 6;
    const launchRad = (launchAngle * Math.PI) / 180;
    const vx = Math.cos(launchRad) * speed;
    const vy = Math.sin(launchRad) * speed;
    const gravity = 0.15;
    const t = elapsed;

    const px = x + vx * t * 0.3;
    const py = 50 + vy * t + 0.5 * gravity * t * t;
    const rotation = rng() * 360 + t * (60 + rng() * 120);
    const size = 6 + rng() * 10;
    const aspect = 0.4 + rng() * 0.6;
    const opacity = Math.max(0, 1 - t / 80);
    const color = ['#FACC15', '#38BDF8', '#4ADE80', '#F43F5E', '#A855F7', '#FF6B35'][Math.floor(rng() * 6)];

    return { px, py, rotation, size, aspect, opacity, color };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 25, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.px}%`,
            top: `${p.py}%`,
            width: `${p.size}px`,
            height: `${p.size * p.aspect}px`,
            backgroundColor: p.color,
            borderRadius: '2px',
            transform: `rotate(${p.rotation}deg) rotateX(${p.rotation * 0.5}deg)`,
            opacity: p.opacity,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/**
 * DataStoryViral V2 — Motor Ultra de Métricas Virais
 *
 * Inclui: slot machine counter (odômetro), mini bar chart inline,
 * confetti com gravidade real, pulse rings concêntricos,
 * sparkline procedural com glow, progress ring circular,
 * ranking arrows ↑↓, floating labels, celebration burst.
 */
export const DataStoryViralComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#EAB308',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const isVertical = format === 'vertical';

  // Find active scene
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const sceneFrame = Math.floor(sceneLocalTime * fps);

  // ── Extract metric from caption ──
  const text = currentScene.captionText || '';
  const matchPercent = text.match(/([+]?\d+[\.,]?\d*[%xXkKMmB]?)/);
  const highlightedMetric = matchPercent ? matchPercent[0] : '+85%';

  // ── Entrance spring ──
  const enterProgress = closedFormSpring(sceneLocalTime, 140, 22);

  // ── Bar chart data ──
  const rng = createRng(activeSceneIndex * 100 + 42);
  const barData = Array.from({ length: 8 }, () => 20 + rng() * 80);
  barData[barData.length - 1] = 100; // Last bar is always max

  // ── Ranking arrow ──
  const arrowUp = highlightedMetric.includes('+') || highlightedMetric.includes('↑');

  // ── Confetti trigger ──
  const showConfetti = sceneLocalTime > 0.8;

  // ── Progress ring value ──
  const ringProgress = closedFormSpring(Math.max(0, sceneLocalTime - 0.3), 110, 20);

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16', overflow: 'hidden', fontFamily: 'Montserrat, Inter, sans-serif' }}>
      {/* Background */}
      {currentScene.imageUrl && (
        <AbsoluteFill style={{ filter: 'brightness(0.3) contrast(1.2)' }}>
          <Img
            src={currentScene.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${1 + sceneLocalTime * 0.04})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Grid mesh */}
      <AbsoluteFill
        style={{
          backgroundImage:
            `radial-gradient(circle at 50% 40%, ${primaryColor}15 0%, transparent 60%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      {/* Confetti */}
      {showConfetti && (
        <GravityConfetti frame={frame} startFrame={Math.floor((accumulatedTime + 0.8) * fps)} sceneIndex={activeSceneIndex} />
      )}

      {/* ── CENTRAL CONTENT ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 36px',
        }}
      >
        {/* ── METRIC BADGE with Pulse Rings ── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            transform: `scale(${enterProgress})`,
          }}
        >
          <PulseRings frame={frame} color={primaryColor} size={isVertical ? 120 : 100} />
          <div
            style={{
              background: `linear-gradient(135deg, ${primaryColor}33, rgba(0,0,0,0.6))`,
              border: `2px solid ${primaryColor}CC`,
              boxShadow: `0 0 40px ${primaryColor}44, inset 0 0 20px ${primaryColor}22`,
              borderRadius: '999px',
              padding: '14px 40px',
              position: 'relative',
              zIndex: 5,
            }}
          >
            {/* Ranking arrow */}
            <span style={{
              color: arrowUp ? '#4ADE80' : '#EF4444',
              fontSize: '22px',
              marginRight: '6px',
            }}>
              {arrowUp ? '↑' : '↓'}
            </span>

            <SlotMachineCounter
              value={highlightedMetric}
              frame={sceneFrame}
              startFrame={5}
              color={primaryColor}
              fontSize={isVertical ? 38 : 32}
            />
          </div>
        </div>

        {/* ── GLASSMORPHISM CARD ── */}
        <div
          style={{
            width: '90%',
            maxWidth: '860px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '32px',
            padding: isVertical ? '40px 32px' : '32px 36px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            transform: `scale(${0.92 + enterProgress * 0.08})`,
            opacity: enterProgress,
          }}
        >
          {/* Caption text */}
          <h2
            style={{
              fontSize: isVertical ? '38px' : '32px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: accentColor,
              textAlign: 'center',
              marginBottom: '28px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            {text}
          </h2>

          {/* ── SPARKLINE ── */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
            <Sparkline frame={sceneFrame} width={isVertical ? 400 : 350} height={60} color={primaryColor} />
          </div>

          {/* ── MINI BAR CHART ── */}
          <MiniBarChart data={barData} frame={sceneFrame} startFrame={15} color={primaryColor} height={50} />

          {/* ── THREE METRICS ROW ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '24px',
              alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>ANTERIOR</div>
              <ProgressRingSmall progress={ringProgress * 0.3} size={52} color="#64748B" label="1.2x" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>ATUAL</div>
              <ProgressRingSmall
                progress={ringProgress * 0.88}
                size={52}
                color="#10B981"
                label={`${(1.2 + ringProgress * 3.8).toFixed(1)}x`}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>CRESCIMENTO</div>
              <ProgressRingSmall
                progress={ringProgress}
                size={52}
                color={primaryColor}
                label={`+${Math.round(ringProgress * 316)}%`}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── WORD-LEVEL SYNCHRONIZED KARAOKE CAPTIONS ── */}
      {currentScene && (
        <CaptionLayer
          scene={currentScene}
          captionStyle="highlight"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      )}
    </AbsoluteFill>
  );
};
