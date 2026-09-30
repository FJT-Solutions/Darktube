// color-block-step-wipe — pure-color rectangles devour the screen via discrete steps() jumps
// Source: notion-ai 1.5–3.5s (blue block steps up from center) + 26–27s (red block eats the
// screen diagonally from the bottom-right corner, carrying a page card)
// Core grammar: block growth with no easing, hard per-frame jumps — pixel-game feel.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';

const BLUE = '#2383e2';
const RED = '#e8503a';

// Discrete steps: when frame crosses a threshold, jump instantly to the new value — no interpolation
const stepVal = (frame: number, steps: Array<[number, number]>): number => {
  let v = steps[0][1];
  for (const [f, val] of steps) {
    if (frame >= f) v = val;
  }
  return v;
};

// Circular AI emoji badge on the blue background
const AiBadge: React.FC<{ scale: number; opacity: number }> = ({ scale, opacity }) => (
  <div
    style={{
      width: 170,
      height: 170,
      borderRadius: '50%',
      background: '#fdf6ec',
      opacity,
      transform: `scale(${scale})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
    }}
  >
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={36} cy={44} r={8} fill={G.ink} />
      <circle cx={74} cy={44} r={8} fill={G.ink} />
      <path d="M32 70 Q55 88 78 70" stroke={G.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M24 28 Q34 20 44 26" stroke={G.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M66 26 Q76 20 86 28" stroke={G.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

// Variant B background: minimal grayscale page (composes existing fixtures only)
const GrayPage: React.FC = () => (
  <AbsoluteFill style={{ background: G.panel, padding: '90px 160px', boxSizing: 'border-box' }}>
    <div style={{ height: 40, width: 560, background: G.bar, borderRadius: 12, marginBottom: 40 }} />
    {[92, 78, 86, 60].map((w, i) => (
      <div key={i} style={{ height: 18, width: `${w}%`, background: G.line, borderRadius: 9, marginBottom: 24 }} />
    ))}
    <div style={{ display: 'flex', gap: 32, marginTop: 30 }}>
      <Card w={420} h={280} seed={2} />
      <Card w={420} h={280} seed={5} />
    </div>
  </AbsoluteFill>
);

export const ColorBlockStepWipe: React.FC = () => {
  const frame = useCurrentFrame();

  // ---------- Scene A (0–77f): blue block steps up from center ----------
  if (frame < 78) {
    // [width, height] hard jumps per stage: small bar → long bar → half-screen band → full screen
    const w = stepVal(frame, [
      [0, 0],
      [8, 280],
      [16, 820],
      [24, 1340],
      [32, 1920],
      [44, 1920],
    ]);
    const h = stepVal(frame, [
      [0, 0],
      [8, 96],
      [16, 96],
      [24, 320],
      [32, 580],
      [44, 1080],
    ]);
    // Badge: steps in after the full-screen takeover (equally discrete, lands in two jumps)
    const badgeScale = stepVal(frame, [
      [0, 0],
      [52, 0.55],
      [58, 1.12],
      [63, 1],
    ]);
    const badgeOpacity = frame >= 52 ? 1 : 0;
    return (
      <AbsoluteFill style={{ background: G.bg, alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            left: 960 - w / 2,
            top: 540 - h / 2,
            width: w,
            height: h,
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        <AiBadge scale={badgeScale} opacity={badgeOpacity} />
      </AbsoluteFill>
    );
  }

  // ---------- Scene B (78–149f): red block eats the screen diagonally from the bottom-right, carrying a grayscale page card ----------
  // p controls the diagonal advance: p=0 none, p=200 full coverage
  const p = stepVal(frame, [
    [78, 0],
    [84, 42],
    [96, 106],
    [108, 200],
  ]);
  // The card advances with the block in jumps (equally discrete)
  const cardPos = stepVal(frame, [
    [78, 0],
    [84, 1],
    [96, 2],
    [108, 3],
  ]);
  const cardXY: Array<[number, number]> = [
    [2100, 1180], // off-frame
    [1480, 800],
    [980, 560],
    [560, 350],
  ];
  const [cx, cy] = cardXY[cardPos];
  const clip =
    p <= 0
      ? 'polygon(100% 100%, 100% 100%, 100% 100%)'
      : `polygon(${100 - p}% 100%, 100% ${100 - p}%, 100% 100%)`;

  return (
    <AbsoluteFill>
      <GrayPage />
      <AbsoluteFill style={{ background: RED, clipPath: clip }} />
      {p > 0 && (
        <div
          style={{
            position: 'absolute',
            left: cx - 210,
            top: cy - 145,
            transform: 'rotate(-4deg)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.3)',
            borderRadius: 14,
          }}
        >
          <Card w={420} h={290} seed={7} />
        </div>
      )}
    </AbsoluteFill>
  );
};
