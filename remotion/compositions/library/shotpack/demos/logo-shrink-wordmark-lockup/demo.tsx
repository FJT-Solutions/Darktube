// logo-shrink-wordmark-lockup — Shrink & Lockup: the icon contracts into place (motion-lab final converted to native Remotion)
// A neon gap ring shrinks in quickly with easeInOut into a central solid white O (an abstract geometric mark, ending with a slight overshoot brake),
// then the icon shifts left to make room, and the five letters slide in one by one from left to right with opacity + 8px to complete the lockup,
// and the accent tagline fades in as a whole line after a delay to finish. Design coordinates 480×270 (DesignStage scales up proportionally).
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const LOGO_SHRINK_WORDMARK_LOCKUP_DURATION = 132; // 4400ms @30fps

const ACCENT = '#e0342c';
const WORDMARK = 'BRAND';
const ICON = 30; // Icon base size (px)
const SHIFT = -68; // Icon left shift offset for the lockup

// Arc path (degrees, clockwise sweep)
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};

// Dual-arc group: the a0-a1 arc plus its opposite (+180°) arc — a gap ring with a notch
const Arcs: React.FC<{ a0: number; a1: number; col: string; w: number; blur: number; opacity: number; stroke?: string }> = ({
  a0,
  a1,
  col,
  w,
  blur,
  opacity,
  stroke,
}) => (
  <g opacity={opacity}>
    {[
      [a0, a1],
      [a0 + 180, a1 + 180],
    ].map(([b0, b1], i) => (
      <path
        key={i}
        d={arcPath(15, 15, 10.5, b0, b1)}
        fill="none"
        stroke={stroke ?? col}
        strokeWidth={w}
        strokeLinecap="round"
        style={blur ? { filter: `blur(${blur}px)` } : undefined}
      />
    ))}
  </g>
);

export const LogoShrinkWordmarkLockup: React.FC = () => {
  const t = useT();
  // Contract: scale 5.4→1 (easeInOut), ending with a slight 1.05 overshoot brake
  const k = seg(t, 0.02, 0.28, E.inOutCubic);
  const brake = Math.sin(seg(t, 0.26, 0.37) * Math.PI) * 0.06;
  const s = lerp(k, 5.4, 1) * (1 + brake);
  // Shift left to make room: after settling, t 0.34-0.47
  const shift = seg(t, 0.34, 0.47, E.inOutCubic) * SHIFT;
  // Cross-fade from the neon gap state to a solid white O (as the contraction proceeds)
  const heal = seg(t, 0.10, 0.28, E.inOutQuad);
  // Background color calibration: the source mp4 (yuv420p, no color metadata) decodes #05060a back to rgb(3,5,9);
  // a constant 2/255 difference on a dark background would wreck the SSIM of flat regions, so pin to the decoded value; all other values match effect.js
  return (
    <DesignStage bg="#030509">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Icon: SVG dual-arc gap ring — an abstract geometric mark, not any specific brand logo (the gap heals and the neon turns pure white while contracting) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: ICON,
            height: ICON,
            margin: `${-ICON / 2}px 0 0 ${-ICON / 2}px`,
            transform: `translateX(${shift}px) scale(${s})`,
          }}
        >
          <svg
            viewBox="0 0 30 30"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Neon halo (with gap) */}
            <Arcs a0={-32} a1={122} col="rgba(110,90,255,.6)" w={6.5} blur={2.5} opacity={1 - heal} />
            {/* Neon core: turns pure white once heal passes halfway */}
            <Arcs
              a0={-32}
              a1={122}
              col="#dfe9ff"
              w={3.4}
              blur={0}
              opacity={1 - heal * 0.75}
              stroke={heal > 0.5 ? '#fff' : '#dfe9ff'}
            />
            {/* Solid white O after the gap heals */}
            <circle cx={15} cy={15} r={10.5} fill="none" stroke="#fff" strokeWidth={5.5} opacity={heal} />
          </svg>
        </div>
        {/* Letter row (right of the icon): staggered left to right, opacity 0→1 + translateX 8px→0 */}
        <div
          style={{
            position: 'absolute',
            left: 'calc(50% - 40px)',
            top: '50%',
            height: ICON,
            marginTop: -ICON / 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {[...WORDMARK].map((ch, i) => {
            const lk = seg(t, 0.46 + i * 0.035, 0.46 + i * 0.035 + 0.10, E.outCubic);
            return (
              <span
                key={i}
                style={{
                  color: '#f2f5fa',
                  font: "800 27px/1 -apple-system,'Helvetica Neue',sans-serif",
                  letterSpacing: 2,
                  opacity: lk,
                  transform: `translateX(${lerp(lk, 8, 0)}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        {/* Accent tagline (placeholder text): delayed fade-in as a whole line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(50% + 34px)',
            textAlign: 'center',
            color: ACCENT,
            font: '600 13px/1 -apple-system,sans-serif',
            letterSpacing: 5,
            opacity: seg(t, 0.72, 0.84, E.outQuad),
          }}
        >
          BUILD. SHIP. REPEAT.
        </div>
      </div>
    </DesignStage>
  );
};
