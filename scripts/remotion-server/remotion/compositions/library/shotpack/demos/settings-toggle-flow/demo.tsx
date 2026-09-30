// settings-toggle-flow —— App settings: toggles flip one by one in a stagger + save toast (mobile / screen)
// Phone fades in → settings list rows blur in staggered → several switches flip one by one (thumb springs with overshoot +
// track color transition), with a slider drag + option change in between → "saved" toast at the bottom slides up + lingers briefly +
// fades out → the whole phone breathes on hold. Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const SETTINGS_TOGGLE_FLOW_DURATION = 222; // 7.4s @ 30fps

// Timeline (222f)
const PHONE_IN = 4;
const ROW_IN = 18;          // settings rows blur-in stagger begins
const T1 = 40;              // toggle 1 flips
const T2 = 74;              // toggle 2 flips
const SLIDER = 100;         // slider drag
const T3 = 130;             // toggle 3 flips
const TOAST = 152;          // save toast slides up
const TOAST_OUT = 182;      // toast fades out
const HOLD = 188;           // settled → breathing

export const SettingsToggleFlow: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // Rows blur in (staggered 4f per row)
  const rowIn = (i: number) => interpolate(f, [ROW_IN + i * 4, ROW_IN + i * 4 + 14], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  // switch thumb: springs to the right (0.5 → 22px, with overshoot)
  const thumbX = (start: number) => 2 + 20 * spring({
    frame: Math.max(0, f - start), fps: 30,
    config: { damping: 13, stiffness: 150 },
  });
  const trackOn = (start: number) => interpolate(f, [start, start + 8], [0, 1], CL);

  // Slider drag progress (f100–124)
  const sliderW = interpolate(f, [SLIDER, SLIDER + 24], [30, 130], { easing: Easing.out(Easing.cubic), ...CL });

  // toast: slides up + lingers + fades out
  const toastIn = interpolate(f, [TOAST, TOAST + 12], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  const toastY = (1 - toastIn) * 24;
  const toastOut = interpolate(f, [TOAST_OUT, TOAST_OUT + 10], [1, 0], CL);

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const switchRow = (label: string, start: number, i: number) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, borderBottom: '1px solid #e9e9ec', opacity: rowIn(i), filter: `blur(${14 * (1 - rowIn(i))}px)`, transform: `translateY(${(1 - rowIn(i)) * 10}px)` }}>
      <div style={{ fontSize: 15 }}>{label}</div>
      <div style={{ width: 46, height: 28, borderRadius: 14, background: trackOn(start) > 0.5 ? '#18181b' : '#e2e2e6', position: 'relative', transition: 'none' }}>
        <div style={{ position: 'absolute', top: 3, left: thumbX(start), width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn }}>
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#fff', color: '#18181b' }}>
            <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #e9e9ec', fontSize: 17, fontWeight: 800 }}>Settings</div>
            <div style={{ padding: '8px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a92', margin: '12px 0 6px' }}>PREFERENCES</div>
              {switchRow('Notifications', T1, 0)}
              {switchRow('Dark mode', T2, 1)}

              {/* Slider row */}
              <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e9e9ec', opacity: rowIn(2), filter: `blur(${14 * (1 - rowIn(2))}px)` }}>
                <div style={{ fontSize: 15 }}>Volume</div>
                <div style={{ width: 140, height: 4, borderRadius: 2, background: '#e2e2e6', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: sliderW, borderRadius: 2, background: '#18181b' }} />
                  <div style={{ position: 'absolute', left: sliderW - 8, top: -7, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', border: '1px solid #e2e2e6' }} />
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a92', margin: '12px 0 6px' }}>ACCOUNT</div>
              {switchRow('Two-factor auth', T3, 3)}
            </div>

            {/* Save toast */}
            {f >= TOAST && (
              <div style={{ position: 'absolute', left: 40, right: 40, bottom: 96, opacity: toastIn * toastOut, transform: `translateY(${toastY}px)` }}>
                <div style={{ height: 52, borderRadius: 14, background: '#18181b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }}>
                  <span style={{ color: '#0f7e5a' }}>✓</span> Settings saved
                </div>
              </div>
            )}
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
