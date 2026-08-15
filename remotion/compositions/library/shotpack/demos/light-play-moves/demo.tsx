// halation-bloom —— bloom halation on the highlight
// Big white "10x" on a dark-gray ground slams in with a crash-zoom (2.4→1, 7f in-quad + 2f bounce-back).
// From the impact frame: a bottom-layer copy of the text (a white bloom layer, blur + brightened) surges outward (scale 1→1.3, 6f out-cubic spread),
// then falls back linearly over 20f to 0.35 as a lingering soft bloom (a decoupled spread/dissolve test case), then eases over 15f to a 0.22 steady state.
// White on a dark ground: the test case where brightening is invisible on a white background. Closes with true stillness ≥40f.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

const BG = '#2a2a28';
const WHITE = '#f7f7f5';
const MID = '#8f8f8d';

// —— timeline (30fps) ——
const ZOOM_START = 8; // entrance start
const IMPACT = 15; // impact frame (7f rapid zoom-in)
const REBOUND_END = 17; // 2f bounce-back
const POP_END = IMPACT + 6; // bloom surges 6f → f21
const FALL_END = POP_END + 20; // 20f linear fall → f41
const SETTLE_END = FALL_END + 15; // 15f ease-down → f56, fully still after this
// Total 145f → 89f of stillness ≥ 40f

const TextBlock: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: 260,
      fontWeight: 800,
      color,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}
  >
    10x
  </div>
);

export const HalationBloom: React.FC = () => {
  const frame = useCurrentFrame();

  // —— crash-zoom entrance: scale 2.4 → 0.94 (7f in-quad accelerating to the impact) → 1 (2f bounce-back) ——
  const zoomIn = interpolate(frame, [ZOOM_START, IMPACT], [2.4, 0.94], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rebound = interpolate(frame, [IMPACT, REBOUND_END], [0.94, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textScale = frame < IMPACT ? zoomIn : rebound;
  const textOpacity = interpolate(frame, [ZOOM_START, ZOOM_START + 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // —— bloom layer: conditionally mounted from the impact frame ——
  // Spread (scale): out-cubic, 6f surge 1 → 1.3
  const bloomScale = interpolate(frame, [IMPACT, POP_END], [1, 1.3], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Dissolve (opacity): decoupled from the spread — stays fully bright during the surge, then falls linearly over 20f to 0.35
  const bloomFall = interpolate(frame, [POP_END, FALL_END], [1, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Lingering bloom eases over 15f to a 0.22 steady state
  const bloomSettle = interpolate(frame, [FALL_END, SETTLE_END], [0.35, 0.22], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomOpacity = frame < FALL_END ? bloomFall : bloomSettle;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: BG,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Small label, static throughout */}
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '0.35em',
          color: MID,
        }}
      >
        HALATION BLOOM
      </div>

      {/* Bloom layer: a copy of the text underneath, blur + brighten, conditionally mounted from the impact frame */}
      {frame >= IMPACT && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${bloomScale})`,
            opacity: bloomOpacity,
            filter: 'blur(22px) brightness(1.8)',
          }}
        >
          <TextBlock color={WHITE} />
        </div>
      )}

      {/* Main text: crash-zoom hard stop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${textScale})`,
          opacity: textOpacity,
        }}
      >
        <TextBlock color={WHITE} />
      </div>
    </div>
  );
};
