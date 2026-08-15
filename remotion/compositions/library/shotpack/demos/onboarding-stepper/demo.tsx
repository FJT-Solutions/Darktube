// onboarding-stepper —— App onboarding: step-by-step stepper + page-by-page slide (mobile / screen)
// Phone fades in → 3-step onboarding (Account → Plan → Settings): the stepper dots/connectors at the top light up and advance with each step,
// each step's content blur-ins in and slides up 16px on entry while the old step fades out; the bottom Next/Finish button
// has a press transition; after Finish, the completion checkmark pops out → the whole phone breathes on hold. Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const ONBOARDING_STEPPER_DURATION = 210; // 7s @ 30fps

// Timeline (210f)
const PHONE_IN = 4;
const S1 = 20;        // step 1 content enters
const STEP_2 = 64;    // stepper advances to 2 + content page switch (blur-in 20f)
const STEP_3 = 104;   // stepper advances to 3 + content page switch
const FINISH = 158;   // tap Finish → completion checkmark
const HOLD = 176;     // settled → breathing

const STEPS = ['Account', 'Plan', 'Settings'];

export const OnboardingStepper: React.FC = () => {
  const f = useCurrentFrame();

  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // Current step: 0/1/2
  const step = f < STEP_2 ? 0 : f < STEP_3 ? 1 : 2;

  // Each step's content blur-ins in (filter blur 28→0 + opacity 0→1 + translateY 16→0)
  const stepIn = (s: number) => {
    const start = [S1, STEP_2, STEP_3][s];
    const t = interpolate(f, [start, start + 20], [0, 1], {
      easing: Easing.out(Easing.cubic), ...CL,
    });
    return t;
  };
  const blur = (t: number) => 28 * (1 - t);

  // Stepper lights up: dot fill + connector grow progress
  const stepFill = (s: number) =>
    s < step ? 1 : s === step ? interpolate(f, [[S1, STEP_2, STEP_3][s] - 6, [S1, STEP_2, STEP_3][s] + 6], [0, 1], CL) : 0;

  // Finish press + completion state
  const finishPress =
    interpolate(f, [FINISH, FINISH + 3], [0, 1], CL) -
    interpolate(f, [FINISH + 5, FINISH + 8], [0, 1], CL);
  const doneIn = interpolate(f, [FINISH, FINISH + 12], [0, 1], {
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
          <div style={{ position: 'absolute', inset: 0, background: '#f6f6f4', color: '#18181b' }}>
            {/* Top stepper */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 84 }}>
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div style={{ width: 44, height: 2, borderRadius: 1, background: stepFill(i) > 0.5 ? '#18181b' : '#d8d8dc' }} />
                  )}
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: stepFill(i) > 0.5 ? '#18181b' : '#fff',
                      border: stepFill(i) > 0.5 ? 'none' : '2px solid #d8d8dc',
                      color: stepFill(i) > 0.5 ? '#fff' : '#8a8a92',
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Step content area */}
            <div style={{ marginTop: 40, padding: '0 30px' }}>
              {/* Each step's content */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: step === 0 ? 1 : 0, filter: `blur(${blur(stepIn(0))}px)`, transform: `translateY(${(1 - stepIn(0)) * 16}px)` }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>Create your account</div>
                  <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 8, lineHeight: 1.5 }}>
                    Enter your email to get started. We'll walk you through setup in three quick steps.
                  </div>
                  <div style={{ height: 56, borderRadius: 14, border: '1.5px solid #d8d8dc', background: '#fff', marginTop: 22, padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 15 }}>jane@acme.com</div>
                </div>
                <div style={{ position: 'absolute', inset: 0, opacity: step === 1 ? 1 : 0, filter: `blur(${blur(stepIn(1))}px)`, transform: `translateY(${(1 - stepIn(1)) * 16}px)` }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>Choose a plan</div>
                  <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 8 }}>Pick what fits your team.</div>
                  {['Free', 'Pro', 'Team'].map((p, i) => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 52, borderRadius: 12, border: i === 1 ? '1.5px solid #18181b' : '1.5px solid #e2e2e6', background: i === 1 ? '#f0f0ee' : '#fff', marginTop: 12, padding: '0 16px', fontSize: 15, fontWeight: i === 1 ? 700 : 500 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: i === 1 ? '5px solid #18181b' : '2px solid #d8d8dc' }} />
                      {p}
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', inset: 0, opacity: step === 2 ? 1 : 0, filter: `blur(${blur(stepIn(2))}px)`, transform: `translateY(${(1 - stepIn(2)) * 16}px)` }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>Final settings</div>
                  <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 8 }}>Turn on what you need.</div>
                  {['Email digests', 'Weekly reports'].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54, borderBottom: '1px solid #e9e9ec', fontSize: 15 }}>
                      {s}
                      <div style={{ width: 44, height: 26, borderRadius: 13, background: i === 0 ? '#18181b' : '#e2e2e6', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 2, left: i === 0 ? 20 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom button */}
            <div style={{ position: 'absolute', left: 30, right: 30, bottom: 110 }}>
              <div
                style={{
                  height: 58, borderRadius: 16, background: '#18181b', color: '#fff',
                  fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: `scale(${1 - finishPress * 0.04})`,
                  boxShadow: finishPress > 0 ? 'inset 0 3px 10px rgba(0,0,0,0.45)' : 'none',
                }}
              >
                {step < 2 ? 'Next' : 'Finish'}
              </div>
              {/* Completion checkmark */}
              {f >= FINISH && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: doneIn, transform: `scale(${doneIn})` }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0f7e5a', color: '#fff', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                </div>
              )}
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
