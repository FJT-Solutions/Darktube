// checkout-flow —— App checkout: form reveals section by section → confirm card → success toast (mobile / interaction)
// Phone fades in → form sections (amount card + input rows) stagger into view → bottom Pay button is tapped (pressed) →
// confirm card springs up (overlay + order summary) → on confirm, success checkmark + toast → phone breathes on hold.
// Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CHECKOUT_FLOW_DURATION = 210; // 7s @ 30fps

// Timeline (210f)
const PHONE_IN = 4;
const FORM_IN = 18;        // form sections blur-in staggered
const PAY = 96;            // tap Pay (press)
const CONFIRM = 104;       // confirm card springs up
const CONFIRM_OK = 150;    // confirm button pressed → success
const SUCCESS = 158;       // success checkmark + toast
const HOLD = 176;          // settled → breathing

export const CheckoutFlow: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  const segIn = (i: number) => interpolate(f, [FORM_IN + i * 5, FORM_IN + i * 5 + 14], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const payPress =
    interpolate(f, [PAY, PAY + 3], [0, 1], CL) -
    interpolate(f, [PAY + 5, PAY + 8], [0, 1], CL);

  const confirmSpring = spring({ frame: Math.max(0, f - CONFIRM), fps: 30, config: { damping: 14, stiffness: 160 } });
  const overlay = interpolate(f, [CONFIRM, CONFIRM + 8], [0, 1], CL);
  const confirmPress =
    interpolate(f, [CONFIRM_OK, CONFIRM_OK + 3], [0, 1], CL) -
    interpolate(f, [CONFIRM_OK + 5, CONFIRM_OK + 8], [0, 1], CL);

  const successIn = interpolate(f, [SUCCESS, SUCCESS + 12], [0, 1], { easing: Easing.out(Easing.cubic), ...CL });
  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const field = (label: string, w: number) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#8a8a92', marginBottom: 6 }}>{label}</div>
      <div style={{ height: 52, width: w, borderRadius: 12, border: '1.5px solid #d8d8dc', background: '#fff', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14 }} />
    </div>
  );

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn }}>
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#f4f4f2', color: '#18181b' }}>
            {/* Header */}
            <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #e9e9ec', fontSize: 17, fontWeight: 800 }}>Checkout</div>

            {/* Amount card */}
            <div style={{ margin: '18px 20px 0', opacity: segIn(0), transform: `translateY(${(1 - segIn(0)) * 12}px)` }}>
              <div style={{ background: '#26262b', color: '#fff', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ fontSize: 12, color: '#9a9aa4' }}>Amount due</div>
                <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>$49.00</div>
              </div>
            </div>

            {/* Form fields */}
            <div style={{ margin: '18px 20px 0', opacity: segIn(1) }}>
              {field('Email', 100)} {field('Card number', 100)} {field('Name on card', 80)}
            </div>

            {/* Pay button */}
            <div style={{ position: 'absolute', left: 20, right: 20, bottom: 96, opacity: segIn(2) }}>
              <div style={{ height: 58, borderRadius: 16, background: '#18181b', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - payPress * 0.04})`, boxShadow: payPress > 0 ? 'inset 0 3px 10px rgba(0,0,0,0.45)' : 'none' }}>
                Pay $49.00
              </div>
            </div>

            {/* Confirm card */}
            {f >= CONFIRM && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(18,18,22,${0.32 * overlay})` }}>
                <div style={{ width: 300, borderRadius: 22, background: '#fff', padding: '24px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', transform: `scale(${confirmSpring})`, opacity: confirmSpring }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Confirm payment</div>
                  <div style={{ fontSize: 13, color: '#8a8a92', marginTop: 6 }}>Acme Cloud — Pro plan · $49.00/mo</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#8a8a92' }}>Card</span><span>•••• 4242</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#8a8a92' }}>Email</span><span>jane@acme.com</span></div>
                  </div>
                  <div style={{ height: 52, borderRadius: 14, background: '#18181b', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 18, transform: `scale(${1 - confirmPress * 0.04})` }}>
                    Confirm
                  </div>
                </div>
              </div>
            )}

            {/* Success state */}
            {f >= SUCCESS && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#0f7e5a', opacity: successIn, color: '#fff' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${successIn})` }}>✓</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>Payment successful</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Receipt sent to jane@acme.com</div>
              </div>
            )}
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
