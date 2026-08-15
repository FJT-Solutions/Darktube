// glitch-displace | noise-displacement tearing
// FakeDashboard A plays until 45f; 45–62f is the tearing transition: the page is cut into
// 16 horizontal strips (outer layer overflow hidden + inner full page aligned back with a
// reverse translateY), each strip's translateX jittered ±70px by h(strip*31+f*7), with an
// amplitude envelope 0→peak→0 (out-cubic attack, linear decay — the impact rule).
// Two full-page dark/light offset ghost layers stack on top (+12px dark / -12px light
// inverted, opacity ≤0.35, a grayscale take on RGB split). At 58f, mid-decay of the jitter,
// variant hard-cuts to "B", jitters 4 more frames, then settles at 62f. From 62f the masks
// are removed and B renders straight (strips/ghosts all conditionally unmounted),
// 62–135f true stillness for 73f ≥ 40f. Frame-determined: h() is pseudo-random, no Math.random.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

const STRIPS = 16;
const H = 1080;
const STRIP_H = H / STRIPS; // 67.5
const AMP = 70; // peak strip offset (spec backup boost; QA needs the tear visible at a glance)

// Standard pseudo-random in the library
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

export const GlitchDisplace: React.FC = () => {
  const frame = useCurrentFrame();

  const tearing = frame >= 45 && frame < 62;
  const variant: 'A' | 'B' = frame >= 58 ? 'B' : 'A';

  if (!tearing) {
    // A sits still before 45f; from 62f B renders straight in true stillness (no transform / filter / ghosts)
    return (
      <AbsoluteFill style={{ background: G.bg }}>
        <FakeDashboard variant={variant} />
      </AbsoluteFill>
    );
  }

  // Amplitude envelope: 45–48f out-cubic attack → plateau → 56–62f linear decay (frame-driven, deterministic)
  const rise = interpolate(frame, [45, 48], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const decay = interpolate(frame, [56, 62], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const env = Math.min(rise, decay);

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* Full page backing underneath, so horizontal strip shifts don't expose background gaps */}
      <AbsoluteFill>
        <FakeDashboard variant={variant} />
      </AbsoluteFill>

      {/* Dark/light offset ghosts (grayscale RGB split): +12px darkened / -12px inverted brightened */}
      <AbsoluteFill
        style={{
          transform: 'translateX(12px)',
          opacity: 0.35 * env,
          filter: 'brightness(0.45)',
        }}
      >
        <FakeDashboard variant={variant} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: 'translateX(-12px)',
          opacity: 0.28 * env,
          filter: 'invert(1)',
        }}
      >
        <FakeDashboard variant={variant} />
      </AbsoluteFill>

      {/* 16 horizontal strips: outer clip, inner full page aligned back with translateY + per-frame horizontal jitter */}
      {Array.from({ length: STRIPS }).map((_, i) => {
        const dx = (h(i * 31 + frame * 7) * 2 - 1) * AMP * env;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * STRIP_H,
              left: 0,
              width: 1920,
              height: STRIP_H,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 1920,
                height: H,
                transform: `translate(${dx.toFixed(2)}px, ${-i * STRIP_H}px)`,
              }}
            >
              <FakeDashboard variant={variant} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
