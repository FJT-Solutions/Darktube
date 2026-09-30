// gradient-word-sweep v3 — batch 12 tweaks per user feedback (v2 structure kept):
// 1) lightning shifted toward magenta-red with thinner strokes (roughly halved);
// 2) overall glow intensity slightly reduced (glow-layer opacities lowered);
// 3) wavefront trail gradient: freshly lit characters glow strongest, decaying to steady state with sweep distance
//    (a trailing-window brighten layer that fades out to the steady-state breathing after the fill completes).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FONT = '"Avenir Next", Futura, "Helvetica Neue", sans-serif';
// Screenshot 5: S leans blue-cyan → purple mid → pink → amber tail
const GRAD = 'linear-gradient(92deg, #59c2ff 0%, #9d6bff 32%, #ff6ed4 62%, #ffc46b 100%)';

const FILL_START = 12;
const FILL_END = 30; // 18 frames ≈ 0.6s, fast sweep
const LIGHT_START = FILL_END + 3;

// ---------- Seeded noise and lightning ----------
const rand = mulberry32(20260718);
const FLICKER: number[] = Array.from({ length: 160 }, () => rand());

type Bolt = { d: string; long: boolean };
const makeLongBolt = (r: () => number): Bolt => {
  // Long hooked arc above the word: spans several characters as a jagged polyline
  const x0 = 30 + r() * 220;
  const x1 = x0 + 160 + r() * 320;
  const yBase = 38 + r() * 42;
  const n = 7 + Math.floor(r() * 4);
  let d = `M ${x0.toFixed(1)} ${(yBase + 26 + r() * 20).toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n + (r() - 0.5) * 22;
    const arch = Math.sin((i / n) * Math.PI) * -22; // arches in the middle
    const y = yBase + arch + (r() - 0.5) * 30 + (i === n ? 30 + r() * 18 : 0);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return { d, long: true };
};
const makeShortBolt = (r: () => number): Bolt => {
  // Short hooks between characters: small vertical zigzags
  const x = 60 + r() * 540;
  const y0 = 72 + r() * 24;
  const y1 = y0 + 55 + r() * 45;
  const n = 4 + Math.floor(r() * 3);
  let d = `M ${x.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    const xx = x + (r() - 0.5) * 30;
    d += ` L ${xx.toFixed(1)} ${y.toFixed(1)}`;
  }
  return { d, long: false };
};

const BOLTS: Bolt[] = Array.from({ length: 16 }, (_, i) =>
  i % 3 === 0 ? makeShortBolt(rand) : makeLongBolt(rand),
);
// Flash events: a lightning bolt lights up within a frame window at random positions
type Flash = { at: number; life: number; bolt: number };
const FLASHES: Flash[] = Array.from({ length: 36 }, () => ({
  at: LIGHT_START + Math.floor(rand() * 70),
  life: 2 + Math.floor(rand() * 4),
  bolt: Math.floor(rand() * BOLTS.length),
}));

