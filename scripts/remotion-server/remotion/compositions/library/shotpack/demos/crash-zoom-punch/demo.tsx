// crash-impact slamming stop — the same fast push as crash-zoom, but instead of bouncing back on arrival
// the frame slams to a stop: high-frequency shake + exponential decay over 6f, then true stillness. The comparison: weight vs. springiness.
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import layout from '../../_textures/live-layout.json';

export const CRASHIMPACT_DUR = 120;

const TARGET = { cx: 960, cy: 772 };
const VIEW_Y = 180;
const HIT = 46;

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [40, HIT], [1, 2.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.55, 0, 0.7, 1),
  });
  const cx = interpolate(frame, [40, HIT], [960, TARGET.cx], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });
  const cy = interpolate(frame, [40, HIT], [VIEW_Y + 540, TARGET.cy], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });
  // Slamming stop shake: amp 14px, exponential decay settles in ~6f (noticeable amplitude, see round #2 perceptible tier)
  const since = frame - HIT;
  const env = since >= 0 ? 14 * Math.exp(-since / 1.8) : 0;
  const sx = env * Math.sin(since * 3.3);
  const sy = env * 0.7 * Math.sin(since * 4.1 + 0.9);
  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', width: 1920, height: layout.projects.pageH,
          transform: `translate(${960 - cx * zoom + sx}px, ${540 - cy * zoom + sy}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', width: 1920 }} />
        <Img
          src={staticFile('textures/live/card4-hires.png')}
          style={{
            position: 'absolute',
            left: layout.projects.cards[3].x, top: layout.projects.cards[3].y,
            width: layout.projects.cards[3].w, height: layout.projects.cards[3].h,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const CrashImpactReal: React.FC = () => {
  const frame = useCurrentFrame();
  // Blur only wraps the fast push segment; the slamming stop stays sharp while shaking
  return frame >= 38 && frame <= HIT ? (
    <CameraMotionBlur shutterAngle={200} samples={20}>
      <Scene />
    </CameraMotionBlur>
  ) : (
    <Scene />
  );
};
