// before-after-slider-scrub — before/after comparison slider
// Two versions of FakeDashboard stacked: before = a low-contrast grayed version ("before"), after
// = the normal, crisp version. A vertical divider with a round handle flings from 8% on the left
// to 70% (overshooting to 76% and bouncing back), then slowly sweeps back to 40% and holds.
// Wherever the divider passes, the after version is revealed (clip-path inset follows the divider x).
// The speed contrast between the fast fling and the slow sweep is the rhythmic key. Fully still
// after f=110 (40f).
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// timeline (divider position as a percentage of the frame width)
const T0 = 14; // first 14f at rest, divider parked at 8%
const FLING = 26; // fast fling: 14→26 (reaches 76% in 12f)
const BOUNCE = 38; // bounce-back: 26→38 settles to 70%
const HOLD = 56; // hold to read
const SCRUB = 104; // slow sweep: 56→104 (back to 40% over 48f) — about 1/5 the speed of the fling

const posAt = (f: number): number => {
  if (f < FLING)
    return interpolate(f, [T0, FLING], [8, 76], { easing: Easing.out(Easing.cubic), ...CL });
  if (f < BOUNCE)
    return interpolate(f, [FLING, BOUNCE], [76, 70], { easing: Easing.inOut(Easing.cubic), ...CL });
  if (f < HOLD) return 70;
  return interpolate(f, [HOLD, SCRUB], [70, 40], { easing: Easing.inOut(Easing.quad), ...CL });
};

export const BeforeAfterSliderScrub: React.FC = () => {
  const frame = useCurrentFrame();
  const p = posAt(frame); // divider position %
  const x = (p / 100) * 1920;

  // handle squish: driven by the velocity difference (slight stretch during the fling, back to 1 at rest)
  const v = Math.abs(posAt(frame) - posAt(frame - 1)); // %/frame
  const squish = 1 + Math.min(v / 8, 1) * 0.18;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: G.bg }}>
      {/* before: low-contrast grayed version simulating "before" */}
      <div style={{ position: 'absolute', inset: 0, filter: 'contrast(0.55) brightness(1.06) grayscale(1)' }}>
        <FakeDashboard variant="A" />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(160,160,158,0.35)' }} />

      {/* after: normal crisp version, revealed to the left of the divider */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${1920 - x}px 0 0)` }}>
        <FakeDashboard variant="A" />
      </div>

      {/* divider + round handle */}
      <div
        style={{
          position: 'absolute',
          left: x - 3,
          top: 0,
          width: 6,
          height: 1080,
          background: '#ffffff',
          boxShadow: '0 0 14px rgba(0,0,0,0.35)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 44,
          top: 540 - 44,
          width: 88,
          height: 88,
          borderRadius: 44,
          background: '#ffffff',
          border: `3px solid ${G.border}`,
          boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
          transform: `scaleX(${squish})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* left/right arrow indicators (grayscale triangles) */}
        <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: `14px solid ${G.mid}` }} />
        <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: `14px solid ${G.mid}` }} />
      </div>

      {/* corner badges: BEFORE / AFTER gray block labels */}
      <div style={{ position: 'absolute', left: 260, top: 100, padding: '10px 22px', borderRadius: 10, background: 'rgba(47,47,47,0.85)', display: 'flex', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ width: 16, height: 20, borderRadius: 4, background: '#e6e6e4' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', right: 60, top: 100, padding: '10px 22px', borderRadius: 10, background: 'rgba(240,240,238,0.9)', border: `2px solid ${G.border}`, display: 'flex', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ width: 16, height: 20, borderRadius: 4, background: G.ink }} />
        ))}
      </div>
    </div>
  );
};