export const GradientWordSweep: React.FC = () => {
  const frame = useCurrentFrame();

  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Fast fill progress
  const p = interpolate(frame, [FILL_START, FILL_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const pPct = p * 100;
  const filling = frame >= FILL_START && frame <= FILL_END + 4;
  const headFade = interpolate(frame, [FILL_END, FILL_END + 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Wavefront trail: freshly lit characters brightest, decaying backward; fades out to steady state after the fill
  const trailFade = interpolate(frame, [FILL_END, FILL_END + 10], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const TRAIL = 34; // trail length (% of width)
  const trailMask =
    `linear-gradient(90deg, transparent 0%, transparent ${Math.max(0, pPct - TRAIL)}%, ` +
    `rgba(0,0,0,0.9) ${Math.max(0, pPct - 3)}%, rgba(0,0,0,0.9) ${Math.min(100, pPct + 1)}%, ` +
    `transparent ${Math.min(100, pPct + 6)}%)`;

  const noise = FLICKER[Math.min(frame, FLICKER.length - 1)];
  // Lightning bolts active this frame
  const active = FLASHES.filter((f) => frame >= f.at && frame < f.at + f.life);
  const boltBoost = active.length > 0 ? 0.35 : 0;
  // Glow breathing: noise micro-flicker after fill + brightening during lightning
  const glowLvl =
    interpolate(frame, [FILL_START, FILL_END], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    (0.82 + 0.18 * noise) +
    boltBoost;

  // Soft-edge mask: keeps the glow layers' fill edge from looking hard
  const softMask = (soft: number): string =>
    p >= 1
      ? 'none'
      : `linear-gradient(90deg, #000 0%, #000 ${Math.max(0, pPct - soft)}%, transparent ${Math.min(100, pPct + soft * 0.6)}%)`;
  const maskStyle = (soft: number): React.CSSProperties =>
    p >= 1
      ? {}
      : {
          WebkitMaskImage: softMask(soft),
          maskImage: softMask(soft),
        };

  const lineStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 700,
    fontStyle: 'italic',
    fontSize: 92,
    letterSpacing: -1,
    lineHeight: 1.28,
    color: '#ffffff',
    whiteSpace: 'nowrap',
  };

  const gradText: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: GRAD,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <AbsoluteFill style={{ background: '#050505', justifyContent: 'center', alignItems: 'center' }}>
      {/* Ambient glow behind the word (large radius, intensifies with the charge) */}
      <div
        style={{
          position: 'absolute',
          left: 500,
          top: 340,
          width: 820,
          height: 320,
          borderRadius: '50%',
          background:
            'radial-gradient(closest-side, rgba(180,110,255,0.6), rgba(255,110,212,0.25) 55%, transparent 78%)',
          filter: 'blur(38px)',
          opacity: 0.55 * glowLvl,
        }}
      />
      <div
        style={{
          textAlign: 'center',
          opacity: enter,
          transform: `translateY(${(1 - enter) * 36}px)`,
        }}
      >
        <div style={lineStyle}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span>Supercharged</span>
            {/* AE-style glow: large-radius soft layer (most blurred) */}
            <span
              aria-hidden
              style={{
                ...gradText,
                ...maskStyle(14),
                filter: 'blur(46px) saturate(1.6)',
                opacity: 0.55 * glowLvl,
                transform: 'scale(1.05)',
              }}
            >
              Supercharged
            </span>
            {/* Mid halo layer */}
            <span
              aria-hidden
              style={{
                ...gradText,
                ...maskStyle(10),
                filter: 'blur(18px) saturate(1.4) brightness(1.15)',
                opacity: 0.62 * glowLvl,
              }}
            >
              Supercharged
            </span>
            {/* Near-core soft glow */}
            <span
              aria-hidden
              style={{
                ...gradText,
                ...maskStyle(7),
                filter: 'blur(6px) brightness(1.25)',
                opacity: 0.72 * Math.min(1, glowLvl + 0.1),
              }}
            >
              Supercharged
            </span>
            {/* Sharp gradient body */}
            <span
              aria-hidden
              style={{
                ...gradText,
                clipPath: `inset(-25% ${100 - pPct}% -25% 0)`,
              }}
            >
              Supercharged
            </span>
            {/* Wavefront trail brighten: freshly lit characters glow strongest, decaying back to steady state */}
            {trailFade > 0.01 && (
              <span
                aria-hidden
                style={{
                  ...gradText,
                  WebkitMaskImage: trailMask,
                  maskImage: trailMask,
                  filter: 'blur(9px) saturate(1.7) brightness(1.7)',
                  opacity: 0.95 * trailFade,
                }}
              >
                Supercharged
              </span>
            )}
            {/* Overexposed bright core on the fill-head characters (character-shaped, not separate dots; only while filling) */}
            {filling && p < 1 && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  color: '#fff',
                  clipPath: `inset(-25% ${Math.max(0, 100 - pPct)}% -25% ${Math.max(0, pPct - 10)}%)`,
                  filter: 'blur(3px)',
                  opacity: 0.9 * headFade,
                  textShadow: '0 0 22px rgba(255,255,255,0.9), 0 0 55px rgba(216,150,255,0.8)',
                }}
              >
                Supercharged
              </span>
            )}
            {/* Hook lightning: after the fill completes, random flashes hopping between characters/above the word */}
            <svg
              aria-hidden
              viewBox="0 0 700 240"
              style={{
                position: 'absolute',
                left: -25,
                top: -62,
                width: 700,
                height: 240,
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              {active.map((f, i) => {
                const b = BOLTS[f.bolt];
                const decay = 1 - (frame - f.at) / f.life;
                return (
                  <g key={`${f.at}-${i}`} opacity={Math.min(1, 1.1 * decay)}>
                    <path
                      d={b.d}
                      fill="none"
                      stroke="rgba(216,60,190,0.65)"
                      strokeWidth={b.long ? 6 : 4.5}
                      strokeLinejoin="miter"
                      style={{ filter: 'blur(6px)' }}
                    />
                    <path
                      d={b.d}
                      fill="none"
                      stroke="rgba(235,110,215,0.9)"
                      strokeWidth={b.long ? 2.4 : 1.9}
                      strokeLinejoin="miter"
                      style={{ filter: 'blur(1.5px)' }}
                    />
                    <path
                      d={b.d}
                      fill="none"
                      stroke="#ffd8f2"
                      strokeWidth={b.long ? 1.4 : 1.1}
                      strokeLinejoin="miter"
                    />
                  </g>
                );
              })}
            </svg>
          </span>{' '}
          <span>performance</span>
        </div>
        <div style={lineStyle}>with rock-solid reliability</div>
      </div>
    </AbsoluteFill>
  );
};
