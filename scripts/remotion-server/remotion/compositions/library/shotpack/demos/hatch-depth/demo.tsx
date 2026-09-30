// hatch-depth — Hatch → Depth Chart: hatched bars solidify (final motion-lab shot ported to native Remotion)
// The hatched bars under each label wipe-stretch one by one (keeping the 45° hatch placeholder texture),
// then the hatch layer fades out and the accent-color solid layer fades in, morphing into a data bar
// chart — geometry never jumps, only texture and color swap, telling the "placeholder becomes real data" metaphor.
// Design coordinates are 480×270 (DesignStage scales up uniformly); parameter table values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';

export const HATCH_DEPTH_DURATION = 132; // 4400ms @30fps

const ACCENT = '#5B8DEF'; // template accent color, can be swapped per project
const ACCENT_HI = '#8FB2F7'; // same-family highlight (value text)

const ROWS = [
  { label: 'SERIES_A', w: 0.85 },
  { label: 'SERIES_B', w: 0.55 },
  { label: 'GROUP_C', w: 0.95 },
  { label: 'GROUP_D', w: 0.4 },
  { label: 'OTHER_E', w: 0.7 },
];

// the &nbsp;&nbsp; in the header bar (consecutive normal spaces collapse in JSX, so non-breaking spaces are required)
const NBSP2 = '  ';

export const HatchDepth: React.FC = () => {
  const t = useT();
  // header bar: slides in from above
  const headIn = seg(t, 0.62, 0.78, E.outCubic);
  return (
    <DesignStage bg="#0a0a0c">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0a0c',
          padding: '36px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 13,
          // SF Mono from the original stack isn't available in headless Chrome; real Chrome falls back to the macOS default
          // monospace font Courier (serif typewriter look); explicitly adding Courier as a fallback aligns with the original
          fontFamily: '"SF Mono",Courier,monospace',
        }}
      >
        {ROWS.map(({ label, w }, i) => {
          // wipe-stretch each bar in sequence → hatch fades out / solid fades in → slight wiggle at the end
          const grow = seg(t, 0.06 + i * 0.05, 0.06 + i * 0.05 + 0.22, E.outCubic);
          const morph = seg(t, 0.5 + i * 0.03, 0.5 + i * 0.03 + 0.14);
          const wiggle = 1 + Math.sin(t * 30 + i * 2.1) * 0.02 * seg(t, 0.7, 0.85);
          const wPct = grow * w * 100 * wiggle;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 26 }}>
              <span
                style={{
                  color: morph > 0.5 ? '#5c626f' : '#8b91a3',
                  fontSize: 11,
                  width: 70,
                  flex: 'none',
                  textAlign: 'right',
                }}
              >
                {label}
              </span>
              <div style={{ position: 'relative', height: '100%', flex: 1 }}>
                {/* hatch placeholder layer */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${wPct}%`,
                    borderRadius: 3,
                    background: 'repeating-linear-gradient(45deg,#565860 0 4px,transparent 4px 9px)',
                    border: '1px solid #565860',
                    // the original render has no global border-box: width/height are content size, the 1px border expands outward
                    // (the hatch phase shifts with element size; without restoring box-sizing the phase won't line up)
                    boxSizing: 'content-box',
                    opacity: 1 - morph,
                  }}
                />
                {/* accent solid layer */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${wPct}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg,${ACCENT},${ACCENT_HI})`,
                    opacity: morph,
                  }}
                />
                {/* bar-end value */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: ACCENT_HI,
                    fontSize: 10,
                    left: `calc(${wPct}% + 8px)`,
                    opacity: morph,
                  }}
                >
                  {Math.round(w * 420 * grow)}K
                </span>
              </div>
            </div>
          );
        })}
        {/* header bar */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 60,
            fontWeight: 600,
            fontSize: 12,
            fontFamily: '"SF Mono",Courier,monospace', // same as above: Courier fallback
            letterSpacing: 1,
            transform: `translateY(${-30 + headIn * 30}px)`,
            opacity: headIn,
          }}
        >
          <span style={{ color: '#e8eaf0', fontWeight: 700 }}>METRICS</span>
          {NBSP2}
          <span style={{ color: '#67d17c' }}>● LIVE</span>
          {NBSP2}
          <span style={{ color: '#8b91a3' }}>TOTAL 875K{NBSP2}AVG 1.02M</span>
        </div>
      </div>
    </DesignStage>
  );
};
