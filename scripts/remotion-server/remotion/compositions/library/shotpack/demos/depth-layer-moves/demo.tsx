// dolly-zoom sliding zoom (round F) — the hero card (card4-hires) stays locked at a constant size on screen
// while the background real card cluster + full page swell inward in reverse (scale + deepening blur),
// "the world presses in" while the subject stays perfectly still. Fake dolly-zoom: no 3D needed, layers compensate in reverse.
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import layout from '../../_textures/live-layout.json';

export const DOLLYZOOM_DUR = 135;

const BG_CARDS = layout.projects.cards.filter((_, i) => i !== 3);

export const DollyZoomReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [15, 110], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.3, 1),
  });
  const bgScale = 1 + t * 1.25;
  const bgBlur = t * 3.5;
  return (
    <AbsoluteFill style={{ backgroundColor: '#efece6', overflow: 'hidden' }}>
      {/* Background: full page + card cluster swelling in from screen center */}
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: `scale(${bgScale})`, transformOrigin: '960px 540px',
          filter: `blur(${bgBlur}px) saturate(0.9)`,
        }}
      >
        <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', left: 0, top: -400, width: 1920, opacity: 0.55 }} />
        {BG_CARDS.slice(0, 8).map((c, k) => (
          <Img
            key={c.file + k}
            src={staticFile(`textures/live/${c.file}`)}
            style={{
              position: 'absolute',
              left: [180, 1280, 240, 1220, 700, 760, 60, 1500][k],
              top: [140, 120, 700, 720, 60, 840, 420, 430][k],
              width: 320, borderRadius: 12, opacity: 0.9,
              boxShadow: '0 6px 20px rgba(31,28,23,0.12)',
            }}
          />
        ))}
      </div>
      {/* Subject: hi-res card pinned on screen at constant visual size, shadow deepens to emphasize "the world moves, I don't" */}
      <Img
        src={staticFile('textures/live/card4-hires.png')}
        style={{
          position: 'absolute', left: 960 - 260, top: 540 - 228, width: 520,
          borderRadius: 14,
          boxShadow: `0 ${12 + t * 16}px ${40 + t * 28}px rgba(31,28,23,${0.16 + t * 0.10})`,
        }}
      />
    </AbsoluteFill>
  );
};
