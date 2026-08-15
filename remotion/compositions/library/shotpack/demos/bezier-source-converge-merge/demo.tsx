// bezier-source-converge-merge — Bezier Converge multi-source curve confluence & swallow-up (motion-lab final cut ported to native Remotion)
// four source nodes on the left are each linked to the same convergence point on the right by a thin black bezier curve:
// the curves draw-on left to right, nodes slide along their own curve toward the convergence point while shrinking
// in three accelerating stages (as if sucked in), accent-colored data-packet dots keep gliding along the paths;
// once merged, the curves erase in reverse from the left end, leaving only the circular badge + a word-by-word darkening caption.
// Design coordinates 480×270 (DesignStage scales proportionally), with a 440×240 fixed-size canvas centered in the layout.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BEZIER_SOURCE_CONVERGE_MERGE_DURATION = 168; // 5600ms @30fps

// ---- shared quantities for this card (light-gray Swiss-minimal palette / font, consistent with effect.js) ----
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const BG = '#F1F1F3'; // page light gray
const TXT = '#111111'; // body black
const DIM = '#C9C9CE'; // light gray placeholder text
const LINE = '#E6E6EA'; // stroke
const ACCENT = '#3B82F6';
const ACCENT_WASH = 'rgba(59,130,246,.12)';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// color interpolation: mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

const XC = 332, YC = 120; // convergence point

// neutral source-node placeholders (layered grays, just to distinguish the four sources)
const SRCS = [
  { y: 36, tag: 'S1', c: '#111111' },
  { y: 92, tag: 'S2', c: '#4A4A50' },
  { y: 148, tag: 'S3', c: '#7A7A82' },
  { y: 204, tag: 'S4', c: '#A3A3AA' },
];

type Pt = { x: number; y: number };

// hand-written cubic bezier sampling: P0=(74,y0) P1=(186,y0) P2=(214,YC) P3=(XC,YC)
const cubic = (y0: number, u: number): Pt => {
  const v = 1 - u;
  return {
    x: v * v * v * 74 + 3 * v * v * u * 186 + 3 * v * u * u * 214 + u * u * u * XC,
    y: v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * YC + u * u * u * YC,
  };
};

// path geometry = straight segment M -22,y L 74,y (fixed length 96) + the cubic above. Equivalent to getTotalLength /
// getPointAtLength: the cubic segment builds a cumulative arc-length table (1600 polyline segments, error far below 0.01px),
// binary search maps arc length → parameter u; pure module-level precomputation, no DOM dependency, deterministic rendering.
const SAMPLES = 1600;
const LINE_LEN = 96;
const mkPathGeom = (y0: number) => {
  const cum: number[] = [0];
  let px = 74, py = y0, acc = 0;
  for (let k = 1; k <= SAMPLES; k++) {
    const p = cubic(y0, k / SAMPLES);
    acc += Math.hypot(p.x - px, p.y - py);
    cum.push(acc);
    px = p.x; py = p.y;
  }
  const len = LINE_LEN + acc;
  const pointAt = (s: number): Pt => {
    const sc = Math.max(0, Math.min(len, s));
    if (sc <= LINE_LEN) return { x: -22 + sc, y: y0 };
    const target = sc - LINE_LEN;
    let lo = 0, hi = SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(1, lo);
    const s0 = cum[i - 1], s1 = cum[i];
    const u = (i - 1 + (s1 > s0 ? (target - s0) / (s1 - s0) : 0)) / SAMPLES;
    return cubic(y0, u);
  };
  // find the path frac for the node's rest position (x ≈ 74), same algorithm as effect.js prime()
  let f0 = 0.2;
  for (let k = 1; k <= 40; k++) {
    const q = k / 40;
    if (pointAt(len * q).x >= 74) { f0 = q; break; }
  }
  return { len, pointAt, f0 };
};

const GEOMS = SRCS.map((s) => mkPathGeom(s.y));

// closing caption (word-by-word darkening syntax, uses only the show + inn states)
const CAP_WORDS = 'Four sources unified'.split(' ');
const CAP_ST = 0.78 / CAP_WORDS.length;
const CAP_WIN = CAP_ST * 1.5;

// circular white badge (four-pointed star inside, neutral placeholder marker), size=34
const BADGE_SIZE = 34;
const BADGE_SVG = Number((BADGE_SIZE * 0.52).toFixed(1));

