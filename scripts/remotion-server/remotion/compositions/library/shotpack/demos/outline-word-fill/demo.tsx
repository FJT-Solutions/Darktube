// outline-word-fill — Outline→Solid Fill hollow-text glow fill (motion-lab final ported to native Remotion)
// Hollow "Faster" (thin gray stroke, medium weight) shrinks from about 3.2x huge size, decelerating into a centered settle;
// a giant dashed circle behind it then keeps shrinking from off-screen to around the word and slowly rotates, while horizontal
// dashed lines on both sides extend from the frame edges toward the circle; the stroke brightens slightly first, then solid white
// lights up within one frame (no slow sweep), with a brief flash of micro-glow before holding pure white.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const OUTLINE_WORD_FILL_DURATION = 75; // 2500ms @30fps

// Background dust: position/size/opacity all seed-driven, static across frames
const DUST = Array.from({ length: 14 }, (_, i) => ({
  size: 1 + rand(i * 7 + 2) * 1.2,
  opacity: 0.06 + rand(i + 55) * 0.14,
  left: `${rand(i + 13) * 100}%`,
  top: `${rand(i + 29) * 100}%`,
}));

export const OutlineWordFill: React.FC = () => {
  const t = useT();
  // Hollow text shrinks from ~3.2x, decelerating into place (original 4.83→5.15s)
  const born = seg(t, 0.05, 0.14, E.outCubic);
  const zoom = seg(t, 0.05, 0.19, E.outCubic);
  // Stroke brightens slightly right before the fill lights up (6.4→6.55s)
  const bright = seg(t, 0.66, 0.73, E.outQuad);
  const gv = Math.round(lerp(bright, 86, 145));
  // Dashed circle: appears after the word settles, shrinking all the way from off-screen to around it (5.1→6.6s)
  const cin = seg(t, 0.16, 0.3, E.outQuad);
  const shrink = seg(t, 0.16, 0.76, E.outCubic);
  // Horizontal dashed lines extend from the frame edges toward the circle (5.9→6.5s)
  const ext = seg(t, 0.5, 0.72, E.outCubic);
  // Solid white lights up within one frame (original 6.54→6.56s hard cut, no slow sweep)
  const pop = seg(t, 0.742, 0.762);
  // Fleeting micro-glow, then holds pure white
  const flash = pop * (1 - seg(t, 0.762, 0.86, E.outQuad));
  // Note: the original effect.js background is #050505, but the sample mp4's x264 encode measures rgb(3,3,3)
  // (dark-end quantization loss); here we use #030303 per the sample's actual level for frame consistency.
  return (
    <DesignStage bg="#030303">
      <div style={{ position: 'absolute', inset: 0, background: '#030303', overflow: 'hidden' }}>
        {/* Background dust */}
        {DUST.map(({ size, opacity, left, top }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              background: '#fff',
              opacity,
              left,
              top,
            }}
          />
        ))}
        {/* Dashed large circle (SVG, shrinks in from off-screen + slow self-rotation) + left/right horizontal dashed lines */}
        <svg
          viewBox="-240 -135 480 270"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <g transform={`scale(${lerp(shrink, 2.8, 1)}) rotate(${t * 18})`}>
            <circle
              cx={0}
              cy={0}
              r={88}
              fill="none"
              stroke="#7d838e"
              strokeWidth={1}
              strokeDasharray="6 8"
              opacity={cin * 0.85}
            />
          </g>
          <line
            y1={0}
            y2={0}
            x1={-240}
            x2={-240 + ext * 144}
            stroke="#7d838e"
            strokeWidth={1}
            strokeDasharray="5 7"
            opacity={ext}
          />
          <line
            y1={0}
            y2={0}
            x1={240}
            x2={240 - ext * 144}
            stroke="#7d838e"
            strokeWidth={1}
            strokeDasharray="5 7"
            opacity={ext}
          />
        </svg>
        {/* Two-layer text (medium weight, ~30% of frame width): bottom layer stroked, top layer solid white */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            fontFamily: '-apple-system,"Helvetica Neue",sans-serif',
            fontSize: 48,
            fontWeight: 500,
            letterSpacing: 0.5,
            lineHeight: 1,
            opacity: born,
            transform: `translate(-50%,-53%) scale(${lerp(zoom, 3.2, 1)})`,
          }}
        >
          <div
            style={{
              color: 'transparent',
              WebkitTextStroke: `1px rgb(${gv - 4},${gv},${gv + 8})`,
              opacity: 1 - pop,
            }}
          >
            Faster
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              color: '#fff',
              opacity: pop,
              textShadow:
                flash > 0.01 ? `0 0 ${flash * 16}px rgba(255,255,255,${flash * 0.45})` : 'none',
            }}
          >
            Faster
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
