// gradient-transition — Gradient Transition smooth gradient crossfade (motion-lab final converted to native Remotion)
// The background transitions smoothly between three CSS gradient types: the linear segment
// interpolates angle + color stops, the radial segment interpolates center + radius, and
// the conic segment spins the rainbow; equivalent to "parse the gradient string and
// interpolate parameter by parameter", with a center pill labeling the current segment.
// Design coordinates are 480×270 (DesignStage scales up proportionally); the parameter
// table is calibrated to this coordinate system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const GRADIENT_TRANSITION_DURATION = 180; // 6000ms @30fps

const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;
type H3 = [number, number, number];
// hsl triplets interpolate per channel
const mixH = (a: H3, b: H3, k: number): H3 => [lerp(k, a[0], b[0]), lerp(k, a[1], b[1]), lerp(k, a[2], b[2])];

const layerStyle = (background: string, opacity: number): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background,
  opacity,
});

export const GradientTransition: React.FC = () => {
  const t = useT();

  // Phase 1: linear — angle 40°→230°, two stop triplets interpolated in hsl
  const p1 = seg(t, 0, 0.4, E.inOutQuad);
  const ang = lerp(p1, 40, 230);
  const l1c1 = mixH([340, 88, 60], [160, 78, 52], p1);
  const l1c2 = mixH([265, 80, 52], [205, 92, 58], p1);
  const bg1 = `linear-gradient(${ang}deg, ${hsl(...l1c1)}, ${hsl(...l1c2)})`;

  // Phase 2: radial — center (28%,66%)→(72%,32%), radius 45%→85%
  const p2 = seg(t, 0.33, 0.7, E.inOutQuad);
  const cx = lerp(p2, 28, 72), cy = lerp(p2, 66, 32), rr = lerp(p2, 45, 85);
  const l2c1 = mixH([45, 95, 62], [285, 85, 58], p2);
  const l2c2 = mixH([220, 60, 14], [230, 55, 10], p2);
  const bg2 = `radial-gradient(circle ${rr}% at ${cx}% ${cy}%, ${hsl(...l2c1)}, ${hsl(...l2c2)})`;

  // Phase 3: conic — rainbow ring rotating by the from angle (same start/end color for seamless looping)
  const p3 = seg(t, 0.66, 1, E.inOutQuad);
  const from = p3 * 300;
  const bg3 = `conic-gradient(from ${from}deg at 50% 50%,
    hsl(0,85%,60%), hsl(60,85%,60%), hsl(120,75%,55%), hsl(180,80%,55%),
    hsl(240,85%,62%), hsl(300,85%,60%), hsl(0,85%,60%))`;

  return (
    <DesignStage bg="#0a0b10">
      {/* Three gradient layers crossfade in sequence */}
      <div style={layerStyle(bg1, 1 - seg(t, 0.3, 0.38))} />
      <div style={layerStyle(bg2, seg(t, 0.3, 0.38) - seg(t, 0.63, 0.71))} />
      <div style={layerStyle(bg3, seg(t, 0.63, 0.71))} />
      {/* Center pill: labels the current gradient type */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          padding: '6px 18px',
          borderRadius: 999,
          background: 'rgba(8,9,14,.55)',
          color: '#fff',
          fontFamily: '-apple-system,system-ui,sans-serif',
          fontSize: 13,
          letterSpacing: 4,
          fontWeight: 700,
          backdropFilter: 'blur(4px)',
        }}
      >
        {t < 0.34 ? 'LINEAR' : t < 0.67 ? 'RADIAL' : 'CONIC'}
      </div>
    </DesignStage>
  );
};
