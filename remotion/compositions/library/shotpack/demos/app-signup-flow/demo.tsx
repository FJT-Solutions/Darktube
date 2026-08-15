// app-signup-flow —— App sign-up flow demo (mobile / interaction)
// Phone springs in from the bottom → cursor lands on the Email field and types character by character → password dots fill in automatically →
// cursor moves to the Sign Up button and taps it (press feedback) → success modal springs up →
// switches to Dashboard (header + 2×2 stat cards + activity rows stagger in) → from f150 the whole phone breathes on hold.
// Screen is a vector mockup (grayscale fake UI), deterministic rendering, no randomness.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const APP_SIGNUP_FLOW_DURATION = 180; // 6s @ 30fps

// Timeline (180f)
const PHONE_IN = 4; // phone starts entering from the bottom
const CUR_EMAIL = 36; // cursor lands on Email field
const TYPE_START = 42; // start typing character by character
const TYPE_END = 74; // Email finished
const PW_START = 58; // password dots start filling
const PW_END = 82; // password filled
const CUR_BTN = 86; // cursor moves to the button
const CLICK = 94; // tap button (press peak)
const SUCCESS = 100; // success modal pops up
const DASH = 128; // switch to Dashboard
const DASH_SETTLE = 150; // all settled → breathing hold

const EMAIL = 'user@example.com';
const PW = '••••••••';
const STATS = [
  { w: 96, h: 26 },
  { w: 96, h: 26 },
  { w: 96, h: 26 },
  { w: 96, h: 26 },
];
const ACTS = [76, 150, 106]; // activity row icon widths

const cursorAt = (
  f: number,
): { x: number; y: number } | null => {
  const lerp2 = (a: number, b: number, t: number) => a + (b - a) * t;
  if (f < CUR_EMAIL) return null;
  if (f < CUR_EMAIL + 7)
    return { x: lerp2(195, 78, (f - CUR_EMAIL) / 7), y: lerp2(180, 254, (f - CUR_EMAIL) / 7) };
  if (f < TYPE_END) return { x: 78, y: 254 }; // Email typing
  if (f < CUR_BTN - 7) return { x: 78, y: lerp2(254, 352, Math.min(1, (f - TYPE_END) / 7)) }; // land on password field
  if (f < CUR_BTN)
    return { x: lerp2(78, 195, (f - (CUR_BTN - 7)) / 7), y: lerp2(352, 476, (f - (CUR_BTN - 7)) / 7) };
  if (f < CLICK + 8) return { x: 195, y: 476 }; // clicking
  return null;
};

const Cursor: React.FC<{ f: number; press: number }> = ({ f, press }) => {
  const p = cursorAt(f);
  if (!p) return null;
  const fade = interpolate(f, [CUR_EMAIL, CUR_EMAIL + 6], [0, 1], CL);
  const out = interpolate(f, [CLICK + 8, CLICK + 14], [1, 0], CL);
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x,
        top: p.y,
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
        opacity: fade * out,
        transform: `scale(${1 - press * 0.35})`,
        borderRadius: '50%',
        background: '#18181b',
        boxShadow: '0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.35)',
        zIndex: 20,
      }}
    />
  );
};