export const BezierSourceConvergeMerge: React.FC = () => {
  const t = useT();
  const conv = seg(t, 0.34, 0.74, E.inOutCubic);            // convergence main progress
  const erase = seg(t, 0.78, 0.9, E.outQuad);               // erase from the start point
  const pkCycle = (seg(t, 0.1, 0.74, E.linear) * 2) % 1;    // data-packet loop (whole number of periods at t=1)

  // badge breathing: fade in on entry + outBack pops up at the moment merge completes, then settles back
  const bp = seg(t, 0.16, 0.26, E.outCubic);
  const badgeScale = lerp(bp, 0.7, 1) * (1 + seg(t, 0.7, 0.78, E.outBack) * 0.12 - seg(t, 0.78, 0.86, E.outQuad) * 0.12);
  const capShow = seg(t, 0.84, 0.9);
  const capInn = seg(t, 0.84, 1);

  return (
    <DesignStage bg={BG}>
      {/* page + 440×240 fixed-size canvas (centered) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: BG,
          overflow: 'hidden',
          fontFamily: SANS,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px' }}>
          {/* four bezier curves: dashoffset draw-on forward, reverse-erase during the erase phase */}
          <svg width={440} height={240} viewBox="0 0 440 240" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            {SRCS.map((s, i) => {
              const { len } = GEOMS[i];
              const draw = seg(t, 0.04 + i * 0.045, 0.04 + i * 0.045 + 0.17, E.outQuad);
              const off = erase > 0 ? -erase * len : len * (1 - draw);
              return (
                <path
                  key={i}
                  d={`M -22,${s.y} L 74,${s.y} C 186,${s.y} 214,${YC} ${XC},${YC}`}
                  fill="none"
                  stroke={TXT}
                  strokeWidth={1.2}
                  strokeDasharray={len}
                  strokeDashoffset={off.toFixed(1)}
                  opacity={(draw * (1 - clamp01((erase - 0.85) / 0.15))).toFixed(3)}
                />
              );
            })}
          </svg>

          {/* source nodes + data-packet layer */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 440, height: 240 }}>
            {SRCS.map((s, i) => {
              const { len, pointAt, f0 } = GEOMS[i];
              // node slides along the path to the convergence point, shrinking in three stages (44→15→0, as if sucked in)
              const tt = conv;
              const frac = f0 + (1 - f0) * tt;
              const pt = pointAt(len * frac);
              const size = tt < 0.75 ? lerp(tt / 0.75, 44, 15) : lerp((tt - 0.75) / 0.25, 15, 0);
              const appear = seg(t, 0.02 + i * 0.04, 0.02 + i * 0.04 + 0.1, E.outCubic);
              // data packet (phase-offset, constant size)
              const pf = f0 + (1 - f0) * ((pkCycle + i * 0.13) % 1);
              const q = pointAt(len * pf);
              const pkOn = seg(t, 0.1, 0.16) * (1 - seg(t, 0.7, 0.76));
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      borderRadius: '50%',
                      background: '#fff',
                      border: `1px solid ${LINE}`,
                      boxSizing: 'border-box',
                      boxShadow: '0 3px 12px rgba(0,0,0,.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      lineHeight: 1,
                      fontFamily: SANS,
                      color: s.c,
                      letterSpacing: 0.3,
                      willChange: 'transform',
                      width: Math.max(0.1, size),
                      height: Math.max(0.1, size),
                      transform: `translate(${(pt.x - size / 2).toFixed(2)}px,${(pt.y - size / 2).toFixed(2)}px) scale(${appear.toFixed(3)})`,
                      fontSize: `${Math.max(4, size * 0.26).toFixed(1)}px`,
                      opacity: (appear * (tt > 0.92 ? clamp01((1 - tt) / 0.08) : 1)).toFixed(3),
                    }}
                  >
                    {s.tag}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      border: `1.5px solid ${ACCENT}`,
                      boxSizing: 'border-box',
                      background: ACCENT_WASH,
                      transform: `translate(${(q.x - 3.5).toFixed(2)}px,${(q.y - 3.5).toFixed(2)}px)`,
                      opacity: (pkOn * (1 - Math.abs(((pkCycle + i * 0.13) % 1) - 0.5) * 0.6)).toFixed(3),
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>

          {/* convergence-point badge (white circle + four-pointed star) */}
          <div
            style={{
              position: 'absolute',
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              borderRadius: '50%',
              background: '#fff',
              border: `1px solid ${LINE}`,
              boxSizing: 'border-box',
              boxShadow: '0 2px 10px rgba(0,0,0,.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              left: XC - 17,
              top: YC - 17,
              opacity: bp,
              transform: `scale(${badgeScale})`,
            }}
          >
            <svg width={BADGE_SVG} height={BADGE_SVG} viewBox="0 0 24 24">
              <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill={TXT} />
            </svg>
          </div>

          {/* closing caption: word-by-word darkening (light gray placeholder → black), whole line fades in via show opacity */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'baseline',
              whiteSpace: 'nowrap',
              left: XC - 60,
              top: YC + 30,
              opacity: capShow,
            }}
          >
            {CAP_WORDS.map((w, i) => {
              const q = clamp01((capInn - i * CAP_ST) / CAP_WIN);
              return (
                <span
                  key={i}
                  style={{
                    font: `600 12px/1.25 ${SANS}`,
                    color: mix(q, DIM, TXT),
                    letterSpacing: (-0.03 * (1 - q)).toFixed(4) + 'em',
                    marginRight: i === CAP_WORDS.length - 1 ? 0 : 4.5,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
