// Text-as-mask (text-as-mask) — kinetic typography
// Ultra-bold "SCALE" on a dark background; a CSS alpha mask clips FakeDashboard inside the glyphs:
// 0–20f hold, reading the scene; 20–100f dashboard translates evenly inside the letters +110→-110 (scale 1.15);
// 100–130f single bezier: the mask layer scales 1→26 and overflows (the content layer counters with 1/S so it doesn't distort),
// while an unmasked full-screen layer fades in to take over, dashboard settles 1.15→1.0; 130–150f full-screen stillness to close.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';

const MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><text x="960" y="666" font-family="Helvetica, Arial, sans-serif" font-size="360" font-weight="900" letter-spacing="-8" text-anchor="middle" fill="white">SCALE</text></svg>`;
const MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(MASK_SVG)}")`;
// mask zoom origin: on the vertical stroke of the letter L (~61.5%), so the origin lands inside solid ink when zooming
const ORIGIN = '61.5% 50%';

export const TextAsMask: React.FC = () => {
  const f = useCurrentFrame();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  // closing exit progress: 100–130f single bezier
  const endT = interpolate(f, [100, 130], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // dashboard content motion: 20–100f even drift, 100–130f settles back to full screen
  const driftX = interpolate(f, [20, 100], [110, -110], clamp);
  const dx = f < 100 ? driftX : interpolate(endT, [0, 1], [-110, 0]);
  const dashS = interpolate(endT, [0, 1], [1.15, 1]);

  // mask layer zooms (content layer counters it, so the dashboard doesn't distort)
  const maskS = interpolate(endT, [0, 1], [1, 26]);
  // unmasked full-screen layer fades in, ensuring a clean takeover
  const cover = interpolate(endT, [0.25, 0.9], [0, 1], clamp);
  // bottom caption: fades out during the exit
  const caption = interpolate(f, [100, 114], [1, 0], clamp);

  const dashMotion: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translateX(${dx}px) scale(${dashS})`,
    transformOrigin: '50% 50%',
  };

  return (
    <div style={{ width: 1920, height: 1080, background: G.ink, position: 'relative', overflow: 'hidden' }}>
      {/* mask layer: wrapper applies mask + zoom; inner counters with 1/S so content stays undistorted */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${maskS})`,
          transformOrigin: ORIGIN,
          WebkitMaskImage: MASK_URL,
          maskImage: MASK_URL,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: '1920px 1080px',
          maskSize: '1920px 1080px',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 / maskS})`, transformOrigin: ORIGIN }}>
          <div style={dashMotion}>
            <FakeDashboard variant="A" />
          </div>
        </div>
      </div>

      {/* takeover layer: full-screen dashboard with the same motion transform, fading in to 1 during the exit */}
      <div style={{ position: 'absolute', inset: 0, opacity: cover }}>
        <div style={dashMotion}>
          <FakeDashboard variant="A" />
        </div>
      </div>

      {/* bottom caption */}
      <div
        style={{
          position: 'absolute',
          bottom: 90,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 10,
          color: G.mid,
          opacity: caption,
        }}
      >
        TEXT AS MASK
      </div>
    </div>
  );
};
