// card-flock-tumble v5 — round 14 rework per user feedback (follows v4):
// User feedback (verbatim): "First, don't add blur effects to the three pages;
// then one expanding ripple ring is enough, not several; but check the original
// footage's look from screenshots and match it"
// Implemented: ① all three cards stay sharp throughout — removed the motion blur
// in the flight section and the blur in the converge section;
// ② dropped the multiple concentric ripples, keeping a single ring; ③ rebuilt the
// ring against the original's dense frames (12fps):
//    the original is a single turbulent smoke ring — broken, wispy edges, alternating
//    light/dark patches on the ring body, pink-purple dominant with a milky-peach top,
//    decelerating outward expansion that keeps growing slowly, extremely slow decay
//    (still visible at the end, dispersing and fading rather than extinguishing),
//    no water-surface highlight at center. Simulated with feTurbulence + displacement map.
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FONT = '"Avenir Next", Futura, "Helvetica Neue", sans-serif';

// ---------- Timeline (30fps / 130f) ----------
const WALL_UP = [6, 22] as const; // wall lights up
const FLIGHT = [10, 54] as const; // edge-on → tumbling flight → standing: one continuous spline
const CARD_OUT = [62, 72] as const; // converge (fast! 10f pulling in toward the center)
const RING_T0 = 70; // ripple ring expands from the converge point
const TEXT_T0 = 84; // STRONGER appears

// ---------- Neon-outlined text wall (S2: yellow left → magenta → purple → blue right) ----------
const ROW_GRADS: [string, string][] = [
  ['#ffe14d', '#5ad0ff'],
  ['#ff5ad0', '#7d8bff'],
  ['#ffb84d', '#b46bff'],
];
const NeonWall: React.FC<{ frame: number }> = ({ frame }) => {
  const up = interpolate(frame, [WALL_UP[0], WALL_UP[1]], [0.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const out = interpolate(frame, [CARD_OUT[0], CARD_OUT[1] + 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blurOut = interpolate(frame, [CARD_OUT[0], CARD_OUT[1] + 4], [0, 26], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (out <= 0.01) return null;
  const drift = frame * 2.0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity: up * out, filter: `blur(${blurOut}px)` }}>
      {Array.from({ length: 3 }).map((_, row) => {
        const [cL, cR] = ROW_GRADS[row];
        return (
          <div
            key={row}
            style={{
              position: 'absolute',
              top: -140 + row * 380,
              left: 0,
              whiteSpace: 'nowrap',
              fontFamily: FONT,
              fontWeight: 800,
              fontStyle: 'italic',
              fontSize: 330,
              letterSpacing: 6,
              transform: `translateX(${(row % 2 === 0 ? -1 : 1) * drift - 600}px)`,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                style={{
                  marginRight: 70,
                  color: 'transparent',
                  WebkitTextStroke: `4px ${i % 2 === 0 ? cL : cR}`,
                  filter: `drop-shadow(0 0 18px ${i % 2 === 0 ? cL : cR})`,
                  opacity: 0.6,
                }}
              >
                FASTER
              </span>
            ))}
          </div>
        );
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 85%)' }} />
    </AbsoluteFill>
  );
};

// ---------- ClickUp-style UI card ----------
const UiCard: React.FC<{ seed: number; title: string }> = ({ seed, title }) => (
  <div
    style={{
      width: 560,
      height: 400,
      background: '#fbfbfc',
      borderRadius: 14,
      padding: 0,
      boxSizing: 'border-box',
      boxShadow: '0 0 60px rgba(190,140,255,0.3), 0 22px 60px rgba(0,0,0,0.55)',
      display: 'flex',
      overflow: 'hidden',
    }}
  >
    <div style={{ width: 128, background: '#f3f3f6', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(135deg,#7b68ee,#ff5ad0)' }} />
        <div style={{ height: 8, width: 52, background: '#c9c9d2', borderRadius: 4 }} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ height: 7, width: `${52 + ((i * 31 + seed * 17) % 42)}%`, background: '#d9d9df', borderRadius: 4 }} />
      ))}
    </div>
    <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: '#3a3a44' }}>{title}</div>
      <div style={{ height: 10, width: '58%', background: '#ececf1', borderRadius: 5 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: ['#7b68ee', '#ff5ad0', '#5ad0ff'][(i + seed) % 3], opacity: 0.7 }} />
          <div style={{ height: 8, width: `${78 - ((i * 23 + seed * 29) % 40)}%`, background: '#e8e8ee', borderRadius: 4 }} />
        </div>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <div style={{ width: 74, height: 22, background: '#7b68ee', opacity: 0.75, borderRadius: 6 }} />
        <div style={{ width: 46, height: 22, background: '#e4e4ea', borderRadius: 6 }} />
      </div>
    </div>
  </div>
);

