import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { FakeDashboard, Card, G } from '../../_fixtures/Fixtures';

// invisible-cut: foreground-occlusion invisible cut — a card scaled beyond the
// frame sweeps past with heavy motion blur; the instant the screen is fully
// blurred the background swaps invisibly from A to B, and when the card flies out
// the right the viewer believes it's still the same shot. (invisible-cut + foreground-occlusion-swipe)
const SW_START = 40; // card entrance
const SW_END = 54; // card exit (14f sweep)
const CUT = 47; // hard cut point: sweep midpoint, the frame where the card fully blurs the screen

// Card's horizontal position along the sweep curve (container left, unscaled coords)
const xAt = (f: number) =>
  // Card at scale(1.6) has half-width 1280: start right edge -120 / end left edge 2120,
  // both fully off-frame; midpoint f47 covers -280..2280, blurring the full 1920 frame
  interpolate(f, [SW_START, SW_END], [-2200, 2600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.7, 1),
  });

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const x = xAt(frame);
  // Instantaneous velocity (px/frame), driving the skew and afterimage intensity
  const v = xAt(frame + 0.5) - xAt(frame - 0.5);
  const sweeping = frame > SW_START - 2 && frame < SW_END + 3;
  // The background gets a "wind nudge": A is dragged left, then after the cut B steadies in from the right — selling the same-shot illusion
  const shove =
    frame < CUT
      ? interpolate(frame, [SW_START, CUT], [0, -40], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.quad),
        })
      : interpolate(frame, [CUT, CUT + 13], [40, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* Background layer: the hard cut hides inside the occlusion frame */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${shove}px)` }}>
        {frame < CUT ? <FakeDashboard variant="A" /> : <FakeDashboard variant="B" />}
      </div>
      {/* Manual afterimages: 4 trailing layers (behind the main card) ensuring the occlusion window blurs the full screen */}
      {sweeping &&
        [4, 3, 2, 1].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: xAt(frame - i * 0.55),
              top: 40,
              width: 1600,
              height: 1000,
              transform: 'scale(1.6)',
              opacity: [0, 0.35, 0.22, 0.13, 0.07][i],
              filter: 'blur(14px)',
            }}
          >
            <Card w={1600} h={1000} seed={9} style={{ width: '100%', height: '100%' }} />
          </div>
        ))}
      {/* Main card: 1600x1000 scaled 1.6x (2560x1600, beyond the frame), with its own blur to strengthen the smear */}
      {sweeping && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: 40,
            width: 1600,
            height: 1000,
            transform: `scale(1.6) skewX(${-v * 0.018}deg)`,
            filter: 'blur(8px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
            borderRadius: 20,
          }}
        >
          <Card w={1600} h={1000} seed={9} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const InvisibleCut: React.FC = () => (
  <CameraMotionBlur shutterAngle={300} samples={12}>
    <Scene />
  </CameraMotionBlur>
);
