// error-shake-field —— Form validation failure: tapping Sign In → full-screen horizontal shake decays + email field turns red with a glow + inline error slides up (mobile / interaction)
// Phone fades in → login card (title + email/password inputs + button) staggers into view → finger taps Sign In →
// the whole phone shakes on translateX (about 4 cycles, decaying amplitude) → email field gets a red border + red glow + error message slides in →
// shaking subsides, error state persists → settles into breathing. Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const ERROR_SHAKE_FIELD_DURATION = 168; // 5.6s @ 30fps

// Timeline (168f)
const PHONE_IN = 4;
const FORM_IN = 16;
const FINGER_IN = 56;
const CLICK = 68;
const SHAKE = 70;        // shaking starts
const SHAKE_END = 108;
const ERROR_IN = 74;     // red border + error message
const HOLD = 124;

const RED = '#d64545';

export const ErrorShakeField: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 60;

  // Form staggers in
  const formIn = (i: number) =>
    interpolate(f, [FORM_IN + i * 4, FORM_IN + i * 4 + 14], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });

  // Finger
  const fingerIn = interpolate(f, [FINGER_IN, FINGER_IN + 6], [0, 1], CL);
  const fingerX = interpolate(f, [FINGER_IN, FINGER_IN + 10], [300, 195], { easing: Easing.out(Easing.cubic), ...CL });
  const fingerY = interpolate(f, [FINGER_IN, FINGER_IN + 10], [640, 482], { easing: Easing.out(Easing.cubic), ...CL });
  const press =
    interpolate(f, [CLICK, CLICK + 3], [0, 1], CL) -
    interpolate(f, [CLICK + 4, CLICK + 7], [0, 1], CL);
  const fingerOut = interpolate(f, [CLICK + 6, CLICK + 12], [1, 0], CL);

  // Whole-phone shake: about 4 cycles, amplitude decaying 14→0
  const shakeT = interpolate(f, [SHAKE, SHAKE_END], [0, 1], CL);
  const shake = f < SHAKE ? 0 : f > SHAKE_END ? 0 : Math.sin((f - SHAKE) * 0.6) * 14 * (1 - shakeT);

  // Error state: red border + glow + message slides in
  const err = interpolate(f, [ERROR_IN, ERROR_IN + 14], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%, -50%) translateY(${phoneY}px) translateX(${shake}px) scale(${breathe})`, opacity: phoneIn,
        }}
      >
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#f4f4f2', color: '#18181b', overflow: 'hidden' }}>
            <div style={{ position: 'relative', margin: '150px 26px 0' }}>
              {/* Title */}
              <div style={{ opacity: formIn(0), transform: `translateY(${(1 - formIn(0)) * 10}px)` }}>
                <div style={{ fontSize: 26, fontWeight: 800 }}>Welcome back</div>
                <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 6 }}>Sign in to continue to Acme</div>
              </div>

              {/* Email field (error target) */}
              <div style={{ marginTop: 28, opacity: formIn(1) }}>
                <div style={{ fontSize: 12, color: '#8a8a92', marginBottom: 6 }}>EMAIL</div>
                <div
                  style={{
                    height: 54, borderRadius: 12, background: '#fff',
                    border: `1.5px solid ${err > 0.5 ? RED : '#d8d8dc'}`,
                    boxShadow: err > 0 ? `0 0 0 3px rgba(214,69,69,${0.22 * err})` : 'none',
                    padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14, color: '#18181b',
                  }}
                >
                  jane@acme.com
                </div>
                {/* Inline error message */}
                {f >= ERROR_IN && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, opacity: err, transform: `translateY(${(1 - err) * 8}px)` }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${RED}` }} />
                    <div style={{ fontSize: 12, color: RED }}>Please enter a valid email address</div>
                  </div>
                )}
              </div>

              {/* Password field */}
              <div style={{ marginTop: 16, opacity: formIn(2) }}>
                <div style={{ fontSize: 12, color: '#8a8a92', marginBottom: 6 }}>PASSWORD</div>
                <div style={{ height: 54, borderRadius: 12, border: '1.5px solid #d8d8dc', background: '#fff', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 16, letterSpacing: 4 }}>••••••••</div>
              </div>

              {/* Sign In button */}
              <div
                style={{
                  height: 56, borderRadius: 14, background: '#18181b', color: '#fff', marginTop: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700,
                  opacity: formIn(3), transform: `translateY(${(1 - formIn(3)) * 10}px) scale(${1 - press * 0.04})`,
                  boxShadow: press > 0 ? 'inset 0 3px 10px rgba(0,0,0,0.45)' : 'none',
                }}
              >
                Sign In
              </div>
            </div>
          </div>

          {/* Finger */}
          {f >= FINGER_IN && (
            <div
              style={{
                position: 'absolute', left: fingerX, top: fingerY, width: 24, height: 24,
                marginLeft: -12, marginTop: -12, borderRadius: '50%', zIndex: 20,
                background: 'rgba(20,20,22,0.85)',
                boxShadow: '0 0 0 3px rgba(214,69,69,0.5)',
                transform: `scale(${1 - press * 0.3})`, opacity: fingerIn * fingerOut,
              }}
            />
          )}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
