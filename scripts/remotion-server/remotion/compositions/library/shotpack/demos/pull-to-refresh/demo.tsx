// pull-to-refresh —— Pull to refresh: the finger drags the list down, the indicator grows and rotates, on release it spins while loading, then content swaps in fresh (mobile / interaction)
// Phone fades in → feed cards stagger into view → finger drags down from the top, the list moves down as a whole, and the circular indicator at the top
// grows (scale) and rotates 0→180° past the threshold → finger lifts, the indicator spins while loading (360°×3) →
// the list snaps back and new content cards stagger in → settles into breathing. Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const PULL_TO_REFRESH_DURATION = 210; // 7s @ 30fps

// Timeline (210f)
const PHONE_IN = 4;
const ROWS_IN = 14;
const FINGER_IN = 44;
const PULL_START = 52;
const PULL_END = 94;     // pulled to the threshold
const RELEASE = 94;      // release → loading spin
const SPIN = 98;         // loading spin starts
const SNAP = 150;        // list snaps back + content refreshes
const HOLD = 176;

const PULL_MAX = 120;

export const PullToRefresh: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 60;

  // Rows stagger in
  const rowIn = (i: number) =>
    interpolate(f, [ROWS_IN + i * 4, ROWS_IN + i * 4 + 14], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  // Pull amount: 0→PULL_MAX, held after release, snaps back at SNAP
  const pullAmt = interpolate(f, [PULL_START, PULL_END], [0, PULL_MAX], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const snapped = interpolate(f, [SNAP, SNAP + 22], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const pull = f < RELEASE ? pullAmt : f < SNAP ? PULL_MAX : PULL_MAX * (1 - snapped);

  // Indicator: grows + rotates 0→180°; past the threshold it switches to loading spin (360°×3)
  const grow = pull / PULL_MAX;
  const iScale = 0.35 + grow * 0.75;
  const iRot = grow * 180;
  const iArmed = grow > 0.85 ? 1 : 0;
  const spinRot = interpolate(f, [SPIN, SPIN + 56], [0, 360 * 3], { easing: Easing.out(Easing.cubic), ...CL });

  // Finger: enters from the top of the screen and drags down, disappears after release
  const fingerIn = interpolate(f, [FINGER_IN, FINGER_IN + 6], [0, 1], CL);
  const fingerX = interpolate(f, [FINGER_IN, PULL_END], [195, 195], CL);
  const fingerY = interpolate(f, [FINGER_IN, PULL_END], [80, 220], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const fingerOut = interpolate(f, [RELEASE, RELEASE + 8], [1, 0], CL);

  // New content staggers in
  const newIn = (i: number) =>
    interpolate(f, [SNAP + i * 5, SNAP + i * 5 + 14], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const oldRows = ['Weekly recap is live', 'New team members joined', 'You were mentioned'];
  const newRows = ['Onboarding flow shipped', 'Q3 roadmap updated', 'Motion principles doc'];

  const card = (label: string, i: number, t: number) => (
    <div
      style={{
        position: 'relative', margin: '10px 16px 0', background: '#1a1a21', borderRadius: 16,
        overflow: 'hidden', opacity: t, transform: `translateY(${(1 - t) * 12}px)`,
      }}
    >
      <div style={{ height: 92, background: i % 2 ? '#2c2c36' : '#24242d' }} />
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{label}</div>
        <div style={{ width: '58%', height: 8, borderRadius: 4, background: '#2c2c36', marginTop: 8 }} />
      </div>
    </div>
  );

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
            {/* Top indicator (grows with the pull, rotates while loading) */}
            <div
              style={{
                position: 'absolute', left: '50%', top: 92, width: 40, height: 40,
                marginLeft: -20, zIndex: 8,
                opacity: grow,
                transform: `translateY(${grow * 12}px) scale(${iScale})`,
              }}
            >
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: `2.5px solid ${iArmed || f >= SPIN ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}`,
                  borderTopColor: 'transparent',
                  transform: `rotate(${(f >= SPIN ? spinRot : iRot)}deg)`,
                }}
              />
            </div>

            {/* List layer (moves down with the pull; swaps in new content after SNAP) */}
            <div style={{ position: 'absolute', inset: 0, transform: `translateY(${pull}px)`, zIndex: 2 }}>
              <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: 20, fontWeight: 800, background: '#0e0e12' }}>
                For You
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#33333d' }} />
              </div>
              <div style={{ margin: '6px 0 0' }}>
                {(f < SNAP ? oldRows : newRows).map((label, i) =>
                  card(label, i, f < SNAP ? rowIn(i) : newIn(i)),
                )}
              </div>
            </div>
          </div>

          {/* Finger */}
          {f >= FINGER_IN && (
            <div
              style={{
                position: 'absolute', left: fingerX, top: fingerY, width: 24, height: 24,
                marginLeft: -12, marginTop: -12, borderRadius: '50%', zIndex: 20,
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 0 0 3px rgba(45,212,191,0.5)',
                opacity: fingerIn * fingerOut,
              }}
            />
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
