// card-footage-cadence | card-and-footage interleave rhythm
// UI shots ↔ black-background title cards trade like a conversation: 0–14f UI A slow push-in → hard cut to 8f title card SHIP →
// hard cut to 12f UI B 1.6x cropped slow pan → 8f title card FASTER → 10f UI A 2x crop →
// 10f title card TODAY (underlined) → 62f hard cut to a closing full-bleed still.
// All UI segments carry subtle motion (push/pan); title-card segments are still except for a settle-down micro-scale (1.05→1, out-cubic),
// and the motion↔still contrast is the whole technique. All switches are zero-transition (conditional mounting, no crossfade).
// Ending 62–105f light push-in finishes, 105–150f true stillness 45f ≥ 40f. Frame-deterministic, no randomness.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Black-background white-text title card: settle-down micro-scale 1.05→1 (out-cubic, done in the first 5f of the segment), otherwise fully still
const TitleCard: React.FC<{ text: string; local: number; underline?: boolean }> = ({
  text,
  local,
  underline = false,
}) => {
  const scale = interpolate(local, [0, 5], [1.05, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{ background: '#0d0d0d', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
        }}
      >
        <div
          style={{
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 800,
            fontSize: 170,
            color: '#ffffff',
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          {text}
        </div>
        {underline && (
          <div style={{ width: 560, height: 14, background: '#ffffff', borderRadius: 7 }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

// UI shot: wraps a transform for slow push/pan, hard cuts guaranteed by conditional mounting at the outer layer
const UiShot: React.FC<{
  variant: 'A' | 'B';
  transform: string;
  origin?: string;
}> = ({ variant, transform, origin = '50% 50%' }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: '#ececea' }}>
    <div style={{ width: 1920, height: 1080, transform, transformOrigin: origin }}>
      <FakeDashboard variant={variant} />
    </div>
  </AbsoluteFill>
);

export const CardFootageCadence: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- segments: cut points 14 / 22 / 34 / 42 / 52 / 62, total 150 ----

  // Segment 1 0–14f: UI A full-bleed slow push-in 1.0→1.08
  if (frame < 14) {
    const s = interpolate(frame, [0, 14], [1, 1.08], CLAMP);
    return <UiShot variant="A" transform={`scale(${s})`} />;
  }

  // Segment 2 14–22f: title card SHIP
  if (frame < 22) {
    return <TitleCard text="SHIP" local={frame - 14} />;
  }

  // Segment 3 22–34f: UI B 1.6x crop + horizontal slow pan (120px content offset, ~192px on screen).
  // origin biased left so the list-row icons enter frame and it still reads as a UI (post-QA tweak: 50%→35%)
  if (frame < 34) {
    const tx = interpolate(frame - 22, [0, 12], [60, -60], CLAMP);
    return (
      <UiShot variant="B" transform={`scale(1.6) translateX(${tx}px)`} origin="35% 50%" />
    );
  }

  // Segment 4 34–42f: title card FASTER
  if (frame < 42) {
    return <TitleCard text="FASTER" local={frame - 34} />;
  }

  // Segment 5 42–52f: UI A another 2x crop (top-left card area) + continued slow push-in 2.0→2.14
  if (frame < 52) {
    const s = interpolate(frame - 42, [0, 10], [2, 2.14], CLAMP);
    return <UiShot variant="A" transform={`scale(${s})`} origin="32% 30%" />;
  }

  // Segment 6 52–62f: title card TODAY + underline
  if (frame < 62) {
    return <TitleCard text="TODAY" local={frame - 52} underline />;
  }

  // Segment 7 62–150f: closing full-bleed UI still. 62–105f finishes an extremely slow push-in (out-cubic),
  // after 105f the transform value is constant at 1.02, 105–150f true stillness for 45f.
  const s = interpolate(frame, [62, 105], [1, 1.02], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  return <UiShot variant="B" transform={`scale(${s})`} />;
};
