// Attention bounce (attention-bounce) — macOS Dock vocabulary: the icon hops in place to beg for attention
// A half-screen app icon (rounded square + bell symbol) bounces 4 times in a row on a ground line, each higher than the last
// (first hop 0.5× icon height → final hop 1.2×); on every landing frame it squashes (width 1.2x, height 0.8x)
// + 2–3 dust points at the landing spot; during the highest hop the camera pushes gently toward the icon by 8% ("being drawn in");
// after settling, a feature panel card pops open to the right of the icon to close out.
// Beat: 0–12 rest → 12 start hopping (4 hops escalating, 16/18/20/24f each) → ~90 settled →
// 92–104 panel card pops out → true stillness for 40f after 110. Frame-deterministic; dust uses sin hashing.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';

const AMBER = '#b45309';
const ICON = 400; // icon side length (half-screen scale)
const GROUND = 940; // ground line y (final 1.2x apex + 8% push-in still hugs the top edge without leaving frame)
const CX = 760; // icon center x (right side reserved for the panel)

// 4 hops: start frame, duration, peak height (relative to icon height)
const JUMPS = [
  { start: 12, dur: 16, peak: 0.5 * ICON },
  { start: 30, dur: 18, peak: 0.75 * ICON },
  { start: 50, dur: 20, peak: 0.95 * ICON },
  { start: 72, dur: 24, peak: 1.2 * ICON },
];

export const AttentionBounce: React.FC = () => {
  const f = useCurrentFrame();

  // Bounce height + landing squash
  let y = 0; // height off the ground
  let squash = 0; // 0–1 landing squash strength
  let stretch = 0; // in-air stretch strength (sense of speed)
  JUMPS.forEach((j) => {
    const t = (f - j.start) / j.dur;
    if (t > 0 && t < 1) {
      y = j.peak * 4 * t * (1 - t); // parabola
      stretch = Math.abs(1 - 2 * t) * 0.14; // stretches when takeoff/fall speed is high
    }
    // Squash-bounce within 5f after the landing frame
    const land = j.start + j.dur;
    if (f >= land && f < land + 6) {
      squash = Math.max(squash, 1 - (f - land) / 6);
    }
  });
  // Anticipatory compression before takeoff (crouch for 3f before the first hop)
  if (f >= 9 && f < 12) squash = Math.max(squash, (f - 9) / 3 * 0.7);

  const sx = 1 + squash * 0.2 - stretch * 0.5;
  const sy = 1 - squash * 0.2 + stretch;

  // Camera push-in: whole-frame scale 1→1.08 during the 4th (highest) hop, held after settling
  const zoomT = interpolate(f, [72, 88], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const zoom = 1 + 0.08 * zoomT;

  // Dust points: 3 spawned at each landing frame, scattering to both sides and fading out (12f lifetime)
  const dusts: Array<{ x: number; y: number; r: number; op: number }> = [];
  JUMPS.forEach((j, ji) => {
    const land = j.start + j.dur;
    const life = (f - land) / 12;
    if (life <= 0 || life >= 1) return;
    for (let k = 0; k < 3; k++) {
      const seed = ji * 3 + k;
      const dir = k === 1 ? 0 : k === 0 ? -1 : 1;
      const spread = (60 + 40 * Math.abs(Math.sin(seed * 5.7))) * (ji + 2) * 0.45;
      const e = Easing.out(Easing.cubic)(life);
      dusts.push({
        x: CX + dir * (ICON * 0.42 + spread * e) + (dir === 0 ? 30 * Math.sin(seed * 3.1) * e : 0),
        y: GROUND - 14 - 46 * e * (0.6 + 0.5 * Math.abs(Math.sin(seed * 2.3))),
        r: 12 + 6 * Math.abs(Math.sin(seed * 4.9)) - 8 * life,
        op: (1 - life) * 0.8,
      });
    }
  });

  // Feature panel card: pops out from the right of the icon after settling (f=98)
  const panelT = interpolate(f, [98, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });

  const iconTop = GROUND - ICON - y;

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden' }}>
      {/* Camera layer: gentle push toward the icon */}
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${zoom})`,
          transformOrigin: `${CX}px ${GROUND - ICON / 2}px`,
          position: 'relative',
        }}
      >
        {/* Ground line */}
        <div style={{ position: 'absolute', left: 120, top: GROUND, width: 1680, height: 8, background: G.bar, borderRadius: 4 }} />

        {/* Landing dust points */}
        {dusts.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: d.x - d.r,
              top: d.y - d.r,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: d.r,
              background: G.mid,
              opacity: d.op,
            }}
          />
        ))}

        {/* Shadow: shrinks and fades with height */}
        <div
          style={{
            position: 'absolute',
            left: CX - ICON * 0.42 * (1 - y / (ICON * 2.4)),
            top: GROUND + 16,
            width: ICON * 0.84 * (1 - y / (ICON * 2.4)),
            height: 30,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.18)',
            filter: 'blur(6px)',
            opacity: 1 - (y / (ICON * 1.6)) * 0.5,
          }}
        />

        {/* App icon: rounded square + bell symbol (hand-drawn SVG, half-screen close-up) */}
        <svg
          width={ICON}
          height={ICON}
          viewBox="0 0 420 420"
          style={{
            position: 'absolute',
            left: CX - ICON / 2,
            top: iconTop,
            transform: `scale(${sx}, ${sy})`,
            transformOrigin: '50% 100%',
          }}
        >
          <rect x={14} y={14} width={392} height={392} rx={88} fill={G.card} stroke={G.ink} strokeWidth={18} />
          {/* Symbol: clean bell shape */}
          <path
            d="M 210 110 C 160 110 140 155 138 200 C 136 245 118 272 100 290 L 320 290 C 302 272 284 245 282 200 C 280 155 260 110 210 110 Z"
            fill="none"
            stroke={G.ink}
            strokeWidth={22}
            strokeLinejoin="round"
          />
          <circle cx={210} cy={322} r={22} fill={AMBER} />
        </svg>

        {/* Feature panel card: pops out after settling */}
        {panelT > 0 && (
          <div
            style={{
              position: 'absolute',
              left: CX + ICON / 2 + 60,
              top: GROUND - ICON - 40,
              transform: `scale(${panelT})`,
              transformOrigin: 'left bottom',
              opacity: Math.min(1, panelT * 1.5),
            }}
          >
            <Card w={520} h={330} seed={4} />
            <div
              style={{
                position: 'absolute',
                top: -28,
                left: 24,
                padding: '10px 24px',
                borderRadius: 24,
                background: AMBER,
                color: '#fff',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 800,
                fontSize: 26,
              }}
            >
              New
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
