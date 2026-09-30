// flying-words — Flying Words word depth tunnel (motion-lab final ported to native Remotion)
// Placeholder words spawn far in the distance and fly toward the camera along the z-axis, sweeping past,
// with opacity following the [0,1,0.5,0.2,0] life-cycle curve to form a 3D word tunnel; the camera stays still while elements move,
// spawning is fully deterministic, and the loop is seamless. The word list can be swapped wholesale for project keywords.
// Design coordinates 480×270 (DesignStage scaled proportionally).
import React from 'react';
import { DesignStage, lerp, rand, useT } from '../../_fixtures/Motion';

export const FLYING_WORDS_DURATION = 180; // 6000ms @30fps

// Placeholder word list: swap in your project's keywords; a similar count/length won't disturb the rhythm
const WORDS = ['Motion', 'Layout', 'Camera', 'Stagger', 'Easing', 'Beat', 'Keyframe', 'Blur',
  'Scale', 'Transform', 'Rotate', 'Parallax', 'Opacity', 'Depth', 'Tween', 'Loop',
  'Spring', 'Delay', 'Fade', 'Composite', 'Grid', 'Pivot'];
const N = WORDS.length;

// Each word's static properties are fully determined by rand(seed) (seeds match the original, reproducible across renders)
const ITEMS = WORDS.map((w, i) => {
  const hue = 200 + rand(i * 11) * 130;
  // Angles spread by the golden angle + radius kept away from center, so near words don't clump into a blurry blob
  const a = i * 2.39996 + rand(i * 7 + 1) * 0.8;
  const r = 82 + rand(i * 13 + 2) * 165;
  return {
    text: w,
    fontSize: 20 + rand(i + 3) * 16,
    color: `hsl(${hue},${58 + rand(i + 5) * 30}%,${70 + rand(i + 9) * 18}%)`,
    textShadow: `0 0 16px hsla(${hue},90%,66%,.45)`,
    x: Math.cos(a) * r,
    y: Math.sin(a) * r * 0.6,
    rz: (rand(i + 21) - 0.5) * 14,
    ph: i / N,
  };
});

// Life-cycle opacity curve: [0,1,0.5,0.2,0] piecewise linear
const OP = [0, 1, 0.5, 0.2, 0];
const OT = [0, 0.25, 0.6, 0.85, 1];
const curve = (u: number) => {
  for (let k = 0; k < 4; k++) {
    if (u <= OT[k + 1]) {
      const p = (u - OT[k]) / (OT[k + 1] - OT[k]);
      return OP[k] + (OP[k + 1] - OP[k]) * p;
    }
  }
  return 0;
};

const CYCLES = 2; // whole loops → the t=0 and t=1 frames match

export const FlyingWords: React.FC = () => {
  const t = useT();
  return (
    // Gradient background is fully percentage-based → set it on DesignStage's outer bg to rasterize natively at the composite resolution
    // (matches the original render's DPR=4 smoothness; drawing a large gradient in a scaled container creates 4px-wide color bands)
    <DesignStage bg="radial-gradient(60% 60% at 50% 50%,#131a2c,#05060b 75%)">
      {/* Scene: perspective camera (perspective scales proportionally with DesignStage) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 1100,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
          }}
        >
          {ITEMS.map((it, i) => {
            const u = (t * CYCLES + it.ph) % 1;
            const z = lerp(u, -1750, 800); // spawned far away → sweeps past the camera
            const drift = 0.5 + u * 1.35; // tucked in far away, spreads outward as it approaches
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transformOrigin: '50% 50%',
                  whiteSpace: 'nowrap',
                  fontWeight: 800,
                  fontSize: it.fontSize,
                  lineHeight: 1,
                  fontFamily: "-apple-system,'Segoe UI',sans-serif",
                  letterSpacing: '0.5px',
                  color: it.color,
                  textShadow: it.textShadow,
                  margin: '-14px 0 0 -60px',
                  transform: `translate3d(${it.x * drift}px,${it.y * drift}px,${z}px) rotateZ(${it.rz}deg)`,
                  opacity: curve(u),
                  filter: u > 0.86 ? `blur(${(u - 0.86) * 26}px)` : 'none',
                }}
              >
                {it.text}
              </div>
            );
          })}
        </div>
        {/* Center glow to reinforce the "tunnel end" (DOM order after the words → stacked on top) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 220,
            height: 220,
            margin: -110,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(120,150,255,.22),transparent 68%)',
            filter: 'blur(6px)',
            opacity: 0.75 + Math.sin(t * Math.PI * 4) * 0.12,
          }}
        />
      </div>
    </DesignStage>
  );
};
