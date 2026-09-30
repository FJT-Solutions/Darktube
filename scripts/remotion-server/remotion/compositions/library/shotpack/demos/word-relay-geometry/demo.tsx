// word-relay-geometry — Word Relay Geometry benefit-word geometric relay (motion-lab final ported to native Remotion)
// Three benefit words relay: Faster (large dashed circle) → Better (three interlocking solid circles) → Stronger (a metallic sheen
// sweeps left to right and settles to pure white). Old words and geometry fade out and shrink; new words enter as outline→fill,
// and the circle paths grow via trim; dust particles drift in the background. Design coordinates 480×270 (DesignStage scaled proportionally).
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const WORD_RELAY_GEOMETRY_DURATION = 180; // 6000ms @30fps

const CIRC_R = 78;

// Dust particles (20 of them, seeds identical to the original effect.js)
const PARTS = Array.from({ length: 20 }, (_, i) => ({
  size: 1 + rand(i * 3) * 1.4,
  x: rand(i) * 100,
  ph: rand(i + 40),
  sp: 0.5 + rand(i + 80) * 0.8,
}));

// One slot per word: geometry config + time window (in 0.07 + hold + out 0.05)
type Geom = { x: number; r: number; dash?: boolean; d?: number };
const SLOTS: { label: string; geom: Geom[]; t0: number; t1: number }[] = [
  { label: 'Faster', geom: [{ x: 0, r: CIRC_R + 22, dash: true }], t0: 0.0, t1: 0.36 },
  {
    label: 'Better',
    geom: [
      { x: -110, r: 62, d: 0 },
      { x: 0, r: 62, d: 0.06 },
      { x: 110, r: 62, d: 0.12 },
    ],
    t0: 0.32,
    t1: 0.68,
  },
  { label: 'Stronger', geom: [], t0: 0.64, t1: 1.0 },
];

export const WordRelayGeometry: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#07080c">
      {/* Dust particles: slow upward-drift loop + breathing twinkle */}
      {PARTS.map((p, i) => {
        const y = (1 - ((t * p.sp + p.ph) % 1)) * 110 - 5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: '#fff',
              left: `${p.x}%`,
              top: `${y}%`,
              opacity: 0.12 + 0.18 * Math.sin((t * 3 + p.ph) * Math.PI * 2) ** 2,
            }}
          />
        );
      })}

      {SLOTS.map(({ label, geom, t0, t1 }, i) => {
        const isLast = i === SLOTS.length - 1;
        const tin = seg(t, t0, t0 + 0.07, E.outCubic);
        const tout = isLast ? 0 : seg(t, t1 - 0.05, t1, E.inQuad);
        const alive = tin > 0 && tout < 1;

        // Faster/Better: outline→fill revealed by a left-to-right clip
        const fillp = seg(t, t0 + 0.06, t0 + 0.18, E.inOutCubic);
        // Stronger: outline→sheen sweep→settle to pure white
        const sh = seg(t, t0 + 0.05, t0 + 0.2, E.outQuad); // appearance (outline→sheen)
        const sweep = seg(t, t0 + 0.08, t0 + 0.26, E.inOutCubic); // sweep position
        const white = seg(t, t0 + 0.27, t0 + 0.34, E.outQuad); // settles to pure white

        return (
          <div key={label} style={{ position: 'absolute', inset: 0, opacity: alive ? tin * (1 - tout) : 0 }}>
            <svg
              viewBox="-240 -135 480 270"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              {geom.map((g, k) => {
                if (g.dash) {
                  // Dashed large circle: grows from 0.4 to 1 overall and keeps slowly rotating
                  const grow = seg(t, t0 + 0.01, t0 + 0.14, E.outCubic);
                  return (
                    <circle
                      key={k}
                      cx={g.x}
                      cy={0}
                      r={g.r}
                      fill="none"
                      stroke="#565e78"
                      strokeWidth={1.1}
                      strokeDasharray="5 7"
                      opacity={grow * (1 - tout)}
                      transform={`rotate(${-90 + t * 30}) scale(${lerp(grow, 0.4, 1)})`}
                    />
                  );
                }
                // Solid circles: pathLength-normalized trim grow-in / reverse fade-out on exit
                const trim =
                  seg(t, t0 + 0.02 + (g.d || 0), t0 + 0.14 + (g.d || 0), E.outCubic) -
                  seg(t, t1 - 0.06, t1, E.inQuad) * (isLast ? 0 : 1);
                return (
                  <circle
                    key={k}
                    cx={g.x}
                    cy={0}
                    r={g.r}
                    fill="none"
                    stroke="#565e78"
                    strokeWidth={1.1}
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset={1 - Math.max(0, trim)}
                    transform="rotate(-90)"
                  />
                );
              })}
            </svg>
            {/* Word group: outline base layer, fill/sheen absolutely stacked on top */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%,-52%) scale(${lerp(tout, 1, 0.86)})`,
                fontFamily: '-apple-system,"Helvetica Neue",sans-serif',
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              <div
                style={{
                  color: 'transparent',
                  WebkitTextStroke: '1px #6a7186',
                  opacity: isLast ? 1 - sh : 1 - fillp * 0.75,
                }}
              >
                {label}
              </div>
              {isLast ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      color: '#fff',
                      opacity: white,
                      textShadow: `0 0 ${white * 18}px rgba(255,255,255,.3)`,
                    }}
                  >
                    {label}
                  </div>
                  {/* Metallic sheen: gradient background-clip text, background position sweeps right to left */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      color: 'transparent',
                      backgroundImage:
                        'linear-gradient(100deg,#585f72 0%,#8d95aa 38%,#ffffff 50%,#8d95aa 62%,#585f72 100%)',
                      backgroundSize: '280% 100%',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      opacity: sh * (1 - white),
                      backgroundPosition: `${lerp(sweep, 100, 0)}% 0`,
                    }}
                  >
                    {label}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: '#fff',
                    clipPath: `inset(-20% ${(1 - fillp) * 100}% -20% 0)`,
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </DesignStage>
  );
};
