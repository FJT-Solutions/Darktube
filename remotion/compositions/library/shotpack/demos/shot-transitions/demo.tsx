// mask-wipe element-mask wipe (round D) — the real project card (card4-hires)
// scales up into a full-screen window and the projects panorama grows out of it to
// take over: "click a card to enter its world".
// Beat: 0–40 panorama hold → 40–85 card grows into a window (new scene inside compensates inversely) → 85–120 hold.
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import layout from '../../_textures/live-layout.json';

export const MASKWIPE_DUR = 120;

const C4 = layout.projects.cards[3]; // page space x=781,y=616,w=357,h=312
const VIEW_Y = 180; // panorama viewport: starts at page y=180

export const MaskWipeReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [40, 85], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.5, 0, 0.2, 1),
  });
  // Card's initial geometry in screen space (under the panorama viewport)
  const g0 = { x: C4.x, y: C4.y - VIEW_Y, w: C4.w, h: C4.h, r: 12 };
  const x = interpolate(t, [0, 1], [g0.x, 0]);
  const y = interpolate(t, [0, 1], [g0.y, 0]);
  const w = interpolate(t, [0, 1], [g0.w, 1920]);
  const h = interpolate(t, [0, 1], [g0.h, 1080]);
  const r = interpolate(t, [0, 1], [g0.r, 0]);
  // New scene inside the window (detail view simulated with the papers page top): grows inversely from 0.42 scale to 1
  const innerScale = interpolate(t, [0, 1], [0.42, 1]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      {/* Background: projects panorama */}
      <Img
        src={staticFile('textures/live/projects-full.png')}
        style={{ position: 'absolute', left: 0, top: -VIEW_Y, width: 1920 }}
      />
      {/* The card is the window */}
      <div
        style={{
          position: 'absolute', left: x, top: y, width: w, height: h,
          borderRadius: r, overflow: 'hidden',
          boxShadow: t > 0 && t < 1 ? '0 16px 56px rgba(31,28,23,0.25)' : 'none',
        }}
      >
        {/* New scene inside the window: deep into the projects page (detail semantics), inverse compensation fills the frame */}
        <div
          style={{
            position: 'absolute', width: 1920, height: 1080,
            left: '50%', top: '50%',
            transform: `translate(-50%, -50%) scale(${innerScale})`,
            overflow: 'hidden', background: '#f9f6f1',
          }}
        >
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: -846, width: 1920 }}
          />
        </div>
        {/* Card face: fades out as it grows, revealing the scene inside the window */}
        <Img
          src={staticFile('textures/live/card4-hires.png')}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: Math.max(0, 1 - t * 2.2),
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
