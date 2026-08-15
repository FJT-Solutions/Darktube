// whip-pan-transition | whip-pan transition
// Two pages pan across the frame together, hiding the cut point: the outgoing page whips
// left while the incoming page whips in from the right; during the overlap, speed-stretch
// scaleX(1.12) and motion blur rise and fall with velocity.
// Beat (120f @30fps): 0–20 outgoing hold → 20–56 whip (Easing.bezier(0.7,0,0.2,1))
// → 56–120 incoming page settles into true stillness for 64f ≥ 40f. Frame-determined, no randomness.
//
// Uses TransitionSeries from @remotion/transitions to demo a full-page whip —
// the cut hides inside the whip, more directional than a white flash, suited to high-tempo segments.
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

// Whip: a page translates [-travel, 0] (outgoing) or [0, travel] (incoming) within [start,end].
// A sine velocity curve drives stretch and blur — velocity peaks in the middle, still at both ends.
const useWhip = (frame: number, start: number, end: number) => {
  const p = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.7, 0, 0.2, 1),
  });
  const velocity = Math.sin(Math.PI * p); // 0→1→0
  return { p, velocity };
};

// Outgoing page: whips left from its position
const ExitPage: React.FC<{ frame: number; start: number; end: number }> = ({
  frame,
  start,
  end,
}) => {
  const { p, velocity } = useWhip(frame, start, end);
  const x = interpolate(p, [0, 1], [0, -110], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stretch = 1 + velocity * 0.12;
  const blur = velocity * 24;
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}%) scaleX(${stretch})`,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      }}
    >
      <FakeDashboard variant="A" />
    </AbsoluteFill>
  );
};

// Incoming page: whips in from the right
const EnterPage: React.FC<{ frame: number; start: number; end: number }> = ({
  frame,
  start,
  end,
}) => {
  const { p, velocity } = useWhip(frame, start, end);
  const x = interpolate(p, [0, 1], [110, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stretch = 1 + velocity * 0.12;
  const blur = velocity * 24;
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}%) scaleX(${stretch})`,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      }}
    >
      <FakeDashboard variant="B" />
    </AbsoluteFill>
  );
};

export const WhipPanTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const HOLD = 20; // outgoing hold
  const SWEEP = 36; // whip segment
  const WHIP_START = HOLD;
  const WHIP_END = HOLD + SWEEP;

  // After the whip: page B renders straight (masks removed; leftover transforms would break true stillness)
  if (frame >= WHIP_END) {
    return (
      <AbsoluteFill style={{ background: '#ececea' }}>
        <FakeDashboard variant="B" />
      </AbsoluteFill>
    );
  }

  // Outgoing hold: pure page A
  if (frame < WHIP_START) {
    return (
      <AbsoluteFill style={{ background: '#ececea' }}>
        <FakeDashboard variant="A" />
      </AbsoluteFill>
    );
  }

  // Whip segment: both pages in frame
  return (
    <AbsoluteFill style={{ background: '#ececea' }}>
      <ExitPage frame={frame} start={WHIP_START} end={WHIP_END} />
      <EnterPage frame={frame} start={WHIP_START} end={WHIP_END} />
    </AbsoluteFill>
  );
};
