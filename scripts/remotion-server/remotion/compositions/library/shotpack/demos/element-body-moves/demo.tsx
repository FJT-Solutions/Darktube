// axial-stretch — axial stretch speed feel
// three Cards fly in horizontally one after another from off-screen right and land in place; in flight,
// velocity along the motion axis drives the stretch (scaleX peak ≈2.2 / scaleY ≈0.72, a syrup-pull feel),
// with a Back.out-style bounce at the landing point.
// Velocity is driven by the position difference p(f)-p(f-1); below the threshold there's no stretch.
// True stillness ≥35f at the end.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, TitleBlock } from '../../_fixtures/Fixtures';

const W = 1920;
const CARD_W = 380;
const CARD_H = 230;
const GAP = 60;
const ROW_W = 3 * CARD_W + 2 * GAP; // 1260
const ROW_X0 = (W - ROW_W) / 2; // 330
const ROW_Y = (1080 - CARD_H) / 2; // 425

const START_X = 1980; // fully off-screen to the right
const FLIGHT = 36; // flight frame count
const STAGGER = 12; // stagger
const FIRST = 10; // first card takeoff frame
const SQUASH = 8; // landing rebound frame count

const VEL_MIN = 2; // px/frame, no stretch below this
const VEL_REF = 140; // px/frame, reaching this velocity = full stretch
const STRETCH_X = 1.2; // scaleX peak 1 + 1.2 = 2.2
const SQUISH_Y = 0.28; // scaleY trough 1 - 0.28 = 0.72

// poly(4) in-out: mid-flight velocity peak ≈ 4× the average, plenty of punch
const flightEase = Easing.inOut(Easing.poly(4));

const posAt = (f: number, start: number, targetX: number): number =>
  interpolate(f, [start, start + FLIGHT], [START_X, targetX], {
    easing: flightEase,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const FlyCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const start = FIRST + i * STAGGER;
  const targetX = ROW_X0 + i * (CARD_W + GAP);
  const land = start + FLIGHT;

  const x = posAt(frame, start, targetX);
  // velocity = position difference (decoupled from frame time, purely determined by the position function)
  const v = Math.abs(posAt(frame, start, targetX) - posAt(frame - 1, start, targetX));
  const s = Math.min(Math.max((v - VEL_MIN) / (VEL_REF - VEL_MIN), 0), 1);

  const stretchX = 1 + STRETCH_X * s;
  const stretchY = 1 - SQUISH_Y * s;

  // landing rebound: scaleX overshoots to 0.85 then back to 1 (squashed flat by "slamming to a stop" horizontally), 8f
  const sqX = interpolate(frame, [land, land + SQUASH / 2, land + SQUASH], [1, 0.85, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sqY = interpolate(frame, [land, land + SQUASH / 2, land + SQUASH], [1, 1.1, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: ROW_Y,
        // order: translate first, then scale; transformOrigin set to the trailing edge of motion (flying left → right edge)
        transform: `translateX(${x}px) scaleX(${stretchX * sqX}) scaleY(${stretchY * sqY})`,
        transformOrigin: '100% 50%',
      }}
    >
      <Card w={CARD_W} h={CARD_H} seed={i + 1} />
    </div>
  );
};

export const AxialStretch: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', opacity: titleOp }}>
        <TitleBlock text="AXIAL STRETCH" size={72} />
      </div>
      {/* dashed landing slots marking the target positions */}
      {[0, 1, 2].map((i) => (
        <div
          key={`slot-${i}`}
          style={{
            position: 'absolute',
            left: ROW_X0 + i * (CARD_W + GAP),
            top: ROW_Y,
            width: CARD_W,
            height: CARD_H,
            border: `2px dashed ${G.bar}`,
            borderRadius: 14,
            boxSizing: 'border-box',
          }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <FlyCard key={i} i={i} frame={frame} />
      ))}
    </div>
  );
};
