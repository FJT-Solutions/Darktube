// app-icon-launch-expand —— Home-screen app icon tapped, scales up to fill the screen and becomes the app's main screen (mobile / transition)
// Phone fades in → home-screen grid (widget + icons) staggers into view → finger moves to the target icon and taps →
// the icon springs up from its own center (scale 1→8.2) to fill the screen, while the home screen scales down and dims in sync →
// the app main screen (Studio) staggers into view over the expanded icon, and the icon fades out → the phone settles into breathing. Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const APP_ICON_LAUNCH_EXPAND_DURATION = 192; // 6.4s @ 30fps

// Timeline (192f)
const PHONE_IN = 4;
const GRID_IN = 16;
const FINGER_IN = 52;
const CLICK = 66;
const APP_IN = 96;
const HOLD = 150;

const ICON = 54;
const GAP = 28;
const LEFT0 = 24;
const TOP0 = 168;
// Target icon: row 1, column 1 (upper-left quadrant, slightly toward center); after tapping it expands from its own center
const TARGET_ROW = 1;
const TARGET_COL = 1;
const TARGET_X = LEFT0 + (ICON + GAP) * TARGET_COL + ICON / 2;
const TARGET_Y = TOP0 + (ICON + GAP) * TARGET_ROW + ICON / 2;

// Geometric glyph (pure vector, no font/emoji dependency)
const Glyph: React.FC<{ i: number; dark?: boolean }> = ({ i, dark = false }) => {
  const c = dark ? 'rgba(255,255,255,0.92)' : '#26262b';
  const common: React.CSSProperties = { position: 'absolute', background: c };
  switch (i % 5) {
    case 0:
      return <div style={{ ...common, left: 17, top: 17, width: 20, height: 20, borderRadius: '50%' }} />;
    case 1:
      return (
        <div
          style={{
            ...common,
            left: 19,
            top: 19,
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: `18px solid ${c}`,
            background: 'transparent',
          }}
        />
      );
    case 2:
      return <div style={{ ...common, left: 17, top: 17, width: 20, height: 20, borderRadius: 6 }} />;
    case 3:
      return <div style={{ ...common, left: 18, top: 18, width: 18, height: 18, borderRadius: 3, transform: 'rotate(45deg)' }} />;
    default:
      return <div style={{ ...common, left: 20, top: 12, width: 14, height: 14, borderRadius: 3, transform: 'rotate(45deg)' }} />;
  }
};

