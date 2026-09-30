// mobile-chart-live —— App data page: live line chart grows point by point + metric cards stagger in (mobile / data)
// Phone fades in → chart card in the phone: the line grows segment by segment from the left edge to the right (SVG polyline clipped by progress),
// the current value counter rolls, metric cards at the top stagger into view, light grid at the bottom → settles into breathing. Vector mockup,
// deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const MOBILE_CHART_LIVE_DURATION = 180; // 6s @ 30fps

// Timeline (180f)
const PHONE_IN = 4;
const CHART_START = 22;   // line starts growing
const CHART_END = 110;    // line fully grown
const METRIC_IN = 34;     // metric cards stagger in
const HOLD = 148;         // settled → breathing

const POINTS: Array<[number, number]> = [
  [0, 70], [24, 62], [48, 66], [72, 50], [96, 56], [120, 40], [144, 44], [168, 30], [192, 34], [216, 22], [240, 28], [264, 16],
];

export const MobileChartLive: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // Line growth progress: clipped along the x axis (polyline reveals by point count)
  const progress = interpolate(f, [CHART_START, CHART_END], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  const visibleCount = Math.floor(progress * (POINTS.length - 1)) + 1;
  const linePts = POINTS.slice(0, visibleCount).map(([x, y]) => `${x},${y}`).join(' ');

  // Current value counter (rolls with progress)
  const currentVal = interpolate(f, [CHART_START, CHART_END], [128, 264], { easing: Easing.out(Easing.cubic), ...CL });

  // Metric cards stagger in
  const metricIn = (i: number) => interpolate(f, [METRIC_IN + i * 6, METRIC_IN + i * 6 + 12], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn }}>
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#fff', color: '#18181b' }}>
            <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #e9e9ec', fontSize: 17, fontWeight: 800 }}>Analytics</div>

            {/* Chart card */}
            <div style={{ margin: '18px 16px 0', border: '1px solid #e9e9ec', borderRadius: 18, padding: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Active sessions</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.round(currentVal)}</div>
              </div>
              {/* SVG line (light grid + growing line) */}
              <svg viewBox="0 0 264 90" width="100%" height={110} style={{ marginTop: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1={0} y1={16 + i * 24} x2={264} y2={16 + i * 24} stroke="#ececf0" strokeWidth={1} />
                ))}
                <polyline points={linePts} fill="none" stroke="#18181b" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={POINTS[visibleCount - 1][0]} cy={POINTS[visibleCount - 1][1]} r={4} fill="#18181b" />
              </svg>
            </div>

            {/* Metric cards stagger in */}
            <div style={{ display: 'flex', gap: 10, margin: '14px 16px 0' }}>
              {[
                { label: 'Bounce', value: '32%' },
                { label: 'Duration', value: '4m 12s' },
              ].map((m, i) => (
                <div key={i} style={{ flex: 1, background: '#f6f6f4', borderRadius: 14, padding: '14px', opacity: metricIn(i), transform: `translateY(${(1 - metricIn(i)) * 12}px)` }}>
                  <div style={{ fontSize: 11, color: '#8a8a92' }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
