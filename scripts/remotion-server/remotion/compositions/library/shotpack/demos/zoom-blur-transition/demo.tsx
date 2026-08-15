// zoom-blur-transition — zoom-punch transition
// Two pages move in the same depth direction to hide the cut point: the outgoing
// page zooms in while blurring out, and the incoming page punches in from an
// enlarged, blurred state and settles. The cut hides inside the punch, reading as
// "the camera passed through" — fits push-forward scene changes.
// Beat (120f @30fps): 0–20 pre-state hold → 20–56 punch → 56–120 new page settles to true stillness.
// Frame-deterministic, no random source.
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

export const ZoomBlurTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const HOLD = 20; // pre-state
  const PUNCH = 36; // punch segment
  const PUNCH_START = HOLD;
  const PUNCH_END = HOLD + PUNCH;

  // After the punch: B renders full-page directly (strip the wrapper — a leftover transform would break true stillness)
  if (frame >= PUNCH_END) {
    return (
      <AbsoluteFill style={{ background: '#ececea' }}>
        <FakeDashboard variant="B" />
      </AbsoluteFill>
    );
  }

  // Pre-state: pure A page
  if (frame < PUNCH_START) {
    return (
      <AbsoluteFill style={{ background: '#ececea' }}>
        <FakeDashboard variant="A" />
      </AbsoluteFill>
    );
  }

  // Punch segment
  const p = interpolate(frame, [PUNCH_START, PUNCH_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // Outgoing page: zooms in closer + blur out
  const exitScale = interpolate(p, [0, 1], [1, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const exitBlur = interpolate(p, [0, 1], [0, 16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitOpacity = interpolate(p, [0.6, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Incoming page: punches in from enlarged blur and settles
  const enterScale = interpolate(p, [0, 1], [1.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const enterBlur = interpolate(p, [0, 1], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enterOpacity = interpolate(p, [0, 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#ececea' }}>
      <AbsoluteFill
        style={{
          transform: `scale(${exitScale})`,
          filter: exitBlur > 0 ? `blur(${exitBlur}px)` : undefined,
          opacity: exitOpacity,
        }}
      >
        <FakeDashboard variant="A" />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${enterScale})`,
          filter: enterBlur > 0 ? `blur(${enterBlur}px)` : undefined,
          opacity: enterOpacity,
        }}
      >
        <FakeDashboard variant="B" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
