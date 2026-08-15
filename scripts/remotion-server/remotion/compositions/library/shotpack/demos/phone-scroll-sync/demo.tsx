// phone-scroll-sync —— Phone scrolls while browsing + synced finger (mobile / interaction)
// Phone fades in → the finger swipes up from the bottom-right of the screen, and the feed content scrolls in sync with the finger's movement (two scrolls +
// a pause in between) → the finger fades out and the whole phone breathes on hold once settled. The finger is vector art (semi-transparent capsule + fingertip),
// no Lottie gestures. The screen is a grayscale vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone, SCREEN_W } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const PHONE_SCROLL_SYNC_DURATION = 180; // 6s @ 30fps

// Timeline (180f)
const PHONE_IN = 4; // phone fades in
const HAND_IN = 26; // finger enters
const SCROLL_1_START = 34; // first scroll segment
const SCROLL_1_END = 66; // first segment ends
const PAUSE_1 = 76; // first pause (content still, finger floats slightly)
const SCROLL_2_START = 86; // second scroll segment
const SCROLL_2_END = 118; // second segment ends
const PAUSE_2 = 134; // second pause
const HAND_OUT = 142; // finger fades out
const HOLD = 152; // all settled → breathing

const FEED_BASE = [
  { w: 64, h: 64, lines: [170, 240, 140] },
  { w: 56, h: 56, lines: [150, 220, 130] },
  { w: 60, h: 60, lines: [160, 230, 120] },
  { w: 68, h: 68, lines: [180, 250, 150] },
  { w: 52, h: 52, lines: [140, 210, 110] },
  { w: 62, h: 62, lines: [155, 225, 135] },
];
// Feed content is duplicated so cards remain at the bottom after both scrolls
const FEED = [...FEED_BASE, ...FEED_BASE];

// Finger swipe offset (on-screen coords): two segments, each -120px
const handY = (f: number) => {
  const s1 = interpolate(f, [SCROLL_1_START, SCROLL_1_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const s2 = interpolate(f, [SCROLL_2_START, SCROLL_2_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  return 560 - 140 * s1 - 140 * s2;
};

// Content scroll offset: synced with the finger (each 120px of finger swipe moves the content up 40% of a screen)
const contentY = (f: number) => {
  const s1 = interpolate(f, [SCROLL_1_START, SCROLL_1_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const s2 = interpolate(f, [SCROLL_2_START, SCROLL_2_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  return -200 * s1 - 200 * s2;
};

export const PhoneScrollSync: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // Finger visibility: spring-like fade in on entry, fades out between/after the two scroll segments
  const handIn = interpolate(f, [HAND_IN, HAND_IN + 10], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const handOut = interpolate(f, [HAND_OUT, HAND_OUT + 10], [1, 0], CL);
  // Finger floats up and down slightly during pauses
  const float = f >= PAUSE_1 && f < SCROLL_2_START ? Math.sin((f - PAUSE_1) * 0.25) * 3 : 0;

  // Breathing
  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  return (
    <AbsoluteFill
      style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`,
          opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#f4f4f2', overflow: 'hidden' }}>
            {/* Header */}
            <div
              style={{
                height: 110,
                background: '#26262b',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-end',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Discover</div>
            </div>

            {/* Scrolling content */}
            <div
              style={{
                position: 'absolute',
                top: 110,
                left: 0,
                right: 0,
                transform: `translateY(${contentY(f)}px)`,
              }}
            >
              {/* Top placeholder card (visible at the start) */}
              {FEED.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 14,
                    background: '#fff',
                    borderRadius: 16,
                    padding: 14,
                    margin: '10px 16px 0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      width: c.w,
                      height: c.h,
                      borderRadius: 12,
                      background: i % 2 ? '#d9d9de' : '#cfcfd4',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                    {c.lines.map((lw, j) => (
                      <div
                        key={j}
                        style={{ width: lw, height: 11, borderRadius: 5, background: '#e6e6ea' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Finger: semi-transparent capsule + fingertip dot, at the right edge of the screen */}
          {f >= HAND_IN && f < HAND_OUT + 12 && (
            <div
              style={{
                position: 'absolute',
                left: SCREEN_W - 108,
                top: handY(f) + float,
                width: 36,
                height: 150,
                transform: 'rotate(8deg)',
                opacity: handIn * handOut,
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              {/* Fingertip (small circle at the top) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(20,20,22,0.25)',
                }}
              />
              {/* Finger body (gradient capsule) */}
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 4,
                  width: 28,
                  height: 140,
                  borderRadius: 16,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(220,220,225,0.8))',
                  border: '1px solid rgba(20,20,22,0.2)',
                }}
              />
            </div>
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