export const AppSignupFlow: React.FC = () => {
  const f = useCurrentFrame();

  // Phone entrance: springs up from the bottom + scale
  const phoneSpring = spring({
    frame: Math.max(0, f - PHONE_IN),
    fps: 30,
    config: { damping: 14, mass: 1.1 },
    durationInFrames: 26,
  });
  const phoneY = (1 - phoneSpring) * 150;
  const phoneScale = 0.85 + 0.15 * phoneSpring;

  // Typing progress
  const chars = Math.floor(interpolate(f, [TYPE_START, TYPE_END], [0, EMAIL.length], CL));
  const dots = Math.floor(interpolate(f, [PW_START, PW_END], [0, PW.length], CL));
  const typedEmail = EMAIL.slice(0, chars);
  const typedPw = PW.slice(0, dots);

  // Button press (instant 0→1→0 on click)
  const press =
    interpolate(f, [CLICK, CLICK + 3], [0, 1], CL) -
    interpolate(f, [CLICK + 5, CLICK + 8], [0, 1], CL);

  // Success modal
  const successSpring = spring({
    frame: Math.max(0, f - SUCCESS),
    fps: 30,
    config: { damping: 14, stiffness: 160 },
  });
  const overlayOpacity = interpolate(f, [SUCCESS, SUCCESS + 8], [0, 1], CL);

  // Switch to Dashboard
  const dashIn = interpolate(f, [DASH, DASH + 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });
  const signupOut = interpolate(f, [DASH, DASH + 10], [1, 0], CL);

  const statIn = (i: number) =>
    interpolate(f, [DASH + 4 + i * 3, DASH + 12 + i * 3], [0, 1], {
      easing: Easing.out(Easing.cubic),
      ...CL,
    });
  const actIn = (i: number) =>
    interpolate(f, [DASH + 12 + i * 4, DASH + 20 + i * 4], [0, 1], {
      easing: Easing.out(Easing.cubic),
      ...CL,
    });

  // After settling, the whole phone breathes slightly on a 1.6s (48f) cycle
  const breathe = f < DASH_SETTLE ? 1 : 1 + 0.008 * Math.sin(((f - DASH_SETTLE) / 48) * Math.PI * 2);

  const inputBox: React.CSSProperties = {
    width: '100%',
    height: 62,
    borderRadius: 14,
    border: '1.5px solid #d8d8dc',
    background: '#fff',
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    fontSize: 22,
    fontWeight: 600,
    color: '#18181b',
    boxSizing: 'border-box',
    fontFamily: 'Helvetica, Arial, sans-serif',
  };

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${phoneScale * breathe})`,
        }}
      >
        <Phone width={350}>
          {/* Screen content root */}
          <div style={{ position: 'absolute', inset: 0, background: '#f6f6f4' }}>
            {/* ── Screen 1: sign-up form ── */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: '0 28px',
                opacity: signupOut,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ marginTop: 96 }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#18181b' }}>Welcome</div>
                <div style={{ fontSize: 14, color: '#8a8a92', marginTop: 6 }}>
                  Create your account to get started
                </div>
              </div>

              {/* Email */}
              <div style={{ marginTop: 30 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#5c5c64', marginBottom: 8 }}>
                  Email
                </div>
                <div style={inputBox}>
                  <span>{typedEmail}</span>
                  {f >= TYPE_START && f < TYPE_END && (
                    <span
                      style={{
                        width: 2,
                        height: 26,
                        background: '#18181b',
                        marginLeft: 2,
                        opacity: 0.7 + 0.3 * Math.sin(f * 0.6),
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Password */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#5c5c64', marginBottom: 8 }}>
                  Password
                </div>
                <div style={inputBox}>
                  <span style={{ letterSpacing: 3 }}>{typedPw}</span>
                </div>
              </div>

              {/* Sign Up button */}
              <div
                style={{
                  marginTop: 28,
                  height: 66,
                  borderRadius: 16,
                  background: '#18181b',
                  color: '#fff',
                  fontSize: 19,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${1 - press * 0.045})`,
                  boxShadow: press > 0 ? 'inset 0 3px 10px rgba(0,0,0,0.45)' : 'none',
                }}
              >
                Sign Up
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#9a9aa2',
                  marginTop: 18,
                }}
              >
                Already have an account?{' '}
                <span style={{ color: '#3f3f46', fontWeight: 600 }}>Log in</span>
              </div>

              {/* Success modal */}
              {f >= SUCCESS && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `rgba(18,18,22,${0.32 * overlayOpacity})`,
                  }}
                >
                  <div
                    style={{
                      width: 280,
                      borderRadius: 22,
                      background: '#fff',
                      padding: '30px 24px',
                      textAlign: 'center',
                      boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                      transform: `scale(${successSpring})`,
                      opacity: successSpring,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#26262b',
                        color: '#fff',
                        fontSize: 30,
                        lineHeight: '64px',
                        margin: '0 auto 16px',
                      }}
                    >
                      ✓
                    </div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: '#18181b' }}>
                      Account Created
                    </div>
                    <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 8 }}>
                      Redirecting to dashboard…
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Screen 2: Dashboard ── */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#f2f2f0',
                opacity: dashIn,
                transform: `translateY(${(1 - dashIn) * 26}px)`,
                boxSizing: 'border-box',
              }}
            >
              {/* Header */}
              <div
                style={{
                  height: 120,
                  background: '#26262b',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#9a9aa4' }}>Good morning</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                    User
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#4a4a52',
                  }}
                />
              </div>

              {/* 2×2 stat cards */}
              <div
                style={{
                  margin: '-26px 20px 0',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                {STATS.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
                      opacity: statIn(i),
                      transform: `translateY(${(1 - statIn(i)) * 14}px)`,
                    }}
                  >
                    <div style={{ width: s.w, height: 22, borderRadius: 6, background: '#c9c9ce' }} />
                    <div
                      style={{
                        width: 54,
                        height: 10,
                        borderRadius: 5,
                        background: '#e2e2e6',
                        marginTop: 10,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div style={{ margin: '22px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3f3f46', marginBottom: 10 }}>
                  Recent Activity
                </div>
                {ACTS.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#fff',
                      borderRadius: 12,
                      padding: '10px 12px',
                      marginBottom: 8,
                      boxShadow: '0 3px 10px rgba(0,0,0,0.04)',
                      opacity: actIn(i),
                      transform: `translateX(${(1 - actIn(i)) * 18}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: w,
                        height: w,
                        borderRadius: w / 2,
                        background: '#e2e2e6',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, height: 10, borderRadius: 5, background: '#e9e9ec' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Cursor f={f} press={press} />
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
