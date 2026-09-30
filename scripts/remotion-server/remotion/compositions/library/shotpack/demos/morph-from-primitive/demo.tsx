// morph-from-primitive — primitive morph
// A circle breathes one beat (anticipation) → the path d interpolates value by value into a 520×300 rounded-rect
// card outline → the grayscale content bars inside the card fade in. Fully frame-driven and deterministic.
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';

const CX = 960;
const CY = 540;
const R = 130;
const RECT_W = 520;
const RECT_H = 300;
const RECT_R = 20;

// ---- Isomorphic path: M + 8 cubic segments (4 straight-edge + 4 rounded-corner), the circle and rounded rect share anchor topology ----
// Rounded-rect anchors (center-origin coordinates, clockwise, starting at the upper end of the right edge):
// A0(hw,-ihh) right-top → A1(hw,ihh) right-bottom → A2(iw,hh) bottom-right → A3(-iw,hh) bottom-left
// → A4(-hw,ihh) left-bottom → A5(-hw,-ihh) left-top → A6(-iw,-hh) top-left → A7(iw,-hh) top-right → A0
const hw = RECT_W / 2; // 260
const hh = RECT_H / 2; // 150
const iw = hw - RECT_R; // 240
const ihh = hh - RECT_R; // 130
const KAPPA = 0.5522847498;

type Seg = [number, number, number, number, number, number]; // c1x c1y c2x c2y x y
type Shape = { start: [number, number]; segs: Seg[] };

const line = (from: [number, number], to: [number, number]): Seg => [
  from[0] + (to[0] - from[0]) / 3,
  from[1] + (to[1] - from[1]) / 3,
  from[0] + ((to[0] - from[0]) * 2) / 3,
  from[1] + ((to[1] - from[1]) * 2) / 3,
  to[0],
  to[1],
];
// 90° corner arc from → to (arc center c): c1 = from + k·(to−c), c2 = to + k·(from−c)
const corner = (
  from: [number, number],
  to: [number, number],
  c: [number, number]
): Seg => [
  from[0] + KAPPA * (to[0] - c[0]),
  from[1] + KAPPA * (to[1] - c[1]),
  to[0] + KAPPA * (from[0] - c[0]),
  to[1] + KAPPA * (from[1] - c[1]),
  to[0],
  to[1],
];

const rectAnchors: [number, number][] = [
  [hw, -ihh],
  [hw, ihh],
  [iw, hh],
  [-iw, hh],
  [-hw, ihh],
  [-hw, -ihh],
  [-iw, -hh],
  [iw, -hh],
];
const cornerCenters: [number, number][] = [
  [iw, ihh], // A1→A2 bottom-right
  [-iw, ihh], // A3→A4 bottom-left
  [-iw, -ihh], // A5→A6 top-left
  [iw, -ihh], // A7→A0 top-right
];

const rectShape: Shape = {
  start: rectAnchors[0],
  segs: [
    line(rectAnchors[0], rectAnchors[1]),
    corner(rectAnchors[1], rectAnchors[2], cornerCenters[0]),
    line(rectAnchors[2], rectAnchors[3]),
    corner(rectAnchors[3], rectAnchors[4], cornerCenters[1]),
    line(rectAnchors[4], rectAnchors[5]),
    corner(rectAnchors[5], rectAnchors[6], cornerCenters[2]),
    line(rectAnchors[6], rectAnchors[7]),
    corner(rectAnchors[7], rectAnchors[0], cornerCenters[3]),
  ],
};

// Circle: anchors take the same azimuths as the rect anchors, using the exact arc formula k = 4/3·tan(Δθ/4)
const angles = rectAnchors.map(([x, y]) => Math.atan2(y, x));
const circAnchors: [number, number][] = angles.map((a) => [
  R * Math.cos(a),
  R * Math.sin(a),
]);
const arcSeg = (i: number): Seg => {
  const a1 = angles[i];
  let a2 = angles[(i + 1) % 8];
  if (a2 <= a1) a2 += Math.PI * 2;
  const k = (4 / 3) * Math.tan((a2 - a1) / 4);
  const p1 = circAnchors[i];
  const p2 = circAnchors[(i + 1) % 8];
  return [
    p1[0] - k * R * Math.sin(a1),
    p1[1] + k * R * Math.cos(a1),
    p2[0] + k * R * Math.sin(a2 % (Math.PI * 2)),
    p2[1] - k * R * Math.cos(a2 % (Math.PI * 2)),
    p2[0],
    p2[1],
  ];
};
const circShape: Shape = {
  start: circAnchors[0],
  segs: [0, 1, 2, 3, 4, 5, 6, 7].map(arcSeg),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f2 = (n: number) => n.toFixed(2);

const morphPath = (t: number): string => {
  const sx = lerp(circShape.start[0], rectShape.start[0], t);
  const sy = lerp(circShape.start[1], rectShape.start[1], t);
  let d = `M ${f2(CX + sx)} ${f2(CY + sy)}`;
  for (let i = 0; i < 8; i++) {
    const a = circShape.segs[i];
    const b = rectShape.segs[i];
    const v = a.map((n, j) => lerp(n, b[j], t));
    d += ` C ${f2(CX + v[0])} ${f2(CY + v[1])} ${f2(CX + v[2])} ${f2(
      CY + v[3]
    )} ${f2(CX + v[4])} ${f2(CY + v[5])}`;
  }
  return d + ' Z';
};

// ---- Timeline (30fps, 140f total) ----
// 0–10 still circle | 10–30 one breathing beat, scale 1→1.06→1 | 30–54 morph, 24f
// | 56–68 content bars fade in, 12f | 68–140 true stillness, 72f
export const MorphFromPrimitive: React.FC = () => {
  const frame = useCurrentFrame();

  const breath = interpolate(frame, [10, 20, 30], [1, 1.12, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const t = interpolate(frame, [30, 54], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contentOpacity = interpolate(frame, [56, 68], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const d = morphPath(t);

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative' }}>
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0 }}
      >
        <g transform={`translate(${CX} ${CY}) scale(${breath}) translate(${-CX} ${-CY})`}>
          <path d={d} fill="none" stroke={G.ink} strokeWidth={3} />
        </g>
      </svg>
      {/* Card content bars (referencing line-boil's stroked-card content), fading in after the morph completes */}
      <div
        style={{
          position: 'absolute',
          left: CX - RECT_W / 2,
          top: CY - RECT_H / 2,
          width: RECT_W,
          height: RECT_H,
          boxSizing: 'border-box',
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          opacity: contentOpacity,
        }}
      >
        <div style={{ height: 26, width: '58%', background: G.bar, borderRadius: 13 }} />
        <div style={{ height: 16, width: '86%', background: G.line, borderRadius: 8 }} />
        <div style={{ height: 16, width: '72%', background: G.line, borderRadius: 8 }} />
        <div style={{ marginTop: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: G.mid }} />
          <div style={{ height: 16, width: 120, background: G.line, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
};