// ---------- Single turbulent smoke ring (rebuilt against the original's dense frames) ----------
// Original look: a single ring; broken, wispy edges (turbulent displacement) and
// alternating light/dark patches on the ring body; pink-purple dominant with a
// milky-peach top; appears then decelerates as it expands outward and keeps growing
// slowly throughout; decays extremely slowly — still clearly visible at the end
// (dispersing and fading rather than extinguishing); no water-surface highlight at
// center, pure-black background.
const SmokeRing: React.FC<{ frame: number }> = ({ frame }) => {
  // Filter/gradient IDs generated per instance so multiple instances don't collide (useId's «:» is invalid in url(), needs sanitizing)
  // hooks must be called before the conditional return
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = frame - RING_T0;
  if (t < 0) return null;
  // Radius: appears small → decelerating outward expansion, then keeps slowly growing (never stops in the original)
  const grow = Easing.out(Easing.cubic)(Math.min(1, t / 52));
  const R = 46 + 330 * grow + Math.max(0, t - 52) * 1.6;
  // Extremely slow decay: appears quickly then lingers, only slightly fading and dispersing
  const op = interpolate(t, [0, 5, 30, 60], [0, 1, 0.92, 0.72], { extrapolateRight: 'clamp' });
  // Ring body width: grows with the radius, slightly thinner proportionally (~R/3 early on)
  const w = R * interpolate(t, [0, 52], [0.36, 0.27], { extrapolateRight: 'clamp' });
  // Turbulence displacement scales up as the ring grows (wisp size proportional to the ring)
  const disp = 60 + grow * 90;
  const rot = t * 0.35; // slow texture flow
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          {/* Broken, wispy edges: fractal-noise displacement on the main body (octaves=4 → finer wisps) */}
          <filter id={`smokeA-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.013 0.016" numOctaves={4} seed={11} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={disp} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Second noise set (different seed): bright-patch offset layer */}
          <filter id={`smokeB-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.021 0.018" numOctaves={4} seed={37} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={disp * 0.85} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Third noise set: dark-gap layer (punches out the alternating dark patches on the ring body) */}
          <filter id={`smokeC-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.019 0.023" numOctaves={3} seed={73} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={disp * 1.1} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Ring body gradient: milky-peach top, pink-purple bottom (desaturated, matching the original's dusty-pink tone) */}
          <linearGradient id={`ringGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsla(28 45% 78% / 0.85)" />
            <stop offset="35%" stopColor="hsla(315 45% 74% / 0.85)" />
            <stop offset="100%" stopColor="hsla(276 42% 66% / 0.85)" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${rot} 960 540)`} opacity={op}>
          {/* Outer diffuse soft glow */}
          <g style={{ filter: `url(#smokeA-${uid})` }}>
            <circle cx={960} cy={540} r={R} fill="none" stroke="hsla(295 40% 68% / 0.26)" strokeWidth={w * 1.9} style={{ filter: 'blur(22px)' }} />
          </g>
          {/* Ring body main (turbulent displacement → broken wispy edges; blur kept small to preserve the turbulence texture) */}
          <g style={{ filter: `url(#smokeA-${uid})` }}>
            <circle cx={960} cy={540} r={R} fill="none" stroke={`url(#ringGrad-${uid})`} strokeWidth={w} style={{ filter: 'blur(9px)' }} opacity={0.85} />
          </g>
          {/* Bright-patch layer: another noise set offset on top */}
          <g style={{ filter: `url(#smokeB-${uid})` }}>
            <circle cx={960} cy={540} r={R * 0.99} fill="none" stroke="hsla(310 60% 86% / 0.6)" strokeWidth={w * 0.45} style={{ filter: 'blur(6px)' }} />
          </g>
          {/* Dark-gap patches: third noise set pressing lightly on the ring body → alternating light/dark patches (subtle, not camouflage) */}
          <g style={{ filter: `url(#smokeC-${uid})` }}>
            <circle cx={960} cy={540} r={R * 1.005} fill="none" stroke="hsla(262 40% 10% / 0.32)" strokeWidth={w * 0.4} style={{ filter: 'blur(7px)' }} />
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------- Card poses: Catmull-Rom spline continuous interpolation (true 3D smooth rotation) ----------
type Pose = { x: number; y: number; rx: number; ry: number; rz: number; s: number };
const POSE_KEYS: (keyof Pose)[] = ['x', 'y', 'rx', 'ry', 'rz', 's'];

// Catmull-Rom (repeated endpoints) guarantees passing through all key poses with continuous derivatives → no per-segment jumps
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
};
const splinePose = (keys: Pose[], u: number): Pose => {
  // keys.length === 3: two spline segments, passing the middle keyframe at 0.55
  const seg = u < 0.55 ? 0 : 1;
  const lt = seg === 0 ? u / 0.55 : (u - 0.55) / 0.45;
  const out = {} as Pose;
  for (const k of POSE_KEYS) {
    const v0 = keys[Math.max(0, seg - 1)][k];
    const v1 = keys[seg][k];
    const v2 = keys[seg + 1][k];
    const v3 = keys[Math.min(2, seg + 2)][k];
    out[k] = catmull(v0, v1, v2, v3, lt);
  }
  return out;
};

// Three cards (v4 pushes further): spacing tightened again (±125/±85 range, the three
// overlap heavily into a stepped stack) + settle then grow bigger (s≈1.5-1.6, matching
// screenshot 3/4 where the card group fills the middle)
// k0 edge-on (thin near-90° edge) → k1 mid-flight tumble → k2 stepped settle
const CARDS: { title: string; k: [Pose, Pose, Pose]; conv: Pose }[] = [
  {
    title: 'Inbox',
    k: [
      { x: -8, y: -16, rx: 9, ry: 88, rz: 12, s: 1.05 },
      { x: -135, y: -92, rx: 16, ry: 44, rz: -8, s: 1.38 },
      { x: -108, y: -76, rx: 4, ry: 13, rz: -2, s: 1.62 },
    ],
    conv: { x: -20, y: -12, rx: 0, ry: 55, rz: 4, s: 0.12 },
  },
  {
    title: 'List view',
    k: [
      { x: 0, y: 0, rx: 8, ry: 89, rz: 12, s: 1.0 },
      { x: -16, y: -7, rx: 13, ry: 38, rz: -7, s: 1.42 },
      { x: -5, y: -2, rx: 3, ry: 11, rz: -2, s: 1.68 },
    ],
    conv: { x: 0, y: 0, rx: 0, ry: 60, rz: 4, s: 0.12 },
  },
  {
    title: 'Home',
    k: [
      { x: 8, y: 16, rx: 7, ry: 90, rz: 12, s: 0.95 },
      { x: 112, y: 78, rx: 11, ry: 34, rz: -6, s: 1.46 },
      { x: 90, y: 70, rx: 2, ry: 9, rz: -1, s: 1.74 },
    ],
    conv: { x: 15, y: 10, rx: 0, ry: 65, rz: 4, s: 0.12 },
  },
];
const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  for (const k of POSE_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
};

export const CardFlockTumble: React.FC = () => {
  const frame = useCurrentFrame();
  // Gradient ID generated per instance so multiple instances don't collide
  const gradId = `strokeGrad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // STRONGER giant wordmark
  const st = frame - TEXT_T0;
  const textScale = interpolate(st, [0, 34], [0.6, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const textOpacity = interpolate(st, [0, 12, 34], [0, 0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#060509' }}>
      <NeonWall frame={frame} />

      {/* Card group */}
      {frame < CARD_OUT[1] + 2 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1400 }}>
          {CARDS.map((c, i) => {
            let pose: Pose;
            let op = 1;
            // v6 (round 15): user feedback "don't stop the three pages before they
            // shrink, keep them rotating (just slower)" — after settling and before
            // converging, an idle slow rotation (continuous low-angular-velocity drift,
            // quadratic ramp-in to avoid a jerk at the spline junction); the converge
            // starts from the post-drift pose
            const idleAt = (f: number) => {
              const t = Math.min(f, CARD_OUT[0]) - FLIGHT[1] * 0.86;
              if (t <= 0) return { ry: 0, rx: 0, rz: 0 };
              const ramp = Math.min(1, t / 14) ** 2;
              return { ry: t * 0.34 * ramp, rx: t * -0.1 * ramp, rz: t * 0.05 * ramp };
            };
            const drift = idleAt(frame);
            if (frame < FLIGHT[0]) {
              pose = c.k[0];
            } else if (frame < CARD_OUT[0]) {
              // One spline throughout: edge-on → flight → settle, continuous derivatives,
              // silky 3D rotation
              // (User feedback ①: pages stay sharp throughout; the flight-section motion blur was removed)
              const raw = Math.min(1, (frame - FLIGHT[0]) / (FLIGHT[1] - FLIGHT[0]));
              const u = Easing.out(Easing.cubic)(raw);
              pose = splinePose(c.k, u);
              pose = { ...pose, ry: pose.ry + drift.ry, rx: pose.rx + drift.rx, rz: pose.rz + drift.rz };
            } else {
              // Converge: fast! 10 frames accelerating toward the center while shrinking
              // (converge-section blur removed too, sharp throughout); opacity stays at
              // full for the first 60% so the "sucked into center" motion reads clearly
              const r = Math.min(1, (frame - CARD_OUT[0]) / (CARD_OUT[1] - CARD_OUT[0]));
              const e = Easing.in(Easing.quad)(r);
              const from = { ...c.k[2], ry: c.k[2].ry + drift.ry, rx: c.k[2].rx + drift.rx, rz: c.k[2].rz + drift.rz };
              pose = lerpPose(from, c.conv, e);
              op = 1 - Easing.in(Easing.cubic)(Math.max(0, (r - 0.55) / 0.45));
            }
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  transform: `translate3d(${pose.x}px, ${pose.y}px, 0) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s})`,
                  opacity: op,
                  zIndex: 10 + i,
                }}
              >
                <UiCard seed={i} title={c.title} />
              </div>
            );
          })}
        </AbsoluteFill>
      )}

      {/* Single turbulent smoke ring (matching the original's dense-frame look) */}
      <SmokeRing frame={frame} />

      {/* STRONGER giant wordmark spanning the screen (S6) */}
      {st >= 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <svg
            width={1920}
            height={560}
            viewBox="0 0 1920 560"
            style={{
              transform: `scale(${textScale})`,
              opacity: textOpacity,
              filter: 'drop-shadow(0 0 26px rgba(190,110,255,0.55))',
              overflow: 'visible',
            }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffe14d" />
                <stop offset="30%" stopColor="#ff5ad0" />
                <stop offset="60%" stopColor="#b46bff" />
                <stop offset="100%" stopColor="#5ad0ff" />
              </linearGradient>
            </defs>
            <text
              x="960"
              y="360"
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={800}
              fontStyle="italic"
              fontSize={352}
              letterSpacing={2}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={4.5}
            >
              STRONGER
            </text>
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
