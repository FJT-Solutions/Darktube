// picker-carousel-feature-cycle — Picker Carousel feature-name snap carousel (motion-lab final ported to native Remotion)
// Mobile-style vertical picker: the focus pill stays still while content passes through it; each item docks
// for 0.45s with a pronounced outQuint deceleration snap + 4–5 frames of stillness; layered by distance to
// center for opacity/font-size/grayscale; on landing the pill does an ultra-light scaleY 1→1.06→1 breath,
// with a fixed square AI badge on the left outside.
// Design coordinates 480×270 (DesignStage scales proportionally); parameter values are set in this system.
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const PICKER_CAROUSEL_FEATURE_CYCLE_DURATION = 108; // 3600ms @30fps

const PAPER = '#F3F3F1';
const INK = '#111113';
const MID = '#8A8A8F';
const ROW_H = 34; // single row height
const ITEMS = [
  'Data Cleanup',
  'Direct Message',
  'Smart Segments',
  'Batch Actions',
  'Reward Program',
  'Automated Flows',
  'Variant Testing',
];
const ICONS = ['◎', '✉', '◧', '◈', '★', '↺', '⚑'];
const STEPS = 5; // five snap advances
const HOLD = 5 / 14; // stillness share at each step's tail (≈4–5 frames motionless)

export const PickerCarouselFeatureCycle: React.FC = () => {
  const t = useT();

  // Master timeline: t∈[0.05,0.95] split into 5 equal steps; the first (1-HOLD) of each step snaps with outQuint, the tail holds still
  const g = seg(t, 0.05, 0.95) * STEPS;
  const step = Math.min(STEPS - 1, Math.floor(g));
  const local = Math.min(1, g - step);
  const mv = E.outQuint(Math.min(1, local / (1 - HOLD)));
  const pos = step + mv;

  // Landing breath: after the snap enters HOLD, the pill pulses ultra-lightly scaleY 1→1.06→1
  const land = Math.max(0, (local - (1 - HOLD)) / HOLD);
  const breath = land > 0 ? Math.sin(Math.min(1, land / 0.6) * Math.PI) * 0.06 : 0;

  return (
    <DesignStage bg={PAPER}>
      {/* Paper background — matches the paper() container of the captured page */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: PAPER,
          fontFamily: "-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif",
        }}
      >
        {/* Picker viewport: 300×(34×5) centered, whole thing fades in within the first 5% */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 300,
            height: ROW_H * 5,
            transform: 'translate(-50%,-50%)',
            overflow: 'hidden',
            opacity: seg(t, 0, 0.05),
          }}
        >
          {/* Focus pill: position stays still, only scaleY breathes on landing.
              The captured page is content-box; with the 1px border it must be declared explicitly, otherwise the height is off by 2px */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: ROW_H * 2,
              height: ROW_H,
              boxSizing: 'content-box',
              borderRadius: 999,
              background: '#fff',
              border: '1px solid #E3E3E6',
              boxShadow: '0 2px 8px rgba(0,0,0,.06)',
              transform: `scaleY(${1 + breath})`,
            }}
          />
          {/* Content column: the whole column translateY's through the focus pill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              transform: `translateY(${ROW_H * 2 - pos * ROW_H}px)`,
            }}
          >
            {ITEMS.map((txt, i) => {
              // Layered by distance to center: opacity in two linear segments, font size 17→14, three shades of gray
              const d = Math.abs(i - pos);
              const k2 = Math.min(2, d);
              const o = k2 <= 1 ? lerp(k2, 1, 0.55) : lerp(k2 - 1, 0.55, 0.18);
              return (
                <div
                  key={i}
                  style={{
                    height: ROW_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    fontSize: lerp(Math.min(1, d / 2), 17, 14),
                    lineHeight: 1,
                    fontFamily: "-apple-system,'Helvetica Neue',sans-serif",
                    color: d < 0.5 ? INK : d < 1.5 ? MID : '#B9B9BE',
                    opacity: o,
                  }}
                >
                  {/* Icon appears only near the focus (visible within d<0.625) */}
                  <span style={{ fontSize: 14, opacity: Math.max(0, 1 - d * 1.6) }}>
                    {ICONS[i]}
                  </span>
                  <span>{txt}</span>
                </div>
              );
            })}
          </div>
          {/* Top/bottom fade mask: paper → transparent → paper, laid over the list */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `linear-gradient(180deg,${PAPER} 0%,rgba(243,243,241,0) 26%,rgba(243,243,241,0) 74%,${PAPER} 100%)`,
            }}
          />
        </div>
        {/* Fixed AI badge outside on the left: square with black bg, white text, rounded corners; fades in slightly late */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            margin: '-11px 0 0 -186px',
            width: 26,
            height: 22,
            borderRadius: 6,
            background: INK,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 10,
            lineHeight: 1,
            fontFamily: '-apple-system,sans-serif',
            letterSpacing: 0.5,
            opacity: seg(t, 0.02, 0.09),
          }}
        >
          AI
        </div>
      </div>
    </DesignStage>
  );
};
