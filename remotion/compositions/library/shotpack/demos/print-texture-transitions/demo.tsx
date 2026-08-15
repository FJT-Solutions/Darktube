// Ink-bleed reveal — ink-wash transition (track-matte method).
// Old scene: G.bg paper base + centered TitleBlock "BEFORE"; the new scene
// FakeDashboard(A) sits in an SVG <foreignObject> under a <mask>: a white circle offset
// to the upper-left (800,420) acts as the track matte. The circle itself carries
// feTurbulence (baseFrequency 0.02, octaves 3, seed 7 fixed) + feDisplacementMap
// (scale 60→160, growing per frame) to create a wispy bleeding edge — the filter only
// affects the mask shape, so the new scene stays sharp. Frames 0–20 hold the old scene;
// frames 20–98 the radius grows 0→1450 (Easing.out(quad)) with a ±8% low-frequency sine
// wobble on top (frames 78–98 the wobble decays to 0 as the ink floods the full screen);
// frames 100–130 the mask is removed and the new scene renders directly, 30f of true stillness.
import React, { useId } from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard, TitleBlock } from '../../_fixtures/Fixtures';

export const InkBleedReveal: React.FC = () => {
  const frame = useCurrentFrame();
  // Filter/mask IDs generated per instance so multiple instances don't collide (useId's «:» is invalid in url(), needs sanitizing)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bleedId = `inkBleed-${uid}`;
  const maskId = `inkMask-${uid}`;

  // Ink-drop landing point: offset to the upper-left of center
  const cx = 800;
  const cy = 420;

  // Base radius: frames 20–98, 0 → 1450px (farthest corner ~1300px + 150px bleed displacement margin)
  const baseR = interpolate(frame, [20, 98], [0, 1450], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ±8% low-frequency sine wobble = uneven, inky spread; frames 78–98 the amplitude decays
  // to 0, so it can reach true stillness once fully bled
  const wobbleEnv = interpolate(frame, [78, 98], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const r = Math.max(0, baseR * (1 + 0.08 * Math.sin(frame * 0.32) * wobbleEnv));

  // Bleed spread: displacement scale 60 → 160 (more bleed at the edge, longer fingertip splits)
  const dispScale = interpolate(frame, [20, 98], [60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // From frame 100 the mask is fully white: drop the SVG and render the new scene directly, ensuring pixel-level true stillness at the end
  const settled = frame >= 100;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {/* Old scene: paper base + BEFORE title */}
      <div style={{ position: 'absolute', inset: 0, background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TitleBlock text="BEFORE" size={120} />
      </div>

      {settled ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <FakeDashboard variant="A" />
        </div>
      ) : (
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ position: 'absolute', inset: 0, display: 'block' }}
        >
          <defs>
            {/* The filter only sits on the mask circle — it distorts the matte edge, not the page content */}
            <filter id={bleedId} x="-40%" y="-40%" width="180%" height="180%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={dispScale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
              <rect x="0" y="0" width="1920" height="1080" fill="black" />
              {r > 0.5 && <circle cx={cx} cy={cy} r={r} fill="white" filter={`url(#${bleedId})`} />}
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <foreignObject x="0" y="0" width="1920" height="1080">
              <FakeDashboard variant="A" />
            </foreignObject>
          </g>
        </svg>
      )}
    </div>
  );
};
