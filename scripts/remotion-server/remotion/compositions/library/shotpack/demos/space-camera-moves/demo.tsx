import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

// drone-dive-landing: god's-eye view of a full dashboard laid flat (near-vertical pitch, scaled down and centered),
// then the camera dives hard — the pitch levels out, the page scales up and stands tall, ending with an air-cushion long-tail deceleration,
// settling into a close-up directly in front of the hero card. A translation of an FPV drone dive-and-land camera move.
//
// hero card = FakeDashboard A grid's top-left cell:
// sidebar 220 + padding 36 = starts at x 256, column width (1628-56)/3 = 524;
// top bar 72 + padding 36 = starts at y 108, row height (936-28)/2 = 454.
// card center (256+262, 108+227) = (518, 335); transform-origin stays pinned here throughout.
const HERO = { cx: 518, cy: 335 };
const DIVE_START = 20; // opening hold of 20f: establish the god's-eye view
const DIVE_END = 45;   // main dive 25f, ease-in(cubic) accelerating deeper
const LAND_END = 65;   // air-cushion segment 20f, ease-out(quint) long-tail decel, then true stillness
const DIVE_SHARE = 0.82; // dive takes 82% of the travel, leaving 18% for the air cushion

const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // Two speed curves form a single travel p∈[0,1]: dive down with a hard acceleration first, then a sharp speed drop at the switch = the feel of the air cushion catching
  const pDive = interpolate(frame, [DIVE_START, DIVE_END], [0, DIVE_SHARE], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const pLand = interpolate(frame, [DIVE_END, LAND_END], [0, 1 - DIVE_SHARE], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.poly(5)),
  });
  const p = frame < DIVE_END ? pDive : DIVE_SHARE + pLand;

  // Three axes coupled, all driven by the same p (one continuous maneuver by the same "camera")
  const rotX = interpolate(p, [0, 1], [72, 0]);      // pitch levels out
  const scale = interpolate(p, [0, 1], [0.42, 1.35]); // shrink wide view → hero close-up
  // Pan: start positions the flat page slightly above screen center; end puts the hero card center at screen center
  const tx = interpolate(p, [0, 1], [256, 960 - HERO.cx]);
  const ty = interpolate(p, [0, 1], [150, 540 - HERO.cy]);

  // Ground shadow: while looking down the page floats and drags an elliptical soft shadow below; the shadow fades once it lands and stands up
  const shadowOp = interpolate(p, [0, 0.8], [0.32, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shadowW = 1300 * (0.6 + scale * 0.4);

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* Ground soft shadow (altitude cue) */}
      <div
        style={{
          position: 'absolute',
          left: 960 - shadowW / 2,
          top: 620,
          width: shadowW,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 68%)',
          opacity: shadowOp,
          filter: 'blur(18px)',
        }}
      />
      {/* Camera = perspective container; the page does rotateX + scale + translate around the hero card center */}
      <AbsoluteFill style={{ perspective: 1400 }}>
        <div
          style={{
            position: 'absolute',
            width: 1920,
            height: 1080,
            transformOrigin: `${HERO.cx}px ${HERO.cy}px`,
            transform: `translate(${tx}px, ${ty}px) rotateX(${rotX}deg) scale(${scale})`,
            boxShadow: `0 ${6 + (1 - p) * 30}px ${20 + (1 - p) * 60}px rgba(0,0,0,${0.1 + (1 - p) * 0.14})`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <FakeDashboard variant="A" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DroneDiveLanding: React.FC = () => (
  <CameraMotionBlur shutterAngle={220} samples={9}>
    <Scene />
  </CameraMotionBlur>
);
