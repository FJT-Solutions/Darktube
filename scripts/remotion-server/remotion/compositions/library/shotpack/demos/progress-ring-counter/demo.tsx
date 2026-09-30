// progress-ring-counter —— Circular progress ring grows + percentage counter + completion checkmark pops out (mobile / data)
// Phone fades in → goal card reveals: title + central ring (track + progress arc) + counter (0→100%) + two stat cards
// below stagger in → ring-head dot advances along the arc; on completion the checkmark springs out and the ring flashes → settles into breathing.
// Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const PROGRESS_RING_COUNTER_DURATION = 168; // 5.6s @ 30fps

// Timeline (168f)
const PHONE_IN = 4;
const TITLE_IN = 16;
const START = 26;        // ring growth starts
const END = 116;         // ring fully grown
const CHECK = 118;       // complete: checkmark pops out
const STAT_IN = 40;      // stat cards stagger in
const HOLD = 138;

const R = 82;
const C = 2 * Math.PI * R; // circumference ≈ 515.2

export const ProgressRingCounter: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 60;

  const titleIn = interpolate(f, [TITLE_IN, TITLE_IN + 14], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  // Ring progress: 0→1 (ease-out)
  const prog = interpolate(f, [START, END], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const angle = prog * Math.PI * 2 - Math.PI / 2;
  const headX = 100 + R * Math.cos(angle);
  const headY = 100 + R * Math.sin(angle);
  const percent = Math.round(prog * 100);

  // Completion: checkmark springs out + ring pulse
  const checkSpring = spring({ frame: Math.max(0, f - CHECK), fps: 30, config: { damping: 12, stiffness: 180 } });
  const checkIn = interpolate(f, [CHECK, CHECK + 8], [0, 1], CL);
  const ringFlash = f >= CHECK ? 1 + 0.05 * Math.sin((f - CHECK) * 0.5) : 1;

  const statIn = (i: number) =>
    interpolate(f, [STAT_IN + i * 6, STAT_IN + i * 6 + 12], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#0e0e12', color: '#fff', overflow: 'hidden' }}>
            {/* Title */}
            <div style={{ margin: '86px 20px 0', opacity: titleIn, transform: `translateY(${(1 - titleIn) * 10}px)` }}>
              <div style={{ fontSize: 12, color: '#9a9aa6', letterSpacing: 1 }}>WEEKLY GOAL</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Focus minutes</div>
            </div>

            {/* Central ring */}
            <div style={{ position: 'relative', width: 220, height: 220, margin: '22px auto 0' }}>
              <svg viewBox="0 0 200 200" width={220} height={220}>
                <circle cx={100} cy={100} r={R} fill="none" stroke="#2a2a33" strokeWidth={14} />
                <circle
                  cx={100} cy={100} r={R} fill="none" stroke="#fff" strokeWidth={14}
                  strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - prog)}
                  transform="rotate(-90 100 100)"
                />
                {/* Ring-head dot */}
                {f >= START && (
                  <circle cx={headX} cy={headY} r={7} fill="#fff" />
                )}
              </svg>
              {/* Center counter + checkmark */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {f >= CHECK ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${checkSpring})`, opacity: checkIn }}>
                    <svg viewBox="0 0 40 40" width={44} height={44}>
                      <circle cx={20} cy={20} r={19} fill="#4ade80" />
                      <path d="M 12 21 l 6 6 l 11 -13" stroke="#0e0e12" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ fontSize: 12, color: '#9a9aa6', marginTop: 6 }}>Goal complete</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', transform: `scale(${ringFlash})` }}>
                    <div style={{ fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{percent}%</div>
                    <div style={{ fontSize: 12, color: '#9a9aa6', marginTop: 2 }}>of 120 min</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 10, margin: '26px 20px 0' }}>
              {[
                { label: 'Best day', value: '38 min' },
                { label: 'Streak', value: '6 days' },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, background: '#1a1a21', borderRadius: 14, padding: 14,
                    opacity: statIn(i), transform: `translateY(${(1 - statIn(i)) * 12}px)`,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#9a9aa6' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
