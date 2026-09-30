// flyline-arc —— flyline connection
// FakeDashboard A slightly dimmed (brightness 0.92); a bezier arc "shoots" from the top-left card to the bottom-right card (22f, out-cubic growth),
// with a bright head leading and a bright-head/dark-tail trail; on the arrival frame the target card gets a 3px+ ink outline pulse + a darkening pulse (white background forbids brightening).
// Then a second line relays to the top-middle card. Ending in true stillness: all animation finishes before f86, then every element freezes.
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

type Pt = { x: number; y: number };

// Handwritten cubic bezier sampling
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const N = 100; // sample segment count

// Card geometry (measured grid of FakeDashboard variant A)
const CARD_LT = { x: 256, y: 108, w: 524, h: 454, cx: 518, cy: 335 }; // top-left
const CARD_RB = { x: 1360, y: 590, w: 524, h: 454, cx: 1622, cy: 817 }; // bottom-right
const CARD_TM = { x: 808, y: 108, w: 524, h: 454, cx: 1070, cy: 335 }; // top-middle

// One flyline: dark underlay + white line segments with bright head / dark tail + leading glow head (conditionally mounted)
const Flyline: React.FC<{
  frame: number;
  start: number; // growth start frame
  haloId: string; // radial gradient ID for the glow head (generated per instance by the parent)
  p0: Pt; p1: Pt; p2: Pt; p3: Pt;
}> = ({ frame, start, haloId, p0, p1, p2, p3 }) => {
  const DUR = 22;
  if (frame < start) return null;
  const e = interpolate(frame, [start, start + DUR], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const growing = frame < start + DUR;
  // Tail brightness evens out linearly within 10f after arrival → then fully static
  const settle = interpolate(frame, [start + DUR, start + DUR + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pts: Pt[] = [];
  const nDrawn = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < nDrawn; i++) {
    const t = Math.min((i / N), e);
    pts.push(bez(p0, p1, p2, p3, t));
  }
  const head = bez(p0, p1, p2, p3, e);
  pts[pts.length - 1] = head;

  const underlay = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Bright head / dark tail: per-segment opacity by "distance from head"; settle evens it out to 1 after arrival
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const tSeg = Math.min(i / N, e) / Math.max(e, 0.001); // 0 tail → 1 head
    const grad = 0.4 + 0.6 * tSeg * tSeg;
    const op = grad + (1 - grad) * settle;
    segs.push(
      <line
        key={i}
        x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y}
        stroke="#fafafa" strokeWidth={4.5} strokeLinecap="round" strokeOpacity={op}
      />
    );
  }

  return (
    <g>
      {/* Dark underlay: keeps the line visible on the light background */}
      <polyline
        points={underlay} fill="none" stroke="#2f2f2f"
        strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.92}
      />
      {segs}
      {/* Glow head: mounted only during growth; once unmounted, true stillness */}
      {growing && (
        <g>
          <circle cx={head.x} cy={head.y} r={26} fill={`url(#${haloId})`} />
          <circle cx={head.x} cy={head.y} r={9} fill="#ffffff" stroke="#2f2f2f" strokeWidth={3} />
        </g>
      )}
    </g>
  );
};

// Target card pulse: 3px+ ink outline + darkening overlay (white background forbids brightening) — conditionally mounted
const CardPulse: React.FC<{
  frame: number;
  at: number; // trigger frame
  rect: { x: number; y: number; w: number; h: number };
}> = ({ frame, at, rect }) => {
  if (frame < at || frame > at + 18) return null;
  // Expansion (rise) uses out-cubic 6f, dissipation uses linear 12f
  const amp =
    frame <= at + 6
      ? interpolate(frame, [at, at + 6], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : interpolate(frame, [at + 6, at + 18], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  return (
    <g>
      <rect
        x={rect.x + 2} y={rect.y + 2} width={rect.w - 4} height={rect.h - 4}
        rx={14} fill={`rgba(0,0,0,${(0.16 * amp).toFixed(3)})`}
      />
      <rect
        x={rect.x + 2} y={rect.y + 2} width={rect.w - 4} height={rect.h - 4}
        rx={14} fill="none" stroke="#2f2f2f" strokeWidth={4} strokeOpacity={amp}
      />
    </g>
  );
};

export const FlylineArc: React.FC = () => {
  const frame = useCurrentFrame();
  // Gradient ID generated per instance so multiple instances on stage don't cross-reference (useId's «:» is illegal in url(), so it's sanitized)
  const haloId = `headHalo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Timeline: line 1 grows 10–32f → card RB pulses 32–50f; line 2 grows 46–68f → card TM pulses 68–86f
  // Fully static after f86 (140f total → 54f of stillness ≥ 35f)
  const L1 = { p0: { x: CARD_LT.cx, y: CARD_LT.cy }, p1: { x: 818, y: 60 }, p2: { x: 1322, y: 380 }, p3: { x: CARD_RB.cx, y: CARD_RB.cy } };
  const L2 = { p0: { x: CARD_RB.cx, y: CARD_RB.cy }, p1: { x: 1760, y: 560 }, p2: { x: 1360, y: 150 }, p3: { x: CARD_TM.cx, y: CARD_TM.cy } };

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', background: '#e0e0de' }}>
      {/* Background slightly dimmed 0.92, constant, not animated */}
      <div style={{ filter: 'brightness(0.92)' }}>
        <FakeDashboard variant="A" />
      </div>
      <svg
        width={1920} height={1080} viewBox="0 0 1920 1080"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <radialGradient id={haloId}>
            <stop offset="0%" stopColor="rgba(0,0,0,0.38)" />
            <stop offset="55%" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <CardPulse frame={frame} at={32} rect={CARD_RB} />
        <CardPulse frame={frame} at={68} rect={CARD_TM} />
        <Flyline frame={frame} start={10} haloId={haloId} {...L1} />
        <Flyline frame={frame} start={46} haloId={haloId} {...L2} />
      </svg>
    </div>
  );
};