export const AppIconLaunchExpand: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 60;

  // Home-screen elements stagger in
  const gridIn = (i: number) =>
    interpolate(f, [GRID_IN + i * 2, GRID_IN + i * 2 + 14], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  // Finger: f52–62 moves to the icon, f64–68 presses then disappears
  const fingerIn = interpolate(f, [FINGER_IN, FINGER_IN + 6], [0, 1], CL);
  const fingerX = interpolate(f, [FINGER_IN, FINGER_IN + 10], [300, TARGET_X], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const fingerY = interpolate(f, [FINGER_IN, FINGER_IN + 10], [640, TARGET_Y], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const press =
    interpolate(f, [CLICK, CLICK + 3], [0, 1], CL) -
    interpolate(f, [CLICK + 4, CLICK + 7], [0, 1], CL);
  const fingerOut = interpolate(f, [CLICK + 6, CLICK + 12], [1, 0], CL);

  // Icon expand: spring (damping 17 / stiffness 95), transform-origin at the icon center
  const launch = spring({
    frame: Math.max(0, f - CLICK), fps: 30,
    config: { damping: 17, stiffness: 95 },
  });
  const iconScale = interpolate(launch, [0, 1], [1, 8.2]);
  const iconOpacity = interpolate(f, [CLICK + 46, CLICK + 62], [1, 0], CL);
  // Hide the icon label right after tapping so the text doesn't "smear" while scaling up
  const labelFade = interpolate(f, [CLICK, CLICK + 10], [1, 0], CL);
  const homeDim = interpolate(f, [CLICK, CLICK + 10], [0, 1], CL);

  // App main screen staggers in
  const appIn = (i: number) =>
    interpolate(f, [APP_IN + i * 5, APP_IN + i * 5 + 16], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const ROWS = 3;
  const COLS = 4;

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
            {/* Home-screen layer (scales down and dims while the icon expands) */}
            <div
              style={{
                position: 'absolute', inset: 0,
                opacity: 1 - homeDim,
                transform: `scale(${1 - homeDim * 0.06})`,
              }}
            >
              {/* Top widget */}
              <div
                style={{
                  position: 'relative', margin: '100px 24px 0', height: 120, borderRadius: 18,
                  background: 'linear-gradient(135deg,#26262e,#181820)',
                  opacity: gridIn(0), transform: `translateY(${(1 - gridIn(0)) * 10}px)`,
                }}
              >
                <div style={{ position: 'absolute', left: 18, top: 16, fontSize: 12, color: '#9a9aa6', letterSpacing: 1 }}>TODAY</div>
                <div style={{ position: 'absolute', left: 18, top: 38, fontSize: 28, fontWeight: 800 }}>Tuesday</div>
                <div style={{ position: 'absolute', right: 18, top: 16, width: 54, height: 54, borderRadius: 14, background: '#33333d' }} />
              </div>

              {/* Icon grid */}
              {Array.from({ length: ROWS * COLS }).map((_, i) => {
                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const isTarget = row === TARGET_ROW && col === TARGET_COL;
                const left = LEFT0 + (ICON + GAP) * col;
                const top = TOP0 + (ICON + GAP) * row;
                const t = gridIn(i);
                if (isTarget) {
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', left, top, width: ICON, height: ICON,
                        opacity: t * iconOpacity,
                        transform: `scale(${iconScale})`, transformOrigin: 'center center', zIndex: 4,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute', inset: 0, borderRadius: 15,
                          background: 'linear-gradient(135deg,#e8e8ee,#c2c2cc)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Glyph i={4} />
                      </div>
                      <div style={{ position: 'absolute', left: 0, right: 0, top: ICON + 6, textAlign: 'center', fontSize: 10, color: '#9a9aa6', opacity: labelFade }}>
                        Studio
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ position: 'absolute', left, top, width: ICON, height: ICON, opacity: t, transform: `translateY(${(1 - t) * 8}px)` }}>
                    <div
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 15,
                        background: i % 2 ? '#2a2a33' : '#33333d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Glyph i={i} dark />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* App main screen: Studio (reveals over the expanded icon) */}
            <div style={{ position: 'absolute', inset: 0, background: '#f6f6f4', color: '#18181b', opacity: appIn(0), zIndex: 5 }}>
              <div
                style={{
                  height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 20px', fontSize: 17, fontWeight: 800,
                  opacity: appIn(0), transform: `translateY(${(1 - appIn(0)) * 12}px)`,
                }}
              >
                <span>Studio</span>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#18181b' }} />
              </div>

              <div
                style={{
                  position: 'relative', margin: '6px 16px 0', height: 224, borderRadius: 18,
                  background: '#26262b', opacity: appIn(1), transform: `translateY(${(1 - appIn(1)) * 14}px)`,
                }}
              >
                <div style={{ position: 'absolute', left: 18, top: 16, fontSize: 12, color: '#9a9aa6', letterSpacing: 1 }}>LATEST PROJECT</div>
                <div style={{ position: 'absolute', left: 18, bottom: 16, fontSize: 24, fontWeight: 800, color: '#fff' }}>Campaign 02</div>
              </div>

              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative', margin: '12px 16px 0', background: '#fff', borderRadius: 14,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.05)',
                    opacity: appIn(i + 2), transform: `translateY(${(1 - appIn(i + 2)) * 12}px)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: i % 2 ? '#d9d9de' : '#cfcfd4' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '55%', height: 9, borderRadius: 5, background: '#e6e6ea' }} />
                      <div style={{ width: '35%', height: 8, borderRadius: 5, background: '#e6e6ea', marginTop: 7 }} />
                    </div>
                  </div>
                </div>
              ))}
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
                transform: `scale(${1 - press * 0.3})`, opacity: fingerIn * fingerOut,
              }}
            />
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
