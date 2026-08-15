// device-flip-reveal —— Phone body flips into view
// The back (rotY −110°) is shown for 4f, then it flips: f60 the body arrives → f60–f66 a slight overshoot (≤3°) before settling
// f66 the front lands and lights up on the same frame (opacity + inner glow 8f) → main screen/feed cards/tab bar stagger into view, all settled by f88
// f90 onward, a 1.6s (48f) breathing cycle holds until f120. The screen is a vector mockup, using only CSS perspective.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone, SCREEN_W } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Timeline (120f)
const FLIP_IN = 4; // flip starts (back shown statically for the first 4f)
const APPROACH_END = 60; // flip body completes (rotY → 0)
const LAND = 66; // front lands + screen lights up (same frame)
const REVEAL_START = LAND + 2; // interface reveals
const HOLD = 90; // all reveals done → full stillness/breathing

const FEED = [
  { w: 74, h: 74, lines: [200, 260, 170] },
  { w: 58, h: 58, lines: [180, 240, 150] },
  { w: 64, h: 64, lines: [190, 220, 160] },
];

const Tab: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const start = REVEAL_START + 10 + i * 2;
  const t = interpolate(f, [start, start + 4], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  return (
    <div style={{ opacity: t, transform: `translateY(${(1 - t) * 8}px)`, textAlign: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#3f3f46', margin: '0 auto 4px' }} />
      <div style={{ width: 20, height: 6, borderRadius: 3, background: '#52525b', margin: '0 auto' }} />
    </div>
  );
};

export const DeviceFlipReveal: React.FC = () => {
  const f = useCurrentFrame();
  // Flip: −110° → 0 (f4→f60, ease-out), f60→f66 slight overshoot (≤3°) before landing, f66 returns to exactly 0°
  const tA = interpolate(f, [FLIP_IN, APPROACH_END], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  const overshoot =
    f <= APPROACH_END
      ? 0
      : 3 * Math.sin(((Math.min(f, LAND) - APPROACH_END) / (LAND - APPROACH_END)) * Math.PI);
  const rotY = -110 * (1 - tA) + overshoot;
  const rotX = 8 * (1 - tA);
  // Lights up: triggered on the same frame the front lands, opacity 0→1 + inner glow 8f
  const power = interpolate(f, [LAND, LAND + 6], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  const glow = interpolate(f, [LAND, LAND + 4, LAND + 8], [0, 1, 0], CL);
  // Slight push-in zoom: 1.0→1.04 starting 30f before the flip ends, in place by the time it lands
  const zoom = 1 + 0.04 * interpolate(f, [36, 62], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  // After the reveal completes, the whole phone breathes on a 1.6s (48f) cycle
  const breathe = f < HOLD ? 1 : 1 + 0.015 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const revealIn = (start: number, dur: number) =>
    interpolate(f, [start, start + dur], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  const headIn = revealIn(REVEAL_START, 4);
  const rowIn = (i: number) => revealIn(REVEAL_START + 4 + i * 3, 6);

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '50% 52%' }}>
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -381,
            display: 'flex', justifyContent: 'center',
            perspective: 1400,
          }}
        >
          <div
            style={{
              transform: `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${breathe})`,
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 50%',
            }}
          >
            {/* Back: matte back panel visible during the first half of the flip (leads when rotY < −90°) */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: 40, background: 'linear-gradient(150deg,#2c2c31,#16161a)',
                transform: 'rotateY(180deg)', backfaceVisibility: 'hidden',
              }}
            >
              {/* Camera module */}
              <div
                style={{
                  position: 'absolute', top: 20, left: 24, width: 34, height: 34,
                  borderRadius: 10, background: '#0b0b0d',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 8, background: '#20202a' }} />
              </div>
              {/* Centered logo */}
              <div
                style={{
                  position: 'absolute', top: '50%', left: '50%', marginTop: -24, marginLeft: -24,
                  width: 48, height: 48, borderRadius: 24,
                  background: 'radial-gradient(circle at 35% 30%, #4a4a52, #232329)',
                }}
              />
            </div>
            {/* Front */}
            <div style={{ backfaceVisibility: 'hidden' }}>
              <Phone width={340}>
                <div
                  style={{
                    position: 'absolute', inset: 0, paddingTop: 88, paddingLeft: 24,
                    paddingRight: 24, background: '#f4f4f2',
                    opacity: power,
                  }}
                >
                  {/* Greeting header */}
                  <div style={{ opacity: headIn, transform: `translateY(${(1 - headIn) * 12}px)` }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#18181b' }}>Good morning</div>
                      <div style={{ fontSize: 13, color: '#71717a' }}>Mon</div>
                    </div>
                    <div style={{ width: SCREEN_W * 0.42, height: 12, borderRadius: 6, background: '#c9c9ce', marginTop: 8 }} />
                  </div>
                  {/* Feed cards */}
                  <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {FEED.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', gap: 14, background: '#fff', borderRadius: 16,
                          padding: 14, boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                          opacity: rowIn(i), transform: `translateY(${(1 - rowIn(i)) * 16}px)`,
                        }}
                      >
                        <div style={{ width: c.w, height: c.h, borderRadius: 12, background: '#d4d4d8' }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                          {c.lines.map((lw, j) => (
                            <div key={j} style={{ width: lw, height: 11, borderRadius: 5, background: '#e4e4e7' }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* tab bar */}
                  <div
                    style={{
                      position: 'absolute', left: 0, right: 0, bottom: 0, height: 84,
                      background: 'rgba(255,255,255,0.92)', borderTop: '1px solid #e9e9ec',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
                      paddingTop: 14,
                    }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <Tab key={i} i={i} f={f} />
                    ))}
                  </div>
                </div>
                {/* Lighting inner glow (8f): overlays the content, under the Dynamic Island/status bar */}
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 44,
                    boxShadow: 'inset 0 0 120px 20px rgba(255,255,255,0.85)',
                    opacity: glow, pointerEvents: 'none', zIndex: 5,
                  }}
                />
              </Phone>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
