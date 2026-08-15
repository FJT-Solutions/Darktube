import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Card, TitleBlock } from '../../_fixtures/Fixtures';

// bento-light-up: in a dark field a 3×2 bento wall sits dim on standby, cells light up one by one to the beat —
// the border light-flow traces a full lap first (amber), then the cell content brightens and pops up;
// once all six cells are lit the whole wall nudges in and settles.
// Beat: 0–20 establish (hold) → each cell activates in 12f steps (border 8f + content pop 8f)
//       → ~96f all lit → 96–121 scale 1→1.04 slow push → 121–150 stillness to close.

const BG = '#2a2a28';
const AMBER = '#e8b45e';
const FIRST = 20; // first cell activation frame
const GAP = 12; // inter-cell beat
const CELL_W = 480;
const CELL_H = 330;
const GUT = 44;
const LEFT = (1920 - (CELL_W * 3 + GUT * 2)) / 2;
const TOP = (1080 - (CELL_H * 2 + GUT)) / 2 + 30;

const Cell: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const start = FIRST + i * GAP;
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = LEFT + col * (CELL_W + GUT);
  const y = TOP + row * (CELL_H + GUT);

  // ① border light-flow: dashoffset stroke with pathLength=100, completes one lap in 8f
  const draw = interpolate(frame, [start, start + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  // after drawing, the light-flow anneals: amber bright edge → softens into a steady thin edge
  const strokeFade = interpolate(frame, [start + 12, start + 26], [1, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // ② content brightens + rises pop-out: takes over after the stroke passes halfway, 8f pop (back-out with a touch of overshoot)
  const lit = interpolate(frame, [start + 6, start + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rise = interpolate(frame, [start + 6, start + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 1.4, 0.5, 1),
  });
  const opacity = 0.18 + 0.82 * lit;
  const ty = 20 * (1 - rise);
  // seed sine hash gives each cell a slight variation (glow intensity feels a bit random at the light-up moment)
  const jitter = Math.abs(Math.sin(i * 127.3) * 43758.5453 % 1);
  const glow = lit * (1 - lit) * 4 * (14 + jitter * 6); // glow pulse brightest mid-light-up

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: CELL_W, height: CELL_H }}>
      {/* dark-state card + lit content (same card, surfaced via opacity/translateY) */}
      <div
        style={{
          opacity,
          transform: `translateY(${ty}px)`,
          boxShadow: lit > 0.5 ? `0 0 ${glow}px rgba(232,180,94,${0.35 * lit * (1 - lit) * 4})` : 'none',
          borderRadius: 14,
        }}
      >
        <Card w={CELL_W} h={CELL_H} seed={i + 1} />
      </div>
      {/* border light-flow: SVG rect strokes one lap */}
      {draw > 0 && (
        <svg
          width={CELL_W}
          height={CELL_H}
          viewBox={`0 0 ${CELL_W} ${CELL_H}`}
          style={{ position: 'absolute', left: 0, top: ty, overflow: 'visible' }}
        >
          <rect
            x={2}
            y={2}
            width={CELL_W - 4}
            height={CELL_H - 4}
            rx={14}
            fill="none"
            stroke={AMBER}
            strokeWidth={4}
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 * (1 - draw)}
            opacity={strokeFade}
            style={{ filter: `drop-shadow(0 0 ${6 + jitter * 4}px ${AMBER})` }}
          />
        </svg>
      )}
    </div>
  );
};

export const BentoLightUp: React.FC = () => {
  const frame = useCurrentFrame();

  // ③ after all six cells light (~96f) the whole wall slow-pushes scale 1→1.04 over 25f, then true stillness
  const push = interpolate(frame, [96, 121], [1, 1.04], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });

  // title brightens slightly with the first cell to set the scene
  const titleLit = interpolate(frame, [FIRST, FIRST + 20], [0.25, 0.75], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${push})`,
          transformOrigin: '960px 540px',
        }}
      >
        <div style={{ position: 'absolute', left: LEFT, top: TOP - 110, opacity: titleLit, filter: 'invert(1)' }}>
          <TitleBlock text="Features" size={64} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Cell key={i} i={i} frame={frame} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
