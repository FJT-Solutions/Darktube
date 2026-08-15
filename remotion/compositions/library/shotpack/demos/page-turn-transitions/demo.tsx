// Barn-door split reveal — CapCut "door-opening" transition.
// FakeDashboard A splits vertically into left and right halves from dead center: two
// 960×1080 overflow:hidden containers each hold a full copy of A (the right half aligns
// with an inner translateX(-960)), while both accelerate outward off-frame, revealing
// FakeDashboard B beneath as it eases forward from scale 1.06 to 1.0.
// Each torn edge carries a 2px G.ink highlight line + 8px shadow to sell the "rip".
// Keyframes: 0–30 still showing A (18–22 / 25–29 two quick flashes of a center hairline
// foreshadowing the split) → 30–50 both halves translateX ∓980 (Easing.in cubic, accelerating
// out) → 30–55 B beneath scales 1.06→1.0 (out cubic) → 55–130 all still (75f).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard, TitleBlock } from '../../_fixtures/Fixtures';

export const BarnDoorSplit: React.FC = () => {
  const frame = useCurrentFrame();

  // Both halves slide out: 30–50f, 0 → 980px, accelerating away
  const slide = interpolate(frame, [30, 50], [0, 980], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  // B beneath: 30–55f eases forward from 1.06 to 1.0
  const bScale = interpolate(frame, [30, 55], [1.06, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Pre-split foreshadow: the center hairline flashes twice (a frame-determined switch, no randomness)
  const crackFlash =
    (frame >= 18 && frame < 22) || (frame >= 25 && frame < 29);
  // After the split, the inner-edge line + shadow persist (sliding off-frame with the doors)
  const tornEdge = frame >= 30;

  const edgeLine = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    [side]: 0,
    width: 3,
    height: 1080,
    background: G.ink,
    boxShadow:
      side === 'right'
        ? '-8px 0 14px rgba(0,0,0,0.4)'
        : '8px 0 14px rgba(0,0,0,0.4)',
  });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* FakeDashboard B beneath: eases forward from scale 1.06 → 1.0 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transform: `scale(${bScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <FakeDashboard variant="B" />
      </div>

      {/* Left door: 960×1080 viewport holding the left half of a full A */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 960,
          height: 1080,
          overflow: 'hidden',
          transform: `translateX(${-slide}px)`,
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}>
          <FakeDashboard variant="A" />
        </div>
        {tornEdge && <div style={edgeLine('right')} />}
      </div>

      {/* Right door: 960×1080 viewport, inner layer aligned with translateX(-960) */}
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: 0,
          width: 960,
          height: 1080,
          overflow: 'hidden',
          transform: `translateX(${slide}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transform: 'translateX(-960px)',
          }}
        >
          <FakeDashboard variant="A" />
        </div>
        {tornEdge && <div style={edgeLine('left')} />}
      </div>

      {/* Split foreshadow: 2px center hairline flashes twice */}
      {crackFlash && (
        <div
          style={{
            position: 'absolute',
            left: 959,
            top: 0,
            width: 2,
            height: 1080,
            background: G.ink,
          }}
        />
      )}

      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <TitleBlock text="BARN DOOR SPLIT" size={54} />
      </div>
    </div>
  );
};
