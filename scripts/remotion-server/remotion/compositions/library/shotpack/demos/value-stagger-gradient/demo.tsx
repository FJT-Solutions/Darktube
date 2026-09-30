// value-stagger-gradient — Value Stagger numeric gradient (motion-lab final ported to native Remotion)
// Stagger doesn't only offset time — it also spreads property values across N elements as a gradient:
// the 16 bars enter with delay = stagger (time), while height/hue/blur are all numeric stagger([from,to])
// gradients; the second beat switches from:'center', re-spreading the pulse amplitude from the center.
// Design coordinates 480×270 (DesignStage scales up uniformly); parameter-table values are calibrated to this system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const VALUE_STAGGER_GRADIENT_DURATION = 150; // 5000ms @30fps

// Numeric-gradient util (equivalent to the value mode of stagger([a, b]))
const staggerVal = (i: number, n: number, a: number, b: number, ease?: (x: number) => number) => {
  let k = n <= 1 ? 0 : i / (n - 1);
  if (ease) k = ease(k);
  return lerp(k, a, b);
};

const N = 16;
const C = (N - 1) / 2;
const BARS = Array.from({ length: N }, (_, i) => ({
  i,
  hue: staggerVal(i, N, 200, 320), // numeric gradient: hue spread
  hMax: staggerVal(i, N, 92, 32), // numeric gradient: height 1→0.35
  distC: Math.abs(i - C) / C,
}));

export const ValueStaggerGradient: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0b10',
          overflow: 'hidden',
          fontFamily: '"SF Mono",Menlo,monospace',
        }}
      >
        {BARS.map(({ i, hue, hMax, distC }) => {
          // Beat one: time stagger (linear from first) × numeric gradient (y/blur spread together)
          const d = i * 0.02;
          const e = seg(t, 0.06 + d, 0.28 + d, E.outCubic);
          const y0 = staggerVal(i, N, 46, 14); // the offset itself is also a gradient
          const b0 = staggerVal(i, N, 8, 2); // blur gradient
          // Beat two: from:'center' — the wave and amplitude both spread from the center
          const w = seg(t, 0.56 + distC * 0.13, 0.74 + distC * 0.13);
          const pulse = Math.sin(w * Math.PI);
          const amp = lerp(1 - distC, 0.06, 0.42); // amplitude gradient: largest at the center
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: 'absolute',
                  bottom: '22%',
                  left: `${8 + i * 5.4}%`,
                  width: '3.4%',
                  height: hMax,
                  borderRadius: 5,
                  transformOrigin: '50% 100%',
                  background: `linear-gradient(180deg,hsl(${hue},85%,66%),hsl(${hue},70%,42%))`,
                  boxShadow: `0 0 12px hsla(${hue},85%,58%,.25)`,
                  opacity: e,
                  filter: `blur(${(1 - e) * b0}px) brightness(${1 + pulse * 0.55})`,
                  transform: `translateY(${(1 - e) * y0}px) scaleY(${e * (1 + pulse * amp)})`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '17%',
                  left: `${8 + i * 5.4 + 1.2}%`,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: `hsl(${hue},70%,55%)`,
                  opacity: 0.35,
                }}
              />
            </React.Fragment>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '9%',
            transform: 'translateX(-50%)',
            color: '#5b6480',
            fontSize: 10,
            letterSpacing: '1.5px',
            whiteSpace: 'nowrap',
            opacity: 0.5 + 0.5 * seg(t, 0.04, 0.12),
          }}
        >
          {t < 0.52
            ? 'scale: stagger([1, 0.35])  hue: stagger([200, 320])'
            : "pulse: stagger([.06, .42], { from: 'center' })"}
        </div>
      </div>
    </DesignStage>
  );
};
