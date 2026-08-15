// Feature-card 3D flip reveal (card-flip-reveal) — an Apple bento flip segment.
// Three placeholder cards in a row flip 180° around the Y axis one by one with a
// stagger (perspective 1200px, two-sided structure with backface-visibility
// hidden); the back is a white card with a large conclusion number at center. The
// flip accelerates then settles elastically (end overshoot +12° back to 180°);
// near the side edge (90°) a darkening gray highlight band sweeps across, moving
// with the angle (white background calls for darkening, not brightening).
// Keyframes (card i starts at 18 + i*10, i = 0/1/2):
//   0–18 hold → card0: 18–36 flips to 192° → 36–44 bounce-back to 180° →
//   card1: 28–46–54, card2: 38–56–64 → 64–145 all three still (81f ≥ 40f).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const CW = 440;
const CH = 300;
const GAP = 60;
const X0 = (1920 - (CW * 3 + GAP * 2)) / 2; // 240
const Y = (1080 - CH) / 2; // 390
const FLIP_START = 18;
const STAGGER = 10;
const FLIP_DUR = 18;
const SETTLE = 8;
const OVERSHOOT = 12; // end overshoot angle (original 8° looked too subtle, bumped to 12°)

const RESULTS = ['4.9×', '−38%', '99.9%'];

// Flip angle of card i at frame f: 0 → 192 (accelerate then decelerate) → 180 (elastic settle), frame-deterministic
const angleAt = (f: number, i: number): number => {
  const s = FLIP_START + i * STAGGER;
  if (f < s + FLIP_DUR) {
    return interpolate(f, [s, s + FLIP_DUR], [0, 180 + OVERSHOOT], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.55, 0, 0.3, 1),
    });
  }
  return interpolate(f, [s + FLIP_DUR, s + FLIP_DUR + SETTLE], [180 + OVERSHOOT, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.poly(5)),
  });
};

// Darkening highlight band that moves with the angle: position sweeps from outside the card's left to outside its right, peaking at 90° (the side edge)
const Sheen: React.FC<{ angle: number }> = ({ angle }) => {
  const pos = interpolate(angle, [35, 145], [-25, 115], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const op = Math.max(0, 1 - Math.abs(angle - 90) / 55);
  if (op <= 0.004) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 14,
        pointerEvents: 'none',
        opacity: op,
        background: `linear-gradient(105deg, rgba(0,0,0,0) ${pos - 14}%, rgba(0,0,0,0.32) ${pos}%, rgba(0,0,0,0) ${pos + 14}%)`,
      }}
    />
  );
};

const FlipCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const angle = angleAt(frame, i);
  return (
    <div
      style={{
        position: 'absolute',
        left: X0 + i * (CW + GAP),
        top: Y,
        width: CW,
        height: CH,
        perspective: 1200,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${angle}deg)`,
        }}
      >
        {/* Front: placeholder card */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          <Card w={CW} h={CH} seed={i + 1} />
          <Sheen angle={angle} />
        </div>
        {/* Back: white card + large conclusion number (pre-rotated 180°, reads correctly once fully flipped) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: G.card,
            border: `2px solid ${G.border}`,
            borderRadius: 14,
            boxSizing: 'border-box',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 800,
              fontSize: 96,
              color: G.ink,
              letterSpacing: -2,
            }}
          >
            {RESULTS[i]}
          </span>
          <Sheen angle={angle} />
        </div>
      </div>
    </div>
  );
};

export const CardFlipReveal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="CARD FLIP REVEAL" size={54} />
      </div>
      {[0, 1, 2].map((i) => (
        <FlipCard key={i} i={i} frame={frame} />
      ))}
    </div>
  );
};
